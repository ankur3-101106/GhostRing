# Development Environment for GhostRing

## Prerequisites Checklist

### Operating System
- **Linux kernel 5.8 or higher** with **BTF enabled**
- Verify BTF availability: `/sys/kernel/btf/vmlinux` must exist
- Confirmed distributions: Ubuntu 20.04+, Debian 10+, Fedora 31+, modern WSL2

### Rust Toolchain
```bash
# Install nightly with rust-src component
rustup toolchain install nightly --component rust-src
rustup default nightly

# Verify installation
rustc --version        # Should show nightly
rustup show            # Confirm current toolchain
```

### Build Utilities
```bash
# System packages (example for Ubuntu/Debian)
sudo apt-get install llvm m4 make

# Verify
which llvm-config
which make
which m4
```

### eBPF Linker
```bash
# Install bpf-linker cargo utility
cargo install bpf-linker

# Verify
bpf-linker --version
```

## Directory Structure

After cloning and setting up:

```
GhostRing/
├── Cargo.toml                  # Workspace manifest
├── ghostring-common/           # C-compatible structs (cdylib)
├── ghostring-ebpf/             # no_std eBPF bytecode (bpfel-unknown-none)
├── ghostring/                  # Tokio user-space daemon (std, async)
├── prerequisites/              # This directory — technical knowledge base
├── CLAUDE.md                   # Claude Code guidance
├── PROJECT.md                  # Project setup guidance
├── README.md                   # High-level overview and roadmap
├── LICENSE                     # GPLv3 license
└── .gitignore                  # Build artifacts and sensitive files
```

## Build Workflow

### 1. Compile eBPF Bytecode
```bash
cd ghostring-ebpf
cargo build --release
# Produces: target/bpfel-unknown-none/release/ghostring_ebpf
cd ..
```

### 2. Build User-Space Daemon
```bash
cd ghostring
cargo build --release
# Requires sudo for eBPF loading and attachment
```

### 3. Run the Daemon
```bash
cd ghostring
sudo -E cargo run --release
# -E preserves environment variables (cargo toolchain paths)
# Requires elevated privileges for eBPF operations
```

## Running Commands Summary

| Operation | Command | Directory | Privileges |
|---|---|---|---|
| Install toolchain | `rustup toolchain install nightly --component rust-src` | root/project | user |
| Install bpf-linker | `cargo install bpf-linker` | any | user |
| Build eBPF | `cargo build --release` | ghostring-ebpf | user |
| Build daemon | `cargo build --release` | ghostring | user |
| Run daemon | `sudo -E cargo run --release` | ghostring | sudo |
| Run tests | `cargo test --workspace` | root | user |
| Clippy lint | `cargo clippy --workspace -- -D warnings` | root | user |
| Format check | `cargo fmt --check --workspace` | root | user |

## Development Roadmap Items

### Current Capabilities
- sys_enter_execve tracepoint monitoring
- pid/uid extraction via eBPF
- PerfEventArray ring buffer transmission
- Tokio async ingestion in user space

### Planned Features (TODO)
- **[ ] Advanced Path Extraction**: `bpf_probe_read_user_str` for full file paths
- **[ ] Network Socket Observability**: tcp_connect kprobes for reverse-shell detection
- **[ ] File Integrity Monitoring**: sys_enter_openat for sensitive file tracking
- **[ ] JSON Event Export**: CLI flag for SIEM-compatible structured output

## Troubleshooting Checklist

| Issue | Likely Cause | Fix |
|---|---|---|
| eBPF load fails | License not GPLv3 | Ensure LICENSE says GPLv3; check verifier messages |
| No events appearing | BTF not enabled | Rebuild kernel with `CONFIG_BTF=y`; verify `/sys/kernel/btf/vmlinux` exists |
| Buffer overflows | PerfEventArray full | Increase buffer sizes; handle overflow in user-space polling |
| Permission denied | Missing kernel headers | Install matching kernel headers/debug packages |
| Compile errors | Wrong rust toolchain | `rustup default nightly`; ensure `rust-src` component |