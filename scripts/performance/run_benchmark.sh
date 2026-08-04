#!/usr/bin/env bash
# =============================================================================
# TOPEMS Benchmark Runner
# =============================================================================
# Convenience wrapper that:
#   1. Starts the target services if they are not already running
#   2. Waits for each service's /health endpoint to return 200
#   3. Runs scripts/performance/benchmark.sh
#   4. Saves the output to scripts/performance/results/benchmark_<timestamp>.txt
#
# Usage:
#   ./run_benchmark.sh [HOST] [AUTH_TOKEN] [REQUESTS]
#
# Environment overrides:
#   START_SERVICES=1   - attempt to start missing services (default: 1)
#   SKIP_START=1       - do not start anything, just probe + benchmark
#   DEVELOPMENT_MODE   - forwarded to services when starting (default: true)
#   BENCH_HOST         - same as 1st positional arg
#
# Examples:
#   ./run_benchmark.sh
#   ./run_benchmark.sh localhost dev-token 100
#   SKIP_START=1 ./run_benchmark.sh 192.168.1.10 "eyJ..." 200
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Paths and config
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
TOPEMS_SH="${PROJECT_ROOT}/scripts/topems.sh"

HOST="${1:-${BENCH_HOST:-localhost}}"
AUTH_TOKEN="${2:-dev-token}"
REQUESTS="${3:-100}"
START_SERVICES="${START_SERVICES:-1}"
SKIP_START="${SKIP_START:-0}"

# When SKIP_START=1 we do not try to start anything.
[[ "${SKIP_START}" == "1" ]] && START_SERVICES="0"

mkdir -p "${RESULTS_DIR}"

# Service -> (topems.sh name | "", port, health_path)
# master-data is not in scripts/services.conf, so its topems name is empty
# and we fall back to cargo run.
declare -a SERVICES=(
    "iam|8000|/health"
    "finance|8011|/health"
    "portal|8063|/health"
    "|8090|/health"   # master-data (no topems.sh alias)
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { printf '\033[0;34m[runner]\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m[runner]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[runner]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[0;31m[runner]\033[0m %s\n' "$*" >&2; }

port_listening() {
    lsof -Pi ":${1}" -sTCP:LISTEN -t >/dev/null 2>&1
}

# Probe a health endpoint. Returns 0 if HTTP 200.
health_ok() {
    local host="${1}"
    local port="${2}"
    local path="${3}"
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
        "http://${host}:${port}${path}" 2>/dev/null || echo "000")"
    [[ "${code}" == "200" ]]
}

wait_for_health() {
    local name="${1}"
    local host="${2}"
    local port="${3}"
    local path="${4}"
    local max_wait="${5:-60}"
    local waited=0
    log "waiting for ${name} (http://${host}:${port}${path}) ..."
    while ! health_ok "${host}" "${port}" "${path}"; do
        sleep 2
        waited=$((waited + 2))
        if [[ ${waited} -ge ${max_wait} ]]; then
            err "timed out after ${max_wait}s waiting for ${name} on port ${port}"
            return 1
        fi
    done
    ok "${name} healthy (waited ${waited}s)"
}

# Start a service. Uses topems.sh for known names; falls back to cargo run
# for master-data (no topems.sh entry).
start_service() {
    local topems_name="${1}"
    local port="${2}"
    local dev_mode="${3}"

    if [[ -n "${topems_name}" ]] && [[ -x "${TOPEMS_SH}" ]]; then
        log "starting ${topems_name} via topems.sh ..."
        # topems.sh reads DEVELOPMENT_MODE from the environment.
        DEVELOPMENT_MODE="${dev_mode}" "${TOPEMS_SH}" start "${topems_name}" >/dev/null 2>&1 || {
            warn "topems.sh start ${topems_name} returned non-zero (may already be running)"
        }
        return 0
    fi

    # Fallback: cargo run for services without a topems.sh entry (master-data).
    local bin="topems-master-data"
    log "starting ${bin} via cargo run (port ${port}) ..."
    (
        cd "${PROJECT_ROOT}"
        DEVELOPMENT_MODE="${dev_mode}" MASTER_DATA_PORT="${port}" \
            nohup cargo run --release --bin "${bin}" \
            >"${RESULTS_DIR}/${bin}.log" 2>&1 &
    ) || {
        err "failed to start ${bin}"
        return 1
    }
}

