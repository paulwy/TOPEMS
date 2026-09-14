# TOPEMS 设计系统规范（Design System Spec）

> 来源：`navigation-menu-demo.design`（7 HTML 页面 + `colors_and_type.css` + `search.js`）
> 版本：v2 · 2026-09-13 · 状态：随实施持续更新（v2：补 effects 映射、焦点基线、验收清单、灰度回滚）
> 可消费 token：`navigation-menu-demo.design/design-tokens.json`（自 `colors_and_type.css` 自动解析生成）

---

## 1. 设计 Token 总览

完整可消费 token 见 `design-tokens.json`，以下为关键值摘要。

### 1.1 品牌色板

| 色阶 | Primary（钴蓝靛） | Neutral（暖石板） |
| --- | --- | --- |
| 50  | `#eef4ff` | `#f8fafc` |
| 100 | `#e0ebff` | `#f1f5f9` |
| 200 | `#c7daff` | `#e2e8f0` |
| 300 | `#a4c2fc` | `#cbd5e1` |
| 400 | `#769cf5` | `#94a3b8` |
| 500 | `#4f78ed` | `#64748b` |
| 600 | `#365ae3` | `#475569` |
| 700 | `#2a46c2` | `#334155` |
| 800 | `#263b9e` | `#1e293b` |
| 900 | `#24357d` | `#0f172a` |
| 950 | — | `#020617` |

- **语义别名**：`background / foreground / card / card-foreground / card-muted / popover / primary / primary-foreground / primary-subtle / muted / muted-foreground / border / border-subtle / input / ring / overlay / backdrop`
- **状态色**：success `#16a34a` / warning `#d97706` / error `#dc2626` / info `#365ae3`，各含 `-foreground` 与 `-subtle`
- **暗色模式**：仅语义别名翻转（`.dark` 块），品牌色阶不变

### 1.2 圆角 / 间距 / 阴影

- **圆角**：none `0` / xs `2` / sm `4` / md `8` / lg `12` / xl `16` / full `9999px`
- **间距**：4px 网格，`space-1..24`（4px → 96px）
- **阴影**：xs→xl 5 档（低透明 `rgba(2,6,23,.04)` 系）+ inner；暗色模式同结构

### 1.3 动效参数（Motion）

| Token | 值 | 用途 |
| --- | --- | --- |
| `fast` | `150ms cubic-bezier(0.4,0,0.2,1)` | hover 态、图标缩放 |
| `base` | `200ms cubic-bezier(0.4,0,0.2,1)` | 卡片/列表项过渡 |
| `slow` | `300ms cubic-bezier(0.4,0,0.2,1)` | 下划线滑入、光晕显现 |
| `bounce` | `300ms cubic-bezier(0.34,1.56,0.64,1)` | 选中徽标回弹 |
| `colors` | color/background/border/fill/stroke | 颜色过渡专用 |

### 1.4 Z-Index 层

`base 0 → dropdown 100 → sticky 200 → fixed 300 → popover 400 → tooltip 500 → modal 600 → toast 700`

---

## 2. 组件清单与状态定义

> 状态标记：✅ 已代码化（apps/web）｜🟡 部分｜❌ 待办

