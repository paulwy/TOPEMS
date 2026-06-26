#!/usr/bin/env python3
import os
import re
import json
from pathlib import Path
from collections import defaultdict

SRC_DIR = Path("/Users/air/TOPEMS/apps/web/src")
OUTPUT_FILE = Path("/Users/air/TOPEMS/frontend_analysis.json")


def extract_api_functions_from_content(content, file_path):
    """从文件内容中提取所有 API 函数"""
    results = []
    
    api_call_pattern = re.compile(
        r'apiClient\.\w+\.(get|post|put|delete|patch)\s*<[^>]*>\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
        re.DOTALL
    )
    
    api_call_pattern2 = re.compile(
        r'apiClient\.\w+\.(get|post|put|delete|patch)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
        re.DOTALL
    )
    
    lines = content.split('\n')
    
    func_pattern = re.compile(
        r'^export\s+async\s+function\s+(\w+)\s*\(',
        re.MULTILINE
    )
    
    for match in func_pattern.finditer(content):
        func_name = match.group(1)
        start_pos = match.start()
        
        brace_count = 0
        func_body_start = -1
        for i in range(match.end(), len(content)):
            if content[i] == '{':
                if brace_count == 0:
                    func_body_start = i
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0 and func_body_start >= 0:
                    func_body = content[func_body_start:i+1]
                    
                    calls = api_call_pattern.findall(func_body)
                    if not calls:
                        calls = api_call_pattern2.findall(func_body)
                    
                    if calls:
                        http_method, path = calls[0]
                        results.append({
                            "function_name": func_name,
                            "object_name": None,
                            "http_method": http_method.upper(),
                            "path": path
                        })
                    break
    
    obj_pattern = re.compile(
        r'export\s+const\s+(\w+Api)\s*=\s*\{',
        re.DOTALL
    )
    
    for obj_match in obj_pattern.finditer(content):
        obj_name = obj_match.group(1)
        start_pos = obj_match.end()
        
        brace_count = 1
        i = start_pos
        while i < len(content) and brace_count > 0:
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
            i += 1
        
        obj_body = content[start_pos:i-1]
        
        method_pattern = re.compile(
            r'(\w+)\s*:\s*async\s*\(',
            re.DOTALL
        )
        
        method_matches = list(method_pattern.finditer(obj_body))
        
        for idx, m in enumerate(method_matches):
            method_name = m.group(1)
            method_start = m.start()
            
            if idx + 1 < len(method_matches):
                method_end = method_matches[idx + 1].start()
            else:
                method_end = len(obj_body)
            
            method_body = obj_body[method_start:method_end]
            
            calls = api_call_pattern.findall(method_body)
            if not calls:
                calls = api_call_pattern2.findall(method_body)
            
            if calls:
                http_method, path = calls[0]
                results.append({
                    "function_name": method_name,
                    "object_name": obj_name,
                    "http_method": http_method.upper(),
                    "path": path
                })
    
    return results


def scan_api_files():
    """扫描 src/api/ 目录下所有 .ts 文件，提取 API 函数"""
    api_dir = SRC_DIR / "api"
    api_modules = defaultdict(list)
    total_api_count = 0

    for ts_file in sorted(api_dir.rglob("*.ts")):
        rel_path = ts_file.relative_to(api_dir)
        parts = rel_path.parts
        
        if ts_file.name in ["types.ts", "utils.ts", "client.ts", "request.ts", "permission-interceptor.ts"]:
            continue
        
        if len(parts) == 1:
            module_name = ts_file.stem
            sub_module = None
        else:
            module_name = parts[0]
            if len(parts) == 2:
                sub_module = ts_file.stem
            else:
                sub_module = "/".join(parts[1:-1]) + "/" + ts_file.stem
        
        try:
            content = ts_file.read_text(encoding="utf-8")
        except:
            continue
        
        api_funcs = extract_api_functions_from_content(content, ts_file)
        
        for func in api_funcs:
            func["file"] = str(ts_file.relative_to(SRC_DIR))
            func["sub_module"] = sub_module
            api_modules[module_name].append(func)
            total_api_count += 1
    
    return api_modules, total_api_count


