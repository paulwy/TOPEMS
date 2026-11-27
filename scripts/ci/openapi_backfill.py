#!/usr/bin/env python3
"""给指定 crate 里"路由已挂、注解缺失"的 handler 批量补 `#[utoipa::path]`，并登记到该 crate 的 OpenApi paths 清单。

思路（与第 20/21 轮 ERP 同源）：
1. 解析 crate 内所有 `.route("path", get(h).post(h2))`（括号配对，不用脆弱正则）。
2. 解析已有 `#[utoipa::path(...)]`，拿到 method + path。
3. 对"既有路由、又有注解"的 handler 反推该文件的路径前缀（注解 path 去掉 route path 的部分），
   统计多数前缀 → 用它给同文件里缺注解的 handler 生成 path。
4. 缺注解的 handler 插入注解；已注解但登记缺失的，追加到 OpenApi 的 paths(...)。

用法：
  python3 scripts/ci/openapi_backfill.py --crate svc/unified-core --openapi svc/unified-core/src/modules/openapi.rs --filter modules/iam --dry-run
  python3 scripts/ci/openapi_backfill.py --crate svc/unified-core --openapi svc/unified-core/src/modules/openapi.rs --filter modules/iam
"""
import argparse
import os
import re
from collections import Counter, defaultdict

METHODS = ('get', 'post', 'put', 'delete', 'patch')


def balanced(s, i):
    """s[i] == '(' ，返回 (内容, 结束下标)"""
    d = 0
    for j in range(i, len(s)):
        if s[j] == '(':
            d += 1
        elif s[j] == ')':
            d -= 1
            if d == 0:
                return s[i + 1:j], j
    return s[i + 1:], len(s)


def parse_routes(text):
    out = []
    for m in re.finditer(r'\.route\s*\(', text):
        body, _ = balanced(text, text.index('(', m.start()))
        pm = re.match(r'\s*"([^"]+)"\s*,\s*', body)
        if not pm:
            continue
        route = pm.group(1)
        chain = body[pm.end():]
        base = m.start() + len('.route(') + (len(body) - len(chain))
        for cm in re.finditer(r'\b(get|post|put|delete|patch)\s*\(\s*([A-Za-z0-9_:]+)', chain):
            h = cm.group(2).split('::')[-1]
            out.append((route, cm.group(1), h, base + cm.start()))
    return out


def parse_annotations(text):
    """返回 {fn_name: (method, path)}"""
    out = {}
    for m in re.finditer(r'#\[utoipa::path\s*\(', text):
        body, end = balanced(text, text.index('(', m.start()))
        meth = None
        for k in METHODS:
            if re.match(r'\s*%s\s*,' % k, body):
                meth = k
                break
        pm = re.search(r'path\s*=\s*"([^"]+)"', body)
        if not meth or not pm:
            continue
        after = text[end:]
        fm = re.search(r'(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)', after)
        if not fm:
            continue
        out[fm.group(1)] = (meth, pm.group(1))
    return out


def module_path(file_rel):
    p = file_rel.replace('.rs', '').replace(os.sep, '::')
    if p == 'lib':
        return 'crate'
    if p == 'main':
        return None
    if p.endswith('::mod'):
        p = p[: -len('::mod')]
    if p.startswith('modules::'):
        return 'crate::' + p
    return 'crate::' + p


