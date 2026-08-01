#!/usr/bin/env python3
"""
Seventh pass - translate all Chinese comments to English.
Handles // comments, JSDoc comments, and JSX comments.
"""

import re
import json
import os
import hashlib

BASE = '/Users/air/TOPEMS'
ZH_PATH = f'{BASE}/apps/web/src/i18n/locales/zh.json'
EN_PATH = f'{BASE}/apps/web/src/i18n/locales/en.json'

TARGET_FILES = [
    'apps/web/src/pages/finance/FinanceApprovalConfigPage.tsx',
    'apps/web/src/pages/finance/ConsolidationScopePage.tsx',
    'apps/web/src/pages/finance/FinanceTaxPage.tsx',
    'apps/web/src/pages/finance/FinanceAssetPage.tsx',
    'apps/web/src/pages/finance/BudgetManagementPage.tsx',
    'apps/web/src/pages/finance/FinanceCostPage.tsx',
    'apps/web/src/pages/finance/OpeningBalancePage.tsx',
    'apps/web/src/pages/finance/FinanceVoucherPage/index.tsx',
    'apps/web/src/pages/finance/ConsolidationReportsPage.tsx',
    'apps/web/src/pages/finance/VoucherCreatePage.tsx',
    'apps/web/src/pages/finance/VoucherDetailPage.tsx',
    'apps/web/src/pages/finance/FinanceBudgetDetailPage.tsx',
    'apps/web/src/pages/finance/FinanceReceivablePayablePage.tsx',
    'apps/web/src/pages/finance/FinanceVoucherPage/components/SubjectListPanel.tsx',
    'apps/web/src/pages/finance/FinanceVoucherPage/components/VoucherImportModal.tsx',
    'apps/web/src/pages/finance/FinanceVoucherPage/components/ConfirmDialogs.tsx',
    'apps/web/src/pages/crm/DashboardPage.tsx',
    'apps/web/src/pages/crm/CRMRecommendationPage.tsx',
    'apps/web/src/pages/crm/CustomerDetailPage.tsx',
    'apps/web/src/pages/crm/CRMSalesFunnelPage.tsx',
    'apps/web/src/pages/crm/ReturnDetailPage.tsx',
    'apps/web/src/pages/crm/CRMCustomerScoringPage.tsx',
    'apps/web/src/pages/crm/OpportunityDetailPage.tsx',
    'apps/web/src/pages/crm/CustomerEditPage.tsx',
    'apps/web/src/pages/crm/CRMBillingPage.tsx',
    'apps/web/src/pages/crm/CRMCustomerSegmentationPage.tsx',
    'apps/web/src/pages/crm/CustomerCreatePage.tsx',
    'apps/web/src/pages/crm/CRMSalesForecastPage.tsx',
    'apps/web/src/pages/crm/ContactManagementPage.tsx',
    'apps/web/src/pages/crm/ContactDetailPage.tsx',
]

