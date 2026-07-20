#!/usr/bin/env python3
"""
Simple fix: move module-level consts with t() into component body.
No useMemo - just move them as-is (acceptable for mock data/config).
"""

import re
import os

BASE_DIR = '/Users/air/TOPEMS/apps/web/src/pages'

def find_component(content):
    patterns = [
        r'const\s+\w+\s*:\s*React\.FC(?:<[^>]*>)?\s*=\s*\([^)]*\)\s*=>\s*\{',
        r'const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{',
        r'function\s+\w+\s*\([^)]*\)\s*\{',
    ]
    for pat in patterns:
        m = re.search(pat, content)
        if m:
            return m.start(), m.end()
    return None, None

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    comp_start, comp_body_start = find_component(content)
    if not comp_start:
        return False, "no component"
    
    lines = content.split('\n')
    comp_start_line = content[:comp_start].count('\n')
    comp_body_line = content[:comp_body_start].count('\n')
    
    # Find all const declarations before component
    consts = []  # (start_line, end_line, name)
    i = 0
    while i < comp_start_line:
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
                for j in range(i, comp_start_line):
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
                    consts.append((i, end_line, name, const_text))
                i = end_line + 1
                continue
        i += 1
    
    if not consts:
        return False, "no consts with t()"
    
    # Skip consts that are referenced by type definitions
    before_text = '\n'.join(lines[:comp_start_line])
    skip = set()
    for s, e, name, txt in consts:
        if f'z.infer<typeof {name}>' in before_text:
            skip.add(name)
        if re.search(rf'(?:type|interface)\s+\w+[^;]*{name}', before_text):
            skip.add(name)
    
    to_move = [(s, e, n, t) for s, e, n, t in consts if n not in skip]
    if not to_move:
        return False, f"all skipped (types reference): {[c[2] for c in consts]}"
    
    # Remove from module level (reverse order)
    for s, e, n, t in reversed(to_move):
        del lines[s:e+1]
    
    # Find component again
    new_content = '\n'.join(lines)
    comp_start, comp_body_start = find_component(new_content)
    if not comp_start:
        return False, "component lost"
    comp_body_line = new_content[:comp_body_start].count('\n')
    
    # Check for existing useTranslation
    has_t = False
    t_line = comp_body_line
    for j in range(comp_body_line, min(comp_body_line + 20, len(lines))):
        if 'const { t } = useTranslation()' in lines[j]:
            has_t = True
            t_line = j
            break
    
    # Build insertion lines
    insert = []
    if not has_t:
        insert.append('  const { t } = useTranslation();')
        insert.append('')
    
    for s, e, name, const_text in to_move:
        const_lines = const_text.split('\n')
        for cl in const_lines:
            if cl.strip():
                insert.append('  ' + cl)
            else:
                insert.append(cl)
        insert.append('')
    
    # Insert into component
    insert_pos = t_line + 1 if has_t else comp_body_line + 1
    for j, line in enumerate(insert):
        lines.insert(insert_pos + j, line)
    
    with open(filepath, 'w') as f:
        f.write('\n'.join(lines))
    
    return True, f"moved {len(to_move)}: {[c[2] for c in to_move]}"

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
                    with open(fp) as f:
                        c = f.read()
                    if "import { useTranslation } from 'react-i18next'" not in c:
                        continue
                    cs, _ = find_component(c)
                    if not cs:
                        continue
                    if "t('" in c[:cs] or 't("' in c[:cs]:
                        files.append(fp)
    
    print(f"Files: {len(files)}")
    ok = 0
    skip = 0
    for fp in sorted(files):
        rel = os.path.relpath(fp, BASE_DIR)
        print(f"{rel}...", end=' ')
        try:
            success, msg = fix_file(fp)
            if success:
                ok += 1
                print(f"OK - {msg}")
            else:
                skip += 1
                print(f"SKIP - {msg}")
        except Exception as e:
            print(f"ERROR - {e}")
    
    print(f"\nOK: {ok}, Skipped: {skip}")

if __name__ == '__main__':
    main()