| 组件 | 状态定义 | 动画参数 | 落地 |
| --- | --- | --- | --- |
| **InteractiveCard** | `default` 无位移；`hover` 上浮 `-2px` + `shadow-md`；`active` 回弹 `scale(0.99)`；`selected` 外发光（`selected-glow`）；`disabled` 降透明度禁交互 | 过渡 `base`；发光渐显 `slow` | ✅ `ui/InteractiveCard.tsx` |
| **GlowCard**（卡片顶部光晕） | `default` 无光晕；`hover` 顶部径向光晕 `opacity 0→1` | `slow` | ✅ 并入 InteractiveCard（`glow` prop） |
| **SelectedGlow** | 选中态：`0 0 0 1px` 主色环 + 20px/24px 外发光（浅/暗两档） | `slow` | ✅ `index.css` `.selected-glow` |
| **InteractiveTab / TabGroup** | `default`；`hover` 背景 `muted` + 下划线预览 `scaleX(0.5)`；`active` 主色文字 + 下划线 `scaleX(1)` 左滑入；`disabled` `aria-disabled` 不可点 | 文字 `fast`；下划线 `slow` + `tabUnderlineSlide` keyframes | ✅ `ui/Tabs.tsx` |
| **InteractiveItem / SidebarItem** | `default`；`hover` 背景 `muted`；`active` 主色 10% 背景 + 左指示条 `scaleY 0→1`；`disabled` | 背景 `fast`；指示条滑入 | ✅ `layout/AppSidebar/SidebarItem.tsx` |
| **InteractiveButton** | `default`；`hover` 背景 `muted`；`active` `scale(0.94)` | `fast` | ✅ 全局 `.MuiButton-root:active` 按下缩放 `scale(0.97)`（非 disabled） |
| **InteractiveLink** | 下划线 `scaleX 0→1`，`hover` 从右→左生长 | `base` | 🟡 MUI Link underline='hover' 等效 |
| **IconHover** | 父级 hover 时图标 `scale(1.08)` | `base` | ✅ `index.css` `.icon-hover`，SidebarItem / Tab 图标已接入 |
| **FocusRing** | `:focus-visible`：`0 0 0 2px` 背景色 + `0 0 0 4px` ring 主色 | 无（即时） | ✅ `index.css` `.focus-ring` + 全局 `:focus-visible` 兜底 |
| **GlassHeader** | 头部 `card 85%` + `backdrop-filter blur(12px)` + 半透明底边框 | 无 | ✅ `src/theme/effects.ts` `glassSx`（已应用 AppHeader 头部容器） |
| **PageGradientBg** | 页面双径向渐变（主色 6% + 辅助色 5%）叠背景色 | 无 | ✅ `src/theme/effects.ts` `pageGradientBgSx`（已应用 GlobalLayout main 容器） |
| **GradientText** | 渐变文字（primary→secondary + `background-clip:text`） | 无 | ✅ `src/theme/effects.ts` `gradientTextSx`（已应用 HeaderLogo 品牌标题，修复无效色值存量 bug） |
| **ShadowGlow** | 品牌色外发光（ring + 20px spread，浅/暗两档） | `slow` | ✅ `src/theme/effects.ts` `shadowGlowSx`（sm/md/lg 三档强度）+ `index.css` `.selected-glow` |
| **CheckBadge** | `selected` 时 `scale 0→1` 回弹显现（`bounce`）；非选中隐藏 | `bounce` + `fast` | 🟡 待封装为选择态徽标 |
| **DomainTooltip** | 卡片/列表项 hover 时 `translateY(4px)→0` + 淡入 | `fast` | 🟡 依赖 Tooltip 宿主 hover |
| **StaggeredEntrance** | 页面/列表入场 `fadeInUp`（8px→0 + 淡入），`stagger-1..8` 40ms 步进 | `slow` + 级联延迟 | ✅ `index.css` `fadeInUp` keyframes + `.stagger-*` |
| **GradientBadge** | 主色渐变底 + 主色 700 文字 + 半透明描边（暗色翻转） | 无 | 🟡 待封装 |
| **GradientDivider** | 1px 横向渐变分隔线（透明→边框→透明） | 无 | ✅ 可用 `index.css` 内联样式实现 |
| **StateSkeleton**（骨架屏） | 模块卡片网格 + 列表行占位，shimmer 扫光（明/暗双态） | `skeleton-shimmer` 1.4s | 🟡 基准已定（`pages/state-examples.html` ①），React 封装待办 |
| **EmptyState**（空状态） | 图标 + 标题 + 描述 + CTA（无待办 / 搜索无结果 / 空收藏三变体） | 无 | 🟡 基准已定（`pages/state-examples.html` ②），React 封装待办 |
| **ErrorState**（错误状态） | 错误码 + 文案 + 重试 / 反馈 + 错误追踪 ID（500 / 网络异常两变体） | 无 | 🟡 基准已定（`pages/state-examples.html` ③），React 封装待办 |

---

## 3. 关键 Keyframes

| 名称 | 定义 | 使用 |
| --- | --- | --- |
| `tabUnderlineSlide` | `scaleX 0→1` + `opacity 0→1`，`forwards` | Tab 激活下划线 |
| `fadeInUp` | `translateY(8px)` + `opacity 0 → 0/1` | 级联入场 |
| `cyber-fade-in`（既有） | `translateY(12px)` + blur(4px) → 0 | 桌面路由切换（`.cyber-page-enter`） |

---

## 4. 实现映射（apps/web ↔ design demo）

| Design demo | apps/web 实现 |
| --- | --- |
| `.interactive-card` / `.glow-card` / `.selected-glow` | `src/components/ui/InteractiveCard.tsx` |
| `.interactive-tab` + `tabUnderlineSlide` | `src/components/ui/Tabs.tsx`（`TabGroup` / `InteractiveTab`） |
| `.interactive-item` | `src/components/layout/AppSidebar/SidebarItem.tsx` |
| `.focus-ring` | `src/index.css`（`.focus-ring` + 全局 `:focus-visible`） |
| `.glass-header` / `.page-gradient-bg` / `.gradient-text` / `.shadow-glow` | `src/theme/effects.ts`（`glassSx` / `pageGradientBgSx` / `gradientTextSx` / `shadowGlowSx`） |
| `.icon-hover` / `.interactive-btn:active` | `src/index.css`（`.icon-hover` / `.MuiButton-root:active`） |
| `fadeInUp` / `stagger-*` | `src/index.css`（keyframes + 类） |
| 四层导航（L1 域 / L2 模块 / L3 子组 / L4 页面） | `BusinessDomainTabs`（L1）/ `AppSidebar`（L2-L3，展开态按 `NAV_GROUPS` 分组）/ `HeaderBreadcrumbs`（L1-L4）/ `CommandPalette`（全层级搜索） |

