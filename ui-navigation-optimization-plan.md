# TOPEMS 前端 UI 与导航全面优化方案

## 1. 目标与范围

### 1.1 核心目标

以 `navigation-menu-demo.design` 为设计基准，全面提升 TOPEMS 前端（`apps/web`）的 UI 品质与导航体验：

1. **统一视觉语言**：建立可复用的设计 token 与组件规范，消除各模块视觉不一致。
2. **优化导航结构**：从当前“模块列表 + 侧边栏树”升级为“L1 业务域 → L2 模块 → L3 子组 → L4 页面”的四层导航模型。
3. **提升交互体验**：全局命令搜索、收藏、最近访问、面包屑联动、键盘快捷键。
4. **强化可访问性与响应式**：WCAG AA 色彩对比、ARIA 地标、移动端/平板适配。
5. **沉淀设计资产**：将 design demo 中的 CSS 工具类、动画、交互模式迁移到真实代码库。

### 1.2 范围边界

- **覆盖项目**：`apps/web`（React + Vite + MUI + Tailwind 混合）。
- **不覆盖**：`apps/desktop`（Tauri）、`apps/mobile`（React Native）本次仅做兼容性说明，后续可复用同一套 token。
- **设计基准**：`navigation-menu-demo.design`（5 个 HTML 页面 + `colors_and_type.css` + `search.js`）。

---

## 2. 现状诊断

### 2.1 Design Demo 现状

已完成高质量原型：

| 维度 | 状态 |
|---|---|
| 品牌 token | 完整：颜色、字体、间距、阴影、圆角、过渡 |
| 微交互 | 卡片/按钮/Tabs/列表项统一 hover/active/焦点环 |
| Tab 动画 | 滑动下划线、悬停预览 |
| 信息层级 | 标题、区块、卡片、标签字号与留白统一 |
| 导航搜索 | 命令面板式搜索，157 条导航项，支持键盘操作 |
| 响应式 | 多断点网格、小屏侧边栏折叠 |
| 无障碍 | Skip link、ARIA 标签、地标、焦点管理 |
| 视觉质感 | 毛玻璃、渐变背景、卡片光晕、选中发光 |
| 一致性 | 5 页统一，已通过设计项目验证 |

### 2.2 真实前端（apps/web）现状

| 维度 | 现状 | 差距 |
|---|---|---|
| 架构 | React Router v6、MUI + Tailwind 混合、模块联邦/插件 | token 与组件分散，MUI 与 Tailwind 并存导致样式来源不唯一 |
| 路由 | `routes/v2` + 模块 `config.ts`，支持权限、分层 | 模块数量多（35+），导航层级表达不清晰 |
| 顶部 | `AppHeader` 含 Logo、搜索、通知、用户菜单、面包屑 | 缺少 L1 业务域切换入口 |
| 侧边栏 | `AppSidebar` 含搜索、收藏、最近访问、模块树、服务状态 | 模块按 suite 分组，但未显式表达 L1-L4 层级 |
| 搜索 | `CommandPalette` 已存在 | 功能较基础，可吸收 design demo 的分组/高亮/快捷键 |
| 响应式 | `GlobalLayout` 已适配移动端/平板 | 可与 design demo 的断点对齐 |
| 无障碍 | 已有 skip link、部分 ARIA | 可进一步强化 |
| 主题 | `@topems/tokens` + MUI theme + cyberpunk | 未充分利用 design demo 的渐变/毛玻璃/光晕 |

### 2.3 关键差距

1. **导航模型不统一**：真实前端用“模块 + suite”组织，design demo 用“业务域 L1 → 模块 L2 → 子组 L3 → 页面 L4”。需要建立映射关系。
2. **业务域入口缺失**：真实前端顶部缺少类似 design demo 的 L1 业务域 Tab 切换。
3. **视觉质感未落地**：design demo 的毛玻璃、渐变背景、卡片光晕未在真实前端系统应用。
4. **动画与微交互不足**：真实前端以 MUI 默认过渡为主，缺少 design demo 的精致动效。
5. **设计资产未代码化**：`colors_and_type.css` 中的工具类未转换为可复用的 React 组件或 Tailwind 插件。

