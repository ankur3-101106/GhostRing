# PerfEventArray Ring Buffer Internals for GhostRing

## Linux Perf Ring Buffer Architecture

### Overview

The `PerfEventArray` map type in eBPF uses Linux perf's ring buffer infrastructure for efficient data transfer from kernel space to user space. This is the backbone of GhostRing's telemetry pipeline.

### Ring Buffer Design

```
┌──────────────────────────────────────────────────────────────┐
│                      Per-CPU Ring Buffer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  |   Head      |→ |   Producer    |→ |   Consumer  |          │
│  | (tail ptr)  |  | (kernel)    |  | (user)      |          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│        ▲                      ▲              ▲               │
│        │                      │              │               │
│  (consume)                    │          (produce)            │
│        │                      │              │               │
│  └───────────────────────────────────────────────────────────┘
│  |   Data slots (variable, fixed max size)                   │
│  └───────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────┘
```

### Key Data Structures

#### `struct perf_event_array`

```c
// Kernel definition (simplified)
struct perf_event_array {
    struct perf_event *events[];    // Array of perf_event pointers
    struct mutex array_lock;        // Protection for concurrent access
    int init_size;                  // Initialization size
    int nr_events;                  // Number of events (== CPUs)
};
```

#### `struct perf_event`

```c
// Kernel definition (simplified)
struct perf_event {
    struct list_head event_list;
    perf_event_ctx_ctx *ctx;        // Context (per-CPU data)
    struct perf_buffer *buf;        // Ring buffer (or NULL)
    // ... many more fields
};
```

#### `struct perf_buffer`

```c
// The ring buffer itself
struct perf_buffer {
    struct mutex lock;              // Protects buffer operations
    void *event_base;               // Base address of data section
    unsigned int data_size;         // Maximum event data size
    unsigned int data_offset;       // Current data offset
    unsigned int data_dropped;      // Count of dropped events
    // ... perf sample meta fields
};
```

### Per-CPU Organization

Since `PerfEventArray` creates **one ring buffer per CPU**:

```c
// One perf_event_array per map, with nr_events == number of CPUs
// Each perf_event points to per-CPU perf_buffer
```

#### CPU Index Mapping

| Concept | Description |
|---|---|
| **CPU index** | 0 to (nr_cpu_ids - 1) |
| **Kernel selection** | `perf_event_output` with `src_cpu` field |
| **User polling** | Iterate 0..num_cpus, poll each |
| **Affinity** | Bind daemon threads to specific CPUs |

### Data Layout in Ring Buffer

#### Fixed-Size Event Format

GhostRing uses `#[repr(C)]` structs with fixed size:

```
Offset  Size  Field           Description
----  -----  -----------   -----------
0     4      pid           Process ID (u32)
4     4      ppid          Parent PID (u32)
8     4      uid           User ID (u32)
12    4      gid           Group ID (u32)
16    8      flags         Event flags (u64)
24    8      timestamp     Nanosecond timestamp (u64)
32    16     command       Command name (16 bytes, [u8;16])
----  -----  ------------- ---------------------------
40    total  ExecveEvent   Fixed-size, 40 bytes total
```

#### Perf Buffer Data Section

```c
// Ring buffer data layout per CPU
// mmap'd into user space

// Per-CPU layout (simplified):
| Event 1 | Event 2 | ... | Event N | Padding |

// Each event is 40 bytes (ExecveEvent)
// Events are packed consecutively
// Consumer reads head..tail range
```

### mmap Layout

When user-space daemon mmap's the perf buffer:

```
Virtual Memory Layout:

[perf buffer header (96 bytes)]
    |
    |-- data section (events, fixed-size)
    |-- metadata section (event sizes, timestamps)
    |
    |--aux buffer (optional, for trace payloads)
```

#### Ioctl Setup

```c
// User-space mmap setup (simplified, aya handles this)

// 1. Open perf file descriptor
int fd = bpf_map_fd_get(aya_maps.perf_events);

// 2. mmap the buffer
void *map = mmap(NULL, ring_buffer_page_count * PAGE_SIZE,
                 PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);

// 3. Use as circular buffer
//    - header gives: data_available, lost_events, head, tail
//    - data section at offset 96 (perf header size)
//    - events at fixed offsets (0, 40, 80, ... for 40-byte events)
```

### Perf Buffer Header (96 bytes)

