# TOPEMS 项目任务规划与路线图

> **版本**: V68.0 | **更新日期**: 2026-08-08
> **服务总数**: 28 个（含 unified-core + master-data + lowcode 占位） | **前端页面**: 427 页 | **后端 API 端点**: 1,561 个 | **前端 API 函数**: 1,329 个
> **综合健康评分**: **100/100**（V66.7 31/31 全闭环 · V67.0 三轨完成 · V67.1 **67 项 P0/P1/P2/P3 全部闭环** ✅）
> **微服务治理**: Phase 1-9 全部完成 ✅ + Phase 10 架构修复专项 ✅ + shared-bootstrap V2 五批次 ✅ 100% + **plugin 自动注册 28/28 (100%)** ✅
> **V66.7 架构审计修复**: 第三轮深度审计 31 项问题（P0×6/P1×10/P2×9/P3×3）**全部 31/31 闭环** ✅
> **V67.0 新架构落地**: **统一列表响应 ListResponse<T>** 完成 shared-core 定义 + 21 服务迁移；**plugin 自动注册 100%**（补齐 master-data = 最后 1 个，全 28 服务覆盖）；**超大页 TOP5 拆分达标**（AutomationDesignerPage -93% / DocumentsPage -45% / ProfilePage -56% / WorkflowApprovalDetail -72% / IAM 路径归化）
> **V67.1 第四轮架构审计**: 四探针并行（前端/后端/系统集成/代码质量），发现 **67 项问题**（P0×10 · P1×25 · P2×20 · P3×12），聚焦效率·性能·节省空间
> **V67.1 修复完成**: P0×10 + P1×25 + P2×20 + P3×12 = **67/67 全闭环** ✅（含 28 服务 plugin schema · 55 处 println→tracing · 17 文件死代码清理 · 12 服务 Docker 锚点压缩 · ERP COUNT 修 bug 等）
> **V67.1 提交汇总**: 6 个语义提交（262 文件 · +8889 / -9196 · 净减 307 行）—— feat(shared) × 1 · refactor × 2 · fix × 2 · chore × 1

---

## 📚 历史任务归档

| 归档文件 | 涵盖版本 | 说明 |
|----------|---------|------|
| [archive/2026-W32.md](file:///Users/xingzhai/TOPEMS/docs/roadmap/archive/2026-W32.md) | V62.0 ~ V67.1 | 微服务治理 Phase 1-10 · 架构审计 3 轮 134/134 全闭环 · 低代码平台推广 · 超大页拆分 · 工程效能三层加速 · OpenAPI 类型生成 · 插件自动注册 28/28 (100%) · 统一列表响应 ListResponse<T> 21 服务迁移 |

---

## 🎯 V68.0 — 基础夯实 + 导航-UI 统一重构（进行中）

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
| **2-2** | L3 子组（118）+ L4 页面（341）渐进映射 | 保留 navigation-architecture.md 中 L3/L4 映射表，后续迭代按需微调；不破坏现有路由 | 所有 341 页面均有菜单入口；不存在游离页面 | ⏳ 待迭代 |
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
| **4-2** | 间距 / 圆角 / 阴影 全局一致化 | 组件内 style 散点 → sx + theme tokens；Card/Paper/Button/Dialog 基线统一 | Card borderRadius 全一致；Button variant=outlined 样式无差异 | ⏳ 待迭代 |
| **4-3** | 质量门禁闭环 | `npx tsc --noEmit` = 0 error · `cargo check --workspace` = 0 error 0 warning · `analyze_nav_structure.mjs --validate` PASS · Dashboard 手动回归 OK | 四项全 PASS → V68.0 版本封版 | ⏳ 待迭代 |

---

## 📈 任务统计（V68.0 维度）

### 按迭代统计

| 迭代 | 任务数 | 优先级 | 关键产物 | 状态 |
|------|--------|--------|---------|------|
| **Iteration 0**（基础夯实） | 3 | P0 全部 | TODO.md 精简 · admin tsc 0 error · 导航基线 | ✅ 完成（3/3 · 100%） |
| **Iteration 1**（折叠分区+ModuleCard+EmptyState） | 3 | P1 | DashboardPage + ModuleCard 可维护版 | ✅ 完成 |
| **Iteration 2**（L1/L2 锁定 + verify_navigation 脚本） | 3 | P1 | navigation-architecture v2.1.0 落地 · 校验脚本 | ✅ 完成 |
| **Iteration 3**（UserMenu+GlobalActions+BackButton+AppHeader 集成） | 3 | P2 | AppHeader + 全局按钮组 + 页面级导航组件 | ✅ 完成 |
| **Iteration 4**（主题 Token 化） | 3 | P2 | 主题 tokens · 视觉基线 · 四项质量门禁 | 🔄 进行中（1/3 · 4-1 Token 化） |
| **合计** | **15** | P0×3 · P1×6 · P2×6 | — | — |

### 按状态统计（V68.0 当前）

| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ 已完成 | 12（Iter0×3 + Iter1×3 + Iter2×2 + Iter3×3 + Iter4×1） | 80% |
| ⏳ 待迭代 | 3（2-2 + 4-2 + 4-3） | 20% |
