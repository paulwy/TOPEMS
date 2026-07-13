#!/usr/bin/env python3
import os
import re
import json
from pathlib import Path

API_DIR = Path("/Users/air/TOPEMS/apps/web/src/api")
SVC_DIR = Path("/Users/air/TOPEMS/svc")

SERVICE_MAP = {
    'ai': 'ai',
    'crm': 'crm',
    'doc': 'doc',
    'ehs': 'ehs',
    'erp': 'erp',
    'finance': 'finance',
    'gis': 'gis',
    'hrm': 'hrm',
    'iam': 'unified-core',
    'im': 'unified-core',
    'integration': 'integration',
    'lims': 'lims',
    'mail': 'unified-core',
    'mes': 'mes',
    'mobile': 'mobile',
    'monitor': 'monitor',
    'notification': 'unified-core',
    'pdm': 'pdm',
    'pm': 'pm',
    'qms': 'qms',
    'report': 'report',
    'rs': 'rs',
    'scm': 'scm',
    'srm': 'srm',
    'system': 'unified-core',
    'wms': 'wms',
    'workflow': 'unified-core',
    'file': 'unified-core',
    'bi': 'analytics',
    'migration': 'unified-core',
}

HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']

def extract_frontend_endpoints(api_dir: Path) -> dict:
    """从前端API文件中提取所有API端点"""
    endpoints = {}
    
    for service_name in SERVICE_MAP.keys():
        endpoints[service_name] = []
    
    ts_files = sorted(api_dir.rglob("*.ts"))
    
    for ts_file in ts_files:
        if ts_file.name.startswith('_'):
            continue
        
        try:
            content = ts_file.read_text(encoding="utf-8")
        except:
            continue
        
        for service_name in SERVICE_MAP.keys():
            for method in HTTP_METHODS:
                pattern = rf'apiClient\.{service_name}\.{method}\s*\(\s*["\']([^"\']+)["\']'
                for match in re.finditer(pattern, content):
                    path = match.group(1)
                    endpoints[service_name].append({
                        'method': method.upper(),
                        'path': path,
                        'file': str(ts_file.relative_to(api_dir))
                    })
    
    for service in endpoints:
        seen = set()
        unique = []
        for ep in endpoints[service]:
            key = (ep['method'], ep['path'])
            if key not in seen:
                seen.add(key)
                unique.append(ep)
        endpoints[service] = unique
    
    return endpoints

def load_backend_routes(json_path: Path) -> dict:
    """加载后端路由提取结果"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize_path(path: str) -> str:
    """规范化路径，去除查询参数"""
    if '?' in path:
        path = path.split('?')[0]
    return path.strip()

def match_route(frontend_path: str, backend_path: str) -> bool:
    """匹配前端路径和后端路径（支持通配符参数）"""
    frontend_parts = frontend_path.strip('/').split('/')
    backend_parts = backend_path.strip('/').split('/')
    
    if len(frontend_parts) != len(backend_parts):
        return False
    
    for f_part, b_part in zip(frontend_parts, backend_parts):
        if b_part.startswith('{') and b_part.endswith('}'):
            continue
        if f_part != b_part:
            return False
    
    return True

def analyze_gaps(frontend_endpoints: dict, backend_routes: dict) -> dict:
    """分析前端有定义但后端缺失的API端点"""
    gaps = {}
    
    for frontend_service, endpoints in frontend_endpoints.items():
        backend_service = SERVICE_MAP.get(frontend_service)
        
        if not backend_service:
            continue
        
        backend_service_data = backend_routes.get(backend_service, {})
        backend_routes_list = backend_service_data.get('routes', [])
        
        missing = []
        for ep in endpoints:
            path = normalize_path(ep['path'])
            method = ep['method']
            
            found = False
            for route in backend_routes_list:
                backend_path = route['path']
                
                if match_route(path, backend_path):
                    for m in route['methods']:
                        if m['method'] == method:
                            found = True
                            break
                    if found:
                        break
            
            if not found:
                missing.append({
                    'method': method,
                    'path': path,
                    'frontend_file': ep['file'],
                    'backend_service': backend_service
                })
        
        if missing:
            gaps[frontend_service] = missing
    
    return gaps

def generate_report(gaps: dict) -> str:
    """生成对齐差距报告"""
    lines = []
    lines.append("# TOPEMS 前后端 API 对齐差距报告")
    lines.append("")
    
    total_missing = sum(len(v) for v in gaps.values())
    lines.append(f"**总计**: {len(gaps)} 个服务存在差距, {total_missing} 个前端API端点后端缺失")
    lines.append("")
    
    lines.append("## 服务差距概览")
    lines.append("")
    lines.append("| 前端服务 | 后端服务 | 缺失端点数 |")
    lines.append("|----------|----------|------------|")
    
    for service in sorted(gaps.keys(), key=lambda x: len(gaps[x]), reverse=True):
        count = len(gaps[service])
        backend_service = SERVICE_MAP.get(service, 'unknown')
        lines.append(f"| {service} | {backend_service} | {count} |")
    
    lines.append("")
    
    for service in sorted(gaps.keys(), key=lambda x: len(gaps[x]), reverse=True):
        missing = gaps[service]
        lines.append(f"## {service} 服务差距详情")
        lines.append("")
        lines.append(f"- **后端服务**: {SERVICE_MAP.get(service)}")
        lines.append(f"- **缺失端点数**: {len(missing)}")
        lines.append("")
        
        if not missing:
            continue
        
        lines.append("| 方法 | 路径 | 前端文件 |")
        lines.append("|------|------|----------|")
        
        for ep in sorted(missing, key=lambda x: (x['method'], x['path'])):
            lines.append(f"| {ep['method']} | `{ep['path']}` | {ep['frontend_file']} |")
        
        lines.append("")
    
    return "\n".join(lines)

def main():
    print("=== TOPEMS 前后端 API 对齐差距分析 ===")
    print("")
    
    print("1. 提取前端API端点...")
    frontend_endpoints = extract_frontend_endpoints(API_DIR)
    
    total_frontend = sum(len(v) for v in frontend_endpoints.values())
    print(f"   前端API端点总数: {total_frontend}")
    print("")
    
    print("2. 加载后端路由...")
    routes_json = SVC_DIR / "routes_extracted.json"
    if not routes_json.exists():
        print(f"   错误: 未找到 {routes_json}")
        print(f"   请先运行: python3 {SVC_DIR / 'extract_routes.py'}")
        return
    
    backend_routes = load_backend_routes(routes_json)
    
    total_backend = sum(
        sum(len(r['methods']) for r in svc['routes'])
        for svc in backend_routes.values()
    )
    print(f"   后端路由端点总数: {total_backend}")
    print("")
    
    print("3. 分析差距...")
    gaps = analyze_gaps(frontend_endpoints, backend_routes)
    print("")
    
    print("4. 生成报告...")
    report = generate_report(gaps)
    
    report_path = API_DIR / "_api_alignment_report.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"   报告已保存到: {report_path}")
    print("")
    
    print("=== 分析完成 ===")
    print(report[:3000])

if __name__ == "__main__":
    main()
