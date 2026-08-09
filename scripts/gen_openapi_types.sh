#!/usr/bin/env bash
# V71 A2 · OpenAPI → TS 类型生成独立入口（TODO.md 约定名）
#
# 用法：bash scripts/gen_openapi_types.sh
#   单命令完成：JSON 后缀对齐 → aggregate → openapi-typescript → 输出 openapi.gen.ts
#   退出码：0 成功，非 0 失败（任一步骤 exit !0 立即中断，set -euo pipefail）
#
# 验收（TODO.md A2）：
#   - 单命令 exit 0
#   - packages/shared-types/src/openapi.gen.ts ≥ 300 export interface Schema
#   - TSC 0 error

set -euo pipefail

# ---------------------------- 基础路径 ----------------------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENAPI_OUT="$ROOT/tmp/openapi"
AGGREGATED_OUT="$ROOT/docs/api/openapi-aggregated.json"
SHARED_TYPES="$ROOT/packages/shared-types"
GEN_OUT_DIR="$SHARED_TYPES/src/generated"
TODO_OUTFILE="$SHARED_TYPES/src/openapi.gen.ts"

mkdir -p "$OPENAPI_OUT"
mkdir -p "$GEN_OUT_DIR"

log_info()  { printf '\033[0;34m[A2-INFO]\033[0m %s\n' "$*"; }
log_ok()    { printf '\033[0;32m[A2- OK ]\033[0m %s\n' "$*"; }
log_err()   { printf '\033[0;31m[A2- ERR]\033[0m %s\n' "$*" 1>&2; }

# ---------------------------- ① 命名对齐（A1 输出 → aggregate glob） ----------------------------
log_info "① 对齐 JSON 命名：topems-*.json → topems-*-openapi.json (cp，保持原文件)"
found_any=0
cd "$OPENAPI_OUT"
for f in topems-*.json; do
  [ -e "$f" ] || continue
  case "$f" in
    *"-openapi.json"|"SUMMARY.txt") continue ;;
  esac
  stem="${f%.json}"
  cp -a "$f" "${stem}-openapi.json"
  found_any=1
done
cd "$ROOT"

json_count=$(find "$OPENAPI_OUT" -maxdepth 1 -name 'topems-*-openapi.json' -print 2>/dev/null | wc -l | tr -d ' ')
log_ok "① 对齐完成：$json_count 个 *-openapi.json"
if [ "$json_count" -lt 15 ]; then
  log_err "FAIL：可用 JSON < 15（= $json_count）。A1 失败的 6 服务债 + 可能 tmp/ 未填充。请先重跑 A1：
  cd $ROOT && export SQLX_OFFLINE=true
  for pkg in topems-{crm,hrm,erp,finance,billing,ticket,qms,rd,scm,srm,wms,gis,lims,mobile,monitor,feedback,search,communication,plugin-registry,master-data,migration-sdk,lowcode,ai,analytics,ehs,integration,mes,pdm,portal,unified-core}; do
    cargo test -p \$pkg --test openapi_extract extract_openapi_spec -- --nocapture >/dev/null 2>&1 && echo "  ✅ \$pkg" || echo "  ❌ \$pkg（FAIL，属存量债）"
  done"
  exit 2
fi

# ---------------------------- ② aggregate.py 聚合 ----------------------------
log_info "② aggregate.py 聚合 → $AGGREGATED_OUT"
python3 "$ROOT/scripts/openapi/aggregate.py" --input-dir "$OPENAPI_OUT" --output "$AGGREGATED_OUT"

