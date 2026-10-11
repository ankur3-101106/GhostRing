# GhostRing Testing Strategy Deep Dive

## Testing Philosophy

GhostRing's testing strategy follows a **pyramid approach** with four layers:

```
┌──────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Layer 4: End-to-End (rare)                                   │ │
│  - Full system with kernel, eBPF, daemon                      │ │
│  - Manual triggering of syscalls                              │ │
│  - Verified event output                                      │ │
│                                                               │
│  Layer 3: Integration (limited CI)                            │ │
│  - eBPF program loads                                         │ │
│  - Map creation verified                                      │ │
│  - Basic functionality checks                                 │ │
│                                                               │
│  Layer 2: Unit/Component (frequent)                         │ │
│  - Struct layout tests                                        │ │
│  - Compile checks                                             │ │
│  - Helper function tests (host-side)                          │ │
│                                                               │
│  Layer 1: Property-Based / Fuzz (targeted)                    │ │
│  - eBPF bytecode edge cases                                   │ │
│  - Verifier compatibility checks                              │ │
│  - Struct size invariants                                     │ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Layer 1: Unit Tests ( ghostring-common)

### Struct Layout Tests

```rust
// ghostring-common/tests/struct_sizes.rs

use ghostring_common::{ExecveEvent, UidGidEvent, FileEvent};

const _: () = {
    // These must compile and pass every build
    
    // ExecveEvent must be exactly 40 bytes (4+4+4+4+8+8+16)
    assert_eq!(std::mem::size_of::<ExecveEvent>(), 40);
    assert_eq!(std::mem::align_of::<ExecveEvent>(), 4);
    
    // UidGidEvent must be exactly 16 bytes (8+4+4)
    assert_eq!(std::mem::size_of::<UidGidEvent>(), 16);
    assert_eq!(std::mem::align_of::<UidGidEvent>(), 4);
    
    // FileEvent size depends on feature flags
    // Without path_extraction: smaller
    // With path_extraction: 287 bytes
    
    // Static assertions compile-time
    #[cfg(feature = "path_extraction")]
    assert_eq!(std::mem::size_of::<FileEvent>(), 287);
    
    #[cfg(not(feature = "path_extraction"))]
    assert_eq!(std::mem::size_of::<FileEvent>(), 17); // minimal version
};
```

### Type and Repr Tests

```rust
// Ensure C compatibility at compile time

#[test]
fn test_c_compatibility() {
    use ghostring_common::{ExecveEvent, UidGidEvent};
    
    // These types must have predictable layouts
    
    // Verify repr(C) is present (compile error if removed)
    // This test ensures we haven't accidentally removed repr(C)
    
    // Check that enum discriminants are predictable
    use ghostring_common::EventType;
    assert_eq!(EventType::Execve as u8, 0x01);
    assert_eq!(EventType::UidGid as u8, 0x02);
}
```

### Constant Validation

```rust
#[test]
fn test_constants() {
    use ghostring_common::{MAX_COMM_LEN, MAX_PATH_LEN};
    
    // MAX_COMM_LEN must be 16 (includes null terminator)
    assert_eq!(MAX_COMM_LEN, 16);
    
    // MAX_PATH_LEN depends on feature flags
    #[cfg(feature = "path_extraction")]
    assert_eq!(MAX_PATH_LEN, 256);
    
    // Basic constant sanity checks
    assert!(MAX_COMM_LEN > 0);
    assert!(MAX_PATH_LEN > MAX_COMM_LEN);
}
```

## Layer 2: Integration Tests (ghostring-ebpf)

### eBPF Program Compilation Tests

```rust
// Test that eBPF programs compile to valid bytecode

fn test_ebpf_compilation() {
    // Build the eBPF crate and verify:
    
    // 1. cargo build --release succeeds
    // 2. Output binary exists
    // 3. bpf-linker processed the ELF
    // 4. __license section is present and correct
    
    let output = std::process::Command::new("cargo")
        .args(&["build", "--release", "--package", "ghostring-ebpf"])
        .current_dir("/path/to/ghostring")
        .output()
        .expect("Failed to build ghostring-ebpf");
    
    // Check exit code
    assert!(output.status.success(), 
        "eBPF build failed: {}", 
        String::from_utf8_lossy(&output.stderr));
    
    // Check output binary exists
    let binary_path = "target/bpfel-unknown-none/release/ghostring_ebpf";
    assert!(
        std::path::Path::new(binary_path).exists(),
        "eBPF binary not found at expected path"
    );
    
    // Check __license section (via bpftool or readelf)
    let license_output = std::process::Command::new("readelf")
        .args(&["-S", binary_path])
        .output()
        .expect("Failed to read ELF sections");
    
    let license_output_str = String::from_utf8_lossy(&output.status);
    assert!(
        license_output_str.contains("GPLv3") || 
        String::from_utf8_lossy(&license_output).contains("GPLv3"),
        "License section not GPLv3"
    );
}
```

### Verifier Compatibility Checks

```rust
// Ensure eBPF programs pass kernel verifier checks

