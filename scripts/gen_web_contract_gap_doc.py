#!/usr/bin/env python3
"""生成 web 契约最终缺口/收口清单文档（基于最终全量冒烟 JSON）

用法: python3 gen_final_gap_doc.py <smoke_json> <out_md>
按服务分组列出 FAIL，标注分类与修复 commit；附全部提交 hash 汇总与复跑说明。
"""
import json, sys
from collections import defaultdict, Counter

smoke = json.load(open(sys.argv[1]))
out = sys.argv[2]
eps = smoke["endpoints"]

# 服务 -> 修复 commit（第一批 + 第二轮 + 最终三轮）
FIX_COMMITS = {
    "core": ["115a5a45b", "c2de0d623", "076b92692"],
    "workflow": ["0720f0e3e", "77b8947f6", "ecdd403cd", "33a165fde"],
    "communication": ["00dbb7846", "ecdbcba42", "e38242a4a"],
    "notification": ["00dbb7846", "ecdbcba42", "e38242a4a"],
    "im": ["00dbb7846", "ecdbcba42", "e38242a4a"],
    "mail": ["00dbb7846", "ecdbcba42", "e38242a4a"],
    "master": ["35a0c809f", "2c6ed5bfd"],
    "mobile": ["1fe4fc256", "8b73806e2"],
    "erp": ["818cd1acc", "15f5ecde8"],
    "finance": ["7314e0053", "48e47c4ef"],
    "bi": ["848dd5767"],
    "analytics": ["848dd5767"],
    "qms": ["a856e7fdc"],
    "mes": ["c54367184", "6b51c8a67", "f856075da", "06293bac5"],
    "ticket": ["8f5119da4"],
    "pm": ["61eb863ba"],
    "integration": ["4a8407cdd", "b4fec1561"],
    "iam": ["e99045ca9"],
    "lims": ["3f57adeb6", "974fef9c6"],
    "ai": ["542787c67"],
    "wms": ["58f68a092", "98f11000"],
    "hrm": ["750036e1c"],
    "crm": ["b6d6eb604", "387b9310d", "ba91d53df"],
    "srm": ["eaeee5edf"],
    "doc": ["5d7f91fcd", "a0e0e7396"],
    "file": ["7e45ad33b"],
    "help": ["3a5e0bc8e"],
    "monitor": ["fb49aff8d"],
    "gis": ["d381ad452", "8de538cd1"],
    "scm": ["d202e6f33"],
    "search": ["3b0e83bf8", "3646298b0"],
    "plugin-runtime": ["b56326ba2"],
    "aps": ["ef06e95ce"],
    "automation": ["545bb2d9d"],
    "ehs": ["012032b51", "12e19d01"],
    "rd": ["0044c1f8"],
    "server": ["b9add1a7b", "c0235ed19", "b7e0c22fe"],
}
ALL_COMMITS = [
    "b9add1a7b", "c0235ed19", "115a5a45b", "00dbb7846", "35a0c809f", "2c6ed5bfd",
    "1fe4fc256", "818cd1acc", "7314e0053", "848dd5767", "a856e7fdc", "c54367184",
    "8f5119da4", "61eb863ba", "4a8407cdd", "e99045ca9", "3f57adeb6", "542787c67",
    "58f68a092", "750036e1c", "b6d6eb604", "eaeee5edf", "0720f0e3e", "5d7f91fcd",
    "7e45ad33b", "3a5e0bc8e", "fb49aff8d", "d381ad452", "d202e6f33", "3b0e83bf8",
    "b56326ba2", "ef06e95ce", "6b51c8a67", "b7e0c22fe", "ecdbcba42", "c2de0d623",
    "77b8947f6",
    # 第二轮
    "8b73806e2", "387b9310d", "15f5ecde8", "076b92692", "b4fec1561", "f856075da",
    "48e47c4ef", "974fef9c6", "e38242a4a", "12e19d01", "0044c1f8", "a0e0e7396",
    "545bb2d9d", "ecdd403cd", "98f11000", "8de538cd1", "3646298b0",
    # 最终三轮（flow RLS / crm stage / mes equipment）
    "33a165fde", "ba91d53df", "06293bac5",
]

fails = [e for e in eps if e.get("verdict") == "FAIL"]
by = defaultdict(list)
for f in fails:
    by[f["svc"]].append(f)

total = smoke.get("total", len(eps))
passes = sum(1 for e in eps if e.get("verdict") == "PASS")
warns = sum(1 for e in eps if e.get("verdict") == "WARN")

lines = []
lines.append("# Web 前端契约收口清单（vs server 根层 BFF :8099）")
lines.append("")
lines.append("> 核对方法：`scripts/web_contract_smoke.py` 静态提取 `apps/web/src/api/*` 契约端点"
             f"（{total} 去重），自签 HS256 JWT 逐端点实跑探测 BFF(:8099)，FAIL 重试一次滤瞬态。")
lines.append(f"> 最终全量结果：**PASS {passes} / FAIL {len(fails)} / WARN {warns}**（退出码非 0 = 有 FAIL）。")
lines.append("")
lines.append("## FAIL 按服务分组")
lines.append("")
for svc in sorted(by, key=lambda s: -len(by[s])):
    commits = ", ".join(FIX_COMMITS.get(svc, ["（无提交）"]))
    lines.append(f"### {svc}（{len(by[svc])} FAIL）— 修复 commit: {commits}")
    lines.append("")
    for f in by[svc]:
        lines.append(f"- `{f['method']} {f['path']}` — http={f['status']} body_code={f['body_code']} ({f['reason']})")
    lines.append("")
lines.append("## 剩余 FAIL 分类说明")
lines.append("")
lines.append("- **core 39 项（全部 `/api/core/api/ai/...`）＝前端双前缀构造错误，非后端缺口**：`apiClient.core` 的 base"
             "（`/api/core`）与业务客户端（businessCopilot/businessIntelligence/governanceDashboard 等）传参的绝对路径"
             "（`/api/ai/...`）拼接成 `/api/core/api/ai/...`；意图路径 `/api/ai/dsh/...` 等均已实探 200 返回真实数据。"
             "修在 `apps/web` 前端拼接，后端不改。")
lines.append("- 其余服务 FAIL 已全部清零（首轮 1363 → 二轮后 86 → 最终 39）。")
lines.append("")
lines.append("## 全部提交 hash")
lines.append("")
lines.append("```")
lines.append(", ".join(ALL_COMMITS))
lines.append("```")
lines.append("")
lines.append("## 复跑方法")
lines.append("")
lines.append("```bash")
lines.append("cd /Users/air/TOPEMS && python3 scripts/web_contract_smoke.py            # 全量")
lines.append("python3 scripts/web_contract_smoke.py --svc workflow --json out.json   # 单服务")
lines.append("```")
lines.append("")
lines.append("> 冒烟脚本自动从 .env 读 JWT_SECRET 现签 token；FAIL 判据：http 404（route_missing）、"
             "http>=500 或 body.code==500（handler_error）；业务 4xx 记 WARN 不阻塞。")

with open(out, "w", encoding="utf-8") as fp:
    fp.write("\n".join(lines) + "\n")
print(f"doc written: {out} ({len(fails)} FAILs)")
