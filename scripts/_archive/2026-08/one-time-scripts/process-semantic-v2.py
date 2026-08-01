import os
import json
import re

ROOT = '/Users/air/TOPEMS/apps/web/src'
SCHEMAS_DIR = os.path.join(ROOT, 'schemas')
ZH_PATH = os.path.join(ROOT, 'i18n', 'locales', 'zh.json')
EN_PATH = os.path.join(ROOT, 'i18n', 'locales', 'en.json')

HAN_RE = re.compile(r'[\u4e00-\u9fa5]')

with open(ZH_PATH, 'r', encoding='utf-8') as f:
    zh = json.load(f)
with open(EN_PATH, 'r', encoding='utf-8') as f:
    en = json.load(f)

def has_chinese(s):
    return bool(HAN_RE.search(s))

# ============================================================
# 语义翻译映射 - 每个文件的中文 -> {key, en}
# ============================================================

SEMANTIC_MAP = {}

def add_file(module, file, mappings):
    key = f"{module}/{file}"
    SEMANTIC_MAP[key] = mappings
    return mappings

# ============ SRM 模块 ============
add_file('srm', 'finance', {
    'title': ('title', 'SRM财务'),
    'description': ('description', '管理采购订单和供应商合同的财务视图'),
    'createTitle': ('create_title', '新增财务单据'),
    'editTitle': ('edit_title', '编辑财务单据'),
    'detailTitle': ('detail_title', '财务单据详情'),
    'label_record_no': ('label_record_no', '单据编号'),
    'label_type': ('label_type', '类型'),
    'label_supplier_name': ('label_supplier_name', '供应商名称'),
    'label_amount': ('label_amount', '金额'),
    'label_status': ('label_status', '状态'),
    'label_date': ('label_date', '日期'),
    'label_description': ('label_description', '备注'),
    'label_supplier_id': ('label_supplier_id', '供应商ID'),
    'option_type_order': ('option_type_order', '订单'),
    'option_type_contract': ('option_type_contract', '合同'),
    'status_pending': ('status_pending', '待处理'),
    'status_processing': ('status_processing', '处理中'),
    'status_delivered': ('status_delivered', '已交付'),
    'status_completed': ('status_completed', '已完成'),
    'status_active': ('status_active', '有效'),
    'status_cancelled': ('status_cancelled', '已取消'),
    'status_expired': ('status_expired', '已过期'),
    'status_draft': ('status_draft', '草稿'),
    'status_terminated': ('status_terminated', '已终止'),
    'section_basic_info': ('section_basic_info', '基本信息'),
    'section_amount_and_date': ('section_amount_and_date', '金额与日期'),
    'section_description': ('section_description', '备注'),
})

add_file('srm', 'supplier', {
    'title': ('title', '供应商管理'),
    'description': ('description', '管理供应商信息，包括基本信息、分类、状态、评级等'),
    'createTitle': ('create_title', '新增供应商'),
    'editTitle': ('edit_title', '编辑供应商'),
    'detailTitle': ('detail_title', '供应商详情'),
    'label_code': ('label_code', '供应商编码'),
    'label_name': ('label_name', '供应商名称'),
    'label_contact_person': ('label_contact_person', '联系人'),
    'label_phone': ('label_phone', '联系电话'),
    'label_email': ('label_email', '电子邮箱'),
    'label_address': ('label_address', '地址'),
    'label_category': ('label_category', '分类'),
    'label_status': ('label_status', '状态'),
    'label_rating': ('label_rating', '评级'),
    'label_created_at': ('label_created_at', '创建时间'),
    'label_updated_at': ('label_updated_at', '更新时间'),
    'label_remark': ('label_remark', '备注'),
    'label_bank_account': ('label_bank_account', '银行账户'),
    'label_tax_number': ('label_tax_number', '税号'),
    'option_category_raw_material': ('option_category_raw_material', '原材料供应商'),
    'option_category_service': ('option_category_service', '服务供应商'),
    'option_category_equipment': ('option_category_equipment', '设备供应商'),
    'option_category_packaging': ('option_category_packaging', '包装供应商'),
    'option_category_logistics': ('option_category_logistics', '物流供应商'),
    'option_category_other': ('option_category_other', '其他供应商'),
    'option_status_active': ('option_status_active', '活跃'),
    'option_status_inactive': ('option_status_inactive', '不活跃'),
    'option_status_pending': ('option_status_pending', '待审核'),
    'option_status_blacklisted': ('option_status_blacklisted', '黑名单'),
    'status_active': ('status_active', '活跃'),
    'status_inactive': ('status_inactive', '不活跃'),
    'status_pending': ('status_pending', '待审核'),
    'status_blacklisted': ('status_blacklisted', '黑名单'),
    'label_tab_basic': ('label_tab_basic', '基本信息'),
    'label_tab_finance': ('label_tab_finance', '财务信息'),
    'label_tab_contract': ('label_tab_contract', '合同信息'),
    'label_tab_rating': ('label_tab_rating', '评级信息'),
    'section_basic_info': ('section_basic_info', '基本信息'),
    'section_contact': ('section_contact', '联系信息'),
    'section_finance': ('section_finance', '财务信息'),
})

