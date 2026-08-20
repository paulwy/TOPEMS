# T2 + Pages 测试瘦身与联合清理 实施计划

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保守模式下，从 pages 子树的 348 个测试中筛选出通过 R0+G1-G4 四级保守护栏的纯水货 smoke 测试并删除，并对 pages 内部因此变为 L1 的值导出执行"去 export 关键字保留值本体"的操作，全程 vitest/tsc/cargo HARD GATE 不通过即整批回滚。

**Architecture:** 方案 A（Gate 分级）。整个流程 6 个 Task，按「脚本生成 → Gate 扫描 → 人工审计 → 分批删除（≤15/批）→ vitest GATE → 去 export → tsc/cargo GATE → commit」的单向闭环进行。vitest 1 fail 即整批回滚，tsc 报单个引用错即单文件回滚。绝不越界到 pages 子树外的目录。

**Tech Stack:** Python 3 (Gate 扫描脚本), Node 18 (tsc), Vitest, DeleteFile 工具, 保守删除器 v2 (`scripts/audit/l1-conservative-remove-v2.cjs`), Cargo (Rust backend)

---

## 0. Scope Check

本 spec 只覆盖 pages 子树（单一子系统），不需要拆分为多个 sub-project plans。

---

## 1. File Structure

### 本计划内创建的文件

| 路径 | 目的 |
|---|---|
| `scripts/audit/t2-pages-gate-scan.py` | Gate 扫描器。对 pages 子树 348 测试文件应用 R0+G1-G4，输出候选清单 JSON + 拦截统计 + 每条 Gate 证据 |
| `scripts/audit/t2-pages-gate-candidates.json` | 候选清单。包含：`pass: []`（G4 全通过的绝对路径）、`reject_stats: {G1:n, G2:n, G3:n, G4:n}`、`rejection_reasons: {<path>: [reasons]}`（每条拦截的具体行号证据）、`per_file_evidence: {<path>: {"G1": {...}, "G2": {...}, ...}}`（通过项的证据） |
| `scripts/audit/t2-pages-batch1-deleted.json` / `batch2-...json` | 记录本批实际删除的页面测试路径（用于后续垃圾 fixture 专项的依赖分析） |
| `scripts/audit/t2-pages-batch1-pagesexports.json` / `batch2-...json` | 记录被去 export 关键字的 pages export（`{<path>: [<name>, ...]}`） |
| `scripts/audit/t2-pages-rollback-decision-log.json`（仅回滚时产生）| 记录从候选中被剔除的测试名、剔除理由（关联失败的 vitest case） |

### 本计划内修改的文件
- **所有修改严格限制在 `apps/web/src/pages/**` 内部**：
  - 删除：通过 G4 的若干 `__tests__/XxxPage.test.tsx`（每批 ≤15）
  - 编辑：pages 内部符合双条件 A/B 的定义文件（去 `export` 关键字，值本体保留）—— 使用保守删除器 v2

---

## 2. 任务分解（6 Task）

---

### Task 1: 实现 Gate 扫描脚本 t2-pages-gate-scan.py

**Files:**
- Create: `scripts/audit/t2-pages-gate-scan.py`

- [ ] **Step 1: 写入扫描脚本代码**

```python
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
    # describe 嵌套 ≥ 3 层且每层有独立 setup，保守用简单统计：describe 数量 ≥ 5 且出现 beforeEach 3+
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
    # beforeEach/afterEach 里 mockClear/mockReset/mockRestore 的粗判定
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
            # 粗定位 props 参数：render(<Comp , props={...} , wrapper:...)/>
            # 找 wrapper: 关键字
            if re.search(r'\bwrapper\s*:\s*\w', after[:600]):
                fails.append('G4: render 有 wrapper: 自定义')
        except: pass
    return {'pass': not fails, 'fails': fails}

# ---- 执行扫描 ----
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
    all_pass = all(g1['pass'] and g2['pass'] and g3['pass'] and g4['pass'])
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

# console summary
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
```

- [ ] **Step 2: 校验脚本语法可运行（不输出候选池，仅验证 Python 无语法错）**

Run: `python3 -c "import ast; ast.parse(open('scripts/audit/t2-pages-gate-scan.py', encoding='utf-8').read()); print('SYNTAX OK')"`
Expected: 输出 `SYNTAX OK`

