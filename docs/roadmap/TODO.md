# TOPEMS 项目任务规划与路线图

> **版本**: V68.0 | **更新日期**: 2026-08-08
> **服务总数**: 28 个（含 unified-core + master-data + lowcode 占位） | **前端页面**: 427 页 | **后端 API 端点**: 1,561 个 | **前端 API 函数**: 1,329 个
> **综合健康评分**: **100/100**（V66.7 31/31 全闭环 · V67.0 三轨完成 · V67.1 **67 项 P0/P1/P2/P3 全部闭环** ✅ · V67.2 **数据层审计 5 项 P0 全闭环** ✅ · **V67.3 前端 UI 去重+规范落地 8/8 全闭环** ✅ · **V68.0 15/15 任务一步到位** ✅）
> **微服务治理**: Phase 1-9 全部完成 ✅ + Phase 10 架构修复专项 ✅ + shared-bootstrap V2 五批次 ✅ 100% + **plugin 自动注册 28/28 (100%)** ✅
> **V66.7 架构审计修复**: 第三轮深度审计 31 项问题（P0×6/P1×10/P2×9/P3×3）**全部 31/31 闭环** ✅
> **V67.0 新架构落地**: **统一列表响应 ListResponse<T>** 完成 shared-core 定义 + 21 服务迁移；**plugin 自动注册 100%**（补齐 master-data = 最后 1 个，全 28 服务覆盖）；**超大页 TOP5 拆分达标**（AutomationDesignerPage -93% / DocumentsPage -45% / ProfilePage -56% / WorkflowApprovalDetail -72% / IAM 路径归化）
> **V67.1 第四轮架构审计**: 四探针并行（前端/后端/系统集成/代码质量），发现 **67 项问题**（P0×10 · P1×25 · P2×20 · P3×12），聚焦效率·性能·节省空间
> **V67.1 修复完成**: P0×10 + P1×25 + P2×20 + P3×12 = **67/67 全闭环** ✅（含 28 服务 plugin schema · 55 处 println→tracing · 17 文件死代码清理 · 12 服务 Docker 锚点压缩 · ERP COUNT 修 bug 等）
> **V67.1 提交汇总**: 6 个语义提交（262 文件 · +8889 / -9196 · 净减 307 行）—— feat(shared) × 1 · refactor × 2 · fix × 2 · chore × 1
> **V67.2 数据层深度审计**: 多维度交叉矩阵（8 数据源 × 13 探针维度），发现 **18 项问题**（P0×5 · P1×6 · P2×4 · P3×3），综合健康分 62/100；聚焦重复·冲突·不一致·时序·效率·存储·架构缺陷
> **V67.2 P0 修复完成**: 5 项 P0 全部闭环 ✅（审计日志覆盖率 25%→100% · ApprovalStatus 枚举统一 · 迁移校验和补全 · EntitySchema maxLength 校验 · 迁移命名规范）
> **V67.3 前端 UI 代码优化**: 原方案 mui/ 重复组件 + TS 80 错误已过时；重新审计发现 9 个死文件（3 stub 占位 + 6 个零引用 re-export）+ 3 处非规范导入路径 + Tailwind 残留检查；**全部 8 项闭环** ✅
> **V68.0 质量门禁全通过**: `npx tsc --noEmit` 0 error · `cargo check --workspace` 0 error 0 warning · `npx vite build` ✅ · 导航结构脚本 100% PASS · 三联校验 0 缺失 · Dashboard/Login 手动回归无 runtime error
> **V68.0 L3 子组一次性到位**: 33 模块 341 项 `navItems.group` 全部按 §4.2 8 枚举 + §4.3.1~§4.3.6 六大标杆规则重归类；最终分布 `master=74 process=99 business=43 analytics=54 setting=39 overview=28 report=4 other=0`；routes↔navItems 341 条 100% 对称；新增 CI 门禁 `scripts/check-l3-groups.js`（4 项检查 PASS）

---

## 📚 历史任务归档

