#!/usr/bin/env python3
"""W13 历史公司归属：候选起草、母公司解析、校验、回填（源表 + search v2 投影）。

用法
----
    # 1) 解析母公司（租户根公司），输出 租户 -> 根公司；0 个或多个根即标 PENDING
    python3 scripts/db/w13_backfill_company_attribution.py \
        --resolve-parents --dsn "postgresql://user:pass@host:5432/db" \
        [--output parent_map.csv]

    # 2) 起草候选清单（按四条规则与优先级生成初稿，供业务复核签字）
    python3 scripts/db/w13_backfill_company_attribution.py \
        --draft --dsn "postgresql://user:pass@host:5432/db" \
        --output w13-attribution-draft-YYYYMMDD.csv \
        [--pending-output w13-attribution-pending-YYYYMMDD.csv]

    # 3) 校验 / dry-run 全量报告（默认）；--apply 才写库
    python3 scripts/db/w13_backfill_company_attribution.py \
        --dsn "postgresql://user:pass@host:5432/db" \
        --mapping w13-attribution-draft-YYYYMMDD.csv \
        [--dry-run | --apply] \
        [--report w13-attribution-report-YYYYMMDD.txt] \
        [--fallback-output docs/database/w13-attribution-fallback-YYYYMMDD.csv] \
        [--exception-output docs/database/w13-attribution-exceptions-YYYYMMDD.csv] \
        [--output unmatched.csv]

映射清单（CSV，UTF-8，首行为表头）
--------------------------------
必需列：

    entity_type,entity_id,company_id

可选列（`--draft` 会自动写出；业务复核时保留即可）：

    tenant_id       源实体所在租户（仅供核对，脚本以源表为准）
    matched_rule    命中规则：母公司级 / 客户/供应商所属公司 /
                    母公司兜底-无自然归属 / 母公司兜底-数据缺失 / 业务指定-例外
    is_fallback     true/false，是否为母公司兜底行
    is_exception    true/false，是否为例外行（需业务签字）
    exception_note  业务指定非根公司时的例外说明（必填，不得静默接受）

取值约束：

    entity_type  sales_order | purchase_order | customer
    entity_id    UUID，对应 erp.sales_orders / erp.purchase_orders / erp.customers 主键
    company_id   UUID，必须属于该实体所在租户的 hrm.companies

归属规则与优先级（既定技术口径，不再待确认）
------------------------------------------
    ① 母公司级（显式指定） > ② 客户 / 供应商所属公司 > ③ 母公司兜底

脚本起草时按此顺序判定：客户 / 供应商是集团内公司且其公司为租户根公司 → 母公司级；
是集团内其他公司 → 客户 / 供应商所属公司；无客户 / 供应商或对方无公司归属 → 母公司兜底。
业务对优先级有异议时，通过修改 CSV 行的 `company_id` 表达，不回改规则定义。

母公司解析（租户根公司）
------------------------
规则：取该租户的根公司。恰好一个根即作为母公司；多个根或零根则**中止**并输出待指定清单，
不走任何默认。`hrm.companies` 当前没有 `parent_id` 列，根公司由 `erp.company_relations`
（status=active、未删除、未过期）反推：从未作为 `child_company_id` 出现的公司即根公司。
若未来 `hrm.companies` 增加 `parent_id`，脚本优先使用该列。

解析实现为模块级 `load_tenant_roots()`，供后续公司级表脚本复用，不是 W13 专用逻辑。

校验项（全部 fail-closed）
--------------------------
1. `company_id` 属于该实体所在租户的 `hrm.companies`；
2. 兜底行（`is_fallback=true`）的 `company_id` 必须等于该租户根公司；
   业务要指定非根公司时，必须填 `exception_note`，该行转入例外清单并需签字，不静默接受；
3. 同一 `(entity_type, entity_id)` 重复出现且 `company_id` 冲突时拒绝执行。

写入范围
--------
* sales_order / purchase_order：更新源表 `erp.<表>.company_id`，并更新
  `public.search_entity_projections_v2.company_id`（只更新已存在的 v2 行）。
* customer：源表仅有 `group_company_id`（集团归属语义，与本轮公司维度不同），
  **不写源表**，只更新 v2 投影行；该限制会在报告中标明。

行为
----
* 默认 dry-run（只读校验并输出全量报告）；必须显式 `--apply` 才写库。
* `--apply` 全程单事务（SQL 自带 BEGIN/COMMIT），任一步失败整体回滚。
* 未提供 `--mapping`（非 draft / resolve-parents 模式）或文件缺失/表头不符：退出码 2。
* 未匹配（源表不存在该实体、公司不属于该租户、UUID 非法、兜底行不等根公司）：逐行输出，
  退出码 1；`--output` 指定时同时写 CSV。
* 待指定母公司（0 个或多个根）：中止，退出码 2，输出该租户清单。
* `--apply` 未显式给 `--fallback-output` / `--exception-output` 时，自动落到
  `docs/database/w13-attribution-fallback-<YYYYMMDD>.csv` 与
  `docs/database/w13-attribution-exceptions-<YYYYMMDD>.csv`（执行日日期），随仓库留档。
* 全部命中且（dry-run 或 apply）完成：退出码 0。
* v2 表不存在：`--apply` 拒绝（退出码 2），dry-run 仅告警。

依赖：psql（PostgreSQL 客户端）。脚本不读取 .env，不连接默认库，必须显式 --dsn。
"""

