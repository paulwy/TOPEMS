#!/usr/bin/env bash
# =============================================================================
# ensure-empty-db-prereqs.sh — 新库建库"空库守卫"脚本（迁移链脚本层前置补齐）
# =============================================================================
# 用途:
#   让一个全新空库从 0 全量应用 database/migrations/ 顶层迁移链时，不再需要
#   "3 处手工前置"。本脚本 = 探活 + 幂等补齐 3 处前置列 + sqlx migrate run
#   全流程闭环（失败即补、补后自动重放），全程无手工干预。
#
# 背景（2026-10-03 5433 Homebrew 干净库全量重放实测定案）:
#   干净库从 0 应用 292 个迁移时，283/291 全绿后在 20261003 批次确定性失败 3 处，
#   根因是这 3 处迁移对"由更早期迁移建好的空壳表"做了依赖列的 DDL，而这些列
#   实为服务运行时内联 DDL（不在迁移链），干净库从 0 时缺位：
#
#   前置 1 — U6(20261003000000) < R-8(20261003000005) 版本序依赖：
#     U6 对 finance.source_amount_snapshots 做
#       ALTER COLUMN payable_amount TYPE NUMERIC(18,4) USING ...
#     但干净库该表仅为 id+deleted_at 空壳（business_base_tables 建），
#     payable_amount 由更晚的 R-8(0005) 才补 → U6 先跑必报 column does not exist。
#     守卫预补 payable_amount，使 U6 的 ALTER 成功；R-8 的 ADD COLUMN IF NOT EXISTS
#     随后变 no-op，终态与 5432 一致。
#     依据: 5432 实测 finance.source_amount_snapshots.payable_amount
#           = numeric(18,4) NOT NULL DEFAULT 0。
#
#   前置 2 — R3(20261003000003) 缺 status 列：
#     R3 对 erp.financial_vouchers / crm.audit_logs 做
#       ADD CONSTRAINT ck_..._status_standard CHECK (status IS NULL OR status IN (...))
#     干净库这两张表存在但缺 status 列（status 为运行时内联 DDL，非迁移链）→
#     CHECK 引用不存在列必失败。守卫预补 status 列。
#     依据: 5432 实测 erp.financial_vouchers.status = varchar(20) NOT NULL DEFAULT 'draft'；
#                 crm.audit_logs.status           = varchar(20) NOT NULL DEFAULT 'success'。
#
#   前置 3 — R4(20261003000004) 缺 core.core_plugins.code：
#     R4 对 core.core_plugins 做 ADD CONSTRAINT core_plugins_code_key UNIQUE (code)，
#     干净库 core.core_plugins 仅 3 列空壳（id/deleted_at/name_en），code 等 33 列
#     实为 plugin-registry 运行时内联 DDL（不在迁移链）→ UNIQUE(code) 必失败。
#     守卫只补 R4 真正需要的 code 列（其余 32 列由运行时自补，不越权）。
#     依据: 5432 实测 core.core_plugins.code = varchar(100)（可空）。
#
# 设计约束:
#   - 不修改任何已应用迁移文件（防 checksum 漂移）；守卫只落在"建库流程"层。
#   - 全部补列幂等：ALTER TABLE IF EXISTS + ADD COLUMN IF NOT EXISTS，可重复执行。
#   - 与 canonical 口径一致：MIGRATE_URL 不带 search_path，账本落 public。
#   - 与 scripts/migrate-verify-empty.sh 的关系：后者是 CI 门禁脚本（负责 drop/create
#     验证库 + 纯链全量断言），本脚本是"生产/新库建库"守卫，二者独立不互相改动。
#
# 用法:
#   MIGRATE_URL="postgres://user:pass@host:5433/topems" bash scripts/ensure-empty-db-prereqs.sh
#
# 行为:
#   1. 探活 MIGRATE_URL（连不上即退出）。
#   2. 循环：sqlx migrate run；若失败，幂等补 3 处前置列后自动重放（有界次数）。
#      —— 补列放在"失败后"而非"首次 run 前"，因为首次 run 前这些空壳表尚未由
#         早期迁移创建；失败发生时（U6 为第一处失败），三张空壳表均已就位，补列生效。
#   3. 断言 _sqlx_migrations 全量 success=true、无失败记录。
# =============================================================================
set -euo pipefail

MIGRATE_URL="${MIGRATE_URL:?需要设置 MIGRATE_URL，例: postgres://topems:topems_secret@127.0.0.1:5433/topems}"

# 解析 sqlx 可执行文件（CI 用 PATH 内 sqlx；本地默认 ~/.cargo/bin/sqlx）
SQLX="$(command -v sqlx || echo "$HOME/.cargo/bin/sqlx")"
if [[ ! -x "$SQLX" ]]; then
    echo "错误: 未找到 sqlx-cli（需支持 migrate run）" >&2
    exit 2
