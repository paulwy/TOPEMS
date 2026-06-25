import os
import re

src_dir = '/Users/air/TOPEMS/apps/web/src/pages'

files_with_errors = [
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

for rel_path in files_with_errors:
    filepath = os.path.join(src_dir, rel_path)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    has_use_app_store = 'useAppStore' in content
    
    if not has_use_app_store and ('addNotification(' in content or 'success(' in content or 'error(' in content):
        lines = content.split('\n')
        new_lines = []
        added_import = False
        
        for i, line in enumerate(lines):
            if 'import { useAppStore }' in line:
                added_import = True
            elif not added_import and 'import' in line:
                if '@/' in line or '../../' in line:
                    new_lines.append(line)
                    new_lines.append("import { useAppStore } from '@/store';")
                    added_import = True
                    continue
            
            if not has_use_app_store:
                if 'const {' in line and 'useState' in line and line.strip().endswith('};'):
                    new_lines.append(line)
                    new_lines.append('  const addNotification = useAppStore((state) => state.addNotification);')
                    has_use_app_store = True
                elif 'const [formData' in line and 'useState' in line:
                    new_lines.append(line)
                    new_lines.append('  const addNotification = useAppStore((state) => state.addNotification);')
                    has_use_app_store = True
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        content = '\n'.join(new_lines)
    
    content = re.sub(r"error\('([^']+)'\)", r"addNotification({ title: '错误', message: '\1', type: 'error' })", content)
    content = re.sub(r"success\('([^']+)'\)", r"addNotification({ title: '成功', message: '\1', type: 'success' })", content)
    
    content = content.replace("error(res.message || '", "addNotification({ title: '错误', message: res.message || '")
    content = content.replace("error((err as { message?: string }).message || '", "addNotification({ title: '错误', message: (err as { message?: string }).message || '")
    content = content.replace("error((response as any).message || '", "addNotification({ title: '错误', message: (response as any).message || '")
    
    content = re.sub(r"addNotification\(\{ title: '错误', message: ([^}]+?)'\)", r"addNotification({ title: '错误', message: \1', type: 'error' })", content)
    
    content = content.replace("success(`", "addNotification({ title: '成功', message: `")
    content = content.replace("')}", "', type: 'success' });")
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed: {rel_path}")

print("Done!")