from __future__ import annotations

import argparse
import csv
import datetime
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

SOURCE_TABLES = {
    "sales_order": "erp.sales_orders",
    "purchase_order": "erp.purchase_orders",
    "customer": "erp.customers",
}

COUNTERPARTY = {
    "sales_order": ("customer_id", "erp.customers", "客户"),
    "purchase_order": ("supplier_id", "erp.suppliers", "供应商"),
}

REQUIRED_COLUMNS = ["entity_type", "entity_id", "company_id"]
OPTIONAL_COLUMNS = [
    "tenant_id",
    "matched_rule",
    "is_fallback",
    "is_exception",
    "exception_note",
]

RULE_PARENT = "母公司级"
RULE_COUNTERPARTY = "客户/供应商所属公司"
RULE_FALLBACK_NO_NATURAL = "母公司兜底-无自然归属"
RULE_FALLBACK_MISSING = "母公司兜底-数据缺失"
RULE_OVERRIDE = "业务指定-例外"

TRUE_VALUES = {"1", "true", "t", "yes", "y", "是"}


@dataclass
class MappingRow:
    line: int
    entity_type: str
    entity_id: str
    company_id: str
    tenant_id: str = ""
    matched_rule: str = ""
    is_fallback: bool = False
    is_exception: bool = False
    exception_note: str = ""


@dataclass
class DraftRow:
    entity_type: str
    entity_id: str
    tenant_id: str
    company_id: str
    matched_rule: str
    is_fallback: bool
    is_exception: bool
    reason: str
    extra: dict[str, str] = field(default_factory=dict)


def die(msg: str, code: int = 2) -> None:
    print(f"[w13-backfill] 拒绝执行：{msg}", file=sys.stderr)
    sys.exit(code)


def truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in TRUE_VALUES


def run_psql(
    dsn: str, sql: str, *, single_txn: bool = False, tuples_only: bool = True
) -> str:
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
        check=False,
    )
    if proc.returncode != 0:
        # 不回显 dsn，避免泄露口令
        print("[w13-backfill] psql 执行失败：", file=sys.stderr)
        print(proc.stderr.strip(), file=sys.stderr)
        sys.exit(2)
    return proc.stdout


def relation_exists(dsn: str, relation: str) -> bool:
    return (
        run_psql(dsn, f"SELECT to_regclass('{relation}') IS NOT NULL;").strip() == "t"
    )


def has_column(dsn: str, schema: str, table: str, column: str) -> bool:
    sql = (
        "SELECT count(*) FROM information_schema.columns "
        f"WHERE table_schema = '{schema}' AND table_name = '{table}' "
        f"AND column_name = '{column}';"
    )
    return run_psql(dsn, sql).strip() not in ("", "0")


# ---------------------------------------------------------------------------
# 母公司解析（可复用）
# ---------------------------------------------------------------------------