- [ ] **Step 3: Commit 扫描脚本骨架**

Run:
```bash
git add scripts/audit/t2-pages-gate-scan.py
git commit -m "build(scripts): add t2-pages R0+G1-G4 gate scanner"
```

---

### Task 2: 运行 Gate 扫描 + Dry-run 人工审计（必做）

**Files:**
- Read: `scripts/audit/t2-pages-gate-candidates.json`（扫描结果）
- 人工抽查：`out['pass']` 列表中随机 5-10 个测试文件源码（逐个 Read）

- [ ] **Step 1: 运行 Gate 扫描脚本**

Run: `python3 scripts/audit/t2-pages-gate-scan.py`
Expected 末尾: 输出
- `Pages tests scanned: 348`（± 样本波动）
- `G4 all-pass (candidates to delete): N`（N 在 0-25 之间均合理）
- 列出每个 pass 文件相对路径

- [ ] **Step 2: 如果 N = 0 → 输出 Gate 拦截率报告并结束本轮（不做后续 Task 3-6）**

交付结论：pages 单测质量极高，纯水货测试 0 个。只输出报告：
- G1-G4 每条拦截数的表格化汇总（reject_stats）
- Top 10 拦截原因排行榜
- 每个页面业务子域的"测试水率"对比（按 `pages/<biz>` 分组）
- 跳过后续所有 Task，无需 commit

- [ ] **Step 3: N > 0 → 人工抽 5-10 个 pass 文件 Read 源码进行二级人工审计**

对 `candidates['pass']` 中每个抽查的文件：
- 用 Read 打开全文，对照 §2 Gate 手动验证 4 条全通过
- 独立判断："如果我删了这个测试，我是否损失任何非 trivial 的回归覆盖？"（如果 snapshot 里包含"完整的 CRUD 布局表格/列名/权限组件"则应标记为高价值，**剔除出候选池**）
- 生成审计记录：

```
DRY-RUN AUDIT 结果
抽查 N1 = 10 个，全通过 4 Gate：
  1. apps/web/src/pages/X/__tests__/APage.test.tsx → 确实 1 it 0 expect（空壳），可删
  2. apps/web/src/pages/Y/__tests__/BPage.test.tsx → snapshot 但只渲染 1 个按钮，可删
  ...
发现 1 个被误判（通过 G4 但实际高价值，剔除）：
  ❌ apps/web/src/pages/Z/__tests__/ZDashboardPage.test.tsx → snapshot 含 7 个 chart + 数据列名
```

- [ ] **Step 4: 根据审计结果修正 candidates，写入最终删除候选**

- 如果剔除了 k 个高价值误判，将 `scripts/audit/t2-pages-gate-candidates.json` 的 `pass` 列表改为「最终候选 = pass_original - 剔除集合」
- 记录剔除原因到 JSON 新增 `audit_rejected` 字段：`{"<path>": "<reason>"}`
- 最终候选保存后打印最终删除列表

Run: `python3 -c "import json;d=json.load(open('scripts/audit/t2-pages-gate-candidates.json',encoding='utf-8'));print('FINAL CANDIDATES:',len(d['pass']));[print('  -',p) for p in d['pass']]"`

---

### Task 3: 第一批删除测试 + vitest HARD GATE

**Files:**
- Delete: 最终候选列表里的第 1 批（≤15 个，按业务子域交叉分散：不要 5 个全是 pages/admin。子域交叉规则：按 `pages/<biz>/` 轮询，每域最多拿 3 个）
- Read: `scripts/audit/t2-pages-gate-candidates.json` 取 pass

- [ ] **Step 1: 按子域交叉分 2 批（每批 ≤15），保存批次定义**

用 Python 代码实现交叉分桶：

```python
import json
from pathlib import Path
from collections import defaultdict
d = json.load(open('scripts/audit/t2-pages-gate-candidates.json', encoding='utf-8'))
by_biz = defaultdict(list)
for p in d['pass']:
    rel = p[len('apps/web/src/pages/'):]
    top = rel.split('/',1)[0]
    by_biz[top].append(p)
# 轮询
batch1, batch2 = [], []
i = 0
for biz, arr in sorted(by_biz.items()):
    for p in arr:
        (batch1 if len(batch1)<15 and i%2==0 else batch2).append(p)
        i+=1
# 兜底 batch1>15 就补进 batch2
if len(batch1) > 15:
    batch2 = batch1[15:] + batch2
    batch1 = batch1[:15]
json.dump({'batch1': batch1, 'batch2': batch2}, open('scripts/audit/t2-pages-batches.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'batch1={len(batch1)}  batch2={len(batch2)}')
```

