#!/usr/bin/env python3
"""
RLS 覆盖核查脚本（P2-1 RLS 数据权限覆盖）
==========================================
扫描全部 SQL（database/** 与 svc/**/migrations/*.sql），输出：
  - 已显式启用 RLS 的表（ALTER TABLE ... ENABLE ROW LEVEL SECURITY）
  - 已建但未启用 RLS 的表（按 schema 分组，供逐表判定是否需要）
  - 覆盖统计

用法:
  python3 scripts/check-rls-coverage.py            # 输出报告到 stdout
  python3 scripts/check-rls-coverage.py --write    # 同时写入 docs/architecture/rls-coverage-report.md
  python3 scripts/check-rls-coverage.py --check    # CI 模式：仅输出未覆盖表数量并退出码

判定原则（写入报告）:
  - 需要 RLS：多租户业务表（含 tenant_id / org_id 的实体表）
  - 不需要 RLS：纯平台/配置/字典/审计/内部同步表（core_*、plugin_categories 等）
  - 未知：无法从 DDL 判断的，列入"待逐表人工确认"
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WRITE_REPORT = "--write" in sys.argv
CHECK_ONLY = "--check" in sys.argv


def collect():
    sql_files = (
        glob.glob(os.path.join(ROOT, "database", "**", "*.sql"), recursive=True)
        + glob.glob(os.path.join(ROOT, "svc", "**", "migrations", "*.sql"), recursive=True)
    )
    sql_files = [f for f in sql_files if os.path.isfile(f)]

    create_re = re.compile(r"CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z0-9_\"\.]+)", re.I)
    alter_rls_re = re.compile(
        r"ALTER\s+TABLE\s+([A-Za-z0-9_\"\.]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY", re.I
    )

    tables = {}
    rls_tables = set()
    for f in sorted(sql_files):
        try:
            content = open(f, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        for m in create_re.finditer(content):
            name = m.group(1).strip().strip('"')
            if name.lower() in ("schema.table",):  # 注释文字假匹配过滤
                continue
            tables.setdefault(name, f)
        for m in alter_rls_re.finditer(content):
            rls_tables.add(m.group(1).strip().strip('"'))

    # 规范化 schema 前缀：plugin_xxx.tab -> xxx.tab；无前缀归 public
    def norm(t):
        return t.lower().replace("plugin_", "")

    rls_norm = {norm(t) for t in rls_tables}
    not_rls = {}
    for t, src in tables.items():
        if norm(t) not in rls_norm:
            not_rls[t] = src
    return sql_files, tables, sorted(rls_tables), not_rls


def classify(name):
    """粗分类：是否需要 RLS（基于命名启发式，报告内标注需人工确认）。"""
    n = name.lower().split(".")[-1]
    if any(s in n for s in ("_config", "_settings", "_template", "_dict", "dictionary",
                            "_logs", "log_", "audit", "_version", "_category",
                            "schema_registry", "migration")):
        return "system"  # 系统/配置/审计类，通常不需要 RLS
    return "business"    # 业务实体，需要逐表确认


def main():
    sql_files, tables, rls_tables, not_rls = collect()

    lines = []
    lines.append("# RLS 数据权限覆盖报告（RLS Coverage Report）")
    lines.append("")
    lines.append("> 由 `scripts/check-rls-coverage.py` 自动生成 · 生成日期：2026-08-31")
    lines.append("")
    lines.append(f"**扫描范围**：{len(sql_files)} 个 SQL 文件，共 {len(tables)} 张 CREATE TABLE。")
    lines.append(f"**已启用 RLS**：{len(rls_tables)} 张表。")
    lines.append(f"**未显式启用**：{len(not_rls)} 张表（其中粗判为业务实体 {sum(1 for t in not_rls if classify(t)=='business')} 张、系统类 {sum(1 for t in not_rls if classify(t)=='system')} 张，需逐表确认）。")
    lines.append("")
    lines.append("## 已启用 RLS 的表")
    lines.append("")
    for t in rls_tables:
        lines.append(f"- `{t}`")
    lines.append("")
    lines.append("## 未启用 RLS 的表（按 schema 分组，需逐表判定）")
    lines.append("")
    lines.append("| 表 | 粗分类 | 来源文件 |")
    lines.append("|---|---|---|")
    for t in sorted(not_rls):
        kind = classify(t)
        lines.append(f"| `{t}` | {kind} | {not_rls[t]} |")
    lines.append("")
    lines.append("## 判定规则")
    lines.append("")
    lines.append("1. **需要 RLS**：多租户业务表（含 `tenant_id` / `org_id` 的实体表），启用后配套 `app.current_tenant_id` 策略（见 `database/postgres/rls_remaining_tables.sql`）。")
    lines.append("2. **不需要 RLS**：纯平台/配置/字典/审计/内部同步表（`core_*`、`*_config`、`*_template` 等），由应用层权限控制即可。")
    lines.append("3. **待确认**：粗分类为 `business` 的表需业务负责人逐表确认是否含租户维度数据。")
    lines.append("")

    report = "\n".join(lines)

    if WRITE_REPORT:
        out = os.path.join(ROOT, "docs", "architecture", "rls-coverage-report.md")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"报告已写入 {out}")

    if CHECK_ONLY:
        business_uncovered = sum(1 for t in not_rls if classify(t) == "business")
        print(f"未覆盖业务实体表: {business_uncovered}")
        sys.exit(0 if business_uncovered == 0 else 1)

    print(report)


if __name__ == "__main__":
    main()