| Offset | Size | Field | Description |
|---|---|---|---|
| 0 | 4 | `data_head` | Index of next event to read (consumer) |
| 4 | 4 | `data_tail` | Index of next event to write (producer) |
| 8 | 4 | `data_offset` | Byte offset within data section |
| 12 | 4 | `data_size` | Total data section size (events * event_size) |
| 16 | 4 | `local_node` | Lock node for synchronization |
| 20 | 4 | `remote_node` | Remote CPU's lock node |
| 24 | 8 | `version` | Version number (currently 1) |
| 32 | 8 | `compat_status` | Compatibility status word |
| 40 | 8 | "padding" | Reserved |
| 48 | 8 | "burned_map" | Debug/burn information |
| 56 | 8 | "aux_head" | Auxiliary head pointer |
| 64 | 8 | "aux_tail" | Auxiliary tail pointer |
| 72 | 8 | "aux_data" | Auxiliary data section |
| 80 | 8 | "free_count" | Number of free slots available |
| 88 | 8 | "overflow" | Overflow flag |
| 96 | - | **Data section starts here** | |

### Consumer Polling Algorithm

#### Basic Poll Loop

```rust
// Pseudocode: GhostRing daemon poll loop

fn poll_ring_buffer(ring_buffer: &PerfEventArray) -> Result<usize, aya::Error> {
    // 1. Try to poll each CPU's ring buffer
    let mut total_events = 0;
    
    for cpu in 0..num_cpus {
        // try_poll calls perf_event_output internally
        // It returns number of events processed, or 0 if none available
        match ring_buffer.try_poll(cpu, |data: &[u8]| {
            // Callback: process raw event bytes
            self.process_raw_events(data);
        }) {
            Ok(len) => total_events += len,
            Err(e) => {
                // Handle error (buffer full, etc.)
                log::warn!("Poll error on CPU{}: {:?}", cpu, e);
            }
        }
    }
    
    Ok(total_events)
}
```

#### Polling Return Values

| Return | Meaning | Action |
|---|---|---|
| **> 0** | N events processed | Continue loop, may have more |
| **0** | No events available | Yield/sleep, try again later |
| **Err(EBUSY)** | Busy, retry soon | Back off, retry in next tick |
| **Err(ENOENT)** | Map not found | Reload eBPF program |
| **Err(EINVAL)** | Invalid arguments | Check CPU index, map setup |

#### Polling with Timeout

```rust
use tokio::time::{timeout, Duration};

async fn poll_with_timeout(
    ring: &PerfEventArray,
    timeout_ms: u64,
) -> Result<usize, tokio::time::error::Elapsed> {
    // Poll with timeout to prevent indefinite blocking
    let result = timeout(
        Duration::from_millis(timeout_ms),
        async {
            // Poll all CPUs
            let mut total = 0;
            let num_cpus = num_cpus::get();
            
            for cpu in 0..num_cpus {
                if let Ok(len) = ring.try_poll(cpu, |_data| {
                    // process event
                    total += 1; // Simplified
                }) {
                    total += len;
                }
            }
            
            Ok(total)
        }
    ).await;
    
    result
}
```

### Event Format in Detail

#### Raw Bytes Structure

When the consumer reads from the ring buffer, it gets raw bytes:

```
Byte 0-39: ExecveEvent (40 bytes, #[repr(C)])
Byte 40-79: Second event (if multiple in one poll)
Byte 80-119: Third event
... etc.
```

#### Per-Event Metadata (from perf header)

The perf buffer header also provides metadata per event:

```
struct perf_event_mmap_page {
    __u64   version;
    __u64   data_head;
    __u64   data_tail;
    __u64   data_idx;   // event index within buffer
    __u64   data_base;  // physical base address
    __u64   freed_idx;  // freed event index
    __u32   page_counter;
    __u32   lock;
    // ... more fields for lockless operation
};
```

#### Lost Events Count

```c
// Part of perf_buffer_header
__u32 lost_events;  // Events lost due to buffer full
```

User-space must check this after each poll cycle to detect overflow.

### Synchronization Mechanisms

#### Per-CPU Locking

Since each CPU has its own ring buffer (in PerfEventArray):

```c
// Per-CPU data, no cross-CPU contention for the buffer itself
// But head/tail updates need synchronization

// Kernel side (producer - eBPF program):
// - Local per-CPU variables, no lock needed for own CPU's buffer
// - SMP barriers via smp_wmb() / smp_rmb()

// User side (consumer - Tokio daemon):
// - Per-CPU buffers are independent
// - Only need per-CPU locking, not global lock
// - atomic operations for head/tail
```

