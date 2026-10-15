<p align="center">
  <img src="assets/logo.svg" alt="GhostRing Logo" width="160" />
</p>

# GhostRing

GhostRing is a high-performance, real-time Linux security observability and telemetry engine built entirely in Rust. Powered by the [Aya framework](https://aya-rs.dev/), GhostRing instruments the Linux kernel at Ring 0 via eBPF (Extended Berkeley Packet Filter) to deliver tamper-resistant, low-overhead system call auditing without modifying kernel source code or loading proprietary kernel modules.

Traditional user-space monitoring utilities rely on `/proc` scanning, ptrace, or dynamic library preloading (`LD_PRELOAD`), leaving them vulnerable to rootkits, API unhooking, and process hiding. GhostRing moves detection into the kernel runtime, ensuring all telemetry is captured at execution time before user-space processes can alter state.

Comprehensive specifications, memory layouts, and diagnostic workflows are available in the [Documentation](docs/index.html).

---

## Workspace Architecture

GhostRing is organized as a decoupled Rust workspace across three distinct crates:

```text
GhostRing/
├── Cargo.toml                  # Workspace manifest
├── ghostring-common/           # C-compatible #[repr(C)] ABI structs shared across boundaries
├── ghostring-ebpf/             # no_std Rust Ring 0 eBPF bytecode (target: bpfel-unknown-none)
├── ghostring/                  # Asynchronous Tokio user-space daemon & CLI
├── docs/                       # Complete HTML technical documentation suite
└── scripts/                    # Toolchain setup, build automation, and doc generation
```

* **`ghostring-common`**: Defines binary event structures shared across the kernel/user boundary. All types enforce `#[repr(C)]` memory layouts with strict alignment and scalar types to guarantee ABI stability and zero runtime serialization cost. See [ghostring-common Struct Design](docs/ghostring-common-structs.html).
* **`ghostring-ebpf`**: Ring 0 probe programs compiled for the `bpfel-unknown-none` target. Intercepts kernel tracepoints (e.g., `sys_enter_execve`), extracts context metadata via BPF helpers, and emits events into per-CPU perf ring buffers. See [eBPF Internals](docs/ebpf-internals.html) and [Aya Framework](docs/aya-framework.html).
* **`ghostring`**: Async user-space daemon written with Tokio. Handles ELF program loading, probe attachment, per-CPU ring buffer polling, event parsing, filtering, and logging. See [ghostring User Daemon](docs/ghostring-user-daemon.html).

For an end-to-end breakdown of crate boundaries and data flow, consult the [Architecture Overview](docs/architecture-overview.html).

---

## Telemetry Pipeline

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    RING 0 - KERNEL SPACE                     │
  │                                                              │
  │   Tracepoint Interception (sys_enter_execve)                 │
  │         │                                                    │
  │         ▼                                                    │
  │   ghostring-ebpf Probe                                       │
  │         ├─ Extract PID, PPID, UID, GID, Comm via BPF helpers │
  │         ├─ Populate #[repr(C)] ExecveEvent struct            │
  │         ▼                                                    │
  │   PerfEventArray (Per-CPU circular memory buffer)            │
  └─────────────────────────────┬────────────────────────────────┘
                                │
                        mmap Ring Buffer
                                │
  ┌─────────────────────────────▼────────────────────────────────┐
  │                   RING 3 - USER SPACE                        │
  │                                                              │
  │   ghostring Daemon (Tokio Polling Loop)                      │
  │         ├─ Async poll per-CPU buffers (AsyncPerfEventArray)  │
  │         ├─ Cast raw bytes into #[repr(C)] Event Structs      │
  │         ├─ Filter, format, and emit structured audit logs    │
  │         ▼                                                    │
  │   Console / SIEM / Log Pipeline                              │
  └──────────────────────────────────────────────────────────────┘
```

For detailed memory layout specifications, mmap header structures, and pointer synchronization mechanics, refer to [Perf Buffer Internals](docs/perf-buffer-internals.html) and [Event Transport](docs/event-transport.html).

---

## Prerequisites

* **Operating System**: Linux kernel **5.8 or higher** with BTF (`CONFIG_DEBUG_INFO_BTF=y`) enabled.
* **Rust Toolchain**: Rust Nightly with `rust-src` component (required for compiling `core` to `bpfel-unknown-none`).
* **BPF Linker**: `bpf-linker` (static binary linked against matching LLVM).
* **System Utilities**: `llvm`, `clang`, `make`, `zstd`, `curl`.

For distribution-specific prerequisites and kernel verification steps, see the [Development Environment Guide](docs/development-environment.html).

---

## Quickstart

### 1. Bootstrap the Isolated Build Environment

GhostRing uses an isolated in-repository toolchain (`.build-env/`) to avoid conflicting with host Rust installations:

```bash
# Clone the repository
git clone https://github.com/ankur3-101106/GhostRing.git
cd GhostRing

# Run the automated bootstrap script
./scripts/setup-env.sh
```

### 2. Activate the Environment

```bash
source .build-env/activate
```

*(Alternatively, run commands directly via the wrapper: `./.build-env/run.sh cargo ...`)*

### 3. Build the Kernel eBPF Bytecode

```bash
cd ghostring-ebpf
cargo build --release
cd ..
```

### 4. Run the User Daemon

Attaching eBPF programs to tracepoints requires elevated capabilities (`CAP_BPF` and `CAP_PERFMON`, or root):

```bash
cd ghostring
sudo -E cargo run --release
```

For diagnostic steps regarding verifier rejections, memory lock limits, or permission errors, refer to the [Troubleshooting Guide](docs/troubleshooting-guide.html).

---

## Technical Documentation Reference

The documentation suite in [`docs/`](docs/index.html) covers all architectural layers, security considerations, and operational workflows:

| Category | Reference Document | Description |
|---|---|---|
| **Foundational Architecture** | [Architecture Overview](docs/architecture-overview.html) | Workspace crates, boundaries, and telemetry pipeline |
| | [Development Environment](docs/development-environment.html) | System prerequisites, isolated toolchain, and bootstrap |
| | [eBPF Fundamentals](docs/ebpf-fundamentals.html) | Kernel execution model, safety guarantees, and verifier |
| | [Kernel Instrumentation](docs/kernel-instrumentation.html) | Tracepoint interception, probe types, and safety rules |
| **Kernel Engineering** | [eBPF Internals & Bytecode](docs/ebpf-internals.html) | Instruction set, register model, ELF layout, and JIT |
| | [Aya Framework](docs/aya-framework.html) | Pure-Rust Aya ecosystem, loader abstractions, and maps |
| | [BTF & CO-RE Deep Dive](docs/btf-co-re-deep-dive.html) | Type format relocations and cross-kernel portability |
| | [ghostring-common Structs](docs/ghostring-common-structs.html) | C-compatible memory layouts and cross-boundary ABI |
| **Telemetry Pipeline** | [Event Transport](docs/event-transport.html) | Ring 0 to user space telemetry mechanics |
| | [Perf Buffer Internals](docs/perf-buffer-internals.html) | Ring buffer layout, mmap headers, and per-CPU rings |
| | [ghostring User Daemon](docs/ghostring-user-daemon.html) | Tokio async loop, buffer poller, CLI options, and logging |
| **Security & Compliance** | [Security Requirements](docs/security-requirements.html) | Zero-trust advantages, threat posture, and licensing |
| | [Security Model Deep Dive](docs/security-model-deep-dive.html) | Threat matrix, evasion defenses, and rootkit resistance |
| | [License Compliance Deep Dive](docs/license-compliance-deep.html) | GPLv3 verifier requirements and helper access |
| **Operations & Quality** | [Build System & Workspace](docs/build-system-workspace.html) | Target flags, `bpf-linker`, and Cargo workspace config |
| | [Testing Strategy](docs/testing-strategy.html) | 4-layer testing pyramid, benchmarks, and quality gates |
| | [Troubleshooting Guide](docs/troubleshooting-guide.html) | 19 diagnostic workflows for build, verifier, and runtime errors |
| | [Roadmap Features Deep Dive](docs/roadmap-features-deep.html) | Blueprints for path reads, socket egress, and FIM |

---

## Technical Roadmap

- [ ] **Path Extraction (`bpf_probe_read_user_str`)**: Read absolute filesystem paths within `sys_enter_execve` rather than relying solely on the 16-byte `comm` field.
- [ ] **Network Socket Observability (`tcp_connect`)**: Attach kprobes to kernel socket operations to track outbound network connections and reverse shells.
- [ ] **File Integrity Monitoring (`sys_enter_openat`)**: Intercept file open operations to detect unauthorized access to sensitive paths (`/etc/shadow`, `/etc/passwd`, SSH keys).
- [ ] **Structured SIEM Export**: Add `--json` output format for streaming events into Vector, Elasticsearch, and Splunk.

Detailed engineering blueprints for these milestones are documented in [Roadmap Features Deep Dive](docs/roadmap-features-deep.html).

---

## License & Kernel Compliance

GhostRing is licensed under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.

### Kernel Verifier Requirement

The Linux kernel verifier inspects the `.license` section of loaded eBPF programs. Non-GPL-compatible programs are restricted by the kernel from invoking advanced BPF helper functions (including `bpf_probe_read_user_str` and tracing utilities). Licensing GhostRing under GPLv3 ensures full binary compatibility and unrestricted access to kernel helper functions. See [License Compliance Deep Dive](docs/license-compliance-deep.html).

---

## Community & Contributing

* [Contributing Guide](CONTRIBUTING.md) — Workflow guidelines, build instructions, and pull request checklist.
* [Code of Conduct](CODE_OF_CONDUCT.md) — Community participation standards (Contributor Covenant v2.1).
* [Security Policy](SECURITY.md) — Vulnerability reporting and disclosure process.
* [Commit Standards](COMMIT.md) — Conventional Commits 1.0.0 guidelines.
