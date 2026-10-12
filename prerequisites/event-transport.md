# Event Transport for GhostRing

## Telemetry Pipeline Overview

The GhostRing telemetry pipeline transports eBPF-collected events from kernel space to user space for ingestion, logging, and alert routing.

### Pipeline Stages

1. **Trigger**: Process initiates syscall (e.g., `sys_enter_execve`)
2. **Execution** (`ghostring-ebpf`): eBPF bytecode executes in kernel, extracts `pid`, `uid`, command metadata
3. **Transmission**: Serialized via `PerfEventArray` ring buffer map using `#[repr(C)]` structs
4. **Ingestion** (`ghostring`): Tokio daemon polls per-CPU ring buffers asynchronously

## PerfEventArray Ring Buffer Map

### Kernel-Side Transmission

- **Map type**: `PerfEventArray` (eBPF map type for perf event ring buffers)
- **Data format**: `#[repr(C)]` structs for C-compatible layout
- **Per-CPU buffers**: One ring buffer per CPU core
- **Serialization**: Fixed-size structs pushed into ring buffer by eBPF program

### User-Side Ingestion

- **Framework**: `aya` crate with Tokio async support
- **Polling**: Asynchronous polling of per-CPU ring buffers
- **Parsing**: Raw byte streams parsed back into high-level Rust structs
- **Output**: Logging, auditing, alert routing, JSON export (planned)

## `#[repr(C)]` Communication Structs

Found in `ghostring-common`, these structs define the binary format:

```rust
// Example: simplified event structure
#[repr(C)]
pub struct ExecveEvent {
    pub pid: u32,           // Process ID
    pub ppid: u32,          // Parent process ID
    pub uid: u32,           // User ID
    pub gid: u32,           // Group ID
    pub flags: u64,         // Event flags
    pub timestamp: u64,     // Nanosecond timestamp
    // command[16]: truncated command name (roadmap: advanced path extraction)
}
```

## Per-CPU Buffer Polling

Since `PerfEventArray` uses per-CPU buffers:

- User daemon must poll **each CPU's ring buffer**
- Asynchronous polling via Tokio
- Events may be lost if buffers fill up (overwrite policy)
- Requires understanding of per-CPU data organization

## Buffer Management

- **Ring buffer layout**: Producer (kernel) writes, consumer (user) reads
- **Head/tail pointers**: Track consumed/produced data
- **Batch processing**: Pull multiple events per poll cycle
- **Backpressure**: Handle full buffers (drop or block)

## Related Documentation

- [Perf Buffer Internals](./perf-buffer-internals.md) — Low-level ring buffer architecture, mmap header layouts, and pointer synchronization.
- [ghostring-common Struct Design](./ghostring-common-structs.md) — `#[repr(C)]` struct definitions bridging kernel and user space.
- [ghostring User Daemon](./ghostring-user-daemon.md) — Tokio async ingestion, per-CPU polling loops, and alert routing.
- [Aya Framework](./aya-framework.md) — Aya map abstractions and `aya-poll` asynchronous polling engine.
- [Architecture Overview](./architecture-overview.md) — End-to-end telemetry pipeline and workspace crate roles.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — Impact of BTF on struct layout and cross-kernel binary compatibility.
- [Testing Strategy](./testing-strategy.md) — Unit tests for struct alignment and integration benchmarks for throughput.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Resolving ring buffer overflows, lost events, and polling errors.