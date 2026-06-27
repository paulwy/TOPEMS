#!/usr/bin/env python3
"""
TOPEMS 页面全面审查脚本
收集：页面文件、路由配置、导航配置、API定义
"""
import os
import re
import json
from collections import defaultdict

WEB_SRC = "/Users/xingzhai/TOPEMS/apps/web/src"
PAGES_DIR = os.path.join(WEB_SRC, "pages")
ROUTES_DIR = os.path.join(WEB_SRC, "routes")
NAV_FILE = os.path.join(WEB_SRC, "lib/NavigationRegistry.ts")
API_DIR = os.path.join(WEB_SRC, "api")

def is_page_file(fname):
    if not fname.endswith('.tsx'):
        return False
    if 'Modal' in fname:
        return False
    if 'Tab' in fname and 'Page' not in fname:
        return False
    if 'Form' in fname and 'Page' not in fname:
        return False
    return True

def get_all_pages():
    pages = []
    for root, dirs, files in os.walk(PAGES_DIR):
        if '__tests__' in root:
            continue
        for f in files:
            if is_page_file(f):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, PAGES_DIR)
                parts = rel.split('/')
                module = parts[0] if len(parts) > 1 else 'shared'
                pages.append({
                    'file': rel,
                    'module': module,
                    'name': f.replace('.tsx', ''),
                    'full_path': full,
                })
    return pages

def extract_routes():
    """从 routes 目录提取所有路由配置"""
    routes = []
    for f in os.listdir(ROUTES_DIR):
        if not f.endswith('.ts') and not f.endswith('.tsx'):
            continue
        fpath = os.path.join(ROUTES_DIR, f)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
            content = fp.read()
        
        pattern = r"path:\s*['\"]([^'\"]+)['\"]"
        for m in re.finditer(pattern, content):
            path = m.group(1)
            if path.startswith('/'):
                routes.append({
                    'path': path,
                    'file': f,
                })
    return routes

def extract_nav_items():
    """从 NavigationRegistry 提取所有导航项"""
    nav_items = []
    if not os.path.exists(NAV_FILE):
        return nav_items
    with open(NAV_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    pattern = r"path:\s*['\"]([^'\"]+)['\"].*?label:\s*['\"]([^'\"]+)['\"]"
    for m in re.finditer(pattern, content, re.DOTALL):
        path = m.group(1)
        label = m.group(2)
        nav_items.append({
            'path': path,
            'label': label,
        })
    return nav_items

def extract_page_nav_links(pages):
    """从页面文件中提取导航跳转链接（navigate, Link, href 等）"""
    results = []
    for page in pages:
        try:
            with open(page['full_path'], 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except:
            continue
        
        links = set()
        
        patterns = [
            r"navigate\(['\"]([^'\"]+)['\"]",
            r"to=\{?['\"]([^'\"]+)['\"]",
            r"href=\{?['\"]([^'\"]+)['\"]",
            r"path:\s*['\"](/[^'\"]+)['\"]",
        ]
        
        for pat in patterns:
            for m in re.finditer(pat, content):
                link = m.group(1)
                if link.startswith('/') and not link.startswith('/api'):
                    links.add(link)
        
        if links:
            results.append({
                'page': page['file'],
                'links': sorted(links),
            })
    
    return results

def check_multi_content_pages(pages):
    """检查一个页面文件是否包含多个页面内容（多个 PageContainer 或多个主要组件）"""
    issues = []
    for page in pages:
        try:
            with open(page['full_path'], 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except:
            continue
        
        pc_count = content.count('<PageContainer')
        if pc_count > 1:
            issues.append({
                'page': page['file'],
                'pageContainerCount': pc_count,
                'issue': '包含多个 PageContainer，可能需要拆分',
            })
        
        const_count = len(re.findall(r"export const \w+Page.*React\.FC", content))
        if const_count > 1:
            issues.append({
                'page': page['file'],
                'exportedPageCount': const_count,
                'issue': '导出了多个 Page 组件，可能需要拆分',
            })
    
    return issues

def get_api_modules():
    """获取前端 API 模块列表"""
    apis = []
    for item in os.listdir(API_DIR):
        full = os.path.join(API_DIR, item)
        if os.path.isdir(full) and not item.startswith('_'):
            apis.append(item)
        elif item.endswith('.ts') and item != 'client.ts' and item != 'request.ts':
            apis.append(item.replace('.ts', ''))
    return sorted(apis)

def main():
    print("=" * 60)
    print("TOPEMS 页面审查 - 数据收集")
    print("=" * 60)
    
    pages = get_all_pages()
    print(f"\n📄 页面文件总数: {len(pages)}")
    
    by_module = defaultdict(list)
    for p in pages:
        by_module[p['module']].append(p['name'])
    
    print("\n📁 按模块统计:")
    for mod in sorted(by_module.keys()):
        print(f"  {mod}: {len(by_module[mod])} 个页面")
    
    routes = extract_routes()
    print(f"\n🛣️  路由配置数: {len(routes)}")
    
    nav_items = extract_nav_items()
    print(f"📋 导航项数: {len(nav_items)}")
    
    links = extract_page_nav_links(pages)
    total_links = sum(len(l['links']) for l in links)
    print(f"\n🔗 页面内跳转链接数: {total_links} (来自 {len(links)} 个页面)")
    
    multi_content = check_multi_content_pages(pages)
    print(f"\n⚠️  多内容页面数: {len(multi_content)}")
    for issue in multi_content:
        print(f"  - {issue['page']}: {issue['issue']}")
    
    apis = get_api_modules()
    print(f"\n🔌 前端 API 模块数: {len(apis)}")
    
    route_paths = set(r['path'] for r in routes)
    nav_paths = set(n['path'] for n in nav_items)
    
    nav_without_route = nav_paths - route_paths
    route_without_nav = route_paths - nav_paths
    
    print(f"\n🔍 导航有但路由无: {len(nav_without_route)}")
    for p in sorted(nav_without_route)[:20]:
        print(f"  - {p}")
    
    print(f"\n🔍 路由有但导航无: {len(route_without_nav)}")
    for p in sorted(route_without_nav)[:20]:
        print(f"  - {p}")
    
    all_data = {
        'pages': [{'file': p['file'], 'module': p['module'], 'name': p['name']} for p in pages],
        'pages_by_module': {k: v for k, v in by_module.items()},
        'routes': routes,
        'nav_items': nav_items,
        'page_links': links,
        'multi_content_issues': multi_content,
        'api_modules': apis,
        'nav_without_route': sorted(nav_without_route),
        'route_without_nav': sorted(route_without_nav),
    }
    
    outfile = "/Users/xingzhai/TOPEMS/docs/audit-data.json"
    with open(outfile, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 数据已保存到 {outfile}")

if __name__ == '__main__':
    main()
