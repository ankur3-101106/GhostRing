# GhostRing Git Commit & Contribution Guidelines

This guide defines the Git workflow, commit conventions, pre-commit validation gates, and push procedures for the GhostRing repository. Adherence to these standards ensures a clean, auditable commit history suitable for a high-performance Linux kernel security system.

---

## 1. Commit Message Specification

GhostRing follows the **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/)** specification. Every commit message must be structured as follows:

```text
<type>(<scope>): <short imperative description>

[optional body providing technical rationale, context, and decisions]

[optional footer(s): BREAKING CHANGE, Closes #123, Refs #456]
```

### Format Breakdown

| Element | Requirement | Rules |
|---|---|---|
| **`<type>`** | **Required** | Lowercase noun defining the intent of the change (see [Commit Types](#2-commit-types)). |
| **`(<scope>)`** | **Recommended** | Lowercase identifier enclosed in parentheses denoting the crate or system area (see [Repository Scopes](#3-repository-scopes)). |
| **`<description>`** | **Required** | Concise summary in imperative mood, lowercase, no trailing period, max 50–72 characters. |
| **`[body]`** | **Optional** | Multi-line paragraph(s) explaining *what* was changed and *why* (not *how*). Wrapped at 72 characters. |
| **`[footer]`** | **Optional** | Notes breaking changes (`BREAKING CHANGE: ...`) or references issues (`Closes #42`). |

---

## 2. Commit Types

| Type | Intent | When to Use | GhostRing Example |
|---|---|---|---|
| **`feat`** | New feature | Introducing new functionality to any crate or daemon component. | `feat(ebpf): add sys_enter_openat tracepoint probe` |
| **`fix`** | Bug fix | Correcting unintended behavior or crashes in kernel or user space. | `fix(daemon): handle ring buffer overrun without panic` |
| **`docs`** | Documentation | Updating docs, READMEs, guides, or specifications. | `docs(prerequisites): interconnect documentation vault links` |
| **`perf`** | Performance | Optimizing execution speed, memory footprint, or buffer polling latency. | `perf(daemon): batch per-CPU perf ring buffer reads` |
| **`refactor`** | Refactoring | Code modification that neither fixes a bug nor adds a feature. | `refactor(common): reorganize event struct field layout` |
| **`test`** | Tests | Adding, modifying, or refactoring unit, integration, or benchmark tests. | `test(common): add struct size and alignment regression tests` |
| **`build`** | Build system | Changes to Cargo manifests, toolchain settings, `bpf-linker`, or build scripts. | `build(workspace): add bpfel-unknown-none target configurations` |
| **`ci`** | CI/CD | Changes to continuous integration workflows, actions, or validation scripts. | `ci(github): add clippy and format check workflow gates` |
| **`style`** | Code style | Formatting, whitespace, or comment adjustments with no logic changes. | `style(daemon): format imports according to rustfmt standards` |
| **`chore`** | Maintenance | Repository hygiene, `.gitignore` updates, or administrative tasks. | `chore(repo): update gitignore to exclude test socket files` |
| **`revert`** | Reversion | Reverting a previously committed changeset. | `revert: "feat(ebpf): attach tcp_connect kprobe"` |

---

## 3. Repository Scopes

Scopes contextualize where the changes take place within the GhostRing workspace:

| Scope | Target Component | Typical File Paths |
|---|---|---|
| **`common`** | Shared C-compatible data types & ABI | `ghostring-common/src/**` |
| **`ebpf`** | Kernel-space Ring 0 bytecode & probes | `ghostring-ebpf/src/**` |
| **`daemon`** | Asynchronous Tokio user-space daemon & CLI | `ghostring/src/**` |
| **`transport`** | Ring buffer & `PerfEventArray` mechanics | `ghostring-common/src/event.rs`, `ghostring/src/poller.rs` |
| **`docs`** | Documentation, guides, and specifications | `docs/**`, `README.md`, `CLAUDE.md`, `PROJECT.md` |
| **`build`** | Build scripts, Cargo manifests, toolchain | `Cargo.toml`, `*/build.rs`, `rust-toolchain.toml` |
| **`ci`** | GitHub Actions & CI automation | `.github/workflows/**` |
| **`security`** | License compliance, threat modeling, verifier rules | `LICENSE`, security audit configurations |

---

## 4. Writing Quality Commit Messages

### Core Rules

1. **Use the Imperative Mood**: Write the subject line as an instruction or command.
   - ✅ `feat(daemon): implement graceful SIGINT shutdown`
   - ❌ `feat(daemon): implemented graceful SIGINT shutdown`
   - ❌ `feat(daemon): implementing graceful SIGINT shutdown`
   - ❌ `feat(daemon): adds graceful SIGINT shutdown`

2. **Keep the Subject Line Concise (50/72 Rule)**:
   - Target **50 characters** or fewer for the subject line; never exceed **72 characters**.
   - Do not capitalize the first letter of the subject line after the colon.
   - Do not end the subject line with a period.

3. **Separate Subject from Body with a Blank Line**:
   - Provide an explanatory body whenever the change is non-trivial or introduces architectural decisions.

4. **Focus the Body on "Why" and "What", Not "How"**:
   - The diff demonstrates *how* the code changed. Explain the motivation, edge cases handled, and trade-offs made.

5. **Indicate Breaking Changes Clearly**:
   - Append an exclamation mark `!` after the type/scope, or include a `BREAKING CHANGE:` footer.
   - Example:
     ```text
     feat(common)!: change ExecveEvent timestamp to u64 nanoseconds

     BREAKING CHANGE: Struct layout modified. Incompatible with ghostring-ebpf < 0.2.0.
     ```

6. **Keep Commits Atomic**:
   - Each commit should represent one logical, independently verifiable change.
   - Avoid combining unrelated refactoring, formatting fixes, and feature additions in a single commit.

---

## 5. Pre-Commit Validation Checklist

Before staging and committing your changes, ensure that all quality gates pass locally:

```bash
# 1. Check code formatting across all workspace crates
cargo fmt --check --workspace

# 2. Run compiler lints with zero warnings allowed
cargo clippy --workspace -- -D warnings

# 3. Execute all unit and struct regression tests
cargo test --workspace

# 4. Verify eBPF bytecode compilation (no_std target)
cd ghostring-ebpf && cargo build --release && cd ..

# 5. Check git status to ensure no untracked secrets or temp files
git status
```

### ⚠️ Critical Security Rules

- **Never Commit Secrets or Local Environment Files**:
  - The `.env/` folder and any `.env*` credential files must remain untracked.
  - Never stage API keys, SSH keys, or private certificates.
- **Maintain License Compliance (GPLv3)**:
  - Any new source file in `ghostring-ebpf/` must adhere to GPLv3 compliance so the Linux kernel verifier permits BPF helper calls.

---

## 6. Git Workflow: Branching, Staging & Pushing

### Branch Naming Conventions

Always develop on a dedicated feature or bugfix branch before submitting a pull request to `main`:

| Branch Pattern | Purpose | Example |
|---|---|---|
| `feat/<name>` | New feature development | `feat/openat-probe` |
| `fix/<name>` | Bug fix or issue resolution | `fix/perf-buffer-drop` |
| `docs/<name>` | Documentation updates | `docs/update-architecture` |
| `refactor/<name>` | Code restructuring | `refactor/event-pipeline` |
| `perf/<name>` | Performance improvements | `perf/ring-batch-poll` |

### Step-by-Step Workflow

#### Step 1: Create and Switch to a Working Branch
```bash
git checkout -b feat/openat-probe
```

#### Step 2: Make Changes and Verify State
```bash
# Inspect changed files
git status

# Review file diffs line-by-line
git diff
```

#### Step 3: Stage Specific Files
Stage only files relevant to the atomic change (avoid blind `git add .`):
```bash
git add ghostring-ebpf/src/openat.rs ghostring-common/src/events.rs
```

#### Step 4: Commit with a Conventional Message
```bash
git commit -m "feat(ebpf): intercept sys_enter_openat tracepoint

Attach probe to the sys_enter_openat tracepoint to monitor sensitive file
access events. Serializes PID, UID, and flags into FileEvent struct for
user-space ingestion.

Refs #42"
```

#### Step 5: Push Branch to Remote
```bash
git push -u origin feat/openat-probe
```

#### Step 6: Create Pull Request
Open a pull request from `feat/openat-probe` into `main` detailing:
- Motivation and summary of changes
- Affected crates (`ghostring-common`, `ghostring-ebpf`, `ghostring`)
- Verification steps and testing output

---

## 7. Amending and History Hygiene

### Modifying the Most Recent Unpushed Commit
If you need to adjust code or fix a typo in the last commit message before pushing:
```bash
# Amend with staged changes without changing message
git add <forgotten-file>
git commit --amend --no-edit

# Amend message
git commit --amend -m "fix(daemon): correct signal handling on shutdown"
```

> [!CAUTION]
> **Never force-push (`git push --force`) to shared branches (e.g., `main`).** Force-pushing rewrites history and disrupts collaborators. Force-push with `--force-with-lease` only on your personal feature branch if rebase squashing was requested during review.

---

## 8. Commit Message Examples

### ✅ Good Examples

```text
feat(daemon): add asynchronous JSON event output flag

Introduce the `--json` command-line argument to format captured events
as structured JSON strings. Enables streamlined integration with SIEM
collectors such as Vector, Splunk, and Elasticsearch.

Closes #18
```

```text
fix(ebpf): guard against potential out-of-bounds register read

Ensure string reading helper bounds are statically verifiable by the
kernel verifier. Caps string buffer copy length at 64 bytes.

Fixes #31
```

```text
docs(prerequisites): standardize markdown links across documentation

Replace Obsidian-specific wikilinks with standard relative markdown links
across all 19 prerequisite documents. Add comprehensive cross-reference
matrices and reading paths.
```

```text
perf(daemon): increase perf buffer batch size to 128 events

Reduces user-space context switches by pulling up to 128 queued events
per poll iteration, lowering daemon CPU consumption by approximately 14%
under high syscall throughput.
```

### ❌ Anti-Patterns to Avoid

| Bad Commit Message | Reason for Rejection |
|---|---|
| `fixed stuff` | Vague; lacks type, scope, and technical context. |
| `WIP` | Work-in-progress commits must not be pushed to remote branches. |
| `feat(daemon): Added new flags.` | Uses past tense ("Added") and ends with trailing period. |
| `Update README.md` | Non-conventional format; missing type and scope. |
| `fix: bug` | Does not explain what bug was resolved or in which crate. |
| `feat: added openat, updated common, fixed typo in daemon, updated readme` | Non-atomic commit combining multiple unrelated tasks across three crates. |
