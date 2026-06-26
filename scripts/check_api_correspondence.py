#!/usr/bin/env python3
"""
前后端 API 对应验证工具
扫描前端 API 调用和后端路由定义，验证对应关系
"""

import os
import re
import json
from collections import defaultdict

FRONTEND_API_DIR = "/Users/xingzhai/TOPEMS/apps/web/src/api"
BACKEND_SVC_DIR = "/Users/xingzhai/TOPEMS/svc"

# 前端 API 调用模式
FRONTEND_API_PATTERNS = [
    # apiClient.crm.get('/api/crm/customers')
    re.compile(r'apiClient\.(\w+)\.(get|post|put|delete|patch)\(\s*[`"\'](/[^`"\']+)[`"\']'),
    # apiClient.get('/api/xxx') - 直接调用
    re.compile(r'apiClient\.(get|post|put|delete|patch)\(\s*[`"\'](/[^`"\']+)[`"\']'),
    # 模板字符串形式
    re.compile(r'apiClient\.(\w+)\.(get|post|put|delete|patch)\(\s*`(/[^`]+)`'),
]

# 后端路由模式
BACKEND_ROUTE_PATTERNS = [
    re.compile(r'\.route\(\s*["\']([^"\']+)["\']\s*,\s*(get|post|put|delete|patch)\s*\('),
]

def scan_frontend_apis():
    """扫描前端 API 调用"""
    api_calls = []
    
    if not os.path.isdir(FRONTEND_API_DIR):
        print(f"Error: {FRONTEND_API_DIR} not found")
        return api_calls
    
    for root, dirs, files in os.walk(FRONTEND_API_DIR):
        for f in files:
            if not (f.endswith('.ts') or f.endswith('.tsx')):
                continue
            
            file_path = os.path.join(root, f)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
            except:
                continue
            
            for pattern in FRONTEND_API_PATTERNS:
                for match in pattern.finditer(content):
                    groups = match.groups()
                    
                    if len(groups) == 3:
                        service = groups[0]
                        method = groups[1].upper()
                        path = groups[2]
                    elif len(groups) == 2:
                        service = 'unknown'
                        method = groups[0].upper()
                        path = groups[1]
                    else:
                        continue
                    
                    # 从路径中提取服务名
                    path_service = extract_service_from_path(path)
                    
                    api_calls.append({
                        'service': service if service != 'unknown' else path_service,
                        'path_service': path_service,
                        'method': method,
                        'path': path,
                        'file': file_path,
                    })
    
    return api_calls

def extract_service_from_path(path):
    """从 API 路径中提取服务名"""
    parts = path.strip('/').split('/')
    if len(parts) >= 2 and parts[0] == 'api':
        return parts[1]
    return 'unknown'

def scan_backend_routes():
    """扫描后端路由"""
    backend_routes = defaultdict(list)
    
    if not os.path.isdir(BACKEND_SVC_DIR):
        print(f"Error: {BACKEND_SVC_DIR} not found")
        return backend_routes
    
    for entry in sorted(os.listdir(BACKEND_SVC_DIR)):
        service_dir = os.path.join(BACKEND_SVC_DIR, entry)
        if not os.path.isdir(service_dir):
            continue
        
        cargo_toml = os.path.join(service_dir, 'Cargo.toml')
        if not os.path.exists(cargo_toml):
            continue
        
        src_dir = os.path.join(service_dir, 'src')
        if not os.path.isdir(src_dir):
            continue
        
        for root, dirs, files in os.walk(src_dir):
            if 'target' in dirs:
                dirs.remove('target')
            
            for f in files:
                if not f.endswith('.rs'):
                    continue
                
                file_path = os.path.join(root, f)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                        content = fp.read()
                except:
                    continue
                
                for pattern in BACKEND_ROUTE_PATTERNS:
                    for match in pattern.finditer(content):
                        path = match.group(1)
                        method = match.group(2).upper()
                        
                        if path.startswith('/') and len(path) > 1:
                            backend_routes[entry].append({
                                'method': method,
                                'path': path,
                                'file': file_path,
                            })
    
    return backend_routes

def normalize_path(path):
    """标准化路径用于比较"""
    # 替换前端 :id 形式和后端 {id} 形式为 :param
    normalized = re.sub(r'[{:][^}/]+[}]?', ':param', path)
    # 移除末尾斜杠
    normalized = normalized.rstrip('/')
    return normalized

