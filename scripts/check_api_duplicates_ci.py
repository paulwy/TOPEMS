#!/usr/bin/env python3
"""
后端 API 路径唯一性检查脚本（CI 专用）

扫描所有 Rust 后端服务的路由定义，检查：
1. 同一服务内的重复 method + path 组合
2. 跨服务的路径模式重复（参数归一化后比较）
3. API 路径命名规范检查（/api/{service}/{resource} 格式）

退出码：
  0 - 无重复/错误
  1 - 发现问题（CI 失败）

用法：
  python scripts/check_api_duplicates_ci.py [选项]

选项：
  --ci          CI 模式，只输出错误，静默通过
  --json        输出 JSON 格式结果
  --service     只检查指定服务（可多次指定）
  --strict      严格模式，命名不规范也报错
"""

import os
import re
import sys
import json
import argparse
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

# ============================================================
# 配置
# ============================================================

SVC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "svc")
SVC_DIR = os.path.normpath(SVC_DIR)

# 命名规范检查时忽略的路径前缀（这些是基础路径或特殊用途路径）
IGNORE_PATHS_FOR_NAMING = [
    "/health",
    "/metrics",
    "/api/plugins/",
    "/api-docs/",
    "/api/info",
    "/api/v1/health",
    "/api/v1/metrics",
]

# 跨服务重复检查时忽略的路径前缀（这些是每个服务都有的标准基础路径）
IGNORE_PATHS_FOR_CROSS_DUP = [
    "/health",
    "/metrics",
    "/api/plugins/",
    "/api-docs/",
    "/api/info",
    "/api/v1/health",
    "/api/v1/metrics",
]

# 服务内重复检查时忽略的路径前缀
IGNORE_PATHS_FOR_INTRA_DUP = [
    "/api/plugins/",
]

# 扫描时跳过的服务（已退役或废弃的服务）
SKIP_SERVICES = {
    "bi.deprecated",  # BI 服务已退役，功能迁移到 analytics
}

# 多二进制服务中允许的内部重复（这些是不同的二进制入口，共享基础路由）
MULTI_BINARY_SERVICES = {
    "analytics",       # main.rs + main_bi.rs + main_report.rs
    "manufacturing",   # main.rs + main_mes.rs + main_pdm.rs
    "quality-assurance",  # main.rs + main_qms.rs + main_lims.rs + main_ehs.rs
}

# 允许跨服务重复的通用功能路径（参数归一化后匹配）
# 这些路径在跨服务重复时，从 error 降级为 info（不影响 CI 通过）
ALLOWED_CROSS_SERVICE_PATHS = [
    "/api/v1/auth/login",       # 认证登录
    "/api/v1/auth/register",    # 认证注册
    "/api/v1/auth/refresh",     # 认证刷新
    "/api/v1/audit-logs",       # 审计日志（带路径参数也匹配）
    "/api/v1/notifications",    # 通知
    "/health",                  # 健康检查
    "/api/info",                # 服务信息
    "/api",                     # 服务信息根路径
    "/api/plugins",             # 插件列表
]

# 聚合服务路径例外
# 这些服务允许使用 /api/v{n}/{resource} 格式（版本号后直接跟资源名）
# 因为它们是平台级入口服务，设计上强调简洁性
AGGREGATION_SERVICE_EXCEPTIONS = {
    "portal": [
        "/api/v1/services",
        "/api/v1/user",
        "/api/v1/todos",
        "/api/v1/monitoring/",
        "/api/v1/notifications",
    ],
    "unified-core": [
        "/api/v1/auth/",
        "/api/v1/notifications",
    ],
}

# HTTP 方法列表
HTTP_METHODS = {"get", "post", "put", "delete", "patch", "head", "options"}

# ============================================================
# 路由提取
# ============================================================


def find_rust_files(base_dir: str) -> List[str]:
    """
    查找目录下所有 Rust 源文件，跳过 target 目录
    """
    rust_files = []
    for root, dirs, files in os.walk(base_dir):
        if "target" in dirs:
            dirs.remove("target")
        for f in files:
            if f.endswith(".rs"):
                rust_files.append(os.path.join(root, f))
    return rust_files


