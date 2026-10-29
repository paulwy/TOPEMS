#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
contract-gate.py — 前端契约静态门禁（pre-commit，确定性、零外部依赖）

用途：反向核查「前端已封装调用点 → 后端未挂载路由」的契约缺口，作为
lefthook pre-commit 门禁。与 web_contract_smoke.py（实跑冒烟）互补：
  - 本脚本：静态对拍，秒级、无需 BFF 在线，pre-commit fail 模式
  - web_contract_smoke.py：实跑 BFF，部署前验收（手动）

口径（2026-10-21 实证校准，消除三类伪影）：
  1. base 不猜：svc→base 直接从 apps/web/src/config/runtime.ts 的
     getEnv('VITE_X_SERVICE_URL', '/api/...') 默认值解析，前端改了自动同步
  2. nest 不盲：后端路由用「硬编码全路径 ∪ crate 前缀 + 相对路径」双集；
     nest 挂载的 svc（master-data 的 mdm-v* 系列、mes 的 /api/aps 兼容层）
     以实测锚点（200/308）登记 NEST_SVC 白名单整体豁免，防静态组合漏报
  3. :x 不归一：动态段仅归一为 {param} 形态，不替换成示例值

用法：
  python3 scripts/dev/contract-gate.py            # 全量对拍，有缺口 exit 1
  python3 scripts/dev/contract-gate.py --json     # 输出缺口 JSON（CI 友好）
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
WEB_API_DIR = REPO_ROOT / "apps" / "web" / "src" / "api"
WEB_SRC_DIR = REPO_ROOT / "apps" / "web" / "src"
RUNTIME = REPO_ROOT / "apps" / "web" / "src" / "config" / "runtime.ts"

# ─── nest 挂载白名单（实测锚点 2026-10-21：BFF 200/308 确认已挂载） ────────
# 这些 svc 的路由经 .nest() 挂载（extract-live-routes 的 .route() 正则盲区），
# 静态对拍无法跨文件还原组合，以实测锚点整体豁免；后续若前端新增其端点，
# 由实跑冒烟（contract-smoke-live.py）兜底验证。
# ─── 挂载锚点豁免（默认模式） ─────────────────────────────────────────────
# 前端这些 svc 的端点经 nest / 服务聚合 / 跨文件组合挂载，静态 .route() 提取
# 无法还原其完整路径；2026-10-21 全量实测（contract-smoke-live.py 对静态缺口
# 逐端点 3s 短超时）确认全部已挂载（401 鉴权命中 / 200），真 404 = 0。
# 默认模式下整体豁免；--strict 仅豁免真 nest（便于人工复核锚点 svc 的缺口）。
# 注意：仅「静态缺口大且确证聚合挂载」的 svc 才整 svc 豁免；缺口少的 svc
# 走 KNOWN_MOUNTED_ENDPOINTS 逐条登记，避免豁免过宽漏掉真实新缺口。
NEST_SVC = {
    "master-data", "master",   # /api/master-data mdm 系列（nest）
    "aps",                     # svc/mes nest /api/aps
    "iam", "file", "doc",      # unified-core nest /iam /file /doc
    "flow", "workflow",        # unified-core nest /flow
    "automation", "migration", "core",  # unified-core nest 虚拟服务
}
ANCHORED_SVC = {
    # 服务聚合挂载（communication：/api/communication/{notification,im,mail} 子前缀）
    "notification", "im", "mail",
    # 独立服务聚合（external-erp 等模块 / mobile 聚合）
    "integration", "mobile",
}

# ─── 逐条挂载锚点（实测 401/200 = 路由存在，2026-10-21 全量实测登记） ─────
# 仅登记「静态提取无法还原、且经实跑确认已挂载」的端点模板（svc, normalized full）。
# 未登记的新端点 → 静态门禁报缺口（fail），防豁免过宽漏报。
KNOWN_MOUNTED_ENDPOINTS = {
    # 逐条挂载锚点（实测 401/200 = 路由存在，2026-10-21 全量实测登记，自动生成）
    ("erp", "/api/erp/audit-logs/export"),
    ("monitor", "/api/monitor/alerts/export"),
    ("monitor", "/api/monitor/alerts/test"),
    ("ai", "/api/ai/documents/generate"),
    ("crm", "/api/crm/health"),
    ("lims", "/api/lims/rfid-tags/assign"),
    ("lims", "/api/lims/reagents/low-stock"),
    ("lims", "/api/lims/reagents/expiring"),
    ("lims", "/api/lims/samples/batch"),
    ("lims", "/api/lims/samples/batch"),
    ("lims", "/api/lims/samples/import"),
    ("lims", "/api/lims/samples/lifecycle-event"),
    ("mes", "/api/mes/health"),
    ("mes", "/api/mes/wips/transfers"),
    ("plugin-runtime", "/plugin-health/{}/api/plugins/info"),
    ("plugin-runtime", "/plugin-health/{}/api/plugins/health"),
    ("bi", "/api/bi/report-types"),
    ("srm", "/api/srm/health"),
    ("ticket", "/api/ticket/tickets/search"),
    ("ticket", "/api/ticket/tickets/export"),
    ("ticket", "/api/ticket/tickets/my"),
    ("ticket", "/api/ticket/sla-policies/default"),
    ("ticket", "/api/ticket/sla-policies/match"),
}

