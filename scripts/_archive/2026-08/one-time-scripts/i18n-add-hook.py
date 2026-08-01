import re
import sys

def add_import(content, import_name, from_path):
    if import_name in content:
        return content
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, f"import {{ {import_name} }} from '{from_path}';")
    return '\n'.join(lines)

def find_component_end(lines, start_idx):
    """Find the end of a component by tracking braces starting from start_idx.
    Returns the line index of the closing brace.
    Handles both explicit return (=> { ... }) and implicit return (=> ( ... )).
    """
    # First, find => { or => ( by looking ahead up to 5 lines
    arrow_idx = None
    is_explicit = False
    is_implicit = False
    
    for j in range(start_idx, min(start_idx + 15, len(lines))):
        if '=> {' in lines[j]:
            arrow_idx = j
            is_explicit = True
            break
        elif '=> (' in lines[j]:
            arrow_idx = j
            is_implicit = True
            break
    
    if arrow_idx is None:
        return None, None, None
    
    if is_explicit:
        # Track braces from arrow_idx
        brace_count = 0
        found_open = False
        for j in range(arrow_idx, len(lines)):
            for ch in lines[j]:
                if ch == '{':
                    brace_count += 1
                    found_open = True
                elif ch == '}':
                    brace_count -= 1
            if found_open and brace_count == 0:
                return arrow_idx, j, 'explicit'
    elif is_implicit:
        # Track parens from arrow_idx
        paren_count = 0
        found_open = False
        for j in range(arrow_idx, len(lines)):
            for ch in lines[j]:
                if ch == '(':
                    paren_count += 1
                    found_open = True
                elif ch == ')':
                    paren_count -= 1
            if found_open and paren_count == 0:
                return arrow_idx, j, 'implicit'
    
    return arrow_idx, len(lines) - 1, None

def add_use_translation(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = add_import(content, 'useTranslation', 'react-i18next')
    lines = content.split('\n')
    
    # Find all component declarations first
    components = []
    for i, line in enumerate(lines):
        # Look for component start - lines that start with optional export const NAME: React.FC
        stripped = line.strip()
        if re.match(r'^(export\s+)?const\s+(\w+):\s*React\.FC', stripped):
            # Extract component name
            m = re.match(r'^(export\s+)?const\s+(\w+):', stripped)
            if m:
                comp_name = m.group(2)
                # Skip non-component declarations (like type aliases)
                if comp_name[0].isupper() and comp_name != 'React':
                    components.append((i, comp_name))
    
    print(f"Found {len(components)} components in {filepath}")
    
    # Process components in reverse order to avoid index shifting
    for start_idx, comp_name in reversed(components):
        # Check if already has useTranslation
        check_text = '\n'.join(lines[start_idx:start_idx+20])
        if 'useTranslation' in check_text:
            print(f"  [{comp_name}] Already has useTranslation, skip")
            continue
        
        arrow_idx, end_idx, style = find_component_end(lines, start_idx)
        
        if arrow_idx is None:
            print(f"  [{comp_name}] Could not find arrow function, skip")
            continue
        
        if style == 'explicit':
            # Insert after => { line
            brace_line = lines[arrow_idx]
            brace_pos = brace_line.index('{')
            indent = ' ' * (brace_pos + 2)
            
            lines.insert(arrow_idx + 1, f'{indent}const {{ t }} = useTranslation();')
            print(f"  [{comp_name}] Added useTranslation (explicit return)")
            
        elif style == 'implicit':
            # Convert implicit to explicit
            # 1. Change => ( to => {
            old_line = lines[arrow_idx]
            lines[arrow_idx] = old_line.replace('=> (', '=> {')
            
            brace_pos = lines[arrow_idx].index('{')
            indent = ' ' * (brace_pos + 2)
            
            # 2. Insert useTranslation and return (
            lines.insert(arrow_idx + 1, f'{indent}const {{ t }} = useTranslation();')
            lines.insert(arrow_idx + 2, f'{indent}return (')
            
            # 3. Fix the closing ) to ); }
            # After inserting 2 lines, the end_idx shifted by 2
            new_end_idx = end_idx + 2
            if new_end_idx < len(lines):
                closing_line = lines[new_end_idx]
                # Change ); to ); } (add closing brace)
                lines[new_end_idx] = closing_line.rstrip() + ' }'
            
            print(f"  [{comp_name}] Added useTranslation (converted implicit to explicit)")
    
    result = '\n'.join(lines)
    with open(filepath, 'w') as f:
        f.write(result)
    
    print(f"Processed {filepath}")

if __name__ == '__main__':
    for path in sys.argv[1:]:
        add_use_translation(path)