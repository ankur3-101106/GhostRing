# GhostRing Architecture Overview

## Workspace Structure

GhostRing is organized as a Rust workspace with three distinct crates partitioning safety, performance, and low-level kernel interaction:

```
ghostring/
├── Cargo.toml              # Workspace manifest defining shared dependencies
├── ghostring-common/       # C-compatible structs shared across kernel boundary
├── ghostring-ebpf/         # no_std Rust kernel bytecode program (Ring 0)
└── ghostring/              # Asynchronous Tokio user-space daemon & CLI
```

## Crate Responsibilities

### ghostring-common (`cdylib`/`staticlib`)
- **Purpose**: C-compatible structs for kernel↔user communication
- **Shared constants, event types, enums**
- **No dependencies** on kernel or std
- **`#[repr(C)]`** layout ensures binary compatibility
- Shared across both kernel and user crates

### ghostring-ebpf (`no_std`, target: `bpfel-unknown-none`)
- **Purpose**: eBPF probe programs (tracepoints, kprobes)
- **Uses**: `aya-ebpf` crate for BPF helpers
- **Compiled**: With `bpf-linker` to BPF bytecode
- **Safety**: `no_std` environment; minimal `unsafe` only for FFI boundaries
- **License**: GPLv3 (required for full eBPF helper access)

### ghostring (std, Tokio async)
- **Purpose**: User-space daemon with CLI
- **Loads/attaches**: eBPF programs via `aya`
- **Async**: Ring buffer consumption
- **Features**: Logging, alerting, JSON export (planned)

## Telemetry Pipeline

### 1. Trigger
- Process initiates a system call (e.g., `sys_enter_execve`)
- Linux kernel hits the attached tracepoint/kprobe

### 2. Execution (ghostring-ebpf)
- eBPF bytecode executes safely within the kernel
- Fetches context registers
- Extracts process identifiers (`pid`), user identifiers (`uid`)
- Extracts command metadata (truncated to 16 bytes)
- Without context-switching to user space

### 3. Transmission (PerfEventArray)
- Metadata serialized into `#[repr(C)]` structure
- Pushed into eBPF `PerfEventArray` ring buffer map
- Per-CPU organization: one buffer per CPU core

### 4. Ingestion (ghostring)
- Tokio daemon polls per-CPU ring buffers asynchronously
- Parses raw byte streams back into Rust structs
- Enables logging, auditing, and alert routing

## Key Technical Requirements

| Requirement | Detail |
|---|---|
| **License** | GPLv3 - required for full eBPF helper access via kernel verifier |
| **Kernel Verifier** | All eBPF code must pass static verification |
| **BTF** | Preferred for CO-RE (Compile Once, Run Everywhere) portability |
| **Safety** | `no_std` in eBPF crate; minimal `unsafe` only for FFI boundaries |
| **Kernel Version** | 5.8+ with BTF enabled for optimal flexibility |
| **Rust Toolchain** | Nightly with `rust-src` component |

## Related Knowledge

This overview connects all the knowledge base entries:

- [[ebpf-fundamentals.md]]: eBPF core concepts underlying the architecture
- [[kernel-instrumentation.md]]: Ring 0 instrumentation details
- [[event-transport.md]]: Full telemetry pipeline implementation
- [[development-environment.md]]: Prerequisites for getting started
- [[ghostring-common-structs.md]]: C-compatible struct design for kernel↔user communication
- [[ghostring-ebpf.md]]: eBPF crate (no_std, bpfel-unknown-none) — *note: referenced conceptually*
- [[ghostring-user-daemon.md]]: User-space daemon (std, Tokio async)
- [[aya-framework.md]]: Aya crate for eBPF program loading and attachment
- [[btf-co-re-deep-dive.md]]: BTF and CO-RE portability mechanism
- [[build-system-workspace.md]]: Cargo workspace and build pipeline configuration
- [[license-compliance-deep.md]]: GPLv3 requirement and kernel verifier
- [[roadmap-features-deep.md]]: Planned feature extensions
- [[security-model-deep-dive.md]]: Security model and threat analysis
- [[testing-strategy.md]]: Testing approach and CI/CD gates
- [[troubleshooting-guide.md]]: Common issues and resolutions