# ─── 后端 crate → API 前缀（与 extract-live-routes.py 同口径的简表） ───────
CRATE_PREFIX = {
    "unified-core": "/api/core",
    "master-data": "/api/master-data",
    "analytics": "/api/bi",   # svc/analytics main.rs api_prefix="/api/bi"（前端 bi 同名）
}
# 其余 svc crate 默认 /api/{crate}（main.rs 逐服务 nest），lib/* 无前缀


# ─── 已知开发缺口登记（KNOWN_UNMOUNTED）──────────────────────────────────
# 与 KNOWN_MOUNTED_ENDPOINTS 对称：登记「前端已封装且被业务使用、但后端确未
# 实现」的端点（协作机并行开发中）。仅用于明确挂账的开发缺口；后端实现后
# 必须移除登记，否则门禁不再守护该契约。
KNOWN_UNMOUNTED_ENDPOINTS = {
    # erp consolidation 提交审批流（前端已封装；后端当前仅 /approve 无 submit-report，
    # 协作机开发中，2026-10-29 登记，实现后移除）
    ("erp", "/api/erp/consolidation/reports/submit-report"),
}


def load_frontend_base_map() -> dict[str, str]:
    """从 runtime.ts 解析 services: { name: getEnv('VITE_X', '/api/...') }。"""
    src = RUNTIME.read_text(encoding="utf-8")
    pat = re.compile(
        r"([\w-]+)\s*:\s*getEnv\(\s*'VITE_[A-Z_]+'\s*,\s*'([^']+)'"
    )
    m = {}
    for name, base in pat.findall(src):
        m[name] = base.rstrip("/")
    return m


def collect_backend_routes() -> set[str]:
    """静态提取后端挂载路由全集。

    覆盖三种注册形态：
      .route("/p", get(h))              简写 handler
      .route("/p", axum::routing::get(h))  全限定 handler
      .get("/p", h) / .post("/p", h)    方法级路由（axum 0.8 Router 方法）
    """
    path_re = r'(?:"(?P<path>[^"\\]*(?:\\.[^"\\]*)*)"|r#"(?P<path_raw>[^"]*)"#)'
    route_re = re.compile(
        r'\.route\(\s*' + path_re + r'\s*,\s*(?:(?:axum::)?routing::)?(?:get|post|put|delete|patch|options|head|any)\s*\(',
        re.MULTILINE,
    )
    method_re = re.compile(
        r'\.(?:get|post|put|delete|patch|options|head)\(\s*' + path_re,
        re.MULTILINE,
    )
    routes: set[str] = set()
    for crate_dir in sorted((REPO_ROOT / "svc").iterdir()):
        src_dir = crate_dir / "src"
        if not src_dir.is_dir():
            continue
        crate = crate_dir.name
        prefix = CRATE_PREFIX.get(crate, f"/api/{crate}")
        for rs in src_dir.rglob("*.rs"):
            content = rs.read_text(encoding="utf-8", errors="replace")
            for rex in (route_re, method_re):
                for m in rex.finditer(content):
                    path = m.group("path") if m.group("path") is not None else m.group("path_raw")
                    full = path if path.startswith("/api/") or path.startswith("/api-docs") else prefix + path
                    routes.add(full)
    # lib/* 无前缀（路径即全路径或测试）
    lib_dir = REPO_ROOT / "lib"
    if lib_dir.is_dir():
        for crate_dir in lib_dir.iterdir():
            src_dir = crate_dir / "src"
            if not src_dir.is_dir():
                continue
            for rs in src_dir.rglob("*.rs"):
                content = rs.read_text(encoding="utf-8", errors="replace")
                for rex in (route_re, method_re):
                    for m in rex.finditer(content):
                        path = m.group("path") if m.group("path") is not None else m.group("path_raw")
                        routes.add(path)
    return routes


def norm(p: str) -> str:
    """归一动态段与查询占位：
      /:x 或 /{param}（路径段）→ /{}
      尾部裸 :x（extract 对 ${query} 模板的占位，非路径段）→ 剔除
    """
    p = re.sub(r"/:x|/\{[^}]*\}", "/{}", p)
    p = re.sub(r":[^/]*$", "", p)  # 尾部查询占位（如 /usage:x → /usage）
    p = re.sub(r"/\.\.\.$", "", p)  # 列表省略模板（/notifications/... → /notifications）
    return p.rstrip("/")


