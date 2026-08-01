#!/usr/bin/env python3
"""
i18n transformation script v3 - Precise handling of module vs component scope.
"""
import os, re, json, sys
from collections import OrderedDict

BASE = "/Users/air/TOPEMS/apps/web/src"
ZH_PATH = f"{BASE}/i18n/locales/zh.json"
EN_PATH = f"{BASE}/i18n/locales/en.json"

SCM_FILES = [
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
]

LIMS_FILES = [
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
]

WMS_FILES = [
    "pages/wms/SupplierDetailPage.tsx",
    "pages/wms/OutboundOrderPage.tsx",
    "pages/wms/BatchManagementPage.tsx",
]

CJK = re.compile(r'[\u4e00-\u9fff]+')

def file_label(fp):
    b = os.path.basename(fp).replace('.tsx', '')
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', b)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def has_hook(content):
    return 'useTranslation' in content

def is_comment_line(line):
    s = line.strip()
    return s.startswith('//') or s.startswith('*')

# Key mapping: Chinese text -> i18n key
# Sorted by length (longest first) to avoid partial matches
KEY_MAP = OrderedDict()

# We'll populate this from a mapping file
# Format: {chinese_text: key_path}

def load_key_mappings():
    """Load or generate key mappings."""
    global KEY_MAP
    
    # Comprehensive mappings
    mappings = [
        # SupplierAdmissionPage
        ('供应商准入已提交审核', 'scm.supplier_admission.admission_submitted'),
        ('提交供应商准入失败', 'scm.supplier_admission.submit_failed'),
        ('供应商准入已通过', 'scm.supplier_admission.admission_approved'),
        ('通过供应商准入失败', 'scm.supplier_admission.approve_failed'),
        ('供应商准入已拒绝', 'scm.supplier_admission.admission_rejected'),
        ('拒绝供应商准入失败', 'scm.supplier_admission.reject_failed'),
        ('供应商已正式准入', 'scm.supplier_admission.supplier_admitted'),
        ('供应商准入失败', 'scm.supplier_admission.admission_failed'),
        ('供应商准入已提交', 'scm.supplier_admission.admission_submitted_short'),
        ('确定要提交供应商准入', 'scm.supplier_admission.confirm_submit'),
        ('确定要通过供应商准入', 'scm.supplier_admission.confirm_approve'),
        ('确认提交', 'scm.supplier_admission.confirm_submit_title'),
        ('确认通过', 'scm.supplier_admission.confirm_approve_title'),
        ('提交成功', 'scm.common.submit_success'),
        ('提交失败', 'scm.common.submit_failed'),
        ('已通过', 'scm.common.approved'),
        ('已拒绝', 'scm.common.rejected'),
        ('操作失败', 'scm.common.operation_failed'),
        ('操作成功', 'scm.common.operation_success'),
        ('准入成功', 'scm.supplier_admission.admission_success'),
        ('准入失败', 'scm.supplier_admission.admission_failed_title'),
        ('提交', 'scm.common.action_submit'),
        ('通过', 'scm.common.action_approve'),
        ('审批通过', 'scm.delivery_appointment.approve'),
        ('确定要审批通过预约', 'scm.delivery_appointment.confirm_approve'),
        ('确定要驳回预约', 'scm.delivery_appointment.confirm_reject'),
        ('预约已审批通过', 'scm.delivery_appointment.appointment_approved'),
        ('审批', 'scm.delivery_appointment.approve_action'),
        ('驳回', 'scm.delivery_appointment.reject_action'),
        ('成功', 'scm.common.success'),
        ('失败', 'scm.common.failed'),
        ('已完成', 'scm.common.completed'),
        # Overview page
        ('供应商评级分布', 'scm.overview.supplier_rating_distribution'),
        ('MRP建议状态', 'scm.overview.mrp_suggestion_status'),
        ('向供应商A采购原材料', 'scm.overview.purchase_from_supplier_a'),
        ('综合评分: A (95分)', 'scm.overview.overall_score'),
        ('7月生产物料需求计划', 'scm.overview.july_material_plan'),
        ('设备配件采购', 'scm.overview.equipment_purchase'),
        ('供应商C - 预计6月30日到货', 'scm.overview.supplier_c_eta'),
        ('供应商管理', 'scm.common.supplier_management'),
        ('采购订单', 'scm.common.purchase_order'),
        ('MRP计划', 'scm.common.mrp_plan'),
        ('供应商评估', 'scm.common.supplier_evaluation'),
        ('送货预约', 'scm.common.delivery_appointment'),
        ('待审批', 'scm.common.pending_approval'),
        ('已生成', 'scm.common.generated'),
        ('已入库', 'scm.common.stocked'),
        ('供应商B年度评审', 'scm.overview.supplier_b_review'),
        ('供应链管理', 'scm.common.supply_chain_management'),
        ('最近动态', 'scm.overview.recent_activity'),
        ('快捷操作', 'scm.common.quick_actions'),
        ('供应链', 'scm.common.supply_chain'),
        ('首页', 'scm.common.home'),
        # Dashboard
        ('本月采购额', 'scm.dashboard.monthly_purchase'),
        ('供应商采购量', 'scm.dashboard.supplier_purchase_volume'),
        ('每周采购趋势', 'scm.dashboard.weekly_purchase_trend'),
        ('采购类型分布', 'scm.dashboard.purchase_type_distribution'),
        ('新增供应商', 'scm.dashboard.new_supplier'),
        ('今日', 'scm.dashboard.today'),
        ('较上月', 'scm.dashboard.vs_last_month'),
        ('变更', 'scm.dashboard.change'),
        # Delivery appointment
        ('预约总数', 'scm.delivery_appointment.total_appointments'),
        ('即将到期', 'scm.delivery_appointment.upcoming'),
        ('已逾期', 'scm.delivery_appointment.overdue'),
        # Inventory turnover
        ('库存周转数据为只读，不支持创建', 'scm.inventory_turnover.readonly_no_create'),
        ('库存周转数据为只读，不支持编辑', 'scm.inventory_turnover.readonly_no_edit'),
        ('库存周转数据为只读，不支持删除', 'scm.inventory_turnover.readonly_no_delete'),
        ('库存周转报表导出中...', 'scm.inventory_turnover.exporting'),
        ('正在加载周转趋势分析...', 'scm.inventory_turnover.loading_trend'),
        ('导出报表', 'scm.inventory_turnover.export_report'),
        ('趋势分析', 'scm.inventory_turnover.trend_analysis'),
        ('导出', 'scm.inventory_turnover.export'),
        ('趋势', 'scm.inventory_turnover.trend'),
        ('库存周转分析', 'scm.inventory_turnover.inventory_turnover_analysis'),
        ('库存周转', 'scm.inventory_turnover.inventory_turnover'),
        # MrpPlan
        ('MRP运算已完成', 'scm.mrp.mrp_calc_complete'),
        ('MRP运算执行失败', 'scm.mrp.mrp_calc_failed'),
        ('运算完成', 'scm.mrp.calc_complete'),
        ('运算失败', 'scm.mrp.calc_failed'),
        ('生产建议', 'scm.mrp.production_suggestions'),
        ('采购建议', 'scm.mrp.purchase_suggestions'),
        ('总建议数', 'scm.mrp.total_suggestions'),
        ('总物料项', 'scm.mrp.total_material_items'),
        ('MRP运算结果', 'scm.mrp.mrp_result'),
        ('查看建议详情', 'scm.mrp.view_suggestion_detail'),
        ('关闭', 'scm.common.action_close'),
        # Purchase item
        ('加载采购明细失败', 'scm.purchase_item.load_failed'),
        ('创建采购明细失败', 'scm.purchase_item.create_failed'),
        ('更新采购明细失败', 'scm.purchase_item.update_failed'),
        ('采购明细暂不支持删除', 'scm.purchase_item.delete_not_supported'),
        ('采购明细管理', 'scm.purchase_item.management'),
        # Simple titles / breadcrumbs
        ('询价比价', 'scm.price_comparison.title'),
        ('采购合同评审', 'scm.purchase_contract_review.title'),
        ('采购合同', 'scm.purchase_contract.title'),
        ('采购申请', 'scm.purchase_requisition.title'),
        ('供应商管理', 'scm.supplier.title'),
        ('采购订单', 'scm.purchase_order.title'),
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
        ('删除', 'lims.common.delete'),
        ('查看详情', 'lims.common.view_detail'),
        ('重新解析', 'lims.common.reparse'),
        ('编辑', 'lims.common.edit'),
        ('今日采集', 'lims.statistics.today_collection'),
        ('数据总条数', 'lims.statistics.total_data'),
        ('解析规则', 'lims.statistics.parse_rules'),
        ('采集任务', 'lims.statistics.collection_tasks'),
        ('搜索...', 'lims.common.search'),
        ('状态', 'lims.common.status'),
        # Additional LIMS
        ('失败', 'lims.common.failed'),
        ('成功', 'lims.common.success'),
        ('已完成', 'lims.common.completed'),
        ('运行中', 'lims.common.running'),
        ('已停止', 'lims.common.stopped'),
        ('启用', 'lims.common.enabled'),
        ('禁用', 'lims.common.disabled'),
        ('待解析', 'lims.common.pending_parse'),
        ('全部', 'lims.common.all'),
        ('输入数据', 'lims.common.input_data'),
        ('仪器数据', 'lims.common.instrument_data'),
        ('原始数据', 'lims.common.raw_data'),
        ('解析测试', 'lims.parse_test.title'),
        ('解析', 'lims.parse_test.parse'),
        ('测试结果', 'lims.parse_test.result'),
        ('规则', 'lims.common.rule'),
        # WMS
        ('可用', 'wms.batch.available'),
        ('剩余', 'wms.batch.remaining'),
        # More SCM common
        ('供应商', 'scm.common.supplier'),
        ('创建', 'scm.common.create'),
        ('加载', 'scm.common.load'),
    ]
    
    # Sort by length descending
    mappings.sort(key=lambda x: len(x[0]), reverse=True)
    
    for zh, key in mappings:
        KEY_MAP[zh] = key
    
    return KEY_MAP

