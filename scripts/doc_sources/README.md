# GhostRing Technical Documentation & Architecture Reference

This directory serves as the technical documentation suite and architecture reference for the GhostRing repository. It provides comprehensive specifications across kernel-space eBPF instrumentation, data transport mechanisms, user-space daemon operations, security and licensing compliance, and development workflows.

---

## Documentation Index

### 1. Foundational Architecture & Environment

- [Architecture Overview](./architecture-overview.md) — Comprehensive overview of the 3-crate workspace architecture, crate boundaries, and end-to-end telemetry pipeline.
- [Development Environment & Isolated Build System](./development-environment.md) — System requirements (Linux 5.8+, BTF), in-repository isolated toolchain (`.build-env/`), automated bootstrap script (`scripts/setup-env.sh`), and verification.
- [eBPF Fundamentals](./ebpf-fundamentals.md) — Core eBPF principles, execution model, probe types, memory safety, and kernel verifier requirements.
- [Kernel Instrumentation](./kernel-instrumentation.md) — Ring 0 execution path interception, tracepoints, kprobes, context extraction, and kernel safety guarantees.

### 2. Kernel Space & eBPF Engineering

- [eBPF Internals & Bytecode](./ebpf-internals.md) — eBPF instruction set architecture (ISA), register conventions, verifier static analysis, ELF layout, and JIT compilation.
- [Aya Framework](./aya-framework.md) — Deep dive into the pure-Rust Aya ecosystem (`aya`, `aya-ebpf`, `aya-poll`), ELF loading, map abstractions, and helper bindings.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — BPF Type Format (BTF) structure, Compile Once, Run Everywhere (CO-RE) field relocations, and kernel portability.
- [ghostring-common Struct Design](./ghostring-common-structs.md) — C-compatible `#[repr(C)]` memory layouts, alignment constraints, scalar type mappings, and cross-boundary ABI stability.

### 3. Telemetry & User Space Pipeline

- [Event Transport](./event-transport.md) — Telemetry transmission mechanics from Ring 0 to user space via `PerfEventArray` ring buffers.
- [Perf Buffer Internals](./perf-buffer-internals.md) — Low-level ring buffer memory layout, mmap headers, head/tail pointer synchronization, per-CPU ring handling, and backpressure management.
- [ghostring User Daemon](./ghostring-user-daemon.md) — Asynchronous Tokio daemon architecture, per-CPU buffer polling loop, CLI options, event filtering, and structured logging.

### 4. Security, Compliance & Governance

- [Security Requirements](./security-requirements.md) — Ring 0 zero-trust observability advantages, tamper resistance, and kernel licensing requirements.
- [Security Model Deep Dive](./security-model-deep-dive.md) — Threat model, evasion countermeasures, kernel rootkit resistance, and defense-in-depth principles.
- [License Compliance Deep Dive](./license-compliance-deep.md) — GNU General Public License v3.0 (GPLv3) compliance analysis, Linux kernel verifier license checking, and BPF helper access.

### 5. Quality Assurance, Operations & Roadmap

- [Build System & Workspace](./build-system-workspace.md) — Root Cargo workspace configuration, compilation targets (`bpfel-unknown-none`), `bpf-linker` integration, and CI/CD pipelines.
- [Testing Strategy](./testing-strategy.md) — Four-layer testing pyramid (unit, struct layout, integration, and E2E testing), benchmark suites, and release quality gates.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Diagnostic workflows and solutions for 19 common build, verifier, permission, and runtime errors.
- [Roadmap Features Deep Dive](./roadmap-features-deep.md) — Architectural blueprints for advanced path extraction (`bpf_probe_read_user_str`), socket observability (`tcp_connect`), and File Integrity Monitoring (`sys_enter_openat`).

---

## Cross-Reference Matrix

The documentation suite is designed with interconnected references across architectural boundaries:

