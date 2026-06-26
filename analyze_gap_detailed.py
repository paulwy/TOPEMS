#!/usr/bin/env python3
"""
后端API vs 前端功能 对比分析 - 改进版
更精确地映射前后端模块，分析缺失情况
"""

import json
from collections import defaultdict

BACKEND_MODULES = [
    'unified-core', 'analytics', 'qms', 'ehs', 'ai', 'wms',
    'quality-assurance', 'lims', 'pdm', 'manufacturing', 'mes',
    'erp', 'crm', 'rs', 'mobile', 'integration', 'pm', 'scm',
    'hrm', 'monitor', 'report', 'gis', 'shared', 'srm', 'config-center'
]

# 后端模块到前端模块的详细映射
# 格式: 后端模块 -> { 前端模块列表, API路径前缀映射 }
MODULE_MAPPING = {
    'unified-core': {
        'frontend_modules': ['iam', 'workflow', 'notification', 'doc', 'im', 'financial-report'],
        'description': '统一核心服务（IAM认证、工作流、通知、文档、即时通讯、财务）',
        'sub_systems': [
            {'name': 'IAM身份认证', 'prefix': 'api/core/iam', 'frontend': 'iam'},
            {'name': '工作流引擎', 'prefix': 'api/flow', 'frontend': 'workflow'},
            {'name': '通知系统', 'prefix': 'api/v1/notifications', 'frontend': 'notification'},
            {'name': '文档管理', 'prefix': 'api/core/doc', 'frontend': 'doc'},
            {'name': '即时通讯', 'prefix': 'api/core/comm', 'frontend': 'im'},
            {'name': '文件服务', 'prefix': 'api/core/file', 'frontend': 'doc'},
            {'name': '财务核心', 'prefix': 'api/core/finance', 'frontend': 'financial-report'},
            {'name': '插件系统', 'prefix': 'api/core/plugin', 'frontend': 'plugin'},
            {'name': '租户管理', 'prefix': 'api/core/tenant', 'frontend': 'admin'},
            {'name': '计费系统', 'prefix': 'api/core/billing', 'frontend': 'crm'},
            {'name': 'AI能力', 'prefix': 'api/core/ai', 'frontend': 'ai'},
            {'name': '同步服务', 'prefix': 'api/core/sync', 'frontend': 'integration'},
        ]
    },
    'analytics': {
        'frontend_modules': ['bi'],
        'description': 'BI分析与报表',
    },
    'qms': {
        'frontend_modules': ['qms'],
        'description': '质量管理系统',
    },
    'ehs': {
        'frontend_modules': ['ehs'],
        'description': '环境健康安全',
    },
    'ai': {
        'frontend_modules': ['ai'],
        'description': 'AI智能服务',
    },
    'wms': {
        'frontend_modules': ['wms'],
        'description': '仓储管理系统',
    },
    'quality-assurance': {
        'frontend_modules': ['qms'],
        'description': '质量保证',
    },
    'lims': {
        'frontend_modules': ['lims'],
        'description': '实验室信息管理',
    },
    'pdm': {
        'frontend_modules': ['pdm'],
        'description': '产品数据管理',
    },
    'manufacturing': {
        'frontend_modules': ['mes'],
        'description': '制造执行（生产管理）',
    },
    'mes': {
        'frontend_modules': ['mes'],
        'description': '制造执行系统',
    },
    'erp': {
        'frontend_modules': ['erp', 'addressbook', 'financial-report', 'voucher-template'],
        'description': '企业资源计划',
    },
    'crm': {
        'frontend_modules': ['crm'],
        'description': '客户关系管理',
    },
    'rs': {
        'frontend_modules': ['rs'],
        'description': '研发管理',
    },
    'mobile': {
        'frontend_modules': ['mobile'],
        'description': '移动端服务',
    },
    'integration': {
        'frontend_modules': ['integration'],
        'description': '集成中心',
    },
    'pm': {
        'frontend_modules': ['pm'],
        'description': '项目管理',
    },
    'scm': {
        'frontend_modules': ['scm'],
        'description': '供应链管理',
    },
    'hrm': {
        'frontend_modules': ['hrm', 'hrm-finance'],
        'description': '人力资源管理',
    },
    'monitor': {
        'frontend_modules': ['monitor'],
        'description': '监控告警',
    },
    'report': {
        'frontend_modules': ['report'],
        'description': '报表服务',
    },
    'gis': {
        'frontend_modules': ['gis'],
        'description': '地理信息系统',
    },
    'shared': {
        'frontend_modules': ['shared', 'common'],
        'description': '共享服务',
    },
    'srm': {
        'frontend_modules': ['srm'],
        'description': '供应商关系管理',
    },
    'config-center': {
        'frontend_modules': ['admin', 'system'],
        'description': '配置中心',
    },
}

