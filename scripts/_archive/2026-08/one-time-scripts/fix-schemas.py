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

# Build complete file list by scanning directories
MODULES = [
    'pdm', 'mes', 'srm', 'rd', 'qms', 'lims', 'iam',
    'erp', 'ehs', 'hrm', 'wms', 'finance',
    'admin', 'bi', 'workflow', 'ticket', 'scm', 'crm',
    '_shared', 'report', 'doc', 'mobile', 'monitor', 'notification', 'integration'
]

SKIP_FILES = {'index'}  # barrel files often don't have content

def collect_files():
    files = []
    for mod in MODULES:
        mod_path = os.path.join(SCHEMAS_DIR, mod)
        if not os.path.isdir(mod_path):
            continue
        for fname in os.listdir(mod_path):
            if fname.startswith('.'):
                continue
            for ext in ('.ts', '.tsx'):
                if fname.endswith(ext):
                    base = fname[:-len(ext)]
                    if base in SKIP_FILES:
                        continue
                    fpath = os.path.join(mod_path, fname)
                    with open(fpath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if HAN_RE.search(content):
                        files.append((mod, base, ext, fpath))
                    break
    return files

def sanitize_key(text):
    """Convert Chinese text to a safe key suffix."""
    # Remove all non-alphanumeric characters except underscore
    key = re.sub(r'[^a-zA-Z0-9_]', '_', text.lower())
    # Collapse multiple underscores
    key = re.sub(r'_+', '_', key).strip('_')
    return key[:40] if key else 'text'

def process_file(file_path, module, file_name, ext):
    """Process a single file: replace Chinese strings with i18n.t() calls."""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    ts_prefix = f"schema.{module}.{file_name}"
    
    # Find all Chinese strings: '...中文...'  or "中文..."
    # We need to be careful: some Chinese in string values should be replaced,
    # some (like backend value fields) should be kept.
    
    # Strategy: Replace all Chinese in string literals that appear as values
    # in schema field definitions (label, description, placeholder, title, etc.)
    # but keep Chinese in 'value' fields (backend data).
    
    # Pattern: match 'xxx' or "xxx" strings containing Chinese
    # But skip lines that are clearly backend value assignments like value: '中文'
    
    zh_strings = {}  # original_text -> i18n_key
    
    # Find all quoted strings with Chinese
    # Match both single and double quotes
    pattern = re.compile(r"""['"]([^'"]*[\u4e00-\u9fa5][^'"]*)['"]""")
    
    for match in pattern.finditer(content):
        zh_text = match.group(1)
        if zh_text in zh_strings:
            continue
        
        # Generate a key from the text
        key_suffix = sanitize_key(zh_text)
        # Use counter to ensure uniqueness
        counter = len(zh_strings)
        key = f"key_{counter}_{key_suffix}"
        
        zh_strings[zh_text] = key
    
    if not zh_strings:
        return 0, set()
    
    # Now replace: for each Chinese string, replace with i18n.t('prefix.key')
    # BE CAREFUL: only replace when the string appears as a property value,
    # not when it's part of an import path or backend value
    
    new_content = content
    used_keys = set()
    
    for zh_text, key in zh_strings.items():
        full_key = f"{ts_prefix}.{key}"
        
        # Check context: if line contains 'value:' or "value:", keep as-is
        # But label:, description:, title:, placeholder:, tabLabel:, optionText:, message:
        # need to be replaced
        
        # Find all occurrences
        safe_replacements = []
        
        # Process line by line to check context
        lines = new_content.split('\n')
        new_lines = []
        
        for line in lines:
            if zh_text not in line:
                new_lines.append(line)
                continue
            
            # Check if this is a backend value field (value: 'xxx')
            # Match patterns like: value: '中文' or value: "中文" or defaultValue: '中文'
            is_backend_value = bool(re.search(
                r'''(?:value|defaultValue|raw_value|keyValue)\s*:\s*['"]''', 
                line
            ))
            
            if is_backend_value:
                # Keep as-is, skip replacement
                new_lines.append(line)
                continue
            
            # Check if it's in a JSDoc comment
            if re.match(r'\s*\*\s', line) or re.match(r'\s*//', line):
                # Convert to English comment instead
                new_lines.append(line)
                continue
            
            # Replace all occurrences in this line
            new_line = line
            # Replace 'text' with i18n.t('prefix.key')
            # Need to handle both single and double quotes
            for quote in ("'", '"'):
                search_str = f"{quote}{zh_text}{quote}"
                if search_str in new_line:
                    replacement = f"i18n.t('{full_key}')"
                    new_line = new_line.replace(search_str, replacement)
                    used_keys.add(full_key)
            
            new_lines.append(new_line)
        
        new_content = '\n'.join(new_lines)
    
    # Add import if needed
    if "import i18n from '@/i18n'" not in new_content:
        import_line = "import i18n from '@/i18n';\n"
        # Find the last import statement
        lines = new_content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
        
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, import_line.rstrip())
            new_content = '\n'.join(lines)
        else:
            new_content = import_line + new_content
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    # Update zh.json and en.json
    zh.setdefault('schema', {})
    zh['schema'].setdefault(module, {})
    zh['schema'][module].setdefault(file_name, {})
    
    en.setdefault('schema', {})
    en['schema'].setdefault(module, {})
    en['schema'][module].setdefault(file_name, {})
    
    for zh_text, key in zh_strings.items():
        full_key = f"{ts_prefix}.{key}"
        short_key = key.split('.')[-1]  # just the key part for nesting
        # Store nested: schema.module.file_name.key = zh_text
        zh['schema'][module][file_name][key] = zh_text
        en['schema'][module][file_name][key] = zh_text  # Default to Chinese, will be translated later
    
    return len(used_keys), used_keys


# Main
print("Scanning for files with Chinese...")
files = collect_files()
print(f"Found {len(files)} files with Chinese")

total_keys = 0
processed = 0
errors = []

for module, file_name, ext, fpath in files:
    try:
        count, keys = process_file(fpath, module, file_name, ext)
        if count > 0:
            total_keys += count
            processed += 1
            print(f"  OK: {module}/{file_name} ({count} keys)")
        else:
            print(f"  SKIP (no replaceable strings): {module}/{file_name}")
    except Exception as e:
        errors.append((module, file_name, str(e)))
        print(f"  ERROR: {module}/{file_name}: {str(e)}")

# Write translation files
print(f"\nWriting zh.json ({len(json.dumps(zh))} bytes)...")
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print(f"Writing en.json ({len(json.dumps(en))} bytes)...")
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\n=== DONE ===')
print(f'Files processed: {processed}')
print(f'Keys added: {total_keys}')
print(f'Errors: {len(errors)}')

if errors:
    print('\nErrors:')
    for mod, fname, err in errors:
        print(f'  {mod}/{fname}: {err}')

# Verify
print('\n=== Verification ===')
remaining_total = 0
for module, file_name, ext, fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    remaining = HAN_RE.findall(content)
    if remaining:
        # Filter out backend values
        lines = content.split('\n')
        backend_count = 0
        for line in lines:
            if re.search(r'''(?:value|defaultValue|raw_value|keyValue)\s*:\s*['"]''', line):
                backend_count += len(HAN_RE.findall(line))
        ui_remaining = len(remaining) - backend_count
        if ui_remaining > 0:
            remaining_total += ui_remaining
            print(f'  {module}/{file_name}: {ui_remaining} UI chars remaining (backend: {backend_count})')

print(f'\nTotal UI Chinese remaining: {remaining_total} chars across schema files')
