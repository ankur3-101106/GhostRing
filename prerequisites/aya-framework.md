# Aya Framework Deep Dive for GhostRing

## Aya Crate Architecture

Aya is a pure-Rust eBPF framework that provides the bridge between Rust eBPF bytecode and the Linux kernel. GhostRing uses Aya for program loading, map management, and BPF helper access.

### Core Crates in Aya Ecosystem

| Crate | Purpose | GhostRing Usage |
|---|---|---|
| `aya` | Core framework, ELF loading, map support | Primary dependency |
| `aya-ebpf` | BPF helper bindings, no_std support | Used in ghostring-ebpf |
| `aya-poll` | Tokio async polling for ring buffers | Used in ghostring user daemon |
| `aya-bpf` | Low-level BPF operations | Core eBPF operations |
| `aya-utils` | Utility types and helpers | Occasional use |

## ELF Loading and Linking

### `bpf-linker` Integration

The `bpf-linker` cargo utility handles ELF section layout for BPF targets. It:

1. **Reorganizes sections** for `bpfel-unknown-none` target
2. **Embeds BTF metadata** for CO-RE support
3. **Generates `__license`** section from Cargo metadata
4. **Outputs `.bc` bytecode** for kernel loading

### Cargo Configuration

```toml
# ghostring-ebpf/Cargo.toml
[package]
name = "ghostring-ebpf"
crate-type = ["cdylib"]

[dependencies]
aya = "0.5"  # version matching aya-ebpf
aya-ebpf = "0.5"
```

### Build Pipeline

```bash
# Step 1: Compile eBPF bytecode
cargo build --release --target bpfel-unknown-none

# Step 2: bpf-linker processes ELF
# - Reorganizes sections
# - Embeds BTF if available
# - Adds __license section
# - Outputs: target/bpfel-unknown-none/release/ghostring_ebpf

# Step 3: Load with aya
aya::EBPF::load("/path/to/ghostring_ebpf")
```

## Map Abstractions

### PerfEventArray Map Wrapper

Aya provides a safe Rust wrapper around the `PerfEventArray` map type:

```rust
use aya::maps::PerfEventArray;
use aya::bindings::perf_event_map;

static EXEC_EVENTS: PerfEventArray = PerfEventArray::new(
    b"exec_events\0".as_ptr() as *const c_char,
);
```

#### Key Methods

| Method | Signature | Description |
|---|---|---|
| `new` | `fn new(name: *const c_char) -> Self` | Create map with name |
| `try_poll` | `fn try_poll(&self, callback: F) -> Result<usize>` | Poll and call callback |
| `try_ready` | `fn try_ready(&self) -> Result<usize>` | Check if data ready |
| `slice` | `fn data(&self) -> &[u8]` | Get ring buffer data slice |

#### Polling Pattern in Tokio

```rust
// In ghostring user daemon
loop {
    // Poll all per-CPU rings
    for cpu in 0..num_cpus {
        if let Ok(len) = exec_events.try_poll(cpu, |data| {
            // Parse ExecveEvent from raw bytes
            parse_event(data);
        }) {
            // Process events
        }
    }
    // Async yield
    tokio::task::yield_now().await;
}
```

### Hash Map Type (For Future Roadmap)

```rust
use aya::maps::HashMap;

static PROCESS_TABLE: HashMap<u32, ProcessInfo> = HashMap::new(
    b"process_table\0".as_ptr() as *const c_char,
);
```

#### Hash Map Operations

| Operation | Complexity |
|---|---|
| `insert` | O(1) average |
| `lookup` | O(1) average |
| `delete` | O(1) average |
| **Memory** | Map size at compile time |

## BPF Helper Bindings

### Aya-Wrapped Helpers

Aya provides safe Rust bindings for BPF helpers, ensuring:

- **Correct signatures**: Match kernel function prototypes
- **License enforcement**: Only GPLv3 helpers available
- **Type safety**: Rust types instead of raw integers
- **No-std compatibility**: Compiles without `std`

### Common Helpers Used by GhostRing

| Helper | Aya Binding | Rust Signature | Usage |
|---|---|---|---|
| `bpf_ktime_get_ns` | `aya::helpers::bpf_ktime_get_ns` | `-> u64` | Nanosecond timestamps |
| `bpf_get_current_pid_tgid` | `aya::helpers::bpf_get_current_pid_tgid` | `-> u64` | PID in upper 32, TID in lower 32 |
| `bpf_get_current_uid_gid` | `aya::helpers::bpf_get_current_uid_gid` | `-> u64` | UID in upper 32, GID in lower 32 |
| `bpf_probe_read_user` | `aya::helpers::bpf_probe_read_user` | `*mut c_void, u32, u32` | Safe user memory read |
| `bpf_perf_event_output` | `aya::helpers::bpf_perf_event_output` | ... | Ring buffer push |

### Helper Licensing Table

Aya enforces GPLv3 at compile time:

```rust
// Helper is available only when license = "GPLv3"
#[aya::pbpf::xdp]
#[link_section = "__license"]
static LICENSE: &[u8] = b"GPLv3\0";

// Without GPLv3, these helpers are excluded:
// - bpf_probe_read_user_str (deep memory read)
// - Helper calls trigger verifier error: "license check failed"
```

## Async Polling Model

### Aya-Poll Integration

The `aya-poll` crate provides Tokio-compatible pollers for eBPF maps:

```rust
use aya_poll::BpfPoller;

// Create poller from map
let poller = BpfPoller::new(&exec_events, |data: &[u8]| {
    // Callback invoked when data available
    handle_exec_event(data);
}).expect("poller init");
```

#### Poller Lifecycle

1. **Start**: `poller.run()` - begins Tokio timer loop
2. **Poll**: Periodic checking of per-CPU ring buffers
3. **Callback**: User-provoked for each ready buffer
4. **Stop**: `poller.stop()` - clean shutdown

### Polling Interval Configuration

| Parameter | Default | Recommended |
|---|---|---|
| **Poll interval** | 1ms | 5-10ms (lower overhead) |
| **Batch size** | 32 events | 64-128 (amortize overhead) |
| **CPU polling** | All CPUs | Mask to active CPUs only |
| **Timeout** | None | 1-5s watchdog timeout |

### Backpressure Handling

```rust
// Handle full buffers gracefully
if let Ok(len) = try_poll() {
    if len == 0 {
        // No data - yield or sleep
        tokio::task::yield_now().await;
    } else {
        // Process events
    }
} else {
    // Error - map might be full
    // Consider increasing buffer sizes
}
```

## Error Handling and Recovery

### Common Error Types

| Error | Cause | Recovery |
|---|---|---|
| `VerifierError::License` | Non-GPLv3 license section | Fix LICENSE field |
| `MapError::MapFull` | Ring buffer overflow | Increase max entries |
| `PollError::InvalidKey` | Bad CPU index | Verify CPU online |
| `HelperError::NotAvailable` | Helper restricted by license | Check license compliance |
| `IoError::NotFound` | Map not loaded | Reload eBPF program |

### Recovery Strategies

1. **Soft restart**: Reload eBPF program without reboot
2. **Buffer resize**: Increase `max_entries` in map definition
3. **CPU hot-unplug**: Offline problematic CPUs
4. **Full system restart**: When state corruption suspected

## Debugging and Introspection

### Aya Debug Features

```rust
// Enable debug logging (development only)
aya::logger::init()?;  // Initialize BPF logging

// Runtime introspection
let stats = exec_events.stats()?;  // Map statistics
```

### Kernel Logging

```rust
// Tracepoint-based debugging
bpf_trace_printk("event: pid=%d\\n", 0, pid as i64, 0);
```

Output viewable via:
```bash
sudo cat /sys/kernel/debug/tracing/trace_pipe
sudo dmesg | grep ghostring
```

### Aya Inspect (Metrics Export)

Future roadmap item for SIEM integration:
- Export metrics via `/proc/aya/...`
- Prometheus metrics endpoint
- Real-time event counters

## Version Compatibility

### Aya Version Matrix

| Aya Version | Rust Target | Linux Kernel | BTF Support | Notes |
|---|---|---|---|---|
| `0.1` | Stable | 4.15+ | Basic | Early CO-RE |
| `0.2` | Stable | 5.8+ | Improved | PerfEventArray |
| `0.3` | Nightly | 5.10+ | Good | Hash maps |
| `0.4`+ | Nightly | 5.8+ | **Excellent** | Current, full CO-RE |
| `0.6` (future) | Nightly | 6.1+ | Planned | New helpers |

### Minimum Supported Versions

- **Rust**: Nightly 2021-10-22 (with `rust-src`)
- **Linux**: 5.8 with `CONFIG_BPF=y` and `CONFIG_BTF=y`
- **GLIBC**: 2.31+ (for user-space daemon)

### Upgrade Path

```
0.3 -> 0.4: BTF metadata changes
0.4 -> 0.5: Map API improvements
0.5 -> 0.6: New BPF helpers, performance
```

Always test with `cargo build --release` after version bump.

## Related Documentation

- [eBPF Internals & Bytecode](./ebpf-internals.md) — Under-the-hood bytecode execution, ELF layout, and verifier requirements.
- [ghostring User Daemon](./ghostring-user-daemon.md) — Application of Aya and `aya-poll` within the Tokio async user daemon.
- [Perf Buffer Internals](./perf-buffer-internals.md) — Memory layouts and polling mechanics for `PerfEventArray` maps.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — How Aya parses BTF metadata to perform CO-RE field relocations.
- [Build System & Workspace](./build-system-workspace.md) — Multi-crate Cargo setup and `bpf-linker` build integration.
- [License Compliance Deep Dive](./license-compliance-deep.md) — Aya helper licensing restrictions and GPLv3 verification.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Resolving Aya map loading, polling, and verifier rejection errors.