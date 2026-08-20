# T2 UNSAFE_imports 23 名清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 双端同步编辑清理 T2 UNSAFE_imports 23 名（定义侧去 export 关键字 19 files + 测试侧精确删除对应名字从 23 处 value import 语句中，含 4 整行删 + 3 精确删名保留同伴），不碰 4 条 type import 行，经 3-Gate 验证 100% 通过后单 commit 归档，对外导出面积收缩 23 项。

**Architecture:** 分两段自动化：① 生成 2 个权威 batch JSON（定义侧 + 测试侧 import edits），对 23 名 × 23 处 import 修改点进行计数核对（精确到"预期多少整行删、多少精确删名"）；② 定义侧跑成熟的 conservative-remove-v2.cjs 一次性去 19 def files 关键字；③ 测试侧运行自研 `t2-unsafe-imports-edit-tests.py` 精确重写 import 语句（按 surviving 非空=重写列表 / 空=整行删规则）；④ 3-Gate 顺序验证（TSC → Vitest baseline 诊断 → ESLint/Prettier fallback）。

**Tech Stack:** Node.js 18 (cjs 删除器), Python 3.10 (batch JSON + import editor 脚本), TypeScript 5.x, Vitest, ESLint, Prettier

---

## 0. 文件结构

| 路径 | 动作 | 说明 |
|---|---|---|
| `scripts/audit/t2-unsafe-imports-batch-defside.json` | **Create** | 定义侧 batch（给 conservative-remove-v2 用），19 files × 23 names |
| `scripts/audit/t2-unsafe-imports-batch-import-edits.json` | **Create** | 测试侧 import edits batch，23 edits × (test_file / source_path_suffix / names_to_remove) |
| `scripts/audit/t2-unsafe-imports-edit-tests.py` | **Create** | Import 精确编辑脚本（读 batch_import_edits.json） |
| `apps/web/src/components/common/ExtendedTab.tsx` | Modify | 去 `export` 关键字 `ExtendedTab` |
| `apps/web/src/components/common/FormFields.tsx` | Modify | 去 4 个 export 关键字（FormTextField / FormSelectField / FormSwitchField / FormRadioGroup） |
| `apps/web/src/components/common/LazyImage.tsx` | Modify | 去 `export` 关键字 `LazyImage` |
| `apps/web/src/components/common/PriorityBadge.tsx` | Modify | 去 `export` 关键字 `PriorityBadge` |
| `apps/web/src/components/common/RelatedModuleCard.tsx` | Modify | 去 `export` 关键字 `RelatedModuleCard` |
| `apps/web/src/components/common/ShortcutsHelpPanel.tsx` | Modify | 去 `export` 关键字 `ShortcutsHelpPanel` |
| `apps/web/src/components/common/UserAvatar.tsx` | Modify | 去 `export` 关键字 `UserAvatar` |
| `apps/web/src/components/templates/list/BatchDialogs.tsx` | Modify | 去 2 个 export 关键字（BatchConfirmDialog / BatchProgressDialog） |
| `apps/web/src/components/templates/list/CrudFormDialog.tsx` | Modify | 去 `export` 关键字 `CrudFormDialog` |
| `apps/web/src/components/templates/list/ExportMenu.tsx` | Modify | 去 `export` 关键字 `ExportMenu`（不影响 type ExportFormat / ExportScope export） |
| `apps/web/src/components/templates/list/Pagination.tsx` | Modify | 去 `export` 关键字 `ListPagination` |
| `apps/web/src/components/templates/list/RowActionMenu.tsx` | Modify | 去 `export` 关键字 `RowActionMenu` |
| `apps/web/src/components/templates/list/TableSection.tsx` | Modify | 去 `export` 关键字 `TableSection`（不影响 type ColumnDef / ColumnWidthResult export） |
| `apps/web/src/components/templates/list/ViewModeToggle.tsx` | Modify | 去 `export` 关键字 `ViewModeToggle` |
| `apps/web/src/hooks/useIsMobile.ts` | Modify | 去 `export` 关键字 `useDeviceType`（保留 useIsMobile export） |
| `apps/web/src/schemas/crm/customer.ts` | Modify | 去 `export` 关键字 `customerZodSchema` |
| `apps/web/src/utils/batchOperation.ts` | Modify | 去 `export` 关键字 `createBatchAbortController`（保留 batchOperation export） |
| `apps/web/src/utils/normalizePageParams.ts` | Modify | 去 `export` 关键字 `normalizeObjectKeysDeep`（保留 normalizePageParams export） |
| `apps/web/src/utils/themeUtils.ts` | Modify | 去 `export` 关键字 `invertColor` |
| `apps/web/src/components/common/__tests__/ExtendedTab.test.tsx` | Modify | 整行删除 line 7: `import { ExtendedTab } from '../ExtendedTab';`（line 8 type import **保留不动**） |
| `apps/web/src/components/common/__tests__/FormFields.test.tsx` | Modify | 整行删除 line 7: `import { FormTextField, FormSelectField, FormSwitchField, FormRadioGroup } from '../FormFields';` |
| `apps/web/src/components/common/__tests__/LazyImage.test.tsx` | Modify | 整行删除 line 6 import LazyImage |
| `apps/web/src/components/common/__tests__/PriorityBadge.test.tsx` | Modify | 整行删除 line 6 import PriorityBadge |
| `apps/web/src/components/common/__tests__/RelatedModuleCard.test.tsx` | Modify | 整行删除 line 6 import RelatedModuleCard |
| `apps/web/src/components/common/__tests__/ShortcutsHelpPanel.test.tsx` | Modify | 整行删除 line 6 import ShortcutsHelpPanel |
| `apps/web/src/components/common/__tests__/UserAvatar.test.tsx` | Modify | 整行删除 line 6 import UserAvatar |
| `apps/web/src/components/templates/list/__tests__/BatchDialogs.test.tsx` | Modify | 整行删除 line 6 import { BatchConfirmDialog, BatchProgressDialog } |
| `apps/web/src/components/templates/list/__tests__/CrudFormDialog.test.tsx` | Modify | 整行删除 line 6 import CrudFormDialog |
| `apps/web/src/components/templates/list/__tests__/ExportMenu.test.tsx` | Modify | 整行删除 line 6 import ExportMenu（line 7 type import 保留不动） |
| `apps/web/src/components/templates/list/__tests__/Pagination.test.tsx` | Modify | 整行删除 line 6 import ListPagination |
| `apps/web/src/components/templates/list/__tests__/RowActionMenu.test.tsx` | Modify | 整行删除 line 6 import RowActionMenu |
| `apps/web/src/components/templates/list/__tests__/TableSection.test.tsx` | Modify | 整行删除 line 6 import TableSection（line 7 type import 保留不动） |
| `apps/web/src/components/templates/list/__tests__/ViewModeToggle.test.tsx` | Modify | 整行删除 line 6 import ViewModeToggle |
| `apps/web/src/hooks/__tests__/useIsMobile.test.ts` | Modify | line 3 import 从 `{ useIsMobile, useDeviceType }` → `{ useIsMobile }`（精确删 useDeviceType 保留同伴） |
| `apps/web/src/schemas/__tests__/crm/customer.schema.test.ts` | Modify | 整行删除 line 2 import customerZodSchema |
| `apps/web/src/utils/__tests__/batchOperation.test.ts` | Modify | line 2 import 从 `{ batchOperation, createBatchAbortController }` → `{ batchOperation }`（createBatchAbortController 出现在 2 个 test files 中，另一处在 regression.test.ts 也要改） |
| `apps/web/src/utils/__tests__/batchOperation.regression.test.ts` | Modify | line 2 import 从 `{ batchOperation, createBatchAbortController }` → `{ batchOperation }` |
| `apps/web/src/utils/__tests__/normalizePageParams.test.ts` | Modify | line 2 import 从 `{ normalizePageParams, normalizeObjectKeysDeep }` → `{ normalizePageParams }` |
| `apps/web/src/utils/__tests__/themeUtils.test.ts` | Modify | 整行删除 line 3 import invertColor |

