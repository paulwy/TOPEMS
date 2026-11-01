#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_menu_consistency.py — TOPEMS 前端 navItems ↔ DB core_menus 菜单对账脚本（只读）

用途（审计整改 P1 对账机制）：
  1. 解析 apps/web/src/modules/<mod>/config.ts 的 navItems（code / path，path 变量引用解析）；
  2. 解析 database/migrations/20260724000005_seed_module_menus.sql 的 core_menus 种子（code / path）；
  3. 输出四类不一致：
     - orphan_FE：前端 navItem 在 DB 无对应 code（MENU_ORPHAN_FE）
     - orphan_DB：DB 种子在前端 navItems 无对应 code（MENU_ORPHAN_DB）
     - path_mismatch：同 code 前后端 path 不一致
     - dup_in_fe：同模块内 navItems code 重复
  4. --emit-sql 生成补种 SQL 草稿（orphan_FE 真实功能项补 core_menus；permission 以 <module>:read 占位，
     需人工按权限码统一专项校准；aps 等并入项以 --skip 模块排除）。

用法：
  python3 scripts/audit_menu_consistency.py                 # 控制台输出不一致清单（markdown 表格）
  python3 scripts/audit_menu_consistency.py --json          # 输出 JSON
  python3 scripts/audit_menu_consistency.py --emit-sql -o /tmp/backfill.sql   # 生成补种 SQL 草稿
  python3 scripts/audit_menu_consistency.py --skip aps erp  # 排除模块（迁移过渡期模块）