**未代码化项（下一步）**：`CheckBadge`、`GradientBadge`、`DomainTooltip` 宿主集成、`InteractiveLink` 动效对齐。

---

## 5. 无障碍基线

- 焦点可见：全局 `:focus-visible` 焦点环（ring 主色 4px）
- Tabs：`role=tablist / tab` + `aria-selected` + `aria-disabled`
- 面包屑：`aria-label="breadcrumb"` + `role=navigation`（MUI 默认）
- 弹窗：Modal 焦点捕获 + Esc 关闭 + `aria-labelledby`
- 对比度：主色 400/600 在浅色背景 WCAG AA 达标（`#769cf5` / `#365ae3`）

---

## 6. 焦点与键盘操作基线（Phase 5 核验结论）

| 场景 | 机制 | 状态 |
| --- | --- | --- |
| 弹窗焦点陷阱 | MUI Modal 内置 `enableTrap`（Dialog 默认开启）：Tab 循环限制在弹窗内 | ✅ 无需自定义 |
| 关闭后焦点回归 | MUI Modal 内置 `restoreFocus`（默认开启）：关闭时焦点恢复到打开前的 activeElement | ✅ 无需自定义 |
| Esc 关闭 | Dialog 默认 `onEscapeKeyDown` 触发 `onClose` | ✅ |
| `aria-modal` / 背景 inert | Modal 默认 `aria-modal=true` + `aria-hidden` 背景 | ✅ |
| 侧边栏导航项 | 原生 `<button>` 语义（不设孤立 `role=menuitem`，避免 `aria-required-parent` 违规） | ✅ 已修复（第三轮） |
| 语言切换按钮 | 纯图标按钮带 `aria-label`（`shared.language_selector.k0`）+ `aria-haspopup` / `aria-expanded` | ✅ 已修复（第三轮） |
| 运行时验证 | `check:a11y` 双环节：静态 eslint a11y + axe-core 组件扫描（`a11y-layout.test.tsx`，只断 critical/serious） | ✅ 全绿 |

> 结论：焦点管理依赖 MUI Modal 原生能力即可满足基线，无需自研 FocusTrap；后续若引入非 Modal 自绘浮层（如 Popover 内嵌表单），需显式补充 trap 与回归。

---

## 7. 验收清单（Phase 6）

### 7.1 自动化门禁（每次改动后执行）

| 项 | 命令 | 基线 |
| --- | --- | --- |
| 类型 | `pnpm typecheck` | 0 错误 |
| 静态 a11y | `pnpm lint:a11y` | 0 错误 0 警告 |
| 运行时 a11y | `pnpm check:a11y`（含静态+axe） | 无 critical/serious 违规 |
| 组件测试 | `pnpm vitest run --project component` | 282 文件 / 3326 通过 |
| 单元测试 | `pnpm vitest run --project unit --dir src/lib/__tests__` | 130 文件 / 3019 通过 |
| 冒烟 | `pnpm test:smoke` | 1376 通过 |
| 构建 | `pnpm build` | 0 错误 |

### 7.2 功能验收点（四层导航）

- [x] L1 业务域 Tabs：10 域按 `SUITE_GROUPS` 顺序渲染、当前域高亮、`<md` 隐藏
- [x] L2-L3 侧边栏：展开态按 `NAV_GROUPS` 规范顺序分组，折叠态保留 flat 图标栏
- [x] L1-L4 面包屑：逐级可点击跳转、被拒权限层级降级为纯文本
- [x] 命令面板：L1 域优先排序 + 命中高亮 + 全局快捷键
- [x] 全局快捷键：Cmd/Ctrl+K 面板、Cmd/Ctrl+B 折叠、Cmd/Ctrl+/ 帮助、g+h 首页、/ 搜索
- [x] 状态示例页：Loading 骨架 / 空状态 / 错误状态基准（`pages/state-examples.html`，浏览器验证渲染）
- [ ] Lighthouse a11y ≥ 95（需真实浏览器走查，受 /login 认证阻塞）
- [x] 三断点走查：1440 / 768 / 375（以组件断点断言完成，见 `responsive-breakpoints.test.tsx`；真实浏览器走查仍受 /login 认证阻塞）
- [x] e2e 移动端场景：`e2e/ui/mobile-navigation.spec.ts` 4 用例全绿（mobile-iphone 390×844）——SmartLayout 移动端分流（MobileLayout 宿主）、移动底部导航切换、GlobalLayout 移动端视口响应式（侧边栏/L1 隐藏 + 下拉形态）、MobileNav 抽屉导航（见第八轮执行记录）；并修复 e2e 发现的 dev-tools 面板移动端溢出遮挡缺陷
- [ ] Lighthouse a11y ≥ 95（需真实浏览器走查，受 /login 认证阻塞）

