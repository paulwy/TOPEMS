#!/usr/bin/env python3
"""
i18n converter for V19.8 - 5 modules: asset, finance, hrm, bi, ehs
"""

import re
import json
import os
import sys
import hashlib
from pathlib import Path

FILES_TO_PROCESS = [
    # Asset module (4 files)
    ('/Users/air/TOPEMS/apps/web/src/pages/asset/AssetListPage.tsx', 'asset', 'asset_list_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/asset/TransferPage.tsx', 'asset', 'transfer_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/asset/CategoryManagementPage.tsx', 'asset', 'category_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/asset/DepreciationPage.tsx', 'asset', 'depreciation_page'),
    
    # Finance module (29 files)
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceDashboardPage.tsx', 'finance', 'dashboard_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceVoucherPage/index.tsx', 'finance', 'voucher_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceVoucherPage/components/VoucherListPanel.tsx', 'finance', 'voucher_list_panel'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceVoucherPage/components/SubjectListPanel.tsx', 'finance', 'subject_list_panel'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceVoucherPage/components/VoucherFormModal.tsx', 'finance', 'voucher_form_modal'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceVoucherPage/components/VoucherDetailModal.tsx', 'finance', 'voucher_detail_modal'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceVoucherPage/components/VoucherImportModal.tsx', 'finance', 'voucher_import_modal'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceVoucherPage/components/ConfirmDialogs.tsx', 'finance', 'confirm_dialogs'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/VoucherCreatePage.tsx', 'finance', 'voucher_create_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/VoucherDetailPage.tsx', 'finance', 'voucher_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceBudgetPage.tsx', 'finance', 'budget_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceBudgetDetailPage.tsx', 'finance', 'budget_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/BudgetManagementPage.tsx', 'finance', 'budget_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinancePaymentPage.tsx', 'finance', 'payment_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceReceiptPage.tsx', 'finance', 'receipt_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceReceivablePayablePage.tsx', 'finance', 'receivable_payable_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceAssetPage.tsx', 'finance', 'asset_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceExpensePage.tsx', 'finance', 'expense_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceCostPage.tsx', 'finance', 'cost_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceLedgerPage.tsx', 'finance', 'ledger_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceInvoicePage.tsx', 'finance', 'invoice_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceTaxPage.tsx', 'finance', 'tax_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceReportsPage.tsx', 'finance', 'reports_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/FinanceApprovalConfigPage.tsx', 'finance', 'approval_config_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/ConsolidationScopePage.tsx', 'finance', 'consolidation_scope_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/ConsolidationReportsPage.tsx', 'finance', 'consolidation_reports_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/OpeningBalancePage.tsx', 'finance', 'opening_balance_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/finance/PaymentPrintTemplate.tsx', 'finance', 'payment_print_template'),
    
    # HRM module (25 files)
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/DashboardPage.tsx', 'hrm', 'dashboard_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmOverviewPage.tsx', 'hrm', 'overview_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeePage/index.tsx', 'hrm', 'employee_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeePage/components/EmployeeFormDialog.tsx', 'hrm', 'employee_form_dialog'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeePage/components/EmployeeDetailDialog.tsx', 'hrm', 'employee_detail_dialog'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeePage/components/TreeViewComponent.tsx', 'hrm', 'tree_view_component'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeeCreatePage.tsx', 'hrm', 'employee_create_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeeEditPage.tsx', 'hrm', 'employee_edit_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeeDetailPage.tsx', 'hrm', 'employee_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmDepartmentPage.tsx', 'hrm', 'department_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmOrganizationPage.tsx', 'hrm', 'organization_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmPositionPage.tsx', 'hrm', 'position_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmCompanyPage.tsx', 'hrm', 'company_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmAttendancePage.tsx', 'hrm', 'attendance_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmLeavePage.tsx', 'hrm', 'leave_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmPayrollPage.tsx', 'hrm', 'payroll_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmSalaryAdjustmentPage.tsx', 'hrm', 'salary_adjustment_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmPerformancePage.tsx', 'hrm', 'performance_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmRecruitmentPage.tsx', 'hrm', 'recruitment_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmTrainingPage.tsx', 'hrm', 'training_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmContractPage.tsx', 'hrm', 'contract_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmContractDetailPage.tsx', 'hrm', 'contract_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmReportsPage.tsx', 'hrm', 'reports_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/hrm/EmployeeFinanceTab.tsx', 'hrm', 'employee_finance_tab'),
    
    # BI module (21 files)
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BiIndexPage.tsx', 'bi', 'index_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BIDashboardPage.tsx', 'bi', 'dashboard_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BIAnalyticsPage.tsx', 'bi', 'analytics_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BIReportPage.tsx', 'bi', 'report_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BIDataSourcePage.tsx', 'bi', 'data_source_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BIComparisonPage.tsx', 'bi', 'comparison_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/DatasetPage.tsx', 'bi', 'dataset_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/DataAnalysisPage.tsx', 'bi', 'data_analysis_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BIVisualizationPage.tsx', 'bi', 'visualization_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BIModuleDetailPage.tsx', 'bi', 'module_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/BiPermissionPage.tsx', 'bi', 'permission_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/ReportBuilderPage.tsx', 'bi', 'report_builder_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/index.tsx', 'bi', 'gis_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/components/PageHeader.tsx', 'bi', 'gis_page_header'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/components/StatsSection.tsx', 'bi', 'gis_stats_section'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/components/DataTableSection.tsx', 'bi', 'gis_data_table_section'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/components/MapSection.tsx', 'bi', 'gis_map_section'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/components/EntityFormModal.tsx', 'bi', 'gis_entity_form_modal'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/components/ImportModal.tsx', 'bi', 'gis_import_modal'),
    ('/Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/components/TableUtils.tsx', 'bi', 'gis_table_utils'),
    
    # EHS module (15 files)
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/HazardPage.tsx', 'ehs', 'hazard_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsHazardPage.tsx', 'ehs', 'ehs_hazard_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsHazardDetailPage.tsx', 'ehs', 'ehs_hazard_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsHazardousMaterialPage.tsx', 'ehs', 'hazardous_material_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsIncidentReportPage.tsx', 'ehs', 'incident_report_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsAccidentPage.tsx', 'ehs', 'accident_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsCheckPage.tsx', 'ehs', 'check_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsPlanPage.tsx', 'ehs', 'plan_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsDrillPage.tsx', 'ehs', 'drill_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EmergencyPage.tsx', 'ehs', 'emergency_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/TrainingPage.tsx', 'ehs', 'training_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EnvironmentPage.tsx', 'ehs', 'environment_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/HealthManagementPage.tsx', 'ehs', 'health_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/EhsOccupationalDiseasePage.tsx', 'ehs', 'occupational_disease_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/ehs/CompliancePage.tsx', 'ehs', 'compliance_page'),
]