add_file('srm', 'supplierProduct', {
    'title': ('title', '供应商产品'),
    'description': ('description', '管理供应商提供的产品信息'),
    'createTitle': ('create_title', '新增供应商产品'),
    'editTitle': ('edit_title', '编辑供应商产品'),
    'detailTitle': ('detail_title', '供应商产品详情'),
    'label_product_code': ('label_product_code', '产品编码'),
    'label_name': ('label_name', '产品名称'),
    'label_supplier': ('label_supplier', '供应商'),
    'label_category': ('label_category', '分类'),
    'label_price': ('label_price', '价格'),
    'label_unit': ('label_unit', '单位'),
    'label_status': ('label_status', '状态'),
    'label_created_at': ('label_created_at', '创建时间'),
    'label_updated_at': ('label_updated_at', '更新时间'),
    'option_category_raw_material': ('option_category_raw_material', '原材料'),
    'option_category_component': ('option_category_component', '零部件'),
    'option_category_equipment_part': ('option_category_equipment_part', '设备配件'),
    'option_category_chemical': ('option_category_chemical', '化工原料'),
    'option_category_electronic': ('option_category_electronic', '电子元器件'),
    'option_category_packaging': ('option_category_packaging', '包装材料'),
    'option_category_service': ('option_category_service', '服务类'),
    'option_category_other': ('option_category_other', '其他'),
    'option_status_active': ('option_status_active', '在售'),
    'option_status_inactive': ('option_status_inactive', '停售'),
    'option_status_pending': ('option_status_pending', '待审核'),
    'status_active': ('status_active', '在售'),
    'status_inactive': ('status_inactive', '停售'),
    'status_pending': ('status_pending', '待审核'),
    'section_basic_info': ('section_basic_info', '基本信息'),
    'section_price': ('section_price', '价格信息'),
})

add_file('srm', 'quotation', {
    'title': ('title', '报价单管理'),
    'description': ('description', '管理供应商报价单'),
    'createTitle': ('create_title', '新增报价单'),
    'editTitle': ('edit_title', '编辑报价单'),
    'detailTitle': ('detail_title', '报价单详情'),
    'label_quotation_no': ('label_quotation_no', '报价单号'),
    'label_supplier_id': ('label_supplier_id', '供应商'),
    'label_title': ('label_title', '报价标题'),
    'label_total_amount': ('label_total_amount', '报价总额'),
    'label_currency': ('label_currency', '币种'),
    'label_status': ('label_status', '状态'),
    'label_valid_until': ('label_valid_until', '有效期至'),
    'label_delivery_time': ('label_delivery_time', '交付周期'),
    'label_payment_terms': ('label_payment_terms', '付款条款'),
    'label_remarks': ('label_remarks', '备注'),
    'option_currency_cny': ('option_currency_cny', '人民币'),
    'option_currency_usd': ('option_currency_usd', '美元'),
    'option_currency_eur': ('option_currency_eur', '欧元'),
    'option_status_draft': ('option_status_draft', '草稿'),
    'option_status_submitted': ('option_status_submitted', '已提交'),
    'option_status_accepted': ('option_status_accepted', '已接受'),
    'option_status_rejected': ('option_status_rejected', '已拒绝'),
    'option_status_awarded': ('option_status_awarded', '已中标'),
    'status_draft': ('status_draft', '草稿'),
    'status_submitted': ('status_submitted', '已提交'),
    'status_accepted': ('status_accepted', '已接受'),
    'status_rejected': ('status_rejected', '已拒绝'),
    'status_awarded': ('status_awarded', '已中标'),
    'section_basic_info': ('section_basic_info', '基本信息'),
    'section_amount': ('section_amount', '金额信息'),
    'section_delivery': ('section_delivery', '交付信息'),
    'section_payment': ('section_payment', '付款条款'),
})