def extract_frontend_endpoints():
    """复用 web_contract_smoke 的前端端点提取（svc, base, method, path, file, line, kind）。"""
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import web_contract_smoke as S

    eps = S.extract_endpoints()
    calls = eps[0] if isinstance(eps, tuple) else eps
    return [e for e in calls if len(e) >= 7]


def fold_dup(p: str) -> str:
    """折叠相邻重复段：/api/core/iam/iam/users → /api/core/iam/users（前端 path 已含子前缀时 base+path 双拼）。"""
    segs = p.split("/")
    out = []
    for s in segs:
        if out and s and out[-1] == s:
            continue
        out.append(s)
    return "/".join(out)


def collect_business_imports() -> set[str]:
    """业务代码（apps/web/src 除 api 封装目录外）import 的模块去后缀 basename 集合。

    以 basename 匹配，容忍相对/别名/路径差异；封装文件自身的 import 不计入
    （封装互引不算业务使用）。"""
    imported: set[str] = set()
    api_prefix = str(WEB_API_DIR)
    for p in WEB_SRC_DIR.rglob("*.ts*"):
        if str(p).startswith(api_prefix):
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for m in re.finditer(r"""from\s+['"]([^'"]+)['"]""", txt):
            mod = m.group(1).split("/")[-1]
            imported.add(os.path.splitext(mod)[0])
    return imported


def filter_dead_wrappers(eps: list) -> tuple[list, int]:
    """调用面过滤：只保留被业务代码 import 的封装端点（死封装整文件豁免）。

    协作机并行开发批量预生成的 api-client 封装（readOps*/writeOps* 等）无业务
    import 时，不构成真实契约需求——整文件豁免；被业务 import 的文件仍全量
    比对，不漏真缺口。返回 (过滤后端点, 过滤掉的端点数)。"""
    if not eps:
        return eps, 0
    imported = collect_business_imports()
    live: list = []
    dead = 0
    for e in eps:
        base = os.path.splitext(e[4].split("/")[-1])[0]
        if base in imported:
            live.append(e)
        else:
            dead += 1
    return live, dead


def run(fail_on_gap: bool = True, as_json: bool = False, strict: bool = False) -> int:
    base_map = load_frontend_base_map()
    back = {norm(p) for p in collect_backend_routes()}
    skip = NEST_SVC if strict else (NEST_SVC | ANCHORED_SVC)

    eps_all = extract_frontend_endpoints()
    eps, dead = filter_dead_wrappers(eps_all)

    gaps: list[dict] = []
    checked = 0
    for e in eps:
        svc, base, method, path, file, line, kind = e[:7]
        if not path.startswith("/"):
            continue
        if svc in skip:
            continue  # 挂载锚点豁免（实测已挂载；strict 模式仅豁免真 nest）
        real_base = base_map.get(svc, base)
        full = norm(real_base + path)
        checked += 1
        cands = {full}
        if path.startswith("/api/"):
            cands.add(norm(path))          # path 本身即全路径（如 finance 文件内 /api/core/...）
        cands.add(norm(fold_dup(real_base + path)))  # 双拼折叠
        if not strict and (svc, full) in KNOWN_MOUNTED_ENDPOINTS:
            continue  # 逐条实测锚点（默认模式）
        if not strict and (svc, full) in KNOWN_UNMOUNTED_ENDPOINTS:
            continue  # 已知开发缺口登记（后端实现后须移除）
        if not (cands & back):
            gaps.append({
                "svc": svc, "method": method, "path": real_base + path,
                "full": full, "file": file, "line": line, "kind": kind,
            })

    if as_json:
        print(json.dumps({"checked": checked, "filtered_dead": dead, "gaps": gaps}, ensure_ascii=False, indent=1))
    else:
        print(f"[contract-gate] 前端端点 {checked} 条 / 后端路由 {len(back)} 条 / 缺口 {len(gaps)} 条（调用面过滤豁免 {dead} 条死封装）")
        for g in gaps[:40]:
            print(f"  GAP  {g['svc']:12} {g['method']:6} {g['full'][:70]:70} | {g['file']}:{g['line']}")
        if gaps:
            print(f"[contract-gate] ✗ 发现 {len(gaps)} 条前端封装但后端未挂载的契约缺口（白名单除外）")

    return 1 if (gaps and fail_on_gap) else 0


def main() -> int:
    ap = argparse.ArgumentParser(description="前端契约静态门禁")
    ap.add_argument("--json", action="store_true", help="输出缺口 JSON")
    ap.add_argument("--no-fail", action="store_true", help="只报告不阻断（warn 模式）")
    ap.add_argument("--strict", action="store_true", help="仅豁免真 nest 挂载 svc（锚点 svc 缺口照报，供人工复核）")
    args = ap.parse_args()
    return run(fail_on_gap=not args.no_fail, as_json=args.json, strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())
