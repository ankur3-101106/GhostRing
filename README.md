<p align="center">
  <img src="assets/logo.svg" alt="GhostRing Logo" width="180" />
</p>

<h1 align="center">GhostRing</h1>

<p align="center">
  <strong>Real-Time Ring 0 eBPF Telemetry & Security Observability Engine in Pure Rust</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square" alt="License: GPLv3" /></a>
  <a href="https://aya-rs.dev/"><img src="https://img.shields.io/badge/Framework-Aya%20eBPF-orange.svg?style=flat-square" alt="Aya Framework" /></a>
  <a href="docs/index.html"><img src="https://img.shields.io/badge/Docs-HTML%20Suite-00f2fe.svg?style=flat-square" alt="Interactive Docs" /></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-Nightly-rebeccapurple.svg?style=flat-square" alt="Rust Nightly" /></a>
  <img src="https://img.shields.io/badge/Kernel-5.8%2B%20(BTF%2FCO--RE)-brightgreen.svg?style=flat-square" alt="Linux Kernel 5.8+" />
</p>

---

## Overview

**GhostRing** is a high-performance, ultra-low-overhead Linux security observability and kernel-level telemetry engine. Built from the ground up in pure Rust utilizing the [Aya eBPF framework](https://aya-rs.dev/), GhostRing instruments the Linux kernel at Ring 0 via eBPF (Extended Berkeley Packet Filter). 

By intercepting system calls and kernel execution paths directly in kernel space, GhostRing provides zero-trust, tamper-resistant system auditing that remains completely invisible to user-space evasion techniques, `/proc` manipulation, `LD_PRELOAD` bypasses, and rootkits.

All technical specifications, low-level ring buffer layouts, verifier compliance rules, and operational blueprints are comprehensively documented in the **[Interactive HTML Documentation Suite](docs/index.html)**.

---

## Architecture & Workspace Structure

GhostRing is structured as a decoupled Cargo workspace partitioning safety, performance, and low-level kernel interaction across three primary crates:

```text
GhostRing/
├── Cargo.toml                  # Workspace manifest defining shared dependencies
├── ghostring-common/           # C-compatible #[repr(C)] ABI structs shared across boundaries
├── ghostring-ebpf/             # no_std Rust Ring 0 eBPF bytecode (target: bpfel-unknown-none)
├── ghostring/                  # Asynchronous Tokio user-space daemon & CLI tool
├── docs/                       # Complete interactive HTML documentation suite
│   ├── index.html              # Central documentation portal & architecture reference
│   ├── assets/                 # Stylesheets, search index, interactive scripts, logo
│   └── *.html                  # 19 comprehensive technical specification documents
└── scripts/                    # Environment bootstrap, toolchains, and build scripts
    ├── setup-env.sh            # Automated zero-friction build environment setup
    ├── build_docs.py           # Documentation generator and internal link validator
    └── doc_sources/            # Canonical documentation markdown source files
```

### End-to-End Telemetry Pipeline

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    RING 0 - KERNEL SPACE                     │
  │                                                              │
  │   Kernel Syscall (e.g. sys_enter_execve)                     │
  │         │                                                    │
  │         ▼                                                    │
  │   ghostring-ebpf Probe (Tracepoint / kprobe)                 │
  │         │                                                    │
  │         ├─ Extract PID, UID, GID, Comm via BPF helpers       │
  │         ├─ Fill C-compatible #[repr(C)] Event Struct         │
  │         ▼                                                    │
  │   PerfEventArray Ring Buffer (Per-CPU circular memory)       │
  └─────────────────────────────┬────────────────────────────────┘
                                │
                        mmap Ring Buffer
                                │
  ┌─────────────────────────────▼────────────────────────────────┐
  │                   RING 3 - USER SPACE                        │
  │                                                              │
  │   ghostring User Daemon (Tokio Async Poller)                 │
  │         │                                                    │
  │         ├─ Asynchronous event loop reading per-CPU buffers   │
  │         ├─ Zero-copy FFI deserialization (ghostring-common)  │
  │         ├─ Event filtering, rate limiting, and verification  │
  │         ▼                                                    │
  │   Structured Auditing, Alerting & SIEM Integration           │
  └──────────────────────────────────────────────────────────────┘
```

---

## Interactive Documentation Suite

GhostRing features an interactive HTML documentation site located in the [`docs/`](docs/index.html) directory. It includes:
* **Real-time fuzzy search** powered by <kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>/</kbd>.
* **Dark and Light mode** with smooth transition and `localStorage` persistence.
* **Syntax highlighting** for Rust, C, Bash, TOML, Assembly, and JSON with one-click copy buttons.
* **On-This-Page scroll spy** and responsive mobile navigation drawer.
* **700+ verified cross-links** with zero broken references.

> [!TIP]
> **Viewing the Documentation**: Open [`docs/index.html`](docs/index.html) directly in any web browser, or serve it locally using any static file server (e.g., `python -m http.server -d docs 8000`).

### Documentation Catalog

| Section | Topic | HTML Document | Description |
|---|---|---|---|
| **01 Architecture** | Overview | [Architecture Overview](docs/architecture-overview.html) | Workspace crates, boundaries, and pipeline flow. |
| **01 Architecture** | Environment | [Development Environment](docs/development-environment.html) | In-repository `.build-env/` toolchain setup. |
| **01 Architecture** | eBPF Basics | [eBPF Fundamentals](docs/ebpf-fundamentals.html) | Execution model, verifier constraints, probe types. |
| **01 Architecture** | Instrumentation | [Kernel Instrumentation](docs/kernel-instrumentation.html) | Tracepoints, kprobes, and safety guarantees. |
| **02 Kernel Space** | Bytecode & ISA | [eBPF Internals](docs/ebpf-internals.html) | ISA registers, stack limits, ELF layout, JIT. |
| **02 Kernel Space** | Framework | [Aya Framework](docs/aya-framework.html) | Pure-Rust eBPF loader, maps, and helpers. |
| **02 Kernel Space** | Portability | [BTF & CO-RE Deep Dive](docs/btf-co-re-deep-dive.html) | Type Format relocations and cross-kernel portability. |
| **02 Kernel Space** | ABI & Layout | [ghostring-common Structs](docs/ghostring-common-structs.html) | `#[repr(C)]` struct design and alignment safety. |
| **03 Telemetry** | Transport | [Event Transport](docs/event-transport.html) | Ring 0 to Ring 3 transmission mechanics. |
| **03 Telemetry** | Ring Buffers | [Perf Buffer Internals](docs/perf-buffer-internals.html) | Head/tail synchronization and mmap memory layout. |
| **03 Telemetry** | Daemon | [ghostring User Daemon](docs/ghostring-user-daemon.html) | Tokio async poller architecture and CLI options. |
| **04 Security** | Requirements | [Security Requirements](docs/security-requirements.html) | Zero-trust advantages over user-space agents. |
| **04 Security** | Threat Model | [Security Model Deep Dive](docs/security-model-deep-dive.html) | Evasion resilience and kernel rootkit resistance. |
| **04 Security** | Compliance | [License Compliance Deep Dive](docs/license-compliance-deep.html) | GPLv3 verifier audit trail and helper access. |
| **05 Operations** | Build System | [Build System & Workspace](docs/build-system-workspace.html) | Target flags, `bpf-linker`, and Cargo config. |
| **05 Operations** | QA & Tests | [Testing Strategy](docs/testing-strategy.html) | 4-layer testing pyramid and benchmarks. |
| **05 Operations** | Diagnostics | [Troubleshooting Guide](docs/troubleshooting-guide.html) | 19 diagnostic workflows and common error fixes. |
| **05 Operations** | Future Scope | [Roadmap Features Deep Dive](docs/roadmap-features-deep.html) | Blueprints for FIM, socket egress, and path reads. |

### Recommended Reading Paths

* **New Contributors**: [Development Environment](docs/development-environment.html) → [Architecture Overview](docs/architecture-overview.html) → [Build System & Workspace](docs/build-system-workspace.html)
* **Kernel & eBPF Engineers**: [Kernel Instrumentation](docs/kernel-instrumentation.html) → [eBPF Internals](docs/ebpf-internals.html) → [Aya Framework](docs/aya-framework.html) → [BTF & CO-RE](docs/btf-co-re-deep-dive.html)
* **Daemon & Systems Developers**: [ghostring User Daemon](docs/ghostring-user-daemon.html) → [Event Transport](docs/event-transport.html) → [Perf Buffer Internals](docs/perf-buffer-internals.html) → [Testing Strategy](docs/testing-strategy.html)
* **Security Auditors**: [Security Requirements](docs/security-requirements.html) → [Security Model Deep Dive](docs/security-model-deep-dive.html) → [License Compliance](docs/license-compliance-deep.html)

---

## Quickstart & Build Instructions

### 1. Automated Environment Bootstrap

GhostRing employs an **isolated in-repository build environment** (`.build-env/`), guaranteeing that host toolchains remain untouched. To bootstrap the complete toolchain (Nightly Rust, `rust-src`, and static `bpf-linker`):

```bash
# Clone the repository
git clone https://github.com/ankur3-101106/GhostRing.git
cd GhostRing

# Run the automated setup script
./scripts/setup-env.sh
```

### 2. Activate the Build Environment

In your active shell session, activate the isolated environment:

```bash
source .build-env/activate
```

*(Alternatively, run commands through the wrapper: `./.build-env/run.sh <command>`)*

### 3. Compile the Kernel-Space eBPF Bytecode

```bash
cd ghostring-ebpf
cargo build --release
cd ..
```

### 4. Run the User-Space Daemon

Attaching eBPF programs to kernel tracepoints requires elevated privileges (`CAP_BPF` / `CAP_PERFMON` or root):

```bash
cd ghostring
sudo -E cargo run --release
```

### 5. Rebuilding Documentation

To regenerate the HTML documentation site and run automated link validation:

```bash
python scripts/build_docs.py
```

---

## Key Technical Specifications

* **Kernel Interception:** Tracepoint `sys_enter_execve` monitoring process creation with process ID (`pid`), parent process ID (`ppid`), user ID (`uid`), group ID (`gid`), and executable command name (`comm`).
* **Transport Mechanism:** Lock-free per-CPU `BPF_MAP_TYPE_PERF_EVENT_ARRAY` ring buffers with asynchronous user-space polling via `aya::maps::perf::AsyncPerfEventArray`.
* **Zero Serialization Overhead:** Direct C-compatible memory layout (`#[repr(C)]`) across kernel and user space defined in `ghostring-common`.
* **Verifier Safety:** 100% compliant with the Linux kernel eBPF verifier, guaranteeing memory bounds, non-looping verification, and crash resistance.

---

## Roadmap & Upcoming Features

Detailed architectural blueprints for all upcoming features are available in the [Roadmap Features Deep Dive](docs/roadmap-features-deep.html):

- [ ] **Absolute Path Extraction:** Intercept file paths using `bpf_probe_read_user_str` within `sys_enter_execve` to eliminate 16-byte `comm` truncation.
- [ ] **Network Socket Observability:** Dynamic kprobes on `tcp_connect` to detect egress connections, reverse shells, and malicious beaconing.
- [ ] **File Integrity Monitoring (FIM):** Intercept `sys_enter_openat` with path validation to monitor access to critical system files (`/etc/shadow`, `/etc/passwd`, SSH keys).
- [ ] **Structured SIEM Export:** Native JSON/NDJSON event emitter flag (`--json`) for direct forwarding to Elasticsearch, Vector, and Splunk.

---

## Licensing & Kernel Verifier Compliance

GhostRing is distributed under the terms of the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.

> [!IMPORTANT]
> **Kernel Verifier Licensing Rule**: The Linux kernel verifier inspects the `.license` section of every loaded eBPF ELF binary. Programs without a GPL-compatible license are barred from invoking advanced BPF helper functions (`bpf_probe_read_user_str`, tracing helpers, etc.). Licensing GhostRing under GPLv3 guarantees 100% binary compatibility and unrestricted access to the kernel's eBPF helper subsystem. See the [License Compliance Deep Dive](docs/license-compliance-deep.html) for complete technical and legal details.

---

## Community & Contributing

* **[Contributing Guide](CONTRIBUTING.md)**: Git workflow, isolated environment guidelines, and PR quality gates.
* **[Code of Conduct](CODE_OF_CONDUCT.md)**: Standards of community engagement (Contributor Covenant v2.1).
* **[Security Policy](SECURITY.md)**: Vulnerability disclosure and reporting procedures.
* **[Commit Standards](COMMIT.md)**: Conventional Commits 1.0.0 specification and repository scopes.