ZH_JSON_PATH = '/Users/air/TOPEMS/apps/web/src/i18n/locales/zh.json'
EN_JSON_PATH = '/Users/air/TOPEMS/apps/web/src/i18n/locales/en.json'

CN_CHAR_RE = r'[\u4e00-\u9fff]'

COMMON_KEYS = {
    '保存': 'save',
    '取消': 'cancel',
    '确定': 'confirm',
    '删除': 'delete',
    '编辑': 'edit',
    '新增': 'add',
    '创建': 'create',
    '更新': 'update',
    '查看': 'view',
    '查看详情': 'view_detail',
    '搜索': 'search',
    '查询': 'search',
    '重置': 'reset',
    '提交': 'submit',
    '返回': 'back',
    '关闭': 'close',
    '导出': 'export',
    '导入': 'import',
    '打印': 'print',
    '下载': 'download',
    '上传': 'upload',
    '刷新': 'refresh',
    '详情': 'detail',
    '列表': 'list',
    '名称': 'name',
    '编码': 'code',
    '状态': 'status',
    '类型': 'type',
    '日期': 'date',
    '时间': 'time',
    '数量': 'quantity',
    '金额': 'amount',
    '价格': 'price',
    '备注': 'remark',
    '描述': 'description',
    '地址': 'address',
    '电话': 'phone',
    '邮箱': 'email',
    '负责人': 'manager',
    '联系人': 'contact',
    '创建时间': 'created_at',
    '更新时间': 'updated_at',
    '首页': 'home',
    '成功': 'success',
    '失败': 'fail',
    '错误': 'error',
    '警告': 'warning',
    '提示': 'hint',
    '信息': 'info',
    '是': 'yes',
    '否': 'no',
    '全部': 'all',
    '其他': 'other',
    '操作': 'action',
    '启用': 'active',
    '停用': 'inactive',
    '活跃': 'active',
    '非活跃': 'inactive',
    '维护中': 'maintenance',
    '已锁定': 'locked',
    '已删除': 'deleted',
    '已完成': 'completed',
    '进行中': 'in_progress',
    '待处理': 'pending',
    '已取消': 'cancelled',
    '已审核': 'approved',
    '待审核': 'pending_review',
    '已确认': 'confirmed',
    '未确认': 'unconfirmed',
    '暂无': 'no_data',
    '加载中': 'loading',
    '暂无数据': 'no_data',
    '确认': 'confirm',
    '批量删除': 'batch_delete',
    '批量导出': 'batch_export',
    '新增成功': 'add_success',
    '编辑成功': 'edit_success',
    '删除成功': 'delete_success',
    '操作成功': 'operation_success',
    '操作失败': 'operation_failed',
    '确认删除': 'confirm_delete',
    '确认提交': 'confirm_submit',
    '序号': 'index',
    '规格': 'spec',
    '单位': 'unit',
    '产品': 'product',
    '物料': 'material',
    '仓库': 'warehouse',
    '库位': 'location',
    '库区': 'zone',
    '工单': 'work_order',
    '工序': 'process',
    '工艺': 'process_route',
    '设备': 'equipment',
    '人员': 'personnel',
    '班组': 'team',
    '计划': 'plan',
    '实际': 'actual',
    '完成': 'completed',
    '未完成': 'incomplete',
    '合格': 'qualified',
    '不合格': 'unqualified',
    '正常': 'normal',
    '异常': 'abnormal',
    '运行中': 'running',
    '空闲': 'idle',
    '故障': 'fault',
    '生产': 'production',
    '生产中': 'in_production',
    '入库': 'inbound',
    '出库': 'outbound',
    '调拨': 'transfer',
    '盘点': 'stocktake',
    '领料': 'material_issue',
    '退料': 'material_return',
    '报废': 'scrap',
    '报工': 'work_report',
    '质检': 'quality_inspection',
    '检验': 'inspection',
    '今日': 'today',
    '本周': 'this_week',
    '本月': 'this_month',
    '昨日': 'yesterday',
    '上周': 'last_week',
    '上月': 'last_month',
    '请输入': 'please_input',
    '请选择': 'please_select',
    '请填写': 'please_fill',
    '不能为空': 'cannot_be_empty',
    '操作人': 'operator',
    '操作时间': 'operation_time',
    '开始时间': 'start_time',
    '结束时间': 'end_time',
    '开始日期': 'start_date',
    '结束日期': 'end_date',
    '创建人': 'creator',
    '更新人': 'updater',
    '审核人': 'reviewer',
    '订单': 'order',
    '订单号': 'order_number',
    '订单日期': 'order_date',
    '订单状态': 'order_status',
    '订单类型': 'order_type',
    '产品名称': 'product_name',
    '产品编码': 'product_code',
    '物料名称': 'material_name',
    '物料编码': 'material_code',
    '仓库名称': 'warehouse_name',
    '仓库编码': 'warehouse_code',
    '设备名称': 'equipment_name',
    '设备编码': 'equipment_code',
    '客户': 'customer',
    '供应商': 'supplier',
    '供应商名称': 'supplier_name',
    '客户名称': 'customer_name',
    '说明': 'description',
    '内容': 'content',
    '标题': 'title',
    '副标题': 'subtitle',
    '员工': 'employee',
    '部门': 'department',
    '职位': 'position',
    '薪资': 'salary',
    '考勤': 'attendance',
    '培训': 'training',
    '招聘': 'recruitment',
    '绩效': 'performance',
    '合同': 'contract',
    '资产': 'asset',
    '财务': 'finance',
    '预算': 'budget',
    '费用': 'expense',
    '报表': 'report',
    '凭证': 'voucher',
    '科目': 'subject',
    '风险': 'risk',
    '安全': 'safety',
    '环境': 'environment',
    '健康': 'health',
    '事故': 'accident',
    '隐患': 'hazard',
    '检查': 'inspection',
    '应急': 'emergency',
    '数据': 'data',
    '分析': 'analysis',
    '图表': 'chart',
    '仪表盘': 'dashboard',
    '大屏': 'dashboard',
    '数据源': 'data_source',
    '数据集': 'dataset',
    '可视化': 'visualization',
}


