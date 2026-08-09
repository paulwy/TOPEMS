#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BENCHMARKS_DIR="${PROJECT_ROOT}/docs/benchmarks"
SNAPSHOTS_DIR="${BENCHMARKS_DIR}/sccache-snapshots"
CSV_FILE="${BENCHMARKS_DIR}/sccache-hit-rate-trend.csv"

mkdir -p "${SNAPSHOTS_DIR}" "${BENCHMARKS_DIR}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DATE_STR="$(date +%Y-%m-%d)"
HOSTNAME_STR="$(hostname 2>/dev/null || echo 'unknown-host')"

sccache_safe() {
  if command -v sccache >/dev/null 2>&1; then
    sccache "$@" 2>/dev/null || return 1
  else
    return 127
  fi
}

STATS_JSON=""
SCCACHE_RC=0
STATS_JSON="$(sccache_safe --show-stats --format json)" || SCCACHE_RC=$?

if [[ ${SCCACHE_RC} -ne 0 ]]; then
  if [[ ${SCCACHE_RC} -eq 127 ]]; then
    echo "[sccache_stats] WARN: sccache 未安装或不在 PATH 中，跳过采集（exit 0）" >&2
  else
    echo "[sccache_stats] WARN: sccache 未启动或命令失败 (rc=${SCCACHE_RC})，跳过采集（exit 0）" >&2
  fi
  exit 0
fi

if [[ -z "${STATS_JSON}" ]] || ! echo "${STATS_JSON}" | command -v python3 >/dev/null 2>&1; then
  :
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[sccache_stats] WARN: python3 不可用，无法解析 JSON，跳过采集（exit 0）" >&2
  exit 0
fi

RUSTC_VERSION="$(command -v rustc >/dev/null 2>&1 && rustc --version 2>/dev/null || echo 'rustc-unavailable')"
SCCACHE_VERSION="$(command -v sccache >/dev/null 2>&1 && sccache --version 2>/dev/null || echo 'sccache-unavailable')"

SNAPSHOT_FILE="${SNAPSHOTS_DIR}/${TIMESTAMP}-${HOSTNAME_STR}.json"

echo "${STATS_JSON}" > "${SNAPSHOT_FILE}" 2>/dev/null || {
  echo "[sccache_stats] WARN: 写入快照失败，跳过采集（exit 0）" >&2
  exit 0
}

PARSED="$(python3 - "${STATS_JSON}" <<'PYEOF'
import json, sys

raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    data = {}

def gn(d, *keys, default=0):
    cur = d
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return default
    if isinstance(cur, (int, float)):
        return cur
    if isinstance(cur, str):
        try:
            return int(cur)
        except Exception:
            try:
                return float(cur)
            except Exception:
                return default
    return default

cache_hits       = gn(data, "cache_hits") + gn(data, "stats", "cache_hits") + gn(data, "cache", "hits")
cache_misses     = gn(data, "cache_misses") + gn(data, "stats", "cache_misses") + gn(data, "cache", "misses")
cache_errors     = gn(data, "cache_errors") + gn(data, "stats", "cache_errors") + gn(data, "cache", "errors")
compile_requests = gn(data, "compile_requests") + gn(data, "stats", "compile_requests") + gn(data, "requests", "compile")
total_cache_read_errors = gn(data, "total_cache_read_errors") + gn(data, "stats", "total_cache_read_errors") + gn(data, "cache", "read_errors")
cached_executed     = gn(data, "cached_executed") + gn(data, "stats", "cached_executed") + gn(data, "execution", "cached")
non_cached_executed = gn(data, "non_cached_executed") + gn(data, "stats", "non_cached_executed") + gn(data, "execution", "non_cached")
avg_write_raw       = gn(data, "average_cache_write_time", default=None)
if avg_write_raw is None or not isinstance(avg_write_raw, (int, float)):
    sw = gn(data, "stats", "cache_write_time", "secs", default=0)
    sns = gn(data, "stats", "cache_write_time", "nanos", default=0)
    writes = max(1, gn(data, "stats", "cache_writes", default=1))
    avg_write = (sw + sns / 1e9) / writes
else:
    avg_write = float(avg_write_raw)

denom = cache_hits + cache_misses
hit_rate = cache_hits / denom if denom > 0 else 0.0

print(f"{cache_hits}\t{cache_misses}\t{cache_errors}\t{compile_requests}\t{total_cache_read_errors}\t{cached_executed}\t{non_cached_executed}\t{avg_write:.6f}\t{hit_rate:.6f}")
PYEOF
)" || {
  echo "[sccache_stats] WARN: JSON 解析失败，跳过采集（exit 0）" >&2
  exit 0
}

IFS=$'\t' read -r CACHE_HITS CACHE_MISSES CACHE_ERRORS COMPILE_REQUESTS READ_ERRORS CACHED_EXEC NON_CACHED_EXEC AVG_WRITE HIT_RATE <<< "${PARSED}"

CSV_HEADER="date,hostname,rustc_version,sccache_version,cache_hits,cache_misses,cache_errors,compile_requests,total_cache_read_errors,cached_executed,non_cached_executed,average_cache_write_time,hit_rate"

CSV_EXISTS=0
[[ -f "${CSV_FILE}" && -s "${CSV_FILE}" ]] && CSV_EXISTS=1

if [[ ${CSV_EXISTS} -eq 0 ]]; then
  echo "${CSV_HEADER}" > "${CSV_FILE}"
fi

{
  printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
    "${DATE_STR}" \
    "${HOSTNAME_STR}" \
    "${RUSTC_VERSION//,/;}" \
    "${SCCACHE_VERSION//,/;}" \
    "${CACHE_HITS}" \
    "${CACHE_MISSES}" \
    "${CACHE_ERRORS}" \
    "${COMPILE_REQUESTS}" \
    "${READ_ERRORS}" \
    "${CACHED_EXEC}" \
    "${NON_CACHED_EXEC}" \
    "${AVG_WRITE}" \
    "${HIT_RATE}"
} >> "${CSV_FILE}"

CSV_LINES=0
if [[ -f "${CSV_FILE}" ]]; then
  CSV_LINES=$(wc -l < "${CSV_FILE}" | tr -d ' ')
fi

SAMPLE_COUNT=$(( CSV_LINES - 1 ))
[[ ${SAMPLE_COUNT} -lt 0 ]] && SAMPLE_COUNT=0

if [[ ${SAMPLE_COUNT} -ge 3 ]]; then
  echo "[sccache_stats] 趋势可用：${SAMPLE_COUNT} 条样本点 | 本次命中率=${HIT_RATE} (hits=${CACHE_HITS}, misses=${CACHE_MISSES})"
else
  echo "[sccache_stats] 样本不足（${SAMPLE_COUNT}/3）| 本次命中率=${HIT_RATE} (hits=${CACHE_HITS}, misses=${CACHE_MISSES})"
fi

echo "[sccache_stats] 快照已保存: ${SNAPSHOT_FILE}"
echo "[sccache_stats] CSV 已追加: ${CSV_FILE}"

exit 0
