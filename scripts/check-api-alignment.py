#!/usr/bin/env python3
"""
API 对齐检测脚本

扫描前端 API 调用路径和后端路由注册路径，输出不匹配项。

用法:
    python scripts/check-api-alignment.py

扫描范围:
    - 前端: apps/web/src/api/ 目录下所有 .ts 文件中的 API 路径
    - 后端: svc/unified-core/src/main.rs 中的路由注册

输出:
    - 前端定义但后端未注册的路径
    - 后端注册但前端未定义的路径
    - 路径格式差异（如 /:id vs /{id}）
"""

import re
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


def extract_frontend_api_paths():
    """扫描前端 API 调用路径"""
    frontend_paths = set()
    api_dir = PROJECT_ROOT / "apps" / "web" / "src" / "api"
    
    for ts_file in api_dir.rglob("*.ts"):
        content = ts_file.read_text(encoding="utf-8")
        
        api_base_pattern = re.compile(r'const API_BASE\s*=\s*["\']([^"\']+)["\']')
        api_base_match = api_base_pattern.search(content)
        api_base = api_base_match.group(1) if api_base_match else ""
        
        call_pattern = re.compile(
            r'(?:axios|client|apiClient|dictAxios|pluginAxios|authAxios|tenantAxios)\.'
            r'(get|post|put|delete|patch)\s*\(\s*(`[^`]+`|["\'][^"\']+["\'])'
        )
        
        for match in call_pattern.finditer(content):
            method = match.group(1).upper()
            path_expr = match.group(2)
            
            if path_expr.startswith('`'):
                full_path = path_expr[1:-1]
                full_path = full_path.replace('${API_BASE}', api_base)
            else:
                full_path = path_expr[1:-1]
            
            if full_path.startswith("/api/"):
                frontend_paths.add((method, full_path))
    
    return frontend_paths


def extract_backend_routes():
    """扫描后端路由注册"""
    backend_routes = set()
    main_rs = PROJECT_ROOT / "svc" / "unified-core" / "src" / "main.rs"
    
    if not main_rs.exists():
        return backend_routes
    
    content = main_rs.read_text(encoding="utf-8")
    
    # 匹配路由注册: .route("/api/...", get(...)) 或 .route("/api/...", post(...))
    route_pattern = re.compile(r'\.route\s*\(\s*["\']([^"\']+)["\']\s*,\s*(get|post|put|delete|patch)\s*\(')
    
    for match in route_pattern.finditer(content):
        path = match.group(1)
        method = match.group(2).upper()
        
        if path.startswith("/api/"):
            backend_routes.add((method, path))
    
    return backend_routes


def normalize_path(path):
    """标准化路径，将 /:id 和 /{id} 统一为 /{id}"""
    # 将 /:id 转换为 /{id}
    normalized = re.sub(r'/(:\w+)', r'/{\\1[1:]}', path)
    # 简化: 直接移除参数名，只保留占位符标记
    normalized = re.sub(r'/[:{]\w+[}]?', r'/{param}', normalized)
    return normalized


def find_mismatches(frontend_paths, backend_routes):
    """找出前后端路径不匹配的情况"""
    mismatches = {
        "frontend_only": [],  # 前端有，后端没有
        "backend_only": [],   # 后端有，前端没有
        "method_mismatch": [],  # 路径相同但方法不同
    }
    
    # 按路径分组
    frontend_by_path = {}
    for method, path in frontend_paths:
        frontend_by_path.setdefault(path, set()).add(method)
    
    backend_by_path = {}
    for method, path in backend_routes:
        backend_by_path.setdefault(path, set()).add(method)
    
    # 检查前端有但后端没有的路径
    for path, methods in frontend_by_path.items():
        if path not in backend_by_path:
            # 尝试查找相似路径
            found_similar = False
            normalized_path = normalize_path(path)
            
            for backend_path in backend_by_path:
                if normalize_path(backend_path) == normalized_path:
                    found_similar = True
                    # 检查方法是否匹配
                    backend_methods = backend_by_path[backend_path]
                    missing_methods = methods - backend_methods
                    if missing_methods:
                        mismatches["method_mismatch"].append({
                            "frontend_path": path,
                            "backend_path": backend_path,
                            "frontend_methods": list(methods),
                            "backend_methods": list(backend_methods),
                            "missing_methods": list(missing_methods),
                        })
                    break
            
            if not found_similar:
                mismatches["frontend_only"].append({
                    "path": path,
                    "methods": list(methods),
                })
    
    # 检查后端有但前端没有的路径
    for path, methods in backend_by_path.items():
        if path not in frontend_by_path:
            # 跳过一些已知的内部路由
            if any(skip in path for skip in ["/metrics", "/api/info", "/ws/"]):
                continue
            
            mismatches["backend_only"].append({
                "path": path,
                "methods": list(methods),
            })
    
    return mismatches


def print_results(mismatches):
    """打印检测结果"""
    print("=" * 80)
    print("API 对齐检测报告")
    print("=" * 80)
    print()
    
    # 前端有但后端没有的路径
    if mismatches["frontend_only"]:
        print("⚠️  前端定义但后端未注册的路径:")
        print("-" * 60)
        for item in sorted(mismatches["frontend_only"], key=lambda x: x["path"]):
            print(f"  {', '.join(item['methods']):12} {item['path']}")
        print()
    
    # 后端有但前端没有的路径
    if mismatches["backend_only"]:
        print("ℹ️  后端注册但前端未调用的路径:")
        print("-" * 60)
        for item in sorted(mismatches["backend_only"], key=lambda x: x["path"]):
            print(f"  {', '.join(item['methods']):12} {item['path']}")
        print()
    
    # 方法不匹配
    if mismatches["method_mismatch"]:
        print("⚠️  路径相似但方法不匹配:")
        print("-" * 60)
        for item in mismatches["method_mismatch"]:
            print(f"  前端: {', '.join(item['frontend_methods']):12} {item['frontend_path']}")
            print(f"  后端: {', '.join(item['backend_methods']):12} {item['backend_path']}")
            print(f"  缺失方法: {', '.join(item['missing_methods'])}")
            print()
    
    # 汇总
    frontend_count = len(mismatches["frontend_only"])
    backend_count = len(mismatches["backend_only"])
    method_count = len(mismatches["method_mismatch"])
    
    print("=" * 80)
    print(f"检测结果汇总:")
    print(f"  - 前端多余路径: {frontend_count}")
    print(f"  - 后端多余路径: {backend_count}")
    print(f"  - 方法不匹配: {method_count}")
    
    if frontend_count == 0 and backend_count == 0 and method_count == 0:
        print("✅ 所有 API 路径对齐!")
    else:
        print("❌ 存在路径不匹配，请检查并修复。")
    
    print("=" * 80)


def main():
    print("正在扫描前端 API 路径...")
    frontend_paths = extract_frontend_api_paths()
    print(f"  发现 {len(frontend_paths)} 条前端 API 路径")
    
    print("正在扫描后端路由...")
    backend_routes = extract_backend_routes()
    print(f"  发现 {len(backend_routes)} 条后端路由")
    
    print("正在分析路径匹配情况...")
    mismatches = find_mismatches(frontend_paths, backend_routes)
    
    print_results(mismatches)


if __name__ == "__main__":
    main()