add_file('srm', 'order', {
    'title': ('title', '供应商订单'),
    'description': ('description', '管理向供应商下达的采购订单'),
    'createTitle': ('create_title', '新增订单'),
    'editTitle': ('edit_title', '编辑订单'),
    'detailTitle': ('detail_title', '订单详情'),
    'label_order_no': ('label_order_no', '订单编号'),
    'label_supplier_id': ('label_supplier_id', '供应商'),
    'label_amount': ('label_amount', '订单金额'),
    'label_status': ('label_status', '状态'),
    'label_order_date': ('label_order_date', '下单日期'),
    'label_delivery_date': ('label_delivery_date', '交付日期'),
    'label_remark': ('label_remark', '备注'),
    'option_status_draft': ('option_status_draft', '草稿'),
    'option_status_confirmed': ('option_status_confirmed', '已确认'),
    'option_status_shipped': ('option_status_shipped', '已发货'),
    'option_status_delivered': ('option_status_delivered', '已到货'),
    'option_status_completed': ('option_status_completed', '已完成'),
    'option_status_cancelled': ('option_status_cancelled', '已取消'),
    'status_draft': ('status_draft', '草稿'),
    'status_confirmed': ('status_confirmed', '已确认'),
    'status_shipped': ('status_shipped', '已发货'),
    'status_delivered': ('status_delivered', '已到货'),
    'status_completed': ('status_completed', '已完成'),
    'status_cancelled': ('status_cancelled', '已取消'),
})

add_file('srm', 'contract', {
    'title': ('title', '供应商合同'),
    'description': ('description', '管理与供应商签订的各类合同'),
    'createTitle': ('create_title', '新增合同'),
    'editTitle': ('edit_title', '编辑合同'),
    'detailTitle': ('detail_title', '合同详情'),
    'label_contract_no': ('label_contract_no', '合同编号'),
    'label_supplier_id': ('label_supplier_id', '供应商'),
    'label_title': ('label_title', '合同标题'),
    'label_amount': ('label_amount', '合同金额'),
    'label_status': ('label_status', '状态'),
    'label_start_date': ('label_start_date', '开始日期'),
    'label_end_date': ('label_end_date', '结束日期'),
    'label_type': ('label_type', '合同类型'),
    'option_type_purchase': ('option_type_purchase', '采购合同'),
    'option_type_service': ('option_type_service', '服务合同'),
    'option_type_framework': ('option_type_framework', '框架合同'),
    'option_status_draft': ('option_status_draft', '草稿'),
    'option_status_effective': ('option_status_effective', '执行中'),
    'option_status_expired': ('option_status_expired', '已过期'),
    'option_status_terminated': ('option_status_terminated', '已终止'),
    'status_draft': ('status_draft', '草稿'),
    'status_effective': ('status_effective', '执行中'),
    'status_expired': ('status_expired', '已过期'),
    'status_terminated': ('status_terminated', '已终止'),
})

add_file('srm', 'evaluation', {
    'title': ('title', '供应商评估'),
    'description': ('description', '管理对供应商的绩效评估和评级'),
    'createTitle': ('create_title', '新增评估'),
    'editTitle': ('edit_title', '编辑评估'),
    'detailTitle': ('detail_title', '评估详情'),
    'label_supplier_id': ('label_supplier_id', '供应商'),
    'label_period': ('label_period', '评估周期'),
    'label_score': ('label_score', '综合评分'),
    'label_status': ('label_status', '状态'),
    'label_evaluator': ('label_evaluator', '评估人'),
    'label_created_at': ('label_created_at', '创建时间'),
    'label_updated_at': ('label_updated_at', '更新时间'),
    'label_comment': ('label_comment', '评估意见'),
    'option_status_draft': ('option_status_draft', '草稿'),
    'option_status_submitted': ('option_status_submitted', '已提交'),
    'option_status_approved': ('option_status_approved', '已审批'),
    'status_draft': ('status_draft', '草稿'),
    'status_submitted': ('status_submitted', '已提交'),
    'status_approved': ('status_approved', '已审批'),
})

