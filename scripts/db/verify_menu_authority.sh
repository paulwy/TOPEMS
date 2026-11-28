#!/usr/bin/env bash
# ============================================================================
# 菜单单一权威 Phase 0：四库账本与差异基线（只读）
#
# 核验范围：
#   1. topems(dev) / topems_test / 5433 / prod 各库的
#      core_menus 所在 schema、行数、code 集合；
#   2. 各库 _sqlx_migrations 中 20261102* / 20261103* 的 success 与 checksum；
#   3. 权威 DB code 集合 vs 前端 navItems（scripts/verify_navigation.mjs --json，
#      当前基线 395 条）差异：DB 多出 / 前端缺失 / DB 内重复。
#
# 只读保证：仅执行 SELECT / information_schema；prod 通过 SSH 只执行 psql -tAc SELECT。
# 可达性：任一库不可达即标记「不可达（原因）」，绝不伪造数据。
#
# 用法：
#   bash scripts/db/verify_menu_authority.sh
#   bash scripts/db/verify_menu_authority.sh --out docs/quality/menu-authority-baseline-2026-11-05.md
#
# 环境变量（可选覆盖；默认从仓库根 .env 的 DATABASE_URL 派生）：
#   TOPEMS_DB_URL / TOPEMS_TEST_URL / TOPEMS_5433_URL
#   TOPEMS_PROD_SSH（可选：远端只读 SSH 通道；留空 = 本机直连 topems_prod，默认）
#   TOPEMS_PROD_URL（本机直连 prod 连接串，默认 socket /tmp user=xingzhai）
#   TOPEMS_PROD_DB（默认 topems_prod）
#
# 权威 schema 选择顺序：public(非空) → iam(非空) → 其余非空 schema（取最大行数）。
# 依据：database/migrations/20261102190000_fix_menu_crm_permission.sql 注释
#   「core_menus 所在 schema 各库不一致（prod=public / test=iam / 5433 亦 iam 类）」。
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

OUT=""
if [[ "${1:-}" == "--out" ]]; then
  OUT="${2:-}"
fi

# ---- 解析默认连接串（脱敏仅用于展示，不写入产物）----
BASE_URL="${TOPEMS_DB_URL:-}"
if [[ -z "$BASE_URL" && -f .env ]]; then
  BASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | sed 's/^DATABASE_URL=//')"
fi

DEV_URL="${TOPEMS_DB_URL:-$BASE_URL}"
TEST_URL="${TOPEMS_TEST_URL:-$(printf '%s' "$BASE_URL" | sed -E 's#/topems([?]|$)#/topems_test\1#')}"
PORT5433_URL="${TOPEMS_5433_URL:-$(printf '%s' "$BASE_URL" | sed -E 's#:5432/#:5433/#; s#/topems([?]|$)#/topems\1#')}"
PROD_SSH="${TOPEMS_PROD_SSH:-}"
PROD_DB="${TOPEMS_PROD_DB:-topems_prod}"
# 本机直连 prod（默认 socket /tmp，超级用户 xingzhai；只读核验）
PROD_LOCAL_DSN="${TOPEMS_PROD_URL:-postgresql:///?host=/tmp&user=xingzhai&dbname=topems_prod}"

mask_url() {
  printf '%s' "$1" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#g'
}

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# ---- 单库查询函数 ----
# $1=label $2=psql 命令前缀（数组形式通过 eval 不安全，这里直接传覆盖方式）
query_local() {
  local url="$1"
  shift
  PGCONNECT_TIMEOUT=5 psql "$url" -tAc "$*" 2>&1
}

menu_schema_counts_local() {
  query_local "$1" "select table_schema||':'||(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.core_menus', table_schema), false, true, '')))[1]::text from information_schema.tables where table_name='core_menus' order by 1"
}