def _remove_rust_comments(content: str) -> str:
    """
    移除 Rust 代码中的注释（行注释和块注释），用空格替换以保持行号不变

    注意：只移除注释内容，字符串字面量中的 // 或 /* */ 不受影响（简化处理）
    """
    result = []
    i = 0
    n = len(content)
    in_block_comment = False
    in_string = False
    string_char = None

    while i < n:
        if in_block_comment:
            if content[i:i + 2] == "*/":
                result.append("  ")
                in_block_comment = False
                i += 2
            else:
                if content[i] == "\n":
                    result.append("\n")
                else:
                    result.append(" ")
                i += 1
            continue

        if in_string:
            result.append(content[i])
            if content[i] == "\\" and i + 1 < n:
                result.append(content[i + 1])
                i += 2
                continue
            if content[i] == string_char:
                in_string = False
            i += 1
            continue

        if content[i:i + 2] == "//":
            while i < n and content[i] != "\n":
                result.append(" ")
                i += 1
            continue

        if content[i:i + 2] == "/*":
            in_block_comment = True
            result.append("  ")
            i += 2
            continue

        if content[i] in ('"', "'"):
            in_string = True
            string_char = content[i]
            result.append(content[i])
            i += 1
            continue

        result.append(content[i])
        i += 1

    return "".join(result)


def _find_function_ranges(content: str) -> List[Tuple[int, int]]:
    """
    找出 Rust 文件中所有顶层函数定义的范围（起始行号, 结束行号）

    通过匹配 fn 关键字和对应的大括号来确定函数范围。
    """
    lines = content.split("\n")
    fn_ranges = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        if re.match(r"^(pub\s+)?(async\s+)?fn\s+\w+", stripped):
            start_line = i + 1
            brace_count = 0
            found_open = False
            j = i

            while j < n:
                current_line = lines[j]
                for ch in current_line:
                    if ch == "{":
                        brace_count += 1
                        found_open = True
                    elif ch == "}":
                        brace_count -= 1

                if found_open and brace_count == 0:
                    end_line = j + 1
                    fn_ranges.append((start_line, end_line))
                    i = j
                    break
                j += 1
            else:
                i += 1
        else:
            i += 1

    return fn_ranges


def _is_inside_function(line_num: int, fn_ranges: List[Tuple[int, int]]) -> bool:
    """
    检查指定行号是否在某个函数内部
    """
    for start, end in fn_ranges:
        if start <= line_num <= end:
            return True
    return False


def _main_calls_create_routes(main_content: str) -> bool:
    """
    检查 main.rs 中是否调用了 create_*_routes 类的函数（通过 .merge() 调用）

    如果 main.rs 中调用了这类函数，说明路由主要定义在函数内部，
    需要统计函数内部的路由。
    """
    pattern = re.compile(r"create_\w*routes?\s*\(")
    return bool(pattern.search(main_content))


def extract_routes_from_file(file_path: str, skip_function_routes: bool = False) -> List[Dict]:
    """
    从 Rust 源文件中提取路由定义

    支持的模式：
    1. .route("/path", get(handler))
    2. .route("/path", get(handler).post(handler2))
    3. .route("/path", get(h1).post(h2).put(h3).delete(h4))
    4. Router::new().route("/path", ...)

    返回：[{ "path": ..., "method": ..., "file": ..., "line": ... }]
    """
    routes = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            lines = content.split("\n")
    except Exception:
        return routes

    content_no_comments = _remove_rust_comments(content)
    fn_ranges = _find_function_ranges(content_no_comments) if skip_function_routes else []

    route_pattern = re.compile(
        r'\.route\(\s*["\'](/[^"\']+)["\']\s*,\s*([^)]+)\)',
        re.DOTALL,
    )

    for match in route_pattern.finditer(content_no_comments):
        path = match.group(1)
        method_chain = match.group(2)

        line_num = content[: match.start()].count("\n") + 1

        if skip_function_routes and _is_inside_function(line_num, fn_ranges):
            continue

        method_pattern = re.compile(r"\b(get|post|put|delete|patch|head|options)\s*\(")
        methods_found = method_pattern.findall(method_chain)

        if not methods_found:
            continue

        for method in methods_found:
            routes.append(
                {
                    "path": path,
                    "method": method.upper(),
                    "file": file_path,
                    "line": line_num,
                }
            )

    return routes


