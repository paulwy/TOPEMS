#!/usr/bin/env python3
"""
i18n transformation - Final comprehensive version.
Handles: string literals, template literals, JSX text, module vs component scope.
"""
import os, re, json, sys
from collections import OrderedDict

BASE = "/Users/air/TOPEMS/apps/web/src"
ZH_PATH = f"{BASE}/i18n/locales/zh.json"
EN_PATH = f"{BASE}/i18n/locales/en.json"

ALL_FILES = [
    # SCM (14)
    "pages/scm/SupplierAdmissionPage.tsx",
    "pages/scm/ScmOverviewPage.tsx",
    "pages/scm/ScmDeliveryAppointmentPage.tsx",
    "pages/scm/DashboardPage.tsx",
    "pages/scm/ScmInventoryTurnoverPage.tsx",
    "pages/scm/MrpPlanPage.tsx",
    "pages/scm/ScmPurchaseItemPage.tsx",
    "pages/scm/ScmPriceComparisonPage.tsx",
    "pages/scm/ScmPurchaseContractPage.tsx",
    "pages/scm/ScmEvaluationPage.tsx",
    "pages/scm/ScmPurchaseOrderPage.tsx",
    "pages/scm/ScmSupplierPage.tsx",
    "pages/scm/PurchaseRequisitionPage.tsx",
    "pages/scm/PurchaseContractPage.tsx",
    # LIMS (10)
    "pages/lims/LimsInstrumentPage.tsx",
    "pages/lims/LimsInstrumentDataPage/components/ParseTestDialog.tsx",
    "pages/lims/LimsInstrumentDataPage/components/RuleFormDialog.tsx",
    "pages/lims/LimsInstrumentDataPage/components/TaskFormDialog.tsx",
    "pages/lims/LimsInstrumentDataPage/components/DataDetailDialog.tsx",
    "pages/lims/LimsInstrumentDataPage/components/InstrumentDataTable.tsx",
    "pages/lims/LimsInstrumentDataPage/components/StatisticsCards.tsx",
    "pages/lims/LimsInstrumentDataPage/components/Toolbar.tsx",
    "pages/lims/LimsInstrumentDataPage/components/ParseRuleTable.tsx",
    "pages/lims/LimsInstrumentDataPage/components/DataFormDialog.tsx",
    # WMS (3)
    "pages/wms/SupplierDetailPage.tsx",
    "pages/wms/OutboundOrderPage.tsx",
    "pages/wms/BatchManagementPage.tsx",
]

CJK = re.compile(r'[\u4e00-\u9fff]+')

