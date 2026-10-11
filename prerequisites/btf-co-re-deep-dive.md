# BTF and CO-RE Deep Dive for GhostRing

## BTF (BPF Type Format) Fundamentals

### What is BTF?

**BPF Type Format (BTF)** is debug metadata embedded in ELF binaries that provides type information at runtime. For eBPF, BTF enables:

- **CO-RE (Compile Once, Run Everywhere)**: eBPF programs don't need hardcoded kernel struct offsets
- **Type-safe field access**: By name at runtime via BTF, not by offset at compile time
- **Kernel version independence**: Same BPF bytecode works across kernel versions

### BTF Embedding in ELF

When `cargo build --release` is run with BTF support:

```rust
// ghostring-ebpf/build.rs - BTF embedding
if std::path::Path::new("/sys/kernel/btf/vmlinux").exists() {
    // Automatically embed BTF via LLVM flags
    println!("cargo:rustc-cfg=with_btf");
    println!("cargo:rustc-link-arg-bpf=--btf");
}
```

**Embedded sections**: `.BTF`, `.BTF.ext`, `.rodata1` contain compressed type information.

### BTF Structure

```
┌───────────────────────────────────────────────────────┐
│ Section: .BTF                                         │
│ Type: Fixed-size record array                         │
│                                                       │
│ Key types for GhostRing:                              │
│   - struct file                                       │
│   - struct inode                                      │
│   - struct pt_regs (register context)                 │
│   - struct task_struct (process info)                 │
│   - struct fs_struct                                  │
│   - struct mm_struct                                  │
│   - compat fields for 32/64-bit portability          │
└───────────────────────────────────────────────────────┘
```

### BTF Kernel Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **Kernel version** | 4.15+ | 5.8+ |
| **CONFIG_BTF** | y | y |
| **CONFIG_BTF_DEVICE** | n | y (for device metadata) |
| **CONFIG_BTF_USERSPACE** | n | y (for user-type access) |
| **/sys/kernel/btf/vmlinux** | Must exist | Must be accessible |
| **CONFIG_BPF** | y | y |

### Verifying BTF Availability

```bash
# Check if BTF is available on running kernel
ls -la /sys/kernel/btf/vmlinux

# If file exists, read BTF info
cat /sys/kernel/btf/vmlinux | head -c 100 | xxd

# Check BTF type count
bpftool btf dump verbose /proc/self/exe 2>/dev/null | head -20

# List all BTF types
bpftool btf dump verbose id /proc/self/pid 2>/dev/null | grep 'name kind'
```

### BTF and CO-RE in Practice

#### Without BTF (Traditional)

```rust
// Must know kernel struct layout at compile time
#[inline(always)]
pub fn get_pid_from_context(ctx: *const c_void) -> u32 {
    // Hardcoded offset - breaks on kernel update
    let ptr = ctx as *const user_regs_struct;
    (*ptr).pid  // offset known only for specific kernel version
}
```

#### With BTF (GhostRing approach)

```rust
// BTF-enabled: access by type name at runtime
use aya::bindings::btf_type;
use aya::Btf;

pub fn get_pid_from_context(btf: &Btf, ctx: *const c_void) -> u32 {
    // Look up type by name in BTF metadata
    if let Some(type_id) = btf.type_id("struct pt_regs") {
        // Access field 'pid' by name at runtime
        // Aya handles the offset resolution via BTF
        let pid = aya::helpers::bpf_get_current_pid_tgid() as u32;
        return pid;
    }
    0
}
```

### Aya's BTF Support

Aya automatically:

1. **Embeds BTF** from the compiled ELF into the loaded program
2. **Provides type lookups** via `aya::Btf` API
3. **Resolves struct offsets** at load time using kernel BTF
4. **Enables field access** by name in user-space helper functions

```rust
// In ghostring-ebpf program with Aya BTF support
use aya::Btf;

#[aya::main]
pub fn main(bpf: aya::EBPF, _ctx: aya::ctx::MainContext) -> Result<(), aya::Error> {
    // Load BTF from attached program's ELF
    let btf = bpf.btf();
    
    // Look up structs by name
    let pid_type = btf.type_id("struct pt_regs")?;
    
    // Access fields by name (via helper functions)
    let pid = aya::helpers::bpf_get_current_pid_tgid() as u32;
    
    // Push event with typed data
    // ... 
    
    Ok(())
}
```

