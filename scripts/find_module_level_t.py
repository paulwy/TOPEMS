#!/usr/bin/env python3
import os
import re

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'
MODULES = ['asset', 'finance', 'hrm', 'bi', 'ehs']

def find_module_level_t(filepath):
    """Find files where t() is used at module level (outside component)"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "import { useTranslation } from 'react-i18next'" not in content:
        return False
    
    # Find component function start
    component_start = None
    patterns = [
        r'const\s+\w+\s*:\s*React\.FC',
        r'const\s+\w+\s*=\s*\([^)]*\)\s*=>',
        r'function\s+\w+\s*\(',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            component_start = match.start()
            break
    
    if not component_start:
        return False
    
    # Check if there's t('...') before the component
    before_component = content[:component_start]
    if re.search(r"t\('", before_component):
        return True
    
    return False

def main():
    problematic_files = []
    
    for module in MODULES:
        module_dir = os.path.join(BASE_DIR, module)
        if not os.path.exists(module_dir):
            continue
        for root, dirs, files in os.walk(module_dir):
            for f in files:
                if f.endswith('.tsx'):
                    filepath = os.path.join(root, f)
                    if find_module_level_t(filepath):
                        rel_path = filepath.replace(BASE_DIR + '/', '')
                        problematic_files.append(rel_path)
    
    print(f"Files with module-level t() calls: {len(problematic_files)}")
    for f in problematic_files:
        print(f"  {f}")

if __name__ == '__main__':
    main()
