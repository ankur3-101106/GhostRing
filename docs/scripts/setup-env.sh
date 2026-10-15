#!/usr/bin/env bash
# GhostRing Isolated Build Environment Setup Script
# Installs Rust Nightly, rust-src, and bpf-linker directly inside .build-env/
# without modifying the host system's global toolchain.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_DIR="$PROJECT_ROOT/.build-env"
RUSTUP_DIR="$ENV_DIR/rustup"
CARGO_DIR="$ENV_DIR/cargo"
BIN_DIR="$CARGO_DIR/bin"

echo "========================================================"
echo " GhostRing: Initializing Isolated Build Environment"
echo " Target Directory: $ENV_DIR"
echo "========================================================"

# 1. Verify System Prerequisites
echo "[1/6] Checking system requirements..."
if [ ! -f /sys/kernel/btf/vmlinux ]; then
    echo "WARNING: /sys/kernel/btf/vmlinux not found. Kernel BTF support is recommended for CO-RE."
fi

for cmd in curl tar zstd; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "ERROR: Required utility '$cmd' is not installed."
        exit 1
    fi
done

# 2. Prepare Directories
echo "[2/6] Preparing isolated environment directories..."
mkdir -p "$RUSTUP_DIR" "$CARGO_DIR" "$BIN_DIR"

# 3. Setup Rustup and Nightly Toolchain
echo "[3/6] Installing Rust Nightly with rust-src component..."
RUSTUP_BIN="$(command -v rustup || echo "$HOME/.cargo/bin/rustup")"
if [ ! -x "$RUSTUP_BIN" ]; then
    echo "Host rustup not found. Downloading rustup-init..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    RUSTUP_BIN="$HOME/.cargo/bin/rustup"
fi

cp -f "$RUSTUP_BIN" "$BIN_DIR/rustup"

RUSTUP_HOME="$RUSTUP_DIR" CARGO_HOME="$CARGO_DIR" "$BIN_DIR/rustup" toolchain install nightly --component rust-src
RUSTUP_HOME="$RUSTUP_DIR" CARGO_HOME="$CARGO_DIR" "$BIN_DIR/rustup" default nightly

# 4. Install Static bpf-linker
echo "[4/6] Installing bpf-linker (statically-linked LLVM binary)..."
BPF_LINKER_VERSION="v0.12.0"
BPF_LINKER_URL="https://github.com/aya-rs/bpf-linker/releases/download/${BPF_LINKER_VERSION}/bpf-linker-x86_64-unknown-linux-musl.tar.zst"
TMP_ARCHIVE="/tmp/bpf-linker-${BPF_LINKER_VERSION}.tar.zst"

curl -sSL "$BPF_LINKER_URL" -o "$TMP_ARCHIVE"
tar -I zstd -xf "$TMP_ARCHIVE" -C "$BIN_DIR"
chmod +x "$BIN_DIR/bpf-linker"
rm -f "$TMP_ARCHIVE"

# 5. Generate Helper Scripts
echo "[5/6] Generating environment activation and wrapper scripts..."

cat << 'EOF' > "$ENV_DIR/activate"
# GhostRing Isolated Build Environment Activation Script
# Usage: source .build-env/activate

deactivate_ghostring() {
    if [ -n "$_OLD_GHOSTRING_PATH" ]; then
        export PATH="$_OLD_GHOSTRING_PATH"
        unset _OLD_GHOSTRING_PATH
    fi
    if [ -n "$_OLD_GHOSTRING_RUSTUP_HOME" ]; then
        export RUSTUP_HOME="$_OLD_GHOSTRING_RUSTUP_HOME"
        unset _OLD_GHOSTRING_RUSTUP_HOME
    else
        unset RUSTUP_HOME
    fi
    if [ -n "$_OLD_GHOSTRING_CARGO_HOME" ]; then
        export CARGO_HOME="$_OLD_GHOSTRING_CARGO_HOME"
        unset _OLD_GHOSTRING_CARGO_HOME
    else
        unset CARGO_HOME
    fi
    if [ -n "$_OLD_GHOSTRING_PS1" ]; then
        export PS1="$_OLD_GHOSTRING_PS1"
        unset _OLD_GHOSTRING_PS1
    fi
    unset -f deactivate_ghostring
    echo "GhostRing build environment deactivated."
}

_GHOSTRING_ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Save current environment
export _OLD_GHOSTRING_PATH="$PATH"
export _OLD_GHOSTRING_RUSTUP_HOME="${RUSTUP_HOME:-}"
export _OLD_GHOSTRING_CARGO_HOME="${CARGO_HOME:-}"
export _OLD_GHOSTRING_PS1="${PS1:-}"

# Configure isolated toolchain paths
export RUSTUP_HOME="$_GHOSTRING_ENV_DIR/rustup"
export CARGO_HOME="$_GHOSTRING_ENV_DIR/cargo"
export PATH="$_GHOSTRING_ENV_DIR/cargo/bin:$_GHOSTRING_ENV_DIR/rustup/toolchains/nightly-x86_64-unknown-linux-gnu/bin:$PATH"

if [ -n "${PS1:-}" ]; then
    export PS1="(ghostring-env) $PS1"
fi

echo "========================================================"
echo " GhostRing isolated build environment activated!"
echo " Rust toolchain: $(rustc --version)"
echo " Cargo home:     $CARGO_HOME"
echo " Rustup home:    $RUSTUP_HOME"
echo " Type 'deactivate_ghostring' to exit environment."
echo "========================================================"
EOF

cat << 'EOF' > "$ENV_DIR/run.sh"
#!/usr/bin/env bash
# GhostRing Isolated Environment Command Runner
# Usage: ./.build-env/run.sh <command> [args...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export RUSTUP_HOME="$SCRIPT_DIR/rustup"
export CARGO_HOME="$SCRIPT_DIR/cargo"
export PATH="$SCRIPT_DIR/cargo/bin:$SCRIPT_DIR/rustup/toolchains/nightly-x86_64-unknown-linux-gnu/bin:$PATH"

exec "$@"
EOF

chmod +x "$ENV_DIR/run.sh"

# 6. Verification
echo "[6/6] Verifying toolchain..."
"$ENV_DIR/run.sh" rustc --version
"$ENV_DIR/run.sh" cargo --version
"$ENV_DIR/run.sh" bpf-linker --version

echo "========================================================"
echo " Build environment setup complete!"
echo " Activate via:   source .build-env/activate"
echo " Or run with:    ./.build-env/run.sh <command>"
echo "========================================================"
