#!/usr/bin/env python3
"""
后端API vs 前端功能 对比分析
找出后端有但前端缺失的页面和功能模块
"""

import json
from collections import defaultdict

# 25个后端服务模块
BACKEND_MODULES = [
    'unified-core', 'analytics', 'qms', 'ehs', 'ai', 'wms',
    'quality-assurance', 'lims', 'pdm', 'manufacturing', 'mes',
    'erp', 'crm', 'rs', 'mobile', 'integration', 'pm', 'scm',
    'hrm', 'monitor', 'report', 'gis', 'shared', 'srm', 'config-center'
]

def load_data():
    """加载数据"""
    with open('svc/routes_extracted.json', 'r') as f:
        backend = json.load(f)
    with open('frontend_analysis.json', 'r') as f:
        frontend = json.load(f)
    return backend, frontend

def analyze_backend_module(module_name, module_data):
    """分析后端单个模块的API"""
    routes = module_data.get('routes', [])
    api_routes = [r for r in routes if r['path'].startswith('/api/')]
    
    # 按子模块分组
    sub_modules = defaultdict(list)
    for route in api_routes:
        path = route['path']
        parts = path.strip('/').split('/')
        # 提取子模块名 (通常是第3或第4段)
        if len(parts) >= 3:
            sub_mod = parts[2]
        else:
            sub_mod = 'root'
        sub_modules[sub_mod].append(route)
    
    return {
        'total_api_routes': len(api_routes),
        'sub_modules': dict(sub_modules),
        'all_routes': api_routes
    }

def get_frontend_module_name(backend_module):
    """
    后端模块名到前端模块名的映射
    有些模块名在前后端可能不同
    """
    mapping = {
        'unified-core': ['iam', 'admin', 'system'],
        'analytics': ['bi'],
        'quality-assurance': ['qms'],
        'manufacturing': ['mes', 'production'],
        'config-center': ['system', 'admin'],
        'shared': ['common', 'shared'],
    }
    return mapping.get(backend_module, [backend_module])

def get_frontend_stats(frontend, backend_module):
    """获取前端对某个后端模块的统计数据"""
    possible_names = get_frontend_module_name(backend_module)
    
    api_count = 0
    route_count = 0
    page_count = 0
    api_functions = []
    routes = []
    pages = []
    
    for name in possible_names:
        if name in frontend['api_by_module']:
            mod = frontend['api_by_module'][name]
            api_count += mod.get('count', len(mod.get('functions', [])))
            api_functions.extend(mod.get('functions', []))
        
        if name in frontend['routes_by_module']:
            mod = frontend['routes_by_module'][name]
            if isinstance(mod, dict):
                route_count += mod.get('count', 0)
                routes.extend(mod.get('routes', []))
            elif isinstance(mod, list):
                route_count += len(mod)
                routes.extend(mod)
        
        if name in frontend['pages_by_module']:
            mod = frontend['pages_by_module'][name]
            if isinstance(mod, dict):
                page_count += mod.get('count', 0)
                pages.extend(mod.get('pages', []))
            elif isinstance(mod, list):
                page_count += len(mod)
                pages.extend(mod)
    
    return {
        'api_count': api_count,
        'route_count': route_count,
        'page_count': page_count,
        'api_functions': api_functions,
        'routes': routes,
        'pages': pages,
        'matched_names': possible_names
    }

def extract_main_features(backend_analysis, frontend_stats):
    """提取主要功能并对比缺失"""
    sub_modules = backend_analysis['sub_modules']
    
    features = []
    for sub_mod, routes in sorted(sub_modules.items(), key=lambda x: -len(x[1])):
        # 判断前端是否有对应功能
        has_frontend = False
        matching_apis = []
        
        # 简单匹配：检查前端API路径中是否包含子模块名
        for api_func in frontend_stats['api_functions']:
            api_path = api_func.get('path', '')
            if sub_mod in api_path.lower():
                matching_apis.append(api_func)
                has_frontend = True
        
        # 检查路由和页面
        has_route = any(sub_mod.lower() in r.get('path', '').lower() 
                       for r in frontend_stats['routes'])
        has_page = any(sub_mod.lower() in p.get('component_name', '').lower() 
                      for p in frontend_stats['pages'])
        
        features.append({
            'name': sub_mod,
            'backend_api_count': len(routes),
            'frontend_api_count': len(matching_apis),
            'has_frontend_api': has_frontend,
            'has_route': has_route,
            'has_page': has_page,
            'sample_routes': [r['path'] for r in routes[:3]]
        })
    
    return features