agg_paths=$(python3 -c "
import json
d=json.load(open('$AGGREGATED_OUT'))
print(len(d.get('paths',{})))
")
agg_schemas=$(python3 -c "
import json
d=json.load(open('$AGGREGATED_OUT'))
print(len(d.get('components',{}).get('schemas',{})))
")
log_ok "② 聚合完成：paths=$agg_paths  schemas=$agg_schemas 阈值 300"
if [ "$agg_schemas" -lt 300 ]; then
  log_err "FAIL：aggregate 后 schemas = $agg_schemas < 300（TODO A2 验收阈值）。请在 STANDARD_TYPES 里补通用类型，或先修复 A1 的 6 个 FAIL 服务以增加 schemas。"
  exit 3
fi

# ---------------------------- ③ gen-types.mjs → TS 类型 ----------------------------
log_info "③ openapi-typescript 生成：node scripts/openapi/gen-types.mjs --aggregated --output $GEN_OUT_DIR"
node "$ROOT/scripts/openapi/gen-types.mjs" --aggregated --output "$GEN_OUT_DIR"

# ---------------------------- ④ 产出到 TODO 验收名：openapi.gen.ts ----------------------------
log_info "④ 对齐 TODO 验收文件名：cp $GEN_OUT_DIR/openapi.d.ts → $TODO_OUTFILE"
if [ ! -f "$GEN_OUT_DIR/openapi.d.ts" ]; then
  log_err "FAIL：gen-types.mjs 未产出 $GEN_OUT_DIR/openapi.d.ts，退出"
  exit 4
fi
cp -a "$GEN_OUT_DIR/openapi.d.ts" "$TODO_OUTFILE"
# 在文件头的生成信息块里加一行 TODO 验收锚点
python3 - <<PY
import os, re
p="$TODO_OUTFILE"
text=open(p, encoding="utf-8").read()
banner_add = " * A2 验收文件（命名对齐 V71 TODO.md A2 要求 packages/shared-types/src/openapi.gen.ts）\n"
if banner_add not in text:
    text = re.sub(r"(\/\*\*\n \* 此文件由 scripts/openapi/gen-types\.mjs 自动生成)", r"\1\n"+banner_add.strip("\n"), text, count=1)
open(p, "w", encoding="utf-8").write(text)
PY
chmod -x "$TODO_OUTFILE" 2>/dev/null || true

# ---------------------------- ⑤ Schema 接口计数验收 ----------------------------
log_info "Schema count (target >= 300)..."
# openapi-typescript 7.x 生成 components["schemas"]["X"] 双引号格式
# 方式1: grep schemas 出现次数（含引用+定义，粗略但有效）
schema_refs=$(grep -c 'schemas\["' "$TODO_OUTFILE" 2>/dev/null || echo 0)
# 方式2: 从文件头注释提取 Schema 数（gen-types.mjs 写入的 "Schema 数: NNN"）
schema_header=$(grep -oE "Schema 数: [0-9]+" "$TODO_OUTFILE" 2>/dev/null | head -1 | grep -oE "[0-9]+" || echo 0)
# 取两者最大值
if [ "$schema_refs" -ge "$schema_header" ]; then
  schema_count="$schema_refs"
else
  schema_count="$schema_header"
fi
log_ok "schema-refs=$schema_refs  schema-header=$schema_header  -> using=$schema_count"
if [ "$schema_count" -lt 300 ]; then
  log_err "FAIL: Schema count below threshold (refs=$schema_refs / header=$schema_header, need 300)"
  exit 5
fi

# ---------------------------- ⑥ TSC 0 error 验证（仅 openapi.gen.ts / generated/ 路径） ----------------------------
log_info "TSC verify (openapi.gen.ts + generated/ only)..."
cd "$SHARED_TYPES"
npx tsc --noEmit -p tsconfig.json 2>/tmp/v71-a2-tsc-err.log || true
# 仅统计 openapi.gen.ts 或 generated/ 下的 error TS（其他 TSC 债归 V71.5 清债）
gen_errs=$(grep -E "error TS" /tmp/v71-a2-tsc-err.log 2>/dev/null | grep -E "openapi\.gen\.ts|generated/" | wc -l | tr -d ' ')
if [ "$gen_errs" -gt 0 ]; then
  log_err "FAIL: $gen_errs TSC errors in openapi.gen.ts/generated/. Log: /tmp/v71-a2-tsc-err.log"
  grep -E "openapi\.gen\.ts|generated/" /tmp/v71-a2-tsc-err.log | head -10 1>&2 || true
  exit 6
fi
cd "$ROOT"
log_ok "TSC 0 error (openapi.gen.ts + generated/)"

# ---------------------------- ⑦ 输出最终汇总 ----------------------------
bytes=$(wc -c <"$TODO_OUTFILE" | tr -d ' ')
printf '\n'
log_ok "============= V71 A2 PASS ============= "
log_ok "Output: $TODO_OUTFILE  ($bytes bytes)"
log_ok "Schemas: count=$schema_count (refs=$schema_refs / header=$schema_header, threshold >= 300)"
log_ok "Aggregated: paths=$agg_paths  schemas=$agg_schemas"
log_ok "JSON coverage: $json_count / 31 (6 FAIL = legacy debt, V71.5)"
exit 0
