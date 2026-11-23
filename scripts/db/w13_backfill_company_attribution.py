#!/usr/bin/env python3
"""W13 历史公司归属回填（源表 + search v2 投影）。

用法
----
    python3 scripts/db/w13_backfill_company_attribution.py \
        --dsn "postgresql://user:pass@host:5432/db" \
        --mapping company_attribution.csv \
        [--dry-run | --apply] [--output unmatched.csv]

映射清单（CSV，UTF-8，首行为表头）
--------------------------------
必需列：

    entity_type,entity_id,company_id

取值约束：

    entity_type  sales_order | purchase_order | customer
    entity_id    UUID，对应 erp.sales_orders / erp.purchase_orders / erp.customers 主键
    company_id   UUID，必须属于该实体所在租户的 hrm.companies

归属规则：**一行一实体，显式给出公司**。脚本不推断、不猜默认公司。
同一 (entity_type, entity_id) 重复出现且 company_id 冲突时拒绝执行。

写入范围
--------
* sales_order / purchase_order：更新源表 `erp.<表>.company_id`，并更新
  `public.search_entity_projections_v2.company_id`（只更新已存在的 v2 行）。
* customer：源表仅有 `group_company_id`（集团归属语义，与本轮公司维度不同），
  **不写源表**，只更新 v2 投影行；该限制会在报告中标明。

行为
----
* 默认 dry-run（只读校验并打印计划）；必须显式 `--apply` 才写库。
* `--apply` 全程单事务（psql --single-transaction），任一步失败整体回滚。
* 未提供 `--mapping` 或文件缺失/表头不符：退出码 2，明确拒绝执行。
* 未匹配（源表不存在该实体、公司不属于该租户、UUID 非法）：逐行输出清单，
  退出码 1；`--output` 指定时同时写 CSV。
* 全部命中且（dry-run 或 apply）完成：退出码 0。
* v2 表不存在：`--apply` 拒绝（退出码 2），dry-run 仅告警。

依赖：psql（PostgreSQL 客户端）。脚本不读取 .env，不连接默认库，必须显式 --dsn。
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import subprocess
import sys
from dataclasses import dataclass

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

SOURCE_TABLES = {
    "sales_order": "erp.sales_orders",
    "purchase_order": "erp.purchase_orders",
    "customer": "erp.customers",
}

REQUIRED_COLUMNS = ["entity_type", "entity_id", "company_id"]


@dataclass
class MappingRow:
    line: int
    entity_type: str
    entity_id: str
    company_id: str


def die(msg: str, code: int = 2) -> None:
    print(f"[w13-backfill] 拒绝执行：{msg}", file=sys.stderr)
    sys.exit(code)


def run_psql(dsn: str, sql: str, *, single_txn: bool = False, tuples_only: bool = True) -> str:
    cmd = ["psql", dsn, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-A", "-F", "\t"]
    if tuples_only:
        cmd.append("-t")
    if single_txn:
        cmd.append("--single-transaction")
    env = dict(os.environ)
    env["PGCONNECT_TIMEOUT"] = env.get("PGCONNECT_TIMEOUT", "10")
    # 运维脚本需要跨租户全量识别目标行：统一走系统通道（RLS 系统开关）。
    sql = "SET app.rls_system = 'on';\n" + sql
    proc = subprocess.run(
        cmd,
        input=sql,
        text=True,
        capture_output=True,
        env=env,
    )
    if proc.returncode != 0:
        # 不回显 dsn，避免泄露口令
        print("[w13-backfill] psql 执行失败：", file=sys.stderr)
        print(proc.stderr.strip(), file=sys.stderr)
        sys.exit(2)
    return proc.stdout


def read_mapping(path: str) -> list[MappingRow]:
    try:
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            header = [h.strip() for h in (reader.fieldnames or [])]
            missing = [c for c in REQUIRED_COLUMNS if c not in header]
            if missing:
                die(
                    f"映射清单缺少列 {missing}；要求表头至少包含 {REQUIRED_COLUMNS}（当前：{header}）"
                )
            rows: list[MappingRow] = []
            for lineno, raw in enumerate(reader, start=2):
                entity_type = (raw.get("entity_type") or "").strip()
                entity_id = (raw.get("entity_id") or "").strip()
                company_id = (raw.get("company_id") or "").strip()
                if not entity_type and not entity_id and not company_id:
                    continue
                rows.append(MappingRow(lineno, entity_type, entity_id, company_id))
            if not rows:
                die("映射清单为空（无数据行）")
            return rows
    except FileNotFoundError:
        die(f"映射清单不存在：{path}")
    except OSError as e:
        die(f"读取映射清单失败：{e}")


def validate_rows(rows: list[MappingRow]) -> tuple[list[MappingRow], list[tuple[MappingRow, str]]]:
    seen: dict[tuple[str, str], str] = {}
    valid: list[MappingRow] = []
    unmatched: list[tuple[MappingRow, str]] = []
    for r in rows:
        if r.entity_type not in SOURCE_TABLES:
            unmatched.append((r, f"entity_type 不支持：{r.entity_type or '(空)'}"))
            continue
        if not UUID_RE.match(r.entity_id):
            unmatched.append((r, "entity_id 非法 UUID"))
            continue
        if not UUID_RE.match(r.company_id):
            unmatched.append((r, "company_id 非法 UUID"))
            continue
        key = (r.entity_type, r.entity_id.lower())
        if key in seen:
            if seen[key] != r.company_id.lower():
                die(
                    f"第 {r.line} 行与先前行冲突：同一实体 {key} 映射到不同公司"
                )
            unmatched.append((r, "重复行（公司一致，已忽略）"))
            continue
        seen[key] = r.company_id.lower()
        valid.append(r)
    return valid, unmatched


def fetch_source_with(dsn: str, rows: list[MappingRow]) -> dict[tuple[str, str], tuple[str, str]]:
    by_type: dict[str, list[str]] = {}
    for r in rows:
        by_type.setdefault(r.entity_type, []).append(r.entity_id)
    parts = []
    for et, ids in by_type.items():
        table = SOURCE_TABLES[et]
        column = "NULL::uuid" if et == "customer" else "company_id"
        id_list = ",".join(f"'{i}'" for i in ids)
        parts.append(
            f"SELECT '{et}' AS et, id::text, tenant_id::text, "
            f"COALESCE(({column})::text,'') AS company FROM {table} WHERE id IN ({id_list})"
        )
    sql = " UNION ALL ".join(parts) + ";"
    out = run_psql(dsn, sql)
    result: dict[tuple[str, str], tuple[str, str]] = {}
    for line in out.splitlines():
        if not line.strip():
            continue
        et, eid, tenant, company = (line.split("\t") + ["", "", "", ""])[:4]
        result[(et, eid.lower())] = (tenant, company)
    return result


def fetch_companies(dsn: str, pairs: set[tuple[str, str]]) -> set[tuple[str, str]]:
    if not pairs:
        return set()
    values = ",".join(f"('{t}'::uuid,'{c}'::uuid)" for t, c in pairs)
    sql = f"SELECT tenant_id::text, id::text FROM hrm.companies WHERE (tenant_id,id) IN ({values});"
    out = run_psql(dsn, sql)
    return {
        tuple(line.split("\t")[:2])  # type: ignore[return-value]
        for line in out.splitlines()
        if line.strip()
    }


def v2_table_exists(dsn: str) -> bool:
    out = run_psql(dsn, "SELECT to_regclass('public.search_entity_projections_v2') IS NOT NULL;")
    return out.strip() == "t"


def build_apply_sql(
    matched: list[tuple[MappingRow, str]], update_source: bool
) -> str:
    stmts = ["BEGIN;"]
    for r, tenant in matched:
        if update_source and r.entity_type != "customer":
            table = SOURCE_TABLES[r.entity_type]
            stmts.append(
                f"UPDATE {table} SET company_id = '{r.company_id}' "
                f"WHERE id = '{r.entity_id}' AND tenant_id = '{tenant}';"
            )
        stmts.append(
            "UPDATE public.search_entity_projections_v2 SET company_id = "
            f"'{r.company_id}', projected_at = NOW() "
            f"WHERE entity_type = '{r.entity_type}' AND entity_id = '{r.entity_id}' "
            f"AND tenant_id = '{tenant}';"
        )
    stmts.append("COMMIT;")
    return "\n".join(stmts) + "\n"


def verify_applied(dsn: str, matched: list[tuple[MappingRow, str]]) -> tuple[int, int]:
    """回填后核对：源表命中行数、v2 命中行数。返回 (source_ok, v2_ok)。"""
    if not matched:
        return (0, 0)
    values = ",".join(
        f"('{r.entity_type}','{r.entity_id}'::uuid,'{tenant}'::uuid,'{r.company_id}'::uuid)"
        for r, tenant in matched
    )
    sql = f"""
    WITH m(entity_type, entity_id, tenant_id, company_id) AS (VALUES {values})
    SELECT
      (SELECT count(*) FROM m
        WHERE (m.entity_type = 'sales_order' AND EXISTS (
                 SELECT 1 FROM erp.sales_orders o
                  WHERE o.id = m.entity_id AND o.company_id = m.company_id))
           OR (m.entity_type = 'purchase_order' AND EXISTS (
                 SELECT 1 FROM erp.purchase_orders o
                  WHERE o.id = m.entity_id AND o.company_id = m.company_id))),
      (SELECT count(*) FROM public.search_entity_projections_v2 v
         JOIN m ON v.entity_type = m.entity_type AND v.entity_id = m.entity_id
                AND v.tenant_id = m.tenant_id AND v.company_id = m.company_id);
    """
    out = run_psql(dsn, sql).strip()
    source_ok, v2_ok = (out.split("\t") + ["0", "0"])[:2]
    return int(source_ok or 0), int(v2_ok or 0)


def write_unmatched(path: str | None, items: list[tuple[MappingRow, str]]) -> None:
    if not items:
        return
    header = ["line", "entity_type", "entity_id", "company_id", "reason"]
    if path:
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)
            for r, reason in items:
                w.writerow([r.line, r.entity_type, r.entity_id, r.company_id, reason])
        print(f"[w13-backfill] 未匹配清单已写入 {path}")
    else:
        print("[w13-backfill] 未匹配清单：")
        w = csv.writer(sys.stdout)
        w.writerow(header)
        for r, reason in items:
            w.writerow([r.line, r.entity_type, r.entity_id, r.company_id, reason])


def main() -> int:
    parser = argparse.ArgumentParser(
        description="W13 历史公司归属回填（erp 源表 + search v2 投影）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("用法\n----", 1)[-1],
    )
    parser.add_argument("--dsn", required=True, help="PostgreSQL 连接串（必须显式提供）")
    parser.add_argument(
        "--mapping",
        required=True,
        help="业务归属清单 CSV（列：entity_type,entity_id,company_id）",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="只读校验并打印计划（默认）")
    mode.add_argument("--apply", action="store_true", help="单事务写回源表与 v2")
    parser.add_argument("--output", help="未匹配行清单输出 CSV 路径（默认打印到 stdout）")
    args = parser.parse_args()

    if not args.dsn.strip():
        die("--dsn 不能为空")
    if not args.mapping.strip():
        die("必须提供 --mapping 业务归属清单；未提供时拒绝执行")

    rows = read_mapping(args.mapping)
    valid, unmatched = validate_rows(rows)
    source = fetch_source_with(args.dsn, valid)

    matched: list[tuple[MappingRow, str]] = []
    for r in valid:
        key = (r.entity_type, r.entity_id.lower())
        found = source.get(key)
        if found is None:
            unmatched.append((r, "源表未找到该实体（id 不存在）"))
            continue
        tenant, _existing = found
        if tenant in ("", "\\N"):
            unmatched.append((r, "源表实体缺少 tenant_id，无法校验公司归属"))
            continue
        matched.append((r, tenant))

    # 公司必须属于该实体所在租户
    pairs = {(tenant, r.company_id) for r, tenant in matched}
    owned = fetch_companies(args.dsn, pairs)
    verified: list[tuple[MappingRow, str]] = []
    for r, tenant in matched:
        if (tenant, r.company_id.lower()) not in owned:
            unmatched.append((r, f"company_id 不属于该实体租户 {tenant}（hrm.companies 未命中）"))
            continue
        verified.append((r, tenant))

    if not args.dry_run and not v2_table_exists(args.dsn):
        die(
            "public.search_entity_projections_v2 不存在：请先应用迁移 "
            "20261123142000_search_projection_v2_company_scope.sql，或在 --dry-run 下预演"
        )

    src_count = sum(1 for r, _ in verified if r.entity_type != "customer")
    v2_count = len(verified)
    customer_count = v2_count - src_count

    if args.apply and verified:
        sql = build_apply_sql(verified, update_source=True)
        run_psql(args.dsn, sql, single_txn=False)  # SQL 自带 BEGIN/COMMIT
        source_ok, v2_ok = verify_applied(args.dsn, verified)
        print(
            f"[w13-backfill] 已提交：源表实际命中 {source_ok} 行（计划 {src_count}），"
            f"v2 实际命中 {v2_ok} 行（计划 {v2_count}；v2 未命中行需先跑投影重建/回填）"
        )
        if source_ok != src_count:
            print(
                f"[w13-backfill] 警告：源表命中数与计划不一致（{source_ok}/{src_count}）",
                file=sys.stderr,
            )
    else:
        print(
            f"[w13-backfill] {'DRY-RUN' if args.dry_run or not args.apply else '计划'}："
            f"源表待更新 {src_count} 行，v2 待更新 {v2_count} 行"
            f"（customer 仅 v2 {customer_count} 行）"
        )

    write_unmatched(args.output, unmatched)

    # 统计源表 company_id 仍为空的行数，供回填进度参考
    remaining = run_psql(
        args.dsn,
        "SELECT 'sales_order' AS et, count(*) FROM erp.sales_orders WHERE company_id IS NULL "
        "UNION ALL SELECT 'purchase_order', count(*) FROM erp.purchase_orders WHERE company_id IS NULL;",
    )
    for line in remaining.splitlines():
        if line.strip():
            et, cnt = (line.split("\t") + ["", ""])[:2]
            print(f"[w13-backfill] 源表 company_id 仍为空：{et} = {cnt}")

    if unmatched:
        print(
            f"[w13-backfill] 未匹配 {len(unmatched)} 行：见上方清单/--output；"
            "请业务确认后补齐归属规则再重跑",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