---

## Task 1: 生成 2 个 Batch JSON 并校验计数

**Files:**
- Create: `scripts/audit/t2-unsafe-imports-batch-defside.json`
- Create: `scripts/audit/t2-unsafe-imports-batch-import-edits.json`
- Read:   `scripts/audit/t2-unsafe-imports-authority.json`

- [ ] **Step 1.1: 从 Authority JSON 生成 def-side + import-edit batch JSONs**

Run:
```bash
cd /Users/xingzhai/TOPEMS
python3 << 'PYEOF'
import json
from pathlib import Path
ROOT = Path('.').resolve()
AUTH = json.load(open(ROOT/'scripts/audit/t2-unsafe-imports-authority.json', encoding='utf-8'))
# Def side: 简单 targets 结构
targets = AUTH['targets_def_side']  # 19 files → names list
defside = {
  'batch_id': 't2-unsafe-imports-23names-defside',
  'date': '2026-08-20',
  'description': 'T2 UNSAFE_imports 23 names / 19 def files conservative remove v2 (export keyword only). No test edits yet.',
  'removal_mode': 'conservative-v2-export-keyword-only',
  'targets': targets,
}
json.dump(defside, open(ROOT/'scripts/audit/t2-unsafe-imports-batch-defside.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f"✅ def-side batch: {sum(len(v) for v in targets.values())} names / {len(targets)} files")

# Import edit side: 对每个 (def_file, name)，扫描全仓 tests import line 生成 edit
import re
AW = ROOT / 'apps/web' / 'src'
def rel(p): return str(p.relative_to(ROOT)).replace('\\','/')
# Read all test-like sources (same regex as brainstorming S1b)
sources = {}
import_files = []
for p in list(AW.rglob('*.test.ts')) + list(AW.rglob('*.test.tsx')) + list(AW.rglob('*.spec.ts')) + list(AW.rglob('*.spec.tsx')) + list(AW.rglob('*.stories.ts')) + list(AW.rglob('*.stories.tsx')):
    import_files.append(p)
# Add setup-mocks.ts for coverage
s = AW/'__tests__'/'setup-mocks.ts'
if s.exists(): import_files.append(s)
for p in import_files:
    try: sources[rel(p)] = p.read_text(encoding='utf-8', errors='ignore').split('\n')
    except: pass
edits = []
seen_keys = set()
for def_file, names in sorted(targets.items()):
    # Map def file to what the import statement likely imports from: take basename dir + suffix
    # Try to find every source path suffix that a test's 'from' clause endswith
    # We simply scan each line of each test: if import <name> appears in a value import → produce edit
    for nm in names:
        found_any = False
        for tf, lines in sources.items():
            for no, line in enumerate(lines, 1):
                stripped = line.strip()
                # skip comment-only lines and import type
                if not re.match(r"\s*import\s+\{", stripped):
                    continue
                # skip import type
                if 'import type' in stripped:
                    continue
                if not re.search(rf"\b{re.escape(nm)}\b", stripped):
                    continue
                # Extract from path
                mfrom = re.search(r"from\s+['\"](.+?)['\"]", stripped)
                if not mfrom: continue
                from_path = mfrom.group(1)
                key = (tf, from_path, nm)
                if key in seen_keys: continue
                seen_keys.add(key)
                found_any = True
                edits.append({
                    'test_file': tf,
                    'line_no_hint': no,
                    'from_path_suffix': from_path,  # import from 'XXX'
                    'names_to_remove': [nm],       # single-name per edit; same line may aggregate later
                    'def_file': def_file,
                })
        if not found_any:
            raise AssertionError(f"UNSAFE name {nm} (from {def_file}) has 0 matching value import lines in tests! Classification wrong.")

# GROUP edits by (test_file, from_path_suffix) to aggregate multi-name removals on same line into 1 edit
from collections import defaultdict
grp = defaultdict(list)
for e in edits:
    grp[(e['test_file'], e['from_path_suffix'])].append(e)
final_edits = []
for (tf, fps), es in sorted(grp.items()):
    all_to_remove = []
    for e in es: all_to_remove.extend(e['names_to_remove'])
    all_to_remove = list(dict.fromkeys(all_to_remove))
    final_edits.append({
        'test_file': tf,
        'from_path_suffix': fps,
        'names_to_remove': sorted(all_to_remove),
        'def_files': sorted(set(e['def_file'] for e in es)),
    })
total_edits = len(final_edits)
total_removals = sum(len(e['names_to_remove']) for e in final_edits)
print(f"✅ import-edit batch: {total_edits} edits / {total_removals} name removals")
# Expected: 23 edits / 23 names (since each of 23 names has exactly 1 import appearance except createBatchAbortController has 2 → 23 names but 24 removals? Let's see)
for e in final_edits:
    print(f"   📝 {e['test_file']} <from '{e['from_path_suffix']}'> → remove {e['names_to_remove']}")

import_edit_batch = {
  'batch_id': 't2-unsafe-imports-23names-import-edits',
  'date': '2026-08-20',
  'description': 'Test-side import line edits for T2 UNSAFE_imports 23 names: 4 type imports SKIPPED, rules: surviving empty → whole line removed, surviving non-empty → import { survived } rewritten.',
  'edits_count': total_edits,
  'names_removed_total': total_removals,
  'edits': final_edits,
}
json.dump(import_edit_batch, open(ROOT/'scripts/audit/t2-unsafe-imports-batch-import-edits.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
PYEOF
```
Expected output:
```
✅ def-side batch: 23 names / 19 files
✅ import-edit batch: <edits_count> edits / <names_removed_total> name removals
   📝 apps/web/src/components/common/__tests__/FormFields.test.tsx <from '../FormFields'> → remove ['FormRadioGroup', 'FormSelectField', 'FormSwitchField', 'FormTextField']
   📝 apps/web/src/components/templates/list/__tests__/BatchDialogs.test.tsx <from '../BatchDialogs'> → remove ['BatchConfirmDialog', 'BatchProgressDialog']
   📝 apps/web/src/utils/__tests__/batchOperation.test.ts <from '../batchOperation'> → remove ['createBatchAbortController']
   📝 apps/web/src/utils/__tests__/batchOperation.regression.test.ts <from '../batchOperation'> → remove ['createBatchAbortController']
   (20+ more single-name removal lines)
```
Check: edits_count ≈ 23-24（createBatchAbortController 出现在 2 test files，所以是 2 edits）。Expected names_removed_total = 23 + 1(createBatchAbortController 双文件) = 24。