def load_data():
    with open('svc/routes_extracted.json', 'r') as f:
        backend = json.load(f)
    with open('frontend_analysis.json', 'r') as f:
        frontend = json.load(f)
    return backend, frontend

def get_backend_api_by_prefix(backend_module, prefix):
    """获取后端指定前缀的API数量"""
    routes = backend_module.get('routes', [])
    api_routes = [r for r in routes if r['path'].startswith('/' + prefix) or r['path'].startswith(prefix)]
    return len(api_routes), api_routes

def get_frontend_api_count(frontend, module_names):
    """获取前端指定模块的API函数总数"""
    total = 0
    all_functions = []
    for name in module_names:
        if name in frontend['api_by_module']:
            mod = frontend['api_by_module'][name]
            total += mod.get('count', len(mod.get('functions', [])))
            all_functions.extend(mod.get('functions', []))
    return total, all_functions

def get_frontend_page_count(frontend, module_names):
    """获取前端指定模块的页面总数"""
    total = 0
    all_pages = []
    for name in module_names:
        if name in frontend['pages_by_module']:
            mod = frontend['pages_by_module'][name]
            if isinstance(mod, dict):
                total += mod.get('count', 0)
                all_pages.extend(mod.get('pages', []))
            elif isinstance(mod, list):
                total += len(mod)
                all_pages.extend(mod)
    return total, all_pages

def get_frontend_route_count(frontend, module_names):
    """获取前端指定模块的路由总数"""
    total = 0
    all_routes = []
    for name in module_names:
        if name in frontend['routes_by_module']:
            mod = frontend['routes_by_module'][name]
            if isinstance(mod, dict):
                total += mod.get('count', 0)
                all_routes.extend(mod.get('routes', []))
            elif isinstance(mod, list):
                total += len(mod)
                all_routes.extend(mod)
    return total, all_routes

def analyze_subsystem_gap(backend_routes, frontend_functions, frontend_pages):
    """分析子系统级别的功能缺口"""
    # 从后端API路径中提取功能点
    backend_features = set()
    for route in backend_routes:
        path = route['path']
        # 提取功能标识 (去掉参数和版本号)
        parts = [p for p in path.strip('/').split('/') if not p.startswith('{') and p not in ('api', 'v1', 'core')]
        if len(parts) >= 2:
            feature = parts[1] if len(parts) > 1 else parts[0]
            backend_features.add(feature)
    
    # 从前端API路径中提取功能点
    frontend_features = set()
    for func in frontend_functions:
        path = func.get('path', '')
        parts = [p for p in path.strip('/').split('/') if not p.startswith('{') and p not in ('api', 'v1')]
        if len(parts) >= 2:
            feature = parts[1] if len(parts) > 1 else parts[0]
            frontend_features.add(feature)
    
    missing = backend_features - frontend_features
    existing = backend_features & frontend_features
    
    return {
        'backend_features': sorted(backend_features),
        'frontend_features': sorted(frontend_features),
        'missing_features': sorted(missing),
        'existing_features': sorted(existing),
    }

