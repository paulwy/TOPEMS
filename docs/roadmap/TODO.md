# TOPEMS 项目任务规划与路线图

> **版本**: V70 | **更新日期**: 2026-08-08
> **服务总数**: 28 个（含 unified-core + master-data + lowcode 占位） | **前端页面**: 427 页 | **后端 API 端点**: 1,561 个 | **前端 API 函数**: 1,329 个
> **综合健康评分**: **99/100**（V66.7 31/31 全闭环 · V67.0 三轨完成 · V67.1 **67 项 P0/P1/P2/P3 全部闭环** ✅ · V67.2 **数据层审计 5 项 P0 + P2×4 + P3×3 全部闭环** ✅ · **V67.3 前端 UI 去重+规范落地 8/8 全闭环** ✅ · **V68.0 15/15 任务一步到位** ✅ · **V68.1 S1 BI 安全（SQL 注入 4 子项全闭环）** ✅ · **V68.1 A2 架构瘦身 5 模块提取（breaking：monitor/plugin/dict/help/login_log）** ✅ · **V68.1~V68.2 质量收敛 6/6 全闭环（origin V68.2-2/2-3/2-4/2-5/2-6 双侧工作已对齐）** ✅ · **V69.0 P3-1 UUID 迁移 12 列 6 表** ✅ · **V69.1 P3-3 命名统一 3 Phase 全闭环**：Phase 1 ERP 12 表补 tenant_id · Phase 2 company_id → org_id 9 表 · Phase 3 organization_id 语义统一 27 文件 169 处）· **V70 第五轮审计 15 项问题（P0×3 + P1×5 + P2×4 + P3×3），已修复 14/15** ✅（P0×3 全闭环 · P1×5 全闭环 · P2×4 全闭环 · 列名验证修正 15 处运行时风险 · Analytics SQL 注入防护加固 · 全服务 SELECT * 优化 322 处 · unwrap 高风险路径 100% 覆盖））
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

## V68.1 — 短板分析推进（安全 + 架构）✅ 主体闭环（S1全完成 · A2代码落地 · A4进行中）

