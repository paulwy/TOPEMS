#!/usr/bin/env python3
"""
HRM 模块前后端 API 对比分析脚本 v4
更准确的前端 API 提取，处理 createCrudApi 等工厂函数
"""

import json
import re
import os
from pathlib import Path
from collections import defaultdict


def extract_frontend_apis(frontend_dir: str) -> list[dict]:
    """从前端 TypeScript 文件中提取 API 函数和路径"""
    apis = []
    frontend_path = Path(frontend_dir)
    
    for ts_file in sorted(frontend_path.glob("*.ts")):
        if ts_file.name in ("types.ts",):
            continue
            
        content = ts_file.read_text()
        module = ts_file.stem
        
        # 1. 首先提取显式的 apiClient.hrm.* 调用
        pattern = r'apiClient\.hrm\.(get|post|put|delete)\(\s*[`\'"]([^\'`"]+)[`\'"]'
        matches = re.findall(pattern, content)
        
        for method, path in matches:
            original_path = path.strip()
            
            # 跳过包含 endpoint 变量的模板（createCrudApi 内部的）
            if 'endpoint' in original_path:
                continue
            
            # 去掉查询字符串部分
            clean_path = re.sub(r'\$\{queryString\}', '', original_path)
            clean_path = re.sub(r'\?.*$', '', clean_path)
            
            # 把 ${...} 替换为 {param} 形式
            clean_path = re.sub(r'\$\{[^}]+\}', '{param}', clean_path)
            
            apis.append({
                "method": method.upper(),
                "path": clean_path,
                "original_path": original_path,
                "file": ts_file.name,
                "module": module
            })
        
        # 2. 提取通过 createCrudApi 创建的 API
        # 模式: export const xxxApi = createCrudApi<Type>('/endpoint');
        crud_pattern = r'createCrudApi\s*<[^>]+>\s*\(\s*[`\'"]([^\'`"]+)[`\'"]'
        crud_matches = re.findall(crud_pattern, content)
        
        for endpoint in crud_matches:
            # CRUD API 包含 5 个方法：list(GET), get(GET), create(POST), update(PUT), delete(DELETE)
            crud_apis = [
                ("GET", endpoint, f"{endpoint}${{queryString}}"),
                ("GET", f"{endpoint}/{{param}}", f"{endpoint}/${{id}}"),
                ("POST", endpoint, endpoint),
                ("PUT", f"{endpoint}/{{param}}", f"{endpoint}/${{id}}"),
                ("DELETE", f"{endpoint}/{{param}}", f"{endpoint}/${{id}}"),
            ]
            
            for method, clean_path, original_path in crud_apis:
                apis.append({
                    "method": method,
                    "path": clean_path,
                    "original_path": original_path,
                    "file": ts_file.name,
                    "module": module
                })
        
        # 3. 提取 ...createCrudApi 展开式（如 performanceReviewApi）
        spread_crud_pattern = r'\.\.\.createCrudApi\s*<[^>]+>\s*\(\s*[`\'"]([^\'`"]+)[`\'"]'
        spread_matches = re.findall(spread_crud_pattern, content)
        
        for endpoint in spread_matches:
            crud_apis = [
                ("GET", endpoint, f"{endpoint}${{queryString}}"),
                ("GET", f"{endpoint}/{{param}}", f"{endpoint}/${{id}}"),
                ("POST", endpoint, endpoint),
                ("PUT", f"{endpoint}/{{param}}", f"{endpoint}/${{id}}"),
                ("DELETE", f"{endpoint}/{{param}}", f"{endpoint}/${{id}}"),
            ]
            
            for method, clean_path, original_path in crud_apis:
                apis.append({
                    "method": method,
                    "path": clean_path,
                    "original_path": original_path,
                    "file": ts_file.name,
                    "module": module
                })
    
    # 去重
    unique_apis = []
    seen = set()
    for api in apis:
        key = (api["method"], api["path"])
        if key not in seen:
            seen.add(key)
            unique_apis.append(api)
    
    return unique_apis


