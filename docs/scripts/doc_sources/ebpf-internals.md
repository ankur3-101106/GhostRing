# eBPF Internals and Bytecode Analysis for GhostRing

## eBPF Instruction Set Architecture

### 32-RISC Like Instructions
eBPF programs use a compact, RISC-like instruction set optimized for kernel execution. Each instruction is 32 bits:

```
| 31 | 30-28 | 27-24 | 23-20 | 19-16 | 15-12 | 11-8 | 7-4 | 3-0 |
|----|-------|-------|-------|-------|-------|------|-----|-----|
| op | src_reg| dst_reg| off   | imm   |      |      |     |     |
```

### Opcode Categories

| Category | Opcodes | Description |
|---|---|---|
| **Arithmetic** | 0x00-0x0f | ADD, SUB, MUL, DIV, MOD, NAND |
| **Load** | 0x10-0x1f | Load from map, stack, absolute/fixed offset |
| **Store** | 0x20-0x2f | Store to stack, map |
| **Jump/Branch** | 0x30-0x3f | JMP, JMP_JIT, JE, JNE, JGT, JGE, JLT, JLE |
| **Helper Call** | 0x40-0x4f | Call licensed BPF helpers |
| **Special** | 0x50-0x5f | EXIT, MOV, etc. |

### Register Usage
- **R0-R5**: Scratch/data registers
- **R6**: Stack frame pointer
- **R10**: Fixed register - points to BPF context (read-only)
- **R11**: Arg2 - helper return value (may be clobbered)

## BPF Context Structure

When an eBPF program fires, the kernel provides a context structure containing:

### For Tracepoints (`sys_enter_execve` context)
- `ctx->args[0-5]`: Syscall arguments
- `ctx->ret`: Return value (output)
- `ctx->caller_saved`: Saved registers
- `ctx->pid`: Current process ID
- `ctx->uid`: Current user ID
- `ctx->comm`: Command name (16 bytes, truncated)
- `ctx->tid`: Thread ID
- `ctx->time`: Timestamp (ns)

### Memory Layout
- **Stack**: 512 bytes (per-function)
- **Data section**: Map data, constants
- **Helper calls**: Through registered BPF helper table

## Verifier Internals

### Verification Phases

1. **Parse & Validate**: Parse instructions, validate operands
2. **Liveness Analysis**: Ensure all register uses are defined
3. **Bounds Checking**: Verify stack/heap access within limits
4. **Loop Detection**: Prove termination (no infinite loops)
5. **License Check**: Verify GPLv3 compliance for helpers
6. **Program Truncation**: Trim dead code paths

### Key Verifier Constraints

| Constraint | Limit | Rationale |
|---|---|---|
| **Instruction count** | 4,096 max | Prevent CPU exhaustion |
| **Stack depth** | 512 bytes | Memory safety |
| **Helper arguments** | ≤ 6 registers | FFI safety |
| **Memory access** | Bounds-checked | Buffer overflow prevention |
| **Loop count** | Unbounded but verified | Termination guarantee |

### CO-RE and BTF Requirements

For CO-RE (Compile Once, Run Everywhere) support:

- **BTF metadata** must be embedded in the ELF
- `/sys/kernel/btf/vmlinux` provides kernel type information
- eBPF program accesses struct fields by **name** at runtime via BTF
- Without BTF: Hardcoded offsets break across kernel versions
- Aya automatically embeds BTF and resolves types at load time

## GhostRing eBPF Program Structure

### Entry Points

```rust
// Tracepoint attachment
#[tracepoint(xdp, "sys_enter_execve")]
pub fn sys_enter_execve(ctx: TracepointContext) {
    // Program entry - R10 = ctx, R6 = stack top
    // All helpers must be GPLv3-licensed
}
```

### Program Flow

1. **Entry**: eBPF verifier checks program
2. **Data Extraction**: Read pid, uid, comm from context
3. **Serialization**: Pack into `#[repr(C)]` struct
4. **Map Push**: Write to `PerfEventArray` ring buffer
5. **Exit**: Verified safe return

### Helper Functions Used

| Helper | Purpose | License |
|---|---|---|
| `bpf_ktime_get_ns` | Nanosecond timestamp | GPLv3 |
| `bpf_get_current_pid_tgid` | PID/TID extraction | GPLv3 |
| `bpf_get_current_uid_gid` | UID/GID extraction | GPLv3 |
| `bpf_probe_read_user_str` | Safe user string read | GPLv3 *(roadmap)* |
| `bpf_perf_event_output` | Ring buffer push | GPLv3 |

