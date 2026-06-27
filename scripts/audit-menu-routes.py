#!/usr/bin/env python3
import re
import os
from collections import defaultdict

PROJECT_ROOT = '/Users/xingzhai/TOPEMS/apps/web'
NAV_FILE = os.path.join(PROJECT_ROOT, 'src/lib/NavigationRegistry.ts')
ROUTES_DIR = os.path.join(PROJECT_ROOT, 'src/routes')

CORE_MODULES = ['iam', 'crm', 'erp', 'wms', 'mes', 'hrm', 'finance', 'qms', 'oa', 'pm', 'bi', 'scm', 'srm', 'ehs', 'workflow']

def extract_balanced_array(content, start_pos):
    depth = 0
    pos = start_pos
    in_string = False
    string_char = None
    
    while pos < len(content):
        char = content[pos]
        
        if in_string:
            if char == '\\' and pos + 1 < len(content):
                pos += 2
                continue
            if char == string_char:
                in_string = False
        else:
            if char in ('"', "'"):
                in_string = True
                string_char = char
            elif char == '[':
                depth += 1
            elif char == ']':
                depth -= 1
                if depth == 0:
                    return content[start_pos:pos+1], pos+1
        
        pos += 1
    
    return None, pos

def extract_nav_items(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    nav_items = []
    
    register_pattern = r'navigationRegistry\.register\([\'"](\w+)[\'"]\s*,'
    for match in re.finditer(register_pattern, content):
        plugin_code = match.group(1)
        start_pos = match.end()
        
        brace_depth = 0
        pos = start_pos
        config_start = -1
        
        while pos < len(content):
            char = content[pos]
            if char == '{':
                if brace_depth == 0:
                    config_start = pos
                brace_depth += 1
            elif char == '}':
                brace_depth -= 1
                if brace_depth == 0 and config_start >= 0:
                    config_content = content[config_start:pos+1]
                    break
            pos += 1
        
        if config_start < 0:
            continue
        
        for nav_type in ['sidebar_nav', 'top_nav', 'module_tabs']:
            nav_pattern = rf'{nav_type}:\s*\['
            nav_match = re.search(nav_pattern, config_content)
            if nav_match:
                arr_start = nav_match.end() - 1
                arr_content, _ = extract_balanced_array(config_content, arr_start)
                if arr_content:
                    items = parse_nav_array(arr_content, plugin_code, nav_type)
                    for item in items:
                        if not any(n['path'] == item['path'] for n in nav_items):
                            nav_items.append(item)
    
    return nav_items

def parse_nav_array(content, module_code, nav_type):
    items = []
    
    item_pattern = r'\{\s*code:\s*[\'"]([^\'"]+)[\'"]\s*,\s*label:\s*[\'"]([^\'"]+)[\'"]'
    for match in re.finditer(item_pattern, content):
        code = match.group(1)
        label = match.group(2)
        
        rest_start = match.end()
        rest = content[rest_start:]
        
        path_match = re.search(r'path:\s*[\'"]([^\'"]+)[\'"]', rest)
        if not path_match:
            continue
        
        path = path_match.group(1)
        
        item = {
            'code': code,
            'label': label,
            'path': path,
            'module': module_code,
            'nav_type': nav_type,
            'level': len([s for s in path.split('/') if s])
        }
        items.append(item)
        
        children_match = re.search(r'children:\s*\[', rest[:1000])
        if children_match:
            child_arr_start = rest_start + children_match.end() - 1
            child_arr_content, _ = extract_balanced_array(content, child_arr_start)
            if child_arr_content:
                child_items = parse_nav_array(child_arr_content, module_code, 'child')
                items.extend(child_items)
    
    return items

def extract_routes(routes_dir):
    routes = []
    
    for filename in sorted(os.listdir(routes_dir)):
        if not filename.endswith('.ts') or filename in ['index.ts', 'utils.ts']:
            continue
        
        filepath = os.path.join(routes_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        route_pattern = r'\{\s*path:\s*[\'"]([^\'"]+)[\'"]\s*,\s*element:\s*(\w+)[\s\S]*?module:\s*[\'"]([^\'"]+)[\'"]'
        for match in re.finditer(route_pattern, content):
            path = match.group(1)
            element = match.group(2)
            module = match.group(3)
            
            routes.append({
                'path': path,
                'element': element,
                'module': module,
                'file': filename
            })
    
    return routes

def path_matches(nav_path, route_path):
    nav_norm = nav_path.rstrip('/')
    route_norm = route_path.rstrip('/')
    
    if nav_norm == route_norm:
        return True
    
    nav_segs = [s for s in nav_norm.split('/') if s]
    route_segs = [s for s in route_norm.split('/') if s]
    
    if len(nav_segs) != len(route_segs):
        return False
    
    for ns, rs in zip(nav_segs, route_segs):
        if ns.startswith(':') or rs.startswith(':'):
            continue
        if ns != rs:
            return False
    
    return True

def main():
    print('=' * 70)
    print('TOPEMS 菜单与路由对应关系审查报告')
    print('=' * 70)
    print()
    
    nav_items = extract_nav_items(NAV_FILE)
    routes = extract_routes(ROUTES_DIR)
    
    unique_nav_paths = list(set(n['path'] for n in nav_items))
    unique_route_paths = list(set(r['path'] for r in routes))
    
    print(f'【基本统计】')
    print(f'  导航项总数: {len(nav_items)}')
    print(f'  导航唯一路径数: {len(unique_nav_paths)}')
    print(f'  路由总数: {len(routes)}')
    print(f'  路由唯一路径数: {len(unique_route_paths)}')
    print()
    
    srm_nav = [n for n in nav_items if n['module'] == 'srm']
    print(f'[调试] srm 模块导航项数: {len(srm_nav)}')
    for n in srm_nav:
        print(f'  {n["path"]} - {n["label"]}')
    print()
    
    print('=' * 70)
    print('【P0 级】菜单有但路由无的路径 (点击菜单会404)')
    print('=' * 70)
    
    nav_without_route = []
    for nav_path in sorted(unique_nav_paths):
        matched = any(path_matches(nav_path, r['path']) for r in routes)
        if not matched:
            nav_item = next((n for n in nav_items if n['path'] == nav_path), None)
            nav_without_route.append({
                'path': nav_path,
                'label': nav_item['label'] if nav_item else '',
                'module': nav_item['module'] if nav_item else '',
                'code': nav_item['code'] if nav_item else ''
            })
    
    print(f'数量: {len(nav_without_route)}')
    print()
    
    for item in nav_without_route:
        print(f'  • {item["path"]}')
        print(f'    菜单名称: {item["label"]}')
        print(f'    所属模块: {item["module"]}')
        print(f'    菜单代码: {item["code"]}')
        print()
    
    print('=' * 70)
    print('【P1 级】路由有但菜单无的路径 (核心模块列表页应补充)')
    print('=' * 70)
    
    route_without_nav = []
    for route in routes:
        matched = any(path_matches(nav_path, route['path']) for nav_path in unique_nav_paths)
        if not matched and ':' not in route['path'] and 'Navigate' not in route['element'] and 'React' not in route['element']:
            route_without_nav.append(route)
    
    print(f'总数: {len(route_without_nav)}')
    print()
    
    print('--- 核心模块中的路由 (应考虑补充菜单) ---')
    print()
    
    core_routes = [r for r in route_without_nav if r['module'] in CORE_MODULES]
    by_module = defaultdict(list)
    for r in sorted(core_routes, key=lambda x: x['path']):
        by_module[r['module']].append(r)
    
    for mod in CORE_MODULES:
        if mod in by_module:
            print(f'【{mod}】({len(by_module[mod])}个)')
            for r in by_module[mod]:
                print(f'  • {r["path"]}')
                print(f'    组件: {r["element"]}')
            print()
    
    print('=' * 70)
    print('【P1 级】同一路径对应多个页面组件')
    print('=' * 70)
    
    path_to_elements = defaultdict(list)
    for r in routes:
        if r['element'] not in path_to_elements[r['path']] and 'Navigate' not in r['element'] and 'React' not in r['element']:
            path_to_elements[r['path']].append(r['element'])
    
    duplicate_paths = [(p, els) for p, els in path_to_elements.items() if len(set(els)) > 1]
    print(f'数量: {len(duplicate_paths)}')
    print()
    
    for path, elements in sorted(duplicate_paths):
        print(f'  • {path}')
        print(f'    组件: {", ".join(elements)}')
        print()
    
    print('=' * 70)
    print('【P1 级】同一页面组件对应多个路由')
    print('=' * 70)
    
    element_to_paths = defaultdict(list)
    for r in routes:
        if r['path'] not in element_to_paths[r['element']] and 'Navigate' not in r['element'] and 'React' not in r['element']:
            element_to_paths[r['element']].append(r['path'])
    
    duplicate_elements = [(el, paths) for el, paths in element_to_paths.items() 
                          if len(paths) > 1]
    
    print(f'数量: {len(duplicate_elements)}')
    print()
    
    for element, paths in sorted(duplicate_elements, key=lambda x: -len(x[1])):
        print(f'  • {element} ({len(paths)}个路由)')
        for p in sorted(paths):
            print(f'    - {p}')
        print()
    
    print('=' * 70)
    print('【P2 级】路径命名不一致问题')
    print('=' * 70)
    
    naming_issues = []
    for nav in nav_items:
        matched_route = None
        for r in routes:
            if path_matches(nav['path'], r['path']):
                matched_route = r
                break
        
        if matched_route:
            nav_segs = [s for s in nav['path'].split('/') if s and not s.startswith(':')]
            route_segs = [s for s in matched_route['path'].split('/') if s and not s.startswith(':')]
            
            min_len = min(len(nav_segs), len(route_segs))
            for i in range(min_len):
                if nav_segs[i] != route_segs[i]:
                    naming_issues.append({
                        'nav_path': nav['path'],
                        'route_path': matched_route['path'],
                        'nav_segment': nav_segs[i],
                        'route_segment': route_segs[i],
                        'label': nav['label'],
                        'module': nav['module']
                    })
                    break
    
    print(f'数量: {len(naming_issues)}')
    print()
    
    for issue in sorted(naming_issues, key=lambda x: x['nav_path']):
        print(f'  • 菜单路径: {issue["nav_path"]} ({issue["label"]})')
        print(f'    路由路径: {issue["route_path"]}')
        print(f'    差异段: "{issue["nav_segment"]}" vs "{issue["route_segment"]}"')
        print(f'    模块: {issue["module"]}')
        print()
    
    print('=' * 70)
    print('【各模块菜单-路由匹配率统计】')
    print('=' * 70)
    print()
    
    module_stats = {}
    total_nav = 0
    total_route = 0
    total_matched = 0
    
    print(f'| 模块   | 菜单数 | 路由数 | 匹配数 | 匹配率  |')
    print(f'|--------|--------|--------|--------|---------|')
    
    for mod in CORE_MODULES:
        mod_nav = list(set(n['path'] for n in nav_items if n['module'] == mod))
        mod_routes = list(set(r['path'] for r in routes if r['module'] == mod))
        
        matched = 0
        for np in mod_nav:
            if any(path_matches(np, rp) for rp in mod_routes):
                matched += 1
        
        match_rate = f"{(matched / len(mod_nav) * 100):.1f}%" if mod_nav else 'N/A'
        
        module_stats[mod] = {
            'nav_count': len(mod_nav),
            'route_count': len(mod_routes),
            'matched_count': matched,
            'match_rate': match_rate
        }
        
        total_nav += len(mod_nav)
        total_route += len(mod_routes)
        total_matched += matched
        
        print(f'| {mod:<6} | {len(mod_nav):>6} | {len(mod_routes):>6} | {matched:>6} | {match_rate:>7} |')
    
    print(f'|--------|--------|--------|--------|---------|')
    overall_rate = f"{(total_matched / total_nav * 100):.1f}%" if total_nav else 'N/A'
    print(f'| 合计   | {total_nav:>6} | {total_route:>6} | {total_matched:>6} | {overall_rate:>7} |')
    print()
    
    print('=' * 70)
    print('审查完成')
    print('=' * 70)

if __name__ == '__main__':
    main()