def block_index(text, offset):
    starts = [m.start() for m in re.finditer(r'Router::new\s*\(', text)]
    idx = 0
    for k, st in enumerate(starts):
        if st <= offset:
            idx = k
        else:
            break
    return idx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--crate', required=True)
    ap.add_argument('--openapi', required=True)
    ap.add_argument('--filter', default='', help='只处理定义文件路径包含该串的 handler')
    ap.add_argument('--routes-filter', default='', help='只从路径包含该串的文件里抓 .route()')
    ap.add_argument('--routes-extra', default='', help='额外的路由文件（逗号分隔，可为其他 crate）')
    ap.add_argument('--accept-new', action='store_true', help='允许写入（默认 dry-run 语义需显式 --apply）')
    ap.add_argument('--apply', action='store_true', help='真正写盘')
    ap.add_argument('--force-prefix', default='', help='不猜前缀，统一用此前缀（如 /finance）')
    ap.add_argument('--min-votes', type=int, default=1, help='前缀推断至少需要的票数，不足则跳过（防止空前缀乱写）')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    src_root = os.path.join(args.crate, 'src')
    all_files, route_files = [], []
    for dirpath, _, names in os.walk(src_root):
        for n in names:
            if not n.endswith('.rs'):
                continue
            full = os.path.join(dirpath, n)
            rel = os.path.relpath(full, src_root)
            norm = rel.replace(os.sep, '/')
            all_files.append((full, norm))
            if not args.routes_filter or args.routes_filter in norm:
                route_files.append((full, norm))
    files = all_files

    to_register = set()
    stats = Counter()
    prefix_votes = defaultdict(Counter)   # route-file -> Counter(prefix)
    route_map = defaultdict(list)         # handler -> [(route, method, route_file)]
    defs = {}                             # handler -> (def_file, ann|None)
    texts = {}
    anns = {}

    for full, rel in files:
        t = open(full).read()
        texts[rel] = t
        anns[rel] = parse_annotations(t)
    for full, rel in route_files:
        for route, meth, h, off in parse_routes(texts[rel]):
            route_map[h].append((route, meth, rel, block_index(texts[rel], off)))
    for extra in [x for x in args.routes_extra.split(',') if x]:
        et = open(extra).read()
        texts['@' + extra] = et
        for route, meth, h, off in parse_routes(et):
            route_map[h].append((route, meth, '@' + extra, block_index(et, off)))
    dup_defs = set()
    for rel, t in texts.items():
        for h in anns.get(rel, {}):
            if h in defs and defs[h][0] != rel:
                dup_defs.add(h)
            defs.setdefault(h, (rel, anns[rel][h]))
        for fm in re.finditer(r'(?m)^pub\s+(?:async\s+)?fn\s+([A-Za-z0-9_]+)', t):
            h = fm.group(1)
            if h in defs and defs[h][0] != rel:
                dup_defs.add(h)
            defs.setdefault(h, (rel, None))

    # 反推前缀
    conflicts = []
    for h, entries in route_map.items():
        for route, meth, rel_routes, blk in entries:
            ann = defs.get(h, (None, None))[1]
            if not ann:
                continue
            ameth, apath = ann
            if ameth != meth:
                continue
            if apath.endswith(route):
                prefix = apath[: -len(route)]
                prefix_votes[(rel_routes, blk)][prefix] += 1
            else:
                conflicts.append((rel_routes, h, route, meth, ameth, apath))

    for (rel, blk), c in prefix_votes.items():
        if len(c) > 1:
            print(f'  [prefix 多解] {rel} block{blk}: {dict(c)}')

    to_add = defaultdict(list)   # rel -> [(handler, method, path)]
    for h, entries in route_map.items():
        rels = {(rel, blk) for _, _, rel, blk in entries}
        if len(rels) > 1:
            stats['skip_multi_block'] += 1
            continue
        rel_routes, blk = entries[0][2], entries[0][3]
        define_rel, ann = defs.get(h, (None, None))
        if define_rel is None or h in dup_defs:
            stats['no_def'] += 1
            continue
        if ann:
            stats['already_annotated'] += 1
            mod = module_path(define_rel)
            if mod:
                to_register.add('%s::%s' % (mod, h))
            continue
        if args.force_prefix:
            prefix = args.force_prefix
        else:
            c = prefix_votes.get((rel_routes, blk))
        if not args.force_prefix and (not c or sum(c.values()) < args.min_votes):
            stats['skip_no_prefix'] += 1
            continue
        prefix = c.most_common(1)[0][0]
        route, meth = entries[0][0], entries[0][1]
        to_add[define_rel].append((h, meth, prefix + route))

    print(f'扫描 {len(files)} 个文件，路由 handler {len(route_map)} 个')
    print(f'已注解 {stats["already_annotated"]}，跨块同名跳过 {stats["skip_multi_block"]}，无定义 {stats["no_def"]}，待补 {sum(len(v) for v in to_add.values())}')

    # 插入注解
    added_entries = []
    for rel, items in to_add.items():
        t = texts[rel]
        for h, meth, path in items:
            fm = re.search(r'(?m)^pub\s+(?:async\s+)?fn\s+%s\b' % re.escape(h), t)
            if not fm:
                continue
            idx = fm.start()
            j = t.rfind('\n', 0, idx) + 1
            if 'utoipa::path' in t[max(0, j - 400): j]:
                stats['skip_dup_ann'] += 1
                continue
            params = re.findall(r'\{([A-Za-z0-9_]+)\}', path)
            pblock = ''.join('        ("%s" = String, Path, description = "%s"),\n' % (p, p) for p in params)
            ann = (
                '#[utoipa::path(\n'
                '    %s,\n'
                '    security(("BearerAuth" = [])),\n'
                '    path = "%s",\n'
                '    tag = "Auto-Backfill",\n'
                '%s'
                '    responses((status = 200, description = "%s %s"), (status = 500, description = "服务内部错误")),\n'
                ')]\n'
            ) % (meth, path, ('    params(\n' + pblock + '    ),\n') if params else '', meth, path)
            t = t[:j] + ann + t[j:]
            mod = module_path(rel)
            if mod:
                added_entries.append('%s::%s' % (mod, h))
                to_register.add('%s::%s' % (mod, h))
        if not args.dry_run:
            open(os.path.join(args.crate, 'src', rel), 'w').write(t)

    print(f'插入注解 {sum(len(v) for v in to_add.values())} 个，登记候选 {len(added_entries)} 条')
    if conflicts:
        print(f'注解 path 与 route 不一致 {len(conflicts)} 条（未自动处理）：')
        for c in conflicts[:20]:
            print('   ', c)

    added_entries = sorted(set(added_entries) | to_register)
    if not args.apply or not added_entries:
        return

    # 登记到 openapi paths(...)
    ot = open(args.openapi).read()
    existing = set(re.findall(r'(?:crate::[A-Za-z0-9_:]+)', ot))
    new = [e for e in added_entries if e not in existing]
    anchor = '    paths(\n'
    if anchor in ot:
        block = ''.join('        %s,\n' % e for e in new)
        ot = ot.replace(anchor, anchor + '        // backfill: 路由已挂、此前未登记\n' + block, 1)
        open(args.openapi, 'w').write(ot)
    print(f'登记新增 {len(new)} 条（已在清单 {len(added_entries) - len(new)} 条）')


if __name__ == '__main__':
    main()
