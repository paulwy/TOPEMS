#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
跨库调用标记器
==============

把服务调用拓扑（service_topology.py 产出）叠加 **物理库拆分预案** 的分组，
为每条调用边标记"拆分后同库 / 跨库"：
  - 同库：拆分后仍可走直连 SQL（低成本）
  - 跨库：拆分后必须改走服务 API / 集成事件（Saga 补偿），是拆分前置治理对象（高成本）

物理库分组来源：docs/architecture/database-split-plan.md §3 阶段 2 拆分单元映射。
服务→schema→物理库映射来源：scripts/schema_boundary.json（services）+ 拆分预案归属。

用法：
  python3 scripts/arch/mark_cross_db.py                          # 基于 design 拓扑
  python3 scripts/arch/mark_cross_db.py --input .../xxx.json     # 指定拓扑 JSON

输出（docs/architecture/service-topology/）：
  service-topology.cross-db.json     带 same_db/cross_db 标记的图（供 ECharts）
  service-topology.cross-db.html     跨库边红色高亮的图谱
  cross-db-calls.md                  跨库调用清单 + 拆分前置治理优先级
"""
import argparse
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(REPO, "docs", "architecture", "service-topology")

# ---------------------------------------------------------------------------
# 物理库分组（拆分预案 §3 阶段 2）
# ---------------------------------------------------------------------------
DB_GROUP = {
    "topems_core": {"public", "core", "iam", "shared", "doc", "flow", "notification",
                    "mail", "storage", "doc_service", "integration", "im", "rs",
                    "report", "master_data"},
    "topems_finance": {"finance", "erp"},
    "topems_manufacturing": {"mes", "pdm", "qms", "ehs", "lims"},
    "topems_supply": {"scm", "wms", "srm", "tms"},
    "topems_business": {"crm", "hrm", "pm", "bi", "portal", "mobile", "gis", "ai"},
}
SCHEMA_TO_DB = {}
for db, schemas in DB_GROUP.items():
    for s in schemas:
        SCHEMA_TO_DB[s] = db

# ---------------------------------------------------------------------------
# 服务（拓扑节点）→ 主 schema → 物理库
# ---------------------------------------------------------------------------
SERVICE_SCHEMA = {
    "erp-service": "erp", "wms-service": "wms", "finance-service": "finance",
    "hrm-service": "hrm", "crm-service": "crm", "mobile-service": "mobile",
    "srm-service": "srm", "qms-service": "qms", "pm-service": "pm",
    "ehs-service": "ehs", "portal-service": "portal", "mes-service": "mes",
    "monitor-service": "public", "iam-service": "iam", "workflow-service": "flow",
    "notification-service": "notification", "unified-core": "public",
    "ai-service": "ai",
    "server-erp-module": "erp", "server-crm-module": "crm",
    "server-pm-module": "pm", "server-qms-module": "qms",
    "server-finance-module": "finance", "server-srm-module": "srm",
    "server-ehs-module": "ehs",
}

# ehs 业务归属制造域，但 schema=public 当前落在 core 库（拆分时需先归位）
# 此处以拆分预案业务归属为准（ehs → manufacturing），并在备注中标注迁移项。
SPECIAL_NOTE = {
    "ehs-service": "业务归属制造域；schema=public 现落 core 库，拆分前需将 ehs 表归位到制造库",
    "server-ehs-module": "同 ehs-service：schema=public 现落 core 库，拆分前需归位",
}

DB_LABEL = {
    "topems_core": "core（平台核心库）",
    "topems_finance": "finance（财务库）",
    "topems_manufacturing": "manufacturing（制造库）",
    "topems_supply": "supply（供应链库）",
    "topems_business": "business（业务综合库）",
}


def db_of(node):
    schema = SERVICE_SCHEMA.get(node)
    if not schema:
        return "unknown"
    return SCHEMA_TO_DB.get(schema, "unknown")


def main():
    ap = argparse.ArgumentParser(description="跨库调用标记器")
    ap.add_argument("--input", default=os.path.join(OUT_DIR, "service-topology.design.json"))
    ap.add_argument("--out", default=OUT_DIR)
    args = ap.parse_args()

    with open(args.input, encoding="utf-8") as f:
        graph = json.load(f)

    nodes, links = graph["nodes"], graph["links"]
    print(f"== 载入拓扑：{len(nodes)} 节点 / {len(links)} 边 ==")

    # 节点补充 db 归属
    for n in nodes:
        n["db"] = db_of(n["id"])
        n["dbLabel"] = DB_LABEL.get(n["db"], n["db"])

    cross = 0
    same = 0
    rows = []
    for l in links:
        s, t = l["source"], l["target"]
        sdb, tdb = db_of(s), db_of(t)
        l["sourceDb"] = sdb
        l["targetDb"] = tdb
        if sdb != "unknown" and sdb == tdb:
            l["crossDb"] = False
            same += 1
        else:
            l["crossDb"] = True
            l["lineStyle"] = {"color": "#d64541", "width": 2, "type": "dashed", "curveness": 0.12}
            cross += 1
            rows.append({
                "from": s, "fromDb": sdb, "to": t, "toDb": tdb,
                "note": SPECIAL_NOTE.get(s, "") or SPECIAL_NOTE.get(t, "") or "",
            })

    rows.sort(key=lambda r: (r["fromDb"] != "unknown", r["from"]))
    print(f"== 标记结果：跨库 {cross} 条 / 同库 {same} 条 ==")

    os.makedirs(args.out, exist_ok=True)
    out_json = os.path.join(args.out, "service-topology.cross-db.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"nodes": nodes, "links": links}, f, ensure_ascii=False, indent=2)

    # 跨库清单（Markdown）
    md = ["# TopEMS 跨库调用清单（拆分预案叠加）",
          "",
          f"> 基于 `service-topology.design.json`（{len(links)} 条设计边）叠加物理库拆分预案（`database-split-plan.md` §3 阶段 2）。",
          f"> **跨库 {cross} 条 / 同库 {same} 条**。跨库边在拆分后必须改走服务 API / 集成事件（Saga 补偿），是拆分前置治理对象。",
          "",
          "## 跨库调用清单",
          "",
          "| 调用方 | 调用方物理库 | 被调用方 | 被调用方物理库 | 备注 |",
          "|---|---|---|---|---|"]
    for r in rows:
        md.append(f"| {r['from']} | {DB_LABEL.get(r['fromDb'], r['fromDb'])} | {r['to']} | "
                  f"{DB_LABEL.get(r['toDb'], r['toDb'])} | {r['note']} |")
    md += [
        "",
        "## 拆分前置治理优先级（按被调用方聚合）",
        "",
        "| 被调用方 | 跨库调用方数 | 说明 |",
        "|---|---|---|"]
    by_target = {}
    for r in rows:
        by_target.setdefault(r["to"], []).append(r["from"])
    for t, callers in sorted(by_target.items(), key=lambda kv: -len(kv[1])):
        note = SPECIAL_NOTE.get(t, "")
        md.append(f"| {t}（{DB_LABEL.get(db_of(t), db_of(t))}） | {len(callers)} | "
                  f"{', '.join(sorted(callers))}；{note or '拆分后这些调用方需改走其 API' if not note else ''} |")
    md += [
        "",
        "## 物理库分组（拆分预案）",
        "",
        "| 目标库 | 包含 schema |",
        "|---|---|"]
    for db, schemas in DB_GROUP.items():
        md.append(f"| {DB_LABEL[db]} | {', '.join(sorted(schemas))} |")
    md.append("")
    md_path = os.path.join(args.out, "cross-db-calls.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))

    print(f"  JSON: {out_json}")
    print(f"  MD  : {md_path}")
    print("\n=== 跨库调用（前 12 条）===")
    for r in rows[:12]:
        print(f"  {r['from']} ({r['fromDb']}) → {r['to']} ({r['toDb']})")


if __name__ == "__main__":
    main()
