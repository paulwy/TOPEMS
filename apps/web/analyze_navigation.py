#!/usr/bin/env python3
import re
import os
import json

NAV_FILE = '/Users/xingzhai/TOPEMS/apps/web/src/lib/NavigationRegistry.ts'
ROUTES_DIR = '/Users/xingzhai/TOPEMS/apps/web/src/routes'

def extract_nav_items_detailed():
    """详细提取导航项，包括 module_card 和 children"""
    with open(NAV_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    nav_items = []
    
    register_pattern = r"navigationRegistry\.register\('(\w+)',\s*\{(.*?)\n  \}\);"
    modules = re.findall(register_pattern, content, re.DOTALL)
    
    for module_code, module_content in modules:
        for section in ['top_nav', 'sidebar_nav', 'module_tabs']:
            section_pattern = rf"{section}:\s*\[(.*?)\n\s*\],"
            section_match = re.search(section_pattern, module_content, re.DOTALL)
            if section_match:
                section_content = section_match.group(1)
                items = extract_items_from_section(section_content, module_code, section, 0)
                nav_items.extend(items)
        
        card_pattern = r"module_card:\s*\{(.*?)\n\s*\},"
        card_match = re.search(card_pattern, module_content, re.DOTALL)
        if card_match:
            card_content = card_match.group(1)
            code_match = re.search(r"code:\s*'([^']+)'", card_content)
            name_match = re.search(r"name:\s*'([^']+)'", card_content)
            path_match = re.search(r"path:\s*'([^']+)'", card_content)
            if path_match:
                nav_items.append({
                    'module': module_code,
                    'section': 'module_card',
                    'code': code_match.group(1) if code_match else module_code,
                    'label': name_match.group(1) if name_match else module_code,
                    'path': path_match.group(1),
                    'depth': 0
                })
    
    return nav_items

def extract_items_from_section(content, module_code, section, depth):
    """递归提取导航项（包括 children）"""
    items = []
    
    item_pattern = r"\{\s*code:\s*'([^']+)',\s*label:\s*'([^']+)',(.*?)\n\s*\}"
    matches = re.finditer(item_pattern, content, re.DOTALL)
    
    for match in matches:
        code = match.group(1)
        label = match.group(2)
        item_body = match.group(3)
        
        path_match = re.search(r"path:\s*'([^']+)'", item_body)
        path = path_match.group(1) if path_match else None
        
        if path:
            items.append({
                'module': module_code,
                'section': section,
                'code': code,
                'label': label,
                'path': path,
                'depth': depth
            })
        
        children_match = re.search(r"children:\s*\[(.*?)\n\s*\]", item_body, re.DOTALL)
        if children_match:
            children_content = children_match.group(1)
            children_items = extract_items_from_section(children_content, module_code, section, depth + 1)
            items.extend(children_items)
    
    return items

def extract_routes_detailed():
    """从 routes 目录中提取所有路由路径及详细信息"""
    routes = {}
    
    for filename in sorted(os.listdir(ROUTES_DIR)):
        if not filename.endswith('.ts') or filename == 'utils.ts':
            continue
        
        filepath = os.path.join(ROUTES_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        route_pattern = r"\{\s*path:\s*'([^']+)',(.*?)\n\s*\}"
        matches = re.finditer(route_pattern, content, re.DOTALL)
        
        for match in matches:
            path = match.group(1)
            body = match.group(2)
            
            module_match = re.search(r"module:\s*'([^']+)'", body)
            has_redirect = 'to:' in body
            
            routes[path] = {
                'file': filename,
                'module': module_match.group(1) if module_match else None,
                'has_redirect': has_redirect,
            }
    
    return routes

def match_path(nav_path, route_paths):
    """检查导航路径是否匹配某个路由路径"""
    if nav_path in route_paths:
        return True, 'exact', nav_path
    
    for route_path in route_paths:
        if ':' in route_path:
            route_parts = route_path.split('/')
            nav_parts = nav_path.split('/')
            
            if len(route_parts) == len(nav_parts):
                match = True
                for i in range(len(route_parts)):
                    if route_parts[i].startswith(':'):
                        continue
                    if route_parts[i] != nav_parts[i]:
                        match = False
                        break
                if match:
                    return True, 'param', route_path
    
    return False, None, None

def main():
    nav_items = extract_nav_items_detailed()
    routes = extract_routes_detailed()
    route_paths = set(routes.keys())
    
    issues = []
    matched_items = []
    
    for item in nav_items:
        matched, match_type, matched_route = match_path(item['path'], route_paths)
        if not matched:
            issues.append(item)
        else:
            item['match_type'] = match_type
            item['matched_route'] = matched_route
            item['route_info'] = routes.get(matched_route, {})
            matched_items.append(item)
    
    output = []
    
    output.append("=" * 90)
    output.append("NavigationRegistry 导航路径问题调查报告")
    output.append("=" * 90)
    
    output.append(f"\n📊 统计概览")
    output.append(f"  - 总导航项数: {len(nav_items)}")
    output.append(f"  - 总路由路径数: {len(route_paths)}")
    output.append(f"  - 匹配成功: {len(matched_items)}")
    output.append(f"  - 问题导航项: {len(issues)}")
    
    output.append("\n" + "=" * 90)
    output.append("❌ 问题导航项清单（路由不存在）")
    output.append("=" * 90)
    
    issues_by_module = {}
    for issue in issues:
        module = issue['module']
        if module not in issues_by_module:
            issues_by_module[module] = []
        issues_by_module[module].append(issue)
    
    for module, module_issues in sorted(issues_by_module.items()):
        output.append(f"\n【{module} 模块】({len(module_issues)} 个问题)")
        output.append("-" * 60)
        for idx, issue in enumerate(module_issues, 1):
            indent = "  " * (issue['depth'] + 1)
            output.append(f"{indent}{idx}. [{issue['section']}] {issue['label']}")
            output.append(f"{indent}   代码: {issue['code']}")
            output.append(f"{indent}   路径: {issue['path']}")
            output.append(f"{indent}   问题类型: 路由不存在")
            
            suggestions = find_similar_paths(issue['path'], route_paths)
            if suggestions:
                output.append(f"{indent}   相似路径建议: {', '.join(suggestions[:3])}")
            output.append("")
    
    output.append("=" * 90)
    output.append("📋 按模块统计")
    output.append("=" * 90)
    
    nav_by_module = {}
    for item in nav_items:
        module = item['module']
        if module not in nav_by_module:
            nav_by_module[module] = {'total': 0, 'issues': 0}
        nav_by_module[module]['total'] += 1
    
    for issue in issues:
        nav_by_module[issue['module']]['issues'] += 1
    
    output.append(f"{'模块':<15} {'导航项数':<10} {'问题数':<8} {'状态'}")
    output.append("-" * 60)
    for module in sorted(nav_by_module.keys()):
        data = nav_by_module[module]
        status = "✅ 正常" if data['issues'] == 0 else f"❌ {data['issues']}个问题"
        output.append(f"{module:<15} {data['total']:<10} {data['issues']:<8} {status}")
    
    output.append("\n" + "=" * 90)
    output.append("🔍 问题分析总结")
    output.append("=" * 90)
    
    output.append(f"\n共发现 {len(issues)} 个问题导航项，分布在 {len(issues_by_module)} 个模块中：")
    for module, module_issues in sorted(issues_by_module.items()):
        output.append(f"  - {module} 模块: {len(module_issues)} 个问题")
    
    output.append("\n📝 详细问题说明:")
    
    if 'erp' in issues_by_module:
        output.append("\n1. ERP 模块 - 销售管理 (/erp/sales)")
        output.append("   导航项指向 /erp/sales，但路由中只有:")
        output.append("   - /erp/sales/order (销售订单)")
        output.append("   - /erp/sales/delivery (销售发货)")
        output.append("   建议: 新增 /erp/sales 汇总页面，或修改导航指向子页面")
    
    if 'im' in issues_by_module:
        output.append("\n2. IM 模块 - 邮件 (/im/mail)")
        output.append("   导航项指向 /im/mail，但实际路由为 /mail")
        output.append("   建议: 将导航路径改为 /mail，或新增 /im/mail 路由")
    
    if 'oa' in issues_by_module:
        output.append("\n3. OA 模块 - 行政综合")
        output.append("   - /oa: 模块首页不存在")
        output.append("   - /oa/dashboard: 行政概览页不存在")
        output.append("   实际 OA 相关路由在 erp.ts 中，路径为:")
        output.append("   - /administration (行政概览)")
        output.append("   - /announcements (公告管理)")
        output.append("   - /meeting-rooms (会议室管理)")
        output.append("   - /vehicles (车辆管理)")
        output.append("   - /office-supplies (办公用品)")
        output.append("   建议:")
        output.append("   - 将 /oa 重定向到 /administration")
        output.append("   - 将 /oa/dashboard 改为 /administration")
        output.append("   - 或新增独立的 oa 路由模块")
    
    print('\n'.join(output))
    
    with open('/Users/xingzhai/TOPEMS/apps/web/navigation_analysis_report.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    
    print(f"\n💾 报告已保存到: navigation_analysis_report.txt")

def find_similar_paths(target_path, all_paths):
    """查找相似的路径"""
    suggestions = []
    target_parts = set(target_path.strip('/').split('/'))
    
    for path in all_paths:
        path_parts = set(path.strip('/').split('/'))
        if target_parts & path_parts:
            similarity = len(target_parts & path_parts) / len(target_parts | path_parts)
            if similarity > 0.3:
                suggestions.append((similarity, path))
    
    suggestions.sort(reverse=True)
    return [p for _, p in suggestions]

if __name__ == '__main__':
    main()