Run: `python3 -c "<上面代码>"`
Expected: 两个 batch 容量合计 = Task 2 Step 4 的最终候选数。

- [ ] **Step 2: 逐个调用 DeleteFile 删除 batch1 中的测试路径**

每个路径调用一次 DeleteFile。必须使用绝对路径（`/Users/xingzhai/TOPEMS/<path_from_batch1>`）。

- [ ] **Step 3: 记录 batch1-deleted JSON**

```bash
python3 -c "
import json
d=json.load(open('scripts/audit/t2-pages-batches.json',encoding='utf-8'))
json.dump({
  'batch_id': 1, 'deleted_count': len(d['batch1']),
  'deleted_paths': sorted(d['batch1']),
  'postcondition': 'about to run vitest'
}, open('scripts/audit/t2-pages-batch1-deleted.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print('wrote batch1-deleted:', len(d['batch1']))
"
```

- [ ] **Step 4: HARD GATE — 跑保留下来的 pages 子树所有 vitest，要求 100% 通过**

Run: `cd /Users/xingzhai/TOPEMS/apps/web && NODE_OPTIONS='--max-old-space-size=8192' npx vitest run --reporter=verbose src/pages/ 2>&1 | tee /tmp/pages-vitest-batch1.log | tail -30`
Expected last 10 lines 包含 `Test Files  <K> passed | 0 failed`，其中 K 应等于原 pages 测试总数减去 batch1 删除数。

- [ ] **Step 5a: 若 HARD GATE 失败 → 执行 L2 整批回滚 + 记录，不再继续 Task 4-5**

```bash
cd /Users/xingzhai/TOPEMS
git checkout HEAD -- apps/web/src/pages/
python3 -c "
import json, re
from pathlib import Path
log = open('/tmp/pages-vitest-batch1.log').read()
failed = re.findall(r'FAIL\s+([^\n]+)', log)
d=json.load(open('scripts/audit/t2-pages-gate-candidates.json',encoding='utf-8'))
d.setdefault('audit_rejected',{})
for p in json.load(open('scripts/audit/t2-pages-batches.json',encoding='utf-8'))['batch1']:
    d['audit_rejected'][p] = f'BATCH1 ROLLBACK: vitest失败，关联FAILED cases: {failed[:3]}'
d['pass'] = [x for x in d['pass'] if x not in json.load(open('scripts/audit/t2-pages-batches.json',encoding='utf-8'))['batch1']]
json.dump(d, open('scripts/audit/t2-pages-gate-candidates.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(d['audit_rejected'], open('scripts/audit/t2-pages-rollback-decision-log.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'L2 rollback done, removed batch1 from candidates; new N_pass = {len(d[\"pass\"])}; failed tests: {failed}')
"
```
→ 结束本轮，向用户报告：L2 回滚 + 被剔除的 batch1 中每个文件附带 top 3 失败 case 名 + 建议。

- [ ] **Step 5b: 若 GATE 通过 ✅ → 记录 pre-tsc 检查点，进入 Task 4**

```bash
cd /Users/xingzhai/TOPEMS && git status --short apps/web/src/pages/ | head -20
```
Expected: `D apps/web/src/pages/...test.tsx` 共 batch1_size 行。

---

### Task 4: Pages 子树 export 去关键字（双条件 A/B 判定）+ tsc + cargo GATE

**Files:**
- Modify: 位于 `apps/web/src/pages/**` 且满足 §4 双条件 A 或 B 的值导出定义文件（调用保守删除器 v2）
- Script: `scripts/audit/l1-conservative-remove-v2.cjs` + `--batch` 参数
- 生成: `scripts/audit/t2-pages-batch1-pagesexports.json`

- [ ] **Step 1: 计算双条件 A/B 过滤后的 pages 去 export 目标清单**

