# L14 内联样式长尾 · 分层盘点与分批路线（2026-10-19）

> 来源：根 `TODO.md` L14「P1 内联样式治理（实测 3236 处；热区 components/templates 已收敛到 token/样式常量，长尾分批，新代码禁新增）」。
> 本报告**只盘点不改代码**，给出分层、聚集分布与分批顺序，作为后续逐批收敛依据。
> 采集口径：`apps/web/src` 活代码（排除 `*.stories.*`、`__tests__`、`*.test.*`、`/docs/`、`/generated/`），`grep` 单行口径；多行 `style={{ }}` 块会被低估，故总数为约数。

## 1. 实测总览（先纠正口径）

| 指标 | 实测 | 判定 |
|---|---:|---|
| `style={{ }}` 出现（pages 单行） | 1951 | 主体 |
| `style={{ }}` 出现（components 单行） | 1145 | 主体 |
| 活代码硬编码 hex（tsx/ts，排除 token/theme/chartPalette） | **0** | 色板魔法已清零 |
| 含 MUI theme 色字符串（`'error.main'` 等）的文件 | 399 | **合法**，非债 |
| 含 `var(--token)` 的 style 行 | 756+ | **合法**，已走 token |

**核心结论**：3236 是宽口径 `style={{ }}` 计数，**不等于 3236 处魔法债**。硬编码色板（hex）在活代码已为 0；绝大多数内联是两类合规写法——① `var(--space-*)`/`var(--text-*)` 等 token 布局；② MUI theme 色字符串（`error.main`/`text.secondary`）。真正需要收敛的是**业务页面里重复出现的布局对象**与**少量脱离 token 的裸 px / 笔误值**，占比小、分散，不宜机械全量替换。

## 2. 四层分类

### A 类 · 已合规，不动（约占主体）
- redesign 基元（Avatar/StatTile/TopBar/SideRail/DataTable/Pagination 等）：尺寸阶梯、色板已抽 `sizeMap`/`colorMap` 常量，内联仅做动态组装。
- 所有 `var(--token)` 布局内联、MUI theme 色字符串。
- 固定语义尺寸（导航栏高、头像/图标尺寸、容器 minHeight/minWidth）用 px 是正确的，**不替换**。

### B 类 · 业务页面重复布局，可抽局部常量（主要工作量）
- 同一页面内反复出现的同款 flex 行、卡片容器、区块标题、空态/骨架布局，散落在 `style={{ }}`。
- 收敛方式：抽文件内 `const styles = { row: {...}, card: {...} }` 或迁入就近 CSS 类，**视觉不变**。
- 这是长尾主体，但需逐页人工核对，按域分批。

### C 类 · 真魔法 / 笔误值（量小，优先清零）
- 脱离 token 的裸 px（非固定语义尺寸）、错误的颜色字符串笔误（如 `border: '1px solid border.default'`——`border.default` 不是合法 CSS 值，应为 token/theme）。
- 集中在 BI 可视化、PM 甘特、性能测试、移动端扫描等自绘组件（见 §4）。

### D 类 · 演示 / dev-tools（低优先，随载体处理）
- `pages/RedesignDemo.tsx`、`dev-tools/MicroFrontendDevTools.tsx`、`pages/performance/PerformanceTestPage.tsx` 等演示/调试载体，不进生产关键路径，随其自身迭代处理，不专门铺改。

## 3. 域聚集分布（pages，单行口径）

| 域 | style 次数 | 备注 |
|---|---:|---|
| wms | 220 | 入库/出库/盘点/库位多页，B 类重复布局为主 |
| qms | 207 | 8D/检验/不合格/审核 redesign 页 |
| mobile | 188 | 扫码/移动页，C 类裸 px 偏多 |
| crm | 155 | 客户/商机/合同 redesign 页 |
| hrm | 147 | 员工/绩效/考勤 redesign 页 |
| erp | 140 | 销售/采购订单页 |
| admin | 123 | 管理台 |
| gis | 81 | 地图围栏（MapView 自绘） |
| mes | 77 | 工单页 |
| shared | 63 | Dashboard |
| workflow / ai / notification / finance / lims / iam / doc / performance / pm | 29–54 | 长尾 |

## 4. C 类候选文件（裸 px / 笔误密集，优先人工复核）

