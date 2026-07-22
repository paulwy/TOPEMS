#!/usr/bin/env python3
import re
import os

FILES_TO_FIX = [
    'apps/web/src/pages/finance/BudgetManagementPage.tsx',
    'apps/web/src/pages/finance/FinanceBudgetPage.tsx',
    'apps/web/src/pages/finance/FinanceCostPage.tsx',
    'apps/web/src/pages/finance/FinanceLedgerPage.tsx',
    'apps/web/src/pages/finance/FinanceTaxPage.tsx',
    'apps/web/src/pages/hrm/HrmPayrollPage.tsx',
    'apps/web/src/pages/hrm/HrmRecruitmentPage.tsx',
    'apps/web/src/pages/hrm/HrmTrainingPage.tsx',
    'apps/web/src/pages/bi/GisPage/components/DataTableSection.tsx',
]

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    use_translation_line = "import { useTranslation } from 'react-i18next';\n"
    
    if use_translation_line not in content:
        print(f"  SKIP: no useTranslation import found")
        return False
    
    lines = content.split('\n')
    new_lines = []
    removed_line = False
    
    for line in lines:
        if "import { useTranslation } from 'react-i18next';" in line:
            removed_line = True
            continue
        new_lines.append(line)
    
    if not removed_line:
        print(f"  SKIP: line not removed")
        return False
    
    result = '\n'.join(new_lines)
    
    last_import_idx = 0
    result_lines = result.split('\n')
    for i, line in enumerate(result_lines):
        stripped = line.strip()
        if stripped.startswith('import ') and 'from ' in stripped:
            last_import_idx = i
    
    insert_idx = last_import_idx + 1
    result_lines.insert(insert_idx, use_translation_line.rstrip('\n'))
    
    final_content = '\n'.join(result_lines)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    return True

def main():
    base_dir = '/Users/air/TOPEMS'
    count = 0
    for filepath in FILES_TO_FIX:
        full_path = os.path.join(base_dir, filepath)
        if not os.path.exists(full_path):
            print(f"MISSING: {filepath}")
            continue
        print(f"Fixing: {filepath}")
        if fix_file(full_path):
            count += 1
            print(f"  OK")
    print(f"\nFixed {count} files")

if __name__ == '__main__':
    main()
