#!/usr/bin/env python3
"""
Comprehensive i18n converter for TSX files.
Converts hardcoded Chinese strings to t() calls and updates i18n JSON files.
"""

import re
import json
import os
import sys
import hashlib
from pathlib import Path

FILES_TO_PROCESS = [
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/BatchManagementPage.tsx', 'wms', 'batch_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InboundOrderPage.tsx', 'wms', 'inbound_order_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InboundPage.tsx', 'wms', 'inbound_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InventoryPage.tsx', 'wms', 'inventory_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InventoryReportPage.tsx', 'wms', 'inventory_report_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/LocationPage.tsx', 'wms', 'location_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundOrderPage.tsx', 'wms', 'outbound_order_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundPage.tsx', 'wms', 'outbound_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/ReplenishmentPage.tsx', 'wms', 'replenishment_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/SerialNumberPage.tsx', 'wms', 'serial_number_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/StockTakePage.tsx', 'wms', 'stocktake_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/SupplierManagementPage.tsx', 'wms', 'supplier_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/TransferPage.tsx', 'wms', 'transfer_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/WorkStationPage.tsx', 'mes', 'work_station_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionProcessPage.tsx', 'mes', 'production_process_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProcessRoutePage.tsx', 'mes', 'process_route_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProcessFlowPage.tsx', 'mes', 'process_flow_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/EquipmentOEEPage.tsx', 'mes', 'equipment_oee_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/EquipmentManagementPage.tsx', 'mes', 'equipment_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialIssuePage.tsx', 'mes', 'material_issue_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialReturnPage.tsx', 'mes', 'material_return_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialBOMPage.tsx', 'mes', 'material_bom_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialRequirementPage.tsx', 'mes', 'material_requirement_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/WorkReportPage.tsx', 'mes', 'work_report_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/TeamManagementPage.tsx', 'mes', 'team_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionRecordPage.tsx', 'mes', 'production_record_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionOrderDetailPage.tsx', 'mes', 'production_order_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionOrderManagementPage.tsx', 'mes', 'production_order_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionSchedulePage.tsx', 'mes', 'production_schedule_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/QualityInspectionPage.tsx', 'mes', 'quality_inspection_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/WorkOrderPage.tsx', 'mes', 'work_order_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MesQualityPage.tsx', 'mes', 'mes_quality_page'),
]

ZH_JSON_PATH = '/Users/air/TOPEMS/apps/web/src/i18n/locales/zh.json'
EN_JSON_PATH = '/Users/air/TOPEMS/apps/web/src/i18n/locales/en.json'

CN_CHAR_RE = r'[\u4e00-\u9fff]'