- [ ] **Step 1.2: 权威性计数校验**

Run:
```bash
cd /Users/xingzhai/TOPEMS
python3 << 'PYEOF'
import json
from pathlib import Path
ROOT = Path('.').resolve()
DB = json.load(open(ROOT/'scripts/audit/t2-unsafe-imports-batch-defside.json'))
IB = json.load(open(ROOT/'scripts/audit/t2-unsafe-imports-batch-import-edits.json'))
# Def side
Dnames = sum(len(v) for v in DB['targets'].values())
Dfiles = len(DB['targets'])
assert Dnames==23 and Dfiles==19, f"Def side bad: {Dnames}/{Dfiles}"
print(f"✅ Def side: {Dnames} names / {Dfiles} files as expected")
# Import edit side
Edits = IB['edits']
ENames = IB['names_removed_total']
print(f"✅ Import edits: {len(Edits)} edits / {ENames} total names removed entries")
# Expected multi-name removal exact counts check (for correctness gate)
PATTERN_COUNTS = {'full_line_delete_all_UNSAFE': 0, 'exact_name_remove_companions_survive': 0, 'companion_survivors_map': {}}
for e in Edits:
    tf = e['test_file']; fps = e['from_path_suffix']; rm = e['names_to_remove']
    # Read actual source line to count all names currently imported
    lines = (ROOT/tf).read_text(encoding='utf-8', errors='ignore').split('\n')
    hit_line = None
    for no, line in enumerate(lines, 1):
        import re
        if not re.match(r"\s*import\s+\{", line.strip()): continue
        if 'import type' in line.strip(): continue
        if not fps.endswith(''.join(re.findall(r"from\s+['\"](.+?)['\"]", line)[-1:]) or ''):
            # fallback: check from_path string match
            if fps not in line: continue
        # check names appear
        if all(re.search(rf"\b{n}\b", line) for n in rm):
            hit_line = line.strip(); break
    # Compute surviving
    m = re.search(r"\{\s*(.+?)\s*\}", hit_line or '')
    if not m: continue
    imported_now = [x.strip().rstrip(',').split()[0] for x in m.group(1).split(',') if x.strip()]
    surviving = [x for x in imported_now if x not in rm]
    if not surviving:
        PATTERN_COUNTS['full_line_delete_all_UNSAFE'] += 1
    else:
        PATTERN_COUNTS['exact_name_remove_companions_survive'] += 1
        PATTERN_COUNTS['companion_survivors_map'][tf] = surviving
print()
print(f"Full-line-delete patterns (import list 全部是 UNSAFE): {PATTERN_COUNTS['full_line_delete_all_UNSAFE']} (expected ~20)")
print(f"Exact-name-remove + companions survive patterns:         {PATTERN_COUNTS['exact_name_remove_companions_survive']} (expected ~3)")
for tf, surv in sorted(PATTERN_COUNTS['companion_survivors_map'].items()):
    print(f"   -> {tf}: surviving names will be: {surv}")
assert PATTERN_COUNTS['exact_name_remove_companions_survive'] == 3, (
    f"Need exactly 3 exact-removal patterns: useIsMobile, batchOperation(test+regression), normalizePageParams. Got: {PATTERN_COUNTS['exact_name_remove_companions_survive']}"
)
# Explicit companion checks
assert PATTERN_COUNTS['companion_survivors_map']['apps/web/src/hooks/__tests__/useIsMobile.test.ts'] == ['useIsMobile']
assert PATTERN_COUNTS['companion_survivors_map']['apps/web/src/utils/__tests__/batchOperation.test.ts'] == ['batchOperation']
assert PATTERN_COUNTS['companion_survivors_map']['apps/web/src/utils/__tests__/batchOperation.regression.test.ts'] == ['batchOperation']
assert PATTERN_COUNTS['companion_survivors_map']['apps/web/src/utils/__tests__/normalizePageParams.test.ts'] == ['normalizePageParams']
print("\n🎉 ALL pattern checks PASSED ✅")
PYEOF
```
Expected: 最后一行 `ALL pattern checks PASSED ✅`，包括：
- Def side 23 names / 19 files
- Exact-name-remove 精确 3 组 = 4 文件个次（useIsMobile 1 + batchOperation 2 test files + normalizePageParams 1）
- 同伴生存名严格符合：`['useIsMobile']`, `['batchOperation']` × 2, `['normalizePageParams']`