# ============ KEY MAPPINGS ============
# Comprehensive mapping: Chinese text -> i18n key
# Sorted by length (longest first) to prevent partial matches
MAPPINGS_RAW = [
    # SupplierAdmissionPage - template literals with expressions
    ('确定要将预约"${apt.appointment_no}"标记为已完成吗？', 'scm.supplier_admission.confirm_mark_completed'),
    ('确定要将供应商"${row.supplier_name}"正式准入吗？', 'scm.supplier_admission.confirm_final_admission'),
    ('确定要提交供应商准入"${row.admission_no}"审核吗？', 'scm.supplier_admission.confirm_submit'),
    ('确定要拒绝供应商准入"${row.admission_no}"吗？', 'scm.supplier_admission.confirm_reject'),
    ('确定要通过供应商准入"${row.admission_no}"吗？', 'scm.supplier_admission.confirm_approve'),
    ('确定要审批通过预约"${apt.appointment_no}"吗？', 'scm.delivery_appointment.confirm_approve'),
    ('确定要确认预约"${apt.appointment_no}"已到货吗？', 'scm.delivery_appointment.confirm_arrival'),
    ('确定要驳回预约"${apt.appointment_no}"吗？', 'scm.delivery_appointment.confirm_reject'),
    ('确定要取消预约"${apt.appointment_no}"吗？', 'scm.delivery_appointment.confirm_cancel'),
    ('确定要对MRP计划"${plan.plan_name}"进行MRP运算吗？', 'scm.mrp.confirm_calc'),
    # SupplierAdmissionPage - strings
    ('供应商准入已提交审核', 'scm.supplier_admission.submitted'),
    ('提交供应商准入失败', 'scm.supplier_admission.submit_failed'),
    ('供应商准入已通过', 'scm.supplier_admission.approved'),
    ('通过供应商准入失败', 'scm.supplier_admission.approve_failed'),
    ('供应商准入已拒绝', 'scm.supplier_admission.rejected'),
    ('拒绝供应商准入失败', 'scm.supplier_admission.reject_failed'),
    ('供应商已正式准入', 'scm.supplier_admission.formally_admitted'),
    ('供应商准入失败', 'scm.supplier_admission.admission_failed'),
    ('供应商准入管理', 'scm.supplier_admission.management'),
    ('提交失败:', 'scm.common.submit_failed_colon'),
    ('操作失败:', 'scm.common.operation_failed_colon'),
    ('准入失败:', 'scm.supplier_admission.admission_failed_colon'),
    ('MRP运算失败:', 'scm.mrp.calc_failed_colon'),
    ('${action}失败:', 'scm.delivery_appointment.action_failed_colon'),
    ('${action}失败', 'scm.delivery_appointment.action_failed'),
    ('提交成功', 'scm.common.submit_success'),
    ('已通过', 'scm.common.approved'),
    ('已拒绝', 'scm.common.rejected'),
    ('操作成功', 'scm.common.operation_success'),
    ('准入成功', 'scm.supplier_admission.admission_success'),
    ('提交', 'scm.common.action_submit'),
    ('通过', 'scm.common.action_approve'),
    ('拒绝', 'scm.common.action_reject'),
    ('准入', 'scm.supplier_admission.action_admit'),
    ('确认提交', 'scm.supplier_admission.confirm_submit_title'),
    ('确认通过', 'scm.supplier_admission.confirm_approve_title'),
    ('确认拒绝', 'scm.supplier_admission.confirm_reject_title'),
    ('确认准入', 'scm.supplier_admission.confirm_admit_title'),
    ('确认运算', 'scm.mrp.confirm_calc_title'),
    # ScmOverviewPage
    ('供应商评级分布', 'scm.overview.supplier_rating_distribution'),
    ('MRP建议状态', 'scm.overview.mrp_suggestion_status'),
    ('向供应商A采购原材料', 'scm.overview.purchase_from_supplier_a'),
    ('综合评分: A (95分)', 'scm.overview.overall_score'),
    ('7月生产物料需求计划', 'scm.overview.july_material_plan'),
    ('设备配件采购', 'scm.overview.equipment_purchase'),
    ('供应商C - 预计6月30日到货', 'scm.overview.supplier_c_eta'),
    ('采购订单趋势', 'scm.overview.purchase_order_trend'),
    ('送货单 DL-2026-0035', 'scm.overview.delivery_order'),
    ('供应商B年度评审', 'scm.overview.supplier_b_review'),
    ('供应链管理', 'scm.common.supply_chain_management'),
    ('最近动态', 'scm.overview.recent_activity'),
    ('快捷操作', 'scm.overview.quick_actions'),
    ('供应链', 'scm.common.supply_chain'),
    ('首页', 'scm.common.home'),
    ('供应商A', 'scm.overview.supplier_a'),
    ('供应商B', 'scm.overview.supplier_b'),
    ('供应商C', 'scm.overview.supplier_c'),
    ('供应商D', 'scm.overview.supplier_d'),
    ('原材料', 'scm.overview.raw_material'),
    ('配件', 'scm.overview.parts'),
    ('设备', 'scm.overview.equipment'),
    ('运输中', 'scm.overview.in_transit'),
    ('第1周', 'scm.overview.week_1'),
    ('第2周', 'scm.overview.week_2'),
    ('第3周', 'scm.overview.week_3'),
    ('第4周', 'scm.overview.week_4'),
    ('第5周', 'scm.overview.week_5'),
    ('第6周', 'scm.overview.week_6'),
    ('1月', 'scm.overview.january'),
    ('2月', 'scm.overview.february'),
    ('3月', 'scm.overview.march'),
    ('4月', 'scm.overview.april'),
    ('5月', 'scm.overview.may'),
    ('6月', 'scm.overview.june'),
    ('1周', 'scm.overview.week_1_short'),
    ('2周', 'scm.overview.week_2_short'),
    ('3周', 'scm.overview.week_3_short'),
    ('4周', 'scm.overview.week_4_short'),
    ('5周', 'scm.overview.week_5_short'),
    ('6周', 'scm.overview.week_6_short'),
    # Dashboard
    ('本月采购额', 'scm.dashboard.monthly_purchase'),
    ('供应商采购量', 'scm.dashboard.supplier_purchase_volume'),
    ('每周采购趋势', 'scm.dashboard.weekly_purchase_trend'),
    ('采购类型分布', 'scm.dashboard.purchase_type_distribution'),
    ('新增供应商', 'scm.dashboard.new_supplier'),
    ('本月', 'scm.dashboard.this_month'),
    ('较上月', 'scm.dashboard.vs_last_month'),
    ('较上周期', 'scm.dashboard.vs_last_period'),
    ('准时交付率', 'scm.dashboard.on_time_delivery'),
    ('订单完成率', 'scm.dashboard.order_completion'),
    ('待检验', 'scm.dashboard.pending_inspection'),
    ('质检合格率', 'scm.dashboard.quality_pass_rate'),
    ('供应商总数', 'scm.dashboard.total_suppliers'),
    ('活跃占比', 'scm.dashboard.active_ratio'),
    ('平均评分', 'scm.dashboard.average_score'),
    ('晚上好', 'scm.dashboard.good_evening'),
    ('下午好', 'scm.dashboard.good_afternoon'),
    ('上午好', 'scm.dashboard.good_morning'),
    ('业务调整', 'scm.dashboard.business_adjustment'),
    ('入库完成', 'scm.dashboard.warehousing_complete'),
    ('进行中', 'scm.dashboard.in_progress'),
    ('待处理', 'scm.dashboard.pending'),
    ('完成', 'scm.dashboard.completed'),
    # Delivery appointment
    ('供应商送货预约', 'scm.delivery_appointment.supplier_delivery'),
    ('预约总数', 'scm.delivery_appointment.total'),
    ('即将到期', 'scm.delivery_appointment.upcoming'),
    ('已逾期', 'scm.delivery_appointment.overdue'),
    ('审批通过', 'scm.delivery_appointment.approve'),
    ('预约已审批通过', 'scm.delivery_appointment.appointment_approved'),
    ('审批', 'scm.delivery_appointment.approve_action'),
    ('驳回', 'scm.delivery_appointment.reject_action'),
    ('预约已驳回', 'scm.delivery_appointment.appointment_rejected'),
    ('到货确认', 'scm.delivery_appointment.arrival_confirm'),
    ('已到货', 'scm.delivery_appointment.arrived'),
    ('预约已完成', 'scm.delivery_appointment.appointment_completed'),
    ('预约已取消', 'scm.delivery_appointment.appointment_cancelled'),
    ('已确认到货', 'scm.delivery_appointment.arrival_confirmed'),
    ('不符合送货要求', 'scm.delivery_appointment.not_meet_requirements'),
    ('已到货', 'scm.delivery_appointment.arrived_short'),
    # Inventory turnover
    ('库存周转数据为只读，不支持创建', 'scm.inventory_turnover.readonly_no_create'),
    ('库存周转数据为只读，不支持编辑', 'scm.inventory_turnover.readonly_no_edit'),
    ('库存周转数据为只读，不支持删除', 'scm.inventory_turnover.readonly_no_delete'),
    ('库存周转报表导出中...', 'scm.inventory_turnover.exporting'),
    ('正在加载周转趋势分析...', 'scm.inventory_turnover.loading_trend'),
    ('库存周转率', 'scm.inventory_turnover.turnover_rate'),
    ('导出报表', 'scm.inventory_turnover.export_report'),
    ('趋势分析', 'scm.inventory_turnover.trend_analysis'),
    ('导出', 'scm.inventory_turnover.export'),
    ('趋势', 'scm.inventory_turnover.trend'),
    ('库存周转分析', 'scm.inventory_turnover.analysis'),
    ('库存周转', 'scm.inventory_turnover.title'),
    # MrpPlan
    ('MRP运算已完成', 'scm.mrp.calc_complete'),
    ('MRP运算执行失败', 'scm.mrp.calc_failed'),
    ('运算完成', 'scm.mrp.calc_complete_short'),
    ('运算失败', 'scm.mrp.calc_failed_short'),
    ('生产建议', 'scm.mrp.production_suggestions'),
    ('采购建议', 'scm.mrp.purchase_suggestions'),
    ('总建议数', 'scm.mrp.total_suggestions'),
    ('总物料项', 'scm.mrp.total_material_items'),
    ('MRP运算结果', 'scm.mrp.calc_result'),
    ('查看建议详情', 'scm.mrp.view_suggestion_detail'),
    ('查看建议', 'scm.mrp.view_suggestions'),
    ('运算', 'scm.mrp.calc_action'),
    ('关闭', 'scm.common.action_close'),
    # Purchase item
    ('加载采购明细失败', 'scm.purchase_item.load_failed'),
    ('创建采购明细失败', 'scm.purchase_item.create_failed'),
    ('更新采购明细失败', 'scm.purchase_item.update_failed'),
    ('采购明细暂不支持删除', 'scm.purchase_item.delete_not_supported'),
    ('采购明细管理', 'scm.purchase_item.management'),
    # Simple page titles
    ('询价比价', 'scm.price_comparison.title'),
    ('供应商评估', 'scm.evaluation.title'),
    ('采购订单', 'scm.purchase_order.title'),
    ('供应商管理', 'scm.supplier.title'),
    ('采购申请', 'scm.purchase_requisition.title'),
    ('采购合同', 'scm.purchase_contract.title'),
    ('采购合同评审', 'scm.purchase_contract_review.title'),
    # Common SCM
    ('供应商', 'scm.common.supplier'),
    ('创建', 'scm.common.create'),
    ('加载', 'scm.common.load'),
    ('删除', 'scm.common.delete'),
    ('编辑', 'scm.common.edit'),
    ('状态', 'scm.common.status'),
    ('成功', 'scm.common.success'),
    ('失败', 'scm.common.failed'),
    ('已完成', 'scm.common.completed'),
    ('进行中', 'scm.common.in_progress'),
    ('待处理', 'scm.common.pending'),
    ('取消', 'scm.common.cancel'),
    ('完成', 'scm.common.done'),
    ('合格(C)', 'scm.common.qualified_c'),
    ('良好(B)', 'scm.common.good_b'),
    ('优秀(A)', 'scm.common.excellent_a'),
    ('不合格(D)', 'scm.common.unqualified_d'),
    # LIMS
    ('仪器管理', 'lims.instrument.title'),
    ('协议类型', 'lims.common.protocol_type'),
    ('开始解析', 'lims.parse_test.start_parse'),
    ('解析中...', 'lims.parse_test.parsing'),
    ('解析失败', 'lims.parse_test.parse_failed'),
    ('解析成功', 'lims.parse_test.parse_success'),
    ('质量分', 'lims.parse_test.quality_score'),
    ('仪器类型', 'lims.rule_form.instrument_type'),
    ('保存', 'lims.common.save'),
    ('保存中...', 'lims.common.saving'),
    ('描述', 'lims.common.description'),
    ('新建解析规则', 'lims.rule_form.new_rule'),
    ('编辑解析规则', 'lims.rule_form.edit_rule'),
    ('规则名称', 'lims.rule_form.rule_name'),
    ('Cron 表达式', 'lims.task_form.cron_expression'),
    ('任务名称', 'lims.task_form.task_name'),
    ('新建采集任务', 'lims.task_form.new_task'),
    ('编辑采集任务', 'lims.task_form.edit_task'),
    ('采集方式', 'lims.task_form.collection_method'),
    ('间隔时间（分钟）', 'lims.task_form.interval_minutes'),
    ('批次号', 'lims.common.batch_number'),
    ('新增数据', 'lims.data_form.add_data'),
    ('编辑数据', 'lims.data_form.edit_data'),
    ('查看详情', 'lims.common.view_detail'),
    ('重新解析', 'lims.common.reparse'),
    ('今日采集', 'lims.statistics.today_collection'),
    ('数据总条数', 'lims.statistics.total_data'),
    ('解析规则', 'lims.statistics.parse_rules'),
    ('采集任务', 'lims.statistics.collection_tasks'),
    ('搜索...', 'lims.common.search'),
    ('运行中', 'lims.common.running'),
    ('已停止', 'lims.common.stopped'),
    ('启用', 'lims.common.enabled'),
    ('禁用', 'lims.common.disabled'),
    ('待解析', 'lims.common.pending_parse'),
    ('全部', 'lims.common.all'),
    ('输入数据 (JSON)', 'lims.parse_test.input_data_json'),
    ('输入数据', 'lims.parse_test.input_data'),
    ('解析结果', 'lims.parse_test.result'),
    ('仪器数据', 'lims.common.instrument_data'),
    ('原始数据', 'lims.common.raw_data'),
    ('解析测试', 'lims.parse_test.title'),
    ('解析', 'lims.parse_test.parse'),
    ('测试结果', 'lims.parse_test.test_result'),
    ('规则', 'lims.common.rule'),
    ('质量分:', 'lims.parse_test.quality_score_label'),
    # WMS
    ('可用', 'wms.batch.available'),
    ('剩余', 'wms.batch.remaining'),
    # More
    ('待审批', 'scm.common.pending_approval'),
    ('已生成', 'scm.common.generated'),
    ('已入库', 'scm.common.stocked'),
    ('已确认到货', 'scm.delivery_appointment.arrival_confirmed_short'),
    ('质检合格率', 'scm.dashboard.quality_pass_rate_short'),
]

