#!/usr/bin/env python3
"""
Fourth pass: Handle remaining edge cases:
- Mixed Chinese-English JSX text (e.g. "日志ID")
- JSX text with variable interpolation
- Error messages with Chinese
"""

import os
import json
import re

ROOT = '/Users/air/TOPEMS/apps/web/src'
SCHEMAS_DIR = os.path.join(ROOT, 'schemas')
ZH_PATH = os.path.join(ROOT, 'i18n', 'locales', 'zh.json')
EN_PATH = os.path.join(ROOT, 'i18n', 'locales', 'en.json')

HAN_RE = re.compile(r'[\u4e00-\u9fa5]')
HAN_STR_RE = re.compile(r'[\u4e00-\u9fa5]+')

MODULES = [
    'admin', 'crm', 'doc', 'ehs', 'erp', 'finance', 'hrm',
    'iam', 'integration', 'lims', 'mes', 'mobile', 'monitor',
    'notification', 'pdm', 'qms', 'rd', 'report', 'scm', 'wms',
]


def sanitize_key(text):
    key = re.sub(r'[^a-zA-Z0-9_]', '_', text.lower())
    key = re.sub(r'_+', '_', key).strip('_')
    return key[:50] if key else 'text'


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def is_comment_line(line):
    stripped = line.strip()
    if stripped.startswith('//'):
        return True
    if stripped.startswith('*') or stripped.startswith('/*'):
        return True
    return False


def is_pure_jsx_text(line):
    """
    Detect JSX text lines including mixed Chinese-English.
    A line that contains Chinese + optional alphanumeric chars,
    no quotes, no backticks, no colons (except possibly after Chinese text).
    """
    if is_comment_line(line):
        return False
    if "'" in line or '"' in line or '`' in line:
        return False
    if 'i18n.t(' in line:
        return False

    stripped = line.strip()
    if not stripped:
        return False

    if HAN_STR_RE.search(line):
        after_han = line[line.rfind(HAN_STR_RE.search(line).group(0)) + len(HAN_STR_RE.search(line).group(0)):]
        if ':' in after_han:
            return False

    if re.match(r'^[\s]*[\u4e00-\u9fa5a-zA-Z0-9\u3000-\u303f\uff00-\uffef]+[\s]*$', line):
        return True

    return False


def extract_jsx_chinese_text(line):
    """Extract the Chinese text portion from a JSX text line."""
    m = HAN_STR_RE.search(line)
    if m:
        return m.group(0)
    return None


