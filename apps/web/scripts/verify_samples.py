#!/usr/bin/env python3
"""抽样验证候选文件"""

import sys
sys.path.insert(0, '/Users/air/TOPEMS/apps/web/scripts')
from analyze_crud_precise import extract_mutations_detailed, read_file_content

test_files = [
    "pages/erp/SupplierManagementPage.tsx",
    "pages/wms/BatchManagementPage.tsx",
    "pages/wms/OutboundOrderPage.tsx",
    "pages/qms/QmsStandardListPage.tsx",
    "pages/crm/CustomerManagementPage.tsx",
]

for rel_path in test_files:
    print(f"\n{'='*60}")
    print(f"文件: {rel_path}")
    print(f"{'='*60}")
    
    content = read_file_content(rel_path)
    mutations = extract_mutations_detailed(content)
    
    print(f"提取到 {len(mutations)} 个 mutation:")
    for i, mut in enumerate(mutations):
        has_success_notify = mut['on_success_body'] and 'addNotification' in mut['on_success_body']
        has_success_invalidate = mut['on_success_body'] and ('invalidateQueries' in mut['on_success_body'] or 'queryClient.invalidateQueries' in mut['on_success_body'])
        has_error_notify = mut['on_error_body'] and 'addNotification' in mut['on_error_body']
        has_error_logger = mut['on_error_body'] and ('logger.error' in mut['on_error_body'] or 'apiLogger.error' in mut['on_error_body'])
        
        print(f"\n  [{i}] {mut['name']}")
        print(f"      onSuccess: notify={has_success_notify}, invalidate={has_success_invalidate}")
        print(f"      onError: notify={has_error_notify}, logger={has_error_logger}")
        
        if mut['on_success_body']:
            print(f"      onSuccess 预览: {mut['on_success_body'][:150]}...")