# Sort by length descending
MAPPINGS_RAW.sort(key=lambda x: len(x[0]), reverse=True)
KEY_MAP = OrderedDict(MAPPINGS_RAW)

# Also add simple version without trailing punctuation
EXTRA_MAP = OrderedDict()
for zh, key in MAPPINGS_RAW:
    # Add versions with/without colon
    if zh.endswith(':') and zh[:-1] not in KEY_MAP:
        EXTRA_MAP[zh[:-1]] = key + '_nocolon'
# Add simple common strings
SIMPLE_MAP = [
    ('采购订单', 'scm.common.purchase_order'),
    ('供应商管理', 'scm.common.supplier_management'),
    ('MRP计划', 'scm.common.mrp_plan'),
    ('供应商评估', 'scm.common.supplier_evaluation'),
    ('送货预约', 'scm.common.delivery_appointment'),
    ('采购合同', 'scm.common.purchase_contract'),
    ('采购申请', 'scm.common.purchase_requisition'),
    ('询价比价', 'scm.common.price_comparison'),
    ('供应链管理', 'scm.common.supply_chain_management'),
    ('供应链', 'scm.common.supply_chain_short'),
    ('首页', 'scm.common.home_short'),
    ('删除', 'scm.common.delete_short'),
    ('编辑', 'scm.common.edit_short'),
    ('状态', 'scm.common.status_short'),
    ('成功', 'scm.common.success_short'),
    ('失败', 'scm.common.failed_short'),
    ('已完成', 'scm.common.completed_short'),
    ('进行中', 'scm.common.in_progress_short'),
    ('取消', 'scm.common.cancel_short'),
    ('完成', 'scm.common.complete_done'),
]

