# T2 SAFE_V2 30 名 清理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保守删除（仅去 `export` 关键字）T2 Pending 中 SAFE_V2 分类的 30 名 / 5 files，零 tests / setup-mocks / 生产代码额外改动，tsc+vitest+pre-commit 100% 通过，对外导出接口表面积减少 30 项。

**Architecture:** 复用 L1/L2 已有工具链（分类器产物 `t2-pending-safe-v2.json` 作数据源 → 生成保守删除 v2 用标准 batch JSON → `l1-conservative-remove-v2.cjs --batch` 执行关键字移除 → 3 层验证（tsc → vitest → pre-commit）→ 单 commit 归档）。Approach A 一次性推进，失败用 `git reset --hard HEAD` 全局回滚。

**Tech Stack:** Node.js 18 (cjs 删除器), Python 3.10 (分类/json 生成), TypeScript 5.x, Vitest, pre-commit hooks

---

## 0. 前置检查（Plan 作者已执行）

- ✅ SAFE_V2 分类 JSON：`scripts/audit/t2-pending-safe-v2.json` (`SAFE_V2_targets` = 5 keys, 30 names)
- ✅ 8 随机名抽样 `rg import.*NAME` 全仓 0 files 命中（V2 import 行判定正确）
- ✅ store barrel chain：`apps/web/src/store/index.ts` 通过 `export * from ./domain|./ui|./server` 转发，未 export 的内部名自动被 barrel 过滤，无影响
- ✅ 删除器：`scripts/audit/l1-conservative-remove-v2.cjs` 支持 `--batch <JSON>` 参数

## 1. 文件结构

| 文件路径 | 动作 | 说明 |
|---|---|---|
| `scripts/audit/t2-safe-v2-batch.json` | **Create** | 保守删除 v2 的输入：`{ targets: { filePath: [names] } }` 30 名 / 5 files |
| `apps/web/src/store/moduleLoadingStore.ts` | Modify | 去 5 个 `export` 关键字（保留值本体） |
| `apps/web/src/store/notificationStore.ts` | Modify | 去 4 个 `export` 关键字 |
| `apps/web/src/store/pluginStore.ts` | Modify | 去 15 个 `export` 关键字（最大一批） |
| `apps/web/src/store/uiStore.ts` | Modify | 去 5 个 `export` 关键字 |
| `apps/web/src/utils/telemetry.ts` | Modify | 去 1 个 `export` 关键字（`getTracer`） |
| `scripts/audit/t2-safe-v2-batch.json` | Archive (git add) | batch JSON 随修改源文件一并 commit |

---

## Task 1: 生成 batch JSON 并校验

**Files:**
- Create: `scripts/audit/t2-safe-v2-batch.json`
- Read:   `scripts/audit/t2-pending-safe-v2.json`

