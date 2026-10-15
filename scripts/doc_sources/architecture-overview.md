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

## Related Documentation

- [eBPF Fundamentals](./ebpf-fundamentals.md) — Core concepts underlying the eBPF runtime environment.
- [Kernel Instrumentation](./kernel-instrumentation.md) — Ring 0 instrumentation details, tracepoints, and probe types.
- [Event Transport](./event-transport.md) — Telemetry transmission mechanics and ring buffer operations.
- [Development Environment](./development-environment.md) — Prerequisites and environment setup for compiling GhostRing.
- [ghostring-common Struct Design](./ghostring-common-structs.md) — C-compatible struct specifications for kernel↔user communication.
- [eBPF Internals & Bytecode](./ebpf-internals.md) — In-depth execution model for the `ghostring-ebpf` crate.
- [ghostring User Daemon](./ghostring-user-daemon.md) — Asynchronous Tokio daemon architecture and ring buffer ingestion.
- [Aya Framework](./aya-framework.md) — Aya framework details for eBPF program loading and attachment.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — BTF format and CO-RE portability mechanisms across Linux kernels.
- [Build System & Workspace](./build-system-workspace.md) — Workspace configuration and multi-crate build pipeline.
- [License Compliance Deep Dive](./license-compliance-deep.md) — GPLv3 requirements and Linux kernel verifier access.
- [Roadmap Features Deep Dive](./roadmap-features-deep.md) — Technical designs for future observability capabilities.
- [Security Model Deep Dive](./security-model-deep-dive.md) — Threat model and defense-in-depth principles.
- [Testing Strategy](./testing-strategy.md) — Multi-tier testing approach and quality gates.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Resolution steps for build and runtime issues.