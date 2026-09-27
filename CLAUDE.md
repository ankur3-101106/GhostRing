# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GhostRing is a high-performance Linux security observability daemon built with Rust and the Aya eBPF framework. It instruments the kernel at Ring 0 via eBPF to intercept system calls directly in the kernel execution path.

## Workspace Structure (Planned)

```
GhostRing/
├── Cargo.toml                  # Workspace manifest defining shared dependencies
├── ghostring-common/           # C-compatible structs shared across kernel boundary
├── ghostring-ebpf/             # no_std Rust kernel bytecode program (Ring 0)
└── ghostring/                  # Asynchronous Tokio user-space daemon & CLI
```

## Build & Development Commands

### Prerequisites
- Linux kernel 5.8+ with BTF enabled
- Rust Nightly toolchain with `rust-src` component
- `bpf-linker` cargo utility

```bash
# Setup Rust nightly
rustup toolchain install nightly --component rust-src
rustup default nightly

# Install eBPF linker
cargo install bpf-linker
```

### Build Commands

```bash
# Build the eBPF kernel-space bytecode (from ghostring-ebpf/)
cd ghostring-ebpf && cargo build --release

# Build the user-space daemon (from ghostring/)
cd ghostring && cargo build --release

# Build entire workspace (from root)
cargo build --release --workspace
```

### Run Commands

```bash
# Run the daemon (requires sudo for eBPF loading)
cd ghostring && sudo -E cargo run --release
```

### Testing & Linting

```bash
# Run tests for workspace
cargo test --workspace

# Run tests for specific crate
cargo test -p ghostring-common
cargo test -p ghostring-ebpf
cargo test -p ghostring

# Lint with clippy
cargo clippy --workspace -- -D warnings

# Format check
cargo fmt --check --workspace
```

## Architecture Notes

### Telemetry Pipeline
1. **Trigger**: Process initiates syscall (e.g., `sys_enter_execve`)
2. **Execution** (`ghostring-ebpf`): eBPF bytecode executes in kernel, extracts `pid`, `uid`, command metadata
3. **Transmission**: Serialized via `PerfEventArray` ring buffer map using `#[repr(C)]` structs
4. **Ingestion** (`ghostring`): Tokio daemon polls per-CPU ring buffers asynchronously

### Crate Responsibilities

**ghostring-common** (`cdylib`/`staticlib`):
- `#[repr(C)]` structs for kernel↔user communication
- Shared constants, event types, enums
- No dependencies on kernel or std

**ghostring-ebpf** (`no_std`, target: `bpfel-unknown-none`):
- eBPF probe programs (tracepoints, kprobes)
- Uses `aya-ebpf` crate for BPF helpers
- Compiled with `bpf-linker` to BPF bytecode

**ghostring** (std, Tokio async):
- User-space daemon with CLI
- Loads/attaches eBPF programs via `aya`
- Async ring buffer consumption
- Logging, alerting, JSON export (planned)

## Key Technical Requirements

- **License**: GPLv2 (required for full eBPF helper access)
- **Kernel verifier**: All eBPF code must pass static verification
- **BTF**: Preferred for CO-RE (Compile Once, Run Everywhere) portability
- **Safety**: `no_std` in eBPF crate; minimal `unsafe` only for FFI boundaries

## Development Roadmap (from README)

- [ ] Advanced path extraction via `bpf_probe_read_user_str`
- [ ] Network socket observability (tcp_connect kprobes)
- [ ] File integrity monitoring (sys_enter_openat)
- [ ] Structured JSON event export for SIEM integration

## Common Development Tasks

When the crates are created, typical workflow:

1. Modify shared structs in `ghostring-common` → rebuild both crates
2. Edit eBPF probes in `ghostring-ebpf` → `cargo build --release` in that crate
3. Edit daemon logic in `ghostring` → `cargo run --release` with sudo
4. Test changes: trigger syscalls (e.g., run commands) and observe daemon output

## Important Notes

- eBPF development requires kernel headers matching running kernel
- BTF-enabled kernels (`/sys/kernel/btf/vmlinux` exists) simplify CO-RE
- The `bpf-linker` handles ELF section layout for BPF programs
- PerfEventArray requires per-CPU buffer polling in user space