---

## 3. 设计原则

1. **一致性优先**：所有页面使用同一套 token、组件、间距、动效。
2. **层级清晰**：任何页面都能在 3 秒内判断“我在哪、能去哪”。
3. **效率导向**：搜索、收藏、最近访问、键盘快捷键减少点击次数。
4. **渐进增强**：在不破坏现有功能的前提下，逐步替换旧实现。
5. **可访问性内建**：WCAG AA 为底线，键盘与屏幕阅读器友好。
6. **性能敏感**：动画使用 CSS transform/opacity，避免布局抖动；懒加载保持。

---

## 4. 总体路线图

```
Phase 1: 设计基准固化      (1 周)
Phase 2: Token/组件迁移     (2 周)
Phase 3: 导航结构升级       (2 周)
Phase 4: 交互体验增强       (1.5 周)
Phase 5: 可访问性与响应式   (1 周)
Phase 6: 验收与灰度         (1 周)
─────────────────────────────────
总计：约 8.5 周（可并行压缩至 6 周）
```

---

## 5. 分阶段方案

### Phase 1：Design Demo 固化（1 周）

目标：将 design demo 作为唯一设计基准，输出可消费的规范包。

#### 任务

1. **提取完整设计规范**
   - 将 `colors_and_type.css` 整理为 token 表格（颜色、字体、间距、阴影、圆角、过渡、z-index）。
   - 将 5 个页面截图或导出为静态参考，标注关键尺寸与交互状态。
   - 输出 `design-system-spec.md`：包含组件清单、状态定义、动画参数。

2. **补充缺失场景**
   - 增加 loading/空状态/错误状态页面示例。
   - 增加表格、表单、详情页等高频组件示例（可选，视优先级）。
   - 增加暗色模式/赛博朋克主题切换示例。

3. **设计走查**
   - 在 desktop（1440px）、tablet（768px）、mobile（375px）下走查。
   - 修复走查中发现的视觉瑕疵。

#### 交付物

- `navigation-menu-demo.design` 更新版（已通过验证）。
- `design-system-spec.md`。
- 设计 token JSON 文件（可直接被代码消费）。

---

### Phase 2：Token 与组件迁移（2 周）

目标：将 design demo 的视觉语言落地为 `apps/web` 可复用的 token 与组件。

#### 2.1 Token 层

当前 `@topems/tokens` 已是权威来源，但需要补全 design demo 中新增的高级 token：

```text
新增/补全项：
- 品牌渐变（primary gradient）
- 毛玻璃背景色（glass background）
- 光晕阴影（glow shadow）
- 慢/中/快三档过渡曲线
- z-index 层级（header、sidebar、modal、toast、tooltip）
```

**具体工作**：
- 在 `packages/tokens/src/tokens.ts` 中新增上述 token。
- 在 `apps/web/src/theme/theme.ts` 的 MUI `createCustomTheme` 中同步映射。
- 为 Tailwind 配置 `tailwind.config.ts`（若不存在则创建）或扩展现有配置，使 token 可通过 `bg-glass`、`shadow-glow` 等类名使用。

#### 2.2 基础组件层

将 design demo 的 CSS 工具类转换为 React 组件：

| Design Demo 类 | 目标 React 组件 | 位置 |
|---|---|---|
| `interactive-card` | `<InteractiveCard />` | `apps/web/src/components/ui/InteractiveCard.tsx` |
| `interactive-tab` | `<InteractiveTab />` / `<TabGroup />` | `apps/web/src/components/ui/Tabs.tsx` |
| `interactive-item` | `<SidebarItem />` | `apps/web/src/components/layout/AppSidebar/SidebarItem.tsx` |
| `interactive-btn` | `<IconButton />` | 扩展现有 MUI IconButton wrapper |
| `focus-ring` | 全局 focus-visible 样式 | `apps/web/src/index.css` |
| `glass-header` | `<GlassHeader />` | 改造 `AppHeader` |
| `page-gradient-bg` | 全局页面背景 | `GlobalLayout` 或 `index.css` |
| `selected-glow` | 选中态 mixin | Tailwind plugin / MUI sx mixin |