def collect_files():
    files = []
    for mod in MODULES:
        mod_path = os.path.join(SCHEMAS_DIR, mod)
        if not os.path.isdir(mod_path):
            continue
        for root, dirs, fnames in os.walk(mod_path):
            for fname in fnames:
                if fname.startswith('.'):
                    continue
                if fname.endswith('.ts') or fname.endswith('.tsx'):
                    fpath = os.path.join(root, fname)
                    with open(fpath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if HAN_RE.search(content):
                        rel_mod = os.path.relpath(fpath, SCHEMAS_DIR)
                        files.append((rel_mod, fpath))
    return files


def process_file(fpath, rel_mod, zh_data, en_data):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    module = rel_mod.split('/')[0]
    file_name = rel_mod.split('/')[-1]
    if file_name.endswith('.tsx'):
        file_name = file_name[:-4]
    elif file_name.endswith('.ts'):
        file_name = file_name[:-3]

    ts_prefix = f"schema.{module}.{file_name}"

    zh_strings = {}
    jsx_var_strings = {}

    lines = content.split('\n')
    new_lines = []
    keys_added = 0

    for line_idx, line in enumerate(lines):
        if not HAN_RE.search(line):
            new_lines.append(line)
            continue

        if is_comment_line(line):
            new_lines.append(line)
            continue

        if 'i18n.t(' in line:
            new_lines.append(line)
            continue

        if re.search(r'\b(?:value|defaultValue|raw_value|keyValue)\s*:', line):
            new_lines.append(line)
            continue

        if re.search(r'\bcolorMap\s*:', line):
            new_lines.append(line)
            continue

        if re.search(r'\blabelMap\s*:', line):
            if re.match(r'\s*[\u4e00-\u9fa5]+\s*:', line):
                new_lines.append(line)
                continue

        if re.search(r'\bstatusMap\s*:', line):
            new_lines.append(line)
            continue

        if re.search(r'\bstatusColor\s*:', line):
            new_lines.append(line)
            continue

        if re.search(r'throw new Error\(', line):
            zh_match = HAN_STR_RE.search(line)
            if zh_match:
                zh_text = zh_match.group(0)
                if zh_text not in zh_strings:
                    counter = len(zh_strings) + len(jsx_var_strings)
                    key = f"err_{counter}_{sanitize_key(zh_text)[:40]}"
                    zh_strings[zh_text] = key

                full_key = f"{ts_prefix}.{zh_strings[zh_text]}"
                indent = line[:len(line) - len(line.lstrip())]
                new_line = line.replace(f"'{zh_text}'", f"i18n.t('{full_key}')")
                new_lines.append(new_line)
                keys_added += 1
                continue

        if re.search(r'上次测试\s*:', line):
            tpl_vars = re.findall(r'\$\{([^}]+)\}', line)
            if not tpl_vars:
                exprs = re.findall(r'\{([^}]+)\}', line)
                tpl_vars = exprs

            zh_text = '上次测试'
            if zh_text not in jsx_var_strings:
                counter = len(zh_strings) + len(jsx_var_strings)
                key = f"jsx_var_{counter}_{sanitize_key(zh_text)[:40]}"
                jsx_var_strings[zh_text] = key

            full_key = f"{ts_prefix}.{jsx_var_strings[zh_text]}"
            var_name = 'lastTestAt'
            expr = 'new Date(row.last_test_at as string).toLocaleString(\'zh-CN\')'
            replacement = f"{{i18n.t('{full_key}', {{ {var_name}: {expr} }})}}"
            indent = line[:len(line) - len(line.lstrip())]
            new_line = f"{indent}{replacement}"
            new_lines.append(new_line)
            keys_added += 1
            continue

        if is_pure_jsx_text(line):
            zh_text = extract_jsx_chinese_text(line)
            if zh_text:
                if zh_text not in zh_strings:
                    counter = len(zh_strings) + len(jsx_var_strings)
                    key = f"jsx_{counter}_{sanitize_key(zh_text)[:40]}"
                    zh_strings[zh_text] = key

                full_key = f"{ts_prefix}.{zh_strings[zh_text]}"
                indent = line[:len(line) - len(line.lstrip())]
                new_line = f"{indent}{{i18n.t('{full_key}')}}"
                new_lines.append(new_line)
                keys_added += 1
                continue

        new_lines.append(line)

    new_content = '\n'.join(new_lines)

    if zh_strings or jsx_var_strings:
        import_line = "import i18n from '@/i18n';"
        if "import i18n from '@/i18n'" not in new_content:
            lines_list = new_content.split('\n')
            last_import_idx = -1
            for i, l in enumerate(lines_list):
                if l.startswith('import '):
                    last_import_idx = i
            if last_import_idx >= 0:
                lines_list.insert(last_import_idx + 1, import_line)
            else:
                lines_list.insert(0, import_line)
            new_content = '\n'.join(lines_list)

    zh_data.setdefault('schema', {})
    zh_data['schema'].setdefault(module, {})
    zh_data['schema'][module].setdefault(file_name, {})

    en_data.setdefault('schema', {})
    en_data['schema'].setdefault(module, {})
    en_data['schema'][module].setdefault(file_name, {})

    for zh_text, key in zh_strings.items():
        zh_data['schema'][module][file_name][key] = zh_text
        en_data['schema'][module][file_name][key] = zh_text

    for zh_text, key in jsx_var_strings.items():
        zh_data['schema'][module][file_name][key] = zh_text
        en_data['schema'][module][file_name][key] = zh_text

    return new_content, keys_added, len(zh_strings) + len(jsx_var_strings)


def main():
    print("=" * 60)
    print("FOURTH PASS: Fix remaining edge cases")
    print("=" * 60)

    print("\nLoading i18n locale files...")
    zh = load_json(ZH_PATH)
    en = load_json(EN_PATH)

    print("Scanning for remaining Chinese...")
    files = collect_files()
    print(f"Found {len(files)} files with Chinese characters")

    total_keys = 0
    processed = 0
    skipped = 0
    errors = []

    for rel_mod, fpath in files:
        try:
            new_content, keys, zh_count = process_file(fpath, rel_mod, zh, en)

            if keys > 0:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                total_keys += keys
                processed += 1
                print(f"  OK: {rel_mod} ({keys} replacements)")
            else:
                skipped += 1
        except Exception as e:
            errors.append((rel_mod, str(e)))
            print(f"  ERROR: {rel_mod}: {str(e)}")
            import traceback
            traceback.print_exc()

    print(f"\nWriting zh.json ...")
    save_json(ZH_PATH, zh)

    print(f"Writing en.json ...")
    save_json(EN_PATH, en)

    print(f"\n{'=' * 60}")
    print(f"DONE — Fourth pass complete")
    print(f"{'=' * 60}")
    print(f"Files processed:   {processed}")
    print(f"Files skipped:     {skipped}")
    print(f"Keys replaced:     {total_keys}")
    print(f"Errors:            {len(errors)}")

    if errors:
        print('\nErrors:')
        for path, err in errors:
            print(f'  {path}: {err}')

    print('\n=== FINAL VERIFICATION ===')
    remaining_files = collect_files()
    print(f"Files still containing Chinese: {len(remaining_files)}")

    ui_remaining = 0
    for rel_mod, fpath in remaining_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if not HAN_RE.search(line):
                continue
            if is_comment_line(line):
                continue
            if re.search(r"\b(?:value|defaultValue|raw_value|keyValue)\s*:", line):
                continue
            if re.search(r'\bcolorMap\s*:', line):
                continue
            if re.search(r'\blabelMap\s*:', line):
                if re.match(r'\s*[\u4e00-\u9fa5]+\s*:', line):
                    continue
            if re.search(r'\bstatusMap\s*:', line):
                continue
            if re.search(r'\bstatusColor\s*:', line):
                continue
            if re.search(r"i18n\.t\(", line):
                continue
            if re.search(r"import.*from.*['\"]@/i18n['\"]", line):
                continue
            if re.search(r"throw new Error\(", line):
                continue
            if re.search(r"console\.(log|warn|error)\(", line):
                continue
            n = len(HAN_RE.findall(line))
            ui_remaining += n
            print(f"  REMAINING: {rel_mod}:{i+1}: {line.strip()[:120]}")

    print(f"\nTotal remaining UI Chinese chars: {ui_remaining}")


if __name__ == '__main__':
    main()