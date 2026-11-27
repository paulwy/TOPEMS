#!/bin/bash
# ============================================================
# scripts/ops/post-window-probe-20261124.sh
#
# 生产 schema 追赶窗口「跑完之后」的只读体检：
#   只跑 SELECT / information_schema 查询，不做任何 DDL/DML。
#   任一条不成立即 FAIL 并以 1 退出，用于「phase3 结束后、换件之前」的闸。
#
# 用法：
#   bash scripts/ops/post-window-probe-20261124.sh \
#     --host /tmp --user xingzhai --db topems_prod
#   bash scripts/ops/post-window-probe-20261124.sh \
#     --host /tmp --user "$(id -un)" --db topems_prodlite   # 本机演练库自测
#
# 判据来源：docs/ops/prod-schema-window-plan-2026-11-24.md §5.5 / §6
# ============================================================
set -euo pipefail

HOST="${PGHOST:-/tmp}"
USER_="${PGUSER:-xingzhai}"
DB="topems_prod"
EXPECT_MAX="20261124160000"
MIN_TABLES=1300
MIN_POLICIES=800
MIN_MENUS=440

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --user) USER_="$2"; shift 2 ;;
    --db)   DB="$2"; shift 2 ;;
    --expect-max) EXPECT_MAX="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

q() { psql -h "$HOST" -U "$USER_" -d "$DB" -X -tA -c "$1"; }

FAILS=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS+1)); }
warn() { echo "WARN  $1"; }

echo "== 窗口后体检：${DB}（expect ledger_max=${EXPECT_MAX}）=="

# 1) 账本到窗口终点，且无失败记录
max_v="$(q "select max(version) from _sqlx_migrations")"
if [[ "$max_v" == "$EXPECT_MAX" ]]; then pass "账本 max(version)=${max_v}"; else fail "账本 max(version)=${max_v}，期望 ${EXPECT_MAX}"; fi
failed_n="$(q "select count(*) from _sqlx_migrations where not success")"
if [[ "$failed_n" == "0" ]]; then pass "账本失败记录=0"; else fail "账本失败记录=${failed_n}"; fi

# 2) is_default 列与部分唯一索引（本次 500 的直接病因）
col_n="$(q "select count(*) from information_schema.columns where table_schema='public' and table_name='core_user_company_scopes' and column_name='is_default'")"
if [[ "$col_n" == "1" ]]; then pass "core_user_company_scopes.is_default 存在"; else fail "core_user_company_scopes.is_default 缺失"; fi
dflt="$(q "select coalesce(column_default,'-')||'|'||is_nullable from information_schema.columns where table_schema='public' and table_name='core_user_company_scopes' and column_name='is_default'")"
if [[ "$dflt" == "false|NO" ]]; then pass "is_default 定义 = NOT NULL DEFAULT false"; else fail "is_default 定义异常: ${dflt}"; fi
idx_n="$(q "select count(*) from pg_indexes where schemaname='public' and tablename='core_user_company_scopes' and indexname='uq_user_company_scopes_default'")"
if [[ "$idx_n" == "1" ]]; then pass "部分唯一索引 uq_user_company_scopes_default 存在"; else fail "部分唯一索引 uq_user_company_scopes_default 缺失"; fi

# 3) 单租户数据：每用户恰有一条默认公司（多真/零真都会让 resolve_company_context 走 fail-closed 或写坏）
bad_users="$(q "select count(*) from (select tenant_id, user_id, count(*) filter (where is_default) as t from public.core_user_company_scopes group by 1,2 having count(*) filter (where is_default) <> 1) s")"
if [[ "$bad_users" == "0" ]]; then pass "每用户默认公司恰 1 条"; else fail "有 ${bad_users} 个用户的默认公司不是恰 1 条"; fi

# 4) 归档账本自洽：清单里的表要么在 archive 里存在，要么被显式标记为不需要
arch_ns="$(q "select count(*) from pg_namespace where nspname='archive'")"
if [[ "$arch_ns" == "1" ]]; then
  manifest_rows="$(q "select count(*) from archive._drop_manifest")"
  echo "INFO  archive._drop_manifest 记录 ${manifest_rows} 条"
  missing="$(q "select count(*) from archive._drop_manifest m where to_regclass('archive.'||quote_ident(m.archive_table)) is null")"
  if [[ "$missing" == "0" ]]; then pass "归档清单 ${manifest_rows} 张表全部可在 archive 找到"; else fail "归档清单里有 ${missing} 张表在 archive 未找到"; fi
else
  warn "archive schema 不存在（若窗口确实执行了删表批次，这属于异常，需复核）"
fi

# 5) 规模阈值（防止误连空库/半途库）
t_n="$(q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not like 'pg_%' and n.nspname<>'information_schema'")"
if [[ "$t_n" -ge "$MIN_TABLES" ]]; then pass "表数=${t_n}（≥${MIN_TABLES}，口径=非 pg_* 用户 schema 基表，含 archive 归档表）"; else fail "表数=${t_n}，低于阈值 ${MIN_TABLES}"; fi
p_n="$(q "select count(*) from pg_policies")"
if [[ "$p_n" -ge "$MIN_POLICIES" ]]; then pass "策略数=${p_n}（≥${MIN_POLICIES}）"; else fail "策略数=${p_n}，低于阈值 ${MIN_POLICIES}"; fi
m_n="$(q "select count(*) from public.core_menus")"
if [[ "$m_n" -ge "$MIN_MENUS" ]]; then pass "菜单码=${m_n}（≥${MIN_MENUS}）"; else fail "菜单码=${m_n}，低于阈值 ${MIN_MENUS}"; fi

# 6) RLS 空策略表（只报不算错：历史库可能存在有意空策略表）
no_pol="$(q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and c.relrowsecurity and n.nspname not like 'pg_%' and n.nspname not in ('information_schema','archive') and not exists (select 1 from pg_policies p where p.schemaname=n.nspname and p.tablename=c.relname)")"
echo "INFO  开启 RLS 但无策略的表：${no_pol}"

echo
if [[ "$FAILS" -eq 0 ]]; then
  echo "== 体检通过（0 FAIL）=="
  exit 0
fi
echo "== 体检未通过：${FAILS} 项 FAIL，禁止换件 =="
exit 1
