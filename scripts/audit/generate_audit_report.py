#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TOPEMS 审计/合规报告生成器 (P36-4)

直连 PostgreSQL 审计日志表（core_login_logs / core_operation_logs /
iam.permission_audit_logs），查询指定时间范围内的登录、操作、权限变更与异常事件，
按 Jinja2 风格模板渲染输出 Markdown / JSON 报告，并支持原始日志 CSV 导出。

依赖 Dependencies:
    - Python 3.8+ 标准库
    - psycopg2 (可选；缺失或无法连接时优雅降级为空报告模板)

环境变量 Environment:
    DATABASE_URL           PostgreSQL 连接串（必选，缺失则降级为空报告）
    TOPEMS_TENANT_ID       默认租户 ID（可选）

用法 Examples:
    python3 scripts/audit/generate_audit_report.py --help
    python3 scripts/audit/generate_audit_report.py \
        --start-date 2026-07-01 --end-date 2026-08-01 \
        --output /tmp/audit-report.md --format md
    python3 scripts/audit/generate_audit_report.py \
        --start-date 2026-07-01 --end-date 2026-08-01 --export-logs
"""

from __future__ import annotations

import argparse
import csv
import getpass
import io
import json
import os
import re
import socket
import sys
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

# 可选依赖：psycopg2。缺失时降级为空报告。
try:
    import psycopg2  # type: ignore
    import psycopg2.extras  # type: ignore
    HAS_PSYCOPG2 = True
except ImportError:  # pragma: no cover - 环境相关
    HAS_PSYCOPG2 = False
    psycopg2 = None  # type: ignore

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DEFAULT_TEMPLATE = os.path.join(SCRIPT_DIR, "report_template.md")
CSV_SCHEMA_PATH = os.path.join(SCRIPT_DIR, "csv_export_schema.json")
REPORT_VERSION = "1.0"

# 导出表元信息：(table, time_column) — 列名从 csv_export_schema.json 读取
EXPORT_TABLES: Dict[str, Tuple[str, str]] = {
    "login_logs": ("core_login_logs", "login_time"),
    "operation_logs": ("core_operation_logs", "created_at"),
    "permission_changes": ("iam.permission_audit_logs", "created_at"),
}

# 合规检查清单 11 项（对应 TODO.md P31-1~P31-6 + P32-2 + P32-4 + P35-1/2/3）
COMPLIANCE_ITEMS: List[Dict[str, str]] = [
    {"id": "P31-1", "name": "BI 模块 SQL 注入根除（参数化 + 查询白名单）",
     "status": "PASS", "evidence": "见 TODO.md P31-1 战果；BI 查询统一参数化"},
    {"id": "P31-2", "name": "JWT 非对称密钥默认化（RS256/ES256）",
     "status": "PASS", "evidence": "见 TODO.md P31-2 战果；生产默认非对称密钥"},
    {"id": "P31-3", "name": "插件注册令牌默认关闭（plugin.yaml auth_required: true）",
     "status": "PASS", "evidence": "见 TODO.md P31-3 战果；23 份 plugin.yaml 校验"},
    {"id": "P31-4", "name": "租户级 RLS 覆盖率 100%",
     "status": "PASS", "evidence": "见 TODO.md P31-4 战果；业务表 tenant_id + RLS"},
    {"id": "P31-5", "name": "CSRF + 同源策略加固",
     "status": "PASS", "evidence": "见 TODO.md P31-5 战果；apps/web/lib/csrf.ts"},
    {"id": "P31-6", "name": "密钥/密码零硬编码审计",
     "status": "PASS", "evidence": "见 TODO.md P31-6 战果；零高危"},
    {"id": "P32-2", "name": "服务端口注册表单一信源（config/ports.env）",
     "status": "PASS", "evidence": "见 TODO.md P32-2 战果；ports.env 唯一信源"},
    {"id": "P32-4", "name": "axum v0.8.x 路径参数统一（{param} 语法）",
     "status": "PASS", "evidence": "见 TODO.md P32-4 战果；路由契约对齐"},
    {"id": "P35-1", "name": "CI 三零门禁（TSC/ESLint/Vitest/Cargo 0 错误）",
     "status": "PASS", "evidence": "见 TODO.md P35-1 战果；13 jobs quality-gate"},
    {"id": "P35-2", "name": "pnpm 包管理器单一化",
     "status": "PASS", "evidence": "见 TODO.md P35-2 战果；packageManager pnpm@9"},
    {"id": "P35-3", "name": "Module Federation 决策与落地（已移除）",
     "status": "PASS", "evidence": "见 TODO.md P35-3 战果；MF 包删除"},
]

# 默认整改项（数据驱动补充见 _build_remediation）
DEFAULT_REMEDIATION: List[Dict[str, str]] = [
    {"id": "R-001", "finding": "失败请求监控", "recommendation": "配置失败率告警 (>10%)",
     "priority": "Medium", "owner": "Platform Ops", "due": "-"},
    {"id": "R-002", "finding": "登录安全", "recommendation": "启用登录失败锁定与异常 IP 告警",
     "priority": "High", "owner": "Security", "due": "-"},
    {"id": "R-003", "finding": "权限审计", "recommendation": "月度权限变更复核",
     "priority": "Medium", "owner": "Admin", "due": "-"},
]


# =============================================================================
# 迷你模板引擎（Jinja2 风格：{{ var }} / {% for %} / {% if %}）
# 仅依赖标准库 re；支持 trim_blocks + lstrip_blocks 语义。
# =============================================================================

class TemplateEngine:
    """极简 Jinja2 风格模板引擎。

    支持：
      - ``{{ var }}`` / ``{{ var.field }}`` 变量替换
      - ``{% for x in list %}...{% endfor %}`` 循环
      - ``{% if cond %}`` / ``{% if not cond %}`` / ``{% endif %}`` 条件
    """

    _TOKEN_RE = re.compile(r"(\{\{.*?\}\}|\{%.*?%\})", re.DOTALL)

    def __init__(self, text: str) -> None:
        text = re.sub(r"\{#.*?#\}", "", text, flags=re.DOTALL)  # 注释
        # lstrip_blocks：行首空白 + {% 仅清空白
        text = re.sub(r"(?m)^[ \t]*(?=\{%-?)", "", text)
        # trim_blocks：%} 或 -%} 后紧跟的换行去除
        text = re.sub(r"(-?%})\n", r"\1", text)
        self.nodes = self._parse(text)

    def _parse(self, text: str) -> List[Any]:
        tokens = self._TOKEN_RE.split(text)
        root: List[Any] = []
        stack: List[List[Any]] = [root]
        for tok in tokens:
            if tok == "":
                continue
            if tok.startswith("{{") and tok.endswith("}}"):
                stack[-1].append(("var", tok[2:-2].strip()))
            elif tok.startswith("{%") and tok.endswith("%}"):
                tag = tok[2:-2].strip()
                # 兼容 {%- -%} 留白标记
                if tag.startswith("-"):
                    tag = tag[1:].strip()
                if tag.endswith("-"):
                    tag = tag[:-1].strip()
                if tag.startswith("for "):
                    m = re.match(r"for\s+(\w+)\s+in\s+(.+)", tag, re.DOTALL)
                    if not m:
                        stack[-1].append(("text", tok))
                        continue
                    var, lst = m.group(1), m.group(2).strip()
                    body: List[Any] = []
                    stack[-1].append(("for", var, lst, body))
                    stack.append(body)
                elif tag == "endfor":
                    if len(stack) > 1:
                        stack.pop()
                elif tag.startswith("if "):
                    cond = tag[3:].strip()
                    body2: List[Any] = []
                    stack[-1].append(("if", cond, body2))
                    stack.append(body2)
                elif tag in ("endif", "else", "endif"):
                    if tag == "endif" and len(stack) > 1:
                        stack.pop()
                    # else/elif 暂不支持（模板未使用）
                else:
                    stack[-1].append(("text", tok))
            else:
                stack[-1].append(("text", tok))
        return root

    def render(self, context: Dict[str, Any]) -> str:
        return self._render_nodes(self.nodes, dict(context))

    def _render_nodes(self, nodes: List[Any], ctx: Dict[str, Any]) -> str:
        out: List[str] = []
        for node in nodes:
            kind = node[0]
            if kind == "text":
                out.append(node[1])
            elif kind == "var":
                out.append(self._format(self._resolve(node[1], ctx)))
            elif kind == "for":
                _, var, lst_expr, body = node
                items = self._resolve(lst_expr, ctx)
                if not isinstance(items, (list, tuple)):
                    items = []
                for it in items:
                    child = dict(ctx)
                    child[var] = it
                    out.append(self._render_nodes(body, child))
            elif kind == "if":
                _, cond, body = node
                if self._eval_cond(cond, ctx):
                    out.append(self._render_nodes(body, ctx))
        return "".join(out)

    def _resolve(self, expr: str, ctx: Dict[str, Any]) -> Any:
        parts = [p for p in expr.strip().split(".") if p]
        if not parts:
            return ""
        val: Any = ctx.get(parts[0], "")
        for p in parts[1:]:
            if isinstance(val, dict):
                val = val.get(p, "")
            elif val is None:
                val = ""
            elif hasattr(val, p):
                val = getattr(val, p)
            else:
                val = ""
            if val is None:
                val = ""
        return val

    def _eval_cond(self, expr: str, ctx: Dict[str, Any]) -> bool:
        expr = expr.strip()
        negate = False
        if expr.startswith("not "):
            negate = True
            expr = expr[4:].strip()
        val = self._resolve(expr, ctx)
        truthy = self._truthy(val)
        return (not truthy) if negate else truthy

    @staticmethod
    def _truthy(val: Any) -> bool:
        if val is None or val is False:
            return False
        if isinstance(val, (list, dict, str, tuple)) and len(val) == 0:
            return False
        if val == 0 or val == 0.0:
            return False
        return True

    @staticmethod
    def _format(val: Any) -> str:
        if val is None:
            return ""
        if isinstance(val, bool):
            return "true" if val else "false"
        if isinstance(val, float):
            # 整数浮点去掉小数
            if val.is_integer():
                return str(int(val))
            return f"{val:.2f}".rstrip("0").rstrip(".")
        return str(val)


# =============================================================================
# 数据采集（PostgreSQL，优雅降级）
# =============================================================================

class AuditDataCollector:
    """直连 PostgreSQL 采集审计数据。连接失败时所有查询返回空结果。"""

    def __init__(self, database_url: Optional[str], start: datetime, end: datetime) -> None:
        self.start = start
        self.end = end
        self.conn = None
        self.db_instance = "(unavailable — DATABASE_URL 未设置或连接失败)"
        self.error: Optional[str] = None
        if not database_url:
            self.error = "DATABASE_URL 未设置"
            return
        if not HAS_PSYCOPG2:
            self.error = "psycopg2 未安装（降级为空报告）"
            return
        try:
            self.conn = psycopg2.connect(database_url, connect_timeout=5)  # type: ignore
            self.conn.autocommit = True
            with self.conn.cursor() as cur:
                cur.execute("SELECT current_database(), inet_server_addr()")
                row = cur.fetchone()
                db = row[0] if row and row[0] else "unknown"
                host = row[1] if row and len(row) > 1 and row[1] else "unknown"
                self.db_instance = f"{db}@{host}"
        except Exception as exc:  # noqa: BLE001
            self.error = str(exc)
            self.conn = None
            self.db_instance = f"(unavailable — {exc})"

    @property
    def available(self) -> bool:
        return self.conn is not None

    # ---------- 通用查询 ----------
    def _query(self, sql: str, params: tuple) -> List[Dict[str, Any]]:
        if not self.conn:
            return []
        try:
            with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:  # type: ignore
                cur.execute(sql, params)
                return [dict(r) for r in cur.fetchall()]
        except Exception:  # noqa: BLE001 — 单源失败不影响整体
            return []

    def _query_one(self, sql: str, params: tuple) -> Dict[str, Any]:
        if not self.conn:
            return {}
        try:
            with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:  # type: ignore
                cur.execute(sql, params)
                row = cur.fetchone()
                return dict(row) if row else {}
        except Exception:  # noqa: BLE001
            return {}

    # ---------- 登录日志 ----------
    def login_summary(self) -> Dict[str, Any]:
        return self._query_one(
            """
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE status = 'success') AS success,
                   COUNT(*) FILTER (WHERE status <> 'success' OR status IS NULL) AS failure,
                   COUNT(DISTINCT username) AS unique_users
            FROM core_login_logs
            WHERE login_time >= %s AND login_time <= %s
            """,
            (self.start, self.end),
        )

    def login_by_user(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT username, COUNT(*) AS count,
                   COUNT(*) FILTER (WHERE status = 'success') AS success,
                   COUNT(*) FILTER (WHERE status <> 'success' OR status IS NULL) AS failure
            FROM core_login_logs
            WHERE login_time >= %s AND login_time <= %s
            GROUP BY username ORDER BY count DESC LIMIT 20
            """,
            (self.start, self.end),
        )
        return self._rank(rows, "username", "count")

    def login_by_ip(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT ip_address, COUNT(*) AS count,
                   COUNT(*) FILTER (WHERE status <> 'success' OR status IS NULL) AS failure
            FROM core_login_logs
            WHERE login_time >= %s AND login_time <= %s
            GROUP BY ip_address ORDER BY count DESC LIMIT 20
            """,
            (self.start, self.end),
        )
        out = []
        total = sum(r["count"] for r in rows) or 1
        for i, r in enumerate(rows, 1):
            out.append({
                "rank": i, "ip": r["ip_address"], "count": r["count"],
                "failure": r["failure"], "share": round(r["count"] * 100 / total, 1),
            })
        return out

    def login_by_hour(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT EXTRACT(HOUR FROM login_time)::int AS hour, COUNT(*) AS count,
                   COUNT(*) FILTER (WHERE status <> 'success' OR status IS NULL) AS failure
            FROM core_login_logs
            WHERE login_time >= %s AND login_time <= %s
            GROUP BY hour ORDER BY hour
            """,
            (self.start, self.end),
        )
        return [{"hour": r["hour"], "count": r["count"], "failure": r["failure"]} for r in rows]

    def failed_logins(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT login_time, username, ip_address, error_message
            FROM core_login_logs
            WHERE login_time >= %s AND login_time <= %s
              AND (status <> 'success' OR status IS NULL)
            ORDER BY login_time DESC LIMIT 100
            """,
            (self.start, self.end),
        )
        return [{
            "time": _fmt_dt(r["login_time"]), "username": r["username"],
            "ip": r["ip_address"], "error": r.get("error_message") or "",
        } for r in rows]

    # ---------- 操作日志 ----------
    def operation_summary(self) -> Dict[str, Any]:
        return self._query_one(
            """
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) AS success,
                   COUNT(*) FILTER (WHERE response_status IS NULL OR response_status >= 400) AS failure
            FROM core_operation_logs
            WHERE created_at >= %s AND created_at <= %s
            """,
            (self.start, self.end),
        )

    def ops_by_module(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT module, COUNT(*) AS count,
                   COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) AS success,
                   COUNT(*) FILTER (WHERE response_status IS NULL OR response_status >= 400) AS failure
            FROM core_operation_logs
            WHERE created_at >= %s AND created_at <= %s
            GROUP BY module ORDER BY count DESC
            """,
            (self.start, self.end),
        )
        total = sum(r["count"] for r in rows) or 1
        return [{
            "module": r["module"], "count": r["count"], "success": r["success"],
            "failure": r["failure"], "share": round(r["count"] * 100 / total, 1),
        } for r in rows]

    def ops_by_action(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT operation, COUNT(*) AS count
            FROM core_operation_logs
            WHERE created_at >= %s AND created_at <= %s
            GROUP BY operation ORDER BY count DESC
            """,
            (self.start, self.end),
        )
        total = sum(r["count"] for r in rows) or 1
        return [{
            "action": r["operation"], "count": r["count"],
            "share": round(r["count"] * 100 / total, 1),
        } for r in rows]

    def ops_by_user(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT user_name, COUNT(*) AS count
            FROM core_operation_logs
            WHERE created_at >= %s AND created_at <= %s
            GROUP BY user_name ORDER BY count DESC LIMIT 20
            """,
            (self.start, self.end),
        )
        return self._rank(rows, "username", "count", name_src="user_name")

    # ---------- 权限变更 ----------
    def permission_summary(self) -> Dict[str, Any]:
        return self._query_one(
            """
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE action ILIKE '%%grant%%') AS grants,
                   COUNT(*) FILTER (WHERE action ILIKE '%%revoke%%') AS revokes
            FROM iam.permission_audit_logs
            WHERE created_at >= %s AND created_at <= %s
            """,
            (self.start, self.end),
        )

    def permission_changes(self) -> List[Dict[str, Any]]:
        # 仅使用 audit_query.rs 确认存在的列，避免列不存在导致查询失败
        rows = self._query(
            """
            SELECT created_at, user_id, action, target_type, target_id, reason
            FROM iam.permission_audit_logs
            WHERE created_at >= %s AND created_at <= %s
            ORDER BY created_at DESC LIMIT 100
            """,
            (self.start, self.end),
        )
        out = []
        for r in rows:
            out.append({
                "time": _fmt_dt(r.get("created_at")),
                "operator": str(r.get("user_id") or "-"),
                "action": r.get("action") or "-",
                "target": str(r.get("target_id") or "-"),
                "role": r.get("target_type") or "-",
                "reason": r.get("reason") or "",
            })
        return out

    # ---------- 异常事件 ----------
    def brute_force_ips(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT ip_address, COUNT(*) AS count,
                   COUNT(DISTINCT username) AS users,
                   MIN(login_time) AS first_seen, MAX(login_time) AS last_seen
            FROM core_login_logs
            WHERE login_time >= %s AND login_time <= %s
              AND (status <> 'success' OR status IS NULL)
            GROUP BY ip_address
            HAVING COUNT(*) FILTER (WHERE status <> 'success' OR status IS NULL) > 5
            ORDER BY count DESC
            """,
            (self.start, self.end),
        )
        return [{
            "ip": r["ip_address"], "count": r["count"], "users": r["users"],
            "first_seen": _fmt_dt(r["first_seen"]), "last_seen": _fmt_dt(r["last_seen"]),
        } for r in rows]

    def off_hours_ops(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT created_at, user_name, module, operation, ip_address
            FROM core_operation_logs
            WHERE created_at >= %s AND created_at <= %s
              AND (EXTRACT(HOUR FROM created_at) >= 22
                   OR EXTRACT(HOUR FROM created_at) < 6
                   OR EXTRACT(DOW FROM created_at) IN (0, 6))
            ORDER BY created_at DESC LIMIT 100
            """,
            (self.start, self.end),
        )
        return [{
            "time": _fmt_dt(r["created_at"]), "username": r["user_name"],
            "module": r["module"], "operation": r["operation"],
            "ip": r.get("ip_address") or "-",
        } for r in rows]

    def sensitive_ops(self) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT created_at, user_name, module, operation, resource_type, resource_id
            FROM core_operation_logs
            WHERE created_at >= %s AND created_at <= %s
              AND (operation ILIKE '%%delete%%' OR operation ILIKE '%%remove%%')
            ORDER BY created_at DESC LIMIT 100
            """,
            (self.start, self.end),
        )
        return [{
            "time": _fmt_dt(r["created_at"]), "username": r["user_name"],
            "module": r["module"], "operation": r["operation"],
            "resource": f"{r.get('resource_type') or '-'}:{r.get('resource_id') or '-'}",
        } for r in rows]

    # ---------- 原始日志导出 ----------
    def export_rows(self, export_key: str, columns: List[str], limit: int) -> Tuple[List[str], List[List[Any]]]:
        table, time_col = EXPORT_TABLES[export_key]
        col_sql = ", ".join(f'"{c}"' for c in columns)
        sql = (
            f"SELECT {col_sql} FROM {table} "
            f"WHERE {time_col} >= %s AND {time_col} <= %s "
            f"ORDER BY {time_col} DESC LIMIT %s"
        )
        if not self.conn:
            return columns, []
        try:
            with self.conn.cursor() as cur:
                cur.execute(sql, (self.start, self.end, limit))
                rows = cur.fetchall()
            return columns, [list(r) for r in rows]
        except Exception:  # noqa: BLE001
            return columns, []

    # ---------- 工具 ----------
    @staticmethod
    def _rank(rows: List[Dict[str, Any]], name_key: str, count_key: str,
              name_src: Optional[str] = None) -> List[Dict[str, Any]]:
        total = sum(r[count_key] for r in rows) or 1
        out = []
        for i, r in enumerate(rows, 1):
            out.append({
                "rank": i, name_key: r[name_src or name_key],
                "count": r[count_key],
                "share": round(r[count_key] * 100 / total, 1),
            })
        return out


# =============================================================================
# 辅助函数
# =============================================================================

def _fmt_dt(val: Any) -> str:
    if val is None:
        return "-"
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    return str(val)


def parse_date(s: str, end_of_day: bool = False) -> datetime:
    """解析 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS 为 datetime。"""
    s = s.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(s, fmt)
            if end_of_day and fmt == "%Y-%m-%d":
                dt = dt.replace(hour=23, minute=59, second=59)
            return dt
        except ValueError:
            continue
    raise argparse.ArgumentTypeError(f"无法解析日期: {s}（期望 YYYY-MM-DD）")


def build_context(collector: AuditDataCollector, args: argparse.Namespace,
                  generated_at: str, generated_by: str) -> Dict[str, Any]:
    """采集数据并组装模板上下文。"""
    login = collector.login_summary()
    ops = collector.operation_summary()
    perm = collector.permission_summary()

    login_total = int(login.get("total") or 0)
    login_success = int(login.get("success") or 0)
    login_failure = int(login.get("failure") or 0)
    unique_users = int(login.get("unique_users") or 0)
    op_total = int(ops.get("total") or 0)
    op_success = int(ops.get("success") or 0)
    op_failure = int(ops.get("failure") or 0)
    perm_total = int(perm.get("total") or 0)
    perm_grants = int(perm.get("grants") or 0)
    perm_revokes = int(perm.get("revokes") or 0)

    login_by_user = collector.login_by_user()
    login_by_ip = collector.login_by_ip()
    login_by_hour = collector.login_by_hour()
    failed_logins = collector.failed_logins()
    ops_by_module = collector.ops_by_module()
    ops_by_action = collector.ops_by_action()
    ops_by_user = collector.ops_by_user()
    permission_changes = collector.permission_changes()
    brute_force = collector.brute_force_ips()
    off_hours = collector.off_hours_ops()
    sensitive = collector.sensitive_ops()

    anomaly_count = len(brute_force) + len(off_hours) + len(sensitive)
    success_rate = round(login_success * 100 / login_total, 1) if login_total else 0.0

    key_findings, remediation = _build_findings(
        login_failure, success_rate, perm_total, op_failure,
        brute_force, off_hours, sensitive, collector.error,
    )

    tenant_id = args.tenant_id or os.environ.get("TOPEMS_TENANT_ID") or "default"

    return {
        "report_title": "TOPEMS 审计与合规报告",
        "tenant_id": tenant_id,
        "start_date": args.start_date,
        "end_date": args.end_date,
        "generated_at": generated_at,
        "generated_by": generated_by,
        "database_instance": collector.db_instance,
        "report_version": REPORT_VERSION,
        "total_logins": login_total,
        "login_success": login_success,
        "login_failure": login_failure,
        "login_success_rate": success_rate,
        "unique_users": unique_users,
        "total_operations": op_total,
        "operation_success": op_success,
        "operation_failure": op_failure,
        "permission_total": perm_total,
        "permission_grants": perm_grants,
        "permission_revokes": perm_revokes,
        "anomaly_count": anomaly_count,
        "key_findings": key_findings,
        "login_by_user": login_by_user,
        "login_by_ip": login_by_ip,
        "login_by_hour": login_by_hour,
        "failed_logins": failed_logins,
        "ops_by_module": ops_by_module,
        "ops_by_action": ops_by_action,
        "ops_by_user": ops_by_user,
        "permission_changes": permission_changes,
        "brute_force_ips": brute_force,
        "off_hours_ops": off_hours,
        "sensitive_ops": sensitive,
        "compliance_items": COMPLIANCE_ITEMS,
        "recommendations": _build_recommendations(collector.error),
        "remediation_items": remediation,
        "generation_command": " ".join(sys.argv),
    }


def _build_findings(login_failure: int, success_rate: float, perm_total: int,
                    op_failure: int, brute_force: List, off_hours: List,
                    sensitive: List, db_error: Optional[str]) -> Tuple[str, List[Dict[str, str]]]:
    findings: List[str] = []
    remediation: List[Dict[str, str]] = [dict(r) for r in DEFAULT_REMEDIATION]

    if db_error:
        findings.append(f"- ⚠️ 数据库不可用：{db_error}。以下为空报告模板（含 TODO 标记），"
                        f"数据驱动章节均显示为无数据。")
        findings.append("- TODO: 配置 DATABASE_URL 并确保审计日志表已初始化后重新生成报告。")
        return "\n".join(findings), remediation

    if login_failure > 0:
        findings.append(f"- 登录失败 {login_failure} 次（成功率 {success_rate}%），"
                        f"请检查是否存在暴力破解或凭证填充尝试。")
        remediation.append({
            "id": "R-004", "finding": f"登录失败 {login_failure} 次",
            "recommendation": "排查失败登录来源 IP 与用户",
            "priority": "High", "owner": "Security", "due": "-",
        })
    if brute_force:
        findings.append(f"- 检测到 {len(brute_force)} 个暴力破解嫌疑 IP（失败登录 > 5 次）。")
        remediation.append({
            "id": "R-005", "finding": f"{len(brute_force)} 个暴力破解嫌疑 IP",
            "recommendation": "对嫌疑 IP 启用临时封禁与告警",
            "priority": "Critical", "owner": "Security", "due": "-",
        })
    if perm_total > 0:
        findings.append(f"- 期间发生权限变更 {perm_total} 次，建议复核变更合理性。")
    if op_failure > 0:
        findings.append(f"- 业务操作失败 {op_failure} 次，关注高频失败模块。")
    if off_hours:
        findings.append(f"- 检测到 {len(off_hours)} 条非工作时间操作，建议复核是否为预期变更。")
    if sensitive:
        findings.append(f"- 检测到 {len(sensitive)} 条敏感（删除类）操作，建议复核资源影响。")
    if not findings:
        findings.append("- 未发现显著异常 (no significant anomalies detected)。")
    return "\n".join(findings), remediation


def _build_recommendations(db_error: Optional[str]) -> str:
    lines = [
        "- 定期复核失败请求与登录失败日志，设置告警阈值（失败率 > 10% 触发）。",
        "- 对权限变更建立审批与回滚机制，月度复核角色分配。",
        "- 定期导出原始审计数据归档（CSV/JSON）以备外部审计。",
        "- 对高频操作用户进行行为基线分析，识别偏离基线的异常操作。",
    ]
    if db_error:
        lines.insert(0, "- TODO: 数据库未连接，以上建议需在数据可用后结合实际指标评估。")
    return "\n".join(lines)


# =============================================================================
# 输出
# =============================================================================

def render_markdown(context: Dict[str, Any], template_path: str) -> str:
    with open(template_path, "r", encoding="utf-8") as f:
        template_text = f.read()
    engine = TemplateEngine(template_text)
    rendered = engine.render(context)
    # 清理未被填充的 {{ }} 占位符
    rendered = re.sub(r"\{\{[a-zA-Z0-9_.\s]*\}\}", "(n/a)", rendered)
    return rendered


def render_json(context: Dict[str, Any]) -> str:
    # 序列化前把不可 JSON 化的对象转字符串
    def default(o: Any) -> Any:
        if isinstance(o, datetime):
            return o.isoformat()
        return str(o)
    return json.dumps(context, ensure_ascii=False, indent=2, default=default)


def export_csv_files(collector: AuditDataCollector, out_dir: str, limit: int) -> List[str]:
    """按 csv_export_schema.json 导出三类原始日志 CSV。返回写入文件路径列表。"""
    os.makedirs(out_dir, exist_ok=True)
    schema = load_csv_schema()
    written: List[str] = []
    for key, (table, _time_col) in EXPORT_TABLES.items():
        spec = schema.get("exports", {}).get(key, {})
        columns = [c["name"] for c in spec.get("columns", [])]
        if not columns:
            continue
        cols, rows = collector.export_rows(key, columns, limit)
        path = os.path.join(out_dir, spec.get("filename", f"{key}.csv"))
        with open(path, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(cols)
            for row in rows:
                writer.writerow([_csv_cell(v) for v in row])
        written.append(path)
    return written


def load_csv_schema() -> Dict[str, Any]:
    try:
        with open(CSV_SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {"exports": {}}


def _csv_cell(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%dT%H:%M:%SZ")
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False)
    return str(val)


def default_output_path(args: argparse.Namespace) -> str:
    reports_dir = os.path.join(REPO_ROOT, "docs", "audit", "reports")
    if args.format == "json":
        return os.path.join(reports_dir, f"audit-report-{date.today().isoformat()}.json")
    return os.path.join(reports_dir, f"audit-report-{date.today().isoformat()}.md")


# =============================================================================
# CLI
# =============================================================================

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="generate_audit_report.py",
        description="TOPEMS 审计/合规报告生成器 (P36-4) — 直连 PostgreSQL 审计日志表，"
                    "模板化生成 Markdown/JSON 报告并支持原始日志 CSV 导出。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "示例 Examples:\n"
            "  %(prog)s --start-date 2026-07-01 --end-date 2026-08-01\n"
            "  %(prog)s --start-date 2026-07-01 --end-date 2026-08-01 "
            "--output /tmp/audit.md --format md\n"
            "  %(prog)s --start-date 2026-07-01 --end-date 2026-08-01 --export-logs\n"
            "  DATABASE_URL=postgresql://user:pass@host/db %(prog)s "
            "--start-date 2026-07-01 --end-date 2026-08-01\n\n"
            "环境变量 Environment:\n"
            "  DATABASE_URL        PostgreSQL 连接串（缺失则降级为空报告模板）\n"
            "  TOPEMS_TENANT_ID    默认租户 ID\n"
        ),
    )
    p.add_argument("--start-date", required=True,
                   help="报告起始日期 (YYYY-MM-DD)，必填")
    p.add_argument("--end-date", required=True,
                   help="报告结束日期 (YYYY-MM-DD)，必填")
    p.add_argument("--output", "-o", default=None,
                   help="输出文件路径（默认 docs/audit/reports/audit-report-YYYY-MM-DD.{md|json}）")
    p.add_argument("--format", "-f", choices=["md", "csv", "json"], default="md",
                   help="输出格式：md=Markdown 报告（默认）/ json=JSON 报告 / csv=原始日志 CSV 导出")
    p.add_argument("--export-logs", action="store_true",
                   help="同时导出原始日志 CSV（login/operation/permission）到 --output 目录")
    p.add_argument("--export-dir", default=None,
                   help="CSV 导出目录（默认与 --output 同目录或 docs/audit/reports/exports/）")
    p.add_argument("--export-limit", type=int, default=100000,
                   help="单类 CSV 导出行数上限（默认 100000）")
    p.add_argument("--template", default=DEFAULT_TEMPLATE,
                   help=f"报告模板文件（默认 {DEFAULT_TEMPLATE}）")
    p.add_argument("--tenant-id", default=None,
                   help="租户 ID（默认 env TOPEMS_TENANT_ID 或 'default'）")
    p.add_argument("--database-url", default=None,
                   help="PostgreSQL 连接串（默认 env DATABASE_URL）")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)

    # 日期解析
    start = parse_date(args.start_date, end_of_day=False)
    end = parse_date(args.end_date, end_of_day=True)
    if end < start:
        print("ERROR: --end-date 早于 --start-date", file=sys.stderr)
        return 2

    db_url = args.database_url or os.environ.get("DATABASE_URL")
    collector = AuditDataCollector(db_url, start, end)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    generated_by = f"{getpass.getuser()}@{socket.gethostname()}"

    context = build_context(collector, args, generated_at, generated_by)

    # 输出路径
    output = args.output or default_output_path(args)
    export_dir = args.export_dir or os.path.join(
        os.path.dirname(output) or ".", "exports"
    ) if args.export_logs else None

    written: List[str] = []

    # CSV 导出（--format csv 或 --export-logs）
    if args.format == "csv" or args.export_logs:
        out_dir = args.export_dir or os.path.join(
            os.path.dirname(os.path.abspath(output)) or REPO_ROOT, "exports"
        )
        written.extend(export_csv_files(collector, out_dir, args.export_limit))
        if args.format == "csv" and not args.export_logs:
            # --format csv 且未要求报告：仅输出 CSV
            for w in written:
                print(f"INFO: CSV written to {w}", file=sys.stderr)
            if not written:
                print("WARN: 未导出任何 CSV（schema 为空或数据库不可用）", file=sys.stderr)
            return 0

    # 报告输出（md / json）
    os.makedirs(os.path.dirname(os.path.abspath(output)) or ".", exist_ok=True)
    if args.format == "json":
        content = render_json(context)
    else:
        content = render_markdown(context, args.template)

    with open(output, "w", encoding="utf-8") as f:
        f.write(content)
        if not content.endswith("\n"):
            f.write("\n")

    print(f"INFO: {args.format.upper()} report written to {output}", file=sys.stderr)
    print(f"INFO: db_available={collector.available} "
          f"total_logins={context['total_logins']} "
          f"total_operations={context['total_operations']} "
          f"anomaly_count={context['anomaly_count']}", file=sys.stderr)
    for w in written:
        print(f"INFO: CSV written to {w}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
