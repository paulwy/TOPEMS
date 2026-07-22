#!/usr/bin/env python3
"""
Fix remaining TypeScript errors:
1. Add useTranslation hook to components that use t() but don't have it
2. Move module-level consts with t() into the main component
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def find_all_components(content):
    """Find all component-like functions in the file.
    Returns list of (name, start_pos, body_start_pos, is_export).
    """
    components = []
    
    # Pattern 1: const X = () => { ... }
    for m in re.finditer(r'(export\s+default\s+)?const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{', content):
        is_export = bool(m.group(1))
        name = m.group(2)
        start = m.start()
        body_start = m.end()
        components.append((name, start, body_start, is_export))
    
    # Pattern 2: function X() { ... }
    for m in re.finditer(r'(export\s+default\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{', content):
        is_export = bool(m.group(1))
        name = m.group(2)
        start = m.start()
        body_start = m.end()
        components.append((name, start, body_start, is_export))
    
    # Sort by position
    components.sort(key=lambda x: x[1])
    return components

def get_function_body(content, body_start):
    """Get the end position of a function body (matching braces)."""
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
                    return i + 1
        i += 1
    return len(content)

def has_t_call_in_body(content, body_start, body_end):
    """Check if there's a t() call in the function body."""
    body = content[body_start:body_end]
    return bool(re.search(r"\bt\('", body)) or bool(re.search(r'\bt\("', body))

def has_use_translation_hook(content, body_start, body_end):
    """Check if function already has useTranslation hook."""
    body = content[body_start:body_end]
    return 'const { t } = useTranslation()' in body or 'const {t} = useTranslation()' in body

def add_use_translation_to_component(content, body_start, body_end):
    """Add const { t } = useTranslation(); at the beginning of component body."""
    # Find the first line after {
    first_newline = content.find('\n', body_start)
    if first_newline == -1 or first_newline >= body_end:
        return content
    
    insert_pos = first_newline + 1
    indent = '  '  # 2 spaces
    
    # Check if first line already has content - get indent from first non-empty line
    rest = content[insert_pos:body_end]
    first_line_match = re.search(r'^(\s*)\S', rest, re.MULTILINE)
    if first_line_match:
        indent = first_line_match.group(1)
    
    hook_line = f'{indent}const {{ t }} = useTranslation();\n'
    
    return content[:insert_pos] + hook_line + content[insert_pos:]

def find_main_component(components):
    """Find the main (exported) component."""
    for name, start, body_start, is_export in components:
        if is_export:
            return name, start, body_start, is_export
    # If no export default, return the last one (usually the main component)
    if components:
        return components[-1]
    return None

def find_module_consts_with_t(content, comp_start):
    """Find module-level const declarations before component that contain t()."""
    lines = content.split('\n')
    comp_line = content[:comp_start].count('\n')
    
    consts = []
    i = 0
    while i < comp_line:
        stripped = lines[i].strip()
        if stripped.startswith('const ') and '=' in stripped:
            name_match = re.match(r'const\s+(\w+)', stripped)
            if name_match:
                name = name_match.group(1)
                # Find end of const
                depth = 0
                in_str = False
                str_ch = None
                end_line = i
                for j in range(i, comp_line):
                    l = lines[j]
                    for k, ch in enumerate(l):
                        if in_str:
                            if ch == str_ch and (k == 0 or lines[j][k-1] != '\\'):
                                in_str = False
                        else:
                            if ch in ('"', "'", '`'):
                                in_str = True
                                str_ch = ch
                            elif ch in '{[(':
                                depth += 1
                            elif ch in '}])':
                                depth -= 1
                    if depth <= 0 and l.rstrip().endswith(';'):
                        end_line = j
                        break
                
                const_text = '\n'.join(lines[i:end_line+1])
                if "t('" in const_text or 't("' in const_text:
                    # Check if referenced by types
                    before_text = '\n'.join(lines[:comp_line])
                    has_type_ref = False
                    if f'z.infer<typeof {name}>' in before_text:
                        has_type_ref = True
                    if re.search(rf'(?:type|interface)\s+\w+[^;]*{name}', before_text):
                        has_type_ref = True
                    
                    consts.append((i, end_line, name, const_text, has_type_ref))
                
                i = end_line + 1
                continue
        i += 1
    
    return consts

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if "import { useTranslation } from 'react-i18next'" not in content:
        return False, "no useTranslation import"
    
    components = find_all_components(content)
    if not components:
        return False, "no components found"
    
    changes = []
    
    # Step 1: Add useTranslation hook to all components that use t() but don't have it
    for name, start, body_start, is_export in components:
        body_end = get_function_body(content, body_start)
        if has_t_call_in_body(content, body_start, body_end) and not has_use_translation_hook(content, body_start, body_end):
            content = add_use_translation_to_component(content, body_start, body_end)
            changes.append(f'added hook to {name}')
            
            # Recompute components since content changed
            components = find_all_components(content)
            # Recalculate body positions for remaining components (simplified: restart)
            # For efficiency, just break and restart the whole process
            return fix_file_with_retry(filepath, max_retries=5)
    
    # Step 2: Move module-level consts into main component
    main_comp = find_main_component(components)
    if main_comp:
        name, start, body_start, is_export = main_comp
        consts = find_module_consts_with_t(content, start)
        consts_to_move = [(s, e, n, t) for s, e, n, t, has_ref in consts if not has_ref]
        
        if consts_to_move:
            lines = content.split('\n')
            comp_line = content[:start].count('\n')
            body_line = content[:body_start].count('\n')
            
            # Remove consts (reverse order)
            for s, e, n, t in reversed(consts_to_move):
                del lines[s:e+1]
            
            # Rebuild content
            content = '\n'.join(lines)
            
            # Find component again
            components = find_all_components(content)
            main_comp = find_main_component(components)
            if main_comp:
                name, start, body_start, is_export = main_comp
                body_line = content[:body_start].count('\n')
                
                # Find useTranslation line in component
                lines = content.split('\n')
                t_line = body_line
                for j in range(body_line, min(body_line + 20, len(lines))):
                    if 'const { t } = useTranslation()' in lines[j]:
                        t_line = j
                        break
                
                # Insert consts after useTranslation
                insert_pos = t_line + 1
                for s, e, n, const_text in consts_to_move:
                    const_lines = const_text.split('\n')
                    for idx, cl in enumerate(const_lines):
                        if cl.strip():
                            lines.insert(insert_pos + idx, '  ' + cl)
                        else:
                            lines.insert(insert_pos + idx, cl)
                    insert_pos += len(const_lines)
                    lines.insert(insert_pos, '')
                    insert_pos += 1
                
                content = '\n'.join(lines)
                changes.append(f'moved {len(consts_to_move)} consts')
    
    if changes:
        with open(filepath, 'w') as f:
            f.write(content)
        return True, ', '.join(changes)
    
    return False, 'no changes needed'

