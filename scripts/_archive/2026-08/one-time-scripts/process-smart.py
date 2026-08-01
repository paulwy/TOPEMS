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

# Files to process
TARGET_DIRS = ['srm', 'workflow', 'scm', 'ticket', 'report', 'crm', 'bi', 'admin', 'qms', 'monitor', 'pm']

def process_file_smart(file_path, module, file_name):
    """Process a file, replacing Chinese text in label/description/title/option context
    but preserving Chinese keys in colorMap/labelMap."""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if not HAN_RE.search(content):
        return 0
    
    # Pattern 1: Match field definitions like label: '中文', description: '中文', etc.
    # These are safe to replace
    safe_patterns = [
        (r"(label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "label"),
        (r"(description:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "description"),
        (r"(title:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "title"),
        (r"(createTitle:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "create_title"),
        (r"(editTitle:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "edit_title"),
        (r"(detailTitle:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "detail_title"),
        (r"(tabLabel:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "tab_label"),
        (r"(optionText:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "option_text"),
        (r"(message:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "message"),
        (r"(statusLabel:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "status_label"),
        (r"(placeholder:\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "placeholder"),
        (r"(section_basic_info\":\s*)'([^']*[\u4e00-\u9fa5][^']*)'", "section_basic_info"),
    ]
    
    # Pattern 2: Match option labels like { label: '中文', value: '...' }
    option_label_pattern = re.compile(r"(\{\s*label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'(\s*,\s*value:)")
    option_label_pattern2 = re.compile(r"(\{\s*value:\s*'[^']*'\s*,\s*label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'(\s*\})")
    
    # Pattern 3: Match filter options like { label: '中文', value: '...' }
    filter_label_pattern = re.compile(r"(\{\s*label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'(\s*,\s*value:)")
    
    # Collect all unique Chinese strings and their contexts
    zh_to_keys = {}  # zh_text -> key
    replacements = []  # (pattern, key)
    
    ts_prefix = f"schema.{module}.{file_name}"
    
    # Get existing translations for this file
    existing = zh.get('schema', {}).get(module, {}).get(file_name, {})
    existing_reverse = {}
    for k, v in existing.items():
        if isinstance(v, str) and HAN_RE.search(v):
            existing_reverse[v] = k
    
    counter = [0]
    
    def get_key(zh_text, prefix='lbl'):
        if zh_text in existing_reverse:
            return existing_reverse[zh_text]
        
        if zh_text in zh_to_keys:
            return zh_to_keys[zh_text]
        
        counter[0] += 1
        key = f"{prefix}_{counter[0]}"
        zh_to_keys[zh_text] = key
        return key
    
    # Process safe patterns
    for pattern, default_prefix in safe_patterns:
        for match in re.finditer(pattern, content):
            prefix_text = match.group(1)
            zh_text = match.group(2)
            key = get_key(zh_text, default_prefix)
            replacements.append((match.start(), match.end(), f"{prefix_text}i18n.t('{ts_prefix}.{key}')"))
    
    # Process option labels
    for match in option_label_pattern.finditer(content):
        prefix_text = match.group(1)
        zh_text = match.group(2)
        suffix_text = match.group(3)
        key = get_key(zh_text, 'option')
        replacements.append((match.start(), match.end(), f"{prefix_text}i18n.t('{ts_prefix}.{key}'){suffix_text}"))
    
    for match in option_label_pattern2.finditer(content):
        prefix_text = match.group(1)
        zh_text = match.group(2)
        suffix_text = match.group(3)
        key = get_key(zh_text, 'option')
        replacements.append((match.start(), match.end(), f"{prefix_text}i18n.t('{ts_prefix}.{key}'){suffix_text}"))
    
    # Apply replacements from end to start to preserve indices
    replacements.sort(key=lambda x: -x[0])
    for start, end, replacement in replacements:
        content = content[:start] + replacement + content[end:]
    
    # Add import if not present
    if "import i18n from '@/i18n'" not in content:
        import_line = "import i18n from '@/i18n';\n"
        last_import_idx = content.rfind('import ')
        if last_import_idx != -1:
            semi_idx = content.find(';\n', last_import_idx)
            if semi_idx != -1:
                content = content[:semi_idx + 2] + import_line + content[semi_idx + 2:]
            else:
                content = import_line + content
        else:
            content = import_line + content
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Update translation files
    if module not in zh.get('schema', {}):
        zh.setdefault('schema', {})
        zh['schema'][module] = {}
    if file_name not in zh['schema'][module]:
        zh['schema'][module][file_name] = {}
    
    if module not in en.get('schema', {}):
        en.setdefault('schema', {})
        en['schema'][module] = {}
    if file_name not in en['schema'][module]:
        en['schema'][module][file_name] = {}
    
    for zh_text, key in zh_to_keys.items():
        zh['schema'][module][file_name][key] = zh_text
        en['schema'][module][file_name][key] = zh_text
    
    return len(zh_to_keys)


# Process files
total_files = 0
total_keys = 0

for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        file_name = os.path.splitext(fn)[0]
        
        count = process_file_smart(file_path, d, file_name)
        if count > 0:
            total_files += 1
            total_keys += count
            print(f"  OK: {d}/{file_name} ({count} keys)")

# Write translation files
print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Processed {total_files} files, {total_keys} keys.')

# Show remaining Chinese
print('\nRemaining Chinese:')
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
        remaining = re.findall(r'[\u4e00-\u9fa5]', content)
        if remaining:
            # Show context
            contexts = []
            for m in re.finditer(r'[\u4e00-\u9fa5]{2,}', content):
                start = max(0, m.start() - 10)
                end = min(len(content), m.end() + 10)
                ctx = content[start:end].replace('\n', ' ')
                contexts.append(ctx)
            print(f"  {d}/{fn}: {len(remaining)} chars")
            for ctx in contexts[:3]:
                print(f"    '{ctx}'")
