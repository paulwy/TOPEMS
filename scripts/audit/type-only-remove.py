#!/usr/bin/env python3
"""
TYPE-only remove script v1.

Input : type-only-by-dir.json bucket → by key "dir" (e.g. "types")
        OR explicit defFile+name pairs in a JSON list like:
          [ { "defFile": "...", "name": "Foo" }, ... ]

Actions per NAME in defFile:
  A) Interface: '-export interface NAME' → '+interface NAME'
  B) Type alias: '-export type NAME ='  → '+type NAME ='
  C) Enum:       '-export enum NAME {'  → '+enum NAME {'
  D) Aggregate export block (local):
        'export type { NAME, ... }'  → remove NAME, drop block if empty
        'export { type NAME, ... }'  → remove NAME, drop block if empty
  E) Barrel repair: for each index.ts re-export, remove NAME from its
     'export type { NAME, ... } from ...' / 'export { type NAME, ... } from ...'

Usage:
  python3 scripts/audit/type-only-remove.py <--dir types|--json scripts/audit/types-pilot.json>
"""
import json, re, sys, argparse
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[2]

def load_candidates(args):
    if args.dir:
        bucket = json.load(open(ROOT/'scripts/audit/type-only-by-dir.json', encoding='utf-8'))
        lst = bucket.get(args.dir, [])
        if not lst:
            print(f"ERROR: dir '{args.dir}' bucket empty. Available dirs: {sorted(bucket.keys())}")
            sys.exit(2)
        print(f"Loaded {len(lst)} candidates from bucket dir={args.dir}")
        return [{'defFile': c['defFile'], 'name': c['name'],
                 'level': c.get('level',''),
                 'sampleRefs': c.get('sampleRefs',[])} for c in lst]
    else:
        lst = json.load(open(args.json, encoding='utf-8'))
        print(f"Loaded {len(lst)} candidates from {args.json}")
        return lst

def remove_type_export_from_body(src: str, name: str) -> str:
    """Remove standalone 'export ' keyword before interface/type/enum NAME.
    Also handle:
      - export { type NAME }       (local re-export without from)
      - export type { NAME }       (local re-export without from)
    Returns (new_src, changed_bool).
    """
    original = src
    lines = src.split('\n'); changed = False
    out = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        # A/B/C standalone
        m = re.match(r'^(\s*)export\s+(interface|type|enum)\s+(' + re.escape(name) + r'\b.*)$', ln)
        if m:
            out.append(f"{m.group(1)}{m.group(2)} {m.group(3)}")
            changed = True; i += 1; continue
        # D1: export type { NAME, ... }
        m = re.match(r'^(\s*)export\s+type\s*\{([^}]*)\}\s*;?\s*$', ln)
        if m and re.search(r'\b' + re.escape(name) + r'\b', m.group(2)):
            items = [x.strip() for x in m.group(2).split(',') if x.strip()]
            items2 = [x for x in items if re.sub(r'\s+as\s+\w+$', '', x).strip() != name]
            if not items2:
                changed = True; i += 1; continue  # drop empty line
            new_line = f"{m.group(1)}export type {{ {', '.join(items2)} }};"
            out.append(new_line.rstrip(';') if not m.group(0).endswith(';') else new_line)
            changed = True; i += 1; continue
        # D2: export { type NAME, ..., X, Y }  (inline 'type' modifier before NAME)
        m = re.match(r'^(\s*)export\s*\{([^}]*)\}\s*;?\s*$', ln)
        if m:
            body = m.group(2)
            # Match 'type NAME' as item (with possible 'type NAME as Alias')
            items = [x.strip() for x in body.split(',') if x.strip()]
            filtered = []; touched = False
            for it in items:
                core = it
                if core.startswith('type '):
                    n = re.match(r'type\s+(\w+)(?:\s+as\s+\w+)?$', core)
                    if n and n.group(1) == name:
                        touched = True; continue
                filtered.append(it)
            if touched:
                changed = True
                if not filtered:
                    i += 1; continue
                sep = m.group(0).endswith(';')
                new = f"{m.group(1)}export {{ {', '.join(filtered)} }}"
                out.append((new + ';') if sep else new)
                i += 1; continue
        out.append(ln); i += 1
    result = '\n'.join(out)
    return result, (result != original)