## CO-RE (Compile Once, Run Everywhere) Mechanics

### CO-RE Philosophy

> **"Compile once with BTF, run on any compatible kernel without recompilation."**

### How CO-RE Works

1. **Compile time**: eBPF bytecode compiled with BTF metadata embedded
2. **Link time**: `bpf-linker` processes ELF, adds BTF sections
3. **Load time**: Kernel provides `/sys/kernel/btf/vmlinux` BTF metadata
4. **Runtime**: eBPF program uses Aya helpers to access struct fields by name
5. **Compatibility**: Same bytecode runs on any kernel with matching BTF

### CO-RE Enabled Features in GhostRing

| Feature | CO-RE Status | Implementation |
|---|---|---|
| `sys_enter_execve` probe | ✅ CO-RE | Aya tracepoint attachment, BTF-resolved struct offsets |
| `pid` extraction | ✅ CO-RE | `bpf_get_current_pid_tgid()` helper, BTF-verified |
| `uid` extraction | ✅ CO-RE | `bpf_get_current_uid_gid()` helper |
| `comm` (command name) | ✅ CO-RE | `bpf_get_current_comm()` with 16-byte buffer |
| `full path extraction` | ⚠️ Partial | `bpf_probe_read_user_str` requires BTF + specific kernel |
| `tcp_connect kprobes` | ✅ CO-RE | kprobe attachment BTF-resolved |
| `sys_enter_openat` | ✅ CO-RE | Tracepoint with BTF struct resolution |

### CO-RE Requirements by Feature

| Feature | BTF Required | Kernel Min | Aya Support |
|---|---|---|---|
| Tracepoint attachment | ✅ | 4.15+ | ✅ Full |
| kprobe attachment | ✅ | 4.1+ | ✅ Full |
| `bpf_get_current_pid_tgid` | ✅ | 3.10+ | ✅ Full |
| `bpf_get_current_uid_gid` | ✅ | 3.10+ | ✅ Full |
| `bpf_get_current_comm` | ✅ | 3.10+ | ✅ Full |
| `bpf_probe_read_user_str` | ✅⚠️ | 5.8+ | ⚠️ Conditional |
| `bpf_probe_read_user` | ✅ | 4.1+ | ✅ Full |
| `PerfEventArray` maps | ✅ | 4.1+ | ✅ Full |
| Hash maps | ✅ | 5.7+ | ✅ Full |

### CO-RE Compatible eBPF Program Skeleton

```rust
// ghostring-ebpf/src/lib.rs - CO-RE ready template
use aya::{
    Ebpf, Btf, programs::{TracepointProgram, KprobeProgram},
    helpers,
    maps::{PerfEventArray, MapType},
    bindings::{self, perf_event_output},
};

#[ay a::main]
pub fn main(ebpf: Ebpf, ctx: aya::ctx::MainContext) -> Result<(), aya::Error> {
    // Initialize BTF from loaded program
    let btf = ebpf.btf();
    
    // Attach to tracepoint with BTF-resolved offsets
    #[tracepoint(xdp, "sys_enter_execve")]
    pub fn sys_enter_execve(ctx: bindings::tracepoint_sys_enter_execve_context) {
        // Use Aya helpers (BTF-verified at load time)
        let pid = helpers::bpf_get_current_pid_tgid() as u32;
        let uid = helpers::bpf_get_current_uid_gid() as u32;
        let timestamp = helpers::bpf_ktime_get_ns();
        
        // Copy command name (BTF ensures 16-byte buffer is sufficient)
        let mut command: [u8; 16] = [0; 16];
        let comm_len = helpers::bpf_get_current_comm(&mut command, 16);
        
        // Build event struct (#[repr(C)] in common)
        let event = ghostring_common::ExecveEvent {
            pid,
            ppid: 0,  // Could fill from context if needed
            uid,
            gid: 0,
            flags: 0,
            timestamp,
            command,
        };
        
        // Push to perf event array
        static EXEC_EVENTS: PerfEventArray = PerfEventArray::new(
            b"exec_events\0".as_ptr() as *const std::os::raw::c_char,
        );
        
        // Get CPU index for per-CPU routing
        let cpu = aya::util::current_cpu_id();
        
        // Output event
        if let Ok(_) = EXEC_EVENTS.output(ctx, cpu, &event as *const _ as *mut _) {
            // Event pushed to user-space ring buffer
        }
    }
    
    // Keep program running
    loop {
        aya::helpers::bpf_trace_printk("ghostring: working\n\0");
        std::hint::spin_loop();
    }
}
```

