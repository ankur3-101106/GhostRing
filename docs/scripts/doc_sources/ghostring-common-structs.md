# ghostring-common: C-Compatible Structs Deep Dive

## Purpose and Design Principles

`ghostring-common` is a `cdylib` crate providing the binary communication format between kernel space and user space. All structs are `#[repr(C)]` to ensure:

- **No padding surprises** across compiler versions
- **ABI compatibility** with C translation units
- **Safe FFI boundaries** between `no_std` kernel code and `std` user code
- **Zero-cost marshaling** - no runtime serialization overhead

## Structural Guidelines

### Mandatory Attributes

```rust
/// All structs in ghostring-common must have:
#[repr(C)]
pub struct EventStruct {
    /// Field types must be C-compatible scalar types
    pub field1: u32,
    /// No Rust-specific types (Option, Result, etc.)
    /// No generics or traits on struct fields
    /// No nested structs with non-C layouts
}
```

### C-Compatible Type Mapping

| Rust Type | C Equivalent | Notes |
|---|---|---|
| `u8` | `uint8_t` | 1 byte |
| `u16` | `uint16_t` | 2 bytes |
| `u32` | `uint32_t` | 4 bytes |
| `u64` | `uint64_t` | 8 bytes |
| `i8` | `int8_t` | Signed 1 byte |
| `i16` | `int16_t` | Signed 2 bytes |
| `i32` | `int32_t` | Signed 4 bytes |
| `i64` | `int64_t` | Signed 8 bytes |
| `c_char` | `char` | 1 byte, null-terminated strings |
| `usize` | **Undefined** | Avoid in common; use u32/u64 instead |
| `bool` | **Undefined** | Avoid; use u8 with 0/1 semantics |

### Alignment and Padding Rules

1. **Natural alignment**: Each field aligned to its size
2. **Struct alignment**: Struct aligned to largest field alignment
3. **No transitive padding**: Fields added at end only
4. **`#[repr(C)]` on every struct**: Non-negotiable

### Trait Usage Restrictions

**NOT allowed** in `ghostring-common`:
```rust
// ❌ These break C compatibility
pub struct BadStruct {
    pub field: Option<u32>,      // Option has different ABI
    pub field: Result<u32, Error>, // Error type not C-compatible
    pub field: Vec<u32>,         // Variable size
    pub field: Box<u32>,         // Heap allocated
}
```

**ALLOWED** (with caveats):
```rust
// ✅ These are OK if carefully managed
pub struct GoodStruct {
    pub field: u32,              // Plain integer
    pub flag: u8,                // 0/1 boolean semantic
}
```

## Event Struct Layout

### Execve Event (Core Monitoring Event)

```rust
#[repr(C)]
pub struct ExecveEvent {
    /// Process ID (positive integer)
    pub pid: u32,
    
    /// Parent process ID
    pub ppid: u32,
    
    /// User ID of process owner
    pub uid: u32,
    
    /// Group ID of process owner
    pub gid: u32,
    
    /// Event flags (reserved for future use)
    pub flags: u64,
    
    /// Timestamp in nanoseconds since epoch
    pub timestamp: u64,
    
    /// Command name (16 bytes, truncatable)
    /// - Copied from kernel register by eBPF program
    /// - Null-padded if shorter than 16 bytes
    /// - Truncated if longer than 15 chars + null
    #[cfg_attr(not(feature = "suppress_warnings"), deprecated = "Use command[16] instead")]
    pub command: [u8; 16],
}
```

**Size Breakdown**:
| Field | Size | Offset |
|---|---|---|
| `pid` | 4 bytes | 0 |
| `ppid` | 4 bytes | 4 |
| `uid` | 4 bytes | 8 |
| `gid` | 4 bytes | 12 |
| `flags` | 8 bytes | 16 |
| `timestamp` | 8 bytes | 24 |
| `command[16]` | 16 bytes | 32 |
| **Total** | **40 bytes** | **Alignment: 40** |

### Alternative: Split Struct for CO-RE

For BTF/CO-RE compatibility, consider splitting large structs:

```rust
/// Fixed-size header always present
#[repr(C)]
pub struct ExecveHeader {
    pub pid: u32,
    pub ppid: u32,
    pub uid: u32,
    pub gid: u32,
    pub timestamp: u64,
}

/// Variable-length payload (optional)
#[repr(C)]
pub struct ExecvePayload {
    pub flags: u64,
    pub command: [u8; 16],
}
```

### Uid/Gid Event (Alternative Event Type)

```rust
#[repr(C)]
pub struct UidGidEvent {
    /// Timestamp
    pub timestamp: u64,
    /// User ID
    pub uid: u32,
    /// Group ID
    pub gid: u32,
    /// Effective flags
    pub flags: u16,
    /// Padding/reserved
    pub _reserved: u16,
}
```

**Size**: 16 bytes (well-aligned, no waste)

### Syscall Entry/Exit Pair

