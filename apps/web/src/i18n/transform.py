#!/usr/bin/env python3
"""
i18n 改造脚本 - 自动将 QMS/HRM/IAM 模块的中文文本替换为 t() 调用
"""
import re, json, os, sys

BASE = '/Users/air/TOPEMS/apps/web/src'

ZH_JSON = os.path.join(BASE, 'i18n/locales/zh.json')
EN_JSON = os.path.join(BASE, 'i18n/locales/en.json')

# ============ ENGLISH TRANSLATIONS ============
# Map Chinese text -> English translation for new keys
EN_MAP = {
    # Common
    '成功': 'Success', '失败': 'Failed', '取消': 'Cancel', '确定': 'Confirm',
    '保存': 'Save', '删除': 'Delete', '编辑': 'Edit', '创建': 'Create',
    '加载': 'Loading', '提交': 'Submit', '分配': 'Assign', '查看': 'View',
    '详情': 'Details', '列表': 'List', '统计': 'Statistics', '导出': 'Export',
    '导入': 'Import', '搜索': 'Search', '筛选': 'Filter', '重置': 'Reset',
    '关闭': 'Close', '打开': 'Open', '确认': 'Confirm', '批准': 'Approve',
    '拒绝': 'Reject', '处理': 'Process', '审核': 'Review', '已完成': 'Completed',
    '进行中': 'In Progress', '待处理': 'Pending', '已关闭': 'Closed',
    '有效': 'Active', '草稿': 'Draft', '已归档': 'Archived', '已过期': 'Expired',
    '加载中': 'Loading...',
    # QMS - Inspection
    '不合格': 'Unqualified', '不合格数量': 'Unqualified Count',
    '分配中': 'Assigning', '分配失败': 'Assignment Failed',
    '分配时发生错误': 'Error during assignment',
    '分配检验人员': 'Assign Inspector', '待分配': 'Pending Assignment',
    '待审核': 'Pending Review', '提交中': 'Submitting',
    '提交失败': 'Submission Failed', '提交检验结果': 'Submit Inspection Result',
    '检验': 'Inspection', '检验结果': 'Inspection Result',
    '合格': 'Qualified', '检验项目': 'Inspection Item',
    '标准值': 'Standard Value', '实测值': 'Measured Value',
    '检验数量': 'Inspection Count', '合格率': 'Pass Rate',
    '检验人员': 'Inspector', '检验时间': 'Inspection Time',
    '待检验': 'Pending Inspection',
    # QMS - EightD
    '报告列表失败': 'Failed to load report list',
    '报告失败': 'Report failed', '更新': 'Update',
    '统计失败': 'Statistics loading failed',
    # QMS - Quality Control
    '不合格品总数': 'Total Nonconforming', '不合格品管理': 'Nonconformance Management',
    '审核总数': 'Total Audits', '审核管理': 'Audit Management',
    '审核计划不支持创建': 'Audit plan creation not supported',
    '审核计划不支持删除': 'Audit plan deletion not supported',
    '审核计划不支持更新': 'Audit plan update not supported',
    '已完成审核': 'Completed Audits', '进行中审核': 'In-progress Audits',
    '质量管理': 'Quality Management',
    # QMS - Audit Management
    '加载审核计划失败': 'Failed to load audit plans',
    '暂不支持创建审核计划': 'Audit plan creation not supported',
    '暂不支持删除审核计划': 'Audit plan deletion not supported',
    '暂不支持更新审核计划': 'Audit plan update not supported',
    # QMS - Nonconformance
    '加载不合格品数据失败': 'Failed to load nonconformance data',
    '创建失败': 'Creation failed', '删除失败': 'Deletion failed',
    '更新失败': 'Update failed',
    # QMS - Standard List
    '加载质量标准数据失败': 'Failed to load quality standards data',
    # QMS - Quality Cost
    '内部损失': 'Internal Loss', '外部损失': 'External Loss',
    '总质量成本': 'Total Quality Cost', '质量成本分析': 'Quality Cost Analysis',
    '鉴定成本': 'Appraisal Cost', '预防成本': 'Prevention Cost',
    # QMS - Dashboard
    '数据': 'Data', '暂无': 'None',
    '暂无分布数据': 'No distribution data', '暂无趋势数据': 'No trend data',
    # QMS - Breadcrumbs
    '产品质量先期策划': 'APQP', '统计过程控制': 'SPC', '分析': 'Analysis',
    # QMS - Standard Detail
    '创建版本失败': 'Version creation failed',
    '删除质量标准失败': 'Quality standard deletion failed',
    '加载版本历史失败': 'Failed to load version history',
    '加载质量标准详情失败': 'Failed to load quality standard details',
    '升级至版本': 'Upgrade to Version',
    # HRM - Common
    '个月': 'months', '试用期': 'Probation Period',
    '到期日期': 'Expiry Date', '劳动合同': 'Labor Contract',
    '合同名称': 'Contract Name', '合同将在': 'Contract will expire in',
    '合同已过期': 'Contract has expired',
    '确定要为': 'Are you sure you want to',
    '确认续签': 'Confirm Renewal', '薪资类型': 'Salary Type',
    '试用期结束日期': 'Probation End Date',
    '请及时处理续签': 'Please process renewal in time',
    '货币类型': 'Currency Type',
    # HRM - Employee Detail
    '与员工关系': 'Relationship with Employee', '入职日期': 'Hire Date',
    '出生日期': 'Birth Date', '办理调岗手续吗': 'Process transfer formalities?',
    '员工类型': 'Employee Type', '员工编号': 'Employee Number',
    '紧急联系人电话': 'Emergency Contact Phone', '职位': 'Position',
    '联系电话': 'Contact Phone', '身份证号': 'ID Number',
    '转正日期': 'Confirmation Date', '邮箱': 'Email',
    # HRM - Employee Finance
    '一孩扣除': 'First Child Deduction', '三孩扣除': 'Third Child Deduction',
    '专项附加扣除': 'Special Additional Deduction',
    '两孩扣除': 'Second Child Deduction',
    '个人公积金扣款': 'Personal Housing Fund Deduction',
    '个人社保扣款': 'Personal Social Security Deduction',
    '估算': 'Estimate', '纳税人识别号': 'Taxpayer ID',
    '薪资设置': 'Salary Settings', '财务信息': 'Financial Information',
    '费用归属': 'Expense Attribution', '费用科目': 'Expense Subject',
    '银行卡号': 'Bank Card Number', '银行账户信息': 'Bank Account Information',
    '薪资信息': 'Salary Information',
    # HRM - Salary Adjustment
    '审批通过成功': 'Approval successful', '操作失败': 'Operation failed',
    '查看详情': 'View Details', '的调薪详情': "'s salary adjustment details",
    '管理员工薪酬调整记录': 'Manage employee salary adjustment records',
    '薪酬调整': 'Salary Adjustment',
    # HRM - Attendance
    '导出功能触发': 'Export function triggered', '考勤管理': 'Attendance Management',
    '考勤统计': 'Attendance Statistics', '考勤记录': 'Attendance Records',
    '请假申请': 'Leave Application',
    # HRM - Validation
    '姓名不能为空': 'Name cannot be empty',
    '工号不能为空': 'Employee number cannot be empty',
    '请输入有效的邮箱地址': 'Please enter a valid email address',
    # HRM - Company
    '公司创建成功': 'Company created successfully',
    '公司删除成功': 'Company deleted successfully',
    '公司总数': 'Total Companies', '公司更新成功': 'Company updated successfully',
    '公司管理': 'Company Management', '禁用公司': 'Disable Company',
    '税号': 'Tax Number', '管理企业公司信息': 'Manage company information',
    '编码': 'Code', '联系方式等': 'Contact information, etc.',
    '部门列表': 'Department List', '部门数量': 'Department Count',
    # HRM - Dashboard
    '员工管理与绩效考核': 'Employee Management and Performance Appraisal',
    # HRM - Organization
    '组织架构': 'Organization Structure',
    # HRM - Performance
    '绩效管理': 'Performance Management',
    # IAM
    '创建用户失败': 'User creation failed', '删除用户失败': 'User deletion failed',
    '加载用户失败': 'Failed to load users', '更新用户失败': 'User update failed',
    '创建角色失败': 'Role creation failed', '删除角色失败': 'Role deletion failed',
    '加载权限失败': 'Failed to load permissions', '删除权限失败': 'Permission deletion failed',
}

