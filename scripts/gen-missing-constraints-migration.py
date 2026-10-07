#!/usr/bin/env python3
"""gen-missing-constraints-migration.py — 从基线库导出缺失约束，生成幂等补链迁移。

用途（2026-10-07 系统性补链第二层：约束级对齐）:
  对拍 BASE_URL（演进库）与 TARGET_URL（空库重建），找出"同表在 BASE 有、
  TARGET 无"的约束（PK/FK/UNIQUE/CHECK/NOT NULL），按类型生成幂等 SQL。

用法:
  python3 scripts/gen-missing-constraints-migration.py \
      BASE_URL TARGET_URL OUT_SQL

生成规则:
  * PK / UNIQUE / CHECK / FK：ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS
    <defn 原文>（PG 9.6+ 支持 IF NOT EXISTS；5432 重放 no-op）。
  * NOT NULL：ALTER TABLE ... ALTER COLUMN <col> SET NOT NULL
    （幂等：已是 NOT NULL 时 no-op；仅适用于空库/无 NULL 行）。
  * FK 引用目标库不存在的表/列时自动跳过并登记（避免 ADD CONSTRAINT 报错）。
  * 不删除约束、不改约束名（名称与基线一致，便于未来对拍）。
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

    def cons(url):
        d = defaultdict(list)
        for l in q(url, """
            SELECT n.nspname, c.relname, con.conname, con.contype,
                   pg_get_constraintdef(con.oid)
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname NOT IN ('pg_catalog','information_schema')
            ORDER BY 1,2,3
        """):
            p = l.split("|")
            if len(p) >= 5:
                d[(p[0], p[1])].append((p[2], p[3], p[4]))
        return d

    a, b = cons(base), cons(target)
    missing = []
    for (s, t), ca in sorted(a.items()):
        if (s, t) not in b:
            continue
        nb = {c[0] for c in b[(s, t)]}
        for name, typ, defn in ca:
            if name not in nb:
                missing.append((s, t, name, typ, defn))

    # 目标库全表（FK 依赖检查）
    target_tables = set()
    for l in q(target, """
        SELECT table_schema, table_name FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
    """):
        p = l.split("|")
        if len(p) == 2:
            target_tables.add((p[0], p[1]))

    import re
    lines = [
        "-- =============================================================================",
        "-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）",
        f"-- 基线: {base}  目标: {target}",
        f"-- 同表缺失约束: {len(missing)}（PK {sum(1 for x in missing if x[3]=='p')}"
        f" / FK {sum(1 for x in missing if x[3]=='f')}"
        f" / UNIQUE {sum(1 for x in missing if x[3]=='u')}"
        f" / CHECK {sum(1 for x in missing if x[3]=='c')}"
        f" / NOT NULL {sum(1 for x in missing if x[3]=='n')}）",
        "-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，",
        "--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。",
        "-- =============================================================================",
        "",
    ]
    skipped = []
    gen = 0
    for s, t, name, typ, defn in missing:
        if typ == "n":
            m = re.match(r"NOT NULL\s+(\S+)", defn)
            col = m.group(1) if m else None
            if col:
                lines.append(
                    f'ALTER TABLE "{s}"."{t}" ALTER COLUMN "{col}" SET NOT NULL;'
                )
                gen += 1
            else:
                skipped.append((s, t, name, typ, defn))
            continue
        if typ == "f":
            m = re.search(r"REFERENCES\s+([\"\w.]+)", defn)
            ref = m.group(1) if m else None
            if ref:
                ref = ref.strip('"')
                parts = ref.split(".")
                ref_t = tuple(parts) if len(parts) == 2 else ("public", parts[0])
                if ref_t not in target_tables:
                    skipped.append((s, t, name, typ, f"目标表缺失: {ref}"))
                    continue
        if typ == "p":
            # PK 特殊：表已存在任何主键（可能不同名）则跳过，避免 multiple PK
            cond = (
                "SELECT 1 FROM pg_constraint WHERE contype = 'p' "
                f"AND conrelid = '\"{s}\".\"{t}\"'::regclass"
            )
        else:
            cond = (
                "SELECT 1 FROM pg_constraint WHERE conname = "
                f"'{name}' AND conrelid = '\"{s}\".\"{t}\"'::regclass"
            )
        lines.append(
            "DO $$\nBEGIN\n"
            f"    IF NOT EXISTS ({cond}) THEN\n"
            f'        ALTER TABLE "{s}"."{t}" ADD CONSTRAINT "{name}" {defn};\n'
            "    END IF;\nEND $$;"
        )
        gen += 1
    lines.append("")
    if skipped:
        lines += [
            "-- ---- 跳过的约束（FK 目标表缺失 / 无法解析），需另立分流 ----",
            f"-- 数量: {len(skipped)}",
        ]
        for s, t, name, typ, reason in skipped:
            lines.append(f"--   {s}.{t}.{name} [{typ}] {reason}")
        lines.append("")

    open(out, "w").write("\n".join(lines))
    print(f"生成 {out}: 缺失约束 {len(missing)}（生成 SQL {gen} 条、跳过 {len(skipped)}）")


if __name__ == "__main__":
    main()
