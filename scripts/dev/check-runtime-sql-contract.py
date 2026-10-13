#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-runtime-sql-contract.py — TOPEMS 运行时查询风格 crate 的「在线 SQL 契约门禁」

背景：qms/pdm/lims/ehs/pm/ticket 等 crate 走运行时 `sqlx::query(_as|_scalar)`
（或 `only_own_schema_query!` 展开为运行时 SQL 字符串），不做 sqlx 编译期类型检查，
离线 cargo check 绿 ≠ SQL↔真实 schema 契约成立。本脚本对 live/test DB 逐个
`PREPARE` 这些运行时 SQL，把「缺列/缺表/别名错/运算符错/类型强制错」挡在 CI。

用法：
  python3 scripts/dev/check-runtime-sql-contract.py                     # live DB(5432)，默认 6 crate
  python3 scripts/dev/check-runtime-sql-contract.py --db-url postgres://...@host:5432/db
  python3 scripts/dev/check-runtime-sql-contract.py --crates qms,pdm     # 指定 crate
  python3 scripts/dev/check-runtime-sql-contract.py --json              # 机器可读输出

错误分级（SQLSTATE）：
  硬失败 HARD  → 关系/列/函数不存在、语法错、运算符/类型强制错（42P01/42703/42601/42883/42804/42704/42702/22xxx）
  软警告 WARN  → 参数类型无法推断（42P18），运行时可能因显式 bind 而合法，不阻断
  跳过 SKIP   → SQL 不含增删改查关键字（非查询字面量，如纯 DDL 动态拼接/非 SQL）

退出码：任一 crate 有 HARD 失败 → 1；否则 0。
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_URL = "postgresql://topems:3b07cf82f13669d9c360214db1fc2d40@localhost:5432/topems"
DEFAULT_CRATES = ["qms", "pdm", "lims", "ehs", "pm", "ticket"]

# 目标调用形态：sqlx::query / query_as / query_scalar（含 ::<T> 类型实参）+ only_own_schema_query!
CALL_RE = re.compile(
    r"sqlx::query(?:_as|_scalar)?(?:::[^()]*)?\s*\(\s*(?P<sql>r?#*\"|\")"
)
OOSQ_RE = re.compile(
    r"only_own_schema_query!\s*\(\s*\"[^\"]*\"\s*,\s*(?P<sql>r?#*\"|\")"
)

# SQL 关键动作词，用于过滤非查询字面量
SQL_KW = re.compile(r"\b(select|insert|update|delete|with|values|truncate)\b", re.IGNORECASE)

# 错误分级
HARD_SQLSTATE = {
    "42P01": "relation does not exist",
    "42703": "column does not exist",
    "42704": "undefined object/type",
    "42702": "ambiguous column",
    "42601": "syntax error",
    "42883": "operator/function does not exist",
    "42804": "datatype mismatch",
    "42602": "invalid name",
}
WARN_SQLSTATE = {"42P18": "could not determine data type of parameter"}
# 其余 22xxx 数据异常、42xxx 对象异常等：除明确白名单外，视 HARD 以最大化契约保障
SOFT_SQLSTATE = {"00000"}


def _read_literal(content, start_idx, token):
    """从 content[start_idx] 处 token(起始引号) 起，完整读回一个 Rust 字符串字面量。"""
    if token.startswith("r"):
        # raw 字符串：r#"..."# ；闭合是 引号" 后跟 N 个 #，N 与开头一致
        hashes = token.count("#")
        close = '"' + "#" * hashes
        body_start = start_idx + len(token)
        end = content.find(close, body_start)
        return content[body_start:end] if end != -1 else None
    # 普通字符串，处理 \" 与 \\ 转义
    i = start_idx
    if content[i] != '"':
        return None
    i += 1
    buf = []
    while i < len(content):
        ch = content[i]
        if ch == "\\" and i + 1 < len(content):
            buf.append(content[i + 1]); i += 2; continue
        if ch == '"':
            break
        buf.append(ch); i += 1
    return "".join(buf)


