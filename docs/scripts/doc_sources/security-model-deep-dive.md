# GhostRing Security Model Deep Dive

## Threat Model and Attack Surface

### Core Threat Assumptions

GhostRing's security model is built on these fundamental assumptions:

1. **Kernel is partially trusted**: The Linux kernel executes eBPF programs verified for safety, but kernel bugs or compromised components can leak information.

2. **User space is untrusted**: Any user-space process can be malicious, can hook system APIs, can modify `/proc` entries, and can attempt to detect/evasion monitoring.

3. **Adversary goals**: Hide processes, conceal network connections, modify file access patterns, exfiltrate data without detection.

4. **Attack vectors**: 
   - API hooking via `LD_PRELOAD` or inline hooks
   - `/proc` filesystem modification
   - System call filtering/alteration
   - Kernel module unloading/replacement
   - Process hiding (concealing from `/proc/pid/`, `ps`, etc.)

### How GhostRing Hardens the Model

#### 1. Kernel-Space Instrumentation

By operating at **Ring 0** via eBPF:

```
┌──────────────────────────────────────────────────────────────┐
│                       Threat Mitigation                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User-Space Agent (Traditional)                              │ │
│  │                                                          │ │ │
│  │  - Hooks system APIs (hooked by malware)                 │ │ │
│  │  - Polls /proc filesystem (modifiable by rootkit)        │ │ │
│  │  - Can be detected/evasion'd                             │ │ │
│  │  - Context-switch overhead                               │ │ │
│  └───────────────┬───────────────────────┬──────────────────┘ │ │
│                  │                       │                      │ │ │
│  └───────────────┴───────────────────────┴──────────────────┘ │ │
│                                                              │ │ │
│  GhostRing (Kernel eBPF)                                     │ │ │
│  │                                                          │ │ │
│  │  - Intercepts syscalls directly in kernel path           │ │ │
│  │  - eBPF verifier guarantees program safety              │ │ │
│  │  - Invisible to user-space tampering                     │ │ │
│  │  - No context-switching for each event                   │ │ │
│  └──────────────────────────────────────────────────────────────┘ │ │
└────────────────────────────────────────────────────────────────┘
```

**Key advantages**:
- **No user-space hooks to bypass**: eBPF programs fire before user-space execution
- **Invisible to rootkits**: Kernel-mode monitoring cannot be easily unhooked from user space
- **Process-hiding resistant**: Syscalls intercepted before process structures are visible in `/proc`
- **Zero context-switch overhead**: Events collected in-kernel, pumped via ring buffer

#### 2. GPLv3 Licensing Enforcement

The Linux kernel eBPF verifier checks the `__license` section during program loading:

```
┌──────────────────────────────────────────────────────────────┐
│  License Verification Flow                                     │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  1. eBPF program loads into kernel                             │
│  2. Verifier reads __license section                           │
│  3. If license ≠ "GPLv3" (or "GPL"):                          │
│     - Advanced helpers restricted                              │
│     - Verifier error: "license check failed"                   │
│     - Program may be rejected or limited                       │
│  4. If license = "GPLv3":                                     │
│     - Full helper access granted                               │
│     - Program loads successfully                               │
│  5. GPL-compatible locks are enforced at load time             │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│  License: "GPLv3" → 100% helper access                         │
│  License: "GPL" → 100% helper access (legacy)                 │
│  License: "MIT/BSD/proprietary" → Restricted helpers only    │
│  License: None → Load denied                                   │
└────────────────────────────────────────────────────────────────┘
```

**Critical implications**:

| License | Helper Access | Binary Compatibility |
|---|---|---|
| `GPLv3` | All helpers including `bpf_probe_read_user_str` | Full (recommended) |
| `GPL` (v2) | All helpers | Full (legacy) |
| `MIT/BSD/ASL` | Restricted (no deep memory read) | Limited |
| `Proprietary` | None (verifier rejects) | None |
| `None/`empty | None (load denied) | None |

**GhostRing enforcement**:

```rust
// build.rs - license section (CRITICAL)
println!("cargo:rustc-link-arg-bpf=--license=GPLv3");
```

Without this, the kernel verifier will either:
- Restrict to "GPL-friendly" helpers only
- Reject the program entirely
- Generate verification errors

