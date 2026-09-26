# TOPEMS UI 全面重设计划 v3

> 目标：用一套统一、现代、可扩展的新设计语言彻底替换当前分散的 UI，建立可落地的 UI 设计标准与实施方案。  
> 范围：以 `apps/web` 为主战场，`apps/desktop` / `apps/mobile` 后续按同一套 token 与组件规范对齐。  
> 原则：**彻底、一步到位**——新方案与旧方案不并存，旧 token / 旧布局 / 旧视觉补丁一律标记为废弃并按阶段清理。

---

## 0. 当前已交付（Phase 1 基础）

- ✅ `UI_REDESIGN_v3.md`：完整评估、新方向、设计标准、迁移计划。
- ✅ `apps/web/src/theme/redesign-tokens.css`：Industrial OS 色彩、字体、间距、动效 token。
- ✅ `apps/web/src/theme/redesign-global.css`：全局样式、keyframes、工具类、响应式网格、组件 hover/focus。
- ✅ `apps/web/src/components/redesign/`：新组件库基础。
  - `primitives/`：Button、Card、Badge、Tag、Input
  - `layout/`：AppShell、TopBar、SideRail
  - `data/`：StatTile、StatusLight
- ✅ `apps/web/src/pages/RedesignDemo.tsx`：新版 Dashboard 演示页。
- ✅ `/redesign-demo` 路由已注册，可直接访问。
- ✅ `pnpm typecheck` 通过；新文件 `eslint` 0 错误。

**访问方式**：启动 `apps/web` 后，登录并访问 `http://localhost:<port>/redesign-demo`。

---

## 1. 现有 UI 评估

### 1.1 现状概览

| 维度 | 现状 | 问题 |
| --- | --- | --- |
| 技术栈 | React 19 + Vite + MUI v9 + Emotion + CSS 变量 | MUI 与自定义样式双轨并行，权重混乱 |
| 颜色 | 钴蓝靛 Primary `#365ae3` + 暖石板 Neutral | 与企业制造场景无情感关联，B 端同质化严重 |
| 字体 | 默认无衬线 + 部分 `Space Grotesk` | 无品牌字体策略，数据可读性一般 |
| 布局 | 四层导航（L1 业务域 / L2-L3 侧边栏 / L4 面包屑）+ 命令面板 | 信息架构已成型，但视觉层级被 MUI 默认样式稀释 |
| 主题 | 浅色默认 + `cyberpunk` 暗色补丁 | cyberpunk 是“补丁式”叠加，代码散落 `index.css`、`.dark` 特殊规则、cyber 组件三类地方 |
| 动效 | fadeInUp、tabUnderlineSlide、cyber-fade-in 等 | 缺乏统一编排，部分动画与 reduced-motion 未完全对齐 |
| 组件 | MUI 组件 + 大量自建 common / ui / layout 组件 | 同一概念（Button/Card/Badge）存在 MUI、common、cyberpunk 三份实现 |
| 移动端 | SmartLayout 分流 MobileLayout / TabletLayout / GlobalLayout | 视觉与桌面端割裂，底部导航未充分品牌化 |

### 1.2 核心缺陷

1. **视觉无记忆点**：钴蓝 + 白 + 圆角卡片，是典型的“通用 B 端”脸孔，无法体现 TOPEMS 作为工业/制造数字化平台的气质。  
2. **主题碎片化**：`cyberpunk` 模式通过大量 `.dark` 覆盖和独立组件实现，维护成本高，且与浅色模式不是同一套设计逻辑。  
3. **组件冗余**：同一功能存在 MUI 原生、自建 common、cyberpunk 三套，开发者不知道该用哪一套。  
4. **Token 与代码脱节**：`design-system-spec.md` 描述了一套 token，但代码里仍散落硬编码颜色、`color-mix`、MUI 默认色。  
5. **动效不统一**：入场、hover、active、focus 的时长/缓动在不同组件里不一致。  
6. **数据展示平庸**：制造业最核心的“指标、状态、告警、流程”没有专属的数据可视化语言。

