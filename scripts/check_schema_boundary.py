#!/usr/bin/env python3
"""
TOPEMS 编译时 Schema 边界门禁检查（CI 用）。

背景：模块化单体要求每个服务只能查询自己的 schema（+ 显式声明的共享只读 schema）。
本脚本扫描所有 svc/*/src 的 Rust 源码中的 SQL 字符串字面量，提取 `schema.table` 引用，
对照各服务的 schema 白名单（scripts/schema_boundary.json），发现未授权跨 schema 引用即失败。

用法：
    python3 scripts/check_schema_boundary.py            # 全量检查（默认）
    python3 scripts/check_schema_boundary.py --svc crm  # 单服务检查
    python3 scripts/check_schema_boundary.py --json     # 输出 JSON 汇总

退出码：0=通过，1=存在未授权跨 schema 引用。
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT, "scripts", "schema_boundary.json")

# SQL 关键字 / 常见非 schema 前缀，出现在 `x.y` 位置时不视为 schema 引用
SQL_PREFIX_NON_SCHEMA = {
    # 关键字
    "from", "join", "into", "update", "on", "where", "select", "insert", "set",
    "values", "and", "or", "not", "in", "is", "null", "as", "asc", "desc",
    "order", "group", "by", "limit", "offset", "having", "distinct", "count",
    "sum", "avg", "min", "max", "coalesce", "case", "when", "then", "else",
    "end", "exists", "any", "all", "between", "like", "ilike", "over",
    "partition", "returning", "left", "right", "inner", "outer", "cross",
    "full", "union", "except", "intersect", "window", "filter", "within",
    "current_date", "current_timestamp", "now", "extract", "date_trunc",
    "row_number", "rank", "dense_rank", "lag", "lead", "first_value",
    "last_value", "string_agg", "array_agg", "jsonb_agg", "json_agg",
    # 类型 / 伪列
    "text", "int", "integer", "bigint", "numeric", "varchar", "bool",
    "boolean", "date", "time", "float", "float8", "double", "uuid", "json",
    "jsonb", "timestamp", "timestamptz", "interval", "void", "char",
    "smallint", "real", "serial", "bigserial", "bytea", "inet", "cidr",
    "decimal", "money", "pg_type", "pg_class", "pg_namespace", "pg_attr",
    "pg_index", "pg_attribute", "pg_constraint", "pg_database", "pg_tables",
    "pg_proc", "pg_trigger", "pg_views", "pg_matviews", "pg_roles",
    "pg_user", "pg_settings", "pg_enum", "pg_range", "pg_am", "pg_opclass",
    "pg_cast", "pg_collation", "pg_conversion", "pg_operator", "pg_stat",
    # 常见单字符别名（a/b/c/o/p/q/r/s/t/v/x/y/z/i/u/w/e/n/m/g/k/h/l/d/f）
}


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_sql_strings(content):
    """从 Rust 源码提取所有字符串字面量（普通 "..." + raw r#"..."#）。"""
    sqls = []
    pos = 0
    n = len(content)
    while True:
        q = content.find('"', pos)
        rq = re.search(r'\br(?=#+")', content[pos:])
        rq_pos = pos + rq.start() if rq else -1
        starts = [i for i in (q, rq_pos) if i != -1]
        if not starts:
            break
        start = min(starts)
        if start == rq_pos:
            m = re.match(r'r(#*)"', content[start:])
            hashes = len(m.group(1))
            em = '"' + '#' * hashes
            end = content.find(em, start + m.end())
            if end == -1:
                break
            sqls.append(content[start + m.end():end])
            pos = end + len(em)
        else:
            j = start + 1
            while j < n:
                if content[j] == '\\' and j + 1 < n:
                    j += 2
                    continue
                if content[j] == '"':
                    break
                j += 1
            if j >= n:
                break
            sqls.append(content[start + 1:j])
            pos = j + 1
    return sqls


def extract_schema_refs(sql):
    """从 SQL 提取可能的 schema.table 引用，返回 (schema, table) 列表。
    只提取"看起来像 schema 引用"的 x.y 结构（x 非 SQL 关键字/类型/常见别名）。"""
    refs = []
    for m in re.finditer(r'(?<![\w.])([a-z_][a-z0-9_]{1,63})\.([a-z_][a-z0-9_]{0,63})', sql, re.IGNORECASE):
        x, y = m.group(1).lower(), m.group(2).lower()
        if x in SQL_PREFIX_NON_SCHEMA:
            continue
        # 排除行级安全/JSON 路径等（json->'x.y' 已在字符串外）
        refs.append((x, y))
    return refs


def service_schema_refs(service_dir, known_schemas):
    """扫描单个服务的所有 SQL，收集 schema 引用（只保留 x 属于 DB 真实 schema 的）。"""
    refs = []
    for path in glob.glob(os.path.join(service_dir, "src", "**", "*.rs"), recursive=True):
        try:
            content = open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue
        for sql in extract_sql_strings(content):
            if not re.search(r'\b(from|into|update|join)\s+', sql, re.IGNORECASE):
                continue  # 非 SQL 字符串
            for x, y in extract_schema_refs(sql):
                if x in known_schemas:  # 只把 DB 真实 schema 名视为 schema 引用
                    rel = os.path.relpath(path, ROOT)
                    refs.append((x, y, rel))
    return refs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--svc", help="只检查指定服务目录名")
    ap.add_argument("--json", action="store_true", help="输出 JSON")
    args = ap.parse_args()

    cfg = load_config()
    default_shared = set(cfg["default_shared"])
    services = cfg["services"]

    # DB 真实 schema 名集合（从配置推导 + 固定系统 schema）
    known_schemas = set(default_shared)
    for info in services.values():
        known_schemas.add(info["schema"])
        known_schemas.update(info.get("allow", []))

    violations = []
    summary = {}

    for svc in sorted(services):
        if args.svc and svc != args.svc:
            continue
        info = services[svc]
        own = info["schema"]
        allowed = set(default_shared) | {own} | set(info.get("allow", []))
        service_dir = os.path.join(ROOT, "svc", svc)
        if not os.path.isdir(service_dir):
            summary[svc] = {"status": "SKIP", "refs": 0}
            continue
        refs = service_schema_refs(service_dir, known_schemas)
        bad = []
        for x, y, rel in refs:
            if x not in allowed:
                bad.append((x, y, rel))
        if bad:
            violations.append((svc, bad))
        summary[svc] = {
            "status": "FAIL" if bad else "PASS",
            "schema": own,
            "allowed": sorted(allowed),
            "refs": len(refs),
            "violations": [f"{x}.{y} in {rel}" for x, y, rel in bad],
        }

    if args.json:
        print(json.dumps({"violations": violations, "summary": summary}, ensure_ascii=False, indent=2))
    else:
        if violations:
            print("✗ Schema 边界门禁失败：存在未授权跨 schema 引用\n")
            for svc, bad in violations:
                print(f"  [{svc}] 引用未授权 schema:")
                for x, y, rel in bad:
                    print(f"      {x}.{y}  <-  {rel}")
        else:
            print("✓ Schema 边界门禁通过：所有服务的 SQL 引用均在白名单内")
        for svc, s in summary.items():
            print(f"  {svc:15s} {s['status']:4s} schema={s['schema']:12s} 引用={s['refs']}")

    sys.exit(1 if violations else 0)


if __name__ == "__main__":
    main()
