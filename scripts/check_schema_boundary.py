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
    只提取"看起来像 schema 引用"的 x.y 结构（x 非 SQL 关键字/类型/常见别名，
    且未被本 SQL 声明为表别名）。"""
    refs = []
    # 该 SQL 中已声明的表别名（FROM/JOIN t [AS] a）——避免把别名当 schema
    aliases = set()
    for m in re.finditer(r'\b(?:from|join)\s+[a-z_][a-z0-9_]*\s+(?:as\s+)?([a-z_][a-z0-9_]*)', sql, re.IGNORECASE):
        aliases.add(m.group(1).lower())
    for m in re.finditer(r'(?<![\w.])([a-z_][a-z0-9_]{1,63})\.([a-z_][a-z0-9_]{0,63})', sql, re.IGNORECASE):
        x, y = m.group(1).lower(), m.group(2).lower()
        if x in SQL_PREFIX_NON_SCHEMA:
            continue
        if x in aliases:
            continue  # 表别名，非 schema 引用
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


def extract_bare_table_refs(sql):
    """提取无前缀表名引用（FROM/JOIN/INTO/UPDATE/TABLE/REFERENCES 后的裸表名）。"""
    refs = set()
    for m in re.finditer(r'\b(?:from|join|into|update|table|references)\s+([a-z_][a-z0-9_]*)', sql, re.IGNORECASE):
        n = m.group(1).lower()
        if n not in SQL_PREFIX_NON_SCHEMA:
            refs.add(n)
    return refs


def load_table_owner():
    """加载表名->schema 静态归属映射（scripts/schema_boundary_tables.json，由阶段0 迁移结果导出）。"""
    path = os.path.join(ROOT, "scripts", "schema_boundary_tables.json")
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("table_owner", {}), data.get("ambiguous", {})
    except (OSError, json.JSONDecodeError):
        return {}, {}


def service_bare_refs(service_dir):
    """收集单个服务的全部无前缀表引用。"""
    refs = set()
    for path in glob.glob(os.path.join(service_dir, "src", "**", "*.rs"), recursive=True):
        try:
            content = open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue
        for sql in extract_sql_strings(content):
            if not re.search(r'\b(from|into|update|join)\s+', sql, re.IGNORECASE):
                continue
            refs |= extract_bare_table_refs(sql)
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

    # 无前缀引用检查（阶段1 逻辑隔离）：表归属静态映射 + 存量基线豁免
    table_owner, ambiguous = load_table_owner()
    bare_baseline = {(b["service"], b["table"]) for b in cfg.get("bare_ref_baseline", [])}
    bare_allow = cfg.get("bare_ref_allow", {})

    violations = []
    bare_new = []
    bare_known = []
    summary = {}

    for svc in sorted(services):
        if args.svc and svc != args.svc:
            continue
        info = services[svc]
        own = info["schema"]
        allowed = set(default_shared) | {own} | set(info.get("allow", []))
        service_dir = os.path.join(ROOT, "svc", svc)
        if not os.path.isdir(service_dir):
            summary[svc] = {"status": "SKIP", "refs": 0, "bare_violations": 0, "bare_known": 0}
            continue
        refs = service_schema_refs(service_dir, known_schemas)
        bad = []
        for x, y, rel in refs:
            if x not in allowed:
                bad.append((x, y, rel))
        if bad:
            violations.append((svc, bad))

        # 无前缀引用：解析归属 -> 跨 schema 直读检测
        sp = set(x.strip() for x in info.get("search_path", own).split(","))
        allowed_owner = set(default_shared) | {own} | sp | set(bare_allow.get(svc, []))
        bnew, bknown = [], []
        for t in sorted(service_bare_refs(service_dir)):
            if t in ambiguous:
                bknown.append((t, "ambiguous"))
                continue
            if t not in table_owner:
                continue
            owner = table_owner[t]
            if owner in allowed_owner:
                continue
            if (svc, t) in bare_baseline:
                bknown.append((t, owner))
            else:
                bnew.append((t, owner))
        if bnew:
            bare_new.append((svc, bnew))
        if bknown:
            bare_known.append((svc, bknown))

        summary[svc] = {
            "status": "FAIL" if (bad or bnew) else "PASS",
            "schema": own,
            "allowed": sorted(allowed),
            "refs": len(refs),
            "violations": [f"{x}.{y} in {rel}" for x, y, rel in bad],
            "bare_violations": [f"{t}->{o}" for t, o in bnew],
            "bare_known": [f"{t}->{o}" for t, o in bknown],
        }

    if args.json:
        print(json.dumps({
            "violations": violations, "bare_new": bare_new, "bare_known": bare_known,
            "summary": summary,
        }, ensure_ascii=False, indent=2))
    else:
        if violations:
            print("✗ Schema 边界门禁失败：存在未授权跨 schema 引用\n")
            for svc, bad in violations:
                print(f"  [{svc}] 引用未授权 schema:")
                for x, y, rel in bad:
                    print(f"      {x}.{y}  <-  {rel}")
        if bare_new:
            print("✗ Schema 边界门禁失败：存在新增无前缀跨 schema 直读（阶段1 逻辑隔离）\n")
            for svc, b in bare_new:
                print(f"  [{svc}] 无前缀直读非本服务 schema:")
                for t, o in b:
                    print(f"      {t} -> {o}.{t}")
        if not violations and not bare_new:
            print("✓ Schema 边界门禁通过：所有服务 SQL 引用均在白名单内（含无前缀引用解析）")
        for svc, s in summary.items():
            extra = ""
            if s.get("bare_violations"):
                extra += f" 新增裸引用={len(s['bare_violations'])}"
            if s.get("bare_known"):
                extra += f" 已知基线={len(s['bare_known'])}"
            print(f"  {svc:15s} {s['status']:4s} schema={s['schema']:12s} 引用={s['refs']}{extra}")

    sys.exit(1 if (violations or bare_new) else 0)


if __name__ == "__main__":
    main()