def load_tenant_roots(
    dsn: str, tenants: set[str] | None = None
) -> dict[str, list[str]]:
    """返回 tenant_id -> 根公司（母公司）id 列表。

    `hrm.companies.parent_id` 存在时优先使用；否则用 `erp.company_relations`
    反推根公司（active 关系中从未作为子公司的公司）。
    调用方必须自行检查每个租户是否恰好一个根，否则 fail-closed。
    """
    if not relation_exists(dsn, "hrm.companies"):
        die("hrm.companies 不存在：无法解析母公司")

    tenant_filter = ""
    if tenants:
        values = ",".join(f"'{t}'::uuid" for t in sorted(tenants))
        tenant_filter = f" AND tenant_id IN ({values})"

    if has_column(dsn, "hrm", "companies", "parent_id"):
        sql = (
            "SELECT tenant_id::text, id::text FROM hrm.companies "
            "WHERE deleted_at IS NULL AND status = 'active' "
            f"AND parent_id IS NULL{tenant_filter} "
            "ORDER BY 1, 2;"
        )
    else:
        if not relation_exists(dsn, "erp.company_relations"):
            die(
                "hrm.companies 无 parent_id 且 erp.company_relations 不存在："
                "无法解析租户根公司"
            )
        sql = f"""
        WITH rel AS (
          SELECT DISTINCT tenant_id, child_company_id
          FROM erp.company_relations
          WHERE deleted_at IS NULL
            AND status = 'active'
            AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        )
        SELECT c.tenant_id::text, c.id::text
        FROM hrm.companies c
        WHERE c.deleted_at IS NULL
          AND c.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM rel r
            WHERE r.tenant_id = c.tenant_id AND r.child_company_id = c.id
          ){tenant_filter.replace("tenant_id", "c.tenant_id")}
        ORDER BY 1, 2;
        """

    result: dict[str, list[str]] = {}
    for line in run_psql(dsn, sql).splitlines():
        if not line.strip():
            continue
        tenant, company = (line.split("\t") + ["", ""])[:2]
        result.setdefault(tenant, []).append(company)
    return result


def parent_map_or_die(
    dsn: str, tenants: set[str], pending_path: str | None = None
) -> dict[str, str]:
    """解析并强制「每租户恰好一个根」；不满足则输出待指定清单并中止。"""
    roots = load_tenant_roots(dsn, tenants)
    resolved: dict[str, str] = {}
    pending: list[tuple[str, int, str]] = []
    for tenant in sorted(tenants):
        found = roots.get(tenant, [])
        if len(found) == 1:
            resolved[tenant] = found[0]
        else:
            pending.append((tenant, len(found), ",".join(found)))
    if pending:
        write_pending(pending_path, pending)
        die(
            f"{len(pending)} 个租户无法唯一确定母公司（0 个或多个根），已中止；"
            "请业务指定主办公司后重跑",
            code=2,
        )
    return resolved


def write_pending(path: str | None, pending: list[tuple[str, int, str]]) -> None:
    header = ["tenant_id", "root_count", "root_company_ids"]
    if path:
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(pending)
        print(f"[w13-backfill] 待指定母公司清单已写入 {path}")
    else:
        print("[w13-backfill] 待指定母公司清单：", file=sys.stderr)
        w = csv.writer(sys.stderr)
        w.writerow(header)
        w.writerows(pending)


# ---------------------------------------------------------------------------
# 候选起草
# ---------------------------------------------------------------------------