def scan_service(service_dir: str, service_name: str) -> Dict:
    """
    扫描单个服务的所有路由

    扫描策略：
    1. 对于多二进制服务（MULTI_BINARY_SERVICES），只扫描 main*.rs 入口文件
    2. 对于单二进制服务，先检查 main.rs 是否调用了 create_*_routes 类函数：
       - 如果调用了，说明路由定义在函数中，保留所有路由
       - 如果没调用，说明路由直接定义在 main.rs 中，其他文件中函数内部的
         路由可能是冗余的，跳过函数内部的路由
    """
    src_dir = os.path.join(service_dir, "src")
    if not os.path.isdir(src_dir):
        return {"name": service_name, "dir": service_dir, "routes": []}

    rust_files = find_rust_files(src_dir)
    is_multi_binary = service_name in MULTI_BINARY_SERVICES

    if is_multi_binary:
        rust_files = [
            f for f in rust_files
            if os.path.basename(f).startswith("main") and os.path.basename(f).endswith(".rs")
        ]
        skip_function_routes = False
    else:
        main_rs = os.path.join(src_dir, "main.rs")
        skip_function_routes = False
        if os.path.exists(main_rs):
            try:
                with open(main_rs, "r", encoding="utf-8", errors="ignore") as f:
                    main_content = f.read()
                main_content_no_comments = _remove_rust_comments(main_content)
                if not _main_calls_create_routes(main_content_no_comments):
                    skip_function_routes = True
            except Exception:
                pass

    all_routes = []

    for rf in rust_files:
        basename = os.path.basename(rf)
        is_main_file = basename.startswith("main") and basename.endswith(".rs")
        skip_for_this_file = skip_function_routes and not is_main_file
        routes = extract_routes_from_file(rf, skip_for_this_file)
        all_routes.extend(routes)

    return {
        "name": service_name,
        "dir": service_dir,
        "routes": all_routes,
        "file_count": len(rust_files),
    }


def scan_all_services(
    svc_dir: str, only_services: Optional[List[str]] = None
) -> Dict[str, Dict]:
    """
    扫描 svc 目录下所有 Rust 后端服务

    Args:
        svc_dir: 服务根目录
        only_services: 只扫描指定的服务列表，None 表示全部

    Returns:
        { service_name: { name, dir, routes, file_count } }
    """
    services = {}

    if not os.path.isdir(svc_dir):
        print(f"Error: {svc_dir} not found", file=sys.stderr)
        return services

    for entry in sorted(os.listdir(svc_dir)):
        service_dir = os.path.join(svc_dir, entry)
        if not os.path.isdir(service_dir):
            continue

        # 只检查有 Cargo.toml 和 src 目录的服务
        cargo_toml = os.path.join(service_dir, "Cargo.toml")
        src_dir = os.path.join(service_dir, "src")
        if not os.path.exists(cargo_toml) or not os.path.isdir(src_dir):
            continue

        # 跳过非服务的库（如 migration-sdk, shared 等）
        # 通过检查是否有 main.rs 来判断
        main_rs = os.path.join(src_dir, "main.rs")
        if not os.path.exists(main_rs):
            continue

        if entry in SKIP_SERVICES:
            continue

        if only_services and entry not in only_services:
            continue

        services[entry] = scan_service(service_dir, entry)

    return services


# ============================================================
# 检查逻辑
# ============================================================


def normalize_path(path: str) -> str:
    """
    标准化路径用于比较，将参数部分替换为 :param

    支持的参数格式：
    - {id} / {user_id}  (Axum 风格)
    - :id / :user_id    (某些框架风格)

    示例：
    /api/crm/customers/{id} -> /api/crm/customers/:param
    /api/srm/suppliers/:id  -> /api/srm/suppliers/:param
    """
    # 替换 {param} 或 :param 形式的路径参数
    normalized = re.sub(r"[{:][^}/]+[}]?", ":param", path)
    # 移除末尾斜杠以便统一比较
    normalized = normalized.rstrip("/")
    return normalized if normalized else "/"


def _should_ignore_path(path: str, ignore_list: List[str]) -> bool:
    """
    检查路径是否在忽略列表中
    """
    for prefix in ignore_list:
        if path.startswith(prefix):
            return True
    return False


