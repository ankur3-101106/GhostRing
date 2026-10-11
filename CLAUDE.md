# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

### Prerequisites
- Linux kernel 5.8+ with BTF enabled
- Rust Nightly toolchain with `rust-src` component
- `bpf-linker` cargo utility

```bash
# Install the Rust nightly toolchain
rustup toolchain install nightly --component rust-src
rustup default nightly

# Install the eBPF linker
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

### Test Commands

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

### Run Commands

```bash
# Run the daemon (requires sudo for eBPF loading)
cd ghostring && sudo -E cargo run --release
```

## Architecture Overview

GhostRing is a high-performance Linux security observability daemon built with Rust and the Aya eBPF framework. It instruments the kernel at Ring 0 via eBPF to intercept system calls directly in the kernel execution path.

The workspace consists of three crates:

```
ghostring/
├── Cargo.toml              # Workspace manifest
├── ghostring-common/       # C-compatible structs shared across kernel boundary
├── ghostring-ebpf/         # no_std Rust kernel bytecode program (Ring 0)
└── ghostring/              # Asynchronous Tokio user-space daemon & CLI
```

### Crate Responsibilities

- **ghostring-common** (`cdylib`/`staticlib`): `#[repr(C)]` structs for kernel↔user communication, shared constants and event types, no kernel or std dependencies
- **ghostring-ebpf** (`no_std`, target: `bpfel-unknown-none`): eBPF probe programs (tracepoints, kprobes), uses `aya-ebpf` crate, compiled with `bpf-linker` to BPF bytecode
- **ghostring** (std, Tokio async): User-space daemon with CLI, loads/attaches eBPF programs via `aya`, async ring buffer consumption, logging and alerting

### Telemetry Pipeline

1. **Trigger**: Process initiates syscall (e.g., `sys_enter_execve`)
2. **Execution** (`ghostring-ebpf`): eBPF bytecode executes in kernel, extracts `pid`, `uid`, command metadata
3. **Transmission**: Serialized via `PerfEventArray` ring buffer map using `#[repr(C)]` structs
4. **Ingestion** (`ghostring`): Tokio daemon polls per-CPU ring buffers asynchronously

## Key Technical Requirements

- **License**: GPLv3 (required for full eBPF helper access via the Linux kernel verifier)
- **Kernel verifier**: All eBPF code must pass static verification
- **BTF**: Preferred for CO-RE (Compile Once, Run Everywhere) portability
- **Safety**: `no_std` in eBPF crate; minimal `unsafe` only for FFI boundaries

## Development Roadmap

- Advanced path extraction via `bpf_probe_read_user_str`
- Network socket observability (tcp_connect kprobes)
- File integrity monitoring (sys_enter_openat)
- Structured JSON event export for SIEM integration

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3). The Linux kernel eBPF verifier requires GPL‑compatible licensing for advanced BPF helper functions.