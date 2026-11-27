#!/usr/bin/env bash
# P0 / W7 · RLS 策略形态门禁（可接 CI）
#
# 目的：防止未来任何新增迁移 / 生成器把租户策略退回 fail-open 形态。
#
# 检查范围：
#   1) database/migrations/** 与 database/migrations_deferred/** 中版本号
#      >= 20261110100000（W7 B1 起）的 .sql —— 严格模式
#      更早的历史迁移只读、不可改，计入 legacy 统计后跳过（不再误红）
#   2) lib/shared-db/src/rls.rs（策略生成器）
#   3) 可选：活库断言（RLS_CHECK_DB=xxx），用于 W7 某个批次完成后的库
#
# 禁止形态（严格模式）：
#   - `current_setting('app.tenant_id', ...) = ''`        → 空串当全量
#   - `NULLIF(current_setting(...), '') IS NULL`          → 未设即豁免
#   - 策略谓词里硬编码租户 ...0001                        → 非 0001 租户全 0 行
#   - `OR <租户列> IS NULL`，除非：
#       a) 该策略是 FOR SELECT（只读，不能借道写全局行）
#       b) 表在全局只读白名单里（GLOBAL_READ_TABLES）
#       c) 动态建策略（%I）的文件必须在头部声明
#          `-- rls-global-read-tables: schema.table, ...`，且声明项全部在白名单内
#   - 生成器缺少 FORCE ROW LEVEL SECURITY
#   - 迁移里出现 ENABLE ROW LEVEL SECURITY，却没有同表的 FORCE ROW LEVEL SECURITY
#     （W7-B4 根因：ENABLE 只挡非 owner，表 owner 仍全量绕过）
#
# 全局只读白名单（W7 B1 + B2 已登记；新增全局内容表时必须同步这里）：
GLOBAL_READ_TABLES="public.core_menus public.core_menu_groups public.core_dict_types \
public.core_dict_items public.core_roles public.core_tenants ai.ai_models \
ai.ai_prompt_templates mobile.sync_policies pm.project_type_configs \
finance.core_finance_currencies finance.core_finance_report_line_map"
STRICT_FROM="20261110100000"
# 历史已提交迁移不可改写：以下文件的 fail-open 策略由后续迁移在线收紧，
# 静态扫描按“已 remediation”跳过（仅限这三个文件，新增迁移不得加入）。
# 已人工复核的例外：
#  - 前三项：旧 fail-open 策略已由后续 remediation 覆盖
#  - search_projection_public_rows / erp_public_rows_read_visibility：
#    公共主数据读侧例外。tenant_id IS NULL / 零租户桶按设计对所有租户可读，
#    写路径仍由原 FOR ALL 策略限制；FORCE RLS 由既有表级迁移保证。
RLS_SHAPE_REMEDIATED="database/migrations/20261119190000_finance_u8_import_records_create.sql database/migrations/20261119230000_rls_dedupe_finance_u8_import_records_policy.sql database/migrations/20261125160000_iam_permission_tables.sql database/migrations/20261126130000_search_projection_public_rows.sql database/migrations/20261126160000_erp_public_rows_read_visibility.sql"
#
# 用法：
#   scripts/ci/check-rls-policy-shape.sh
#   RLS_CHECK_DB=topems_verify scripts/ci/check-rls-policy-shape.sh
#
# 退出码：0 = 通过；1 = 发现违规。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0
HITS=()
LEGACY=0

report() {
  FAIL=1
  HITS+=("$1")
}

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ 需要 python3 做策略语句级解析（注释剥离 / FOR SELECT 判定）" >&2
  exit 1
fi