### BTF Version Compatibility Matrix

| BTF Kernel Version | Features Available | GhostRing Support |
|---|---|---|
| **4.14** | Basic BTF, limited structs | ❌ Not supported (too old) |
| **4.15 - 5.7** | Improved BTF, some structs | ⚠️ Partial (missing some features) |
| **5.8 - 5.15** | Good BTF support, most structs | ✅ **Recommended** (target) |
| **5.16 - 6.1** | Enhanced BTF, new types | ✅ Full support |
| **6.2+** | Latest BTF, all features | ✅ Full support |

### CO-RE Failure Modes

| Failure Mode | Symptom | Resolution |
|---|---|---|
| **Missing BTF metadata** | `btf` field empty in prog info | Ensure `/sys/kernel/btf/vmlinux` exists; rebuild kernel |
| **Type name mismatch** | `btf.type_id("struct task_struct")` returns 0 | Check kernel BTF matches expected types; update Aya version |
| **Offset drift** | Field values wrong after kernel update | Rebuild with new kernel headers; Aya BTF should handle this |
| **License restriction** | Verifier rejects non-GPLv3 program | Ensure `LICENSE` field = `"GPLv3"` in Cargo.toml/build.rs |
| **Helper not available** | `bpf_probe_read_user_str` unavailable | Check GPLv3 compliance; consider alternative approaches |

### Debugging BTF/CO-RE Issues

```bash
# Check if program has BTF attached
bpftool prog show id <prog_id> btf

# View BTF type tree
bpftool btf dump verbose /proc/self/exe

# Check verifier errors related to BTF
dmesg | grep -i "btf\|co-re\|type"

# Verify program loads on target kernel
sudo cargo run --release 2>&1 | grep -i "load\|attach\|btf"
```

### Aya BTF API Reference

| Method | Signature | Description |
|---|---|---|
| `btf` | `fn btf(&self) -> Option<&Btf>` | Get Btf reference (None if not available) |
| `type_id` | `fn type_id(&self, name: &str) -> Option<u32>` | Look up type ID by name |
| `field_offset` | `fn field_offset(&self, type_id: u32, field: &str) -> Option<u32>` | Get offset of field within struct |
| `enum_id` | `fn enum_id(&self, name: &str) -> Option<u32>` | Look up enum type ID |
| `func_id` | `fn func_id(&self, name: &str) -> Option<u32>` | Look up function type ID |

### Performance Impact of BTF

| Metric | With BTF | Without BTF |
|---|---|---|
| **Load time** | +5-10% | Baseline |
| **Verifier time** | +2-5% | Baseline |
| **Runtime overhead** | Negligible | N/A |
| **Field access latency** | Same (helpers inline) | Same |
| **Compatility** | Multi-kernel | Single kernel only |
| **Binary size** | +2-5KB | Smaller |

**Conclusion**: BTF overhead is minimal; CO-RE benefits far outweigh costs.

### Future: BTF Advanced Features

| Feature | Status | Roadmap |
|---|---|---|
| **BTF Kfuncs** | Emerging | Potential replacement for some helpers |
| **Type completion** | Work in progress | Allow forward declarations |
| **BTF virtualization** | Experimental | KVM/VM BTF passing |
| **Userspace BTF** | Available | Parse BTF from user binaries |
| **BTF sampling** | Available | Profile-guided optimization |

---
*This document covers BTF and CO-RE mechanics for GhostRing. For eBPF programming, see `prerequisites/ebpf-internals.md`. For Aya framework, see `prerequisites/aya-framework.md`. For struct definitions, see `prerequisites/ghostring-common-structs.md`.*