#!/usr/bin/env python3
# L2 barrel-only 清理（2026-10-25）：复刻 V258 l1-conservative-remove-v2 模式
# 仅处理：refCount<=2、全引用为 barrel、无 test/storybook、无双导出（值+类型同名）的 L2 条目
# def 端去 export 前缀（A 型），barrel 端删 named re-export 列表项（B/C 型）；export-star 行不动
import json, re, sys

REPORT = 'scripts/audit/ts-unused-exports-report.json'
DRY = '--dry' in sys.argv
MODE_DEF = '--def-only' in sys.argv
MODE_BARREL = '--barrel-only' in sys.argv

d = json.load(open(REPORT))
entries = []
for e in d['L2']:
    refs = e.get('sampleRefs', []) or []
    if e['refCount'] > 2 or e.get('anyValueExport') and e.get('anyTypeExport'):
        continue
    if not refs or any('test' in r or 'storybook' in r for r in refs):
        continue
    if not any('index.' in r or 'index/' in r for r in refs):
        continue
    entries.append(e)
print(f'处理条目: {len(entries)} / L2 总数 {len(d["L2"])}')

def strip_export_keyword(line):
    """A 型：export const/let/var/function/class/enum/interface/type NAME → 去 export 前缀"""
    m = re.match(r'^(\s*)export (const|let|var|function|class|enum|interface|type)\s+', line)
    if m:
        return m.group(1) + m.group(2) + ' ' + line[len(m.group(0)):], True
    return line, False

def remove_from_named_list(src, name):
    """B/C 型：从 export { ... } 列表中删 name（单行与多行）"""
    lines = src.split('\n')
    changed = False
    out = []
    for ln in lines:
        if re.search(r'^export (\{|\w+ )?\{|^export \{', ln) or re.search(r'^export (type )?\{', ln):
            # 该行是 export 列表起始或单行完整
            if 'from' in ln or '}' in ln:
                pass
        # 处理单行: export { a, Name, b } 或 export { a, Name as Alias, b } from 'x'
        if re.match(r'^export (type )?\{.*\}.*$', ln):
            new = re.sub(r'\b' + re.escape(name) + r'( as \w+)?,\s*', '', ln)
            new = re.sub(r',\s*' + re.escape(name) + r'( as \w+)?\b', '', new)
            new = re.sub(r'\b' + re.escape(name) + r'( as \w+)?\b', '', new)
            if new != ln:
                # 清理残留: "export {  }" / 重复逗号 / 空列表
                new = re.sub(r'\{\s*,', '{', new)
                new = re.sub(r',\s*,', ',', new)
                new = re.sub(r'\{\s*\}', '{}', new)
                if re.match(r'^export (type )?\{\s*\}$', new):
                    ln = new  # 空列表保留（保守，不整行删）
                else:
                    ln = new
                changed = True
        else:
            # 多行列表项:  "  Name," / "  Name as Alias," / "  type Name,"
            if re.search(r'^\s+(type )?' + re.escape(name) + r'( as \w+)?,\s*$', ln):
                ln = ''
                changed = True
        out.append(ln)
    return '\n'.join(out), changed

files_def = {}
files_barrel = {}
for e in entries:
    name = e['name']
    for df in e['defFiles']:
        files_def.setdefault(df, []).append(name)
    for r in e['sampleRefs']:
        files_barrel.setdefault(r, []).append(name)

stats = {'def_a': 0, 'barrel_b': 0, 'skip': []}
for path, names in files_def.items():
    if MODE_BARREL:
        break
    try:
        s = open(path).read()
    except FileNotFoundError:
        stats['skip'].append((path, 'missing')); continue
    lines = s.split('\n')
    n_new = set()
    for i, ln in enumerate(lines):
        for name in names:
            if name in n_new:
                continue
            new, ok = strip_export_keyword(ln)
            if ok:
                lines[i] = new
                n_new.add(name)
                stats['def_a'] += 1
    if n_new and not DRY:
        open(path, 'w').write('\n'.join(lines))

for path, names in files_barrel.items():
    if MODE_DEF:
        break
    try:
        s = open(path).read()
    except FileNotFoundError:
        continue
    new_s, changed = remove_from_named_list(s, '|'.join(names) if False else names[0]) if False else (s, False)
    # 逐名字处理（同一 barrel 可能引用多个名字）
    new_s = s
    for name in names:
        new_s, changed = remove_from_named_list(new_s, name)
        if changed:
            stats['barrel_b'] += 1
    if changed and not DRY:
        open(path, 'w').write(new_s)

print(f"def 去 export: {stats['def_a']}, barrel 删项: {stats['barrel_b']}, 跳过: {stats['skip']}")
