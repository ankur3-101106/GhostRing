# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

GhostRing is a Linux security observability daemon built with Rust and the Aya eBPF framework. It operates across three crates:

- **ghostring-common** — C-compatible structs shared across the kernel/user-space boundary
- **ghostring-ebpf** — `no_std` Rust kernel bytecode program (Ring 0, eBPF)
- **ghostring** — Asynchronous Tokio user-space daemon & CLI

The telemetry pipeline: kernel tracepoint → eBPF program → perf ring buffer → user-space Tokio daemon → logging/auditing/alert routing.

## Build & Development

**Prerequisites:**
- Linux kernel 5.8+ (with BTF enabled)
- Rust Nightly (with `rust-src` component)
- LLVM, m4, make
- `bpf-linker` cargo utility (`cargo install bpf-linker`)

**Commands:**

```bash
# Install toolchain and components
rustup toolchain install nightly --component rust-src
rustup default nightly
cargo install bpf-linker

# Compile the eBPF kernel bytecode
cd ghostring-ebpf
cargo build --release
cd ..

# Run the user-space daemon (requires sudo)
cd ghostring
sudo -E cargo run --release
```

**Linting:**
```bash
cargo fmt
cargo clippy
```

## Testing

No test framework is configured in this repository. The project focuses on kernel-level eBPF instrumentation; unit tests for the user-space daemon may be added in the future.

## License

This project is licensed under the GNU General Public License v2.0 (GPLv2). The Linux kernel eBPF verifier requires GPL-compatible licensing for advanced BPF helper functions.

## ⚠️ Sensitive Information

The `.env/` directory contains API credentials. **Never commit or expose these files.** They are gitignored and should remain local only.