def check_correspondence(frontend_apis, backend_routes):
    """检查前后端 API 对应关系"""
    results = {
        'matched': [],
        'frontend_only': [],
        'backend_only': [],
        'service_mismatch': [],
    }
    
    # 构建后端路由索引
    backend_index = {}
    for service, routes in backend_routes.items():
        for route in routes:
            key = f"{route['method']}:{normalize_path(route['path'])}"
            if key not in backend_index:
                backend_index[key] = []
            backend_index[key].append({
                'service': service,
                'path': route['path'],
                'file': route['file'],
            })
    
    # 检查前端 API 是否有后端对应
    seen_frontend = set()
    for api in frontend_apis:
        key = f"{api['method']}:{normalize_path(api['path'])}"
        
        if key in seen_frontend:
            continue
        seen_frontend.add(key)
        
        if key in backend_index:
            backend_entries = backend_index[key]
            backend_services = set(e['service'] for e in backend_entries)
            
            results['matched'].append({
                'key': key,
                'frontend_service': api['service'],
                'backend_services': list(backend_services),
                'frontend_path': api['path'],
                'backend_paths': [e['path'] for e in backend_entries],
                'frontend_file': api['file'],
                'backend_files': [e['file'] for e in backend_entries],
            })
            
            # 检查服务名是否匹配
            if api['service'] not in backend_services and api['service'] != 'unknown':
                results['service_mismatch'].append({
                    'key': key,
                    'frontend_service': api['service'],
                    'backend_services': list(backend_services),
                    'frontend_file': api['file'],
                })
        else:
            results['frontend_only'].append({
                'key': key,
                'service': api['service'],
                'path': api['path'],
                'file': api['file'],
            })
    
    # 检查后端 API 是否有前端调用
    seen_backend = set()
    for service, routes in backend_routes.items():
        for route in routes:
            key = f"{route['method']}:{normalize_path(route['path'])}"
            
            if key in seen_backend:
                continue
            seen_backend.add(key)
            
            # 跳过健康检查、插件等基础路由
            if any(skip in key for skip in ['/health', '/metrics', '/plugins/', '/api-docs', '/api/info', '/api$']):
                continue
            
            # 检查是否在前端有匹配
            found = False
            for api in frontend_apis:
                fe_key = f"{api['method']}:{normalize_path(api['path'])}"
                if fe_key == key:
                    found = True
                    break
            
            if not found:
                results['backend_only'].append({
                    'key': key,
                    'service': service,
                    'path': route['path'],
                    'file': route['file'],
                })
    
    return results

def main():
    print("=" * 70)
    print("TOPEMS Frontend-Backend API Correspondence Checker")
    print("=" * 70)
    
    # 扫描前端 API
    print("\n[1/3] Scanning frontend API calls...")
    frontend_apis = scan_frontend_apis()
    print(f"  Found {len(frontend_apis)} API calls in frontend")
    
    # 扫描后端路由
    print("\n[2/3] Scanning backend routes...")
    backend_routes = scan_backend_routes()
    total_backend = sum(len(r) for r in backend_routes.values())
    print(f"  Found {total_backend} routes across {len(backend_routes)} services")
    
    # 检查对应关系
    print("\n[3/3] Checking correspondence...")
    results = check_correspondence(frontend_apis, backend_routes)
    
    # 输出结果
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    print(f"  Matched APIs:      {len(results['matched'])}")
    print(f"  Frontend-only:     {len(results['frontend_only'])}")
    print(f"  Backend-only:      {len(results['backend_only'])}")
    print(f"  Service mismatch:  {len(results['service_mismatch'])}")
    
    # 前端有但后端没有的 API
    if results['frontend_only']:
        print(f"\n{'=' * 70}")
        print("FRONTEND APIs WITHOUT BACKEND CORRESPONDENCE")
        print(f"{'=' * 70}")
        for item in sorted(results['frontend_only'], key=lambda x: x['key'])[:30]:
            print(f"\n  {item['key']}")
            print(f"    Service: {item['service']}")
            print(f"    File: {item['file']}")
        
        if len(results['frontend_only']) > 30:
            print(f"\n  ... and {len(results['frontend_only']) - 30} more")
    
    # 服务名不匹配
    if results['service_mismatch']:
        print(f"\n{'=' * 70}")
        print("SERVICE NAME MISMATCH")
        print(f"{'=' * 70}")
        for item in sorted(results['service_mismatch'], key=lambda x: x['key'])[:20]:
            print(f"\n  {item['key']}")
            print(f"    Frontend service: {item['frontend_service']}")
            print(f"    Backend services: {', '.join(item['backend_services'])}")
            print(f"    Frontend file: {item['frontend_file']}")
    
    # 保存详细结果
    output_file = os.path.join(os.path.dirname(__file__), 'api_correspondence_report.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        # 转换为可序列化格式
        serializable = {
            'summary': {
                'matched': len(results['matched']),
                'frontend_only': len(results['frontend_only']),
                'backend_only': len(results['backend_only']),
                'service_mismatch': len(results['service_mismatch']),
            },
            'frontend_only': results['frontend_only'][:100],
            'service_mismatch': results['service_mismatch'][:50],
            'backend_only_sample': results['backend_only'][:100],
        }
        json.dump(serializable, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'=' * 70}")
    print(f"Detailed report saved to: {output_file}")
    
    # 按服务统计前端 API 调用
    print(f"\n{'=' * 70}")
    print("FRONTEND API CALLS BY SERVICE")
    print(f"{'=' * 70}")
    service_counts = defaultdict(int)
    for api in frontend_apis:
        service_counts[api['service']] += 1
    
    for service, count in sorted(service_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {service:15s}: {count:4d} calls")

if __name__ == '__main__':
    main()