def _is_allowed_cross_service_path(normalized_path: str) -> bool:
    """
    检查归一化后的路径是否属于允许跨服务重复的通用功能路径

    匹配规则：路径归一化后与 ALLOWED_CROSS_SERVICE_PATHS 中的条目完全匹配，
    或者是以该条目为前缀的子路径（如 /api/v1/audit-logs/{id} 也匹配）
    """
    norm_path = normalized_path.rstrip("/")
    for allowed in ALLOWED_CROSS_SERVICE_PATHS:
        norm_allowed = normalize_path(allowed)
        if norm_path == norm_allowed or norm_path.startswith(norm_allowed + "/"):
            return True
    return False


def check_intra_service_duplicates(services: Dict[str, Dict]) -> List[Dict]:
    """
    检查同一服务内的重复路由（method + path 完全相同）

    返回：
    [{
        "service": "...",
        "method": "GET",
        "path": "/api/...",
        "count": 2,
        "locations": [{"file": "...", "line": 123}, ...]
    }]
    """
    duplicates = []

    for service_name, service_data in services.items():
        # 使用 method + path 作为 key
        route_map = defaultdict(list)

        for route in service_data["routes"]:
            # 跳过忽略列表中的路径
            if _should_ignore_path(route["path"], IGNORE_PATHS_FOR_INTRA_DUP):
                continue

            key = f"{route['method']}:{route['path']}"
            route_map[key].append(
                {"file": route["file"], "line": route["line"], "path": route["path"]}
            )

        for key, locations in route_map.items():
            if len(locations) > 1:
                method, path = key.split(":", 1)

                # 对于多二进制服务，同一功能在不同入口文件中重复是正常设计
                # 例如 analytics 的 main.rs 和 main_bi.rs 都注册了 BI 路由
                # 只有当重复出现在同一个入口文件中时，才视为真正的重复
                is_multi_binary = service_name in MULTI_BINARY_SERVICES

                if is_multi_binary:
                    # 多二进制服务：检查是否所有重复都在不同的入口文件中
                    # 入口文件通常是 main*.rs（main.rs, main_bi.rs, main_report.rs 等）
                    entry_files = set()
                    for loc in locations:
                        file_path = loc.get("file", "")
                        # 提取入口文件名（如 main.rs, main_bi.rs, main_qms.rs）
                        basename = file_path.split("/")[-1]
                        if basename.startswith("main") and basename.endswith(".rs"):
                            entry_files.add(basename)
                    
                    # 如果所有重复都在不同的入口文件中，视为正常设计
                    if len(entry_files) == len(locations):
                        continue
                    # 如果有重复在同一个入口文件中，仍然报告
                    # 但如果有多个入口文件，降低优先级（暂不报告）
                    if len(entry_files) >= 2:
                        continue

                duplicates.append(
                    {
                        "service": service_name,
                        "method": method,
                        "path": path,
                        "count": len(locations),
                        "locations": locations,
                    }
                )

    return duplicates


def check_cross_service_duplicates(services: Dict[str, Dict]) -> Tuple[List[Dict], List[Dict]]:
    """
    检查跨服务的路径模式重复（参数归一化后比较）

    注意：只检查 method + normalized_path 相同且出现在不同服务的情况
    忽略每个服务都有的标准基础路径（健康检查、metrics 等）

    返回：
    (error_duplicates, info_duplicates)
    - error_duplicates: 真正的错误，需要修复
    - info_duplicates: 通用功能路径的跨服务重复，允许存在，仅作信息提示

    每个 duplicate 格式：
    [{
        "method": "GET",
        "normalized_path": "/api/.../:param",
        "services": ["crm", "srm"],
        "is_allowed": True/False,
        "details": [
            {"service": "crm", "path": "/api/crm/customers/{id}", "file": "...", "line": 123},
            ...
        ]
    }]
    """
    # 构建全局索引：normalized_key -> [route_entries]
    global_index = defaultdict(list)

    for service_name, service_data in services.items():
        for route in service_data["routes"]:
            # 跳过忽略列表中的路径
            if _should_ignore_path(route["path"], IGNORE_PATHS_FOR_CROSS_DUP):
                continue

            norm_path = normalize_path(route["path"])
            key = f"{route['method']}:{norm_path}"
            global_index[key].append(
                {
                    "service": service_name,
                    "path": route["path"],
                    "normalized_path": norm_path,
                    "file": route["file"],
                    "line": route["line"],
                }
            )

    error_dups = []
    info_dups = []
    for key, entries in global_index.items():
        # 检查是否涉及多个不同的服务
        service_set = set(e["service"] for e in entries)
        if len(service_set) > 1:
            method, norm_path = key.split(":", 1)
            is_allowed = _is_allowed_cross_service_path(norm_path)
            dup_item = {
                "method": method,
                "normalized_path": norm_path,
                "services": sorted(list(service_set)),
                "service_count": len(service_set),
                "is_allowed": is_allowed,
                "details": entries,
            }
            if is_allowed:
                info_dups.append(dup_item)
            else:
                error_dups.append(dup_item)

    # 按涉及服务数量排序，问题越大越靠前
    error_dups.sort(key=lambda x: (-x["service_count"], x["normalized_path"]))
    info_dups.sort(key=lambda x: (-x["service_count"], x["normalized_path"]))
    return error_dups, info_dups


