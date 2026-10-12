# ghostring User-Space Daemon Deep Dive

## Tokio Async Architecture

The `ghostring` user-space daemon is built on **Tokio**, the asynchronous runtime for Rust. This section covers the deep architectural patterns used.

### Runtime Configuration

```toml
# ghostring/Cargo.toml
[dependencies]
tokio = { version = "1.38", features = [
    "full",        // Complete Tokio stack
    "rt-multi-thread", // Multi-threaded runtime
    "macros",      // for async/await
] }
```

### Multi-Threaded Runtime Setup

```rust
// Main entry point - runtime creation
use tokio::runtime::Builder;
use std::num::NonZeroUsize;

fn init_runtime() -> tokio::runtime::Runtime {
    Builder::new_multi_threaded()
        .worker_threads(num_cpus::get())  // One thread per CPU
        .thread_name("ghostring-Worker") // Naming for debugging
        .enable_all()                    // Enable all Tokio features
        .build()
        .expect("Failed to create Tokio runtime")
}
```

### Runtime Lifecycle

| Phase | Description |
|---|---|
| **Init** | Create runtime, spawn tasks, load eBPF |
| **Run** | Event loop, poll ring buffers, process events |
| **Shutdown** | Graceful stop, unload eBPF, flush buffers |

## Related Knowledge

This daemon architecture connects to many other knowledge base entries:

- [[architecture-overview.md]]: Crate responsibilities and pipeline overview
- [[event-transport.md]]: Telemetry pipeline and PerfEventArray polling
- [[aya-framework.md]]: Aya crate for eBPF program loading and ring buffer setup
- [[build-system-workspace.md]]: Build pipeline and CI/CD configuration
- [[testing-strategy.md]]: Integration and end-to-end testing approach
- [[troubleshooting-guide.md]]: Common runtime issues and diagnostics
- [[roadmap-features-deep.md]]: Roadmap features affecting daemon (JSON export, alert routing)
- [[prerequisites/README.md]]: This vault index

## Ring Buffer Polling Implementation

### Per-CPU Iteration Strategy

The daemon must poll **each CPU's ring buffer** since `PerfEventArray` creates one buffer per CPU:

```rust
use aya::maps::PerfEventArray;
use aya::util::offsets::Offsets;

struct GhostRingDaemon {
    // Maps - one per event type
    exec_events: PerfEventArray,
    uid_gid_events: PerfEventArray,
    // ... other maps
}

impl GhostRingDaemon {
    /// Poll all per-CPU ring buffers
    async fn poll_all_cpus(&self) -> Result<(), aya::Error> {
        let num_cpus = num_cpus::get();
        
        for cpu in 0..num_cpus {
            // Try poll for this CPU's ring buffer
            if let Ok(len) = self.exec_events.try_poll(cpu, |data| {
                // Callback: parse and queue event
                self.process_event_data(data);
            }) {
                // `len` events processed for this CPU
                // May be 0 if no data available
            }
        }
        
        Ok(())
    }
}
```

### Polling Granularity

| Granularity | Description | Use Case |
|---|---|---|
| **Per-CPU** | Iterate all CPUs | Default, comprehensive |
| **Online CPUs Only** | Skip offline/isolated | Power-saving scenarios |
| **CPU Mask** | Poll selected CPUs | Affinity-based monitoring |
| **Single-CPU** | Debug only | Development and testing |

### Batch Processing

Events are pulled in batches for efficiency:

```rust
// Process multiple events per poll cycle
fn process_batch(events: &[u8], batch_size: usize) {
    let mut offset = 0;
    while offset < events.len() && offset < batch_size {
        // Each ExecveEvent is 40 bytes (fixed by #[repr(C)])
        let event_size = std::mem::size_of::<ExecveEvent>();
        
        if offset + event_size > events.len() {
            break; // Incomplete event, stop
        }
        
        // Safe cast because of #[repr(C)]
        let event = unsafe {
            std::ptr::read_unaligned(events.as_ptr().add(offset) as *const ExecveEvent)
        };
        
        // Handle event
        self.handle_event(event);
        
        offset += event_size;
    }
}
```

