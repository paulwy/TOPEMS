#!/usr/bin/env python3
"""
v68-3 L4 标签清理脚本
依据 navigation-architecture.md §5.2 清理两类黑名单标签：
  (1) 泛化标签：'仪表盘'/'看板'/'概览' → '{模块名}概览' / '{模块名}看板'
  (2) '管理'后缀 → 基于 NavGroup + code 关键词的语义后缀
      setting→配置 / analytics→分析 / report→报告 / overview→概览 /
      master→档案 / process→流程 / business→列表
同时同步更新 routes 区 title 字段，保持与 navItems label 一致。
"""

import os
import re
import glob
from pathlib import Path

NAV_GROUP_SUFFIX = {
    'setting': '配置',
    'analytics': '分析',
    'report': '报告',
    'overview': '概览',
    'master': '档案',
    'process': '流程',
    'business': '列表',
    'other': '列表',
}

CONFIG_GLOB = 'apps/web/src/modules/*/config.ts'


def extract_module_info(content: str, file_path: str) -> tuple[str, str]:
    module_code = os.path.basename(os.path.dirname(file_path))
    m = re.search(r"name:\s*'([^']+)'", content)
    module_name = m.group(1) if m else module_code
    return module_code, module_name


def build_generic_replacement(module_name: str, generic_label: str) -> str:
    if generic_label in ('仪表盘', '看板'):
        return f'{module_name}概览'
    else:
        return f'{module_name}概览'


def strip_management(label: str) -> str:
    if label.endswith('管理'):
        return label[:-2]
    return label


def build_management_replacement(label: str, group: str, code: str) -> str:
    base = strip_management(label)
    suffix = NAV_GROUP_SUFFIX.get(group, '列表')

    override_keywords = {
        'template': ('setting', '配置'),
        'config': ('setting', '配置'),
        'setting': ('setting', '配置'),
        'param': ('setting', '配置'),
        'threshold': ('setting', '配置'),
        'permission': ('setting', '配置'),
        'index': ('setting', '配置'),
        'dict': ('setting', '配置'),
        'database': ('setting', '配置'),
        'audit': ('setting', '配置'),
        'analysis': ('analytics', '分析'),
        'analytics': ('analytics', '分析'),
        'report': ('report', '报告'),
        'print': ('report', '报告'),
        'overview': ('overview', '概览'),
        'dashboard': ('overview', '概览'),
        'kanban': ('overview', '概览'),
        'oee': ('analytics', '分析'),
        'spc': ('analytics', '分析'),
        'cost': ('analytics', '分析'),
        'kpi': ('analytics', '分析'),
        'energy': ('analytics', '分析'),
        'depreciation': ('analytics', '分析'),
    }

    code_lower = code.lower()
    for kw, (_, kw_suffix) in override_keywords.items():
        if kw in code_lower:
            suffix = kw_suffix
            break

    return f'{base}{suffix}'


def find_items_in_content(content: str, field_name: str):
    """
    在 content 中查找所有 { code:..., field_name:..., group:... } 结构。
    返回 list of (code, field_value, group, (start_pos, end_pos))
    """
    items = []
    pattern = re.compile(
        r"\{\s*"
        r"code:\s*'([^']+)'"
        r"[\s\S]*?"
        rf"{field_name}:\s*'([^']+)'"
        r"[\s\S]*?"
        r"group:\s*'([^']+)'",
        re.MULTILINE,
    )
    for m in pattern.finditer(content):
        code, field_val, group = m.group(1), m.group(2), m.group(3)
        field_start = m.start(2)
        field_end = m.end(2)
        items.append((code, field_val, group, (field_start, field_end)))
    return items