#### 3. eBPF Verifier Guarantees

The kernel verifier provides these safety properties:

| Guarantee | Description | Security Impact |
|---|---|---|
| **Memory safety** | No out-of-bounds accesses, no buffer overflows | Prevents kernel crashes from eBPF programs |
| **Loop termination** | Verified no infinite loops | Denial-of-service prevention |
| **Bounds checking** | All memory access verified against limits | Protects kernel data structures |
| **Helper licensing** | GPLv3 check enforced | Ensures compatible licensing |
| **Register state limits** | Fixed register ranges, stack depth | Prevents state corruption |
| **Type safety** | BTF-verified struct access | Prevents misinterpretation of data |

#### 4. Attack Surface Reduction

##### What GhostRing Does NOT Defend Against

| Threat | Why Not | Mitigation |
|---|---|---|
| **Kernel zero-days** | eBPF runs in kernel; bugs in programs can crash kernel | Defense-in-depth; careful program verification |
| **Physical access** | Attacker with root can disable eBPF | Hardware-level security required |
| **Supply chain** | Compiled binary could be tampered | Verify signatures; reproducible builds |
| **Kernel config changes** | Disabling BTF breaks CO-RE | Document requirements; enforce prerequisites |
| **User-space compromise** | If user-space daemon rootkit'd | Kernel portion still functional (separation of concerns) |

##### What GhostRing DOES Defend Against

| Threat | Defense |
|---|---|
| **LD_PRELOAD hooking** | eBPF intercepts syscalls before user-space library loading |
| **/proc modification** | Data comes from kernel directly, not filesystem |
| **System call filtering** | Direct kernel path interception |
| **Process hiding from ps** | PID/uid captured at syscall entry, before process structures visible |
| **Inline syscall hooks** | eBPF runs before inline hooks in most cases |
| **/sys/class/memory manipulation** | Direct kernel instrumentation |
| **Dynamic library preloading** | Kernel path bypasses user-space libraries entirely |

### Defense-in-Depth Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                GhostRing Defense-in-Depth Layer              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Layer 4: Application Level                                  │ │
│  - JSON export for SIEM                                      │ │
│  - Alert routing                                             │ │
│  - Audit logging                                             │ │
│  - CLI monitoring                                            │ │
│                                                               │
│  Layer 3: User-Space Daemon                                  │ │
│  - Tokio async event loop                                    │ │
│  - Ring buffer polling                                       │ │
│  - CLi arguments, configuration                              │ │
│  - Metrics export                                            │ │
│                                                               │
│  Layer 2: eBPF Kernel Programs                               │ │
│  - Tracepoint/kprobe attachments                             │ │
│  - Structured event emission                                 │ │
│  - GPLv3-licensed helpers                                    │ │
│  - Verifier-checked bytecode                                 │ │
│                                                               │
│  Layer 1: Kernel Hardening                                   │ │
│  - eBPF verifier static analysis                             │ │
│  - License enforcement (GPLv3)                               │ │
│  - BTF/CO-RE for portability                                 │ │
│  - Memory safety guarantees                                  │ │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│              Attacker Must Penetrate ALL Layers              │
├──────────────────────────────────────────────────────────────┤
│  Realistic: Adversary must compromise kernel + user space    │
│  Ideal: eBPF layer provides isolation invisible to malware   │
└────────────────────────────────────────────────────────────────┘
```

### Security Requirements Checklist

#### Pre-Deployment Validation

```bash
# Security validation checklist before deploying GhostRing

# 1. License compliance
echo "=== License Check ==="
grep -r "GPLv3" /path/to/ghostring-ebpf/build.rs
# Must output: println!("cargo:rustc-link-arg-bpf=--license=GPLv3")

# 2. BTF availability
echo "=== BTF Check ==="
ls -la /sys/kernel/btf/vmlinux
# Must exist and be readable

# 3. Kernel version
echo "=== Kernel Version ==="
uname -r
# Must be 5.8+

# 4. Rust toolchain
echo "=== Toolchain Check ==="
rustup show
# Must be nightly with rust-src

# 5. bpf-linker installed
echo "=== bpf-linker Check ==="
bpf-linker --version
# Should display version number

# 6. eBPF program load test
echo "=== Load Test ==="
sudo -E cargo run --release 2>&1 | head -20
# Should show daemon starting without license errors