## ELF Layout for BPF Target

### Sections Managed by `bpf-linker`

| Section | Purpose |
|---|---|
| `.text` | eBPF bytecode |
| `.rodata` | Constant data (format strings, flags) |
| `.data` | Mutable data (per-CPU variables) |
| `.bss` | Zero-initialized data |
| `.maps` | BPF map definitions |
| `.strtab` | String table for symbols |
| `__license` | License string (`"GPLv3"` critical!) |

### License Section

```assembly
.section "__license","a",progbits
.global __license
.type __license,@proctype
__license:
.asciz "GPLv3"
```

**Critical**: The `__license` section is checked by the kernel verifier. Must be `"GPLv3"` (or `"GPL"`)` for full helper access.

## Map Types and Operations

### PerfEventArray Map

```rust
// Map definition in ghostring-ebpf
static PERF_EVENTS: PerfEventArray = PerfEventArray::new(
    "ghosting_events\0".as_ptr() as *const c_char,
);
```

#### Key Properties

| Property | Value | Impact |
|---|---|---|
| **Type** | `BPF_MAP_TYPE_PERF_EVENT_ARRAY` | Per-CPU ring buffers |
| **Key size** | 4 bytes (cpu index) | Per-CPU selection |
| **Value size** | `perf_event_output` format | Ring buffer structure |
| **Max entries** | Per-CPU count | One buffer per CPU |
| **Pinning** | None (auto-created) | Load-time creation |

#### `perf_event_output` Context

```c
// Kernel struct for perf_event_output
struct {
    __u32 src_cpu;     // Source CPU
    __u32 dst_cpu;     // Destination CPU (or 0)
    __u32 flags;       // BPF_F_CURRENT_CPU, etc.
    __u64 data;        // Data pointer
    __u64 size;        // Data size
    __u64 map_idx;     // Optional map index
} perf_event_output_args;
```

### Map Operations in eBPF

| Operation | Syntax | Description |
|---|---|---|
| **Map lookup** | `bpf_map_lookup_elem` | Find value by key |
| **Map update** | `bpf_map_update_elem` | Create/update value |
| **Map delete** | `bpf_map_delete_elem` | Remove entry |
| **Perf read** | `bpf_perf_event_read` | Read ring buffer stats |

## Advanced: JIT and JIT Binary Format

### Native JIT Compilation

eBPF programs can be JIT-compiled to native architecture:

| Target | JIT Status |
|---|---|
| **x86_64** | Full JIT available |
| **ARM64/aarch64** | Full JIT available |
| **RISC-V** | Full JIT available |
| **BPF virtual** | Always available (interpreted) |

### JIT Binary Format

When JIT-compiled, the binary contains:

```
| Magic (0xeB9f) | Version | Text section size | Text offset | Data offset | ...
```

The JIT binary is embedded in the ELF and loaded by the kernel verifier alongside the bytecode.

## Debugging eBPF Programs

### Printk Debugging

```rust
// Limited printing - goes to kernel log
bpf_trace_printk("pid=%d uid=%d\\n", 0, pid as i64, 0);
```

### Limits

- **Output size**: ~1MB per second (rate-limited)
- **Format**: `printk` style, minimal formatting
- **Performance**: Avoid in production; use for development only

### Userspace Verification

```bash
# Validate eBPF bytecode
bpftool prog show type tracepoint

# Check verifier errors
dmesg | grep -i "verifier"
```

### Static Analysis Tools

- **bcc (BPF Compiler Collection)**: `bpf_trace` utilities
- **bpftrace**: High-level tracing language
- **verifier logs**: `dmesg` output on load failure

## Related Documentation

- [eBPF Fundamentals](./ebpf-fundamentals.md) — High-level concepts, probe points, and sandbox execution.
- [Kernel Instrumentation](./kernel-instrumentation.md) — Attaching to tracepoints and kprobes from the kernel.
- [Aya Framework](./aya-framework.md) — Rust wrapper around eBPF loading, maps, and helper bindings.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — Type information relocations and CO-RE ELF sections.
- [Perf Buffer Internals](./perf-buffer-internals.md) — Map mechanics for `PerfEventArray` and memory ring buffers.
- [ghostring-common Struct Design](./ghostring-common-structs.md) — Struct alignment and serialization constraints within eBPF programs.
- [License Compliance Deep Dive](./license-compliance-deep.md) — The `__license` section and kernel verifier helper restriction rules.
- [Troubleshooting Guide](./troubleshooting-guide.md) — Diagnosing verifier failures, stack overflow, and opcode errors.