#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os
import re
from collections import defaultdict

PAGES_DIR = "/Users/air/TOPEMS/apps/web/src/pages"
ROUTES_FILE = "/Users/air/TOPEMS/routes_result.json"
SRC_DIR = "/Users/air/TOPEMS/apps/web/src"

def is_page_component(filename):
    if filename == 'index.tsx':
        return False
    if 'Modal' in filename:
        return False
    if 'Tab' in filename and 'Page' not in filename:
        return False
    if 'Form' in filename and 'Page' not in filename:
        return False
    return True

def get_all_page_files():
    page_files = []
    for root, dirs, files in os.walk(PAGES_DIR):
        if '__tests__' in root:
            continue
        if '__tests__' in dirs:
            dirs.remove('__tests__')
        for f in files:
            if f.endswith('.tsx') and is_page_component(f):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, PAGES_DIR)
                page_files.append({
                    'full_path': full_path,
                    'rel_path': rel_path,
                    'module': rel_path.split('/')[0] if '/' in rel_path else 'root',
                    'filename': f
                })
    return page_files

def resolve_component_path(component_path):
    routes_base = os.path.join(SRC_DIR, 'routes')
    resolved = os.path.normpath(os.path.join(routes_base, component_path))
    if not resolved.endswith('.tsx'):
        resolved += '.tsx'
    return resolved