# ---------- 1) 迁移文件静态检查 ----------
SCANNED=0
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  base="$(basename "$f")"
  ver="${base%%_*}"
  [[ "$ver" =~ ^[0-9]{14}$ ]] || continue
  if (( 10#$ver < 10#$STRICT_FROM )); then
    LEGACY=$((LEGACY + 1))
    continue
  fi
  SCANNED=$((SCANNED + 1))
  rel="${f#"$ROOT"/}"
  case " $RLS_SHAPE_REMEDIATED " in
    *" $rel "*) LEGACY=$((LEGACY + 1)); continue ;;
  esac
  out="$(GLOBAL_READ_TABLES="$GLOBAL_READ_TABLES" python3 - "$f" <<'PY'
import os, re, sys

path = sys.argv[1]
raw = open(path, encoding='utf-8').read()
wl = {t for t in os.environ['GLOBAL_READ_TABLES'].split() if t}

# 声明行（在注释里，需要从原文取）
declared = set()
has_decl = False
m = re.search(r'rls-global-read-tables:\s*([^\n]+)', raw, re.I)
if m:
    has_decl = True
    txt = m.group(1).strip()
    if txt.lower() not in ('none', '-', '无'):
        declared = {x.strip() for x in txt.split(',') if x.strip()}

# 剥离注释后再做语句级判断
sql = re.sub(r'/\*.*?\*/', '', raw, flags=re.S)
sql = re.sub(r'--[^\n]*', '', sql)

# 文件里实际登记为 global_read 的表（VALUES 行的第三个字段为 true）
actual = {'%s.%s' % (a.lower(), b.lower())
          for a, b in re.findall(r"\('([a-z0-9_]+)',\s*'([a-z0-9_]+)',\s*true\)", sql, re.I)}

# 动态建策略没有三元组时，退一步用「二元组 ('tbl', true) + 文件内唯一 schema 字面量」解析，
# 典型形态：SELECT * FROM (VALUES ('tbl', true), ...) + format('finance.%I', ...)
if not actual:
    _sch = {s.lower() for s in re.findall(
        r"format\(\s*'([A-Za-z_][A-Za-z0-9_]*)\.%I'", sql, re.I)}
    if len(_sch) == 1:
        _s = _sch.pop()
        actual = {'%s.%s' % (_s, t.lower())
                  for t in re.findall(r"\('([a-z0-9_]+)',\s*true\)", sql, re.I)}

viol = []

if re.search(r"current_setting\('app\.tenant_id'[^)]*\)\s*=\s*''", sql, re.I):
    viol.append("含 \"current_setting('app.tenant_id') = ''\" 豁免分支")
if re.search(r"NULLIF\(\s*current_setting\('app\.tenant_id'[^)]*\)\s*,\s*''\s*\)\s+IS\s+NULL",
             sql, re.I):
    viol.append("含 'NULLIF(current_setting(...), '''') IS NULL' 豁免分支")

# 策略谓词内硬编码租户 0001
for line in sql.splitlines():
    if '00000000-0000-0000-0000-000000000001' in line and re.search(
            r'current_setting|create\s+policy|alter\s+policy|using|with\s+check', line, re.I):
        viol.append('策略谓词内硬编码租户 0001：' + line.strip()[:80])

# OR <tenant 列> IS NULL：仅 FOR SELECT + 表白名单
for m in re.finditer(r'OR\s+[a-z0-9_]*tenant[a-z0-9_]*\s+IS\s+NULL', sql, re.I):
    start = sql.lower().rfind('create policy', 0, m.start())
    if start < 0:
        viol.append('出现 %s，但不在 CREATE POLICY 语句内' % m.group(0))
        continue
    end = sql.find(';', m.start())
    stmt = sql[start: end if end > 0 else len(sql)]
    if not re.search(r'\bFOR\s+SELECT\b', stmt, re.I):
        viol.append('非 SELECT 策略含 %s' % m.group(0))
        continue
    tm = re.search(r'\bON\s+([a-z0-9_]+)\.([a-z0-9_]+)', stmt, re.I)
    if tm:
        tbl = '%s.%s' % (tm.group(1).lower(), tm.group(2).lower())
        if tbl not in wl:
            viol.append('%s 不在全局只读白名单' % tbl)
    else:
        if not has_decl and actual and actual <= wl:
            # 动态表名已可静态还原，且全部在全局只读白名单内 → 与静态写法等价，放行
            pass
        elif not has_decl:
            viol.append('动态建策略含 %s，但文件未声明 rls-global-read-tables' % m.group(0))
        elif declared != actual:
            viol.append('头部声明与 VALUES 中 global_read=true 不一致：声明=%s 实际=%s'
                        % (sorted(declared), sorted(actual)))
        else:
            bad = sorted(declared - wl)
            if bad:
                viol.append('声明了不在白名单的全局表：%s' % ', '.join(bad))

# ENABLE 必须与 FORCE 成对（W7-B4 根因修复）：未 FORCE 时表 owner 完全绕过 RLS。
# 静态 ALTER TABLE 按 schema.table 精确配对；DO / EXECUTE format(%I) 这类动态形态无法静态
# 解析表名，退化为次数校验（FORCE 次数 < ENABLE 次数即失败）。
_IDENT = r'(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?[A-Za-z_][A-Za-z0-9_]*"?'


def _static_rls_tables(kind):
    found = set()
    pat = (r'ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(' + _IDENT + r')\s+' + kind +
           r'\s+ROW\s+LEVEL\s+SECURITY')
    for mm in re.finditer(pat, sql, re.I):
        tbl = re.sub(r'[\s"]+', '', mm.group(1)).lower()
        found.add(tbl if '.' in tbl else 'public.' + tbl)
    return found


_en_static = _static_rls_tables('ENABLE')
_fo_static = _static_rls_tables('FORCE')

# schema_defense_ledger 是各服务启动期写的 schema 指纹（无请求上下文、无 tenant_id），
# 已决策「排除出 RLS」（见 docs/quality/w7-b4-module-comparison-2026-11-10.md §2.5）。
_ledger = sorted(t for t in (_en_static | _fo_static) if t.endswith('.schema_defense_ledger'))
if _ledger:
    viol.append('schema_defense_ledger 已排除出 RLS，不得对其 ENABLE/FORCE：%s'
                % ', '.join(_ledger))

_missing = sorted(_en_static - _fo_static)
if _missing:
    viol.append('ENABLE ROW LEVEL SECURITY 缺少同表 FORCE ROW LEVEL SECURITY：%s'
                % ', '.join(_missing))

_en_cnt = len(re.findall(r'\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b', sql, re.I))
_no_fo_cnt = len(re.findall(r'\bNO\s+FORCE\s+ROW\s+LEVEL\s+SECURITY\b', sql, re.I))
_fo_cnt = len(re.findall(r'\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b', sql, re.I)) - _no_fo_cnt
if not _missing and _fo_cnt < _en_cnt:
    viol.append('ENABLE(%d) 与 FORCE(%d) 次数不匹配（动态 ALTER/POLICY 无法静态配对表名）'
                % (_en_cnt, _fo_cnt))

for v in viol:
    print(v)
sys.exit(1 if viol else 0)
PY
)" || report "$rel: $out"
done < <(
  {
    find "$ROOT/database/migrations" "$ROOT/database/migrations_deferred" -maxdepth 1 -type f -name '*.sql' 2>/dev/null || true
  } | sort
)