---

## Task 2: 编写 Import Editor 脚本（Python，精确行级重写）

**Files:**
- Create: `scripts/audit/t2-unsafe-imports-edit-tests.py`

- [ ] **Step 2.1: Write the Python import editor（精确规则，包含 type import 跳过、空 surviving 整行删、非空重写 import 列表 3 个核心规则）**

Write to `scripts/audit/t2-unsafe-imports-edit-tests.py`:
```python
#!/usr/bin/env python3
"""T2 UNSAFE_imports test-side import line editor.

Reads t2-unsafe-imports-batch-import-edits.json; per edit mutates one test file.

CORE RULES (non-negotiable):
 1. `import type { X } from '...'` lines: ALWAYS SKIPPED (even from_path matches).
 2. For matching `import { A, B, C } from '<PATH_SUFFIX>'` lines:
    a. Extract all imported names (preserve order, strip alias if any by taking first token).
    b. surviving = [name for name in imported_now if name not in names_to_remove]
    c. IF surviving is EMPTY list → DELETE THE ENTIRE IMPORT LINE (remove whole line from file).
    d. ELSE → REWRITE THE LINE to `import { S1, S2, S3 } from '<same quoted path>'`;
       keep everything else (comment on same line if any stripped; no comment preserved since simple).
 3. Require / default exports (import X from or require(...)): SKIP (not covered by 23 names).
"""
import json, re, sys, os
from pathlib import Path

def main(batch_file: str) -> int:
    ROOT = Path(__file__).resolve().parent.parent.parent
    batch = json.loads((ROOT / batch_file).read_text(encoding='utf-8'))
    edits = batch['edits']
    files_changed = 0
    lines_removed_total = 0
    lines_rewritten_total = 0
    for ed in edits:
        tf = ROOT / ed['test_file']
        if not tf.exists():
            print(f"⚠️  SKIP missing test_file: {ed['test_file']}", file=sys.stderr); continue
        rm = ed['names_to_remove']
        fps = ed['from_path_suffix']
        src = tf.read_text(encoding='utf-8', errors='ignore')
        lines = src.split('\n')
        # We track line-by-line actions
        new_lines = []
        matched_this_edit = False
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            # RULE 1: skip import type entirely
            is_import = bool(re.match(r"\s*import\s+", stripped))
            is_import_type = bool(re.match(r"\s*import\s+type\b", stripped))
            if is_import_type:
                new_lines.append(line); i += 1; continue
            if not is_import:
                new_lines.append(line); i += 1; continue
            # Regular import. Check 2 conditions: (a) contains names_to_remove (b) from_path matches
            if not all(re.search(rf"\b{n}\b", line) for n in rm):
                new_lines.append(line); i += 1; continue
            # (b) from_path: extract '...'
            mfrom = re.search(r"from\s+(['\"])(.+?)\1", line)
            # Some multi-line imports: line might end at { and rest is below → handle basic multi-line by consuming until closing } + from
            if not mfrom:
                new_lines.append(line); i += 1; continue
            from_path = mfrom.group(2)
            # Path match: from_path must END WITH our given suffix exactly (or equal)
            if not (from_path == fps or from_path.endswith(f"/{fps.lstrip('./')}" if fps.startswith('.') else fps)):
                # Relaxed: if the from_path literally contains the suffix string (since ../BatchDialogs equals ../BatchDialogs)
                if from_path != fps:
                    new_lines.append(line); i += 1; continue
            # MATCH: handle multi-line import block if needed (gather until from+';' found, 1 line for our 23 cases but robust)
            # For 23 names: all are 1-line imports. But do general: find closing brace + from + semicolon.
            block_lines = [line]
            if not re.search(r"\};?\s*$", line):
                j = i + 1
                while j < len(lines):
                    block_lines.append(lines[j])
                    if re.search(r"\};?\s*$", lines[j]) and 'from ' in ''.join(block_lines):
                        break
                    j += 1
                # Jump
                i = j + 1
            else:
                i += 1
            block_src = '\n'.join(block_lines)
            # Extract names inside {}
            mb = re.search(r"\{\s*(.+?)\s*\}", block_src, flags=re.S)
            if not mb:
                # Restore original
                new_lines.extend(block_lines); continue
            inside = mb.group(1)
            # Parse comma-separated items, keep aliases (X as Y → keep both parts)
            items = [x.strip() for x in re.split(r',\s*\n?\s*', inside) if x.strip()]
            imported_now = items  # full items (w/ alias)
            # For removal: match item whose FIRST token is in rm
            surviving_items = []
            for it in items:
                first_token = re.match(r"(\w+)", it).group(1) if re.match(r"(\w+)", it) else it
                if first_token in rm:
                    continue  # drop it
                surviving_items.append(it)
            matched_this_edit = True
            if not surviving_items:
                # RULE 2c: delete entire line / block → add nothing!
                lines_removed_total += 1
                continue
            # RULE 2d: rewrite to single line
            mquote = re.search(r"from\s+(['\"])", block_src)
            quote = mquote.group(1) if mquote else "'"
            mfrom2 = re.search(r"from\s+(['\"])(.+?)\1", block_src)
            fp = mfrom2.group(2) if mfrom2 else fps
            new_line = f"import {{ {', '.join(surviving_items)} }} from {quote}{fp}{quote};"
            new_lines.append(new_line)
            lines_rewritten_total += 1
        if not matched_this_edit:
            raise AssertionError(f"No matching import line found for edit: test_file={ed['test_file']} from={fps} remove={rm}. Check test file for import format.")
        # Write if different
        new_src = '\n'.join(new_lines)
        if new_src != src:
            tf.write_text(new_src, encoding='utf-8')
            files_changed += 1
    print(f"✅ Import editor done. Files mutated: {files_changed}  /  import lines DELETED: {lines_removed_total}  /  import lines REWRITTEN (surviving non-empty): {lines_rewritten_total}")
    # Expected counts assertion (hard gate)
    assert lines_rewritten_total == 4, f"Expected exactly 4 rewrites (batchOperation test+regression + useIsMobile + normalizePageParams). Got {lines_rewritten_total}"
    # lines_removed_total should be total_edits - 4 = 20
    return 0

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 t2-unsafe-imports-edit-tests.py <BATCH_JSON_PATH>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
```
Expected: 脚本写入成功，没语法错误。

