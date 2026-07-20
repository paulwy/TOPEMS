#!/usr/bin/env python3
"""
Fix broken useTranslation imports that are stuck inside other import statements.
This handles the case where useTranslation import is in the middle of a multi-line import.
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def fix_broken_import(filepath):
    """Fix useTranslation import that's inside another import."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Pattern: find import { ... } from '...' blocks that contain useTranslation import inside
    # We need to find lines like:
    # import {
    # 
    # import { useTranslation } from 'react-i18next';
    #   Something,
    # ...
    # } from '...';
    
    lines = content.split('\n')
    
    # Find the useTranslation line
    use_translation_line = None
    for i, line in enumerate(lines):
        if "import { useTranslation } from 'react-i18next';" in line.strip():
            use_translation_line = i
            break
    
    if use_translation_line is None:
        return False, "no useTranslation import"
    
    # Check if this line is inside a multi-line import
    # Look backwards for an import { that hasn't been closed
    is_broken = False
    import_start = None
    
    depth = 0
    for j in range(use_translation_line - 1, -1, -1):
        line = lines[j]
        # Count braces
        for ch in line:
            if ch == '{':
                depth -= 1
            elif ch == '}':
                depth += 1
        if line.strip().startswith('import ') and depth < 0:
            # Found the start of the import
            import_start = j
            is_broken = True
            break
    
    if not is_broken:
        # Check forward too
        depth = 0
        for j in range(use_translation_line + 1, len(lines)):
            line = lines[j]
            for ch in line:
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
            if 'from ' in line and depth <= 0 and line.strip().endswith(';'):
                # Found end of import
                is_broken = True
                break
    
    if not is_broken:
        return False, "import is not broken"
    
    # Remove the useTranslation line from current position
    ut_line = lines[use_translation_line]
    del lines[use_translation_line]
    
    # Also remove empty line before if any
    if use_translation_line > 0 and lines[use_translation_line - 1].strip() == '':
        del lines[use_translation_line - 1]
    
    # Find the end of all imports and add it there
    insert_pos = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or stripped == '' or stripped.startswith('//'):
            if stripped.startswith('import '):
                insert_pos = i + 1
        else:
            break
    
    # Insert the useTranslation import
    lines.insert(insert_pos, ut_line.strip())
    insert_pos += 1
    
    # Add blank line if needed
    if insert_pos < len(lines) and lines[insert_pos].strip() != '':
        lines.insert(insert_pos, '')
    
    new_content = '\n'.join(lines)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True, "fixed broken import"

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
            success, msg = fix_broken_import(fp)
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
