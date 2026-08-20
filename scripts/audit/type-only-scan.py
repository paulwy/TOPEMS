#!/usr/bin/env python3
"""
TYPE-only dead chain scanner & executor prep for apps/web.

Filters:
- L1 entries:  anyTypeExport=True, anyValueExport=False, refCount==0
- L2 entries:  anyTypeExport=True, anyValueExport=False

Strict barrel-local-usage strip comments/strings test:
  For every L2 TYPE-only chain (sampleRefs are barrel files), we open each
  barrel ref file, strip comments + strings, then look for the exported NAME
  OUTSIDE of aggregate import/export type blocks. If found => ALIVE (type used
  to construct a namespace/aggregate), skip.

Output:
  scripts/audit/type-only-final.json     → list of (defFile, name, level, barrelRefs[])
  scripts/audit/type-only-by-dir.json    → bucketed by apps/web/src/<TOP>/
"""
import json, re
from pathlib import Path
from collections import defaultdict, Counter

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT/'scripts/audit/ts-unused-exports-report.json'

report = json.load(open(REPORT, encoding='utf-8'))
L1 = report['L1']
L2 = report['L2']

def strip_comments_and_strings(src):
    out = []; i = 0; N = len(src)
    while i < N:
        c = src[i]
        if c == '/' and i+1 < N and src[i+1] == '/':
            while i < N and src[i] != '\n': i += 1
            continue
        if c == '/' and i+1 < N and src[i+1] == '*':
            i += 2
            while i+1 < N and not (src[i] == '*' and src[i+1] == '/'): i += 1
            i += 2
            continue
        if c in ('"', "'", '`'):
            q = c; i += 1
            while i < N:
                if src[i] == '\\': i += 2; continue
                if src[i] == q: i += 1; break
                i += 1
            continue
        out.append(c); i += 1
    return ''.join(out)

def first_def_file_in_appsweb(defFiles):
    for d in defFiles:
        if 'apps/web/src/' in d:
            return d
    return defFiles[0] if defFiles else None

def topdir(defFile):
    m = re.search(r'apps/web/src/([^/]+)/', defFile)
    return m.group(1) if m else '(root)'

# ============================================================
# 1) Collect TYPE-only candidates with barrel-ref evidence
# ============================================================
cands = []  # list of dicts
for lst, level in [(L1,'L1'), (L2,'L2')]:
    for e in lst:
        if not e.get('anyTypeExport'): continue
        if e.get('anyValueExport'): continue   # mixed VALUE+TYPE: skip
        if level == 'L1' and e.get('refCount', -1) != 0: continue   # L1 needs refCount==0
        df = first_def_file_in_appsweb(e.get('defFiles', []))
        if not df: continue
        name = e.get('name')
        if not name: continue
        sampleRefs = e.get('sampleRefs') or []
        # Normalize sampleRefs (L2 uses dicts sometimes)
        refs = []
        for r in sampleRefs:
            if isinstance(r, str): refs.append(r)
            elif isinstance(r, dict): refs.append(r.get('file',''))
        cands.append({
            'level': level,
            'name': name,
            'defFile': df,
            'topDir': topdir(df),
            'refCount': e.get('refCount', -1),
            'sampleRefs': refs,
        })
print(f"TYPE-only candidate (L1+L2, no VALUE mixed, L1 refCount==0): {len(cands)}")

# ============================================================
# 2) Strict barrel-local-usage filter for the barrel chain ones
#    For entries where all sampleRefs look like index barrels → check.
# ============================================================
def looks_like_barrel(fp):
    if not fp: return False
    base = Path(fp).name
    return base.startswith('index.ts')

alive_barrel = []
final = []
for c in cands:
    barrel_refs = [r for r in c['sampleRefs'] if looks_like_barrel(r)]
    if barrel_refs:
        # Check each barrel: does NAME appear outside aggregate import/export lines?
        found = False
        for br in barrel_refs:
            p = ROOT/br if not Path(br).is_absolute() else Path(br)
            if not p.exists(): continue
            src = p.read_text(encoding='utf-8')
            stripped = strip_comments_and_strings(src)
            # Remove aggregate import/export lines: lines that are only 'import { ... } from' / 'export { ... } from' / 'export type { ... } from'
            # Simpler approach: remove whole-lines that start with 'import type ', 'import ', 'export type ', 'export ' and contain 'from'
            cleaned = []
            for ln in stripped.split('\n'):
                s = ln.strip()
                if not s: continue
                if re.match(r'^(?:import|export)(?:\s+type)?\s*\{[^}]*\}\s*from\b', s): continue
                if re.match(r'^(?:import|export)(?:\s+type)?\s+\*\s+as\s+\w+\s+from\b', s): continue
                if re.match(r'^(?:import|export)(?:\s+type)?\s+default\b', s): continue
                cleaned.append(ln)
            hay = '\n'.join(cleaned)
            # Match word boundary NAME
            if re.search(r'\b' + re.escape(c['name']) + r'\b', hay):
                found = True
                c['barrel_evidence'] = str(br).replace(str(ROOT)+'/','')
                break
        if found:
            alive_barrel.append(c)
            continue
    final.append(c)

print(f"\nStrict filter: ALIVE by barrel-local type usage: {len(alive_barrel)}")
print(f"Strict filter: DEAD (TYPE-only chains to clean)       : {len(final)}")

bydir = Counter(c['topDir'] for c in final)
print(f"\nDEAD by top dir:")
for k,v in sorted(bydir.items(), key=lambda x:-x[1]): print(f"  {k:25s} {v:5d}")

# Save
(ROOT/'scripts/audit/type-only-final.json').write_text(json.dumps(final, indent=2, ensure_ascii=False), encoding='utf-8')
(ROOT/'scripts/audit/type-only-alive-barrel.json').write_text(json.dumps(alive_barrel, indent=2, ensure_ascii=False), encoding='utf-8')

# Bucket by dir
bucket = defaultdict(list)
for c in final:
    bucket[c['topDir']].append(c)
out_bucket = {k: sorted(v, key=lambda x: (x['defFile'], x['name'])) for k,v in bucket.items()}
(ROOT/'scripts/audit/type-only-by-dir.json').write_text(json.dumps(out_bucket, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"\nSaved: scripts/audit/type-only-final.json ({len(final)} entries)")
print(f"Saved: scripts/audit/type-only-by-dir.json   ({len(out_bucket)} dir buckets)")
print(f"Saved: scripts/audit/type-only-alive-barrel.json ({len(alive_barrel)} entries skipped)")