def find_chinese_strings(content):
    results = []
    lines = content.split('\n')
    line_starts = [0]
    for line in lines:
        line_starts.append(line_starts[-1] + len(line) + 1)
    
    single_line_pattern = re.compile(
        r"""(?P<quote>['"`])(?P<content>(?:\\.|(?!\1)[^\n])*""" + CN_CHAR_RE + r"""(?:\\.|(?!\1)[^\n])*)(?P=quote)"""
    )
    
    for line_idx, line in enumerate(lines):
        line_stripped = line.lstrip()
        
        if line_stripped.startswith('//') or line_stripped.startswith('*') or line_stripped.startswith('/*'):
            continue
        
        if line_stripped.startswith('import '):
            continue
        
        for match in single_line_pattern.finditer(line):
            text = match.group('content')
            
            line_start_pos = line_starts[line_idx]
            abs_start = line_start_pos + match.start()
            abs_end = line_start_pos + match.end()
            
            before_on_line = line[:match.start()]
            last_t_idx = before_on_line.rfind('t(')
            if last_t_idx >= 0:
                between = before_on_line[last_t_idx+2:]
                if ')' not in between:
                    continue
            
            results.append({
                'start': abs_start,
                'end': abs_end,
                'quote': match.group('quote'),
                'content': text,
                'line': line_idx + 1,
                'line_content': line.strip(),
            })
    
    return results


