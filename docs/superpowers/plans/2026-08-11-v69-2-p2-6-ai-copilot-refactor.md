# V69.2 P2-6 AI Copilot Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 AI 浮窗、上下文模型和推荐体系，补齐 L2 FAB Copilot、L3 选中文本气泡、L4 首页 AI 推荐入口 TopN。

**Architecture:** 新增统一 AI 上下文服务与推荐引擎，所有入口通过同一接口写入 `localStorage['ai-copilot-context']`。将原有全局浮窗拆成 FAB、Panel、Search、Recommendations、QuickActions、SelectionBubble 等小组件，保留现有路由与 AI 页面能力。

**Tech Stack:** React、TypeScript、MUI、React Router、Playwright。

---

### Task 1: 统一 AI 上下文和推荐模型

**Files:**
- Create: `apps/web/src/lib/ai/copilotContext.ts`
- Create: `apps/web/src/lib/ai/recommendations.tsx`
- Modify: `apps/web/src/hooks/useAIContext.ts`

- [ ] 定义 `AICopilotContext`、`writeAICopilotContext`、`buildAICopilotContext`，统一写入 `pathname/moduleCode/breadcrumbs/source/intent/createdAt`。
- [ ] 将静态推荐迁移到 `recommendations.tsx`，提供 `getRecommendations` 和 `getTopRecommendations`。
- [ ] 重构 `useAIContext` 只负责读取路由并返回统一上下文和推荐。

### Task 2: 拆分并重做浮窗

**Files:**
- Create: `apps/web/src/components/ai/copilot/AICopilotFab.tsx`
- Create: `apps/web/src/components/ai/copilot/AICopilotPanel.tsx`
- Create: `apps/web/src/components/ai/copilot/AICopilotSearchBox.tsx`
- Create: `apps/web/src/components/ai/copilot/AICopilotRecommendations.tsx`
- Create: `apps/web/src/components/ai/copilot/AICopilotQuickActions.tsx`
- Create: `apps/web/src/components/ai/copilot/AISelectionBubble.tsx`
- Create: `apps/web/src/components/ai/copilot/index.ts`
- Modify: `apps/web/src/components/ai/FloatingAIHelper.tsx`

- [ ] `AICopilotFab` 只负责展示右下角按钮。
- [ ] `AICopilotPanel` 桌面端固定 `320×420`，移动端自适应。
- [ ] 搜索、推荐、快捷命令全部通过上下文服务写入上下文。
- [ ] `AISelectionBubble` 监听选中文本并提供解释、总结、改写、生成待办 4 项。
- [ ] `FloatingAIHelper` 改为编排组件。

### Task 3: 改造全局入口和首页推荐

**Files:**
- Modify: `apps/web/src/components/layout/GlobalLayout.tsx`
- Modify: `apps/web/src/layouts/components/GlobalActions.tsx`
- Modify: `apps/web/src/components/layout/MobileNav.tsx`
- Modify: `apps/web/src/pages/ai/AiDashboardPage.tsx`

- [ ] `Ctrl/Cmd+Space`、全局操作、移动端入口改用统一上下文服务。
- [ ] AI 首页新增 TopN 推荐区，展示前三个推荐。
- [ ] 推荐点击写入 `source: dashboard` 和 `intent: recommendation`。

### Task 4: 测试和交付

**Files:**
- Modify: `tests/e2e/tests/behavior-guardrails.spec.ts`
- Modify: `docs/roadmap/TODO.md`

- [ ] 补充或更新 E2E，覆盖浮窗尺寸、选中文本气泡、首页 TopN、快捷键上下文。
- [ ] 运行 `npx tsc --noEmit`。
- [ ] 运行行为铁律 E2E。
- [ ] 更新 `TODO.md` 的 P2-6 状态。
