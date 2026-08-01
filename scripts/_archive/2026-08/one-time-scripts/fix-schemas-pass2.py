#!/usr/bin/env python3
"""
Second pass: fix remaining Chinese UI text in schema files.
Targets: label: fields (including nested in option arrays), template literals,
other UI fields (title, description, placeholder, message, etc.), and comments.
Keeps backend values (value:, defaultValue:, colorMap keys, labelMap keys).
"""

import os
import sys
import json
import re

ROOT = '/Users/air/TOPEMS/apps/web/src'
SCHEMAS_DIR = os.path.join(ROOT, 'schemas')
ZH_PATH = os.path.join(ROOT, 'i18n', 'locales', 'zh.json')
EN_PATH = os.path.join(ROOT, 'i18n', 'locales', 'en.json')

HAN_RE = re.compile(r'[\u4e00-\u9fa5]')
HAN_STR_RE = re.compile(r'[\u4e00-\u9fa5]+')

UI_FIELD_NAMES = [
    'label', 'title', 'description', 'placeholder', 'message',
    'tabLabel', 'optionText', 'sectionTitle', 'filterLabel',
    'headerText', 'footerText', 'emptyText', 'confirmText',
    'cancelText', 'okText', 'tooltipText', 'helpText',
    'errorText', 'successText', 'warningText', 'infoText',
    'filterPlaceholder', 'columnLabel',
    'dialogTitle', 'drawerTitle', 'modalTitle',
    'noDataText', 'noResultText',
    'submitText', 'saveText', 'deleteText', 'editText',
    'viewText', 'closeText', 'backText', 'nextText',
]

BACKEND_FIELD_NAMES = [
    'value', 'defaultValue', 'raw_value', 'keyValue',
]