---

## 2. 新设计方向：TOPEMS Industrial OS

### 2.1 设计概念

将 TOPEMS 重新定位为 **“Industrial OS”** —— 一套为制造业打造的数字操作系统。设计语言强调：

- **精密（Precision）**：清晰的网格、严格的对齐、可读的等宽数据字体。
- **力量（Power）**：高对比度、粗壮的标题、琥珀色能量 accent。
- **实时（Real-time）**： subtly animated 状态指示、脉冲告警、数据刷新感。
- **可信（Trustworthy）**：稳定的布局、一致的反馈、无障碍优先。

### 2.2 视觉关键词

`工业仪表板` · `深色画布` · `琥珀能量` · `青蓝数据` · `精密网格` · `无多余装饰`

### 2.3 色彩系统

| 角色 | 色值 | 用途 |
| --- | --- | --- |
| 背景深 | `#09090b` | 暗色主背景 |
| 表面 1 | `#111113` | 卡片、面板 |
| 表面 2 | `#1a1a1d` | 悬浮、输入框 |
| 表面 3 | `#232326` | 选中、高亮 |
| 文字主 | `#f4f4f5` | 标题、主文本 |
| 文字次 | `#a1a1aa` | 描述、次要信息 |
| 文字弱 | `#52525b` | 禁用、占位 |
| 边框 | `#27272a` | 分隔线、卡片边线 |
| Accent 琥珀 | `#f59e0b` → `#d97706` | 主按钮、关键指标、能量状态 |
| Accent 青蓝 | `#06b6d4` → `#0891b2` | 数据流、链接、信息提示 |
| 成功 | `#22c55e` | 正常、通过 |
| 告警 | `#f59e0b` | 警告、待处理 |
| 错误 | `#ef4444` | 错误、停止 |
| 信息 | `#3b82f6` | 普通提示 |

浅色模式仅作为后台管理/打印场景的可选降级，**主品牌体验为深色 Industrial OS**。

### 2.4 字体系统

| 用途 | 字体 | 说明 |
| --- | --- | --- |
| 品牌/大标题 | `Sora` | 几何无衬线，现代、有力 |
| 界面/正文 | `DM Sans` | 高可读性，适合长文本 |
| 数据/编号/代码 | `JetBrains Mono` | 等宽，数字对齐，工业感 |

### 2.5 间距与圆角

- 基础网格：`4px`
- 圆角：`0`（按钮、标签、表头） / `4px`（卡片、面板） / `8px`（浮层、弹窗）
- 主布局间隙：`24px`
- 卡片内边距：`20px`（桌面） / `16px`（平板） / `12px`（移动）

### 2.6 动效标准

| Token | 值 | 用途 |
| --- | --- | --- |
| `--duration-instant` | `80ms` | 微反馈 |
| `--duration-fast` | `150ms` | hover、focus |
| `--duration-base` | `250ms` | 面板、弹窗 |
| `--duration-slow` | `400ms` | 页面入场 |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 出场、展开 |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | 切换、变形 |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 徽标、选中反馈 |

### 2.7 核心组件清单

- **Primitives**: Button、IconButton、Card、Badge、Tag、Input、Select、Tabs、Divider、Skeleton
- **Layout**: AppShell、TopBar、SideRail、NavGroup、CommandBar、Footer
- **Data**: StatTile、TrendLine、StatusLight、DataTable、FilterChip
- **Feedback**: Toast、Alert、EmptyState、ErrorState、LoadingOverlay
- **Overlay**: Modal、Drawer、Dropdown、Tooltip

---

## 3. UI 设计标准（强制规范）

### 3.1 颜色使用规范