# ---------------------------------------------------------------------------
# Pre-flight: ensure services are up
# ---------------------------------------------------------------------------
log "TOPEMS benchmark runner"
log "  host:           ${HOST}"
log "  requests:       ${REQUESTS}"
log "  start services: ${START_SERVICES}"
log "  dev mode:       ${DEVELOPMENT_MODE:-true}"

if [[ "${START_SERVICES}" == "0" ]]; then
    warn "service auto-start disabled (SKIP_START=1 or START_SERVICES=0)"
fi

DEV_MODE="${DEVELOPMENT_MODE:-true}"
ALL_READY=1

for entry in "${SERVICES[@]}"; do
    IFS='|' read -r topems_name port health_path <<<"${entry}"
    svc_label="${topems_name:-master-data}"

    if port_listening "${port}"; then
        if health_ok "${HOST}" "${port}" "${health_path}"; then
            ok "${svc_label} already running and healthy on port ${port}"
            continue
        else
            warn "${svc_label} port ${port} is listening but /health did not return 200"
            # Still try to wait a bit; the service may be mid-startup.
        fi
    fi

    if [[ "${START_SERVICES}" == "1" ]]; then
        start_service "${topems_name}" "${port}" "${DEV_MODE}" || {
            err "could not start ${svc_label}"
            ALL_READY=0
            continue
        }
        wait_for_health "${svc_label}" "${HOST}" "${port}" "${health_path}" 90 || {
            err "${svc_label} did not become healthy"
            ALL_READY=0
        }
    else
        warn "${svc_label} not running on port ${port} and auto-start is disabled"
        ALL_READY=0
    fi
done

if [[ ${ALL_READY} -ne 1 ]]; then
    err "one or more services are not ready; aborting benchmark."
    err "start them manually with: ./scripts/topems.sh start <name>"
    err "or re-run with START_SERVICES=1 (default)."
    exit 1
fi

# ---------------------------------------------------------------------------
# Run the benchmark and capture output
# ---------------------------------------------------------------------------
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
OUT_FILE="${RESULTS_DIR}/benchmark_${TIMESTAMP}.txt"

log "running benchmark.sh ..."
{
    echo "=== TOPEMS Benchmark Run ==="
    echo "Timestamp: ${TIMESTAMP}"
    echo "Host:      ${HOST}"
    echo "Requests:  ${REQUESTS}"
    echo "Token:     $([[ -n "${AUTH_TOKEN}" ]] && echo 'set' || echo 'none')"
    echo "Dev mode:  ${DEV_MODE}"
    echo
    "${SCRIPT_DIR}/benchmark.sh" "${HOST}" "${AUTH_TOKEN}" "${REQUESTS}"
} | tee "${OUT_FILE}"

ok "results saved to ${OUT_FILE}"

# ---------------------------------------------------------------------------
# Optional: append a summary line to results/index.csv
# ---------------------------------------------------------------------------
INDEX_CSV="${RESULTS_DIR}/index.csv"
if [[ ! -f "${INDEX_CSV}" ]]; then
    echo "timestamp,host,requests,token,output_file" >"${INDEX_CSV}"
fi
echo "${TIMESTAMP},${HOST},${REQUESTS},$([[ -n "${AUTH_TOKEN}" ]] && echo 'set' || echo 'none'),${OUT_FILE}" >>"${INDEX_CSV}"

log "done. see ${RESULTS_DIR}/ for full history."
