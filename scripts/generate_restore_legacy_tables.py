#!/usr/bin/env python3
"""从 5432 抽取 6 张遗留设备表权威结构，生成幂等恢复迁移（v253 前置）。"""
import subprocess
import re

PSQL = "/opt/homebrew/opt/postgresql@18/bin/psql"

def q(db_port, sql):
    r = subprocess.run([PSQL, "-h", "localhost", "-p", str(db_port), "-U", "topems", "-d", "topems",
                        "-tA", "-F", "|", "-c", sql], capture_output=True, text=True,
                       env={"PGPASSWORD": "topems_secret"})
    if r.returncode != 0:
        raise RuntimeError(f"psql failed: {r.stderr}")
    return [l.split("|") for l in r.stdout.strip().split("\n") if l]

tables = [
    ("public", "equipment"),
    ("public", "equipment_inspections"),
    ("public", "equipment_maintenance_records"),
    ("rs", "equipment"),
    ("rs", "equipment_inspections"),
    ("rs", "equipment_maintenance_records"),
]

def fmt_type(dtype, clen, prec, scale):
    if dtype == "character varying":
        return f"VARCHAR({clen})"
    if dtype == "numeric":
        return f"NUMERIC({prec},{scale})"
    return dtype.upper()

out = []
for schema, tbl in tables:
    rows = q(5432, f"""SELECT column_name, data_type, COALESCE(character_maximum_length::text,''),
        COALESCE(numeric_precision::text,''), COALESCE(numeric_scale::text,''),
        is_nullable, COALESCE(column_default,'') FROM information_schema.columns
        WHERE table_schema='{schema}' AND table_name='{tbl}' ORDER BY ordinal_position""")
    if not rows:
        print(f"MISSING {schema}.{tbl} on 5432", flush=True)
        continue
    out.append(f'-- ============ {schema}.{tbl}（5432 权威结构恢复）============')
    out.append(f'CREATE TABLE IF NOT EXISTS "{schema}"."{tbl}" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());')
    for (name, dtype, clen, prec, scale, nullable, default) in rows:
        if name == "id":
            continue
        t = fmt_type(dtype, clen, prec, scale)
        nn = "" if nullable == "YES" else " NOT NULL"
        dft = f" DEFAULT {default}" if default else ""
        out.append(f'ALTER TABLE "{schema}"."{tbl}" ADD COLUMN IF NOT EXISTS "{name}" {t}{nn}{dft};')
    out.append("")
    print(f"  {schema}.{tbl}: {len(rows)-1} cols", flush=True)

sql = """-- ================================================================================
-- 20260821100000_restore_legacy_equipment_tables.sql
-- 空库重建遗留表恢复（v253 依赖的旧设备域表）
-- ================================================================================
-- 背景（2026-09-18 全链验证发现）：20260821200000_v253_unify_schema_nullability.sql
-- 对 public/rs 的 equipment_inspections / equipment_maintenance_records 做列对齐与 FK，
-- 其依赖的遗留表 DDL 在 2026-09-07 收敛时从 init/postgres 移除、未完整落入迁移链，
-- 空库重建时这些表仅存裸骨架（id,deleted_at）或完全缺失（public.equipment），
-- 导致 v253 在行 7942 报 column "equipment_id" does not exist。
-- 本迁移从 5432 活跃库（遗留结构唯一保存处）恢复 6 张表的权威列定义，版本置于 v253 之前。
-- 幂等：CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS。
-- 注意：FK（equipment_id -> public.equipment）由 v253 自行 DROP IF EXISTS + ADD，
--       本迁移不建 FK，避免与 v253 冲突。
-- ================================================================================

""" + "\n".join(out)
path = "database/migrations/20260821100000_restore_legacy_equipment_tables.sql"
open(path, "w", encoding="utf-8").write(sql)
print(f"Generated {len(sql)} chars -> {path}", flush=True)
