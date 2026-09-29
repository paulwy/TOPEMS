#!/usr/bin/env bash
# shellcheck disable=SC2034
# =============================================================================
# TOPEMS Performance Benchmark Script
# =============================================================================
# Runs curl-based latency benchmarks against 5 core APIs.
#
# Methodology:
#   - Tool:        curl (with -w timing template) - works without wrk/hey
#   - Warmup:      10 requests per API (results discarded)
#   - Measurement: 100 requests per API (sequential)
#   - Metrics:     min, max, avg, p50, p95, p99 (ms) + success rate
#
# Usage:
#   ./benchmark.sh [HOST] [AUTH_TOKEN] [REQUESTS]
#
# Arguments:
#   HOST        - target host (default: localhost)
#   AUTH_TOKEN  - Bearer token for protected routes (default: dev-token)
#                 Set DEVELOPMENT_MODE=true on services to bypass auth.
#   REQUESTS    - number of measured requests per API (default: 100)
#
# Examples:
#   ./benchmark.sh
#   ./benchmark.sh localhost
#   ./benchmark.sh localhost "eyJhbGciOi..." 200
#   ./benchmark.sh 192.168.1.10 "" 50    # no auth token
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HOST="${1:-localhost}"
AUTH_TOKEN="${2:-dev-token}"
REQUESTS="${3:-100}"
WARMUP=10

# Tenant id used by the dev claims in unified-core (lib/src/auth.rs)
TENANT_ID="00000000-0000-0000-0000-000000000001"

# Service ports (sourced from config/ports.env)
FINANCE_PORT=8011
MASTER_DATA_PORT=8090
PORTAL_PORT=8063
CORE_PORT=8000

# Colors for table output
if [[ -t 1 ]]; then
    C_RESET="\033[0m"
    C_BOLD="\033[1m"
    C_GREEN="\033[32m"
    C_YELLOW="\033[33m"
    C_RED="\033[31m"
    C_CYAN="\033[36m"
else
    C_RESET=""; C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_CYAN=""
fi

# ---------------------------------------------------------------------------
# Tool checks
# ---------------------------------------------------------------------------
check_tools() {
    local missing=()
    command -v curl >/dev/null 2>&1 || missing+=("curl")
    command -v awk >/dev/null 2>&1 || missing+=("awk")
    command -v sort >/dev/null 2>&1 || missing+=("sort")

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "${C_RED}Error: missing required tools: ${missing[*]}${C_RESET}" >&2
        echo "Please install them before running the benchmark." >&2
        exit 1
    fi

    # Optional tools (reported but not required)
    if command -v wrk >/dev/null 2>&1; then
        echo "${C_CYAN}[info] wrk detected - benchmark.sh still uses curl for portability${C_RESET}" >&2
    fi
    if command -v hey >/dev/null 2>&1; then
        echo "${C_CYAN}[info] hey detected - benchmark.sh still uses curl for portability${C_RESET}" >&2
    fi
}

# ---------------------------------------------------------------------------
# Auth header builder
# ---------------------------------------------------------------------------
auth_header() {
    if [[ -n "${AUTH_TOKEN}" ]]; then
        echo "Authorization: Bearer ${AUTH_TOKEN}"
    else
        echo ""
    fi
}

# ---------------------------------------------------------------------------
# Run a single curl request and print total time (ms) to stdout.
# Uses a curl write-out template that emits only the total time in seconds.
# ---------------------------------------------------------------------------
CURL_FMT='%{time_total}'

do_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local auth="$4"

    local args=(-s -o /dev/null -w "${CURL_FMT}" -X "${method}" --max-time 30)
    args+=(-H "Content-Type: application/json")
    [[ -n "${auth}" ]] && args+=(-H "${auth}")
    [[ -n "${data}" ]] && args+=(-d "${data}")

    curl "${args[@]}" "${url}" 2>/dev/null || echo "0.000000"
}

# ---------------------------------------------------------------------------
# Run warmup + measurement for one API.
# Reads samples into a temp file (seconds, one per line) then computes stats.
# ---------------------------------------------------------------------------
benchmark_api() {
    local label="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local auth="$5"

    echo "${C_CYAN}[${label}] warming up (${WARMUP} requests)...${C_RESET}" >&2

    local i
    for ((i = 0; i < WARMUP; i++)); do
        do_request "${method}" "${url}" "${data}" "${auth}" >/dev/null
    done

    echo "${C_CYAN}[${label}] measuring (${REQUESTS} requests)...${C_RESET}" >&2

    local tmpfile
    tmpfile="$(mktemp)"
    local ok=0
    local fail=0

    for ((i = 0; i < REQUESTS; i++)); do
        local t
        t="$(do_request "${method}" "${url}" "${data}" "${auth}")"
        if [[ "${t}" == "0.000000" ]]; then
            fail=$((fail + 1))
        else
            ok=$((ok + 1))
            echo "${t}" >>"${tmpfile}"
        fi
    done

    # Compute statistics in milliseconds.
    # awk converts seconds -> ms, then we sort for percentiles.
    local stats
    stats="$(awk '{printf "%.3f\n", $1 * 1000}' "${tmpfile}" | sort -n | awk -v n="${ok}" '
        BEGIN { sum = 0 }
        { v[NR] = $1; sum += $1 }
        END {
            if (n == 0) { print "0 0 0 0 0 0 0"; exit }
            min = v[1]
            max = v[n]
            avg = sum / n
            p50 = v[int((n - 1) * 0.50) + 1]
            p95 = v[int((n - 1) * 0.95) + 1]
            p99 = v[int((n - 1) * 0.99) + 1]
            printf "%.3f %.3f %.3f %.3f %.3f %.3f", min, max, avg, p50, p95, p99
        }
    ')"

    rm -f "${tmpfile}"

    local min max avg p50 p95 p99
    read -r min max avg p50 p95 p99 <<<"${stats}"

    local total=$((ok + fail))
    local success_rate
    if [[ ${total} -gt 0 ]]; then
        success_rate="$(awk -v o="${ok}" -v t="${total}" 'BEGIN { printf "%.1f", (o / t) * 100 }')"
    else
        success_rate="0.0"
    fi

    # QPS = ok / total wall time. Approximate with sum of latencies as lower bound.
    local qps
    qps="$(awk -v s="${avg}" -v o="${ok}" 'BEGIN { if (s > 0) printf "%.1f", 1000 / s; else print "0.0" }')"

    # Emit a pipe-delimited row for the table printer.
    echo "${label}|${method}|${min}|${max}|${avg}|${p50}|${p95}|${p99}|${ok}|${fail}|${success_rate}|${qps}"
}