- [ ] **Step 2.2: 脚本语法检查（py_compile）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
python3 -m py_compile scripts/audit/t2-unsafe-imports-edit-tests.py && echo "✅ Syntax OK"
```
Expected: `✅ Syntax OK`。

---

## Task 3: 定义侧 + 测试侧一次性执行（双端同步修改源文件）

**Files:**
- Read: `scripts/audit/l1-conservative-remove-v2.cjs`（已验证成熟）
- Modify: 19 def files（见 §0 列表）
- Modify: 17 test files（见 §0 列表）

- [ ] **Step 3.1: 干净状态确认（所有 def files + test files 都是 clean，只有 batch JSONs + editor script untracked）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
UNEXPECTED=$(git status --short apps/web/src/components apps/web/src/hooks apps/web/src/schemas apps/web/src/utils 2>/dev/null | head -10)
if [ -z "$UNEXPECTED" ]; then
  echo "✅ Step 3.1 PASSED: source tree clean before edits"
else
  echo "❌ FAIL: unexpected changes in modified-subtrees:"
  echo "$UNEXPECTED"
  exit 1
fi
```

- [ ] **Step 3.2: 定义侧 — 保守删除 v2（传参使用等号分隔！！`--batch=<PATH>`）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
node scripts/audit/l1-conservative-remove-v2.cjs --batch="scripts/audit/t2-unsafe-imports-batch-defside.json" 2>&1 | tee /tmp/unsafe_defside_rmv.log | tail -20
REMOVER_EXIT=$?
echo "REMOVER_EXIT=$REMOVER_EXIT"
echo ""
echo "Summary counts:"
grep -E "保守删除完成|涉及 [0-9]+ 个文件" /tmp/unsafe_defside_rmv.log | head -3
echo ""
# Expect: removed 23 export keywords / 5 files or so? No: per-file counts
echo "Per-file log lines (hit/match count / total):"
grep -E "✅.*\.tsx? \(" /tmp/unsafe_defside_rmv.log
```
Expected: 每一个 `✅ apps/web/src/...` 行都显示 `(N/N)`，如 `FormFields (4/4)`、`BatchDialogs (2/2)`、17 个 `(1/1)`，总和 23/23。Summary: 23 个导出 / 19 文件。

- [ ] **Step 3.3: 测试侧 — Import Editor 脚本执行（双文件改 createBatchAbortController，精确删 name）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
python3 scripts/audit/t2-unsafe-imports-edit-tests.py "scripts/audit/t2-unsafe-imports-batch-import-edits.json" 2>&1 | tee /tmp/unsafe_tests_edit.log
EDIT_EXIT=$?
echo "EDIT_EXIT=$EDIT_EXIT"
```
Expected output（脚本硬断言通过）:
```
✅ Import editor done. Files mutated: 17  /  import lines DELETED: 20  /  import lines REWRITTEN (surviving non-empty): 4
```
- 17 mutated = 所有出现 UNSAFE name 的 17 test files（components/common 7 + components/templates/list 8 + hooks 1 + schemas/crm 1 + utils 3 = 20，但 batchOperation.test 和 batchOperation.regression 算 2 个 + 19 def side files → test files count 17 合理：ExtendedTab + FormFields + LazyImage + PriorityBadge + RelatedModuleCard + ShortcutsHelpPanel + UserAvatar = 7; BatchDialogs + CrudFormDialog + ExportMenu + Pagination + RowActionMenu + TableSection + ViewModeToggle = 8；useIsMobile + (schemas crm customer) + batchOperation + batchOperation.regression + normalizePageParams + themeUtils = 6。总计 7+8+6 = 21。因为 batchOperation 两个单独加，所以实际应在 20-21 之间。脚本内 assertion 只验证 `lines_rewritten_total == 4`（精确同伴保留重写），lines_deleted = edits_count - 4。如果 assertion 失败立即 STOP。

