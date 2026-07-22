#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# TOPEMS sccache setup for Rust builds
#
# Configures sccache as the rustc wrapper to dramatically reduce CI build
# time by reusing compilation artifacts across jobs and runners.
#
# Usage:
#   bash scripts/sccache-setup.sh                 # local (file backend, ~/.cache/sccache)
#   SCCACHE_BUCKET=my-bucket bash scripts/sccache-setup.sh
#   SCCACHE_BACKEND=redis SCCACHE_REDIS=redis://host:6379 bash scripts/sccache-setup.sh
#   bash scripts/sccache-setup.sh --stats         # show cache stats at the end
#   bash scripts/sccache-setup.sh --stop          # print final stats then exit
#
# Environment:
#   SCCACHE_BUCKET   S3 bucket name (enables s3 backend)
#   SCCACHE_REGION   AWS region for the S3 bucket (default: us-east-1)
#   SCCACHE_BACKEND  Force a specific backend (s3|redis|local)
#   SCCACHE_REDIS    Redis URL when backend=redis
#   SCCACHE_DIR      Local cache directory (default: ~/.cache/sccache)
#   SCCACHE_SIZE     Max local cache size, e.g. "10G" (default: 5G)
#
# Exit codes:
#   0 - success
#   1 - sccache install failed
#   2 - backend misconfiguration
# ---------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Args
# ---------------------------------------------------------------------------

PRINT_STATS=false
STOP_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --stats) PRINT_STATS=true ;;
    --stop)  STOP_ONLY=true ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------

if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  GREEN=$(tput setaf 2)
  YELLOW=$(tput setaf 3)
  RED=$(tput setaf 1)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  GREEN=""; YELLOW=""; RED=""; BOLD=""; RESET=""
fi

log()   { echo "[sccache] $*"; }
warn()  { echo "${YELLOW}[sccache] WARN:${RESET} $*" >&2; }
err()   { echo "${RED}[sccache] ERROR:${RESET} $*" >&2; }

# ---------------------------------------------------------------------------
# Detect platform
# ---------------------------------------------------------------------------

OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS" in
  Linux)  PLATFORM="unknown-linux-gnu" ;;
  Darwin) PLATFORM="apple-darwin" ;;
  *)      err "Unsupported OS: $OS"; exit 1 ;;
esac
log "Detected platform: $OS / $ARCH ($PLATFORM)"

# ---------------------------------------------------------------------------
# Stop-only mode: print stats then exit
# ---------------------------------------------------------------------------

if $STOP_ONLY; then
  if command -v sccache >/dev/null 2>&1; then
    sccache --show-stats || true
  else
    warn "sccache not installed; nothing to report"
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# Install sccache if missing
# ---------------------------------------------------------------------------

SCCACHE_BIN="${SCCACHE_BIN:-$(command -v sccache || true)}"

install_sccache() {
  if command -v cargo >/dev/null 2>&1; then
    log "Installing sccache via cargo install sccache --locked"
    cargo install sccache --locked
    SCCACHE_BIN="$(command -v sccache)"
    return
  fi
  err "cargo is not on PATH and sccache is not installed."
  err "Install Rust (https://rustup.rs) or download a release from"
  err "https://github.com/mozilla/sccache/releases"
  exit 1
}

if [[ -z "$SCCACHE_BIN" ]]; then
  log "sccache not found on PATH; attempting install"
  install_sccache
fi

if [[ ! -x "$SCCACHE_BIN" ]]; then
  err "sccache binary at '$SCCACHE_BIN' is not executable"
  exit 1
fi
log "Using sccache: $SCCACHE_BIN ($("$SCCACHE_BIN" --version 2>/dev/null | head -1))"

# ---------------------------------------------------------------------------
# Choose backend
# ---------------------------------------------------------------------------

SCCACHE_DIR="${SCCACHE_DIR:-$HOME/.cache/sccache}"
SCCACHE_SIZE="${SCCACHE_SIZE:-5G}"
mkdir -p "$SCCACHE_DIR"

if [[ -n "${SCCACHE_BACKEND:-}" ]]; then
  BACKEND="$SCCACHE_BACKEND"
