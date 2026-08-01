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

# Only process files that still have Chinese
FILES_TO_PROCESS = [
    ('monitor', 'alertRule'),
    ('admin', 'migration'),
    ('admin', 'account'),
    ('admin', 'plugin'),
    ('admin', 'bankAccount'),
    ('crm', 'recommendation'),
    ('crm', 'customerScoring'),
    ('crm', 'contact'),
    ('crm', 'opportunity'),
    ('crm', 'customer'),
    ('crm', 'customerSegmentation'),
    ('qms', 'eightD'),
    ('qms', 'apqp'),
    ('scm', 'purchaseContractWizard'),
]

def process_file(file_path, module, file_name):
    """Process file using placeholder approach."""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    ts_prefix = f"schema.{module}.{file_name}"
    all_mappings = {}
    placeholder_counter = 0
    
    new_lines = []
    for line in lines:
        if not HAN_RE.search(line):
            new_lines.append(line)
            continue
        
        # Find all Chinese strings in this line
        zh_matches = list(re.finditer(r"'([^']*[\u4e00-\u9fa5][^']*)'", line))
        
        if not zh_matches:
            new_lines.append(line)
            continue
        
        new_line = line
        line_mappings = {}
        
        for match in reversed(zh_matches):
            zh_text = match.group(1)
            placeholder_counter += 1
            placeholder = f"__ZH_{placeholder_counter}__"
            
            line_mappings[placeholder] = zh_text
            all_mappings[placeholder] = zh_text
            
            new_line = new_line[:match.start()] + f"'{placeholder}'" + new_line[match.end():]
        
        new_lines.append(new_line)
    
    if not all_mappings:
        return 0
    
    # Replace placeholders with i18n.t() calls
    key_map = {}
    counter = 0
    
    for placeholder, zh_text in all_mappings.items():
        counter += 1
        key = f"key_{counter}"
        key_map[placeholder] = key
    
    final_lines = []
    for line in new_lines:
        final_line = line
        for placeholder, key in key_map.items():
            final_line = final_line.replace(f"'{placeholder}'", f"i18n.t('{ts_prefix}.{key}')")
        final_lines.append(final_line)
    
    content = ''.join(final_lines)
    
    # Add import if needed
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
    
    # Update translations
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
    
    for placeholder, zh_text in all_mappings.items():
        key = key_map[placeholder]
        zh['schema'][module][file_name][key] = zh_text
        en['schema'][module][file_name][key] = zh_text
    
    return len(all_mappings)


# Process files
total_keys = 0

for module, file_name in FILES_TO_PROCESS:
    file_path = os.path.join(SCHEMAS_DIR, module, f"{file_name}.ts")
    if not os.path.exists(file_path):
        print(f"  MISSING: {module}/{file_name}")
        continue
    
    try:
        count = process_file(file_path, module, file_name)
        if count > 0:
            total_keys += count
            print(f"  OK: {module}/{file_name} ({count} keys)")
        else:
            print(f"  SKIP: {module}/{file_name}")
    except Exception as e:
        print(f"  ERROR: {module}/{file_name}: {str(e)}")

# Write translation files
print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Added {total_keys} keys.')

# Verify
print('\nVerification - remaining Chinese in target files:')
total = 0
for module, file_name in FILES_TO_PROCESS:
    file_path = os.path.join(SCHEMAS_DIR, module, f"{file_name}.ts")
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    remaining = re.findall(r'[\u4e00-\u9fa5]', content)
    if remaining:
        total += len(remaining)
        print(f"  {module}/{file_name}: {len(remaining)} chars")
        for m in re.finditer(r'[\u4e00-\u9fa5]{2,}', content):
            s = max(0, m.start()-3)
            e = min(len(content), m.end()+3)
            ctx = content[s:e].replace('\n', '\\n')
            print(f"    '{ctx}'")
            break

print(f'\nTotal remaining: {total} chars')
