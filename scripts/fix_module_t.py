#!/usr/bin/env python3
"""
Fix module-level t() calls - simpler approach:
1. Find all const declarations before component that contain t()
2. Move them into component, after useTranslation first
3. Wrap arrays/objects in useMemo
"""

import re
import os
import json

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'
ZH_JSON = '/Users/air/TOPEMS/apps/web/src/i18n/locales/zh.json'

def load_zh_data():
    with open(ZH_JSON, 'r') as f:
        return json.load(f)

def get_text_from_key(key, zh_data):
    """Try to get Chinese text from translation key by searching zh_data."""
    parts = key.split('.')
    current = zh_data
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current if isinstance(current, str) else None

def find_component(content):
    """Find component function - return (start_pos, body_start_pos) or (None, None)."""
    patterns = [
        r'const\s+\w+\s*:\s*React\.FC(?:<[^>]*>)?\s*=\s*\([^)]*\)\s*=>\s*\{',
        r'const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{',
        r'function\s+\w+\s*\([^)]*\)\s*\{',
    ]
    
    for pat in patterns:
        match = re.search(pat, content)
        if match:
            return match.start(), match.end()
    return None, None

def move_consts_to_component(filepath, zh_data):
    """Move module-level consts with t() into component."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    comp_start, comp_body_start = find_component(content)
    if not comp_start:
        return False, "no component found"
    
    # Split into lines
    lines = content.split('\n')
    
    # Find line numbers
    comp_start_line = content[:comp_start].count('\n')
    comp_body_line = content[:comp_body_start].count('\n')
    
    # Find module consts (before component)
    # We'll collect consts with t() calls
    module_consts = []  # list of (start_line, end_line, name, text)
    
    i = 0
    while i < comp_start_line:
        line = lines[i]
        stripped = line.strip()
        
        # Check if this is a const declaration
        if stripped.startswith('const ') and '=' in stripped:
            name_match = re.match(r'const\s+(\w+)', stripped)
            if name_match:
                name = name_match.group(1)
                
                # Find end of const (balanced braces/brackets/parens, ending with ;)
                depth = 0
                end_line = i
                in_string = False
                string_char = None
                
                for j in range(i, comp_start_line):
                    l = lines[j]
                    for k, ch in enumerate(l):
                        if in_string:
                            if ch == string_char and (k == 0 or lines[j][k-1] != '\\':
                                in_string = False
                        else:
                            if ch in ('"', "'", '`'):
                                in_string = True
                                string_char = ch
                            elif ch in '{[(':
                                depth += 1
                            elif ch in '}])':
                                depth -= 1
                    
                    if depth <= 0 and l.rstrip().endswith(';'):
                        end_line = j
                        break
                
                const_text = '\n'.join(lines[i:end_line+1])
                
                if "t('" in const_text or 't("' in const_text:
                    module_consts.append((i, end_line, name, const_text))
                
                i = end_line + 1
                continue
        
        i += 1
    
    if not module_consts:
        return False, "no module consts with t()"
    
    # Check if there are type definitions that reference these consts
    # For now, just skip consts that are referenced by types
    # Simple check: look for type/interface before component that references const name
    
    before_comp_text = '\n'.join(lines[:comp_start_line])
    consts_to_skip = set()
    for start_line, end_line, name, text in module_consts:
        # Check if any type/interface references this const
        pattern = rf'(?:type|interface)\s+\w+.*{name}'
        if re.search(pattern, before_comp_text):
            consts_to_skip.add(name)
        # Also check z.infer
        if f'z.infer<typeof {name}>' in before_comp_text:
            consts_to_skip.add(name)
    
    # Filter out skipped consts
    consts_to_move = [(s, e, n, t) for s, e, n, t in module_consts if n not in consts_to_skip]
    
    if not consts_to_move:
        return False, f"all consts referenced by types (skipped)"
    
    # Remove consts from module level (reverse order)
    for start_line, end_line, name, text in reversed(consts_to_move):
        del lines[start_line:end_line+1]
    
    # Now find component body again (lines changed)
    new_content = '\n'.join(lines)
    comp_start, comp_body_start = find_component(new_content)
    if not comp_start:
        return False, "component not found after removal"
    
    comp_body_line = new_content[:comp_body_start].count('\n')
    
    # Check if component already has useTranslation hook
    has_t_decl = False
    t_decl_line = None
    for j in range(comp_body_line, min(comp_body_line + 30, len(lines))):
        if 'const { t } = useTranslation()' in lines[j]:
            has_t_decl = True
            t_decl_line = j
            break
    
    # Build insertion text
    insert_lines = []
    
    if not has_t_decl:
        insert_lines.append('  const { t } = useTranslation();')
        insert_lines.append('')
    
    # Add moved consts
    for start_line, end_line, name, const_text in consts_to_move:
        # Determine if it's array/object/zod - use useMemo
        first_line = const_text.strip()
        is_complex = ('[' in first_line and ']' not in first_line.split('=')[1]) or \
                     ('{' in first_line and '}' not in first_line.split('=')[1]) or \
                     'z.object' in first_line or 'z.array' in first_line or 'z.' in first_line
        
        if is_complex:
            # Wrap in useMemo
            # Split const into first line and rest
            const_lines = const_text.split('\n')
            first = const_lines[0]
            rest = const_lines[1:]
            
            # Change "const X = value;" -> "const X = useMemo(() => value"
            match = re.match(r'(const\s+\w+(?:\s*:\s*[^=]+)?\s*)=\s*(.*)', first, re.DOTALL)
            if match:
                prefix = match.group(1)
                value_part = match.group(2)
                
                # Remove trailing semicolon from last line of value
                value_lines = [value_part] + rest
                value_text = '\n'.join(value_lines)
                value_text = value_text.rstrip().rstrip(';')
                
                # Indent
                indented = '\n'.join('  ' + l if l.strip() else l for l in value_text.split('\n'))
                
                new_const = f'  {prefix}= useMemo(() => {indented}, [t]);'
                insert_lines.append(new_const)
                insert_lines.append('')
            else:
                # Fallback
                indented = '\n'.join('  ' + l if l.strip() else l for l in const_lines)
                insert_lines.append(indented)
                insert_lines.append('')
        else:
            # Simple const
            const_lines = const_text.split('\n')
            indented = '\n'.join('  ' + l if l.strip() else l for l in const_lines)
            insert_lines.append(indented)
            insert_lines.append('')
    
    # Insert after useTranslation
    insert_pos = comp_body_line + 1
    if has_t_decl:
        insert_pos = t_decl_line + 1
    
    for j, line in enumerate(insert_lines):
        lines.insert(insert_pos + j, line)
    
    final_content = '\n'.join(lines)
    
    # Add useMemo import if needed
    if any('useMemo' in il for il in insert_lines):
        # Check if already imported
        if 'useMemo' not in final_content.split('\n')[0]:
            # Try to add to React import
            if re.search(r'import React, \{[^}]*\}', final_content):
                final_content = re.sub(
                    r'(import React, \{)([^}]*)(\})',
                    lambda m: f"{m.group(1)}{m.group(2).strip()}, useMemo{m.group(3)}" if m.group(2).strip() else f"{m.group(1)}useMemo{m.group(3)}",
                    final_content,
                    count=1
                )
            elif 'import React from' in final_content:
                final_content = final_content.replace(
                    'import React from',
                    'import React, { useMemo } from'
                )
            elif 'import {' in final_content and 'useState' in final_content:
                final_content = re.sub(
                    r'import \{ ([^}]*useState',
                    r'import { \1, useMemo',
                    final_content,
                    count=1
                )
    
    with open(filepath, 'w') as f:
        f.write(final_content)
    
    return True, f"moved {len(consts_to_move)} consts: {[c[2] for c in consts_to_move]}"

def main():
    modules = ['asset', 'finance', 'hrm', 'bi', 'ehs']
    zh_data = load_zh_data()
    
    files_to_fix = []
    for module in modules:
        module_dir = os.path.join(BASE_DIR, module)
        if not os.path.isdir(module_dir):
            continue
        for root, dirs, fnames in os.walk(module_dir):
            for fname in fnames:
                if fname.endswith('.tsx'):
                    filepath = os.path.join(root, fname)
                    with open(filepath) as f:
                        content = f.read()
                    
                    if "import { useTranslation } from 'react-i18next'" not in content:
                        continue
                    
                    comp_start, _ = find_component(content)
                    if not comp_start:
                        continue
                    
                    before = content[:comp_start]
                    if "t('" in before or 't("' in before:
                        files_to_fix.append(filepath)
    
    print(f"Files to fix: {len(files_to_fix)}")
    
    fixed = 0
    skipped = 0
    for filepath in sorted(files_to_fix):
        rel = os.path.relpath(filepath, BASE_DIR)
        print(f"\n{rel}...", end=' ')
        try:
            success, msg = move_consts_to_component(filepath, zh_data)
            if success:
                fixed += 1
                print(f"OK - {msg}")
            else:
                skipped += 1
                print(f"SKIP - {msg}")
        except Exception as e:
            print(f"ERROR - {e}")
    
    print(f"\nFixed: {fixed}, Skipped: {skipped}")

if __name__ == '__main__':
    main()