```python
"""
§4 双条件：
A. 已是真 L1: src 下除自己定义文件外 0 次 occurrence
B. 本轮新变 L1: 所有外部 occurrence 所在文件 ∈ batch1-deleted（且无生产代码 occurrence）
"""
import json, re
from pathlib import Path
from collections import defaultdict, Counter
ROOT = Path('.').resolve()
AW = ROOT / 'apps/web/src'
all_src_files = list(AW.rglob('*.ts')) + list(AW.rglob('*.tsx'))
def rel(p): return str(p.relative_to(ROOT)).replace('\\','/')
fcs = {rel(p): p.read_text(encoding='utf-8', errors='ignore') for p in all_src_files}

# 反向索引（只关心 apps/web/src 下）
reverse = defaultdict(set)
for f, s in fcs.items():
    for i in set(re.findall(r'\b[A-Za-z_$][A-Za-z0-9_$]{1,}\b', s) or []):
        reverse[i].add(f)

# 提取 pages/** 下的所有值导出
EV = defaultdict(list)
for f, s in fcs.items():
    if not f.startswith('apps/web/src/pages/'): continue
    if f.endswith('.d.ts'): continue
    for m in re.finditer(r'^\s*export\s+(const|let|var|function|class|enum)\s+([A-Za-z_$][\w$]*)\b', s, re.MULTILINE):
        EV[f].append((m.group(2), m.group(1)))
    for m in re.finditer(r'^\s*export\s*\{([^}]+)\}\s*;?\s*$', s, re.MULTILINE):
        for tok in re.split(r',\s*', m.group(1).strip()):
            tok = tok.strip()
            if not tok: continue
            stripped = re.sub(r'^type\s+', '', tok, flags=re.I).strip()
            main = stripped.split(' as ')[0].strip()
            alias = stripped.split(' as ')[1].strip() if ' as ' in stripped else main
            if not main.lower().startswith('type'):
                EV[f].append((alias, 'reexport'))

deleted_batch1 = set(json.load(open('scripts/audit/t2-pages-batch1-deleted.json', encoding='utf-8'))['deleted_paths'])
targets = defaultdict(list)
for f, defs in EV.items():
    for name, kw in defs:
        occ = {o for o in reverse.get(name, set()) if o.startswith('apps/web/src/')}
        others = occ - {f}
        cond_a = len(others) == 0
        cond_b = bool(others) and all(o in deleted_batch1 for o in others)
        if cond_a or cond_b:
            targets[f].append(name)

json.dump({
    'total_exports': sum(len(v) for v in targets.values()),
    'total_files': len(targets),
    'targets': targets,
    'scope': 'pages-only post-batch1 deletions (cond A true L1 or cond B occurrences all in deleted)',
}, open('scripts/audit/t2-pages-batch1-pagesexports-input.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f"Target exports to privatize (after cond A/B filter): {sum(len(v) for v in targets.values())} names / {len(targets)} files")
for f, names in sorted(targets.items()): print(f"  ✅ {f}: {names}")
```

Run: 把上面脚本复制到 `python3 -c "..."` 内（或写成临时 py 运行）
Expected: Targets 输出 0-10 项（大多数水测试只 import 默认导出，而默认导出会被路由消费 → 不满足 A/B）

- [ ] **Step 2: 如果 targets = 0 → 跳过保守删除器 v2 调用，直接进 Step 4**（不算失败，符合预期）

- [ ] **Step 3: 调用保守删除器 v2 --batch=batch1-pagesexports-input.json 执行去 export**

Run: `cd /Users/xingzhai/TOPEMS && node scripts/audit/l1-conservative-remove-v2.cjs --batch=scripts/audit/t2-pages-batch1-pagesexports-input.json 2>&1 | tail -20`
Expected: 末尾显示 `SUCCESS hits / total = N / N`（100%）。若有 unhandled（Pattern D 的 `export { X as Y }` 重命名别名块），按 unhandled 报告手动 Read → Edit 对应文件，把 `export { X as Y }` 整个块删干净（值保留，只删 export 关键字行），直到所有 names 都不是导出（通过 grep `export.*<name>` 验证）。

- [ ] **Step 4: 保存 pages-exports 结果记录**

```bash
python3 -c "
import json
inp = json.load(open('scripts/audit/t2-pages-batch1-pagesexports-input.json', encoding='utf-8'))
json.dump({
  'batch_id': 1,
  'privatized_exports_total': inp['total_exports'],
  'files_modified': len(inp['targets']),
  'per_file_privatized': inp['targets'],
}, open('scripts/audit/t2-pages-batch1-pagesexports.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'wrote batch1-pagesexports: {inp[\"total_exports\"]} exports in {len(inp[\"targets\"])} files')
"
```