def determine_severity(backend_api_count, frontend_page_count, frontend_api_count):
    """确定缺失严重程度"""
    if backend_api_count == 0:
        return '无API'
    
    # 完全缺失：前端没有页面 或 API覆盖率<20%
    if frontend_page_count == 0 or (frontend_api_count > 0 and frontend_api_count / max(backend_api_count, 1) < 0.2):
        return '完全缺失'
    
    # 部分缺失：API覆盖率 20%-70%
    ratio = frontend_api_count / max(backend_api_count, 1)
    if ratio < 0.7:
        return '部分缺失'
    
    return '基本完整'

def main():
    backend, frontend = load_data()
    
    print("=" * 100)
    print("后端API vs 前端功能 对比分析报告")
    print("=" * 100)
    
    # 总体统计
    total_backend_apis = 0
    total_frontend_apis = 0
    total_frontend_pages = 0
    total_frontend_routes = 0
    
    results = []
    
    for module in BACKEND_MODULES:
        if module not in backend:
            print(f"警告: 后端模块 {module} 不存在")
            continue
        
        backend_data = backend[module]
        backend_analysis = analyze_backend_module(module, backend_data)
        frontend_stats = get_frontend_stats(frontend, module)
        
        total_backend_apis += backend_analysis['total_api_routes']
        total_frontend_apis += frontend_stats['api_count']
        total_frontend_pages += frontend_stats['page_count']
        total_frontend_routes += frontend_stats['route_count']
        
        severity = determine_severity(
            backend_analysis['total_api_routes'],
            frontend_stats['page_count'],
            frontend_stats['api_count']
        )
        
        features = extract_main_features(backend_analysis, frontend_stats)
        
        results.append({
            'module': module,
            'backend_api_count': backend_analysis['total_api_routes'],
            'frontend_api_count': frontend_stats['api_count'],
            'frontend_route_count': frontend_stats['route_count'],
            'frontend_page_count': frontend_stats['page_count'],
            'severity': severity,
            'features': features,
            'frontend_matched_names': frontend_stats['matched_names'],
            'backend_analysis': backend_analysis,
            'frontend_stats': frontend_stats
        })
    
    # 按严重程度排序
    severity_order = {'完全缺失': 0, '部分缺失': 1, '基本完整': 2, '无API': 3}
    results.sort(key=lambda x: (severity_order[x['severity']], -x['backend_api_count']))
    
    # 输出总览
    print(f"\n【总体统计】")
    print(f"  后端总API路由数: {total_backend_apis}")
    print(f"  前端总API函数数: {total_frontend_apis}")
    print(f"  前端总路由数: {total_frontend_routes}")
    print(f"  前端总页面数: {total_frontend_pages}")
    
    # 对比总表
    print(f"\n{'='*100}")
    print("【后端模块 vs 前端模块 对比总表】")
    print(f"{'='*100}")
    print(f"{'模块名称':<20} {'后端API':>8} {'前端API':>8} {'前端路由':>8} {'前端页面':>8} {'状态':<10}")
    print("-" * 100)
    
    for r in results:
        status_icon = {
            '完全缺失': '🔴 完全缺失',
            '部分缺失': '🟡 部分缺失',
            '基本完整': '🟢 基本完整',
            '无API': '⚪ 无API'
        }.get(r['severity'], r['severity'])
        
        print(f"{r['module']:<20} {r['backend_api_count']:>8} {r['frontend_api_count']:>8} "
              f"{r['frontend_route_count']:>8} {r['frontend_page_count']:>8} {status_icon:<10}")
    
    # 完全缺失的模块
    print(f"\n{'='*100}")
    print("【完全缺失的模块列表】")
    print(f"{'='*100}")
    
    missing_modules = [r for r in results if r['severity'] == '完全缺失']
    for i, r in enumerate(missing_modules, 1):
        print(f"\n{i}. {r['module']} (后端API: {r['backend_api_count']}个)")
        print(f"   前端匹配模块: {', '.join(r['frontend_matched_names'])}")
        print(f"   前端API函数: {r['frontend_api_count']}个")
        print(f"   前端页面: {r['frontend_page_count']}个")
        print(f"   主要功能模块:")
        
        for feat in r['features'][:10]:
            status = '✓' if feat['has_frontend_api'] or feat['has_page'] else '✗'
            print(f"     {status} {feat['name']}: {feat['backend_api_count']}个API"
                  f" (前端API: {feat['frontend_api_count']}个)")
            if feat['sample_routes']:
                print(f"        示例: {feat['sample_routes'][0]}")
    
    # 部分缺失的模块
    print(f"\n{'='*100}")
    print("【部分缺失的模块列表】")
    print(f"{'='*100}")
    
    partial_modules = [r for r in results if r['severity'] == '部分缺失']
    for i, r in enumerate(partial_modules, 1):
        print(f"\n{i}. {r['module']} (后端API: {r['backend_api_count']}个, 前端API: {r['frontend_api_count']}个)")
        print(f"   前端匹配模块: {', '.join(r['frontend_matched_names'])}")
        print(f"   前端页面: {r['frontend_page_count']}个")
        print(f"   缺失的子功能:")
        
        missing_features = [f for f in r['features'] 
                          if not f['has_frontend_api'] and not f['has_page']]
        for feat in missing_features[:10]:
            print(f"     ✗ {feat['name']}: {feat['backend_api_count']}个API")
            if feat['sample_routes']:
                print(f"        示例: {feat['sample_routes'][0]}")
        
        if len(missing_features) > 10:
            print(f"     ... 还有 {len(missing_features) - 10} 个缺失子功能")
    
    # 基本完整的模块
    complete_modules = [r for r in results if r['severity'] == '基本完整']
    if complete_modules:
        print(f"\n{'='*100}")
        print("【基本完整的模块列表】")
        print(f"{'='*100}")
        for i, r in enumerate(complete_modules, 1):
            print(f"  {i}. {r['module']}: 后端API {r['backend_api_count']}个, 前端API {r['frontend_api_count']}个")
    
    # 建议优先级
    print(f"\n{'='*100}")
    print("【建议优先级】")
    print(f"{'='*100}")
    
    print("\n🔴 高优先级（完全缺失，后端API较多）:")
    high_priority = [r for r in missing_modules if r['backend_api_count'] >= 30]
    for r in high_priority:
        print(f"  - {r['module']}: {r['backend_api_count']}个API待实现")
    
    print("\n🟡 中优先级（完全缺失但API较少，或部分缺失但API很多）:")
    medium_priority = [r for r in missing_modules if r['backend_api_count'] < 30]
    medium_priority += [r for r in partial_modules if r['backend_api_count'] >= 100]
    for r in medium_priority:
        print(f"  - {r['module']}: {r['backend_api_count']}个API")
    
    print("\n🟢 低优先级（部分缺失且API较少）:")
    low_priority = [r for r in partial_modules if r['backend_api_count'] < 100]
    for r in low_priority:
        print(f"  - {r['module']}: {r['backend_api_count']}个API")
    
    # 保存详细结果到JSON
    output = {
        'summary': {
            'total_backend_apis': total_backend_apis,
            'total_frontend_apis': total_frontend_apis,
            'total_frontend_routes': total_frontend_routes,
            'total_frontend_pages': total_frontend_pages,
            'completely_missing_count': len(missing_modules),
            'partially_missing_count': len(partial_modules),
            'complete_count': len(complete_modules)
        },
        'completely_missing': [
            {
                'module': r['module'],
                'backend_api_count': r['backend_api_count'],
                'frontend_api_count': r['frontend_api_count'],
                'frontend_page_count': r['frontend_page_count'],
                'features': r['features']
            } for r in missing_modules
        ],
        'partially_missing': [
            {
                'module': r['module'],
                'backend_api_count': r['backend_api_count'],
                'frontend_api_count': r['frontend_api_count'],
                'frontend_page_count': r['frontend_page_count'],
                'missing_features': [f for f in r['features'] 
                                    if not f['has_frontend_api'] and not f['has_page']]
            } for r in partial_modules
        ],
        'complete_modules': [
            {
                'module': r['module'],
                'backend_api_count': r['backend_api_count'],
                'frontend_api_count': r['frontend_api_count']
            } for r in complete_modules
        ]
    }
    
    with open('backend_frontend_gap_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细分析结果已保存到: backend_frontend_gap_analysis.json")

if __name__ == '__main__':
    main()