def load_routes():
    with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def main():
    page_files = get_all_page_files()
    routes_data = load_routes()
    
    page_file_set = set()
    page_file_map = {}
    for pf in page_files:
        norm_path = os.path.normpath(pf['full_path'])
        page_file_set.add(norm_path)
        page_file_map[norm_path] = pf
    
    all_routes = []
    for module, routes in routes_data.items():
        for route in routes:
            resolved_path = resolve_component_path(route['componentPath'])
            all_routes.append({
                'module': module,
                'path': route['path'],
                'componentPath': route['componentPath'],
                'resolved_path': resolved_path,
                'file_exists': os.path.normpath(resolved_path) in page_file_set
            })
    
    routes_with_file = [r for r in all_routes if r['file_exists']]
    routes_without_file = [r for r in all_routes if not r['file_exists']]
    
    used_page_paths = set()
    for r in routes_with_file:
        used_page_paths.add(os.path.normpath(r['resolved_path']))
    
    pages_without_route = []
    for pf in page_files:
        norm_path = os.path.normpath(pf['full_path'])
        if norm_path not in used_page_paths:
            pages_without_route.append(pf)
    
    module_stats = defaultdict(lambda: {
        'routes_total': 0,
        'routes_with_file': 0,
        'routes_without_file': 0,
        'pages_total': 0,
        'pages_with_route': 0,
        'pages_without_route': 0,
        'pages_list': []
    })
    
    for r in all_routes:
        module_stats[r['module']]['routes_total'] += 1
        if r['file_exists']:
            module_stats[r['module']]['routes_with_file'] += 1
        else:
            module_stats[r['module']]['routes_without_file'] += 1
    
    for pf in page_files:
        m = pf['module']
        module_stats[m]['pages_total'] += 1
        norm_path = os.path.normpath(pf['full_path'])
        if norm_path in used_page_paths:
            module_stats[m]['pages_with_route'] += 1
        else:
            module_stats[m]['pages_without_route'] += 1
            module_stats[m]['pages_list'].append(pf['rel_path'])
    
    print("=" * 80)
    print("路由与页面文件匹配分析报告")
    print("=" * 80)
    
    print(f"\n📊 总体统计")
    print(f"  页面文件总数: {len(page_files)}")
    print(f"  路由配置总数: {len(all_routes)}")
    print(f"  有路由且有页面: {len(routes_with_file)}")
    print(f"  有路由但无页面: {len(routes_without_file)}")
    print(f"  有页面但无路由: {len(pages_without_route)}")
    
    print(f"\n" + "=" * 80)
    print(f"a) 所有路由及其对应的页面文件（确认文件存在）")
    print("=" * 80)
    
    current_module = None
    for r in sorted(routes_with_file, key=lambda x: (x['module'], x['path'])):
        if r['module'] != current_module:
            current_module = r['module']
            print(f"\n  [{current_module}]")
        rel = os.path.relpath(r['resolved_path'], PAGES_DIR)
        print(f"    ✅ {r['path']}  ->  pages/{rel}")
    
    print(f"\n" + "=" * 80)
    print(f"b) 有页面文件但没有路由配置的页面（有页面无路由）")
    print("=" * 80)
    
    pages_by_module = defaultdict(list)
    for pf in sorted(pages_without_route, key=lambda x: x['rel_path']):
        pages_by_module[pf['module']].append(pf)
    
    for module in sorted(pages_by_module.keys()):
        pages = pages_by_module[module]
        print(f"\n  [{module}] ({len(pages)} 个)")
        for pf in pages:
            print(f"    📄 {pf['rel_path']}")
    
    print(f"\n" + "=" * 80)
    print(f"c) 有路由配置但页面文件不存在的（有路由无页面）")
    print("=" * 80)
    
    if routes_without_file:
        routes_by_module = defaultdict(list)
        for r in sorted(routes_without_file, key=lambda x: (x['module'], x['path'])):
            routes_by_module[r['module']].append(r)
        
        for module in sorted(routes_by_module.keys()):
            routes = routes_by_module[module]
            print(f"\n  [{module}] ({len(routes)} 个)")
            for r in routes:
                print(f"    ❌ {r['path']}  ->  {r['componentPath']}")
                print(f"       期望路径: {r['resolved_path']}")
    else:
        print(f"\n  ✅ 所有路由配置的页面文件都存在！")
    
    print(f"\n" + "=" * 80)
    print(f"d) 按模块分类统计")
    print("=" * 80)
    
    print(f"\n  {'模块':<20} {'路由数':>6} {'路由有页面':>8} {'路由无页面':>8} {'页面数':>6} {'页面有路由':>8} {'页面无路由':>8}")
    print(f"  {'-'*20} {'-'*6} {'-'*8} {'-'*8} {'-'*6} {'-'*8} {'-'*8}")
    
    all_modules = sorted(set(list(module_stats.keys()) + list(routes_data.keys())))
    total_routes = 0
    total_routes_with = 0
    total_routes_without = 0
    total_pages = 0
    total_pages_with = 0
    total_pages_without = 0
    
    for m in all_modules:
        s = module_stats[m]
        total_routes += s['routes_total']
        total_routes_with += s['routes_with_file']
        total_routes_without += s['routes_without_file']
        total_pages += s['pages_total']
        total_pages_with += s['pages_with_route']
        total_pages_without += s['pages_without_route']
        print(f"  {m:<20} {s['routes_total']:>6} {s['routes_with_file']:>8} {s['routes_without_file']:>8} {s['pages_total']:>6} {s['pages_with_route']:>8} {s['pages_without_route']:>8}")
    
    print(f"  {'-'*20} {'-'*6} {'-'*8} {'-'*8} {'-'*6} {'-'*8} {'-'*8}")
    print(f"  {'合计':<20} {total_routes:>6} {total_routes_with:>8} {total_routes_without:>8} {total_pages:>6} {total_pages_with:>8} {total_pages_without:>8}")
    
    print(f"\n" + "=" * 80)
    print(f"详细列表：页面文件完整列表")
    print("=" * 80)
    
    pages_list = [pf['rel_path'] for pf in sorted(page_files, key=lambda x: x['rel_path'])]
    for i, p in enumerate(pages_list, 1):
        print(f"  {i:3d}. {p}")
    
    print(f"\n页面文件数组 (共 {len(pages_list)} 个):")
    print(json.dumps(pages_list, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    import sys
    output_file = '/Users/air/TOPEMS/analysis_result.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        original_stdout = sys.stdout
        sys.stdout = f
        main()
        sys.stdout = original_stdout
    print(f"分析结果已保存到: {output_file}")
