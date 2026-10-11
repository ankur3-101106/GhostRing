# GhostRing Roadmap Features Deep Dive

## Feature 1: Advanced Path Extraction via `bpf_probe_read_user_str`

### Current Limitation

The current `ExecveEvent` struct captures only the command name (16 bytes, truncated):

```rust
#[repr(C)]
pub struct ExecveEvent {
    pub pid: u32,
    pub ppid: u32,
    pub uid: u32,
    pub gid: u32,
    pub flags: u64,
    pub timestamp: u64,
    pub command: [u8; 16],  // Truncated command name
}
```

**Problem**: `sys_enter_execve` provides only the 15-char (plus null) truncated command name, not the full filesystem path.

### Roadmap Solution: `bpf_probe_read_user_str`

#### Kernel Function

```c
// int bpf_probe_read_user_str(void *buf, size_t size, const void *unsafe);
// Reads a nul-terminated string from user space safely
```

#### eBPF Program Changes

```rust
// ghostring-ebpf/src/probes.rs - Updated sys_enter_execve

use ghostring_common::{ExecveEvent, MAX_PATH_LEN};

// Current: only command name
#[tracepoint(xdp, "sys_enter_execve")]
pub fn sys_enter_execve(ctx: TracepointContext) -> u64 {
    let pid = helpers::bpf_get_current_pid_tgid() as u32;
    let uid = helpers::bpf_get_current_uid_gid() as u32;
    let timestamp = helpers::bpf_ktime_get_ns();
    
    // Old: just command (16 bytes, truncated)
    let mut command: [u8; 16] = [0; 16];
    let comm_len = helpers::bpf_get_current_comm(&mut command, 16);
    
    // NEW: full path via bpf_probe_read_user_str
    // Requires: GPLv3 license, kernel 5.8+ with BTF
    let mut path_buf: [u8; 256] = [0; 256];
    let path_len = helpers::bpf_probe_read_user_str(
        path_buf.as_mut_ptr() as *mut c_void,
        256,
        ctx.args[5] as *const c_void,  // filename arg from execve
    );
    
    let event = ExecveEvent {
        pid,
        ppid: /* from context */,
        uid,
        gid: /* from context */,
        flags: 0,
        timestamp,
        // Keep command for backward compat, add path
        command,  
        // NOTE: Need to extend ExecveEvent with path field
    };
    
    // Push to ring buffer
    PERF_EVENTS.output(ctx, cpu, &event as *const _ as *mut _);
    
    0
}
```

#### Struct Extension

```rust
// ghostring-common/src/lib.rs - Extended event struct

/// Maximum path length constant
const MAX_PATH_LEN: usize = 256;

// Extended execve event with full path
#[repr(C)]
pub struct ExecveEventExtended {
    /// Core fields (backward compatible)
    pub pid: u32,
    pub ppid: u32,
    pub uid: u32,
    pub gid: u32,
    pub flags: u64,
    pub timestamp: u64,
    /// Truncated command name (16 bytes, for backward compat)
    pub command: [u8; 16],
    /// Full filesystem path (256 bytes, roadmap feature)
    pub path: [u8; 256],
}
```

**Size**: 16 + 16 + 256 + 4 + 4 + 4 + 4 + 8 + 8 = **284 bytes** (was 40 bytes)

#### Compatibility Considerations

| Aspect | Impact | Mitigation |
|---|---|---|
| **Binary compatibility** | Struct size changes from 40 → 284 | Major version bump (0.x.y → 1.0.0) |
| **Downstream consumers** | Need to parse new fields | Provide backward-compatible wrapper |
| **Buffer sizes in user daemon** | Increase from 40 to 284 bytes per event | Update polling code |
| **Perf buffer capacity** | Fewer events fit per buffer | Increase `max_entries` in map definition |
| **Co-existence** | Old and new daemons can't share same buffers | Version field in event struct |

#### Backward Compatibility Strategy