# Add simple mappings (sorted by length)
SIMPLE_MAP.sort(key=lambda x: len(x[0]), reverse=True)
for zh, key in SIMPLE_MAP:
    if zh not in KEY_MAP:
        KEY_MAP[zh] = key

# Add extra mappings
for zh, key in EXTRA_MAP.items():
    if zh not in KEY_MAP:
        KEY_MAP[zh] = key

def file_label(fp):
    b = os.path.basename(fp).replace('.tsx', '')
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', b)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def has_hook(content):
    return 'useTranslation' in content

def is_comment_line(line):
    s = line.strip()
    return s.startswith('//') or s.startswith('*')

def transform_file(file_path, module, dry_run=False):
    full_path = f"{BASE}/{file_path}"
    if not os.path.exists(full_path):
        print(f"  SKIP (not found): {file_path}")
        return {}, 0
    
    with open(full_path) as f:
        content = f.read()
    
    original = content
    had_hook = has_hook(content)
    page_prefix = f"{module}.{file_label(file_path)}"
    
    lines = content.split('\n')
    
    # Find component boundaries
    # For simplicity, we'll detect: function/component definitions and arrow functions
    component_ranges = []
    
    # Find all component-like functions
    pattern = re.compile(
        r'(const\s+\w+(?:\s*:\s*React\.FC)?\s*=\s*\(\)\s*=>\s*\{|'
        r'export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{|'
        r'function\s+\w+\s*\([^)]*\)\s*\{)'
    )
    
    for i, line in enumerate(lines):
        if pattern.match(line.strip()):
            # Find matching closing brace
            depth = 0
            found_open = False
            start = i
            for j in range(i, len(lines)):
                for ch in lines[j]:
                    if ch == '{':
                        depth += 1
                        found_open = True
                    elif ch == '}':
                        depth -= 1
                if found_open and depth == 0:
                    component_ranges.append((start, j))
                    break
    
    # Determine scope for each line
    def get_scope(line_idx):
        for start, end in component_ranges:
            if start <= line_idx <= end:
                return 'component'
        return 'module'
    
    # Step 1: Add imports if needed
    if not had_hook:
        import_line = "import { useTranslation } from 'react-i18next';"
        i18n_import = "import i18n from '@/i18n';"
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        lines.insert(last_import_idx + 1, import_line)
        lines.insert(last_import_idx + 2, i18n_import)
    
    # Step 2: Add hook calls in each component
    if not had_hook:
        offset = 0
        for start, end in component_ranges:
            actual_start = start + offset
            hook_line = "  const { t } = useTranslation();"
            # Insert after the opening brace line
            insert_at = actual_start + 1
            # Make sure we don't insert after existing hook
            if insert_at < len(lines) and 'useTranslation' not in lines[insert_at]:
                lines.insert(insert_at, hook_line)
                offset += 1
    
    # Step 3: Replace Chinese text
    new_lines = []
    replacements = 0
    
    for i, line in enumerate(lines):
        if is_comment_line(line):
            new_lines.append(line)
            continue
        
        scope = get_scope(i)
        use_t = (scope == 'component')
        fn = 't' if use_t else 'i18n.t'
        
        new_line = line
        
        # Replace string literals (longest first)
        for zh_text, key in KEY_MAP.items():
            if zh_text not in new_line:
                continue
            
            escaped = re.escape(zh_text)
            
            # Handle template literals with ${...}
            if '${' in zh_text:
                # Extract variable names
                vars_in_text = re.findall(r'\$\{([^}]+)\}', zh_text)
                # Build replacement pattern
                # Replace `zh_text` with t('key', {var1: var1, var2: var2})
                # But we need to find the actual template literal in the code
                # Pattern: `...zh_text...`
                escaped_template = escaped.replace(r'\$\{', r'\$\{').replace(r'\}', r'\}')
                pat = re.compile(r'`([^`]*)' + escaped_template + r'([^`]*)`')
                vars_dict = ', '.join([f"'{v}': {v}" for v in vars_in_text])
                replacement = f"{fn}('{key}', {{{vars_dict}}})"
                new_line = pat.sub(replacement, new_line)
            else:
                # Regular string: 'zh_text' or "zh_text"
                for quote in ["'", '"']:
                    pat = re.compile(quote + '(' + escaped + ')' + quote)
                    new_line = pat.sub(f"{fn}('{key}')", new_line)
                
                # Also handle JSX text: > zh_text <
                pat_jsx = r'(>)\s*(' + escaped + r')\s*(<)'
                new_line = re.sub(pat_jsx, rf'\1{{{fn}(\'{key}\')}}\3', new_line)
        
        # Also handle JSX text with expressions: >text {var}<
        for zh_text, key in KEY_MAP.items():
            if zh_text not in new_line:
                continue
            escaped = re.escape(zh_text)
            # Pattern: >  zh_text  {something}  <  or  >  {something}  zh_text  <
            pat = r'(>)([^<>{}]*?)(' + escaped + r')([^<>{}]*?\{[^}]*\}[^<>{}]*?)(<)'
            def make_replacer(k, fn_name):
                def replacer(m):
                    pre = m.group(2)
                    mid = m.group(3)
                    post = m.group(4)
                    vars_found = re.findall(r'\{([^}]+)\}', pre + post)
                    if vars_found:
                        vars_str = ', '.join([f"'{v}': {v}" for v in vars_found])
                        return f"{{{fn_name}('{k}', {{{vars_str}}})}}"
                    return f"{{{fn_name}('{k}')}}"
                return replacer
            new_line = re.sub(pat, make_replacer(key, fn), new_line)
        
        if new_line != line:
            replacements += 1
        
        new_lines.append(new_line)
    
    new_content = '\n'.join(new_lines)
    
    if not dry_run:
        with open(full_path, 'w') as f:
            f.write(new_content)
    
    if new_content != original:
        print(f"  OK: {file_path} ({replacements} replacements)")
        return {k: v for k, v in KEY_MAP.items() if k in original}, replacements
    else:
        print(f"  NO CHANGE: {file_path}")
        return {}, 0

