# Development Environment & Isolated Build System

This document provides complete instructions for establishing, configuring, and verifying the GhostRing development and compilation environment. 

GhostRing employs a **fully isolated in-repository build environment** (`.build-env/`). This architecture guarantees that all specialized eBPF toolchains, compilers, linkers, and standard library source components reside strictly within the project folder, leaving the host operating system's global Rust installation and user profiles completely untouched.

---

## 1. Environment Architecture & Isolation Model

eBPF kernel probes require specialized toolchains: Rust Nightly, the `rust-src` component (to recompile `core` for the `bpfel-unknown-none` target), and `bpf-linker`. Installing these globally can cause conflicts with other Rust projects on the host system.

GhostRing isolates these components using custom `RUSTUP_HOME` and `CARGO_HOME` roots:

```text
GhostRing/
├── .build-env/                     # GIT-IGNORED: Isolated toolchain root
│   ├── activate                    # Shell activation script (source .build-env/activate)
│   ├── run.sh                      # Command wrapper script (./.build-env/run.sh <cmd>)
│   ├── cargo/                      # Isolated CARGO_HOME
│   │   ├── bin/                    # Local binaries: bpf-linker, rustup shim
│   │   └── registry/               # Local crates.io cache
│   └── rustup/                     # Isolated RUSTUP_HOME
│       └── toolchains/
│           └── nightly-x86_64-*/   # Nightly rustc, rust-src, cargo, clippy, rustfmt
├── scripts/
│   └── setup-env.sh                # Automated zero-friction environment bootstrap script
├── .gitignore                      # Enforces exclusion of .build-env/
└── docs/
    └── development-environment.md  # This document
```

### Environment Isolation Invariants

* **Host Protection:** The host's `~/.rustup` and `~/.cargo` directories are never modified.
* **Git Cleanliness:** `.build-env/` is strictly listed in [`.gitignore`](../.gitignore).
* **Portability:** The entire toolchain can be purged or recreated cleanly by deleting and regenerating `.build-env/`.

---

## 2. System Prerequisites Checklist

Before bootstrapping the build environment, ensure the underlying Linux host meets the following requirements:

| Component | Minimum Requirement | Verification Command | Description |
|---|---|---|---|
| **Linux Kernel** | `5.8` or newer | `uname -r` | Required for modern BPF ring buffers and tracepoints. |
| **Kernel BTF** | Enabled (`CONFIG_BTF=y`) | `test -f /sys/kernel/btf/vmlinux && echo OK` | Required for BPF Type Format & CO-RE portability. |
| **Build Tools** | `curl`, `tar`, `zstd` | `which curl tar zstd` | Required for downloading and unpacking archives. |
| **System Compilers** | `clang`, `llvm` | `which clang llvm-strip` | Used for kernel header inspection and symbol operations. |

---

## 3. Quick-Start: Automated Setup

The repository includes an automated setup script that creates and validates the entire isolated environment in a single step:

```bash
# From repository root:
./scripts/setup-env.sh
```

### What the Setup Script Performs

1. Verifies kernel BTF support (`/sys/kernel/btf/vmlinux`) and system utilities.
2. Initializes directory structures (`.build-env/rustup`, `.build-env/cargo/bin`).
3. Installs Rust Nightly and the `rust-src` component into `.build-env/rustup`.
4. Installs the official statically linked `bpf-linker` release into `.build-env/cargo/bin`.
5. Emits the `activate` and `run.sh` runner scripts.
6. Runs toolchain verification commands.

---

## 4. Manual Setup Procedure (Step-by-Step)

If bootstrapping manually or working in an air-gapped environment, follow these steps:

### Step 1: Initialize Directory Tree
```bash
mkdir -p .build-env/rustup .build-env/cargo/bin
```

### Step 2: Install Rust Nightly and `rust-src`
Point `RUSTUP_HOME` and `CARGO_HOME` to the local directories:
```bash
# Copy or link existing host rustup shim
cp "$(command -v rustup)" .build-env/cargo/bin/rustup

# Install nightly and source components strictly into .build-env/
RUSTUP_HOME="$(pwd)/.build-env/rustup" \
CARGO_HOME="$(pwd)/.build-env/cargo" \
.build-env/cargo/bin/rustup toolchain install nightly --component rust-src

RUSTUP_HOME="$(pwd)/.build-env/rustup" \
CARGO_HOME="$(pwd)/.build-env/cargo" \
.build-env/cargo/bin/rustup default nightly
```