# Common Chinese to English key mappings
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
    '备注': 'remark',
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
    '合格数': 'qualified_count',
    '不合格数': 'unqualified_count',
    '总数量': 'total_quantity',
    '完成数量': 'completed_quantity',
    '计划数量': 'planned_quantity',
    '实际数量': 'actual_quantity',
    '差异数量': 'diff_quantity',
    '差异': 'difference',
    '正常': 'normal',
    '异常': 'abnormal',
    '运行中': 'running',
    '空闲': 'idle',
    '故障': 'fault',
    '停机': 'downtime',
    '维修': 'repair',
    '保养': 'maintenance',
    '点检': 'inspection',
    '巡检': 'patrol',
    '报修': 'report_repair',
    '生产': 'production',
    '生产中': 'in_production',
    '待生产': 'pending_production',
    '生产完成': 'production_completed',
    '入库': 'inbound',
    '出库': 'outbound',
    '调拨': 'transfer',
    '盘点': 'stocktake',
    '调拨入库': 'transfer_inbound',
    '调拨出库': 'transfer_outbound',
    '采购入库': 'purchase_inbound',
    '销售出库': 'sales_outbound',
    '退货入库': 'return_inbound',
    '退货出库': 'return_outbound',
    '领料': 'material_issue',
    '退料': 'material_return',
    '报废': 'scrap',
    '报工': 'work_report',
    '质检': 'quality_inspection',
    '检验': 'inspection',
    '检测': 'detection',
    '测试': 'test',
    '合格率': 'pass_rate',
    '不良率': 'defect_rate',
    '利用率': 'utilization_rate',
    'OEE': 'oee',
    '可用率': 'availability',
    '表现率': 'performance',
    '质量率': 'quality_rate',
    '计划可用率': 'planned_availability',
    '今日': 'today',
    '本周': 'this_week',
    '本月': 'this_month',
    '本年': 'this_year',
    '昨日': 'yesterday',
    '上周': 'last_week',
    '上月': 'last_month',
    '去年': 'last_year',
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
    '确认人': 'confirmer',
    '制单人': 'document_maker',
    '审批人': 'approver',
    '提交人': 'submitter',
    '完成人': 'completer',
    '负责人': 'manager',
    '责任人': 'responsible_person',
    '参与人': 'participant',
    '相关人员': 'related_person',
    '关联': 'related',
    '关联工单': 'related_work_order',
    '关联工序': 'related_process',
    '关联设备': 'related_equipment',
    '关联人员': 'related_personnel',
    '关联物料': 'related_material',
    '关联产品': 'related_product',
    '关联仓库': 'related_warehouse',
    '关联库位': 'related_location',
    '关联订单': 'related_order',
    '订单': 'order',
    '订单号': 'order_number',
    '订单日期': 'order_date',
    '订单状态': 'order_status',
    '订单类型': 'order_type',
    '订单数量': 'order_quantity',
    '订单金额': 'order_amount',
    '产品名称': 'product_name',
    '产品编码': 'product_code',
    '产品规格': 'product_spec',
    '产品类型': 'product_type',
    '产品分类': 'product_category',
    '产品状态': 'product_status',
    '产品描述': 'product_description',
    '物料名称': 'material_name',
    '物料编码': 'material_code',
    '物料规格': 'material_spec',
    '物料类型': 'material_type',
    '物料分类': 'material_category',
    '物料状态': 'material_status',
    '物料描述': 'material_description',
    '物料单位': 'material_unit',
    '仓库名称': 'warehouse_name',
    '仓库编码': 'warehouse_code',
    '仓库类型': 'warehouse_type',
    '仓库状态': 'warehouse_status',
    '库位编码': 'location_code',
    '库位名称': 'location_name',
    '库位类型': 'location_type',
    '库位状态': 'location_status',
    '工序名称': 'process_name',
    '工序编码': 'process_code',
    '工序类型': 'process_type',
    '工序状态': 'process_status',
    '工单号': 'work_order_number',
    '工单状态': 'work_order_status',
    '工单类型': 'work_order_type',
    '设备名称': 'equipment_name',
    '设备编码': 'equipment_code',
    '设备类型': 'equipment_type',
    '设备状态': 'equipment_status',
    '班组名称': 'team_name',
    '班组编码': 'team_code',
    '人员名称': 'personnel_name',
    '人员编码': 'personnel_code',
    '生产线': 'production_line',
    '车间': 'workshop',
    '工厂': 'factory',
    '客户': 'customer',
    '供应商': 'supplier',
    '供应商名称': 'supplier_name',
    '客户名称': 'customer_name',
    '客户编码': 'customer_code',
    '供应商编码': 'supplier_code',
    'BOM': 'bom',
    'BOM名称': 'bom_name',
    'BOM编码': 'bom_code',
    'BOM版本': 'bom_version',
    'BOM状态': 'bom_status',
    'BOM类型': 'bom_type',
    'BOM描述': 'bom_description',
    '工艺路线': 'process_route',
    '工艺路线名称': 'process_route_name',
    '工艺路线编码': 'process_route_code',
    '工艺路线版本': 'process_route_version',
    '工艺路线状态': 'process_route_status',
    '工艺路线类型': 'process_route_type',
    '工艺路线描述': 'process_route_description',
    '检验项目': 'inspection_item',
    '检验方法': 'inspection_method',
    '检验标准': 'inspection_standard',
    '检验结果': 'inspection_result',
    '检验值': 'inspection_value',
    '标准值': 'standard_value',
    '上限': 'upper_limit',
    '下限': 'lower_limit',
    '备注': 'remark',
    '说明': 'description',
    '描述': 'description',
    '内容': 'content',
    '标题': 'title',
    '副标题': 'subtitle',
    '操作': 'action',
    '操作类型': 'action_type',
    '操作结果': 'action_result',
    '操作详情': 'action_detail',
    '操作记录': 'action_log',
    '操作日志': 'action_log',
    '登录日志': 'login_log',
    '系统日志': 'system_log',
    '业务日志': 'business_log',
    '错误日志': 'error_log',
    '访问日志': 'access_log',
    '审计日志': 'audit_log',
}