def get_key(text, page_prefix):
    """Find key for Chinese text."""
    # Exact match
    if text in KEY_MAP:
        return KEY_MAP[text]
    
    # Contains match (longest first already sorted)
    for zh, key in KEY_MAP.items():
        if zh in text:
            return key
    
    # Generate fallback key
    safe = re.sub(r'[^\w]', '_', text)[:30]
    fallback = f"{page_prefix}_{safe}"
    if fallback not in KEY_MAP.values():
        KEY_MAP[text] = fallback
    return fallback

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
    
    # Step 0: Collect all Chinese text and their positions
    # We work line by line to track scope
    
    lines = content.split('\n')
    result_lines = list(lines)
    
    # Track which lines are inside a React component (where t is available)
    # Strategy: find the main component function and mark its body
    component_start_line = -1
    component_end_line = -1
    
    for i, line in enumerate(lines):
        # Find component definition
        if re.match(r'\s*(const\s+\w+.*=\s*\(\)\s*=>\s*\{|export\s+default\s+function\s+\w+|function\s+\w+\s*\()', line):
            component_start_line = i
            # Find matching closing brace
            depth = 0
            found_open = False
            for j in range(i, len(lines)):
                for ch in lines[j]:
                    if ch == '{':
                        depth += 1
                        found_open = True
                    elif ch == '}':
                        depth -= 1
                if found_open and depth == 0:
                    component_end_line = j
                    break
            break
    
    # If no component found, check for arrow functions with hooks
    if component_start_line == -1:
        for i, line in enumerate(lines):
            if 'useTranslation()' in line or 'const { t }' in line:
                component_start_line = max(0, i - 5)
                component_end_line = len(lines) - 1
                break
    
    # Step 1: Add imports if needed
    if not had_hook:
        import_line = "import { useTranslation } from 'react-i18next';"
        i18n_import = "import i18n from '@/i18n';"
        
        # Find last import line
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        
        lines.insert(last_import_idx + 1, import_line)
        lines.insert(last_import_idx + 2, i18n_import)
        result_lines = list(lines)
    
    # Step 2: Add hook call if needed
    if not had_hook and component_start_line >= 0:
        hook_line = "  const { t } = useTranslation();"
        # Insert after the component opening brace
        for i in range(component_start_line + 1, min(component_start_line + 5, len(result_lines))):
            if '{' in result_lines[i - 1] or i == component_start_line + 1:
                result_lines.insert(i, hook_line)
                # Adjust component_end_line
                component_end_line += 1
                break
    
    # Now work with result_lines
    # Step 3: Replace Chinese text line by line
    new_lines = []
    replacements = 0
    
    for i, line in enumerate(result_lines):
        # Skip comments
        if is_comment_line(line):
            new_lines.append(line)
            continue
        
        # Skip import lines
        if line.strip().startswith('import '):
            new_lines.append(line)
            continue
        
        # Determine scope
        in_component = (component_start_line >= 0 and i >= component_start_line and i <= component_end_line)
        
        # Find and replace Chinese text in strings
        new_line = line
        
        # Process string literals: '中文' or "中文" or `中文`
        for zh_text, key in sorted(KEY_MAP.items(), key=lambda x: -len(x[0])):
            if zh_text not in new_line:
                continue
            
            escaped = re.escape(zh_text)
            
            # For string literals: 'xxx' -> t('key') or i18n.t('key')
            # But only if the string is exactly the Chinese text or contains it
            for quote in ["'", '"']:
                pattern = re.compile(quote + '(' + escaped + ')' + quote)
                if in_component:
                    new_line = pattern.sub(f"t('{key}')", new_line)
                else:
                    new_line = pattern.sub(f"i18n.t('{key}')", new_line)
            
            # Template literals: `xxx` -> t('key') or i18n.t('key')
            pattern_t = re.compile(r'`(' + escaped + r')`')
            if in_component:
                new_line = pattern_t.sub(f"t('{key}')", new_line)
            else:
                new_line = pattern_t.sub(f"i18n.t('{key}')", new_line)
        
        # Process JSX text nodes: > 中文  < -> >{t('key')}<
        for zh_text, key in sorted(KEY_MAP.items(), key=lambda x: -len(x[0])):
            if zh_text not in new_line:
                continue
            escaped = re.escape(zh_text)
            # Pattern: > whitespace 中文 whitespace <
            pattern = r'(>)\s*(' + escaped + r')\s*(<)'
            if in_component:
                new_line = re.sub(pattern, rf'\1{{t(\'{key}\')}}\3', new_line)
            else:
                new_line = re.sub(pattern, rf'\1{{i18n.t(\'{key}\')}}\3', new_line)
        
        if new_line != line:
            replacements += 1
        
        new_lines.append(new_line)
    
    new_content = '\n'.join(new_lines)
    
    if not dry_run and new_content != original:
        with open(full_path, 'w') as f:
            f.write(new_content)
        print(f"  OK: {file_path} ({replacements} replacements)")
        return {k: v for k, v in KEY_MAP.items() if k in content}, replacements
    elif new_content == original:
        print(f"  NO CHANGE: {file_path}")
        return {}, 0
    else:
        print(f"  [DRY RUN] {file_path} ({replacements} replacements)")
        return {}, 0