| 文件 | px 次数 | 性质初判 |
|---|---:|---|
| `components/bi/PivotTable.tsx` | 35 | ✅ 第1批已修：失效字符串路径 `border.default/grey.400/700/text.muted/primary/common.white/lg` 全部映射到 theme.palette（divider/grey/text/common），tsc+eslint 绿；剩余 minHeight/minWidth 等固定尺寸属合理，裸 px 留 B 类抽常量 |
| `components/ErrorBoundary.tsx` | 34 | 错误页布局，多为合理固定尺寸，少量间距可抽 |
| `dev-tools/MicroFrontendDevTools.tsx` | 29 | D 类，dev 工具 |
| `pages/performance/PerformanceTestPage.tsx` | 23 | D 类，性能测试载体 |
| `microfrontend/ai-ops/AIOpsPanel.tsx` | 20 | 自绘面板，px 需区分固定/魔法 |
| `components/redesign/layout/TopBar.tsx` | 20 | A 类导航固定高度，不动 |
| `pages/pm/PmProjectDetailPage.tsx` | 16 | B/C 混合 |
| `components/redesign/layout/SideRail.tsx` | 16 | A 类导航固定宽度，不动 |
| `components/gis/.../MapView.tsx` | 16 | 地图自绘覆盖层，px 多为合理定位 |
| `pages/mobile/MobileScanPage.tsx` / `ScannerView.tsx` | 13 / 13 | C 类移动端自绘 |
| `components/pm/GanttChart.tsx` | 13 | 甘特固定网格 px，多数合理 |

## 5. 分批路线建议

1. **第 0 批 · 防新增门禁 ✅ 已落地（2026-10-19）**：扩展 `scripts/eslint-plugin-topems-design.cjs` 新增 `no-hardcoded-hex`（仅拦 `#rgb/#rrggbb/#rrggbbaa`，不连坐 rgb()/hsl()/命名色），`eslint.config.js` 开为 warn；豁免色板常量 `charts/chartPalette.ts` 与 `__tests__`/`*.test`（mock 示例色）。实测产品代码 hex 命中 0，探针可正确报警、放过 `var(--token)` 与合法间距。**不**一刀切禁 px（固定语义尺寸合法）。
2. **第 1 批 · C 类颜色笔误 ✅ 已落地（2026-10-19）**：`PivotTable.tsx` 失效主题路径（border.default/grey.x/text.muted/primary/common.white/非法 lg）全映射 theme.palette；全仓复查其余命中均在 sx 合法路径或 schemas 契约键，无需改。tsc 0 error、eslint 零新增。
3. **第 2 批 · B 类按域抽常量（进行中，单页样板已起）**：
   - 已起：`pages/wms/WmsInventoryPage.tsx` 详情面板重复文本样式（detailLabel×5/cellSub×2/detailValue×2）等价抽为局部 `React.CSSProperties` 常量，值逐字不变。
   - 进度：✅ wms 五、✅ qms 四、✅ crm 三、✅ hrm 三、✅ erp 两、✅ admin SystemSettings 完成。重复文本与布局（detailLabel/cellSub/detailValue/heroValue/headingReset/rowGap2/colGap4/gridTwoCol/gridTwoCol3/sectionTitle）等价抽为局部 `React.CSSProperties` 常量，值逐字不变，prettier 顺带格式化，tsc/eslint 绿。**跳过（旧 MUI 口径，待单独评估，不混入本轮）**：erp PurchaseOrderPage（裸 px12/error-500/按钮行）；admin PerformanceMonitor/TenantManagement/ConfigDebug/Dictionary 等（theme.palette 与 designTokens 对象、裸 px 尺寸、多行 style 对象、opacity）。无法定位整串的 mono 组合、单独弱语义 fontSize 跳过。跨页同构组件（详情项/统计卡）仍待视觉回归条件再沉淀。跨页同构单元（详情项 label/value、统计卡）待视觉回归条件具备时再沉淀为共享组件，不在无回归环境下盲重组。
4. **A 类不动；D 类随演示载体迭代。**

## 6. 局限
- 单行 grep 口径低估多行 style 块；精确处数需配合 AST（如 ESLint 规则）统计。
- px 是否"魔法"需结合语义人工判断，本报告只给聚集候选，不替每处下结论。
- 本报告不改任何源码；收敛落地时以"视觉不变、可复核"为验收线。
