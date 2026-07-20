#!/usr/bin/env python3
"""
Fix script: Move module-level constants that use t() inside the component function.
"""

import re
import os
import sys

FILES_TO_FIX = [
    '/Users/air/TOPEMS/apps/web/src/pages/wms/BatchManagementPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/InboundOrderPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/InboundPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/InventoryPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/InventoryReportPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/LocationPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundOrderPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/ReplenishmentPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/SerialNumberPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/StockTakePage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/SupplierManagementPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/wms/TransferPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/WorkStationPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionProcessPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/ProcessRoutePage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/ProcessFlowPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/EquipmentOEEPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/EquipmentManagementPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialIssuePage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialReturnPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialBOMPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialRequirementPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/WorkReportPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/TeamManagementPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionRecordPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionOrderDetailPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionOrderManagementPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionSchedulePage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/QualityInspectionPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/WorkOrderPage.tsx',
    '/Users/air/TOPEMS/apps/web/src/pages/mes/MesQualityPage.tsx',
]


def fix_module_level_t_usage(content):
    """Find module-level const declarations that use t() and move them inside the component.
    
    Strategy:
    1. Find the component function start
    2. Find the `const { t } = useTranslation();` line
    3. Find all const declarations BEFORE the component that use t()
    4. Remove them from module level
    5. Insert them after the useTranslation hook
    """
    # Find component function start
    component_pattern = re.compile(
        r'(const\s+\w+\s*:\s*React\.FC(?:<[^>]*>)?\s*=\s*(?:\([^)]*\)\s*=>|\(\)\s*=>)\s*\{)',
        re.MULTILINE
    )
    match = component_pattern.search(content)
    if not match:
        return content, False
    
    component_start = match.start()
    
    # Find the useTranslation hook line
    hook_pattern = re.compile(r'const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\)\s*;')
    hook_match = hook_pattern.search(content, match.end())
    if not hook_match:
        return content, False
    
    hook_end = hook_match.end()
    
    # Find all const declarations before component_start that use t()
    # Pattern: const identifier = ... t(...) ... ;
    # This is tricky because we need to handle multi-line declarations
    
    # Split content into lines for analysis
    lines = content.split('\n')
    
    # Find line index of component_start
    comp_line_idx = 0
    pos = 0
    for i, line in enumerate(lines):
        if pos + len(line) + 1 > component_start:
            comp_line_idx = i
            break
        pos += len(line) + 1
    
    # Find const declarations before component that use t()
    # We'll look for patterns like:
    # const xxx = {...};
    # const xxx = [...];
    # const xxx = '...';  (if it contains t())
    
    declarations_to_move = []
    lines_to_remove = set()
    
    i = 0
    while i < comp_line_idx:
        line = lines[i]
        stripped = line.strip()
        
        # Check if this line starts a const declaration
        if stripped.startswith('const ') and '=' in stripped:
            # Find the end of this declaration (look for ;)
            decl_start = i
            decl_end = i
            depth = 0
            in_string = False
            string_char = None
            
            while decl_end < comp_line_idx:
                decl_line = lines[decl_end]
                for char in decl_line:
                    if in_string:
                        if char == string_char:
                            in_string = False
                            string_char = None
                        elif char == '\\':
                            pass  # skip next char
                    else:
                        if char in '\'"`':
                            in_string = True
                            string_char = char
                        elif char in '{[(':
                            depth += 1
                        elif char in ')]}':
                            depth -= 1
                        elif char == ';' and depth == 0:
                            # End of declaration
                            break
                else:
                    decl_end += 1
                    continue
                break
            
            # Check if this declaration contains t( calls
            decl_text = '\n'.join(lines[decl_start:decl_end+1])
            if 't(' in decl_text and 'useTranslation' not in decl_text:
                # This declaration uses t() - need to move it
                declarations_to_move.append((decl_start, decl_end, decl_text))
                for idx in range(decl_start, decl_end + 1):
                    lines_to_remove.add(idx)
            
            i = decl_end + 1
        else:
            i += 1
    
    if not declarations_to_move:
        return content, False
    
    # Build new content
    # 1. Remove the declaration lines
    new_lines = []
    for i, line in enumerate(lines):
        if i not in lines_to_remove:
            new_lines.append(line)
    
    # 2. Find the hook line in new_lines (positions have changed)
    new_content = '\n'.join(new_lines)
    hook_match = hook_pattern.search(new_content)
    if not hook_match:
        return content, False
    
    # Find the line index of the hook
    hook_line_idx = 0
    pos = 0
    for i, line in enumerate(new_lines):
        if pos + len(line) + 1 > hook_match.end():
            hook_line_idx = i
            break
        pos += len(line) + 1
    
    # 3. Insert the declarations after the hook line
    # Indent them with 2 spaces
    insert_lines = []
    for decl_start, decl_end, decl_text in declarations_to_move:
        # Re-indent the declaration to 2 spaces
        decl_lines = decl_text.split('\n')
        # Remove leading whitespace from first line and add 2 spaces
        first_line = decl_lines[0].lstrip()
        decl_lines[0] = '  ' + first_line
        # For subsequent lines, preserve relative indentation
        # Find the original indentation of the first line
        orig_indent = decl_lines[0][2:]  # remove the 2 spaces we added
        orig_first_indent = len(decl_lines[0]) - len(first_line) - 2
        # Adjust subsequent lines
        for j in range(1, len(decl_lines)):
            if decl_lines[j].strip():
                # Remove original indentation and add 2 + relative
                relative = len(decl_lines[j]) - len(decl_lines[j].lstrip()) - orig_first_indent
                if relative < 0:
                    relative = 0
                decl_lines[j] = '  ' + ' ' * relative + decl_lines[j].lstrip()
        insert_lines.extend(decl_lines)
        insert_lines.append('')  # blank line after
    
    # Insert after hook line
    new_lines = new_lines[:hook_line_idx + 1] + insert_lines + new_lines[hook_line_idx + 1:]
    
    return '\n'.join(new_lines), True


def main():
    print("=== Fix Module-Level t() Usage ===")
    
    fixed_count = 0
    for file_path in FILES_TO_FIX:
        if not os.path.exists(file_path):
            print(f"NOT FOUND: {file_path}")
            continue
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content, was_fixed = fix_module_level_t_usage(content)
        
        if was_fixed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"FIXED: {os.path.basename(file_path)}")
            fixed_count += 1
        else:
            print(f"SKIP: {os.path.basename(file_path)}")
    
    print(f"\n=== Summary ===")
    print(f"Files fixed: {fixed_count}")


if __name__ == '__main__':
    main()
