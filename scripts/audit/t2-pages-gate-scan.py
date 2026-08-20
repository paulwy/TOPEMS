#!/usr/bin/env python3
"""
R0 + G1-G4 Gate 扫描器（保守模式 pages-only）。
严格按 docs/superpowers/specs/2026-08-20-t2-pages-test-slim-design.md §2 实现。
"""
import json, re, sys
from pathlib import Path
from collections import defaultdict, Counter

ROOT = Path('.').resolve()
PAGES = ROOT / 'apps/web/src/pages'
all_pages_tests = sorted([p for p in list(PAGES.rglob('*.test.ts')) + list(PAGES.rglob('*.test.tsx')) + list(PAGES.rglob('*.stories.ts')) + list(PAGES.rglob('*.stories.tsx'))])

def rel(p: Path) -> str: return str(p.relative_to(ROOT)).replace('\\', '/')

def is_ineligible_R0(path: Path, src: str) -> list[str]:
    """R0 硬不通过的拦截原因列表（空=通过R0进候选）"""
    reasons = []
    name = path.name
    if '.stories.' in name: reasons.append('R0: 文件是 stories (非测试)')
    subp = str(path.relative_to(PAGES))
    if '/hooks/__tests__/' in subp or subp.startswith('hooks/__tests__/'): reasons.append('R0: hooks/__tests__ 下的单元测试，不视为页面smoke')
    if '/components/__tests__/' in subp or subp.startswith('components/__tests__/'): reasons.append('R0: components/__tests__ 下的子组件单元测试')
    if re.search(r"import\s*\{[^}]*\brenderHook\b[^}]*\}\s*from\s+['\"]@testing-library/react['\"]", src): reasons.append('R0: 使用 renderHook，是 hook 单元测试')
    descs = len(re.findall(r'\bdescribe\s*\(', src))
    befores = len(re.findall(r'\bbeforeEach\s*\(', src))
    if descs >= 5 and befores >= 3: reasons.append(f'R0: describe={descs} beforeEach={befores}，是复杂单元测试非简单smoke')
    return reasons

def gate_G1(src: str) -> dict:
    lines = src.count('\n') + 1
    top_describes = len([m for m in re.finditer(r'^describe\s*\(', src, re.MULTILINE)])
    its = len(re.findall(r'(?<!\.)\bit\s*\(|\btest\s*\(', src))
    skipped = len(re.findall(r'\bit\.skip\s*\(|\bit\.todo\s*\(|\btest\.skip\s*\(|\btest\.todo\s*\(', src))
    real_its = its - skipped
    return {
        'pass': lines <= 80 and top_describes == 1 and real_its <= 2,
        'metrics': {'lines': lines, 'top_describes': top_describes, 'real_it_blocks': real_its, 'total_it_keyword': its, 'skipped_or_todo': skipped},
        'fails': ([f'lines={lines}>80'] if lines>80 else []) + ([f'top_describes={top_describes}!=1'] if top_describes!=1 else []) + ([f'real_its={real_its}>2'] if real_its>2 else []),
    }

def gate_G2(src: str) -> dict:
    expects = len(re.findall(r'\bexpect\s*\(', src))
    forbid_patterns = [
        (r'\.toBeCalled\b|\.toHaveBeenCalled\b|\.toHaveBeenNthCalledWith\b|\bmock\.calls\b', 'mock行为断言'),
        (r'\btoContain\b|\.toEqual\b|\.toMatchObject\b|\.toStrictEqual\b', '结构/元素断言'),
        (r'\.toBeGreaterThan\b|\.toBeLessThan\b|\.toBeCloseTo\b', '量化断言'),
    ]
    forbid_hits = []
    for pat, label in forbid_patterns:
        m = re.search(pat, src)
        if m: forbid_hits.append(f'G2: 检测到{label} ({m.group()})')
    allowed_1_expect_only = True
    if expects == 1:
        m_snap = re.search(r'expect\s*\([^)]*\)\s*\.\s*(toMatchSnapshot|toMatchInlineSnapshot)\s*\(', src)
        m_txt = re.search(r'expect\s*\(\s*screen\.getByText\s*\([^)]*\)\s*\)\s*\.\s*toBeInTheDocument\s*\(', src)
        if not (m_snap or m_txt):
            allowed_1_expect_only = False
            forbid_hits.append('G2: expect=1 但形式不是允许的toMatchSnapshot/single getByText().toBeInTheDocument')
    return {
        'pass': expects <= 1 and not forbid_hits and allowed_1_expect_only,
        'metrics': {'expect_calls': expects},
        'fails': ([f'expects={expects}>1'] if expects>1 else []) + forbid_hits,
    }