For future roadmap (sys_enter_openat / sys_exit_openat monitoring):

```rust
#[repr(C)]
pub struct SyscallEvent {
    /// Process identifiers
    pub pid: u32,
    pub ppid: u32,
    pub uid: u32,
    pub gid: u32,
    
    /// System call number (for filtering)
    pub syscall_num: u32,
    
    /// Return value (success/error code)
    pub ret: i32,
    
    /// Event flags
    pub flags: u64,
    
    /// Timestamp
    pub timestamp: u64,
    
    /// Associated path (16 bytes, truncated)
    pub comm: [u8; 16],
}
```

**Size**: 48 bytes

## Constant Definitions

### Event Type Enums

```rust
/// Event types as recognized by user-space consumer
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum EventType {
    /// Process execution: sys_enter_execve
    Execve = 0x01,
    
    /// UID/GID change tracking
    UidGid = 0x02,
    
    /// Future: sys_enter_openat file monitoring
    Openat = 0x03,
    
    /// Future: tcp_connect network monitoring
    TcpConnect = 0x04,
}
```

### Flag Bits

```rust
/// Event flags bitmask (currently unused, reserved)
#[repr(u64)]
pub enum EventFlags: u64 {
    /// None set (default)
    Empty = 0x00,
    
    /// Event was truncated (command > 15 chars)
    Truncated = 0x01,
    
    /// Process is kernel thread
    KernelThread = 0x02,
    
    /// UID is from filesystem
    FsUid = 0x04,
}
```

### Maximum String Lengths

| Constant | Value | Purpose |
|---|---|---|
| `MAX_COMM_LEN` | 16 | Command name buffer size (includes null terminator) |
| `MAX_PATH_LEN` | 256 | *Roadmap*: Full file path length |
| `MAX_ARG_LEN` | 64 | *Roadmap*: Command line argument length |

### Alignment Verification

```rust
// Compile-time assertion that struct is properly aligned
const _: () = {
    // Static assert: total size must be multiple of alignment
    assert_size_of::<ExecveEvent>() == 40;
    assert_size_of::<UidGidEvent>() == 16;
    assert_size_of::<SyscallEvent>() == 48;
};
```

## FFI Bridge Design

### Kernel-Side (`ghostring-ebpf`)

```rust
// In eBPF program - pushing event to ring buffer

use ghostring_common::ExecveEvent;

// Construct event in eBPF program
let event = ExecveEvent {
    pid: bpf_get_current_pid_tgid() as u32,
    ppid: /* from context */,
    uid: bpf_get_current_uid_gid() as u32,
    gid: /* from context */,
    flags: 0,
    timestamp: bpf_ktime_get_ns(),
    command: [0; 16],  // Will be filled with comm
};

// Copy command name safely
let comm = bpf_probe_read_user_str(command_ptr, 16, max_len);
for (i, byte) in comm.iter().enumerate() {
    event.command[i] = *byte;
}

// Push toPerfEventArray map
PERF_EVENTS.output(ctx, cpu, &event as *const _ as *mut c_void);
```

**Critical**: The struct must have identical layout at compile time and runtime. Any change requires rebuild of both crates.

### User-Side (`ghostring`)

```rust
// In Tokio daemon - receiving and parsing events

use ghostring_common::ExecveEvent;

// Raw bytes from ring buffer
let raw_data: &[u8] = /* from perf_event_array poll */;

// Cast to typed struct (safe because of #[repr(C)])
let event = unsafe {
    std::ptr::read_unaligned(raw_data.as_ptr() as *const ExecveEvent)
};

// Access fields
println!(" PID: {} CMD: {:?}", event.pid, &event.command[..event.command.iter().position(|&b| b == 0).unwrap_or(16)]);
```

**Safety Note**: `read_unaligned` is safe here because:
1. `#[repr(C)]` guarantees layout
2. Data originates from kernel via verified eBPF program
3. No concurrent mutation (producer-consumer ring buffer)

## Build and Version Management

### Cargo.toml Configuration

```toml
# ghostring-common/Cargo.toml
[package]
name = "ghostring-common"
version = "0.1.0"
crate-type = ["cdylib"]

[dependencies]
# No std dependencies - pure cdylib
# No external crates - self-contained
```

### Semantic Versioning Policy

| Version | Meaning |
|---|---|
| **0.x.0** | Breaking API changes allowed |
| **0.1.0** | Initial development |
| **0.1.1** | Bug fixes, no API change |
| **1.0.0** | Stable API, semver guarantee |

### ABI Stability Guarantees

**Guaranteed stable** (no bump required):
- Field order within `#[repr(C)]` structs
- Enum discriminant values (if `#[repr(u8)]`)
- Constant values (`MAX_COMM_LEN`, etc.)
- Type mappings (Rust → C)

**Requires version bump**:
- Adding/removing struct fields
- Changing field types
- Reordering enum variants
- Modifying constant values

