#!/usr/bin/env python3
"""
Fix useTranslation import that was incorrectly inserted in the middle of multi-line imports.
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def fix_import(filepath):
    """Fix incorrectly placed useTranslation import."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    if "import { useTranslation } from 'react-i18next';" not in content:
        return False, "no useTranslation import"
    
    lines = content.split('\n')
    
    # Find the useTranslation import line
    import_line = None
    for i, line in enumerate(lines):
        if "import { useTranslation } from 'react-i18next';" in line.strip():
            import_line = i
            break
    
    if import_line is None:
        return False, "import line not found"
    
    # Check if it's inside a multi-line import
    # Look at previous line - if it ends with ',' or '{' and is part of an import
    prev_line = lines[import_line - 1].strip() if import_line > 0 else ''
    
    is_inside_multiline = False
    if prev_line.endswith(',') or prev_line.endswith('{'):
        # Check if previous lines are part of an import
        for j in range(import_line - 1, max(0, import_line - 10), -1):
            if lines[j].strip().startswith('import '):
                is_inside_multiline = True
                break
    
    if not is_inside_multiline:
        # Check next line too
        next_line = lines[import_line + 1].strip() if import_line + 1 < len(lines) else ''
        if next_line.startswith('}') or next_line.startswith('type') or next_line.startswith('  '):
            # Check if there's an import starting before
            for j in range(import_line - 1, max(0, import_line - 20), -1):
                if lines[j].strip().startswith('import '):
                    # Check if this import is multi-line
                    if '{' in lines[j] and '}' not in lines[j]:
                        is_inside_multiline = True
                        break
    
    if not is_inside_multiline:
        return False, "not inside multi-line import"
    
    # Remove the useTranslation import line from its current position
    use_translation_line = lines[import_line]
    del lines[import_line]
    
    # Find the end of the import block to add it there
    # Find all import lines and add after the last one
    insert_pos = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('//') or stripped == '':
            if stripped.startswith('import '):
                insert_pos = i + 1
        else:
            break
    
    # Insert after last import, with a blank line before
    if insert_pos < len(lines) and lines[insert_pos - 1].strip() != '':
        lines.insert(insert_pos, '')
        insert_pos += 1
    
    lines.insert(insert_pos, use_translation_line.strip())
    
    new_content = '\n'.join(lines)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True, "fixed import placement"

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
            success, msg = fix_import(fp)
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