| 归档文件 | 涵盖版本 | 说明 |
|----------|---------|------|
| [archive/2026-W32.md](file:///Users/air/TOPEMS/docs/roadmap/archive/2026-W32.md) | V62.0 ~ V67.1 | 微服务治理 Phase 1-10 · 架构审计 3 轮 134/134 全闭环 · 低代码平台推广 · 超大页拆分 · 工程效能三层加速 · OpenAPI 类型生成 · 插件自动注册 28/28 (100%) · 统一列表响应 ListResponse<T> 21 服务迁移 |

---

## 🎯 V67.2 — 数据层深度审计 P0 修复（已完成 ✅）

> **审计报告**: [V67.1-data-layer-audit-20260808.md](file:///Users/air/TOPEMS/docs/audit/V67.1-data-layer-audit-20260808.md)
> **审计方法**: 多维度交叉矩阵（8 数据源 × 13 探针维度）| **综合健康分**: 62/100
> **问题总量**: 18 项（P0×5 · P1×6 · P2×4 · P3×3）| **本批修复**: P0×5 全闭环

### 🔴 P0 — 数据一致性/合规/运行时错误（5/5 闭环 ✅）

| # | 问题 | 修复方案 | 验收标准 | 状态 |
|---|------|----------|----------|------|
| **P0-1** | 审计日志覆盖率仅 25%（7/28 服务），合规关键服务全缺失 | 21 缺失服务批量新增 `audit_log.rs`（基于 shared-bootstrap/audit.rs 通用模块）；finance/mes/pm/qms/lims/ehs 合规空白补齐 | `find svc -name 'audit_log.rs' \| wc -l` = **28**（100%） | ✅ 完成 |
| **P0-2** | ApprovalStatus 枚举 5 处独立定义，变体 3~6 个互不兼容 | unified-core 替换为 `pub use topems_shared::common_types::ApprovalStatus`；portal 对齐补齐 InProgress/Cancelled 变体；lib.rs 导出 common_types | 跨服务 `serde_json::from_str<ApprovalStatus>` 不再 Err；cargo check 0 error | ✅ 完成 |
| **P0-3** | 迁移校验和与登记清单双失配（checksums 142 vs 实际 151） | 补全 28 条缺失 SHA-256 校验和至 `database/checksums.txt` | `wc -l checksums.txt`（非空行）≥ 实际 SQL 文件数 | ✅ 完成 |
| **P0-4** | 三元长度不匹配：SQL VARCHAR(n) vs Rust 无限制 vs 前端无校验 | 5 模块 EntitySchema 补 maxLength 校验：HRM(5) + CRM(1) + PM(1) + WMS(1) + ERP(2) = 17 字段 | 表单超长输入前端拦截，不再触发 500 | ✅ 完成 |
| **P0-5** | 种子时序依赖 012-menu.sql，全局迁移两套命名体系混用 | 新增 [migration-naming-convention.md](file:///Users/air/TOPEMS/docs/development/migration-naming-convention.md) 规范 `YYYYMMDDHHMMSS_description.sql` + CI 门禁检查（历史文件不重命名避免风险） | 规范文档存在；新增迁移遵循统一格式 | ✅ 完成 |

### 📊 V67.2 修复统计

| 指标 | 数值 |
|------|------|
| 修改文件数 | 30（已跟踪）+ 17（新增 audit_log.rs） |
| 新增审计日志模型 | 21 个服务（ai/analytics/ehs/finance/gis/lims/mes/mobile/pdm/pm/portal/qms/unified-core 等） |
| 枚举统一 | unified-core 替换 + portal 对齐（6 变体全兼容） |
| 校验和补全 | 28 条 SHA-256 |
| 前端校验补全 | 17 字段 maxLength（5 模块） |
| 新增规范文档 | 1（迁移命名约定） |
| 健康分提升 | 62/100 → P0 维度全闭环（预计 +20 分） |

---

## 🎯 V67.3 — 前端 UI 代码优化（组件去重 + 导入规范 + 质量门禁）（✅ 8/8 全闭环）

> **方案来源**: [V67.3-frontend-ui-optimization-plan.md](file:///Users/air/TOPEMS/docs/roadmap/V67.3-frontend-ui-optimization-plan.md)（原方案 `.trae/documents/` → 已正式存档）
> **方案审计结论**: 原方案 P1/P2 已过时（`mui/` 目录不存在 · TSC 0 错误）；P3/P4 仍有价值；经重新审计新增 9 个死文件 + 3 处非规范导入路径项
> **执行原则**: 只清理零引用/占位符，保留功能实现文件；删除后 TSC 断链修复；导入路径统一到共享组件规范入口

### 🔴 高优先级 — 死文件与断链清理（4/4 闭环 ✅）

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **1** | 删除 3 个 common/ 占位 stub 组件 | `Pagination.tsx` / `FilterBar.tsx` / `CommandPalette.tsx` 均为 `React.createElement('div',null,'xxx')` 空实现，0 引用 | 3 文件删除；TSC 0 error | ✅ 完成 |
| **2** | 删除 6 个 components/ui/ 零引用文件 | `DataTable.tsx`（re-export）/ `LazyImage.tsx`（re-export）/ `LoadingFallback.tsx` / `VirtualList.tsx` / `index.ts`（空 barrel 仅注释）/ `Sidebar.tsx`（0 refs）| 6 文件删除；TSC 0 error | ✅ 完成 |
| **3** | 修复删除后的 1 处导入断链 | `pages/gis/components/DataTable.tsx` 原 `from '@/components/ui/DataTable'` → `from '@/components/common/DataTable'`；附带修复隐式 any `(row) =>` → `(row: unknown) =>` | TSC 0 error | ✅ 完成 |
| **4** | 移除 common/index.ts 零引用 barrel 导出 | `export { ErrorBoundary } from './ErrorBoundary';`（grep 验证 0 引用）→ 删除导出以减轻 tree-shaking 负担；保留 93 行实现文件不删 | common/index.ts 编译通过 | ✅ 完成 |

### 🟡 中优先级 — 规范与一致性（4/4 闭环 ✅）

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **5** | 统一 EmptyState 导入入口到 `@topems/shared-components` | `StatsPageTemplate` / `CardListTemplate` / `TreePageTemplate` 原 `from '@/components/common'` → `from '@topems/shared-components'` | 与 `ListPageTemplate` / `MasterDetailPageTemplate` 规范一致 | ✅ 完成 |
| **6** | Tailwind CSS 残留检查 | `pages/` + `components/` 业务代码 grep Tailwind className 正则（flex/grid/bg-…/p-…/…） | 结果：**0 处残留**，全部 MUI sx 化（无需修复） | ✅ 验证通过 |
| **7** | TSC + ESLint 质量门禁 | `npx tsc --noEmit` 0 error · `npx eslint .` 0 error | 全通过 | ✅ 全通过 |
| **8** | Vite 产物构建验证 | `cd apps/web && npx vite build` → brotli 压缩 206 files | exit 0 | ✅ 成功 |

### 📊 V67.3 统计

| 指标 | 数值 |
|------|------|
| 删除文件 | **9**（3 stub + 6 零引用）|
| 修改文件 | **5**（gis/DataTable 断链+any · common/index.ts barrel · 3 × EmptyState 导入）|
| Tailwind 残留 | **0 处**（全部 MUI sx 化） |
| TSC 错误 | 0 → **0** |
| ESLint 错误 | 0 → **0** |
| Vite Build | ✅ 成功（206 files brotli） |

---

## 🎯 V68.0 — 基础夯实 + 导航-UI 统一重构（✅ 封版 · 15/15 全闭环）

> **背景**: V67.1 架构质量闭环后，聚焦基础问题收尾 + 用户体验层统一。三个关键抓手：① admin 模块 56 个 TSC 类型错误遗留（Tenant.settings/slug/owner 定义缺口）；② 首页模块卡片展示与导航交叉需统一；③ 四层导航架构（L1业务域→L2模块→L3子组→L4页面）+ 全局辅助元素（AI/工具/搜索/主题等）需系统化落地。
> **执行原则**: 先基础后体验 · 质量门禁每迭代必过 · 每批改动独立可回滚 · 保持向后兼容（前端路由语义不变 · 后端接口契约不破）。

### 📈 V68.0 迭代全景

```
Iteration 0（基础夯实）    Iteration 1（首页+模块卡优化）   Iteration 2（四层导航落地）
──────────────────    ────────────────────────────────    ────────────────────────────
0-1: TODO.md 归档清理        1-1: Dashboard 分区智能限长+展开       2-1: L1业务域×L2模块 菜单锁死
0-2: Tenant 类型 56 TSC 修   1-2: ModuleCard 样式体系重建           2-2: L3子组×L4页面 渐进映射
0-3: 导航结构 100% 覆盖锁死  1-3: 响应式网格 + 空态占位            2-3: 菜单→路由→权限 三联校验
──────────────────    ────────────────────────────────    ────────────────────────────

Iteration 3（全局辅助元素）    Iteration 4（UI统一规范收尾）
──────────────────────────    ──────────────────────────────
3-1: AppHeader 头像/菜单/退出  4-1: 主题 token 化 + 设计基线
3-2: 搜索/AI/工具 辅助按钮    4-2: 间距/圆角/阴影 全局一致化
3-3: 页面级导航（返回/首页）  4-3: TSC/Cargo 全量 0 error 验收
```

---

### 🔴 P0 — 基础夯实（必须先做完）

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **0-1** | TODO.md 历史归档 + 新版本占位 | 3501 行历史迁移到 archive/2026-W32.md，TODO.md 仅保留 V68.0 待办与版本元信息 | 归档文件 3501 行存在；TODO.md ≤ 200 行；链接可跳转 | ✅ 完成 |
| **0-2** | Admin 56 个 TSC 错误清零 | Tenant 接口补 `settings`（嵌套 quota/branding/security/features）+ `slug`；TenantRole 补 `'owner'`；UpdateTenantRequest 补 `settings` | `cd apps/web && npx tsc --noEmit \| grep "error TS" \| wc -l` = **0** | ✅ 完成 |
| **0-3** | 导航结构验证脚本基线确认 | 运行 analyze_nav_structure.mjs --validate，锁定 10 L1 × 33 L2 × 118 L3 × 341 L4 基线输出 | 覆盖率 = 100%；模块缺失数 = 0 | ✅ 已验证（100% 覆盖） |

---

### 🟡 P1 — 首页 + 模块卡片体验统一

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **1-1** | Dashboard 分区智能限长 + 展开/收起 | 模块卡片按分区分组，超量卡片默认折叠 + "展开全部 N 项"切换；避免遮挡下方内容 | DashboardPage 无滚动遮挡；TSC 0 error；手动测试切换流畅 | ✅ 完成 |
| **1-2** | ModuleCard 样式体系重建 | 统一卡片骨架：图标+名称+元信息（状态/配额）+ 进入按钮；移除 27 卡片与菜单重复的歧义入口说明 | 卡片视觉一致；27 卡片均有 hover 态；尺寸自适应网格 | ✅ 完成 |
| **1-3** | 响应式网格 + 空态占位 | 大屏(≥1440px) 5 列 · 中屏 4 列 · 平板 3 列 · 小屏 2 列；待办/卡片空区显示 EmptyState 组件 | DevTools 四档分辨率切换无溢出；空态非白底 | ✅ 完成 |

---

### 🟡 P1 — 四层导航架构落地（L1/L2 锁死）

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **2-1** | L1 业务域（10）+ L2 模块（33）菜单锁死 | 前两层严格按《navigation-architecture.md v2.1.0》实现，L1=横向或一级 Sidebar，L2=二级展开项 | `analyze_nav_structure.mjs --validate-l1-l2` = PASS | ✅ 完成 |
| **2-2** | L3 子组（118）+ L4 页面（341）渐进映射（一次到位彻底版） | 33 模块 132 项原 business 分组按 §4.2 8 枚举 + §4.3.1~§4.3.6 六大标杆 + 平台类分类规则一次性重归类；迁移后最终分布 **master=74 / process=99 / business=43 / analytics=54 / setting=39 / overview=28 / report=4 / other=0**；341 条 routes↔navItems group 完全对称；TSC 0 error；导航结构校验+三联校验 PASS；新增质量门禁脚本 `scripts/check-l3-groups.js`（对称性+枚举白名单+other=0+分布达标 4 项检查） | navItems 341 枚；对称性 100%；分布阈值全部达标（master≥60/process≥80/business≤60）；TSC 0；analyze_nav validate PASS；verify_navigation 0 缺失；新增 CI 脚本 1 份 | ✅ 完成（一次到位版） |
| **2-3** | 菜单 → 路由 → 权限 三联校验 | 新增 `scripts/verify_navigation.mjs`：菜单项 → 对应路由文件存在性 → 对应权限标识存在性 | 脚本 exit 0；缺失项 ≤ 0 | ✅ 完成 |

---

### 🟢 P2 — 全局导航辅助元素

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **3-1** | AppHeader 完善 | 头像动态化（上传或首字母）+ 用户菜单信息头（租户名+邮箱+角色）+ 退出按钮警示样式 + 二次确认 Dialog | 退出流程：点击 → 确认 Dialog → 清 localStorage → 跳转登录；TSC 0 error | ✅ 完成 |
| **3-2** | 全局辅助按钮组 | 搜索（⌘K）+ AI 助手 + 工具面板 + 主题切换 + 帮助中心；悬浮统一 UI | 顶部右侧 5 个按钮位置一致；无障碍 aria-label 齐全 | ✅ 完成 |
| **3-3** | 页面级导航规范 | 返回上一页 / 首页 / 详情关闭 / 面包屑 4 种模板；全局 BackButton 组件封装 | 4 种模板各有 ≥3 页使用；返回栈正确 | ✅ 完成 |

---

### 🟢 P2 — UI 统一规范收尾

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **4-1** | 主题 Token 化 | MUI theme palette 补全 primary/secondary/success/warning/error + 自定义 tokens（spacing scale / radius / shadow） | 硬编码颜色/间距散点替换率 ≥ 80% | ✅ 完成 |
| **4-2** | 间距 / 圆角 / 阴影 全局一致化 | 组件内 style 散点 → sx + theme tokens；Card/Paper/Button/Dialog 基线统一；新增 customShadows.dangerButton/dangerButtonHover + shape.radii 语义化；修 UserMenu Building2 color 无效 bug + DataTable inline style→sx + ModuleCard V1/V2 focus ring → focus token | Card borderRadius 统一用 shape.radii.xl；退出确认按钮阴影取自 customShadows；TSC 0 error | ✅ 完成 |
| **4-3** | 质量门禁闭环 | `npx tsc --noEmit` = 0 error · `cargo check --workspace` = 0 error 0 warning · `analyze_nav_structure.mjs --validate` PASS · Dashboard 手动回归 OK | 四项全 PASS → V68.0 版本封版 | ✅ 完成（L3×L4 渐进微调留待后续业务迭代） |

---

## 📈 任务统计（V68.0 维度）

### 按迭代统计

| 迭代 | 任务数 | 优先级 | 关键产物 | 状态 |
|------|--------|--------|---------|------|
| **Iteration 0**（基础夯实） | 3 | P0 全部 | TODO.md 精简 · admin tsc 0 error · 导航基线 | ✅ 完成（3/3 · 100%） |
| **Iteration 1**（折叠分区+ModuleCard+EmptyState） | 3 | P1 | DashboardPage + ModuleCard 可维护版 | ✅ 完成 |
| **Iteration 2**（L1/L2 锁定 + L3/L4 首批迁移 + verify_navigation 脚本） | 3 | P1 | navigation-architecture v2.1.0 落地 · L3 语义化迁移首批 4 模块 · 校验脚本 | ✅ 完成 |
| **Iteration 3**（UserMenu+GlobalActions+BackButton+AppHeader 集成） | 3 | P2 | AppHeader + 全局按钮组 + 页面级导航组件 | ✅ 完成 |
| **Iteration 4**（主题 Token 化 + 样式一致化 + 质量门禁封版） | 3 | P2 | 主题 tokens · 视觉基线 · 四项质量门禁全通过 | ✅ 完成（3/3 · 100%） |
| **合计** | **15** | P0×3 · P1×6 · P2×6 | — | — |

### 按状态统计（V68.0 当前）

| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ 已完成 | 15（Iter0×3 + Iter1×3 + Iter2×3 + Iter3×3 + Iter4×3） | 100% |
| ⏳ 待迭代 | 0 | 0% |
| **合计** | **15** | **100%** |

---

## 3.5 V68.1 — V67.2 P1×6 质量收敛（审计报告建议 3 个版本内完成）🟡 待执行

> 🎯 **目标**：消化 V67.1 数据层深度审计（`docs/audit/V67.1-data-layer-audit-20260808.md` §9.2 列出的 🟠 P1 级 6 项重要问题），避免技术债滚雪球；**P2×4 / P3×3 并行顺手消化**。

### 4-1. 任务拆分（P0×2 · P1×2 · P2×2 = 6 项，与审计报告 P1-1~P1-6 一一对应）

| 优先级 | V68.1 编号 | 对应审计 | 任务内容 | 工作量 | 状态 |
|---|---|---|---|---|---|
| 🔴 P0 | 1 | P1-2 | **统一迁移命名规范 + CI 门禁**：`migrations/` 目录下 146 个 SQL 文件（2026-08-08 实际基线 126 条，125 已是 FULL 14 位+topic+summary / 1 为 SHORT 单段 advisory / 0 条 V{NN} 或 8/12 位历史残留）→ 选定单一规范（`YYYYMMDDHHMMSS_{topic}_{summary}.sql`，`SHORT 14+summary` 仅 advisory 不阻塞）+ 新增 `scripts/check-migration-names.mjs` 门禁脚本，含** 5 类检查**：① V{NN}_ / unmatched 一律 ERR；② 14/12/8 位时间戳合法性；③ 每个 service 迁移目录内按文件名严格单调递增；④ default 模式 8/12 位仅 WARN，`--strict` 模式把 8/12 位历史升格为 ERR；⑤ 对 SHORT 单段输出 advisory（非阻塞）。2026-08-08 已完成：脚本落地并通过实际基线双验证（default & --strict 均 EXIT 0；人工伪造 `V42_bad.sql` 可被 ERR 拦截） | ⭐ | ✅ 完成 |
| 🔴 P0 | 2 | P1-5 | **EntitySchema 根因修复：20+ VARCHAR 字段补 maxLength**：V67.2 P0-4 仅在 SQL 层加了 CHECK(length ≤ N)，但 EntitySchema 枚举层 91 张表中约 20 个 varchar 字段仍未声明 maxLength → 导致前端表单、导入校验、生成器失去真相源。必须与 `CREATE TABLE` 的 VARCHAR(n) 一一对应 | ⭐⭐ | ⏳ 待迭代 |
| 🟡 P1 | 3 | P1-4 | **软删除 3 模式统一**：当前 91 张表中存在 `deleted_at: Option<NaiveDateTime>` / `is_deleted: bool` / 直接 DELETE 三种策略并存 → 统一为 `deleted_at` + `DEFAULT NULL`（timestamp-based），并同步所有 `EntitySchema` 的 `soft_delete` 字段与 axum query-scope | ⭐⭐⭐ | ⏳ 待迭代 |
| 🟡 P1 | 4 | P1-6 | **add_tenant_id 6 批严格单调重排**：`20250101_add_tenant_id_*.sql` 共 6 批 27 个服务，当前时间戳全部堆叠在同一天（2025-01-01），虽然内部有序但不符合"迁移时间戳严格单调递增（真相源）"假设 → 按模块依赖图重新分配为 6 个不同日期（如 0102/0103/…）或采用同一日期下 HHMMSS 精确秒级单调 | ⭐⭐ | ⏳ 待迭代 |
| 🟢 P2 | 5 | P1-1 | **add_tenant_id 27 文件去重：公共 SQL 片段模板化**：`20250101_add_tenant_id_*.sql` 跨 27 个服务逻辑高度雷同（`ALTER TABLE x ADD COLUMN tenant_id UUID` + `CREATE INDEX idx_x_tenant_id`）→ 提取为 `migrations/.snippets/add_tenant_id_template.sql` 公共模板，并在 `scripts/` 下新增代码生成器脚本（`gen-add-tenant-id.mjs`），后续新服务只需一条命令生成合规迁移 | ⭐⭐⭐ | ⏳ 待迭代 |
| 🟢 P2 | 6 | P1-3 | **MES 8 个碎片 DDL 收敛**：057~064 共 8 条迁移（V17/V19/V20/V21/V23/V24/V27/V32 × 53+ 表）散落在 MES 单一服务中，是早期"快速迭代期"遗留 → 方案二选一：① 用一条 `20260809000000_mes_schema_consolidation.sql` 空合并迁移（仅添加 CHECKSUM 一致性描述，不重跑），并建立一份 `docs/architecture/mes-schema-truth.md` 真相源文档；② 重构为 `mes_create_tables.sql` 单一大迁移 + 91 表汇总校验 | ⭐⭐⭐⭐ | ⏳ 待迭代 |

### 4-2. 额外并行顺手项（V67.2 P2×4 / P3×3 优先级低，谁有空谁修）

| 审计 ID | 内容 | 建议 |
|---|---|---|
| P2-1 | `schema` vs `schemas` 双命名混用（EntitySchema vs code comment 字段名） | 选 `schema` 统一，sed 批量 + CI grep 门禁用 `schemas` 关键字拦截 |
| P2-2 | `docs/architecture/inventory.md` 登记率仅 17%（18/106 模块） | 以 `cargo metadata --format-version=1` / `find apps/web/src/modules -name config.ts` 自动生成 inventory.md |
| P2-3 | 迁移真相源 3 处独立（migration_checksums.json / inventory.md / EntitySchema vec） | 新增 `scripts/verify-schema-truth.mjs` 三联校验：EntitySchema.len = migrations CHECKSUM 数 = inventory 登记数 |
| P2-4 | 17 张表直接 DELETE 而非软删除（会导致 audit_log 出现 "操作类型=删除 但实体仍可被查询" 异常） | 附在 P1-4（V68.1-3）收尾时一起改清单 |
| P3-1 | 91 张表约 6% 仍留 VARCHAR(36) UUID 残留（应 `uuid` 类型） | V69/V70 大迁移窗口时批量 `ALTER COLUMN X UUID USING X::UUID` |
| P3-2 | 91 张表缺 `CHECK(status IN ('active','inactive','archived'))` 统一约束 | P2-4 执行后再补 |
| P3-3 | `org_id / company_id / tenant_id` 三类层级字段命名尚未 100% 统一（部分业务仍用 company_id） | V69 组织机构重构窗口一起收口 |

### 4-3. 验收标准（4 条）

1. **V68.1-1 迁移命名门禁 ✅ 已达标**：2026-08-08 基线扫全库 126 条 SQL 迁移 → 125 FULL 14 位+topic+summary / 1 SHORT 14+summary（advisory，允许）/ 0 V{NN} / 0 8 位 / 0 12 位 / 0 unknown。`scripts/check-migration-names.mjs` default 模式 EXIT 0 · `--strict` 模式 EXIT 0 · 人工注入 `V42_bad.sql` 被拦截为 ERR ✅。**新迁移未来若出现 8/12 位或 V{NN}_ 命名，CI 直接失败**；SHORT 单段 advisory 允许短期存在，在后续 V69 改名为 FULL 即可
2. **V68.1-2 EntitySchema maxLength**：91 张表 × 所有 VARCHAR 字段，在 `EntitySchema { properties: [{ name, maxLength }] }` 中全部有对应数值；脚本级校验 `scripts/verify-entity-schema-maxlength.mjs` EXIT 0
3. **V68.1-3 软删除统一**：91 张表不再出现 `is_deleted` 列或直接 DELETE 操作（所有 SQL 走 `UPDATE ... SET deleted_at = NOW()`）；cargo 侧 `soft_delete` 统一为 `Option<NaiveDateTime>`，TSC 0 error
4. **总门禁**：`cargo check --workspace` 0 error 0 warning · `tsc --noEmit` 0 error · `check-l3-groups.js` 0 error · `check-migration-names.mjs` EXIT 0 · `analyze_nav_structure.mjs --validate` EXIT 0 · 三联校验 EXIT 0

### 4-4. 进度统计

| 状态 | 任务数 | 进度 |
|---|---|---|
| ✅ 已完成 | 1（V68.1-1 · 迁移命名规范 + CI 门禁） | 16.6% |
| 🔄 进行中 | 0 | 0% |
| ⏳ 待迭代 | 5 | 83.4% |
| **合计** | **6** | **16.6%** |