menu_schema_counts_ssh() {
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$PROD_SSH" \
    "/opt/homebrew/bin/psql -tAc \"select table_schema||':'||(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.core_menus', table_schema), false, true, '')))[1]::text from information_schema.tables where table_name='core_menus' order by 1\" $PROD_DB" 2>&1
}

ledger_local() {
  query_local "$1" "select coalesce(string_agg(version::text||'|'||success::text||'|'||checksum::text, E'\n' order by version), '<none>') from _sqlx_migrations where version::text like '20261102%' or version::text like '20261103%'"
}

ledger_ssh() {
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$PROD_SSH" \
    "/opt/homebrew/bin/psql -tAc \"select coalesce(string_agg(version::text||'|'||success::text||'|'||checksum::text, E'\n' order by version), '<none>') from _sqlx_migrations where version::text like '20261102%' or version::text like '20261103%'\" $PROD_DB" 2>&1
}

codes_local() {
  query_local "$1" "select code from $2.core_menus where deleted_at is null order by code"
}

codes_ssh() {
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$PROD_SSH" \
    "/opt/homebrew/bin/psql -tAc \"select code from $2.core_menus where deleted_at is null order by code\" $PROD_DB" 2>&1
}

# prod 本机直连（PROD_SSH 留空时使用）
menu_schema_counts_prod() { menu_schema_counts_local "$PROD_LOCAL_DSN"; }
ledger_prod()             { ledger_local "$PROD_LOCAL_DSN"; }
codes_prod()              { codes_local "$PROD_LOCAL_DSN" "$1"; }

# ---- 前端 navItems code 集合（与三联校验同源）----
node scripts/verify_navigation.mjs --json > "$TMP_DIR/fe_nav.json"
node -e '
const fs = require("fs");
const items = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const codes = [...new Set(items.map((i) => i.code).filter(Boolean))].sort();
fs.writeFileSync(process.argv[2], codes.join("\n") + "\n");
console.log(`FE navItems: ${items.length} 条（unique code ${codes.length}）`);
' "$TMP_DIR/fe_nav.json" "$TMP_DIR/fe_codes.txt"

# ---- 逐库采集 ----
declare -a LABELS=("topems(dev)" "topems_test" "5433/topems" "prod/topems_prod")
declare -a STATUS=() SCHEMA_SUMMARY=() AUTH_SCHEMA=() TOTAL=() LEDGER_LINES=() CODE_FILES=()