# ---------------------------------------------------------------------------
# Print results table
# ---------------------------------------------------------------------------
print_table() {
    local rows=("$@")
    local sep="+---------------------------+------+----------+----------+----------+----------+----------+----------+----------+----------+----------+"

    echo
    echo "${sep}"
    printf "| %-25s | %-4s | %8s | %8s | %8s | %8s | %8s | %8s | %8s | %8s | %8s |\n" \
        "API" "METH" "min(ms)" "max(ms)" "avg(ms)" "p50(ms)" "p95(ms)" "p99(ms)" "ok" "fail" "succ%"
    echo "${sep}"

    for row in "${rows[@]}"; do
        IFS='|' read -r label method min max avg p50 p95 p99 ok fail sr qps <<<"${row}"
        # Color p95 red if > 500ms, yellow if > 200ms
        local p95_color="${C_RESET}"
        if awk "BEGIN { exit !(${p95} > 500) }" 2>/dev/null; then
            p95_color="${C_RED}${C_BOLD}"
        elif awk "BEGIN { exit !(${p95} > 200) }" 2>/dev/null; then
            p95_color="${C_YELLOW}"
        fi
        printf "| %-25s | %-4s | %8s | %8s | %8s | %8s | ${p95_color}%8s${C_RESET} | %8s | %8s | %8s | %7s%% |\n" \
            "${label}" "${method}" "${min}" "${max}" "${avg}" "${p50}" "${p95}" "${p99}" "${ok}" "${fail}" "${sr}"
    done
    echo "${sep}"
    echo
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    check_tools

    echo "${C_BOLD}TOPEMS Performance Benchmark${C_RESET}"
    echo "  Host:      ${HOST}"
    echo "  Requests:  ${REQUESTS} (warmup: ${WARMUP})"
    echo "  Auth:      $([[ -n "${AUTH_TOKEN}" ]] && echo "Bearer token set" || echo "none")"
    echo "  Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo

    local auth
    auth="$(auth_header)"

    local rows=()

    # 1. Finance - Voucher list query (port 8011)
    rows+=("$(benchmark_api \
        "Finance Voucher List" \
        "GET" \
        "http://${HOST}:${FINANCE_PORT}/api/core/finance/v1/vouchers" \
        "" \
        "${auth}")")

    # 2. MDM - Master data metadata list (port 8090)
    rows+=("$(benchmark_api \
        "MDM Metadata List" \
        "GET" \
        "http://${HOST}:${MASTER_DATA_PORT}/api/master/mdm-v60/metadata" \
        "" \
        "${auth}")")

    # 3. Portal BFF - GraphQL query (port 8063)
    local gql_query='{ "query": "{ serviceHealth { name status } }" }'
    rows+=("$(benchmark_api \
        "Portal GraphQL" \
        "POST" \
        "http://${HOST}:${PORTAL_PORT}/api/portal/graphql" \
        "${gql_query}" \
        "${auth}")")

    # 4. Portal BFF - SLA policy list (port 8063)
    rows+=("$(benchmark_api \
        "Portal SLA Policies" \
        "GET" \
        "http://${HOST}:${PORTAL_PORT}/api/portal/sla-policies" \
        "" \
        "${auth}")")

    # 5. Unified-core - User login (port 8000, no auth required)
    local login_body="{ \"username\": \"bench_user\", \"password\": \"bench_pass\" }"
    rows+=("$(benchmark_api \
        "User Login" \
        "POST" \
        "http://${HOST}:${CORE_PORT}/api/core/iam/auth/login" \
        "${login_body}" \
        "")")

    print_table "${rows[@]}"

    echo "Notes:"
    echo "  - p95 color: ${C_GREEN}green${C_RESET}=<200ms ${C_YELLOW}yellow${C_RESET}=200-500ms ${C_RED}red${C_RESET}=>500ms"
    echo "  - QPS column omitted; single-client sequential QPS approx = 1000/avg(ms)"
    echo "  - Login endpoint is public; other endpoints require a valid Bearer token"
    echo "  - Set DEVELOPMENT_MODE=true on services to bypass JWT auth (dev claims)"
    echo
}

main "$@"
