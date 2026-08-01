#!/usr/bin/env python3
"""
TOPEMS 租户级 RLS 覆盖率审计脚本
扫描：1) CREATE TABLE 是否含 tenant_id  2) handler 查询是否带 tenant_id 过滤
"""
import re
import os
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional

ROOT = Path("/Users/air/TOPEMS")
SVC_DIR = ROOT / "svc"
LIB_DIR = ROOT / "lib"

SYSTEM_TABLES = {
    "__schema_migrations", "users", "tenants", "roles", "permissions",
    "audit_logs", "schema_migrations", "sqlx_migrations",
    "migrations", "sessions", "oauth_authorized_applications",
    "oauth_access_grants", "oauth_access_tokens",
    "personal_access_tokens", "password_reset_tokens",
    "remember_tokens", "failed_jobs", "telescope_entries",
    "telescope_monitoring", "webhooks", "webhook_calls",
    "notifications", "jobs", "job_batches", "failed_webhooks",
    "pg_buffercache_pages", "pg_stat_statements",
}

@dataclass
class TableDef:
    table_name: str
    crate: str
    file_path: str
    line_number: int
    has_tenant_id: bool = False
    is_system_table: bool = False
    sql_snippet: str = ""

@dataclass
class HandlerDef:
    function_name: str
    file_path: str
    line_number: int
    crate: str
    has_select: bool = False
    has_tenant_filter: bool = False
    function_body: str = ""
    sql_snippets: List[str] = field(default_factory=list)


def find_create_tables() -> List[TableDef]:
    """扫描所有 SQL CREATE TABLE 语句"""
    results: List[TableDef] = []
    all_files = list(SVC_DIR.rglob("*.rs")) + list(SVC_DIR.rglob("migrations/*.sql"))
    print(f"[*] 扫描文件总数: {len(all_files)}")

    create_re = re.compile(
        r"CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[\w]+\.)?([\"`]?[\w]+[\"`]?)\s*\(",
        re.IGNORECASE | re.MULTILINE | re.DOTALL
    )

    for file_path in all_files:
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        lines = content.splitlines()
        crate = _get_crate_from_path(file_path)

        for m in create_re.finditer(content):
            table_name_raw = m.group(1).strip('"').strip("`").strip("'")
            table_name = table_name_raw.split(".")[-1] if "." in table_name_raw else table_name_raw
            start_line = content[:m.start()].count("\n") + 1

            end_pos = _find_matching_paren(content, m.end() - 1)
            table_body = content[m.start():end_pos] if end_pos else content[m.start():m.start()+2000]

            has_tenant = bool(re.search(r"\btenant_id\b", table_body, re.IGNORECASE))
            is_sys = table_name.lower() in SYSTEM_TABLES or any(
                table_name.startswith(p) for p in ["pg_", "sqlx_", "oauth_", "webhook_", "notification_", "job_"]
            )

            results.append(TableDef(
                table_name=table_name,
                crate=crate,
                file_path=str(file_path),
                line_number=start_line,
                has_tenant_id=has_tenant,
                is_system_table=is_sys,
                sql_snippet=table_body[:500],
            ))

    return results


def _find_matching_paren(s: str, start: int) -> Optional[int]:
    depth = 0
    i = start
    while i < len(s):
        if s[i] == "(":
            depth += 1
        elif s[i] == ")":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return None


def _get_crate_from_path(p: Path) -> str:
    parts = p.parts
    for i, part in enumerate(parts):
        if part == "svc" and i + 1 < len(parts):
            return parts[i + 1]
    for i, part in enumerate(parts):
        if part == "lib" and i + 1 < len(parts):
            return parts[i + 1]
    return "unknown"