def extract_backend_routes_from_source(backend_dir: str) -> list[dict]:
    """从后端 Rust 源码中提取路由"""
    routes = []
    backend_path = Path(backend_dir)
    
    for rs_file in sorted(backend_path.glob("*.rs")):
        if rs_file.name == "mod.rs":
            continue
            
        content = rs_file.read_text()
        module = rs_file.stem
        
        # 先找到所有的 .route( 调用，包括跨行的
        i = 0
        while i < len(content):
            # 查找 .route(
            route_start = content.find('.route(', i)
            if route_start == -1:
                break
            
            # 找到路径字符串
            path_match = re.search(r'\.route\(\s*["\']([^"\']+)["\']', content[route_start:])
            if not path_match:
                i = route_start + 1
                continue
            
            path = path_match.group(1)
            
            if not path.startswith("/api/hrm/"):
                i = route_start + len(path_match.group(0))
                continue
            
            # 找到匹配的闭合括号
            open_paren = content.find('(', route_start)
            if open_paren == -1:
                i = route_start + 1
                continue
            
            # 计算括号匹配
            depth = 1
            pos = open_paren + 1
            while pos < len(content) and depth > 0:
                if content[pos] == '(':
                    depth += 1
                elif content[pos] == ')':
                        depth -= 1
                pos += 1
            
            if depth == 0:
                handlers_str = content[open_paren+1:pos-1]
            else:
                handlers_str = ""
            
            # 提取方法和 handler
            method_pattern = r'(get|post|put|delete|patch|head|options)\(([^)]+)\)'
            method_matches = re.findall(method_pattern, handlers_str)
            
            for method, handler in method_matches:
                relative_path = path[len("/api/hrm"):]
                routes.append({
                    "method": method.upper(),
                    "path": relative_path,
                    "full_path": path,
                    "handler": handler.strip(),
                    "file": rs_file.name,
                    "module": module
                })
            
            i = pos
    
    # 去重
    unique_routes = []
    seen = set()
    for route in routes:
        key = (route["method"], route["path"])
        if key not in seen:
            seen.add(key)
            unique_routes.append(route)
    
    return unique_routes


def normalize_path(path: str) -> str:
    """标准化路径用于对比"""
    # 去掉查询参数
    path = path.split('?')[0]
    # 统一路径参数格式
    path = re.sub(r'\{[^}]+\}', '{param}', path)
    path = re.sub(r':[a-zA-Z_]+', '{param}', path)
    # 去掉末尾斜杠
    path = path.rstrip('/')
    # 去掉开头斜杠
    path = path.lstrip('/')
    return path


def paths_match(path1: str, path2: str) -> bool:
    """检查两个路径是否匹配（考虑路径参数位置）"""
    norm1 = normalize_path(path1)
    norm2 = normalize_path(path2)
    return norm1 == norm2


def compare_apis(frontend_apis: list[dict], backend_routes: list[dict]) -> dict:
    """对比前后端 API"""
    frontend_set = set()
    frontend_map = defaultdict(list)
    
    for api in frontend_apis:
        norm_path = normalize_path(api["path"])
        key = (api["method"], norm_path)
        frontend_set.add(key)
        frontend_map[key].append(api)
    
    backend_set = set()
    backend_map = defaultdict(list)
    
    for route in backend_routes:
        norm_path = normalize_path(route["path"])
        key = (route["method"], norm_path)
        backend_set.add(key)
        backend_map[key].append(route)
    
    matched = frontend_set & backend_set
    frontend_only = frontend_set - backend_set
    backend_only = backend_set - frontend_set
    
    return {
        "matched": sorted(matched),
        "frontend_only": sorted(frontend_only),
        "backend_only": sorted(backend_only),
        "frontend_map": frontend_map,
        "backend_map": backend_map,
        "frontend_total": len(frontend_set),
        "backend_total": len(backend_set),
        "matched_count": len(matched)
    }