def process_module(files, module, dry_run=False):
    all_keys = {}
    total_repl = 0
    processed = 0
    
    for fp in files:
        keys, repl = transform_file(fp, module, dry_run)
        if keys:
            all_keys.update(keys)
            total_repl += repl
            processed += 1
    
    return all_keys, total_repl, processed

def update_locales(all_keys, dry_run=False):
    if not all_keys:
        return 0
    
    with open(ZH_PATH) as f:
        zh = json.load(f)
    with open(EN_PATH) as f:
        en = json.load(f)
    
    new_count = 0
    for zh_text, key_path in all_keys.items():
        parts = key_path.split('.')
        
        d = zh
        for part in parts[:-1]:
            if part not in d:
                d[part] = {}
            d = d[part]
        if parts[-1] not in d:
            d[parts[-1]] = zh_text
            new_count += 1
        
        d_en = en
        for part in parts[:-1]:
            if part not in d_en:
                d_en[part] = {}
            d_en = d_en[part]
        if parts[-1] not in d_en:
            d_en[parts[-1]] = zh_text
    
    if not dry_run:
        with open(ZH_PATH, 'w') as f:
            json.dump(zh, f, ensure_ascii=False, indent=2)
        with open(EN_PATH, 'w') as f:
            json.dump(en, f, ensure_ascii=False, indent=2)
    
    return new_count