def find_chinese_strings(content):
    """Find all Chinese string literals in the content, skipping comments and existing t() calls.
    Properly handles single-line strings (most common case) and multi-line template literals.
    """
    results = []
    lines = content.split('\n')
    line_starts = [0]
    for line in lines:
        line_starts.append(line_starts[-1] + len(line) + 1)
    
    # Process line by line to avoid cross-line matching issues
    # For each line, find string literals containing Chinese characters
    # This is safer than using DOTALL which can match across lines
    
    # Pattern for single-line string literals (most common case)
    # Matches: '...中文...', "...中文...", `...中文...` (without newlines inside)
    single_line_pattern = re.compile(
        r"""(?P<quote>['"`])(?P<content>(?:\\.|(?!\1)[^\n])*""" + CN_CHAR_RE + r"""(?:\\.|(?!\1)[^\n])*)(?P=quote)"""
    )
    
    # Process each line
    for line_idx, line in enumerate(lines):
        line_stripped = line.lstrip()
        
        # Skip comment lines
        if line_stripped.startswith('//') or line_stripped.startswith('*') or line_stripped.startswith('/*'):
            continue
        
        # Skip import lines (we don't want to translate import paths)
        if line_stripped.startswith('import '):
            continue
        
        # Find all string literals on this line
        for match in single_line_pattern.finditer(line):
            text = match.group('content')
            
            # Calculate absolute position in content
            line_start_pos = line_starts[line_idx]
            abs_start = line_start_pos + match.start()
            abs_end = line_start_pos + match.end()
            
            # Check if already inside a t() call on this line
            before_on_line = line[:match.start()]
            # Find last 't(' on this line
            last_t_idx = before_on_line.rfind('t(')
            if last_t_idx >= 0:
                # Check if there's a closing paren between last_t_idx and match start
                between = before_on_line[last_t_idx+2:]
                # If no closing paren, the string is inside t()
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
    """Generate a meaningful key name from Chinese text."""
    text = text.strip()
    
    # Direct match
    if text in COMMON_KEYS:
        base = COMMON_KEYS[text]
    else:
        # Try partial matches (longest first)
        base = None
        for cn in sorted(COMMON_KEYS.keys(), key=lambda x: -len(x)):
            if cn in text:
                base = COMMON_KEYS[cn]
                break
        
        if base is None:
            # Use hash
            h = hashlib.md5(text.encode('utf-8')).hexdigest()[:6]
            base = f'text_{h}'
    
    # Ensure uniqueness
    key = base
    counter = 1
    while key in existing_keys:
        key = f'{base}_{counter}'
        counter += 1
    
    return key


def is_in_jsx_context(content, start, end):
    """Check if the string is in JSX text context (needs {} wrapping)."""
    # Find the surrounding context
    before = content[:start].rstrip()
    after = content[end:].lstrip()
    
    # If preceded by > and followed by <, it's JSX text
    if before.endswith('>') and (after.startswith('<') or after.startswith('{')):
        return True
    
    # Check if it's a prop value (e.g., label="中文")
    # In this case, we don't need to wrap
    return False


def is_in_jsx_attribute(content, start):
    """Check if the string is a JSX attribute value (e.g., label="text").
    Returns True only for JSX attributes, not JS assignments.
    """
    before = content[:start].rstrip()
    # If preceded by = and an identifier, it's likely a JSX attribute
    if before.endswith('='):
        # Check that it's not == or ===
        if before.endswith('==') or before.endswith('==='):
            return False
        # Get the character before the =
        # If it's a space, it's likely a JS assignment (e.g., `x = 'value'`)
        # If it's a letter/digit/}, it's likely a JSX attribute (e.g., `label='value'`)
        if len(before) >= 2:
            char_before_eq = before[-2]
            if char_before_eq.isspace():
                # JS assignment like `const x = 'value'` or `x = 'value'`
                return False
            # Check if it's a JSX attribute (letter, digit, or } before =)
            if char_before_eq.isalnum() or char_before_eq in '}]':
                return True
        return True
    return False


def is_in_object_literal(content, start):
    """Check if the string is a value in an object literal (e.g., { label: "text" })."""
    before = content[:start].rstrip()
    if before.endswith(':') and not before.endswith('::'):
        return True
    return False


def add_use_translation_import(content):
    """Add useTranslation import if not present."""
    if "from 'react-i18next'" in content or 'from "react-i18next"' in content:
        return content
    
    # Find the last import statement
    import_pattern = re.compile(r'^import\s+.*?;?\s*$', re.MULTILINE)
    matches = list(import_pattern.finditer(content))
    
    if not matches:
        return content
    
    last_import = matches[-1]
    insertion_point = last_import.end()
    
    new_import = "\nimport { useTranslation } from 'react-i18next';"
    
    return content[:insertion_point] + new_import + content[insertion_point:]


