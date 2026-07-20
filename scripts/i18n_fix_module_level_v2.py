#!/usr/bin/env python3
"""
Fix module-level t() usage in TSX files.
Moves module-level const declarations that use t() inside the component function.
Also handles variable name conflicts (e.g., QualityInspectionPage's local `t` variable).
"""

import re
import os
from pathlib import Path

FILES_TO_FIX = [
    '/Users/air/TOPEMS/apps/web/src/pages/wms/BatchManagementPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/InboundOrderPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/InboundPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/InventoryPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/LocationPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundOrderPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/ReplenishmentPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/SerialNumberPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/StockTakePage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/TransferPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/QualityInspectionPage.tsx',
]


def find_matching_brace(content, start_pos):
    """Find the matching closing brace for an opening brace at start_pos.
    Returns the position of the closing brace (or -1 if not found).
    """
    if content[start_pos] != '{':
        return -1
    depth = 0
    i = start_pos
    in_string = False
    string_char = None
    in_line_comment = False
    in_block_comment = False
    while i < len(content):
        c = content[i]
        # Handle string state
        if in_string:
            if c == '\\':
                i += 2
                continue
            if c == string_char:
                in_string = False
            i += 1
            continue
        # Handle comment states
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == '*' and i + 1 < len(content) and content[i + 1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        # Not in string or comment
        if c == '/' and i + 1 < len(content):
            if content[i + 1] == '/':
                in_line_comment = True
                i += 2
                continue
            if content[i + 1] == '*':
                in_block_comment = True
                i += 2
                continue
        if c in ('"', "'", '`'):
            in_string = True
            string_char = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_const_block_end(content, const_start):
    """Find the end position (after the semicolon) of a const declaration starting at const_start.
    The const declaration may span multiple lines and have nested braces.
    Returns (end_pos_inclusive_semicolon, end_pos_brace) or (-1, -1) if not found.
    """
    # Find the = sign after const
    i = const_start + 5  # skip 'const'
    # Skip whitespace
    while i < len(content) and content[i] in ' \t\n':
        i += 1
    # Skip variable name and type annotation
    while i < len(content) and content[i] != '=':
        # Skip type annotations with nested <>
        if content[i] == '<':
            depth = 1
            i += 1
            while i < len(content) and depth > 0:
                if content[i] == '<':
                    depth += 1
                elif content[i] == '>':
                    depth -= 1
                i += 1
            continue
        i += 1
    if i >= len(content):
        return -1, -1
    # i is at '='
    i += 1
    # Skip whitespace
    while i < len(content) and content[i] in ' \t\n':
        i += 1
    if i >= len(content):
        return -1, -1
    # Now we should be at the start of the value
    value_start = i
    # Find the end of the value
    if content[i] == '{':
        # Object literal - find matching brace
        brace_end = find_matching_brace(content, i)
        if brace_end == -1:
            return -1, -1
        # Find the semicolon after the brace
        j = brace_end + 1
        while j < len(content) and content[j] in ' \t\n':
            j += 1
        if j < len(content) and content[j] == ';':
            return j + 1, brace_end
        return brace_end + 1, brace_end
    elif content[i] == '[':
        # Array literal - find matching bracket
        depth = 1
        i += 1
        in_string = False
        string_char = None
        while i < len(content) and depth > 0:
            c = content[i]
            if in_string:
                if c == '\\':
                    i += 2
                    continue
                if c == string_char:
                    in_string = False
                i += 1
                continue
            if c in ('"', "'", '`'):
                in_string = True
                string_char = c
            elif c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
            i += 1
        if depth != 0:
            return -1, -1
        # i is after the closing bracket
        j = i
        while j < len(content) and content[j] in ' \t\n':
            j += 1
        if j < len(content) and content[j] == ';':
            return j + 1, i - 1
        return i, i - 1
    else:
        # Some other expression - find the semicolon
        # This is a simplification; doesn't handle all cases
        in_string = False
        string_char = None
        while i < len(content):
            c = content[i]
            if in_string:
                if c == '\\':
                    i += 2
                    continue
                if c == string_char:
                    in_string = False
                i += 1
                continue
            if c in ('"', "'", '`'):
                in_string = True
                string_char = c
            elif c == ';':
                return i + 1, i
            i += 1
        return -1, -1


def fix_module_level_t_usage(file_path):
    """Fix module-level t() usage in a TSX file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the component function declaration
    # Pattern: const ComponentName: React.FC = () => {
    # or: const ComponentName: React.FC<Props> = () => {
    # or: const ComponentName = () => {
    # or: function ComponentName() {
    component_pattern = re.compile(
        r'(const\s+(\w+)\s*(?::\s*React\.FC(?:<[^>]*>)?)?\s*=\s*(?:\([^)]*\)\s*=>|\([^)]*\)\s*:\s*React\.ReactElement\s*=>)\s*\{|function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)',
        re.MULTILINE
    )

    component_match = component_pattern.search(content)
    if not component_match:
        print(f'  Could not find component function in {file_path}')
        return False

    component_name = component_match.group(2) or component_match.group(3)
    component_start = component_match.start()
    # Find the opening brace of the component function
    brace_pos = content.find('{', component_match.end() - 1)
    if brace_pos == -1:
        print(f'  Could not find component opening brace in {file_path}')
        return False

    # Find the `const { t } = useTranslation();` line inside the component
    use_trans_pattern = re.compile(r'const\s*\{\s*t\s*\}\s*=\s*useTranslation\s*\(\s*\)\s*;')
    use_trans_match = use_trans_pattern.search(content, brace_pos)
    if not use_trans_match:
        print(f'  Could not find useTranslation() in {file_path}')
        return False

    use_trans_end = use_trans_match.end()

    # Find all module-level const declarations before the component function
    # that use t(...)
    # We need to find top-level const declarations (not inside any function/object)
    module_consts_to_move = []

    pos = 0
    while pos < component_start:
        # Find next 'const ' at the start of a line (or after some whitespace)
        const_match = re.search(r'^const\s+', content[pos:component_start], re.MULTILINE)
        if not const_match:
            break
        const_start = pos + const_match.start()
        # Check if this const is at module level (not inside a function)
        # We can check by counting braces before this position
        # But since we're searching before component_start, and the component is the first function,
        # this should be fine. However, we need to skip type declarations.
        
        # Check if it's a type declaration
        if re.match(r'^const\s+\w+\s*:', content[const_start:]):
            # This is a typed const - check if it uses t()
            # Find the end of this const declaration
            end_pos, brace_end = find_const_block_end(content, const_start)
            if end_pos == -1:
                pos = const_start + 5
                continue
            const_text = content[const_start:end_pos]
            # Check if it uses t(
            if re.search(r'\bt\s*\(', const_text):
                module_consts_to_move.append((const_start, end_pos, const_text))
            pos = end_pos
        else:
            pos = const_start + 5

    if not module_consts_to_move:
        print(f'  No module-level t() usage found in {file_path}')
        # But still might need to fix variable name conflicts
    else:
        print(f'  Found {len(module_consts_to_move)} module-level const(s) to move in {file_path}')

        # Remove the module-level const declarations and collect them
        consts_text = []
        # Process in reverse order to preserve positions
        for start, end, text in reversed(module_consts_to_move):
            # Remove the const declaration and any trailing blank lines
            # Find the start of the line
            line_start = start
            while line_start > 0 and content[line_start - 1] != '\n':
                line_start -= 1
            # Find the end of the line containing the end position
            line_end = end
            while line_end < len(content) and content[line_end] != '\n':
                line_end += 1
            # Include the newline
            if line_end < len(content):
                line_end += 1
            # Extract the const text (without leading/trailing whitespace)
            const_text = content[start:end].strip()
            consts_text.insert(0, const_text)
            # Remove the entire line(s) including the const declaration
            content = content[:line_start] + content[line_end:]

        # Re-find the component function and useTranslation position since content changed
        component_match = component_pattern.search(content)
        if not component_match:
            print(f'  Lost component function after editing {file_path}')
            return False
        brace_pos = content.find('{', component_match.end() - 1)
        if brace_pos == -1:
            print(f'  Lost component opening brace after editing {file_path}')
            return False
        use_trans_match = use_trans_pattern.search(content, brace_pos)
        if not use_trans_match:
            print(f'  Lost useTranslation() position after editing {file_path}')
            return False
        use_trans_end = use_trans_match.end()

        # Build the insertion text
        insertion = '\n'
        for const_text in consts_text:
            # Indent with 2 spaces
            indented = '\n'.join('  ' + line if line else line for line in const_text.split('\n'))
            insertion += indented + '\n'

        # Insert after useTranslation
        content = content[:use_trans_end] + insertion + content[use_trans_end:]

    # Now handle the variable name conflict in QualityInspectionPage.tsx
    if 'QualityInspectionPage' in file_path:
        # Find the pattern: const t = typeMap[type] || ...
        # and rename to: const typeBadge = typeMap[type] || ...
        # Also update references t.label -> typeBadge.label, t.bg -> typeBadge.bg, t.color -> typeBadge.color
        # But only within that function scope
        conflict_pattern = re.compile(r'const\s+t\s*=\s*typeMap\[type\]')
        conflict_match = conflict_pattern.search(content)
        if conflict_match:
            # Find the function scope containing this
            # Look for the enclosing function
            func_start = content.rfind('const getTypeBadge', 0, conflict_match.start())
            if func_start == -1:
                func_start = content.rfind('getTypeBadge', 0, conflict_match.start())
            if func_start != -1:
                # Find the function body braces
                func_brace = content.find('{', func_start)
                if func_brace != -1:
                    func_end_brace = find_matching_brace(content, func_brace)
                    if func_end_brace != -1:
                        # Replace within the function scope
                        func_body = content[func_brace:func_end_brace + 1]
                        # Rename `const t = typeMap[type]` to `const typeBadge = typeMap[type]`
                        new_func_body = re.sub(r'\bconst\s+t\s*=\s*typeMap\[type\]', 'const typeBadge = typeMap[type]', func_body)
                        # Replace `t.label`, `t.bg`, `t.color` (but not `t(` calls)
                        new_func_body = re.sub(r'\bt\.(label|bg|color)\b', r'typeBadge.\1', new_func_body)
                        content = content[:func_brace] + new_func_body + content[func_end_brace + 1:]
                        print(f'  Fixed variable name conflict in QualityInspectionPage')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return True


def main():
    for file_path in FILES_TO_FIX:
        print(f'Processing {file_path}')
        if not os.path.exists(file_path):
            print(f'  File not found')
            continue
        fix_module_level_t_usage(file_path)


if __name__ == '__main__':
    main()
