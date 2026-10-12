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

## Related Knowledge

This file covers the event transport pipeline that connects many other knowledge base entries:

- [[architecture-overview.md]]: Overall pipeline diagram and crate responsibilities
- [[ghostring-common-structs.md]]: #[repr(C)] struct definitions for kernel↔user communication
- [[ghostring-user-daemon.md]]: Tokio async polling implementation details
- [[btf-co-re-deep-dive.md]]: BTF impact on struct layout and CO-RE compatibility
- [[roadmap-features-deep.md]]: Roadmap features affecting transport (path extraction, network observability, FIM)
- [[testing-strategy.md]]: Unit tests for struct layout invariants and integration tests

## `#[repr(C)]` Communication Structs

Found in `ghostring-common`, these structs define the binary format:

```rust
// Example: simplified event structure
#[repr(C)]
pub struct ExecveEvent {
    pub pid: u32,           // Process ID
    pub ppid: u32,          // Parent process ID
    pub uid: u32,           // User ID
    gid: u32,               // Group ID
    flags: u64,             // Event flags
    timestamp: u64,         // Nanosecond timestamp
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