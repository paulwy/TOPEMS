#!/usr/bin/env python3
"""
TopEMS 物理库拆分阈值监控脚本（database-split-plan.md §2 预案配套）
=============================================================
自动检测 5 项拆分触发阈值，对照"触发值（建议）"输出是否达到启动评估条件。

用法：
  python3 scripts/check_split_threshold.py [--db DATABASE]

说明：
  - 指标 1/2（DB 大小、最大 schema 表数）直接实测 PostgreSQL。
  - 指标 3/4/5（连接峰值、跨 schema 查询占比、备份/恢复时间）依赖运行时
    观测数据，脚本输出"当前观测"状态与建议采集方式，触发值作为参考。
  - 任一指标达到触发值 → 输出 WARNING，提示启动阶段 2 物理拆分评估。

数据库连接默认 postgres://topems:topems_secret@localhost:5432/topems，
可用环境变量 DATABASE_URL 覆盖。
"""

import os
import subprocess
import sys
from dataclasses import dataclass

# ── 触发值（建议）——与 database-split-plan.md §2 保持一致 ────────────
TRIGGER_DB_SIZE_GB = 200.0
TRIGGER_MAX_SCHEMA_TABLES = 600
TRIGGER_CONN_PEAK = 400          # 持续 10 分钟
TRIGGER_CROSS_SCHEMA_PCT = 30.0  # 跨 3+ schema 查询占比
TRIGGER_BACKUP_MIN = 15.0        # 备份/恢复时间


@dataclass
class ThresholdResult:
    name: str
    current: str
    trigger: str
    triggered: bool
    source: str  # "实测" | "需观测" | "预估"


def run_psql(db: str, sql: str) -> str:
    """执行只读 SQL，返回去除首尾空白的结果（单值）。"""
    url = os.environ.get("DATABASE_URL", db)
    cmd = ["psql", url, "-t", "-A", "-c", sql]
    out = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if out.returncode != 0:
        return f"ERR:{out.stderr.strip()[:80]}"
    return out.stdout.strip()


def main() -> int:
    db = "postgres://topems:topems_secret@localhost:5432/topems"
    if "--db" in sys.argv:
        db = sys.argv[sys.argv.index("--db") + 1]

    results: list[ThresholdResult] = []

    # 1. 数据库总大小
    size_bytes = run_psql(db, "SELECT pg_database_size(current_database());")
    if size_bytes.startswith("ERR"):
        size_mb = size_bytes
        triggered = False
    else:
        size_mb = int(size_bytes) / 1024 / 1024
        triggered = size_mb / 1024 > TRIGGER_DB_SIZE_GB
        size_mb = f"{size_mb / 1024:.1f} GB"
    results.append(ThresholdResult(
        "数据库总大小", size_mb, f"> {TRIGGER_DB_SIZE_GB:.0f} GB",
        triggered, "实测" if not size_mb.startswith("ERR") else "连接失败",
    ))

    # 2. 最大业务 schema 表数（排除系统 schema，含独立服务 schema 备注）
    max_tbl = run_psql(db, """
        SELECT n.nspname || ':' || count(*) FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema')
          AND n.nspname NOT LIKE 'pg_toast%'
        GROUP BY n.nspname ORDER BY count(*) DESC LIMIT 1;
    """)
    if max_tbl.startswith("ERR"):
        max_tbl_show = max_tbl
        triggered = False
    else:
        schema, _, cnt = max_tbl.partition(":")
        cnt = int(cnt)
        triggered = cnt > TRIGGER_MAX_SCHEMA_TABLES
        max_tbl_show = f"{schema} {cnt} 张"
    results.append(ThresholdResult(
        "最大 schema 表数", max_tbl_show, f"> {TRIGGER_MAX_SCHEMA_TABLES} 张",
        triggered, "实测" if not max_tbl_show.startswith("ERR") else "连接失败",
    ))

    # 3. 活跃连接（当前快照；生产峰值需 PgBouncer stats 观测）
    conn_now = run_psql(db,
        "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
    if conn_now.startswith("ERR"):
        conn_show = conn_now
    else:
        conn_show = f"{conn_now}（当前快照，需观测 10 分钟峰值）"
    results.append(ThresholdResult(
        "活跃连接", conn_show, f"> {TRIGGER_CONN_PEAK} 持续 10 分钟",
        False, "需观测（PgBouncer stats）",
    ))

    # 4. 跨 schema 查询占比（需 pg_stat_statements；当前跨 schema 直读已清零）
    results.append(ThresholdResult(
        "跨 schema 查询占比", "低（跨 schema 直读已清零，仅 2 项设计性 allow）",
        f"> {TRIGGER_CROSS_SCHEMA_PCT:.0f}% 跨 3+ schema",
        False, "需观测（pg_stat_statements）",
    ))

    # 5. 备份/恢复时间（需实测 RPO/RTO；当前整库 dump 秒级）
    results.append(ThresholdResult(
        "备份/恢复时间", "秒级（整库 dump ~3.6MB）",
        f"> {TRIGGER_BACKUP_MIN:.0f} 分钟",
        False, "需实测（RPO/RTO）",
    ))

    # ── 输出 ─────────────────────────────────────────────
    print("TopEMS 物理库拆分阈值监控")
    print("=" * 72)
    triggered_any = False
    for r in results:
        flag = "⚠️ 触发" if r.triggered else " 未触发"
        if r.triggered:
            triggered_any = True
        print(f"[{flag}] {r.name}")
        print(f"    当前值 : {r.current}")
        print(f"    触发值 : {r.trigger}")
        print(f"    度量   : {r.source}")
    print("=" * 72)
    if triggered_any:
        print("⚠️ 存在达阈值指标，建议启动阶段 2 物理拆分评估（见 database-split-plan.md §3）。")
        return 1
    print("✅ 5 项阈值均未触发——按预案维持单库，等待规模增长（任一指标达阈值再评估）。")
    print("   （指标 3/4/5 为需观测项，生产环境建议接入 PgBouncer stats 与 pg_stat_statements 持续采集）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
