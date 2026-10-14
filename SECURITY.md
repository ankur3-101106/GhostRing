# Security Policy

GhostRing is a Linux security observability and threat detection system operating at Ring 0 via eBPF. Because GhostRing inspects critical system calls directly inside the Linux kernel execution path, maintaining absolute security, memory safety, and kernel stability is our highest priority.

---

## 1. Supported Versions

Security updates and patches are actively provided for the following releases:

| Version | Supported | Notes |
|---|---|---|
| `0.1.x` (main) | :white_check_mark: | Active development branch |
| `< 0.1.0` | :x: | Pre-release / experimental tags |

---

## 2. Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

If you discover a potential security vulnerability in GhostRing, please report it privately:

1. **GitHub Security Advisory (Preferred):**  
   Navigate to the [GhostRing Security Advisories](https://github.com/ankur3-101106/GhostRing/security/advisories) tab and click **"Report a vulnerability"**. This creates an isolated, encrypted collaboration channel between you and the maintainers.

2. **Direct Email:**  
   If you cannot use GitHub Advisories, send an encrypted or plaintext email to:  
   **`ankurdcs101106@gmail.com`**  
   *Subject Line:* `[SECURITY VULNERABILITY] GhostRing - <Brief Description>`

### Information to Include in Your Report

To help us triage and resolve the issue quickly, please provide:
* Description of the vulnerability and its potential security impact.
* Affected crate(s): `ghostring-ebpf`, `ghostring-common`, or `ghostring` user daemon.
* Linux kernel version (`uname -r`), distribution, and BTF configuration.
* Exact step-by-step reproduction steps or proof-of-concept (PoC) code.
* Potential remediation or proposed patches if available.

### Response Timelines

* **Initial Acknowledgment:** Within **48 hours** of report receipt.
* **Triage & Validation:** Within **7 business days**.
* **Coordinated Disclosure:** We adhere to responsible, coordinated disclosure. We will agree upon a reasonable disclosure embargo (typically 30–90 days) until a tested patch is published.

---

## 3. In-Scope Security Concerns

Given GhostRing's architectural boundary between Ring 0 (kernel) and Ring 3 (user space), high-priority security concerns include:

* **Kernel Space Instability:** Kernel panics, lockups, or memory leaks induced by eBPF probe execution.
* **Verifier Bypass or Unsound FFI:** Flaws allowing arbitrary memory reads or writes beyond the eBPF sandbox or across the `ghostring-common` C-ABI boundary.
* **Privilege Escalation:** Flaws in the user-space daemon or ring buffer event processing that allow an unprivileged user process to gain elevated host capabilities.
* **Denial of Service (DoS):** Attacks capable of crashing or perpetually stalling the asynchronous Tokio ring buffer consumer.
* **Information Disclosure:** Leakage of sensitive kernel memory pages or unintended inter-process memory exposure.

---

## 4. Developer Security Best Practices

Contributors are required to follow these defensive guidelines:

* **Minimal `unsafe`:** `ghostring-ebpf` and `ghostring-common` must avoid `unsafe` blocks except where strictly necessary for raw BPF helpers and C-compatible ABI layouts. All `unsafe` blocks must contain safety comments (`// SAFETY: ...`).
* **Verifier Compliance:** Bytecode must pass strict Linux kernel verifier checks without relying on unverified kernel module semantics.
* **Credential Hygiene:** Never commit secrets, tokens, or environment files (`.env/`). All credential folders are git-ignored.
* **GPLv3 Licensing:** Kernel eBPF code must remain strictly GPLv3-compliant to maintain authorization for GPL-only BPF helper functions.