def generate_key_name(text, existing_keys):
    text = text.strip()
    
    if text in COMMON_KEYS:
        base = COMMON_KEYS[text]
    else:
        base = None
        for cn in sorted(COMMON_KEYS.keys(), key=lambda x: -len(x)):
            if cn in text:
                base = COMMON_KEYS[cn]
                break
        
        if base is None:
            h = hashlib.md5(text.encode('utf-8')).hexdigest()[:6]
            base = f'text_{h}'
    
    key = base
    counter = 1
    while key in existing_keys:
        key = f'{base}_{counter}'
        counter += 1
    
    return key


def is_in_jsx_context(content, start, end):
    before = content[:start].rstrip()
    after = content[end:].lstrip()
    
    if before.endswith('>') and (after.startswith('<') or after.startswith('{')):
        return True
    
    return False


def is_in_jsx_attribute(content, start):
    before = content[:start].rstrip()
    if before.endswith('='):
        if before.endswith('==') or before.endswith('==='):
            return False
        if len(before) >= 2:
            char_before_eq = before[-2]
            if char_before_eq.isspace():
                return False
            if char_before_eq.isalnum() or char_before_eq in '}]':
                return True
        return True
    return False


def add_use_translation_import(content):
    if "from 'react-i18next'" in content or 'from "react-i18next"' in content:
        return content
    
    import_pattern = re.compile(r'^import\s+.*?;?\s*$', re.MULTILINE)
    matches = list(import_pattern.finditer(content))
    
    if not matches:
        return content
    
    last_import = matches[-1]
    insertion_point = last_import.end()
    
    new_import = "\nimport { useTranslation } from 'react-i18next';"
    
    return content[:insertion_point] + new_import + content[insertion_point:]