```rust
/// Versioned event struct for co-existence
#[repr(C)]
pub struct ExecveEventV1 {
    /// Version field (for future-proofing)
    pub version: u16,
    
    /// Core fields
    pub pid: u32,
    pub ppid: u32,
    pub uid: u32,
    pub gid: u32,
    pub flags: u64,
    pub timestamp: u64,
    
    /// Command name (16 bytes, always present)
    pub command: [u8; 16],
    
    /// Full path (256 bytes, v1+ feature)
    #[cfg(feature = "path_extraction")]
    pub path: [u8; 256],
    
    /// Padding for future growth
    #[cfg(not(feature = "path_extraction"))]
    pub _reserved: [u8; 256],
}
```

#### User-Space Daemon Updates

```rust
// ghostring/src/events.rs - Updated event handling

fn handle_execve_event(raw: &[u8]) {
    // Check version field first
    let event = unsafe {
        std::ptr::read_unaligned(raw.as_ptr() as *const ExecveEventV1)
    };
    
    let cmd = String::from_utf8_lossy(&event.command[..])
        .trim_end_matches('\0');
    
    // New: check if path extraction enabled
    #[cfg(feature = "path_extraction")]
    let path = {
        let path_str = String::from_utf8_lossy(&event.path[..])
            .trim_end_matches('\0');
        // Only non-empty path indicates v1+ struct
        if !path.is_empty() && path != "." {
            Some(path)
        } else {
            None
        }
    };
    
    // Log with whatever information available
    log::info!(
        "execve: pid={} uid={} cmd={} path={:?}",
        event.pid,
        event.uid,
        cmd,
        path
    );
}
```

#### Performance Impact

| Metric | Before (command only) | After (with path) | Change |
|---|---|---|---|
| **Struct size** | 40 bytes | 284 bytes | +610% |
| **Perf buffer capacity** | More events fit | Fewer events fit | ↓ |
| **eBPF execution time** | ~1-2 μs | ~2-5 μs | +2-3x |
| **Memory overhead per event** | minimal | ~256B extra | Significant |
| **Network/SIEM bandwidth** | Lower | Higher | +610% |
| **Disk storage (if logged)** | Less | More | +610% |

**Trade-off**: Full path extraction significantly increases storage/communication overhead but provides critical security forensic data.

#### Kernel Version Requirements

| Kernel Version | `bpf_probe_read_user_str` Support | GhostRing Support |
|---|---|---|
| **4.14 and earlier** | Not available | ❌ |
| **4.15 - 5.7** | Available but limited | ⚠️ Partial |
| **5.8 - 5.15** | Fully available, recommended | ✅ **Target** |
| **5.16 - 6.1** | Fully available, enhanced | ✅ Supported |
| **6.2+** | Latest, all features | ✅ Supported |

#### Implementation Checklist

- [ ] Add `MAX_PATH_LEN` constant to `ghostring-common`
- [ ] Extend `ExecveEvent` with `path[256]` field (or new struct)
- [ ] Update `build.rs` to ensure GPLv3 license (already required)
- [ ] Modify eBPF probe to call `bpf_probe_read_user_str`
- [ ] Update user-daemon polling to handle larger struct
- [ ] Add backward compatibility version field
- [ ] Bump crate version (major for breaking change)
- [ ] Update documentation (`prerequisites/`)
- [ ] Test on target kernel (5.8+)
- [ ] Benchmark performance impact
- [ ] Add roadmap checkbox `[x]`

---

## Feature 2: Network Socket Observability (tcp_connect kprobes)

### Roadmap Overview

Attach kprobes to `tcp_connect` kernel function to monitor outbound network connections, enabling detection of:
- Reverse-shell attempts
- Unauthorized egress connections
- Command-and-control (C2) communication
- Data exfiltration via network

### kprobe Attachment Points

| Probe Point | Function | Arguments Available |
|---|---|---|
| **Entry** | `tcp_connect` | `struct sock *sk, struct sockaddr *uaddr, int addrlen` |
| **Return** | `tcp_connect` | Return value (`int`): 0 success, negative error |

### eBPF Program Design

