#!/usr/bin/env python3
"""
后端 API 路径扫描与唯一性检查工具
扫描所有 Rust 后端服务的路由定义，建立 API 路径注册表
"""

import os
import re
import json
from collections import defaultdict

SVC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "svc")
SVC_DIR = os.path.normpath(SVC_DIR)

# 匹配 Rust Axum 路由定义的正则
ROUTE_PATTERNS = [
    # .route("/path", get(handler)) 或 .route("/path", post(handler)) 等
    re.compile(r'\.route\(\s*["\']([^"\']+)["\']\s*,\s*(get|post|put|delete|patch|head|options)\s*\('),
    # Router::new().route("/path", ...)
    re.compile(r'route\(\s*["\'](/[^"\']+)["\']\s*,'),
    # axum 的 routing::get, routing::post 等直接挂载
    re.compile(r'(get|post|put|delete|patch)\(\s*["\'](/[^"\']+)["\']'),
]

# 匹配服务端口
PORT_PATTERNS = [
    re.compile(r'SERVER_PORT\s*[:=]\s*(\d+)'),
    re.compile(r'server_port\s*[:=]\s*(\d+)'),
    re.compile(r'bind\([^,]*?(\d{4,5})\)'),
]

def find_rust_files(base_dir):
    """查找所有 Rust 源文件"""
    rust_files = []
    for root, dirs, files in os.walk(base_dir):
        # 跳过 target 目录
        if 'target' in dirs:
            dirs.remove('target')
        for f in files:
            if f.endswith('.rs'):
                rust_files.append(os.path.join(root, f))
    return rust_files

def extract_routes(file_path):
    """从文件中提取路由路径"""
    routes = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        return routes
    
    for pattern in ROUTE_PATTERNS:
        for match in pattern.finditer(content):
            groups = match.groups()
            if len(groups) == 2:
                path = groups[0]
                method = groups[1].upper()
            else:
                path = groups[0] if groups[0].startswith('/') else groups[1]
                method = 'GET'
            
            # 过滤掉明显不是 API 路径的
            if path.startswith('/') and len(path) > 1:
                routes.append({
                    'path': path,
                    'method': method,
                    'file': file_path,
                })
    
    return routes

