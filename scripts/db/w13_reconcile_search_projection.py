#!/usr/bin/env python3
"""W13 搜索投影 v1 / v2 对账（零差异门禁）。

用法
----
    python3 scripts/db/w13_reconcile_search_projection.py \
        --dsn "postgresql://user:pass@host:5432/db" [--output report.txt] [--max-detail 20]

比对内容
--------
1. 行数：按 entity_type 比较 `search_entity_projections`（v1）与 `..._v2`；
2. 主键差集：`(tenant_id, entity_type, entity_id)` 双向 EXCEPT，输出差集条数与样例；
3. 字段校验和：对两表共有字段（名称/联系人/电话/邮箱/地址/状态/备注/source_updated_at）
   按主键排序做 md5 聚合，逐 entity_type 比较；
4. 附注：v2 `company_id IS NULL` 计数（回填进度参考，不参与门禁）。

退出码
------
* 0  零差异（行数、主键集合、校验和全部一致）→ 允许进入下一步；
* 1  存在差异（详见报告）；
* 2  用法错误 / 连接失败 / v2 表缺失等无法对账的情况。

依赖：psql。脚本不读取 .env，必须显式 --dsn，不回显连接串（避免泄露口令）。
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys

V1 = "public.search_entity_projections"
V2 = "public.search_entity_projections_v2"

SHARED_FIELDS = [
    "name",
    "contact_person",
    "contact_phone",
    "email",
    "address",
    "status",
    "remark",
]

SNAPSHOT_EXPR = " || '|' || ".join(
    [f"coalesce({c},'~NULL~')" for c in SHARED_FIELDS]
    + [
        "coalesce(to_char(source_updated_at AT TIME ZONE 'UTC',"
        "'YYYY-MM-DD\"T\"HH24:MI:SS.US'),'~NULL~')"
    ]
)


class PsqlError(RuntimeError):
    pass


def run_psql(dsn: str, sql: str) -> list[list[str]]:
    cmd = ["psql", dsn, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-A", "-F", "\t", "-t"]
    env = dict(os.environ)
    env["PGCONNECT_TIMEOUT"] = env.get("PGCONNECT_TIMEOUT", "10")
    # 对账必须全量可见：统一走系统通道，避免 RLS 隐藏行导致假差异。
    sql = "SET app.rls_system = 'on';\n" + sql
    proc = subprocess.run(cmd, input=sql, text=True, capture_output=True, env=env)
    if proc.returncode != 0:
        raise PsqlError(proc.stderr.strip() or f"psql exit {proc.returncode}")
    return [line.split("\t") for line in proc.stdout.splitlines() if line.strip()]


def die(msg: str, code: int = 2) -> None:
    print(f"[w13-reconcile] {msg}", file=sys.stderr)
    sys.exit(code)


def table_exists(dsn: str, relation: str) -> bool:
    rows = run_psql(dsn, f"SELECT to_regclass('{relation}') IS NOT NULL;")
    return bool(rows) and rows[0][0] == "t"


def counts(dsn: str, table: str) -> dict[str, int]:
    rows = run_psql(
        dsn, f"SELECT entity_type, count(*) FROM {table} GROUP BY 1 ORDER BY 1;"
    )
    return {et: int(n) for et, n in rows}


def checksums(dsn: str, table: str) -> dict[str, tuple[int, str]]:
    sql = (
        "SELECT entity_type, count(*), coalesce(md5(string_agg("
        f"tenant_id::text || '|' || entity_type || '|' || entity_id::text || '|' || {SNAPSHOT_EXPR}"
        ", chr(31) ORDER BY tenant_id, entity_type, entity_id)),'empty') "
        f"FROM {table} GROUP BY entity_type ORDER BY entity_type;"
    )
    rows = run_psql(dsn, sql)
    return {et: (int(n), md5) for et, n, md5 in rows}


def pk_diff_counts(dsn: str, left: str, right: str) -> dict[str, int]:
    sql = (
        "SELECT entity_type, count(*) FROM ("
        f"SELECT tenant_id, entity_type, entity_id FROM {left} "
        "EXCEPT "
        f"SELECT tenant_id, entity_type, entity_id FROM {right}"
        ") s GROUP BY 1 ORDER BY 1;"
    )
    return {et: int(n) for et, n in run_psql(dsn, sql)}


def pk_diff_samples(dsn: str, left: str, right: str, limit: int) -> list[list[str]]:
    sql = (
        "SELECT entity_type, tenant_id::text, entity_id::text FROM ("
        f"SELECT tenant_id, entity_type, entity_id FROM {left} "
        "EXCEPT "
        f"SELECT tenant_id, entity_type, entity_id FROM {right}"
        ") s ORDER BY entity_type, tenant_id, entity_id "
        f"LIMIT {int(limit)};"
    )
    return run_psql(dsn, sql)


def null_company(dsn: str) -> dict[str, int]:
    rows = run_psql(
        dsn,
        f"SELECT entity_type, count(*) FROM {V2} WHERE company_id IS NULL "
        "GROUP BY 1 ORDER BY 1;",
    )
    return {et: int(n) for et, n in rows}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="W13 search 投影 v1/v2 对账（零差异才退出 0）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("用法\n----", 1)[-1],
    )
    parser.add_argument("--dsn", required=True, help="PostgreSQL 连接串（必须显式提供）")
    parser.add_argument("--output", help="差异报告输出路径（默认 stdout）")
    parser.add_argument(
        "--max-detail", type=int, default=20, help="每个差集方向输出的样例行数（默认 20）"
    )
    args = parser.parse_args()
    if args.max_detail < 0:
        die("--max-detail 不能为负")
    if not args.dsn.strip():
        die("--dsn 不能为空")

    try:
        for rel in (V1, V2):
            if not table_exists(args.dsn, rel):
                die(f"{rel} 不存在：无法对账（请先应用对应迁移）")
        v1_counts = counts(args.dsn, V1)
        v2_counts = counts(args.dsn, V2)
        v1_sums = checksums(args.dsn, V1)
        v2_sums = checksums(args.dsn, V2)
        only_v1 = pk_diff_counts(args.dsn, V1, V2)
        only_v2 = pk_diff_counts(args.dsn, V2, V1)
        only_v1_samples = pk_diff_samples(args.dsn, V1, V2, args.max_detail)
        only_v2_samples = pk_diff_samples(args.dsn, V2, V1, args.max_detail)
        null_company_counts = null_company(args.dsn)
    except PsqlError as e:
        die(f"数据库查询失败：{e}")

    entity_types = sorted(set(v1_counts) | set(v2_counts) | set(v1_sums) | set(v2_sums))
    lines: list[str] = ["# W13 search 投影 v1/v2 对账报告", ""]
    diffs: list[str] = []

    lines.append("## 行数")
    for et in entity_types:
        a = v1_counts.get(et, 0)
        b = v2_counts.get(et, 0)
        mark = "OK" if a == b else "DIFF"
        lines.append(f"- {et}: v1={a} v2={b} [{mark}]")
        if a != b:
            diffs.append(f"行数不一致 {et}: v1={a} v2={b}")
    if not entity_types:
        lines.append("- （两表均为空）")

    lines.append("")
    lines.append("## 主键差集（tenant_id, entity_type, entity_id）")
    for et in entity_types:
        a = only_v1.get(et, 0)
        b = only_v2.get(et, 0)
        mark = "OK" if a == 0 and b == 0 else "DIFF"
        lines.append(f"- {et}: 仅 v1={a} 仅 v2={b} [{mark}]")
    if only_v1:
        diffs.append(f"存在仅 v1 的主键：{only_v1}")
    if only_v2:
        diffs.append(f"存在仅 v2 的主键：{only_v2}")

    def fmt_samples(title: str, rows: list[list[str]]) -> None:
        if not rows:
            return
        lines.append("")
        lines.append(f"### {title}（最多 {args.max_detail} 行）")
        lines.append("entity_type\ttenant_id\tentity_id")
        for row in rows:
            lines.append("\t".join(row))

    fmt_samples("仅 v1 存在（样例）", only_v1_samples)
    fmt_samples("仅 v2 存在（样例）", only_v2_samples)

    lines.append("")
    lines.append("## 字段校验和（md5 聚合，按 entity_type）")
    for et in entity_types:
        a = v1_sums.get(et)
        b = v2_sums.get(et)
        mark = "OK" if a == b else "DIFF"
        lines.append(f"- {et}: v1={a} v2={b} [{mark}]")
        if a != b:
            diffs.append(f"字段校验和不一致 {et}")

    lines.append("")
    lines.append("## 附注：v2 company_id IS NULL（回填进度，不参与门禁）")
    if null_company_counts:
        for et, n in sorted(null_company_counts.items()):
            lines.append(f"- {et}: {n}")
    else:
        lines.append("- 无")

    lines.append("")
    if diffs:
        lines.append(f"## 结论：存在 {len(diffs)} 项差异，禁止进入下一步")
        for d in diffs:
            lines.append(f"- {d}")
    else:
        lines.append("## 结论：零差异，允许进入下一步")

    report = "\n".join(lines) + "\n"
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"[w13-reconcile] 报告已写入 {args.output}")
    else:
        sys.stdout.write(report)

    return 1 if diffs else 0


if __name__ == "__main__":
    sys.exit(main())
