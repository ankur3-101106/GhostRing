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

## Related Documentation

- [Kernel Instrumentation](./kernel-instrumentation.md) — Practical implementation of Ring 0 tracepoint and kprobe interception.
- [eBPF Internals & Bytecode](./ebpf-internals.md) — ISA, register conventions, verifier static analysis, and ELF sections.
- [Aya Framework](./aya-framework.md) — Pure-Rust framework bindings for program loading and BPF helper calls.
- [Event Transport](./event-transport.md) — Data flow and `PerfEventArray` mechanics from kernel to user space.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — BPF Type Format and Compile Once, Run Everywhere cross-kernel portability.
- [License Compliance Deep Dive](./license-compliance-deep.md) — GPLv3 requirements for accessing restricted BPF helpers.
- [Development Environment](./development-environment.md) — Toolchain setup for building `no_std` eBPF bytecode.
- [Roadmap Features Deep Dive](./roadmap-features-deep.md) — Advanced path extraction using `bpf_probe_read_user_str`.