# GhostRing Build System and Workspace Deep Dive

## Workspace Structure and Cargo Configuration

### Root Cargo.toml

```toml
# /home/ankur/git/ghostring/Cargo.toml
[workspace]

members = [
    "ghostring-common",
    "ghostring-ebpf", 
    "ghostring",
]

resolve = "lowest"  // or "highest" depending on dependency needs
```

### Member Crate Structure

| Member | Path | crate-type | Purpose |
|---|---|---|---|
| `ghostring-common` | `ghostring-common/` | `cdylib` | C-compatible structs, shared constants |
| `ghostring-ebpf` | `ghostring-ebpf/` | `no_std cdylib` | eBPF bytecode, BPF programs |
| `ghostring` | `ghostring/` | `bin` (with features) | User-space daemon, CLI |

### Workspace Dependencies

```toml
# Root Cargo.toml - shared dependencies
[dependencies]
# No direct deps at workspace level;
# each crate declares its own

# ghostring-common has ZERO dependencies
# ghostring-ebpf depends on aya-ebpf
# ghostring depends on aya, tokio, clap
```

### Per-Crate Cargo.toml

#### ghostring-common/Cargo.toml

```toml
[package]
name = "ghostring-common"
version = "0.1.0"
crate-type = ["cdylib"]

# No dependencies - self-contained C-compatible types
# No std, no external crates
```

#### ghostring-ebpf/Cargo.toml

```toml
[package]
name = "ghostring-ebpf"
version = "0.1.0"
crate-type = ["cdylib"]

[dependencies]
aya = "0.5"
aya-ebpf = "0.5"
# bpf-linker is a standalone cargo utility, not a rust dep
```

#### ghostring/Cargo.toml

```toml
[package]
name = "ghostring"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.38", features = ["rt-multi-thread", "macros"] }
aya = "0.5"
aya-poll = "0.1"
clap = { version = "4.0", features = ["derive"] }
tracing = "0.1.38"
tracing-subscriber = "0.3.17"

# Optional features
[features]
json-export = ["serde"]
```

## Build Commands and Workflow

> [!TIP]
> **Isolated Environment Execution**: Always activate the isolated in-repository build environment (`source .build-env/activate`) or prefix commands with `./.build-env/run.sh` to ensure `rustc` nightly and `bpf-linker` are utilized.

#### Step 1: Build eBPF Bytecode

```bash
# From repository root
cd ghostring-ebpf
cargo build --release

# Output: target/bpfel-unknown-none/release/ghostring_ebpf
# This is the raw BPF ELF bytecode ready for kernel loading
```

**What happens internally:**

1. `cargo build` compiles Rust to LLVM IR
2. `bpf-linker` processes the ELF:
   - Reorganizes sections for `bpfel-unknown-none`
   - Embeds BTF metadata (if available)
   - Adds `__license` section from package metadata
   - Outputs BPF-targeted ELF
3. Result is loadable eBPF bytecode

#### Step 2: Build User-Space Daemon

```bash
# From repository root
cd ghostring
cargo build --release
```

**What happens internally:**

1. Compiles Rust with nightly toolchain
2. Links against `aya`, `tokio`, `clap`
3. Produces executable at `target/release/ghostring`
4. Requires `sudo` for eBPF loading at runtime

#### Step 3: Build Entire Workspace

```bash
# From repository root
cargo build --release --workspace
```

**What this does:**

1. Builds all three crates in dependency order
2. Resolves workspace conflicts
3. Ensures consistent versions
4. May build common twice (once for each dependent)

### Incremental Builds

```bash
# Only rebuild changed crates
cargo build --release  # From root, builds what's needed

# Force rebuild of specific crate
cargo build --release --package ghostring-ebpf

# Clean and rebuild from scratch
cargo clean --release --workspace
```

### Build Scripts (build.rs)

#### ghostring-common - None Required

```toml
# No build.rs needed - zero dependencies
# All structs are plain #[repr(C)] types
```

#### ghostring-ebpf - Linker Configuration

```rust
// ghostring-ebpf/build.rs
use std::env;
use std::fs;

fn main() {
    // Tell cargo to tell rustc to link the bpf-library
    // bpf-linker is invoked as a cargo subcommand, not a lib
    
    // Emit BPF-specific metadata
    println!("cargo:rustc-link-arg-bpf=--target=bpfel-unknown-none");
    println!("cargo:rustc-link-arg-bpf=--tbdf=0x0000:00:00.0");
    
    // BTF embedding if available
    if std::path::Path::new("/sys/kernel/btf/vmlinux").exists() {
        println!("cargo:rustc-link-arg-bpf=--btf");
    }
    
    // License string - CRITICAL
    println!("cargo:rustc-link-arg-bpf=--license=GPLv3");
}
```

#### ghostring - No build.rs needed

Standard compilation, links against downloaded dependencies.

## Target Specification

