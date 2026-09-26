# T2 UNSAFE_imports 23 名清理设计 (2026-08-20)

> **分级**：L2-UNSAFE（风险 1⭐）
> **Scope**：T2 Pending 分类 UNSAFE_imports = 23 名 / 19 个定义文件 + 关联 17 个 test files
> **核心动作**：双端同步编辑 —— ① 定义侧保守删除 v2（去 `export` 关键字，保留值本体）；② 测试侧精确删除 `import` 语句中对应名字（不空的 import 列表保留其他名，删空则整行删除 import 语句）

---

## 1. 背景

在 T2 SAFE_V2 30 名清理（commit 7eaa7df50）完成后，继续推进 T2 Pending 剩余 160 名中风险最低的 **UNSAFE_imports 23 名**。

UNSAFE_imports 判定（T2 前提 + V2 分类）：
1. ✅ 定义文件外 0 生产代码消费者（T2 基础）
2. ❌ 名字出现在 tests 的 `import { X } from` 语句中（所以不是 SAFE_V2，去掉 export 后会 TS2305 import miss）
3. ✅ **import 行之外，名字在 tests 代码中 0 真实使用**（标识符不出现在调用、断言、解构、render、对象字面量键等任何其他位置 — 即"import 了但根本没用到"）

**为什么只在 import 行出现也需要单独处理？**
直接去 export 后，TSC 会在 import 那行报 `TS2305: Module has no exported member 'X'`，编译级失败。所以必须双端同步：**定义侧去 export + 测试侧从 import 列表精确除名（或当 import 全空时整行删）**。

---

## 2. UNSAFE 23 名精确清单（19 files / 23 names / 23 value-import 修改点 + 4 untouched type-import lines）

```
📁 components/common/  (10 names / 7 def files)
 ├── ExtendedTab.tsx          → ExtendedTab                     (ExtendedTab.test.tsx:7 → single import, 整行删)
 ├── FormFields.tsx           → FormTextField, FormSelectField,
 │                               FormSwitchField, FormRadioGroup (FormFields.test.tsx:7 → 4-name import, 全删 → 整行删)
 ├── LazyImage.tsx            → LazyImage                       (LazyImage.test.tsx:6 → 整行删)
 ├── PriorityBadge.tsx        → PriorityBadge                   (PriorityBadge.test.tsx:6 → 整行删)
 ├── RelatedModuleCard.tsx    → RelatedModuleCard               (RelatedModuleCard.test.tsx:6 → 整行删)
 ├── ShortcutsHelpPanel.tsx   → ShortcutsHelpPanel              (ShortcutsHelpPanel.test.tsx:6 → 整行删)
 └── UserAvatar.tsx           → UserAvatar                      (UserAvatar.test.tsx:6 → 整行删)

📁 components/templates/list/  (10 names / 8 def files)
 ├── BatchDialogs.tsx         → BatchConfirmDialog, BatchProgressDialog  (BatchDialogs.test.tsx:6 → 2-name import 全删 → 整行删)
 ├── CrudFormDialog.tsx       → CrudFormDialog                  (CrudFormDialog.test.tsx:6 → 整行删)
 ├── ExportMenu.tsx           → ExportMenu                      (ExportMenu.test.tsx:6 → 整行删; test:7 的 import type ExportFormat/ExportScope **不碰**)
 ├── Pagination.tsx           → ListPagination                  (Pagination.test.tsx:6 → 整行删)
 ├── RowActionMenu.tsx        → RowActionMenu                   (RowActionMenu.test.tsx:6 → 整行删)
 ├── TableSection.tsx         → TableSection                    (TableSection.test.tsx:6 → 整行删; test:7 的 import type ColumnDef/ColumnWidthResult **不碰**)
 └── ViewModeToggle.tsx       → ViewModeToggle                  (ViewModeToggle.test.tsx:6 → 整行删)

📁 hooks/  (1 name / 1 def file)
 └── useIsMobile.ts           → useDeviceType                   (useIsMobile.test.ts:3 → { useIsMobile, useDeviceType } → 精确删 useDeviceType，保留 useIsMobile)

📁 schemas/crm/  (1 name / 1 def file)
 └── customer.ts              → customerZodSchema                (crm/customer.schema.test.ts:2 → single import, 整行删)

📁 utils/  (3 names / 3 def files)
 ├── batchOperation.ts        → createBatchAbortController       (batchOperation.test.ts:2 + regression.test.ts:2 两处：
 │                                                                { batchOperation, createBatchAbortController } → 精确删 createBatchAbortController，保留 batchOperation)
 ├── normalizePageParams.ts   → normalizeObjectKeysDeep          (normalizePageParams.test.ts:2 → { normalizePageParams, normalizeObjectKeysDeep } → 精确删 normalizeObjectKeysDeep)
 └── themeUtils.ts            → invertColor                     (themeUtils.test.ts:3 → single import, 整行删)

合计: 19 def files / 23 names / 23 value-import 修改点
```

**4 条独立 type import 行不要动**（名字不在 UNSAFE 清单里，export type 保留不变）：
1. ExtendedTab.test.tsx:8 `import type { ExtendedTabConfig }`
2. ExportMenu.test.tsx:7 `import type { ExportFormat, ExportScope }`
3. TableSection.test.tsx:7 `import type { ColumnDef, ColumnWidthResult }`

---

