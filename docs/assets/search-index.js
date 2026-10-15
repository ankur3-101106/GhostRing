window.GHOSTRING_SEARCH_INDEX = [
  {
    "title": "GhostRing Technical Documentation & Architecture Reference",
    "url": "index.html",
    "category": "Overview",
    "headings": [
      {
        "title": "Documentation Index",
        "id": "documentation-index"
      },
      {
        "title": "1. Foundational Architecture &amp; Environment",
        "id": "1-foundational-architecture-environment"
      },
      {
        "title": "2. Kernel Space &amp; eBPF Engineering",
        "id": "2-kernel-space-ebpf-engineering"
      },
      {
        "title": "3. Telemetry &amp; User Space Pipeline",
        "id": "3-telemetry-user-space-pipeline"
      },
      {
        "title": "4. Security, Compliance &amp; Governance",
        "id": "4-security-compliance-governance"
      },
      {
        "title": "5. Quality Assurance, Operations &amp; Roadmap",
        "id": "5-quality-assurance-operations-roadmap"
      },
      {
        "title": "Cross-Reference Matrix",
        "id": "cross-reference-matrix"
      },
      {
        "title": "Recommended Reading Paths",
        "id": "recommended-reading-paths"
      },
      {
        "title": "1. New Contributor Onboarding",
        "id": "1-new-contributor-onboarding"
      },
      {
        "title": "2. Kernel &amp; eBPF Engineers",
        "id": "2-kernel-ebpf-engineers"
      },
      {
        "title": "3. Systems &amp; Daemon Developers",
        "id": "3-systems-daemon-developers"
      },
      {
        "title": "4. Security Architects &amp; Auditors",
        "id": "4-security-architects-auditors"
      }
    ],
    "excerpt": "GhostRing v0.1.0 \u2022 Technical Documentation Suite Ring 0 eBPF Telemetry Engine GhostRing is a modern, high-performance security observability subsystem written in pure Rust with Aya. Engineered with a strict 3-crate workspace architecture to deliver non-blocking, zero-trust system event auditing with kernel verifier safety. Get Started Setup Build Env View on GitHub 01 Architecture 3-crate segregat"
  },
  {
    "title": "GhostRing Architecture Overview",
    "url": "architecture-overview.html",
    "category": "Foundational Architecture & Environment",
    "headings": [
      {
        "title": "Workspace Structure",
        "id": "workspace-structure"
      },
      {
        "title": "Crate Responsibilities",
        "id": "crate-responsibilities"
      },
      {
        "title": "ghostring-common (cdylib/staticlib)",
        "id": "ghostring-common-cdylibstaticlib"
      },
      {
        "title": "ghostring-ebpf (no_std, target: bpfel-unknown-none)",
        "id": "ghostring-ebpf-no_std-target-bpfel-unknown-none"
      },
      {
        "title": "ghostring (std, Tokio async)",
        "id": "ghostring-std-tokio-async"
      },
      {
        "title": "Telemetry Pipeline",
        "id": "telemetry-pipeline"
      },
      {
        "title": "1. Trigger",
        "id": "1-trigger"
      },
      {
        "title": "2. Execution (ghostring-ebpf)",
        "id": "2-execution-ghostring-ebpf"
      },
      {
        "title": "3. Transmission (PerfEventArray)",
        "id": "3-transmission-perfeventarray"
      },
      {
        "title": "4. Ingestion (ghostring)",
        "id": "4-ingestion-ghostring"
      },
      {
        "title": "Key Technical Requirements",
        "id": "key-technical-requirements"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "GhostRing Architecture Overview # Workspace Structure # GhostRing is organized as a Rust workspace with three distinct crates partitioning safety, performance, and low-level kernel interaction: CODE Copied! Copy ghostring/ \u251c\u2500\u2500 Cargo.toml # Workspace manifest defining shared dependencies \u251c\u2500\u2500 ghostring-common/ # C-compatible structs shared across kernel boundary \u251c\u2500\u2500 ghostring-ebpf/ # no_std Rust ker"
  },
  {
    "title": "Development Environment & Isolated Build System",
    "url": "development-environment.html",
    "category": "Foundational Architecture & Environment",
    "headings": [
      {
        "title": "1. Environment Architecture &amp; Isolation Model",
        "id": "1-environment-architecture-isolation-model"
      },
      {
        "title": "Environment Isolation Invariants",
        "id": "environment-isolation-invariants"
      },
      {
        "title": "2. System Prerequisites Checklist",
        "id": "2-system-prerequisites-checklist"
      },
      {
        "title": "3. Quick-Start: Automated Setup",
        "id": "3-quick-start-automated-setup"
      },
      {
        "title": "What the Setup Script Performs",
        "id": "what-the-setup-script-performs"
      },
      {
        "title": "4. Manual Setup Procedure (Step-by-Step)",
        "id": "4-manual-setup-procedure-step-by-step"
      },
      {
        "title": "Step 1: Initialize Directory Tree",
        "id": "step-1-initialize-directory-tree"
      },
      {
        "title": "Step 2: Install Rust Nightly and rust-src",
        "id": "step-2-install-rust-nightly-and-rust-src"
      },
      {
        "title": "Step 3: Install bpf-linker",
        "id": "step-3-install-bpf-linker"
      },
      {
        "title": "5. Daily Development Workflows",
        "id": "5-daily-development-workflows"
      },
      {
        "title": "Method A: Interactive Shell Activation (Recommended)",
        "id": "method-a-interactive-shell-activation-recommended"
      },
      {
        "title": "Method B: Non-Interactive Command Runner (run.sh)",
        "id": "method-b-non-interactive-command-runner-runsh"
      },
      {
        "title": "Method C: Running the Daemon with Privileges",
        "id": "method-c-running-the-daemon-with-privileges"
      },
      {
        "title": "6. Verification &amp; Smoke Testing",
        "id": "6-verification-smoke-testing"
      },
      {
        "title": "7. Environment Reset &amp; Maintenance",
        "id": "7-environment-reset-maintenance"
      },
      {
        "title": "8. Related Documentation",
        "id": "8-related-documentation"
      }
    ],
    "excerpt": "Development Environment &amp; Isolated Build System # This document provides complete instructions for establishing, configuring, and verifying the GhostRing development and compilation environment. GhostRing employs a fully isolated in-repository build environment ( .build-env/ ). This architecture guarantees that all specialized eBPF toolchains, compilers, linkers, and standard library source co"
  },
  {
    "title": "eBPF Fundamentals for GhostRing",
    "url": "ebpf-fundamentals.html",
    "category": "Foundational Architecture & Environment",
    "headings": [
      {
        "title": "What is eBPF?",
        "id": "what-is-ebpf"
      },
      {
        "title": "Core Concepts",
        "id": "core-concepts"
      },
      {
        "title": "BPF Programs",
        "id": "bpf-programs"
      },
      {
        "title": "BPF Maps",
        "id": "bpf-maps"
      },
      {
        "title": "Attachment Points",
        "id": "attachment-points"
      },
      {
        "title": "Licensing Requirement",
        "id": "licensing-requirement"
      },
      {
        "title": "Compilation",
        "id": "compilation"
      },
      {
        "title": "Key eBPF Helpers Used by Aya",
        "id": "key-ebpf-helpers-used-by-aya"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "eBPF Fundamentals for GhostRing # What is eBPF? # Extended Berkeley Packet Filter (eBPF) is a Linux kernel technology that allows sandboxed programs to run in the kernel context without changing kernel source code or loading external modules. eBPF programs are verified by the kernel verifier before execution and can instrument any part of the system. Core Concepts # BPF Programs # Attached to kern"
  },
  {
    "title": "Kernel Space Instrumentation for GhostRing",
    "url": "kernel-instrumentation.html",
    "category": "Foundational Architecture & Environment",
    "headings": [
      {
        "title": "Kernel Architecture Overview",
        "id": "kernel-architecture-overview"
      },
      {
        "title": "Probe Types",
        "id": "probe-types"
      },
      {
        "title": "Tracepoints",
        "id": "tracepoints"
      },
      {
        "title": "kprobes (Kernel Probes)",
        "id": "kprobes-kernel-probes"
      },
      {
        "title": "kretprobes",
        "id": "kretprobes"
      },
      {
        "title": "Context Available in eBPF Programs",
        "id": "context-available-in-ebpf-programs"
      },
      {
        "title": "Data Extraction",
        "id": "data-extraction"
      },
      {
        "title": "BTF (BPF Type Format)",
        "id": "btf-bpf-type-format"
      },
      {
        "title": "Kernel Verifier",
        "id": "kernel-verifier"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "Kernel Space Instrumentation for GhostRing # Kernel Architecture Overview # GhostRing operates at Ring 0 (kernel mode) via eBPF, intercepting system calls directly in the kernel execution path. This provides security monitoring that is invisible to user-space tampering. Probe Types # Tracepoints # Static kernel instrumentation points Highest performance - no dynamic overhead of kprobe registration"
  },
  {
    "title": "eBPF Internals and Bytecode Analysis for GhostRing",
    "url": "ebpf-internals.html",
    "category": "Kernel Space & eBPF Engineering",
    "headings": [
      {
        "title": "eBPF Instruction Set Architecture",
        "id": "ebpf-instruction-set-architecture"
      },
      {
        "title": "32-RISC Like Instructions",
        "id": "32-risc-like-instructions"
      },
      {
        "title": "Opcode Categories",
        "id": "opcode-categories"
      },
      {
        "title": "Register Usage",
        "id": "register-usage"
      },
      {
        "title": "BPF Context Structure",
        "id": "bpf-context-structure"
      },
      {
        "title": "For Tracepoints (sys_enter_execve context)",
        "id": "for-tracepoints-sys_enter_execve-context"
      },
      {
        "title": "Memory Layout",
        "id": "memory-layout"
      },
      {
        "title": "Verifier Internals",
        "id": "verifier-internals"
      },
      {
        "title": "Verification Phases",
        "id": "verification-phases"
      },
      {
        "title": "Key Verifier Constraints",
        "id": "key-verifier-constraints"
      },
      {
        "title": "CO-RE and BTF Requirements",
        "id": "co-re-and-btf-requirements"
      },
      {
        "title": "GhostRing eBPF Program Structure",
        "id": "ghostring-ebpf-program-structure"
      },
      {
        "title": "Entry Points",
        "id": "entry-points"
      },
      {
        "title": "Program Flow",
        "id": "program-flow"
      },
      {
        "title": "Helper Functions Used",
        "id": "helper-functions-used"
      },
      {
        "title": "ELF Layout for BPF Target",
        "id": "elf-layout-for-bpf-target"
      },
      {
        "title": "Sections Managed by bpf-linker",
        "id": "sections-managed-by-bpf-linker"
      },
      {
        "title": "License Section",
        "id": "license-section"
      },
      {
        "title": "Map Types and Operations",
        "id": "map-types-and-operations"
      },
      {
        "title": "PerfEventArray Map",
        "id": "perfeventarray-map"
      },
      {
        "title": "Map Operations in eBPF",
        "id": "map-operations-in-ebpf"
      },
      {
        "title": "Advanced: JIT and JIT Binary Format",
        "id": "advanced-jit-and-jit-binary-format"
      },
      {
        "title": "Native JIT Compilation",
        "id": "native-jit-compilation"
      },
      {
        "title": "JIT Binary Format",
        "id": "jit-binary-format"
      },
      {
        "title": "Debugging eBPF Programs",
        "id": "debugging-ebpf-programs"
      },
      {
        "title": "Printk Debugging",
        "id": "printk-debugging"
      },
      {
        "title": "Limits",
        "id": "limits"
      },
      {
        "title": "Userspace Verification",
        "id": "userspace-verification"
      },
      {
        "title": "Static Analysis Tools",
        "id": "static-analysis-tools"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "eBPF Internals and Bytecode Analysis for GhostRing # eBPF Instruction Set Architecture # 32-RISC Like Instructions # eBPF programs use a compact, RISC-like instruction set optimized for kernel execution. Each instruction is 32 bits: CODE Copied! Copy | 31 | 30-28 | 27-24 | 23-20 | 19-16 | 15-12 | 11-8 | 7-4 | 3-0 | |----|-------|-------|-------|-------|-------|------|-----|-----| | op | src_reg| d"
  },
  {
    "title": "Aya Framework Deep Dive for GhostRing",
    "url": "aya-framework.html",
    "category": "Kernel Space & eBPF Engineering",
    "headings": [
      {
        "title": "Aya Crate Architecture",
        "id": "aya-crate-architecture"
      },
      {
        "title": "Core Crates in Aya Ecosystem",
        "id": "core-crates-in-aya-ecosystem"
      },
      {
        "title": "ELF Loading and Linking",
        "id": "elf-loading-and-linking"
      },
      {
        "title": "bpf-linker Integration",
        "id": "bpf-linker-integration"
      },
      {
        "title": "Cargo Configuration",
        "id": "cargo-configuration"
      },
      {
        "title": "Build Pipeline",
        "id": "build-pipeline"
      },
      {
        "title": "Map Abstractions",
        "id": "map-abstractions"
      },
      {
        "title": "PerfEventArray Map Wrapper",
        "id": "perfeventarray-map-wrapper"
      },
      {
        "title": "Hash Map Type (For Future Roadmap)",
        "id": "hash-map-type-for-future-roadmap"
      },
      {
        "title": "BPF Helper Bindings",
        "id": "bpf-helper-bindings"
      },
      {
        "title": "Aya-Wrapped Helpers",
        "id": "aya-wrapped-helpers"
      },
      {
        "title": "Common Helpers Used by GhostRing",
        "id": "common-helpers-used-by-ghostring"
      },
      {
        "title": "Helper Licensing Table",
        "id": "helper-licensing-table"
      },
      {
        "title": "Async Polling Model",
        "id": "async-polling-model"
      },
      {
        "title": "Aya-Poll Integration",
        "id": "aya-poll-integration"
      },
      {
        "title": "Polling Interval Configuration",
        "id": "polling-interval-configuration"
      },
      {
        "title": "Backpressure Handling",
        "id": "backpressure-handling"
      },
      {
        "title": "Error Handling and Recovery",
        "id": "error-handling-and-recovery"
      },
      {
        "title": "Common Error Types",
        "id": "common-error-types"
      },
      {
        "title": "Recovery Strategies",
        "id": "recovery-strategies"
      },
      {
        "title": "Debugging and Introspection",
        "id": "debugging-and-introspection"
      },
      {
        "title": "Aya Debug Features",
        "id": "aya-debug-features"
      },
      {
        "title": "Kernel Logging",
        "id": "kernel-logging"
      },
      {
        "title": "Aya Inspect (Metrics Export)",
        "id": "aya-inspect-metrics-export"
      },
      {
        "title": "Version Compatibility",
        "id": "version-compatibility"
      },
      {
        "title": "Aya Version Matrix",
        "id": "aya-version-matrix"
      },
      {
        "title": "Minimum Supported Versions",
        "id": "minimum-supported-versions"
      },
      {
        "title": "Upgrade Path",
        "id": "upgrade-path"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "Aya Framework Deep Dive for GhostRing # Aya Crate Architecture # Aya is a pure-Rust eBPF framework that provides the bridge between Rust eBPF bytecode and the Linux kernel. GhostRing uses Aya for program loading, map management, and BPF helper access. Core Crates in Aya Ecosystem # Crate Purpose GhostRing Usage aya Core framework, ELF loading, map support Primary dependency aya-ebpf BPF helper bin"
  },
  {
    "title": "BTF and CO-RE Deep Dive for GhostRing",
    "url": "btf-co-re-deep-dive.html",
    "category": "Kernel Space & eBPF Engineering",
    "headings": [
      {
        "title": "BTF (BPF Type Format) Fundamentals",
        "id": "btf-bpf-type-format-fundamentals"
      },
      {
        "title": "What is BTF?",
        "id": "what-is-btf"
      },
      {
        "title": "BTF Embedding in ELF",
        "id": "btf-embedding-in-elf"
      },
      {
        "title": "BTF Structure",
        "id": "btf-structure"
      },
      {
        "title": "BTF Kernel Requirements",
        "id": "btf-kernel-requirements"
      },
      {
        "title": "Verifying BTF Availability",
        "id": "verifying-btf-availability"
      },
      {
        "title": "BTF and CO-RE in Practice",
        "id": "btf-and-co-re-in-practice"
      },
      {
        "title": "Aya's BTF Support",
        "id": "ayas-btf-support"
      },
      {
        "title": "CO-RE (Compile Once, Run Everywhere) Mechanics",
        "id": "co-re-compile-once-run-everywhere-mechanics"
      },
      {
        "title": "CO-RE Philosophy",
        "id": "co-re-philosophy"
      },
      {
        "title": "How CO-RE Works",
        "id": "how-co-re-works"
      },
      {
        "title": "CO-RE Enabled Features in GhostRing",
        "id": "co-re-enabled-features-in-ghostring"
      },
      {
        "title": "CO-RE Requirements by Feature",
        "id": "co-re-requirements-by-feature"
      },
      {
        "title": "CO-RE Compatible eBPF Program Skeleton",
        "id": "co-re-compatible-ebpf-program-skeleton"
      },
      {
        "title": "BTF Version Compatibility Matrix",
        "id": "btf-version-compatibility-matrix"
      },
      {
        "title": "CO-RE Failure Modes",
        "id": "co-re-failure-modes"
      },
      {
        "title": "Debugging BTF/CO-RE Issues",
        "id": "debugging-btfco-re-issues"
      },
      {
        "title": "Aya BTF API Reference",
        "id": "aya-btf-api-reference"
      },
      {
        "title": "Performance Impact of BTF",
        "id": "performance-impact-of-btf"
      },
      {
        "title": "Future: BTF Advanced Features",
        "id": "future-btf-advanced-features"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "BTF and CO-RE Deep Dive for GhostRing # BTF (BPF Type Format) Fundamentals # What is BTF? # BPF Type Format (BTF) is debug metadata embedded in ELF binaries that provides type information at runtime. For eBPF, BTF enables: CO-RE (Compile Once, Run Everywhere) : eBPF programs don't need hardcoded kernel struct offsets Type-safe field access : By name at runtime via BTF, not by offset at compile tim"
  },
  {
    "title": "ghostring-common: C-Compatible Structs Deep Dive",
    "url": "ghostring-common-structs.html",
    "category": "Kernel Space & eBPF Engineering",
    "headings": [
      {
        "title": "Purpose and Design Principles",
        "id": "purpose-and-design-principles"
      },
      {
        "title": "Structural Guidelines",
        "id": "structural-guidelines"
      },
      {
        "title": "Mandatory Attributes",
        "id": "mandatory-attributes"
      },
      {
        "title": "C-Compatible Type Mapping",
        "id": "c-compatible-type-mapping"
      },
      {
        "title": "Alignment and Padding Rules",
        "id": "alignment-and-padding-rules"
      },
      {
        "title": "Trait Usage Restrictions",
        "id": "trait-usage-restrictions"
      },
      {
        "title": "Event Struct Layout",
        "id": "event-struct-layout"
      },
      {
        "title": "Execve Event (Core Monitoring Event)",
        "id": "execve-event-core-monitoring-event"
      },
      {
        "title": "Alternative: Split Struct for CO-RE",
        "id": "alternative-split-struct-for-co-re"
      },
      {
        "title": "Uid/Gid Event (Alternative Event Type)",
        "id": "uidgid-event-alternative-event-type"
      },
      {
        "title": "Syscall Entry/Exit Pair",
        "id": "syscall-entryexit-pair"
      },
      {
        "title": "Constant Definitions",
        "id": "constant-definitions"
      },
      {
        "title": "Event Type Enums",
        "id": "event-type-enums"
      },
      {
        "title": "Flag Bits",
        "id": "flag-bits"
      },
      {
        "title": "Maximum String Lengths",
        "id": "maximum-string-lengths"
      },
      {
        "title": "Alignment Verification",
        "id": "alignment-verification"
      },
      {
        "title": "FFI Bridge Design",
        "id": "ffi-bridge-design"
      },
      {
        "title": "Kernel-Side (ghostring-ebpf)",
        "id": "kernel-side-ghostring-ebpf"
      },
      {
        "title": "User-Side (ghostring)",
        "id": "user-side-ghostring"
      },
      {
        "title": "Build and Version Management",
        "id": "build-and-version-management"
      },
      {
        "title": "Cargo.toml Configuration",
        "id": "cargotoml-configuration"
      },
      {
        "title": "Semantic Versioning Policy",
        "id": "semantic-versioning-policy"
      },
      {
        "title": "ABI Stability Guarantees",
        "id": "abi-stability-guarantees"
      },
      {
        "title": "Change Detection",
        "id": "change-detection"
      },
      {
        "title": "Roadmap: Struct Extensions",
        "id": "roadmap-struct-extensions"
      },
      {
        "title": "Planned Additions (TODO)",
        "id": "planned-additions-todo"
      },
      {
        "title": "Testing Struct Layout",
        "id": "testing-struct-layout"
      },
      {
        "title": "Compile-Time Checks",
        "id": "compile-time-checks"
      },
      {
        "title": "Cross-Platform Verification",
        "id": "cross-platform-verification"
      },
      {
        "title": "ABI Compliance Test Suite",
        "id": "abi-compliance-test-suite"
      },
      {
        "title": "A Note on #[repr(C)] Pitfalls",
        "id": "a-note-on-reprc-pitfalls"
      },
      {
        "title": "Common Mistakes",
        "id": "common-mistakes"
      },
      {
        "title": "Validation Heuristic",
        "id": "validation-heuristic"
      },
      {
        "title": "Deprecation and Removal Policy",
        "id": "deprecation-and-removal-policy"
      },
      {
        "title": "Deprecating Fields",
        "id": "deprecating-fields"
      },
      {
        "title": "Removing Fields (Major Version Only)",
        "id": "removing-fields-major-version-only"
      },
      {
        "title": "Never Remove Without:",
        "id": "never-remove-without"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "ghostring-common: C-Compatible Structs Deep Dive # Purpose and Design Principles # ghostring-common is a cdylib crate providing the binary communication format between kernel space and user space. All structs are #[repr(C)] to ensure: No padding surprises across compiler versions ABI compatibility with C translation units Safe FFI boundaries between no_std kernel code and std user code Zero-cost m"
  },
  {
    "title": "Event Transport for GhostRing",
    "url": "event-transport.html",
    "category": "Telemetry & User Space Pipeline",
    "headings": [
      {
        "title": "Telemetry Pipeline Overview",
        "id": "telemetry-pipeline-overview"
      },
      {
        "title": "Pipeline Stages",
        "id": "pipeline-stages"
      },
      {
        "title": "PerfEventArray Ring Buffer Map",
        "id": "perfeventarray-ring-buffer-map"
      },
      {
        "title": "Kernel-Side Transmission",
        "id": "kernel-side-transmission"
      },
      {
        "title": "User-Side Ingestion",
        "id": "user-side-ingestion"
      },
      {
        "title": "#[repr(C)] Communication Structs",
        "id": "reprc-communication-structs"
      },
      {
        "title": "Per-CPU Buffer Polling",
        "id": "per-cpu-buffer-polling"
      },
      {
        "title": "Buffer Management",
        "id": "buffer-management"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "Event Transport for GhostRing # Telemetry Pipeline Overview # The GhostRing telemetry pipeline transports eBPF-collected events from kernel space to user space for ingestion, logging, and alert routing. Pipeline Stages # Trigger : Process initiates syscall (e.g., sys_enter_execve ) Execution ( ghostring-ebpf ): eBPF bytecode executes in kernel, extracts pid , uid , command metadata Transmission : "
  },
  {
    "title": "PerfEventArray Ring Buffer Internals for GhostRing",
    "url": "perf-buffer-internals.html",
    "category": "Telemetry & User Space Pipeline",
    "headings": [
      {
        "title": "Linux Perf Ring Buffer Architecture",
        "id": "linux-perf-ring-buffer-architecture"
      },
      {
        "title": "Overview",
        "id": "overview"
      },
      {
        "title": "Ring Buffer Design",
        "id": "ring-buffer-design"
      },
      {
        "title": "Key Data Structures",
        "id": "key-data-structures"
      },
      {
        "title": "Per-CPU Organization",
        "id": "per-cpu-organization"
      },
      {
        "title": "Data Layout in Ring Buffer",
        "id": "data-layout-in-ring-buffer"
      },
      {
        "title": "mmap Layout",
        "id": "mmap-layout"
      },
      {
        "title": "Perf Buffer Header (96 bytes)",
        "id": "perf-buffer-header-96-bytes"
      },
      {
        "title": "Consumer Polling Algorithm",
        "id": "consumer-polling-algorithm"
      },
      {
        "title": "Event Format in Detail",
        "id": "event-format-in-detail"
      },
      {
        "title": "Synchronization Mechanisms",
        "id": "synchronization-mechanisms"
      },
      {
        "title": "Buffer Full and Data Loss",
        "id": "buffer-full-and-data-loss"
      },
      {
        "title": "Advanced: Fd and File Descriptor Management",
        "id": "advanced-fd-and-file-descriptor-management"
      },
      {
        "title": "Perf Event Output Flags",
        "id": "perf-event-output-flags"
      },
      {
        "title": "Perf Buffer Performance Characteristics",
        "id": "perf-buffer-performance-characteristics"
      },
      {
        "title": "Troubleshooting Perf Buffer Issues",
        "id": "troubleshooting-perf-buffer-issues"
      },
      {
        "title": "Integration with aya-poll",
        "id": "integration-with-aya-poll"
      },
      {
        "title": "Memory Layout Summary",
        "id": "memory-layout-summary"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "PerfEventArray Ring Buffer Internals for GhostRing # Linux Perf Ring Buffer Architecture # Overview # The PerfEventArray map type in eBPF uses Linux perf's ring buffer infrastructure for efficient data transfer from kernel space to user space. This is the backbone of GhostRing's telemetry pipeline. Ring Buffer Design # CODE Copied! Copy \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
  },
  {
    "title": "ghostring User-Space Daemon Deep Dive",
    "url": "ghostring-user-daemon.html",
    "category": "Telemetry & User Space Pipeline",
    "headings": [
      {
        "title": "Tokio Async Architecture",
        "id": "tokio-async-architecture"
      },
      {
        "title": "Runtime Configuration",
        "id": "runtime-configuration"
      },
      {
        "title": "Multi-Threaded Runtime Setup",
        "id": "multi-threaded-runtime-setup"
      },
      {
        "title": "Runtime Lifecycle",
        "id": "runtime-lifecycle"
      },
      {
        "title": "Ring Buffer Polling Implementation",
        "id": "ring-buffer-polling-implementation"
      },
      {
        "title": "Per-CPU Iteration Strategy",
        "id": "per-cpu-iteration-strategy"
      },
      {
        "title": "Polling Granularity",
        "id": "polling-granularity"
      },
      {
        "title": "Batch Processing",
        "id": "batch-processing"
      },
      {
        "title": "Backpressure and Buffer Full",
        "id": "backpressure-and-buffer-full"
      },
      {
        "title": "Event Processing Pipeline",
        "id": "event-processing-pipeline"
      },
      {
        "title": "From Raw Bytes to Structured Data",
        "id": "from-raw-bytes-to-structured-data"
      },
      {
        "title": "Event Handler Dispatch",
        "id": "event-handler-dispatch"
      },
      {
        "title": "Handler Implementations",
        "id": "handler-implementations"
      },
      {
        "title": "CLI Integration",
        "id": "cli-integration"
      },
      {
        "title": "Argument Parsing with clap",
        "id": "argument-parsing-with-clap"
      },
      {
        "title": "Common CLI Flags",
        "id": "common-cli-flags"
      },
      {
        "title": "Output Format Options",
        "id": "output-format-options"
      },
      {
        "title": "Example CLI Usage",
        "id": "example-cli-usage"
      },
      {
        "title": "Logging Architecture",
        "id": "logging-architecture"
      },
      {
        "title": "Log Levels and Targets",
        "id": "log-levels-and-targets"
      },
      {
        "title": "Log Output Format",
        "id": "log-output-format"
      },
      {
        "title": "Tracing Integration",
        "id": "tracing-integration"
      },
      {
        "title": "Shutdown and Graceful Stop",
        "id": "shutdown-and-graceful-stop"
      },
      {
        "title": "Signal Handling",
        "id": "signal-handling"
      },
      {
        "title": "Cleanup Requirements",
        "id": "cleanup-requirements"
      },
      {
        "title": "Watchdog Timer",
        "id": "watchdog-timer"
      },
      {
        "title": "Performance Optimizations",
        "id": "performance-optimizations"
      },
      {
        "title": "Polling Interval Tuning",
        "id": "polling-interval-tuning"
      },
      {
        "title": "Batch Size Impact",
        "id": "batch-size-impact"
      },
      {
        "title": "CPU Affinity",
        "id": "cpu-affinity"
      },
      {
        "title": "Zero-Copy Principle",
        "id": "zero-copy-principle"
      },
      {
        "title": "Monitoring and Metrics",
        "id": "monitoring-and-metrics"
      },
      {
        "title": "Internal Metrics Exposure",
        "id": "internal-metrics-exposure"
      },
      {
        "title": "Prometheus Integration (Roadmap)",
        "id": "prometheus-integration-roadmap"
      },
      {
        "title": "Debugging the User-Space Daemon",
        "id": "debugging-the-user-space-daemon"
      },
      {
        "title": "Common Issues and Diagnostics",
        "id": "common-issues-and-diagnostics"
      },
      {
        "title": "Tracing Enablement",
        "id": "tracing-enablement"
      },
      {
        "title": "Backtrace on Panics",
        "id": "backtrace-on-panics"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "ghostring User-Space Daemon Deep Dive # Tokio Async Architecture # The ghostring user-space daemon is built on Tokio , the asynchronous runtime for Rust. This section covers the deep architectural patterns used. Runtime Configuration # TOML Copied! Copy # ghostring/Cargo.toml [dependencies] tokio = { version = &quot;1.38&quot; , features = [ &quot;full&quot; , // Complete Tokio stack &quot;rt-mult"
  },
  {
    "title": "Security Requirements and Concerns for GhostRing",
    "url": "security-requirements.html",
    "category": "Security, Compliance & Governance",
    "headings": [
      {
        "title": "Licensing and Kernel Compliance",
        "id": "licensing-and-kernel-compliance"
      },
      {
        "title": "GPLv3 Requirement",
        "id": "gplv3-requirement"
      },
      {
        "title": "Critical Compliance Note",
        "id": "critical-compliance-note"
      },
      {
        "title": "Security Architecture Benefits",
        "id": "security-architecture-benefits"
      },
      {
        "title": "Why Kernel-Space Monitoring?",
        "id": "why-kernel-space-monitoring"
      },
      {
        "title": "GhostRing's Approach",
        "id": "ghostrings-approach"
      },
      {
        "title": "Safety Requirements",
        "id": "safety-requirements"
      },
      {
        "title": "no_std Enforcement",
        "id": "no_std-enforcement"
      },
      {
        "title": "Verifier Guarantees",
        "id": "verifier-guarantees"
      },
      {
        "title": "Development Security",
        "id": "development-security"
      },
      {
        "title": "Kernel Headers",
        "id": "kernel-headers"
      },
      {
        "title": "Build Environment",
        "id": "build-environment"
      },
      {
        "title": "Safety Checks",
        "id": "safety-checks"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "Security Requirements and Concerns for GhostRing # Licensing and Kernel Compliance # GPLv3 Requirement # The Linux kernel eBPF verifier enforces licensing checks Non-GPL eBPF programs are restricted from using advanced BPF helpers GhostRing is licensed under GPLv3 to ensure 100% binary compatibility Without GPLv3, access to deep memory-reading and tracing helpers is limited Critical Compliance Not"
  },
  {
    "title": "GhostRing Security Model Deep Dive",
    "url": "security-model-deep-dive.html",
    "category": "Security, Compliance & Governance",
    "headings": [
      {
        "title": "Threat Model and Attack Surface",
        "id": "threat-model-and-attack-surface"
      },
      {
        "title": "Core Threat Assumptions",
        "id": "core-threat-assumptions"
      },
      {
        "title": "How GhostRing Hardens the Model",
        "id": "how-ghostring-hardens-the-model"
      },
      {
        "title": "Defense-in-Depth Architecture",
        "id": "defense-in-depth-architecture"
      },
      {
        "title": "Security Requirements Checklist",
        "id": "security-requirements-checklist"
      },
      {
        "title": "Security-Focused Development Practices",
        "id": "security-focused-development-practices"
      },
      {
        "title": "Compliance and Licensing Details",
        "id": "compliance-and-licensing-details"
      },
      {
        "title": "Threat Modeling Scenarios",
        "id": "threat-modeling-scenarios"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "GhostRing Security Model Deep Dive # Threat Model and Attack Surface # Core Threat Assumptions # GhostRing's security model is built on these fundamental assumptions: Kernel is partially trusted : The Linux kernel executes eBPF programs verified for safety, but kernel bugs or compromised components can leak information. User space is untrusted : Any user-space process can be malicious, can hook sy"
  },
  {
    "title": "GhostRing License Compliance Deep Dive",
    "url": "license-compliance-deep.html",
    "category": "Security, Compliance & Governance",
    "headings": [
      {
        "title": "Legal Framework and Kernel Requirements",
        "id": "legal-framework-and-kernel-requirements"
      },
      {
        "title": "GPLv3 and the Linux Kernel eBPF Verifier",
        "id": "gplv3-and-the-linux-kernel-ebpf-verifier"
      },
      {
        "title": "Verifier License Check Mechanism",
        "id": "verifier-license-check-mechanism"
      },
      {
        "title": "License Strings and Their Meaning",
        "id": "license-strings-and-their-meaning"
      },
      {
        "title": "Why GPLv3 is Non-Negotiable for GhostRing",
        "id": "why-gplv3-is-non-negotiable-for-ghostring"
      },
      {
        "title": "Enforcement in Build System",
        "id": "enforcement-in-build-system"
      },
      {
        "title": "Licensing the Crate Ecosystem",
        "id": "licensing-the-crate-ecosystem"
      },
      {
        "title": "GPLv3 Compliance Requirements",
        "id": "gplv3-compliance-requirements"
      },
      {
        "title": "License Transition Path",
        "id": "license-transition-path"
      },
      {
        "title": "Common License Mistakes to Avoid",
        "id": "common-license-mistakes-to-avoid"
      },
      {
        "title": "Compliance Checklist",
        "id": "compliance-checklist"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "GhostRing License Compliance Deep Dive # Legal Framework and Kernel Requirements # GPLv3 and the Linux Kernel eBPF Verifier # The relationship between GhostRing's GPLv3 licensing and the Linux kernel eBPF verifier is technical requirement , not merely legal preference. This section explains the mechanism. Verifier License Check Mechanism # When an eBPF program is loaded into the kernel, the verifi"
  },
  {
    "title": "GhostRing Build System and Workspace Deep Dive",
    "url": "build-system-workspace.html",
    "category": "Quality Assurance, Operations & Roadmap",
    "headings": [
      {
        "title": "Workspace Structure and Cargo Configuration",
        "id": "workspace-structure-and-cargo-configuration"
      },
      {
        "title": "Root Cargo.toml",
        "id": "root-cargotoml"
      },
      {
        "title": "Member Crate Structure",
        "id": "member-crate-structure"
      },
      {
        "title": "Workspace Dependencies",
        "id": "workspace-dependencies"
      },
      {
        "title": "Per-Crate Cargo.toml",
        "id": "per-crate-cargotoml"
      },
      {
        "title": "Build Commands and Workflow",
        "id": "build-commands-and-workflow"
      },
      {
        "title": "Incremental Builds",
        "id": "incremental-builds"
      },
      {
        "title": "Build Scripts (build.rs)",
        "id": "build-scripts-buildrs"
      },
      {
        "title": "Target Specification",
        "id": "target-specification"
      },
      {
        "title": "bpfel-unknown-none Details",
        "id": "bpfel-unknown-none-details"
      },
      {
        "title": "Target JSON (target specification)",
        "id": "target-json-target-specification"
      },
      {
        "title": "Custom Target Profile",
        "id": "custom-target-profile"
      },
      {
        "title": "CI/CD Integration",
        "id": "cicd-integration"
      },
      {
        "title": "GitHub Actions Workflow",
        "id": "github-actions-workflow"
      },
      {
        "title": "Verification Steps",
        "id": "verification-steps"
      },
      {
        "title": "Docker Build Considerations",
        "id": "docker-build-considerations"
      },
      {
        "title": "Cross-Compilation Considerations",
        "id": "cross-compilation-considerations"
      },
      {
        "title": "Dependency Management",
        "id": "dependency-management"
      },
      {
        "title": "Semantic Versioning Policy",
        "id": "semantic-versioning-policy"
      },
      {
        "title": "Version Bump Triggers",
        "id": "version-bump-triggers"
      },
      {
        "title": "Cargo Lock Management",
        "id": "cargo-lock-management"
      },
      {
        "title": "Avoiding Dependency Conflicts",
        "id": "avoiding-dependency-conflicts"
      },
      {
        "title": "Profile and Release Configuration",
        "id": "profile-and-release-configuration"
      },
      {
        "title": "Release Profile",
        "id": "release-profile"
      },
      {
        "title": "Debug Profile",
        "id": "debug-profile"
      },
      {
        "title": "Nightly-Specific Features",
        "id": "nightly-specific-features"
      },
      {
        "title": "Troubleshooting Build Issues",
        "id": "troubleshooting-build-issues"
      },
      {
        "title": "Common Build Errors",
        "id": "common-build-errors"
      },
      {
        "title": "Build Time Optimization",
        "id": "build-time-optimization"
      },
      {
        "title": "Verifying Build Correctness",
        "id": "verifying-build-correctness"
      },
      {
        "title": "Development Iteration Workflow",
        "id": "development-iteration-workflow"
      },
      {
        "title": "Typical Developer Loop",
        "id": "typical-developer-loop"
      },
      {
        "title": "Rapid Prototyping",
        "id": "rapid-prototyping"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "GhostRing Build System and Workspace Deep Dive # Workspace Structure and Cargo Configuration # Root Cargo.toml # TOML Copied! Copy # /home/ankur/git/ghostring/Cargo.toml [workspace] members = [ &quot;ghostring-common&quot; , &quot;ghostring-ebpf&quot; , &quot;ghostring&quot; , ] resolve = &quot;lowest&quot; // or &quot;highest&quot; depending on dependency needs Member Crate Structure # Member Pat"
  },
  {
    "title": "GhostRing Testing Strategy Deep Dive",
    "url": "testing-strategy.html",
    "category": "Quality Assurance, Operations & Roadmap",
    "headings": [
      {
        "title": "Testing Philosophy",
        "id": "testing-philosophy"
      },
      {
        "title": "Layer 1: Unit Tests ( ghostring-common)",
        "id": "layer-1-unit-tests-ghostring-common"
      },
      {
        "title": "Struct Layout Tests",
        "id": "struct-layout-tests"
      },
      {
        "title": "Type and Repr Tests",
        "id": "type-and-repr-tests"
      },
      {
        "title": "Constant Validation",
        "id": "constant-validation"
      },
      {
        "title": "Layer 2: Integration Tests (ghostring-ebpf)",
        "id": "layer-2-integration-tests-ghostring-ebpf"
      },
      {
        "title": "eBPF Program Compilation Tests",
        "id": "ebpf-program-compilation-tests"
      },
      {
        "title": "Verifier Compatibility Checks",
        "id": "verifier-compatibility-checks"
      },
      {
        "title": "BTF/CO-RE Tests",
        "id": "btfco-re-tests"
      },
      {
        "title": "Layer 3: CI/CD Testing",
        "id": "layer-3-cicd-testing"
      },
      {
        "title": "GitHub Actions Workflow",
        "id": "github-actions-workflow"
      },
      {
        "title": "Test Categorization",
        "id": "test-categorization"
      },
      {
        "title": "Continuous Integration Gates",
        "id": "continuous-integration-gates"
      },
      {
        "title": "Performance Testing",
        "id": "performance-testing"
      },
      {
        "title": "Property-Based Testing",
        "id": "property-based-testing"
      },
      {
        "title": "Manual Testing Checklist",
        "id": "manual-testing-checklist"
      },
      {
        "title": "Debugging Test Failures",
        "id": "debugging-test-failures"
      },
      {
        "title": "Release Gates Checklist",
        "id": "release-gates-checklist"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "GhostRing Testing Strategy Deep Dive # Testing Philosophy # GhostRing's testing strategy follows a pyramid approach with four layers: CODE Copied! Copy \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u2502 Testing Pyramid \u2502 \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u2502 \u2502 \u2502 Layer 4: End-to-End (rare) \u2502 \u2502 \u2502 - Full system with kernel, eBPF, daemon \u2502 \u2502 \u2502 - Manual trig"
  },
  {
    "title": "GhostRing Troubleshooting Guide Deep Dive",
    "url": "troubleshooting-guide.html",
    "category": "Quality Assurance, Operations & Roadmap",
    "headings": [
      {
        "title": "Introduction",
        "id": "introduction"
      },
      {
        "title": "Build and Compile Issues",
        "id": "build-and-compile-issues"
      },
      {
        "title": "1. \"unknown target keyword bpfel-unknown-none\"",
        "id": "1-unknown-target-keyword-bpfel-unknown-none"
      },
      {
        "title": "2. \"bpf-linker not found\"",
        "id": "2-bpf-linker-not-found"
      },
      {
        "title": "2b. \"bpf-linker LLVM bitcode mismatch (Producer vs Reader)\"",
        "id": "2b-bpf-linker-llvm-bitcode-mismatch-producer-vs-reader"
      },
      {
        "title": "3. \"failed to parse BTF from vmlinux\"",
        "id": "3-failed-to-parse-btf-from-vmlinux"
      },
      {
        "title": "4. \"license check failed\"",
        "id": "4-license-check-failed"
      },
      {
        "title": "5. \"relocation truncated to fit: R_BPF\"",
        "id": "5-relocation-truncated-to-fit-r_bpf"
      },
      {
        "title": "6. \"attempt to add list item twice\" / duplicate section",
        "id": "6-attempt-to-add-list-item-twice-duplicate-section"
      },
      {
        "title": "Runtime Issues",
        "id": "runtime-issues"
      },
      {
        "title": "7. \"No events appearing in daemon output\"",
        "id": "7-no-events-appearing-in-daemon-output"
      },
      {
        "title": "8. \"buffer overflow\" errors",
        "id": "8-buffer-overflow-errors"
      },
      {
        "title": "9. \"permission denied\" / \"ephemeral\" errors",
        "id": "9-permission-denied-ephemeral-errors"
      },
      {
        "title": "10. \"strace shows eBPF program not firing\"",
        "id": "10-strace-shows-ebpf-program-not-firing"
      },
      {
        "title": "10. \"high CPU usage by daemon\"",
        "id": "10-high-cpu-usage-by-daemon"
      },
      {
        "title": "11. \"struct size mismatch after code change\"",
        "id": "11-struct-size-mismatch-after-code-change"
      },
      {
        "title": "12. \"JSON export not working\" (roadmap feature)",
        "id": "12-json-export-not-working-roadmap-feature"
      },
      {
        "title": "12. \"backtrace on panic\"",
        "id": "12-backtrace-on-panic"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "GhostRing Troubleshooting Guide Deep Dive # Introduction # This comprehensive troubleshooting guide covers the most common issues encountered during GhostRing development, deployment, and operation. Each entry includes symptoms, likely causes, diagnostic steps, and fixes. Build and Compile Issues # 1. \"unknown target keyword bpfel-unknown-none \" # Symptom : CODE Copied! Copy error: unknown target "
  },
  {
    "title": "GhostRing Roadmap Features Deep Dive",
    "url": "roadmap-features-deep.html",
    "category": "Quality Assurance, Operations & Roadmap",
    "headings": [
      {
        "title": "Feature 1: Advanced Path Extraction via bpf_probe_read_user_str",
        "id": "feature-1-advanced-path-extraction-via-bpf_probe_read_user_str"
      },
      {
        "title": "Current Limitation",
        "id": "current-limitation"
      },
      {
        "title": "Roadmap Solution: bpf_probe_read_user_str",
        "id": "roadmap-solution-bpf_probe_read_user_str"
      },
      {
        "title": "Feature 2: Network Socket Observability (tcp_connect kprobes)",
        "id": "feature-2-network-socket-observability-tcp_connect-kprobes"
      },
      {
        "title": "Roadmap Overview",
        "id": "roadmap-overview"
      },
      {
        "title": "kprobe Attachment Points",
        "id": "kprobe-attachment-points"
      },
      {
        "title": "eBPF Program Design",
        "id": "ebpf-program-design"
      },
      {
        "title": "NetworkEvent Struct",
        "id": "networkevent-struct"
      },
      {
        "title": "kprobe vs tracepoint for Network",
        "id": "kprobe-vs-tracepoint-for-network"
      },
      {
        "title": "Address Extraction Challenges",
        "id": "address-extraction-challenges"
      },
      {
        "title": "Filtering and Classification",
        "id": "filtering-and-classification"
      },
      {
        "title": "Alerting Rules",
        "id": "alerting-rules"
      },
      {
        "title": "Performance Considerations",
        "id": "performance-considerations"
      },
      {
        "title": "Kernel Version Support",
        "id": "kernel-version-support"
      },
      {
        "title": "Implementation Checklist - Network Feature",
        "id": "implementation-checklist-network-feature"
      },
      {
        "title": "Feature 3: File Integrity Monitoring (sys_enter_openat)",
        "id": "feature-3-file-integrity-monitoring-sys_enter_openat"
      },
      {
        "title": "Roadmap Overview",
        "id": "roadmap-overview_1"
      },
      {
        "title": "Probe Attachment",
        "id": "probe-attachment"
      },
      {
        "title": "sys_enter_openat Arguments",
        "id": "sys_enter_openat-arguments"
      },
      {
        "title": "eBPF Program Design",
        "id": "ebpf-program-design_1"
      },
      {
        "title": "FileEvent Struct",
        "id": "fileevent-struct"
      },
      {
        "title": "FileEventType Enumeration",
        "id": "fileeventtype-enumeration"
      },
      {
        "title": "Sensitive File Classification",
        "id": "sensitive-file-classification"
      },
      {
        "title": "Alert Prioritization",
        "id": "alert-prioritization"
      },
      {
        "title": "Integration with Existing Event Pipeline",
        "id": "integration-with-existing-event-pipeline"
      },
      {
        "title": "Performance Impact",
        "id": "performance-impact_1"
      },
      {
        "title": "Kernel Version Support",
        "id": "kernel-version-support_1"
      },
      {
        "title": "Implementation Checklist - File Monitoring",
        "id": "implementation-checklist-file-monitoring"
      },
      {
        "title": "Related Documentation",
        "id": "related-documentation"
      }
    ],
    "excerpt": "GhostRing Roadmap Features Deep Dive # Feature 1: Advanced Path Extraction via bpf_probe_read_user_str # Current Limitation # The current ExecveEvent struct captures only the command name (16 bytes, truncated): RUST Copied! Copy #[repr(C)] pub struct ExecveEvent { pub pid : u32 , pub ppid : u32 , pub uid : u32 , pub gid : u32 , pub flags : u64 , pub timestamp : u64 , pub command : [ u8 ; 16 ], // "
  }
];