def scan_routes():
    """扫描 src/routes/ 目录下所有 .ts 文件，提取路由配置"""
    routes_dir = SRC_DIR / "routes"
    route_modules = defaultdict(list)
    total_route_count = 0
    
    for ts_file in sorted(routes_dir.glob("*.ts")):
        if ts_file.name in ["index.ts", "utils.ts"]:
            continue
        
        module_name = ts_file.stem
        
        try:
            content = ts_file.read_text(encoding="utf-8")
        except:
            continue
        
        route_pattern = re.compile(
            r'\{\s*path:\s*[\'"`]([^\'"`]+)[\'"`]\s*,\s*element:\s*(\w+)[^}]*\}',
            re.DOTALL
        )
        
        matches = route_pattern.findall(content)
        
        for path, component in matches:
            route_modules[module_name].append({
                "path": path,
                "component": component,
                "file": str(ts_file.relative_to(SRC_DIR))
            })
            total_route_count += 1
    
    return route_modules, total_route_count


def scan_pages():
    """扫描 src/pages/ 目录下所有 .tsx 文件，提取页面组件"""
    pages_dir = SRC_DIR / "pages"
    page_modules = defaultdict(list)
    total_page_count = 0
    
    exclude_dirs = {"__tests__", "forms"}
    exclude_files = {"ExportModal.tsx", "EmployeeFinanceTab.tsx"}
    
    for tsx_file in sorted(pages_dir.rglob("*.tsx")):
        rel_path = tsx_file.relative_to(pages_dir)
        parts = rel_path.parts
        
        if any(part in exclude_dirs for part in parts[:-1]):
            continue
        
        if tsx_file.name in exclude_files:
            continue
        
        is_page = False
        if tsx_file.name.endswith("Page.tsx"):
            is_page = True
        elif tsx_file.name == "index.tsx":
            is_page = True
        elif "Page" in tsx_file.stem:
            is_page = True
        
        if not is_page:
            continue
        
        module_name = parts[0] if len(parts) > 1 else "root"
        
        page_modules[module_name].append({
            "component_name": tsx_file.stem,
            "file_path": str(tsx_file.relative_to(SRC_DIR)),
            "file_name": tsx_file.name
        })
        total_page_count += 1
    
    return page_modules, total_page_count


def main():
    print("正在扫描 API 函数...")
    api_modules, total_api = scan_api_files()
    print(f"  找到 {total_api} 个 API 函数，分布在 {len(api_modules)} 个模块中")
    
    print("正在扫描页面路由...")
    route_modules, total_routes = scan_routes()
    print(f"  找到 {total_routes} 个路由，分布在 {len(route_modules)} 个模块中")
    
    print("正在扫描页面文件...")
    page_modules, total_pages = scan_pages()
    print(f"  找到 {total_pages} 个页面文件，分布在 {len(page_modules)} 个模块中")
    
    api_by_module = {}
    for mod, apis in sorted(api_modules.items()):
        api_by_module[mod] = {
            "count": len(apis),
            "functions": apis
        }
    
    routes_by_module = {}
    for mod, routes in sorted(route_modules.items()):
        routes_by_module[mod] = {
            "count": len(routes),
            "routes": routes
        }
    
    pages_by_module = {}
    for mod, pages in sorted(page_modules.items()):
        pages_by_module[mod] = {
            "count": len(pages),
            "pages": pages
        }
    
    result = {
        "summary": {
            "total_api_functions": total_api,
            "total_routes": total_routes,
            "total_page_files": total_pages,
            "api_modules_count": len(api_modules),
            "route_modules_count": len(route_modules),
            "page_modules_count": len(page_modules)
        },
        "api_by_module": api_by_module,
        "routes_by_module": routes_by_module,
        "pages_by_module": pages_by_module
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {OUTPUT_FILE}")
    print(f"\n=== 统计摘要 ===")
    print(f"API 函数总数: {total_api}")
    print(f"页面路由总数: {total_routes}")
    print(f"页面文件总数: {total_pages}")
    
    print(f"\n=== API 按模块统计 (Top 15) ===")
    sorted_api = sorted(api_by_module.items(), key=lambda x: -x[1]["count"])
    for mod, data in sorted_api[:15]:
        print(f"  {mod}: {data['count']} 个")
    
    print(f"\n=== 路由按模块统计 (Top 15) ===")
    sorted_routes = sorted(routes_by_module.items(), key=lambda x: -x[1]["count"])
    for mod, data in sorted_routes[:15]:
        print(f"  {mod}: {data['count']} 个")
    
    print(f"\n=== 页面按模块统计 (Top 15) ===")
    sorted_pages = sorted(pages_by_module.items(), key=lambda x: -x[1]["count"])
    for mod, data in sorted_pages[:15]:
        print(f"  {mod}: {data['count']} 个")


if __name__ == "__main__":
    main()