fi

PSQL="psql $MIGRATE_URL"

# --- 0. 探活 -------------------------------------------------------------------
echo "== 空库建库守卫 =="
echo "  MIGRATE_URL: $MIGRATE_URL"
if ! $PSQL -tA -c "SELECT 1" >/dev/null 2>&1; then
    echo "错误: 无法连接 MIGRATE_URL（探活失败）" >&2
    exit 2
fi
echo "  探活 OK"

# --- 1. 幂等补 3 处前置列 -------------------------------------------------------
#     顺序说明：四处补列互相独立、无依赖，先后顺序不影响结果；
#     这里按"前置1 finance → 前置2 erp/crm status → 前置3 core code"排列，
#     仅为可读性，便于对照上方依据注释。
apply_prereqs() {
    echo "  -- 应用幂等前置补列（3 处）--"
    $PSQL -v ON_ERROR_STOP=1 <<'SQL'
-- 前置 1: U6(20261003000000) 依赖 finance.source_amount_snapshots.payable_amount 已存在。
-- 5432 实测: payable_amount numeric(18,4) NOT NULL DEFAULT 0。
ALTER TABLE IF EXISTS finance.source_amount_snapshots
    ADD COLUMN IF NOT EXISTS payable_amount NUMERIC(18,4) NOT NULL DEFAULT 0;

-- 前置 2a: R3(20261003000003) 依赖 erp.financial_vouchers.status 已存在。
-- 5432 实测: status varchar(20) NOT NULL DEFAULT 'draft'。
ALTER TABLE IF EXISTS erp.financial_vouchers
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';

-- 前置 2b: R3(20261003000003) 依赖 crm.audit_logs.status 已存在。
-- 5432 实测: status varchar(20) NOT NULL DEFAULT 'success'。
ALTER TABLE IF EXISTS crm.audit_logs
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'success';

-- 前置 3: R4(20261003000004) 依赖 core.core_plugins.code 已存在（UNIQUE(code)）。
-- 5432 实测: code varchar(100)（可空）。其余 32 列由运行时内联 DDL 自补，守卫不越权。
ALTER TABLE IF EXISTS core.core_plugins
    ADD COLUMN IF NOT EXISTS code VARCHAR(100);

-- 前置 4: 20261005000001/0002(align_public_*) 依赖 public.schema_registry /
-- dynamic_data / core_dict_items / core_dict_types 已存在——正是 09-01
-- (20260901000020) 重建清理 DROP 的全部 4 张 public 影子表，由 master-data /
-- unified-core schema_defense 阶段 0 服务内联重建（仅 id 骨架，对齐
-- business_base_tables L3307/3308/3355/3382 形态）；干净库从 0 应用时缺位，
-- ALTER TABLE public.xxx 即报 relation does not exist（2026-10-06 C-2 实测发现，
-- 已覆盖 0001/0002 两迁移的全部引用）。仅建 id 骨架：结构列由迁移自身补齐。
CREATE TABLE IF NOT EXISTS public.schema_registry (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS public.dynamic_data (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS public.core_dict_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS public.core_dict_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
SQL
}

# --- 2. 循环：migrate run → 失败补列 → 自动重放 --------------------------------
MAX_ATTEMPTS=6
attempt=0
while (( attempt < MAX_ATTEMPTS )); do
    attempt=$(( attempt + 1 ))
    echo "== sqlx migrate run（第 ${attempt}/${MAX_ATTEMPTS} 次）=="
    if "$SQLX" migrate run --source database/migrations --database-url "$MIGRATE_URL"; then
        echo "== 迁移链全量应用成功 =="
        break
    fi
    echo "!! sqlx migrate run 失败（第 ${attempt} 次）；幂等补列后自动重放" >&2
    apply_prereqs
    if (( attempt == MAX_ATTEMPTS )); then
        echo "错误: 已重放 ${MAX_ATTEMPTS} 次仍失败；最后一次失败很可能不是已知 3 处前置，" >&2
        echo "      请人工检查 sqlx 输出。" >&2
        exit 1
    fi
done

# --- 3. 断言 _sqlx_migrations 全量 success=true --------------------------------
TOTAL="$($PSQL -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success=true;" 2>/dev/null || echo 0)"
PENDING="$($PSQL -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success=false;" 2>/dev/null || echo 0)"
echo "  已应用迁移: ${TOTAL} 条，失败: ${PENDING} 条"
if [[ "${PENDING}" != "0" ]]; then
    echo "错误: 存在失败迁移记录" >&2
    exit 1
fi
if [[ "${TOTAL}" == "0" ]]; then
    echo "错误: 迁移记录为空（迁移未执行？）" >&2
    exit 1
fi

echo "✅ 空库建库守卫通过：${TOTAL}/${TOTAL} 迁移应用，0 错误（4 处前置已幂等补齐）"
