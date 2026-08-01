#!/usr/bin/env python3
"""Debug script to understand remaining Chinese text in target files"""
import re
from pathlib import Path

BASE = Path('/Users/air/TOPEMS/apps/web/src/pages')

def find_multiline_jsx_text(file_path):
    """Find Chinese text that appears between JSX tags on separate lines"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all lines that contain only whitespace + Chinese text
    lines = content.split('\n')
    results = []
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped and not stripped.startswith('//') and not stripped.startswith('*'):
            if any('\u4e00' <= c <= '\u9fff' for c in stripped):
                # Check if this line is inside JSX (between opening and closing tags)
                # Simple heuristic: check if previous non-empty line ends with '>'
                # and next non-empty line starts with '<'
                prev_line = ''
                next_line = ''
                for j in range(i-2, -1, -1):
                    if lines[j].strip():
                        prev_line = lines[j].strip()
                        break
                for j in range(i, len(lines)):
                    if lines[j].strip():
                        next_line = lines[j].strip()
                        break
                
                is_jsx_text = (
                    prev_line.endswith('>') and 
                    (next_line.startswith('</') or next_line.startswith('/') or next_line.startswith('}'))
                )
                
                if is_jsx_text:
                    results.append((i, stripped, 'JSX_CHILD'))
                elif prev_line.endswith(':') and (stripped.startswith("'") or stripped.startswith('`')):
                    results.append((i, stripped, 'STRING_VALUE'))
                elif any(kw in stripped for kw in ['message:', 'title:', 'label:', 'description:']):
                    results.append((i, stripped, 'PROP_VALUE'))
    
    return results

def main():
    target_files = [
        BASE / 'admin' / 'MonitoringAlertPage.tsx',
        BASE / 'admin' / 'DictionaryManagementPage.tsx',
        BASE / 'admin' / 'MigrationAdminPage.tsx',
        BASE / 'admin' / 'AccountManagementPage.tsx',
        BASE / 'wms' / 'InventoryReportPage.tsx',
        BASE / 'wms' / 'InventoryPage.tsx',
        BASE / 'system' / 'AuditLogPage.tsx',
    ]
    
    for fp in target_files:
        if fp.exists():
            results = find_multiline_jsx_text(fp)
            if results:
                print(f'\n=== {fp.name} ===')
                for line_no, text, category in results:
                    print(f'  L{line_no} [{category}]: {text[:80]}')

if __name__ == '__main__':
    main()