### Backpressure and Buffer Full

```rust
// Handle ring buffer full condition
fn handle_buffer_full(cpu: usize) {
    // Options:
    // 1. Drop oldest events (overwrite policy)
    // 2. Block and wait for space
    // 3. Log warning and continue
    // 4. Increase buffer size via bpf_linker reconfig
    
    log::warn!("Ring buffer full on CPU{}", cpu);
}
```

## Event Processing Pipeline

### From Raw Bytes to Structured Data

```
┌─────────────────────────────────────────────────────────┐
│  Raw bytes from PerfEventArray ring buffer              │
├─────────────────────────────────────────────────────────┤
│  1. Validate minimum size                                │
│  2. Cast to #[repr(C)] struct (unsafe, but safe due    │
│     to verifier guarantees)                             │
│  3. Extract command name (find null terminator in [16]) │
│  4. Map EventType enum                                   │
│  5. Route to handler based on type                       │
│  6. Log, alert, or export                                │
└─────────────────────────────────────────────────────────┘
```

### Event Handler Dispatch

```rust
enum Event {
    Execve(ExecveEvent),
    UidGid(UidGidEvent),
    // Future: Openat, TcpConnect, etc.
}

fn dispatch_event(raw: &[u8]) -> Option<Event> {
    // Minimum size check
    if raw.len() < std::mem::size_of::<ExecveEvent>() {
        return None; // Corrupted or truncated data
    }
    
    // Safe read because of #[repr(C)] guarantee
    let event = unsafe {
        std::ptr::read_unaligned(raw.as_ptr() as *const ExecveEvent)
    };
    
    // Determine event type from flags or other marker
    // Currently only ExecveEvent is defined
    Some(Event::Execve(event))
}
```

### Handler Implementations

```rust
impl Event {
    /// Log event to stderr/syslog
    fn log(&self) {
        match self {
            Event::Execve(e) => {
                let cmd = String::from_utf8_lossy(&e.command[..])
                    .trim_end_matches('\0');
                log::info!(
                    "execve: pid={} uid={} comm={}",
                    e.pid, e.uid, cmd
                );
            }
            Event::UidGid(e) => {
                log::info!(
                    "uid_gid: pid={} uid={} gid={}",
                    /* extract pid from context */, e.uid, e.gid
                );
            }
        }
    }
    
    /// Alert on suspicious patterns
    fn alert(&self) {
        // TODO: Implement alert routing
    }
    
    /// Export as JSON for SIEM
    fn to_json(&self) -> serde_json::Value {
        match self {
            Event::Execve(e) => {
                serde_json::json!({
                    "type": "execve",
                    "pid": e.pid,
                    "uid": e.uid,
                    "comm": String::from_utf8_lossy(&e.command[..]).trim_end_matches('\0'),
                    "timestamp": e.timestamp,
                })
            }
            // ... other variants
        }
    }
}
```

## CLI Integration

### Argument Parsing with clap

```rust
use clap::{App, Arg, Subcommand};

fn build_cli() -> App<'static, 'static> {
    App::new("GhostRing")
        .version("0.1.0")
        .about("Linux security observability daemon via eBPF")
        .arg(
            Arg::new("verbose")
                .short('v')
                .long("verbose")
                .help("Set verbose logging"),
        )
        .arg(
            Arg::new("json")
                .short('j')
                .long("json")
                .help("Output events as JSON"),
        )
        .subcommand(
            Subcommand::new("attach")
                .about("Attach eBPF programs to kernel probes"),
        )
}
```

### Common CLI Flags

| Flag | Short | Description |
|---|---|---|
| `--verbose` / `-v` | | Increase log verbosity |
| `--json` / `-j` | | JSON output format |
| `--version` | | Print version and exit |
| `--help` / `-h` | | Print usage information |
| `--bpf-path` | | Path to eBPF bytecode (default: built path) |
| `--log-level` | | Set log level (debug, info, warn, error) |