def gate_G3(src: str) -> dict:
    forbid = [
        (r'\bvi\.mock\s*\(', 'G3: vi.mock (定制mock)'),
        (r'\bvi\.spyOn\s*\(', 'G3: vi.spyOn (定制spy)'),
        (r'\bvi\.fn\s*\(', 'G3: vi.fn (定制fn)'),
        (r'\bvi\.useFakeTimers\b|advanceTimers|\bsetTimeout\s*\(|\bsetInterval\s*\(', 'G3: 时间相关'),
        (r'\bfetch\s*\(|\baxios\.|\brequest\s*\(|from\s+[\'\"](@/api|@src/api)', 'G3: 网络相关'),
        (r'await\s+flushPromises|await\s+waitFor\s*\(|\.findBy(LabelText|PlaceholderText|Role|Text|DisplayValue|AltText|Title|TestId)\s*\(', 'G3: 异步等待'),
    ]
    fails = []
    for pat, lab in forbid:
        m = re.search(pat, src)
        if m: fails.append(lab)
    block_re = re.findall(r'\b(beforeEach|afterEach)\s*\(\s*\([^)]*\)\s*=>\s*\{([^{}]*(\{[^{}]*\})*[^{}]*)\}', src)
    for blk in block_re:
        body = ' '.join(blk[1:])
        if re.search(r'\bmockClear\s*\(|\bmockReset\s*\(|\bmockRestore\s*\(', body):
            fails.append('G3: 生命周期里有mock*Clear/Reset/Restore (有状态mock)')
    return {'pass': not fails, 'fails': fails}

def gate_G4(src: str) -> dict:
    fails = []
    if re.search(r'\bfireEvent\b|\buserEvent\b|\.click\s*\(|\.change\s*\(|\.submit\s*\(', src):
        fails.append('G4: 检测到用户交互')
    render_m = re.search(r'(renderWithProviders|render)\s*\(\s*<', src)
    if render_m:
        after = src[render_m.end()-1:]
        try:
            if re.search(r'\bwrapper\s*:\s*\w', after[:600]):
                fails.append('G4: render 有 wrapper: 自定义')
        except Exception:
            pass
    return {'pass': not fails, 'fails': fails}

pass_list = []
rej_stats = Counter()
per_file_evidence = {}
rejection_reasons = defaultdict(list)

for p in all_pages_tests:
    rp = rel(p)
    try:
        src = p.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        rejection_reasons[rp].append(f'R0: 读文件失败 {e}')
        rej_stats['R0-read'] += 1
        continue
    r0 = is_ineligible_R0(p, src)
    evidence = {}
    if r0:
        rej_stats['R0'] += 1
        rejection_reasons[rp] = r0
        continue
    g1 = gate_G1(src); evidence['G1'] = {'pass': g1['pass'], 'metrics': g1['metrics'], 'fails': g1['fails']}
    g2 = gate_G2(src); evidence['G2'] = {'pass': g2['pass'], 'metrics': g2['metrics'], 'fails': g2['fails']}
    g3 = gate_G3(src); evidence['G3'] = {'pass': g3['pass'], 'fails': g3['fails']}
    g4 = gate_G4(src); evidence['G4'] = {'pass': g4['pass'], 'fails': g4['fails']}
    all_pass = bool(g1['pass'] and g2['pass'] and g3['pass'] and g4['pass'])
    if not g1['pass']: rej_stats['G1'] += 1; rejection_reasons[rp].extend(g1['fails'])
    if not g2['pass']: rej_stats['G2'] += 1; rejection_reasons[rp].extend(g2['fails'])
    if not g3['pass']: rej_stats['G3'] += 1; rejection_reasons[rp].extend(g3['fails'])
    if not g4['pass']: rej_stats['G4'] += 1; rejection_reasons[rp].extend(g4['fails'])
    per_file_evidence[rp] = evidence
    if all_pass:
        pass_list.append(rp)

out = {
    'scan_date': '2026-08-20',
    'scope': 'apps/web/src/pages/** (pages-only, conservative)',
    'total_pages_tests': len(all_pages_tests),
    'g4_pass_total': len(pass_list),
    'pass': sorted(pass_list),
    'reject_stats': dict(rej_stats),
    'rejection_reasons': {k: v for k, v in sorted(rejection_reasons.items())},
    'per_file_evidence': {k: v for k, v in sorted(per_file_evidence.items())},
}
out_path = ROOT / 'scripts/audit/t2-pages-gate-candidates.json'
out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

print(f"Pages tests scanned: {out['total_pages_tests']}")
print(f"G4 all-pass (candidates to delete): {len(pass_list)}")
print(f"\nRejection statistics (per gate, multi-gate rejection counted for first):")
for k in ['R0-read','R0','G1','G2','G3','G4']:
    print(f"  {k:<8s}: {rej_stats.get(k,0):>4d}")
print(f"\nTop 5 拦截条数最多的原因（跨 all files）:")
flat_reasons = Counter()
for reasons in rejection_reasons.values():
    for r in reasons: flat_reasons[r] += 1
for line, c in flat_reasons.most_common(5):
    print(f"  {c:>4d} × {line}")
print(f"\nPASS 清单 ({len(pass_list)} files):")
for p in pass_list: print(f"  ✅ {p}")
print(f"\nWrote: {rel(out_path)}")
