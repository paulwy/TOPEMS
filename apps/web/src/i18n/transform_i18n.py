#!/usr/bin/env python3
"""
i18n transformation script for SCM, LIMS, WMS modules.
v2: Handles template literals, JSX with expressions, etc.
"""
import os, re, json, sys

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

def file_label(file_path):
    basename = os.path.basename(file_path).replace('.tsx', '')
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', basename)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def has_hook(content):
    return 'useTranslation' in content

def is_comment_line(line):
    stripped = line.strip()
    return stripped.startswith('//') or stripped.startswith('*')

def extract_all_chinese(content):
    """Extract Chinese text with context from non-comment, non-import lines."""
    results = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if is_comment_line(line):
            continue
        if line.strip().startswith('import '):
            continue
        if not CJK.search(line):
            continue
        
        # Find string literals with Chinese
        for m in re.finditer(r"""(['"`])((?:(?!\1|\\).)*[\u4e00-\u9fff]+(?:(?!\1|\\).)*)\1""", line):
            text = m.group(2).strip()
            if text:
                results.append((i+1, 'string', text, m.start(), m.end()))
        
        # Find JSX text nodes with Chinese (between > and <, may contain expressions)
        for m in re.finditer(r'>([^<>{}]*[\u4e00-\u9fff]+[^<>{}]*)<', line):
            text = m.group(1).strip()
            if text:
                results.append((i+1, 'jsx_text', text, m.start(), m.end()))
    
    return results

