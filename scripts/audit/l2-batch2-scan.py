#!/usr/bin/env python3
"""L2-CAUTION Batch 2 scanner. Matches structured report (L1/L2 list of dicts)."""
import json, re
from pathlib import Path
from collections import Counter, defaultdict

ROOT = Path('.').resolve()
report = json.load(open(ROOT/'scripts/audit/ts-unused-exports-report.json', encoding='utf-8'))
L2 = report['L2']
print(f"L2 entries in report: {len(L2)}")

# === strip helpers ===
def strip_comments_and_strings(src):
    out = []
    i = 0; N = len(src)
    while i < N:
        c = src[i]
        if c == '/' and i+1 < N and src[i+1] == '/':
            while i < N and src[i] != '\n': i += 1
            continue
        if c == '/' and i+1 < N and src[i+1] == '*':
            i += 2
            while i+1 < N and not (src[i] == '*' and src[i+1] == '/'): i += 1
            if i+1 < N: i += 2
            continue
        if c == '`':
            i += 1
            while i < N and src[i] != '`':
                if src[i] == '\\' and i+1 < N: i += 2
                else: i += 1
            if i < N: i += 1
            out.append(' '); continue
        if c == "'":
            i += 1
            while i < N and src[i] != "'":
                if src[i] == '\\' and i+1 < N: i += 2
                else: i += 1
            if i < N: i += 1
            out.append(' '); continue
        if c == '"':
            i += 1
            while i < N and src[i] != '"':
                if src[i] == '\\' and i+1 < N: i += 2
                else: i += 1
            if i < N: i += 1
            out.append(' '); continue
        out.append(c); i += 1
    return ''.join(out)

def is_value_export_in_def(def_path, name):
    p = Path(def_path)
    if not p.exists(): return False
    try: text = p.read_text(encoding='utf-8')
    except: return False
    pc = rf'(?m)^export\s+(?:const|let|var|function|class)\s+{re.escape(name)}\b'
    pnb = rf'(?m)export\s*\{{[^\}}]*\b{re.escape(name)}\b'
    pd = rf'(?m)export\s+default\s+(?:const|let|var|function|class)\s+{re.escape(name)}\b'
    return bool(re.search(pc, text) or re.search(pnb, text) or re.search(pd, text))

def barrel_local_uses_name(ref, name):
    p = Path(ref)
    if not p.exists(): return False
    try: bt = p.read_text(encoding='utf-8')
    except: return False
    bt_s = strip_comments_and_strings(bt)
    # Remove aggregate import/export blocks
    bt_s = re.sub(r'(?:import|export)\s*(?:type\s+)?\{[^{}]*\}\s*from\s*[\'"][^\'"]*[\'"];?', ' ', bt_s, flags=re.DOTALL)
    bt_lines = []
    for ln in bt_s.split('\n'):
        s = ln.strip()
        if not s: continue
        if re.match(r'^(import|export)(\s|$)', s): continue
        bt_lines.append(ln)
    return bool(re.search(r'\b'+re.escape(name)+r'\b', '\n'.join(bt_lines)))

# === Flatten: each (defFile, name) pair is a candidate ===
candidates = []
for entry in L2:
    name = entry['name']
    # Only consider pure VALUE chains (not type export)
    if not entry.get('anyValueExport'): continue
    if entry.get('anyTypeExport'):
        # Mixed: at least one location has type export; may still have VALUE on another file.
        # Treat carefully: still inspect each defFile to see if it's value.
        pass
    for df in entry.get('defFiles', []):
        candidates.append({'fp': df, 'name': name, 'refs': entry.get('sampleRefs', []) or [],
                           'refCount': entry.get('refCount',0)})

print(f"VALUE candidate (defFile, name) pairs: {len(candidates)}")
# Filter: refs are all barrels (to be L2-CAUTION strict)
def is_barrel(p): return Path(p).name in ('index.ts','index.tsx')
L2_VALUE = [x for x in candidates if x['refs'] and all(is_barrel(r) for r in x['refs'])]
print(f"L2 VALUE (barrel-only refs): {len(L2_VALUE)}")

ALIVE, DEAD, GONE = [], [], []
for x in L2_VALUE:
    if not is_value_export_in_def(x['fp'], x['name']):
        GONE.append(x); continue
    # Check barrel local usage (outside aggregate import/export statements)
    ev = [r for r in x['refs'] if barrel_local_uses_name(r, x['name'])]
    if ev: ALIVE.append((x, ev))
    else:  DEAD.append(x)

print(f"\n=== Strict Classification Current Code (Batch 1 done) ===")
print(f"  GONE  (no longer value-export in def): {len(GONE)}  (Batch 1 already removed)")
print(f"  ALIVE (barrel file locally uses NAME):  {len(ALIVE)}")
print(f"  DEAD  (pure barrel aggregate chain):    {len(DEAD)}")

if DEAD:
    d = Counter()
    for x in DEAD:
        top = x['fp'].replace('apps/web/src/','').split('/')[0]
        d[top] += 1
    print(f"\nDEAD by dir:")
    for k,v in sorted(d.items(), key=lambda x:-x[1]): print(f"  {k:25s} {v:4d}")
    tgts = defaultdict(list); chains = []
    for x in DEAD:
        tgts[x['fp']].append(x['name'])
        chains.append({'def_file': x['fp'], 'name': x['name'], 'barrel_refs': x['refs']})
    out = {'strategy':'L2-CAUTION','round':'batch2','total_exports':len(DEAD),
           'total_def_files':len(tgts),'targets':dict(sorted(tgts.items())),'chains':chains}
    (ROOT/'scripts/audit/l2-batch2-final.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\nSaved → scripts/audit/l2-batch2-final.json")
    for x in DEAD:
        rel = x['fp'].replace('apps/web/src/','')
        print(f"  {rel:60s} :: {x['name']}")
else:
    print("\n🎯 No L2-CAUTION VALUE dead chains remain. Batch 2 is EMPTY — L2 cleanup done.")

# Also save alive snapshot for audit
if ALIVE:
    alive_snap = [{'def_file':x['fp'],'name':x['name'],'barrel_evidence':e[0] if e else None} for x,e in ALIVE]
    (ROOT/'scripts/audit/l2-alive-barrel-usage.json').write_text(json.dumps(alive_snap, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\nSaved {len(ALIVE)} ALIVE entries (barrel local usage) → scripts/audit/l2-alive-barrel-usage.json")
