#!/usr/bin/env python3
"""权限码三端对账（FE / BE / DB）

扫描三处的 `<module>:<resource>:<action>` 权限码，输出差异分类，供 P3 权限码统一专项使用。

用法：
  python3 scripts/audit_permission_codes.py --summary
  python3 scripts/audit_permission_codes.py --json > /tmp/perm.json

分类口径：
  ① be_only      BE 校验声明但 FE 未引用（前端菜单/按钮可能缺约束）
  ② fe_only      FE 引用但 BE 未声明（前端引用不存在的码，或被 DB 授权兜底）
  ③ rename       归一化（去 _/-）后同义的命名不一致组
  ④ fe_orphan    FE 引用但 BE 与 DB 都没有（真正的前端孤儿权限码）

退出码恒为 0：本脚本只做对账报告，不拦截流水线。
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import sys
from collections import Counter, defaultdict
from typing import Dict, Iterable, List, Set, Tuple

CODE_RE = re.compile(r"""['"]([a-z][a-z0-9_]+):([a-z][a-z0-9_]*):([a-z][a-z0-9_]*)['"]""")

SKIP_MARKERS = ('/target/', '/node_modules/', '/dist/', '/.next/', '/__pycache__/')


def _iter_files(root: str, exts: Iterable[str]) -> Iterable[str]:
    for ext in exts:
        for path in glob.glob(f'{root}/**/*{ext}', recursive=True):
            if any(marker in path for marker in SKIP_MARKERS):
                continue
            yield path


def scan_codes(root: str, exts: Iterable[str], limit_per_code: int = 5) -> Dict[str, List[Tuple[str, int]]]:
    """返回 {code: [(file, line), ...]}，每个 code 最多保留 limit_per_code 条证据。"""
    found: Dict[str, List[Tuple[str, int]]] = defaultdict(list)
    for path in _iter_files(root, exts):
        try:
            with open(path, encoding='utf-8', errors='ignore') as handle:
                lines = handle.read().split('\n')
        except OSError:
            continue
        for lineno, line in enumerate(lines, 1):
            for match in CODE_RE.finditer(line):
                code = match.group(0)[1:-1]
                if len(found[code]) < limit_per_code:
                    found[code].append((path, lineno))
    return dict(found)


def normalize(code: str) -> str:
    """归一化 resource 段：去掉下划线/连字符，用于识别同义不同命名。"""
    module, resource, action = code.split(':')
    return f'{module}:{re.sub(r"[_\\-]", "", resource)}:{action}'


def classify(fe: Dict, be: Dict, db: Dict) -> Dict:
    fe_set, be_set, db_set = set(fe), set(be), set(db)
    be_valid = be_set | db_set

    be_only = sorted(be_set - fe_set)
    fe_only = sorted(fe_set - be_set)
    fe_orphan = sorted(fe_set - be_valid)
    db_only = sorted(db_set - fe_set - be_set)

    # ③ 命名不一致：对三端全集按归一化分组，组内出现多个确切写法即视为同义双码
    #    （典型：mes:workorder:read(BE) vs mes:work_order:read(DB+FE)）
    all_codes = be_set | db_set | fe_set
    by_norm: Dict[str, List[str]] = defaultdict(list)
    for code in sorted(all_codes):
        by_norm[normalize(code)].append(code)
    rename_groups = []
    for norm in sorted(by_norm.keys()):
        variants = by_norm[norm]
        if len(variants) < 2:
            continue
        sides = {}
        for variant in variants:
            sides[variant] = {
                'be': variant in be_set,
                'db': variant in db_set,
                'fe': variant in fe_set,
            }
        rename_groups.append({'normalized': norm, 'variants': sides})

    return {
        'counts': {
            'fe': len(fe_set),
            'be': len(be_set),
            'db': len(db_set),
            'both_fe_be': len(fe_set & be_set),
            'be_only': len(be_only),
            'fe_only': len(fe_only),
            'fe_orphan': len(fe_orphan),
            'db_only': len(db_only),
            'rename_groups': len(rename_groups),
        },
        'be_only': be_only,
        'fe_only': fe_only,
        'fe_orphan': fe_orphan,
        'db_only': db_only,
        'rename_groups': rename_groups,
        'module_distribution': {
            'fe_only': dict(Counter(c.split(':')[0] for c in fe_only).most_common()),
            'fe_orphan': dict(Counter(c.split(':')[0] for c in fe_orphan).most_common()),
            'be_only': dict(Counter(c.split(':')[0] for c in be_only).most_common()),
        },
        'evidence': {
            'fe_orphan': {c: fe.get(c, []) for c in fe_orphan[:80]},
            'rename_evidence': {
                variant: (be.get(variant) or db.get(variant) or fe.get(variant) or [])
                for group in rename_groups
                for variant in group['variants']
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='FE/BE/DB 权限码三端对账')
    parser.add_argument('--json', action='store_true', help='输出完整 JSON')
    parser.add_argument('--summary', action='store_true', help='仅输出统计摘要（默认）')
    parser.add_argument('--limit', type=int, default=5, help='每个码保留的证据条数')
    args = parser.parse_args()

    fe = scan_codes('apps/web/src', ('.ts', '.tsx'), args.limit)
    be = scan_codes('svc', ('.rs',), args.limit)
    db = scan_codes('database/init', ('.sql',), args.limit)
    db.update(scan_codes('database/migrations', ('.sql',), args.limit))

    report = classify(fe, be, db)

    if args.json:
        json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write('\n')
        return 0

    counts = report['counts']
    print('权限码三端对账')
    print(f"  FE {counts['fe']} | BE {counts['be']} | DB {counts['db']} | FE∩BE {counts['both_fe_be']}")
    print(f"  ① be_only {counts['be_only']}   ② fe_only {counts['fe_only']}   ④ fe_orphan {counts['fe_orphan']}   db_only {counts['db_only']}")
    print(f"  ③ 命名不一致组 {counts['rename_groups']}")
    for group in report['rename_groups'][:20]:
        parts = []
        for variant, sides in group['variants'].items():
            where = '/'.join(k.upper() for k, on in sides.items() if on)
            parts.append(f'{variant}({where})')
        print('    - ' + ' vs '.join(parts))
    if report['module_distribution']['fe_orphan']:
        print('  ④ fe_orphan 模块分布（前 10）:', dict(list(report['module_distribution']['fe_orphan'].items())[:10]))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