def main():
    dry_run = '--dry-run' in sys.argv
    load_key_mappings()
    
    print("=" * 60)
    print("i18n Transformation Script v3")
    print(f"Dry run: {dry_run}")
    print("=" * 60)
    
    total_files = 0
    total_repl = 0
    
    print("\n--- SCM Module ---")
    scm_keys, scm_repl, scm_files = process_module(SCM_FILES, 'scm', dry_run)
    total_files += scm_files
    total_repl += scm_repl
    
    print("\n--- LIMS Module ---")
    lims_keys, lims_repl, lims_files = process_module(LIMS_FILES, 'lims', dry_run)
    total_files += lims_files
    total_repl += lims_repl
    
    print("\n--- WMS Module ---")
    wms_keys, wms_repl, wms_files = process_module(WMS_FILES, 'wms', dry_run)
    total_files += wms_files
    total_repl += wms_repl
    
    all_keys = {}
    all_keys.update(scm_keys)
    all_keys.update(lims_keys)
    all_keys.update(wms_keys)
    
    if all_keys:
        new_keys = update_locales(all_keys, dry_run)
        print(f"\n--- Locale Files ---")
        print(f"  New keys: {new_keys}")
    
    print("\n" + "=" * 60)
    print(f"SUMMARY:")
    print(f"  Files processed: {total_files}")
    print(f"  Total replacements: {total_repl}")
    print(f"  Unique i18n keys: {len(all_keys)}")
    print("=" * 60)

if __name__ == '__main__':
    main()