### `bpfel-unknown-none` Details

| Attribute | Value |
|---|---|
| **Endian** | Little-endian (`bpfel`) |
| **OS** | None (`-no-os`) - freestanding |
| **Arch** | BPF (Berkeley Packet Filter) |
| **Standard** | `no_std` compatible |
| **Linker** | `bpf-linker` cargo utility |

### Target JSON (target specification)

```json
{
  "targets": {
    "bpfel-unknown-none": {
      "architecture": "bpf",
      "object_format": "elf",
      "all_targets": {
        "bpfel-unknown-none": {
          "cpu": "generic",
          "features": "+mul",
          "max_cpu_count": 1
        }
      }
    }
  }
}
```

### Custom Target Profile

```toml
# ~/.cargo/config.toml or ghostring-ebpf/Cargo.toml
[target.bpfel-unknown-none]
rustflags = [
    "--emit=obj",     # Emit object file
    "--crate-type=cdylib",  # CDLL-compatible
    "--divernone",    # No standard library
    "-C", "link-arg=-shared",  # Linker options
]
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/build.yml
name: GhostRing CI

on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    build:
        runs-on: ubuntu-latest
        
        steps:
        - uses: actions/checkout@v3
        
        - name: Install toolchain
            run: |
                rustup toolchain install nightly --component rust-src
                rustup default nightly
                cargo install bpf-linker
        
        - name: Build eBPF bytecode
            run: |
                cd ghostring-ebpf
                cargo build --release
        
        - name: Build user daemon
            run: |
                cd ghostring
                cargo build --release
        
        - name: Verify workspace build
            run: |
                cargo build --release --workspace
```

### Verification Steps

1. **Toolchain check**: Nightly installed with rust-src
2. **bpf-linker**: Installed and accessible
3. **eBPF build**: `cargo build --release` in ghostring-ebpf succeeds
4. **User build**: `cargo build --release` in ghostring succeeds
5. **Workspace**: `cargo build --release --workspace` succeeds
6. **Tests**: `cargo test --workspace` passes (if tests exist)

### Docker Build Considerations

```dockerfile
# Dockerfile for GhostRing build
FROM ubuntu:22.04

# Install prerequisites
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    llvm \
    make \
    m4 \
    # Rust toolchain
    && curl --proto '=https' --tlsv12 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain none \
    && /root/.cargo/bin/rustup toolchain install nightly --component rust-src \
    && /root/.cargo/bin/rustup default nightly \
    # bpf-linker
    && /root/.cargo/bin/cargo install bpf-linker \
    # Git clone
    && git clone https://github.com/ankur3-101106/GhostRing.git /ghostring \
    && cd /ghostring

# Build stages
WORKDIR /ghostring/ghostring-ebpf
RUN cargo build --release

WORKDIR /ghostring/ghostring
RUN cargo build --release

WORKDIR /ghostring
# Note: Runtime requires sudo + kernel with BTF
```

### Cross-Compilation Considerations

| Scenario | Feasibility | Notes |
|---|---|---|
| **Build on x86, run on BPF** | ✅ Supported | `bpfel-unknown-none` target handles this |
| **Build on ARM64, run on BPF** | ✅ Supported | Same target, different host |
| **Build on BPF host** | ❌ Not possible | BPF is not a general CPU architecture |
| **Emulated BPF build** | ⚠️ Possible | QEMU user mode + nightly Rust |

## Dependency Management

### Semantic Versioning Policy

| Crate | Initial Version | Stability Guarantee |
|---|---|---|
| `ghostring-common` | 0.1.0 | Breaking changes allowed until 1.0.0 |
| `ghostring-ebpf` | 0.1.0 | API compatible within 0.x.y |
| `ghostring` | 0.1.0 | CLI stable after 0.1.0 |

### Version Bump Triggers

**Major version (0.x.y → 1.0.0)**:
- Remove/deprecate struct fields in `ghostring-common`
- Change `#[repr(C)]` layout
- Remove public API functions

**Minor version (0.x.y → 0.x+1.y)**:
- Add new fields (with deprecation period)
- Add new event types
- Add new CLI flags

**Patch version (0.x.y → 0.x.y+1)**:
- Bug fixes only
- Internal refactoring
- Documentation updates

### Cargo Lock Management

```bash
# Generate/update lock file
cargo generate-lockfile

# Check for updates (minor/patch only, respecting semver)
cargo update

# Strict lock (no network)
cargo build --frozen
```

### Avoiding Dependency Conflicts

| Conflict | Resolution |
|---|---|
| `aya` version mismatch between crates | Use workspace root `Cargo.toml` to pin, or ensure all members use same version |
| `tokio` feature flag drift | Coordinate feature flags across all dependents |
| `clap` version differences | Pin version in root or each member consistently |

## Profile and Release Configuration

### Release Profile

