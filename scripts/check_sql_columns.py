#!/usr/bin/env python3
"""
check_sql_columns.py — 全服务 SQL 列名与真库一致性校验

背景：sqlx::query()（非 query! 宏）的 SQL 在编译期不校验列名/表名，
列名与真库漂移时运行时才 500（如 equipment.name vs equipment_name、
work_stations.name vs station_name、contracts.title_en 缺列等）。

用法：
  python3 scripts/check_sql_columns.py          # 扫描 svc/*/src 的 UPDATE/INSERT 列名校验
  python3 scripts/check_sql_columns.py --out f  # 输出报告到文件
  python3 scripts/check_sql_columns.py --limit N  # 只显示前 N 条

依赖：运行库 5433 可连接（PGPASSWORD=topems_app_secret），含 RLS options。
"""
import re
import subprocess
import collections
import sys
import os

RUN_DB = "postgresql://topems_app@localhost:5433/topems?options=-capp.tenant_id%3D00000000-0000-0000-0000-000000000000"
PSQL_PREFIX = "PGPASSWORD=topems_app_secret psql " + RUN_DB

def load_schema():
    psql = f'{PSQL_PREFIX} -t -A -c "SELECT table_schema || chr(46) || table_name || chr(46) || column_name FROM information_schema.columns WHERE table_schema NOT IN (chr(112)||chr(103)||chr(95)||chr(99)||chr(97)||chr(116)||chr(97)||chr(108)||chr(111)||chr(103), chr(105)||chr(110)||chr(102)||chr(111)||chr(114)||chr(109)||chr(97)||chr(116)||chr(105)||chr(111)||chr(110)||chr(95)||chr(115)||chr(99)||chr(104)||chr(101)||chr(109)||chr(97))"' 
    out = subprocess.run(psql, shell=True, capture_output=True, text=True).stdout
    cols_map = {}
    tbl_index = collections.defaultdict(set)
    for line in out.split():
        parts = line.split(".")
        if len(parts) == 3:
            sch, tbl, col = parts
            cols_map.setdefault(f"{sch}.{tbl}", set()).add(col)
            tbl_index[tbl].add(sch)
    return cols_map, tbl_index

def check_update(cols_map, tbl_index, f, tbl, setpart, issues, missing):
    if "${" in setpart:
        return
    for col in re.findall(r"([a-zA-Z_]\w*)\s*=", setpart):
        col = col.strip()
        if col in ("updated_at", "created_at", "deleted_at") or col.startswith("$"):
            continue
        _check(cols_map, tbl_index, f, tbl, col, issues, missing, "UPDATE")

def check_insert(cols_map, tbl_index, f, tbl, colstr, issues, missing):
    if "${" in colstr:
        return
    for col in colstr.split(","):
        col = col.strip().split(".")[-1]
        if col and not col.startswith("$") and not col.startswith("'"):
            _check(cols_map, tbl_index, f, tbl, col, issues, missing, "INSERT")

def _check(cols_map, tbl_index, f, tbl, col, issues, missing, kind):
    if "." in tbl:
        key = tbl
        if key not in cols_map:
            missing[tbl] += 1
            return
        if col not in cols_map[key]:
            issues[f"{kind} {key}.{col}"].append(f.split('/')[-2] + "/" + f.split('/')[-1])
        return
    schemas = tbl_index.get(tbl)
    if not schemas:
        missing[tbl] += 1
        return
    for sch in schemas:
        if col in cols_map.get(f"{sch}.{tbl}", set()):
            return
    schs = ",".join(sorted(schemas)[:3])
    issues[f"{kind} {tbl}.{col}（schema:{schs}）"].append(f.split('/')[-2] + "/" + f.split('/')[-1])

def main():
    args = sys.argv[1:]
    out_file = None
    limit = None
    for i, a in enumerate(args):
        if a == "--out" and i + 1 < len(args):
            out_file = args[i + 1]
        if a == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
    cols_map, tbl_index = load_schema()
    issues = collections.defaultdict(list)
    missing = collections.Counter()
    files = subprocess.run(["grep", "-rl", "sqlx::query", "svc"], capture_output=True, text=True).stdout.split()
    pat_upd = re.compile(r"(?:UPDATE|update)\s+([a-zA-Z_][\w.]*)\s+SET\s+([\s\S]*?)(?:\sWHERE\s|\sRETURNING\s|\))", re.I)
    pat_ins = re.compile(r"(?:INSERT\s+INTO)\s+([a-zA-Z_][\w.]*)\s*\(([^)]+)\)\s*VALUES", re.I)
    for f in files:
        try:
            s = open(f, encoding="utf-8").read()
        except Exception:
            continue
        for m in pat_upd.finditer(s):
            check_update(cols_map, tbl_index, f, m.group(1), m.group(2), issues, missing)
        for m in pat_ins.finditer(s):
            check_insert(cols_map, tbl_index, f, m.group(1), m.group(2), issues, missing)

    lines = []
    lines.append(f"扫描文件数: {len(files)}，库中表数: {len(cols_map)}")
    lines.append("")
    lines.append("=== 列不存在问题（kind 表.列 <- 文件）===")
    for key, files_ in sorted(issues.items()):
        lines.append(f"  {key}  <- {', '.join(sorted(set(files_))[:6])}")
    lines.append("")
    lines.append("=== 库中不存在表 ===")
    for t, c in missing.most_common(20):
        lines.append(f"  {t} x{c}")
    text = "\n".join(lines)
    if out_file:
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"报告已写入 {out_file}（{len(issues)} 项列问题）")
    else:
        print(text[:limit * 200 if limit else None])

if __name__ == "__main__":
    main()
