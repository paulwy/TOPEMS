#!/usr/bin/env bash
# full-route-smoke 分批巡检（dev 模式 486 路由全量单线程 >1h，规避 45min test timeout）
# 用法: bash scripts/smoke-batches.sh [batch_prefix]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

BATCHES=(
  "P1 routes/dashboard,routes/common,routes/auth,module:mobile,module:master,module:iam"
  "P2 module:mes,module:lims"
  "P3 module:wms,module:scm,module:srm"
  "P4 module:erp,module:bi,module:report,module:aps,module:asset"
  "P5 module:admin,module:automation,module:monitor,module:notification,module:doc,module:gis,module:oa,module:plugin"
  "P6 module:hrm,module:pm,module:tms,module:ticket,module:im"
  "P7 module:pdm,module:rd,module:qms"
  "P8 module:crm,module:ehs,module:workflow,module:integration,module:ai"
)

ONLY="${1:-}"
PAR=3   # 并行批数（每批 1 worker，mac 内存安全）
mkdir -p /tmp/smoke

run_batch() {
  local name="$1" filter="$2"
  echo "[smoke] $name 开始: $filter"
  API_URL=http://localhost:8099 SMOKE_OUT=/tmp/smoke/${name}.json \
    ROUTE_FILTER="$filter" \
    pnpm exec playwright test e2e/ui/full-route-smoke.spec.ts \
      --project=chromium --workers=1 --retries=0 \
      > /tmp/smoke/${name}.log 2>&1
  local rc=$?
  echo "[smoke] $name 结束 rc=$rc"
  grep -E '\[B1/B2\]' /tmp/smoke/${name}.log | tail -2
  return $rc
}

# 挑批次
declare -a queue
for b in "${BATCHES[@]}"; do
  name="${b%% *}"
  if [ -z "$ONLY" ] || [[ "$name" == "$ONLY"* ]]; then queue+=("$b"); fi
done

# 每轮 PAR 个并行
i=0
while [ $i -lt ${#queue[@]} ]; do
  for ((j=0; j<PAR && i+j<${#queue[@]}; j++)); do
    b="${queue[$((i+j))]}"
    name="${b%% *}"; filter="${b#* }"
    run_batch "$name" "$filter" &
  done
  wait
  i=$((i+PAR))
done

echo "[smoke] 全部分批完成"