1. **主背景必须使用 `--bg-primary`（#09090b）**，禁止在页面级使用白色或浅灰作为默认背景。
2. **Accent 色只允许琥珀 `#f59e0b` 和青蓝 `#06b6d4` 两种**，成功/告警/错误/信息按语义色使用。
3. **边框必须使用半透明或低对比色**，禁止纯黑/纯白硬边。
4. **Hover 态只允许亮度变化或 accent 发光**，禁止改变色相。
5. **Focus 环统一为青蓝 2px 实线 + 2px 偏移**，所有可交互元素必须可见焦点。

### 3.2 字体使用规范

1. 标题字号：Hero `48px` / H1 `32px` / H2 `24px` / H3 `18px` / H4 `14px`（ uppercase + letter-spacing 用于小节标题）。
2. 数据指标必须使用 `JetBrains Mono`，右对齐或等宽tabular。
3. 正文行高 `1.5`，标题行高 `1.2`。

### 3.3 布局规范

1. **AppShell = TopBar(64px) + SideRail(72px 图标/280px 展开) + Main Content**。
2. 主内容区最大宽度 `1920px`，居中，左右 padding `24px`。
3. 卡片使用 `1px` 边框 + 无阴影，hover 时边框变亮 + 微光。
4. 移动端：TopBar 简化 + BottomRail（5 项）+ 全屏抽屉导航。

### 3.4 组件规范

1. **Button**：
   - Primary：琥珀底 + 深色字，圆角 `0`，hover 亮度 `+8%`。
   - Secondary：透明底 + 边框 + 文字色，hover 背景 `surface-2`。
   - Ghost：透明，hover 背景 `surface-2`。
   - 所有按钮 active 时 `scale(0.97)`，禁止 MUI 默认阴影。
2. **Card**：
   - 背景 `surface-1`，边框 `border`，圆角 `4px`。
   - 顶部可带 `1px` accent 边线表示状态。
   - Hover：边框亮度 `+10%`，可选顶部微光。
3. **Badge / Tag**：
   - 圆角 `0`，字号 `11px`， uppercase + letter-spacing。
   - 状态色配 10% 透明度背景。
4. **Input / Select**：
   - 背景 `surface-2`，边框 `border`，focus 边框变青蓝 + 微光。
   - 标签使用 uppercase 小字 + 文字次色。
5. **Table**：
   - 表头 `surface-2`，字号 `11px` uppercase。
   - 行 hover `surface-2`，选中 `surface-3` + 左侧 accent 边线。
   - 斑马纹禁用。

### 3.5 动效规范

1. 所有组件入场统一使用 `fadeInUp`（`8px → 0`，`opacity 0 → 1`），支持 `stagger` 级联。
2. 页面级切换使用 `crossfade`（`400ms`）。
3. 支持 `prefers-reduced-motion`，所有动画时长降为 `1ms`。
4. Hover 过渡 `150ms`，不允许超过 `300ms` 的 hover 动画。

### 3.6 无障碍规范

1. 焦点环始终可见，颜色对比度 ≥ 4.5:1。
2. 所有图标按钮必须带 `aria-label`。
3. 页面标题随路由更新。
4. 弹窗必须焦点陷阱 + Esc 关闭 + `aria-modal`。

---

## 4. 实施方案

### 4.1 目录结构（新方案）

```
apps/web/src/
├── theme/
│   ├── redesign-tokens.css      # 新 token（CSS 变量）
│   ├── redesign-global.css      # 新全局样式、keyframes、工具类
│   └── generated-tokens.css     # 旧 token（待废弃）
├── components/redesign/         # 新组件库，与旧组件隔离
│   ├── primitives/              # 原子组件
│   ├── layout/                  # 布局组件
│   ├── data/                    # 数据展示组件
│   ├── feedback/                # 反馈组件
│   └── overlay/                 # 浮层组件
├── pages/RedesignDemo.tsx       # 新设计演示页
└── routes/redesign.ts           # 演示路由
```

### 4.2 迁移阶段

#### Phase 1：基础建设（1-2 周）