def fetch_draft_rows(dsn: str, pending_path: str | None = None) -> list[DraftRow]:
    for et in ("sales_order", "purchase_order"):
        table = SOURCE_TABLES[et]
        schema, name = table.split(".", 1)
        if not has_column(dsn, schema, name, "company_id"):
            die(
                f"{table}.company_id 不存在：请先应用 "
                "20261123140000 / 20261123141000 补列迁移"
            )

    parts: list[str] = []
    for et, (fk, ctable, _label) in COUNTERPARTY.items():
        table = SOURCE_TABLES[et]
        parts.append(
            f"""
        SELECT '{et}' AS entity_type, o.id::text AS entity_id,
               coalesce(o.tenant_id::text,'') AS tenant_id,
               o.{fk}::text AS counterparty_id,
               (c.id IS NOT NULL) AS counterparty_found,
               coalesce(c.is_group_company,false) AS group_company,
               coalesce(c.group_company_id::text,'') AS group_company_id,
               coalesce(c.tenant_id::text,'') AS counterparty_tenant
        FROM {table} o
        LEFT JOIN {ctable} c ON c.id = o.{fk} AND c.deleted_at IS NULL
        WHERE o.deleted_at IS NULL AND o.company_id IS NULL
        """
        )
    parts.append(
        """
        SELECT 'customer' AS entity_type, c.id::text AS entity_id,
               coalesce(c.tenant_id::text,'') AS tenant_id,
               '' AS counterparty_id,
               true AS counterparty_found,
               coalesce(c.is_group_company,false) AS group_company,
               coalesce(c.group_company_id::text,'') AS group_company_id,
               coalesce(c.tenant_id::text,'') AS counterparty_tenant
        FROM erp.customers c
        WHERE c.deleted_at IS NULL
        """
    )
    sql = " UNION ALL ".join(parts) + " ORDER BY 1, 2;"

    raw: list[dict[str, str]] = []
    for line in run_psql(dsn, sql).splitlines():
        if not line.strip():
            continue
        cols = (line.split("\t") + [""] * 8)[:8]
        raw.append(
            dict(
                zip(
                    [
                        "entity_type",
                        "entity_id",
                        "tenant_id",
                        "counterparty_id",
                        "counterparty_found",
                        "group_company",
                        "group_company_id",
                        "counterparty_tenant",
                    ],
                    cols,
                )
            )
        )

    tenants = {r["tenant_id"] for r in raw if r["tenant_id"]}
    missing_tenant = [r for r in raw if not r["tenant_id"]]
    if missing_tenant:
        write_pending(
            pending_path,
            [("(tenant_id 为空)", 0, f"{len(missing_tenant)} 行实体缺少租户")],
        )
        die("存在 tenant_id 为空的源实体，无法解析母公司，已中止起草")
    roots = parent_map_or_die(dsn, tenants, pending_path)

    drafts: list[DraftRow] = []
    for r in raw:
        tenant = r["tenant_id"]
        root = roots[tenant]
        is_order = r["entity_type"] != "customer"
        found = r["counterparty_found"] == "t"
        group_company = r["group_company"] == "t"
        group_id = r["group_company_id"].lower()
        cp_tenant = r["counterparty_tenant"]

        if is_order and not found:
            drafts.append(
                DraftRow(
                    r["entity_type"],
                    r["entity_id"],
                    tenant,
                    root,
                    RULE_FALLBACK_MISSING,
                    True,
                    True,
                    "订单引用的客户/供应商记录不存在或已删除",
                )
            )
            continue
        if is_order and cp_tenant and cp_tenant != tenant:
            drafts.append(
                DraftRow(
                    r["entity_type"],
                    r["entity_id"],
                    tenant,
                    root,
                    RULE_FALLBACK_MISSING,
                    True,
                    True,
                    "客户/供应商与订单不属于同一租户",
                )
            )
            continue
        if group_company and group_id:
            if group_id == root:
                drafts.append(
                    DraftRow(
                        r["entity_type"],
                        r["entity_id"],
                        tenant,
                        root,
                        RULE_PARENT,
                        False,
                        False,
                        "客户/供应商为租户母公司",
                    )
                )
            else:
                drafts.append(
                    DraftRow(
                        r["entity_type"],
                        r["entity_id"],
                        tenant,
                        group_id,
                        RULE_COUNTERPARTY,
                        False,
                        False,
                        "按客户/供应商所属公司",
                    )
                )
            continue

        reason = (
            "客户本身无公司归属且非集团内公司"
            if r["entity_type"] == "customer"
            else "无客户/供应商或对方无公司归属"
        )
        drafts.append(
            DraftRow(
                r["entity_type"],
                r["entity_id"],
                tenant,
                root,
                RULE_FALLBACK_NO_NATURAL,
                True,
                r["entity_type"] == "customer",
                reason,
            )
        )

    # 起草结果同样做同租户公司校验：不属于该租户的公司行降级为兜底待确认
    pairs = {
        (d.tenant_id, d.company_id.lower())
        for d in drafts
        if d.company_id.lower() != roots[d.tenant_id].lower()
    }
    owned = fetch_companies(dsn, pairs)
    fixed: list[DraftRow] = []
    for d in drafts:
        if (
            d.company_id.lower() == roots[d.tenant_id].lower()
            or (
                d.tenant_id,
                d.company_id.lower(),
            )
            in owned
        ):
            fixed.append(d)
            continue
        fixed.append(
            DraftRow(
                d.entity_type,
                d.entity_id,
                d.tenant_id,
                roots[d.tenant_id],
                RULE_FALLBACK_MISSING,
                True,
                True,
                "归属公司不属于该租户，转兜底待业务确认",
            )
        )
    return fixed


