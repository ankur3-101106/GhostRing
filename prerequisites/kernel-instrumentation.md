# Kernel Space Instrumentation for GhostRing

## Kernel Architecture Overview

GhostRing operates at **Ring 0** (kernel mode) via eBPF, intercepting system calls directly in the kernel execution path. This provides security monitoring that is invisible to user-space tampering.

## Probe Types

### Tracepoints
- **Static** kernel instrumentation points
- **Highest performance** - no dynamic overhead of kprobe registration
- **Fixed arguments** defined when tracepoint is registered
- GhostRing uses `sys_enter_execve` tracepoint for process execution monitoring

### kprobes (Kernel Probes)
- Dynamically register at **any kernel function address**
- Can probe function entry, return, and exception points
- More flexible than tracepoints but with slightly more overhead
- Used for network socket observability (tcp_connect kprobes - roadmap)

### kretprobes
- Probe at **function return points**
- Capture return values, status codes
- Useful for tracking syscall outcomes

## Context Available in eBPF Programs

When a probe fires, the eBPF program receives:
- **Registers**: `r0`-`r9` (architecture-dependent)
- **Stack frame**: Function context and local variables
- **Per-CPU data**: Per-processor variables
- **Meta information**: PID, TID, timestamps, CPU number

## Data Extraction

eBPF programs extract metadata using:
- `bpf_get_current_pid_tgid()` - gets PID and TID in one register
- `bpf_get_current_uid_gid()` - gets UID and GID
- `bpf_probe_read_user_str()` - read user-space strings (roadmap item)
- `bpf_ktime_get_ns()` - nanosecond timestamps
- `bpf_get_current_comm()` - current process command name (16 bytes)

## BTF (BPF Type Format)

- **Preferred** for CO-RE (Compile Once, Run Everywhere) portability
- Provides type information at runtime so eBPF programs don't need hardcoded offsets
- `/sys/kernel/btf/vmlinux` must exist on the running kernel
- Enables struct field access by name rather than offset
- Critical for `bpf_probe_read_user_str` advanced path extraction

## Kernel Verifier

- **Statically analyzes** eBPF bytecode before kernel loading
- Guarantees: memory safety, loop bounds, no infinite loops
- Checks license compliance (GPLv3 requirement)
- Must pass before eBPF program can be loaded into kernel

## Related Documentation

- [eBPF Fundamentals](./ebpf-fundamentals.md) — Foundational eBPF concepts, sandboxing, and helper constraints.
- [eBPF Internals & Bytecode](./ebpf-internals.md) — ISA, context structures, registers, and verifier limits.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — Deep dive into runtime type resolution and cross-kernel portability.
- [Event Transport](./event-transport.md) — How instrumented data travels from Ring 0 to user space via ring buffers.
- [ghostring-common Struct Design](./ghostring-common-structs.md) — C-compatible struct layouts for captured event serialization.
- [Architecture Overview](./architecture-overview.md) — Overall workspace structure and crate responsibilities.
- [License Compliance Deep Dive](./license-compliance-deep.md) — GPLv3 requirements for kernel tracing helpers.
- [Roadmap Features Deep Dive](./roadmap-features-deep.md) — Specifications for network socket observability (`tcp_connect`) and File Integrity Monitoring (`sys_enter_openat`).