def update_locales(all_keys, dry_run=False):
    if not all_keys:
        return 0
    
    with open(ZH_PATH) as f:
        zh = json.load(f)
    with open(EN_PATH) as f:
        en = json.load(f)
    
    new_count = 0
    for zh_text, key_path in all_keys.items():
        if key_path not in zh:  # Skip if already exists (flat key)
            # Check if this path already exists
            parts = key_path.split('.')
            
            # Build nested structure
            d_zh = zh
            d_en = en
            skip = False
            
            for part in parts[:-1]:
                if part not in d_zh:
                    d_zh[part] = {}
                    d_en[part] = {}
                elif not isinstance(d_zh[part], dict):
                    # Conflict: existing flat key at this level
                    # Convert to nested if possible, or skip
                    skip = True
                    break
                d_zh = d_zh[part]
                d_en = d_en[part]
            
            if skip:
                continue
            
            if parts[-1] not in d_zh:
                d_zh[parts[-1]] = zh_text
                new_count += 1
            
            if parts[-1] not in d_en:
                d_en[parts[-1]] = zh_text  # Placeholder - needs English translation
    
    if not dry_run:
        with open(ZH_PATH, 'w') as f:
            json.dump(zh, f, ensure_ascii=False, indent=2)
        with open(EN_PATH, 'w') as f:
            json.dump(en, f, ensure_ascii=False, indent=2)
    
    return new_count

def main():
    dry_run = '--dry-run' in sys.argv
    
    print("=" * 60)
    print("i18n Transformation - Final Version")
    print(f"Dry run: {dry_run}")
    print(f"Total mappings: {len(KEY_MAP)}")
    print("=" * 60)
    
    total_files = 0
    total_repl = 0
    all_keys = {}
    
    for fp in ALL_FILES:
        module = fp.split('/')[1]  # scm, lims, or wms
        keys, repl = transform_file(fp, module, dry_run)
        if keys:
            all_keys.update(keys)
            total_repl += repl
            total_files += 1
    
    if all_keys:
        new_keys = update_locales(all_keys, dry_run)
        print(f"\n--- Locale Files ---")
        print(f"  New keys to add: {new_keys}")
    
    print("\n" + "=" * 60)
    print(f"SUMMARY:")
    print(f"  Files processed: {total_files}")
    print(f"  Total replacements: {total_repl}")
    print(f"  Unique i18n keys: {len(all_keys)}")
    print("=" * 60)

if __name__ == '__main__':
    main()