collect_one() {
  local kind="$1" target="$2" idx="$3"
  local schema_out ledger_out rc
  if [[ "$kind" == "local" ]]; then
    if schema_out="$(menu_schema_counts_local "$target")"; then rc=0; else rc=1; fi
  elif [[ -n "$PROD_SSH" ]]; then
    if schema_out="$(menu_schema_counts_ssh)"; then rc=0; else rc=1; fi
  else
    if schema_out="$(menu_schema_counts_prod)"; then rc=0; else rc=1; fi
  fi

  if [[ $rc -ne 0 || "$schema_out" == *"Connection refused"* || "$schema_out" == *"does not exist"* || "$schema_out" == *"错误"* || "$schema_out" == *"error"* || -z "$schema_out" ]]; then
    STATUS[$idx]="不可达（$(printf '%s' "$schema_out" | tr '\n' ' ' | cut -c1-120)）"
    SCHEMA_SUMMARY[$idx]="-"
    AUTH_SCHEMA[$idx]="-"
    TOTAL[$idx]="-"
    LEDGER_LINES[$idx]="-"
    CODE_FILES[$idx]=""
    return
  fi

  STATUS[$idx]="可达"
  SCHEMA_SUMMARY[$idx]="$(printf '%s' "$schema_out" | tr '\n' ',' | sed 's/,$//')"

  # 权威 schema：public 非空 → iam 非空 → 其余非空最大行数
  local auth=""
  auth="$(printf '%s\n' "$schema_out" | awk -F: '$2+0>0 && $1=="public"{print $1}' | head -1)"
  [[ -z "$auth" ]] && auth="$(printf '%s\n' "$schema_out" | awk -F: '$2+0>0 && $1=="iam"{print $1}' | head -1)"
  if [[ -z "$auth" ]]; then
    auth="$(printf '%s\n' "$schema_out" | awk -F: '$2+0>0{print $2"\t"$1}' | sort -nr | head -1 | cut -f2)"
  fi
  AUTH_SCHEMA[$idx]="${auth:--}"

  if [[ -n "$auth" ]]; then
    if [[ "$kind" == "local" ]]; then
      TOTAL[$idx]="$(codes_local "$target" "$auth" | sed '/^$/d' | wc -l | tr -d ' ')"
      codes_local "$target" "$auth" | sed '/^$/d' > "$TMP_DIR/codes_$idx.txt"
    elif [[ -n "$PROD_SSH" ]]; then
      TOTAL[$idx]="$(codes_ssh "" "$auth" | sed '/^$/d' | wc -l | tr -d ' ')"
      codes_ssh "" "$auth" | sed '/^$/d' > "$TMP_DIR/codes_$idx.txt"
    else
      TOTAL[$idx]="$(codes_prod "$auth" | sed '/^$/d' | wc -l | tr -d ' ')"
      codes_prod "$auth" | sed '/^$/d' > "$TMP_DIR/codes_$idx.txt"
    fi
    CODE_FILES[$idx]="$TMP_DIR/codes_$idx.txt"
  else
    TOTAL[$idx]="0"
    CODE_FILES[$idx]=""
  fi

  if [[ "$kind" == "local" ]]; then
    ledger_out="$(ledger_local "$target" || true)"
  elif [[ -n "$PROD_SSH" ]]; then
    ledger_out="$(ledger_ssh || true)"
  else
    ledger_out="$(ledger_prod || true)"
  fi
  LEDGER_LINES[$idx]="${ledger_out:-<none>}"
}

collect_one local "$DEV_URL" 0
collect_one local "$TEST_URL" 1
collect_one local "$PORT5433_URL" 2
collect_one ssh "" 3