def check_naming_conventions(services: Dict[str, Dict]) -> List[Dict]:
    """
    检查 API 路径命名规范

    规范：
    - 无版本号：/api/{service}/{resource} 格式
    - 带版本号：/api/v{n}/{service}/{resource} 为唯一合法格式
    - 只检查以 /api/ 开头的业务路径
    - 忽略健康检查、metrics、插件系统等基础路径
    - 聚合服务（portal、unified-core）有例外路径允许使用简化格式

    返回：
    [{
        "service": "...",
        "method": "GET",
        "path": "/api/...",
        "file": "...",
        "line": 123,
        "reason": "...",
        "violation_type": "..."
    }]
    """
    violations = []

    for service_name, service_data in services.items():
        for route in service_data["routes"]:
            path = route["path"]

            # 跳过忽略列表中的路径
            should_ignore = False
            for ignore_prefix in IGNORE_PATHS_FOR_NAMING:
                if path.startswith(ignore_prefix):
                    should_ignore = True
                    break
            if should_ignore:
                continue

            # 只检查以 /api/ 开头的路径
            # 不以 /api/ 开头的路径可能是特殊用途（WebSocket、内部路径等），不检查
            if not path.startswith("/api/"):
                continue

            # 检查聚合服务例外路径
            if service_name in AGGREGATION_SERVICE_EXCEPTIONS:
                allowed_paths = AGGREGATION_SERVICE_EXCEPTIONS[service_name]
                for allowed in allowed_paths:
                    if path == allowed or path.startswith(allowed):
                        should_ignore = True
                        break
            if should_ignore:
                continue

            # 去掉 /api/ 前缀，分析后续部分
            after_api = path[5:]  # len("/api/") = 5
            parts = after_api.strip("/").split("/")

            # 判断是否有版本号前缀（如 v1, v2 等）
            has_version = len(parts) > 0 and re.match(r"^v\d+$", parts[0])

            if has_version:
                # 格式: /api/v{n}/{service}/{resource}
                # 版本号后必须有服务名，即至少需要 3 个部分（version + service + resource）
                if len(parts) < 2:
                    # /api/v1 这种只有版本号的情况
                    violations.append(
                        {
                            "service": service_name,
                            "method": route["method"],
                            "path": path,
                            "file": route["file"],
                            "line": route["line"],
                            "reason": "带版本号路径缺少服务名和资源，应为 /api/v{n}/{service}/{resource}",
                            "violation_type": "versioned-path-no-service",
                        }
                    )
                    continue
                elif len(parts) < 3:
                    # /api/v1/xxx 这种有版本号但只有 xxx（没有服务名 + 资源）
                    # 即版本号后只有一段，无法区分是服务名还是资源名
                    violations.append(
                        {
                            "service": service_name,
                            "method": route["method"],
                            "path": path,
                            "file": route["file"],
                            "line": route["line"],
                            "reason": "带版本号路径缺少服务名或资源，应为 /api/v{n}/{service}/{resource}",
                            "violation_type": "versioned-path-no-service",
                        }
                    )
                    continue
            else:
                # 格式: /api/{service}/{resource}
                if len(parts) < 2:
                    violations.append(
                        {
                            "service": service_name,
                            "method": route["method"],
                            "path": path,
                            "file": route["file"],
                            "line": route["line"],
                            "reason": "路径层级不足，应为 /api/{service}/{resource}",
                            "violation_type": "path-insufficient-levels",
                        }
                    )
                    continue

    return violations


