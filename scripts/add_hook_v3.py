#!/usr/bin/env python3
"""
Add useTranslation hook to main component by finding export default name.
Simpler approach - just add hook line after component definition line.
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def find_export_default_name(content):
    """Find the name of export default."""
    m = re.search(r'export\s+default\s+(\w+)\s*;', content)
    if m:
        return m.group(1)
    m = re.search(r'export\s+default\s+function\s+(\w+)', content)
    if m:
        return m.group(1)
    m = re.search(r'export\s+default\s+const\s+(\w+)', content)
    if m:
        return m.group(1)
    return None

def find_component_def_line(content, name):
    """Find the line number of component definition.
    Returns (line_index, match_end_pos) or (None, None).
    """
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Pattern: const NAME = (...) => {
        if re.match(rf'\s*const\s+{re.escape(name)}\s*=\s*\(', line):
            # Check if this line contains { or next few lines do
            combined = '\n'.join(lines[i:i+5])
            if '=>' in combined and '{' in combined:
                # Find the { position
                brace_pos = combined.find('{')
                if brace_pos >= 0:
                    # Calculate actual position in content
                    pos = sum(len(l) + 1 for l in lines[:i]) + combined.find('{') + 1
                    return i, pos
        # Pattern: const NAME: React.FC... = () => {
        if re.match(rf'\s*const\s+{re.escape(name)}\s*:', line):
            combined = '\n'.join(lines[i:i+5])
            if '=>' in combined and '{' in combined:
                brace_pos = combined.find('{')
                if brace_pos >= 0:
                    pos = sum(len(l) + 1 for l in lines[:i]) + brace_pos + 1
                    return i, pos
        # Pattern: function NAME() {
        if re.match(rf'\s*function\s+{re.escape(name)}\s*\(', line):
            combined = '\n'.join(lines[i:i+3])
            if '{' in combined:
                brace_pos = combined.find('{')
                if brace_pos >= 0:
                    pos = sum(len(l) + 1 for l in lines[:i]) + brace_pos + 1
                    return i, pos
    return None, None

def has_t_in_component(content, comp_line):
    """Rough check: does the component use t()?
    We check from component line to end of file.
    Not perfect but good enough for our purposes.
    """
    lines = content.split('\n')
    rest = '\n'.join(lines[comp_line:])
    return bool(re.search(r"\bt\('", rest)) or bool(re.search(r'\bt\("', rest))

def already_has_hook(content, comp_line, body_start_pos):
    """Check if next few lines already have useTranslation hook."""
    lines = content.split('\n')
    for j in range(comp_line + 1, min(comp_line + 10, len(lines))):
        if 'const { t } = useTranslation()' in lines[j] or 'const {t} = useTranslation()' in lines[j]:
            return True
    return False

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if "import { useTranslation } from 'react-i18next'" not in content:
        return False, "no import"
    
    name = find_export_default_name(content)
    if not name:
        return False, "no export default name"
    
    comp_line, body_start_pos = find_component_def_line(content, name)
    if comp_line is None:
        return False, f"component {name} not found"
    
    if not has_t_in_component(content, comp_line):
        return False, "no t() in component"
    
    if already_has_hook(content, comp_line, body_start_pos):
        return False, "already has hook"
    
    # Add hook after component definition
    lines = content.split('\n')
    
    # Find indentation from next non-empty line
    indent = '  '
    for j in range(comp_line + 1, min(comp_line + 10, len(lines))):
        stripped = lines[j].strip()
        if stripped:
            m = re.match(r'^(\s*)', lines[j])
            if m:
                indent = m.group(1)
            break
    
    hook_line = f'{indent}const {{ t }} = useTranslation();'
    
    # Insert after component definition line
    lines.insert(comp_line + 1, hook_line)
    
    new_content = '\n'.join(lines)
    
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
