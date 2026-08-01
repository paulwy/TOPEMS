import os
import json
import re

ROOT = '/Users/air/TOPEMS/apps/web/src'
ZH_PATH = os.path.join(ROOT, 'i18n', 'locales', 'zh.json')
EN_PATH = os.path.join(ROOT, 'i18n', 'locales', 'en.json')

with open(ZH_PATH, 'r', encoding='utf-8') as f:
    zh = json.load(f)
with open(EN_PATH, 'r', encoding='utf-8') as f:
    en = json.load(f)

HAN_RE = re.compile(r'[\u4e00-\u9fa5]')

def has_chinese(s):
    return bool(HAN_RE.search(s))

def process_file(file_path, translations_map):
    """Process a file with pre-defined translations map (file_key -> {key: zh_text})"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    dir_name = os.path.basename(os.path.dirname(file_path))
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    ts_prefix = f"schema.{dir_name}.{file_name}"

    file_key = f"{dir_name}/{file_name}"
    if file_key not in translations_map:
        return 0

    mappings = translations_map[file_key]

    if "import i18n from '@/i18n'" not in content:
        import_line = "import i18n from '@/i18n';\n"
        if content.startswith('import '):
            last_idx = content.rfind('import ')
            semi_idx = content.find(';\n', last_idx)
            if semi_idx != -1:
                content = content[:semi_idx + 2] + import_line + content[semi_idx + 2:]
            else:
                content = import_line + content
        else:
            content = import_line + content

    used_keys = set()

    for key, zh_text in mappings.items():
        if not has_chinese(zh_text):
            continue
        # Skip if the Chinese text is not actually in the file
        if zh_text not in content:
            continue
        used_keys.add(key)
        replacement = f"i18n.t('{ts_prefix}.{key}')"
        content = content.replace(f"'{zh_text}'", replacement)

    # Write updated file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    # Update zh.json and en.json
    if dir_name not in zh.get('schema', {}):
        if 'schema' not in zh:
            zh['schema'] = {}
        zh['schema'][dir_name] = {}
    if file_name not in zh['schema'][dir_name]:
        zh['schema'][dir_name][file_name] = {}

    if dir_name not in en.get('schema', {}):
        if 'schema' not in en:
            en['schema'] = {}
        en['schema'][dir_name] = {}
    if file_name not in en['schema'][dir_name]:
        en['schema'][dir_name][file_name] = {}

    for key in used_keys:
        zh_text = mappings[key]
        zh['schema'][dir_name][file_name][key] = zh_text
        en['schema'][dir_name][file_name][key] = zh_text

    return len(used_keys)


# ============================================
# TRANSLATIONS MAP - Add semantic mappings here
# ============================================

translations = {
    # SRM Module
    'srm/supplierProduct': {
        'title': '供应商产品',
        'description': '管理供应商提供的产品信息，包括产品编码、价格、分类、状态等',
        'create_title': '新增供应商产品',
        'edit_title': '编辑供应商产品',
        'detail_title': '供应商产品详情',
        'section_basic_info': '基本信息',
        'section_price_and_unit': '价格与单位',
        'section_status': '状态',
        'label_product_code': '产品编码',
        'label_name': '产品名称',
        'label_supplier': '供应商',
        'label_category': '分类',
        'label_price': '价格',
        'label_unit': '单位',
        'label_status': '状态',
        'label_created_at': '创建时间',
        'label_updated_at': '更新时间',
        'option_category_raw_material': '原材料',
        'option_category_component': '零部件',
        'option_category_equipment_part': '设备配件',
        'option_category_chemical': '化工原料',
        'option_category_electronic': '电子元器件',
        'option_category_packaging': '包装材料',
        'option_category_service': '服务类',
        'option_category_other': '其他',
        'option_status_active': '在售',
        'option_status_inactive': '停售',
        'option_status_pending': '待审核',
        'status_active': '在售',
        'status_inactive': '停售',
        'status_pending': '待审核',
    },
    'srm/quotation': {
        'title': '报价单管理',
        'description': '管理供应商报价单，包括报价明细、金额、交付时间等信息',
        'create_title': '新增报价单',
        'edit_title': '编辑报价单',
        'detail_title': '报价单详情',
        'section_basic_info': '基本信息',
        'section_amount_and_delivery': '金额与交付',
        'section_payment_and_remark': '付款与备注',
        'label_quotation_no': '报价单号',
        'label_supplier_id': '供应商',
        'label_title': '报价标题',
        'label_total_amount': '报价总额',
        'label_currency': '币种',
        'label_status': '状态',
        'label_valid_until': '有效期至',
        'label_delivery_time': '交付周期',
        'label_payment_terms': '付款条款',
        'label_remarks': '备注',
        'label_sku': '产品编码',
        'label_material_name': '物料名称',
        'label_specification': '规格型号',
        'label_quantity': '数量',
        'label_unit_price': '单价',
        'label_subtotal': '小计',
        'label_delivery_time_item': '交付时间',
        'label_items_title': '报价明细',
        'label_add_item': '新增明细行',
        'option_currency_cny': '人民币 (CNY)',
        'option_currency_usd': '美元 (USD)',
        'option_currency_eur': '欧元 (EUR)',
        'option_status_draft': '草稿',
        'option_status_submitted': '已提交',
        'option_status_accepted': '已接受',
        'option_status_rejected': '已拒绝',
        'option_status_awarded': '已中标',
        'status_draft': '草稿',
        'status_submitted': '已提交',
        'status_accepted': '已接受',
        'status_rejected': '已拒绝',
        'status_awarded': '已中标',
        'filter_option_all_status': '全部状态',
        'filter_option_all_currency': '全部币种',
        'filter_option_cny': '人民币',
        'filter_option_usd': '美元',
        'filter_option_eur': '欧元',
    },
}


# Process specific files
base = os.path.join(ROOT, 'schemas')
processed = 0
total = 0

for file_key, mappings in translations.items():
    file_path = os.path.join(base, f"{file_key}.ts")
    if os.path.exists(file_path):
        count = process_file(file_path, translations)
        if count > 0:
            processed += 1
            total += count
            print(f"  OK: {file_key}.ts ({count} keys)")

print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Processed {processed} files, {total} keys.')
