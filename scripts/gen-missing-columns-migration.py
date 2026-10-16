#!/usr/bin/env python3
"""gen-missing-columns-migration.py — 从基线库导出缺失列定义，生成幂等补链迁移。

用途（2026-10-07 自愈验证后"系统性补链"落地）:
  对拍 BASE_URL（演进库，如 5432）与 TARGET_URL（空库重建，独立库），
  找出"同表在 BASE 有、TARGET 无"的列，从 BASE 的 pg_attribute/pg_attrdef
  提取精确类型/NOT NULL/DEFAULT，生成单个幂等迁移 SQL
  （ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...）。

用法:
  python3 scripts/gen-missing-columns-migration.py \
      BASE_URL TARGET_URL OUT_SQL

说明:
  * 只处理列（不处理 CHECK/唯一/外键约束与索引——约束差异另立迁移）。
  * DEFAULT 使用 pg_get_expr 原文（now()/gen_random_uuid() 等保留）。
  * 每列类型/NOT NULL/DEFAULT 逐列对齐基线（含 deleted_at 等软删除列——
    基线存在 TIMESTAMPTZ 与 TIMESTAMP 两种形态，须精确提取而非统一定义）。
  * 仅生成幂等 ADD COLUMN IF NOT EXISTS；5432 重放为 no-op。
  * 输出 SQL 需人工审阅后放入 database/migrations/ 再重放验证。
"""

import subprocess
import sys
from collections import defaultdict


def q(url, sql):
    r = subprocess.run(
        ["psql", url, "-tA", "-F|", "-c", sql],
        capture_output=True, text=True, check=True,
    )
    return [l for l in r.stdout.split("\n") if l]


def main():
    base, target, out = sys.argv[1], sys.argv[2], sys.argv[3]

    def cols(url):
        d = defaultdict(set)
        for l in q(url, """
            SELECT table_schema, table_name, column_name
            FROM information_schema.columns
            WHERE table_schema NOT IN ('pg_catalog','information_schema')
            ORDER BY 1,2,3
        """):
            p = l.split("|")
            if len(p) == 3:
                d[(p[0], p[1])].add(p[2])
        return d

    a, b = cols(base), cols(target)
    missing = sorted((s, t, c) for (s, t), cs in a.items()
                     if (s, t) in b for c in sorted(cs - b[(s, t)]))

    # 从 BASE 提取列定义（类型/NOT NULL/DEFAULT）
    defs = {}
    for l in q(base, """
        SELECT n.nspname, c.relname, a.attname,
               format_type(a.atttypid, a.atttypmod),
               a.attnotnull,
               pg_get_expr(d.adbin, d.adrelid)
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
          AND a.attnum > 0 AND NOT a.attisdropped
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname NOT IN ('pg_catalog','information_schema')
    """):
        p = l.split("|")
        if len(p) == 6:
            defs[(p[0], p[1], p[2])] = (p[3], p[4], p[5])

    lines = [
        "-- =============================================================================",
        "-- 由 scripts/gen-missing-columns-migration.py 生成（自愈验证后系统性补链）",
        f"-- 基线: {base}  目标: {target}",
        f"-- 同表缺失列: {len(missing)}（ADD COLUMN IF NOT EXISTS 幂等）",
        "-- =============================================================================",
        "",
    ]
    seen = set()
    for s, t, c in missing:
        key = (s, t, c)
        if key in seen or key not in defs:
            continue
        seen.add(key)
        typ, nn, dflt = defs[key]
        ddl = f'ALTER TABLE "{s}"."{t}" ADD COLUMN IF NOT EXISTS "{c}" {typ}'
        if nn == "t":
            ddl += " NOT NULL"
        if dflt:
            ddl += f" DEFAULT {dflt}"
        lines.append(ddl + ";")
    lines.append("")

    open(out, "w").write("\n".join(lines))
    print(f"生成 {out}: 缺失列 {len(missing)}（已生成 {len(seen)} 条）")


if __name__ == "__main__":
    main()
