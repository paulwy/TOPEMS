#!/usr/bin/env python3
"""
V73 Phase 2: triage remaining Category C real handler endpoints.

Inputs:
  - docs/audit/p04-triage-result.json
  - service Rust source under svc/*/src
  - frontend source under apps/web/src

Outputs:
  - docs/audit/v73-real-handler-triage.json
  - docs/audit/v73-real-handler-triage.md
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import sys

ROOT = Path("/Users/xingzhai/TOPEMS")
SVC_DIR = ROOT / "svc"
FRONTEND_DIR = ROOT / "apps/web/src"
TRIAGE_JSON = ROOT / "docs/audit/p04-triage-result.json"
OUTPUT_JSON = ROOT / "docs/audit/v73-real-handler-triage.json"
OUTPUT_MD = ROOT / "docs/audit/v73-real-handler-triage.md"

sys.path.insert(0, str(ROOT / "scripts/audit"))
from analyze_compat_deadcode import (  # noqa: E402
    extract_real_handlers,
    find_compat_files,
    get_api_prefix,
    normalize_path,
    to_full_path,
)

HTTP_METHOD_TO_AXUM = {
    "GET": "get",
    "POST": "post",
    "PUT": "put",
    "PATCH": "patch",
    "DELETE": "delete",
}

SERVICE_PREFIXES = {
    "iam": "/api/core/iam",
    "workflow": "/api/core/flow",
    "flow": "/api/core/flow",
    "file": "/api/core/file",
    "doc": "/api/core/doc",
    "master": "/api/master-data",
    "master-data": "/api/master-data",
    "migration": "/api/core/migration",
    "mail": "/api/communication/mail",
    "im": "/api/communication/im",
    "notification": "/api/communication/notification",
    "search": "/api/search",
    "erp": "/api/erp",
    "finance": "/api/finance",
    "ai": "/api/ai",
    "hrm": "/api/hrm",
    "pm": "/api/pm",
    "crm": "/api/crm",
    "mes": "/api/mes",
    "pdm": "/api/pdm",
    "scm": "/api/scm",
    "wms": "/api/wms",
    "srm": "/api/srm",
    "qms": "/api/qms",
    "lims": "/api/lims",
    "ehs": "/api/ehs",
    "rd": "/api/rd",
    "bi": "/api/bi",
    "analytics": "/api/bi",
    "monitor": "/api/core/monitor",
    "portal": "/api/portal",
    "mobile": "/api/mobile",
    "gis": "/api/gis",
    "integration": "/api/integration",
    "billing": "/api/billing",
    "ticket": "/api/ticket",
    "feedback": "/api/feedback",
    "lowcode": "/api/lowcode",
    "automation": "/api/core/automation",
    "core": "/api/core",
    "unified-core": "/api/core",
    "communication": "/api/communication",
}

INTERNAL_SERVICE_TAGS = {
    "monitor",
    "unified-core",
    "flow",
    "integration",
    "ai",
    "search",
    "billing",
    "communication",
}

INTERNAL_PATH_HINTS = (
    "/admin",
    "/internal",
    "/audit",
    "/logs",
    "/metrics",
    "/monitor",
    "/alerts",
    "/thresholds",
    "/slo",
    "/plugin",
    "/sync-records",
    "/webhook",
    "/callbacks",
    "/tokens",
)


def load_category_c() -> list[dict[str, Any]]:
    with TRIAGE_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    items: list[dict[str, Any]] = []
    by_service = (
        data.get("unusedBackend", {})
        .get("categories", {})
        .get("C_crud_should_bind", {})
        .get("byService", {})
    )
    for svc, svc_data in by_service.items():
        for item in svc_data.get("items", []):
            op = item.get("operationId", "")
            # Phase 2 目标是 real handler，compat 存根单独标记，不进入三类主统计。
            item = dict(item)
            item["service"] = svc
            item["is_compat"] = "compat" in op.lower()
            items.append(item)
    return items


def service_dir_for_tag(tag: str) -> Path | None:
    candidates = [tag]
    if tag == "analytics":
        candidates.append("analytics")
    if tag == "flow":
        candidates.append("unified-core")
    if tag == "unified-core":
        candidates.append("unified-core")
    for c in candidates:
        p = SVC_DIR / c
        if p.exists():
            return p
    return None


def service_prefix_for(tag: str, svc_dir: Path | None) -> str:
    if svc_dir:
        prefix = get_api_prefix(str(svc_dir))
        if prefix:
            return prefix
    return SERVICE_PREFIXES.get(tag, f"/api/{tag}")


def build_real_handler_index() -> dict[tuple[str, str], list[dict[str, Any]]]:
    compat_files_by_svc = find_compat_files()
    index: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    for svc_path in SVC_DIR.iterdir():
        if not svc_path.is_dir():
            continue
        svc = svc_path.name
        prefix = service_prefix_for(svc, svc_path)
        compat_files = compat_files_by_svc.get(svc, [])
        for handler in extract_real_handlers(str(svc_path), compat_files):
            raw_path = handler["path"]
            full_path = normalize_path(to_full_path(raw_path, prefix))
            candidate_paths = {full_path}

            # p04_triage.mjs historically normalizes non-/api unified-core paths
            # as /api/unified-core/* unless the first segment is a known core
            # submodule. Keep that alias so legacy OpenAPI items match their
            # real handlers instead of being misclassified as missing.
            if not raw_path.startswith("/api/"):
                service_specific = prefix[4:] if prefix.startswith("/api") else prefix
                if raw_path == service_specific or raw_path.startswith(service_specific + "/"):
                    candidate_paths.add(normalize_path("/api" + raw_path))
                else:
                    candidate_paths.add(normalize_path(f"/api/{svc}{raw_path}"))

            handler_payload = {
                "function": handler["function"],
                "method": handler["method"].upper(),
                "path": full_path,
                "raw_path": raw_path,
                "source_file": f"svc/{svc}/{handler['source_file']}",
                "service": svc,
            }
            for candidate_path in candidate_paths:
                index[(handler["method"].upper(), candidate_path)].append(handler_payload)
    return index


def iter_source_files(root: Path, suffixes: tuple[str, ...]) -> list[Path]:
    results: list[Path] = []
    skip_dirs = {"node_modules", "target", "dist", "build", ".git", ".turbo"}
    for cur_root, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for name in files:
            if name.endswith(suffixes):
                results.append(Path(cur_root) / name)
    return results


def load_text_files(paths: list[Path]) -> dict[Path, str]:
    out: dict[Path, str] = {}
    for path in paths:
        try:
            out[path] = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
    return out


def route_registered(handler: dict[str, Any], service_sources: dict[Path, str]) -> dict[str, Any]:
    func = handler["function"]
    method = HTTP_METHOD_TO_AXUM.get(handler["method"], handler["method"].lower())
    exact_method_pattern = re.compile(rf"\b{re.escape(method)}\s*\(\s*{re.escape(func)}\s*\)")
    any_route_pattern = re.compile(
        rf"\b(get|post|put|patch|delete)\s*\(\s*{re.escape(func)}\s*\)"
    )
    bare_ref_pattern = re.compile(rf"\b{re.escape(func)}\b")
    raw_path = handler.get("raw_path") or handler.get("path") or ""
    full_path = handler.get("path") or raw_path

    route_path_candidates = {raw_path}
    if full_path.startswith("/api/"):
        parts = full_path.split("/")
        if len(parts) > 3:
            route_path_candidates.add("/" + "/".join(parts[3:]))
    route_path_candidates = {p for p in route_path_candidates if p}

    evidence: list[dict[str, Any]] = []
    bare_refs = 0
    for path, text in service_sources.items():
        rel = str(path.relative_to(ROOT))
        lines = text.splitlines()
        for lineno, line in enumerate(lines, 1):
            if exact_method_pattern.search(line):
                evidence.append({"file": rel, "line": lineno, "kind": "exact_method", "snippet": line.strip()})
                return {"registered": True, "confidence": "high", "evidence": evidence}
            for route_path in route_path_candidates:
                if (
                    f'.route("{route_path}"' in line
                    and re.search(rf"\b{re.escape(method)}\s*\(", line)
                ):
                    evidence.append(
                        {
                            "file": rel,
                            "line": lineno,
                            "kind": "route_path_method",
                            "snippet": line.strip(),
                        }
                    )
                    return {"registered": True, "confidence": "high", "evidence": evidence}
            if any_route_pattern.search(line):
                evidence.append({"file": rel, "line": lineno, "kind": "route_method", "snippet": line.strip()})
            if bare_ref_pattern.search(line):
                if not re.search(rf"\bfn\s+{re.escape(func)}\b", line):
                    bare_refs += 1
                    if len(evidence) < 3:
                        evidence.append({"file": rel, "line": lineno, "kind": "bare_ref", "snippet": line.strip()})
    if evidence:
        return {"registered": True, "confidence": "medium", "evidence": evidence[:3]}
    return {"registered": False, "confidence": "high", "evidence": [], "bare_refs": bare_refs}


def path_to_tail(path: str, service: str) -> str:
    prefix = SERVICE_PREFIXES.get(service) or SERVICE_PREFIXES.get(service.replace("unified-core", "core"))
    if prefix and path.startswith(prefix):
        tail = path[len(prefix) :]
        return tail or "/"
    parts = path.split("/")
    return "/" + "/".join(parts[3:]) if len(parts) > 3 else path


def static_fragments(path: str) -> list[str]:
    parts = [p for p in path.split("/") if p and p != "{param}"]
    fragments: list[str] = []
    if len(parts) >= 2:
        for i in range(len(parts) - 1):
            frag = "/" + "/".join(parts[i : i + 2])
            if len(frag) >= 8:
                fragments.append(frag)
    if parts:
        fragments.append("/" + "/".join(parts))
    return sorted(set(fragments), key=len, reverse=True)


def frontend_evidence(item: dict[str, Any], frontend_sources: dict[Path, str]) -> dict[str, Any]:
    path = item["normalizedPath"]
    service = item["service"]
    method = item["method"].lower()
    tail = path_to_tail(path, service)
    service_aliases = {
        "analytics": {"analytics", "bi"},
        "unified-core": {"core", "iam", "doc", "file", "flow", "monitor"},
        "flow": {"flow", "workflow"},
        "communication": {"email", "mail", "im", "notification"},
    }.get(service, {service})

    exact_candidates = [
        path,
        tail,
        path.replace("{param}", "${"),
        tail.replace("{param}", "${"),
    ]
    exact_candidates = [
        c for c in dict.fromkeys(exact_candidates) if c and c != "/" and len(c) >= 5
    ]

    weak_candidates = [
        c
        for c in dict.fromkeys(static_fragments(tail) + static_fragments(path))
        if c and c != "/" and len(c) >= 9
    ]

    def candidate_matches(text: str, candidate: str) -> bool:
        start = 0
        while True:
            idx = text.find(candidate, start)
            if idx == -1:
                return False
            if idx > 0:
                before = text[idx - 1]
                if before not in {"'", '"', "`", "(", " ", "\t"}:
                    start = idx + 1
                    continue
            after_idx = idx + len(candidate)
            if candidate.endswith("${"):
                closing = text.find("}", after_idx)
                if closing == -1:
                    start = after_idx
                    continue
                after_idx = closing + 1
                if after_idx >= len(text):
                    return True
                after = text[after_idx]
                if after == "/":
                    start = after_idx
                    continue
                if after in {"?", "'", '"', "`", ")", "}", ";", ","} or after.isspace():
                    return True
                start = after_idx
                continue
            if after_idx >= len(text):
                return True
            after = text[after_idx]
            # Collection paths must not match detail/action subpaths.
            if after == "/":
                start = after_idx
                continue
            if after in {"?", "'", '"', "`", ")", "}", ";", ","} or after.isspace():
                return True
            start = after_idx

    strong: list[dict[str, Any]] = []
    weak: list[dict[str, Any]] = []
    exact_method_call_pattern = re.compile(
        rf"(apiClient\.\w+\.{re.escape(method)}\b|"
        rf"\b(fetch|axios|httpClient|request|api|client)\.{re.escape(method)}\b|"
        rf"\.{re.escape(method)}\s*\()",
        re.IGNORECASE,
    )
    any_api_client_method_pattern = re.compile(
        r"apiClient\.\w+\.(get|post|put|patch|delete)\b", re.IGNORECASE
    )

    for file, text in frontend_sources.items():
        rel = str(file.relative_to(ROOT))
        if "/__tests__/" in rel or ".test." in rel or ".spec." in rel:
            continue
        lines = text.splitlines()
        for lineno, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*"):
                continue
            in_service_api_dir = any(
                rel.startswith(f"apps/web/src/api/{alias}/") or rel == f"apps/web/src/api/{alias}.ts"
                for alias in service_aliases
            )

            for candidate in exact_candidates:
                if candidate_matches(line, candidate):
                    evidence = {
                        "file": rel,
                        "line": lineno,
                        "candidate": candidate,
                        "snippet": line.strip()[:240],
                    }
                    context = "\n".join(lines[max(0, lineno - 4) : min(len(lines), lineno + 2)])
                    method_matches = bool(exact_method_call_pattern.search(context))
                    has_other_api_method = bool(any_api_client_method_pattern.search(context)) and not method_matches
                    if method_matches and (path in context or in_service_api_dir):
                        strong.append(evidence)
                    elif in_service_api_dir and not has_other_api_method and path in context:
                        strong.append(evidence)
                    else:
                        weak.append(evidence)
                    break
            if len(strong) >= 3:
                return {"level": "strong", "evidence": strong[:3]}
        if len(strong) >= 3:
            break

    if strong:
        return {"level": "strong", "evidence": strong[:3]}
    # Weak evidence is kept for manual context only. It is intentionally not
    # enough to classify an endpoint as a probe false positive.
    for file, text in frontend_sources.items():
        rel = str(file.relative_to(ROOT))
        if "/__tests__/" in rel or ".test." in rel or ".spec." in rel:
            continue
        lines = text.splitlines()
        for lineno, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*"):
                continue
            for candidate in weak_candidates:
                if candidate_matches(line, candidate):
                    weak.append(
                        {
                            "file": rel,
                            "line": lineno,
                            "candidate": candidate,
                            "snippet": line.strip()[:240],
                        }
                    )
                    break
            if len(weak) >= 3:
                break
        if len(weak) >= 3:
            break
    if weak:
        return {"level": "weak", "evidence": weak[:3]}
    return {"level": "none", "evidence": []}


def classify(item: dict[str, Any], handlers: list[dict[str, Any]], route_info: dict[str, Any], fe_info: dict[str, Any]) -> tuple[str, str]:
    path = item["normalizedPath"]
    service = item["service"]
    op_id = item.get("operationId", "")

    if item.get("is_compat"):
        return "compat_residual", "残留 compat 存根，不属于 real handler Phase 2 主统计"

    if not handlers:
        return "true_dead_code", "OpenAPI 中存在但未能匹配 real handler 定义，疑似文档/提取残留"

    if not route_info.get("registered"):
        return "true_dead_code", "找到 handler 定义但未发现 axum route 注册证据，运行期不可达"

    if fe_info["level"] == "strong":
        return "probe_false_positive", "前端存在同路径强引用，但当前 P-04 探针未识别该调用形态"

    if service in INTERNAL_SERVICE_TAGS or any(h in path for h in INTERNAL_PATH_HINTS):
        return "to_bind", "运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池"

    if re.search(r"^(list|get|create|update|delete|batch|export|import|approve|reject|submit)_", op_id):
        return "to_bind", "业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定"

    return "to_bind", "已注册 real handler，但未发现前端调用证据"


def main() -> None:
    category_c_items = load_category_c()
    real_items = [i for i in category_c_items if not i.get("is_compat")]
    compat_residual = [i for i in category_c_items if i.get("is_compat")]

    handler_index = build_real_handler_index()
    frontend_sources = load_text_files(iter_source_files(FRONTEND_DIR, (".ts", ".tsx")))

    service_source_cache: dict[str, dict[Path, str]] = {}
    categories: dict[str, list[dict[str, Any]]] = defaultdict(list)
    per_service: dict[str, Counter] = defaultdict(Counter)

    for item in real_items:
        method = item["method"].upper()
        norm_path = normalize_path(item["normalizedPath"])
        service = item["service"]
        handlers = handler_index.get((method, norm_path), [])

        if service not in service_source_cache:
            svc_dir = service_dir_for_tag(service)
            service_source_cache[service] = (
                load_text_files(iter_source_files(svc_dir / "src", (".rs",))) if svc_dir else {}
            )

        if handlers:
            route_info = route_registered(handlers[0], service_source_cache[service])
        else:
            route_info = {"registered": False, "confidence": "high", "evidence": []}
        fe_info = frontend_evidence(item, frontend_sources)
        category, reason = classify(item, handlers, route_info, fe_info)

        enriched = {
            "service": service,
            "operationId": item.get("operationId"),
            "method": method,
            "path": item.get("path"),
            "normalizedPath": norm_path,
            "tag": item.get("tag"),
            "note": item.get("note"),
            "classification": category,
            "reason": reason,
            "handlers": handlers,
            "route": route_info,
            "frontend": fe_info,
        }
        categories[category].append(enriched)
        per_service[service][category] += 1

    for item in compat_residual:
        categories["compat_residual"].append(item)
        per_service[item["service"]]["compat_residual"] += 1

    output = {
        "summary": {
            "category_c_total": len(category_c_items),
            "real_handler_total": len(real_items),
            "compat_residual_total": len(compat_residual),
            "true_dead_code": len(categories["true_dead_code"]),
            "to_bind": len(categories["to_bind"]),
            "probe_false_positive": len(categories["probe_false_positive"]),
            "compat_residual": len(categories["compat_residual"]),
        },
        "perService": {
            svc: dict(counter)
            for svc, counter in sorted(per_service.items(), key=lambda kv: (-sum(kv[1].values()), kv[0]))
        },
        "categories": {k: v for k, v in categories.items()},
    }

    OUTPUT_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    write_markdown(output)
    print(json.dumps(output["summary"], ensure_ascii=False, indent=2))
    print(f"JSON: {OUTPUT_JSON}")
    print(f"Markdown: {OUTPUT_MD}")


def write_markdown(output: dict[str, Any]) -> None:
    summary = output["summary"]
    lines: list[str] = []
    lines.append("# V73 Real Handler Triage Report")
    lines.append("")
    lines.append("## 摘要")
    lines.append("")
    lines.append("| 分类 | 数量 | 说明 |")
    lines.append("|------|------|------|")
    lines.append(f"| 真正死代码 | {summary['true_dead_code']} | handler 未注册路由或 OpenAPI 残留，运行期不可达 |")
    lines.append(f"| 待绑定端点 | {summary['to_bind']} | real handler 已注册，但前端未发现调用证据 |")
    lines.append(f"| 探针限制误报 | {summary['probe_false_positive']} | 前端存在同路径引用，但当前探针未识别 |")
    lines.append(f"| compat 残留 | {summary['compat_residual']} | 不纳入 real handler 主统计 |")
    lines.append("")
    lines.append("## 按服务统计")
    lines.append("")
    lines.append("| 服务 | 真正死代码 | 待绑定 | 探针误报 | compat 残留 | 合计 |")
    lines.append("|------|-----------|--------|----------|-------------|------|")
    for svc, counts in output["perService"].items():
        total = sum(counts.values())
        lines.append(
            f"| {svc} | {counts.get('true_dead_code', 0)} | {counts.get('to_bind', 0)} | "
            f"{counts.get('probe_false_positive', 0)} | {counts.get('compat_residual', 0)} | {total} |"
        )
    lines.append("")

    for key, title in [
        ("true_dead_code", "真正死代码"),
        ("probe_false_positive", "探针限制误报"),
        ("to_bind", "待绑定端点"),
        ("compat_residual", "compat 残留"),
    ]:
        items = output["categories"].get(key, [])
        lines.append(f"## {title}")
        lines.append("")
        lines.append(f"数量：{len(items)}")
        lines.append("")
        lines.append("| 服务 | 方法 | 路径 | operationId | 依据 |")
        lines.append("|------|------|------|-------------|------|")
        for item in items:
            if key == "compat_residual":
                lines.append(
                    f"| {item.get('service')} | {item.get('method')} | {item.get('normalizedPath')} | "
                    f"{item.get('operationId')} | 残留 compat 存根 |"
                )
                continue
            evidence = item.get("reason", "")
            if item.get("route", {}).get("evidence"):
                ev = item["route"]["evidence"][0]
                evidence += f"；路由证据 `{ev['file']}`"
            if item.get("frontend", {}).get("evidence"):
                ev = item["frontend"]["evidence"][0]
                evidence += f"；前端证据 `{ev['file']}`"
            lines.append(
                f"| {item.get('service')} | {item.get('method')} | {item.get('normalizedPath')} | "
                f"{item.get('operationId')} | {evidence} |"
            )
        lines.append("")

    OUTPUT_MD.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