```rust
// ghostring-ebpf/src/network.rs - tcp_connect kprobe

use ghostring_common::{NetworkEvent, EventType};
use aya::bindings::socket_addr;

// Entry probe at tcp_connect
#[kprobe(entry = "tcp_connect")]
pub fn tcp_connect_entry(ctx: KprobeContext) -> u64 {
    // Extract source and destination from context
    let sk = ctx.arg(0);  // struct sock *
    
    // Get process info attached to this socket
    let pid = helpers::bpf_get_current_pid_tgid() as u32;
    let uid = helpers::bpf_get_current_uid_gid() as u32;
    
    // Read socket state
    // ... (complex, requires BTF or hardcoded offsets)
    
    // Extract destination address if available
    // ctx.arg(1) = struct sockaddr *uaddr
    // ctx.arg(2) = int addrlen
    
    // Create event (only if we can extract sufficient info)
    // NetworkEvent { ... }
    
    0
}
```

### NetworkEvent Struct

```rust
#[repr(C)]
pub struct NetworkEvent {
    /// Process ID
    pub pid: u32,
    /// User ID
    pub uid: u32,
    /// Event type (connect, disconnect, etc.)
    pub event_type: u8,
    /// Protocol (TCP=1, UDP=2, etc.)
    pub protocol: u8,
    /// Source IP (4 bytes, network byte order)
    pub src_ip: [u8; 4],
    /// Destination IP (4 bytes, network byte order)
    pub dst_ip: [u8; 4],
    /// Source port (2 bytes, network byte order)
    pub src_port: u16,
    /// Destination port (2 bytes, network byte order)
    pub dst_port: u16,
    /// Timestamp
    pub timestamp: u64,
    /// Associated command (16 bytes, truncated)
    pub command: [u8; 16],
}
```

**Size**: 4 + 4 + 1 + 1 + 4 + 4 + 2 + 2 + 8 + 16 = **42 bytes**

### kprobe vs tracepoint for Network

| Aspect | kprobe | tracepoint |
|---|---|---|
| **Availability** | Any kernel function | Static points only |
| **tcp_connect** | ✅ Available | ❌ No tracepoint |
| **Overhead** | Moderate (dynamic registration) | Low (static) |
| **Flexibility** | Any function | Limited to registered points |
| **BTF support** | ✅ Yes | ✅ Yes |
| **GhostRing use** | ✅ Roadmap feature | N/A |

### Address Extraction Challenges

#### Extracting sockaddr_in

```rust
// Simplified: reading user-space address struct from kernel

use aya::helpers::bpf_probe_read;

// Read sockaddr_in from kernel space
let mut sa: socket_addr = unsafe {
    std::mem::zeroed()
};

// Read from user space using BTF-verified read
let ret = bpf_probe_read(
    &mut sa as *mut socket_addr as *mut c_void,
    std::mem::size_of::<socket_addr>(),
    ctx.arg(1) as *const c_void,  // uaddr arg
);

if ret == 0 {
    // Success - sa now contains address info
    let ip = sa.sa_data[2..6];  // IP bytes (AF_INET)
    let port = u16::from_be_bytes([sa.sa_data[0], sa.sa_data[1]]);  // Port
}
```

#### Challenges

1. **Address family detection**: Must check `sa_family` field (AF_INET=2, AF_INET6=10)
2. **User-space read**: `bpf_probe_read_user` required for user memory
3. **IPv4 vs IPv6**: Different struct sizes (4 vs 16 bytes)
4. **Port byte order**: Network byte order (big-endian) vs host

#### BTF-Powered Extraction

With BTF, field access by name:

```rust
// Given BTF-resolved struct socket or tcp_sock
// Access fields by name instead of offset

// Example (conceptual - exact fields depend on kernel version):
let family = btf_resolved_field(&sk, "family");  // AF_INET or AF_INET6
let port = btf_resolved_field(&sk, "__port");   // Port, byte order varies
let addr = btf_resolved_field(&sk, "remote_addr");  // Depending on kernel
```

### Filtering and Classification

