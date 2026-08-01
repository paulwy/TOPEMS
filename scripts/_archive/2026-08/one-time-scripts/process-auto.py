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

def find_chinese_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    chinese_strings = re.findall(r"'([^']*[\u4e00-\u9fa5][^']*)'", content)
    return sorted(set(chinese_strings))

def collect_existing_translations(module, file_name):
    existing = set()
    schema = zh.get('schema', {}).get(module, {}).get(file_name, {})
    for key, val in schema.items():
        if isinstance(val, str) and has_chinese(val):
            existing.add(val)
    return existing

def build_mappings(module, file_name, chinese_strings, existing):
    """Build key mappings for Chinese strings not already translated."""
    mappings = {}
    prefix = f"{module}_{file_name}"
    
    for s in chinese_strings:
        if s in existing:
            continue
        
        # Generate a key based on context
        key = generate_key(s, prefix)
        mappings[key] = s
    
    return mappings

def generate_key(chinese_text, prefix):
    """Generate a semantic key from Chinese text."""
    # Map common Chinese words to English
    word_map = {
        '供应商': 'supplier', '名称': 'name', '编码': 'code', '状态': 'status',
        '类型': 'type', '描述': 'description', '备注': 'remark', '金额': 'amount',
        '日期': 'date', '创建': 'create', '更新': 'update', '时间': 'time',
        '编号': 'no', '标题': 'title', '内容': 'content', '数量': 'quantity',
        '价格': 'price', '单位': 'unit', '分类': 'category', '等级': 'level',
        '选项': 'option', '标签': 'label', '选项': 'option', '基本': 'basic',
        '信息': 'info', '详情': 'detail', '编辑': 'edit', '新增': 'create',
        '查看': 'view', '管理': 'manage', '草稿': 'draft', '提交': 'submit',
        '完成': 'complete', '取消': 'cancel', '删除': 'delete', '保存': 'save',
        '搜索': 'search', '筛选': 'filter', '排序': 'sort', '导出': 'export',
        '导入': 'import', '打印': 'print', '预览': 'preview', '关闭': 'close',
        '确定': 'confirm', '应用': 'apply', '重置': 'reset', '返回': 'back',
        '页面': 'page', '列表': 'list', '表单': 'form', '表格': 'table',
        '操作': 'action', '按钮': 'button', '提示': 'message', '错误': 'error',
        '成功': 'success', '警告': 'warning', '危险': 'danger', '信息': 'info',
        '有效': 'valid', '无效': 'invalid', '启用': 'enable', '禁用': 'disable',
        '显示': 'display', '隐藏': 'hide', '所有': 'all', '无': 'none',
        '是': 'yes', '否': 'no', '确认': 'confirm', '拒绝': 'reject',
    }
    
    # Build key incrementally
    key_parts = []
    for cn, en in word_map.items():
        if cn in chinese_text:
            key_parts.append(en)
    
    if not key_parts:
        # Fallback: use pinyin-like approach with index
        import hashlib
        h = hashlib.md5(chinese_text.encode()).hexdigest()[:6]
        return f"key_{h}"
    
    # Add context prefix
    context = detect_context(chinese_text)
    if context:
        return f"{context}_{'_'.join(key_parts)}"
    return '_'.join(key_parts)

def detect_context(chinese_text):
    """Detect the context of a Chinese string in schema."""
    context_indicators = [
        ('label_', 'label'),
        ('option_', 'option'),
        ('status_', 'status'),
        ('title', 'title'),
        ('description', 'description'),
        ('section_', 'section'),
        ('createTitle', 'create_title'),
        ('editTitle', 'edit_title'),
        ('detailTitle', 'detail_title'),
        ('tabLabel', 'tab_label'),
        ('placeholder', 'placeholder'),
        ('message', 'message'),
    ]
    return None  # Will be determined by caller


# ============================================================
# 更直接的方法：遍历剩余文件，为每个中文字符串生成映射
# ============================================================