def fix_file_with_retry(filepath, max_retries=5):
    """Retry fix_file multiple times to handle multiple components."""
    all_changes = []
    for i in range(max_retries):
        success, msg = fix_file_internal(filepath)
        if success:
            all_changes.append(msg)
        else:
            break
    
    if all_changes:
        return True, '; '.join(all_changes)
    return False, 'no changes needed'

def fix_file_internal(filepath):
    """Internal fix function - single pass."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    if "import { useTranslation } from 'react-i18next'" not in content:
        return False, "no useTranslation import"
    
    components = find_all_components(content)
    if not components:
        return False, "no components found"
    
    # Find first component that needs hook
    for name, start, body_start, is_export in components:
        body_end = get_function_body(content, body_start)
        if has_t_call_in_body(content, body_start, body_end) and not has_use_translation_hook(content, body_start, body_end):
            content = add_use_translation_to_component(content, body_start, body_end)
            with open(filepath, 'w') as f:
                f.write(content)
            return True, f'added hook to {name}'
    
    # Check for module-level consts
    main_comp = find_main_component(components)
    if main_comp:
        name, start, body_start, is_export = main_comp
        consts = find_module_consts_with_t(content, start)
        consts_to_move = [(s, e, n, t) for s, e, n, t, has_ref in consts if not has_ref]
        
        if consts_to_move:
            lines = content.split('\n')
            
            # Remove consts (reverse order)
            for s, e, n, t in reversed(consts_to_move):
                del lines[s:e+1]
            
            # Rebuild content
            content = '\n'.join(lines)
            
            # Find component again
            components = find_all_components(content)
            main_comp = find_main_component(components)
            if main_comp:
                name, start, body_start, is_export = main_comp
                
                # Find useTranslation line in component
                lines = content.split('\n')
                body_line = content[:body_start].count('\n')
                t_line = body_line
                for j in range(body_line, min(body_line + 20, len(lines))):
                    if 'const { t } = useTranslation()' in lines[j]:
                        t_line = j
                        break
                
                # Insert consts after useTranslation
                insert_pos = t_line + 1
                for s, e, n, const_text in consts_to_move:
                    const_lines = const_text.split('\n')
                    for idx, cl in enumerate(const_lines):
                        if cl.strip():
                            lines.insert(insert_pos + idx, '  ' + cl)
                        else:
                            lines.insert(insert_pos + idx, cl)
                    insert_pos += len(const_lines)
                    lines.insert(insert_pos, '')
                    insert_pos += 1
                
                content = '\n'.join(lines)
                with open(filepath, 'w') as f:
                    f.write(content)
                return True, f'moved {len(consts_to_move)} consts'
    
    return False, 'no changes needed'

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
                    fp = os.path.join(root, fn)
                    files.append(fp)
    
    print(f"Total files: {len(files)}")
    
    fixed = 0
    for fp in sorted(files):
        rel = os.path.relpath(fp, BASE_DIR)
        print(f"{rel}...", end=' ')
        try:
            success, msg = fix_file_with_retry(fp)
            if success:
                fixed += 1
                print(f"OK - {msg}")
            else:
                print(f"SKIP - {msg}")
        except Exception as e:
            print(f"ERROR - {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\nFixed: {fixed}")

if __name__ == '__main__':
    main()