def process_file(file_path: str) -> dict:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    module_code, module_name = extract_module_info(content, file_path)

    changes = {
        'file': file_path,
        'module': module_name,
        'rule1_label': 0,
        'rule1_title': 0,
        'rule2_label': 0,
        'rule2_title': 0,
        'details': [],
    }

    replacements = []

    for field_name in ('label', 'title'):
        items = find_items_in_content(content, field_name)
        for code, val, group, (s, e) in items:
            new_val = None
            rule = None

            if val in ('仪表盘', '看板', '概览'):
                new_val = build_generic_replacement(module_name, val)
                rule = 'R1'
            elif val.endswith('管理') and len(val) > 2:
                new_val = build_management_replacement(val, group, code)
                rule = 'R2'

            if new_val and new_val != val:
                replacements.append((s, e, new_val, rule, field_name, code, val, group, new_val))

    if not replacements:
        return changes

    replacements.sort(key=lambda x: x[0], reverse=True)

    for s, e, new_val, rule, field_name, code, old_val, group, new_v in replacements:
        content = content[:s] + new_val + content[e:]

        key_prefix = 'rule1' if rule == 'R1' else 'rule2'
        key_suffix = 'label' if field_name == 'label' else 'title'
        changes[f'{key_prefix}_{key_suffix}'] += 1
        changes['details'].append({
            'rule': rule,
            'field': field_name,
            'code': code,
            'group': group,
            'old': old_val,
            'new': new_v,
        })

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return changes


def count_residual_management(files: list[str]) -> list[tuple[str, str, str, str, str]]:
    results = []
    for fp in files:
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        module_code = os.path.basename(os.path.dirname(fp))
        m_name = re.search(r"name:\s*'([^']+)'", content)
        module_name = m_name.group(1) if m_name else module_code

        for field_name in ('label', 'title'):
            items = find_items_in_content(content, field_name)
            for code, val, group, _ in items:
                if val.endswith('管理') and len(val) > 2:
                    results.append((fp, module_name, field_name, code, group, val))
    return results


def main():
    root = Path(__file__).resolve().parent.parent
    files = sorted(glob.glob(str(root / CONFIG_GLOB)))

    print(f'扫描模块配置文件: {len(files)} 个')
    print('=' * 70)

    all_changes = []
    for fp in files:
        ch = process_file(fp)
        total = (ch['rule1_label'] + ch['rule1_title'] +
                 ch['rule2_label'] + ch['rule2_title'])
        if total > 0:
            all_changes.append(ch)

    t_r1_label = sum(c['rule1_label'] for c in all_changes)
    t_r1_title = sum(c['rule1_title'] for c in all_changes)
    t_r2_label = sum(c['rule2_label'] for c in all_changes)
    t_r2_title = sum(c['rule2_title'] for c in all_changes)

    print()
    print('变更汇总（按模块）:')
    print('-' * 70)
    for ch in all_changes:
        line = (f"  {ch['module']:<12} R1(label={ch['rule1_label']:>2},"
                f"title={ch['rule1_title']:>2})  "
                f"R2(label={ch['rule2_label']:>3},title={ch['rule2_title']:>3})")
        print(line)
    print('-' * 70)
    print(f'  R1 (泛化标签): label={t_r1_label}, title={t_r1_title}  → 合计 {t_r1_label + t_r1_title}')
    print(f'  R2 (管理后缀): label={t_r2_label}, title={t_r2_title}  → 合计 {t_r2_label + t_r2_title}')
    print(f'  GRAND TOTAL: {t_r1_label + t_r1_title + t_r2_label + t_r2_title} 处')
    print()

    print('navItems label 变更明细 (R1: 20项 + R2: 114项 目标):')
    print('=' * 70)
    r1_labels = 0
    r2_labels = 0
    for ch in all_changes:
        for d in ch['details']:
            if d['field'] != 'label':
                continue
            marker = '[R1]' if d['rule'] == 'R1' else '[R2]'
            if d['rule'] == 'R1':
                r1_labels += 1
            else:
                r2_labels += 1
            print(f"  {marker} ({d['group']:<9}) {d['code']:<40}  "
                  f"\"{d['old']}\" → \"{d['new']}\"")
    print('=' * 70)
    print(f'  R1 navItems label 实际变更: {r1_labels} / 20 目标')
    print(f'  R2 navItems label 实际变更: {r2_labels} / 114 目标')
    print()

    residuals = count_residual_management(files)
    navitem_residuals = [r for r in residuals if r[2] == 'label']
    print(f'navItems label 中剩余 \"管理\" 后缀数量: {len(navitem_residuals)}  '
          f'(目标 ≤5)')
    if navitem_residuals:
        print('  剩余项:')
        for r in navitem_residuals:
            print(f'    - [{r[4]}] {r[1]} / {r[3]}: \"{r[5]}\"')
    print()
    total_residuals = len(residuals)
    print(f'全部字段（含routes title）剩余 \"管理\" 后缀: {total_residuals}')


if __name__ == '__main__':
    main()
