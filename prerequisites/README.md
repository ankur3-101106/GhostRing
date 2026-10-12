# GhostRing Knowledge Base

This directory contains a comprehensive deep knowledge base for the GhostRing repository, structured like an [Obsidian](https://obsidian.md/) vault with interlinked markdown files. Each file is cross-referenced with `[[filename]]` links for easy navigation.

## Quick Navigation

- [[ebpf-fundamentals.md]] - eBPF core concepts, helpers, maps, licensing
- [[kernel-instrumentation.md]] - Ring 0 instrumentation, probe types, BTF/CO-RE
- [[event-transport.md]] - Telemetry pipeline, PerfEventArray, ring buffers
- [[architecture-overview.md]] - 3-crate workspace, responsibilities, pipeline diagram
- [[development-environment.md]] - Prerequisites checklist, build workflow, troubleshooting
- [[security-requirements.md]] - GPLv3 compliance, kernel vs user-space security
- [[ebpf-internals.md]] - Instruction set, register usage, verifier, ELF layout
- [[aya-framework.md]] - Aya crates, ELF loading, map abstractions, helper bindings
- [[ghostring-common-structs.md]] - #[repr(C)] structs, C-compatible types, FFI bridge
- [[ghostring-user-daemon.md]] - Tokio async architecture, ring polling, CLI, logging
- [[btf-co-re-deep-dive.md]] - BTF format, CO-RE mechanics, type resolution
- [[build-system-workspace.md]] - Cargo workspace, build pipeline, CI/CD, Docker
- [[license-compliance-deep.md]] - GPLv3 and kernel verifier, helper categorization
- [[roadmap-features-deep.md]] - 3 features: path extraction, network obs, FIM
- [[security-model-deep-dive.md]] - Threat model, defense-in-depth, attack analysis
- [[testing-strategy.md]] - 4-layer testing pyramid, CI/CD gates, benchmarking
- [[troubleshooting-guide.md]] - 19 common build/runtime issues with fixes

## Detailed Index

### Foundational Knowledge
- [[ebpf-fundamentals.md]] - eBPF fundamentals for GhostRing
- [[kernel-instrumentation.md]] - Kernel space instrumentation details
- [[event-transport.md]] - Event transport and PerfEventArray internals
- [[architecture-overview.md]] - Overall workspace architecture
- [[development-environment.md]] - Development environment setup
- [[security-requirements.md]] - Security requirements and concerns

### Deep Technical Knowledge
- [[ebpf-internals.md]] - eBPF bytecode internals and verification
- [[aya-framework.md]] - Aya framework deep dive
- [[ghostring-common-structs.md]] - ghostring-common struct design
- [[ghostring-user-daemon.md]] - User-space daemon architecture
- [[btf-co-re-deep-dive.md]] - BTF and CO-RE detailed analysis
- [[build-system-workspace.md]] - Build system and workspace configuration
- [[license-compliance-deep.md]] - License compliance deep dive
- [[roadmap-features-deep.md]] - Roadmap features with implementation details
- [[security-model-deep-dive.md]] - Security model analysis
- [[testing-strategy.md]] - Testing strategy and CI/CD

### Operational Knowledge
- [[testing-strategy.md]] - Testing strategy
- [[troubleshooting-guide.md]] - Troubleshooting guide

## Cross-Reference Map

### Foundational ←→ Deep Technical
- [[ebpf-fundamentals.md]] ←→ [[ebpf-internals.md]]: eBPF concepts → bytecode internals
- [[kernel-instrumentation.md]] ←→ [[btf-co-re-deep-dive.md]]: Instrumentation → BTF/CO-RE
- [[event-transport.md]] ←→ [[perf-buffer-internals.md]] (if present): Pipeline → buffer details
- [[architecture-overview.md]] ←→ [[aya-framework.md]] ←→ [[ghostring-common-structs.md]]: Architecture → framework → structs

### Deep Technical ←→ License/Compliance
- [[aya-framework.md]] ←→ [[license-compliance-deep.md]]: Aya helpers → GPLv3 requirements
- [[ghostring-common-structs.md]] ←→ [[license-compliance-deep.md]]: Struct design → license implications
- [[build-system-workspace.md]] ←→ [[license-compliance-deep.md]]: Build → license enforcement

### Roadmap ←→ Technical Knowledge
- [[roadmap-features-deep.md]] ←→ [[ebpf-internals.md]]: Features → eBPF internals
- [[roadmap-features-deep.md]] ←→ [[ghostring-common-structs.md]]: Feature struct changes → struct design
- [[roadmap-features-deep.md]] ←→ [[aya-framework.md]]: Feature implementation → Aya usage
- [[roadmap-features-deep.md]] ←→ [[build-system-workspace.md]]: Feature builds → CI/CD

### Security ←→ License/Compliance
- [[security-model-deep-dive.md]] ←→ [[license-compliance-deep.md]]: Threat model → license requirements
- [[security-requirements.md]] ←→ [[license-compliance-deep.md]]: Security requirements → compliance details

### Testing ←→ All Knowledge Areas
- [[testing-strategy.md]] ←→ [[build-system-workspace.md]]: Testing → build pipeline
- [[testing-strategy.md]] ←→ [[roadmap-features-deep.md]]: Testing → roadmap features
- [[testing-strategy.md]] ←→ [[troubleshooting-guide.md]]: Testing → issue resolution

## How to Use This Knowledge Base

1. **Start here** if new to GhostRing: [[development-environment.md]] → [[architecture-overview.md]] → [[ebpf-fundamentals.md]]
2. **For specific topics**: Use the quick navigation above or search with `[[filename]]`
3. **For roadmap implementation**: Start with [[roadmap-features-deep.md]], then follow links to relevant technical files
4. **For troubleshooting**: Use [[troubleshooting-guide.md]] with cross-references to build/runtime files
5. **For license questions**: Refer to [[license-compliance-deep.md]] and [[security-requirements.md]]

## Link Syntax

This vault uses standard Obsidian wikilink syntax:
- `[[filename.md]]` - creates a link to the file (relative to the prerequisites/ directory)
- Links work best when viewing in Obsidian, VS Code with markdown preview, or any markdown reader that supports wikilinks
- The link text displays as the filename, making navigation intuitive

## File Relationship Summary

| Category | Key File | Links Out | Links In |
|---|---|---|---|
| **Foundational** | `architecture-overview.md` | 6+ | 1+ |
| **Deep Technical** | `aya-framework.md` | 8+ | 3+ |
| **Structs** | `ghostring-common-structs.md` | 5+ | 3+ |
| **Roadmap** | `roadmap-features-deep.md` | 10+ | 5+ |
| **License** | `license-compliance-deep.md` | 5+ | 3+ |
| **Security** | `security-model-deep-dive.md` | 4+ | 2+ |
| **Testing** | `testing-strategy.md` | 5+ | 3+ |
| **Troubleshooting** | `troubleshooting-guide.md` | 0+ | 5+ |

*Numbers represent approximate link count in each direction.*

---
*This README serves as the vault index for the GhostRing knowledge base. All files use `[[wikilink]]` syntax for cross-referencing. For best experience, view in Obsidian or a markdown reader that supports wikilinks.*