| Category | Primary Reference | Directly Related Documents |
|---|---|---|
| **Architecture** | [Architecture Overview](./architecture-overview.md) | [eBPF Fundamentals](./ebpf-fundamentals.md), [Event Transport](./event-transport.md), [ghostring-common Structs](./ghostring-common-structs.md), [ghostring User Daemon](./ghostring-user-daemon.md) |
| **Kernel Probes** | [Kernel Instrumentation](./kernel-instrumentation.md) | [eBPF Internals](./ebpf-internals.md), [BTF & CO-RE](./btf-co-re-deep-dive.md), [Aya Framework](./aya-framework.md), [License Compliance](./license-compliance-deep.md) |
| **Data Transport** | [Event Transport](./event-transport.md) | [Perf Buffer Internals](./perf-buffer-internals.md), [ghostring-common Structs](./ghostring-common-structs.md), [ghostring User Daemon](./ghostring-user-daemon.md) |
| **Data Structures** | [ghostring-common Structs](./ghostring-common-structs.md) | [Event Transport](./event-transport.md), [BTF & CO-RE](./btf-co-re-deep-dive.md), [Testing Strategy](./testing-strategy.md), [Roadmap Features](./roadmap-features-deep.md) |
| **User Daemon** | [ghostring User Daemon](./ghostring-user-daemon.md) | [Aya Framework](./aya-framework.md), [Perf Buffer Internals](./perf-buffer-internals.md), [Build System](./build-system-workspace.md), [Troubleshooting](./troubleshooting-guide.md) |
| **Portability** | [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) | [eBPF Internals](./ebpf-internals.md), [Aya Framework](./aya-framework.md), [Kernel Instrumentation](./kernel-instrumentation.md) |
| **Licensing** | [License Compliance Deep Dive](./license-compliance-deep.md) | [Security Requirements](./security-requirements.md), [eBPF Internals](./ebpf-internals.md), [Build System](./build-system-workspace.md) |
| **Build & Toolchain** | [Build System & Workspace](./build-system-workspace.md) | [Development Environment](./development-environment.md), [Testing Strategy](./testing-strategy.md), [Troubleshooting](./troubleshooting-guide.md) |
| **Threat Modeling** | [Security Model Deep Dive](./security-model-deep-dive.md) | [Security Requirements](./security-requirements.md), [Kernel Instrumentation](./kernel-instrumentation.md), [Roadmap Features](./roadmap-features-deep.md) |
| **Quality & Tests** | [Testing Strategy](./testing-strategy.md) | [Build System](./build-system-workspace.md), [ghostring-common Structs](./ghostring-common-structs.md), [Troubleshooting](./troubleshooting-guide.md) |
| **Future Scope** | [Roadmap Features Deep Dive](./roadmap-features-deep.md) | [Kernel Instrumentation](./kernel-instrumentation.md), [ghostring-common Structs](./ghostring-common-structs.md), [ghostring User Daemon](./ghostring-user-daemon.md) |

---

## Recommended Reading Paths

### 1. New Contributor Onboarding
1. [Development Environment](./development-environment.md) — Set up required kernel headers, Nightly Rust, and `bpf-linker`.
2. [Architecture Overview](./architecture-overview.md) — Understand crate segregation and system data flow.
3. [eBPF Fundamentals](./ebpf-fundamentals.md) — Review kernel execution model and safety guarantees.
4. [Build System & Workspace](./build-system-workspace.md) — Learn how to build and run the complete workspace.

### 2. Kernel & eBPF Engineers
1. [Kernel Instrumentation](./kernel-instrumentation.md) — Tracepoint and probe mechanics.
2. [eBPF Internals & Bytecode](./ebpf-internals.md) — ISA, stack limitations, and verifier rules.
3. [Aya Framework](./aya-framework.md) — aya-ebpf bindings and helper invocations.
4. [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — Cross-kernel struct relocations.
5. [License Compliance Deep Dive](./license-compliance-deep.md) — GPLv3 requirements for helper access.

### 3. Systems & Daemon Developers
1. [ghostring User Daemon](./ghostring-user-daemon.md) — Tokio async loop and poller design.
2. [Event Transport](./event-transport.md) — Data ingestion pipeline from kernel space.
3. [Perf Buffer Internals](./perf-buffer-internals.md) — Memory layouts, header structs, and per-CPU ring handling.
4. [ghostring-common Struct Design](./ghostring-common-structs.md) — `#[repr(C)]` struct definitions and ABI stability.
5. [Testing Strategy](./testing-strategy.md) — Integration test patterns and release validation.

### 4. Security Architects & Auditors
1. [Security Requirements](./security-requirements.md) — Kernel vs. user-space threat posture.
2. [Security Model Deep Dive](./security-model-deep-dive.md) — Threat matrix and defense-in-depth guarantees.
3. [License Compliance Deep Dive](./license-compliance-deep.md) — GPLv3 legal and verifier audit trail.
4. [Roadmap Features Deep Dive](./roadmap-features-deep.md) — Network monitoring and File Integrity Monitoring (FIM).