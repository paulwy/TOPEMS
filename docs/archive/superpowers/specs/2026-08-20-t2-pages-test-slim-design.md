# T2 + Pages 测试瘦身与联合清理设计（方案 A：保守 Gate 分级）

> **Spec 创建日期**: 2026-08-20
> **Author**: TraeCode Agent
> **Status**: Draft → User review → Approved (Pending)
> **Scope**: apps/web/src/pages/** 子树（仅 pages 目录内的 T2 存根 export + 水货页面 smoke 测试文件删除）
> **Cross-boundary Scope**: 本次不触及 components/utils/store/api 的 299 名 T2 存根，留后续轮次。

---

## 0. 上下文与背景

L1-SAFE + L2-T3 清理已完成 774 项值导出私有化，全仓 L1 真零消费池已**清零**。

剩下的"可清理池"主要是 T2 Pending（≈ 299 名 / 118 files）+ Pages 目录的水单测（348 个 pages 下 tests/stories）：

- **T2 定义**：值导出在生产代码（`apps/web/src/**` 排除 tests/stories/mocks）下零消费，但在测试中确实 `import` 并使用了（即有消费者，不符合 SAFE 分级）。
- **Pages 目录单测结构**：抽样显示 348 个 pages 测试中，大多数（`pages/admin/__tests__/useAuditLog.test.tsx` 26 it / 123 expect、`pages/inventoryReport/__tests__/useInventoryReport.test.tsx` 31 it / 94 expect）都是有业务断言的高价值单元测试；但有极少量"0 expect + 纯 Snapshot + 无任何交互"的 smoke shell 测试，删除它们不会导致任何回归覆盖损失。

本设计仅在"保守模式 + 安全优先 + 无数量目标 + Pages-only"的边界下处理这批水货测试，并根据被删测试导致的"新出现的 L1"对 pages 子树内部的 export 做去 export 关键字。

---

## 1. 风险偏好与成功标准

**来自用户确认的 3 个顶层约束：**

1. **风险偏好 = 保守模式**（只删绝对水货，覆盖率下降 < 0.05%）
2. **成功标准 = 安全优先**（无数量目标；vitest 全通过、生产代码不破即算通过；能清多少算多少，"0 个可清"也 OK）
3. **Scope = 仅 pages 子树**（components/utils/store/api 的 299 名 T2 存根本次不纳入；后续单独轮次）

---

## 2. Gate 定义（4 级 + 1 个硬 R0 规则）

**R0（候选池硬约束，不满足不进 Gate 计算）**：
- 仅对 `apps/web/src/pages/**` 下满足下列条件之一的测试文件做 Gate 计算：
  - `__tests__/<Name>Page.test.tsx` / `__tests__/<Name>ListPage.test.tsx` / `__tests__/<Name>DashboardPage.test.tsx`（页面级 smoke）
  - 或直接 `pages/<biz>/<Name>.test.tsx`，且文件顶层不含 `renderHook`
- **自动排除**：
  - 文件名包含 `.stories.`
  - 路径含 `/hooks/__tests__/` 或 `/components/__tests__/`
  - 包含 `import { renderHook }`
  - `describe` 嵌套 ≥ 3 层且每个 describe 有独立 setup

### G1：结构"纯快照" Gate
- 测试文件总行数 **≤ 80**
- 顶级 `describe()` 仅 1 个
- `it()` / `test()` 总块数 **≤ 2**（不含 `it.skip` / `it.todo`）

### G2：无有效业务断言 Gate
- `expect(` 调用总次数 **≤ 1**（0 或 1）
- **禁止出现以下任何关键词**（哪怕出现 1 次也不通过）：
  - `.toBeCalled` / `.toHaveBeenCalled` / `.toHaveBeenNthCalledWith` / `mock.calls` → 禁止 mock 行为验证
  - `toContain` / `toEqual` / `toMatchObject` / `toStrictEqual` → 禁止结构/元素断言
  - `.toBeGreaterThan` / `.toBeLessThan` / `.toBeCloseTo` → 禁止量化断言
- 唯二允许的单个 expect 形式：
  1. `expect(container.firstChild).toMatchSnapshot()` / `.toMatchInlineSnapshot()`
  2. `expect(screen.getByText(<单个文本匹配>)).toBeInTheDocument()`（单文本存在性 smoke）

### G3：无副作用 / 无网络 / 无定时 Gate（最关键）
**禁止出现以下任何表达式**：
- `vi.mock(` / `vi.spyOn(` / `vi.fn()` → 定制 mock
- `vi.useFakeTimers` / `advanceTimers` / `setTimeout` / `setInterval` → 时间相关行为
- `fetch(` / `axios.` / `request(` / `from ['"]@/api['"]` → 网络相关
- `await flushPromises` / `await waitFor` / `findBy*` → 异步等待
- `beforeEach` / `afterEach` 中含有 `mockClear` / `mockReset` / `mockRestore` → 有状态 mock

### G4：渲染意图单纯 Gate
- **绝对禁止交互**：不得出现 `fireEvent` / `userEvent` / `.click(` / `.change(` / `.submit(`
- `render(` / `renderWithProviders(` 的限制：
  - 没有 `wrapper:` 自定义 wrapper 参数
  - props 仅为浅对象且属性数 ≤ 3
- 如果包含 1 个 expect，形式必须仅为 G2 允许的两种之一

---

## 3. 完整 Pipeline（8 步 · HARD GATE 全在 ⑤ 和 ⑦）

```
① Gate 筛选运行
   └─ 对 348 pages 测试应用 R0 + G1-G4
   └─ 输出: 通过率清单 + 每个文件的 G1-G4 每一条 PASS 证据 + 被哪条 Gate 拒绝的证据
     (脚本: scripts/audit/t2-pages-gate-scan.py)

② Dry-run 人工审计（必做，不跳过）
   └─ 从通过列表中随机抽 5-10 个，我打开源码二次人工确认
   └─ 输出: 抽查证据（行号级，证明"确实没价值"）→ 报告给用户确认后才进入 ③

③ 分 ≤2 小批（每批 ≤ 15 个，同业务子域不扎堆）
   └─ 第一批: ≤15 个（按业务子域交叉分散）
   └─ 第二批: 通过 G4 的剩余（如有）

④ 精确删除测试文件（第一批 only）
   └─ 对通过 Gate 的测试文件，逐个使用 DeleteFile 删除
   └─ 记录: deleted-tests-batch1.json

⑤ vitest Gate（HARD，100% pass 才过）
   └─ 跑所有保留下来的 pages 子树 tests
   └─ 命令: cd apps/web && npx vitest run --reporter=verbose src/pages/
   └─ 0 fail → 进入 ⑥；1+ fail → L2 整批回滚，第 ③ 步的"同批"被删测试里剔除失败相关的，
      缩小池再重试

⑥ pages 子树 export 去 export 关键字
   └─ 只处理 apps/web/src/pages/** 内部定义的值 export，使用双条件判定（见 §4）
   └─ 工具: 保守删除器 v2 + 手动处理 export { X as Y } 别名块
   └─ 记录: pages-exports-privatized.json

⑦ tsc + cargo Gate（HARD，exit 0 才过）
   └─ cd apps/web && npx tsc --noEmit  (0 errors)
   └─ cd TOPEMS root && cargo check (0 errors, warnings OK)
   └─ 若 fail → L1 轻量回滚（单个报错定义文件恢复），重试

⑧ commit + push main
   └─ commit msg 规范: refactor(tests): t2+pages batch <N>: slim <K> smoke snapshots + privatize <M> exports
   └─ 回到 ③ 做第二批（如果还有）
```

---

## 4. Pages 子树 export 去关键字的双条件判定

对 `apps/web/src/pages/**` 下的每个值导出（`export const/function/class/enum X` 或 `export { X as Y }`），满足条件 **A 或 B** 之一才被"去 export 关键字"保留值本体：

| 条件 | 判定方法 | 说明 |
|---|---|---|
| **A. 已是真 L1** | 反向索引计数：`(src 下所有文件出现集合) − (自己定义文件出现集合)` = 空集 | 之前几轮 L1 扫漏掉的，现在顺手清掉 |
| **B. 本轮新变 L1** | 反向索引中，该 export 名字的**所有外部 occurrence** 所在的文件，**全部**属于本轮 ④ 中被删除的测试文件集合；并且生产代码 occurrence 数量 = 0 | 以前的"只被那几个水货测试 import"，现在水货测试全删了，自然就成了真 L1 |

**绝对禁止越界**：任何在 `components/utils/store/api/...` 下定义的 export，哪怕它只被本 pages 水货测试 import，也不得在本轮处理（留后续全仓 T2 清理轮次）。

---

## 5. 三层回滚机制

| 层级 | 触发条件 | 操作 | 预期耗时 |
|---|---|---|---|
| **L1 轻量** | 第 ⑦ 步 TSC 报"去 export 后生产代码仍引用该名"（理论不发生，因 §4 双条件已判定） | `git checkout HEAD -- <报错的 1-2 个定义文件>` → 从 pages-exports 候选中剔除对应名字 → 继续其余流程 | < 1 min |
| **L2 整批** | 第 ⑤ 步 vitest 有 1+ 保留的测试 FAIL（说明本次删除破坏了共享 fixture / setup 或有隐性依赖） | `git checkout HEAD -- apps/web/src/pages/`（精确还原整个 pages 子树）→ 从候选中删除失败测试所在的整个业务子域全部通过 G4 的记录 → 重新从更小候选池 run ①-⑧ | ~3 min |
| **L3 全回滚** | vitest 大面积 FAIL + 无法 30s 内定位依赖 | `git restore --source=HEAD --staged --worktree apps/web/src/` → 打印差异摘要，**中止本轮交付**，由用户决定是否降低 Gate 再进下一轮 | < 1 min |

---

## 6. 批次节奏与交付量预期

| 项目 | 预期值 |
|---|---|
| 348 pages 测试中 G4 全通过 | 5 ~ 25 个（极少量，保守模式下限） |
| 对应 §4 双条件下能去 export 的项数 | 3 ~ 10 项（大多数水测试只 import 默认导出页面，而默认导出被路由消费，不会去 export；通常是辅助常量/类型适配器 export 被顺手清） |
| 轮次 | 第一批 ≤15，第二批处理剩余通过的（如果还有） |
| 若 G4 通过率 0 | 允许"本轮 0 清理"交付，说明仓库单测质量高，仅输出 Gate 扫描报告说明每条 Gate 的拦截率 |

---

## 7. 风险与缓解（总风险 ⭐/5）

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 误删了某个看起来"只有 snapshot"但其实 snapshot 里包含关键布局断言的测试 | 低 ⭐/5 | 中（少 1 个布局回归覆盖） | G2 里允许的 1 个 expect 必须是 `toMatchSnapshot` 或 `getByText().toBeInTheDocument`，这两种的价值确实最低；如果人工抽查 ② 里发现"这个 snapshot 里有完整布局"，由人工判定剔除出候选 |
| pages 下多个水测试共同 import 了一个 `mock-data.ts` fixture，全删后 fixture 的文件残留变垃圾 | 中 ⭐⭐/5 | 小（死文件但不影响运行） | 本 spec 范围内不处理 fixture 文件；后续"垃圾文件清查"专项处理（不属于 T2+Pages 本轮边界） |
| vitest 被删的测试文件有一个 `beforeAll` 写了全局 state，导致其他 tests 异常（极罕见） | 极低 | 中 | L2 整批回滚 + 逐步二分定位，找到该测试后永久排除出候选池 |
| TSC 报第 ⑥ 步的某些 export 被其他 `pages/../*` 引用但脚本判定错 | 极低（反向索引精确） | 极小 | L1 轻量回滚，仅恢复报错定义文件，其他保留 |

---

## 8. 产出物清单（脚本 + 记录）

| 文件 | 目的 | 生命周期 |
|---|---|---|
| `scripts/audit/t2-pages-gate-scan.py` | 实现 R0+G1-G4 扫描，输出候选 JSON + 每条 Gate 证据 | 永久保留（可复用） |
| `scripts/audit/t2-pages-gate-candidates.json` | 候选清单 (通过 G4) + 被每条 Gate 拦截的统计 | 本轮产物 |
| `scripts/audit/t2-pages-batch1-deleted.json` / `batch2` | 记录本轮实际删除的测试路径 | 永久保留（用于后续垃圾 fixture 分析） |
| `scripts/audit/t2-pages-pagesexports-batch1.json` / `batch2` | 记录本轮被去 export 关键字的 pages export 名字 | 永久保留 |
| `scripts/audit/t2-pages-rollback-decision-log.json` | 若触发 L2/L3 回滚，记录被剔除的候选名 + 剔除理由 | 仅若有回滚产生 |

---

## 9. Spec 自检（Draft → Final 检查清单）

- [x] **Placeholder scan**: 无 TBD / TODO
- [x] **内部一致性**: G2 与 G4 的"1 个 expect 形式"要求一致；Pipeline 与回滚层级对应（⑤→L2，⑦→L1）
- [x] **Scope 检查**: 仅 pages 子树；299 名非-pages T2 明确写在 Scope 边界排除
- [x] **歧义检查**: 每条 Gate 都有明确的"禁止关键词列表"和量化上限（≤80L、≤2it、≤1expect），可机械执行