def repair_barrel_file(src: str, name: str) -> str:
    """Remove NAME from any re-export block:
         export { type NAME, ... } from '...'
         export type { NAME, ... } from '...'
       (and barrel re-exports of interface/type/enum names.)
    Returns (new_src, changed_bool).
    """
    original = src
    lines = src.split('\n'); changed = False; out = []; i = 0
    while i < len(lines):
        ln = lines[i]
        # Strip inline comments for pattern match (but keep original for rewrite)
        code = ln.split('//')[0]
        # 1: export type { ... } from '...'
        m = re.match(r'^(\s*)export\s+type\s*\{([^}]*)\}\s*(from\s+[^;]+;?)\s*$', code)
        if m and re.search(r'\b' + re.escape(name) + r'\b', m.group(2)):
            items = [x.strip() for x in m.group(2).split(',') if x.strip()]
            items2 = [x for x in items if re.sub(r'\s+as\s+\w+$','',x).strip() != name]
            changed = True; i += 1
            if not items2: continue
            new = f"{m.group(1)}export type {{ {', '.join(items2)} }} {m.group(3)}"
            out.append(new.rstrip(';') if not ln.rstrip().endswith(';') else new)
            continue
        # 2: export { type NAME, X, Y } from '...'
        m = re.match(r'^(\s*)export\s*\{([^}]*)\}\s*(from\s+[^;]+;?)\s*$', code)
        if m and (re.search(r'\btype\s+' + re.escape(name) + r'\b', m.group(2)) or re.search(r'\b' + re.escape(name) + r'\b', m.group(2))):
            body = m.group(2)
            items = [x.strip() for x in body.split(',') if x.strip()]
            filtered = []; touched = False
            for it in items:
                core = it
                # explicit type modifier: 'type NAME' → matches NAME
                if core.startswith('type '):
                    n = re.match(r'type\s+(\w+)(?:\s+as\s+\w+)?$', core)
                    if n and n.group(1) == name: touched = True; continue
                else:
                    # NAME only (as type-only? only remove if the export was typed... conservative: check if NAME matches)
                    # Actually in modern TS you can write 'export { T }' and T is a type — the scanner has filtered them as TYPE-only.
                    # We must remove NAME from both type and non-type prefix positions.
                    base = re.sub(r'\s+as\s+\w+$', '', core).strip()
                    if base == name:
                        touched = True; continue
                filtered.append(it)
            if touched:
                changed = True; i += 1
                if not filtered: continue
                new = f"{m.group(1)}export {{ {', '.join(filtered)} }} {m.group(3)}"
                out.append(new.rstrip(';') if not ln.rstrip().endswith(';') else new)
                continue
        out.append(ln); i += 1
    result = '\n'.join(out)
    return result, (result != original)

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--dir', help='bucket dir name in type-only-by-dir.json')
    g.add_argument('--json', help='JSON list path')
    args = ap.parse_args()

    cands = load_candidates(args)

    # Group by defFile
    by_def = defaultdict(list)
    all_barrels = set()
    for c in cands:
        by_def[c['defFile']].append(c['name'])
        for r in c.get('sampleRefs', []) or []:
            if r.endswith('.ts') or r.endswith('.tsx'):
                if '/index.' in r.split('/')[-1] or r.split('/')[-1].startswith('index.'):
                    all_barrels.add(r)

    print(f"Unique def files: {len(by_def)}")
    print(f"Barrel files to repair: {len(all_barrels)}")

    def_touched = 0; def_changes = 0
    for df, names in by_def.items():
        p = ROOT/df if not Path(df).is_absolute() else Path(df)
        if not p.exists(): continue
        src = p.read_text(encoding='utf-8')
        orig = src; any_changed = False
        for nm in names:
            src, changed = remove_type_export_from_body(src, nm)
            if changed: any_changed = True
        if any_changed and src != orig:
            p.write_text(src, encoding='utf-8')
            def_changes += 1
            def_touched += sum(1 for nm in names if nm in src or nm in orig)  # rough
    print(f"Def files changed: {def_changes}")

    # Barrel repair (any barrel in apps/web/src that re-exports these names)
    # Do brute force scan of index files to avoid missing barrel chains.
    bar_touched = 0; bar_changes = 0
    web_src = ROOT/'apps/web/src'
    all_names_set = {c['name'] for c in cands}
    idx_files = sorted(str(p.relative_to(ROOT)) for p in web_src.rglob('index.ts') if 'node_modules' not in str(p))
    idx_files += sorted(str(p.relative_to(ROOT)) for p in web_src.rglob('index.tsx') if 'node_modules' not in str(p))
    for rel in idx_files:
        p = ROOT/rel
        src = p.read_text(encoding='utf-8'); orig = src
        any_changed = False
        for nm in all_names_set:
            src, changed = repair_barrel_file(src, nm)
            if changed: any_changed = True
        if any_changed and src != orig:
            p.write_text(src, encoding='utf-8')
            bar_changes += 1
    print(f"Barrel files repaired: {bar_changes}")
    print("Done.")

if __name__ == '__main__':
    main()