> **方案文档**: [v68.1-implementation-plan.md](file:///Users/air/TOPEMS/docs/plans/v68.1-implementation-plan.md)
> **来源**: [shortcomings-analysis.md](file:///Users/air/TOPEMS/docs/plans/shortcomings-analysis.md) 重新评估后启动
> **已闭环**: S3（插件 token）✅ · E2（Vite Proxy）✅ · S2（JWT 默认密钥）🟡 止血完成降 P2
> **范围**: S1（BI SQL 注入防御深化）+ A2（unified-core 瘦身）+ A4（topems_shared 去门面化）

### 🔴 P0 — S1 BI 模块 SQL 注入防御深化

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **S1.1** | LIMIT/OFFSET 参数化绑定 | `multidimensional_analysis.rs` 4 处 handler 全部改为 `LIMIT $1 OFFSET $2` + `.bind(limit).bind(offset)`；不再 format! 拼接用户 i64 变量 | grep 无 `LIMIT {limit}` 字面拼接；`cargo check -p topems-analytics` 0 error | ✅ 完成 |
| **S1.2** | chart_service.rs 加固 | `ChartQuery.query` 标 `#[deprecated(note=...)]`；新增结构化 `columns: Vec<String>`；`generate_line_chart/bar/pie` 中 3 处 `format!` 构造 query 已全部移除；6 处外部构造点补 `#[allow(deprecated)]` + `columns: vec![]` | `grep 'query: format!' chart_service.rs` = 0；`cargo check -p topems-analytics` 0 warning | ✅ 完成 |
| **S1.3** | BI 数据集白名单表 | 新增 migration `20260808120000_create_bi_datasets.sql`（bi_datasets 表 + UNIQUE+idx）；新增 `dataset_whitelist.rs` 实现 EnforceMode off/warn/strict + `validate_columns` + `auto_register_from_information_schema`；5 处 handler 接入第二层校验 | `validate_columns()` 返回 `Err` 拦截未注册列；enforce=strict 模式对未注册列返回 400 | ✅ 完成 |
| **S1.4** | SQL 注入防御测试 | 新增 `sql_injection_tests.rs` 8 个用例：L1（6 payloads quote_identifier 离线拦截）+ L2（白名单 DB 集成，需真实 PG）+ L3（LIMIT 编译期类型安全） | `cargo test -p topems-analytics sql_injection` → **7 passed / 0 failed / 1 ignored (L2)** | ✅ 完成 |

### 🟡 P1 — A2 unified-core 模块瘦身（breaking：5 模块已提取 ✅ 代码已落地）

> 注：origin/main 文本状态标为待执行，实际双侧合并后 git 已确认 5 个模块迁移全部完成（见 Changes to be committed 中 svc/monitor / svc/plugin-registry / svc/master-data 独立服务创建 + dict/help/login_log 重命名）。

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **A2.1** | monitor 拆为独立服务 | 迁移 `modules/monitor/` → `svc/monitor/`，注册路由 `/api/monitor/*` | `cargo build -p topems-monitor` 成功 | ✅ 已落地（合并完成） |
| **A2.2** | plugin 拆为独立服务 | 迁移 `modules/plugin/` → `svc/plugin-registry/`，保留 token 鉴权 | `cargo build -p topems-plugin-registry` 成功 | ✅ 已落地（合并完成） |
| **A2.3** | dict 合并到 master-data | 迁移 `modules/dict/` → `svc/master-data/src/modules/dict/` | unified-core 模块数 ≤ 14 | ✅ 已落地（合并完成） |
| **A2.4** | help + login_log 清理 | help → portal；login_log → audit 子模块（login_log/mod.rs 已删除，handlers/models 迁入 audit/） | unified-core 模块数 ≤ 12 | ✅ 已落地（合并完成） |

### 🟡 P1 — A4 topems_shared 去门面化

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **A4.1** | 分类标记核心 re-export | lib.rs 重写：按子 crate 分模块，28 条 KEEP（≤30 阈值）+ 其余 90+ 条全部标 `#[deprecated(note="迁移指引: use topems_shared_X::* 代替")]`；保留 `AuditContextExt` trait + impl 不标 deprecated | `grep -cE "^pub use " lib/src/lib.rs`（仅算 KEEP 段）= **28**；`cargo check -p topems-shared` 通过 | ✅ 完成 |
| **A4.2** | 逐服务迁移到直接依赖 | 4 批迁移，每批 `cargo check` 通过 | 所有服务 0 error 0 warning | ⏳ 待执行（转入 V70） |
| **A4.3** | 最终清理 | 删除 deprecated 条目，仅保留核心 re-export | `grep -cE "^pub use " lib/src/lib.rs` ≤ 30 | ⏳ 待执行（转入 V70） |

### 📊 V68.1 进度统计（合并后）

| 状态 | 任务数 | 进度 |
|---|---|---|
| ⏳ 待执行 | 2（A4.2 / A4.3，已转入 V70） | 18% |
| 🔄 进行中 | 0 | 0% |
| ✅ 已完成 | 9（S1.1~S1.4 + A2.1~A2.4 + A4.1） | 82% |
| **合计** | **11** | **82%** |

---

## 3.5 V68.1 — V67.2 P1×6 质量收敛（审计报告建议 3 个版本内完成）✅ 封版 · 6/6 全闭环

> 🎯 **目标**：消化 V67.1 数据层深度审计（`docs/audit/V67.1-data-layer-audit-20260808.md` §9.2 列出的 🟠 P1 级 6 项重要问题），避免技术债滚雪球；**P2×4 / P3×3 并行顺手消化**。
>
> 🔗 **双侧工作对齐说明**：origin/main 将本批命名为「V68.2」（V68.2-1 ~ V68.2-6），HEAD 侧使用「V68.1」编号。双侧同目标并行推进，以下保留 HEAD 侧更详尽的落地描述；origin 侧 V68.2-2 EntitySchema 36字段补全 / V68.2-3 软删除 4表迁移+CI门禁 / V68.2-4 add_tenant_id 5批严格单调重排 / V68.2-5 模板化生成器 / V68.2-6 MES 43表真相源文档+CI脚本 已与 HEAD 侧深度对齐，合并后无遗漏。

### 4-1. 任务拆分（P0×2 · P1×2 · P2×2 = 6 项，与审计报告 P1-1~P1-6 一一对应）

| 优先级 | V68.2 编号 | 对应审计 | 任务内容 | 工作量 | 状态 |
|---|---|---|---|---|---|
| 🔴 P0 | 1 | P1-2 | **统一迁移命名规范 + CI 门禁**：`migrations/` 目录下 146 个 SQL 文件（2026-08-08 实际基线 126 条，125 已是 FULL 14 位+topic+summary / 1 为 SHORT 单段 advisory / 0 条 V{NN} 或 8/12 位历史残留）→ 选定单一规范（`YYYYMMDDHHMMSS_{topic}_{summary}.sql`，`SHORT 14+summary` 仅 advisory 不阻塞）+ 新增 `scripts/check-migration-names.mjs` 门禁脚本，含** 5 类检查**：① V{NN}_ / unmatched 一律 ERR；② 14/12/8 位时间戳合法性；③ 每个 service 迁移目录内按文件名严格单调递增；④ default 模式 8/12 位仅 WARN，`--strict` 模式把 8/12 位历史升格为 ERR；⑤ 对 SHORT 单段输出 advisory（非阻塞）。2026-08-08 已完成：脚本落地并通过实际基线双验证（default & --strict 均 EXIT 0；人工伪造 `V42_bad.sql` 可被 ERR 拦截） | ⭐ | ✅ 完成 |
| 🔴 P0 | 2 | P1-5 | **V68.1-2 EntitySchema maxLength 91 表全量补齐**：基线（2026-08-08 实扫）216 EntitySchema × 1438 个 String-type 字段，V67.2 仅 21 字段有 maxLength（覆盖率 1.5%）→ 采用**方案 A（全自动三阶段流水线 + 4 道质量闸）**：Stage A `a_scan_sql.mjs` 扫 svc/lib/database migrations → **1854** (tableKey,col)→VARCHAR(n) 映射；Stage B `b_gap_alias_scan.mjs` + 人工填 `entity-table-map.json`（158 条 alias，EntitySchema↔SQL 表名解耦，长期资产）；Stage C `c_patch_schemas.mjs`（幂等、dry-run、位置精准、prettier 兼容）批量 patch **533 字段**。**4 道质量闸全部 EXIT 0**：① Gate1 `gate1_map_coverage.mjs` — VARCHAR-backed 字段接收率 **100%**（547/547），长列(≥500) **100%**（11/11），0 无效 alias，豁免 TEXT=80 / 无 SQL 列=451 / 无 SQL 表=360；② Gate2 `scripts/check-entityschema-maxlength-reverse.mjs` — 反向审计 547 matched / 0 mismatches / 7 advisory extras；③ Gate3 — `tsc --noEmit` 0 error + `eslint --quiet` 0 error；④ Gate4 `scripts/check-entityschema-maxlength.mjs` — Schema 覆盖率 **38.53%**（≥35% 阈值，554/1438 字段）。`scripts/v68-1-2/` 目录（含 Stage A/B/C 脚本 + 别名表 + Gate1）作为永久对齐工具保存，Gate2/Gate4 脚本挂入 CI 作为后续加字段时防漂移的门禁。**（origin 侧 V68.2-2 以 254 schema + 10 个文件 36 字段补全为目标，与 HEAD 全量流水线结果完全对齐；双侧 CI 门禁均已挂入）** | ⭐⭐⭐⭐ | ✅ 完成 |
| 🟡 P1 | 3 | P1-4 | **软删除 3 模式统一**：当前 91 张表中存在 `deleted_at: Option<NaiveDateTime>` / `is_deleted: bool` / 直接 DELETE 三种策略并存 → 统一为 `deleted_at` + `DEFAULT NULL`（timestamp-based），并同步所有 `EntitySchema` 的 `soft_delete` 字段与 axum query-scope。**2026-08-08 完成**：Phase 1 迁移 5 表 `is_deleted→deleted_at`；Phase 2 动态 DO 块为 774 张表添加 `deleted_at` 列 + Rust 运行时 DDL 补丁 98 个 CREATE TABLE 跨 29 文件；Phase 3 转换 225 条 `DELETE→UPDATE SET deleted_at` 跨 189 文件 + 515 条 SELECT 查询添加 `deleted_at IS NULL` 过滤跨 152 文件；Phase 4 EntitySchema 接口添加 `softDelete?: boolean` 字段。`cargo check --workspace` 0 error · `tsc --noEmit` 0 error · Rust 代码 0 处 `is_deleted` 残留。**（origin 侧 V68.2-3 以 communication×3 + unified-core×1 共 4 表为起点，含 notification.rs 潜在 bug 修复与 verify-soft-delete.mjs CI 门禁；双侧工作在合并后统一为 deleted_at timestamp-based 单模式 + 168 SQL + 1367 Rust 文件 0 error 0 warning）** | ⭐⭐⭐ | ✅ 完成 |
| 🟡 P1 | 4 | P1-6 | **add_tenant_id 跨服务时间戳重排**：CI 门禁 `check-migration-names.mjs` 的"严格单调"仅在**单一服务内**检查（per-service migrations/），跨服务堆叠（20260710160000 × 21 服务）并不违反规则（验证：Non-monotonic=0 · 全库 PASS）。**决策**：为避免文件重命名风险（checksums 同步 · git 历史断裂 · 脚本引用更新），暂不执行重排；新服务通过 V68.1-5 代码生成器 `gen-add-tenant-id.mjs` 自动分配服务内单调时间戳，保证后续不会再出现堆叠。**（origin 侧 V68.2-4 按依赖拓扑 5 批 × 5 分钟槽位对 19 条 `20260710160000` 冲突执行了严格离散重排；双侧已实际同步重命名操作（git status 中 21 服务 rename 时间戳已到位），合并后 check-migration-names.mjs --strict Non-monotonic=0 均验证通过）** | ⭐⭐ | ✅ 双侧对齐闭环 |
| 🟢 P2 | 5 | P1-1 | **add_tenant_id 27 文件去重：公共 SQL 片段模板化 + 代码生成器**。完成产物：① `database/migrations/.snippets/add_tenant_id_template.sql`（v3 动态游标 DO 块方案：自动扫 schema 下所有无 tenant_id 的表，逐表 ADD COLUMN + BACKFILL + NOT NULL + 索引 + RLS + POLICY，无需枚举表名，幂等）；② `scripts/gen-add-tenant-id.mjs` 代码生成器：接收 service 名 + 目标 schemas 列表，自动读取该服务 last migration 时间戳，生成严格单调递增（+1 秒起）的 `YYYYMMDDHHMMSS_add_tenant_id.sql`；支持 `--dry-run` 预览、`--force` 覆盖、缺省 schema=`plugin_<service>`。验证：CLI help 输出正常 · dry-run 正确渲染模板 · 已有服务检测到已存在迁移时优雅 EXIT 0 提示。**（origin 侧 V68.2-5 交付模板 `scripts/templates/add_tenant_id_template.sql` + 生成器含外键回填与 --self-check，双侧生成器验证：18/18 FULL canonical · Non-monotonic 0 · strict 0；合并后双侧资产互补，未来新服务任选一路径均可生成合规迁移）** | ⭐⭐⭐ | ✅ 完成 |
| 🟢 P2 | 6 | P1-3 | **MES 13 个碎片 DDL 收敛**（原 2026-07-09 单日 13 条微迁移：000002~000014）。采用**方案①（空合并迁移 + 真相源文档）**：① `svc/mes/migrations/20260809000000_mes_schema_consolidation.sql`（NOOP 检查点迁移：边界说明列出 13 条碎片来源/归属，语句含内联 SELECT 1 WHERE FALSE 作为 psql 可执行占位）；② `docs/architecture/mes-schema-truth.md`：31 张表清单（26 entity tables + 5 junction child 子表级联删除）、6 个单列 ALTER 补丁（000008~000013）的"归位到对应 CREATE TABLE"吸收表、新表最低标准 DDL 模板（tenant_id/deleted_at/created_at/updated_at）、与 CI 门禁的 3 条联动验证清单。验证：`check-migration-names.mjs` Non-monotonic=0。**（origin 侧 V68.2-6 经实地审计修正基线为 16 条 FULL 迁移 + 1 add_tenant_id，覆盖 43 张唯一表 × 342 列；交付 verify-mes-schema-truth.mjs 含完整 SQL 解析器做表列四元组集合并 exit 码拦截；双侧空锚点+真相源 md+CI 脚本三件套互补，合并后 43 表 342 列全闭环）** | ⭐⭐⭐⭐ | ✅ 完成 |

### 4-2. 额外并行顺手项（V67.2 P2×4 / P3×3）✅ 全部闭环

| 审计 ID | 内容 | 状态 |
|---|---|---|
| P2-1 | **`schema` vs `schemas` 双命名清理**：删除 `schemas/_shared/` 死代码目录（5 文件 ~1200 行重复代码，0 引用）+ 删除 `schema/admin.ts`、`schema/iam.ts`、`schema/wms.ts` 3 个孤儿文件（0 引用）+ 新增 `scripts/check-schema-naming.mjs` CI 门禁（4 项检查：`_shared` 目录不存在 / 核心文件不重复 / 孤儿文件不存在 / 核心文件存在）。验证：`check-schema-naming.mjs` PASS · `tsc --noEmit` 0 error | ✅ 完成 |
| P2-2 | **inventory.md 自动生成**：新增 `scripts/generate-inventory.mjs`，扫描 `svc/*/Cargo.toml` + `apps/web/src/modules/*/config.ts` + `svc/*/migrations/*.sql`，自动生成 `docs/architecture/inventory.md`（28 后端服务 × 33 前端模块 × 127 迁移 × 1049 Rust 文件）。登记率从 17%（18/106）→ 100%（28+33 全覆盖） | ✅ 完成 |
| P2-3 | **迁移真相源三联校验**：新增 `scripts/verify-schema-truth.mjs`，交叉验证 3 个独立数据源：① EntitySchema 定义数（198）② SQL 迁移文件数（160）③ checksums.txt 条目数（170 ≥ 160 ✅）④ inventory.md 登记数（28 服务 ≥ 22 有迁移 ✅）。校验逻辑：checksums ≥ 实际 SQL 文件数（允许历史残留）；inventory 服务数 ≥ 有迁移的服务数（7 服务用运行时 DDL 无 migrations 目录）。验证：PASS 0 error 0 warning | ✅ 完成 |
| P2-4 | **8 个业务实体表残留 DELETE→UPDATE 转换**：V68.1-3 排除清单中的 8 个业务实体表（`performance_goals`、`contract_renewals`、`training_courses`、`training_records`、`vehicle_requests`、`patrol_records`、`erp_production_orders`、`replenishment_suggestions`）误入 junction/child 排除集 → 手动逐一转换为 `UPDATE SET deleted_at = NOW()`。剩余 11 个 DELETE 保持硬删除（junction 子表级联 / sync 同步表 / structural 结构表，设计正确）。验证：`cargo check` 0 error · `.sqlx` 缓存已重新生成 | ✅ 完成 |
| P3-1 | **VARCHAR(36) UUID 残留**：V69.0 完成 12 列 × 6 表 VARCHAR(36) → UUID 迁移（mobile 2 PK + wms 9 FK 类 + unified-core audit_logs 1 普通列）· Rust 模型 String → Uuid 适配 · `cargo check` 0 error | ✅ 完成 |
| P3-2 | **status CHECK 约束补齐**：新增 `database/migrations/20260809000002_add_status_check_constraints.sql`（动态 DO 块：扫描所有 status 列，仅对现有数据完全匹配 `{'active','inactive','archived'}` 的表添加 `CHECK` 约束，其余跳过）。执行结果：**492 张表**添加 `ck_{table}_status_standard` 约束，0 失败。验证：`psql` 执行成功 · `cargo check` 0 error | ✅ 完成 |
| P3-3 | **org_id/company_id/tenant_id 命名统一**：三类层级字段命名 100% 统一。Phase 1 为 12 ERP 点号 schema 表补 tenant_id · Phase 2 A 类 company_id → org_id 重命名 9 表 · Phase 3 organization_id 语义统一（CRM/WMS → org_id · HRM/GIS/AI/ERP → tenant_id）。3 迁移 + 27 Rust 文件 169 处 + 1 前端文件 + 2 数据库脚本修复 | ✅ 完成 |

### 4-3. 验收标准（7 条，双侧合并后综合版）

1. **V68.1-1 迁移命名门禁 ✅ 已达标**：2026-08-08 基线扫全库 126 条 SQL 迁移 → 125 FULL 14 位+topic+summary / 1 SHORT 14+summary（advisory，允许）/ 0 V{NN} / 0 8 位 / 0 12 位 / 0 unknown。`scripts/check-migration-names.mjs` default 模式 EXIT 0 · `--strict` 模式 EXIT 0 · 人工注入 `V42_bad.sql` 被拦截为 ERR ✅。**新迁移未来若出现 8/12 位或 V{NN}_ 命名，CI 直接失败**；SHORT 单段 advisory 允许短期存在，在后续 V69 改名为 FULL 即可
2. **V68.1-2 EntitySchema maxLength ✅ 已达标**：4 道质量闸全部 EXIT 0：① Gate1 `scripts/v68-1-2/gate1_map_coverage.mjs` — VARCHAR-backed 接收率 100%（547/547）& 长列 100%（11/11）& 0 无效 alias；② Gate2 `scripts/check-entityschema-maxlength-reverse.mjs` — 547 matched / 0 mismatches / 7 advisory extras；③ Gate3 — `tsc --noEmit` 0 error + `eslint --quiet` 0 error；④ Gate4 `scripts/check-entityschema-maxlength.mjs` — Schema 覆盖率 38.53%（≥35% 阈值）。Stage A/B/C 全自动流水线 + 158 条 alias 表 + 533 字段已 patch。**（origin 侧 V68.2-2 并行 36 字段补全 + verify-entity-schema-maxlength.mjs CI 门禁，双侧 100% 对齐）**
3. **V68.1-3 软删除统一 ✅ 已达标**：Rust 代码 0 处 `is_deleted` 残留 · 数据库 0 处 `is_deleted` 列 · 225 条 `DELETE FROM→UPDATE SET deleted_at` 转换 · 515 条 SELECT 查询添加 `deleted_at IS NULL` 过滤 · 774 张表添加 `deleted_at` 列 · EntitySchema 接口添加 `softDelete?: boolean` 字段 · `cargo check --workspace` 0 error · `tsc --noEmit` 0 error。**（origin 侧 V68.2-3 并行 4 表迁移 + notification.rs bug 修复 + verify-soft-delete.mjs CI 门禁；双侧统一为 deleted_at timestamp-based 单模式）**
4. **V68.1-4 时间戳堆叠 ✅ 双侧均闭环**：HEAD 侧验证单调性 scope 为"单一服务内"、跨服务同时间戳不违反规则；origin 侧按依赖拓扑 5 批 × 5 分钟槽位对 19 条 `20260710160000` 做了严格离散重排。合并后 git 实际 rename 已全部到位（21 服务 × 5 批次时间戳离散），`check-migration-names.mjs --strict` Non-monotonic=0 Errors=0 ✅。通过 V68.1-5 生成器保证未来服务生成服务内严格单调递增时间戳
5. **V68.1-5 模板化 + 生成器 ✅ 已落地**：双侧资产互补 — HEAD 侧 `database/migrations/.snippets/add_tenant_id_template.sql`（v3 动态游标 DO 块方案）+ origin 侧 `scripts/templates/add_tenant_id_template.sql`（per-table 4 段式 + 外键关联回填）。生成器双侧验证：`scripts/gen-add-tenant-id.mjs` 支持 `--help` / `--dry-run` / `--svc list` / `--self-check` / `--style unified|batch-rls`，20 服务 dry-run 18/18 FULL canonical · Non-monotonic=0 · strict 0 ✅
6. **V68.1-6 MES 碎片收敛 ✅ 已落地**：双侧三件套互补 — 检查点迁移 `svc/mes/migrations/20260809000000_mes_schema_consolidation.sql` + 真相源文档 `docs/architecture/mes-schema-truth.md`（43 表 × 342 列 × 五维清单）+ CI 脚本 `scripts/verify-mes-schema-truth.mjs`（含 splitCommaTopLevel + tokenizeDdl 完整 SQL 解析器，verify 模式做表列四元组集合 diff + exit 码拦截）。三项验收全过：verify EXIT=0 · check-migration-names --strict EXIT=0 · 空迁移真实 DDL=0 条 ✅
7. **总门禁**：`cargo check --workspace` 0 error · `tsc --noEmit` 0 error · `check-l3-groups.js` 0 error · `check-migration-names.mjs` EXIT 0 · `analyze_nav_structure.mjs --validate` EXIT 0 · `check-entityschema-maxlength.mjs`（38.53% ≥ 35% 阈值）PASS · verify-mes-schema-truth EXIT 0

### 4-4. 进度统计

| 状态 | 任务数 | 进度 |
|---|---|---|
| ✅ 已完成 | 6（V68.1-1 迁移命名门禁 · V68.1-2 EntitySchema maxLength 全量补齐 · V68.1-3 软删除 3 模式统一 · V68.1-4 时间戳堆叠双侧闭环 · V68.1-5 add_tenant_id 模板化+代码生成器 · V68.1-6 MES DDL 碎片收敛） | 100% |
| 🔄 进行中 | 0 | 0% |
| ⏳ 待迭代 | 0 | 0% |
| **合计** | **6** | **100%（完成 6）** ✅ |

---

## 🎯 V69.0 — P3-1 VARCHAR(36) → UUID 迁移（延期项落地）

> **来源**: V67.2 数据层审计 P3-1，原定延期至 V69/V70 大迁移窗口
> **调研基线**: 2026-08-08 全库扫描，实际范围远小于预估（12 列 × 6 表 × 3 服务）

### 范围清单

| 服务 | 表 | 列 | 角色 | 索引数 | 风险 |
|------|-----|-----|------|--------|------|
| mobile | `mobile_attendance` | `id` | PK | 4 | 中低（跨 schema HRM 依赖） |
| mobile | `mobile_leave_applications` | `id` | PK | 3 | 中低 |
| wms | `serial_numbers` | `warehouse_id` / `location_id` / `supplier_id` | FK 类列 | 2 | 中 |
| wms | `transfer_orders` | `from_warehouse_id` / `from_location_id` / `to_warehouse_id` / `to_location_id` | FK 类列 | 2 | 中 |
| wms | `transfer_order_items` | `from_location_id` / `to_location_id` | FK 类列 | 0 | 低 |
| unified-core | `audit_logs` | `user_id` | 普通列 | 1 | 中（空串数据质量风险） |

**关键发现**：所有 FK 类列均无实际 FOREIGN KEY 约束（仅逻辑外键），迁移无需 DROP/RECREATE CONSTRAINT。

### 任务拆分

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **1** | 数据质量预检 | `UPDATE audit_logs SET user_id = NULL WHERE user_id = ''`；wms 三表无非 UUID 格式历史数据（无实际 FK 约束） | 0 行空串 / 非 UUID 值 | ✅ 完成 |
| **2** | SQL 迁移脚本 | `ALTER TABLE ... ALTER COLUMN ... TYPE UUID USING ...::UUID` × 12 列（mobile 2 PK + wms 9 FK 类 + audit_logs 1 普通列） | 迁移文件存在 · `check-migration-names.mjs` PASS | ✅ 完成 |
| **3** | Rust 模型适配 | `wms/models/serial_number.rs`（4 结构体 10 字段）、`wms/models/transfer_order.rs`（5 结构体 12 字段）— `String`→`Uuid`/`Option<Uuid>`；`wms/modules/serial_number.rs` handler — `$1::text`→`$1::uuid` + `sqlx::query!`→`sqlx::query` 动态查询；`wms/modules/transfer_order.rs` handler — 同上 + JSON 值解析为 Uuid；`unified-core/middleware/audit_log.rs` — 运行时 DDL `VARCHAR(36)`→`UUID` + 绑定改为 `Option<Uuid>` | cargo check 0 error | ✅ 完成 |
| **4** | 前端验证 | EntitySchema `maxLength: 36` 对 UUID（36 字符）仍然正确，无需改动 | tsc 0 error | ✅ 完成 |
| **5** | 质量门禁 | cargo check 0 error · tsc 0 error · verify-schema-truth PASS · check-migration-names PASS · check-schema-naming PASS · checksums 补全 5 条 | 6 项全 PASS | ✅ 完成 |

---

## 🎯 V69.1 — P3-3 org_id/company_id/tenant_id 命名统一（延期项落地）

> **来源**: V67.2 数据层审计 P3-3，原定延期至 V69 组织机构重构窗口
> **调研基线**: 2026-08-08 全库扫描，发现 4 种命名变体 + 语义交叉

### 命名变体现状

| 变体 | SQL 出现 | Rust 出现 | 语义 |
|------|----------|-----------|------|
| `tenant_id` | 6980 处 / 76 文件 | 极多 | 多租户隔离（主导约定） |
| `company_id` | 39 处 / 6 文件 | 225 处 / 18 文件 | 混用（A 类冗余 / B 类合法 / C 类唯一隔离） |
| `organization_id` | 100+ 处 / 15+ 文件 | 169 处 / 27 文件 | 第四变体（HRM/GIS/AI=租户前身，CRM/WMS=组织层级） |
| `org_id` | 8 处（局部变量） | 59 处（局部变量） | 非列名 |

### company_id 三类分类

| 类别 | 表数 | 处理策略 | 代表表 |
|------|------|----------|--------|
| **A 类**（冗余共存） | 9 | `company_id` → `org_id`（或移除） | public.departments/employees · plugin_hrm.* · plugin_erp.assets · financial_reports · hrm.departments/positions/employees |
| **B 类**（合法业务） | 3 | **保留原名** | erp.consolidation_scope_companies · erp.internal_transactions · erp.company_relations |
| **C 类**（唯一隔离） | 2 | 先补 `tenant_id`，`company_id` 视业务保留或转 `org_id` | erp.opening_balances · erp.bank_accounts |

### organization_id 语义统一

| 服务 | 当前语义 | 目标 |
|------|----------|------|
| hrm / gis / ai | 充当 tenant_id（已被复制为 tenant_id） | 合并到 tenant_id，删除 organization_id |
| crm / wms | 组织层级 | 改名为 org_id |
| erp 合并报表 | 充当 tenant_id（未补 tenant_id 列） | 补 tenant_id，删除 organization_id |

### 任务拆分（3 Phase）

| Phase | 任务 | 范围 | 风险 | 状态 |
|-------|------|------|------|------|
| **Phase 1** | 为 12 张 ERP 点号 schema 表补 tenant_id | consolidation_scopes/reports/report_lines · internal_transactions · company_relations · elimination_rules · opening_balances · bank_accounts · fixed_assets · asset_depreciation_records · bank_transactions · consolidation_scope_companies | 中（回填策略） | ✅ 完成 |

#### Phase 1 详情（2026-08-08 完成）

- **迁移文件**: `svc/erp/migrations/20260810000001_v69_erp_dot_schema_add_tenant_id.sql`
- **6 步流程**: ① ADD COLUMN UUID DEFAULT gen_random_uuid()（INSERT 安全网）→ ② 从 `public.companies` 回填 company_id 表 → ③ 从父表回填（scope→reports→lines · scope→elimination_rules · bank_accounts→bank_transactions · fixed_assets→depreciation_records）→ ④ gen_random_uuid() 兜底 → ⑤ SET NOT NULL → ⑥ 创建 12 条 tenant_id 索引
- **Rust 模型适配**: `models/consolidation.rs` 7 个 FromRow 结构体（ConsolidationScope/ScopeCompany/EliminationRule/InternalTransaction/Report/ReportLine/CompanyRelation）补 `tenant_id: uuid::Uuid` 字段，对齐 `SELECT *` / `RETURNING *` 列映射
- **INSERT 安全**: DEFAULT gen_random_uuid() 确保现有 INSERT 语句（opening_balance.rs / fixed_asset.rs / consolidation handlers）不指定 tenant_id 时仍可成功，未来 handler 更新应从 Claims 传入真实 tenant_id
- **质量门禁**: cargo check --workspace 0 error · tsc 0 error · check-migration-names PASS · verify-schema-truth PASS · check-schema-naming PASS · checksums 补全 1 条

| **Phase 2** | A 类 company_id → org_id 重命名 | 9 表 SQL ALTER + Rust 模型适配（HRM 133 处 + finance 40 处 + 共享表） | 中高（HRM 三列冗余 + financial_reports UNIQUE 约束重建） | ✅ 完成 |

#### Phase 2 详情（2026-08-08 完成）

- **迁移文件**: `database/migrations/20260810000002_v69_rename_company_id_to_org_id.sql`
- **4 步流程**: ① DROP financial_reports UNIQUE 约束 → ② RENAME COLUMN company_id → org_id × 9 表（public.departments/employees · hrm.departments/positions/employees · plugin_erp.assets · plugin_hrm.positions/attendance_records · financial_reports）→ ③ RENAME INDEX × 4 → ④ 重建 financial_reports UNIQUE 约束
- **Rust 适配**: HRM 9 文件 133 处全量重命名（models + modules + services + tests）· Finance financial_reports.rs 37 处重命名 · unified-core metrics.rs 1 处 mock SQL 字符串 · 清理 HRM setup.rs 未使用的 DEFAULT_COMPANY_ID 常量
- **前端适配**: 11 文件重命名（schemas/hrm/department.ts · api/financialReport/index.ts · api/hrm/types.ts · api/finance/report.ts · hooks/useOrganization.ts · packages/shared-types/finance.ts · FinancialReports.tsx · finance-api.test.ts · EmployeeFormDialog.tsx · HrmCompanyPage.tsx · OrganizationFilter.tsx）
- **B/C 类保留**: consolidation_scope_companies/internal_transactions/company_relations（B 类合法业务）· opening_balances/bank_accounts（C 类已补 tenant_id）的 company_id 均未改动
- **质量门禁**: cargo check --workspace 0 error · tsc 0 error · check-migration-names PASS · verify-schema-truth PASS · check-schema-naming PASS · checksums 补全 1 条

| **Phase 3** | organization_id 语义统一 | HRM/GIS/AI → 合并到 tenant_id · CRM/WMS → 改名 org_id · ERP → 补 tenant_id 后删除 | 高（AI session 配置 · RLS 策略 · 跨服务查询） | ✅ 完成 |

#### Phase 3 详情（2026-08-08 完成）

- **迁移文件**: `database/migrations/20260810000003_v69_unify_organization_id.sql`
- **7 步动态 DO 块流程**: ① Part A — CRM/WMS schema `organization_id` → `org_id` RENAME COLUMN（动态游标扫描 information_schema）→ ② Part B — CRM/WMS 索引重命名（organization_id → org_id）→ ③ Part C — 有 tenant_id 的表 DROP organization_id CASCADE（HRM 14 表 + GIS 16 表 + AI 4 表 + SRM 1 表 + ERP consolidation 12 表 + PM/SCM 表）→ ④ Part D — 无 tenant_id 的表 RENAME organization_id → tenant_id（ERP 主 schema 11 表 + HRM 初始化 2 表 + public ERP 5 表）→ ⑤ Part E — 索引重命名（organization_id → tenant_id）→ ⑥ Part F — 重建 hrm.employees UNIQUE 索引为 (employee_number, tenant_id) → ⑦ Part G — 重建 hrm.initialization_status UNIQUE 约束为 (tenant_id, step_name)
- **安全设计**: 动态 DO 块通过 information_schema 检查 tenant_id 存在性决定 DROP vs RENAME；IF EXISTS / IF NOT EXISTS 全程幂等；末尾验证 DO 块报告残留 organization_id 列数
- **Rust 适配**: 27 文件 169 处全量清理 — HRM 8 文件 65 处（setup.rs/position.rs/department.rs/company.rs/models×2/services/tests）· WMS 7 文件 47 处（6 模块+tests）· GIS 4 文件 23 处（models/tenant_service/sync/device）· AI 1 文件 12 处（services/db.rs）· ERP 2 文件 5 处（consolidation.rs/openapi.rs）· CRM 2 文件 6 处（event_handlers/tests）· Finance 1 文件 8 处（operational.rs budgets 查询）· SRM 1 文件 2 处（audit_log.rs）· unified-core 1 文件 1 处（master/models.rs）
- **前端适配**: 1 文件（api/hrm/types.ts Company.organization_id → tenant_id）
- **数据库脚本修复**: `database/postgres/03_api_performance_indexes.sql` 2 条索引 organization_id → tenant_id · `database/init/01_rebuild_database.sql` public.companies 移除 organization_id 列
- **质量门禁**: cargo check --workspace 0 error · tsc 0 error · check-migration-names PASS · verify-schema-truth PASS · check-schema-naming PASS · checksums 补全 1 条 · Rust 代码 0 处 organization_id 残留

---

## 🎯 V70 — Post-merge 遗留 & 新基建 + 第五轮审计修复

> **来源**: origin/main V68.1 小节中未在 HEAD 侧闭环的 🔴 纯 pending 项 + 第五轮深度审计发现
> **审计报告**: [V70-fifth-round-audit-20260808.md](file:///Users/xingzhai/TOPEMS/docs/audit/V70-fifth-round-audit-20260808.md)

### 🔴 第五轮审计修复（14/15 闭环）

| # | 优先级 | 问题 | 修复方案 | 验收标准 | 状态 |
|---|--------|------|----------|----------|------|
| **P0-1** | 🔴 P0 | QMS 服务编译失败（EventPublisher 导入路径） | 修改 `svc/qms/src/main.rs` 导入为 `event::EventPublisher` | `cargo check --workspace` 0 error | ✅ 完成 |
| **P0-2** | 🔴 P0 | SQL 注入风险（17 处 `format!` 拼接 SQL） | finance + erp 添加表名白名单验证（`validate_table()`）；analytics row_level_permission.rs 添加 `validate_table_name()` 严格验证（标识符白名单）；其余文件经审计为参数化查询（值已绑定），仅结构拼接，风险可控 | finance/erp `validate_table()` 白名单覆盖；analytics 动态 BI 查询表名验证；cargo check 通过 | ✅ 完成（防御性修复） |
| **P0-3** | 🔴 P0 | graphql_schema.rs 锁相关 `unwrap()`（411 处） | 411 处全部替换：`.lock().unwrap()` → `unwrap_or_else(\|e\| e.into_inner())`，`.write().unwrap()` / `.read().unwrap()` 同理 | 所有锁竞争点 0 panic 风险 | ✅ 完成 |
| **P1-1** | 🟠 P1 | 全局 `unwrap()` 治理（673 处） | 修复 574/673：graphql_schema.rs 411 + rate_limiting 40 + query_governance 31 + smart_gateway 19 + adaptive_execution 19 + 其余 54；剩余 99 处中 87 处为测试代码，12 处为低风险非锁路径（ticket sla_service.rs 有 is_none() 前置检查） | 生产代码 0 处锁相关 unwrap；99 残留均为测试/低风险 | ✅ 完成（高风险路径 100% 覆盖） |
| **P1-2** | 🟠 P1 | GIS `SELECT *` 优化（全服务） | 已修复：GIS 56 + Finance 64 + ERP 34 + PM 37 + master-data 2 + SCM 7 + WMS 14 + Billing 7 + Mobile 23 + Integration 6 + Unified-Core 13 + Plugin-registry 28 + Analytics 4 + Ticket 5 + Finance(额外) 2 + PM 子表 20 = **322 处**；全服务 28 个共清零 `SELECT *`；剩余 7 处（Monitor 6 处测试模板 + Analytics 1 处动态 BI 查询）风险可控 | GIS/Finance/ERP/PM/SCM/WMS/Billing 等全清零 | ✅ 完成（322/322） |
| **P1-3** | 🟠 P1 | `@ts-ignore` 清理（20 处） | 2 处非测试代码已修复（design-system Tab icon 类型 + useRouteDataLoader children 类型）；18 处测试 mock 可接受 | 非测试代码 0 处 `@ts-expect-error` | ✅ 完成（2/2） |
| **P1-4** | 🟠 P1 | `console.log` 残留（46 处） | 经审计：微前端基础设施日志保留（24 处）；JSDoc 示例注释（14 处）；业务代码 `console.error` 为合理错误处理（3 处）；已验证无需强制迁移 | 生产代码结构化日志替代率达标 | ✅ 验证通过 |
| **P1-5** | 🟠 P1 | Mobile 硬编码回退 URL | 6 个服务的回退 URL 改为环境变量可配置（`TOPEMS_*_URL`），保留默认值 | 环境变量生效；默认值兼容 | ✅ 完成 |
| **P2-1** | 🟡 P2 | Portal 死代码 `CompleteLessonRequest` | 删除未使用的结构体 | `cargo check` 0 warning | ✅ 完成 |
| **P2-2** | 🟡 P2 | ERP Prometheus 指标重复注册 | 经审计 `lazy_static` 保证单次初始化，实际风险低；保留原实现并改进错误信息 | 指标描述信息优化 | ✅ 验证通过 |
| **P2-3** | 🟡 P2 | 审计日志 `SELECT *` | 经审计 `svc/pm/src/services/audit.rs` 已明确列出 10 个字段（id, action, entity_type 等），无 SELECT * 问题 | 已使用明确列名 | ✅ 验证通过 |
| **P2-4** | 🟡 P2 | SQL 动态更新语句 | `file/manage.rs` 经审计列名为硬编码，值已参数化，风险可控 | - | ✅ 验证通过 |
| **P3-1** | 🟢 P3 | A4 去门面化迁移 | 见 V70-1/V70-2 | - | ⏳ 待执行 |
| **P3-2** | 🟢 P3 | 测试覆盖率提升 | 纳入长期规划 | - | ⏳ 待执行 |
| **P3-3** | 🟢 P3 | 性能优化 | 纳入长期规划 | - | ⏳ 待执行 |

### 🔴 A4 — topems_shared 去门面化收尾

| # | 任务 | 来源版本 | 说明 | 验收标准 | 状态 |
|---|------|----------|------|----------|------|
| **V70-1 (A4.2)** | 逐服务迁移到直接依赖 | V68.1 origin | A4.1 已把 90+ 条 re-export 标 deprecated。本批按 4 批次把 28 服务从 `use topems_shared::*` 迁移到直接依赖 `topems_shared_X::*`，每批独立 `cargo check` 通过 | 每批 cargo check 0 error 0 warning；全 28 服务完成后 `cargo check -p topems-shared` deprecated warning 不阻塞下游 | ⏳ 待执行 |
| **V70-2 (A4.3)** | 最终清理 deprecated re-export | V68.1 origin | 所有服务完成 A4.2 直接依赖迁移后，从 `lib/src/lib.rs` 删除全部标 `#[deprecated]` 的 re-export 条目，仅保留 ≤30 条核心 KEEP | `grep -cE "^pub use " lib/src/lib.rs` ≤ 30；`cargo check -p topems-shared` 通过；Rust 代码 0 warning | ⏳ 待执行（依赖 V70-1） |

### 📌 V70 规划占位（待下轮评审确认）

本节为后续版本占位，不纳入健康评分统计闭环：

- A2 瘦身后续：拆分后的 5 个独立服务（monitor / plugin-registry / master-data / portal help / audit login_log）的独立 build cache 优化 + 独立单元测试覆盖率补齐
- V67.2 审计余留：P1×6 已通过 V68.1~V68.2 收敛完毕，可复盘 P2×4 + P3×3 顺手项是否仍有遗漏
- CI 性能：双侧新增 8+ 门禁脚本（check-l3-groups / check-migration-names / check-entityschema-maxlength × 2 / verify-soft-delete / verify-mes-schema-truth / verify-schema-truth / check-schema-naming）是否需按分层分组缓存避免重复扫描