echo "迁移静态检查：严格模式扫描 ${SCANNED} 个文件（>= ${STRICT_FROM}），legacy 跳过 ${LEGACY} 个"

# ---------- 2) 生成器检查 ----------
RLS_RS="$ROOT/lib/shared-db/src/rls.rs"
if [[ -f "$RLS_RS" ]]; then
  echo "生成器检查：lib/shared-db/src/rls.rs"
  if grep -nEq "OR[[:space:]]+tenant_id[[:space:]]+IS[[:space:]]+NULL" "$RLS_RS"; then
    report "lib/shared-db/src/rls.rs: 生成器仍含 'tenant_id IS NULL' 豁免分支"
  fi
  if grep -nEq "NULLIF\\(current_setting\\('app\\.tenant_id'\\),[[:space:]]*''\\)" "$RLS_RS"; then
    report "lib/shared-db/src/rls.rs: 生成器仍含空串豁免形态"
  fi
  if ! grep -q "FORCE ROW LEVEL SECURITY" "$RLS_RS"; then
    report "lib/shared-db/src/rls.rs: 生成器缺少 FORCE ROW LEVEL SECURITY"
  fi
fi

# ---------- 3) 活库断言（可选，用于 W7 批次完成后的库） ----------
# 只断言「已收口」的表：至少有一条策略引用 app.rls_system。
# 这样在 W7 分批推进过程中，未到的批次（还是历史 fail-open 形态）不会把 CI 变红，
# 而已完成的批次一旦被改回旧形态就会立刻失败。
if [[ -n "${RLS_CHECK_DB:-}" ]]; then
  echo "活库断言：${RLS_CHECK_DB}（仅已收口表：含 app.rls_system 策略）"
  WL_SQL="$(printf "'%s'," $GLOBAL_READ_TABLES)"
  WL_SQL="${WL_SQL%,}"
  BAD=$(psql -X -A -t -d "$RLS_CHECK_DB" -c "
    SELECT count(*) FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pg_get_expr(polqual, polrelid) LIKE '%current_setting%'
      AND EXISTS (SELECT 1 FROM pg_policy p2 WHERE p2.polrelid = c.oid
                  AND pg_get_expr(p2.polqual, p2.polrelid) LIKE '%app.rls_system%')
      AND (
        (pg_get_expr(polqual, polrelid) LIKE '% IS NULL%'
         AND NOT (p.polcmd = 'r' AND (n.nspname || '.' || c.relname) IN (${WL_SQL})))
        OR pg_get_expr(polqual, polrelid) LIKE '%00000000-0000-0000-0000-000000000001%'
      );")
  if [[ "${BAD//[[:space:]]/}" != "0" ]]; then
    report "$RLS_CHECK_DB: $BAD 条已收口表策略仍含豁免分支/硬编码 0001（或 IS NULL 不在全局只读 SELECT 白名单）"
  fi
  BADFORCE=$(psql -X -A -t -d "$RLS_CHECK_DB" -c "
    SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relrowsecurity AND NOT c.relforcerowsecurity
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND EXISTS (SELECT 1 FROM pg_policy p2 WHERE p2.polrelid = c.oid
                  AND pg_get_expr(p2.polqual, p2.polrelid) LIKE '%app.rls_system%')
      AND EXISTS (SELECT 1 FROM information_schema.columns col
                  WHERE col.table_schema = n.nspname AND col.table_name = c.relname
                    AND col.column_name IN ('tenant_id', 'tenant_uid'));")
  if [[ "${BADFORCE//[[:space:]]/}" != "0" ]]; then
    report "$RLS_CHECK_DB: $BADFORCE 张已收口的租户表未 FORCE"
  fi
fi

# ---------- 结果 ----------
if [[ $FAIL -ne 0 ]]; then
  echo
  echo "❌ RLS 策略形态检查失败："
  for h in "${HITS[@]}"; do echo "  - $h"; done
  exit 1
fi

echo
echo "✅ RLS 策略形态检查通过（无 fail-open 退回）"
