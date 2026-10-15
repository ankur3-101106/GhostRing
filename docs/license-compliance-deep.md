# GhostRing License Compliance Deep Dive

## Legal Framework and Kernel Requirements

### GPLv3 and the Linux Kernel eBPF Verifier

The relationship between GhostRing's GPLv3 licensing and the Linux kernel eBPF verifier is **technical requirement**, not merely legal preference. This section explains the mechanism.

### Verifier License Check Mechanism

When an eBPF program is loaded into the kernel, the verifier performs these steps:

1. **Read `__license` section** from the loaded ELF binary
2. **Compare against allowed licenses**
3. **Grant or restrict helper access** based on result

```
┌──────────────────────────────────────────────────────────────┐
│  Kernel Verifier License Check Flow                          │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Step 1: Program loading                                     │
│   ├─ eBPF ELF loaded into kernel address space               │
│   ├─ `__license` section extracted                           │
│   └─ Section content: "GPLv3\0" (or other)                   │
│                                                                │
│  Step 2: License comparison                                  │
│   ├─ Allowed: "GPLv3", "GPL" (legacy)                        │
│   ├─ Restricted: "MIT", "BSD", "proprietary", "Apache"      │
│   └─ None/empty: program rejected                            │
│                                                                │
│  Step 3: Helper access decision                              │
│   ├─ GPLv3/GPL: Full helper access (60+ helpers)             │
│   ├─ Restricted: ~10 GPL-friendly helpers only               │
│   └─ None: Program load denied, verifier error               │
│                                                                │
│  Step 4: Loading decision                                    │
│   ├─ Full access: program loaded successfully                │
│   ├─ Restricted: program may load with limited helpers       │
│   └─ None: verifier error "license check failed", load aborted│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### License Strings and Their Meaning

| License String | Verifier Action | Helper Access | GhostRing Status |
|---|---|---|---|
| `"GPLv3"` | Full access granted | All BPF helpers available | ✅ **Required** |
| `"GPL"` (v2) | Full access granted (legacy) | All BPF helpers available | ⚠️ Works but GPLv3 preferred |
| `"MIT"` | Restricted helpers only | ~10 GPL-friendly helpers | ❌ Insufficient |
| `"BSD"` | Restricted helpers only | ~10 GPL-friendly helpers | ❌ Insufficient |
| `"Apache-2.0"` | Restricted helpers only | ~10 GPL-friendly helpers | ❌ Insufficient |
| `""` (empty) | Program rejected | None | ❌ Load denied |
| `"GPL v2"` (spacing) | May be rejected | Unpredictable | ❌ Unreliable |

### Why GPLv3 is Non-Negotiable for GhostRing

#### 1. Helper Function Categorization

The Linux kernel categorizes BPF helpers into two groups:

| Category | Helpers Count | Examples |
|---|---|---|
| **GPL-friendly** | ~10 helpers | `bpf_trace_printk`, `bpf_ktime_get_ns`, `bpf_get_current_comm` |
| **GPL-required** | ~60+ helpers | `bpf_probe_read_user`, `bpf_probe_read_user_str`, `bpf_perf_event_output`, network helpers, memory reading |

**Without GPLv3**, GhostRing can only use the ~10 "friendly" helpers, which severely limits functionality:

| Feature | GPLv3 Helpers | GPL-Friendly Only |
|---|---|---|
| **pid/uid extraction** | ✅ `bpf_get_current_pid_tgid` + `bpf_get_current_uid_gid` | ✅ (both categories overlap) |
| **Full path extraction** | ✅ `bpf_probe_read_user_str` | ❌ Not available |
| **PerfEventArray output** | ✅ `bpf_perf_event_output` | ✅ (overlaps) |
| **Socket address reading** | ✅ `bpf_probe_read_user` variants | ⚠️ Limited versions only |
| **Network protocol analysis** | ✅ Full helper set | ❌ Missing key helpers |
| **File path monitoring** | ✅ Full read capabilities | ⚠️ Severely limited |

#### 2. Technical Compliance Note (From Kernel Documentation)

> "When an eBPF program is loaded into the kernel address space, the verifier inspects the program's license section. If the program is not explicitly declared as GPL-compatible, the kernel restricts access to advanced BPF helper functions (such as deep memory-reading utilities and tracing helpers). Licensing the entire codebase under GPLv3 ensures 100% binary compatibility with the Linux kernel subsystem."

This is quoted from the project's README and PROJECT.md files.

#### 3. License Section Format

The `__license` section must contain exactly:

```assembly
.section "__license","a",progbits
.global __license
.type __license,@proctype
__license:
.asciz "GPLv3"
```

**Critical requirements**:
- Must be `.asciz "GPLv3"` (with null terminator)
- Must be `.global __license` (exported symbol)
- Must be placed via `bpf-linker` or compiler flags
- Must match exactly; `"GPL "` (with space) or `"GPLv2"` (wrong version) won't work

### Enforcement in Build System

#### build.rs for ghostring-ebpf

```rust
// CRITICAL: This ensures the __license section is GPLv3
// Without this, the kernel verifier will restrict helpers or reject the program