def get_module(filepath):
    if '/qms/' in filepath:
        return 'qms'
    elif '/hrm/' in filepath:
        return 'hrm'
    elif '/iam/' in filepath:
        return 'iam'
    return 'unknown'

def get_page_key(filepath):
    """Get a short key name from the file basename"""
    basename = os.path.splitext(os.path.basename(filepath))[0]
    # Remove module prefix
    for prefix in ['Qms', 'Hrm', '']:
        if basename.startswith(prefix):
            basename = basename[len(prefix):]
            break
    # Convert camelCase to snake_case
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', basename)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def load_json(path):
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def deep_set(data, key_path, value):
    keys = key_path.split('.')
    current = data
    for k in keys[:-1]:
        if k not in current:
            current[k] = {}
        elif not isinstance(current[k], dict):
            current[k] = {}
        current = current[k]
    current[keys[-1]] = value

# Files to process
FILES = [
    # QMS
    'pages/qms/QmsInspectionPage.tsx',
    'pages/qms/QmsEightDPage.tsx',
    'pages/qms/QmsQualityControlPage.tsx',
    'pages/qms/QmsAuditManagementPage.tsx',
    'pages/qms/QmsNonconformancePage.tsx',
    'pages/qms/QmsStandardListPage.tsx',
    'pages/qms/QmsQualityCostPage.tsx',
    'pages/qms/QmsDashboardPage.tsx',
    'pages/qms/QmsApqpPage.tsx',
    'pages/qms/QmsSpcPage.tsx',
    'pages/qms/QmsFmeaPage.tsx',
    'pages/qms/QmsStandardDetailPage.tsx',
    # HRM
    'pages/hrm/DashboardPage.tsx',
    'pages/hrm/EmployeeFinanceTab.tsx',
    'pages/hrm/HrmCompanyPage.tsx',
    'pages/hrm/HrmContractDetailPage.tsx',
    'pages/hrm/HrmEmployeeDetailPage.tsx',
    'pages/hrm/HrmSalaryAdjustmentPage.tsx',
    'pages/hrm/HrmAttendancePage.tsx',
    'pages/hrm/HrmEmployeeEditPage.tsx',
    'pages/hrm/HrmEmployeeCreatePage.tsx',
    'pages/hrm/HrmOrganizationPage.tsx',
    'pages/hrm/HrmPerformancePage.tsx',
    # IAM
    'pages/iam/CompanyStructurePage.tsx',
    'pages/iam/UserManagementPage.tsx',
    'pages/iam/RoleManagementPage.tsx',
    'pages/iam/PermissionManagementPage.tsx',
]

