# eBPF Fundamentals for GhostRing

## What is eBPF?

**Extended Berkeley Packet Filter (eBPF)** is a Linux kernel technology that allows sandboxed programs to run in the kernel context without changing kernel source code or loading external modules. eBPF programs are verified by the kernel verifier before execution and can instrument any part of the system.

## Core Concepts

### BPF Programs
- Attached to kernel events via **tracepoints**, **kprobes**, **kretprobes**, **uprobes**
- Execute in kernel ring 0 with strict sandboxing
- Verified for safety (no infinite loops, memory safety, etc.)
- License GPLv3 is required for full BPF helper access

### BPF Maps
- Key-value store for data sharing between kernel and user space
- Types: `PerfEventArray`, `Hash`, `Array`, `PerCPUHash`, etc.
- GhostRing uses `PerfEventArray` for ring buffer transmission

### Attachment Points
- **Tracepoints**: Static kernel points, highest performance
- **kprobes**: Any kernel function entry/exit
- **kretprobes**: Function return points
- **uprobes**: User-space program probes

## Licensing Requirement

The Linux kernel eBPF verifier checks the program's license section. If the program is not GPL-compatible:

- Restricted from using **advanced BPF helpers** (memory reading, tracing helpers)
- Limited to "GPL-friendly" helpers only
- GhostRing is licensed under **GPLv3** to ensure 100% binary compatibility

## Compilation

- Target: `bpfel-unknown-none` (little-endian BPF)
- Toolchain: Rust Nightly with `rust-src` component
- Linker: `bpf-linker` cargo utility for ELF section layout
- BTF (BPF Type Format) preferred for CO-RE (Compile Once, Run Everywhere)

## Key eBPF Helpers Used by Aya

- `bpf_ktime_get_ns` - timestamps
- `bpf_probe_read_user_str` - safe user memory reading (roadmap item)
- `bpf_get_current_pid_tgid` - process IDs
- `bpf_get_current_uid_gid` - user identifiers

## Related Knowledge

This file forms the foundation for several other knowledge base entries:

- [[kernel-instrumentation.md]]: Builds on these concepts for Ring 0 instrumentation
- [[development-environment.md]]: Prerequisites for compiling eBPF bytecode
- [[btf-co-re-deep-dive.md]]: BTF and CO-RE portability mechanics
- [[license-compliance-deep.md]]: GPLv3 requirement for helper access
- [[roadmap-features-deep.md]]: Roadmap feature: advanced path extraction via `bpf_probe_read_user_str`