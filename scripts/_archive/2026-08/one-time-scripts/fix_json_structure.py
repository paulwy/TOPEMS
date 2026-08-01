#!/usr/bin/env python3
"""Fix flat dotted keys to nested structure in zh.json and en.json"""
import json
from pathlib import Path
from collections import OrderedDict

BASE = Path('/Users/air/TOPEMS/apps/web/src/i18n/locales')

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f, object_pairs_hook=OrderedDict)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def flatten_to_nested(data):
    """Convert flat keys like 'a.b.c' to nested structure {a: {b: {c: ...}}}"""
    result = OrderedDict()
    
    for key, value in data.items():
        if '.' in key and key.split('.')[0] in ('admin', 'wms', 'system'):
            parts = key.split('.')
            # Navigate/create nested structure
            current = result
            for i, part in enumerate(parts[:-1]):
                if part not in current:
                    current[part] = OrderedDict()
                current = current[part]
            current[parts[-1]] = value
        else:
            result[key] = value
    
    # Also handle the case where we need to merge back existing nested keys
    # that might have been overwritten by the flat key conversion
    # Actually, the flat keys are new additions, so they shouldn't overwrite
    # existing nested structures. Let me merge them.
    return result

def merge_into_nested(target, flat_key, value):
    """Merge a flat dotted key into nested structure without overwriting existing keys."""
    parts = flat_key.split('.')
    current = target
    for part in parts[:-1]:
        if part not in current:
            current[part] = OrderedDict()
        elif not isinstance(current[part], dict):
            current[part] = OrderedDict()
        current = current[part]
    # Only set if not already present
    if parts[-1] not in current:
        current[parts[-1]] = value

def main():
    for lang in ['zh', 'en']:
        path = BASE / f'{lang}.json'
        print(f'Processing {path}...')
        data = load_json(path)
        
        # Collect all flat dotted keys that need to be nested
        flat_keys = {}
        keys_to_remove = []
        for key in list(data.keys()):
            if '.' in key and key.split('.')[0] in ('admin', 'wms', 'system'):
                flat_keys[key] = data[key]
                keys_to_remove.append(key)
        
        print(f'  Found {len(flat_keys)} flat dotted keys to convert')
        
        # Remove flat keys and merge into nested structure
        for key in keys_to_remove:
            del data[key]
        
        for key, value in flat_keys.items():
            merge_into_nested(data, key, value)
        
        # Now fix keys that have hash-based names (improve them)
        # E.g., "message________acf123ff" -> better semantic name
        fix_hash_keys(data)
        
        save_json(path, data)
        print(f'  Saved {path}')

def fix_hash_keys(data):
    """Rename hash-based keys to semantic names where possible."""
    # These mappings are based on the actual Chinese text
    hash_fixes = {
        'message________acf123ff': 'message_created_success',
        'message________50e7aa28': 'message_updated_success',
        'message________12c7ce80': 'message_deleted_success',
        'title________34b09a1a': 'title_success',
        'subtitle__________________e4a3b456': 'subtitle_monitor_desc',
        'subtitle__________________b73e475f': 'subtitle_dashboard_desc',
        'label________f2d943c1': 'label_home',
        'label________7a8c5e2b': 'label_system_management',
        'label________3c1e8d9a': 'label_permission_management',
    }
    
    # Walk through and fix
    def walk(obj):
        if isinstance(obj, dict):
            for key in list(obj.keys()):
                if key in hash_fixes:
                    new_key = hash_fixes[key]
                    if new_key not in obj:
                        obj[new_key] = obj[key]
                        del obj[key]
                elif isinstance(obj[key], dict):
                    walk(obj[key])
    
    walk(data)

if __name__ == '__main__':
    main()