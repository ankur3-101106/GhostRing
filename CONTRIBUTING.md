# Contributing to GhostRing

Thank you for your interest in contributing to **GhostRing**! GhostRing is an open-source, high-performance Linux kernel security observability and threat detection daemon built with Rust and the Aya eBPF framework.

We welcome contributions of all types: bug reports, documentation enhancements, feature proposals, and code contributions.

---

## 1. Code of Conduct

All contributors, maintainers, and community members are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to ensure a respectful and welcoming environment for everyone.

---

## 2. Architecture Overview

GhostRing is structured as a decoupled Cargo workspace across three primary crates:

* **`ghostring-common`**: `#[repr(C)]` memory-stable structures shared between kernel and user space. Has zero dependencies and `no_std` compatibility.
* **`ghostring-ebpf`**: `no_std` Ring 0 eBPF bytecode compiled for the `bpfel-unknown-none` target using `aya-ebpf` and `bpf-linker`.
* **`ghostring`**: Asynchronous Tokio user-space daemon and CLI tool that loads eBPF programs, polls perf event ring buffers, and processes telemetry.

For deep technical specifications, consult the comprehensive documentation in the [`prerequisites/`](prerequisites/README.md) directory.

---

## 3. Development Environment Setup

GhostRing utilizes an **in-repository isolated build environment** (`.build-env/`) to keep host operating system toolchains completely untouched.

### Quick Bootstrap

```bash
# Clone the repository
git clone https://github.com/ankur3-101106/GhostRing.git
cd GhostRing

# Run the automated setup script
./scripts/setup-env.sh
```

### Activating the Isolated Environment

Whenever working on the repository, activate the isolated environment:

```bash
source .build-env/activate
```

Alternatively, run any command directly through the wrapper:

```bash
./.build-env/run.sh cargo check --workspace
```

For detailed setup instructions, manual installation procedures, and troubleshooting, refer to [Development Environment Documentation](prerequisites/development-environment.md).

---

## 4. Git Workflow & Commit Standards

GhostRing strictly enforces the **Conventional Commits 1.0.0** specification. Every commit message must adhere to the format:

```text
<type>(<scope>): <short imperative description>

[optional body explaining technical rationale]

[optional footer(s)]
```

### Allowed Scopes
* `common` — `ghostring-common` crate
* `ebpf` — `ghostring-ebpf` kernel probes
* `daemon` — `ghostring` user-space daemon
* `transport` — Ring buffer and event transport mechanics
* `docs` — Documentation, guides, and prerequisites
* `build` — Build scripts, Cargo manifests, toolchains
* `ci` — CI/CD workflows and actions

For full commit guidelines, examples, pre-commit validation gates, and push procedures, refer to [COMMIT.md](COMMIT.md).

---

## 5. Pre-Submission Quality Gates

Before submitting a Pull Request, verify that your changes pass all local verification gates:

```bash
# Ensure isolated environment is active
source .build-env/activate

# 1. Check workspace compilation
cargo check --workspace

# 2. Run unit and ABI regression tests
cargo test --workspace

# 3. Lint with Clippy (warnings treated as errors)
cargo clippy --workspace -- -D warnings

# 4. Check code formatting
cargo fmt --check --workspace
```

---

## 6. Pull Request Process

1. **Create a Feature Branch:** Branch from `main` using descriptive naming:
   ```bash
   git checkout -b feat/execve-path-extraction
   # or
   git checkout -b fix/perf-buffer-overrun
   ```
2. **Commit Changes:** Follow [COMMIT.md](COMMIT.md) conventions. Keep commits atomic and focused.
3. **Verify Quality Gates:** Run the test, clippy, and fmt checks outlined above.
4. **Push and Open PR:** Push your branch to GitHub and open a Pull Request against the `main` branch.
5. **Code Review:** Address any reviewer feedback or CI test failures promptly.

---

## 7. Security Disclosures

If you uncover a security vulnerability, please do **not** open a public issue. Follow the instructions in [SECURITY.md](SECURITY.md) to report it privately.

---

## 8. License

By contributing to GhostRing, you agree that your contributions will be licensed under the project's [GNU General Public License v3.0 (GPLv3)](LICENSE).