# 7. Permission checks
echo "=== Permissions ==="
id
# Must show uid 0 (root) or have CAP_SYS_ADMIN

# 8. Map permissions
echo "=== Map Check ==="
sudo bpftool map show
# Should show ghostring maps

echo "=== All Checks Passed ==="
```

#### Runtime Security Monitoring

```rust
// Runtime security checks in the daemon

fn runtime_security_checks() -> Result<(), SecurityError> {
    // Check 1: eBPF program still loaded
    if !is_ebpf_loaded() {
        return Err(SecurityError::EbpfNotLoaded);
    }
    
    // Check 2: Ring buffers healthy
    if ring_buffers_full() {
        log::warn!("Ring buffers approaching capacity");
    }
    
    // Check 3: No verifier errors
    if has_verifier_errors() {
        log::error!("eBPF verifier errors detected");
    }
    
    // Check 4: CPU online
    if !all_cpus_online() {
        log::warn!("Some CPUs offline, event coverage reduced");
    }
    
    // Check 5: No suspicious configuration
    if suspicious_config_detected() {
        log::warn!("Potentially suspicious configuration");
    }
    
    Ok(())
}
```

### Security-Focused Development Practices

#### Code Review Requirements

All changes to `ghostring-ebpf` must pass:

1. **Verifier compatibility**: eBPF program passes static verification
2. **License compliance**: `__license` section remains `GPLv3`
3. **BTF compatibility**: Struct offsets remain valid (or CO-RE enabled)
4. **Minimal unsafe**: Only FFI boundaries marked `unsafe`
5. **No std in eBPF**: `no_std` constraint maintained
6. **Hardware compatibility**: Works on target kernel versions

#### Testing Requirements

| Test Type | Scope | Automation |
|---|---|---|
| **Unit tests** | `ghostring-common` struct layout, sizes | `cargo test -p ghostring-common` |
| **Integration tests** | eBPF program loads, attaches | `cargo test -p ghostring-ebpf` (if CI has kernel) |
| **Verifier checks** | Compile with `--check` | `cargo build --release` exit code |
| **Runtime tests** | Events appear in daemon output | Manual (requires kernel + sudo) |
| **Fuzz testing** | eBPF bytecode edge cases | `cargo fuzz` (if set up) |
| **CI/CD gates** | Build, test, verify on every PR | GitHub Actions |

#### Audit and Compliance

```
┌──────────────────────────────────────────────────────────────┐
│               GhostRing Audit Trail                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Build provenance                                        │ │
│     - `cargo build -- --verify` output saved                 │ │
│     - `bpf-linker` version recorded                         │ │
│     - Source commit hash in build artifacts                 │ │
│                                                               │
│  2. Runtime metrics                                         │ │
│     - Events processed per session                          │ │
│     - Events dropped (buffer full)                          │ │
│     - Verifier warnings/errors count                        │ │
│     - CPU utilization metrics                               │ │
│                                                               │
│  3. License compliance                                      │ │
│     - `__license` section verified at each build            │ │
│     - GPLv3 adherence documented                            │ │
│     - License file (LICENSE) reviewed periodically          │ │
│                                                               │
│  3. Security incidents                                      │ │
│     - Unusual event patterns logged                         │ │
│     - Buffer overflow incidents recorded                    │ │
│     - Response actions taken                                │ │
│                                                               │
│  4. Version tracking                                        │ │
│     - Semantic version of each crate                        │ │
│     - Change log maintained                                 │ │
│     - Breaking changes documented                           │ │
│                                                               │
└────────────────────────────────────────────────────────────────┘
```

### Compliance and Licensing Details

#### GPLv3 Section 5 (Conveying Modified Source Versions)

When modifying GhostRing:

```text
You must cause the modified files to carry prominent notices
that you changed them, and must carry the relevant date.

You must license the entire work under this License to anyone
who comes into possession of a copy.

You must not impose further restrictions on the exercise of
the rights granted or affirmed under this License.
```

#### GPLv3 Section 6 (Conveying Non-Source Forms)

For object code distribution:

```text
You may convey a covered work in object code form under the
terms of sections 4 and 5, provided that you also convey the
machine-readable Corresponding Source under this License, in
one of these ways:

a) Convey the object code in, or embodied in, a physical product
   (including a physical distribution medium), accompanied by the
   Corresponding Source fixed on a durable physical medium
   customarily used for software interchange.

b) Convey the object code in, or embodied in, a physical product
   accompanied by a written offer to provide the Corresponding
   Source.

c) Convey individual copies of the object code with a copy of
   the written offer to provide the Corresponding Source.

d) Convey the object code by offering access from a designated
   place, and offer equivalent access to the Corresponding
   Source in the same way through the same place at no further
   charge.

e) Convey the object code using peer-to-peer transmission, provided
   you inform other peers where the object code and Corresponding
   Source are being offered to the general public at no charge.
```

#### Special Exception for eBPF

> The Linux kernel requires GPLv3 for full BPF helper access.
> This is a technical requirement, not a legal preference.
> Without GPLv3, programs can still function but with reduced
> capabilities (no `bpf_probe_read_user_str`, limited helpers).

**Practical outcome**: GhostRing must be GPLv3-licensed for full functionality. This is enforced by the kernel verifier at load time, not just by license terms.

### Threat Modeling Scenarios

#### Scenario 1: Rootkit Attempting to Hide Processes

| Attack Step | GhostRing Response |
|---|---|
| Rootkit hooks `sys_enter_execve` in kernel text | eBPF tracepoint fires **before** inline hook (tracepoints are static) |
| Rootkit modifies `/proc/pid/` entries | GhostRing data comes from kernel registers, not `/proc` |
| Rootkit unloads GhostRing kernel module | GhostRing is eBPF, not `.ko`; unloading requires `bpftool prog remove` |
| Rootkit hooks `read` syscall to conceal file access | GhostRing captures events **before** hook point (at syscall entry) |

**Result**: GhostRing provides visibility even against sophisticated rootkits.

#### Scenario 2: Malware Using LD_PRELOAD to Hide

| Attack Step | GhostRing Response |
|---|---|
| Malware `LD_PRELOAD`s library hooking `open`, `stat` | eBPF fires in kernel **before** user-library initialization |
| Malware modifies `/etc/ld.so.preload` | GhostRing unaffected; kernel-side interception |
| Malware patches system call table inline | eBPF tracepoints/kprobes intercept before patched entry |

**Result**: GhostRing visibility persists across user-space compromise.

#### Scenario 3: Admin Attempts to Disable Monitoring

| Attempt | Outcome |
|---|---|
| `rmmod` eBPF program | eBPF is not a loadable kernel module (.ko); requires `bpftool prog remove` |
| Kill the daemon process | eBPF programs remain attached; events still collected (lost if no consumer) |
| Modify kernel syscall table | eBPF programs still attached to tracepoints/kprobes (different entry points) |
| Disable BTF in kernel | CO-RE breaks; programs may still work with hardcoded offsets (not recommended) |

**Result**: eBPF-based monitoring is more resilient than traditional kernel modules.

#### Scenario 4: Data Exfiltration Concern

| Concern | Mitigation |
|---|---|
| Events contain sensitive data (pids, uids, commands) | Events are minimally structured; commands truncated to 16 bytes |
| Ring buffer data captured by attacker | Requires `CAP_SYS_ADMIN` to access `/sys/kernel/debug/tracing/` |
| JSON export contains sensitive fields | Optional JSON export; omit sensitive fields or redact |
| Long-term storage of telemetry | Retention policies; encrypt storage; limit buffer sizes |

**Result**: Data minimization practices reduce exfiltration risk.

## Related Documentation

- [Security Requirements](./security-requirements.md) — Fundamental security objectives, zero-trust telemetry, and verification requirements.
- [License Compliance Deep Dive](./license-compliance-deep.md) — GPLv3 compliance requirements and BPF verifier security gates.
- [Kernel Instrumentation](./kernel-instrumentation.md) — Tamper-resistant Ring 0 execution interception.
- [eBPF Fundamentals](./ebpf-fundamentals.md) — Sandboxed kernel execution and static verifier guarantees.
- [Architecture Overview](./architecture-overview.md) — Privilege boundaries and multi-crate security isolation.
- [Roadmap Features Deep Dive](./roadmap-features-deep.md) — Extending threat detection to reverse shells and file tampering.