# Comment-specific translations (comments have unique text)
COMMENT_MAP = {
    '预算管理页面': 'Budget management page',
    '使用 CrudPage + budgetSchema 实现 schema 驱动的 CRUD。': 'Implement schema-driven CRUD using CrudPage + budgetSchema.',
    '支持列表展示、创建、编辑、删除、筛选，以及批量更新状态和批量删除。': 'Supports list display, create, edit, delete, filter, and batch status update and batch delete.',
    '成本管理页面': 'Cost management page',
    '使用 CrudPage + costSchema 实现 schema 驱动的 CRUD。': 'Implement schema-driven CRUD using CrudPage + costSchema.',
    '支持列表展示、创建、编辑、删除、筛选，以及余额展示和成本分析。': 'Supports list display, create, edit, delete, filter, balance display and cost analysis.',
    '加载部门列表，用于将 department_id 解析为部门名称': 'Load department list for resolving department_id to department name',
    '合并部门名称': 'Merge department names',
    '获取余额数据并合并': 'Get balance data and merge',
    '余额获取失败不阻塞列表': 'Balance fetch failure does not block list',
    '科目类别配置': 'Subject category config',
    '余额方向配置': 'Balance direction config',
    '查询科目树': 'Query subject tree',
    '查询期初余额': 'Query opening balance',
    '设置期初余额': 'Set opening balance',
    '结转期初余额': 'Carry forward opening balance',
    '将期初余额数据转换为map便于查找': 'Convert opening balance data to map for lookup',
    '按类别筛选科目': 'Filter subjects by category',
    '计算合计': 'Calculate totals',
    '处理编辑余额': 'Handle edit balance',
    '处理保存余额': 'Handle save balance',
    '处理取消编辑': 'Handle cancel edit',
    '处理结转': 'Handle carry forward',
    '筛选条件': 'Filter conditions',
    '期初余额汇总': 'Opening balance summary',
    '余额表格': 'Balance table',
    '结转余额': 'Carry forward balance',
    '类型定义': 'Type Definitions',
    '数据聚合逻辑': 'Data Aggregation Logic',
    '保留原有聚合逻辑：同时获取销售发票（销项税）和采购发票（进项税），合并为 TaxEntry 列表': 'Preserve original aggregation logic: fetch sales invoices (output tax) and purchase invoices (input tax) simultaneously, merge into TaxEntry list',
    'API 适配器': 'API Adapter',
    '统计卡片 + 导出': 'Statistics Cards + Export',
    '页面组件': 'Page Component',
    '加载部门列表': 'Load department list',
    '状态配置': 'Status config',
    '合并方法配置': 'Consolidation method config',
    '控制类型配置': 'Control type config',
    '状态': 'State',
    '弹窗状态': 'Dialog state',
    '表单数据': 'Form data',
    '查询合并范围列表': 'Query consolidation scope list',
    '删除合并范围': 'Delete consolidation scope',
    '创建合并范围': 'Create consolidation scope',
    '更新合并范围': 'Update consolidation scope',
    '查询选中合并范围的公司列表': 'Query company list for selected scope',
    '添加公司到合并范围': 'Add company to consolidation scope',
    '从合并范围移除公司': 'Remove company from consolidation scope',
    '打开新建合并范围弹窗': 'Open create scope dialog',
    '打开编辑合并范围弹窗': 'Open edit scope dialog',
    '保存合并范围': 'Save consolidation scope',
    '打开添加公司弹窗': 'Open add company dialog',
    '添加公司': 'Add company',
    '统计数据': 'Statistics',
    '处理选择合并范围': 'Handle scope selection',
    '处理删除合并范围': 'Handle scope deletion',
    '合并范围列定义': 'Scope column definitions',
    '公司列定义': 'Company column definitions',
    '搜索栏': 'Search bar',
    '统计卡片': 'Statistics cards',
    '合并范围列表和详情': 'Scope list and details',
    '左侧：合并范围列表': 'Left: Scope list',
    '右侧：合并范围详情': 'Right: Scope details',
    '新建/编辑合并范围弹窗': 'Create/Edit scope dialog',
    '添加公司弹窗': 'Add company dialog',
    '规则配置弹窗': 'Rule config dialog',
    '科目 Tab 面板（嵌套 CrudPage）': 'Subject Tab panel (nested CrudPage)',
    '主页面': 'Main page',
    '弹窗状态': 'Dialog state',
    '凭证统计查询（用于 headerContent 统计卡片）': 'Voucher statistics query (for headerContent stat cards)',
    '会计科目查询（科目 Tab 统计 + 凭证表单科目下拉）': 'Accounting subject query (Subject Tab stats + voucher form subject dropdown)',
    'CrudPage 适配器': 'CrudPage adapter',
    '凭证操作': 'Voucher operations',
    '凭证统计卡片（通过 headerContent 渲染）': 'Voucher statistics cards (rendered via headerContent)',
    '科目统计卡片': 'Subject statistics cards',
    '凭证 headerContent（统计卡片）': 'Voucher headerContent (statistics cards)',
    '自定义行操作（含审核/反审核）': 'Custom row operations (含审核/反审核)',
    '批量操作（合并到 schema）': 'Batch operations (merged to schema)',
    'Tab 配置': 'Tab config',
    '客户端搜索（API 不支持搜索参数）': 'Client-side search (API does not support search params)',
    '客户端筛选': 'Client-side filtering',
    '客户端分页': 'Client-side pagination',
    '先获取现有节点，避免更新时丢失': 'Fetch existing nodes first to avoid loss during update',
    '节点列表渲染（详情视图中使用）': 'Node list rendering (used in detail view)',
    '审批配置页面（Schema 驱动版本）': 'Approval config page (Schema-driven version)',
    '原版: 867 行手写表格、表单、节点编辑器': 'Original: 867 lines of hand-written tables, forms, node editor',
    'Schema 版: ~250 行（减少 70%+）': 'Schema version: ~250 lines (70%+ reduction)',
    '使用 CrudPage + EntitySchema 实现：': 'Implemented using CrudPage + EntitySchema:',
    '- 列表、创建、编辑、删除由 CrudPage 自动处理': '- List, create, edit, delete handled automatically by CrudPage',
    '- 审批节点通过 detailContent 在详情视图中展示': '- Approval nodes displayed via detailContent in detail view',
    '- 节点管理通过自定义行操作弹窗处理': '- Node management via custom row action dialogs',
    '凭证统计查询': 'Voucher statistics query',
    '凭证列表': 'Voucher list',
    '凭证详情': 'Voucher details',
    '凭证表单': 'Voucher form',
    '凭证导入': 'Voucher import',
    '凭证导出': 'Voucher export',
    '凭证删除': 'Voucher deletion',
    '凭证保存': 'Voucher save',
    '凭证更新': 'Voucher update',
    '凭证审核': 'Voucher review',
    '凭证反审核': 'Voucher unreview',
    '凭证过账': 'Voucher posting',
    '凭证冲红': 'Voucher reversal',
    '凭证复制': 'Voucher copy',
    '凭证打印': 'Voucher print',
    '凭证下载': 'Voucher download',
    '客户管理页面': 'Customer management page',
    '客户列表': 'Customer list',
    '客户详情': 'Customer details',
    '客户编辑': 'Customer edit',
    '客户创建': 'Customer create',
    '客户统计': 'Customer statistics',
    '客户筛选': 'Customer filter',
    '客户搜索': 'Customer search',
    '客户保存': 'Customer save',
    '客户删除': 'Customer delete',
    '客户更新': 'Customer update',
    '客户导出': 'Customer export',
    '客户导入': 'Customer import',
    '客户标签': 'Customer tags',
    '客户分组': 'Customer groups',
    '客户评分': 'Customer scoring',
    '客户画像': 'Customer profile',
    '客户分层': 'Customer segmentation',
    '客户价值': 'Customer value',
    '客户生命周期': 'Customer lifecycle',
    '客户跟进': 'Customer follow-up',
    '客户沟通': 'Customer communication',
    '客户记录': 'Customer records',
    '客户联系人': 'Customer contacts',
    '客户地址': 'Customer address',
    '客户电话': 'Customer phone',
    '客户邮箱': 'Customer email',
    '客户行业': 'Customer industry',
    '客户等级': 'Customer level',
    '客户来源': 'Customer source',
    '客户负责人': 'Customer owner',
    '客户创建时间': 'Customer creation time',
    '客户更新时间': 'Customer update time',
    '客户类型': 'Customer type',
    '客户状态': 'Customer status',
    '商机管理页面': 'Opportunity management page',
    '商机列表': 'Opportunity list',
    '商机详情': 'Opportunity details',
    '商机编辑': 'Opportunity edit',
    '商机创建': 'Opportunity create',
    '商机统计': 'Opportunity statistics',
    '商机筛选': 'Opportunity filter',
    '商机搜索': 'Opportunity search',
    '商机保存': 'Opportunity save',
    '商机删除': 'Opportunity delete',
    '商机更新': 'Opportunity update',
    '商机阶段': 'Opportunity stage',
    '商机金额': 'Opportunity amount',
    '商机预计成交日期': 'Opportunity expected close date',
    '商机赢单概率': 'Opportunity win probability',
    '商机跟进记录': 'Opportunity follow-up records',
    '商机产品': 'Opportunity products',
    '商机竞争对手': 'Opportunity competitors',
    '商机附件': 'Opportunity attachments',
    '销售漏斗页面': 'Sales funnel page',
    '销售预测页面': 'Sales forecast page',
    '客户评分页面': 'Customer scoring page',
    '客户细分页面': 'Customer segmentation page',
    '账单管理页面': 'Billing management page',
    '退货管理页面': 'Return management page',
    '联系人管理页面': 'Contact management page',
    '联系人详情页面': 'Contact details page',
    '报表页面': 'Reports page',
    '报表导出': 'Report export',
    '报表筛选': 'Report filter',
    '报表统计': 'Report statistics',
    '报表汇总': 'Report summary',
    '报表生成': 'Report generation',
    '报表打印': 'Report print',
    '报表下载': 'Report download',
    '报表查看': 'Report view',
    '报表编辑': 'Report edit',
    '报表删除': 'Report delete',
    '报表保存': 'Report save',
    '报表创建': 'Report create',
    '报表更新': 'Report update',
    '列表页面': 'List page',
    '表单页面': 'Form page',
    '详情页面': 'Details page',
    '仪表盘页面': 'Dashboard page',
    '主数据管理': 'Master data management',
    '系统设置': 'System settings',
    '权限管理': 'Permission management',
    '角色管理': 'Role management',
    '用户管理': 'User management',
    '菜单管理': 'Menu management',
    '日志管理': 'Log management',
    '数据导入': 'Data import',
    '数据导出': 'Data export',
    '数据备份': 'Data backup',
    '数据恢复': 'Data restore',
    '操作日志': 'Operation log',
    '登录日志': 'Login log',
    '错误日志': 'Error log',
    '性能监控': 'Performance monitoring',
    '系统监控': 'System monitoring',
    '通知管理': 'Notification management',
    '消息管理': 'Message management',
    '邮件模板': 'Email template',
    '短信模板': 'SMS template',
    '推送通知': 'Push notification',
    '公告管理': 'Announcement management',
    '新闻管理': 'News management',
    '内容管理': 'Content management',
    '文件管理': 'File management',
    '附件管理': 'Attachment management',
    '版本管理': 'Version management',
    '审批流程': 'Approval workflow',
    '审批节点': 'Approval node',
    '审批规则': 'Approval rule',
    '审批人': 'Approver',
    '审批类型': 'Approval type',
    '审批状态': 'Approval status',
    '审批配置页面': 'Approval configuration page',
    '资产页面': 'Asset page',
    '资产列表': 'Asset list',
    '资产详情': 'Asset details',
    '资产编辑': 'Asset edit',
    '资产创建': 'Asset create',
    '资产类型': 'Asset type',
    '资产分类': 'Asset category',
    '资产折旧': 'Asset depreciation',
    '资产处置': 'Asset disposal',
    '资产盘点': 'Asset inventory',
    '资产报废': 'Asset scrap',
    '资产转移': 'Asset transfer',
    '资产维护': 'Asset maintenance',
    '资产统计': 'Asset statistics',
    '成本页面': 'Cost page',
    '成本列表': 'Cost list',
    '成本详情': 'Cost details',
    '成本编辑': 'Cost edit',
    '成本创建': 'Cost create',
    '成本中心': 'Cost center',
    '成本分类': 'Cost category',
    '成本项目': 'Cost item',
    '成本核算': 'Cost accounting',
    '成本分析': 'Cost analysis',
    '成本预算': 'Cost budget',
    '成本统计': 'Cost statistics',
    '预算页面': 'Budget page',
    '预算列表': 'Budget list',
    '预算详情': 'Budget details',
    '预算编辑': 'Budget edit',
    '预算创建': 'Budget create',
    '预算类型': 'Budget type',
    '预算分类': 'Budget category',
    '预算科目': 'Budget subject',
    '预算编制': 'Budget preparation',
    '预算审批': 'Budget approval',
    '预算执行': 'Budget execution',
    '预算调整': 'Budget adjustment',
    '预算统计': 'Budget statistics',
    '税务页面': 'Tax page',
    '税务列表': 'Tax list',
    '税务详情': 'Tax details',
    '税务编辑': 'Tax edit',
    '税务创建': 'Tax create',
    '税务类型': 'Tax type',
    '税务申报': 'Tax declaration',
    '税务缴纳': 'Tax payment',
    '税务分析': 'Tax analysis',
    '税务筹划': 'Tax planning',
    '税务统计': 'Tax statistics',
    '凭证页面': 'Voucher page',
    '凭证列表': 'Voucher list',
    '凭证详情': 'Voucher details',
    '凭证编辑': 'Voucher edit',
    '凭证创建': 'Voucher create',
    '凭证类型': 'Voucher type',
    '凭证分类': 'Voucher category',
    '凭证编号': 'Voucher number',
    '凭证日期': 'Voucher date',
    '凭证金额': 'Voucher amount',
    '凭证摘要': 'Voucher summary',
    '凭证附件': 'Voucher attachments',
    '凭证审核': 'Voucher review',
    '凭证过账': 'Voucher posting',
    '凭证冲红': 'Voucher reversal',
    '凭证统计': 'Voucher statistics',
}