#### Event Type Enums

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum NetworkEventType {
    TcpConnectIn = 0x01,   // Outbound TCP connection (initiatior)
    TcpConnectOut = 0x02,  // Inbound TCP connection (responder)
    TcpDisconnect = 0x03,  // TCP close/termination
    UdpSend = 0x04,        // UDP sendto/sendmsg
    UdpRecv = 0x05,        // UDP recvfrom/recvmsg
}
```

#### Classification Logic

```rust
fn classify_network_event(
    event_type: NetworkEventType,
    dst_port: u16,
) -> String {
    // Well-known ports that might indicate suspicious activity
    match dst_port {
        22 => "SSH connection (potential C2 or admin access)".to_string(),
        443 => "HTTPS (normal web, but check for unusual patterns)".to_string(),
        80 => "HTTP (unencrypted web traffic)".to_string(),
        23 => "Telnet (unencrypted, often suspicious)".to_string(),
        4444..=65535 => "High port (potential reverse shell/C2)".to_string(),
        _ => "Generic connection".to_string(),
    }
}
```

### Alerting Rules

| Condition | Alert Level | Description |
|---|---|---|
| **Connection to known C2 port** (e.g., 4444, 1337, 31337) | **HIGH** | Potential reverse shell |
| **Outbound from privileged port** (<1024) by unprivileged process | **MEDIUM** | Process shouldn't have privileged ports |
| **Connection to Tor exit nodes** | **INFO** | Anonymity service, monitor |
| **DNS lookups followed by connection** | **MEDIUM** | Potential data exfiltration pattern |
| **Multiple connections within 10s** | **HIGH** | Potential scanning or brute force |
| **Connection to internal IP from external** | **HIGH** | Unusual egress pattern |
| **All other connections** | **LOW** | Informational logging |

### Performance Considerations

| Metric | Estimate | Notes |
|---|---|---|
| **kprobe registration overhead** | ~1-3 μs per probe | One-time at load |
| **kprobe firing frequency** | Depends on traffic | ~1K-1M events/sec typical |
| **eBPF program execution** | ~2-5 μs per probe | Includes data extraction |
| **Ring buffer write** | ~1-3 μs | Per event |
| **User-space poll overhead** | ~50-200 μs per poll cycle | Depends on batch size |
| **Total CPU overhead** | <5% at moderate traffic | Goal for production use |
| **Memory overhead per event** | 42 bytes (NetworkEvent) | +perf buffer |

### Kernel Version Support

| Kernel Version | kprobe Support | BTF Support | GhostRing Support |
|---|---|---|---|
| **4.15** | ✅ | ✅ (limited) | ⚠️ Early support |
| **4.19** | ✅ | ✅ improved | ⚠️ |
| **5.4** | ✅ | ✅ good | ✅ Supported |
| **5.10** | ✅ | ✅ better BTF | ✅ Recommended |
| **5.15** | ✅ | ✅ strong BTF | ✅ **Target** |
| **6.1+** | ✅ | ✅ full | ✅ Supported |

### Implementation Checklist - Network Feature

- [ ] Add `NetworkEvent` struct to `ghostring-common`
- [ ] Add `NetworkEventType` enum to `ghostring-common`
- [ ] Create `ghostring-ebpf/src/network.rs` with kprobe attachment
- [ ] Write `tcp_connect` entry/return probe logic
- [ ] Extract source/dest IP and port from socket context
- [ ] Add BTF-powered address reading (if kernel supports)
- [ ] Update `build.rs` license (already GPLv3)
- [ ] Modify user-daemon to handle `NetworkEvent` type
- [ ] Implement classification/alerting logic
- [ ] Add CLI flags for filter configuration
- [ ] Benchmark performance on target workloads
- [ ] Test with various connection types (tcp, udp)
- [ ] Update roadmap checkboxes
- [ ] Document in `prerequisites/`

---

## Feature 3: File Integrity Monitoring (sys_enter_openat)

### Roadmap Overview

Instrument `sys_enter_openat` to track file access targeting sensitive system configuration files (`/etc/shadow`, `/etc/passwd`, SSH authorized keys, etc.).

### Probe Attachment

| Probe Point | Function | Arguments |
|---|---|---|
| **Entry** | `sys_enter_openat` | `int olddfd, const char __user *filename, int flags, int mode` |
| **Return** | `sys_openat` | `return_value` (= fd or negative error) |

### sys_enter_openat Arguments

| Argument | Type | Description |
|---|---|---|
| `olddfd` | `int` | Old directory fd (AT_FDCWD = -100) |
| `filename` | `const char __user *` | User-space string (file path) |
| `flags` | `int` | Open flags (O_RDONLY, O_WRONLY, O_RDWR, etc.) |
| `mode` | `int` | File mode (for creation) |

### eBPF Program Design

```rust
// ghostring-ebpf/src/file_monitor.rs - sys_enter_openat probe