#### 2.3 动画层

创建 `apps/web/src/theme/animations.ts` 或 CSS 变量：

- `--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)`
- `--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)`
- `@keyframes tabUnderlineSlide`
- `@keyframes fadeInUp`（级联入场）

#### 交付物

- 更新后的 `@topems/tokens`。
- 新增/改造的基础 UI 组件。
- Tailwind 插件或扩展配置。
- Storybook 或简单示例页展示组件状态。

---

### Phase 3：导航结构升级（2 周）

目标：在真实前端中落地 L1-L4 四层导航模型，同时兼容现有模块联邦/插件架构。

#### 3.1 建立业务域映射

将现有 35+ 模块映射到 design demo 中的 L1 业务域：

| L1 业务域 | 现有模块 | 备注 |
|---|---|---|
| 企业平台 | iam, admin, erp, report, plugin | 核心平台能力 |
| 协同与工具 | workflow, notification, doc, oa, ticket, mobile | 日常协作 |
| 平台能力 | ai, automation, integration, monitor | 技术/智能能力 |
| 制造域 | mes, qms, aps | 生产质量 |
| 供应链域 | scm, wms, srm, tms | 供应物流 |
| 财务/人力域 | hrm, finance | 人财法 |
| 客户域 | crm | 销售服务 |
| 项目域 | pm, pdm, rd | 项目研发 |
| 资产/物联域 | asset, gis, lims, ehs | 设备安全 |

**具体工作**：
- 在 `apps/web/src/lib/navigation/types.ts` 中增加 `businessDomain` 字段。
- 在每个模块 `config.ts` 中标注 `businessDomain`。
- 更新 `NavigationRegistryV2` 的 `getNavItemsGroupedByBusinessDomain` 方法，确保分组与映射一致。

#### 3.2 顶部 L1 业务域导航

在 `AppHeader` 中新增 L1 业务域 Tab 条（参考 design demo）：

- 位置：Logo 右侧或面包屑上方。
- 交互：
  - 点击切换当前业务域，展开该域下的模块。
  - 当前业务域高亮，下划线滑动动画。
  - 支持横向滚动（模块过多时）。
- 响应式：移动端收入汉堡菜单或顶部折叠。

**实现方式**：
- 新增 `<BusinessDomainTabs />` 组件。
- 从 `navigationRegistryV2` 读取 `businessDomain` 分组。
- 与 `CommandPalette` 联动：搜索时优先显示当前业务域结果。

#### 3.3 侧边栏层级表达

改造 `AppSidebar`：

- **顶部**：保留搜索、收藏、最近访问。
- **中部**：按 L1 业务域 → L2 模块 → L3 子组展示。
  - 当前模块自动展开。
  - L3 子组可折叠。
- **底部**：保留服务状态、扩展市场、用户面板。

**实现方式**：
- 扩展 `SidebarModuleTree` 支持三级树。
- 新增 `BusinessDomainSection` 组件。

#### 3.4 面包屑增强

改造 `HeaderBreadcrumbs`：

- 显示 `L1 业务域 > L2 模块 > L3 子组 > L4 页面`。
- 每一级可点击跳转（受权限控制）。
- 与 L1 Tabs、侧边栏高亮联动。

#### 交付物

- 业务域映射表与代码化字段。
- `<BusinessDomainTabs />` 组件。
- 改造后的 `AppSidebar` / `SidebarModuleTree`。
- 增强版 `HeaderBreadcrumbs`。

---

### Phase 4：交互体验增强（1.5 周）

目标：将 design demo 的搜索、动画、微交互落地到真实前端。

#### 4.1 命令面板搜索升级

当前 `CommandPalette` 功能较简单，升级内容：

- **索引源**：从静态数组改为动态读取 `navigationRegistryV2.getAllRoutes()` + 收藏 + 最近访问。
- **结果分组**：L1 业务域 / L2 模块 / L3 子组 / L4 页面 / 收藏 / 最近访问。
- **高亮匹配**：标题、路径、关键词命中高亮。
- **键盘导航**：↑/↓ 选择、Enter 打开、Esc 关闭、Cmd/Ctrl+K 打开。
- **空状态**：友好的无结果提示。

