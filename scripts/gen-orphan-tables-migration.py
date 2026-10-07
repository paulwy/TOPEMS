#!/usr/bin/env python3
"""生成 5432 独有表（迁移链未覆盖的运行时自建表）的建表迁移。

用法:
  python3 scripts/gen-orphan-tables-migration.py <pg_dump_schema.sql> <only_a_tables.json> <out.sql>

从 pg_dump --schema-only 输出中提取:
  - CREATE SEQUENCE（独有表引用的序列）
  - CREATE TABLE（独有表，含内联 CHECK）
  - PK/UNIQUE 约束（ALTER TABLE ... ADD CONSTRAINT，DO $$ 幂等）
  - FK 约束（目标表在独有表集合内的——解掉 37 个因目标表缺失跳过的 FK）
  - CREATE POLICY + FORCE/ENABLE ROW LEVEL SECURITY（独有表启用 RLS 的）
"""
import json
import re
import sys

def main():
    schema_sql, only_json, out = sys.argv[1], sys.argv[2], sys.argv[3]
    tables = [tuple(x) for x in json.load(open(only_json))]
    tset = set(tables)
    lines = open(schema_sql).read().split("\n")

    seq_blocks, table_blocks, pk_alters, fk_alters, policies, rls_alters = [], [], [], [], [], []
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        # CREATE SEQUENCE <s>.<seq> ...; —— 序列名去 _id_seq 后缀找表 ∈ 独有表
        m = re.match(r"CREATE SEQUENCE (\"?)([\w]+)\1\.\1([\w]+)\1", ln)
        if m:
            seq_s, seq_n = m.group(2), m.group(3)
            tbl_n = re.sub(r"_id_seq$", "", seq_n)
            if (seq_s, tbl_n) in tset or (seq_s, seq_n) in tset:
                buf = [ln]
                i += 1
                while i < n and not lines[i].rstrip().endswith(";"):
                    buf.append(lines[i]); i += 1
                if i < n: buf.append(lines[i])
                seq_blocks.append("\n".join(buf))
                i += 1
                continue
        # CREATE VIEW <schema>.<view> AS ...;（独有表清单可能含 VIEW）
        m = re.match(r"CREATE VIEW (\"?)([\w]+)\1\.\1([\w]+)\1 AS", ln)
        if m and (m.group(2), m.group(3)) in tset:
            buf = [ln]
            i += 1
            while i < n and not lines[i].rstrip().endswith(";"):
                buf.append(lines[i]); i += 1
            if i < n: buf.append(lines[i])
            table_blocks.append(re.sub(r"^CREATE VIEW ", "CREATE OR REPLACE VIEW ", "\n".join(buf), count=1))
            i += 1
            continue
        # CREATE TABLE <schema>.<table> (  ... );
        m = re.match(r"CREATE TABLE (\"?)([\w]+)\1\.\1([\w]+)\1 \(", ln)
        if m and (m.group(2), m.group(3)) in tset:
            buf = [ln]
            i += 1
            while i < n and not lines[i].rstrip().endswith(");"):
                buf.append(lines[i]); i += 1
            if i < n: buf.append(lines[i])
            table_blocks.append("\n".join(buf))
            i += 1
            continue
        # RLS 单行（带分号）：
        #   ALTER TABLE ONLY <s>.<t> FORCE ROW LEVEL SECURITY;
        #   ALTER TABLE <s>.<t> ENABLE ROW LEVEL SECURITY;
        m = re.match(r"ALTER TABLE (?:ONLY )?(\"?)([\w]+)\1\.\1([\w]+)\1 (FORCE ROW LEVEL SECURITY|ENABLE ROW LEVEL SECURITY);", ln)
        if m and (m.group(2), m.group(3)) in tset:
            rls_alters.append((m.group(2), m.group(3), m.group(4)))
            i += 1
            continue
        # 两行 PK/FK：ALTER TABLE ONLY <s>.<t>（无分号）+ 下一行缩进 ADD CONSTRAINT ...;
        #  PK/UNIQUE：仅源表 ∈ 独有表；FK：目标表 ∈ 独有表（解掉 37 个源表在 5433 已存在的缺失 FK）
        m = re.match(r"ALTER TABLE ONLY (\"?)([\w]+)\1\.\1([\w]+)\1$", ln)
        if m:
            s, t = m.group(2), m.group(3)
            nxt = lines[i + 1] if i + 1 < n else ""
            cm = re.match(r"\s*ADD CONSTRAINT ([\w]+) (.+);", nxt)
            if cm:
                cname, defn = cm.group(1), cm.group(2)
                if "FOREIGN KEY" in defn:
                    fm = re.search(r"REFERENCES (\"?)([\w]+)\1\.\1([\w]+)\1", defn)
                    if fm and (fm.group(2), fm.group(3)) in tset:
                        fk_alters.append((s, t, cname, defn))
                elif (s, t) in tset:
                    pk_alters.append((s, t, cname, defn))
                i += 2
                continue
        # CREATE POLICY <name> ON <schema>.<table> ...;
        m = re.match(r"CREATE POLICY ([\w]+) ON (\"?)([\w]+)\2\.\2([\w]+)\2 (.+)", ln)
        if m and (m.group(3), m.group(4)) in tset:
            policies.append((m.group(3), m.group(4), m.group(1), m.group(5)))
            i += 1
            continue
        i += 1

    out_lines = [
        "-- =============================================================================",
        "-- 由 scripts/gen-orphan-tables-migration.py 生成：5432 独有表（运行时自建）系统性补链",
        f"-- 独有表 {len(table_blocks)} 张 | 序列 {len(seq_blocks)} | PK/UNIQUE {len(pk_alters)} |",
        f"-- FK（目标表∈独有表） {len(fk_alters)} | POLICY {len(policies)} | RLS {len(rls_alters)}",
        "-- =============================================================================",
        "",
        "-- 0) schema 兜底（5433 可能缺独有表所在 schema）",
        "",
    ]
    schemas = []
    for tb in table_blocks:
        m = re.match(r"CREATE (?:TABLE(?: IF NOT EXISTS)?|OR REPLACE VIEW) \"?([\w]+)\"?\.", tb)
        if m and m.group(1) not in schemas:
            schemas.append(m.group(1))
    for s in sorted(schemas):
        out_lines.append(f'CREATE SCHEMA IF NOT EXISTS "{s}";')
    out_lines += ["", "-- 1) 序列（独有表 DEFAULT nextval 依赖）", ""]
    for s in seq_blocks:
        out_lines.append(re.sub(r"^CREATE SEQUENCE ", "CREATE SEQUENCE IF NOT EXISTS ", s, count=1))
        out_lines.append("")
    out_lines += ["-- 2) 建表（含内联 CHECK；无 FK——FK 在步骤 3 后补）", ""]
    for tb in table_blocks:
        out_lines.append(re.sub(r"^CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", tb, count=1))
        out_lines.append("")
    out_lines += ["-- 3) PK/UNIQUE（DO $$ 幂等；conname 同 schema 全局唯一预检）", ""]
    for s, t, cname, defn in pk_alters:
        out_lines.append(
            "DO $$\nBEGIN\n"
            f"    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid "
            f"JOIN pg_namespace n ON n.oid=c.relnamespace "
            f"WHERE con.conname = '{cname}' AND n.nspname = '{s}') "
            f"AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid "
            f"JOIN pg_namespace n ON n.oid=c.relnamespace "
            f"WHERE con.conname = '{cname}' AND n.nspname = '{s}' "
            f"AND con.conrelid = to_regclass('\"{s}\".\"{t}\"')) THEN\n"
            f'        ALTER TABLE "{s}"."{t}" ADD CONSTRAINT "{cname}" {defn};\n'
            "    END IF;\nEND $$;"
        )
    out_lines += ["", "-- 4) FK（目标表在独有表集合内——解掉目标表缺失跳过的 FK）", ""]
    for s, t, cname, defn in fk_alters:
        out_lines.append(
            "DO $$\nBEGIN\n"
            f"    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid "
            f"JOIN pg_namespace n ON n.oid=c.relnamespace "
            f"WHERE con.conname = '{cname}' AND n.nspname = '{s}' "
            f"AND con.conrelid = to_regclass('\"{s}\".\"{t}\"')) THEN\n"
            f'        ALTER TABLE "{s}"."{t}" ADD CONSTRAINT "{cname}" {defn};\n'
            "    END IF;\nEND $$;"
        )
    out_lines += ["", "-- 5) RLS POLICY + 启用（独有表启用 RLS 的）", ""]
    for s, t, pname, body in policies:
        out_lines.append(
            "DO $$\nBEGIN\n"
            f"    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = '{pname}' "
            f"AND polrelid = to_regclass('\"{s}\".\"{t}\"')) THEN\n"
            f'        CREATE POLICY "{pname}" ON "{s}"."{t}" {body.rstrip(";")};\n'
            "    END IF;\nEND $$;"
        )
    for s, t, act in rls_alters:
        out_lines.append(f'ALTER TABLE "{s}"."{t}" {act};')
    out_lines.append("")
    open(out, "w").write("\n".join(out_lines))
    print(f"生成 {out}: 表 {len(table_blocks)} / 序列 {len(seq_blocks)} / PK+UNIQUE {len(pk_alters)} "
          f"/ FK {len(fk_alters)} / POLICY {len(policies)} / RLS {len(rls_alters)}")

if __name__ == "__main__":
    main()