use ghostring_common::{FileEvent, FileEventType, FileFlags};
use aya::helpers::bpf_probe_read_user_str;

#[tracepoint(xdp, "sys_enter_openat")]
pub fn sys_enter_openat(ctx: TracepointContext) -> u64 {
    let pid = helpers::bpf_get_current_pid_tgid() as u32;
    let uid = helpers::bpf_get_current_uid_gid() as u32;
    let timestamp = helpers::bpf_ktime_get_ns();
    
    // Read filename from user space
    // ctx.args[1] = const char __user *filename
    let mut filename: [u8; 256] = [0; 256];
    
    let read_ret = bpf_probe_read_user_str(
        filename.as_mut_ptr() as *mut c_void,
        256,
        ctx.args[1] as *const c_void,
    );
    
    let file_str = if read_ret > 0 {
        String::from_utf8_lossy(&filename[..read_ret.min(255)])
            .trim_end_matches('\0')
            .to_string()
    } else {
        "<read_failed>".to_string()
    };
    
    // Classify file path
    let event_type = classify_file_path(&file_str);
    
    let flags = ctx.args[3] as u64;  // flags argument
    
    let event = FileEvent {
        pid,
        ppid: /* from context */,
        uid,
        gid: /* from context */,
        event_type,
        filename: file_str,
        flags,
        timestamp,
    };
    
    PERF_EVENTS.output(ctx, cpu, &event as *const _ as *mut _);
    
    0
}
```

### FileEvent Struct

```rust
#[repr(C)]
pub struct FileEvent {
    /// Process ID
    pub pid: u32,
    /// Parent PID
    pub ppid: u32,
    /// User ID
    pub uid: u32,
    /// Group ID
    pub gid: u32,
    /// Event type (open, create, mkdir, etc.)
    pub event_type: u8,
    /// File path (256 bytes, may be truncated)
    pub filename: [u8; 256],
    /// Open flags (O_RDONLY, etc.)
    pub flags: u64,
    /// Timestamp
    pub timestamp: u64,
}
```

**Size**: 4 + 4 + 4 + 4 + 1 + 256 + 8 + 8 = **287 bytes**

### FileEventType Enumeration

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum FileEventType {
    OpenRead = 0x01,      // O_RDONLY
    OpenWrite = 0x02,     // O_WRONLY
    OpenReadWrite = 0x03, // O_RDWR
    Mkdir = 0x04,         // Directory creation
    Mknod = 0x05,         // Device node creation
    Symlink = 0x06,       // Symbolic link creation
    Unlink = 0x07,        // File deletion
    Rename = 0x08,        // File renaming
    Chmod = 0x09,         // Permission change
    Chown = 0x0A,         // Owner change
    Truncate = 0x0B,      // File truncation
}
```

### Sensitive File Classification

```rust
/// Sensitive paths that trigger enhanced monitoring
const SENSITIVE_PATHS: &[&str] = &[
    "/etc/shadow",
    "/etc/gshadow",
    "/etc/passwd",
    "/etc/security/",
    "/root/.ssh/authorized_keys",
    "/root/.ssh/id_rsa",
    "/root/.ssh/id_ecdsa",
    "/root/.ssh/id_ed25519",
    "/etc/sudoers",
    "/etc/sudoers.d/",
    "/var/db/sudo/",
    "/etc/apparmor/*",
    "/etc/selinux/",
    "/etc/ssh/sshd_config",
    "/boot/",               // Boot configuration
    "/kernel/",             // Kernel parameters
];

fn is_sensitive_path(path: &str) -> bool {
    SENSITIVE_PATHS.iter().any(|s| path.starts_with(s))
}

fn classify_file_path(path: &str) -> u8 {
    if is_sensitive_path(path) {
        FileEventType::OpenWrite as u8  // or a sensitive flag
    } else {
        // Determine from flags and path type
        match path {
            p if p.ends_with("/") => FileEventType::Mkdir as u8,
            p if p.contains(".") && !p.contains("/") => FileEventType::OpenRead as u8,
            _ => FileEventType::OpenReadWrite as u8,
        }
    }
}
```

