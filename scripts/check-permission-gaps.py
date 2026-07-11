#!/usr/bin/env python3
import os
import re

MODULES_DIR = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'src', 'modules')
PERMISSIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'src', 'config', 'permissions.ts')

def extract_role_permissions(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    role_pattern = re.compile(
        r'ROLE_PERMISSIONS\s*=\s*\{([^}]+)\}',
        re.DOTALL
    )
    
    match = role_pattern.search(content)
    if not match:
        return {}
    
    role_content = match.group(1)
    roles = {}
    
    role_block_pattern = re.compile(
        r'(\w+)\s*:\s*\[([^\]]+)\]',
        re.DOTALL
    )
    
    for role_match in role_block_pattern.finditer(role_content):
        role_name = role_match.group(1)
        perm_str = role_match.group(2)
        perms = [p.strip().strip("'\"").strip() for p in perm_str.split(',') if p.strip().strip("'\"")]
        roles[role_name] = perms
    
    return roles

def extract_module_routes(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    routes = []
    
    route_pattern = re.compile(
        r'(\s+)\{\s*\n'
        r'.*?requiredPermissions:\s*\[([^\]]+)\],?\s*\n'
        r'.*?action:\s*\'([^\']+)\',?\s*\n',
        re.DOTALL
    )
    
    for match in route_pattern.finditer(content):
        perm_str = match.group(2)
        action = match.group(3)
        perms = [p.strip().strip("'\"").strip() for p in perm_str.split(',') if p.strip().strip("'\"")]
        routes.append({'permissions': perms, 'action': action})
    
    return routes

def analyze_permission_gaps():
    roles = extract_role_permissions(PERMISSIONS_FILE)
    print("角色权限分析")
    print("=" * 60)
    
    for role_name, perms in roles.items():
        print(f"\n角色: {role_name}")
        print(f"  权限数量: {len(perms)}")
        module_perms = {}
        for perm in perms:
            parts = perm.split(':')
            if len(parts) >= 2:
                module = parts[0]
                action = parts[1] if len(parts) >= 2 else ''
                if module not in module_perms:
                    module_perms[module] = set()
                module_perms[module].add(action)
        
        for module, actions in sorted(module_perms.items()):
            print(f"  - {module}: {', '.join(sorted(actions))}")
    
    print("\n" + "=" * 60)
    print("模块路由权限分析")
    print("=" * 60)
    
    modules_with_specific_perms = {}
    
    for module_name in sorted(os.listdir(MODULES_DIR)):
        module_dir = os.path.join(MODULES_DIR, module_name)
        config_file = os.path.join(module_dir, 'config.ts')
        
        if not os.path.isfile(config_file):
            continue
        
        routes = extract_module_routes(config_file)
        specific_perms = []
        module_level_perms = []
        
        for route in routes:
            for perm in route['permissions']:
                parts = perm.split(':')
                if len(parts) > 2:
                    specific_perms.append(perm)
                else:
                    module_level_perms.append(perm)
        
        if specific_perms:
            modules_with_specific_perms[module_name] = {
                'specific': specific_perms,
                'module_level': set(module_level_perms)
            }
            print(f"\n模块: {module_name}")
            print(f"  具体权限 ({len(specific_perms)}):")
            for perm in specific_perms[:5]:
                print(f"    - {perm}")
            if len(specific_perms) > 5:
                print(f"    ... 还有 {len(specific_perms) - 5} 个")
            print(f"  模块级权限 ({len(module_level_perms)}):")
            for perm in sorted(module_level_perms):
                print(f"    - {perm}")
    
    print("\n" + "=" * 60)
    print("双重验证风险分析")
    print("=" * 60)
    print("\n以下模块使用了具体权限，需要确保角色同时拥有模块级权限：")
    
    risk_modules = []
    for module_name, data in modules_with_specific_perms.items():
        required_module_perms = set()
        for perm in data['specific']:
            parts = perm.split(':')
            module = parts[0]
            action = parts[-1]
            if action in ['read', 'write', 'delete', 'admin']:
                module_perm = f"{module}:{action}"
                required_module_perms.add(module_perm)
        
        missing_module_perms = required_module_perms - data['module_level']
        if missing_module_perms:
            risk_modules.append({
                'module': module_name,
                'specific_perms': len(data['specific']),
                'missing_module_perms': sorted(missing_module_perms)
            })
            print(f"\n⚠️ 模块: {module_name}")
            print(f"  具体权限数量: {len(data['specific'])}")
            print(f"  缺少的模块级权限:")
            for perm in sorted(missing_module_perms):
                print(f"    - {perm}")
            print(f"  风险说明: 如果角色只有具体权限(如 {list(data['specific'])[0]}),")
            print(f"            但缺少模块级权限(如 {list(missing_module_perms)[0]}),")
            print(f"            将无法通过 ModuleGate 的双重验证")
    
    if not risk_modules:
        print("\n✅ 未发现风险模块")
    
    print("\n" + "=" * 60)
    print("角色权限覆盖分析")
    print("=" * 60)
    
    for role_name, perms in roles.items():
        print(f"\n角色: {role_name}")
        for module_data in risk_modules:
            module = module_data['module']
            missing_perms = []
            for req_perm in module_data['missing_module_perms']:
                if req_perm not in perms and 'all' not in perms:
                    missing_perms.append(req_perm)
            
            if missing_perms:
                print(f"  ⚠️ {module} 模块缺少权限: {', '.join(missing_perms)}")
            else:
                print(f"  ✅ {module} 模块权限完整")

if __name__ == '__main__':
    analyze_permission_gaps()