依赖：Python 3.8+ 标准库。只读，不修改任何项目文件。
"""
import re, os, sys, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODS_DIR = os.path.join(ROOT, "apps", "web", "src", "modules")
SEED_FILE = os.path.join(ROOT, "database", "migrations", "20260724000005_seed_module_menus.sql")


# ---------- 前端解析 ----------

def find_array(text, start_idx):
    start = text.find('[', start_idx)
    if start == -1:
        return None
    depth = 0
    i = start
    in_str = False
    while i < len(text):
        c = text[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c in ('"', "'"):
                in_str = False
            i += 1
            continue
        if c in ('"', "'"):
            in_str = True
            i += 1
            continue
        if c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
        i += 1
    return None


def split_elements(array_text):
    body = array_text[1:-1]
    elems = []
    depth = 0
    i = 0
    in_str = False
    start = 0
    while i < len(body):
        c = body[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c in ('"', "'"):
                in_str = False
            i += 1
            continue
        if c in ('"', "'"):
            in_str = True
            i += 1
            continue
        if c in '[{':
            depth += 1
        elif c in ']}':
            depth -= 1
        elif c == ',' and depth == 0:
            elems.append(body[start:i])
            start = i + 1
        i += 1
    if start < len(body):
        elems.append(body[start:])
    return [e.strip() for e in elems if e.strip()]


def grab_field(block, field):
    m = re.search(r'\b' + field + r'\s*:\s*["\']([^"\']*)["\']', block)
    if m:
        return m.group(1)
    m2 = re.search(r'\b' + field + r'\s*:\s*([A-Za-z_][A-Za-z0-9_.]*)', block)
    return m2.group(1) if m2 else None


def resolve_array(text, key):
    for m in re.finditer(r'\b' + key + r'\s*:', text):
        nxt = text[m.end():].lstrip()
        if nxt.startswith('['):
            return find_array(text, m.end())
        m2 = re.match(r'([A-Za-z_][A-Za-z0-9_]*)', nxt)
        if m2:
            var = m2.group(1)
            pat = re.compile(r'const\s+' + var + r'(?:\s*:\s*[^=]+)?\s*=\s*(\[)')
            fm = pat.search(text)
            if fm:
                return find_array(text, fm.start(1))
    return None


def resolve_path(text, raw, alt_text=None):
    """MES_PATHS.workStations → 常量对象内 workStations: '/mes/work-stations' → '/mes/work-stations'
    config.ts 内找不到时回退查找同模块 paths.ts（如 FINANCE_PATHS.*）。"""
    if raw and raw.startswith('/'):
        return raw
    m = re.match(r'([A-Za-z_][A-Za-z0-9_]*\.)([A-Za-z_][A-Za-z0-9_]*)', raw or '')
    if not m:
        return None
    key = m.group(2)
    for src in (text, alt_text or ''):
        fm = re.search(r'\b' + key + r'\s*:\s*["\']([^"\']+)["\']', src)
        if fm:
            return fm.group(1)
    return None


def parse_navitems(cfg_path):
    text = open(cfg_path, encoding='utf-8').read()
    mod_dir = os.path.dirname(cfg_path)
    alt_text = ''
    for cand in ('paths.ts', 'path.ts'):
        p = os.path.join(mod_dir, cand)
        if os.path.exists(p):
            alt_text = open(p, encoding='utf-8').read()
            break
    nav_arr = resolve_array(text, 'navItems')
    items = []
    if nav_arr:
        for elem in split_elements(nav_arr):
            code = grab_field(elem, 'code')
            raw_path = grab_field(elem, 'path')
            if not code:
                continue
            path = resolve_path(text, raw_path, alt_text) if raw_path else None
            items.append({
                'code': code,
                'path': path,
                'rawPath': raw_path,
                'group': grab_field(elem, 'group'),
                'labelKey': grab_field(elem, 'labelKey') or grab_field(elem, 'label'),
                'icon': grab_field(elem, 'icon'),
            })
    return items


def zh_name_for(mod, label_key):
    """'mes.nav.mes-work-stations' 或 i18n.t('mes.nav.xxx') → apps/web/src/i18n/locales/zh/<mod>.json 中文名"""
    if not label_key:
        return None
    m = re.search(r"i18n\.t\('([^']+)'\)", label_key)
    if m:
        label_key = m.group(1)
    try:
        path = os.path.join(ROOT, 'apps', 'web', 'src', 'i18n', 'locales', 'zh', mod + '.json')
        text = open(path, encoding='utf-8').read()
        m = re.search(r'"' + re.escape(label_key) + r'"\s*:\s*"([^"]*)"', text)
        return m.group(1) if m else None
    except OSError:
        return None


# ---------- DB 种子解析 ----------

def parse_seed(seed_path):
    """core_menus VALUES 行: ('code', 'name', 'icon', sort, 'path', 'permission', 'group_code')"""
    items = []
    text = open(seed_path, encoding='utf-8').read()
    pat = re.compile(r"\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\d+,\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)")
    for m in pat.finditer(text):
        items.append({'code': m.group(1), 'name': m.group(2), 'path': m.group(4),
                      'permission': m.group(5), 'group': m.group(6)})
    return items


def parse_backfill(sql_path):
    """补种迁移 VALUES 行: ('name', 'code', 'icon', sort, 'path', 'permission', 'group_code')"""
    items = []
    text = open(sql_path, encoding='utf-8').read()
    pat = re.compile(r"\('([^']*)',\s*'([^']+)',\s*'([^']+)',\s*\d+,\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)")
    for m in pat.finditer(text):
        items.append({'code': m.group(2), 'name': m.group(1), 'path': m.group(4),
                      'permission': m.group(5), 'group': m.group(6)})
    # UPDATE core_menus SET path='...' ... AND code = '...' 形式的路径同步迁移
    upd = re.compile(r"UPDATE core_menus\s+SET\s+path\s*=\s*'([^']+)'[\s\S]*?code\s*=\s*'([^']+)'", re.I)
    for m in upd.finditer(text):
        matched = [it for it in items if it['code'] == m.group(2)]
        if matched:
            matched[0]['path'] = m.group(1)
        else:
            items.append({'code': m.group(2), 'name': m.group(2), 'path': m.group(1),
                          'permission': '', 'group': ''})
    return items


# ---------- 主流程 ----------

def audit(skip_mods=None, backfill_files=None):
    skip_mods = set(skip_mods or [])
    fe_by_mod = {}
    fe_all = {}
    for cfg in sorted(glob.glob(os.path.join(MODS_DIR, '*', 'config.ts'))):
        mod = os.path.basename(os.path.dirname(cfg))
        if mod in skip_mods:
            continue
        items = parse_navitems(cfg)
        fe_by_mod[mod] = items
        for it in items:
            it['name'] = zh_name_for(mod, it['labelKey'])
            fe_all[it['code']] = {'module': mod, **it}
    seed_items = parse_seed(SEED_FILE)
    seed_by_code = {}
    groups_by_mod = {}
    for it in seed_items:
        seed_by_code.setdefault(it['code'], it)
        mod = it['group'].split('_')[0]
        groups_by_mod.setdefault(mod, set()).add(it['group'])
    backfill_count = 0
    for bf in backfill_files or []:
        for it in parse_backfill(bf):
            if it['code'] in seed_by_code:
                seed_by_code[it['code']]['path'] = it['path']
            else:
                seed_by_code[it['code']] = it
            if it['group']:
                mod = it['group'].split('_')[0]
                groups_by_mod.setdefault(mod, set()).add(it['group'])
            backfill_count += 1

    orphan_fe = []   # 前端有 DB 无
    orphan_db = []   # DB 有前端无
    path_mismatch = []
    dup_fe = []
    seen = set()
    for mod, items in fe_by_mod.items():
        for it in items:
            if it['code'] in seen:
                dup_fe.append({'module': mod, 'code': it['code'], 'path': it['path']})
            seen.add(it['code'])
            if it['code'] not in seed_by_code:
                orphan_fe.append({'module': mod, 'code': it['code'], 'path': it['path'],
                                  'rawPath': it['rawPath'], 'group': it['group'],
                                  'name': it.get('name'), 'icon': it.get('icon')})
            else:
                s = seed_by_code[it['code']]
                if it['path'] and s['path'] and it['path'] != s['path']:
                    path_mismatch.append({'module': mod, 'code': it['code'],
                                          'fePath': it['path'], 'dbPath': s['path']})
    for code, s in seed_by_code.items():
        if code not in fe_all:
            orphan_db.append({'code': code, 'name': s['name'], 'path': s['path'],
                              'permission': s['permission'], 'group': s['group']})

    return {
        'modules': sorted(fe_by_mod.keys()),
        'navItemCount': len(fe_all),
        'seedCount': len(seed_by_code),
        'backfillCount': backfill_count,
        'groups_by_mod': {k: sorted(v) for k, v in groups_by_mod.items()},
        'orphan_fe': orphan_fe,
        'orphan_db': orphan_db,
        'path_mismatch': path_mismatch,
        'dup_fe': dup_fe,
    }


GROUP_SUFFIX_MAP = {'business': 'business', 'master': 'master', 'process': 'process',
                     'analytics': 'analytics', 'overview': 'overview', 'setting': 'business'}


def group_for(mod, fe_group, groups):
    suffix = GROUP_SUFFIX_MAP.get(fe_group, 'business')
    cand = f"{mod}_{suffix}"
    if cand in groups:
        return cand
    if f"{mod}_business" in groups:
        return f"{mod}_business"
    return None


def emit_sql(a, backfill_mods=None):
    """为 orphan_FE 生成补种 SQL 草稿（--backfill 指定模块；权限以 <module>:read 占位待校准）。"""
    if backfill_mods:
        items = [x for x in a['orphan_fe'] if x['module'] in backfill_mods]
    else:
        items = a['orphan_fe']
    mods = sorted(set(x['module'] for x in items))
    if not mods:
        return '-- 无待补种孤儿项'
    lines = []
    lines.append('-- ============================================================')
    lines.append('-- 审计整改 P1：MENU_ORPHAN_FE 补种（audit_menu_consistency.py 自动生成草稿）')
    lines.append('-- 注意：permission 以 <module>:read 占位，须按权限码统一专项校准；')
    lines.append('--       name 来自前端 i18n zh 文案，无法解析处回退为 code。')
    lines.append('-- ============================================================')
    for mod in mods:
        mod_items = [x for x in items if x['module'] == mod]
        groups = a['groups_by_mod'].get(mod, set())
        lines.append('')
        lines.append(f"-- {mod}（{len(mod_items)} 项）")
        lines.append("INSERT INTO core_menus (tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)")
        lines.append("SELECT '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)")
        lines.append("FROM (VALUES")
        rows = []
        for i, it in enumerate(mod_items):
            gcode = group_for(mod, it['group'], groups)
            if gcode is None:
                print(f"[warn] {mod}/{it['code']} 无可用菜单组，跳过（模块种子组为空）", file=sys.stderr)
                continue
            name = (it.get('name') or it['code']).replace("'", "''")
            icon = it.get('icon') or 'CircleDot'
            perm = f"{mod}:read"
            path = it['path'] or f"/{mod}/#TBD#"
            rows.append(f"    ('{name}', '{it['code']}', '{icon}', {100 + i}, '{path}', '{perm}', '{gcode}')")
        if not rows:
            continue
        lines.append(',\n'.join(rows))
        lines.append(f") AS v(name, code, icon, sort_order, path, permission, group_code)")
        lines.append("JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'")
        lines.append("ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;")
    return '\n'.join(lines)


def fmt_md(a):
    L = []
    L.append(f"## 菜单对账结果（{a['navItemCount']} navItems / {a['seedCount']} DB 种子）")
    L.append("")
    L.append(f"### orphan_FE（前端有 DB 无，{len(a['orphan_fe'])} 项）")
    L.append("")
    L.append("| 模块 | code | path | group |")
    L.append("|---|---|---|---|")
    for x in sorted(a['orphan_fe'], key=lambda y: y['module']):
        L.append(f"| {x['module']} | {x['code']} | {x['path'] or x['rawPath']} | {x['group'] or '-'} |")
    L.append("")
    L.append(f"### orphan_DB（DB 有前端无，{len(a['orphan_db'])} 项）")
    L.append("")
    L.append("| code | name | path | permission |")
    L.append("|---|---|---|---|")
    for x in sorted(a['orphan_db'], key=lambda y: y['code']):
        L.append(f"| {x['code']} | {x['name']} | {x['path']} | {x['permission']} |")
    L.append("")
    L.append(f"### path_mismatch（同 code 路径不一致，{len(a['path_mismatch'])} 项）")
    L.append("")
    L.append("| 模块 | code | 前端 path | DB path |")
    L.append("|---|---|---|---|")
    for x in sorted(a['path_mismatch'], key=lambda y: y['module']):
        L.append(f"| {x['module']} | {x['code']} | {x['fePath']} | {x['dbPath']} |")
    L.append("")
    L.append(f"### dup_in_fe（同模块 navItems code 重复，{len(a['dup_fe'])} 项）")
    L.append("")
    for x in sorted(a['dup_fe'], key=lambda y: y['module']):
        L.append(f"- {x['module']}: {x['code']} ({x['path']})")
    return '\n'.join(L)


def main():
    args = sys.argv[1:]
    skip = []
    if '--skip' in args:
        i = args.index('--skip')
        skip = args[i + 1:]
        args = args[:i]
    backfill = None
    if '--backfill' in args:
        i = args.index('--backfill')
        backfill = set(args[i + 1].split(','))
        args = args[:i] + args[i + 2:]
    with_backfill = []
    while '--with-backfill' in args:
        i = args.index('--with-backfill')
        with_backfill.append(args[i + 1])
        args = args[:i] + args[i + 2:]
    a = audit(skip_mods=skip, backfill_files=with_backfill)
    if '--json' in args:
        print(json.dumps(a, ensure_ascii=False, indent=1))
    elif '--emit-sql' in args:
        sql = emit_sql(a, backfill_mods=backfill)
        if '-o' in args:
            oi = args.index('-o')
            out = args[oi + 1]
            open(out, 'w', encoding='utf-8').write(sql)
            print(f"SQL 草稿已写入 {out}（{backfill or '全部'} 模块孤儿补种）")
        else:
            print(sql)
    else:
        print(fmt_md(a))


if __name__ == '__main__':
    main()