def find_handler_queries() -> List[HandlerDef]:
    """扫描 modules 下的 handler 查询"""
    results: List[HandlerDef] = []

    files: List[Path] = []
    for f in SVC_DIR.rglob("*.rs"):
        parts = f.parts
        if "modules" in parts or "handlers" in parts or "models" in parts or "services" in parts:
            files.append(f)

    fn_re = re.compile(
        r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+(list_\w+|get_\w+|query_\w+|fetch_\w+|search_\w+|find_\w+)\s*\(",
        re.MULTILINE
    )
    select_re = re.compile(r"SELECT\s+[\s\S]*?\bFROM\b", re.IGNORECASE)
    tenant_filter_re = re.compile(r"\btenant_id\b\s*[=<>]", re.IGNORECASE)

    for file_path in files:
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        lines = content.splitlines()
        crate = _get_crate_from_path(file_path)

        for m in fn_re.finditer(content):
            fn_name = m.group(1)
            start_line = content[:m.start()].count("\n") + 1
            body = _extract_function_body(content, m.start())

            has_select = bool(select_re.search(body))
            snippets = []
            for sm in select_re.finditer(body):
                snippet_start = sm.start()
                snippet_end = min(snippet_start + 500, len(body))
                snippets.append(body[snippet_start:snippet_end])

            has_tenant = False
            if has_select:
                combined_sql = " ".join(snippets)
                has_tenant = bool(tenant_filter_re.search(combined_sql))

            if has_select:
                results.append(HandlerDef(
                    function_name=fn_name,
                    file_path=str(file_path),
                    line_number=start_line,
                    crate=crate,
                    has_select=True,
                    has_tenant_filter=has_tenant,
                    function_body=body[:1000],
                    sql_snippets=snippets,
                ))

    return results


def _extract_function_body(content: str, start_pos: int) -> str:
    """粗略提取函数体"""
    # 找到函数签名结束后的第一个 {
    brace_pos = content.find("{", start_pos)
    if brace_pos == -1:
        return content[start_pos:start_pos + 2000]

    depth = 0
    i = brace_pos
    while i < len(content):
        if content[i] == "{":
            depth += 1
        elif content[i] == "}":
            depth -= 1
            if depth == 0:
                return content[start_pos:i + 1]
        i += 1
    return content[start_pos:min(start_pos + 5000, len(content))]


def main():
    print("=" * 80)
    print("TOPEMS 租户级 RLS 覆盖率审计报告")
    print("=" * 80)

    # 步骤1: 审计 RLS 中间件（手动确认已覆盖 crate）
    print("\n[步骤1] 审计 RLS 中间件使用情况")
    print("-" * 60)
    rls_crates = _find_rls_usage_crates()
    print(f"已应用 RLS 中间件的 crate ({len(rls_crates)} 个):")
    for c in sorted(rls_crates):
        print(f"  ✅ {c}")

    # 步骤2: 扫描 CREATE TABLE
    print("\n[步骤2] 扫描 CREATE TABLE 是否含 tenant_id 列")
    print("-" * 60)
    tables = find_create_tables()
    business_tables = [t for t in tables if not t.is_system_table]
    missing_tenant = [t for t in business_tables if not t.has_tenant_id]

    print(f"CREATE TABLE 总数: {len(tables)}")
    print(f"业务表总数: {len(business_tables)}")
    print(f"已含 tenant_id: {len(business_tables) - len(missing_tenant)}")
    print(f"缺少 tenant_id: {len(missing_tenant)}")

    if missing_tenant:
        print(f"\n⚠️  缺少 tenant_id 的业务表清单 ({len(missing_tenant)}):")
        print(f"{'表名':<45} {'crate':<15} {'文件'}")
        print("-" * 100)
        for t in sorted(missing_tenant, key=lambda x: (x.crate, x.table_name)):
            fp = t.file_path.replace(str(ROOT) + "/", "")
            print(f"{t.table_name:<45} {t.crate:<15} {fp}:{t.line_number}")

    # 步骤3: 扫描 handler 查询
    print("\n[步骤3] 扫描 handler 查询是否带 tenant_id 过滤")
    print("-" * 60)
    handlers = find_handler_queries()
    missing_filter = [h for h in handlers if not h.has_tenant_filter]

    print(f"带 SELECT 的 handler 总数: {len(handlers)}")
    print(f"已含 tenant_id 过滤: {len(handlers) - len(missing_filter)}")
    print(f"缺少过滤: {len(missing_filter)}")

    if missing_filter:
        print(f"\n⚠️  可能缺少 tenant_id 过滤的 handler ({len(missing_filter)}):")
        print(f"{'函数名':<35} {'crate':<15} {'文件:行号'}")
        print("-" * 100)
        for h in sorted(missing_filter, key=lambda x: (x.crate, x.function_name)):
            fp = h.file_path.replace(str(ROOT) + "/", "")
            print(f"{h.function_name:<35} {h.crate:<15} {fp}:{h.line_number}")
            # 打印前2条 SQL snippet 便于排查
            for snippet in h.sql_snippets[:2]:
                clean_snippet = snippet.replace("\n", " ")[:120]
                print(f"    SQL: {clean_snippet}...")

    print("\n" + "=" * 80)
    print("审计完成")
    print("=" * 80)

    # 保存 JSON 结果供后续修复脚本使用
    import json
    audit_data = {
        "tables_missing_tenant": [
            {
                "table_name": t.table_name,
                "crate": t.crate,
                "file_path": t.file_path,
                "line_number": t.line_number,
            }
            for t in missing_tenant
        ],
        "handlers_missing_filter": [
            {
                "function_name": h.function_name,
                "crate": h.crate,
                "file_path": h.file_path,
                "line_number": h.line_number,
            }
            for h in missing_filter
        ],
    }
    out_file = ROOT / "scripts" / "security" / "rls_audit_result.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(audit_data, indent=2, ensure_ascii=False))
    print(f"\n结果已保存: {out_file}")


def _find_rls_usage_crates():
    """找到哪些 crate 用了 RLS 中间件"""
    crates = set()
    keywords = ["rls_middleware", "apply_rls_middleware", "tenant_rls"]

    for file_path in SVC_DIR.rglob("*.rs"):
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for kw in keywords:
            if kw in content:
                crate = _get_crate_from_path(file_path)
                crates.add(crate)
                break

    # 也检查 lib
    for file_path in (LIB_DIR / "**").rglob("*.rs"):
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for kw in keywords:
            if kw in content:
                crate = _get_crate_from_path(file_path)
                crates.add(crate)
                break

    return crates


if __name__ == "__main__":
    main()