#### 4.2 微交互统一

| 元素 | 目标交互 |
|---|---|
| 卡片 | hover 抬升 + 阴影 + 顶部光晕 |
| 按钮 | 按下缩放、焦点环 |
| Tab | 滑动下划线 |
| 列表项 | 背景过渡 + 左侧选中指示条 |
| 图标 | 父级 hover 时轻微放大 |
| 页面内容 | 路由切换时淡入上滑 |

#### 4.3 快捷键体系

在 `GlobalLayout` 中统一快捷键：

| 快捷键 | 动作 |
|---|---|
| Cmd/Ctrl + K | 打开命令面板 |
| Cmd/Ctrl + B | 切换侧边栏折叠 |
| Cmd/Ctrl + / | 显示快捷键帮助 |
| g + h | 回到首页 |
| / 或 s | 聚焦搜索 |

#### 交付物

- 升级后的 `CommandPalette`。
- 全局动画/过渡样式。
- 快捷键帮助面板。

---

### Phase 5：可访问性与响应式（1 周）

#### 5.1 可访问性

- **色彩对比**：用工具（如 `@axe-core/react`、Playwright a11y 测试）扫描所有页面，确保文字与背景对比度 ≥ 4.5:1。
- **焦点管理**：
  - 所有交互元素有可见焦点环。
  - 弹窗/抽屉打开时焦点陷阱。
  - 弹窗关闭后焦点回到触发元素。
- **ARIA**：
  - L1 Tabs 使用 `role="tablist"`、`role="tab"`、`aria-selected`。
  - 侧边栏树使用 `role="tree"`、`role="treeitem"`、`aria-expanded`。
  - 面包屑使用 `aria-label="breadcrumb"` + `role="navigation"`。
- **屏幕阅读器**：为图标按钮提供 `aria-label`，为复杂组件提供 `aria-describedby`。

#### 5.2 响应式

- 对齐 design demo 断点：
  - `< 640px`：隐藏侧边栏，使用底部 Tab + MobileNav。
  - `640px - 1024px`：侧边栏折叠为图标栏。
  - `> 1024px`：完整侧边栏 + L1 业务域 Tab。
- 内容网格：
  - 卡片网格 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`。
  - 仪表盘 widget 自动重排。

#### 交付物

- a11y 扫描报告与修复记录。
- 响应式走查记录。
- 更新的 e2e 测试覆盖移动端场景。

---

### Phase 6：验收与灰度（1 周）

#### 6.1 验收标准

- [ ] 所有页面使用新 token 与组件，无旧 MUI/Tailwind 样式冲突。
- [ ] L1-L4 导航层级在所有页面可用。
- [ ] 命令搜索覆盖全部路由，键盘操作无误。
- [ ] Lighthouse 性能评分 ≥ 90，可访问性评分 ≥ 95。
- [ ] 无 P0/P1 级 UI 回归 bug。
- [ ] CI 通过（tsc、eslint、a11y 检查、单元测试、e2e 核心路径）。

#### 6.2 灰度策略

1. **内部预览**：先在非生产环境部署，邀请产品经理、UX、核心开发走查。
2. **按模块灰度**：从用户量少的模块（如 monitor、report）开始启用新导航。
3. **A/B 数据**：对比旧/新导航的任务完成率、搜索使用率、页面停留时间。
4. **全量发布**：灰度无重大问题后全量。

#### 6.3 回滚预案

- 保留旧版 `AppHeader`、`AppSidebar` 组件（重命名为 `AppHeaderLegacy`、`AppSidebarLegacy`）。
- 通过 feature flag 切换。
- 若出现严重问题，可在 30 分钟内回滚。

---

## 6. 关键任务清单

```markdown
- [ ] Phase 1
  - [ ] 输出 design-system-spec.md
  - [ ] 提取 token JSON
  - [ ] 补充 loading/空状态示例
  - [ ] 设计走查与修复