def generate_markdown_report(result: dict, frontend_apis: list[dict], 
                            backend_routes: list[dict], output_path: str):
    """生成 Markdown 报告"""
    matched = result["matched"]
    frontend_only = result["frontend_only"]
    backend_only = result["backend_only"]
    frontend_map = result["frontend_map"]
    backend_map = result["backend_map"]
    frontend_total = result["frontend_total"]
    backend_total = result["backend_total"]
    matched_count = result["matched_count"]
    
    # 计算对接率
    if frontend_total > 0:
        integration_rate = (matched_count / frontend_total) * 100
    else:
        integration_rate = 0
    
    lines = []
    lines.append("# HRM 模块前后端 API 对比报告")
    lines.append("")
    lines.append(f"**生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("> 数据源说明：")
    lines.append("> - 前端 API：从 `apps/web/src/api/hrm/` 目录下 TypeScript 文件提取")
    lines.append("> - 后端路由：从 `svc/hrm/src/api/` 目录下 Rust 源码提取")
    lines.append("")
    
    # 概览
    lines.append("## 概览")
    lines.append("")
    lines.append(f"| 指标 | 数量 |")
    lines.append(f"|------|------|")
    lines.append(f"| 前端 API 总数 | {frontend_total} |")
    lines.append(f"| 后端路由总数 | {backend_total} |")
    lines.append(f"| 已对接 API | {matched_count} |")
    lines.append(f"| 前端有后端无 | {len(frontend_only)} |")
    lines.append(f"| 后端有前端无 | {len(backend_only)} |")
    lines.append(f"| **API 对接率** | **{integration_rate:.2f}%** |")
    lines.append("")
    
    # 已对接的 API
    lines.append("## 1. 已对接的 API（前后端都有）")
    lines.append("")
    lines.append(f"共 {matched_count} 个")
    lines.append("")
    lines.append("| 方法 | 路径 | 前端文件 | 后端文件 | 后端 Handler |")
    lines.append("|------|------|----------|----------|-------------|")
    
    for method, path in sorted(matched):
        frontends = frontend_map.get((method, path), [])
        backends = backend_map.get((method, path), [])
        
        frontend_files = ", ".join(sorted(set(f["file"] for f in frontends)))
        backend_files = ", ".join(sorted(set(b["file"] for b in backends)))
        backend_handlers = ", ".join(sorted(set(b["handler"] for b in backends)))
        
        # 取一个原始路径显示
        display_path = frontends[0]["original_path"] if frontends else path
        lines.append(f"| {method} | `{display_path}` | {frontend_files} | {backend_files} | {backend_handlers} |")
    
    lines.append("")
    
    # 前端有后端没有的 API
    lines.append("## 2. 前端有但后端没有的 API（前端超前）")
    lines.append("")
    lines.append(f"共 {len(frontend_only)} 个")
    lines.append("")
    lines.append("| 方法 | 路径 | 前端文件 | 模块 |")
    lines.append("|------|------|----------|------|")
    
    for method, path in sorted(frontend_only):
        frontends = frontend_map.get((method, path), [])
        frontend_files = ", ".join(sorted(set(f["file"] for f in frontends)))
        modules = ", ".join(sorted(set(f["module"] for f in frontends)))
        display_path = frontends[0]["original_path"] if frontends else path
        lines.append(f"| {method} | `{display_path}` | {frontend_files} | {modules} |")
    
    lines.append("")
    
    # 后端有前端没有的 API
    lines.append("## 3. 后端有但前端没有的 API（后端超前）")
    lines.append("")
    lines.append(f"共 {len(backend_only)} 个")
    lines.append("")
    lines.append("| 方法 | 路径 | 后端文件 | 模块 | Handler |")
    lines.append("|------|------|----------|------|---------|")
    
    for method, path in sorted(backend_only):
        backends = backend_map.get((method, path), [])
        backend_files = ", ".join(sorted(set(b["file"] for b in backends)))
        modules = ", ".join(sorted(set(b["module"] for b in backends)))
        handlers = ", ".join(sorted(set(b["handler"] for b in backends)))
        lines.append(f"| {method} | `{path}` | {backend_files} | {modules} | {handlers} |")
    
    lines.append("")
    
    # 按模块分类统计
    lines.append("## 4. 按模块分类统计")
    lines.append("")
    
    # 统计前端各模块的 API 数量
    frontend_modules = defaultdict(set)
    for api in frontend_apis:
        norm_path = normalize_path(api["path"])
        key = (api["method"], norm_path)
        frontend_modules[api["module"]].add(key)
    
    backend_modules = defaultdict(set)
    for route in backend_routes:
        norm_path = normalize_path(route["path"])
        key = (route["method"], norm_path)
        backend_modules[route["module"]].add(key)
    
    all_modules = sorted(set(list(frontend_modules.keys()) + list(backend_modules.keys())))
    
    lines.append("| 模块 | 前端 API | 后端 API | 已对接 | 对接率 |")
    lines.append("|------|----------|----------|--------|--------|")
    
    for module in all_modules:
        f_set = frontend_modules.get(module, set())
        b_set = backend_modules.get(module, set())
        m_set = f_set & b_set
        f_count = len(f_set)
        b_count = len(b_set)
        m_count = len(m_set)
        
        if f_count > 0:
            rate = (m_count / f_count) * 100
            rate_str = f"{rate:.1f}%"
        else:
            rate_str = "N/A"
        
        lines.append(f"| {module} | {f_count} | {b_count} | {m_count} | {rate_str} |")
    
    lines.append("")
    
    # 主要缺失项摘要
    lines.append("## 5. 主要缺失项摘要")
    lines.append("")
    
    # 前端超前的（需要后端实现的）
    lines.append("### 5.1 前端已定义但后端未实现的 API")
    lines.append("")
    if frontend_only:
        lines.append("需要后端优先实现的前端 API：")
        lines.append("")
        
        # 按模块分组
        fe_by_module = defaultdict(list)
        for method, path in sorted(frontend_only):
            frontends = frontend_map.get((method, path), [])
            modules = set(f["module"] for f in frontends)
            for m in modules:
                fe_by_module[m].append((method, path))
        
        for module in sorted(fe_by_module.keys()):
            lines.append(f"**{module} 模块 ({len(fe_by_module[module])} 个)**：")
            for method, path in fe_by_module[module]:
                frontends = frontend_map.get((method, path), [])
                display_path = frontends[0]["original_path"] if frontends else path
                lines.append(f"- `{method} {display_path}`")
            lines.append("")
    else:
        lines.append("无")
        lines.append("")
    
    # 后端超前的（前端需要对接的）
    lines.append("### 5.2 后端已实现但前端未对接的 API")
    lines.append("")
    if backend_only:
        lines.append("前端可以考虑对接的后端 API：")
        lines.append("")
        
        # 按模块分组
        be_by_module = defaultdict(list)
        for method, path in sorted(backend_only):
            backends = backend_map.get((method, path), [])
            modules = set(b["module"] for b in backends)
            for m in modules:
                be_by_module[m].append((method, path))
        
        for module in sorted(be_by_module.keys()):
            lines.append(f"**{module} 模块 ({len(be_by_module[module])} 个)**：")
            for method, path in be_by_module[module]:
                backends = backend_map.get((method, path), [])
                handlers = ", ".join(sorted(set(b["handler"] for b in backends)))
                lines.append(f"- `{method} {path}` ({handlers})")
            lines.append("")
    else:
        lines.append("无")
        lines.append("")
    
    # 写出报告
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))
    
    print(f"报告已生成: {output_path}")
    print(f"API 对接率: {integration_rate:.2f}%")
    print(f"已对接: {matched_count}, 前端超前: {len(frontend_only)}, 后端超前: {len(backend_only)}")
    
    return {
        "integration_rate": integration_rate,
        "matched_count": matched_count,
        "frontend_only_count": len(frontend_only),
        "backend_only_count": len(backend_only),
        "frontend_total": frontend_total,
        "backend_total": backend_total,
        "frontend_only": frontend_only,
        "backend_only": backend_only
    }


def main():
    frontend_dir = "/Users/air/TOPEMS/apps/web/src/api/hrm"
    backend_dir = "/Users/air/TOPEMS/svc/hrm/src/api"
    output_path = "/Users/air/TOPEMS/docs/reports/hrm-api-comparison.md"
    
    print("正在提取前端 API...")
    frontend_apis = extract_frontend_apis(frontend_dir)
    print(f"找到 {len(frontend_apis)} 个前端 API")
    
    print("正在从后端源码提取路由...")
    backend_routes = extract_backend_routes_from_source(backend_dir)
    print(f"找到 {len(backend_routes)} 个后端 HRM 路由")
    
    print("\n正在对比分析...")
    result = compare_apis(frontend_apis, backend_routes)
    
    print("正在生成报告...")
    summary = generate_markdown_report(result, frontend_apis, backend_routes, output_path)
    
    return summary


if __name__ == "__main__":
    main()
