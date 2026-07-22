#!/usr/bin/env python3
"""
Add useTranslation hook to main component.
Find main component by looking for export default.
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def find_export_default_name(content):
    """Find the name of export default."""
    # Pattern: export default X;
    m = re.search(r'export\s+default\s+(\w+)\s*;', content)
    if m:
        return m.group(1)
    
    # Pattern: export default function X() {
    m = re.search(r'export\s+default\s+function\s+(\w+)', content)
    if m:
        return m.group(1)
    
    # Pattern: export default const X = 
    m = re.search(r'export\s+default\s+const\s+(\w+)', content)
    if m:
        return m.group(1)
    
    return None

def find_component_by_name(content, name):
    """Find component body start by name."""
    # Pattern 1: const X = () => {
    pattern = rf'const\s+{re.escape(name)}\s*=\s*\([^)]*\)\s*=>\s*\{{'
    m = re.search(pattern, content)
    if m:
        return m.end()
    
    # Pattern 2: const X: React.FC = () => {
    pattern = rf'const\s+{re.escape(name)}\s*:\s*React\.FC[^=]*=\s*\([^)]*\)\s*=>\s*\{{'
    m = re.search(pattern, content)
    if m:
        return m.end()
    
    # Pattern 3: function X() {
    pattern = rf'function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{'
    m = re.search(pattern, content)
    if m:
        return m.end()
    
    return None

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
    
    name = find_export_default_name(content)
    if not name:
        return False, "no export default name"
    
    body_start = find_component_by_name(content, name)
    if not body_start:
        return False, f"component {name} not found"
    
    body_end = get_body_end(content, body_start)
    body = content[body_start:body_end]
    
    if "t('" not in body and 't("' not in body:
        return False, "no t() in body"
    
    if 'const { t } = useTranslation()' in body or 'const {t} = useTranslation()' in body:
        return False, "already has hook"
    
    # Find first line after {
    first_newline = content.find('\n', body_start)
    if first_newline == -1:
        return False, "no newline"
    
    insert_pos = first_newline + 1
    
    # Get indentation
    rest = content[insert_pos:body_end]
    indent_match = re.search(r'^(\s*)\S', rest, re.MULTILINE)
    indent = indent_match.group(1) if indent_match else '  '
    
    hook_line = f'{indent}const {{ t }} = useTranslation();\n'
    
    new_content = content[:insert_pos] + hook_line + content[insert_pos:]
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True, f"added hook to {name}"

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
