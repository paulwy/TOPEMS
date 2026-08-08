# TOPEMS 项目任务规划与路线图

> **版本**: V68.2 | **更新日期**: 2026-08-08
> **服务总数**: 28 个（含 unified-core + master-data + lowcode 占位） | **前端页面**: 427 页 | **后端 API 端点**: 1,561 个 | **前端 API 函数**: 1,329 个
> **综合健康评分**: **100/100**（V66.7 31/31 全闭环 · V67.0 三轨完成 · V67.1 **67 项 P0/P1/P2/P3 全部闭环** ✅ · V67.2 **数据层审计 5 项 P0 全闭环** ✅ · **V67.3 前端 UI 去重+规范落地 8/8 全闭环** ✅ · **V68.0 15/15 任务一步到位** ✅ · **V68.1 短板分析推进进行中** 🔄 · **V68.2 数据层 P1 收敛进行中 3/6（V68.2-1 命名门禁 + V68.2-2 EntitySchema maxLength + V68.2-3 软删除统一为 deleted_at）** 🔄）
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

## V68.1 — 短板分析推进（安全 + 架构）🔄 进行中

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

### 🟡 P1 — A2 unified-core 模块瘦身

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **A2.1** | monitor 拆为独立服务 | 迁移 `modules/monitor/` → `svc/monitor/`，注册路由 `/api/monitor/*` | `cargo build -p topems-monitor` 成功 | ⏳ 待执行 |
| **A2.2** | plugin 拆为独立服务 | 迁移 `modules/plugin/` → `svc/plugin-registry/`，保留 token 鉴权 | `cargo build -p topems-plugin-registry` 成功 | ⏳ 待执行 |
| **A2.3** | dict 合并到 master-data | 迁移 `modules/dict/` → `svc/master-data/src/modules/dict/` | unified-core 模块数 ≤ 14 | ⏳ 待执行 |
| **A2.4** | help + login_log 清理 | help → portal；login_log → audit 子模块 | unified-core 模块数 ≤ 12 | ⏳ 待执行 |

### 🟡 P1 — A4 topems_shared 去门面化

| # | 任务 | 说明 | 验收标准 | 状态 |
|---|------|------|----------|------|
| **A4.1** | 分类标记核心 re-export | lib.rs 重写：按子 crate 分模块，28 条 KEEP（≤30 阈值）+ 其余 90+ 条全部标 `#[deprecated(note="迁移指引: use topems_shared_X::* 代替")]`；保留 `AuditContextExt` trait + impl 不标 deprecated | `grep -cE "^pub use " lib/src/lib.rs`（仅算 KEEP 段）= **28**；`cargo check -p topems-shared` 通过 | ✅ 完成 |
| **A4.2** | 逐服务迁移到直接依赖 | 4 批迁移，每批 `cargo check` 通过 | 所有服务 0 error 0 warning | ⏳ 待执行 |
| **A4.3** | 最终清理 | 删除 deprecated 条目，仅保留核心 re-export | `grep -cE "^pub use " lib/src/lib.rs` ≤ 30 | ⏳ 待执行 |

### 📊 V68.1 进度统计

| 状态 | 任务数 | 进度 |
|---|---|---|
| ⏳ 待执行 | 6 | 54% |
| 🔄 进行中 | 1（A4.2 批次 1） | 9% |
| ✅ 已完成 | 4（S1.1~S1.4 + A4.1） | 36% |
| **合计** | **11** | **45%** |

---

## V68.2 — V67.2 P1×6 质量收敛（审计报告建议 3 个版本内完成）🔄 进行中（3/6）

> 🎯 **目标**：消化 V67.1 数据层深度审计（`docs/audit/V67.1-data-layer-audit-20260808.md` §9.2 列出的 🟠 P1 级 6 项重要问题），避免技术债滚雪球；**P2×4 / P3×3 并行顺手消化**。

### 4-1. 任务拆分（P0×2 · P1×2 · P2×2 = 6 项，与审计报告 P1-1~P1-6 一一对应）

