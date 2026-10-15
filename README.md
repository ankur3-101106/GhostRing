<p align="center">
  <img src="assets/logo.svg" alt="GhostRing Logo" width="140" />
</p>

# GhostRing

**Real-time Ring 0 eBPF security telemetry and observability engine in pure Rust.**

GhostRing instruments the Linux kernel at Ring 0 via eBPF using the [Aya framework](https://aya-rs.dev/). By capturing security-critical system execution paths directly in kernel space, it provides tamper-resistant, zero-trust system auditing that remains invisible to rootkits and user-space evasion.

---

## Documentation

All architectural specifications, low-level mechanics, and operational guides are documented in the **[`docs/`](https://ankur3-101106.github.io/GhostRing/index.html)** suite:

* **[Architecture & Workspace](https://ankur3-101106.github.io/GhostRing/architecture-overview.html)** — 3-crate workspace partitioning (`ghostring-common`, `ghostring-ebpf`, `ghostring`), crate boundaries, and [Build System](https://ankur3-101106.github.io/GhostRing/build-system-workspace.html).
* **[Telemetry Pipeline](https://ankur3-101106.github.io/GhostRing/event-transport.html)** — Ring 0 tracepoint interception, `PerfEventArray` mechanics, and [Perf Buffer Internals](https://ankur3-101106.github.io/GhostRing/perf-buffer-internals.html).
* **[Kernel Space & eBPF Engineering](https://ankur3-101106.github.io/GhostRing/ebpf-internals.html)** — Bytecode ISA, [Aya Framework](https://ankur3-101106.github.io/GhostRing/aya-framework.html), [BTF & CO-RE](https://ankur3-101106.github.io/GhostRing/btf-co-re-deep-dive.html), and [C-compatible ABI Structs](https://ankur3-101106.github.io/GhostRing/ghostring-common-structs.html).
* **[User Daemon](https://ankur3-101106.github.io/GhostRing/ghostring-user-daemon.html)** — Async Tokio daemon architecture, buffer poller loop, CLI flags, and logging.
* **[Prerequisites & Environment](https://ankur3-101106.github.io/GhostRing/development-environment.html)** — System requirements (Linux 5.8+, BTF) and isolated in-repo toolchain (`.build-env/`).
* **[Testing Strategy](https://ankur3-101106.github.io/GhostRing/testing-strategy.html)** — 4-tier testing pyramid, layout validation, and benchmarks.
* **[Troubleshooting Guide](https://ankur3-101106.github.io/GhostRing/troubleshooting-guide.html)** — Diagnostic workflows for build, verifier, and runtime errors.
* **[Security & License Compliance](https://ankur3-101106.github.io/GhostRing/license-compliance-deep.html)** — [Security Model](https://ankur3-101106.github.io/GhostRing/security-model-deep-dive.html), [Security Requirements](https://ankur3-101106.github.io/GhostRing/security-requirements.html), and GPLv3 kernel verifier rules.
* **[Technical Roadmap](https://ankur3-101106.github.io/GhostRing/roadmap-features-deep.html)** — Blueprints for path reads, socket observability (`tcp_connect`), and FIM (`sys_enter_openat`).

---

## Quickstart

### 1. Bootstrap Environment

GhostRing uses an isolated in-repository build environment (`.build-env/`) so host toolchains remain untouched:

```bash
git clone https://github.com/ankur3-101106/GhostRing.git
cd GhostRing
./scripts/setup-env.sh
source .build-env/activate
```

### 2. Build & Run

```bash
# Compile kernel eBPF bytecode
cargo build --release -p ghostring-ebpf

# Run the user-space daemon (requires root / CAP_BPF)
sudo -E cargo run --release -p ghostring
```

---

## License & Compliance

Distributed under the **[GNU General Public License v3.0](LICENSE)** (GPLv3). GPL compatibility is strictly required by the Linux kernel verifier to access advanced BPF helper functions. Details in [License Compliance Deep Dive](docs/license-compliance-deep.html).

---

## Community

* [Contributing Guide](CONTRIBUTING.md) • [Code of Conduct](CODE_OF_CONDUCT.md) • [Security Policy](SECURITY.md) • [Commit Standards](COMMIT.md)
