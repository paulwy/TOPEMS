#!/usr/bin/env python3
"""调试脚本"""

import re
import sys

sys.path.insert(0, '/Users/air/TOPEMS/apps/web/scripts')
from analyze_crud_candidates_v4 import extract_mutation_info

SRC_DIR = "/Users/air/TOPEMS/apps/web/src"

test_files = [
    "pages/mes/ProcessFlowPage.tsx",
    "pages/crm/CustomerManagementPage.tsx",
]

for rel_path in test_files:
    print(f"\n{'='*60}")
    print(f"文件: {rel_path}")
    print(f"{'='*60}")
    
    with open(f"{SRC_DIR}/{rel_path}", 'r', encoding='utf-8') as f:
        content = f.read()
    
    mutations = extract_mutation_info(content)
    print(f"提取到 {len(mutations)} 个 mutation:")
    for i, mut in enumerate(mutations):
        print(f"\n  [{i}] {mut['name']}")
        print(f"      onSuccess: notify={mut['on_success_has_notify']}, invalidate={mut['on_success_has_invalidate']}")
        print(f"      onError: notify={mut['on_error_has_notify']}, logger={mut['on_error_has_logger']}")
        print(f"      invalidated_keys: {mut['invalidated_keys']}")