```toml
# ghostring-ebpf/Cargo.toml - release profile
[profile.release]
opt-level = "z"        # Aggressive optimization
lto = true             # Link-time optimization
codegen-units = 1      # Single codegen unit (BPF target)
debug = 1              # Keep some debug info

# Bfloat16/float16 not relevant for BPF
# prefer-dynamic still false (static linking preferred)
```

### Debug Profile

```toml
[profile.debug]
opt-level = "0"        # No optimization
lto = false
codegen-units = "auto"
debug = 2              # Full debug info
overflow-checks = true
panic = "abort"
```

### Nightly-Specific Features

```toml
# Requires nightly Rust
[profile.release]
lto = true
codegen-units = 1

# simd nightly feature (if needed for future)
[features]
simd = ["core::simd"]
```

## Troubleshooting Build Issues

### Common Build Errors

| Error | Cause | Fix |
|---|---|---|
| "unknown target keyword `bpfel-unknown-none`" | Wrong rust-toolchain | `rustup default nightly`; ensure `rust-src` component |
| "bpf-linker not found" | Utility not installed | `cargo install bpf-linker` |
| "linker `ld` not found for target bpfel-unknown-none" | Missing BPF LLVM backend | Ensure LLVM with BPF target: `apt-get install llvm-15-bpf` |
| "failed to parse BTF from vmlinux" | BTF not enabled in kernel | Rebuild kernel with `CONFIG_BTF=y` |
| "license check failed" | Missing `--license=GPLv3` flag | Add to build.rs: `println!("cargo:rustc-link-arg-bpf=--license=GPLv3")` |
| "undefined helper: bpf_ktime_get_ns" | Helper not available without GPLv3 | Ensure license section is GPLv3 |
| "failed to acquire `target`" | Another build running | `cargo clean` or wait |

### Build Time Optimization

```bash
# Parallel build of independent crates
cargo build --release -p ghostring-common -p ghostring-ebpf -p ghostring

# Only rebuild what changed
cargo check --workspace  # Faster than build, checks for errors

# Incremental (default) - only rebuild changed
# Full clean:
cargo clean --release --workspace
# Then: cargo build --release --workspace
```

### Verifying Build Correctness

```bash
# Check build artifacts exist
ls -la ghostring-ebpf/target/bpfel-unknown-none/release/ghostring_ebpf
ls -la ghostring/target/release/ghostring

# Verify binary is not empty
file ghostring-ebpf/target/bpfel-unknown-none/release/ghostring_ebpf
# Should show: ELF 32-bit LSB executable, BPF

# Check build timestamps
stat ghostring-ebpf/target/bpfel-unknown-none/release/ghostring_ebpf
stat ghostring/target/release/ghostring
```

## Development Iteration Workflow

### Typical Developer Loop

```bash
# 1. Modify eBPF program (ghostring-ebpf/src/probes.rs)
#    - Add new tracepoint
#    - Change struct in ghostring-common
#    - Modify probe logic

# 2. Rebuild eBPF bytecode
cd ghostring-ebpf && cargo build --release && cd ..

# 3. Rebuild user daemon (picks up new struct layout)
cd ghostring && cargo build --release && cd ..

# 4. Test: trigger syscall, observe daemon output
sudo -E cargo run --release

# 5. Verify: check event fields match expectations
#    - pid, uid, command name correct?
#    - No truncation issues?
#    - Buffer overflows?

# 6. Commit: git add . && git commit -m "feat: new probe type"
```

### Rapid Prototyping

```bash
# Don't rebuild full release for each change
# Use cargo check for syntax validation
cargo check --package ghostring-ebpf

# Use debug builds for faster iteration
cargo build --package ghostring-ebpf  # (no --release flag)

# Faster polling loop during development
# Reduce polling interval in code
tokio::time::sleep(std::time::Duration::from_millis(1)).await;
```

## Related Documentation

- [Development Environment](./development-environment.md) — Toolchain requirements, Rust Nightly installation, and system utilities.
- [Architecture Overview](./architecture-overview.md) — Workspace layout and crate boundary responsibilities.
- [eBPF Internals & Bytecode](./ebpf-internals.md) — Compilation target `bpfel-unknown-none` and `bpf-linker` ELF layout.
- [ghostring-common Struct Design](./ghostring-common-structs.md) — C-compatible struct layouts and ABI versioning.
- [ghostring User Daemon](./ghostring-user-daemon.md) — Tokio user-space daemon build and runtime configurations.
- [Aya Framework](./aya-framework.md) — Dependency specification and integration with the Aya framework ecosystem.
- [License Compliance Deep Dive](./license-compliance-deep.md) — Linking `--license=GPLv3` in `build.rs` to satisfy kernel verifier checks.
- [Testing Strategy](./testing-strategy.md) — Cargo workspace test runs, clippy checks, and automated CI/CD gates.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Resolving compiler errors, linker flags, and target mismatch issues.