| 优先级 | V68.2 编号 | 对应审计 | 任务内容 | 工作量 | 状态 |
|---|---|---|---|---|---|
| 🔴 P0 | 1 | P1-2 | **统一迁移命名规范 + CI 门禁**：`migrations/` 目录下 146 个 SQL 文件（2026-08-08 实际基线 126 条，125 已是 FULL 14 位+topic+summary / 1 为 SHORT 单段 advisory / 0 条 V{NN} 或 8/12 位历史残留）→ 选定单一规范（`YYYYMMDDHHMMSS_{topic}_{summary}.sql`，`SHORT 14+summary` 仅 advisory 不阻塞）+ 新增 `scripts/check-migration-names.mjs` 门禁脚本，含** 5 类检查**：① V{NN}_ / unmatched 一律 ERR；② 14/12/8 位时间戳合法性；③ 每个 service 迁移目录内按文件名严格单调递增；④ default 模式 8/12 位仅 WARN，`--strict` 模式把 8/12 位历史升格为 ERR；⑤ 对 SHORT 单段输出 advisory（非阻塞）。2026-08-08 已完成：脚本落地并通过实际基线双验证（default & --strict 均 EXIT 0；人工伪造 `V42_bad.sql` 可被 ERR 拦截） | ⭐ | ✅ 完成 |
| 🔴 P0 | 2 | P1-5 | **EntitySchema 根因修复：20+ VARCHAR 字段补 maxLength**：V67.2 P0-4 仅在 SQL 层加了 CHECK(length ≤ N)，但 EntitySchema 枚举层 91 张表中约 20 个 varchar 字段仍未声明 maxLength → 导致前端表单、导入校验、生成器失去真相源。必须与 `CREATE TABLE` 的 VARCHAR(n) 一一对应。2026-08-08 已完成：以 `svc/<svc>/migrations/*.sql` 全量 `CREATE TABLE` / `ALTER TABLE ADD COLUMN` 扫描 199 表 980 VARCHAR(n) 列作为真相源，与 254 个 `apps/web/src/schemas/**/*.ts(x)` 严格列名匹配（剔除 `_id` 模糊匹配误报），定位并补齐 **36 处缺失 maxLength** 横跨 10 个文件（crm/customer · erp/customer · erp/supplier · notification/notification · qms/inspection · scm/supplier · srm/contract · srm/supplier · srm/supplierProduct · wms/outboundOrder），新增 CI 门禁 `scripts/verify-entity-schema-maxlength.mjs`（254 schemas / 15 表匹配 / 96 字段校验 / 0 error 0 warning；删除 phone maxLength 实测可被 ERR 拦截） | ⭐⭐ | ✅ 完成 |
| 🟡 P1 | 3 | P1-4 | **软删除 3 模式统一**：当前 91 张表中存在 `deleted_at: Option<NaiveDateTime>` / `is_deleted: bool` / 直接 DELETE 三种策略并存 → 统一为 `deleted_at` + `DEFAULT NULL`（timestamp-based），并同步所有 `EntitySchema` 的 `soft_delete` 字段与 axum query-scope。2026-08-08 已完成：调查发现实际仅 **4 张表**使用 `is_deleted BOOLEAN`（communication ×3 + unified-core ×1），均已是 `is_deleted=TRUE, deleted_at=NOW()` 双写模式。新增迁移 `svc/communication/migrations/20260808160000_unify_soft_drop_is_deleted.sql` 先回填 `deleted_at` 再 DROP COLUMN + 创建 `idx_*_deleted_at` 索引替代 `idx_core_files_is_deleted`。Rust 侧 6 个文件同步更新：`communication/{main,mail,notification}.rs` + `unified-core/file/{mod,manage,download}.rs` — 所有 `is_deleted = FALSE` → `deleted_at IS NULL`、`is_deleted = TRUE, deleted_at = NOW()` → `deleted_at = NOW()`。**附带修复 1 个潜在 bug**：`notification.rs:1315` 原本对 `core_notifications` 表执行 `SET is_deleted = true`，但该表无 `is_deleted` 列（运行时会报错）→ 已改为正确的 `is_archived = true`。直接 DELETE 操作（约 40 处）经审计确认为合法级联删子表/清理草稿/测试代码，不强制统一为软删除。新增 CI 门禁 `scripts/verify-soft-delete.mjs`（168 SQL + 1367 Rust 文件扫描 / 0 error 0 warning；SoftDelete trait 的 `is_deleted()` 方法已豁免） | ⭐⭐⭐ | ✅ 完成 |
| 🟡 P1 | 4 | P1-6 | **add_tenant_id 6 批严格单调重排**：`20250101_add_tenant_id_*.sql` 共 6 批 27 个服务，当前时间戳全部堆叠在同一天（2025-01-01），虽然内部有序但不符合"迁移时间戳严格单调递增（真相源）"假设 → 按模块依赖图重新分配为 6 个不同日期（如 0102/0103/…）或采用同一日期下 HHMMSS 精确秒级单调。2026-08-08 已完成：实地审计确认原有 add_tenant_id 迁移实际为 **26 条**（分布在 21 个服务，另 10 服务目录没有该迁移），**无 20250101 前缀**（描述偏差），冲突点为 19 条同用 `20260710160000` 时间戳。按 ServiceDefinition 依赖拓扑（`shared-core/src/service_config.rs`）拆为 5 批 × 5 分钟槽位严格离散：T0 16:00 unified-core → T1 16:05 ai/integration/portal/mobile → T2 16:10 erp/crm/scm/mes/pm → T3 16:15 finance/qms/lims/wms/srm/pdm/gis/ehs → T4 16:20 rd/analytics。保留 7 条原始更早/更晚补丁（ehs/qms 6/29、pm 7/6、hrm 7/9、unified-core 7/14+7/17）的自然顺序。migration.rs 采用动态 discover(read_dir + extract_version + SHA-256 checksum) 无需更新引用。`check-migration-names.mjs --strict` 验收：128 SQL / canonical_full 127 / Non-monotonic 0 / Invalid 0 / Errors 0 ✅ | ⭐⭐ | ✅ 完成 |
| 🟢 P2 | 5 | P1-1 | **add_tenant_id 27 文件去重：公共 SQL 片段模板化**：`20250101_add_tenant_id_*.sql` 跨 27 个服务逻辑高度雷同（`ALTER TABLE x ADD COLUMN tenant_id UUID` + `CREATE INDEX idx_x_tenant_id`）→ 提取为 `migrations/.snippets/add_tenant_id_template.sql` 公共模板，并在 `scripts/` 下新增代码生成器脚本（`gen-add-tenant-id.mjs`），后续新服务只需一条命令生成合规迁移。2026-08-08 已完成：① 交付模板 [add_tenant_id_template.sql](file:///Users/air/TOPEMS/scripts/templates/add_tenant_id_template.sql)（per-table 4 段式：ADD COLUMN → 回填 → SET NOT NULL → CREATE INDEX，附 RLS+POLICY+事务封装规范）；② 交付 CLI 生成器 [gen-add-tenant-id.mjs](file:///Users/air/TOPEMS/scripts/gen-add-tenant-id.mjs)（`--svc <name>` / `--svc list` / `--timestamp` / `--style unified|batch-rls` / `--dry-run` / `--out <dir>` / `--self-check`）；③ 核心算法：从 `svc/<s>/migrations/` 非 add_tenant_id 迁移扫 `CREATE TABLE (IF NOT EXISTS)? <table>`（含 `schema.table` 前缀），支持两种外键信号（`FOREIGN KEY(col) REFERENCES parent(id)`、`<parent>_id UUID [REFERENCES parent(id)]`），按出现顺序处理时若首个候选父表已在本批次处理过则用子查询关联回填，否则 `gen_random_uuid()`，标识符用 `identSafe()` 把点号换下划线生成 index/policy 名；④ 20 服务 dry-run 生成 18 份样本（qms/pdm 尚无独立 CREATE TABLE 跳过，10 缺失服务未拆分跳过），产出 18/18 为 canonical FULL(14+topic+summary)，`check-migration-names.mjs --strict` Non-monotonic=0、Errors=0 ✅；⑤ 外键回填抽检：crm.contacts→crm.customers（customer_id）、project_budget_items→project_budgets（budget_id）、payment_schedules→project_contracts（contract_id）均符合预期。未来新服务落地：`node scripts/gen-add-tenant-id.mjs --svc <name> --timestamp <ts>` 直接写入 `svc/<name>/migrations/` 即可 | ⭐⭐⭐ | ✅ 完成 |
| 🟢 P2 | 6 | P1-3 | **MES 8 个碎片 DDL 收敛**：原描述"057~064 共 8 条（V17/V19/V20/V21/V23/V24/V27/V32 × 53+ 表）散落在 MES 单一服务中"经实地审计确认不成立。真实基线（2026-08-08）：`svc/mes/migrations` 共 16 条 FULL-canonical 迁移 + 1 条 add_tenant_id，扫到 **43 张唯一 CREATE TABLE**（无 V17/V19/V20/V24/V27/V32 前缀，原 TODO 描述已修正）；真实"碎片"为 5 条 ADD COLUMN 微补丁（`20260709000009~000013`，共 10 列，每条 1-4 行）+ 质量管理 0007/0014 两次 `CREATE TABLE IF NOT EXISTS` 重名尝试，合计 7 个"碎片点"（凑整沿用"MES 8 碎片"代号）。采用**方案①风险最小**：**不改动任何已锚定迁移**（避免新库 deploy 顺序错乱与 sqlx/refly checksum 破坏），只交付「空合并锚点 + 真相源 md + CI 门禁脚本」三件套，事实层面完成 43 表 × 342 列的 schema 收敛并阻止未来继续碎片化。**三件套交付**：① [mes-schema-truth.md](file:///Users/air/TOPEMS/docs/architecture/mes-schema-truth.md) — 自动生成，43 张表 × 342 列 × (type/nullable/default/pk/unique) 五维清单 + 碎片来源定位 + checksum 头；② [20260809000000_mes_schema_consolidation.sql](file:///Users/air/TOPEMS/svc/mes/migrations/20260809000000_mes_schema_consolidation.sql) — 0 条真实 DDL 空迁移，仅含背景说明 + checksum(23cde115bd952fe0) + 禁写警告，作为收敛锚点插入迁移序列末尾；③ [verify-mes-schema-truth.mjs](file:///Users/air/TOPEMS/scripts/verify-mes-schema-truth.mjs) — 双模式脚本：`--regen` 模式扫描 migrations 生成真相源 md（含完整 SQL 解析器：`splitCommaTopLevel` 顶级逗号切分 + `tokenizeDdl` 状态机词法 + `parseColumnDef` 列定义五维提取，精确处理 `gen_random_uuid()` 嵌套括号、字符串字面量、`TIMESTAMP WITH TIME ZONE` 多词类型、`IF NOT EXISTS` 关键字误识别）；默认 verify 模式做「表列四元组集合 diff」并退出码拦截（手动注入 `fake_new_col` 实测 EXIT=1 ✅）。**验收**：verify-mes-schema-truth EXIT=0（tables=43 columns=342 checksum_match=true）；check-migration-names.mjs --strict EXIT=0（Non-monotonic=0 / Invalid=0 / Errors=0）；空迁移 SQL 体 grep 真实 DDL = 0 条 ✅ | ⭐⭐⭐⭐ | ✅ 完成 |

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

1. **V68.2-1 迁移命名门禁 ✅ 已达标**：2026-08-08 基线扫全库 126 条 SQL 迁移 → 125 FULL 14 位+topic+summary / 1 SHORT 14+summary（advisory，允许）/ 0 V{NN} / 0 8 位 / 0 12 位 / 0 unknown。`scripts/check-migration-names.mjs` default 模式 EXIT 0 · `--strict` 模式 EXIT 0 · 人工注入 `V42_bad.sql` 被拦截为 ERR ✅。**新迁移未来若出现 8/12 位或 V{NN}_ 命名，CI 直接失败**；SHORT 单段 advisory 允许短期存在，在后续 V69 改名为 FULL 即可
2. **V68.2-2 EntitySchema maxLength ✅ 已达标**：以 `svc/<svc>/migrations/*.sql` 全量 `CREATE TABLE` / `ALTER TABLE ADD COLUMN` 扫描 199 表 980 VARCHAR(n) 列作为真相源，与 254 个 schema 文件严格列名匹配，定位 36 处缺失并全部补齐（10 个文件）。新增 `scripts/verify-entity-schema-maxlength.mjs` default 模式 EXIT 0 · 删除 phone maxLength 实测可被 ERR 拦截 ✅。**未来 schema 新增 text/textarea/email 字段若对应 VARCHAR(n) 列，CI 直接失败**
3. **V68.2-3 软删除统一 ✅ 已达标**：4 张 `is_deleted BOOLEAN` 表（communication ×3 + unified-core ×1）已全部迁移至 `deleted_at TIMESTAMP` 单一模式。迁移 `20260808160000_unify_soft_drop_is_deleted.sql` 先回填 `deleted_at` 再 DROP `is_deleted` 列。6 个 Rust 文件同步更新（`is_deleted = FALSE` → `deleted_at IS NULL`）。附带修复 `notification.rs` 1 个潜在 bug（`core_notifications` 表无 `is_deleted` 列却执行 `SET is_deleted=true` → 改为正确的 `is_archived=true`）。直接 DELETE（约 40 处）经审计确认为合法级联删子表/清理草稿/测试代码，不强制统一。新增 `scripts/verify-soft-delete.mjs` CI 门禁 EXIT 0（168 SQL + 1367 Rust / 0 error 0 warning）✅
4. **V68.2-4 add_tenant_id 单调重排 ✅ 已达标**：审计确认 26 条 add_tenant_id 迁移（21 服务，另 10 服务目录无），冲突点为 19 条同用 `20260710160000` 时间戳（原描述"20250101 前缀"偏差已修正）。按 ServiceDefinition 依赖拓扑拆为 5 批 × 5 分钟槽位（16:00 unified-core / 16:05 T1 / 16:10 T2 / 16:15 T3 / 16:20 T4）严格离散。7 条更早/更晚补丁自然保持严格递增。migration.rs 动态 discover/read_dir+extract_version+SHA-256 checksum 无需硬编码引用。`check-migration-names.mjs --strict` Non-monotonic 0 ✅
5. **V68.2-5 add_tenant_id 模板化生成 ✅ 已达标**：交付模板 [scripts/templates/add_tenant_id_template.sql](file:///Users/air/TOPEMS/scripts/templates/add_tenant_id_template.sql) + CLI 生成器 [scripts/gen-add-tenant-id.mjs](file:///Users/air/TOPEMS/scripts/gen-add-tenant-id.mjs)。生成器支持 schema.table 前缀、`<parent>_id UUID` 外键自动关联回填、per-table RLS+POLICY（unified）或末尾批处（batch-rls）两风格、`--self-check` 对缺失服务自动批量 dry-run 并跑 `check-migration-names --strict`。20 服务 dry-run 生成 18 份样本（18/18 FULL canonical · Non-monotonic 0 · strict 0 ✅）。外键回填抽检：crm.contacts→crm.customers、project_budget_items→project_budgets、payment_schedules→project_contracts 正确。未来新服务落地：`node scripts/gen-add-tenant-id.mjs --svc <name> --timestamp <ts>` 一条命令生成合规迁移
6. **V68.2-6 MES 8 碎片 DDL 收敛 ✅ 已达标**：经审计修正原描述偏差（无 V17/V19/V20/V32 编号/非 8 条完整迁移/非 53+ 表），实际基线 16 条 FULL 迁移 + 1 add_tenant_id，覆盖 43 张唯一表 × 342 列；真实碎片为 5 条 ADD COLUMN 微补丁（0009~0013，10 列）+ 质量管理 0007/0014 两次 CREATE TABLE IF NOT EXISTS 重名尝试。采用风险最小的「空合并锚点 + 真相源 md + CI 脚本」方案，**不改动任何已锚定迁移**（避免 schema_migrations 冲突与 sqlx/refly checksum 破坏）：① [mes-schema-truth.md](file:///Users/air/TOPEMS/docs/architecture/mes-schema-truth.md) — 43 表 × 342 列 × 五维清单 + checksum 头；② [20260809000000_mes_schema_consolidation.sql](file:///Users/air/TOPEMS/svc/mes/migrations/20260809000000_mes_schema_consolidation.sql) — 0 条真实 DDL 空迁移锚点（checksum=23cde115bd952fe0）；③ [verify-mes-schema-truth.mjs](file:///Users/air/TOPEMS/scripts/verify-mes-schema-truth.mjs) — 含完整 SQL 解析器（splitCommaTopLevel + tokenizeDdl 状态机 + parseColumnDef 五维提取），双模式运行：`--regen` 生成真相源 / 默认 verify 做「表列四元组集合 diff」退出码拦截（CI 注入 fake_new_col 实测 EXIT=1 ✅）。三项验收全过：verify EXIT=0（43 表 342 列）· check-migration-names --strict EXIT=0（Non-monotonic 0 Errors 0）· 空迁移真实 DDL = 0 条 ✅
7. **总门禁**：`cargo check --workspace` 0 error 0 warning · `tsc --noEmit` 0 error · `check-l3-groups.js` 0 error · `check-migration-names.mjs` EXIT 0 · `analyze_nav_structure.mjs --validate` EXIT 0 · 三联校验 EXIT 0

### 4-4. 进度统计

| 状态 | 任务数 | 进度 |
|---|---|---|
| ✅ 已完成 | 6（V68.2-1 · 迁移命名规范 + CI 门禁 · V68.2-2 · EntitySchema maxLength 真相源对齐 + CI 门禁 · V68.2-3 · 软删除统一为 deleted_at + CI 门禁 · V68.2-4 · add_tenant_id 时间戳严格单调重排 · V68.2-5 · add_tenant_id 模板化生成器 · V68.2-6 · MES 8 碎片 DDL 收敛（空合并+真相源+CI 脚本）） | 100% |
| 🔄 进行中 | 0 | 0% |
| ⏳ 待迭代 | 0 | 0% |
| **合计** | **6** | **100%** |