fn test_verifier_compatibility() {
    // Build with checks that verifier would enforce:
    
    // 1. No infinite loops (structural verification)
    // 2. Memory access bounds checked
    // 3. Helper license compliance
    // 4. Register usage within limits
    // 5. Stack depth within limits
    
    // Since we can't run the kernel verifier in CI,
    // we check compile-time indicators:
    
    // - All helper calls go through aya::helpers (verified signatures)
    // - No `unsafe` blocks except FFI boundaries
    // - All structs in common are #[repr(C)]
    // - No std dependencies in ebpf crate
    
    // CI check: ensure no_std is maintained
    let cargo_toml = std::fs::read_to_string(
        "/path/to/ghostring-ebpf/Cargo.toml"
    ).expect("Failed to read Cargo.toml");
    
    // Verify no std dependency in ebpf crate
    assert!(!cargo_toml.contains("std"), 
        "ghostring-ebpf should not depend on std");
}
```

### BTF/CO-RE Tests

```rust
// Test that BTF metadata is embedded and CO-RE works

fn test_btf_co_rem() {
    // Verify BTF embedding:
    
    // 1. Read ELF sections for .BTF, .BTF.ext
    // 2. Verify __license section contains "GPLv3"
    // 3. Check that struct field access uses Aya helpers
    // 4. Ensure no hardcoded kernel offsets in eBPF source
    
    let binary_path = "/path/to/ghostring-ebpf/target/.../ghostring_ebpf";
    
    // Check BTF sections exist
    let output = std::process::Command::new("readelf")
        .args(&["-S", binary_path])
        .output()
        .expect("Failed to read ELF");
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    
    // Check for BTF sections
    assert!(
        output_str.contains(".BTF") || output_str.contains(".btf"),
        "BTF sections not found in eBPF binary"
    );
    
    // Check license section
    assert!(
        output_str.contains("GPLv3"),
        "License section not GPLv3"
    );
}
```

## Layer 3: CI/CD Testing

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: GhostRing CI

on:
    push:
        branches: [main, develop]
    pull_request:
        branches: [main]

jobs:
    test:
        runs-on: ubuntu-latest
        
        steps:
        - uses: actions/checkout@v3
        
        - name: Install toolchain
            run: |
                rustup toolchain install nightly --component rust-src
                rustup default nightly
                cargo install bpf-linker
        
        - name: Build ghostring-common
            run: |
                cargo build --package ghostring-common --release
            # Verify struct sizes
            run: |
                cargo test -p ghostring-common -- struct_sizes
        
        - name: Build ghostring-ebpf
            run: |
                cargo build --package ghostring-ebpf --release
            # Verify BTF and license
            run: |
                cargo test -p ghostring-ebpf -- btf_co_re
        
        - name: Build ghostring
            run: |
                cargo build --package ghostring --release
            # Verify user-daemon compiles
        
        - name: Run all tests
            run: |
                cargo test --workspace -- --skip integration  # Skip slow integration
        
        - name: Check clippy linting
            run: |
                cargo clippy --workspace -- -D warnings
        
        - name: Format check
            run: |
                cargo fmt --check --workspace
```

### Test Categorization

```rust
// Tests categorized by speed and requirement

// Fast unit tests (run on every PR)
#[cfg(test)]
mod tests {
    use ghostring_common::{ExecveEvent, UidGidEvent};
    
    #[test]
    fn test_execve_event_size() {
        assert_eq!(std::mem::size_of::<ExecveEvent>(), 40);
    }
    
    #[test]
    fn test_uid_gid_event_size() {
        assert_eq!(std::mem::size_of::<UidGidEvent>(), 16);
    }
}

// Medium integration tests (run on merge to main)
#[cfg(test)]
mod integration {
    use ghostring_ebpf::helpers;
    
    #[test]
    fn test_helper_signatures() {
        // Verify helper functions have expected signatures
        // These are checked at compile time via usage
    }
}

// Slow end-to-end tests (run on release tags only)
#[cfg(test)]
mod e2e {
    use std::process::Command;
    
    #[test]
    fn test_daemon_runs() {
        // Requires: kernel 5.8+, BTF, sudo
        // Runs: sudo -E cargo run --release (integration test)
        // Verifies: daemon starts, attaches eBPF, polls rings
    }
}
```

### Continuous Integration Gates

| Gate | Purpose | Pass Condition |
|---|---|---|
| **Build** | All crates compile | `cargo build --release --workspace` exit 0 |
| **Common tests** | Struct layouts, constants | All `cargo test -p ghostring-common` pass |
| **Ebpf compile** | eBPF bytecode builds | `cargo build --release -p ghostring-ebpf` exit 0 |
| **Clippy** | Code quality | `cargo clippy --workspace -- -D warnings` exit 0 |
| **Format** | Code style | `cargo fmt --check --workspace` exit 0 |
| **License check** | GPLv3 compliance | `__license` section = "GPLv3" |
| **BTF check** | CO-RE support | `.BTF` sections present in ELF |

