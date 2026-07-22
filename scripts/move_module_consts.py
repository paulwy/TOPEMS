#!/usr/bin/env python3
"""
Fix module-level t() calls by moving const declarations into the component.
Handles simple cases: arrays, objects, and basic variable declarations.
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def find_component_start(content):
    """Find the start of the main component function."""
    patterns = [
        (r'const\s+(\w+)\s*:\s*React\.FC(?:<[^>]*>)?\s*=\s*\([^)]*\)\s*=>\s*\{', 0),
        (r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{', 0),
        (r'function\s+(\w+)\s*\([^)]*\)\s*\{', 0),
    ]
    
    for pattern, group_idx in patterns:
        match = re.search(pattern, content, re.MULTILINE)
        if match:
            return match.start(), match.end()
    return None, None

def find_module_consts(content, comp_start):
    """Find module-level const declarations that contain t() calls."""
    # Find all const declarations before component
    before_comp = content[:comp_start]
    
    # Pattern to match const declarations (simplified)
    # We'll find lines starting with 'const ' and track until we find the end
    consts = []
    
    lines = before_comp.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        if stripped.startswith('const ') and '=' in stripped:
            # Found a const declaration
            start_line = i
            # Find the end of this const (lines until balanced ;)
            brace_depth = 0
            bracket_depth = 0
            paren_depth = 0
            end_line = i
            
            for j in range(i, len(lines)):
                l = lines[j]
                for ch in l:
                    if ch == '{': brace_depth += 1
                    elif ch == '}': brace_depth -= 1
                    elif ch == '[': bracket_depth += 1
                    elif ch == ']': bracket_depth -= 1
                    elif ch == '(': paren_depth += 1
                    elif ch == ')': paren_depth -= 1
                
                # Check if statement ends with ;
                if l.rstrip().endswith(';') and brace_depth == 0 and bracket_depth == 0 and paren_depth == 0:
                    end_line = j
                    break
            
            const_text = '\n'.join(lines[start_line:end_line+1])
            
            # Check if it contains t() calls
            if "t('" in const_text or 't("' in const_text:
                # Extract const name
                name_match = re.match(r'const\s+(\w+)', stripped)
                if name_match:
                    consts.append({
                        'name': name_match.group(1),
                        'start_line': start_line,
                        'end_line': end_line,
                        'text': const_text,
                    })
            
            i = end_line + 1
        else:
            i += 1
    
    return consts

def fix_file(filepath):
    """Fix a single file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    comp_start, comp_body_start = find_component_start(content)
    if not comp_start:
        return False, "Could not find component"
    
    consts = find_module_consts(content, comp_start)
    if not consts:
        return False, "No module-level t() consts found"
    
    lines = content.split('\n')
    
    # Remove module-level consts (in reverse order to preserve line numbers)
    for const in reversed(consts):
        del lines[const['start_line']:const['end_line']+1]
    
    # Now find the component body start again (lines have changed)
    new_content = '\n'.join(lines)
    comp_start, comp_body_start = find_component_start(new_content)
    
    if not comp_start:
        return False, "Could not find component after removal"
    
    lines = new_content.split('\n')
    
    # Find the line number of component body start
    comp_body_line = new_content[:comp_body_start].count('\n')
    
    # Check if component already has useTranslation
    has_use_translation = False
    for line in lines[comp_body_line:comp_body_line+20]:
        if 'useTranslation()' in line:
            has_use_translation = True
            break
    
    # Build lines to insert
    insert_lines = []
    insert_pos = comp_body_line + 1  # After component opening {
    
    if not has_use_translation:
        insert_lines.append('  const { t } = useTranslation();')
        insert_lines.append('')
    
    # Add each const (wrapped in useMemo if it's an object/array)
    for const in consts:
        const_text = const['text']
        const_name = const['name']
        
        # Check if it's an array or object (should use useMemo)
        first_line = const_text.strip()
        is_complex = '[' in first_line or '{' in first_line or 'z.' in first_line
        
        if is_complex:
            # Convert to useMemo
            # Change "const X = ...;" to "const X = useMemo(() => ..., [t]);"
            # This is tricky - we need to add useMemo wrapper
            
            match = re.match(r'(const\s+\w+(?:\s*:\s*[^=]+)?)\s*=\s*(.*)', const_text, re.DOTALL)
            if match:
                prefix = match.group(1)
                value = match.group(2)
                # Remove trailing semicolon
                value = value.rstrip().rstrip(';')
                
                # Indent the value properly
                value_lines = value.split('\n')
                indented_value = '\n'.join(['  ' + vl if vl.strip() else vl for vl in value_lines])
                
                new_const = f"  {prefix} = useMemo(() => {indented_value}, [t]);"
                insert_lines.append(new_const)
                insert_lines.append('')
            else:
                # Fallback: just add as-is (with t available)
                lines_indented = '\n'.join(['  ' + l if l.strip() else l for l in const_text.split('\n')])
                insert_lines.append(lines_indented)
                insert_lines.append('')
        else:
            # Simple value - just indent and add
            lines_indented = '\n'.join(['  ' + l if l.strip() else l for l in const_text.split('\n')])
            insert_lines.append(lines_indented)
            insert_lines.append('')
    
    # Insert into lines
    for j, line in enumerate(insert_lines):
        lines.insert(insert_pos + j, line)
    
    final_content = '\n'.join(lines)
    
    # Add useMemo to import if needed
    if any('useMemo' in il for il in insert_lines):
        if 'useMemo' not in final_content.split('\n')[0]:
            # Check if React is imported
            if "import React" in final_content:
                final_content = final_content.replace(
                    "import React, { ",
                    "import React, { useMemo, "
                )
                final_content = final_content.replace(
                    "import React, {",
                    "import React, { useMemo, "
                )
            elif "import { useState" in final_content:
                final_content = final_content.replace(
                    "import { useState",
                    "import { useState, useMemo"
                )
            elif "import {" in final_content:
                final_content = final_content.replace(
                    "import { ",
                    "import { useMemo, ",
                    1
                )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    return True, f"Moved {len(consts)} consts: {[c['name'] for c in consts]}"

def main():
    import sys
    # Find files with module-level t() calls
    modules = ['asset', 'finance', 'hrm', 'bi', 'ehs']
    
    files_to_check = []
    for module in modules:
        module_dir = os.path.join(BASE_DIR, module)
        if not os.path.exists(module_dir):
            continue
        for root, dirs, fnames in os.walk(module_dir):
            for fname in fnames:
                if fname.endswith('.tsx'):
                    filepath = os.path.join(root, fname)
                    with open(filepath, 'r') as f:
                        content = f.read()
                    
                    if "import { useTranslation } from 'react-i18next'" not in content:
                        continue
                    
                    comp_start, _ = find_component_start(content)
                    if not comp_start:
                        continue
                    
                    before_comp = content[:comp_start]
                    if "t('" in before_comp or 't("' in before_comp:
                        files_to_check.append(filepath)
    
    print(f"Files to fix: {len(files_to_check)}")
    
    fixed = 0
    for filepath in files_to_check:
        rel_path = os.path.relpath(filepath, BASE_DIR)
        print(f"\nFixing: {rel_path}")
        success, msg = fix_file(filepath)
        if success:
            fixed += 1
            print(f"  OK - {msg}")
        else:
            print(f"  SKIP - {msg}")
    
    print(f"\nFixed {fixed}/{len(files_to_check)} files")

if __name__ == '__main__':
    main()