### Output Format Options

```rust
enum OutputFormat {
    /// Plain text (default)
    Text,
    /// Structured JSON
    Json,
    /// Key-value pairs
    Kv,
}
```

### Example CLI Usage

```bash
# Default - text logging to stderr
sudo cargo run --release

# JSON output for pipeline feeding
sudo -E cargo run --release -- -j

# Verbose debug output
sudo -E cargo run --release -v

# Custom eBPF binary path
sudo -E cargo run --release -- -b /path/to/ghostring_ebpf
```

## Logging Architecture

### Log Levels and Targets

```rust
// Log configuration
pub fn init_logging() -> Result<(), std::io::Error> {
    use tracing_subscriber::{fmt, EnvFilter};
    
    // Initialize fmt subscriber
    let fmt_layer = fmt::layer::default().pretty();
    
    // Parse environment filter
    let env_filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new("info"))
        .unwrap();
    
    // Combine and install
    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .init();
    
    Ok(())
}
```

### Log Output Format

**Pretty format (development)**:
```
[2024-01-15T10:30:45Z INFO ghostring] execve: pid=1234 uid=0 comm=sudo
```

**Compact format (production)**:
```
ghostring execve pid=1234 uid=0 comm=sudo
```

**JSON format** (with `--json` flag):
```json
{"type":"execve","pid":1234,"uid":0,"comm":"sudo","timestamp":1705312245}
```

### Tracing Integration

```rust
use tracing::{info, warn, error, debug};

// Structured logging with fields
info!("execve event", 
    pid = event.pid, 
    uid = event.uid, 
    comm = %event.command_str,
    result = "success"
);

// Error with context
error!("failed to poll ring buffer", 
    cpu = cpu_idx, 
    error = %err,
    retry_after_ms = 5000
);
```

## Shutdown and Graceful Stop

### Signal Handling

```rust
use tokio::signal;

async fn run_daemon(runtime: Runtime) -> Result<(), Box<dyn std::error::Error>> {
    // Start the main event loop
    let daemon = GhostRingDaemon::new()?;
    
    // Spawn the polling task
    let poll_task = tokio::spawn(async move {
        daemon.poll_all_cpus().await.unwrap();
    });
    
    // Wait for shutdown signal
    let _ = tokio::signal::ctrl_c().await;
    
    // Graceful shutdown
    log::info!("Received shutdown signal, stopping...");
    
    // Stop the poller
    poll_task.abort();
    
    // Unload eBPF programs
    daemon.unload_ebpf().await?;
    
    log::info!("GhostRing daemon stopped gracefully");
    
    Ok(())
}
```

### Cleanup Requirements

| Action | Timing | Responsibility |
|---|---|---|
| **Unload eBPF** | On shutdown | Daemon task |
| **Free ring buffers** | On shutdown | Daemon task |
| **Flush pending events** | Before exit | Daemon task |
| **Close file descriptors** | On exit | OS auto-cleanup, but explicit is better |
| **Restore kernel state** | On exit | eBPF unload restores state |

### Watchdog Timer

```rust
// Optional: detect hangs
use tokio::time::{timeout, Duration};

async fn with_watchdog<F, T>(
    future: F,
    timeout_ms: u64,
) -> Result<T, tokio::time::error::Elapsed>
where
    F: std::future::Future<Output = Result<T, some_error::Type>>,
{
    timeout(Duration::from_millis(timeout_ms), future).await
}
```

## Performance Optimizations

### Polling Interval Tuning

| Scenario | Recommended Interval | Rationale |
|---|---|---|
| **Development** | 1ms | Frequent checks, easy debugging |
| **Production light** | 5ms | Low overhead, reasonable latency |
| **Production heavy** | 10-20ms | Minimize polling overhead |
| **Low-latency** | 1ms max | Critical response time |
| **High-throughput** | 20ms+ | Maximize batch size |

### Batch Size Impact