def add_use_translation_hook(content):
    """Add const { t } = useTranslation(); after component function declaration."""
    if 'useTranslation()' in content:
        return content
    
    # Find the component function declaration
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
    
    # Find indentation (2 spaces by default)
    line_start = content.rfind('\n', 0, insertion_point) + 1
    indent = '  '
    
    hook = f'\n{indent}const {{ t }} = useTranslation();'
    
    return content[:insertion_point] + hook + content[insertion_point:]


def update_memo_deps(content):
    """Add t to useMemo/useCallback dependency arrays that contain t() calls."""
    # This is a simplified approach - add t to all useMemo/useCallback deps
    # Pattern: useMemo(() => {...}, [deps])
    # We need to find useMemos that contain t() calls and add t to deps
    
    # Find all useMemo calls
    pattern = re.compile(r'(useMemo|useCallback)\s*\(\s*\(\s*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\},\s*\[([^\]]*)\]\s*\)', re.DOTALL)
    
    def add_t_to_deps(match):
        hook_name = match.group(1)
        body = match.group(2)
        deps = match.group(3).strip()
        
        # Only add t if the body contains t( calls
        if 't(' in body and 't,' not in deps and 't]' not in deps and deps != 't':
            if deps:
                new_deps = deps.rstrip() + ', t'
            else:
                new_deps = 't'
            return f'{hook_name}(() => {{{body}}}, [{new_deps}])'
        return match.group(0)
    
    return pattern.sub(add_t_to_deps, content)


def translate_chinese_to_english(text):
    """Translate Chinese text to English for en.json (using simple mapping)."""
    # This is a simplified translation - in production, would use a translation service
    # For now, use a basic mapping of common phrases
    
    # Common translations
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
        '订单数量': 'Order Quantity',
        '订单金额': 'Order Amount',
        '产品名称': 'Product Name',
        '产品编码': 'Product Code',
        '产品规格': 'Product Spec',
        '产品类型': 'Product Type',
        '物料名称': 'Material Name',
        '物料编码': 'Material Code',
        '物料规格': 'Material Spec',
        '物料类型': 'Material Type',
        '物料单位': 'Material Unit',
        '仓库名称': 'Warehouse Name',
        '仓库编码': 'Warehouse Code',
        '仓库类型': 'Warehouse Type',
        '仓库状态': 'Warehouse Status',
        '库位编码': 'Location Code',
        '库位名称': 'Location Name',
        '工序名称': 'Process Name',
        '工序编码': 'Process Code',
        '工单号': 'Work Order Number',
        '工单状态': 'Work Order Status',
        '工单类型': 'Work Order Type',
        '设备名称': 'Equipment Name',
        '设备编码': 'Equipment Code',
        '设备类型': 'Equipment Type',
        '设备状态': 'Equipment Status',
        '班组名称': 'Team Name',
        '班组编码': 'Team Code',
        '人员名称': 'Personnel Name',
        '人员编码': 'Personnel Code',
        '生产线': 'Production Line',
        '车间': 'Workshop',
        '工厂': 'Factory',
        '客户': 'Customer',
        '供应商': 'Supplier',
        '供应商名称': 'Supplier Name',
        '客户名称': 'Customer Name',
        '客户编码': 'Customer Code',
        '供应商编码': 'Supplier Code',
        'BOM': 'BOM',
        'BOM名称': 'BOM Name',
        'BOM编码': 'BOM Code',
        'BOM版本': 'BOM Version',
        '工艺路线': 'Process Route',
        '检验项目': 'Inspection Item',
        '检验方法': 'Inspection Method',
        '检验标准': 'Inspection Standard',
        '检验结果': 'Inspection Result',
        '检验值': 'Inspection Value',
        '标准值': 'Standard Value',
        '上限': 'Upper Limit',
        '下限': 'Lower Limit',
        '说明': 'Description',
        '内容': 'Content',
        '标题': 'Title',
        '副标题': 'Subtitle',
        '操作类型': 'Action Type',
        '操作结果': 'Action Result',
        '操作详情': 'Action Detail',
        '操作记录': 'Action Log',
        '操作日志': 'Action Log',
        '登录日志': 'Login Log',
        '系统日志': 'System Log',
        '业务日志': 'Business Log',
        '错误日志': 'Error Log',
        '访问日志': 'Access Log',
        '审计日志': 'Audit Log',
        '合格率': 'Pass Rate',
        '不良率': 'Defect Rate',
        '利用率': 'Utilization Rate',
        '可用率': 'Availability',
        '表现率': 'Performance',
        '质量率': 'Quality Rate',
        '计划数量': 'Planned Quantity',
        '实际数量': 'Actual Quantity',
        '完成数量': 'Completed Quantity',
        '总数量': 'Total Quantity',
        '合格数': 'Qualified Count',
        '不合格数': 'Unqualified Count',
    }
    
    # Try direct match
    if text in translations:
        return translations[text]
    
    # Try to construct translation by replacing Chinese words with English
    result = text
    for cn, en in sorted(translations.items(), key=lambda x: -len(x[0])):
        result = result.replace(cn, en)
    
    # If no translation happened, keep original
    if result == text:
        # Return a placeholder - will be the same as Chinese
        return text
    
    return result