### Change Detection

```bash
# Check struct sizes haven't changed unexpectedly
cargo bench -- --init
# Or manually:
cargo rustc --release -v | grep "size of ExecveEvent"
```

## Roadmap: Struct Extensions

### Planned Additions (TODO)

| Feature | Struct Change | Impact |
|---|---|---|
| **Full path extraction** | Add `path[256]` field to `ExecveEvent` | +256 bytes, requires `bpf_probe_read_user_str` |
| **Socket family** | Add `family: u8` to `SyscallEvent` | +1 byte, minor |
| **Return code** | Change `ret: i32` to `ret: i64` | +4 bytes, binary break |
| **Timestamps monotonic** | Change `timestamp: u64` to `timespec` | Layout change |

**Binary compatibility rule**: Once `1.0.0` released, struct changes require minor version bump and consumer update.

## Testing Struct Layout

### Compile-Time Checks

```rust
// In tests/ directory
#[test]
fn test_struct_sizes() {
    use ghostring_common::{ExecveEvent, UidGidEvent};
    
    // These must compile and pass
    assert_eq!(std::mem::size_of::<ExecveEvent>(), 40);
    assert_eq!(std::mem::align_of::<ExecveEvent>(), 4);
    assert_eq!(std::mem::size_of::<UidGidEvent>(), 16);
}
```

### Cross-Platform Verification

```bash
# Verify struct sizes match expectations
cargo test -p ghostring-common -- test_struct_sizes

# Check with miri (for UB detection)
cargo test -p ghostring-common --test test_struct_sizes -- --include-miri

# Release build verification
cargo build -p ghostring-common --release --emit=metadata
```

### ABI Compliance Test Suite

1. **Build both crates** with same commit
2. **Run eBPF program** on test kernel
3. **Receive events** in user space
4. **Verify field values** match expectations
5. **Check size invariants** across builds

## A Note on `#[repr(C)]` Pitfalls

### Common Mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Forgetting `#[repr(C)]` on struct | Unpredictable layout | Add attribute to every struct |
| Using `usize` in common crate | 32/64-bit mismatch | Replace with `u32`/`u64` |
| Adding `String` field | Variable size, breaks ABI | Use `[u8; N]` instead |
| Nesting structs without repr | Double alignment | Flatten or add repr to each |
| Enum without explicit repr | Platform-dependent | Use `#[repr(u8)]` or `#[repr(u32)]` |

### Validation Heuristic

Before committing struct changes to `ghostring-common`:

1. ✅ All fields are primitive types (`u8`, `u16`, `u32`, `u64`, `i32`, `i64`, `c_char`)
2. ✅ `#[repr(C)]` attribute present
3. ✅ No `Option`, `Result`, `Vec`, `Box`, or other Rust types
4. ✅ `static_assertions` or `const` size checks pass
5. ✅ Both `cargo build` and `cargo build --release` produce same layout
6. ✅ No changes without updating `docs/` documentation

## Deprecation and Removal Policy

### Deprecating Fields

```rust
/// Deprecated field, use `new_field` instead
#[deprecated(note = "Use new_field for updated functionality")]
pub old_field: u32,

/// Replacement field
pub new_field: u32,
```

### Removing Fields (Major Version Only)

1. **Bump major version** (0.x.y → 1.0.0 or 1.x.0 → 2.0.0)
2. **Update all consumers** (both `ghostring-common` dependents)
3. **Update documentation** (`docs/`)
4. **Add compatibility shim** if temporary support needed

### Never Remove Without:
- Major version bump
- Consumer update plan
- Migration guide documentation
- Backward-compatible replacement

## Related Documentation

- [Architecture Overview](./architecture-overview.md) — Workspace structure and crate segregation role of `ghostring-common`.
- [Event Transport](./event-transport.md) — End-to-end telemetry pipeline utilizing `#[repr(C)]` event structs.
- [Perf Buffer Internals](./perf-buffer-internals.md) — Struct alignment, padding, and binary packing within ring buffer memory pages.
- [ghostring User Daemon](./ghostring-user-daemon.md) — Deserialization and processing of event structs in the Tokio daemon.
- [BTF & CO-RE Deep Dive](./btf-co-re-deep-dive.md) — BTF type mapping and ABI compatibility across diverse kernel versions.
- [Build System & Workspace](./build-system-workspace.md) — Workspace manifest and dependency management for `cdylib`/`staticlib` targets.
- [License Compliance Deep Dive](./license-compliance-deep.md) — GPLv3 compliance considerations for shared data structures.
- [Roadmap Features Deep Dive](./roadmap-features-deep.md) — Planned struct additions (`FileEvent`, `SocketEvent`) for future milestones.
- [Testing Strategy](./testing-strategy.md) — Automated compile-time and runtime tests for struct layout and size invariants.

---
*This document is the authoritative specification for `ghostring-common` struct design. Any changes to shared structs must be reflected here.*