| Batch Size | Events/Poll | CPU Overhead | Latency |
|---|---|---|---|
| 1 | 1 | Minimal | Low |
| 8 | 8 | Low | Low |
| 32 | 32 | Low-Moderate | Moderate |
| 128 | 128 | Moderate | Higher |
| 256+ | 256+ | High | Highest |

### CPU Affinity

```rust
// Bind polling thread to specific CPU
use std::thread;
use libc;

fn set_cpu_affinity(cpu: usize) -> Result<(), String> {
    unsafe {
        let cpuset = cpu_set_t::();
        CPU_ZERO(&mut cpuset);
        CPU_SET(cpu, &mut cpuset);
        
        let ret = sched_setaffinity(0, &cpuset.size(), &cpuset);
        if ret != 0 {
            Err(format!("Failed to set CPU affinity: {}", std::io::Error::last().raw_os_error().unwrap_or(0)))
        } else {
            Ok(())
        }
    }
}
```

### Zero-Copy Principle

The entire pipeline avoids copies:

```
Kernel eBPF program
  │
  ▼
PerfEventArray ring buffer (shared memory)
  │
  ▼
User-space daemon reads directly (mmap-backed)
  │
  ▼
unsafe cast to #[repr(C)] struct (no allocation)
  │
  ▼
Process fields, log/export
  │
  ▼
No intermediate buffers or clones
```

## Monitoring and Metrics

### Internal Metrics Exposure

```rust
// Metrics structure for observability
struct DaemonMetrics {
    /// Events processed per second
    events_per_sec: AtomicU64,
    /// Events dropped (buffer full)
    events_dropped: AtomicU64,
    /// Polling latency (ms)
    poll_latency: HistogramVec,
    /// CPU utilization percentage
    cpu_usage: AtomicF64,
    /// Connected clients/sinks
    active_clients: AtomicUsize,
}
```

### Prometheus Integration (Roadmap)

```rust
// Future: export via HTTP endpoint
fn start_metrics_server(metrics: DaemonMetrics, addr: SocketAddr) {
    use tide::Server;
    use tide_prometheus::PrometheusMetricsMiddleware;
    
    let mut server = Server::new(addr);
    let metrics_middleware = PrometheusMetricsMiddleware::new("ghostring", metrics);
    server.with(metrics_middleware);
    
    // GET /metrics endpoint
    server.get("/metrics", |_| async move { metrics_middleware.response() });
    
    server.serve().await;
}
```

## Debugging the User-Space Daemon

### Common Issues and Diagnostics

| Symptom | Likely Cause | Diagnostic |
|---|---|---|
| "No events appearing" | eBPF not loaded | `sudo bpftool prog show` |
| "Buffer overflow errors" | Ring buffer too small | Increase `max_entries` |
| "Permission denied" | Missing caps | Check CAP_SYS_ADMIN |
| "High CPU usage" | Polling too frequently | Increase interval |
| "Missing command names" | Truncation at 16 bytes | Check `command[16]` handling |
| "Wrong PID values" | Context register confusion | Verify `bpf_get_current_pid_tgid` |

### Tracing Enablement

```rust
// Enable extra tracing for debugging
fn enable_debug_tracing() {
    use tracing_subscriber::filter::LevelFilter;
    
    // Set global filter to debug
    tracing::subscriber::set_global_default(
        tracing_subscriber::fmt::Subscriber::builder()
            .with_max_level(LevelFilter::Debug)
            .finish()
    ).expect("Failed to set tracing subscriber");
}
```

### Backtrace on Panics

```rust
// In Cargo.toml (dev dependency)
[dependencies.dev]
tracing = "0.1.38"
tracing-subscriber = "0.3.17"

// Setup panic handler
fn panic_hook(info: &std::panic::PanicInfo) {
    error!("GhostRing panicked: {:?}", info);
    std::process::exit(1);
}
```

---
*This document covers the ghostring user-space daemon architecture. For eBPF program details, see `prerequisites/ebpf-internals.md`. For struct definitions, see `prerequisites/ghostring-common-structs.md`.*