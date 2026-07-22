#!/usr/bin/env python3
"""
Simple fix: add useTranslation hook to main component if missing.
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def find_main_component(content):
    """Find the main export component and return its body start position."""
    # Pattern: export default const X = () => {
    m = re.search(r'export\s+default\s+const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{', content)
    if m:
        return m.group(1), m.end()
    
    # Pattern: const X = () => { ... export default X; }
    m = re.search(r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{', content)
    if m and re.search(r'export\s+default\s+' + re.escape(m.group(1)), content):
        return m.group(1), m.end()
    
    # Pattern: export default function X() {
    m = re.search(r'export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*\{', content)
    if m:
        return m.group(1), m.end()
    
    # Pattern: function X() { ... export default X; }
    m = re.search(r'function\s+(\w+)\s*\([^)]*\)\s*\{', content)
    if m and re.search(r'export\s+default\s+' + re.escape(m.group(1)), content):
        return m.group(1), m.end()
    
    return None, None

def get_body_end(content, body_start):
    """Find matching closing brace."""
    depth = 0
    in_str = False
    str_ch = None
    i = body_start
    
    while i < len(content):
        ch = content[i]
        if in_str:
            if ch == str_ch and (i == 0 or content[i-1] != '\\'):
                in_str = False
        else:
            if ch in ('"', "'", '`'):
                in_str = True
                str_ch = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return len(content)

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if "import { useTranslation } from 'react-i18next'" not in content:
        return False, "no import"
    
    comp_name, body_start = find_main_component(content)
    if not comp_name:
        return False, "no main component"
    
    body_end = get_body_end(content, body_start)
    body = content[body_start:body_end]
    
    if "t('" not in body and 't("' not in body:
        return False, "no t() in body"
    
    if 'const { t } = useTranslation()' in body or 'const {t} = useTranslation()' in body:
        return False, "already has hook"
    
    # Find the first line after {
    first_newline = content.find('\n', body_start)
    if first_newline == -1:
        return False, "no newline after {"
    
    insert_pos = first_newline + 1
    
    # Get indentation from next non-empty line
    rest = content[insert_pos:body_end]
    indent_match = re.search(r'^(\s*)\S', rest, re.MULTILINE)
    indent = indent_match.group(1) if indent_match else '  '
    
    hook_line = f'{indent}const {{ t }} = useTranslation();\n'
    
    new_content = content[:insert_pos] + hook_line + content[insert_pos:]
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True, f"added hook to {comp_name}"

def main():
    modules = ['asset', 'finance', 'hrm', 'bi', 'ehs']
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
            success, msg = fix_file(fp)
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