add_file('srm', 'performance', {
    'title': ('title', '供应商绩效'),
    'description': ('description', '追踪供应商的交付、质量、服务等绩效指标'),
    'createTitle': ('create_title', '新增绩效记录'),
    'editTitle': ('edit_title', '编辑绩效记录'),
    'detailTitle': ('detail_title', '绩效详情'),
    'label_supplier_id': ('label_supplier_id', '供应商'),
    'label_period': ('label_period', '周期'),
    'label_delivery_score': ('label_delivery_score', '交付评分'),
    'label_quality_score': ('label_quality_score', '质量评分'),
    'label_service_score': ('label_service_score', '服务评分'),
    'label_overall_score': ('label_overall_score', '综合评分'),
    'label_status': ('label_status', '状态'),
})

add_file('srm', 'inquiry', {
    'title': ('title', '询价管理'),
    'description': ('description', '管理对供应商的询价单'),
    'createTitle': ('create_title', '新增询价单'),
    'editTitle': ('edit_title', '编辑询价单'),
    'detailTitle': ('detail_title', '询价单详情'),
    'label_inquiry_no': ('label_inquiry_no', '询价单号'),
    'label_supplier_id': ('label_supplier_id', '供应商'),
    'label_title': ('label_title', '询价标题'),
    'label_status': ('label_status', '状态'),
    'label_deadline': ('label_deadline', '截止日期'),
    'label_created_at': ('label_created_at', '创建时间'),
    'label_updated_at': ('label_updated_at', '更新时间'),
    'option_status_draft': ('option_status_draft', '草稿'),
    'option_status_sent': ('option_status_sent', '已发送'),
    'option_status_received': ('option_status_received', '已收到回复'),
    'option_status_closed': ('option_status_closed', '已关闭'),
    'status_draft': ('status_draft', '草稿'),
    'status_sent': ('status_sent', '已发送'),
    'status_received': ('status_received', '已收到回复'),
    'status_closed': ('status_closed', '已关闭'),
})

add_file('srm', 'scoringDimension', {
    'title': ('title', '评分维度'),
    'description': ('description', '管理供应商评分维度和权重'),
    'createTitle': ('create_title', '新增评分维度'),
    'editTitle': ('edit_title', '编辑评分维度'),
    'detailTitle': ('detail_title', '评分维度详情'),
    'label_name': ('label_name', '维度名称'),
    'label_code': ('label_code', '维度编码'),
    'label_weight': ('label_weight', '权重'),
    'label_description': ('label_description', '描述'),
    'label_status': ('label_status', '状态'),
    'option_status_active': ('option_status_active', '启用'),
    'option_status_inactive': ('option_status_inactive', '停用'),
    'status_active': ('status_active', '启用'),
    'status_inactive': ('status_inactive', '停用'),
})

add_file('srm', 'bidding', {
    'title': ('title', '招标管理'),
    'description': ('description', '管理项目招标流程，包括招标公告、投标、开标、评标等'),
    'createTitle': ('create_title', '新增招标'),
    'editTitle': ('edit_title', '编辑招标'),
    'detailTitle': ('detail_title', '招标详情'),
    'label_bidding_no': ('label_bidding_no', '招标编号'),
    'label_title': ('label_title', '招标标题'),
    'label_type': ('label_type', '招标类型'),
    'label_budget': ('label_budget', '预算金额'),
    'label_status': ('label_status', '状态'),
    'label_start_date': ('label_start_date', '招标开始日期'),
    'label_end_date': ('label_end_date', '招标截止日期'),
    'label_open_date': ('label_open_date', '开标日期'),
    'label_created_at': ('label_created_at', '创建时间'),
    'label_updated_at': ('label_updated_at', '更新时间'),
    'option_type_public': ('option_type_public', '公开招标'),
    'option_type_invited': ('option_type_invited', '邀请招标'),
    'option_type_inquiry': ('option_type_inquiry', '询价采购'),
    'option_type_single': ('option_type_single', '单一来源'),
    'option_status_draft': ('option_status_draft', '草稿'),
    'option_status_published': ('option_status_published', '已发布'),
    'option_status_bidding': ('option_status_bidding', '投标中'),
    'option_status_opened': ('option_status_opened', '已开标'),
    'option_status_evaluating': ('option_status_evaluating', '评标中'),
    'option_status_completed': ('option_status_completed', '已完成'),
    'option_status_cancelled': ('option_status_cancelled', '已取消'),
    'status_draft': ('status_draft', '草稿'),
    'status_published': ('status_published', '已发布'),
    'status_bidding': ('status_bidding', '投标中'),
    'status_opened': ('status_opened', '已开标'),
    'status_evaluating': ('status_evaluating', '评标中'),
    'status_completed': ('status_completed', '已完成'),
    'status_cancelled': ('status_cancelled', '已取消'),
})