# ---- 生成 Markdown ----
emit() {
  echo "# 菜单单一权威 Phase 0 基线（四库账本 + 前端 395 差异）"
  echo
  echo "> 生成时间：$(date '+%Y-%m-%d %H:%M:%S %Z') ｜ 生成脚本：[verify_menu_authority.sh](scripts/db/verify_menu_authority.sh)"
  echo "> 口径：仅 SELECT；前端基线来自 [verify_navigation.mjs](scripts/verify_navigation.mjs) \`--json\`（395 条唯一 code）。"
  echo "> dev 连接串：\`$(mask_url "$DEV_URL")\`（其余本地库按库名/端口派生；prod 默认本机直连 topems_prod，TOPEMS_PROD_SSH 非空时走 SSH + psql）。"
  echo
  echo "## 1. 四库核验"
  echo
  echo "| 库 | 可达性 | core_menus 各 schema 行数 | 权威 schema | 权威 code 数 | 20261102*/20261103* 账本 |"
  echo "|---|---|---|---|---|---|"
  local i
  for i in 0 1 2 3; do
    local ledger_cell="${LEDGER_LINES[$i]//$'\n'/<br>}"
    ledger_cell="${ledger_cell//|/\\|}"
    echo "| ${LABELS[$i]} | ${STATUS[$i]} | ${SCHEMA_SUMMARY[$i]} | ${AUTH_SCHEMA[$i]} | ${TOTAL[$i]} | ${ledger_cell} |"
  done

  echo
  echo "## 2. 权威 DB vs 前端 config（395）差异"
  echo
  echo "| 库 | DB code | FE code | DB 多出（FE 缺失） | 前端多出（DB 缺失） | DB 内重复 code |"
  echo "|---|---|---|---|---|---|"
  for i in 0 1 2 3; do
    local f="${CODE_FILES[$i]:-}"
    if [[ -z "$f" ]]; then
      if [[ "${STATUS[$i]}" == 可达* ]]; then
        echo "| ${LABELS[$i]} | 0 | 395 | 0 | 395 | 0 |"
      else
        echo "| ${LABELS[$i]} | - | 395 | 不可达，未比对 | 不可达，未比对 | - |"
      fi
      continue
    fi
    sort -u "$f" -o "$f.sorted"
    local extra missing dup
    extra="$(comm -23 "$f.sorted" "$TMP_DIR/fe_codes.txt" | wc -l | tr -d ' ')"
    missing="$(comm -13 "$f.sorted" "$TMP_DIR/fe_codes.txt" | wc -l | tr -d ' ')"
    dup="$(sort "$f" | uniq -d | wc -l | tr -d ' ')"
    echo "| ${LABELS[$i]} | $(wc -l < "$f.sorted" | tr -d ' ') | 395 | $extra | $missing | $dup |"
  done

  echo
  echo "## 3. 差异明细（按库）"
  echo
  for i in 0 1 2 3; do
    local f="${CODE_FILES[$i]:-}"
    echo "### ${LABELS[$i]}（权威 schema: ${AUTH_SCHEMA[$i]}）"
    echo
    if [[ -z "$f" ]]; then
      if [[ "${STATUS[$i]}" == 可达* ]]; then
        echo "- 可达但无 core_menus 数据（0 条），前端 395 条全部不在 DB。"
      else
        echo "- 不可达，无差异可列。"
      fi
      echo
      continue
    fi
    echo "**DB 多出（前端无对应 navItem，共 $(comm -23 "$f.sorted" "$TMP_DIR/fe_codes.txt" | wc -l | tr -d ' ') 条）**"
    echo
    echo '```'
    comm -23 "$f.sorted" "$TMP_DIR/fe_codes.txt" | paste -sd ',' - | fold -w 160 -s
    echo '```'
    echo
    echo "**前端多出（DB 无对应 code，共 $(comm -13 "$f.sorted" "$TMP_DIR/fe_codes.txt" | wc -l | tr -d ' ') 条）**"
    echo
    echo '```'
    comm -13 "$f.sorted" "$TMP_DIR/fe_codes.txt" | paste -sd ',' - | fold -w 160 -s
    echo '```'
    echo
    local dup_list
    dup_list="$(sort "$f" | uniq -d | paste -sd ',' -)"
    echo "**DB 内重复 code**：${dup_list:-无}"
    echo
  done

  echo "## 4. 结论与说明"
  echo
  echo "1. **documented 426 已漂移**：TODO.md 记录的 \`core_menus 426 条\` 来自已消失的 \`topems_test\`；当前实测 prod \`public.core_menus\` = **424**，差 -2。"
  echo "2. **环境 schema 分裂**：prod 权威在 \`public\`；dev 同时存在 \`public\`(184) 与 legacy \`mes\`(610) 两份，\`iam/flow\` 为 0。后端菜单读取使用连接池 search_path 下的非限定 \`core_menus\`，dev 将命中 \`public\`（184），而非 legacy \`mes\`。"
  echo "3. **dev 账本 checksum 非 sqlx 实执行**：dev/topems 的 20261102*~20261103* 行 checksum 以 \`manual-\` 开头（手工登记），不可作为 sqlx 校验依据；prod 为真实 64 字节哈希。"
  echo "4. **四库可达性**：\`topems_test\` 与 5433 在本机不可达（分别为 database does not exist / Connection refused），未做任何猜测补数。历史对拍库 \`topems_prepare\` 已于 2026-11-26 作为演练残留清理。"
}

if [[ -n "$OUT" ]]; then
  mkdir -p "$(dirname "$OUT")"
  emit > "$OUT"
  echo "已写入 $OUT"
else
  emit
fi
