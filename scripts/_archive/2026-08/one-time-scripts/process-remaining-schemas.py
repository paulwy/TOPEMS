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

os.makedirs(os.path.dirname(ZH_PATH), exist_ok=True)

def walk_schema_files(dir_path):
    result = []
    if not os.path.exists(dir_path):
        return result
    for item in os.listdir(dir_path):
        full_path = os.path.join(dir_path, item)
        if os.path.isdir(full_path):
            result.extend(walk_schema_files(full_path))
        elif item.endswith('.ts') and not item.endswith('.d.ts') and item != 'index.ts':
            result.append(full_path)
    return result

HAN_RE = re.compile(r'[\u4e00-\u9fa5]')

def has_chinese(s):
    return bool(HAN_RE.search(s))

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if not has_chinese(content):
        return 0

    dir_name = os.path.basename(os.path.dirname(file_path))
    file_name = os.path.splitext(os.path.basename(file_path))[0]

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

    new_keys = {}
    key_counter = [0]

    def gen_key(prefix):
        key_counter[0] += 1
        return f'{prefix}_{key_counter[0]}'

    ts_prefix = f"schema.{dir_name}.{file_name}"

    def replace_pattern(pattern, replacement_fn):
        nonlocal content
        def replacer(m):
            if 'i18n.t(' in m.group(0):
                return m.group(0)
            return replacement_fn(m)
        content = pattern.sub(replacer, content)

    # title: '中文' (not in nested object)
    replace_pattern(
        re.compile(r"(title:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (new_keys.update({'title': m.group(2)}), f"{m.group(1)}i18n.t('{ts_prefix}.title')")[1]
    )

    # description: '中文'
    replace_pattern(
        re.compile(r"(description:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (new_keys.update({'description': m.group(2)}), f"{m.group(1)}i18n.t('{ts_prefix}.description')")[1]
    )

    # createTitle, editTitle, detailTitle
    for prop in ['createTitle', 'editTitle', 'detailTitle']:
        prop_lower = re.sub(r'([A-Z])', r'_\1', prop).lower()
        replace_pattern(
            re.compile(rf"({prop}:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
            lambda m, p=prop_lower: (new_keys.update({p: m.group(2)}), f"{m.group(1)}i18n.t('{ts_prefix}.{p}')")[1]
        )

    # label: '中文'
    replace_pattern(
        re.compile(r"(label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (
            new_keys.update({f'label_{key_counter[0]+1}': m.group(2)}),
            f"{m.group(1)}i18n.t('{ts_prefix}.label_{key_counter[0]+1}')"
        )[1]
    )

    # placeholder: '中文'
    replace_pattern(
        re.compile(r"(placeholder:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (
            new_keys.update({f'placeholder_{key_counter[0]+1}': m.group(2)}),
            f"{m.group(1)}i18n.t('{ts_prefix}.placeholder_{key_counter[0]+1}')"
        )[1]
    )

    # message: '中文'
    replace_pattern(
        re.compile(r"(message:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (
            new_keys.update({f'message_{key_counter[0]+1}': m.group(2)}),
            f"{m.group(1)}i18n.t('{ts_prefix}.message_{key_counter[0]+1}')"
        )[1]
    )

    # addButtonText: '中文'
    replace_pattern(
        re.compile(r"(addButtonText:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (
            new_keys.update({f'add_button_text_{key_counter[0]+1}': m.group(2)}),
            f"{m.group(1)}i18n.t('{ts_prefix}.add_button_text_{key_counter[0]+1}')"
        )[1]
    )

    # tabLabel: '中文', statusLabel: '中文'
    for prop in ['tabLabel', 'statusLabel']:
        replace_pattern(
            re.compile(rf"({prop}:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
            lambda m, p=prop: (
                new_keys.update({f'{p.lower()}_{key_counter[0]+1}': m.group(2)}),
                f"{m.group(1)}i18n.t('{ts_prefix}.{p.lower()}_{key_counter[0]+1}')"
            )[1]
        )

    # option label: { value: 'xxx', label: '中文' } or just { label: '中文' }
    replace_pattern(
        re.compile(r"(\{\s*label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'(\s*\})"),
        lambda m: (
            new_keys.update({f'option_{key_counter[0]+1}': m.group(2)}),
            f"{m.group(1)}i18n.t('{ts_prefix}.option_{key_counter[0]+1}'){m.group(3)}"
        )[1]
    )

    # status map values like: pending: '待处理',
    replace_pattern(
        re.compile(r"((?:active|inactive|pending|draft|submitted|approved|rejected|cancelled|completed|paused|running|idle|maintenance|fault|passed|failed|rework|scrapped|scheduled|released|confirmed|issued|returned|obsolete|production|low|medium|high|urgent):\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (
            new_keys.update({f'status_{m.group(1).rstrip(": ")}': m.group(2)}),
            f"{m.group(1)}i18n.t('{ts_prefix}.status_{m.group(1).rstrip(': ')}')"
        )[1]
    )

    # filter label
    replace_pattern(
        re.compile(r"(filter_label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'"),
        lambda m: (
            new_keys.update({f'filter_label_{key_counter[0]+1}': m.group(2)}),
            f"{m.group(1)}i18n.t('{ts_prefix}.filter_label_{key_counter[0]+1}')"
        )[1]
    )

    # Section titles in formSections - title: '中文' pattern already handled above

    if not new_keys:
        return 0

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    if 'schema' not in zh:
        zh['schema'] = {}
    if dir_name not in zh['schema']:
        zh['schema'][dir_name] = {}
    if file_name not in zh['schema'][dir_name]:
        zh['schema'][dir_name][file_name] = {}

    if 'schema' not in en:
        en['schema'] = {}
    if dir_name not in en['schema']:
        en['schema'][dir_name] = {}
    if file_name not in en['schema'][dir_name]:
        en['schema'][dir_name][file_name] = {}

    for key, zh_val in new_keys.items():
        zh['schema'][dir_name][file_name][key] = zh_val
        en['schema'][dir_name][file_name][key] = zh_val

    return len(new_keys)


# Process all modules
schema_dirs = [
    os.path.join(ROOT, 'schemas', 'srm'),
    os.path.join(ROOT, 'schemas', 'workflow'),
    os.path.join(ROOT, 'schemas', 'scm'),
]

extra_files = [
    'schemas/ticket/ticket.ts',
    'schemas/report/report.ts',
    'schemas/crm/return.ts',
    'schemas/crm/recommendation.ts',
    'schemas/crm/opportunity.ts',
    'schemas/crm/interaction.ts',
    'schemas/crm/dashboardSchema.ts',
    'schemas/crm/customerSegmentation.ts',
    'schemas/crm/customerScoring.ts',
    'schemas/crm/customer.ts',
    'schemas/crm/contact.ts',
    'schemas/bi/report.ts',
    'schemas/bi/dataSource.ts',
    'schemas/admin/tenantUser.ts',
    'schemas/admin/tenantInvoice.ts',
    'schemas/admin/tenant.ts',
    'schemas/admin/plugin.ts',
    'schemas/admin/migration.ts',
    'schemas/admin/dictionary.ts',
    'schemas/admin/bankAccount.ts',
    'schemas/admin/account.ts',
    'schemas/qms/audit.ts',
    'schemas/monitor/alertRule.ts',
    'schemas/pm/resource.ts',
    'schemas/pm/dashboardSchema.ts',
    'schemas/pm/contract.ts',
    'schemas/pm/project.ts',
]

processed = 0
total_keys = 0

print('Processing schema files...\n')

for d in schema_dirs:
    if os.path.exists(d):
        for f in walk_schema_files(d):
            count = process_file(f)
            if count > 0:
                processed += 1
                total_keys += count
                print(f'  OK: {os.path.relpath(f, ROOT)} ({count} keys)')

for f_rel in extra_files:
    f = os.path.join(ROOT, f_rel)
    if os.path.exists(f):
        count = process_file(f)
        if count > 0:
            processed += 1
            total_keys += count
            print(f'  OK: {f_rel} ({count} keys)')

print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Processed {processed} files, {total_keys} total keys.')
