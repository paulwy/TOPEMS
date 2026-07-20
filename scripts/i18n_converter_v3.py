#!/usr/bin/env python3
"""
i18n Converter V19.8 - 5 Modules
Uses the proven original i18n_converter logic, with new file list for 5 modules.
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from i18n_converter import (
    process_file,
    update_i18n_files,
    ZH_JSON_PATH,
    EN_JSON_PATH,
)

# Generate file list for 5 modules
BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

MODULES = {
    'asset': 'asset',
    'finance': 'finance',
    'hrm': 'hrm',
    'bi': 'bi',
    'ehs': 'ehs',
}

def to_snake_case(name):
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def get_page_scope(filepath, module):
    """Generate page scope from file path."""
    rel = os.path.relpath(filepath, os.path.join(BASE_DIR, module))
    # Remove extension and replace path separators
    name = rel.replace('.tsx', '').replace('/', '_')
    return to_snake_case(name)

def collect_files():
    """Collect all TSX files from 5 modules."""
    files = []
    for module_dir_name, module_key in MODULES.items():
        module_path = os.path.join(BASE_DIR, module_dir_name)
        if not os.path.exists(module_path):
            continue
        for root, dirs, fnames in os.walk(module_path):
            for fname in fnames:
                if fname.endswith('.tsx') and not fname.endswith('.config.tsx'):
                    filepath = os.path.join(root, fname)
                    page_scope = get_page_scope(filepath, module_dir_name)
                    files.append((filepath, module_key, page_scope))
    return files

def main():
    print("=== i18n Converter V19.8 - 5 Modules ===")
    
    FILES_TO_PROCESS = collect_files()
    print(f"Found {len(FILES_TO_PROCESS)} files to process")
    
    # Load i18n data
    with open(ZH_JSON_PATH, 'r', encoding='utf-8') as f:
        zh_data = json.load(f)
    with open(EN_JSON_PATH, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    
    dry_run = '--dry-run' in sys.argv
    
    all_new_keys = {}
    total_files_converted = 0
    
    for file_path, module, page_scope in FILES_TO_PROCESS:
        if not os.path.exists(file_path):
            print(f"NOT FOUND: {file_path}")
            continue
        
        converted, new_keys = process_file(file_path, module, page_scope, zh_data, en_data, dry_run)
        
        if converted:
            total_files_converted += 1
            all_new_keys[(module, page_scope)] = new_keys
    
    print(f"\n=== Conversion Summary ===")
    print(f"Files converted: {total_files_converted}")
    print(f"Total new keys: {sum(len(k) for k in all_new_keys.values())}")
    
    if not dry_run:
        # Update i18n files
        update_i18n_files(zh_data, en_data, all_new_keys)
        
        # Write back
        with open(ZH_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(zh_data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        
        with open(EN_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(en_data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        
        print(f"Updated: {ZH_JSON_PATH}")
        print(f"Updated: {EN_JSON_PATH}")
    else:
        print("(dry-run mode - no files written)")

if __name__ == '__main__':
    main()
