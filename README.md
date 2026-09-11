# GhostRing: Real-Time eBPF Kernel Security Observer

**GhostRing** is a high-performance, ultra-low-overhead Linux security observability and threat detection daemon. Built entirely in Rust using the pure-Rust [Aya framework](https://aya-rs.dev/), GhostRing instruments the Linux kernel at Ring 0 via eBPF (Extended Berkeley Packet Filter). By intercepting critical system calls directly within the kernel execution path, GhostRing delivers zero-trust telemetry that remains completely invisible to user-space tampering, rootkits, and process-hiding techniques.

---

## Architecture & Data Flow

GhostRing leverages a decoupled workspace design where safety, performance, and low-level kernel interaction are cleanly partitioned. The system operates across three distinct crates:

```text
GhostRing/
├── Cargo.toml                  # Workspace manifest defining shared dependencies
├── ghostring-common/           # C-compatible structs shared across the kernel boundary
├── ghostring-ebpf/             # no_std Rust kernel bytecode program (Ring 0)
└── ghostring/                  # Asynchronous Tokio user-space daemon & CLI

```

### The Telemetry Pipeline

1. **Trigger:** When any process on the system initiates a system call (such as `sys_enter_execve`), the Linux kernel hits the attached tracepoint.
2. **Execution (`ghostring-ebpf`):** The sandboxed eBPF bytecode executes safely within the kernel. It fetches context registers, extracts process identifiers (`pid`), user identifiers (`uid`), and command metadata without context-switching to user space.
3. **Transmission (`PerfEventArray`):** The kernel probe serializes this metadata into a fixed-size `#[repr(C)]` structure and pushes it into an eBPF `PerfEventArray` ring buffer map.
4. **Ingestion (`ghostring`):** The asynchronous user-space Tokio daemon polls the per-CPU ring buffers asynchronously, parsing the raw byte streams back into high-level Rust structs for logging, auditing, and alert routing.

---

## Why GhostRing?

Traditional security monitoring agents run entirely in user space (Ring 3), relying on system APIs, `/proc` filesystem polling, or dynamic library preloading (`LD_PRELOAD`). These methods suffer from critical flaws:

* **Evasion Vulnerabilities:** Advanced malware can hook system APIs, modify `/proc` entries, or unhook user-space monitors entirely.
* **Performance Overhead:** Polling filesystem states or context-switching heavily drains CPU resources on high-throughput enterprise servers.

GhostRing eliminates these vectors by moving detection logic directly into the kernel runtime. The Linux kernel verifier statically analyzes eBPF bytecode before execution, guaranteeing memory safety, loop bounds, and crash resistance without traditional kernel module (`.ko`) development risks.

---

## Prerequisites & System Requirements

Because eBPF execution relies heavily on modern Linux kernel features, building and running GhostRing requires a proper development environment:

* **Operating System:** Linux distribution running kernel version **5.8 or higher** (with BTF enabled for optimal flexibility).
* **Rust Toolchain:** Rust Nightly (required for `core::simd`, unstable compiler intrinsics, and `rust-src` components used in eBPF compilation).
* **Build Utilities:** `llvm`, `m4`, `make`, and the `bpf-linker` cargo utility.

### Environment Setup Commands

```bash
# Install the Rust nightly toolchain and ensure the kernel source components are present
rustup toolchain install nightly --component rust-src
rustup default nightly

# Install the dedicated eBPF program linker
cargo install bpf-linker

```

---

## Build and Execution Guide

### 1. Clone and Prepare the Workspace

Ensure you have cloned your repository locally:

```bash
git clone https://github.com/ankur3-101106/GhostRing.git
cd GhostRing

```

### 2. Compile the Kernel-Space eBPF Bytecode

Before compiling the user-space daemon, you must compile the `no_std` eBPF probe into raw BPF target bytecode:

```bash
cd ghostring-ebpf
cargo build --release
cd ..

```

### 3. Run the User-Space Daemon

Loading eBPF programs, attaching tracepoints, and mapping perf ring buffers require elevated system privileges. Run the daemon using `sudo` with environment preservation (`-E` to maintain cargo toolchain paths):

```bash
cd ghostring
sudo -E cargo run --release

```

---

## Technical Roadmap & Development Milestones

* [ ] **Advanced Path Extraction:** Implement `bpf_probe_read_user_str` within the `sys_enter_execve` tracepoint context to capture absolute file system execution paths instead of truncated 16-byte command tokens.
* [ ] **Network Socket Observability:** Attach `kprobes`/`kretprobes` to kernel networking functions such as `tcp_connect` to dynamically flag reverse-shell attempts and unauthorized egress connections.
* [ ] **File Integrity Monitoring (FIM):** Instrument `sys_enter_openat` system calls to track and alert on suspicious read/write interactions targeting sensitive system configuration files (e.g., `/etc/shadow`, `/etc/passwd`, or SSH authorized keys).
* [ ] **Structured JSON Event Export:** Add an optional CLI flag to output structured JSON logs compatible with SIEM pipelines and log aggregators (Elasticsearch, Splunk, Vector).

---

## Licensing and Kernel Compliance

GhostRing is distributed under the terms of the **GNU General Public License v2.0** (GPLv2).

### Crucial Technical Compliance Note

The Linux kernel enforces a strict licensing check via its eBPF verifier. When an eBPF program is loaded into the kernel address space, the verifier inspects the program's license section. If the program is not explicitly declared as GPL-compatible, the kernel restricts access to advanced BPF helper functions (such as deep memory-reading utilities and tracing helpers). Licensing the entire codebase under GPLv2 ensures 100% binary compatibility with the Linux kernel subsystem.
