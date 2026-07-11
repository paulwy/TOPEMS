#!/usr/bin/env python3
import os
import re

MODULES_DIR = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'src', 'modules')

def add_missing_module_perms(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    module_name = os.path.basename(os.path.dirname(filepath))
    
    modified = False
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        if 'requiredPermissions:' in line:
            perm_match = re.search(r'requiredPermissions:\s*\[([^\]]*)\]', line)
            if perm_match:
                perm_str = perm_match.group(1)
                perms = [p.strip().strip("'\"") for p in perm_str.split(',') if p.strip()]
                
                action = 'read'
                j = i + 1
                while j < len(lines) and 'action:' not in lines[j] and '}' not in lines[j].strip():
                    j += 1
                if j < len(lines) and 'action:' in lines[j]:
                    action_match = re.search(r'action:\s*\'([^\']+)\'', lines[j])
                    if action_match:
                        action = action_match.group(1)
                
                needed_module_perm = f"{module_name}:{action}"
                
                if needed_module_perm not in perms:
                    new_perms = perms + [needed_module_perm]
                    new_perms_str = ', '.join([f"'{p}'" for p in new_perms])
                    new_line = line.replace(perm_str, new_perms_str)
                    lines[i] = new_line
                    modified = True
        
        i += 1
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    
    return modified

def main():
    print("修复模块路由权限配置...")
    print("=" * 50)
    
    modified_count = 0
    total_files = 0
    
    risk_modules = ['asset', 'ehs', 'im', 'lims', 'pdm', 'plugin', 'rs', 'admin', 'bi', 'lowcode', 'report', 'workflow']
    
    for module_name in risk_modules:
        module_dir = os.path.join(MODULES_DIR, module_name)
        config_file = os.path.join(module_dir, 'config.ts')
        
        if not os.path.isfile(config_file):
            print(f"  {module_name} (配置文件不存在)")
            continue
        
        total_files += 1
        if add_missing_module_perms(config_file):
            modified_count += 1
            print(f"✓ {module_name}")
        else:
            print(f"  {module_name} (无需修改)")
    
    print("=" * 50)
    print(f"处理完成！共 {total_files} 个模块，修改 {modified_count} 个文件")

if __name__ == '__main__':
    main()
