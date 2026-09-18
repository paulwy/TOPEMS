#!/usr/bin/env python3
"""生成 20260918000014_align_business_tables.sql：
从 mes/pm 服务 schema_defense 解析权威列定义，生成幂等建表/补列迁移。
"""
import re
import io

def parse_table_defs(path):
    """解析 Rust TABLE_DEFS: ("tbl", &[("col","TYPE"),...])"""
    src = open(path, encoding='utf-8').read()
    # 提取 TABLE_DEFS 数组主体（贪婪到文件内最后一个 ]; 即数组结束）
    m = re.search(r'pub const TABLE_DEFS:.*?=\s*&\[\s*(.*)\s*\];', src, re.S)
    if not m:
        return []
    body = m.group(1)
    tables = []
    # 按 ("name", &[ ... ]) 分块
    for tm in re.finditer(r'\(\s*"([a-z_]+)"\s*,\s*&\[\s*(.*?)\s*\]\s*,?\s*\)', body, re.S):
        name, cols_body = tm.group(1), tm.group(2)
        cols = re.findall(r'\(\s*"([a-z_]+)"\s*,\s*"([^"]+)"\s*\)', cols_body)
        tables.append((name, cols))
    return tables

def emit_table(out, schema, table, cols):
    out.write(f'-- ============ {schema}.{table} ============\n')
    out.write(f'CREATE TABLE IF NOT EXISTS "{schema}"."{table}" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());\n')
    for col, typ in cols:
        out.write(f'ALTER TABLE "{schema}"."{table}" ADD COLUMN IF NOT EXISTS "{col}" {typ};\n')
    out.write('\n')

def main():
    mes_tables = parse_table_defs('svc/mes/src/models/schema_defense.rs')
    pm_tables = parse_table_defs('svc/pm/src/schema_defense.rs')
    pm_budgets = next((t for t in pm_tables if t[0] == 'budgets'), None)

    out = io.StringIO()
    out.write('''-- ================================================================================
-- 20260918000014_align_business_tables.sql — 双库业务表对齐（5432 活跃库 / 5433 重建库）
-- ================================================================================
-- 背景（2026-09-18 DB 治理收尾）：
--   1. mes 业务表（production_orders / production_processes / equipment 等 10 张）
--      仅由运行时 schema_defense 创建，迁移链中无完整建表/补列来源；
--      5432 活跃库 mes schema 完全缺失，5433 重建库仅有裸骨架。
--   2. finance.budgets（部门预算，svc/finance operational.rs 查询）不在任何
--      schema_defense TABLE_DEFS 中，5432 缺失、5433 仅有裸骨架 → /budgets API 500。
--   3. pm.budgets（项目预算，pm schema_defense 权威）在 5432 结构已完整，
--      5433 仅有裸骨架 → 补列对齐。
-- 权威来源：svc/mes/src/models/schema_defense.rs、svc/pm/src/schema_defense.rs、
--           svc/finance/src/modules/operational.rs（budgets 查询列）。
-- 幂等：CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS，双库可重复执行。
-- ================================================================================

CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS finance;
''')

    for name, cols in mes_tables:
        emit_table(out, 'mes', name, cols)

    # finance.budgets —— 来自 operational.rs SELECT/INSERT 契约（无 schema_defense 定义）
    out.write('-- ============ finance.budgets（部门预算，operational.rs 契约）============\n')
    out.write('CREATE TABLE IF NOT EXISTS "finance"."budgets" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());\n')
    finance_cols = [
        ('tenant_id', 'UUID'),
        ('department_id', 'UUID'),
        ('budget_type', 'VARCHAR(50) NOT NULL'),
        ('fiscal_year', 'INTEGER NOT NULL'),
        ('total_budget', 'NUMERIC(15,2) NOT NULL DEFAULT 0'),
        ('used_amount', 'NUMERIC(15,2) NOT NULL DEFAULT 0'),
        ('remaining_amount', 'NUMERIC(15,2) NOT NULL DEFAULT 0'),
        ('usage_rate', 'NUMERIC(6,2) NOT NULL DEFAULT 0'),
        ('status', 'VARCHAR(20) NOT NULL DEFAULT \'active\''),
        ('created_at', 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'),
        ('updated_at', 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'),
        ('deleted_at', 'TIMESTAMPTZ'),
    ]
    for col, typ in finance_cols:
        out.write(f'ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "{col}" {typ};\n')
    out.write('\n')

    # pm.budgets —— 来自 pm schema_defense（budget.rs 新模块未挂载，非权威）
    if pm_budgets:
        emit_table(out, 'pm', pm_budgets[0], pm_budgets[1])

    sql = out.getvalue()
    print(f"Generated: {len(sql)} chars, mes tables: {len(mes_tables)}, pm.budgets cols: {len(pm_budgets[1]) if pm_budgets else 0}")
    with open('database/migrations/20260918000014_align_business_tables.sql', 'w', encoding='utf-8') as f:
        f.write(sql)

if __name__ == '__main__':
    main()