def generate_smart_key(file_path, zh_text, all_zh_in_file):
    """Generate a unique key for a Chinese text based on its position in the schema."""
    # Common pattern detection
    patterns = {
        '单据编号': 'label_record_no',
        '记录号': 'label_record_no',
        '报价单号': 'label_quotation_no',
        '订单编号': 'label_order_no',
        '合同编号': 'label_contract_no',
        '询价单号': 'label_inquiry_no',
        '招标编号': 'label_bidding_no',
        '产品编码': 'label_product_code',
        '供应商编码': 'label_code',
        '供应商名称': 'label_name',
        '供应商ID': 'label_supplier_id',
        '供应商': 'label_supplier',
        '联系人': 'label_contact',
        '联系电话': 'label_phone',
        '电子邮箱': 'label_email',
        '地址': 'label_address',
        '税号': 'label_tax_number',
        '银行账户': 'label_bank_account',
        '分类': 'label_category',
        '状态': 'label_status',
        '类型': 'label_type',
        '描述': 'label_description',
        '备注': 'label_remark',
        '金额': 'label_amount',
        '日期': 'label_date',
        '编号': 'label_no',
        '名称': 'label_name',
        '创建时间': 'label_created_at',
        '更新时间': 'label_updated_at',
        '标题': 'label_title',
        '内容': 'label_content',
        '数量': 'label_quantity',
        '价格': 'label_price',
        '单价': 'label_unit_price',
        '单位': 'label_unit',
        '总额': 'label_total_amount',
        '子项': 'label_subtotal',
        '有效': 'status_active',
        '无效': 'status_inactive',
        '启用': 'status_enabled',
        '禁用': 'status_disabled',
        '草稿': 'status_draft',
        '待处理': 'status_pending',
        '处理中': 'status_processing',
        '已完成': 'status_completed',
        '已取消': 'status_cancelled',
        '已过期': 'status_expired',
        '已终止': 'status_terminated',
        '已提交': 'status_submitted',
        '已接受': 'status_accepted',
        '已拒绝': 'status_rejected',
        '已中标': 'status_awarded',
        '已发货': 'status_shipped',
        '已到货': 'status_delivered',
        '活跃': 'status_active',
        '不活跃': 'status_inactive',
        '停售': 'status_inactive',
        '在售': 'status_active',
        '待审核': 'status_pending',
        '执行中': 'status_effective',
        '基本信息': 'section_basic_info',
        '详细信息': 'section_detail',
        '更多信息': 'section_more',
        '联系信息': 'section_contact',
        '财务信息': 'section_finance',
        '付款条款': 'section_payment',
        '金额与日期': 'section_amount_and_date',
        '报价明细': 'section_items',
        '交付信息': 'section_delivery',
        '评级信息': 'section_rating',
        '合同信息': 'section_contract',
        '新增': 'create_title',
        '编辑': 'edit_title',
        '详情': 'detail_title',
        '管理': 'description',
    }
    
    # Check exact match
    if zh_text in patterns:
        return patterns[zh_text]
    
    # Check if it's a status-like label
    if '待' in zh_text or '已' in zh_text or zh_text in ['活跃', '不活跃', '有效', '无效', '启用', '禁用', '草稿']:
        return f"status_{zh_text}"
    
    # Generic fallback
    import hashlib
    h = hashlib.md5(zh_text.encode()).hexdigest()[:8]
    return f"auto_{h}"


# Process all files with remaining Chinese
TARGET_DIRS = ['srm', 'workflow', 'scm', 'ticket', 'report', 'crm', 'bi', 'admin', 'qms', 'monitor', 'pm']

total_files = 0
total_replacements = 0

for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        file_name = os.path.splitext(fn)[0]
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if not HAN_RE.search(content):
            continue
        
        chinese_strings = find_chinese_in_file(file_path)
        if not chinese_strings:
            continue
        
        existing = collect_existing_translations(d, file_name)
        
        mappings = {}
        for cs in chinese_strings:
            if cs not in existing and has_chinese(cs):
                key = generate_smart_key(file_path, cs, chinese_strings)
                # Ensure unique keys
                base_key = key
                counter = 1
                while key in mappings:
                    counter += 1
                    key = f"{base_key}_{counter}"
                mappings[key] = cs
        
        if not mappings:
            continue
        
        # Apply replacements
        ts_prefix = f"schema.{d}.{file_name}"
        for key, zh_text in sorted(mappings.items(), key=lambda x: -len(x[1])):
            if zh_text in content:
                replacement = f"i18n.t('{ts_prefix}.{key}')"
                content = content.replace(f"'{zh_text}'", replacement)
        
        # Add import
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
        
        # Update zh.json and en.json
        if d not in zh.get('schema', {}):
            zh.setdefault('schema', {})
            zh['schema'][d] = {}
        zh['schema'][d][file_name] = zh['schema'][d].get(file_name, {})
        
        if d not in en.get('schema', {}):
            en.setdefault('schema', {})
            en['schema'][d] = {}
        en['schema'][d][file_name] = en['schema'][d].get(file_name, {})
        
        for key, zh_text in mappings.items():
            zh['schema'][d][file_name][key] = zh_text
            en['schema'][d][file_name][key] = zh_text
        
        total_files += 1
        total_replacements += len(mappings)
        print(f"  OK: {d}/{file_name} ({len(mappings)} keys)")

# Write translation files
print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Processed {total_files} files, {total_replacements} replacements.')

# Show remaining Chinese
print('\nRemaining Chinese characters:')
for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        fp = os.path.join(dir_path, fn)
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        matches = re.findall(r'[\u4e00-\u9fa5]', content)
        if matches:
            print(f"  {d}/{fn}: {len(matches)} chars")