## 3. 执行策略（Approach A 双端自动化批删）

### 3.1 工具链
- **定义侧删除器**：复用 `scripts/audit/l1-conservative-remove-v2.cjs --batch=<JSON>`（已验证成熟）
- **测试侧 import 编辑器**：写 `scripts/audit/t2-unsafe-imports-edit-tests.py`，输入为 `import_edits` JSON（精确描述每个 test file 哪行、删哪个名、import 列表剩余谁），做 AST-like 精确 import 行编辑：
  - 删完后 surviving names 非空 → 重写 `import { A, B, C } from '...';`
  - 删完后 surviving names 为空 → 整行删除该 `import` 语句行（保留行号映射）
- **Batch JSONs 生成器**：一次性生成两个 JSON
  1. `t2-unsafe-imports-batch-defside.json`（保守删除 v2 格式）
  2. `t2-unsafe-imports-batch-import-edits.json`（import editor 格式）

### 3.2 Import Editor 编辑规则（关键正确性保障）
```
输入: 每条 edit = {
  test_file: 'apps/web/src/components/common/__tests__/FormFields.test.tsx',
  source_path_suffix: '../FormFields',     // from 路径（用于匹配同一行）
  names_to_remove: ['FormTextField', 'FormSelectField', 'FormSwitchField', 'FormRadioGroup'],
}
处理:
  1. 在 test_file 中逐行找 import 语句:
     if line matches: `import { <names> } from '<path>';`
        AND <path> endswith source_path_suffix:
     → 提取 <names> 为列表（保留逗号/空格/顺序）
     → surviving = [x for x in names if x not in names_to_remove]
     → if surviving 为空: 删除该行（整行 import 语句）
     → else: 重写为 `import { S1, S2, ... } from '<same path>';`
  2. import type 行即使 source_path 匹配也完全跳过（因为不在 names_to_remove 中的 type import）。
  3. require() 形式跳过（项目中用 ES Module import）。
```

### 3.3 步骤（Approach A：一次性 → 3-Gate → 1 commit）
```
Step 1: 生成 2 个 batch JSON 文件（def-side + import-edits）并进行权威性计数核对
Step 2: 定义侧：l1-conservative-remove-v2.cjs --batch=batch_defside.json
Step 3: 测试侧：t2-unsafe-imports-edit-tests.py batch_import_edits.json
Step 4: 人工抽样 diff（5 个代表场景：① 4-name 全删整行 ② 2-name 全删整行 ③ 精确删名保留同伴 ④ 2 个 test file 都要改的 utils/batchOperation ⑤ 保留 type import）
Step 5: 3-Gate 验证
        G1: apps/web pnpm typecheck → 0 errors / 0 TS2305
        G2: pnpm test:all → FAIL tests 与 UNSAFE 23 名 0 关联（baseline 诊断）
        G3: ESLint 0 errors + Prettier 5 随机抽样检查 全绿
Step 6: 1 commit → push main
```

### 3.4 回滚策略
- **Step 2/3 完成前/验证前任何时候发现错误**：`git checkout HEAD -- apps/web/src/components apps/web/src/hooks apps/web/src/schemas apps/web/src/utils`（仅回滚被修改的 4 个顶层子树），然后检查 batch JSON 是否错误。
- **全局回滚**：`git reset --hard HEAD`（回到 Step 1 前）。
- **Step 5 任何 Gate FAIL 且无法定位单文件问题**：分两步分别撤销"def side"和"test side"修改，缩小失败范围定位是哪一端错误。

---

## 4. 成功准则
1. **对外导出面积 -23 名**（19 def files 中 23 个 export 关键字已去除）
2. 23 处 value-import 修改全部正确执行：
   - 4 处"import 列表所有名都是 UNSAFE" → 整行 import 语句删除
   - 3 处"import 列表含多个名，只删 1-2 个" → 精确删对应名， surviving names 保留在原 import 行
   - 17 处"单-name import 整行删" → 正确整行删除
3. **4 条 type-import 行原封不动**（ExtendedTabConfig、ExportFormat/ExportScope、ColumnDef/ColumnWidthResult 仍在源码中出现）
4. 3-Gate 验证：
   - ✅ G1 pnpm typecheck：0 errors（0 TS2305 import miss）
   - ✅ G2 pnpm test:all：FAIL tests 与 23 名 **源码 0 引用 + error stack 0 出现名**（与 baseline FAIL 集合一致）
   - ✅ G3 ESLint 0 errors + Prettier check：被修改的所有 files（19 def + 17 tests ≈ 36 files）抽查/全查无风格问题
5. 工作区干净（排除 1.7MB ts-unused-exports-report.json），1 个 conventional commit，push main 成功。

---

## 5. 范围边界（非本轮）

- **RISKY_use 79 名**：tests 真实调用/assert/使用（不是只在 import 行出现）。需 setup-mocks 878L 重构或 tests 逻辑本身调整，风险 3⭐，不在本轮。
- **NOT_T2_HAS_PROD 58 名**：有生产消费者，永久不动。
- **Pages G4=0**：没有突破 G3 许可的计划（突破需 3-4⭐ 风险）。
- **本文件编辑模式之外的 import 语句变种**：`const { X } = require('...')` 或 `import * as X` 等不出现本轮。
- **删除值本体**：本轮仍为保守删除 v2（只去 export 关键字），不碰值本体 —— 后续小重构再删。
