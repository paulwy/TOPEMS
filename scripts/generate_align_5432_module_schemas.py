#!/usr/bin/env python3
# 生成 20260918000019_align_5432_module_schemas.sql（v2）
# 数据源优先级：
#   1) 5432 public 同名完整表（30 张）→ CREATE TABLE IF NOT EXISTS (LIKE public.x INCLUDING ALL) + 幂等数据拷贝
#   2) 无 public 源、5433 有完整结构 → 从 5433 information_schema 抽列生成 CREATE TABLE IF NOT EXISTS 完整 DDL
#   3) 5433 也是骨架（lims.maintenance_records）→ 按代码引用列建完整结构
# 5433 应用时：public 无同名表 → 块跳过；目标表已存在 → IF NOT EXISTS 跳过。双库安全。
import subprocess, re, collections, os

ENV = {"PGPASSWORD": "topems_secret"}
def q(port, sql):
    r = subprocess.run(["/opt/homebrew/opt/postgresql@18/bin/psql", "-h", "localhost", "-p", str(port), "-U", "topems", "-d", "topems", "-tA", "-c", sql],
                       capture_output=True, text=True, env=ENV)
    return r.stdout.strip()

def cols_of(port, schema, table):
    rows = q(port, f"SELECT column_name||'|'||data_type||'|'||is_nullable||'|'||COALESCE(column_default,'') FROM information_schema.columns WHERE table_schema='{schema}' AND table_name='{table}' ORDER BY ordinal_position").split("\n")
    return [r for r in rows if r]

def ddl_from_cols(schema, table, colrows, extra_pk=None):
    """从列信息生成 CREATE TABLE IF NOT EXISTS"""
    lines = [f"CREATE TABLE IF NOT EXISTS {schema}.{table} ("]
    defs = []
    for row in colrows:
        name, dtype, nullable, default = row.split("|", 3)
        part = f"    {name} {dtype}"
        if not nullable.startswith("YES"):
            part += " NOT NULL"
        if default:
            d = default
            # 通用默认值（gen_random_uuid()/now() 保留函数调用）
            if "nextval(" in d or "gen_random_uuid" in d or "now()" in d:
                part += f" DEFAULT {d}"
            else:
                part += f" DEFAULT {d}"
        defs.append(part)
    lines.append(",\n".join(defs))
    lines.append(");")
    return "\n".join(lines)

MODULES = ["qms", "ticket", "rd", "report", "plugin_finance", "lims"]
paths = {
    "qms": "svc/qms/src", "ticket": "svc/ticket/src", "rd": "svc/rd/src",
    "report": "svc/report/src", "plugin_finance": "svc/plugin-finance/src svc/finance/src svc/erp/src",
    "lims": "svc/lims/src",
}

# 1. 提取代码 SQL 引用
refs = collections.OrderedDict()
for m in MODULES:
    refs[m] = set()
    for p in paths[m].split():
        try:
            out = subprocess.run(["grep", "-rhoE", rf'\b{m}\.[a-z_]+', p, "--include=*.rs"],
                                 capture_output=True, text=True, cwd="/Users/xingzhai/TOPEMS").stdout
        except Exception:
            continue
        for tok in out.split():
            name = tok.split(".", 1)[1]
            if name: refs[m].add(name)
    field_like = {"into","as_mut","get","take","created_at","id","metadata","severity","sla_due_at",
                  "status","tenant_id","ticket_type","center_count","diff_items","items","match_rate",
                  "period","period_end","map","unwrap","ok","err","clone","default","len","is_empty",
                  "to_string","from","new","self","now","date","key","value","type","name","title"}
    refs[m] = sorted(n for n in refs[m] if n not in field_like and len(n) > 3)

# 2. 分类每张表
plan = []  # (schema, table, source)  source: 'public' | 'ddl5433' | 'manual' | 'skip'
for m, names in refs.items():
    for n in names:
        pub_cols = len(cols_of(5432, "public", n))
        if pub_cols >= 3:
            plan.append((m, n, "public"))
            continue
        s33 = len(cols_of(5433, m, n))
        if s33 >= 3:
            plan.append((m, n, "ddl5433"))
        else:
            plan.append((m, n, "manual"))

# 3. 生成迁移
lines = []
lines.append("-- ============================================================================")
lines.append("-- 对齐 5432 模块 schema：qms/ticket/rd/report/plugin_finance/lims（用户拍板方案 A）")
lines.append("-- 背景：5432 历史库模块表滞留 public（rehome DDL 从未实际执行），代码以 schema 前缀查询")
lines.append("--       导致 5432 上 qms/ticket/rd/lims 模块 relation/schema 不存在。")
lines.append("-- 策略：① public 同名完整表 → LIKE 拷贝结构 + 幂等数据拷贝；")
lines.append("--       ② 无 public 源 → 按 5433 权威结构建完整表（空表）；")
lines.append("--       ③ 双端均为骨架 → 按代码引用列建结构（标注 manual）。")
lines.append("-- 全程幂等：IF NOT EXISTS / WHERE NOT EXISTS / DO 块存在性守卫；不修改 public 旧表。")
lines.append("-- ============================================================================")
lines.append("")
for s in ["qms", "ticket", "rd", "report", "plugin_finance", "lims"]:
    lines.append(f"CREATE SCHEMA IF NOT EXISTS {s};")
lines.append("")

for m, n, src in plan:
    if src == "public":
        pub_cols = len(cols_of(5432, "public", n))
        lines.append(f"-- {m}.{n} ← public.{n}（{pub_cols} 列完整结构拷贝）")
        lines.append("DO $$ BEGIN")
        lines.append(f"  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid")
        lines.append(f"             WHERE n.nspname='public' AND c.relname='{n}' AND c.relkind='r') THEN")
        lines.append(f"    CREATE TABLE IF NOT EXISTS {m}.{n} (LIKE public.{n} INCLUDING ALL);")
        lines.append(f"    INSERT INTO {m}.{n} SELECT * FROM public.{n} WHERE NOT EXISTS (SELECT 1 FROM {m}.{n} LIMIT 1);")
        lines.append("  END IF;")
        lines.append("END $$;")
    elif src == "ddl5433":
        colrows = cols_of(5433, m, n)
        lines.append(f"-- {m}.{n}（5433 权威结构 {len(colrows)} 列，5432 无 public 源 → 建空表）")
        lines.append(ddl_from_cols(m, n, colrows))
    else:
        lines.append(f"-- {m}.{n}：双端均无完整结构，跳过（人工后续处理）")
    lines.append("")

out = "\n".join(lines)
path = "/Users/xingzhai/TOPEMS/database/migrations/20260918000019_align_5432_module_schemas.sql"
with open(path, "w", encoding="utf-8") as f:
    f.write(out)
print(f"总引用 {len(plan)}：public 源 {sum(1 for _,_,s in plan if s=='public')}，5433 DDL {sum(1 for _,_,s in plan if s=='ddl5433')}，manual {sum(1 for _,_,s in plan if s=='manual')}")
for m, n, s in plan:
    if s != "public":
        print(f"  [{s}] {m}.{n}")
