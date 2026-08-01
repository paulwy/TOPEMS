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
# 手动为各文件补充键映射（仅处理剩余中文的情况）
# ============================================================

MANUAL_FIXES = {}

def add_fix(module, file, fixes):
    key = f"{module}/{file}"
    if key not in MANUAL_FIXES:
        MANUAL_FIXES[key] = []
    MANUAL_FIXES[key].extend(fixes)

# SRM module - 针对每个文件的剩余中文补充
add_fix('srm', 'finance', [
    ('label_supplier', '供应商'),
])

# SRM module - 针对 supplier
add_fix('srm', 'supplier', [
    ('label_phone', '联系电话'),
    ('label_email', '电子邮箱'),
    ('label_address', '地址'),
    ('label_remark', '备注'),
    ('label_bank_account', '银行账户'),
    ('label_tax_number', '税号'),
    ('option_status_blacklisted', '黑名单'),
    ('label_tab_basic', '基本信息'),
    ('label_tab_finance', '财务信息'),
    ('label_tab_contract', '合同信息'),
    ('label_tab_rating', '评级信息'),
    ('section_basic_info', '基本信息'),
    ('section_contact', '联系信息'),
    ('section_finance', '财务信息'),
])

# 为所有 SRM 文件中的 colorMap/labelMap 提供通用修复
# 这些需要从中文键改为英文键

# ============================================================
# 主处理逻辑
# ============================================================

def process_file(file_path, manual_fixes=None):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    dir_name = os.path.basename(os.path.dirname(file_path))
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    ts_prefix = f"schema.{dir_name}.{file_name}"

    used_keys = set()
    replacements = []

    if manual_fixes:
        for key, zh_text in manual_fixes:
            if not has_chinese(zh_text):
                continue
            if zh_text in content:
                used_keys.add(key)
                replacements.append((zh_text, f"i18n.t('{ts_prefix}.{key}')"))

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

    # Update translations
    if dir_name not in zh.get('schema', {}):
        zh.setdefault('schema', {})
        zh['schema'][dir_name] = {}
    if file_name not in zh['schema'][dir_name]:
        zh['schema'][dir_name][file_name] = {}

    if dir_name not in en.get('schema', {}):
        en.setdefault('schema', {})
        en['schema'][dir_name] = {}
    if file_name not in en['schema'][dir_name]:
        en['schema'][dir_name][file_name] = {}

    if manual_fixes:
        for key, zh_text in manual_fixes:
            if key in used_keys:
                zh['schema'][dir_name][file_name][key] = zh_text
                en['schema'][dir_name][file_name][key] = zh_text

    return len(used_keys)


# Process files with manual fixes
total_keys = 0
for file_key, fixes in MANUAL_FIXES.items():
    dir_name, file_name = file_key.split('/')
    file_path = os.path.join(SCHEMAS_DIR, dir_name, f"{file_name}.ts")
    if os.path.exists(file_path):
        count = process_file(file_path, fixes)
        if count > 0:
            total_keys += count
            print(f"  OK: {file_key} ({count} new keys)")
        else:
            print(f"  SKIP: {file_key}")

# Write translation files
print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Added {total_keys} new keys.')

# Show remaining Chinese in target files
print('\nRemaining Chinese characters in target files:')
target_dirs = ['srm', 'workflow', 'scm', 'ticket', 'report', 'crm', 'bi', 'admin', 'qms', 'monitor', 'pm']
for d in target_dirs:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if os.path.exists(dir_path):
        chinese_count = 0
        chinese_files = []
        for fn in os.listdir(dir_path):
            if fn.endswith('.ts'):
                fp = os.path.join(dir_path, fn)
                with open(fp, 'r', encoding='utf-8') as f:
                    c = len(re.findall(r'[\u4e00-\u9fa5]', f.read()))
                if c > 0:
                    chinese_count += c
                    chinese_files.append(f"    {fn}: {c} chars")
        if chinese_count > 0:
            print(f"\n  {d}/: {chinese_count} chars in {len(chinese_files)} files")
            for cf in chinese_files:
                print(cf)