def add_use_translation_hook(content):
    if 'useTranslation()' in content:
        return content
    
    pattern = re.compile(
        r'(const\s+\w+\s*:\s*React\.FC(?:<[^>]*>)?\s*=\s*(?:\([^)]*\)\s*=>|\(\)\s*=>)\s*\{)',
        re.MULTILINE
    )
    
    match = pattern.search(content)
    if not match:
        pattern = re.compile(r'(function\s+\w+\s*\([^)]*\)\s*:\s*React\.FC(?:<[^>]*>)?\s*\{)', re.MULTILINE)
        match = pattern.search(content)
    
    if not match:
        return content
    
    insertion_point = match.end()
    
    line_start = content.rfind('\n', 0, insertion_point) + 1
    indent = '  '
    
    hook = f'\n{indent}const {{ t }} = useTranslation();'
    
    return content[:insertion_point] + hook + content[insertion_point:]


def translate_chinese_to_english(text):
    translations = {
        '保存': 'Save',
        '取消': 'Cancel',
        '确定': 'Confirm',
        '删除': 'Delete',
        '编辑': 'Edit',
        '新增': 'Add',
        '创建': 'Create',
        '更新': 'Update',
        '查看': 'View',
        '查看详情': 'View Detail',
        '搜索': 'Search',
        '查询': 'Query',
        '重置': 'Reset',
        '提交': 'Submit',
        '返回': 'Back',
        '关闭': 'Close',
        '导出': 'Export',
        '导入': 'Import',
        '打印': 'Print',
        '下载': 'Download',
        '上传': 'Upload',
        '刷新': 'Refresh',
        '详情': 'Detail',
        '列表': 'List',
        '名称': 'Name',
        '编码': 'Code',
        '状态': 'Status',
        '类型': 'Type',
        '日期': 'Date',
        '时间': 'Time',
        '数量': 'Quantity',
        '金额': 'Amount',
        '价格': 'Price',
        '备注': 'Remark',
        '描述': 'Description',
        '地址': 'Address',
        '电话': 'Phone',
        '邮箱': 'Email',
        '负责人': 'Manager',
        '联系人': 'Contact',
        '创建时间': 'Created At',
        '更新时间': 'Updated At',
        '首页': 'Home',
        '成功': 'Success',
        '失败': 'Failed',
        '错误': 'Error',
        '警告': 'Warning',
        '提示': 'Hint',
        '信息': 'Info',
        '是': 'Yes',
        '否': 'No',
        '全部': 'All',
        '其他': 'Other',
        '操作': 'Action',
        '启用': 'Active',
        '停用': 'Inactive',
        '活跃': 'Active',
        '非活跃': 'Inactive',
        '维护中': 'Maintenance',
        '已锁定': 'Locked',
        '已删除': 'Deleted',
        '已完成': 'Completed',
        '进行中': 'In Progress',
        '待处理': 'Pending',
        '已取消': 'Cancelled',
        '已审核': 'Approved',
        '待审核': 'Pending Review',
        '已确认': 'Confirmed',
        '未确认': 'Unconfirmed',
        '暂无': 'No Data',
        '加载中': 'Loading',
        '暂无数据': 'No Data',
        '确认': 'Confirm',
        '批量删除': 'Batch Delete',
        '序号': 'Index',
        '规格': 'Specification',
        '单位': 'Unit',
        '产品': 'Product',
        '物料': 'Material',
        '仓库': 'Warehouse',
        '库位': 'Location',
        '库区': 'Zone',
        '工单': 'Work Order',
        '工序': 'Process',
        '设备': 'Equipment',
        '人员': 'Personnel',
        '班组': 'Team',
        '计划': 'Plan',
        '实际': 'Actual',
        '完成': 'Completed',
        '未完成': 'Incomplete',
        '合格': 'Qualified',
        '不合格': 'Unqualified',
        '正常': 'Normal',
        '异常': 'Abnormal',
        '运行中': 'Running',
        '空闲': 'Idle',
        '故障': 'Fault',
        '生产': 'Production',
        '生产中': 'In Production',
        '入库': 'Inbound',
        '出库': 'Outbound',
        '调拨': 'Transfer',
        '盘点': 'Stock Take',
        '领料': 'Material Issue',
        '退料': 'Material Return',
        '报废': 'Scrap',
        '报工': 'Work Report',
        '质检': 'Quality Inspection',
        '检验': 'Inspection',
        '今日': 'Today',
        '本周': 'This Week',
        '本月': 'This Month',
        '昨日': 'Yesterday',
        '上周': 'Last Week',
        '上月': 'Last Month',
        '请输入': 'Please input',
        '请选择': 'Please select',
        '请填写': 'Please fill in',
        '不能为空': 'Cannot be empty',
        '操作人': 'Operator',
        '操作时间': 'Operation Time',
        '开始时间': 'Start Time',
        '结束时间': 'End Time',
        '开始日期': 'Start Date',
        '结束日期': 'End Date',
        '创建人': 'Creator',
        '更新人': 'Updater',
        '审核人': 'Reviewer',
        '订单': 'Order',
        '订单号': 'Order Number',
        '订单日期': 'Order Date',
        '订单状态': 'Order Status',
        '订单类型': 'Order Type',
        '产品名称': 'Product Name',
        '产品编码': 'Product Code',
        '物料名称': 'Material Name',
        '物料编码': 'Material Code',
        '仓库名称': 'Warehouse Name',
        '仓库编码': 'Warehouse Code',
        '设备名称': 'Equipment Name',
        '设备编码': 'Equipment Code',
        '客户': 'Customer',
        '供应商': 'Supplier',
        '供应商名称': 'Supplier Name',
        '客户名称': 'Customer Name',
        '说明': 'Description',
        '内容': 'Content',
        '标题': 'Title',
        '副标题': 'Subtitle',
        '员工': 'Employee',
        '部门': 'Department',
        '职位': 'Position',
        '薪资': 'Salary',
        '考勤': 'Attendance',
        '培训': 'Training',
        '招聘': 'Recruitment',
        '绩效': 'Performance',
        '合同': 'Contract',
        '资产': 'Asset',
        '财务': 'Finance',
        '预算': 'Budget',
        '费用': 'Expense',
        '报表': 'Report',
        '凭证': 'Voucher',
        '科目': 'Subject',
        '风险': 'Risk',
        '安全': 'Safety',
        '环境': 'Environment',
        '健康': 'Health',
        '事故': 'Accident',
        '隐患': 'Hazard',
        '检查': 'Inspection',
        '应急': 'Emergency',
        '数据': 'Data',
        '分析': 'Analysis',
        '图表': 'Chart',
        '仪表盘': 'Dashboard',
        '大屏': 'Dashboard',
        '数据源': 'Data Source',
        '数据集': 'Dataset',
        '可视化': 'Visualization',
        '资产管理': 'Asset Management',
        '财务管理': 'Finance Management',
        '人力资源': 'HR Management',
        '商业智能': 'Business Intelligence',
        '环境健康安全': 'EHS Management',
    }
    
    if text in translations:
        return translations[text]
    
    result = text
    for cn, en in sorted(translations.items(), key=lambda x: -len(x[0])):
        result = result.replace(cn, en)
    
    if result == text:
        return text
    
    return result