fn main() {
    // Emit compiler argument to add __license section
    // This generates the .section "__license","a",progbits
    // with .global __license and .asciz "GPLv3"
    println!("cargo:rustc-link-arg-bpf=--license=GPLv3");
    
    // Additional BTF-related flags (optional but recommended)
    if std::path::Path::new("/sys/kernel/btf/vmlinux").exists() {
        println!("cargo:rustc-link-arg-bpf=--btf");
    }
    
    // Verify BTF availability during build
    println!("cargo:rustc-cfg=with_btf");
}
```

#### Verification Commands

```bash
# 1. Check the ELF has the license section
readelf -S target/bpfel-unknown-none/release/ghostring_ebpf | grep -i license

# 2. Verify section content
readelf -x .license target/bpfel-unknown-none/release/ghostring_ebpf

# 3. Check with bpftool
bpftool prog show type tracepoint id <prog_id> btf

# 4. Try loading the program (will fail without GPLv3)
sudo -E cargo run --release 2>&1 | head -30

# Expected: daemon starts without "license check failed" errors
# Unexpected: "verifier error: license check failed" or similar
```

### Licensing the Crate Ecosystem

#### ghostring-common (cdylib)

- **License**: GPLv3 (inherited from root or explicitly stated)
- **Rationale**: Even though this crate contains only structs, it's part of the GPLv3-licensed project
- **Exception**: Could be MIT/BSD/CC0 if truly standalone, but then ghostring-ebpf can't use GPLv3 helpers
- **Recommendation**: GPLv3 to match the project

```toml
# ghostring-common/Cargo.toml
[package]
name = "ghostring-common"
version = "0.1.0"
crate-type = ["cdylib"]

[license]
type = "GPL-3.0"
```

#### ghostring-ebpf (no_std, bpfel-unknown-none)

- **License**: GPLv3 (required for helper access)
- **Rationale**: Directly interfaces with kernel; must comply with kernel verifier
- **No ambiguity**: GPLv3 is mandatory, not optional

```toml
# ghostring-ebpf/Cargo.toml
[package]
name = "ghostring-ebpf"
version = "0.1.0"
crate-type = ["cdylib"]

[license]
type = "GPL-3.0"
```

#### ghostring (std, Tokio daemon)

- **License**: GPLv3 (inherited from workspace)
- **Rationale**: User-space component; GPLv3 ensures compatibility if linked with GPLv3 eBPF code
- **Exception**: Can use GPLv3-or-later (GPLv3 or any later version)

```toml
# ghostring/Cargo.toml
[package]
name = "ghostring"
version = "0.1.0"
edition = "2021"

[license]
type = "GPL-3.0"
```

### GPLv3 Compliance Requirements

#### Source Code Availability

Per GPLv3 Section 3, when distributing GhostRing:

1. **Accompany with source code**: Include the complete source code
2. **Offer to provide source**: Provide a written offer valid for at least 3 years
3. **Binary-only distribution**: Allowed only if source is also provided

```bash
# Example: Providing source via repository
echo "GhostRing source available at:"
echo "  https://github.com/ankur3-101106/GhostRing"
echo ""
echo "Or: download via:"
echo "  git clone https://github.com/ankur3-101106/GhostRing.git"
```

#### Corresponding Source

Per GPLv3 Section 6, the "Corresponding Source" includes:

- All source code needed to generate, install, and run the object code
- Scripts to control those activities
- **Does NOT include**: System libraries or general-purpose tools

For GhostRing, the Corresponding Source includes:

```
├── CLAUDE.md              # This file (guidance for Claude Code)
├── PROJECT.md             # Project setup guidance
├── README.md              # High-level overview and roadmap
├── LICENSE                # GPLv3 license text
├── .gitignore             # Build artifacts ignore patterns
├── docs/                  # This directory — technical knowledge base
│   ├── *.md               # All deep-dive knowledge files
├── ghostring-common/      # C-compatible structs source
│   └── src/               # Rust source files
├── ghostring-ebpf/        # eBPF bytecode source
│   └── src/               # BPF program source
└── ghostring/             # User-space daemon source
    └── src/               # Tokio daemon source
