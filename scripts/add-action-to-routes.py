#!/usr/bin/env python3
import os
import re

MODULES_DIR = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'src', 'modules')

def infer_action(permissions):
    if not permissions:
        return 'read'
    
    perm_str = ','.join(permissions).lower()
    
    if ':admin' in perm_str:
        return 'admin'
    if ':delete' in perm_str:
        return 'delete'
    if ':update' in perm_str:
        return 'update'
    if ':create' in perm_str or ':write' in perm_str:
        return 'write'
    if ':read' in perm_str:
        return 'read'
    
    return 'read'

def process_config_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    modified = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        if 'requiredPermissions:' in line and 'action:' not in line:
            perm_match = re.search(r'requiredPermissions:\s*\[([^\]]*)\]', line)
            if perm_match:
                perm_str = perm_match.group(1)
                perms = [p.strip().strip("'\"") for p in perm_str.split(',') if p.strip()]
                action = infer_action(perms)
                
                indent = re.match(r'(\s+)', line)
                indent_str = indent.group(1) if indent else '      '
                
                new_lines.append(line)
                new_lines.append(f"{indent_str}action: '{action}',")
                modified = True
                i += 1
                continue
        
        new_lines.append(line)
        i += 1
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
    
    return modified

def main():
    print("批量为模块路由添加 action 字段...")
    print("=" * 50)
    
    modified_count = 0
    total_files = 0
    
    for module_name in sorted(os.listdir(MODULES_DIR)):
        module_dir = os.path.join(MODULES_DIR, module_name)
        config_file = os.path.join(module_dir, 'config.ts')
        
        if not os.path.isfile(config_file):
            continue
        
        total_files += 1
        if process_config_file(config_file):
            modified_count += 1
            print(f"✓ {module_name}")
        else:
            print(f"  {module_name} (无需修改)")
    
    print("=" * 50)
    print(f"处理完成！共 {total_files} 个模块，修改 {modified_count} 个文件")

if __name__ == '__main__':
    main()
