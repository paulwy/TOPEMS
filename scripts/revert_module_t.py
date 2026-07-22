#!/usr/bin/env python3
"""
Revert module-level t() calls back to Chinese text.
This is a pragmatic approach to fix TypeScript errors quickly.
Mock data and config objects at module level will remain in Chinese.
"""

import re
import os
import json

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'
ZH_JSON = '/Users/air/TOPEMS/apps/web/src/i18n/locales/zh.json'

def load_zh_data():
    with open(ZH_JSON, 'r') as f:
        return json.load(f)

def get_translation(key, zh_data):
    """Get Chinese text from translation key."""
    parts = key.split('.')
    current = zh_data
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current if isinstance(current, str) else None

def find_component_start(content):
    """Find the first component function (approximate)."""
    # Look for patterns that indicate start of component
    patterns = [
        r'export\s+default\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{',
        r'export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{',
        r'const\s+\w+Page\s*=\s*\([^)]*\)\s*=>\s*\{',
        r'function\s+\w+Page\s*\([^)]*\)\s*\{',
        r'const\s+\w+Page\s*:\s*React\.FC',
    ]
    for pat in patterns:
        m = re.search(pat, content)
        if m:
            return m.start()
    return None

def revert_module_t_calls(filepath, zh_data):
    """Revert t() calls before component back to Chinese."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    if "import { useTranslation } from 'react-i18next'" not in content:
        return False, "no useTranslation import"
    
    comp_start = find_component_start(content)
    if not comp_start:
        return False, "no component found"
    
    before_comp = content[:comp_start]
    
    if "t('" not in before_comp and 't("' not in before_comp:
        return False, "no t() before component"
    
    # Find all t() calls in before_comp
    # Pattern: t('key.path.here') or t("key.path.here")
    pattern = re.compile(r"""t\((['"])([^'"]+)\1\)""")
    
    count = 0
    def replace_t(match):
        nonlocal count
        key = match.group(2)
        translation = get_translation(key, zh_data)
        if translation:
            count += 1
            quote = match.group(1)
            # Escape quotes in translation
            escaped = translation.replace(quote, '\\' + quote)
            return f'{quote}{escaped}{quote}'
        return match.group(0)
    
    new_before = pattern.sub(replace_t, before_comp)
    
    if count == 0:
        return False, "no revertable t() calls"
    
    new_content = new_before + content[comp_start:]
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True, f"reverted {count} t() calls"

def main():
    modules = ['asset', 'finance', 'hrm', 'bi', 'ehs']
    zh_data = load_zh_data()
    
    files = []
    for mod in modules:
        d = os.path.join(BASE_DIR, mod)
        if not os.path.isdir(d):
            continue
        for root, _, fnames in os.walk(d):
            for fn in fnames:
                if fn.endswith('.tsx'):
                    files.append(os.path.join(root, fn))
    
    print(f"Files: {len(files)}")
    fixed = 0
    for fp in sorted(files):
        rel = os.path.relpath(fp, BASE_DIR)
        print(f"{rel}...", end=' ')
        try:
            success, msg = revert_module_t_calls(fp, zh_data)
            if success:
                fixed += 1
                print(f"OK - {msg}")
            else:
                print(f"SKIP - {msg}")
        except Exception as e:
            print(f"ERROR - {e}")
    
    print(f"\nFixed: {fixed}")

if __name__ == '__main__':
    main()