# Load existing translations
zh_data = load_json(ZH_JSON)
en_data = load_json(EN_JSON)

stats = {'files_processed': 0, 't_replacements': 0, 'new_keys': 0}
all_new_keys = {}  # key_path -> zh_value

for fpath in FILES:
    full_path = os.path.join(BASE, fpath)
    if not os.path.exists(full_path):
        print(f"SKIP (not found): {fpath}")
        continue
    
    with open(full_path) as f:
        content = f.read()
    
    module = get_module(fpath)
    page_key = get_page_key(fpath)
    has_t = 'useTranslation' in content
    
    print(f"\n{'='*60}")
    print(f"Processing: {fpath}")
    print(f"  Module: {module}, Page key: {page_key}, Has useTranslation: {has_t}")
    
    original = content
    replacements = 0
    
    # Step 1: Add useTranslation import if needed
    if not has_t:
        # Add import after the last existing import
        import_line = "import { useTranslation } from 'react-i18next';"
        
        # Find the last import line
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        
        if last_import_idx >= 0:
            # Check if react-i18next import already exists
            has_i18n_import = any('react-i18next' in l for l in lines)
            if not has_i18n_import:
                lines.insert(last_import_idx + 1, import_line)
                content = '\n'.join(lines)
                print(f"  + Added useTranslation import")
    
    # Step 2: Add const { t } = useTranslation() if needed
    if not has_t:
        # Find the function component definition and add t after it
        # Look for: export default function ComponentName() {
        # or: const ComponentName: React.FC = () => {
        patterns = [
            (r'(export default function \w+\([^)]*\) \{)', 
             lambda m: m.group(1) + '\n  const { t } = useTranslation();'),
            (r'(const \w+: React\.FC(?:<[^>]*>)? = \(\) => \{)',
             lambda m: m.group(1) + '\n  const { t } = useTranslation();'),
            (r'(function \w+\([^)]*\) \{)',
             lambda m: m.group(1) + '\n  const { t } = useTranslation();'),
        ]
        
        for pattern, replacement_fn in patterns:
            match = re.search(pattern, content)
            if match:
                # Check if t is already defined in this scope
                start = match.start()
                # Check the function body for existing t usage
                rest = content[start:start+500]
                if 'const { t }' not in rest:
                    content = content[:start] + replacement_fn(match) + content[match.end():]
                    print(f"  + Added const {{ t }} = useTranslation()")
                break
    
    # Step 3: Now replace Chinese text with t() calls
    # We need to find Chinese text that represents display-visible strings
    # and NOT inside t() calls, comments, or backend constants
    
    lines = content.split('\n')
    new_lines = list(lines)
    
    for line_idx, line in enumerate(lines):
        # Skip comments
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        
        # Skip lines already inside t('...')
        # Skip import lines
        if stripped.startswith('import '):
            continue
        
        # Skip lines that are part of block comments
        # (simplified - skip lines starting with * as part of block comments)
        
        # Find Chinese text in this line
        chinese_matches = list(re.finditer(r'[\u4e00-\u9fff]+', line))
        if not chinese_matches:
            continue
        
        for match in chinese_matches:
            chinese_text = match.group()
            
            # Check if this is inside a t() call already
            ctx_start = max(0, match.start() - 15)
            ctx_end = min(len(line), match.end() + 15)
            context = line[ctx_start:ctx_end]
            if re.search(r"t\(['\"`][^'\"`]*" + re.escape(chinese_text), context):
                continue
            
            # Check if inside a comment (// or /* */)
            before = line[:match.start()]
            if '//' in before:
                comment_pos = before.rfind('//')
                if comment_pos < match.start():
                    continue
            if '/*' in before:
                comment_pos = before.rfind('/*')
                if comment_pos < match.start():
                    continue
            
            # Check if it's a status comparison (e.g., status === '进行中')
            # These are backend values that should stay as-is
            after = line[match.end():match.end()+20]
            before_ctx = line[max(0,match.start()-20):match.start()]
            if re.match(r"\s*[=!]+\s*['\"]", after):
                # It's being compared with a comparison operator - likely a backend value
                continue
            if re.match(r"['\"]\s*[=!]+", before_ctx):
                # It's on the right side of a comparison
                continue
            
            # Generate key
            key_base = to_en_key(chinese_text)
            full_key = f"{module}.{page_key}.{key_base}"
            
            # Generate English translation
            en_trans = EN_MAP.get(chinese_text, chinese_text)
            
            # Determine replacement pattern based on context
            # Check if it's in JSX text (between tags)
            # or in a string prop (label="...")
            # or in an error message
            
            replacement = f"{{t('{full_key}')}}"
            
            # Check the immediate context to decide replacement format
            # Case 1: JSX text - {t('key')}
            # Case 2: String prop like label="text" -> label={t('key')}
            # Case 3: Error message in throw new Error('text') -> throw new Error(t('key'))
            # Case 4: Variable assignment like const x = 'text' -> const x = t('key')
            
            # Find what's around the match
            full_ctx = line[max(0,match.start()-30):min(len(line),match.end()+30)]
            
            # Case: label="中文" or title="中文" or placeholder="中文"
            prop_match = re.match(
                r'^(\s*)(\w+)="(' + re.escape(chinese_text) + r')"(.*)',
                line[max(0,match.start()-5):match.end()+5]
            )
            
            if re.search(r'=\s*"[^"]*' + re.escape(chinese_text) + r'[^"]*"', line):
                # It's a prop value like label="中文"
                # Find the full attribute
                prop_pattern = r'(\w+)="([^"]*' + re.escape(chinese_text) + r'[^"]*)"'
                prop_match2 = re.search(prop_pattern, line)
                if prop_match2:
                    attr_name = prop_match2.group(1)
                    attr_value = prop_match2.group(2)
                    new_attr = f'{attr_name}={{t(\'{full_key}\')}}'
                    line = line[:prop_match2.start()] + new_attr + line[prop_match2.end():]
                    replacements += 1
                    
                    # Register key
                    all_new_keys[full_key] = chinese_text
                    deep_set(zh_data, full_key, chinese_text)
                    deep_set(en_data, full_key, en_trans)
                    
                    # Update the working line
                    new_lines[line_idx] = line
                    continue
            
            # Case: throw new Error('中文')
            if re.search(r"throw new Error\(['"][^'"]*" + re.escape(chinese_text) + r"[^'"]*['"]\)", line):
                err_pattern = r"throw new Error\(['"]([^'"]*" + re.escape(chinese_text) + r"[^'"]*)['"]\)"
                err_match = re.search(err_pattern, line)
                if err_match:
                    old_err = err_match.group(0)
                    new_err = f"throw new Error(t('{full_key}'))"
                    line = line[:err_match.start()] + new_err + line[err_match.end():]
                    replacements += 1
                    
                    all_new_keys[full_key] = chinese_text
                    deep_set(zh_data, full_key, chinese_text)
                    deep_set(en_data, full_key, en_trans)
                    
                    new_lines[line_idx] = line
                    continue
            
            # Case: String variable assignment or JSX text
            # Find the quoted string containing Chinese
            string_pattern = r"['\"]([^'\"]*" + re.escape(chinese_text) + r"[^'\"]*)['\"]"
            str_match = re.search(string_pattern, line)
            if str_match:
                old_str = str_match.group(0)
                new_str = f"t('{full_key}')"
                line = line[:str_match.start()] + new_str + line[str_match.end():]
                replacements += 1
                
                all_new_keys[full_key] = chinese_text
                deep_set(zh_data, full_key, chinese_text)
                deep_set(en_data, full_key, en_trans)
                
                new_lines[line_idx] = line
                continue
    
    content = '\n'.join(new_lines)
    
    # Step 4: Write the modified file
    with open(full_path, 'w') as f:
        f.write(content)
    
    stats['files_processed'] += 1
    stats['t_replacements'] += replacements
    stats['new_keys'] = len(all_new_keys)
    
    print(f"  ✓ {replacements} replacements made, {len(all_new_keys)} total new keys")

# Save updated JSON files
save_json(ZH_JSON, zh_data)
save_json(EN_JSON, en_data)

print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"  Files processed: {stats['files_processed']}")
print(f"  Total t() replacements: {stats['t_replacements']}")
print(f"  New i18n keys added: {stats['new_keys']}")
print(f"  zh.json and en.json updated")
print(f"\nNew keys:")
for k, v in sorted(all_new_keys.items()):
    print(f"  {k}: '{v}' -> '{EN_MAP.get(v, v)}'")