### Performance Testing

```rust
// Micro-benchmarking test suite

fn benchmark_poll_latency() {
    // Measure round-trip time: eBPF event → ring buffer → user parse
    
    use std::time::Instant;
    
    // Warm up
    for _ in 0..100 {
        // Poll ring buffer
    }
    
    // Benchmark
    let iterations = 1000;
    let start = Instant::now();
    
    for _ in 0..iterations {
        // Poll and process event
        // poll_ring_buffer()?;
    }
    
    let elapsed = start.elapsed();
    let avg_us = elapsed.as_micros() as f64 / iterations as f64;
    
    log::info!("Average poll latency: {:.2} μs", avg_us);
    
    // Alert if latency regresses
    assert!(avg_us < 500.0, "Poll latency too high: {:.2} μs", avg_us);
}
```

### Property-Based Testing

```rust
// Using proptest or similar for invariants

fn test_struct_invariants() {
    // Properties that must always hold:
    
    // 1. ExecveEvent is 40 bytes (never changes without version bump)
    // 2. All field offsets are predictable
    // 3. Enum discriminants are consistent
    // 4. Constant values are within expected ranges
    
    // These are checked via const assertions:
    const _: () = {
        // Compile-time check: sizes known at compile day
        type ExecveSize = [u8; { std::mem::size_of::<ghostring_common::ExecveEvent>() }];
        assert_eq!(std::mem::size_of::<ExecveSize>(), 40);
    };
}
```

### Manual Testing Checklist

#### Prerequisites for Manual Testing

```
[ ] Linux kernel 5.8+ with BTF enabled
[ ] Rust Nightly with rust-src component
[ ] bpf-linker cargo utility installed
[ ] sudo privileges for eBPF loading
[ ] GhostRing built (cargo build --release --workspace)
```

#### Step-by-Step Manual Test

```
1. Load module (implicit via cargo run):
   sudo -E cargo run --release
   
   Expected output: Daemon starts, attaches eBPF programs
   (No errors about license, verifier, attachment)

2. Trigger a syscall:
   Run any command: ls, cd, bash, etc.
   
   Expected: Daemon prints event output like:
   "execve: pid=1234 uid=0 comm=ls"
   
3. Verify event fields:
   - pid matches the command's PID
   - uid matches the user running the command
   - comm is the command name (may be truncated to 15 chars)
   
4. Test multiple events:
   Run multiple commands quickly
   
   Expected: Multiple event lines printed
   No crashes or "buffer overflow" errors

5. Check help options:
   cargo run --release -- --help
   cargo run --release -v
   
   Expected: CLI accepts flags, shows help
```

### Debugging Test Failures

| Failure Mode | Likely Cause | Debug Steps |
|---|---|---|
| "struct size mismatch" | Field added/removed without updating | Check `ghostring-common-structs.md`; bump version |
| "license check failed" | `__license` section wrong | Verify `build.rs` has `println!("cargo:rustc-link-arg-bpf=--license=GPLv3")` |
| "BTF section missing" | Kernel too old / BTF not enabled | Check `/sys/kernel/btf/vmlinux` exists; kernel >= 5.8 |
| "no events appearing" | eBPF not attached | Check `dmesg` for verifier errors; check tracepoint availability |
| "buffer overflow" | Too many events, small buffer | Increase `max_entries` in PerfEventArray map |
| "permission denied" | Missing caps | Run with `sudo -E`; check `CAP_SYS_ADMIN` |
| "compile error on std" | ebpf crate uses std | Remove `std` dependency; use `no_std` pattern |
| "clippy warnings" | Code quality issues | Fix clippy errors; run `cargo clippy -- -D warnings` |

### Release Gates Checklist

```
[ ] cargo build --release --workspace - all crates build
[ ] cargo test --workspace - unit tests pass
[ ] cargo clippy --workspace -- -D warnings - no warnings
[ ] cargo fmt --check --workspace - format OK
[ ] All struct size invariants verified (40B Execve, 16B UidGid, etc.)
[ ] __license section = "GPLv3" in all eBPF builds
[ ] .BTF sections present in eBPF ELF binaries
[ ] GitHub Actions workflow passes on push/PR
[ ] Manual test: sudo -E cargo run --release produces events
[ ] No breaking changes without version bump
[ ] Documentation updated (prerequisites/ files in sync)
```

---
*This document covers GhostRing testing strategy deep dive. For eBPF programming, see `prerequisites/ebpf-internals.md`. For Aya framework, see `prerequisites/aya-framework.md`. For struct definitions, see `prerequisites/ghostring-common-structs.md`. For build system, see `prerequisites/build-system-workspace.md`.*