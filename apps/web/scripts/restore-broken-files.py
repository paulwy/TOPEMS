import os
import re

src_dir = '/Users/air/TOPEMS/apps/web/src/pages'

files_to_fix = [
    'common/DocumentCenterPage.tsx',
    'crm/ContactDetailPage.tsx',
    'crm/CustomerDetailPage.tsx',
    'crm/CustomerEditPage.tsx',
    'finance/FinanceInvoicePage.tsx',
    'finance/FinanceReceiptPage.tsx',
    'hrm/HrmContractDetailPage.tsx',
    'hrm/HrmEmployeeCreatePage.tsx',
    'hrm/HrmEmployeeDetailPage.tsx',
    'hrm/HrmEmployeeEditPage.tsx',
    'hrm/HrmPayrollPage.tsx',
    'hrm/HrmPerformancePage.tsx',
    'hrm/HrmRecruitmentPage.tsx',
    'hrm/HrmReportsPage.tsx',
    'notification/NotificationArchivePage.tsx',
    'notification/NotificationCenter.tsx',
    'notification/NotificationDetailPage.tsx',
    'notification/NotificationTemplatesPage.tsx',
    'report/ReportSchedulePage.tsx',
    'report/ReportSubscriptionPage.tsx',
    'shared/DashboardPage.tsx',
    'shared/HelpCenterPage.tsx',
    'templates/TemplateManagementPage.tsx',
    'wms/SupplierDetailPage.tsx',
]

for rel_path in files_to_fix:
    filepath = os.path.join(src_dir, rel_path)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = content.replace(", type: 'success' });\n          >", "');\n          >")
    content = content.replace(", type: 'success' });\n            >", "');\n            >")
    content = content.replace(", type: 'success' });\n          >", "');\n          >")
    content = content.replace(", type: 'error' });\n          >", "');\n          >")
    content = content.replace(", type: 'error' });\n            >", "');\n            >")
    
    content = content.replace(", type: 'success' });\n              startIcon=", "');\n              startIcon=")
    content = content.replace(", type: 'error' });\n              startIcon=", "');\n              startIcon=")
    
    content = content.replace(", type: 'success' });\n            sx=", "');\n            sx=")
    content = content.replace(", type: 'error' });\n            sx=", "');\n            sx=")
    
    content = content.replace(", type: 'success' });\n          onClick=", "');\n          onClick=")
    content = content.replace(", type: 'error' });\n          onClick=", "');\n          onClick=")
    
    content = content.replace(", type: 'success' });\n      </", "');\n      </")
    content = content.replace(", type: 'error' });\n      </", "');\n      </")
    
    content = content.replace(", type: 'success' });\n    </", "');\n    </")
    content = content.replace(", type: 'error' });\n    </", "');\n    </")
    
    content = content.replace(", type: 'success' });\n  }", "');\n  }")
    content = content.replace(", type: 'error' });\n  }", "');\n  }")
    
    content = content.replace(", type: 'success' });\n);", "');\n);")
    content = content.replace(", type: 'error' });\n);", "');\n);")
    
    content = content.replace(", type: 'success' });\n};", "');\n};")
    content = content.replace(", type: 'error' });\n};", "');\n};")
    
    content = re.sub(r", type: 'success' \}\);$", "');", content, flags=re.MULTILINE)
    content = re.sub(r", type: 'error' \}\);$", "');", content, flags=re.MULTILINE)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Restored: {rel_path}")

print("Done!")