### Step 3: Install `bpf-linker`

> [!IMPORTANT]
> **LLVM Version Alignment**: `rustc` nightly compiles bitcode with LLVM 23 (`Producer: LLVM 23`). Dynamically linking `bpf-linker` against an older system LLVM (such as LLVM 22 or 21) triggers fatal bitcode deserialization errors (`ERROR llvm: Not an int attribute`). 
> Always install the official statically linked `musl` binary containing bundled LLVM.

```bash
# Download official static musl binary (v0.12.0)
curl -sSL https://github.com/aya-rs/bpf-linker/releases/download/v0.12.0/bpf-linker-x86_64-unknown-linux-musl.tar.zst -o /tmp/bpf-linker.tar.zst

# Extract directly to local cargo bin
tar -I zstd -xf /tmp/bpf-linker.tar.zst -C .build-env/cargo/bin/
chmod +x .build-env/cargo/bin/bpf-linker
rm -f /tmp/bpf-linker.tar.zst
```

---

## 5. Daily Development Workflows

### Method A: Interactive Shell Activation (Recommended)

Activate the environment in your active terminal session:

```bash
source .build-env/activate
```

When activated:
* Shell prompt displays `(ghostring-env)`.
* `PATH` prioritizes `.build-env/cargo/bin` and `.build-env/rustup/toolchains/nightly-*/bin`.
* Standard cargo commands operate seamlessly:
  ```bash
  cargo check --workspace
  cargo build --release
  cargo test --workspace
  cargo clippy --workspace -- -D warnings
  ```

To exit the environment and restore your original shell variables:
```bash
deactivate_ghostring
```

### Method B: Non-Interactive Command Runner (`run.sh`)

Execute any tool directly without modifying shell state:

```bash
./.build-env/run.sh cargo --version
./.build-env/run.sh bpf-linker --version
./.build-env/run.sh cargo build --release
```

### Method C: Running the Daemon with Privileges

Loading eBPF bytecode and attaching kernel tracepoints requires elevated capabilities (`CAP_BPF`, `CAP_PERFMON`, or root). When running via `sudo`, preserve the isolated environment using `-E`:

```bash
# Active environment:
sudo -E ./.build-env/run.sh cargo run --release -p ghostring

# Or from within an activated shell:
sudo -E $(which cargo) run --release -p ghostring
```

---

## 6. Verification & Smoke Testing

To verify that the eBPF compilation pipeline is fully functional, run a minimal `no_std` compilation test targeting `bpfel-unknown-none`:

```bash
mkdir -p /tmp/ghostring_smoke && cd /tmp/ghostring_smoke

cat << 'EOF' > Cargo.toml
[package]
name = "smoke_test"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]
EOF

mkdir -p src
cat << 'EOF' > src/lib.rs
#![no_std]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! { loop {} }
EOF

# Execute build using isolated environment
/home/ankur/github/GhostRing/.build-env/run.sh cargo build \
    --target bpfel-unknown-none \
    -Z build-std=core \
    --release

# Validate ELF header and BPF section format
file target/bpfel-unknown-none/release/libsmoke_test.so
# Expected output: ELF 64-bit LSB relocatable, eBPF, version 1 (SYSV)

cd - && rm -rf /tmp/ghostring_smoke
```

---

## 7. Environment Reset & Maintenance

If you ever need to completely clean or reset the build environment:

```bash
# 1. Deactivate if currently active
deactivate_ghostring 2>/dev/null || true

# 2. Remove the entire environment directory
rm -rf .build-env/

# 3. Re-run setup
./scripts/setup-env.sh
```

---

## 8. Related Documentation

- [Build System & Workspace Configuration](./build-system-workspace.md) — Root Cargo workspace manifest, dependency models, and target profile configurations.
- [Aya Framework Guide](./aya-framework.md) — Architecture of Aya, `aya-ebpf`, and user-space communication.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Diagnostic catalog for LLVM mismatches, verifier rejections, and permission errors.
- [Testing Strategy](./testing-strategy.md) — Unit testing, C-ABI struct alignment tests, and integration test execution.