def write_draft(path: str, rows: list[DraftRow]) -> None:
    header = REQUIRED_COLUMNS + OPTIONAL_COLUMNS + ["reason"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(
                [
                    r.entity_type,
                    r.entity_id,
                    r.company_id,
                    r.tenant_id,
                    r.matched_rule,
                    "true" if r.is_fallback else "false",
                    "true" if r.is_exception else "false",
                    "",
                    r.reason,
                ]
            )
    print(f"[w13-backfill] 候选清单已写入 {path}（{len(rows)} 行）")


# ---------------------------------------------------------------------------
# 映射读取与校验
# ---------------------------------------------------------------------------


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
                rows.append(
                    MappingRow(
                        lineno=lineno,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        company_id=company_id,
                        tenant_id=(raw.get("tenant_id") or "").strip(),
                        matched_rule=(raw.get("matched_rule") or "").strip(),
                        is_fallback=truthy(raw.get("is_fallback")),
                        is_exception=truthy(raw.get("is_exception")),
                        exception_note=(raw.get("exception_note") or "").strip(),
                    )
                )
            if not rows:
                die("映射清单为空（无数据行）")
            return rows
    except FileNotFoundError:
        die(f"映射清单不存在：{path}")
    except OSError as e:
        die(f"读取映射清单失败：{e}")


def validate_rows(
    rows: list[MappingRow],
) -> tuple[list[MappingRow], list[tuple[MappingRow, str]]]:
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
                die(f"第 {r.line} 行与先前行冲突：同一实体 {key} 映射到不同公司")
            unmatched.append((r, "重复行（公司一致，已忽略）"))
            continue
        seen[key] = r.company_id.lower()
        valid.append(r)
    return valid, unmatched


def fetch_source_with(
    dsn: str, rows: list[MappingRow]
) -> dict[tuple[str, str], tuple[str, str]]:
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
    return relation_exists(dsn, "public.search_entity_projections_v2")


# ---------------------------------------------------------------------------
# 报告 / 清单输出
# ---------------------------------------------------------------------------


@dataclass
class VerifiedRow:
    row: MappingRow
    tenant: str
    root: str
    is_fallback: bool
    is_exception: bool
    note: str


def build_report(
    rows: list[VerifiedRow], other_reasons: list[tuple[MappingRow, str]]
) -> str:
    lines = [
        "# W13 公司归属 dry-run 全量报告",
        "",
        f"- 待写行：{len(rows)}",
        f"- 兜底行：{sum(1 for r in rows if r.is_fallback)}",
        f"- 例外行：{sum(1 for r in rows if r.is_exception)}",
        f"- 未匹配行：{len(other_reasons)}",
        "",
        "entity_type,entity_id,company_id,tenant_id,matched_rule,is_fallback,is_exception,note",
    ]
    for r in rows:
        lines.append(
            ",".join(
                [
                    r.row.entity_type,
                    r.row.entity_id,
                    r.row.company_id,
                    r.tenant,
                    r.row.matched_rule or "(未标注)",
                    "true" if r.is_fallback else "false",
                    "true" if r.is_exception else "false",
                    (r.note or "").replace("\n", " "),
                ]
            )
        )
    if other_reasons:
        lines.append("")
        lines.append("## 未匹配")
        for r, reason in other_reasons:
            lines.append(f"- 第 {r.line} 行 {r.entity_type}/{r.entity_id}: {reason}")
    return "\n".join(lines) + "\n"


def write_report(path: str | None, text: str) -> None:
    if path:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"[w13-backfill] 全量报告已写入 {path}")
    else:
        sys.stdout.write(text)