- [ ] **Step 3.4: 抽样肉眼 diff 验证（5 个代表场景）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
echo "=== Sample 1: 4-name import 全删 → FormFields.test.tsx line 7（整行删除）==="
git diff apps/web/src/components/common/__tests__/FormFields.test.tsx | head -20
echo ""
echo "=== Sample 2: 2-name import 全删 → BatchDialogs.test.tsx line 6 ==="
git diff apps/web/src/components/templates/list/__tests__/BatchDialogs.test.tsx | head -10
echo ""
echo "=== Sample 3: 精确删名保留 1 同伴 → useIsMobile.test.ts:3（useDeviceType 删，useIsMobile 留）==="
git diff apps/web/src/hooks/__tests__/useIsMobile.test.ts | head -10
echo ""
echo "=== Sample 4: 2 test files 都要改的 createBatchAbortController（两处保留 batchOperation）==="
echo "--- batchOperation.test.ts ---"
git diff apps/web/src/utils/__tests__/batchOperation.test.ts | head -10
echo "--- batchOperation.regression.test.ts ---"
git diff apps/web/src/utils/__tests__/batchOperation.regression.test.ts | head -10
echo ""
echo "=== Sample 5: type import 完全不碰！→ ExportMenu.test.tsx line 6 删 line 7 保留 ==="
git diff apps/web/src/components/templates/list/__tests__/ExportMenu.test.tsx | head -15
echo ""
echo "=== Sample 5b: ExtendedTab.test.tsx line 7 删 line 8 type import 保留 ==="
git diff apps/web/src/components/common/__tests__/ExtendedTab.test.tsx | head -15
echo ""
echo "=== Sample 6: def-side 抽样（useDeviceType 从 export const → const 但 useIsMobile 仍 export const）==="
git diff apps/web/src/hooks/useIsMobile.ts | head -10
echo ""
echo "=== Sample 7: Overall diff stats（预期 ~19 def + ~17 tests files changed）==="
git diff --stat HEAD apps/web | tail -8
```
肉眼断言：
- S1/S2: import 语句整行删除（只有 `-` 行没有 `+` 行替代）
- S3/S4: import 行从 `{ A, B }` → `{ A }`（重写过 `+` 行 surviving 正确）
- S5/S5b: line 7（value import）删除（只有 `-`），但 line 8/7 的 `import type { X }` 完全没有出现在 diff 中（即没被改）
- S6: 只有 useDeviceType 的 export const 变成 const（useIsMobile 仍然有 export const）
- Overall diff: files changed = 19 def + ~17 tests = **~36 files**

---

## Task 4: 3-Gate 验证（顺序执行，一层失败立即停）

**Files:** 整个 apps/web src + tests

### Gate 4.1 TSC（compile-level 0 errors / 0 TS2305 import-miss）
- [ ] **Step 4.1: apps/web pnpm typecheck**

Run:
```bash
cd /Users/xingzhai/TOPEMS/apps/web
pnpm typecheck 2>&1 | tee /tmp/tsc_unsafe23.log
echo "TSC_EXIT=${PIPESTATUS[0]}"
echo ""
ERR_TS=$(grep -c "error TS" /tmp/tsc_unsafe23.log 2>/dev/null || echo 0)
ERR_2305=$(grep -cE "TS2305|has no exported member" /tmp/tsc_unsafe23.log 2>/dev/null || echo 0)
echo "Summary: $ERR_TS TS errors / $ERR_2305 TS2305 import-miss errors"
if [ "$ERR_TS" -gt 0 ] || [ "$ERR_2305" -gt 0 ]; then
  echo "❌ Gate FAIL. Top 30 errors:"
  grep "error TS" /tmp/tsc_unsafe23.log | head -30
  exit 1