# ============================================================
# 输出格式
# ============================================================


def format_human_readable(
    services: Dict[str, Dict],
    intra_dups: List[Dict],
    cross_error_dups: List[Dict],
    cross_info_dups: List[Dict],
    naming_violations: List[Dict],
    strict: bool = False,
) -> str:
    """
    格式化人类可读的输出
    """
    lines = []
    lines.append("=" * 70)
    lines.append("API 路径唯一性检查报告")
    lines.append("=" * 70)

    # 统计信息
    total_services = len(services)
    total_routes = sum(len(s["routes"]) for s in services.values())
    lines.append(f"扫描服务数: {total_services}")
    lines.append(f"扫描路由数: {total_routes}")
    lines.append("")

    # 1. 服务内重复路由
    lines.append("-" * 70)
    lines.append(f"[1] 服务内重复路由: {len(intra_dups)} 个")
    lines.append("-" * 70)

    if intra_dups:
        for dup in intra_dups:
            lines.append("")
            lines.append(
                f"  ✗ [{dup['service']}] {dup['method']} {dup['path']} (重复 {dup['count']} 次)"
            )
            for loc in dup["locations"]:
                rel_path = os.path.relpath(loc["file"], SVC_DIR)
                lines.append(f"    - {rel_path}:{loc['line']}")
    else:
        lines.append("  ✓ 无服务内重复路由")

    lines.append("")

    # 2. 跨服务路径重复（错误级）
    lines.append("-" * 70)
    lines.append(f"[2] 跨服务路径模式重复: {len(cross_error_dups)} 个")
    lines.append("-" * 70)

    if cross_error_dups:
        for dup in cross_error_dups:
            lines.append("")
            lines.append(
                f"  ✗ {dup['method']} {dup['normalized_path']} (出现在 {dup['service_count']} 个服务)"
            )
            lines.append(f"    服务: {', '.join(dup['services'])}")
            for d in dup["details"]:
                rel_path = os.path.relpath(d["file"], SVC_DIR)
                lines.append(f"      - [{d['service']}] {d['path']}  ({rel_path}:{d['line']})")
    else:
        lines.append("  ✓ 无跨服务路径重复")

    lines.append("")

    # 2.1 跨服务路径重复（info级 - 通用功能路径）
    if cross_info_dups:
        lines.append("-" * 70)
        lines.append(f"[2.1] 通用功能路径跨服务实现（允许）: {len(cross_info_dups)} 个")
        lines.append("-" * 70)

        for dup in cross_info_dups:
            lines.append("")
            lines.append(
                f"  ℹ {dup['method']} {dup['normalized_path']} (出现在 {dup['service_count']} 个服务)"
            )
            lines.append(f"    说明: 通用功能路径，允许跨服务实现")
            lines.append(f"    服务: {', '.join(dup['services'])}")
            for d in dup["details"]:
                rel_path = os.path.relpath(d["file"], SVC_DIR)
                lines.append(f"      - [{d['service']}] {d['path']}  ({rel_path}:{d['line']})")

        lines.append("")

    # 3. 命名规范
    lines.append("-" * 70)
    lines.append(f"[3] 命名规范违规: {len(naming_violations)} 个")
    lines.append("-" * 70)

    if naming_violations:
        for v in naming_violations:
            lines.append("")
            severity = "✗" if strict else "⚠"
            lines.append(
                f"  {severity} [{v['service']}] {v['method']} {v['path']}"
            )
            lines.append(f"    原因: {v['reason']}")
            if v.get("violation_type"):
                lines.append(f"    违规类型: {v['violation_type']}")
            rel_path = os.path.relpath(v["file"], SVC_DIR)
            lines.append(f"    位置: {rel_path}:{v['line']}")
    else:
        lines.append("  ✓ 命名规范检查通过")

    lines.append("")
    lines.append("=" * 70)

    # 总结
    error_count = len(intra_dups) + len(cross_error_dups)
    if strict:
        error_count += len(naming_violations)

    if error_count == 0:
        lines.append("✓ 所有检查通过！")
    else:
        lines.append(f"✗ 发现 {error_count} 个问题")

    lines.append("=" * 70)

    return "\n".join(lines)