```

#### Third-Party Dependencies

GhostRing depends on these GPL-compatible (or MIT) crates:

| Crate | License | Compatibility |
|---|---|---|
| `aya` | Apache-2.0 or GPL-3.0+ | ✅ Compatible (dual-licensed) |
| `aya-ebpf` | Apache-2.0 or GPL-3.0+ | ✅ Compatible |
| `aya-poll` | Apache-2.0 or GPL-3.0+ | ✅ Compatible |
| `clap` | MIT-0 | ✅ Compatible |
| `tracing` | MIT-0 | ✅ Compatible |
| `tokio` | MIT | ✅ Compatible |
| `num_cpus` | MIT or Apache-2.0 | ✅ Compatible |

**No GPL-incompatible dependencies** are used, which maintains the GPLv3 compliance of the entire project.

### License Transition Path

If the project ever needs to change licenses:

1. **Cannot simply relicense**: GPLv3 confers freedoms that can't be taken away
2. **All contributors must agree**: Each contributor holds copyright to their contributions
3. **Fork required**: New project under different license would be a fork
4. **Practical path**: 
   - Keep GPLv3 for eBPF portion (kernel requirement)
   - potential dual-licensing for non-kernel parts
   - Contact FSF or legal counsel for complex transitions

### Common License Mistakes to Avoid

| Mistake | Consequence | Fix |
|---|---|---|
| **Wrong license string** | `--license=GPL` instead of `--license=GPLv3` | Restricted helpers; verify with `readelf` |
| **Missing `__license` section** | Forget `println!("cargo:rustc-link-arg-bpf=--license=GPLv3")` | Program load denied by verifier |
| **Version mismatch** | `--license=GPLv2` instead of `GPLv3` | Missing advanced helpers; not recommended |
| **Typed wrong** | `--license=gplv3` (lowercase) | May be case-sensitive; use `GPLv3` exact |
| **Inconsistent across crates** | Different licenses in common/ebpf/ghostring | Unified workspace GPLv3; all crates must comply |
| **Dynamic linking exception** | Assuming `.ko` module exceptions | eBPF isn't `.ko`; same GPLv3 requirements apply |
| **Proprietary dependency** | Using non-GPL-compatible crates | Replace with MIT/BSD/Apache alternatives |

### Compliance Checklist

```
[ ] LICENSE file exists and contains GPLv3 text (full version, not summary)
[ ] All three crate Cargo.toml files have [license] = "GPL-3.0" or equivalent
[ ] build.rs in ghostring-ebpf emits --license=GPLv3 flag
[ ] __license ELF section present and contains "GPLv3\0"
[ ] No non-GPL-compatible dependencies in ghostring-ebpf (no_std crate)
[ ] README.md and PROJECT.md mention GPLv3 licensing requirement
[ ] Documentation (docs/license-compliance-deep.md) exists and is accurate
[ ] CI/CD checks for license compliance (grep for license string in build output)
[ ] Documentation warns users about GPLv3 requirement for full eBPF access
[ ] Source code repository includes all materials needed to modify and rebuild
```

## Related Documentation

- [Security Requirements](./security-requirements.md) — Security motivations and licensing prerequisites for kernel observability.
- [Security Model Deep Dive](./security-model-deep-dive.md) — Threat model and integrity guarantees of kernel-mode telemetry.
- [eBPF Internals & Bytecode](./ebpf-internals.md) — The `__license` ELF section and verifier license checking mechanics.
- [Aya Framework](./aya-framework.md) — Aya's compile-time licensing constraints and helper declarations.
- [Build System & Workspace](./build-system-workspace.md) — Passing linker license arguments via `build.rs` and `bpf-linker`.
- [Kernel Instrumentation](./kernel-instrumentation.md) — Tracing helpers that require GPL-compatible licensing.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Resolving `VerifierError::License` and permission failures.