MODULES = [
    'admin', 'crm', 'doc', 'ehs', 'erp', 'finance', 'hrm',
    'iam', 'integration', 'lims', 'mes', 'mobile', 'monitor',
    'notification', 'pdm', 'qms', 'rd', 'report', 'scm', 'wms',
    '_shared', 'bi', 'workflow', 'ticket',
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


def find_ui_assignments(line):
    """
    Find UI field assignments on a line with Chinese text.
    Returns list of dicts with: field, quote, zh_text, zh_start, zh_end, full_start, full_end
    full_start/full_end covers just the quoted/template value (not the field: prefix).
    """
    results = []
    for field in UI_FIELD_NAMES:
        for quote in ("'", '"'):
            pattern = re.compile(
                r'\b' + re.escape(field) + r'\s*:\s*'
                + re.escape(quote)
                + r'((?:(?!' + re.escape(quote) + r').)*[\u4e00-\u9fa5]+(?:(?!' + re.escape(quote) + r').)*)'
                + re.escape(quote)
            )
            for m in pattern.finditer(line):
                zh_text = m.group(1)
                results.append({
                    'field': field,
                    'quote': quote,
                    'zh_text': zh_text,
                    'val_start': m.start(1),
                    'val_end': m.end(1),
                    'full_start': m.start(0),
                    'full_end': m.end(0),
                    'type': 'string',
                })

        tpl_pattern = re.compile(
            r'\b' + re.escape(field) + r'\s*:\s*'
            r'`([^`]*[\u4e00-\u9fa5]+[^`]*)`'
        )
        for m in tpl_pattern.finditer(line):
            zh_text = m.group(1)
            results.append({
                'field': field,
                'quote': '`',
                'zh_text': zh_text,
                'val_start': m.start(1),
                'val_end': m.end(1),
                'full_start': m.start(0),
                'full_end': m.end(0),
                'type': 'template',
            })

    return results


def find_template_literals(line):
    """Find template literals with Chinese NOT already in a UI field context."""
    ui_tpl_positions = set()
    for field in UI_FIELD_NAMES:
        tpl_pattern = re.compile(
            r'\b' + re.escape(field) + r'\s*:\s*`([^`]*[\u4e00-\u9fa5]+[^`]*)`'
        )
        for m in tpl_pattern.finditer(line):
            ui_tpl_positions.add((m.start(), m.end()))

    results = []
    for m in re.finditer(r'`([^`]*[\u4e00-\u9fa5]+[^`]*)`', line):
        tpl_range = (m.start(), m.end())
        if any(us <= tpl_range[0] and tpl_range[1] <= ue for us, ue in ui_tpl_positions):
            continue
        results.append({
            'tpl_text': m.group(1),
            'start': m.start(),
            'end': m.end(),
        })
    return results


def extract_template_vars(tpl_text):
    """Extract variable expressions from template literal."""
    vars_found = re.findall(r'\$\{([^}]+)\}', tpl_text)
    return vars_found


def is_in_comment(line, pos):
    """Check if position is inside a comment."""
    before = line[:pos]
    if '//' in before:
        return True
    if re.match(r'\s*\*', line):
        return True
    if re.match(r'\s*/\*', line):
        return True
    return False


def is_comment_line(line):
    """Check if the entire line is a comment."""
    stripped = line.strip()
    if stripped.startswith('//'):
        return True
    if stripped.startswith('*') or stripped.startswith('/*'):
        return True
    return False


def is_backend_context(line, field_name):
    """Check if this field is in a backend-value context."""
    if field_name in BACKEND_FIELD_NAMES:
        return True
    return False


def is_value_line(line):
    """Check if line contains value: or defaultValue: as a backend field."""
    return bool(re.search(
        r'\b(?:value|defaultValue|raw_value|keyValue)\s*:',
        line
    ))


def collect_files():
    """Find all schema files with Chinese characters."""
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
    """Process a single file, replacing Chinese UI text with i18n.t() calls."""
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
    tpl_strings = {}

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

        if is_in_comment(line, len(line) // 2):
            new_lines.append(line)
            continue

        assignments = find_ui_assignments(line)
        extra_templates = find_template_literals(line)

        if not assignments and not extra_templates:
            new_lines.append(line)
            continue

        replacements = []

        for a in assignments:
            field_name = a['field']
            zh_text = a['zh_text']
            quote = a['quote']

            if is_backend_context(line, field_name):
                continue

            if zh_text not in zh_strings:
                counter = len(zh_strings) + len(tpl_strings)
                key = f"key_{counter}_{sanitize_key(zh_text)[:40]}"
                zh_strings[zh_text] = key

            full_key = f"{ts_prefix}.{zh_strings[zh_text]}"

            if a['type'] == 'template' and quote == '`':
                tpl_vars = extract_template_vars(zh_text)
                if tpl_vars:
                    var_decls = []
                    for v in tpl_vars:
                        vn = v.split('.')[0].split('??')[0].split('||')[0].strip()
                        var_decls.append(f"{vn}={{{vn}}}")
                    args_str = ', '.join(var_decls)
                    replacement = f"i18n.t('{full_key}', {{ {args_str} }})"
                else:
                    replacement = f"i18n.t('{full_key}')"
            else:
                replacement = f"i18n.t('{full_key}')"

            val_start = a['val_start']
            val_end = a['val_end']
            replacements.append((val_start - 1, val_end + 1, replacement))
            keys_added += 1

        for t in extra_templates:
            tpl_text = t['tpl_text']
            tpl_vars = extract_template_vars(tpl_text)

            if tpl_text not in tpl_strings:
                counter = len(zh_strings) + len(tpl_strings)
                key = f"tpl_{counter}_{sanitize_key(tpl_text)[:40]}"
                tpl_strings[tpl_text] = (key, tpl_vars)

            full_key = f"{ts_prefix}.{tpl_strings[tpl_text][0]}"
            if tpl_vars:
                var_decls = []
                for v in tpl_vars:
                    vn = v.split('.')[0].split('??')[0].split('||')[0].strip()
                    var_decls.append(f"{vn}={{{vn}}}")
                args_str = ', '.join(var_decls)
                replacement = f"i18n.t('{full_key}', {{ {args_str} }})"
            else:
                replacement = f"i18n.t('{full_key}')"

            replacements.append((t['start'], t['end'], replacement))
            keys_added += 1

        if not replacements:
            new_lines.append(line)
            continue

        replacements.sort(key=lambda x: x[0], reverse=True)

        new_line = line
        for start, end, repl in replacements:
            new_line = new_line[:start] + repl + new_line[end:]

        new_lines.append(new_line)

    new_content = '\n'.join(new_lines)

    if zh_strings or tpl_strings:
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

    for tpl_text, (key, _) in tpl_strings.items():
        zh_data['schema'][module][file_name][key] = tpl_text
        en_data['schema'][module][file_name][key] = tpl_text

    return new_content, keys_added, len(zh_strings), len(tpl_strings)


def main():
    print("=" * 60)
    print("SECOND PASS: Fix remaining Chinese UI text in schemas")
    print("=" * 60)

    print("\nLoading i18n locale files...")
    zh = load_json(ZH_PATH)
    en = load_json(EN_PATH)

    print("Scanning for files with Chinese characters...")
    files = collect_files()
    print(f"Found {len(files)} files with Chinese characters")

    total_keys = 0
    total_tpl = 0
    processed = 0
    skipped_clean = 0
    errors = []

    for rel_mod, fpath in files:
        try:
            new_content, keys, zh_count, tpl_count = process_file(
                fpath, rel_mod, zh, en
            )

            if keys > 0 or tpl_count > 0:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                total_keys += keys
                total_tpl += tpl_count
                processed += 1
                print(f"  OK: {rel_mod} ({keys} replacements, {tpl_count} template keys)")
            else:
                skipped_clean += 1
                print(f"  SKIP (no replaceable UI text): {rel_mod}")
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
    print(f"DONE — Second pass complete")
    print(f"{'=' * 60}")
    print(f"Files processed:     {processed}")
    print(f"Files skipped:       {skipped_clean}")
    print(f"UI keys replaced:    {total_keys}")
    print(f"Template keys added: {total_tpl}")
    print(f"Errors:              {len(errors)}")

    if errors:
        print('\nErrors:')
        for path, err in errors:
            print(f'  {path}: {err}')

    print('\n=== VERIFICATION ===')
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
            if is_in_comment(line, len(line) // 2):
                continue
            if is_value_line(line):
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
            n = len(HAN_RE.findall(line))
            ui_remaining += n
            print(f"  REMAINING: {rel_mod}:{i+1}: {line.strip()[:120]}")

    print(f"\nTotal remaining non-backend Chinese chars: {ui_remaining}")


if __name__ == '__main__':
    main()