elif [[ -n "${SCCACHE_BUCKET:-}" ]]; then
  BACKEND="s3"
elif [[ -n "${SCCACHE_REDIS:-}" ]]; then
  BACKEND="redis"
else
  BACKEND="local"
fi

case "$BACKEND" in
  s3)
    if [[ -z "${SCCACHE_BUCKET:-}" ]]; then
      err "SCCACHE_BUCKET must be set when using the s3 backend"
      exit 2
    fi
    export SCCACHE_BUCKET
    export SCCACHE_REGION="${SCCACHE_REGION:-us-east-1}"
    # On CI (GitHub Actions), prefer OIDC + instance role
    if [[ -n "${GITHUB_ACTIONS:-}" ]] || [[ -n "${AWS_ROLE_ARN:-}" ]]; then
      export SCCACHE_S3_USE_SIGV4="true"
    fi
    log "Backend: s3 (bucket=$SCCACHE_BUCKET, region=${SCCACHE_REGION})"
    ;;
  redis)
    if [[ -z "${SCCACHE_REDIS:-}" ]]; then
      err "SCCACHE_REDIS must be set when using the redis backend"
      exit 2
    fi
    export SCCACHE_REDIS
    log "Backend: redis ($SCCACHE_REDIS)"
    ;;
  local)
    export SCCACHE_DIR SCCACHE_CACHE_SIZE="$SCCACHE_SIZE"
    log "Backend: local (dir=$SCCACHE_DIR, size=$SCCACHE_SIZE)"
    ;;
  *)
    err "Unknown backend: $BACKEND"
    exit 2
    ;;
esac

# ---------------------------------------------------------------------------
# Wire sccache into cargo & rustc
# ---------------------------------------------------------------------------

export RUSTC_WRAPPER="$SCCACHE_BIN"
export CARGO_BUILD_RUSTC_WRAPPER="$SCCACHE_BIN"
# Useful env for builds that need a deterministic cache
export CARGO_INCREMENTAL=0
export CARGO_PROFILE_DEV_DEBUG=0
export CARGO_PROFILE_TEST_DEBUG=0

log "Exported RUSTC_WRAPPER=$RUSTC_WRAPPER"
log "Exported CARGO_BUILD_RUSTC_WRAPPER=$CARGO_BUILD_RUSTC_WRAPPER"

# ---------------------------------------------------------------------------
# Write a small .cargo/config.toml snippet if not already present
# ---------------------------------------------------------------------------

CARGO_CONFIG_DIR="$ROOT_DIR/.cargo"
CARGO_CONFIG="$CARGO_CONFIG_DIR/config.toml"

if [[ -f "$CARGO_CONFIG" ]]; then
  if ! grep -q "sccache" "$CARGO_CONFIG" 2>/dev/null; then
    cat >> "$CARGO_CONFIG" <<EOF

# Added by scripts/sccache-setup.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
[build]
rustc-wrapper = "$SCCACHE_BIN"
EOF
    log "Appended rustc-wrapper to $CARGO_CONFIG"
  else
    log "sccache already referenced in $CARGO_CONFIG — leaving untouched"
  fi
else
  mkdir -p "$CARGO_CONFIG_DIR"
  cat > "$CARGO_CONFIG" <<EOF
# Generated by scripts/sccache-setup.sh
[build]
rustc-wrapper = "$SCCACHE_BIN"
EOF
  log "Wrote $CARGO_CONFIG"
fi

# ---------------------------------------------------------------------------
# Start the sccache server in the background (optional but recommended)
# ---------------------------------------------------------------------------

if "$SCCACHE_BIN" --help 2>&1 | grep -q -- "--start-server"; then
  "$SCCACHE_BIN" --start-server >/dev/null 2>&1 || warn "Failed to start sccache server (continuing)"
fi

# ---------------------------------------------------------------------------
# Final report
# ---------------------------------------------------------------------------

log "${GREEN}${BOLD}sccache configured successfully.${RESET}"
log "Try a build with:  cd svc/mes && cargo build"
log "Run with --stats to see hit/miss counts."

if $PRINT_STATS; then
  echo
  "$SCCACHE_BIN" --show-stats || true
fi
