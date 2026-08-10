#!/usr/bin/env python3
"""V73: Delete redundant/unused compat functions across all services."""

import json
import re
import os
from pathlib import Path

ROOT = Path('/Users/xingzhai/TOPEMS')

def load_delete_list():
    with open(ROOT / 'docs/audit/v73-compat-deadcode.json') as f:
        data = json.load(f)

    to_delete = {}
    for svc, info in data['services'].items():
        if svc == 'finance':
            continue  # already done
        functions = []
        for cat in ['dead_code', 'redundant_but_used', 'unused_but_unique']:
            for item in info.get(cat, []):
                functions.append(item['function'])
        if functions:
            to_delete[svc] = {
                'functions': set(functions),
                'compat_file': info.get('compat_file', ''),
                'total_compat': info.get('total_compat', 0),
            }
    return to_delete

def remove_utoipa_blocks(content, function_names):
    """Remove utoipa path blocks for given function names from file content."""
    lines = content.split('\n')
    result = []
    i = 0
    removed = 0

    while i < len(lines):
        line = lines[i]

        # Check if this line starts a utoipa block
        if '#[utoipa::path(' in line:
            # Find the end of the utoipa attribute (matching parens)
            block_start = i
            paren_depth = line.count('(') - line.count(')')
            j = i + 1
            while j < len(lines) and paren_depth > 0:
                paren_depth += lines[j].count('(') - lines[j].count(')')
                j += 1

            # Now j points to the line after the closing )]
            # The next non-empty line should be the function definition
            func_line_idx = j
            while func_line_idx < len(lines) and lines[func_line_idx].strip() == '':
                func_line_idx += 1

            if func_line_idx < len(lines):
                func_line = lines[func_line_idx]
                # Extract function name
                m = re.search(r'pub\s+async\s+fn\s+(\w+)', func_line)
                if m and m.group(1) in function_names:
                    # Skip the utoipa block, function definition, and any trailing empty lines
                    # Move past the function definition line
                    end_idx = func_line_idx + 1
                    # Skip empty lines after the function
                    while end_idx < len(lines) and lines[end_idx].strip() == '':
                        end_idx += 1

                    # Also skip any preceding comment lines
                    comment_start = block_start
                    while comment_start > 0 and lines[comment_start - 1].strip().startswith('//'):
                        comment_start -= 1

                    i = end_idx
                    removed += 1
                    continue

            # Also check for macro-based compat (erp_finance_compat)
            # Look for compat_path! macro
            if 'compat_path!' in line or 'compat_path' in line:
                pass  # handled separately

        result.append(line)
        i += 1

    return '\n'.join(result), removed

def remove_openapi_registrations(content, function_names):
    """Remove registration lines from openapi.rs for given function names."""
    lines = content.split('\n')
    result = []
    removed = 0

    for line in lines:
        should_remove = False
        for fname in function_names:
            # Use exact match: function name must be followed by comma, whitespace, or end of line
            # This prevents substring matching (e.g. compat_get_api_crm_customers matching compat_get_api_crm_customers_id)
            if re.search(re.escape(fname) + r'\s*,?\s*$', line):
                should_remove = True
                break

        if should_remove:
            removed += 1
            continue

        result.append(line)

    # Clean up consecutive empty lines
    cleaned = []
    prev_empty = False
    for line in result:
        if line.strip() == '':
            if prev_empty:
                continue
            prev_empty = True
        else:
            prev_empty = False
        cleaned.append(line)

    return '\n'.join(cleaned), removed

def find_openapi_file(svc, compat_file):
    """Find the openapi.rs file for a service."""
    # compat_file is like 'svc/finance/src/modules/finance_compat.rs'
    svc_path = Path(ROOT) / compat_file.split('/src/')[0]
    openapi_path = svc_path / 'src' / 'openapi.rs'
    if openapi_path.exists():
        return str(openapi_path)

    # Try alternative locations
    for p in svc_path.rglob('openapi.rs'):
        return str(p)

    return None

def find_mod_file(svc, compat_file):
    """Find the mod.rs file that declares the compat module."""
    compat_dir = Path(ROOT) / compat_file
    mod_file = compat_dir.parent / 'mod.rs'
    if mod_file.exists():
        return str(mod_file)
    return None

def process_service(svc, info):
    """Process a single service: remove compat functions and registrations."""
    functions = info['functions']
    compat_file = str(ROOT / info['compat_file'])

    print(f"\n--- {svc} ({len(functions)} functions to delete) ---")
    print(f"  Compat file: {compat_file}")

    if not os.path.exists(compat_file):
        print(f"  ERROR: compat file not found")
        return 0, 0

    # Read compat file
    with open(compat_file, 'r') as f:
        compat_content = f.read()

    # Remove utoipa blocks
    new_compat, compat_removed = remove_utoipa_blocks(compat_content, functions)
    print(f"  Removed {compat_removed} functions from compat file")

    # Write back
    with open(compat_file, 'w') as f:
        f.write(new_compat)

    # Find and update openapi.rs
    openapi_file = find_openapi_file(svc, info['compat_file'])
    openapi_removed = 0
    if openapi_file:
        with open(openapi_file, 'r') as f:
            openapi_content = f.read()

        new_openapi, openapi_removed = remove_openapi_registrations(openapi_content, functions)
        print(f"  Removed {openapi_removed} registrations from {openapi_file}")

        with open(openapi_file, 'w') as f:
            f.write(new_openapi)
    else:
        print(f"  WARNING: openapi.rs not found")

    # Check if ALL compat functions were removed - if so, remove module declaration
    total = info['total_compat']
    if compat_removed >= total:
        mod_file = find_mod_file(svc, info['compat_file'])
        if mod_file:
            with open(mod_file, 'r') as f:
                mod_content = f.read()

            # Find and remove the module declaration
            compat_module_name = Path(info['compat_file']).stem
            # Pattern: pub mod module_name;  or  mod module_name;
            pattern = rf'^\s*(pub\s+)?mod\s+{re.escape(compat_module_name)}\s*;\s*$'
            new_mod = re.sub(pattern, '', mod_content, flags=re.MULTILINE)

            if new_mod != mod_content:
                with open(mod_file, 'w') as f:
                    f.write(new_mod)
                print(f"  Removed module declaration from {mod_file}")

                # Delete the compat file if empty
                with open(compat_file, 'r') as f:
                    remaining = f.read().strip()
                if not remaining or remaining.startswith('//') and len(remaining.split('\n')) <= 5:
                    os.remove(compat_file)
                    print(f"  Deleted empty compat file: {compat_file}")

    return compat_removed, openapi_removed

def main():
    to_delete = load_delete_list()

    total_compat_removed = 0
    total_openapi_removed = 0

    for svc, info in sorted(to_delete.items()):
        c, o = process_service(svc, info)
        total_compat_removed += c
        total_openapi_removed += o

    print(f"\n=== TOTAL ===")
    print(f"  Compat functions removed: {total_compat_removed}")
    print(f"  OpenAPI registrations removed: {total_openapi_removed}")

if __name__ == '__main__':
    main()
