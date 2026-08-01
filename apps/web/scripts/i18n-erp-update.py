#!/usr/bin/env python3
"""Helper to merge new i18n keys into erp JSON resource files."""
import json
import sys
import os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n', 'locales')

ZH_ERP = os.path.join(LOCALES_DIR, 'zh', 'erp.json')
EN_ERP = os.path.join(LOCALES_DIR, 'en', 'erp.json')
ZH_MAIN = os.path.join(LOCALES_DIR, 'zh.json')
EN_MAIN = os.path.join(LOCALES_DIR, 'en.json')


def deep_merge(base, addition):
    """Recursively merge addition into base (addition wins on conflict)."""
    for key, value in addition.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')


def update_keys(new_keys_zh, new_keys_en):
    """Merge new keys into all 4 JSON files.

    new_keys_zh / new_keys_en: nested dicts with the SAME structure.
    For zh/erp.json and en/erp.json: merge at top level.
    For zh.json and en.json: merge under the "erp" top-level key.
    """
    # zh/erp.json
    zh_erp = load_json(ZH_ERP)
    deep_merge(zh_erp, new_keys_zh)
    save_json(ZH_ERP, zh_erp)
    print(f'Updated {ZH_ERP}')

    # en/erp.json (create if missing)
    if os.path.exists(EN_ERP):
        en_erp = load_json(EN_ERP)
    else:
        en_erp = {}
    deep_merge(en_erp, new_keys_en)
    save_json(EN_ERP, en_erp)
    print(f'Updated {EN_ERP}')

    # zh.json under "erp"
    zh_main = load_json(ZH_MAIN)
    if 'erp' not in zh_main or not isinstance(zh_main['erp'], dict):
        zh_main['erp'] = {}
    deep_merge(zh_main['erp'], new_keys_zh)
    save_json(ZH_MAIN, zh_main)
    print(f'Updated {ZH_MAIN} (erp section)')

    # en.json under "erp"
    en_main = load_json(EN_MAIN)
    if 'erp' not in en_main or not isinstance(en_main['erp'], dict):
        en_main['erp'] = {}
    deep_merge(en_main['erp'], new_keys_en)
    save_json(EN_MAIN, en_main)
    print(f'Updated {EN_MAIN} (erp section)')


if __name__ == '__main__':
    # Read keys from stdin as JSON: {"zh": {...}, "en": {...}}
    data = json.load(sys.stdin)
    update_keys(data['zh'], data['en'])
    print('Done.')