- [ ] Phase 2
  - [ ] 扩展 @topems/tokens（渐变、毛玻璃、光晕、过渡）
  - [ ] 同步 MUI theme 与 Tailwind 配置
  - [ ] 开发 InteractiveCard、InteractiveTab、SidebarItem 等基础组件
  - [ ] 建立动画/CSS 变量体系
  - [ ] 组件示例页/Storybook

- [ ] Phase 3
  - [ ] 定义 businessDomain 映射
  - [ ] 更新所有模块 config.ts
  - [ ] 开发 BusinessDomainTabs
  - [ ] 改造 AppSidebar 三级树
  - [ ] 增强 HeaderBreadcrumbs

- [ ] Phase 4
  - [ ] 升级 CommandPalette
  - [ ] 统一微交互
  - [ ] 全局快捷键体系

- [ ] Phase 5
  - [ ] a11y 扫描与修复
  - [ ] 响应式走查
  - [ ] e2e 覆盖

- [ ] Phase 6
  - [ ] 验收测试
  - [ ] 灰度发布
  - [ ] 监控与回滚预案
```

---

## 7. 技术方案要点

### 7.1 Token 同步机制

```
packages/tokens/src/tokens.ts   （权威来源）
       ↓
@topems/tokens 包
       ↓
apps/web/src/theme/tokens.ts   （re-export）
apps/web/src/theme/theme.ts    （MUI 映射）
tailwind.config.ts              （Tailwind 映射）
apps/web/src/index.css          （CSS 变量兜底）
```

### 7.2 导航数据流

```
模块 config.ts (含 businessDomain)
       ↓
NavigationRegistryV2.registerModule()
       ↓
NavigationRegistryV2.getNavItemsGroupedByBusinessDomain()
       ↓
BusinessDomainTabs / AppSidebar / CommandPalette / Breadcrumbs
```

### 7.3 动画实现

- 所有过渡优先使用 CSS `transition` 与 `@keyframes`。
- React 层面仅控制 className 切换，不通过 JS 驱动布局属性。
- 路由切换动画使用 `PageTransition` 组件（已存在，可扩展）。

### 7.4 向后兼容

- 新组件与旧组件并行存在，通过 feature flag 切换。
- 旧路由结构不变，`businessDomain` 字段为新增可选字段。
- MUI 组件逐步替换，不一次性全改。

---

## 8. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| 模块数量多，映射工作量大 | 中 | 先映射核心 20 个模块，其余逐步补齐；提供脚本辅助 |
| MUI + Tailwind 样式冲突 | 高 | 统一 token 来源，优先用 Tailwind 工具类；MUI 组件仅做容器 |
| 用户习惯改变，培训成本高 | 中 | 保留旧版入口 2 周，提供快捷键帮助与引导提示 |
| 性能回归（动画、搜索索引） | 中 | 搜索索引懒加载 + 缓存；动画仅使用 transform/opacity |
| 插件模块无法识别 businessDomain | 中 | 为未标注的模块默认归入“其他”域，插件注册时允许声明 |
| 多语言翻译缺失 | 低 | 新增 i18n key 走现有流程，先中文后英文 |

---

## 9. 成功指标

| 指标 | 基线 | 目标 |
|---|---|---|
| 导航到目标页面平均点击次数 | 4.2 次 | ≤ 3 次 |
| 命令搜索使用率 | 5% | ≥ 20% |
| 页面首屏加载时间 | - | 不劣于当前 |
| Lighthouse 可访问性 | - | ≥ 95 |
| 用户满意度（内部问卷） | - | ≥ 4.2/5 |
| P0/P1 UI bug 数 | - | 0 |

---

## 10. 下一步建议

建议按以下顺序启动：

1. **本周**：召开设计评审会，确认 Phase 1 设计规范与业务域映射。
2. **下周**：启动 Phase 2 token 与基础组件开发，同步安排 a11y 基线扫描。
3. **第 3-4 周**：并行进行 Phase 3 导航结构升级与 Phase 4 搜索升级。
4. **第 5 周**：集成测试、响应式走查、性能调优。
5. **第 6 周**：灰度发布与数据回收。

如需立即开始，建议先锁定 **Phase 1 设计规范** 与 **Phase 2 token 扩展**，因为它们是后续所有工作的基础。