- [ ] **Step 1.1: 从权威 SAFE_V2 JSON 生成标准 batch JSON（`targets` 结构）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
python3 << 'PYEOF'
import json
from pathlib import Path
ROOT = Path('.').resolve()
AUTH = json.load(open(ROOT/'scripts/audit/t2-pending-safe-v2.json', encoding='utf-8'))
targets = AUTH['SAFE_V2_targets']  # 权威 keys = 5 files x name lists
batch = {
  'batch_id': 't2-safe-v2-30names',
  'date': '2026-08-20',
  'description': 'T2 Pending SAFE_V2 30 names / 5 files conservative remove v2 (export keyword only). 0 tests/setup-mocks changes.',
  'removal_mode': 'conservative-v2-export-keyword-only',
  'targets': targets,
}
json.dump(batch, open(ROOT/'scripts/audit/t2-safe-v2-batch.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
tot = sum(len(v) for v in targets.values())
files = len(targets)
print(f"✅ batch JSON created: {tot} names / {files} files")
for f, ns in sorted(targets.items()):
    print(f"   {f}: {ns}")
PYEOF
```
Expected output:
```
✅ batch JSON created: 30 names / 5 files
   apps/web/src/store/moduleLoadingStore.ts: ['useHasModuleError', 'useIsModuleLoading', 'useModuleState', 'useTotalProgress', 'useIsModuleLoaded']
   apps/web/src/store/notificationStore.ts: ['useClearNotifications', 'useRemoveNotification', 'useNotifications', 'useAddNotification']
   apps/web/src/store/pluginStore.ts: [15 names list]
   apps/web/src/store/uiStore.ts: [5 names list]
   apps/web/src/utils/telemetry.ts: ['getTracer']
```

- [ ] **Step 1.2: 校验 batch JSON 内容（确保与 spec §3 清单完全一致，防止 JSON 读写时漏名）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
python3 << 'PYEOF'
import json
from pathlib import Path
ROOT = Path('.').resolve()
B = json.load(open(ROOT/'scripts/audit/t2-safe-v2-batch.json'))
expected = {
  'apps/web/src/store/moduleLoadingStore.ts': 5,
  'apps/web/src/store/notificationStore.ts': 4,
  'apps/web/src/store/pluginStore.ts': 15,
  'apps/web/src/store/uiStore.ts': 5,
  'apps/web/src/utils/telemetry.ts': 1,
}
for f, cnt in expected.items():
    real = len(B['targets'].get(f, []))
    mark = '✅' if real == cnt else '❌'
    print(f"  {mark} {f}: expected={cnt} actual={real}")
tot_exp = sum(expected.values())
tot_real = sum(len(v) for v in B['targets'].values())
print(f"\n  Total: expected={tot_exp} actual={tot_real} {'✅' if tot_exp==tot_real else '❌'}")
assert tot_exp==tot_real, 'Batch JSON 与 spec 清单不一致，请检查 Step 1.1'
PYEOF
```
Expected: 5 行全部 ✅，Total=30 ✅。若出现 ❌ → 停在 Step 1，检查源 JSON 和生成脚本。

---

## Task 2: 运行保守删除 v2（仅去 export 关键字）

**Files:**
- Read:   `scripts/audit/l1-conservative-remove-v2.cjs`
- Modify: `apps/web/src/store/moduleLoadingStore.ts`
- Modify: `apps/web/src/store/notificationStore.ts`
- Modify: `apps/web/src/store/pluginStore.ts`
- Modify: `apps/web/src/store/uiStore.ts`
- Modify: `apps/web/src/utils/telemetry.ts`

- [ ] **Step 2.1: 干净状态确认（工作区应只有 batch JSON untracked，5 个 store/utils 文件都是 clean）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
git status --short apps/web/src/store apps/web/src/utils/telemetry.ts scripts/audit/t2-safe-v2-batch.json
```
Expected: `?? scripts/audit/t2-safe-v2-batch.json` 出现；5 个源文件都没出现在输出中（都是 clean）。
*如果 5 个 store/utils 文件有未提交改动 → 先处理掉（stash / revert / 提交），再回到 Task 2。*

- [ ] **Step 2.2: 运行保守删除 v2（一次性 30 名 / 5 files）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
node scripts/audit/l1-conservative-remove-v2.cjs --batch scripts/audit/t2-safe-v2-batch.json 2>&1 | tail -40
echo "REMOVER_EXIT=$?"
```
Expected (end of output pattern):
```
[conservative-v2] Summary: processed 5 files, removed export keyword from 30 declarations, skipped 0
```
关键校验：`removed ... 30 declarations`（和 batch size 一致）+ 没有 ERROR 行。若 skipped > 0 或 ERROR 行 → 停止并检查具体哪个名没匹配到（可能名在源文件里本来就没有 export 关键字，或拼法不一致）。

- [ ] **Step 2.3: 肉眼抽样验证（从每个被改 file 随机选 1 个名，git diff 确认只去了 `export` 关键字，值本体保留）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
echo "=== moduleLoadingStore 抽样 (useModuleState) ==="
git diff apps/web/src/store/moduleLoadingStore.ts | rg -n "useModuleState" -A1 -B1 | head -10
echo ""
echo "=== pluginStore 抽样 (useHealthSummary) ==="
git diff apps/web/src/store/pluginStore.ts | rg -n "useHealthSummary" -A1 -B1 | head -10
echo ""
echo "=== telemetry.ts 抽样 (getTracer) ==="
git diff apps/web/src/utils/telemetry.ts | rg -n "getTracer" -A1 -B1 | head -10
echo ""
echo "=== 修改的行数统计（大致范围：5 files 30 diff hunks，每 hunk ≈2 行，总 diff ≈60-100 行）==="
git diff --stat apps/web/src/store apps/web/src/utils/telemetry.ts | tail -8
```
Expected：每个抽样 diff 都是 `-export const useXxx` → `+const useXxx` 单行变化；没有删除值本体。`--stat` 显示 5 files 插入/删除比接近 1:1（只去 export 关键字 = 1 删 1 插）。

**如果出现 "整段值被删除" / "语法错位" → 立即执行：**
```bash
git checkout HEAD -- apps/web/src/store apps/web/src/utils/telemetry.ts
```
回滚所有源码修改，然后检查删除器逻辑（Batch JSON 名是否拼错）。

---

## Task 3: 三层验证（顺序执行，一层不过就停）

**Files:**
- All: apps/web source tree + tests

### Gate 3.1 编译级（TSC Type Check）
- [ ] **Step 3.1: tsc --noEmit apps/web**

Run:
```bash
cd /Users/xingzhai/TOPEMS/apps/web && npx tsc --noEmit --project tsconfig.app.json 2>&1 | tail -20
echo "TSC_EXIT=$?"
```
Expected: 0 error / TSC_EXIT=0，没有 TS2305 `Module has no exported member '<SAFE_V2_NAME>'` 报错。
*如果失败 →* 找是哪个 SAFE_V2 名导致的 import 行报错 → `git checkout HEAD -- <对应定义文件>`（仅回滚该文件）→ 从 batch JSON 删除该文件的 SAFE_V2 名记录 → 从 Task 2 Step 2.2 起重跑剩余文件。全部失败则 `git reset --hard HEAD` 回到 Task 1 前。

### Gate 3.2 行为级（Vitest 100% PASS）
- [ ] **Step 3.2: vitest run apps/web**

Run:
```bash
cd /Users/xingzhai/TOPEMS
npx vitest run apps/web --reporter=basic --no-coverage 2>&1 | tail -25
echo "VITEST_EXIT=$?"
```
Expected: `Test Files: X passed (100%)` / `Tests: Y passed (100%)` / VITEST_EXIT=0。
*如果有 FAIL test →* 分析 FAIL test 的报错 stack：
  - 如果是 "cannot read properties of undefined / useXxx is not a function" → 该 SAFE_V2 名实际被通配符 import 形式（`import * as S from '@/store'; S.useXxx()`）或 setup-mocks factory 外的闭包使用 → V2 分类漏判。回滚对应定义文件，剩余可继续。
  - 如果 FAIL 与 SAFE_V2 无关（本来就有 flaky test）→ 单独跑该 FAIL test 在修改前的 baseline 确认。

### Gate 3.3 风格+安全（pre-commit hooks）
- [ ] **Step 3.3: staging 准备 + 跑 pre-commit**

Run:
```bash
cd /Users/xingzhai/TOPEMS
git add apps/web/src/store/moduleLoadingStore.ts apps/web/src/store/notificationStore.ts apps/web/src/store/pluginStore.ts apps/web/src/store/uiStore.ts apps/web/src/utils/telemetry.ts scripts/audit/t2-safe-v2-batch.json
git status --short | grep -v ts-unused-exports-report.json | head -10
echo ""
echo "Running pre-commit on staged files ..."
pre-commit run --files $(git diff --cached --name-only) 2>&1 | tail -25
echo "PRECOMMIT_EXIT=$?"
```
Expected: 全部 hooks `Passed`（或 `Skipped` 不适用的）。
*如果某个 hook fail →* 按 hook 输出要求自动修复（如 ESLint fix / Prettier fix），`git add` 修复后的文件，**重跑 Step 3.3**。

---

## Task 4: Commit 归档 + Push

**Files:** All staged from Task 3 Step 3.3
- Create (history): commit `<sha>` in main branch

- [ ] **Step 4.1: 归档 single commit（符合仓库的 conventional commit 规范）**

Run:
```bash
cd /Users/xingzhai/TOPEMS
git commit -m "refactor(store+utils): t2 safe_v2 sweep - remove 30 export keywords (5 files)

Conservative remove v2 applied to T2 Pending SAFE_V2 subset (30 names /
5 files): these 30 exported hooks/util met the strict SAFE_V2 invariant
after corrected V2 classifier re-check:
  1. 0 production consumers outside own file (T2 base)
  2. 0 occurrence in any import statement line anywhere in repo
     (8 random names rg-verified before execution)
  3. Every test-side occurrence lives only as an object-literal key
     inside vi.mock() factory returns (mainly apps/web/src/__tests__/
     setup-mocks.ts). No test edits / no setup-mocks edits needed.

Files modified:
  store/moduleLoadingStore : 5 export keywords removed
  store/notificationStore  : 4 export keywords removed
  store/pluginStore        : 15 export keywords removed
  store/uiStore            : 5 export keywords removed
  utils/telemetry          : 1 export keyword removed (getTracer)

Validation chain 100% passed:
  ✅ tsc --noEmit tsconfig.app.json  : 0 errors
  ✅ vitest run apps/web             : 100% test files / tests PASS
  ✅ pre-commit hooks                : all passed

Public export surface reduction: -30 names (store barrel chain uses
export *, so internal-only names no longer forwarded by @/store)." 2>&1 | tail -6
echo "COMMIT_EXIT=$?"
```
Expected: 成功创建 commit，COMMIT_EXIT=0。

- [ ] **Step 4.2: 确认工作区干净（排除 1.7MB ts-unused-exports-report.json 大文件）**

Run:
```bash
cd /Users/xingzhai/TOPEMS && git status --short | grep -v 'ts-unused-exports-report.json'
```
Expected: 没有输出（除可能存在的 `?? ts-unused-exports-report.json` 外，工作区干净）。

- [ ] **Step 4.3: push main**

Run:
```bash
cd /Users/xingzhai/TOPEMS && git push origin main 2>&1 | tail -3
echo "PUSH_EXIT=$?"
```
Expected: `main -> main`，PUSH_EXIT=0。

---

## 全局回滚手册（任何 Step 失败且无法局部修时使用）

```bash
cd /Users/xingzhai/TOPEMS

# 放弃所有源码修改（保持 batch JSON 作为诊断物料可保留）
git checkout HEAD -- apps/web/src/store apps/web/src/utils/telemetry.ts

# 或彻底回滚到 Task 1 前状态（batch JSON 也不要）
git reset --hard HEAD
```

---

## 成功准则 Checklist（最终验收）

- [ ] `git log -1` 标题 = `refactor(store+utils): t2 safe_v2 sweep - remove 30 export keywords (5 files)`
- [ ] `git show --stat HEAD` 显示 6 files 改动（5 source + 1 batch JSON）
- [ ] `git show HEAD:apps/web/src/store/pluginStore.ts | rg "^export " | wc -l` = 原 pluginStore 剩余 export（不是 15，原来还有其他 hook 需要保留），且 `useHealthSummary` 无 `^export ` 前缀
- [ ] TSC vitest pre-commit 全部 100% 过（Task 3 验证已执行）