def process_file(file_path, module, page_scope, zh_data, en_data, dry_run=False):
    """Process a single TSX file."""
    print(f"\nProcessing: {os.path.basename(file_path)}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if already converted
    if 'useTranslation' in content and f"{module}.{page_scope}." in content:
        print(f"  SKIP: already converted")
        return False, {}
    
    # Find all Chinese strings
    chinese_strings = find_chinese_strings(content)
    
    if not chinese_strings:
        print(f"  SKIP: no Chinese strings found")
        return False, {}
    
    # Get existing keys for this page_scope
    existing_keys = set()
    existing_values = {}  # chinese_text -> key_name
    
    if module in zh_data and page_scope in zh_data[module]:
        page_data = zh_data[module][page_scope]
        for k, v in page_data.items():
            if isinstance(v, str):
                existing_keys.add(k)
                existing_values[v] = k
    
    # Generate keys for each unique Chinese string
    new_keys = {}  # chinese_text -> key_name
    
    for cs in chinese_strings:
        text = cs['content']
        if text in new_keys:
            continue
        if text in existing_values:
            new_keys[text] = existing_values[text]
            continue
        
        key = generate_key_name(text, existing_keys | set(new_keys.values()))
        new_keys[text] = key
    
    # Add useTranslation import and hook
    new_content = add_use_translation_import(content)
    new_content = add_use_translation_hook(new_content)
    
    # Replace Chinese strings with t() calls (process in reverse order to preserve positions)
    # Re-find strings in the modified content (positions changed)
    chinese_strings = find_chinese_strings(new_content)
    
    # Process in reverse order
    for cs in reversed(chinese_strings):
        text = cs['content']
        start = cs['start']
        end = cs['end']
        
        if text not in new_keys:
            continue
        
        key = new_keys[text]
        full_key = f"{module}.{page_scope}.{key}"
        
        # Determine context
        is_jsx_attr = is_in_jsx_attribute(new_content, start)
        is_jsx_text = is_in_jsx_context(new_content, start, end)
        
        # Check if the string contains template expressions
        if cs['quote'] == '`' and '${' in text:
            # Template literal with expressions - more complex handling needed
            # For now, skip these (we'd need to convert to t() with interpolation)
            # Convert ${expr} to {{expr}} in i18n and use t(key, { expr })
            # This is complex - skip for now
            continue
        
        # Replace the string with t() call
        t_call = f"t('{full_key}')"
        
        if is_jsx_text:
            # In JSX text context, wrap in {}
            replacement = '{' + t_call + '}'
        elif is_jsx_attr:
            # In JSX attribute context, also wrap in {} (e.g., label={t('...')})
            replacement = '{' + t_call + '}'
        else:
            # In string context (object value, function arg, etc.)
            replacement = t_call
        
        new_content = new_content[:start] + replacement + new_content[end:]
    
    # Add t to useMemo/useCallback deps
    new_content = update_memo_deps(new_content)
    
    if not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  WROTE: {file_path}")
    
    # Return new keys (excluding ones that already existed)
    new_keys_to_add = {}
    for text, key in new_keys.items():
        if text not in existing_values:
            new_keys_to_add[text] = key
    
    print(f"  Chinese strings: {len(chinese_strings)}, New keys: {len(new_keys_to_add)}")
    
    return True, new_keys_to_add


def update_i18n_files(zh_data, en_data, all_new_keys):
    """Update zh.json and en.json with new keys."""
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
            # Don't overwrite existing keys
            if key not in zh_data[module][page_scope]:
                zh_data[module][page_scope][key] = text
            if key not in en_data[module][page_scope]:
                en_data[module][page_scope][key] = translate_chinese_to_english(text)


def main():
    print("=== i18n Converter ===")
    
    # Load i18n files
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
        # Update i18n files
        update_i18n_files(zh_data, en_data, all_new_keys)
        
        # Write back
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