# Translation mappings for known Chinese texts
# Ordered from longest to shortest to avoid partial matches
KEY_MAPPINGS = [
    # SupplierAdmissionPage
    ('确定要提交供应商准入', 'scm.supplier_admission_page.confirm_submit'),
    ('确定要通过供应商准入', 'scm.supplier_admission_page.confirm_approve'),
    ('供应商准入已提交审核', 'scm.supplier_admission_page.admission_submitted'),
    ('提交供应商准入失败', 'scm.supplier_admission_page.submit_failed'),
    ('供应商准入已通过', 'scm.supplier_admission_page.admission_approved'),
    ('通过供应商准入失败', 'scm.supplier_admission_page.approve_failed'),
    ('供应商准入已拒绝', 'scm.supplier_admission_page.admission_rejected'),
    ('拒绝供应商准入失败', 'scm.supplier_admission_page.reject_failed'),
    ('供应商已正式准入', 'scm.supplier_admission_page.supplier_admitted'),
    ('供应商准入失败', 'scm.supplier_admission_page.admission_failed'),
    ('确认提交', 'scm.supplier_admission_page.confirm_submit_title'),
    ('确认通过', 'scm.supplier_admission_page.confirm_approve_title'),
    ('提交成功', 'scm.supplier_admission_page.submit_success'),
    ('提交失败', 'scm.supplier_admission_page.submit_failed_title'),
    ('已通过', 'scm.supplier_admission_page.approved'),
    ('已拒绝', 'scm.supplier_admission_page.rejected'),
    ('操作失败', 'scm.supplier_admission_page.operation_failed'),
    ('操作成功', 'scm.supplier_admission_page.operation_success'),
    ('准入成功', 'scm.supplier_admission_page.admission_success'),
    ('准入失败', 'scm.supplier_admission_page.admission_failed_title'),
    ('提交', 'scm.supplier_admission_page.action_submit'),
    ('通过', 'scm.supplier_admission_page.action_approve'),
    # ScmOverviewPage
    ('供应商评级分布', 'scm.overview_page.supplier_rating_distribution'),
    ('MRP建议状态', 'scm.overview_page.mrp_suggestion_status'),
    ('向供应商A采购原材料', 'scm.overview_page.purchase_from_supplier_a'),
    ('综合评分: A (95分)', 'scm.overview_page.overall_score'),
    ('7月生产物料需求计划', 'scm.overview_page.july_material_plan'),
    ('设备配件采购', 'scm.overview_page.equipment_purchase'),
    ('供应商C - 预计6月30日到货', 'scm.overview_page.supplier_c_eta'),
    ('供应商管理', 'scm.overview_page.supplier_management'),
    ('采购订单', 'scm.overview_page.purchase_order'),
    ('MRP计划', 'scm.overview_page.mrp_plan'),
    ('供应商评估', 'scm.overview_page.supplier_evaluation'),
    ('送货预约', 'scm.overview_page.delivery_appointment'),
    ('待审批', 'scm.overview_page.pending_approval'),
    ('已生成', 'scm.overview_page.generated'),
    ('已入库', 'scm.overview_page.stocked'),
    ('供应商B年度评审', 'scm.overview_page.supplier_b_review'),
    ('供应链管理', 'scm.overview_page.supply_chain_management'),
    ('最近动态', 'scm.overview_page.recent_activity'),
    ('快捷操作', 'scm.overview_page.quick_actions'),
    ('供应链', 'scm.overview_page.supply_chain'),
    ('首页', 'scm.overview_page.home'),
    # DashboardPage
    ('本月采购额', 'scm.dashboard_page.monthly_purchase'),
    ('供应商采购量', 'scm.dashboard_page.supplier_purchase_volume'),
    ('每周采购趋势', 'scm.dashboard_page.weekly_purchase_trend'),
    ('采购类型分布', 'scm.dashboard_page.purchase_type_distribution'),
    ('新增供应商', 'scm.dashboard_page.new_supplier'),
    ('今日', 'scm.dashboard_page.today'),
    ('较上月', 'scm.dashboard_page.vs_last_month'),
    # ScmDeliveryAppointmentPage
    ('预约总数', 'scm.delivery_appointment_page.total_appointments'),
    ('即将到期', 'scm.delivery_appointment_page.upcoming'),
    ('已逾期', 'scm.delivery_appointment_page.overdue'),
    ('审批通过', 'scm.delivery_appointment_page.approve'),
    ('确定要审批通过预约', 'scm.delivery_appointment_page.confirm_approve'),
    ('确定要驳回预约', 'scm.delivery_appointment_page.confirm_reject'),
    ('预约已审批通过', 'scm.delivery_appointment_page.appointment_approved'),
    ('审批', 'scm.delivery_appointment_page.approve_action'),
    ('驳回', 'scm.delivery_appointment_page.reject_action'),
    ('成功', 'scm.delivery_appointment_page.success'),
    ('失败', 'scm.delivery_appointment_page.failed'),
    ('已完成', 'scm.delivery_appointment_page.completed'),
    # ScmInventoryTurnoverPage
    ('库存周转数据为只读，不支持创建', 'scm.inventory_turnover_page.readonly_no_create'),
    ('库存周转数据为只读，不支持编辑', 'scm.inventory_turnover_page.readonly_no_edit'),
    ('库存周转数据为只读，不支持删除', 'scm.inventory_turnover_page.readonly_no_delete'),
    ('库存周转报表导出中...', 'scm.inventory_turnover_page.exporting'),
    ('正在加载周转趋势分析...', 'scm.inventory_turnover_page.loading_trend'),
    ('导出报表', 'scm.inventory_turnover_page.export_report'),
    ('趋势分析', 'scm.inventory_turnover_page.trend_analysis'),
    ('导出', 'scm.inventory_turnover_page.export'),
    ('趋势', 'scm.inventory_turnover_page.trend'),
    ('库存周转分析', 'scm.inventory_turnover_page.inventory_turnover_analysis'),
    ('库存周转', 'scm.inventory_turnover_page.inventory_turnover'),
    # MrpPlanPage
    ('MRP运算已完成', 'scm.mrp_plan_page.mrp_calc_complete'),
    ('MRP运算执行失败', 'scm.mrp_plan_page.mrp_calc_failed'),
    ('运算完成', 'scm.mrp_plan_page.calc_complete'),
    ('运算失败', 'scm.mrp_plan_page.calc_failed'),
    ('生产建议', 'scm.mrp_plan_page.production_suggestions'),
    ('采购建议', 'scm.mrp_plan_page.purchase_suggestions'),
    ('总建议数', 'scm.mrp_plan_page.total_suggestions'),
    ('总物料项', 'scm.mrp_plan_page.total_material_items'),
    ('MRP运算结果', 'scm.mrp_plan_page.mrp_result'),
    ('查看建议详情', 'scm.mrp_plan_page.view_suggestion_detail'),
    ('关闭', 'scm.mrp_plan_page.action_close'),
    # ScmPurchaseItemPage
    ('加载采购明细失败', 'scm.purchase_item_page.load_failed'),
    ('创建采购明细失败', 'scm.purchase_item_page.create_failed'),
    ('更新采购明细失败', 'scm.purchase_item_page.update_failed'),
    ('采购明细暂不支持删除', 'scm.purchase_item_page.delete_not_supported'),
    ('采购明细管理', 'scm.purchase_item_page.purchase_item_management'),
    # Simple page titles / breadcrumbs
    ('询价比价', 'scm.price_comparison_page.title'),
    ('供应商评估', 'scm.evaluation_page.title'),
    ('采购订单', 'scm.purchase_order_page.title'),
    ('供应商管理', 'scm.supplier_page.title'),
    ('采购申请', 'scm.purchase_requisition_page.title'),
    ('采购合同', 'scm.purchase_contract_page.title'),
    ('采购合同评审', 'scm.purchase_contract_review_page.title'),
    ('供应链管理', 'scm.supply_chain_management_page.title'),
    # LIMS pages
    ('仪器管理', 'lims.instrument_page.title'),
    ('协议类型', 'lims.common.protocol_type'),
    ('开始解析', 'lims.parse_test_dialog.start_parse'),
    ('解析中...', 'lims.parse_test_dialog.parsing'),
    ('解析失败', 'lims.parse_test_dialog.parse_failed'),
    ('解析成功', 'lims.parse_test_dialog.parse_success'),
    ('质量分', 'lims.parse_test_dialog.quality_score'),
    ('仪器类型', 'lims.rule_form_dialog.instrument_type'),
    ('保存', 'lims.common.save'),
    ('保存中...', 'lims.common.saving'),
    ('描述', 'lims.common.description'),
    ('新建解析规则', 'lims.rule_form_dialog.new_rule'),
    ('编辑解析规则', 'lims.rule_form_dialog.edit_rule'),
    ('规则名称', 'lims.rule_form_dialog.rule_name'),
    ('Cron 表达式', 'lims.task_form_dialog.cron_expression'),
    ('任务名称', 'lims.task_form_dialog.task_name'),
    ('新建采集任务', 'lims.task_form_dialog.new_task'),
    ('编辑采集任务', 'lims.task_form_dialog.edit_task'),
    ('采集方式', 'lims.task_form_dialog.collection_method'),
    ('间隔时间（分钟）', 'lims.task_form_dialog.interval_minutes'),
    ('批次号', 'lims.common.batch_number'),
    ('新增数据', 'lims.data_form_dialog.add_data'),
    ('编辑数据', 'lims.data_form_dialog.edit_data'),
    ('删除', 'lims.common.delete'),
    ('查看详情', 'lims.common.view_detail'),
    ('重新解析', 'lims.common.reparse'),
    ('今日采集', 'lims.statistics_cards.today_collection'),
    ('数据总条数', 'lims.statistics_cards.total_data'),
    ('解析规则', 'lims.statistics_cards.parse_rules'),
    ('采集任务', 'lims.statistics_cards.collection_tasks'),
    ('搜索...', 'lims.toolbar.search'),
    ('状态', 'lims.common.status'),
    ('编辑', 'lims.common.edit'),
    ('失败', 'lims.common.failed'),
    ('成功', 'lims.common.success'),
    ('已完成', 'lims.common.completed'),
    ('可用', 'wms.batch_management.available'),
    ('剩余', 'wms.batch_management.remaining'),
]