- [ ] **Step 5: HARD GATE — tsc --noEmit 必须 0 错误**

Run: `cd /Users/xingzhai/TOPEMS/apps/web && NODE_OPTIONS='--max-old-space-size=8192' npx tsc --noEmit ; echo TSC_EXIT=$?`
Expected: `TSC_EXIT=0`

- [ ] **Step 6a: 若 tsc 报错（理论零概率）→ L1 轻量回滚单文件**

读取 tsc 错误 output，定位："哪个文件的哪个名字被报 TS2304 Cannot find name 'X'" —— 那个 X 对应去 export 的某个文件 Y。执行：

```bash
cd /Users/xingzhai/TOPEMS
git checkout HEAD -- apps/web/src/pages/Y.tsx
```

从 `t2-pages-batch1-pagesexports-input.json` 的 `targets[Y]` 里移除 X（保留其他），从 batch1-pagesexports.json 记录中剔除。继续 Step 5 直到 0 errors。

- [ ] **Step 6b: 若 tsc 通过 ✅ → cargo GATE**

Run: `cd /Users/xingzhai/TOPEMS && cargo check 2>&1 | tail -5 ; echo CARGO_EXIT=$?`
Expected: `CARGO_EXIT=0`（gis/ 4 个 deprecated warnings 与本次无关，允许）

---

### Task 5: 第一批 commit + push + （如还有）第二批复做 Task 3-4