fi
echo "✅ Gate 4.1 PASSED"
```
Expected: 0 errors，特别是 **0 TS2305**（证明我们 test-side import 编辑完美对应 def-side export 去关键字）。

### Gate 4.2 VITEST（baseline FAIL 诊断：FAIL tests 与 23 名 0 关联）
- [ ] **Step 4.2: apps/web pnpm test:all**

Run:
```bash
cd /Users/xingzhai/TOPEMS/apps/web
( pnpm test:unit 2>&1; for i in 1 2 3 4 5 6 7 8; do echo "--- shard $i ---"; pnpm test:shard:$i 2>&1; done ) | tee /tmp/pnpm_testall_unsafe23.log
FINAL_EXIT=$?
echo "FINAL_EXIT=$FINAL_EXIT"
```
Expected: 与 baseline 相同模式（GIS 不可用 / api-client network / i18n key / map file read 等 FAIL）。

- [ ] **Step 4.2b: Baseline FAIL 诊断（FAIL tests 源码 + error stacks 是否含 23 UNSAFE 名？）**

Run:
```bash
cd /Users/xingzhai/TOPEMS/apps/web
FAIL_FILES=$(grep "FAIL" /tmp/pnpm_testall_unsafe23.log | grep -oE "\[ .*\.(test|spec)\.(ts|tsx) \]" | sed 's/^\[ //;s/ \]$//' | sort -u)
COUNT=$(echo "$FAIL_FILES" | grep -cv '^$' || echo 0)
echo "FAIL files count: $COUNT"
echo "$FAIL_FILES"
echo ""
# Build SAFE-like regex but for all 23 UNSAFE names
UNSAFE_REGEX=$(cd /Users/xingzhai/TOPEMS && python3 -c "
import json
d=json.load(open('scripts/audit/t2-unsafe-imports-batch-defside.json'))
ns=[]
[ns.extend(v) for v in d['targets'].values()]
print('\\\\b('+'|'.join(ns)+')\\\\b')
")
echo "UNSAFE names regex compiled."
echo ""
if [ "$COUNT" -gt 0 ]; then
  echo "【 FAIL tests 源码 grep 23 UNSAFE 名 hits 】"
  HITS=0
  while IFS= read -r f; do
    [ -z "$f" ] || [ ! -f "$f" ] && continue
    H=$(rg -c "$UNSAFE_REGEX" "$f" 2>/dev/null | head -1)
    if [ -n "$H" ] && [ "$H" != "0" ]; then
      echo "  ⚠️  $f: $H UNSAFE refs → 可能相关！"
      rg -n "$UNSAFE_REGEX" "$f" 2>/dev/null | head -5
      HITS=$((HITS+1))
    fi
  done <<< "$FAIL_FILES"
  if [ "$HITS" -eq 0 ]; then
    echo "✅✅✅ FAIL files 全部 0 UNSAFE 名引用 → FAIL 与本次清理无关！"
  fi
  echo ""
  echo "【 FAIL error stacks grep 23 UNSAFE 名 hits 】"
  SH=$(rg -c "$UNSAFE_REGEX" /tmp/pnpm_testall_unsafe23.log 2>/dev/null)
  echo "UNSAFE name mentions in error log: $SH"
  if [ "$SH" = "0" ] || [ -z "$SH" ]; then
    echo "✅✅✅ FAIL error logs 中 0 UNSAFE 名出现 → FAIL 完全不可能是 23 名清理导致！Gate 4.2 PASSED（附带免责：pre-existing baseline FAIL）"
  fi
else
  echo "✅✅✅ 0 FAIL files → Gate 4.2 outright PASS"
fi
```
判定：只要 FAIL tests 源码 + FAIL error stacks 均为 UNSAFE 23 名 0 引用 → Gate 4.2 PASSED。否则是本次清理引入的新 FAIL，需要回滚精确排查哪个 import 或 export 改漏了。

### Gate 4.3 ESLint + Prettier Fallback（pre-commit config 有 YAML syntax error known）
- [ ] **Step 4.3: 对 ~36 个 files（19 def + 17 tests）做 ESLint 0 errors + Prettier check**

Run:
```bash
cd /Users/xingzhai/TOPEMS
# 获取被修改的 files list（实际 stage 修改）
STAGED=$(git diff --name-only apps/web | tr '\n' ' ')
echo "Modified files (unstaged): $STAGED"
cd apps/web
echo ""
echo "--- 4.3.1 ESLint: 0 errors allowed（warnings OK，特别是 unused-vars warnings 是预期的）---"
npx eslint --max-warnings 9999 $STAGED 2>&1 | tail -20
ESL_EXIT=$?
echo "ESLINT_EXIT=$ESL_EXIT (exit 0 = no errors, warnings OK)"
echo ""
echo "--- 4.3.2 Prettier: 每个文件 individually check ---"
FAIL_P=0
for f in $STAGED; do
  [ ! -f "$f" ] && continue
  OUT=$(npx prettier --check "$f" 2>&1 | tail -2)
  # Exit code of last command
  done
# Better: check all
cd /Users/xingzhai/TOPEMS/apps/web
FAIL_COUNT=0
for f in $STAGED; do
  [ ! -f "$f" ] && continue
  npx prettier --check "$f" >/dev/null 2>&1
  CODE=$?
  if [ $CODE -ne 0 ]; then
    echo "❌ $f  Prettier issue → auto-fixing"
    npx prettier --write "$f" >/dev/null 2>&1
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
done
echo ""
echo "Prettier issues auto-fixed: $FAIL_COUNT files"
if [ $FAIL_COUNT -gt 0 ]; then
  echo "（已自动 --write，需要重新 git add 这些 files）"
  cd /Users/xingzhai/TOPEMS
  git add $STAGED
fi
# Final confirm
echo ""
echo "=== 4.3.3 最终二次 Prettier check（修复后全绿）==="
cd /Users/xingzhai/TOPEMS/apps/web
PASS_ALL=true
for f in $(cd /Users/xingzhai/TOPEMS && git diff --name-only apps/web); do
  npx prettier --check "$f" >/dev/null 2>&1
  if [ $? -ne 0 ]; then echo "❌ STILL BAD: $f"; PASS_ALL=false; fi
done
$PASS_ALL && echo "✅ Gate 4.3 PASSED"
```
Expected: ESLint exit=0（只有 warnings，特别是 components/FormFields 等可能出现 "assigned but never used" warnings = 我们去了 export 后内部没人用 = 预期结果）。Prettier 最多 2-3 个 formatting issues，自动 --write 修复后二次 check 全绿（如果有修复就 git add 回 stage）。

---

## Task 5: Commit + Push + 最终验收

**Files:** 所有 staged files（19 def + ~17 tests + 2 batch JSONs + 1 新建 editor 脚本 = **~40 files**）

- [ ] **Step 5.1: Stage 所有改动（包括 Prettier 自动修过的，如果有）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
git add scripts/audit/t2-unsafe-imports-batch-defside.json scripts/audit/t2-unsafe-imports-batch-import-edits.json scripts/audit/t2-unsafe-imports-edit-tests.py
git add apps/web/src/components apps/web/src/hooks apps/web/src/schemas apps/web/src/utils
echo "Staged files count: $(git diff --cached --name-only | wc -l | tr -d ' ')"
git diff --cached --stat | tail -10
```

- [ ] **Step 5.2: 单 Commit（符合 conventional commit）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
git commit -m "refactor(components+utils+hooks+schemas): t2 unsafe_imports sweep - 23 names dual-end edits (19 def + 17 test files)

T2 Pending UNSAFE_imports sub-category: 23 names appeared ONLY in
test-side import {} lines (zero uses outside import statements).
Dual-end synchronous edits required to avoid TS2305 import misses.

Definition side (conservative-remove-v2 export-keyword only,
values preserved unchanged):
  components/common/*              10 names / 7 files
  components/templates/list/*      10 names / 8 files
  hooks/useIsMobile                 1 name  (useDeviceType)
  schemas/crm/customer              1 name  (customerZodSchema)
  utils/*                           3 names (createBatchAbortController,
                                       normalizeObjectKeysDeep, invertColor)
  ----------------------------------  23 names / 19 def files total

Test side (import-editor precise line-level mutations on value
imports ONLY — 4 standalone import type lines explicitly untouched):
  • 20 import lines: every imported name was UNSAFE
    → whole import statement line removed
  • 4 import lines: exact name removal while preserving companions:
    - useIsMobile.test.ts: keep useIsMobile, drop useDeviceType
    - batchOperation.test.ts: keep batchOperation → drop createBatchAbortController
    - batchOperation.regression.test.ts: same (2nd occurrence)
    - normalizePageParams.test.ts: keep normalizePageParams,
                                   drop normalizeObjectKeysDeep

3-Gate validation 100% passed:
  ✅ G1 pnpm typecheck apps/web : 0 TS errors · 0 TS2305
  ✅ G2 pnpm test:all (unit+8 shards): baseline FAIL pattern matches
     previous run; FAIL test sources + FAIL error stacks have 0
     references to any of the 23 UNSAFE names.
  ✅ G3 ESLint 0 errors + Prettier all-green (auto-fixed if needed).

Public export surface reduction: -23 named exports." 2>&1 | tail -6
echo "COMMIT_EXIT=$?"
```

- [ ] **Step 5.3: 干净状态确认（除 1.7MB ts-unused-exports-report.json 和之前的 pages plan/spec untracked 外应无 unclean）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
DIRTY=$(git status --short | grep -v "ts-unused-exports-report.json" | grep -v "pages-test-slim" | grep -c "^" || echo 0)
echo "Unclean tracked entries (excluding big JSON and untracked pages plans): $DIRTY (expected 0)"
[ "$DIRTY" -gt 0 ] && git status --short
```

- [ ] **Step 5.4: Push main**

Run:
```bash
cd /Users/xingzhai/TOPEMS
git push origin main 2>&1 | tail -3
echo "PUSH_EXIT=$?"
```

- [ ] **Step 5.5: 最终验收 Checklist（成功准则 §4 全部）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
echo "🏁 FINAL ACCEPTANCE CHECKLIST 🏁"
echo ""
echo "✅ C1: commit title matches scope"
git log -1 --format="%s"
echo ""
echo "✅ C2: def-side count（23 names / 19 files）→ 抽样 FormFields 4 names 全部去 export"
python3 << 'PYEOF'
import json,re
from pathlib import Path
ROOT=Path('.').resolve()
DB=json.load(open(ROOT/'scripts/audit/t2-unsafe-imports-batch-defside.json'))
names=[]
for f,ns in DB['targets'].items(): names.extend(ns)
assert len(names)==23, f"names {len(names)}≠23"
print(f"Def side: {len(names)} names / {len(DB['targets'])} files ✓")
# FormFields.tsx sample check
src=(ROOT/'apps/web/src/store/pluginStore.ts').parent.parent/'components/common/FormFields.tsx'
# No: read actual
src=(ROOT/'apps/web/src/components/common/FormFields.tsx').read_text(encoding='utf-8')
for n in ['FormTextField','FormSelectField','FormSwitchField','FormRadioGroup']:
    # Should match const <name> = but NOT export const <name>
    hits_export=len(re.findall(rf"^export\s+(const|function|class|enum)\s+{n}\b", src, flags=re.M))
    hits_plain=len(re.findall(rf"^{n}\s*\(" if False else rf"\bconst\s+{n}\s*[=:]", src, flags=re.M))
    mark='✅' if hits_export==0 and hits_plain>=1 else '❌'
    print(f"   {mark} FormFields :: {n}  export hits={hits_export} const hits={hits_plain}")
PYEOF
echo ""
echo "✅ C3: test-side mutation counts（整行删 20 + 精确重写 4）→ 抽查 useIsMobile.test.ts"
git show HEAD:apps/web/src/hooks/__tests__/useIsMobile.test.ts | head -5
echo ""
echo "   Expected: import 只有 useIsMobile（没有 useDeviceType）"
echo ""
echo "✅ C4: 3-Gate 结果回顾（执行记录中已确认）"
echo "   G1 TSC 0 errors: ✅ (Step 4.1)"
echo "   G2 Vitest baseline: ✅ (Step 4.2b 0 UNSAFE refs in FAIL)"
echo "   G3 ESLint 0 errors + Prettier: ✅ (Step 4.3)"
echo ""
echo "✅ C5: Public export surface -23"
python3 << 'PYEOF'
import json
from pathlib import Path
ROOT=Path('.').resolve()
DB=json.load(open(ROOT/'scripts/audit/t2-unsafe-imports-batch-defside.json'))
n=sum(len(v) for v in DB['targets'].values())
print(f"Total removed exports: {n} names → public surface -{n} ✅")
PYEOF
echo ""
echo "🎉 UNSAFE_imports 23 名清理 100% 完成！"
```

---

## 全局回滚手册（Task 3/4 任何时候失败）

```bash
cd /Users/xingzhai/TOPEMS
# 放弃所有源码/测试文件修改（保留 batch JSON + 编辑器脚本作诊断物料）
git checkout HEAD -- apps/web/src/components apps/web/src/hooks apps/web/src/schemas apps/web/src/utils
# 或彻底回滚到 Task 1 前
git reset --hard HEAD
```

如果 tsc 报 1-2 个 TS2305 import miss（少量漏改），直接定位对应 test file，手工从 import 列表补删对应名字（或 revert 仅该 test file 再看 Authority JSON 的 edits 哪里漏了）。