def main():
    backend, frontend = load_data()
    
    print("=" * 120)
    print("后端API vs 前端功能 对比分析报告（详细版）")
    print("=" * 120)
    
    results = []
    total_backend_apis = 0
    total_frontend_apis = 0
    
    for module_name in BACKEND_MODULES:
        if module_name not in backend:
            continue
        
        backend_data = backend[module_name]
        backend_routes = [r for r in backend_data['routes'] if r['path'].startswith('/api/')]
        backend_api_count = len(backend_routes)
        total_backend_apis += backend_api_count
        
        mapping = MODULE_MAPPING.get(module_name, {'frontend_modules': [module_name]})
        frontend_modules = mapping.get('frontend_modules', [module_name])
        
        fe_api_count, fe_api_funcs = get_frontend_api_count(frontend, frontend_modules)
        fe_page_count, fe_pages = get_frontend_page_count(frontend, frontend_modules)
        fe_route_count, fe_routes = get_frontend_route_count(frontend, frontend_modules)
        
        total_frontend_apis += fe_api_count
        
        # 计算覆盖率
        if backend_api_count > 0:
            ratio = fe_api_count / backend_api_count
        else:
            ratio = 1.0
        
        # 判断状态
        if backend_api_count == 0:
            status = '⚪ 无业务API'
        elif fe_page_count == 0 or ratio < 0.15:
            status = '🔴 严重缺失'
        elif ratio < 0.5:
            status = '🟡 部分缺失'
        else:
            status = '🟢 基本完整'
        
        # 子系统分析（仅对unified-core）
        subsystem_analysis = []
        if module_name == 'unified-core' and 'sub_systems' in mapping:
            for sub in mapping['sub_systems']:
                sub_api_count, sub_routes = get_backend_api_by_prefix(backend_data, sub['prefix'])
                sub_frontend_modules = [sub['frontend']]
                sub_fe_count, _ = get_frontend_api_count(frontend, sub_frontend_modules)
                sub_fe_page, _ = get_frontend_page_count(frontend, sub_frontend_modules)
                
                sub_ratio = sub_fe_count / max(sub_api_count, 1)
                if sub_api_count == 0:
                    sub_status = '—'
                elif sub_fe_page == 0 or sub_ratio < 0.2:
                    sub_status = '🔴 缺失'
                elif sub_ratio < 0.6:
                    sub_status = '🟡 部分'
                else:
                    sub_status = '🟢 完整'
                
                subsystem_analysis.append({
                    'name': sub['name'],
                    'prefix': sub['prefix'],
                    'backend_api': sub_api_count,
                    'frontend_module': sub['frontend'],
                    'frontend_api': sub_fe_count,
                    'frontend_pages': sub_fe_page,
                    'status': sub_status,
                })
        
        results.append({
            'module': module_name,
            'description': mapping.get('description', ''),
            'backend_api_count': backend_api_count,
            'frontend_modules': frontend_modules,
            'frontend_api_count': fe_api_count,
            'frontend_page_count': fe_page_count,
            'frontend_route_count': fe_route_count,
            'ratio': ratio,
            'status': status,
            'subsystem_analysis': subsystem_analysis,
            'backend_routes_sample': backend_routes[:5],
        })
    
    # 按状态和API数量排序
    status_order = {'🔴 严重缺失': 0, '🟡 部分缺失': 1, '🟢 基本完整': 2, '⚪ 无业务API': 3}
    results.sort(key=lambda x: (status_order.get(x['status'], 99), -x['backend_api_count']))
    
    # 输出总览
    print(f"\n【总体统计】")
    print(f"  后端总API路由数: {total_backend_apis}")
    print(f"  前端总API函数数: {total_frontend_apis}")
    
    # 统计各状态数量
    status_counts = defaultdict(int)
    for r in results:
        status_counts[r['status']] += 1
    print(f"  模块状态分布: {dict(status_counts)}")
    
    # 对比总表
    print(f"\n{'='*120}")
    print("【后端模块 vs 前端模块 对比总表】")
    print(f"{'='*120}")
    print(f"{'模块名称':<20} {'描述':<22} {'后端API':>8} {'前端API':>8} {'前端页面':>8} {'覆盖率':>8} {'状态':<12} {'前端对应模块'}")
    print("-" * 120)
    
    for r in results:
        ratio_str = f"{r['ratio']*100:.0f}%" if r['backend_api_count'] > 0 else "—"
        frontend_mods = ', '.join(r['frontend_modules'])
        print(f"{r['module']:<20} {r['description'][:20]:<22} {r['backend_api_count']:>8} "
              f"{r['frontend_api_count']:>8} {r['frontend_page_count']:>8} {ratio_str:>8} "
              f"{r['status']:<12} {frontend_mods}")
    
    # 严重缺失的模块
    print(f"\n{'='*120}")
    print("【🔴 严重缺失的模块】")
    print(f"{'='*120}")
    
    critical = [r for r in results if '严重缺失' in r['status']]
    for i, r in enumerate(critical, 1):
        print(f"\n{i}. {r['module']} —— {r['description']}")
        print(f"   后端API: {r['backend_api_count']}个 | 前端API: {r['frontend_api_count']}个 | 前端页面: {r['frontend_page_count']}个")
        print(f"   前端对应模块: {', '.join(r['frontend_modules'])}")
        
        if r['subsystem_analysis']:
            print(f"   子系统明细:")
            for sub in r['subsystem_analysis']:
                print(f"     {sub['status']} {sub['name']:<12} 后端API: {sub['backend_api']:>3}个 | "
                      f"前端模块: {sub['frontend_module']:<15} 前端API: {sub['frontend_api']:>3}个 | 页面: {sub['frontend_pages']}个")
        
        # 列出后端主要功能
        print(f"   后端主要API功能点:")
        features = defaultdict(int)
        for route in [rt for rt in backend[r['module']]['routes'] if rt['path'].startswith('/api/')]:
            path = route['path']
            if not path.startswith('/api/'):
                continue
            parts = path.strip('/').split('/')
            if len(parts) >= 3:
                feat = parts[2]
                features[feat] += 1
        
        for feat, count in sorted(features.items(), key=lambda x: -x[1])[:15]:
            print(f"     - {feat}: {count}个API")
    
    # 部分缺失的模块
    print(f"\n{'='*120}")
    print("【🟡 部分缺失的模块】")
    print(f"{'='*120}")
    
    partial = [r for r in results if '部分缺失' in r['status']]
    for i, r in enumerate(partial, 1):
        print(f"\n{i}. {r['module']} —— {r['description']}")
        print(f"   后端API: {r['backend_api_count']}个 | 前端API: {r['frontend_api_count']}个 | "
              f"前端页面: {r['frontend_page_count']}个")
        print(f"   覆盖率: {r['ratio']*100:.0f}%")
        print(f"   前端对应模块: {', '.join(r['frontend_modules'])}")
        
        # 分析可能缺失的功能
        fe_api_paths = set()
        for mod_name in r['frontend_modules']:
            if mod_name in frontend['api_by_module']:
                for f in frontend['api_by_module'][mod_name].get('functions', []):
                    fe_api_paths.add(f.get('path', ''))
        
        be_api_paths = set()
        for route in backend[r['module']]['routes']:
            if route['path'].startswith('/api/'):
                be_api_paths.add(route['path'])
        
        print(f"   后端API路径数: {len(be_api_paths)}")
        print(f"   前端API路径数: {len(fe_api_paths)}")
    
    # 基本完整的模块
    complete = [r for r in results if '基本完整' in r['status']]
    print(f"\n{'='*120}")
    print("【🟢 基本完整的模块】({len(complete)}个)")
    print(f"{'='*120}")
    for i, r in enumerate(complete, 1):
        print(f"  {i:2d}. {r['module']:<20} 后端API: {r['backend_api_count']:>4} | 前端API: {r['frontend_api_count']:>4} | 页面: {r['frontend_page_count']:>3}")
    
    # 建议优先级
    print(f"\n{'='*120}")
    print("【建议优先级】")
    print(f"{'='*120}")
    
    print("\n🔴 🔴 高优先级（严重缺失，API数量多，核心业务）:")
    high_priority = [r for r in critical if r['backend_api_count'] >= 50]
    for r in high_priority:
        print(f"  ⭐ {r['module']}: {r['backend_api_count']}个API — {r['description']}")
    
    print("\n🔴 高优先级（严重缺失，API数量中等）:")
    high_priority2 = [r for r in critical if 20 <= r['backend_api_count'] < 50]
    for r in high_priority2:
        print(f"  - {r['module']}: {r['backend_api_count']}个API — {r['description']}")
    
    print("\n🟡 中优先级（部分缺失，API数量多）:")
    medium_priority = [r for r in partial if r['backend_api_count'] >= 100]
    for r in medium_priority:
        print(f"  - {r['module']}: {r['backend_api_count']}个API (覆盖率 {r['ratio']*100:.0f}%)")
    
    print("\n🟡 中低优先级（部分缺失，API数量中等）:")
    medium_low = [r for r in partial if r['backend_api_count'] < 100]
    for r in medium_low:
        print(f"  - {r['module']}: {r['backend_api_count']}个API (覆盖率 {r['ratio']*100:.0f}%)")
    
    print(f"\n🟢 低优先级（基本完整）: {len(complete)}个模块")
    
    # 保存详细结果
    output = {
        'summary': {
            'total_backend_apis': total_backend_apis,
            'total_frontend_apis': total_frontend_apis,
            'critical_missing_count': len(critical),
            'partial_missing_count': len(partial),
            'complete_count': len(complete),
        },
        'critical_missing': [
            {
                'module': r['module'],
                'description': r['description'],
                'backend_api_count': r['backend_api_count'],
                'frontend_api_count': r['frontend_api_count'],
                'frontend_page_count': r['frontend_page_count'],
                'frontend_modules': r['frontend_modules'],
                'subsystem_analysis': r.get('subsystem_analysis', []),
                'coverage_ratio': r['ratio'],
            } for r in critical
        ],
        'partial_missing': [
            {
                'module': r['module'],
                'description': r['description'],
                'backend_api_count': r['backend_api_count'],
                'frontend_api_count': r['frontend_api_count'],
                'frontend_page_count': r['frontend_page_count'],
                'frontend_modules': r['frontend_modules'],
                'coverage_ratio': r['ratio'],
            } for r in partial
        ],
        'complete_modules': [
            {
                'module': r['module'],
                'description': r['description'],
                'backend_api_count': r['backend_api_count'],
                'frontend_api_count': r['frontend_api_count'],
                'frontend_page_count': r['frontend_page_count'],
            } for r in complete
        ]
    }
    
    with open('backend_frontend_gap_detailed.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n\n详细分析结果已保存到: backend_frontend_gap_detailed.json")

if __name__ == '__main__':
    main()