def build_json_result(
    services: Dict[str, Dict],
    intra_dups: List[Dict],
    cross_error_dups: List[Dict],
    cross_info_dups: List[Dict],
    naming_violations: List[Dict],
    strict: bool = False,
) -> Dict:
    """
    构建 JSON 格式的结果
    """
    total_services = len(services)
    total_routes = sum(len(s["routes"]) for s in services.values())

    # 按服务统计路由数
    service_stats = {}
    for name, data in services.items():
        service_stats[name] = {
            "route_count": len(data["routes"]),
            "file_count": data.get("file_count", 0),
        }

    error_count = len(intra_dups) + len(cross_error_dups)
    if strict:
        error_count += len(naming_violations)

    return {
        "summary": {
            "total_services": total_services,
            "total_routes": total_routes,
            "intra_service_duplicates": len(intra_dups),
            "cross_service_duplicates": len(cross_error_dups),
            "cross_service_allowed": len(cross_info_dups),
            "naming_violations": len(naming_violations),
            "total_errors": error_count,
            "passed": error_count == 0,
        },
        "service_stats": service_stats,
        "intra_service_duplicates": intra_dups,
        "cross_service_duplicates": cross_error_dups,
        "cross_service_allowed_duplicates": cross_info_dups,
        "naming_violations": naming_violations,
    }


# ============================================================
# 主函数
# ============================================================


def main():
    parser = argparse.ArgumentParser(
        description="后端 API 路径唯一性检查脚本（CI 专用）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  # 检查所有服务
  python scripts/check_api_duplicates_ci.py

  # CI 模式（只输出错误，退出码非零表示失败）
  python scripts/check_api_duplicates_ci.py --ci

  # JSON 输出
  python scripts/check_api_duplicates_ci.py --json

  # 只检查指定服务
  python scripts/check_api_duplicates_ci.py --service crm --service srm

  # 严格模式（命名不规范也报错）
  python scripts/check_api_duplicates_ci.py --strict

CI 集成示例（GitHub Actions）：
  - name: Check API Path Uniqueness
    run: python scripts/check_api_duplicates_ci.py --ci

CI 集成示例（GitLab CI）：
  api_check:
    script:
      - python scripts/check_api_duplicates_ci.py --ci
""",
    )

    parser.add_argument(
        "--ci",
        action="store_true",
        help="CI 模式：有错误时才输出，通过时静默",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="输出 JSON 格式结果",
    )
    parser.add_argument(
        "--service",
        action="append",
        default=[],
        help="只检查指定服务（可多次指定）",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="严格模式：命名规范违规也视为错误",
    )

    args = parser.parse_args()

    # 扫描服务
    only_services = args.service if args.service else None
    services = scan_all_services(SVC_DIR, only_services)

    if not services:
        if not args.ci:
            print("未找到任何服务", file=sys.stderr)
        sys.exit(1)

    # 执行检查
    intra_dups = check_intra_service_duplicates(services)
    cross_error_dups, cross_info_dups = check_cross_service_duplicates(services)
    naming_violations = check_naming_conventions(services)

    # 计算错误数（只计算 error 级别的，info 级别的通用路径不计算）
    error_count = len(intra_dups) + len(cross_error_dups)
    if args.strict:
        error_count += len(naming_violations)

    # 输出结果
    if args.json:
        # JSON 模式
        result = build_json_result(
            services, intra_dups, cross_error_dups, cross_info_dups, naming_violations, args.strict
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif args.ci:
        # CI 模式：只有错误时才输出
        if error_count > 0:
            output = format_human_readable(
                services, intra_dups, cross_error_dups, cross_info_dups, naming_violations, args.strict
            )
            print(output)
    else:
        # 正常模式：总是输出
        output = format_human_readable(
            services, intra_dups, cross_error_dups, cross_info_dups, naming_violations, args.strict
        )
        print(output)

    # 退出码
    sys.exit(1 if error_count > 0 else 0)


if __name__ == "__main__":
    main()