# Build lookup dict
KEY_MAP = {}
for zh, key in KEY_MAPPINGS:
    KEY_MAP[zh] = key

def get_key(chinese_text, page_prefix):
    """Get i18n key for Chinese text. Returns None if not found."""
    # Exact match first
    if chinese_text in KEY_MAP:
        return KEY_MAP[chinese_text]
    
    # Try partial matches (longer first)
    for zh, key in KEY_MAPPINGS:
        if zh in chinese_text:
            return key
    
    # Generate a key from text
    safe = re.sub(r'[^\w\u4e00-\u9fff]', '_', chinese_text)[:40]
    return f"{page_prefix}_{safe}"

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
    
    # Extract all Chinese text occurrences
    chinese_occurrences = extract_all_chinese(content)
    
    if not chinese_occurrences:
        # WMS files may still have Chinese in JSX with expressions
        # Check for those
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if is_comment_line(line) or line.strip().startswith('import '):
                continue
            # Check for JSX Chinese with expressions: >text{...}text<
            for m in re.finditer(r'>([^<>{}]*[\u4e00-\u9fff]+.*?)<', line):
                text = m.group(1).strip()
                if text and CJK.search(text):
                    chinese_occurrences.append((i+1, 'jsx_mixed', text, m.start(), m.end()))
        
        if not chinese_occurrences:
            print(f"  SKIP (no Chinese): {file_path}")
            return {}, 0
    
    # Generate key mapping for each unique Chinese text
    unique_texts = set()
    for _, _, text, _, _ in chinese_occurrences:
        unique_texts.add(text)
    
    text_to_key = {}
    for text in unique_texts:
        key = get_key(text, page_prefix)
        text_to_key[text] = key
    
    replacement_count = 0
    
    # Step 1: Add import for useTranslation if needed
    if not had_hook:
        import_line = "import { useTranslation } from 'react-i18next';"
        i18n_import = "import i18n from '@/i18n';"
        
        lines = content.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        
        lines.insert(last_import_idx + 1, import_line)
        lines.insert(last_import_idx + 2, i18n_import)
        content = '\n'.join(lines)
    
    # Step 2: Add hook call if needed
    if not had_hook:
        hook_line = "  const { t } = useTranslation();"
        patterns = [
            (r'(const\s+\w+(?:\s*:\s*React\.FC)?\s*=\s*\(\)\s*=>\s*\{)', r'\1\n' + hook_line),
            (r'(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)', r'\1\n' + hook_line),
            (r'(function\s+\w+\s*\([^)]*\)\s*\{)', r'\1\n' + hook_line),
        ]
        for pat, repl in patterns:
            new_content, count = re.subn(pat, repl, content, count=1)
            if count > 0:
                content = new_content
                break
    
    # Step 3: Replace JSX text nodes
    for text, key in text_to_key.items():
        escaped = re.escape(text)
        # >text< or >  text  <
        pat = r'(>)\s*(' + escaped + r')\s*(<)'
        new_content, count = re.subn(pat, rf'\1{{t(\'{key}\')}}\3', content)
        if count > 0:
            content = new_content
            replacement_count += count
    
    # Step 4: Replace JSX text with expressions like >text {var}<
    for text, key in text_to_key.items():
        if '{' in text and '}' in text:
            continue  # Skip these for now, they're complex
        escaped = re.escape(text)
        # Pattern: >  text  {expr}  <  or  >  {expr}  text  <
        # Match > ... text ... {something} ... <
        pat = r'(>)([^<>{}]*?)(' + escaped + r')([^<>{}]*?\{[^}]*\}[^<>{}]*?)(<)'
        def replacer(m):
            pre = m.group(2)
            matched = m.group(3)
            post = m.group(4)
            # Extract variables from post
            vars = re.findall(r'\{([^}]+)\}', post)
            if vars:
                params = ', '.join([f"'{v}': {v}" for v in vars])
                return f"{{t('{key}', {{{params}}})}}"
            return f"{{t('{key}')}}"
        new_content, count = re.subn(pat, replacer, content)
        if count > 0:
            content = new_content
            replacement_count += count
    
    # Step 5: Replace string literals (longest first to avoid partial matches)
    sorted_texts = sorted(text_to_key.keys(), key=len, reverse=True)
    for text in sorted_texts:
        key = text_to_key[text]
        escaped = re.escape(text)
        
        # 'text' or "text" -> t('key')
        # But avoid replacing already-replaced t('...') or i18n.t('...')
        for quote in ["'", '"']:
            pat = re.compile(r'(?<![.\w])' + quote + '(' + escaped + r')' + quote)
            def replacer(m, k=key):
                return f"t('{k}')"
            new_content, count = pat.subn(replacer, content)
            if count > 0:
                content = new_content
                replacement_count += count
    
    # Step 6: Replace template literals with expressions
    for text, key in text_to_key.items():
        if '${' not in text:
            continue
        # Handle: `text ${var} text` -> t('key', {var})
        # This is complex, handle simple cases
        escaped = re.escape(text)
        pat = r'`(' + escaped + r')`'
        new_content, count = re.subn(pat, f"t('{key}')", content)
        if count > 0:
            content = new_content
            replacement_count += count
    
    # Step 7: Replace non-React contexts with i18n.t()
    # throw new Error('...')
    for text, key in text_to_key.items():
        escaped = re.escape(text)
        pat = r"(throw\s+new\s+Error\()('" + escaped + r"')"
        new_content, count = re.subn(pat, rf"\1i18n.t('{key}')", content)
        if count > 0:
            content = new_content
            replacement_count += count
        
        # || '...'  or  || "..."
        pat2 = r"(\|\|\s*)('" + escaped + r"')"
        new_content, count = re.subn(pat2, rf"\1i18n.t('{key}')", content)
        if count > 0:
            content = new_content
            replacement_count += count
    
    if not dry_run:
        with open(full_path, 'w') as f:
            f.write(content)
    
    if content != original:
        print(f"  OK: {file_path} ({replacement_count} replacements)")
    else:
        print(f"  NO CHANGE: {file_path}")
    
    return text_to_key, replacement_count

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
        
        # Update zh
        d = zh
        for part in parts[:-1]:
            if part not in d:
                d[part] = {}
            d = d[part]
        if parts[-1] not in d:
            d[parts[-1]] = zh_text
            new_count += 1
        
        # Update en
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
    print("=" * 60)
    print("i18n Transformation Script v2")
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
        print(f"  New keys to add: {new_keys}")
    
    print("\n" + "=" * 60)
    print(f"SUMMARY:")
    print(f"  Files processed: {total_files}")
    print(f"  Total t() replacements: {total_repl}")
    print(f"  New i18n keys: {len(all_keys)}")
    print("=" * 60)

if __name__ == '__main__':
    main()