### Alert Prioritization

| File Type | Event Type | Alert Level | Rationale |
|---|---|---|---|
| `/etc/shadow` | Any | **CRITICAL** | Password file modification |
| `/etc/passwd` | Any | **CRITICAL** | User account modification |
| `/root/.ssh/authorized_keys` | Write | **HIGH** | SSH key insertion (C2 setup) |
| `/etc/sudoers` | Write | **HIGH** | Privilege escalation |
| `/etc/ssh/sshd_config` | Write | **HIGH** | SSH server modification |
| `/boot/` | Any | **MEDIUM** | Boot integrity |
| `/etc/apparmor/*` | Write | **MEDIUM** | AppArmor profile change |
| All other sensitive | Any | **LOW** | Informational |
| Non-sensitive | Any | **INFO** | Logging only |

### Integration with Existing Event Pipeline

```rust
// In the user-daemon event handler, route FileEvent alongside ExecveEvent

enum Event {
    Execve(ExecveEvent),
    UidGid(UidGidEvent),
    Network(NetworkEvent),
    File(FileEvent),
    // Future variants
}

impl Event {
    /// Check if event involves sensitive file
    fn is_sensitive(&self) -> bool {
        match self {
            Event::File(f) => {
                // Check if path is in sensitive list
                let path = String::from_utf8_lossy(&f.filename[..])
                    .trim_end_matches('\0');
                is_sensitive_path(&path)
            }
            _ => false,
        }
    }
    
    /// Get alert level for event
    fn alert_level(&self) -> &'static str {
        match self {
            Event::File(f) => {
                let path = String::from_utf8_lossy(&f.filename[..])
                    .trim_end_matches('\0');
                classify_sensitivity(&path)
            }
            _ => "INFO",
        }
    }
}
```

### Performance Impact

| Metric | Estimate | Notes |
|---|---|---|
| **Struct size** | 287 bytes | Significant increase from ExecveEvent (40B) |
| **eBPF overhead** | ~3-5 μs per openat | Includes string read from user space |
| **Kernel impact** | <3% CPU at moderate usage | openat is common syscall |
| **Buffer capacity** | Reduced (larger events) | Increase `max_entries` |
| **User-space parse** | ~5-10 μs per event | String decoding overhead |
| **Total storage increase** | ~600% more per event | 287B vs 40B |

### Kernel Version Support

| Kernel Version | sys_openat Support | BTF Support | GhostRing Support |
|---|---|---|---|
| **4.15** | ✅ | ✅ limited | ⚠️ |
| **4.19** | ✅ | ✅ improved | ⚠️ |
| **5.4** | ✅ | ✅ good | ✅ Supported |
| **5.10** | ✅ | ✅ better | ✅ Recommended |
| **5.15** | ✅ | ✅ strong | ✅ **Target** |
| **6.1+** | ✅ | ✅ full | ✅ Supported |

### Implementation Checklist - File Monitoring

- [ ] Add `FileEvent` struct to `ghostring-common`
- [ ] Add `FileEventType` enum to `ghostring-common`
- [ ] Add `FileFlags` bitflags helper
- [ ] Create `ghostring-ebpf/src/file_monitor.rs` with sys_enter_openat probe
- [ ] Write sensitive path classification logic
- [ ] Update user-daemon to handle `FileEvent` type
- [ ] Implement alert prioritization system
- [ ] Add CLI flags for sensitive path configuration
- [ ] Update `build.rs` license (already GPLv3)
- [ ] Bump crate versions as needed
- [ ] Update documentation (`prerequisites/`)
- [ ] Test on target kernel (5.15+ recommended)
- [ ] Benchmark syscall overhead
- [ ] Add roadmap checkboxes
- [ ] Document in project docs

---
*This document covers GhostRing roadmap features deep dive. For eBPF programming, see `prerequisites/ebpf-internals.md`. For Aya framework, see `prerequisites/aya-framework.md`. For struct definitions, see `prerequisites/ghostring-common-structs.md`. For build system, see `prerequisites/build-system-workspace.md`.*