# 只认「以 SQL 语句关键字开头」的字面量，避免把中文文案/消息当 SQL
SQL_START = re.compile(
    r"^\s*(select|with|insert|update|delete|values|truncate|explain|call|merge)\b",
    re.IGNORECASE,
)


def extract_sql_from_file(text):
    """返回该文件中的 (sql, 行号) 列表（仅首参为字面量且以 SQL 关键字开头）。"""
    out = []
    for m in CALL_RE.finditer(text):
        tok = m.group("sql")
        sql = _read_literal(text, m.start("sql"), tok)
        if sql and SQL_START.match(sql):
            out.append((sql, text.count("\n", 0, m.start()) + 1))
    for m in OOSQ_RE.finditer(text):
        tok = m.group("sql")
        sql = _read_literal(text, m.start("sql"), tok)
        if sql and SQL_START.match(sql):
            out.append((sql, text.count("\n", 0, m.start()) + 1))
    return out


def classify(sqlstate, msg):
    if sqlstate in WARN_SQLSTATE:
        return "WARN"
    if sqlstate in HARD_SQLSTATE or sqlstate not in SOFT_SQLSTATE:
        return "HARD"
    return "OK"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url", default=DEFAULT_DB_URL)
    ap.add_argument("--crates", default=",".join(DEFAULT_CRATES))
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    crates = [c.strip() for c in args.crates.split(",") if c.strip()]

    import psycopg2
    conn = psycopg2.connect(args.db_url)
    conn.autocommit = True

    report = {}
    hard_any = False
    for crate in crates:
        src = ROOT / "svc" / crate / "src"
        if not src.is_dir():
            report[crate] = {"error": f"目录不存在 {src}"}; hard_any = True; continue
        items = []
        for f in sorted(src.rglob("*.rs")):
            try:
                items.extend((sql, f.relative_to(ROOT).as_posix(), line)
                             for sql, line in extract_sql_from_file(f.read_text()))
            except Exception:
                pass
        schema = crate  # schema 名与 crate 同名
        stats = {"total": len(items), "hard": [], "warn": 0, "ok": 0, "skipped": 0}
        cur = conn.cursor()
        cur.execute(f"SET search_path TO {schema}, public")
        for i, (sql, fpath, line) in enumerate(items):
            name = f"_rc_{crate}_{i:04d}"
            try:
                cur.execute(f"PREPARE {name} AS {sql}")
                cur.execute(f"DEALLOCATE {name}")
                stats["ok"] += 1
            except psycopg2.Error as e:
                sqlstate = getattr(e, "pgcode", "UNKNOWN")
                kind = classify(sqlstate, str(e).splitlines()[0])
                if kind == "HARD":
                    stats["hard"].append({"file": fpath, "line": line, "sqlstate": sqlstate,
                                          "error": str(e).splitlines()[0], "sql": sql})
                    hard_any = True
                elif kind == "WARN":
                    stats["warn"] += 1
                else:
                    stats["ok"] += 1
        stats["passed"] = stats["ok"] + stats["warn"]
        stats["hard_count"] = len(stats["hard"])
        report[crate] = stats
        cur.close()

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        for crate, st in report.items():
            if "error" in st:
                print(f"[{crate}] ✗ {st['error']}"); continue
            flag = "✗" if st["hard_count"] else "✓"
            print(f"[{crate}] {flag} total={st['total']} pass={st['passed']} "
                  f"hard={st['hard_count']} warn={st['warn']}")
            for h in st["hard"][:15]:
                print(f"    HARD {h['sqlstate']} {h['file']}:{h['line']} :: {h['error']}")
            if st["hard_count"] > 15:
                print(f"    … 另 {st['hard_count']-15} 条 HARD（见 --json）")
    conn.close()
    sys.exit(1 if hard_any else 0)


if __name__ == "__main__":
    main()