**Files:**
- All changes under apps/web/src/pages/** + scripts/audit 记录文件

- [ ] **Step 1: 第一批 commit（测试删除 + pages 去 export + 脚本产物 JSON 记录）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
git add apps/web/src/scripts 2>/dev/null || true
git add apps/web/src/pages/ scripts/audit/
git status --short
```

Expected diffstat:
- `D` × batch1 测试数（删除）
- `M` × pages 定义文件数（去 export，插入 = 删除 ≈ N exports）
- `A` 或 `M` × scripts 下 JSON 产物（gate-candidates / batch1-deleted / batch1-pagesexports / batches）

Commit:
```bash
git commit -m 'refactor(tests): t2+pages batch 1: slim N smoke snapshots + privatize M exports

Removed N page smoke-snapshot tests that pass all 4 conservative gates
(R0+G1-G4): 0/1 expect, pure snapshot or single text-presence smoke,
no interaction, no custom mocks / timers / network / async waits.

Privatized M named value exports inside apps/web/src/pages/** that became
true L1 after the batch1 deletions (§4 cond A: already zero-consumer OR
cond B: all external refs belonged to removed tests).

Validated: vitest src/pages/ 100% pass, tsc --noEmit 0 errors,
cargo check 0 errors.

Scripts added: t2-pages-gate-scan.py (R0+G1-G4 gate scanner).
Artifacts: t2-pages-gate-candidates.json, t2-pages-batches.json,
t2-pages-batch1-deleted.json, t2-pages-batch1-pagesexports{,-input}.json.'
```

注意：把 `N smoke snapshots`、`M exports` 替换成实际数值（可用 `wc -l` 或 Python 读 JSON 统计）。

- [ ] **Step 2: Push main**

Run: `git push origin main 2>&1 | tail -3 ; echo PUSH_EXIT=$?`
Expected: 成功。

- [ ] **Step 3: 检查 batch2 是否还有候选待处理**

```bash
python3 -c "import json;b=json.load(open('scripts/audit/t2-pages-batches.json',encoding='utf-8'));print('batch2 size=',len(b['batch2']));[print('   -',p) for p in b['batch2']]"
```

- [ ] **Step 4a: batch2 = 0 → 进入 Task 6**（本任务结束）

- [ ] **Step 4b: batch2 > 0 → 使用完全相同的 Task 3 流程（Step 2-5 GATE）执行 Batch 2 删除 + 去 export + commit + push**，命名为 `t2+pages batch 2: ...`。注意：
  - vitest GATE 仍然是 HARD，1 fail 即整 batch2 L2 回滚
  - 所有记录 JSON 后缀 `batch2-*`
  - commit msg 替换 batch_id

---

### Task 6: 输出最终交付报告

**Files:**
- 只读聚合 JSON 产物，不修改源码

- [ ] **Step 1: 聚合所有产物，生成最终交付 Markdown 片段**

```python
import json
from pathlib import Path
ROOT = Path('.').resolve()
def load(path): return json.load(open(ROOT / path, encoding='utf-8'))
g = load('scripts/audit/t2-pages-gate-candidates.json')
batches = load('scripts/audit/t2-pages-batches.json') if (ROOT/'scripts/audit/t2-pages-batches.json').exists() else {}
summary = {
    'scanned_tests': g['total_pages_tests'],
    'g4_pass_original': g.get('g4_pass_total_original', None),
    'g4_pass_after_audit_rejected': len(g['pass']),
    'total_deleted_batch1': len(load('scripts/audit/t2-pages-batch1-deleted.json')['deleted_paths']) if (ROOT/'scripts/audit/t2-pages-batch1-deleted.json').exists() else 0,
    'total_deleted_batch2': len(json.load(open(ROOT/'scripts/audit/t2-pages-batch2-deleted.json',encoding='utf-8'))['deleted_paths']) if (ROOT/'scripts/audit/t2-pages-batch2-deleted.json').exists() else 0,
    'pagesexports_batch1': load('scripts/audit/t2-pages-batch1-pagesexports.json')['privatized_exports_total'] if (ROOT/'scripts/audit/t2-pages-batch1-pagesexports.json').exists() else 0,
    'pagesexports_batch2': load('scripts/audit/t2-pages-batch2-pagesexports.json')['privatized_exports_total'] if (ROOT/'scripts/audit/t2-pages-batch2-pagesexports.json').exists() else 0,
    'gates_intercept_counts': g['reject_stats'],
    'audit_rejected_count': len(g.get('audit_rejected', {})) if isinstance(g.get('audit_rejected'), dict) else 0,
}
for k, v in summary.items(): print(f"  {k}: {v}")
```

- [ ] **Step 2: 交付报告（最终回答用户）格式**

必须包含：
- 一句话总结（例如：「本轮扫描 348 个 pages 测试，G4 全通过 X 个，其中人工审计剔除 Y 个高价值，实际分 2 批删除 (N1 + N2) = T 个水测试；pages 子树私有化 M 个 export。累计私有化 774 + T + M = ... 项」）
- G1-G4 拦截数量表格
- Gate 拦截原因 Top 10 排行榜
- 每个业务子域（pages/admin, pages/ai …）的"单测水率"（=该域 G4 通过率 ÷ 该域 tests 总数），便于后续专项
- **如果本轮 N=0**：也要输出完整拦截统计（说明 pages 单测质量高，没有水测试）

---

## 3. Plan Self-Review

### 3.1 Spec coverage
- ✅ §2 Gate 定义：1:1 落实到 Task 1 的 gate_G1~G4 四个函数 + R0 硬拦截
- ✅ §3 Pipeline 8 步：Task 2(①②) + Task 3(③④⑤) + Task 4(⑥⑦) + Task 5(⑧ 分两批)
- ✅ §4 双条件 A/B：Task 4 Step 1 完全按 spec 实现
- ✅ §5 三层回滚：Task 3 Step 5a (L2/L3) + Task 4 Step 6a (L1) 全有精确命令
- ✅ §6 批次节奏（≤15/批）：Task 3 Step 1 交叉分桶
- ✅ §7 风险：Fixture 垃圾文件本轮明确声明"不处理，后续专项"，和 scope 一致
- ✅ §8 产物清单：6 个 JSON + 1 个 py 脚本，每个 Task 都有文件路径写入

### 3.2 Placeholder scan
搜索全 plan：无 `TBD`、`TODO`、`implement later`、`Write tests for the above`、`Similar to Task N`。每个脚本步骤都有完整代码。

### 3.3 Type consistency
- JSON 字段名一致性：`reject_stats` / `rejection_reasons` / `per_file_evidence` 在扫描脚本输出和后续 Task 2 Step 3-4 引用中完全一致
- 删除路径字段：`deleted_paths` (batch1-deleted.json) 与 batches.json 的 `batch1: []` 类型一致（list[str]）
- 去 export 输入 JSON 使用与保守删除器 v2 完全兼容的 schema：`{"targets": {"<path>": [<name>,...], ...}, ...}`（删除器 v2 读取的就是这个字段名）
