# PROJECT.md

This file provides guidance on creating and working with the GhostRing project.

## Prerequisites

- Linux kernel 5.8 or higher (with BTF enabled)
- Rust Nightly toolchain (with `rust-src` component)
- LLVM, m4, make build utilities
- `bpf-linker` cargo utility (`cargo install bpf-linker`)

## Build & Running

### 1. Install toolchain and components

```bash
rustup toolchain install nightly --component rust-src
rustup default nightly
cargo install bpf-linker
```

### 2. Compile the kernel‑space eBPF bytecode

```bash
cd ghostring-ebpf
cargo build --release
cd ..
```

### 3. Run the user‑space daemon

```bash
cd ghostring
sudo -E cargo run --release
```

## License

This project is licensed under the GNU General Public License v2.0 (GPLv2). The Linux kernel eBPF verifier requires GPL‑compatible licensing for advanced BPF helper functions.

## ⚠️ Sensitive Information

The `.env/` directory contains API credentials. **Never commit or expose these files.** They are git‑ignored and intended for local use only.