def write_verified_subset(path: str | None, rows: list[VerifiedRow], kind: str) -> None:
    if not path:
        return
    header = [
        "entity_type",
        "entity_id",
        "company_id",
        "tenant_id",
        "root_company_id",
        "matched_rule",
        "is_fallback",
        "is_exception",
        "note",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(
                [
                    r.row.entity_type,
                    r.row.entity_id,
                    r.row.company_id,
                    r.tenant,
                    r.root,
                    r.row.matched_rule,
                    "true" if r.is_fallback else "false",
                    "true" if r.is_exception else "false",
                    r.note,
                ]
            )
    print(f"[w13-backfill] {kind}清单已写入 {path}（{len(rows)} 行）")


# ---------------------------------------------------------------------------
# 写入
# ---------------------------------------------------------------------------


def build_apply_sql(matched: list[tuple[MappingRow, str]], update_source: bool) -> str:
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


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------


def classify_verified(
    located: list[tuple[MappingRow, str]],
    roots: dict[str, str],
    owned: set[tuple[str, str]],
) -> tuple[list[VerifiedRow], list[tuple[MappingRow, str]]]:
    """按租户根公司与公司归属校验，产出已验证行与未匹配行。"""
    verified: list[VerifiedRow] = []
    rejected: list[tuple[MappingRow, str]] = []
    for r, tenant in located:
        root = roots[tenant]
        if (tenant, r.company_id.lower()) not in owned:
            rejected.append(
                (r, f"company_id 不属于该实体租户 {tenant}（hrm.companies 未命中）")
            )
            continue

        is_fallback = r.is_fallback or r.matched_rule.startswith("母公司兜底")
        if is_fallback and r.company_id.lower() != root.lower():
            if not r.exception_note:
                rejected.append(
                    (
                        r,
                        (
                            "兜底行 company_id 不等于租户根公司，且未填 exception_note；"
                            "业务如确需指定非根公司，请在 exception_note 说明"
                        ),
                    )
                )
                continue
            is_fallback = False
            is_exception = True
            note = f"业务指定非根公司：{r.exception_note}"
        else:
            is_exception = r.is_exception
            note = r.exception_note

        verified.append(
            VerifiedRow(
                row=r,
                tenant=tenant,
                root=root,
                is_fallback=is_fallback,
                is_exception=is_exception,
                note=note,
            )
        )
    return verified, rejected


def main() -> int:
    parser = argparse.ArgumentParser(
        description="W13 历史公司归属：候选起草、母公司解析、校验与回填",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="映射清单（CSV" + __doc__.split("映射清单（CSV", 1)[-1]
        if "映射清单（CSV" in __doc__
        else __doc__,
    )
    parser.add_argument("--dsn", help="PostgreSQL 连接串（必须显式提供）")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--resolve-parents", action="store_true", help="只解析租户根公司并输出"
    )
    mode.add_argument("--draft", action="store_true", help="按四条规则生成候选清单初稿")
    parser.add_argument(
        "--mapping",
        help="业务归属清单 CSV（列：entity_type,entity_id,company_id；可选规则列）",
    )
    write_mode = parser.add_mutually_exclusive_group()
    write_mode.add_argument(
        "--dry-run", action="store_true", help="只读校验并输出报告（默认）"
    )
    write_mode.add_argument("--apply", action="store_true", help="单事务写回源表与 v2")
    parser.add_argument(
        "--output", help="draft 候选清单 / resolve-parents 映射的输出路径"
    )
    parser.add_argument("--pending-output", help="0 或多个根租户的待指定清单 CSV")
    parser.add_argument("--report", help="dry-run 全量报告输出路径（默认 stdout）")
    parser.add_argument(
        "--fallback-output",
        help="兜底清单 CSV（建议 docs/database/w13-attribution-fallback-YYYYMMDD.csv）",
    )
    parser.add_argument(
        "--exception-output",
        help="例外清单 CSV（建议 docs/database/w13-attribution-exceptions-YYYYMMDD.csv）",
    )
    args = parser.parse_args()

    if not args.dsn or not args.dsn.strip():
        die("--dsn 不能为空")

    if args.resolve_parents:
        roots = load_tenant_roots(args.dsn)
        pending = [
            (t, len(v), ",".join(v)) for t, v in sorted(roots.items()) if len(v) != 1
        ]
        resolved = [(t, v[0]) for t, v in sorted(roots.items()) if len(v) == 1]
        if args.output:
            with open(args.output, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["tenant_id", "root_company_id"])
                w.writerows(resolved)
            print(
                f"[w13-backfill] 母公司映射已写入 {args.output}（{len(resolved)} 个租户）"
            )
        else:
            for t, c in resolved:
                print(f"{t}\t{c}")
        if pending:
            write_pending(args.pending_output, pending)
            print(
                f"[w13-backfill] {len(pending)} 个租户无法唯一确定母公司，需业务指定",
                file=sys.stderr,
            )
            return 1
        return 0

    if args.draft:
        if not args.output:
            die("--draft 必须提供 --output 候选清单路径")
        rows = fetch_draft_rows(args.dsn, args.pending_output)
        write_draft(args.output, rows)
        fallback = sum(1 for r in rows if r.is_fallback)
        exceptions = sum(1 for r in rows if r.is_exception)
        print(
            f"[w13-backfill] 起草完成：共 {len(rows)} 行，兜底 {fallback} 行，"
            f"例外 {exceptions} 行；业务只需复核兜底与例外行"
        )
        return 0

    if not args.mapping or not args.mapping.strip():
        die("必须提供 --mapping 业务归属清单（或使用 --draft / --resolve-parents）")

    rows = read_mapping(args.mapping)
    valid, unmatched = validate_rows(rows)
    source = fetch_source_with(args.dsn, valid)

    located: list[tuple[MappingRow, str]] = []
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
        if r.tenant_id and r.tenant_id.lower() != tenant.lower():
            unmatched.append(
                (r, f"清单 tenant_id={r.tenant_id} 与源表租户 {tenant} 不一致")
            )
            continue
        located.append((r, tenant))

    tenants = {t for _, t in located}
    roots = parent_map_or_die(args.dsn, tenants, args.pending_output)

    # 公司必须属于该实体所在租户
    pairs = {(tenant, r.company_id) for r, tenant in located}
    owned = fetch_companies(args.dsn, pairs)

    verified, rejected = classify_verified(located, roots, owned)
    unmatched.extend(rejected)

    if not args.dry_run and not v2_table_exists(args.dsn):
        die(
            "public.search_entity_projections_v2 不存在：请先应用迁移 "
            "20261123142000_search_projection_v2_company_scope.sql，或在 --dry-run 下预演"
        )

    if args.apply:
        # 兜底 / 例外清单随仓库留档：固定目录 + 执行日期，不落临时目录。
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        stamp = datetime.datetime.now().astimezone().strftime("%Y%m%d")
        if not args.fallback_output:
            args.fallback_output = os.path.join(
                repo_root, "docs", "database", f"w13-attribution-fallback-{stamp}.csv"
            )
        if not args.exception_output:
            args.exception_output = os.path.join(
                repo_root, "docs", "database", f"w13-attribution-exceptions-{stamp}.csv"
            )

    write_report(
        args.report,
        build_report(verified, unmatched),
    )
    write_verified_subset(
        args.fallback_output,
        [v for v in verified if v.is_fallback],
        "兜底",
    )
    write_verified_subset(
        args.exception_output,
        [v for v in verified if v.is_exception],
        "例外",
    )

    matched = [(v.row, v.tenant) for v in verified]
    src_count = sum(1 for r, _ in matched if r.entity_type != "customer")
    v2_count = len(matched)
    customer_count = v2_count - src_count

    if args.apply and matched:
        sql = build_apply_sql(matched, update_source=True)
        run_psql(args.dsn, sql, single_txn=False)  # SQL 自带 BEGIN/COMMIT
        source_ok, v2_ok = verify_applied(args.dsn, matched)
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