def has_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def process_file(file_path):
    full_path = f'{BASE}/{file_path}'
    if not os.path.exists(full_path):
        print(f'  SKIP: not found: {file_path}')
        return 0
    
    with open(full_path, 'r') as f:
        content = f.read()
    
    changes = 0
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        modified = line
        changed = False
        
        # Only process comment lines
        stripped = line.strip()
        
        # Line comments: // ...
        if stripped.startswith('//') and has_chinese(line):
            for zh, en in COMMENT_MAP.items():
                if zh in line:
                    modified = line.replace(zh, en)
                    changed = True
                    changes += 1
                    break
        
        # JSDoc / block comments: * ...
        if stripped.startswith('*') and has_chinese(line):
            for zh, en in COMMENT_MAP.items():
                if zh in line:
                    modified = line.replace(zh, en)
                    changed = True
                    changes += 1
                    break
        
        # JSX comments: {/* ... */}
        if '{/*' in line and has_chinese(line):
            for zh, en in COMMENT_MAP.items():
                if zh in line:
                    modified = line.replace(zh, en)
                    changed = True
                    changes += 1
                    break
        
        if changed:
            new_lines.append(modified)
        else:
            new_lines.append(line)
    
    if changes == 0:
        return 0
    
    with open(full_path, 'w') as f:
        f.write('\n'.join(new_lines))
    
    print(f'  Modified: {file_path} ({changes} changes)')
    return changes

def main():
    total = 0
    processed = 0
    errors = []
    
    for file_path in TARGET_FILES:
        try:
            count = process_file(file_path)
            if count > 0:
                processed += 1
                total += count
        except Exception as e:
            errors.append((file_path, str(e)))
            print(f'  ERROR: {file_path}: {e}')
    
    print(f'\nProcessed {processed} files, made {total} changes')
    
    if errors:
        print(f'\nErrors ({len(errors)}):')
        for path, err in errors:
            print(f'  {path}: {err}')

if __name__ == '__main__':
    main()