#!/usr/bin/env python3
import os
import re

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'
MODULES = ['asset', 'finance', 'hrm', 'bi', 'ehs']

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    has_import = "import { useTranslation } from 'react-i18next'" in content
    has_t_call = 'const { t } = useTranslation()' in content
    
    if has_import and not has_t_call:
        return True
    return False

def find_component_body(content):
    # Find component function and insert after function opening
    patterns = [
        # React.FC pattern
        (r'(const\s+\w+\s*:\s*React\.FC\s*=\s*\(\)\s*=>\s*\{)', 1),
        # Arrow function component
        (r'(const\s+\w+\s*=\s*\(\)\s*=>\s*\{)', 1),
        # Function declaration
        (r'(function\s+\w+\s*\(\)\s*\{)', 1),
    ]
    
    for pattern, group_idx in patterns:
        match = re.search(pattern, content)
        if match:
            return match.end()
    return None

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    insert_pos = find_component_body(content)
    if not insert_pos:
        print(f"  SKIP: could not find component function")
        return False
    
    new_content = content[:insert_pos] + '\n  const { t } = useTranslation();' + content[insert_pos:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def main():
    files_to_fix = []
    
    for module in MODULES:
        module_dir = os.path.join(BASE_DIR, module)
        if not os.path.exists(module_dir):
            continue
        for root, dirs, files in os.walk(module_dir):
            for f in files:
                if f.endswith('.tsx'):
                    filepath = os.path.join(root, f)
                    if check_file(filepath):
                        files_to_fix.append(filepath)
    
    print(f"Files missing 'const {{ t }} = useTranslation()': {len(files_to_fix)}")
    for f in files_to_fix:
        print(f"  {f}")
    
    print("\nFixing...")
    fixed = 0
    for filepath in files_to_fix:
        rel_path = filepath.replace(BASE_DIR + '/', '')
        print(f"Fixing: {rel_path}")
        if fix_file(filepath):
            fixed += 1
            print(f"  OK")
    
    print(f"\nFixed {fixed} files")

if __name__ == '__main__':
    main()