add_file('srm', 'category', {
    'title': ('title', '供应商分类'),
    'description': ('description', '管理供应商分类体系'),
    'createTitle': ('create_title', '新增分类'),
    'editTitle': ('edit_title', '编辑分类'),
    'detailTitle': ('detail_title', '分类详情'),
    'label_code': ('label_code', '分类编码'),
    'label_name': ('label_name', '分类名称'),
    'label_parent': ('label_parent', '上级分类'),
    'label_level': ('label_level', '级别'),
    'label_description': ('label_description', '描述'),
    'label_status': ('label_status', '状态'),
    'label_sort_order': ('label_sort_order', '排序'),
    'option_status_active': ('option_status_active', '启用'),
    'option_status_inactive': ('option_status_inactive', '停用'),
    'status_active': ('status_active', '启用'),
    'status_inactive': ('status_inactive', '停用'),
})


# ============================================================
# Process files
# ============================================================

def process_file(file_path, mappings):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    dir_name = os.path.basename(os.path.dirname(file_path))
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    ts_prefix = f"schema.{dir_name}.{file_name}"

    used_keys = set()
    replacements = []

    for key, (_, zh_text) in mappings.items():
        if not has_chinese(zh_text):
            continue
        if zh_text in content:
            used_keys.add(key)
            replacements.append((zh_text, f"i18n.t('{ts_prefix}.{key}')"))

    # Apply replacements (longer strings first to avoid partial matches)
    replacements.sort(key=lambda x: -len(x[0]))
    for old, new in replacements:
        content = content.replace(f"'{old}'", new)

    # Add import if not present
    if "import i18n from '@/i18n'" not in content:
        import_line = "import i18n from '@/i18n';\n"
        last_import = content.rfind('import ')
        if last_import != -1:
            semi = content.find(';\n', last_import)
            if semi != -1:
                content = content[:semi + 2] + import_line + content[semi + 2:]
            else:
                content = import_line + content
        else:
            content = import_line + content

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return used_keys


def update_translations(dir_name, file_name, mappings, used_keys):
    if dir_name not in zh.get('schema', {}):
        zh.setdefault('schema', {})
        zh['schema'][dir_name] = {}
    zh['schema'][dir_name][file_name] = {}

    if dir_name not in en.get('schema', {}):
        en.setdefault('schema', {})
        en['schema'][dir_name] = {}
    en['schema'][dir_name][file_name] = {}

    for key in used_keys:
        if key in mappings:
            _, zh_text = mappings[key]
            zh['schema'][dir_name][file_name][key] = zh_text
            en['schema'][dir_name][file_name][key] = zh_text


# Process all
total_files = 0
total_keys = 0
for file_key, mappings in SEMANTIC_MAP.items():
    dir_name, file_name = file_key.split('/')
    file_path = os.path.join(SCHEMAS_DIR, dir_name, f"{file_name}.ts")
    if os.path.exists(file_path):
        used_keys = process_file(file_path, mappings)
        if used_keys:
            update_translations(dir_name, file_name, mappings, used_keys)
            total_files += 1
            total_keys += len(used_keys)
            print(f"  OK: {file_key} ({len(used_keys)} keys)")
        else:
            print(f"  SKIP (no Chinese found): {file_key}")
    else:
        print(f"  MISSING: {file_path}")

# Write translation files
print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Processed {total_files} files, {total_keys} keys.')