### 7.4 响应式断点对齐结论（Phase 5）

| 设计目标 | 项目断点体系（MUI） | 行为 | 验证 |
| --- | --- | --- | --- |
| <640 隐藏侧边栏 + 底部导航 | `isMobile` = < sm(600) | 侧边栏隐藏；MobileNav overlay + BottomTabBar 渲染 | ✅ 断点测试（mobile 用例） |
| 640-1024 折叠图标栏 | `isTabletNarrow` = sm(600-900) | AppSidebar 渲染且 `collapsed=true`（图标栏） | ✅ 断点测试（tablet 窄） |
| 900-1200 平板展开 | `isTablet` = sm-lg 之间 | AppSidebar 渲染且不折叠，`forceVisible` | ✅ 断点测试（tablet 宽） |
| >1024 完整侧边栏 + L1 Tabs | `isDesktop` = ≥ lg(1200) | 完整侧边栏；BusinessDomainTabs ≥md 显示 | ✅ 断点测试（desktop 用例）+ AppHeader 测试 |

**移动端路由现状（第八轮 e2e 确认）**：`SmartLayout` 按 `getDeviceInfo()` 分流——移动端 → `MobileLayout`（简化导航：汉堡菜单仅用户信息+退出、底部 4 tab：首页/流程/通知/设置）、平板 → `TabletLayout`、桌面 → `GlobalLayout`（四层导航）。`GlobalLayout.BottomTabBar` 依赖 `activeMobileTab`（匹配 /dashboard|/tasks|/scan|/approval|/profile），而这些路径在移动端被 SmartLayout 分流至 MobileLayout → **GlobalLayout 底部导航在移动端实际不可达**（移动端由 MobileLayout 兜底；如需四层导航移动端统一，需 SmartLayout 路由层重构，另立任务）。

**e2e 发现并修复（dev-tools 移动端溢出）**：`src/dev-tools/MicroFrontendDevTools.tsx` 的 fixed 底部按钮面板在窄视口（390px）下换行堆叠为 1101px 超高面板，从底部向上溢出遮挡 Header 左侧「打开导航菜单」按钮。修复：容器 `display: { xs: 'none', sm: 'flex' }`（<sm 隐藏）。

### 7.3 回归红线

- 新 token / 组件与既有主题无冲突（typecheck + 组件测试兜底）
- 无 P0/P1 回归（全量测试套件全绿）
- i18n 增量追加不覆盖既有 key（`shared.shortcuts.k0-k8` 等使用中 key 不可复用）

---

## 8. 灰度与回滚预案（Phase 6）

### 8.1 灰度阶梯

1. **内部预览**：`VITE_NAV_V2_ENABLED=true` 内网环境验证视觉与交互
2. **按模块灰度**：先放行 1-2 个业务域（L1 Tabs 按域可见性逐域放开）
3. **A/B 数据**：对比灰度域 vs 对照组——命令面板使用率、面包屑点击深度、导航任务完成率
4. **全量**：灰度域数据达标后放开全部域

### 8.2 回滚预案

| 层级 | 动作 | 生效 | 影响 |
| --- | --- | --- | --- |
| 运行时降级（推荐） | `getFeatureFlag('navigationV2')` 置 false（环境变量 `VITE_NAV_V2_ENABLED=false`）→ 渲染既有导航布局 | 分钟级 | 丢失 L1 Tabs / L3 分组 / 新面包屑，其余功能不变 |
| 代码级回滚 | `git revert` 本轮 UI 相关 commit（改动集中：components/layout、components/ui、theme/effects、index.css、i18n 增量） | 构建级 | 完整回到上一导航版本；i18n 增量 key 无冲突可保留 |

> 说明：`deploymentConfig.features` + `getFeatureFlag()` 为既有机制（`src/config/deployment.ts`），新增 `navigationV2` 开关时按同模式扩展；当前未实现完整 legacy 组件副本，运行时降级开关需在正式灰度前补一个「关闭新导航即回退旧布局」的最小切换组件（或直接以 git 版本回退承担）。
