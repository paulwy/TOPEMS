#!/usr/bin/env python3
import os
import re
import json
from pathlib import Path

SVC_DIR = Path("/Users/air/TOPEMS/svc")

# 需要扫描的服务目录
SERVICES = [
    "ai", "analytics", "crm", "ehs", "erp", "finance", "gis", "hrm",
    "integration", "lims", "mes", "migration-sdk", "mobile", "monitor", "pdm",
    "pm", "portal", "qms", "report", "rs", "scm", "shared", "srm",
    "unified-core", "wms"
]

HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"]

def find_rs_files(service_dir: Path) -> list[Path]:
    """查找服务下所有 .rs 文件"""
    src_dir = service_dir / "src"
    if src_dir.exists():
        return sorted(src_dir.rglob("*.rs"))
    return []

def extract_routes_from_file(file_path: Path) -> list[dict]:
    """从单个 Rust 文件中提取路由"""
    routes = []
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  读取文件失败 {file_path}: {e}")
        return routes
    
    lines = content.split("\n")
    
    # 匹配 .route("path", ...) 格式，支持多行
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 查找 .route( 调用
        route_match = re.search(r'\.route\(\s*["\']([^"\']+)["\']', line)
        if route_match:
            path = route_match.group(1)
            
            # 收集从当前行开始，到匹配的右括号为止的所有内容
            depth = 0
            started = False
            method_block = ""
            j = i
            
            while j < len(lines):
                current_line = lines[j]
                for ch in current_line:
                    if ch == '(':
                        depth += 1
                        started = True
                    elif ch == ')':
                        depth -= 1
                
                if j == i:
                    # 第一行，去掉 .route("path", 部分
                    idx = current_line.find('.route(')
                    if idx >= 0:
                        rest = current_line[idx:]
                        comma_idx = rest.find(',')
                        if comma_idx >= 0:
                            method_block += rest[comma_idx+1:]
                else:
                    method_block += " " + current_line.strip()
                
                if started and depth <= 0:
                    break
                j += 1
            
            # 从 method_block 中提取 HTTP 方法和处理函数
            methods = []
            # 匹配多种形式：
            # 1. get(func)
            # 2. axum::routing::get(func)
            # 3. get(module::func)
            # 4. get(module::submod::func)
            for method in HTTP_METHODS:
                # 支持可选的前缀 (axum::routing:: 或 routing::)
                pattern = rf'\b(?:axum::routing::|routing::)?{method}\(\s*([a-zA-Z_][a-zA-Z0-9_]*(?:::[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\)'
                for m in re.finditer(pattern, method_block):
                    handler = m.group(1)
                    methods.append({
                        "method": method.upper(),
                        "handler": handler
                    })
            
            if methods:
                # 计算相对路径
                try:
                    rel_path = str(file_path.relative_to(SVC_DIR))
                except ValueError:
                    rel_path = str(file_path)
                
                module_name = file_path.stem
                routes.append({
                    "path": path,
                    "methods": methods,
                    "file": rel_path,
                    "module": module_name,
                    "line": i + 1
                })
            
            i = j + 1
        else:
            i += 1
    
    return routes

def scan_service(service_name: str) -> dict:
    """扫描单个服务的所有路由"""
    service_dir = SVC_DIR / service_name
    if not service_dir.exists():
        return {"service": service_name, "routes": [], "error": "目录不存在"}
    
    rs_files = find_rs_files(service_dir)
    if not rs_files:
        return {"service": service_name, "routes": [], "error": "未找到 Rust 文件"}
    
    all_routes = []
    for file_path in rs_files:
        routes = extract_routes_from_file(file_path)
        all_routes.extend(routes)
    
    return {
        "service": service_name,
        "routes": all_routes,
        "file_count": len(rs_files)
    }

def generate_markdown(results: dict) -> str:
    """生成 Markdown 格式的报告"""
    lines = []
    lines.append("# TOPEMS 后端服务 API 路由端点清单\n")
    
    total_endpoints = 0
    total_routes = 0
    for svc, data in results.items():
        total_routes += len(data["routes"])
        for r in data["routes"]:
            total_endpoints += len(r["methods"])
    
    lines.append(f"**总计**: {len(results)} 个服务, {total_routes} 个路由路径, {total_endpoints} 个端点\n")
    
    for service_name in sorted(results.keys()):
        data = results[service_name]
        route_count = len(data["routes"])
        endpoint_count = sum(len(r["methods"]) for r in data["routes"])
        
        lines.append(f"\n## {service_name} 服务\n")
        lines.append(f"- **路由路径数**: {route_count}")
        lines.append(f"- **端点数**: {endpoint_count}")
        lines.append(f"- **扫描文件数**: {data.get('file_count', 0)}\n")
        
        if data.get("error"):
            lines.append(f"> ⚠️ {data['error']}\n")
        
        if not data["routes"]:
            continue
        
        lines.append("| 方法 | 路径 | 处理函数 | 模块/文件 |")
        lines.append("|------|------|----------|-----------|")
        
        # 按路径排序
        sorted_routes = sorted(data["routes"], key=lambda x: x["path"])
        
        for route in sorted_routes:
            for i, m in enumerate(route["methods"]):
                file_short = route["file"].replace(f"{service_name}/src/", "")
                if i == 0:
                    lines.append(f"| {m['method']} | `{route['path']}` | `{m['handler']}` | {file_short}:{route['line']} |")
                else:
                    lines.append(f"| {m['method']} | `{route['path']}` | `{m['handler']}` | |")
    
    return "\n".join(lines)

def main():
    results = {}
    
    for service in SERVICES:
        print(f"扫描服务: {service}")
        result = scan_service(service)
        results[service] = result
        route_count = len(result["routes"])
        endpoint_count = sum(len(r["methods"]) for r in result["routes"])
        print(f"  文件数: {result.get('file_count', 0)}, 路由路径: {route_count}, 端点: {endpoint_count}")
        if result.get("error"):
            print(f"  注意: {result['error']}")
    
    # 输出 JSON
    output_json = SVC_DIR / "routes_extracted.json"
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nJSON 结果已保存到: {output_json}")
    
    # 输出 Markdown
    output_md = SVC_DIR / "routes_extracted.md"
    md_content = generate_markdown(results)
    with open(output_md, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Markdown 报告已保存到: {output_md}")
    
    # 统计总数
    total_endpoints = 0
    total_routes = 0
    for svc, data in results.items():
        total_routes += len(data["routes"])
        for r in data["routes"]:
            total_endpoints += len(r["methods"])
    
    print(f"\n总计: {len(results)} 个服务, {total_routes} 个路由路径, {total_endpoints} 个端点")

if __name__ == "__main__":
    main()