def process_file(file_path, module, page_scope, zh_data, en_data, dry_run=False):
    print(f"\nProcessing: {os.path.basename(file_path)}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'useTranslation' in content and f"{module}.{page_scope}." in content:
        print(f"  SKIP: already converted")
        return False, {}
    
    chinese_strings = find_chinese_strings(content)
    
    if not chinese_strings:
        print(f"  SKIP: no Chinese strings found")
        return False, {}
    
    existing_keys = set()
    existing_values = {}
    
    if module in zh_data and page_scope in zh_data[module]:
        page_data = zh_data[module][page_scope]
        for k, v in page_data.items():
            if isinstance(v, str):
                existing_keys.add(k)
                existing_values[v] = k
    
    new_keys = {}
    
    for cs in chinese_strings:
        text = cs['content']
        if text in new_keys:
            continue
        if text in existing_values:
            new_keys[text] = existing_values[text]
            continue
        
        key = generate_key_name(text, existing_keys | set(new_keys.values()))
        new_keys[text] = key
    
    new_content = add_use_translation_import(content)
    new_content = add_use_translation_hook(new_content)
    
    chinese_strings = find_chinese_strings(new_content)
    
    for cs in reversed(chinese_strings):
        text = cs['content']
        start = cs['start']
        end = cs['end']
        
        if text not in new_keys:
            continue
        
        key = new_keys[text]
        full_key = f"{module}.{page_scope}.{key}"
        
        is_jsx_attr = is_in_jsx_attribute(new_content, start)
        is_jsx_text = is_in_jsx_context(new_content, start, end)
        
        if cs['quote'] == '`' and '${' in text:
            continue
        
        t_call = f"t('{full_key}')"
        
        if is_jsx_text:
            replacement = '{' + t_call + '}'
        elif is_jsx_attr:
            replacement = '{' + t_call + '}'
        else:
            replacement = t_call
        
        new_content = new_content[:start] + replacement + new_content[end:]
    
    if not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  WROTE: {file_path}")
    
    new_keys_to_add = {}
    for text, key in new_keys.items():
        if text not in existing_values:
            new_keys_to_add[text] = key
    
    print(f"  Chinese strings: {len(chinese_strings)}, New keys: {len(new_keys_to_add)}")
    
    return True, new_keys_to_add


def update_i18n_files(zh_data, en_data, all_new_keys):
    for (module, page_scope), keys in all_new_keys.items():
        if module not in zh_data:
            zh_data[module] = {}
        if page_scope not in zh_data[module]:
            zh_data[module][page_scope] = {}
        
        if module not in en_data:
            en_data[module] = {}
        if page_scope not in en_data[module]:
            en_data[module][page_scope] = {}
        
        for text, key in keys.items():
            if key not in zh_data[module][page_scope]:
                zh_data[module][page_scope][key] = text
            if key not in en_data[module][page_scope]:
                en_data[module][page_scope][key] = translate_chinese_to_english(text)


def main():
    print("=== i18n Converter V19.8 - 5 Modules ===")
    
    with open(ZH_JSON_PATH, 'r', encoding='utf-8') as f:
        zh_data = json.load(f)
    with open(EN_JSON_PATH, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    
    dry_run = '--dry-run' in sys.argv
    
    all_new_keys = {}
    total_files_converted = 0
    
    for file_path, module, page_scope in FILES_TO_PROCESS:
        if not os.path.exists(file_path):
            print(f"NOT FOUND: {file_path}")
            continue
        
        converted, new_keys = process_file(file_path, module, page_scope, zh_data, en_data, dry_run)
        
        if converted:
            total_files_converted += 1
            all_new_keys[(module, page_scope)] = new_keys
    
    print(f"\n=== Conversion Summary ===")
    print(f"Files converted: {total_files_converted}")
    print(f"Total new keys: {sum(len(k) for k in all_new_keys.values())}")
    
    if not dry_run:
        update_i18n_files(zh_data, en_data, all_new_keys)
        
        with open(ZH_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(zh_data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        
        with open(EN_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(en_data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        
        print(f"Updated: {ZH_JSON_PATH}")
        print(f"Updated: {EN_JSON_PATH}")
    else:
        print("(dry-run mode - no files written)")


if __name__ == '__main__':
    main()
