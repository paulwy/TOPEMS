# T2 SAFE_V2 专项清理设计 (2026-08-20)

> **分级**：L2-SAFE+（比 L2-T3 更严，0 import 行 + 仅 mock shape 出现）
> **Scope**：T2 Pending 190 名中的 SAFE_V2 子集 = 30 名 / 5 files
> **风险等级**：0⭐（去 export 关键字 + 零 tests/setup-mocks 改动 + 3 层验证）

---

## 1. 背景

在 T2 + Pages 测试瘦身流程收尾（pages 子树放宽 G1/G2 后仍 G4=0，因 98% 过 R0 的 pages tests 含 vi.mock 业务单测，无水货）后，转向清理 T2 Pending 剩余 190 名。通过修正版分类脚本（考虑 import 行是否出现名字 + vi.mock factory shape 键 vs 真实使用）将 190 名 T2 重新分类为 4 类：

| 分类 | 数量 | 含义 | 处置 |
|---|---|---|---|
| NOT_T2_HAS_PROD | 58 名 | 实际有生产消费者，T2 误判 | 排除永久不动 |
| RISKY_use | 79 名 | tests 里真实调用 / assert / render | 暂不动（需 setup-mocks 重构）|
| UNSAFE_imports | 23 名 | tests 里 import 列了名但 import 外没用到 | 下一轮可选（需改 tests import 行）|
| **SAFE_V2** | **30 名 / 5 files** | **0 import 行 + 仅 vi.mock factory 返回 shape 键里出现** | **本轮清理** |

---

## 2. SAFE_V2 判定标准（V2 修正版）

SAFE_V2 = T2 前提（除自身外 0 生产消费者）成立 **AND** 所有 tests/mocks occurrence 全部满足：
1. **不出现在任何 import 行**（import 行出现 = 去掉 export 后 TS2305 Module has no exported member）
2. **只出现在 vi.mock / vi.spyOn factory 的对象字面量键位置**（如 setup-mocks.ts L211 `vi.mock('@/store/notificationStore', () => ({ useNotifications: vi.fn() }))` 的 `useNotifications:` 键）

**为什么 vi.mock factory shape 键是安全的？**
vi.mock factory 的返回对象会**直接作为 mock module 的导出名集合**覆盖原模块，不需要原模块真的有对应 export。即便原模块不再 export `useNotifications`，vitest 仍按 factory 返回值提供 mock 的 `useNotifications` 导出，测试行为不变。

**预验证证据**：
- store barrel chain (`@/store/index.ts` → `./domain`/`./ui`/`./server` → 各具体 store) 使用 `export * from` 模式，`export *` 只转发模块中被 export 的名，内部名自动被 barrel 过滤掉，无影响。
- 8 个随机抽样名（useNotifications、useSelectedPluginCode、useSidebarOpen、getTracer、useHasModuleError、useIsPluginInstalled、useTotalProgress、useToggleSidebarCollapsed）`rg import.*<NAME>` 全仓 0 files 命中 = V2 判定正确。

---

## 3. SAFE_V2 清理清单

```
📁 apps/web/src/store/
 ├── moduleLoadingStore.ts  → useHasModuleError, useIsModuleLoading, useModuleState, useTotalProgress, useIsModuleLoaded  (5)
 ├── notificationStore.ts   → useClearNotifications, useRemoveNotification, useNotifications, useAddNotification           (4)
 ├── pluginStore.ts         → useIsPluginInstalled, usePluginError, useSelectedPluginCode, useActiveCategory, useActiveCount,
 │                             usePluginLoading, useHealthSummary, useFilteredPlugins, useFilteredInstalledPlugins, useInstalledCount,
 │                             useSelectedPlugins, useMarketplacePlugins, useSearchQuery, usePluginHealthStatus, useIsPluginActive (15)
 └── uiStore.ts             → useSidebarOpen, useSetSidebarCollapsed, useSetSidebarOpen, useToggleSidebarCollapsed, useSidebarCollapsed (5)

📁 apps/web/src/utils/
 └── telemetry.ts           → getTracer                                                                                      (1)

合计：30 名 / 5 files
```

---

## 4. 执行策略（Approach A：一次性）

### 4.1 工具链复用
- **删除器**：`scripts/audit/l1-conservative-remove-v2.cjs --batch <JSON>`（保守删除 v2 = 仅去 `export` 关键字，保留值本体）
- **Batch 输入 JSON 格式**：复用 L1/L2 的 `{ targets: { filePath: [names] } }` 标准结构

### 4.2 步骤
```
Step 1: 生成 Batch JSON → scripts/audit/t2-safe-v2-batch.json（SAFE_V2_targets 直接注入）
Step 2: node l1-conservative-remove-v2.cjs --batch <Batch JSON>
Step 3: 三层验证
        3.1 tsc --noEmit --project apps/web/tsconfig.app.json  # 编译级（L3 层接口一致性）
        3.2 vitest run apps/web --reporter=basic --no-coverage  # 行为级（所有 tests PASS = 验证 setup-mocks factory shape 仍覆盖）
        3.3 pre-commit hooks                                  # 风格+安全
Step 4: 单 commit 提交（5 files + batch JSON）
Step 5: push main
```

### 4.3 验证链失败的回滚策略
- **tsc 报错**（极不可能，抽样 8 名 0 import 命中）：`git checkout HEAD -- <file>` 恢复触发报错的 store file，从 batch JSON 移除该文件的全部 SAFE_V2 名，重跑 Step 2。
- **vitest 某 test FAIL**（极不可能，30 名全是 0 import + 0 真实使用）：定位 FAIL test，检查是否有 `import * as X from '@/store' + X.<hook>` 的点访问模式（V2 分类可能漏判通配符点访问）。从 batch JSON 移除相关名，重跑 Step 2。
- **全局回滚命令**：`git reset --hard HEAD`（Step 2 是唯一源码修改点，没有其他文件改动）

---

## 5. 成功准则
1. `tsc --noEmit apps/web`：0 error
2. `vitest run apps/web`：**100% PASS**（FAIL count = 0）
3. pre-commit hooks：全部 passed
4. 5 files 的 30 名 export 关键字已移除（值本体保留）
5. 对外导出接口表面积减少 30 项（store barrel 不再转发这些名）

---

## 6. 范围边界（非本轮）

以下不在本轮范围内：

- **UNSAFE_imports 23 名**：需同时修改 tests 的 import 行（删除 import 列表里的对应名字），下一轮处理。
- **RISKY_use 79 名**：测试代码真实使用（含调用、assert、render），需配合 setup-mocks 878L 大文件重构才能清理。
- **NOT_T2_HAS_PROD 58 名**：有生产消费者，永久不动。
- **store barrel chain 重构**：暂不做（本轮只改 store file 局部 export 关键字）。