- [ ] 合并 `redesign-tokens.css` 与 `redesign-global.css` 到构建流程。
- [ ] 实现 primitives（Button、Card、Badge、Input、Tag、Tabs）。
- [ ] 实现 layout（AppShell、TopBar、SideRail）。
- [ ] 完成 `RedesignDemo` 页面，作为新设计的“样板间”。
- [ ] 制定 Storybook  stories 与视觉回归测试。

#### Phase 2：核心页面替换（3-4 周）

- [ ] 用新 layout 替换 `GlobalLayout`。
- [ ] 用新 Dashboard 替换现有首页。
- [ ] 用新 DataTable / ListPageTemplate 替换列表页。
- [ ] 用新 Form primitives 替换表单页。
- [ ] 同步更新 `apps/desktop` 与 `apps/mobile` 的导航与色彩。

#### Phase 3：全面清理（2 周）

- [ ] 删除 `cyberpunk/` 主题补丁。
- [ ] 删除 `index.css` 中所有旧 MUI 覆盖与 cyber 特殊规则。
- [ ] 删除 `common/` 中与新 primitives 重复的组件。
- [ ] 移除 `design-system-spec.md` 中 v2 规范，更新为 v3。
- [ ] 移除 `@mui/material` 中不再使用的自定义覆盖。

#### Phase 4：验收与上线

- [ ] `pnpm typecheck` 通过。
- [ ] `pnpm lint:a11y` 0 错误。
- [ ] `pnpm vitest run` 全绿。
- [ ] Lighthouse 性能 ≥ 90，a11y ≥ 95。
- [ ] 灰度发布：`VITE_UI_V3_ENABLED=true` 开关控制。

### 4.3 废弃清单（清理对象）

以下文件/目录在 Phase 3 中应删除或重构：

- `apps/web/src/components/cyberpunk/*`
- `apps/web/src/theme/tokens/cyberpunk.tokens.ts`
- `apps/web/src/theme/animations/cyberpunk.css.ts`
- `apps/web/src/index.css` 中所有 `.dark .Mui*` 覆盖与 `cyber-*` 类
- `apps/web/src/components/common/` 中重复组件：StatCard、AlertCard、StatusBadge、StatusChip、EmptyState、LoadingSpinner、Dialog、Drawer 等
- `apps/web/src/components/ui/InteractiveCard.tsx`（功能并入新 Card）
- `apps/web/src/theme/effects.ts` 中旧 glass/gradient/glow 效果（迁移到 CSS variables）
- `design-system-spec.md` v2 内容

### 4.4 风险与回滚

| 风险 | 应对 |
| --- | --- |
| 全量替换导致测试崩溃 | 使用 `VITE_UI_V3_ENABLED` 特性开关，新旧 layout 可并存一段时间 |
| MUI 深度定制难以移除 | 分组件迁移，保留必要 MUI 底层（如 Dialog 焦点管理），仅替换样式层 |
| 移动端适配不足 | Phase 1 即定义 mobile tokens，SideRail/BottomRail 同步设计 |
| 用户不适应深色主题 | 提供浅色降级，但默认深色的品牌决策不变 |

---

## 5. 验收标准

1. **视觉一致性**：所有页面使用同一套 token，无硬编码颜色。
2. **交互一致性**：所有可交互元素有统一的 hover/active/focus 状态。
3. **性能**：首屏 JS ≤ 当前基线，CSS 体积增长 ≤ 20%。
4. **无障碍**：`pnpm check:a11y` 无 critical/serious。
5. **可维护性**：新组件必须有 Storybook story + 基础测试，旧组件逐步下线。

---

## 6. 立即行动项

1. 将本方案与团队确认后，启动 Phase 1。
2. 在 `apps/web/src/theme/` 下落地 `redesign-tokens.css` 与 `redesign-global.css`。
3. 创建 `components/redesign/primitives/` 与 `components/redesign/layout/`。
4. 完成 `pages/RedesignDemo.tsx` 并在路由中注册 `/redesign-demo`。
5. 召开设计评审，确认 Industrial OS 方向后进入 Phase 2。