def extract_service_port(service_dir):
    """尝试提取服务端口"""
    main_rs = os.path.join(service_dir, 'src', 'main.rs')
    if not os.path.exists(main_rs):
        return None
    
    try:
        with open(main_rs, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        return None
    
    for pattern in PORT_PATTERNS:
        match = pattern.search(content)
        if match:
            return int(match.group(1))
    
    return None

def scan_all_services():
    """扫描所有服务"""
    services = {}
    
    if not os.path.isdir(SVC_DIR):
        print(f"Error: {SVC_DIR} not found")
        return services
    
    for entry in sorted(os.listdir(SVC_DIR)):
        service_dir = os.path.join(SVC_DIR, entry)
        if not os.path.isdir(service_dir):
            continue
        
        # 检查是否是 Rust 服务
        cargo_toml = os.path.join(service_dir, 'Cargo.toml')
        if not os.path.exists(cargo_toml):
            continue
        
        src_dir = os.path.join(service_dir, 'src')
        if not os.path.isdir(src_dir):
            continue
        
        print(f"\nScanning service: {entry}")
        
        rust_files = find_rust_files(src_dir)
        all_routes = []
        
        for rf in rust_files:
            routes = extract_routes(rf)
            all_routes.extend(routes)
        
        port = extract_service_port(service_dir)
        
        services[entry] = {
            'dir': service_dir,
            'port': port,
            'routes': all_routes,
            'route_count': len(all_routes),
        }
        
        print(f"  Found {len(all_routes)} routes in {len(rust_files)} files")
        if port:
            print(f"  Port: {port}")
    
    return services

def check_duplicate_paths(services):
    """检查重复的 API 路径（同一服务内）"""
    duplicates = []
    
    for service_name, service_data in services.items():
        path_map = defaultdict(list)
        
        for route in service_data['routes']:
            key = f"{route['method']}:{route['path']}"
            path_map[key].append(route)
        
        for key, route_list in path_map.items():
            if len(route_list) > 1:
                duplicates.append({
                    'service': service_name,
                    'method_path': key,
                    'count': len(route_list),
                    'locations': [r['file'] for r in route_list],
                })
    
    return duplicates

def normalize_path(path):
    """标准化路径，将参数部分替换为 :param"""
    # 替换 {id} 或 :id 形式的参数
    normalized = re.sub(r'[{:][^}/]+[}]?', ':param', path)
    return normalized

def check_cross_service_duplicates(services):
    """检查跨服务的路径重复（路径模式相同）"""
    all_paths = defaultdict(list)
    
    for service_name, service_data in services.items():
        for route in service_data['routes']:
            normalized = normalize_path(route['path'])
            key = f"{route['method']}:{normalized}"
            all_paths[key].append({
                'service': service_name,
                'path': route['path'],
                'file': route['file'],
            })
    
    duplicates = []
    for key, entries in all_paths.items():
        services_involved = set(e['service'] for e in entries)
        if len(services_involved) > 1:
            duplicates.append({
                'method_path': key,
                'services': list(services_involved),
                'details': entries,
            })
    
    return duplicates

def main():
    print("=" * 60)
    print("TOPEMS Backend API Path Scanner")
    print("=" * 60)
    
    services = scan_all_services()
    
    total_routes = sum(s['route_count'] for s in services.values())
    print(f"\n{'=' * 60}")
    print(f"Total services: {len(services)}")
    print(f"Total routes found: {total_routes}")
    
    # 检查服务内重复
    print(f"\n{'=' * 60}")
    print("Checking for duplicate routes within each service...")
    intra_duplicates = check_duplicate_paths(services)
    
    if intra_duplicates:
        print(f"\nFound {len(intra_duplicates)} duplicate routes within services:")
        for dup in intra_duplicates:
            print(f"\n  [{dup['service']}] {dup['method_path']} ({dup['count']} occurrences)")
            for loc in dup['locations']:
                print(f"    - {loc}")
    else:
        print("  No duplicate routes found within services.")
    
    # 检查跨服务重复
    print(f"\n{'=' * 60}")
    print("Checking for cross-service path duplicates...")
    cross_duplicates = check_cross_service_duplicates(services)
    
    if cross_duplicates:
        print(f"\nFound {len(cross_duplicates)} path patterns used across multiple services:")
        for dup in sorted(cross_duplicates, key=lambda x: len(x['services']), reverse=True)[:20]:
            print(f"\n  {dup['method_path']}")
            print(f"  Services: {', '.join(dup['services'])}")
            for d in dup['details'][:3]:
                print(f"    - {d['service']}: {d['path']} ({d['file']})")
    else:
        print("  No cross-service path duplicates found.")
    
    # 输出详细的路径注册表
    print(f"\n{'=' * 60}")
    print("Generating API path registry...")
    
    registry = {}
    for service_name, service_data in sorted(services.items()):
        paths = set()
        for route in service_data['routes']:
            paths.add(f"{route['method']}:{route['path']}")
        
        registry[service_name] = {
            'port': service_data['port'],
            'routes': sorted(list(paths)),
            'count': len(paths),
        }
    
    # 保存为 JSON
    output_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'api_path_registry.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)
    
    print(f"\nAPI path registry saved to: {output_file}")
    
    # 打印每个服务的路由数量统计
    print(f"\n{'=' * 60}")
    print("Route count per service:")
    for name, data in sorted(registry.items(), key=lambda x: x[1]['count'], reverse=True):
        port_str = f":{data['port']}" if data['port'] else ""
        print(f"  {name:20s} {data['count']:4d} routes{port_str}")

if __name__ == '__main__':
    main()
