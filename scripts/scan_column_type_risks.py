#!/usr/bin/env python3
"""
全库「表列类型 vs 代码模型风险」扫描报告（编译库一致性主线工具，psql 零依赖）
聚焦 sqlx 严格类型检查下已验证会解码失败的高风险规则：
  R1 时间戳语义列用 DATE（created_at/updated_at/deleted_at/last_run_at 等应 TIMESTAMPTZ）
      —— erp.purchase_orders.order_date 已实证：代码 DateTime<Utc> 解码 DATE 报 mismatched types
  R2 自定义 enum 列（代码模型通常为 String）—— bi.reports report_type/status 已实证
  R3 DATE/NUMERIC 全量分布（业务正确基线，供未来新增查询参考）
用法：
  python3 scripts/scan_column_type_risks.py            # 默认容器库 5433
  DATABASE_URL=postgres://... python3 scripts/scan_column_type_risks.py
输出：stdout 报告 + docs/architecture/column-type-risk-report.md
"""
import os
import re
import subprocess
import sys

HOST = os.environ.get("PGHOST", "localhost")
PORT = os.environ.get("PGPORT", "5433")
DB = os.environ.get("PGDATABASE", "topems")
USER = os.environ.get("PGUSER", "topems")
PASSWORD = os.environ.get("PGPASSWORD", "topems_secret")

SKIP_SCHEMAS = ("information_schema", "pg_catalog", "topems", "audit", "extensions")
# 时间戳语义列名（若为 DATE 则高风险）
TS_SEMANTIC = re.compile(
    r"^(created_at|updated_at|deleted_at|last_run_at|last_checked_at|last_synced_at|"
    r"processed_at|generated_at|approved_at|confirmed_at|completed_at|started_at|"
    r"finished_at|submitted_at|published_at|received_at|shipped_at)$",
    re.I,
)


def psql(sql: str) -> str:
    env = dict(os.environ)
    env["PGPASSWORD"] = PASSWORD
    env["PATH"] = "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin"
    out = subprocess.run(
        ["psql", "-h", HOST, "-p", PORT, "-U", USER, "-d", DB, "-t", "-A", "-F", "|", "-c", sql],
        capture_output=True, text=True, env=env,
    )
    if out.returncode != 0:
        print(f"[ERR] psql 失败: {out.stderr[:300]}", file=sys.stderr)
        sys.exit(1)
    return out.stdout


def main() -> int:
    schema_filter = ",".join(f"'{s}'" for s in SKIP_SCHEMAS)
    rows = [
        ln.split("|") for ln in psql(f"""
        SELECT table_schema, table_name, column_name, data_type, is_nullable, udt_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ({schema_filter})
          AND table_schema NOT LIKE 'pg_%'
        ORDER BY table_schema, table_name, ordinal_position;
        """).strip().splitlines() if ln
    ]

    r1, r2, r3 = [], [], []
    stats = {}
    for schema, table, col, dtype, nullable, udt in rows:
        key = f"{schema}.{table}"
        s = stats.setdefault(key, {"cols": 0, "date": 0, "numeric": 0})
        s["cols"] += 1
        if dtype == "date":
            s["date"] += 1
            if TS_SEMANTIC.search(col):
                r1.append((schema, table, col))
        elif dtype == "numeric":
            s["numeric"] += 1
            r3.append((schema, table, col, nullable))
        if dtype == "USER-DEFINED":
            r2.append((schema, table, col, udt))

    lines = [
        "# 表列类型风险扫描报告（编译库一致性）",
        "",
        f"> 生成时间：{os.popen('date \"+%Y-%m-%d %H:%M\"').read().strip()} · 数据库：{HOST}:{PORT}/{DB}",
        "> 工具：scripts/scan_column_type_risks.py（psql 零依赖）· 规则：R1 时间戳列用 DATE / R2 自定义 enum / R3 NUMERIC 全量基线",
        "",
        "## 汇总",
        "",
        "| 风险类别 | 说明 | 命中数 |",
        "|---|---|---|",
        f"| R1 | 时间戳语义列（created_at 等）为 DATE（应 TIMESTAMPTZ，sqlx 解码 DateTime<Utc> 失败） | {len(r1)} |",
        f"| R2 | 自定义 enum 列（代码模型 String，sqlx 报 mismatched types） | {len(r2)} |",
        f"| R3 | NUMERIC 列总数（业务基线；代码模型 f64/i64 时需显式转换） | {len(r3)} |",
        "",
    ]
    lines += ["## R1：时间戳语义列用 DATE（高风险，需核对代码模型）", ""]
    if r1:
        lines += ["| schema.table | column |", "|---|---|"] + [f"| {a}.{b} | {c} |" for a, b, c in sorted(r1)]
    else:
        lines += ["_无_", ""]
    lines += ["", "## R2：自定义 enum 列（需核对该列是否被 String 模型查询）", ""]
    if r2:
        lines += ["| schema.table | column | udt |", "|---|---|---|"] + [f"| {a}.{b} | {c} | {d} |" for a, b, c, d in sorted(r2)]
    else:
        lines += ["_无_", ""]
    lines += ["", "## 各表 DATE/NUMERIC 列分布（基线）", "", "| schema.table | 列数 | date | numeric |", "|---|---|---|---|"]
    lines += [f"| {k} | {v['cols']} | {v['date']} | {v['numeric']} |" for k, v in sorted(stats.items())]
    lines += [""]

    report = "\n".join(lines)
    print(report)
    out = "docs/architecture/column-type-risk-report.md"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"[OK] 报告已写入 {out}（R1={len(r1)} R2={len(r2)} R3={len(r3)}）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