#### Memory Barriers

```c
// Kernel write memory barrier before updating tail
smp_wmb();  // Ensure event data is written before tail update

// Kernel read memory barrier before reading data
smp_rmb();  // Ensure we see data written before head update
```

### Buffer Full and Data Loss

#### Overwrite Policy

By default, `PerfEventArray` uses **overwrite** policy:

```c
// When buffer is full, new events overwrite oldest events
// This is set via perf_event_open flags or map configuration

// User detects loss via:
// 1. `data_tail` advancing past `data_head` wrap-around
// 2. `lost_events` counter in perf header
// 3. Poll returns fewer events than expected
```

#### Buffer Size Configuration

```rust
// Map definition with max_entries (affects buffer size)
static EXEC_EVENTS: PerfEventArray = PerfEventArray::new(
    b"exec_events\0".as_ptr() as *const c_char,
);

// max_entries is implicitly per-CPU
// Typical values:
// - 4096 entries per CPU (40 bytes each = ~160KB per CPU)
// - 8192 entries for high-throughput scenarios
// - 2048 entries for low-power/embedded
```

#### Backpressure Strategies

| Strategy | Description | When to Use |
|---|---|---|
| **Drop oldest** (default) | New events overwrite unread oldest | High-throughput monitoring |
| **Block producer** | eBPF program sleeps if buffer full | Rare in eBPF (can't sleep) |
| **Drop new** | Discard if buffer full, keep old | When old events more valuable |
| **Grow buffer** | Increase max_entries at reload | When workload pattern changes |
| **Multiple buffers** | Use multiple PerfEventArray maps | When isolating event classes |

### Advanced: Fd and File Descriptor Management

#### Creating Perf FDs

```rust
// Aya handles this internally, but understanding helps:

// 1. Map is created via PerfEventArray::new()
// 2. Aya maps the buffer automatically via aya-poll
// 3. User gets file descriptors for each CPU's buffer

// The file descriptors point to perf_event_fd structures
// which back the mmap'd ring buffer

// Usage in aya-poll:
use aya_poll::BpfPoller;

let poller = BpfPoller::new(&exec_events, |data: &[u8]| {
    // Called when data available on any CPU
    handle_exec_events(data);
}).expect("poller init");

// poller.run() starts the Tokio timer loop
// No manual fd management needed
```

#### File Descriptor Lifecycle

| Phase | Action | Owner |
|---|---|---|
| **Create** | `PerfEventArray::new()` creates maps | eBPF build/link |
| **Map** | `aya-poll` mmap's buffers | `aya-poll` crate |
| **Poll** | Tokio loop calls `try_poll` | Daemon code |
| **Close** | On daemon shutdown, FDs auto-closed | OS/Rust runtime |
| **Reload** | Unload eBPF, recreate maps | Deployment |

### Perf Event Output Flags

#### Common Flags for GhostRing

| Flag | Value | Effect |
|---|---|---|
| `BPF_F_CURRENT_CPU` | (1ULL << 0) | Write to this CPU's buffer (implicit, default) |
| `BPF_F SYNC` | (1ULL << 1) | Sync before returning (ensure data visible) |
| `BPF_F MF` | (1ULL << 2) | Reserved |
| `BPF_F_GEN_SYS_CALL` | ... | Generate syscall trace (not used directly) |

#### `bpf_perf_event_output` Signature

```rust
// Aya helper binding
pub fn bpf_perf_event_output(
    ctx: *mut c_void,
    map: *mut MapType,
    flags: u64,
    data: *const c_void,
    size: u32,
) -> u32;
```

**Parameters**:
1. `ctx`: eBPF program context (where registers/data available)
2. `map`: PerfEventArray map pointer
3. `flags`: Usually `BPF_F_CURRENT_CPU` (0) or 0
4. `data`: Pointer to `#[repr(C)]` struct (our event)
5. `size`: Size of event struct (40 for ExecveEvent)

### Perf Buffer Performance Characteristics

#### Throughput Benchmarks (Approximate)

| Configuration | Max Throughput | CPU Overhead | Latency |
|---|---|---|---|
| **4096 entries/CPU, 1 poll/sec** | ~500K events/sec | ~5% | ~2ms |
| **8192 entries/CPU, 10 poll/sec** | ~2M events/sec | ~10% | ~10ms |
| **16384 entries/CPU, 100 poll/sec** | ~5M events/sec | ~20% | ~50ms |
| **Max (theoretical)** | ~10M+ events/sec | ~30%+ | Variable |

**Key factors**:
- Number of CPUs (more CPUs = more buffers = higher total throughput)
- Polling frequency (more polls = more overhead but lower latency)
- Event size (40 bytes for ExecveEvent = small, good throughput)
- Kernel version (newer = more efficient)

#### Latency Characteristics

| Phase | Typical Duration | Variance |
|---|---|---|
| **eBPF execution** | 0.5-2 μs | Minimal |
| **Ring buffer write** | 1-5 μs | Minimal |
| **Per-CPU poll iteration** | 50-200 μs | Depends on events available |
| **User-space parse** | 1-5 μs | Minimal |
| **Full pipeline (eBPF → user)** | 50-500 μs | Depends on polling freq |

### Troubleshooting Perf Buffer Issues

| Symptom | Likely Cause | Diagnostic | Fix |
|---|---|---|---|
| "No events appearing" | Buffer never filled | `sudo cat /proc/sys/kernel/perf_event_mlock_timeout`; check `dmesg` | Ensure eBPF program fires; check tracepoint attachment |
| "Buffer overflow" | Events lost | Check `lost_events` in perf header | Increase `max_entries`; reduce event frequency |
| "High latency" | Polling too infrequent | Increase poll frequency | Reduce sleep interval between polls |
| "Low throughput" | Too few CPUs polled | Check CPU online mask | Poll all online CPUs |
| "Corrupted data" | Race condition in polling | Ensure proper head/tail ordering | Use `try_poll` callback; don't access raw memory manually |
| "Permission denied" | Can't mmap perf buffer | Running without sudo; missing CAP_SYS_ADMIN | Run with `sudo -E cargo run --release` |
| "Memory error" | Buffer underrun/overrun | Check data_head/data_tail values | Verify polling logic; add bounds checks |

### Integration with aya-poll

```rust
// Standard aya-poll usage pattern in ghostring

use aya::EBPF;
use aya_poll::BpfPoller;
use aya::maps::PerfEventArray;

fn setup_poller(ebpf: &EBPF) -> Result<BpfPoller, aya::Error> {
    // Get the map from eBPF program
    let exec_events = /* retrieve PerfEventArray map */;
    
    // Create poller with callback
    let poller = BpfPoller::new(
        &exec_events,
        // Callback invoked when data available on any CPU
        |data: &[u8]| {
            // Parse events from raw bytes
            // data contains one or more ExecveEvent structs
            process_events(data);
        },
    )?;
    
    Ok(poller)
}

// In main event loop
async fn run_daemon() -> Result<(), Box<dyn std::error::Error>> {
    let poller = setup_poller(&ebpf)?;
    poller.run().await?;  // Starts Tokio loop
    
    Ok(())
}
```

### Memory Layout Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│ User-Space Memory (mmap'd from perf buffer)                        │
├─────────────────────────────────────────────────────────────────────┤
│ 96 bytes: Perf buffer header (head, tail, metadata, etc.)          │
├─────────────────────────────────────────────────────────────────────┤
│ Data section:                                                      │
│   Offset 96:                                                       │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│   │ Event 1 (40B)│  │ Event 2 (40B)│  │ Event 3 (40B)│                │
│   │ (ExecveEvent)│  │ (ExecveEvent)│  │ (ExecveEvent)│                │
│   └─────────────┘  └─────────────┘  └─────────────┘                │
│   ... more events packed consecutively                             │
│   │                                                      Free space │
│   └───────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│ Total size: nr_cpu * (96 + max_events * 40) bytes typically       │
└─────────────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [Event Transport](./event-transport.md) — High-level telemetry pipeline architecture and data flow.
- [ghostring User Daemon](./ghostring-user-daemon.md) — Tokio async event consumption and per-CPU ring polling loop.
- [ghostring-common Struct Design](./ghostring-common-structs.md) — Event struct layouts, size alignment, and memory boundaries.
- [Aya Framework](./aya-framework.md) — Aya map abstractions and `aya-poll` asynchronous polling engine.
- [eBPF Internals & Bytecode](./ebpf-internals.md) — Bytecode level usage of `bpf_perf_event_output` and verifier constraints.
- [Testing Strategy](./testing-strategy.md) — Throughput benchmarking and event loss testing across high-volume workloads.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Diagnosing buffer overflow, latency spikes, and missing perf events.