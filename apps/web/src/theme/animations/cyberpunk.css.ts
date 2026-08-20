/**
 * 赛博朋克主题 — 玻璃拟态工具类
 *
 * 提供半透明卡片、模糊背景、发光边框等科技感视觉效果
 * 使用方式：在 sx prop 中引用 className，或直接使用 CSS 变量
 */

const cyberpunkGlassClasses = {
  // 基础玻璃卡片
  glassCard: 'cyber-glass-card',
  // 悬浮态玻璃卡片
  glassCardHover: 'cyber-glass-card-hover',
  // 高层玻璃面板（弹窗、下拉）
  glassElevated: 'cyber-glass-elevated',
  // 渐变边框卡片（VIP/重要数据）
  glassGradientBorder: 'cyber-glass-gradient-border',
  // 玻璃态侧边栏
  glassSidebar: 'cyber-glass-sidebar',
  // 玻璃态顶栏
  glassHeader: 'cyber-glass-header',
} as const;

const cyberpunkGlassStyles = `
/* ========================================
   {i18n.t('theme.cyberpunk.css.k0')}
   ======================================== */

/* 基础玻璃卡片 */
.cyber-glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 255, 0.20);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  transition: all 200ms ease-out;
}

.cyber-glass-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(0, 255, 255, 0.50);
  box-shadow: var(--shadow-custom, 0 8px 32px rgba(0, 255, 255, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12));
  transform: translateY(-2px);
}

/* 高层玻璃面板（弹窗、下拉菜单） */
.cyber-glass-elevated {
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.30);
  border-radius: 12px;
  box-shadow: var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10));
}

/* 渐变边框卡片（VIP/重要数据） */
.cyber-glass-gradient-border {
  position: relative;
  border-radius: 12px;
  padding: 1px;
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--cyber-color-magenta, #ff00ff) 100%);
}

.cyber-glass-gradient-border > * {
  background: rgba(10, 10, 26, 0.90);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 11px;
}

/* 玻璃态侧边栏 */
.cyber-glass-sidebar {
  background: rgba(10, 10, 26, 0.80);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid rgba(0, 255, 255, 0.15);
}

/* 玻璃态顶栏 */
.cyber-glass-header {
  background: rgba(10, 10, 26, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.20);
  box-shadow: var(--cyber-shadow-top-line, 0 1px 0 rgba(0, 255, 255, 0.10));
}

/* ========================================
   {i18n.t('theme.cyberpunk.css.k1')}
   ======================================== */

/* 文字发光 */
.cyber-text-glow-primary {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.50);
}

.cyber-text-glow-secondary {
  color: var(--cyber-color-magenta, #ff00ff);
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.50);
}

.cyber-text-glow-accent {
  color: var(--cyber-color-gold, #ffd700);
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.50);
}

/* 渐变文字 */
.cyber-text-gradient {
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--cyber-color-magenta, #ff00ff) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.cyber-text-gradient-gold {
  background: linear-gradient(135deg, var(--cyber-color-gold, #ffd700) 0%, var(--color-warning, #f59e0b) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* 盒子发光 */
.cyber-box-glow-primary {
  box-shadow: var(--shadow-custom, 0 0 20px rgba(0, 255, 255, 0.40), 0 0 40px rgba(0, 255, 255, 0.20));
}

.cyber-box-glow-secondary {
  box-shadow: var(--shadow-custom, 0 0 20px rgba(255, 0, 255, 0.40), 0 0 40px rgba(255, 0, 255, 0.20));
}

.cyber-box-glow-hover {
  transition: box-shadow 200ms ease-out;
}

.cyber-box-glow-hover:hover {
  box-shadow: var(--shadow-custom, 0 0 25px rgba(0, 255, 255, 0.60), 0 0 50px rgba(0, 255, 255, 0.20));
}

/* ========================================
   {i18n.t('theme.cyberpunk.css.k2')}
   ======================================== */

/* 扫光效果 — 鼠标悬停时一道光从左扫到右 */
.cyber-scanline {
  position: relative;
  overflow: hidden;
}

.cyber-scanline::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.15) 50%, transparent 100%);
  transition: left 600ms ease-out;
  pointer-events: none;
}

.cyber-scanline:hover::after {
  left: 100%;
}

/* 霓虹骨架屏 — 流光动画
   {i18n.t('theme.cyberpunk.css.k3')}
   {i18n.t('theme.cyberpunk.css.k4')}
@keyframes cyber-skeleton-glow {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes cyber-skeleton {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.cyber-skeleton {
  background: linear-gradient(90deg,
    rgba(0, 255, 255, 0.05) 0%,
    rgba(0, 255, 255, 0.15) 50%,
    rgba(0, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: cyber-skeleton-glow 1.5s ease-in-out infinite;
}

/* 脉冲发光 — 状态指示点 */
@keyframes cyber-pulse-glow {
  0%, 100% {
    opacity: 1;
    box-shadow: var(--shadow-custom, 0 0 10px currentColor, 0 0 20px currentColor);
  }
  50% {
    opacity: 0.6;
    box-shadow: var(--shadow-custom, 0 0 5px currentColor, 0 0 10px currentColor);
  }
}

.cyber-pulse {
  animation: cyber-pulse-glow 2s ease-in-out infinite;
}

/* 数字滚动入场 */
@keyframes cyber-count-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cyber-count-up {
  animation: cyber-count-up 800ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* 页面淡入 */
@keyframes cyber-page-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cyber-page-enter {
  animation: cyber-page-enter 300ms ease-out;
}

/* 主题切换过渡 */
.cyber-theme-transition,
.cyber-theme-transition * {
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease !important;
}

/* ========================================
   {i18n.t('theme.cyberpunk.css.k5')}
   ======================================== */
@media (prefers-reduced-motion: reduce) {
  .cyber-glass-card,
  .cyber-glass-card:hover,
  .cyber-scanline::after,
  .cyber-skeleton,
  .cyber-pulse,
  .cyber-count-up,
  .cyber-page-enter,
  .cyber-theme-transition,
  .cyber-theme-transition * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
`;

/**
 * 赛博朋克主题 — MUI 组件级样式
 *
 * 使用全局 CSS 覆盖各 MUI 组件在 .cyberpunk-mode 下的样式
 * 避免在 theme.ts 中重复定义组件导致 TS 报错
 */
const cyberpunkComponentStyles = `
/* ========================================
   {i18n.t('theme.cyberpunk.css.mui_6')}
   {i18n.t('theme.cyberpunk.css.k7')}
   ======================================== */

/* Paper */
.cyberpunk-mode .MuiPaper-root {
  background-color: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20);
  background-image: none;
}

/* Menu */
.cyberpunk-mode .MuiMenu-paper {
  background-color: rgba(26, 26, 46, 0.90);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.25);
  box-shadow: var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10));
}
.cyberpunk-mode .MuiMenuItem-root {
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiMenuItem-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
}
.cyberpunk-mode .MuiMenuItem-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiMenuItem-root.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.16);
}

/* Dialog */
.cyberpunk-mode .MuiDialog-paper {
  background-color: rgba(26, 26, 46, 0.90);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 255, 0.30);
  box-shadow: var(--cyber-shadow-3xl, 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15));
  background-image: none;
}

/* Popover */
.cyberpunk-mode .MuiPopover-paper {
  background-color: rgba(26, 26, 46, 0.90);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.25);
}

/* Tooltip */
.cyberpunk-mode .MuiTooltip-tooltip {
  background-color: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Chip */
.cyberpunk-mode .MuiChip-root {
  background-color: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiChip-root:hover {
  background-color: rgba(0, 255, 255, 0.15);
  border-color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiChip-colorPrimary {
  background-color: rgba(0, 255, 255, 0.15);
  border-color: var(--cyber-color-cyan, #00ffff);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiChip-colorSuccess {
  background-color: rgba(0, 255, 136, 0.12);
  border-color: rgba(0, 255, 136, 0.50);
  color: var(--cyber-color-green, #00ff88);
}
.cyberpunk-mode .MuiChip-colorWarning {
  background-color: rgba(255, 170, 0, 0.12);
  border-color: rgba(255, 170, 0, 0.50);
  color: var(--cyber-color-warn, #ffaa00);
}
.cyberpunk-mode .MuiChip-colorError {
  background-color: rgba(255, 68, 68, 0.12);
  border-color: rgba(255, 68, 68, 0.50);
  color: var(--cyber-color-danger, #ff4444);
}

/* Tabs */
.cyberpunk-mode .MuiTabs-indicator {
  background: linear-gradient(90deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  box-shadow: var(--cyber-shadow-glow-cyan-strong, 0 0 10px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .MuiTab-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  text-transform: none;
}
.cyberpunk-mode .MuiTab-root:hover {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiTab-root.Mui-selected {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.40);
}

/* Pagination */
.cyberpunk-mode .MuiPaginationItem-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiPaginationItem-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: var(--cyber-color-cyan, #00ffff);
  border-color: rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiPaginationItem-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.15);
  color: var(--cyber-color-cyan, #00ffff);
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* Avatar */
.cyberpunk-mode .MuiAvatar-root {
  border: 2px solid rgba(0, 255, 255, 0.40);
  box-shadow: var(--cyber-shadow-glow-cyan-strong, 0 0 10px rgba(0, 255, 255, 0.50));
}

/* Badge */
.cyberpunk-mode .MuiBadge-badge {
  box-shadow: var(--shadow-custom, 0 0 8px currentColor);
}

/* Divider */
.cyberpunk-mode .MuiDivider-root {
  border-color: rgba(0, 255, 255, 0.15);
}

/* IconButton */
.cyberpunk-mode .MuiIconButton-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiIconButton-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: var(--cyber-color-cyan, #00ffff);
}

/* Skeleton */
.cyberpunk-mode .MuiSkeleton-root {
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.05) 0%, rgba(0, 255, 255, 0.15) 50%, rgba(0, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: cyber-skeleton 1.5s ease-in-out infinite;
}

/* Typography */
.cyberpunk-mode .MuiTypography-h1,
.cyberpunk-mode .MuiTypography-h2,
.cyberpunk-mode .MuiTypography-h3,
.cyberpunk-mode .MuiTypography-h4,
.cyberpunk-mode .MuiTypography-h5,
.cyberpunk-mode .MuiTypography-h6 {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiTypography-body1,
.cyberpunk-mode .MuiTypography-body2 {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* Alert */
.cyberpunk-mode .MuiAlert-root {
  background-color: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiAlert-standardSuccess {
  background-color: rgba(0, 255, 136, 0.08);
  border-color: rgba(0, 255, 136, 0.30);
  color: var(--cyber-color-green, #00ff88);
}
.cyberpunk-mode .MuiAlert-standardWarning {
  background-color: rgba(255, 170, 0, 0.08);
  border-color: rgba(255, 170, 0, 0.30);
  color: var(--cyber-color-warn, #ffaa00);
}
.cyberpunk-mode .MuiAlert-standardError {
  background-color: rgba(255, 68, 68, 0.08);
  border-color: rgba(255, 68, 68, 0.30);
  color: var(--cyber-color-danger, #ff4444);
}
.cyberpunk-mode .MuiAlert-standardInfo {
  background-color: rgba(0, 170, 255, 0.08);
  border-color: rgba(0, 170, 255, 0.30);
  color: var(--cyber-color-blue, #00aaff);
}

/* Switch */
.cyberpunk-mode .MuiSwitch-track {
  background-color: rgba(255, 255, 255, 0.10);
}
.cyberpunk-mode .Mui-checked.MuiSwitch-switchBase + .MuiSwitch-track {
  background-color: rgba(0, 255, 255, 0.40);
  opacity: 1;
}
.cyberpunk-mode .Mui-checked.MuiSwitch-switchBase .MuiSwitch-thumb {
  background-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan-strong, 0 0 10px rgba(0, 255, 255, 0.50));
}

/* Checkbox */
.cyberpunk-mode .MuiCheckbox-root {
  color: rgba(255, 255, 255, 0.30);
}
.cyberpunk-mode .MuiCheckbox-root.Mui-checked {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* Radio */
.cyberpunk-mode .MuiRadio-root {
  color: rgba(255, 255, 255, 0.30);
}
.cyberpunk-mode .MuiRadio-root.Mui-checked {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* Slider */
.cyberpunk-mode .MuiSlider-rail {
  background-color: rgba(255, 255, 255, 0.10);
}
.cyberpunk-mode .MuiSlider-track {
  background: linear-gradient(90deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .MuiSlider-thumb {
  background-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}
.cyberpunk-mode .MuiSlider-thumb:hover,
.cyberpunk-mode .MuiSlider-thumb.Mui-active {
  box-shadow: var(--shadow-custom, 0 0 20px rgba(0, 255, 255, 0.80));
}

/* LinearProgress */
.cyberpunk-mode .MuiLinearProgress-root {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.cyberpunk-mode .MuiLinearProgress-bar {
  background: linear-gradient(90deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
  border-radius: 4px;
}

/* CircularProgress */
.cyberpunk-mode .MuiCircularProgress-circle {
  stroke: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* Backdrop */
.cyberpunk-mode .MuiBackdrop-root {
  background-color: rgba(10, 10, 26, 0.80);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Snackbar */
.cyberpunk-mode .MuiSnackbarContent-root {
  background-color: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(0, 255, 255, 0.30);
  box-shadow: var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}

/* Accordion */
.cyberpunk-mode .MuiAccordion-root {
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(0, 255, 255, 0.15);
}
.cyberpunk-mode .MuiAccordion-root:before {
  display: none;
}
.cyberpunk-mode .MuiAccordion-root.Mui-expanded {
  border-color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiAccordionSummary-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiAccordionSummary-root.Mui-expanded {
  color: var(--cyber-color-cyan, #00ffff);
  min-height: auto;
}

/* Link */
.cyberpunk-mode .MuiLink-root {
  color: var(--cyber-color-cyan, #00ffff);
  text-decoration: none;
}
.cyberpunk-mode .MuiLink-root:hover {
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.50);
}

/* Button */
.cyberpunk-mode .MuiButton-contained {
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--cyber-color-magenta, #ff00ff) 100%);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
  font-weight: 600;
  box-shadow: var(--shadow-custom, 0 0 20px rgba(0, 255, 255, 0.40));
}
.cyberpunk-mode .MuiButton-contained:hover {
  box-shadow: var(--shadow-custom, 0 0 25px rgba(0, 255, 255, 0.60), 0 0 50px rgba(255, 0, 255, 0.30));
  transform: translateY(-1px);
}
.cyberpunk-mode .MuiButton-outlined {
  border-color: rgba(0, 255, 255, 0.50);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiButton-outlined:hover {
  border-color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.08);
  box-shadow: var(--shadow-custom, 0 0 15px rgba(0, 255, 255, 0.30));
}
.cyberpunk-mode .MuiButton-text {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiButton-text:hover {
  background-color: rgba(0, 255, 255, 0.08);
}

/* Card */
.cyberpunk-mode .MuiCard-root {
  background-color: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-color: rgba(0, 255, 255, 0.20);
  box-shadow: var(--shadow-lg);
  transition: all 200ms ease-out;
}
.cyberpunk-mode .MuiCard-root:hover {
  background-color: rgba(255, 255, 255, 0.07);
  border-color: rgba(0, 255, 255, 0.50);
  box-shadow: var(--shadow-custom, 0 8px 32px rgba(0, 255, 255, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12));
}

/* TextField / OutlinedInput */
.cyberpunk-mode .MuiOutlinedInput-root {
  background-color: rgba(255, 255, 255, 0.03);
}
.cyberpunk-mode .MuiOutlinedInput-notchedOutline {
  border-color: rgba(255, 255, 255, 0.10);
}
.cyberpunk-mode .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
  border-color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, 0 0 15px rgba(0, 255, 255, 0.30));
}
.cyberpunk-mode .MuiOutlinedInput-input {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}

/* Table */
.cyberpunk-mode .MuiTableCell-root {
  border-bottom: 1px solid rgba(0, 255, 255, 0.10);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiTableCell-head {
  background-color: rgba(0, 255, 255, 0.05);
  border-bottom: 2px solid rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-cyan, #00ffff);
}

/* AppBar */
.cyberpunk-mode .MuiAppBar-root {
  background-color: rgba(10, 10, 26, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.20);
  box-shadow: var(--cyber-shadow-top-line, 0 1px 0 rgba(0, 255, 255, 0.10));
}

/* ListItemButton (侧边栏) */
.cyberpunk-mode .MuiListItemButton-root.Mui-selected {
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.20) 0%, transparent 100%);
  border-left: 3px solid var(--cyber-color-cyan, #00ffff);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiListItemButton-root.Mui-selected:hover {
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.25) 0%, transparent 100%);
}

/* ========== 自定义组件适配 ========== */

/* DataTable 工具条 */
.cyberpunk-mode .data-table-toolbar {
  background-color: rgba(26, 26, 46, 0.6);
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}

/* DataTable 分页区 */
.cyberpunk-mode .data-table-pagination {
  border-top: 1px solid rgba(0, 255, 255, 0.15);
  background-color: rgba(26, 26, 46, 0.4);
}

/* DataTable 行 hover */
.cyberpunk-mode .MuiTableRow-root:hover .MuiTableCell-body {
  background-color: rgba(0, 255, 255, 0.04);
}

/* FilterBar 容器 */
.cyberpunk-mode .filter-bar-container {
  background-color: rgba(26, 26, 46, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.15);
  backdrop-filter: blur(8px);
}

/* 霓虹骨架屏 - 与 cyber-skeleton 等价的别名 */
.cyber-neon-skeleton {
  background: linear-gradient(90deg,
    rgba(0, 255, 255, 0.05) 0%,
    rgba(0, 255, 255, 0.15) 50%,
    rgba(0, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: cyber-skeleton 1.5s ease-in-out infinite;
}

/* ========== 全局背景与滚动条 ========== */

/* 赛博朋克模式 body 背景 — 深空网格 */
.cyberpunk-mode {
  background-color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
  background-image:
    linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  background-attachment: fixed;
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}

/* 赛博朋克模式滚动条 */
.cyberpunk-mode ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.cyberpunk-mode ::-webkit-scrollbar-track {
  background: rgba(10, 10, 26, 0.5);
}
.cyberpunk-mode ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(0, 255, 255, 0.30), rgba(255, 0, 255, 0.30));
  border-radius: 5px;
  border: 1px solid rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(0, 255, 255, 0.50), rgba(255, 0, 255, 0.50));
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode ::-webkit-scrollbar-corner {
  background: rgba(10, 10, 26, 0.5);
}

/* Firefox 滚动条 */
.cyberpunk-mode * {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 255, 255, 0.30) rgba(10, 10, 26, 0.5);
}

/* 文本选区颜色 */
.cyberpunk-mode ::selection {
  background: rgba(0, 255, 255, 0.30);
  color: var(--color-surface, var(--color-primary-foreground, #ffffff));
}
.cyberpunk-mode ::-moz-selection {
  background: rgba(0, 255, 255, 0.30);
  color: var(--color-surface, var(--color-primary-foreground, #ffffff));
}

/* ========== 布局组件：AppHeader / AppSidebar ========== */

/* AppHeader Logo 图标 — 霓虹发光 */
.cyberpunk-mode .app-header-logo {
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
  animation: cyber-pulse-glow 3s ease-in-out infinite;
}

/* AppHeader 标题 — 霓虹文字发光 */
.cyberpunk-mode .app-header-title {
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.50), 0 0 16px rgba(0, 255, 255, 0.20);
}

/* AppSidebar — 玻璃质感 + 霓虹右边框 */
.cyberpunk-mode .MuiPaper-role-navigation,
.cyberpunk-mode [role='navigation'].MuiPaper-root {
  background-color: rgba(26, 26, 46, 0.80) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-custom, inset -1px 0 0 rgba(0, 255, 255, 0.05));
}

/* 侧边栏导航项 hover 扫光效果 */
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root {
  position: relative;
  overflow: hidden;
  transition: all 200ms ease;
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.10), transparent);
  transition: left 600ms ease;
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root:hover::before {
  left: 100%;
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root:hover {
  background-color: rgba(0, 255, 255, 0.06);
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root .MuiListItemIcon-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: color 200ms ease;
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root:hover .MuiListItemIcon-root {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* 侧边栏分组标签 */
.cyberpunk-mode [role='navigation'] .MuiListSubheader-root {
  background-color: transparent;
  color: rgba(0, 255, 255, 0.60);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.6875rem;
  font-weight: 700;
}

/* 侧边栏滚动条 */
.cyberpunk-mode [role='navigation'] {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 255, 255, 0.20) transparent;
}

/* ========== 登录页赛博朋克适配 ========== */

/* 登录页背景 — 深空 + 霓虹光晕 */
.cyberpunk-mode .login-page {
  background-color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)) !important;
  background-image:
    radial-gradient(ellipse at 20% 30%, rgba(0, 255, 255, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(255, 0, 255, 0.15) 0%, transparent 50%),
    linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px) !important;
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px !important;
}

/* 登录页原始渐变背景层隐藏 */
.cyberpunk-mode .login-page > .MuiBox-root:first-child {
  background: transparent !important;
}

/* 登录页装饰光斑 — 替换为霓虹色 */
.cyberpunk-mode .login-page .MuiBox-root:nth-child(2) {
  background: rgba(0, 255, 255, 0.10) !important;
  box-shadow: var(--shadow-custom, 0 0 80px rgba(0, 255, 255, 0.20));
}
.cyberpunk-mode .login-page .MuiBox-root:nth-child(3) {
  background: rgba(255, 0, 255, 0.10) !important;
  box-shadow: var(--shadow-custom, 0 0 80px rgba(255, 0, 255, 0.20));
}

/* 登录卡片 — 玻璃拟态 */
.cyberpunk-mode .login-page .MuiCard-root {
  background-color: rgba(26, 26, 46, 0.85) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 255, 255, 0.30) !important;
  box-shadow: var(--cyber-shadow-3xl, 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15));
}

/* 登录页右侧装饰面板 — 霓虹渐变 */
.cyberpunk-mode .login-page .MuiBox-root:nth-child(4) > .MuiBox-root:first-child {
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.20) 0%, rgba(255, 0, 255, 0.20) 100%) !important;
  border: 1px solid rgba(0, 255, 255, 0.30);
}

/* 登录页标题文字 — 霓虹发光 */
.cyberpunk-mode .login-page h6,
.cyberpunk-mode .login-page .MuiTypography-h6 {
  color: var(--cyber-color-cyan, #00ffff) !important;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.50);
}

/* ========== 错误页赛博朋克适配 ========== */

/* 错误页背景 — 深空 + 故障感红色光晕 */
.cyberpunk-mode .error-page {
  background-color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)) !important;
  background-image:
    radial-gradient(ellipse at 50% 30%, rgba(255, 68, 68, 0.15) 0%, transparent 60%),
    linear-gradient(rgba(255, 68, 68, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px) !important;
  background-size: 100% 100%, 40px 40px, 40px 40px !important;
}

/* 错误页卡片 — 玻璃拟态 + 红色霓虹边框 */
.cyberpunk-mode .error-page .MuiBox-root {
  background-color: rgba(26, 26, 46, 0.85) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 68, 68, 0.30);
  box-shadow: var(--cyber-shadow-3xl, 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15));
  border-radius: 16px;
}

/* 错误图标容器 — 红色霓虹发光 */
.cyberpunk-mode .error-page .MuiBox-root:nth-child(1) {
  background-color: rgba(255, 68, 68, 0.15) !important;
  box-shadow: var(--shadow-custom, 0 0 20px rgba(255, 68, 68, 0.40));
  border: 1px solid rgba(255, 68, 68, 0.30);
}

/* 错误图标 — 故障闪烁动画 */
.cyberpunk-mode .error-page svg {
  color: var(--cyber-color-danger, #ff4444) !important;
  filter: drop-shadow(0 0 8px rgba(255, 68, 68, 0.60));
  animation: cyber-error-glitch 2s ease-in-out infinite;
}
@keyframes cyber-error-glitch {
  0%, 100% { transform: translate(0); opacity: 1; }
  92% { transform: translate(-1px, 0); }
  94% { transform: translate(1px, 0); }
  96% { transform: translate(0, 1px); opacity: 0.8; }
}

/* 错误页标题 — 霓虹红发光 */
.cyberpunk-mode .error-page .MuiTypography-h5 {
  color: var(--cyber-color-danger, #ff4444) !important;
  text-shadow: 0 0 8px rgba(255, 68, 68, 0.50);
}

/* 错误页正文 */
.cyberpunk-mode .error-page .MuiTypography-body1 {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0)) !important;
}

/* ========== Loading 加载组件赛博朋克适配 ========== */

/* Loading 文字 — 霓虹青 */
.cyberpunk-mode .cyber-loading .MuiTypography-root {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* Loading Spinner — 霓虹青旋转环 */
.cyberpunk-mode .cyber-loading > div:first-child {
  border-color: rgba(0, 255, 255, 0.20) !important;
  border-top-color: var(--cyber-color-cyan, #00ffff) !important;
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* Loading Dots — 霓虹色 */
.cyberpunk-mode .cyber-loading > div:first-child > div {
  background-color: var(--cyber-color-cyan, #00ffff) !important;
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
}

/* Loading Pulse — 霓虹脉冲 */
.cyberpunk-mode .cyber-loading > div:first-child {
  background-color: var(--cyber-color-cyan, #00ffff) !important;
  box-shadow: var(--shadow-custom, 0 0 16px rgba(0, 255, 255, 0.50));
}

/* ========== EmptyState 空状态适配 ========== */

/* 空状态容器 */
.cyberpunk-mode [role='status'][aria-live='polite'] {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}

/* 空状态图标容器 — 霓虹圆形背景 */
.cyberpunk-mode [role='status'][aria-live='polite'] > .MuiBox-root:first-child {
  background-color: rgba(0, 255, 255, 0.08) !important;
  border: 1px solid rgba(0, 255, 255, 0.20);
  box-shadow: var(--shadow-custom, 0 0 16px rgba(0, 255, 255, 0.15));
}

/* 空状态图标 — 霓虹发光 */
.cyberpunk-mode [role='status'][aria-live='polite'] svg {
  color: var(--cyber-color-cyan, #00ffff) !important;
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.50));
}

/* 空状态标题 */
.cyberpunk-mode [role='status'][aria-live='polite'] .MuiTypography-h6,
.cyberpunk-mode [role='status'][aria-live='polite'] .MuiTypography-subtitle1 {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff)) !important;
}

/* 空状态描述 */
.cyberpunk-mode [role='status'][aria-live='polite'] .MuiTypography-body2 {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0)) !important;
}

/* ========== 焦点环无障碍 ========== */

/* 赛博朋克模式焦点环 — 霓虹青双环 */
.cyberpunk-mode *:focus-visible {
  outline: 2px solid var(--cyber-color-cyan, #00ffff);
  outline-offset: 2px;
  box-shadow: var(--shadow-custom, 0 0 0 4px rgba(0, 255, 255, 0.20));
}

/* 按钮/链接焦点 */
.cyberpunk-mode .MuiButton-root:focus-visible,
.cyberpunk-mode .MuiIconButton-root:focus-visible,
.cyberpunk-mode .MuiListItemButton-root:focus-visible,
.cyberpunk-mode .MuiChip-root:focus-visible {
  outline: 2px solid var(--cyber-color-cyan, #00ffff);
  outline-offset: 2px;
}

/* ========== 性能优化：will-change 提示 ========== */

/* 动画元素启用 GPU 加速 */
.cyberpunk-mode .cyber-glass-card,
.cyberpunk-mode .cyber-scanline,
.cyberpunk-mode .app-header-logo,
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root::before {
  will-change: transform, box-shadow, opacity;
}

/* prefers-reduced-motion 无障碍 — 关闭所有动画 */
@media (prefers-reduced-motion: reduce) {
  .cyberpunk-mode *,
  .cyberpunk-mode *::before,
  .cyberpunk-mode *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .cyberpunk-mode .cyber-scanline::before,
  .cyberpunk-mode .app-header-logo {
    animation: none !important;
  }
}

/* ========== GlobalSearchBar 全局搜索 ========== */

/* 搜索结果下拉 — 玻璃拟态 */
.cyberpunk-mode .global-search-bar .MuiPaper-root {
  background-color: rgba(26, 26, 46, 0.95) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 255, 0.30);
  box-shadow: var(--shadow-custom, 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(0, 255, 255, 0.10));
}

/* 搜索结果项 hover — 霓虹扫光 */
.cyberpunk-mode .global-search-bar .MuiListItemButton-root {
  transition: all 150ms ease;
  border-left: 2px solid transparent;
}
.cyberpunk-mode .global-search-bar .MuiListItemButton-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  border-left-color: var(--cyber-color-cyan, #00ffff);
}

/* 搜索结果选中项 */
.cyberpunk-mode .global-search-bar .MuiListItemButton-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-left-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* 搜索结果分组标签 */
.cyberpunk-mode .global-search-bar .MuiListSubheader-root {
  background-color: transparent;
  color: rgba(0, 255, 255, 0.60);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.6875rem;
  font-weight: 700;
}

/* ========== Breadcrumbs 面包屑 ========== */

.cyberpunk-mode .MuiBreadcrumbs-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiBreadcrumbs-li a {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: color 150ms ease;
}
.cyberpunk-mode .MuiBreadcrumbs-li a:hover {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiBreadcrumbs-li .MuiTypography-root {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiBreadcrumbs-separator {
  color: rgba(0, 255, 255, 0.40);
}

/* ========== BottomTabBar 移动端底部导航 ========== */

/* 底部导航容器 — 玻璃拟态 */
.cyberpunk-mode .bottom-tab-bar {
  background-color: rgba(10, 10, 26, 0.90) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-custom, 0 -4px 20px rgba(0, 0, 0, 0.4), 0 -1px 0 rgba(0, 255, 255, 0.10));
}

/* 底部导航项 */
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: color 200ms ease;
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root:hover {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root.Mui-selected {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root.Mui-selected .MuiBottomNavigationAction-label {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root.Mui-selected svg {
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.60));
}

/* 底部导航 Badge — 霓虹发光 */
.cyberpunk-mode .bottom-tab-bar .MuiBadge-badge {
  background: linear-gradient(135deg, var(--cyber-color-magenta, #ff00ff), var(--cyber-color-cyan, #00ffff));
  border: 1px solid rgba(255, 255, 255, 0.30);
  box-shadow: var(--shadow-custom, 0 0 8px rgba(255, 0, 255, 0.50));
}

/* ========== NotificationPanel 通知中心 ========== */

/* 通知面板容器 — 玻璃拟态 */
.cyberpunk-mode .notification-panel {
  background-color: rgba(26, 26, 46, 0.95) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 255, 255, 0.30) !important;
  box-shadow: var(--cyber-shadow-3xl, 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15));
  border-radius: 12px !important;
}

/* 通知面板标题 */
.cyberpunk-mode .notification-panel h3 {
  color: var(--cyber-color-cyan, #00ffff) !important;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 通知面板分割线 */
.cyberpunk-mode .notification-panel > div:first-child {
  border-bottom-color: rgba(0, 255, 255, 0.20) !important;
}

/* 通知面板按钮 */
.cyberpunk-mode .notification-panel button {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: color 150ms ease;
}
.cyberpunk-mode .notification-panel button:hover {
  color: var(--cyber-color-cyan, #00ffff);
}

/* 通知项文字 */
.cyberpunk-mode .notification-panel * {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .notification-panel .text-secondary,
.cyberpunk-mode .notification-panel [class*='secondary'] {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0)) !important;
}

/* 通知未读标识 — 霓虹脉冲 */
.cyberpunk-mode .notification-panel [class*='unread'],
.cyberpunk-mode .notification-panel .bg-blue-500,
.cyberpunk-mode .notification-panel .bg-primary {
  background-color: var(--cyber-color-cyan, #00ffff) !important;
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
  animation: cyber-status-pulse 2s ease-in-out infinite;
}

/* ========== SettingsPageTemplate 设置页模板 ========== */

/* 设置页区域卡片 — 玻璃拟态 */
.cyberpunk-mode .settings-page-section {
  background-color: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 255, 0.15);
  transition: all 200ms ease;
}
.cyberpunk-mode .settings-page-section:hover {
  border-color: rgba(0, 255, 255, 0.30);
  box-shadow: var(--shadow-custom, 0 4px 20px rgba(0, 255, 255, 0.08));
}

/* 设置页区域标题图标 — 霓虹发光 */
.cyberpunk-mode .settings-page-section svg {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.40));
}

/* 设置页保存按钮 — 霓虹脉冲 */
.cyberpunk-mode .settings-page-save-btn {
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--cyber-color-magenta, #ff00ff) 100%);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
  box-shadow: var(--shadow-custom, 0 0 16px rgba(0, 255, 255, 0.40));
}
.cyberpunk-mode .settings-page-save-btn:hover {
  box-shadow: var(--shadow-custom, 0 0 24px rgba(0, 255, 255, 0.60), 0 0 40px rgba(255, 0, 255, 0.30));
  transform: translateY(-1px);
}

/* 设置页重置按钮 — 霓虹边框 */
.cyberpunk-mode .settings-page-reset-btn {
  border-color: rgba(255, 170, 0, 0.50);
  color: var(--cyber-color-warn, #ffaa00);
}
.cyberpunk-mode .settings-page-reset-btn:hover {
  border-color: var(--cyber-color-warn, #ffaa00);
  background-color: rgba(255, 170, 0, 0.08);
  box-shadow: var(--shadow-custom, 0 0 12px rgba(255, 170, 0, 0.30));
}

/* 设置页表单标签 */
.cyberpunk-mode .MuiFormLabel-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiFormHelperText-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* 设置页成功/错误提示 */
.cyberpunk-mode .settings-success-alert {
  background-color: rgba(0, 255, 136, 0.08) !important;
  border: 1px solid rgba(0, 255, 136, 0.30);
  color: var(--cyber-color-green, #00ff88);
}
.cyberpunk-mode .settings-error-alert {
  background-color: rgba(255, 68, 68, 0.08) !important;
  border: 1px solid rgba(255, 68, 68, 0.30);
  color: var(--cyber-color-danger, #ff4444);
}

/* ========== ModeToggle 主题切换按钮 ========== */

/* 主题切换按钮 — 霓虹边框 */
.cyberpunk-mode .theme-toggle-btn {
  border-color: rgba(0, 255, 255, 0.40);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .theme-toggle-btn:hover {
  border-color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.08);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* ========== ToggleButton 分段控件 ========== */

.cyberpunk-mode .MuiToggleButton-root {
  border-color: rgba(0, 255, 255, 0.20);
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiToggleButton-root:hover {
  border-color: rgba(0, 255, 255, 0.40);
  background-color: rgba(0, 255, 255, 0.06);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiToggleButton-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-color: var(--cyber-color-cyan, #00ffff);
  color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}
.cyberpunk-mode .MuiToggleButton-root.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.18);
}
.cyberpunk-mode .MuiToggleButtonGroup-root .MuiToggleButton-root:not(:last-child) {
  border-right-color: rgba(0, 255, 255, 0.20);
}

/* ========== DataTable 深度适配 ========== */

/* 表格排序图标 — 霓虹色 */
.cyberpunk-mode .MuiTableSortLabel-icon {
  color: rgba(0, 255, 255, 0.50) !important;
}
.cyberpunk-mode .MuiTableSortLabel-active .MuiTableSortLabel-icon {
  color: var(--cyber-color-cyan, #00ffff) !important;
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .MuiTableSortLabel-root {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiTableSortLabel-root:hover {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 表格行 hover — 霓虹扫光 */
.cyberpunk-mode .MuiTableRow-root:hover {
  background-color: rgba(0, 255, 255, 0.04) !important;
}
.cyberpunk-mode .MuiTableRow-root:hover .MuiTableCell-body {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}

/* 表格选中行 */
.cyberpunk-mode .MuiTableRow-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.08) !important;
}
.cyberpunk-mode .MuiTableRow-root.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.12) !important;
}

/* 表格空状态 */
.cyberpunk-mode .MuiTableBody-root .MuiTableCell-body:only-child {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  text-align: center;
  padding: 48px 16px;
}

/* 表格容器边框 */
.cyberpunk-mode .MuiTableContainer-root {
  border-color: rgba(0, 255, 255, 0.15);
  background-color: transparent;
}

/* 表格固定头 */
.cyberpunk-mode .MuiTableHead-root .MuiTableCell-head {
  position: sticky;
  top: 0;
  z-index: 1;
}

/* ========== Stepper 步骤条 ========== */

/* 步骤连接线 — 霓虹渐变 */
.cyberpunk-mode .MuiStepConnector-line {
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .Mui-active .MuiStepConnector-line,
.cyberpunk-mode .Mui-completed .MuiStepConnector-line {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, 0 0 6px rgba(0, 255, 255, 0.40));
}

/* 步骤图标 — 霓虹发光 */
.cyberpunk-mode .MuiStepLabel-iconContainer .MuiSvgIcon-root {
  color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .Mui-active .MuiStepLabel-iconContainer .MuiSvgIcon-root,
.cyberpunk-mode .Mui-completed .MuiStepLabel-iconContainer .MuiSvgIcon-root {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.60));
}
.cyberpunk-mode .MuiStepLabel-label {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiStepLabel-label.Mui-active {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
  font-weight: 600;
}
.cyberpunk-mode .MuiStepLabel-label.Mui-completed {
  color: var(--cyber-color-green, #00ff88);
}

/* 步骤替代图标（圆形数字） */
.cyberpunk-mode .MuiStepIcon-text {
  fill: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
  font-weight: 700;
}
.cyberpunk-mode .MuiStepIcon-root.Mui-active {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .MuiStepIcon-root.Mui-completed {
  color: var(--cyber-color-green, #00ff88);
  filter: drop-shadow(0 0 6px rgba(0, 255, 136, 0.40));
}

/* ========== Timeline 时间线 ========== */

/* 时间线节点 — 霓虹发光 */
.cyberpunk-mode .MuiTimelineItem-root::before {
  background-color: transparent;
}
.cyberpunk-mode .MuiTimelineDot-root {
  background-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
  border: 2px solid rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-outlined {
  background-color: transparent;
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, 0 0 6px rgba(0, 255, 255, 0.40));
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-filledSuccess {
  background-color: var(--cyber-color-green, #00ff88);
  box-shadow: var(--shadow-custom, 0 0 8px rgba(0, 255, 136, 0.60));
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-filledError {
  background-color: var(--cyber-color-danger, #ff4444);
  box-shadow: var(--shadow-custom, 0 0 8px rgba(255, 68, 68, 0.60));
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-filledWarning {
  background-color: var(--cyber-color-gold, #ffd700);
  box-shadow: var(--shadow-custom, 0 0 8px rgba(255, 215, 0, 0.60));
}

/* 时间线连接线 */
.cyberpunk-mode .MuiTimelineConnector-root {
  background-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiTimelineConnector-root::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: designTokens.spacing.xs;
  height: 100%;
  background: linear-gradient(180deg, rgba(0, 255, 255, 0.50), rgba(0, 255, 255, 0.10));
}

/* 时间线内容 */
.cyberpunk-mode .MuiTimelineContent-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiTimelineOppositeContent-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* 时间线分隔符 */
.cyberpunk-mode .MuiTimelineSeparator-root {
  position: relative;
}

/* ========== TreeView 树形组件 ========== */

/* 树节点 — hover 霓虹 */
.cyberpunk-mode .MuiTreeItem-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: color 150ms ease;
}
.cyberpunk-mode .MuiTreeItem-root:hover {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiTreeItem-content {
  border-radius: 4px;
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiTreeItem-content:hover {
  background-color: rgba(0, 255, 255, 0.06);
}
.cyberpunk-mode .MuiTreeItem-content.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-left: 2px solid var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiTreeItem-content.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.18);
}
.cyberpunk-mode .MuiTreeItem-content.Mui-selected .MuiTreeItem-label {
  color: var(--cyber-color-cyan, #00ffff);
}

/* 树展开/折叠图标 */
.cyberpunk-mode .MuiTreeItem-iconContainer svg {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 3px rgba(0, 255, 255, 0.40));
}

/* 树形连接线 */
.cyberpunk-mode .MuiCollapse-root {
  border-left: 1px dashed rgba(0, 255, 255, 0.15);
  margin-left: 8px;
}

/* ========== DatePicker / TimePicker 日期时间选择器 ========== */

/* 日期选择器输入框 — 已由 OutlinedInput 覆盖 */

/* 日期选择器日历 — 玻璃拟态 */
.cyberpunk-mode .MuiDateCalendar-root,
.cyberpunk-mode .MuiPickersLayout-root {
  background-color: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 255, 0.20);
}

/* 日期选择器头部 */
.cyberpunk-mode .MuiPickersCalendarHeader-root {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiPickersCalendarHeader-label {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
  font-weight: 600;
}
.cyberpunk-mode .MuiPickersCalendarHeader-labelContainer svg {
  color: var(--cyber-color-cyan, #00ffff);
}

/* 日期选择器星期标签 */
.cyberpunk-mode .MuiDayCalendar-weekDayLabel {
  color: rgba(0, 255, 255, 0.60);
  text-transform: uppercase;
  font-size: 0.6875rem;
  font-weight: 700;
}

/* 日期选择器日期单元格 */
.cyberpunk-mode .MuiPickersDay-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  border-color: transparent;
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiPickersDay-root:hover {
  background-color: rgba(0, 255, 255, 0.10);
  color: var(--cyber-color-cyan, #00ffff);
  border-color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiPickersDay-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.20) !important;
  color: var(--cyber-color-cyan, #00ffff);
  border: 1px solid var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
  font-weight: 600;
}
.cyberpunk-mode .MuiPickersDay-root.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.30) !important;
}
.cyberpunk-mode .MuiPickersDay-today {
  border-color: var(--cyber-color-magenta, #ff00ff);
  color: var(--cyber-color-magenta, #ff00ff);
}

/* 日期选择器月份/年份选择 */
.cyberpunk-mode .MuiMonthPicker-root,
.cyberpunk-mode .MuiYearPicker-root {
  background-color: transparent;
}
.cyberpunk-mode .MuiPickersMonth-root,
.cyberpunk-mode .MuiPickersYear-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiPickersMonth-root:hover,
.cyberpunk-mode .MuiPickersYear-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiPickersMonth-root.Mui-selected,
.cyberpunk-mode .MuiPickersYear-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.15);
  color: var(--cyber-color-cyan, #00ffff);
  border: 1px solid rgba(0, 255, 255, 0.30);
}

/* 时钟选择器 */
.cyberpunk-mode .MuiClock-root {
  background-color: rgba(26, 26, 46, 0.80);
  border: 1px solid rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiClock-clock {
  background-color: rgba(0, 255, 255, 0.05);
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiClockNumber-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: color 150ms ease;
}
.cyberpunk-mode .MuiClockNumber-root.Mui-selected {
  color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.15);
}
.cyberpunk-mode .MuiClockPointer-root {
  background-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, 0 0 6px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .MuiClockPointer-thumb {
  background-color: var(--cyber-color-cyan, #00ffff);
  border-color: var(--cyber-color-cyan, #00ffff);
}

/* 日期选择器工具栏 */
.cyberpunk-mode .MuiDateTimePickerToolbar-root,
.cyberpunk-mode .MuiDatePickerToolbar-root,
.cyberpunk-mode .MuiTimePickerToolbar-root {
  background-color: rgba(0, 255, 255, 0.05);
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}
.cyberpunk-mode .MuiPickersToolbar-text {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiPickersToolbar-penIconButton {
  color: var(--cyber-color-cyan, #00ffff);
}

/* 日期选择器底部操作按钮 */
.cyberpunk-mode .MuiDialogActions-root .MuiButton-root {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiDialogActions-root .MuiButton-contained {
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--cyber-color-magenta, #ff00ff) 100%);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
}

/* ========== Toast/Snackbar 动画增强 ========== */

/* Snackbar 进入动画 — 从底部滑入 + 霓虹发光 */
@keyframes cyber-snackbar-in {
  0% {
    transform: translateY(100%) scale(0.9);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
.cyberpunk-mode .MuiSnackbar-root .MuiSnackbarContent-root {
  animation: cyber-snackbar-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Snackbar 成功 — 霓虹绿边框 */
.cyberpunk-mode .MuiSnackbarContent-root.MuiSnackbarContent-colorSuccess {
  border-color: rgba(0, 255, 136, 0.50);
  box-shadow: var(--shadow-custom, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 136, 0.20));
}

/* Snackbar 错误 — 霓虹红边框 */
.cyberpunk-mode .MuiSnackbarContent-root.MuiSnackbarContent-colorError {
  border-color: rgba(255, 68, 68, 0.50);
  box-shadow: var(--shadow-custom, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 68, 68, 0.20));
}

/* Snackbar 警告 — 霓虹金边框 */
.cyberpunk-mode .MuiSnackbarContent-root.MuiSnackbarContent-colorWarning {
  border-color: rgba(255, 215, 0, 0.50);
  box-shadow: var(--shadow-custom, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.20));
}

/* Snackbar 信息 — 霓虹青边框 */
.cyberpunk-mode .MuiSnackbarContent-root.MuiSnackbarContent-colorInfo {
  border-color: rgba(0, 170, 255, 0.50);
  box-shadow: var(--shadow-custom, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 170, 255, 0.20));
}

/* ========== Dialog 过渡增强 ========== */

/* Dialog 进入动画 — 缩放 + 淡入 + 霓虹光晕 */
@keyframes cyber-dialog-in {
  0% {
    transform: scale(0.92) translateY(20px);
    opacity: 0;
    box-shadow: var(--shadow-custom, 0 0 0 rgba(0, 255, 255, 0));
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
    box-shadow: var(--cyber-shadow-3xl, 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15));
  }
}
.cyberpunk-mode .MuiDialog-paper {
  animation: cyber-dialog-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Dialog 标题 — 霓虹发光 */
.cyberpunk-mode .MuiDialogTitle-root {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.30);
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}

/* Dialog 内容 */
.cyberpunk-mode .MuiDialogContent-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}

/* Dialog 操作区 */
.cyberpunk-mode .MuiDialogActions-root {
  border-top: 1px solid rgba(0, 255, 255, 0.15);
  padding: designTokens.spacing.md 24px;
}

/* ========== CommandPalette 命令面板 ========== */

/* 命令面板容器 — 深空玻璃拟态 + HUD 边框装饰 */
.cyberpunk-mode .command-palette .MuiDialog-paper {
  background-color: rgba(10, 10, 26, 0.92) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 255, 255, 0.40);
  box-shadow: var(--shadow-custom, 0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 60px rgba(0, 255, 255, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10));
  position: relative;
  overflow: hidden;
}

/* 命令面板顶部装饰线 — 渐变霓虹 */
.cyberpunk-mode .command-palette .MuiDialog-paper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: designTokens.spacing.xs;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--cyber-color-cyan, #00ffff) 20%,
    var(--cyber-color-magenta, #ff00ff) 50%,
    var(--cyber-color-cyan, #00ffff) 80%,
    transparent 100%);
  box-shadow: var(--cyber-shadow-glow-cyan-strong, 0 0 10px rgba(0, 255, 255, 0.50));
  z-index: 1;
}

/* 命令面板 HUD 角标 — 四角装饰 */
.cyberpunk-mode .command-palette .MuiDialog-paper::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  pointer-events: none;
  background:
    linear-gradient(to right, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) top left no-repeat,
    linear-gradient(to bottom, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) top left no-repeat,
    linear-gradient(to left, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) top right no-repeat,
    linear-gradient(to bottom, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) top right no-repeat,
    linear-gradient(to right, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) bottom left no-repeat,
    linear-gradient(to top, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) bottom left no-repeat,
    linear-gradient(to left, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) bottom right no-repeat,
    linear-gradient(to top, var(--cyber-color-cyan, #00ffff) 0, var(--cyber-color-cyan, #00ffff) 12px, transparent 12px) bottom right no-repeat;
  background-size: 12px 2px, 2px 12px, 12px 2px, 2px 12px, 12px 2px, 2px 12px, 12px 2px, 2px 12px;
  opacity: 0.70;
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.60));
}

/* 命令面板搜索框容器 — 霓虹底边 */
.cyberpunk-mode .command-palette .MuiDialog-paper > .MuiBox-root:first-child {
  border-bottom-color: rgba(0, 255, 255, 0.25) !important;
  background-color: rgba(0, 255, 255, 0.03);
  position: relative;
  z-index: 2;
}

/* 命令面板搜索输入框 — 霓虹焦点 */
.cyberpunk-mode .command-palette .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, 0 0 16px rgba(0, 255, 255, 0.40));
}

/* 命令面板搜索图标 — 霓虹发光 */
.cyberpunk-mode .command-palette .MuiInputAdornment-root svg {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* 命令面板快捷键 Chip — 霓虹风格 */
.cyberpunk-mode .command-palette .MuiChip-root {
  background-color: rgba(0, 255, 255, 0.10);
  border: 1px solid rgba(0, 255, 255, 0.40);
  color: var(--cyber-color-cyan, #00ffff);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-weight: 600;
  box-shadow: var(--shadow-custom, 0 0 6px rgba(0, 255, 255, 0.20));
}

/* 命令面板分组标签 — HUD 风格 */
.cyberpunk-mode .command-palette .MuiBox-root > .MuiTypography-root {
  color: rgba(0, 255, 255, 0.80) !important;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.6875rem !important;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 命令面板列表项 — 默认态 */
.cyberpunk-mode .command-palette .MuiListItemButton-root {
  border-left: 2px solid transparent;
  transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

/* 命令面板列表项 — hover 扫光 */
.cyberpunk-mode .command-palette .MuiListItemButton-root:hover {
  background-color: rgba(0, 255, 255, 0.06);
  border-left-color: rgba(0, 255, 255, 0.50);
}

/* 命令面板列表项 — 选中态（霓虹高亮） */
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-left-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, inset 4px 0 12px rgba(0, 255, 255, 0.20),
    inset 0 0 16px rgba(0, 255, 255, 0.05));
}

/* 选中项左侧扫光指示器 */
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--cyber-color-cyan, #00ffff);
  box-shadow: 0 0 12px var(--cyber-color-cyan, #00ffff), 0 0 24px rgba(0, 255, 255, 0.50);
  animation: cyber-pulse-glow 1.5s ease-in-out infinite;
}

/* 命令面板列表项图标 — 选中时霓虹发光 */
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root svg {
  color: var(--cyber-color-cyan, #00ffff) !important;
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.70));
}

/* 命令面板列表项主文本 — 选中时霓虹色 */
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected .MuiListItemText-primary {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 命令面板列表项次文本 — 路径提示 */
.cyberpunk-mode .command-palette .MuiListItemText-secondary {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0)) !important;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem !important;
}

/* 命令面板右侧箭头 — 选中时显示霓虹 */
.cyberpunk-mode .command-palette .MuiListItemButton-root svg {
  transition: all 180ms ease;
}
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected > div > svg:last-child,
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected svg[lucide='arrow-right'] {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.60));
}

/* 命令面板底部提示区 — HUD 状态栏 */
.cyberpunk-mode .command-palette .MuiDialog-paper > .MuiBox-root:last-child {
  border-top-color: rgba(0, 255, 255, 0.20) !important;
  background-color: rgba(10, 10, 26, 0.60);
  position: relative;
  z-index: 2;
}

/* 命令面板底部提示文字 — 等宽字体 */
.cyberpunk-mode .command-palette .MuiDialog-paper > .MuiBox-root:last-child .MuiTypography-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
}

/* 命令面板空状态 — 霓虹 */
.cyberpunk-mode .command-palette .MuiTypography-root[color='text.secondary'] {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0)) !important;
}

/* 命令面板出现动画 — HUD 启动效果 */
@keyframes cyber-command-palette-in {
  0% {
    transform: scale(0.95) translateY(-12px);
    opacity: 0;
    filter: brightness(1.5) blur(4px);
  }
  50% {
    filter: brightness(1.2) blur(0);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
    filter: brightness(1) blur(0);
  }
}
.cyberpunk-mode .command-palette .MuiDialog-paper {
  animation: cyber-command-palette-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 命令面板扫描线 — 持续向下流动 */
@keyframes cyber-command-scanline {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(100%);
    opacity: 0;
  }
}

/* 命令面板背景 — 隐式扫描线层 */
.cyberpunk-mode .command-palette .MuiDialog-paper > .MuiBox-root:nth-child(2) {
  position: relative;
}
.cyberpunk-mode .command-palette .MuiDialog-paper > .MuiBox-root:nth-child(2)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(0, 255, 255, 0.08) 50%,
    transparent 100%);
  animation: cyber-command-scanline 3s linear infinite;
  pointer-events: none;
  z-index: 1;
}

/* ========== HUD 装饰元素 — 全局 HUD 角标 ========== */

/* HUD 角标 — 在赛博朋克模式下显示装饰性角标 */
.cyberpunk-mode .cyber-hud-corners {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.40;
}
.cyberpunk-mode .cyber-hud-corners::before,
.cyberpunk-mode .cyber-hud-corners::after {
  content: '';
  position: absolute;
  width: designTokens.spacing.xl;
  height: designTokens.spacing.xl;
  border: 2px solid var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .cyber-hud-corners::before {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
}
.cyberpunk-mode .cyber-hud-corners::after {
  top: 8px;
  right: 8px;
  border-left: none;
  border-bottom: none;
}

/* HUD 顶部扫描线 — 持续扫过屏幕 */
@keyframes cyber-hud-scan {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* HUD 状态栏指示 — 顶部状态条 */
.cyberpunk-mode .cyber-hud-statusbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: designTokens.spacing.xs;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(0, 255, 255, 0.30) 20%,
    rgba(255, 0, 255, 0.30) 50%,
    rgba(0, 255, 255, 0.30) 80%,
    transparent 100%);
  z-index: 9998;
  pointer-events: none;
  opacity: 0.60;
}
.cyberpunk-mode .cyber-hud-statusbar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 30%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--cyber-color-cyan, #00ffff), transparent);
  box-shadow: 0 0 12px var(--cyber-color-cyan, #00ffff);
  animation: cyber-hud-scan 8s linear infinite;
}

/* HUD 数据流装饰 — 右下角闪烁数据点 */
@keyframes cyber-hud-blink {
  0%, 100% {
    opacity: 0.30;
  }
  50% {
    opacity: 1;
  }
}

.cyberpunk-mode .cyber-hud-datastream {
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: designTokens.spacing.xs;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.6875rem;
  color: rgba(0, 255, 255, 0.60);
  text-shadow: 0 0 4px rgba(0, 255, 255, 0.40);
  z-index: 9997;
  pointer-events: none;
  letter-spacing: 0.05em;
}
.cyberpunk-mode .cyber-hud-datastream::before {
  content: '◉';
  color: var(--cyber-color-green, #00ff88);
  animation: cyber-hud-blink 1.5s ease-in-out infinite;
}
.cyberpunk-mode .cyber-hud-datastream::after {
  content: 'SYS.ONLINE';
  margin-left: 6px;
}

/* ========== AppHeader Logo 动画增强 ========== */

/* Logo 容器 — 多层霓虹发光 + HUD 风格 */
.cyberpunk-mode .app-header-logo {
  position: relative;
  background: linear-gradient(135deg,
    var(--cyber-color-cyan, #00ffff) 0%,
    var(--color-fallback-ant-blue, #1890ff) 25%,
    var(--cyber-color-magenta, #ff00ff) 75%,
    var(--color-fallback-accent-pink, #ff0088) 100%) !important;
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
  animation: cyber-pulse-glow 3s ease-in-out infinite;
  overflow: hidden;
}

/* Logo 内部字符 — 高对比度 */
.cyberpunk-mode .app-header-logo .MuiTypography-root {
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)) !important;
  font-weight: 900;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.50);
  position: relative;
  z-index: 2;
}

/* Logo 扫描线效果 — 持续扫过 */
.cyberpunk-mode .app-header-logo::before {
  content: '';
  position: absolute;
  top: -50%;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.40) 50%,
    transparent 100%);
  animation: cyber-logo-scan 4s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes cyber-logo-scan {
  0%, 100% {
    top: -50%;
    opacity: 0;
  }
  50% {
    top: 100%;
    opacity: 1;
  }
}

/* Logo HUD 角标装饰 — 四角小标记 */
.cyberpunk-mode .app-header-logo::after {
  content: '';
  position: absolute;
  inset: 2px;
  background:
    linear-gradient(to right, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) top left no-repeat,
    linear-gradient(to bottom, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) top left no-repeat,
    linear-gradient(to left, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) top right no-repeat,
    linear-gradient(to bottom, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) top right no-repeat,
    linear-gradient(to right, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) bottom left no-repeat,
    linear-gradient(to top, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) bottom left no-repeat,
    linear-gradient(to left, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) bottom right no-repeat,
    linear-gradient(to top, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0, var(--color-surface, var(--color-primary-foreground, #ffffff)) 4px, transparent 4px) bottom right no-repeat;
  background-size: 4px 1px, 1px 4px, 4px 1px, 1px 4px, 4px 1px, 1px 4px, 4px 1px, 1px 4px;
  opacity: 0.80;
  pointer-events: none;
}

/* AppHeader 标题 — 渐变文字 + 多层发光 */
.cyberpunk-mode .app-header-title {
  background: linear-gradient(135deg,
    var(--cyber-color-cyan, #00ffff) 0%,
    var(--color-surface, var(--color-primary-foreground, #ffffff)) 30%,
    var(--cyber-color-magenta, #ff00ff) 60%,
    var(--cyber-color-cyan, #00ffff) 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow:
    0 0 12px rgba(0, 255, 255, 0.50),
    0 0 24px rgba(255, 0, 255, 0.20);
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.40));
  letter-spacing: 0.08em;
  position: relative;
}

/* AppHeader 标题装饰 — 左侧霓虹竖线 */
.cyberpunk-mode .app-header-title::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 70%;
  background: linear-gradient(180deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
  border-radius: 2px;
}

/* ========== 自定义滚动条 — 命令面板独立风格 ========== */

.cyberpunk-mode .command-palette ::-webkit-scrollbar {
  width: designTokens.spacing.sm;
}
.cyberpunk-mode .command-palette ::-webkit-scrollbar-track {
  background: transparent;
}
.cyberpunk-mode .command-palette ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  border-radius: 3px;
  box-shadow: var(--shadow-custom, 0 0 6px rgba(0, 255, 255, 0.50));
}

/* ========== BI MetricCard 指标卡片 ========== */

/* 容器 — 深空玻璃拟态 + 霓虹边框 */
.cyberpunk-mode .bi-metric-card {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
}

/* 顶部装饰光带 */
.cyberpunk-mode .bi-metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: designTokens.spacing.xs;
  background: linear-gradient(90deg, transparent, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff), transparent);
  opacity: 0.60;
}

/* hover 态 — 霓虹发光增强 */
.cyberpunk-mode .bi-metric-card:hover {
  border-color: rgba(0, 255, 255, 0.50) !important;
  box-shadow: var(--shadow-custom, 0 12px 40px rgba(0, 0, 0, 0.50),
    0 0 24px rgba(0, 255, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.10));
}

/* 指标数值 — 霓虹发光 */
.cyberpunk-mode .bi-metric-card .MuiTypography-root {
  color: var(--color-border, #e2e8f0);
}
.cyberpunk-mode .bi-metric-card .MuiTypography-h4,
.cyberpunk-mode .bi-metric-card .MuiTypography-h3 {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 12px rgba(0, 255, 255, 0.50);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-weight: 700;
}

/* 趋势上升 — 霓虹绿 */
.cyberpunk-mode .bi-metric-card [color='success.main'],
.cyberpunk-mode .bi-metric-card .MuiTypography-colorSuccess {
  color: var(--cyber-color-green, #00ff88) !important;
  text-shadow: 0 0 6px rgba(0, 255, 136, 0.50);
}

/* 趋势下降 — 霓虹红 */
.cyberpunk-mode .bi-metric-card [color='error.main'],
.cyberpunk-mode .bi-metric-card .MuiTypography-colorError {
  color: var(--color-fallback-accent-pink, #ff0066) !important;
  text-shadow: 0 0 6px rgba(255, 0, 102, 0.50);
}

/* ========== BI ChartCard 图表卡片 ========== */

/* 容器 — 玻璃拟态 */
.cyberpunk-mode .bi-chart-card {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  position: relative;
}

/* 顶部霓虹装饰线 */
.cyberpunk-mode .bi-chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--cyber-color-cyan, #00ffff), transparent);
  opacity: 0.70;
  z-index: 1;
}

/* hover 态 */
.cyberpunk-mode .bi-chart-card:hover {
  border-color: rgba(0, 255, 255, 0.40) !important;
  box-shadow: var(--shadow-custom, 0 12px 40px rgba(0, 0, 0, 0.50),
    0 0 24px rgba(0, 255, 255, 0.20));
}

/* 卡片标题 — 霓虹青 */
.cyberpunk-mode .bi-chart-card .MuiCardHeader-title {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.40);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* 卡片副标题 */
.cyberpunk-mode .bi-chart-card .MuiCardHeader-subheader {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
}

/* 卡片头部底边 */
.cyberpunk-mode .bi-chart-card .MuiCardHeader-root {
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}

/* 图表类型切换按钮容器 — 深色玻璃 */
.cyberpunk-mode .bi-chart-card .MuiCardHeader-action div[style*='F1F5F9'] {
  background-color: rgba(0, 255, 255, 0.06) !important;
  border: 1px solid rgba(0, 255, 255, 0.20);
}

/* 切换按钮 hover — 霓虹青 */
.cyberpunk-mode .bi-chart-card .MuiCardHeader-action button:hover {
  color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.10);
}

/* 时间范围 Chip — 霓虹风格 */
.cyberpunk-mode .bi-chart-card .MuiChip-root {
  background-color: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-cyan, #00ffff);
}

/* 汇总数据 — 等宽字体 */
.cyberpunk-mode .bi-chart-card .MuiCardContent-root .MuiTypography-caption {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* ========== AI FloatingAIHelper 浮动助手 ========== */

/* 浮动按钮 — 霓虹渐变 + 多层发光 */
.cyberpunk-mode .ai-helper-fab {
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--color-fallback-ant-blue, #1890ff) 50%, var(--cyber-color-magenta, #ff00ff) 100%) !important;
  box-shadow: var(--shadow-custom, 0 8px 24px rgba(0, 0, 0, 0.50),
    0 0 24px rgba(0, 255, 255, 0.50),
    0 0 48px rgba(255, 0, 255, 0.25) !important);
  border: 2px solid rgba(255, 255, 255, 0.30);
  position: relative;
  overflow: hidden;
  animation: cyber-pulse-glow 2.5s ease-in-out infinite;
}

/* hover 态 — 发光增强 */
.cyberpunk-mode .ai-helper-fab:hover {
  box-shadow: var(--shadow-custom, 0 12px 32px rgba(0, 0, 0, 0.60),
    0 0 36px rgba(0, 255, 255, 0.70),
    0 0 72px rgba(255, 0, 255, 0.40) !important);
  transform: scale(1.05);
}

/* 浮动按钮扫描线 */
.cyberpunk-mode .ai-helper-fab::before {
  content: '';
  position: absolute;
  top: -100%;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.40), transparent);
  animation: cyber-logo-scan 3s ease-in-out infinite;
  pointer-events: none;
}

/* 浮动按钮图标 — 黑色高对比 */
.cyberpunk-mode .ai-helper-fab svg {
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)) !important;
  filter: drop-shadow(0 1px 2px rgba(255, 255, 255, 0.50));
}

/* AI 助手面板 — 深空玻璃拟态 */
.cyberpunk-mode .ai-helper-panel {
  background-color: rgba(10, 10, 26, 0.92) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 255, 255, 0.40);
  box-shadow: var(--shadow-custom, 0 32px 80px rgba(0, 0, 0, 0.70),
    0 0 60px rgba(0, 255, 255, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10));
  overflow: hidden;
  position: relative;
}

/* 面板顶部装饰线 */
.cyberpunk-mode .ai-helper-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: designTokens.spacing.xs;
  background: linear-gradient(90deg, transparent, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff), var(--cyber-color-cyan, #00ffff), transparent);
  box-shadow: var(--cyber-shadow-glow-cyan-strong, 0 0 10px rgba(0, 255, 255, 0.50));
  z-index: 1;
}

/* 面板头部 — 渐变背景 */
.cyberpunk-mode .ai-helper-panel .MuiBox-root:first-child > .MuiBox-root:first-child {
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--color-fallback-ant-blue, #1890ff) 50%, var(--cyber-color-magenta, #ff00ff) 100%) !important;
  position: relative;
}

/* 面板头部标题 */
.cyberpunk-mode .ai-helper-panel .MuiBox-root:first-child > .MuiBox-root:first-child .MuiTypography-root {
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)) !important;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.40);
}

/* 面板头部图标按钮 — 半透明白 */
.cyberpunk-mode .ai-helper-panel .MuiBox-root:first-child > .MuiBox-root:first-child .MuiIconButton-root {
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
  background-color: rgba(255, 255, 255, 0.20);
  backdrop-filter: blur(8px);
}
.cyberpunk-mode .ai-helper-panel .MuiBox-root:first-child > .MuiBox-root:first-child .MuiIconButton-root:hover {
  background-color: rgba(255, 255, 255, 0.30);
}

/* 搜索框 — 霓虹焦点 */
.cyberpunk-mode .ai-helper-panel .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
  border-color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .ai-helper-panel .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* 工具/命令卡片 — 玻璃拟态 */
.cyberpunk-mode .ai-helper-panel .MuiPaper-root.MuiPaper-elevation0,
.cyberpunk-mode .ai-helper-panel .MuiPaper-outlined {
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(0, 255, 255, 0.20);
  backdrop-filter: blur(8px);
}

/* 工具卡片 hover — 霓虹边框 + 扫光 */
.cyberpunk-mode .ai-helper-panel .MuiPaper-root.MuiPaper-elevation0:hover,
.cyberpunk-mode .ai-helper-panel .MuiPaper-outlined:hover {
  border-color: rgba(0, 255, 255, 0.50);
  background-color: rgba(0, 255, 255, 0.06);
  box-shadow: var(--shadow-custom, 0 0 16px rgba(0, 255, 255, 0.20));
}

/* 工具标题 — 霓虹青 */
.cyberpunk-mode .ai-helper-panel .MuiTypography-subtitle2 {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 工具描述 — 灰蓝 */
.cyberpunk-mode .ai-helper-panel .MuiTypography-caption {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* 工具图标 — 霓虹青 */
.cyberpunk-mode .ai-helper-panel .MuiListItemIcon-root svg {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* 命令 Chip — 霓虹风格 */
.cyberpunk-mode .ai-helper-panel .MuiChip-root {
  background-color: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-cyan, #00ffff);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* 命令 Chip hover */
.cyberpunk-mode .ai-helper-panel .MuiChip-root:hover {
  background-color: rgba(0, 255, 255, 0.15);
  border-color: rgba(0, 255, 255, 0.60);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* ========== KanbanPageTemplate 看板模板 ========== */

/* 看板容器 */
.cyberpunk-mode .kanban-page-template {
  position: relative;
}

/* 看板统计卡 — 玻璃拟态 */
.cyberpunk-mode .kanban-page-template .MuiPaper-root[style*='borderRadius: 2'] {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-custom, 0 4px 16px rgba(0, 0, 0, 0.40));
}

/* 看板统计数字 — 霓虹青等宽 */
.cyberpunk-mode .kanban-page-template .MuiTypography-h5,
.cyberpunk-mode .kanban-page-template .MuiTypography-h4 {
  color: var(--cyber-color-cyan, #00ffff);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.50);
}

/* 看板列容器 — 深色玻璃 */
.cyberpunk-mode .kanban-page-template .MuiBox-root > .MuiPaper-root {
  background-color: rgba(10, 10, 26, 0.60) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 255, 255, 0.15);
}

/* 看板列标题 — 霓虹大写 */
.cyberpunk-mode .kanban-page-template .MuiTypography-subtitle1 {
  color: var(--cyber-color-cyan, #00ffff);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
  font-weight: 700;
}

/* 看板卡片 — 玻璃拟态 */
.cyberpunk-mode .kanban-page-template .MuiPaper-elevation1,
.cyberpunk-mode .kanban-page-template .MuiPaper-elevation2 {
  background-color: rgba(26, 26, 46, 0.80) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-custom, 0 4px 12px rgba(0, 0, 0, 0.40));
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* 看板卡片 hover — 上浮 + 霓虹边框 */
.cyberpunk-mode .kanban-page-template .MuiPaper-elevation1:hover,
.cyberpunk-mode .kanban-page-template .MuiPaper-elevation2:hover {
  border-color: rgba(0, 255, 255, 0.60) !important;
  transform: translateY(-2px);
  box-shadow: var(--shadow-custom, 0 12px 24px rgba(0, 0, 0, 0.50),
    0 0 16px rgba(0, 255, 255, 0.30));
}

/* 看板卡片标题 — 霓虹白 */
.cyberpunk-mode .kanban-page-template .MuiPaper-elevation1 .MuiTypography-h6,
.cyberpunk-mode .kanban-page-template .MuiPaper-elevation2 .MuiTypography-h6 {
  color: var(--color-border, #e2e8f0);
  text-shadow: 0 0 4px rgba(0, 255, 255, 0.30);
}

/* 看板卡片优先级 Chip — 霓虹色 */
.cyberpunk-mode .kanban-page-template .MuiChip-colorError,
.cyberpunk-mode .kanban-page-template .MuiChip-colorError_MuiChip-colorDefault {
  background-color: rgba(255, 0, 102, 0.15) !important;
  color: var(--color-fallback-accent-pink, #ff0066) !important;
  border: 1px solid rgba(255, 0, 102, 0.40);
  text-shadow: 0 0 4px rgba(255, 0, 102, 0.40);
}

.cyberpunk-mode .kanban-page-template .MuiChip-colorWarning {
  background-color: rgba(255, 215, 0, 0.15) !important;
  color: var(--cyber-color-gold, #ffd700) !important;
  border: 1px solid rgba(255, 215, 0, 0.40);
  text-shadow: 0 0 4px rgba(255, 215, 0, 0.40);
}

.cyberpunk-mode .kanban-page-template .MuiChip-colorSuccess {
  background-color: rgba(0, 255, 136, 0.15) !important;
  color: var(--cyber-color-green, #00ff88) !important;
  border: 1px solid rgba(0, 255, 136, 0.40);
  text-shadow: 0 0 4px rgba(0, 255, 136, 0.40);
}

.cyberpunk-mode .kanban-page-template .MuiChip-colorInfo {
  background-color: rgba(0, 255, 255, 0.15) !important;
  color: var(--cyber-color-cyan, #00ffff) !important;
  border: 1px solid rgba(0, 255, 255, 0.40);
  text-shadow: 0 0 4px rgba(0, 255, 255, 0.40);
}

/* 看板进度条 — 霓虹渐变 */
.cyberpunk-mode .kanban-page-template .MuiLinearProgress-bar {
  background: linear-gradient(90deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
}

/* 看板搜索框 — 霓虹焦点 */
.cyberpunk-mode .kanban-page-template .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* ========== Dashboard 仪表盘组件 ========== */

/* Dashboard 模块卡片 — 玻璃拟态 */
.cyberpunk-mode .MuiPaper-root.dashboard-module-card,
.cyberpunk-mode .dashboard-module-card {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* hover — 霓虹发光 */
.cyberpunk-mode .MuiPaper-root.dashboard-module-card:hover,
.cyberpunk-mode .dashboard-module-card:hover {
  border-color: rgba(0, 255, 255, 0.50) !important;
  transform: translateY(-2px);
  box-shadow: var(--shadow-custom, 0 12px 32px rgba(0, 0, 0, 0.50),
    0 0 24px rgba(0, 255, 255, 0.25));
}

/* 仪表盘 Hero 区域 — 深空背景 */
.cyberpunk-mode .dashboard-hero {
  background: linear-gradient(135deg,
    rgba(0, 255, 255, 0.10) 0%,
    rgba(255, 0, 255, 0.05) 50%,
    rgba(10, 10, 26, 0.80) 100%) !important;
  border: 1px solid rgba(0, 255, 255, 0.30);
  backdrop-filter: blur(16px);
  position: relative;
  overflow: hidden;
}

/* Hero 装饰光斑 */
.cyberpunk-mode .dashboard-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 60%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%);
  pointer-events: none;
  animation: cyber-pulse-glow 4s ease-in-out infinite;
}

/* 仪表盘服务状态卡 — 玻璃拟态 */
.cyberpunk-mode .service-status-card {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
}

/* 仪表盘最近活动 — 玻璃拟态 */
.cyberpunk-mode .recent-activities {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
}

/* 仪表盘快捷操作 — 霓虹按钮 */
.cyberpunk-mode .dashboard-quick-actions .MuiButton-root {
  background-color: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-cyan, #00ffff);
  backdrop-filter: blur(8px);
}
.cyberpunk-mode .dashboard-quick-actions .MuiButton-root:hover {
  background-color: rgba(0, 255, 255, 0.15);
  border-color: rgba(0, 255, 255, 0.60);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* ========== WizardPageTemplate 向导页模板 ========== */

/* 向导步骤标签 — 激活态霓虹 */
.cyberpunk-mode .MuiStepLabel-label.Mui-active {
  color: var(--cyber-color-cyan, #00ffff) !important;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
  font-weight: 600;
}

/* 向导步骤标签 — 完成态霓虹绿 */
.cyberpunk-mode .MuiStepLabel-label.Mui-completed {
  color: var(--cyber-color-green, #00ff88) !important;
}

/* 向导内容容器 — 玻璃拟态 */
.cyberpunk-mode .MuiStepContent-root {
  border-left: 2px solid rgba(0, 255, 255, 0.30);
}

/* 向导底部按钮区 */
.cyberpunk-mode .MuiStepContent-root .MuiBox-root:last-child {
  border-top: 1px solid rgba(0, 255, 255, 0.15);
  padding-top: 12px;
}

/* 向导进度条 — 霓虹渐变 */
.cyberpunk-mode .MuiLinearProgress-root {
  background-color: rgba(0, 255, 255, 0.10);
}
.cyberpunk-mode .MuiLinearProgress-bar {
  background: linear-gradient(90deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
}

/* ========== CardListTemplate 卡片列表模板 ========== */

/* 卡片列表统计区 — 玻璃拟态 */
.cyberpunk-mode .card-list-stat {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-custom, 0 4px 16px rgba(0, 0, 0, 0.40));
}

/* 卡片列表项 — 玻璃拟态 */
.cyberpunk-mode .card-list-item {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
  box-shadow: var(--shadow-custom, 0 4px 12px rgba(0, 0, 0, 0.40));
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* hover — 上浮 + 霓虹 */
.cyberpunk-mode .card-list-item:hover {
  border-color: rgba(0, 255, 255, 0.50) !important;
  transform: translateY(-2px);
  box-shadow: var(--shadow-custom, 0 12px 24px rgba(0, 0, 0, 0.50),
    0 0 16px rgba(0, 255, 255, 0.25));
}

/* 卡片列表筛选条 — 玻璃拟态 */
.cyberpunk-mode .card-list-filter {
  background-color: rgba(10, 10, 26, 0.60) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 255, 255, 0.15);
}

/* ========== MasterDetailPageTemplate 主从详情模板 ========== */

/* 主列表容器 — 玻璃拟态 */
.cyberpunk-mode .master-detail-master {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
}

/* 主列表选中项 — 霓虹高亮 */
.cyberpunk-mode .master-detail-master .MuiListItemButton-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-left: 3px solid var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, inset 4px 0 12px rgba(0, 255, 255, 0.20));
}

/* 详情面板 — 玻璃拟态 */
.cyberpunk-mode .master-detail-detail {
  background-color: rgba(10, 10, 26, 0.60) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 255, 255, 0.15);
}

/* ========== MarkdownEditorTemplate Markdown 编辑器模板 ========== */

/* 工具栏 — 深色玻璃 */
.cyberpunk-mode .markdown-editor-toolbar {
  background-color: rgba(10, 10, 26, 0.60) !important;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.20) !important;
}

/* 工具栏按钮 — 霓虹 hover */
.cyberpunk-mode .markdown-editor-toolbar .MuiIconButton-root:hover {
  color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.10);
}

/* 编辑器文本域 — 深色背景 */
.cyberpunk-mode .markdown-editor-textarea .MuiOutlinedInput-root {
  background-color: rgba(10, 10, 26, 0.80);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--color-border, #e2e8f0);
}

/* 编辑器焦点 — 霓虹边框 */
.cyberpunk-mode .markdown-editor-textarea .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* 预览区 — 深色玻璃 */
.cyberpunk-mode .markdown-editor-preview {
  background-color: rgba(10, 10, 26, 0.60);
  color: var(--color-border, #e2e8f0);
  padding: designTokens.spacing.md;
}

/* 预览区标题 — 霓虹青 */
.cyberpunk-mode .markdown-editor-preview h1,
.cyberpunk-mode .markdown-editor-preview h2,
.cyberpunk-mode .markdown-editor-preview h3 {
  color: var(--cyber-color-cyan, #00ffff);
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.30);
  border-bottom: 1px solid rgba(0, 255, 255, 0.20);
}

/* 预览区代码块 — 霓虹边框 */
.cyberpunk-mode .markdown-editor-preview pre {
  background-color: rgba(0, 0, 0, 0.40);
  border: 1px solid rgba(0, 255, 255, 0.20);
  border-radius: 4px;
  padding: designTokens.spacing.md;
  overflow-x: auto;
}

/* 预览区行内代码 — 霓虹背景 */
.cyberpunk-mode .markdown-editor-preview code {
  background-color: rgba(0, 255, 255, 0.10);
  color: var(--cyber-color-cyan, #00ffff);
  padding: designTokens.spacing.xs 6px;
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* 预览区引用 — 霓虹左边框 */
.cyberpunk-mode .markdown-editor-preview blockquote {
  border-left: 3px solid var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.05);
  padding: designTokens.spacing.sm 16px;
  margin: designTokens.spacing.md 0;
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* 预览区链接 — 霓虹青 */
.cyberpunk-mode .markdown-editor-preview a {
  color: var(--cyber-color-cyan, #00ffff);
  text-decoration: none;
  text-shadow: 0 0 4px rgba(0, 255, 255, 0.30);
  border-bottom: 1px dashed rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .markdown-editor-preview a:hover {
  border-bottom-style: solid;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.60);
}

/* ========== AI ChatHistory 对话历史 ========== */

/* 历史列表容器 — 玻璃拟态 */
.cyberpunk-mode .chat-history {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
}

/* 历史列表项 — hover 霓虹 */
.cyberpunk-mode .chat-history .MuiListItemButton-root:hover {
  background-color: rgba(0, 255, 255, 0.06);
  border-left: 2px solid rgba(0, 255, 255, 0.40);
}

/* 历史列表选中项 — 霓虹高亮 */
.cyberpunk-mode .chat-history .MuiListItemButton-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-left: 3px solid var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--shadow-custom, inset 4px 0 12px rgba(0, 255, 255, 0.20));
}

/* 历史搜索框 — 霓虹焦点 */
.cyberpunk-mode .chat-history .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* ========== AIToolsPanel 工具面板 ========== */

/* 工具面板容器 — 玻璃拟态 */
.cyberpunk-mode .ai-tools-panel {
  background-color: rgba(26, 26, 46, 0.70) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.20) !important;
}

/* 工具卡片 — 玻璃拟态 */
.cyberpunk-mode .ai-tools-panel .MuiPaper-root {
  background-color: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(0, 255, 255, 0.20);
  backdrop-filter: blur(8px);
}

/* 工具卡片 hover — 霓虹 */
.cyberpunk-mode .ai-tools-panel .MuiPaper-root:hover {
  border-color: rgba(0, 255, 255, 0.50);
  background-color: rgba(0, 255, 255, 0.06) !important;
  box-shadow: var(--shadow-custom, 0 0 16px rgba(0, 255, 255, 0.20));
}

/* 工具输入框 — 霓虹焦点 */
.cyberpunk-mode .ai-tools-panel .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--cyber-color-cyan, #00ffff);
  box-shadow: var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30));
}

/* ========== 全局 PageContainer 容器适配 ========== */

/* 页面容器背景 — 深空网格 */
.cyberpunk-mode .page-container,
.cyberpunk-mode [class*='PageContainer'] {
  background-color: transparent;
  position: relative;
}

/* 数据流装饰 — 持续脉动 */
@keyframes cyber-data-pulse {
  0%, 100% {
    opacity: 0.40;
    transform: scale(1);
  }
  50% {
    opacity: 0.80;
    transform: scale(1.05);
  }
}

/* HUD 装饰光斑 — 隐式背景层 */
.cyberpunk-mode .cyber-hud-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(circle at 15% 20%, rgba(0, 255, 255, 0.06) 0%, transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(255, 0, 255, 0.06) 0%, transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(0, 255, 136, 0.04) 0%, transparent 50%);
  animation: cyber-data-pulse 6s ease-in-out infinite;
}

/* ========== Select 下拉选择器 ========== */

.cyberpunk-mode .MuiSelect-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiSelect-root:hover {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiSelect-iconOutlined {
  color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiSelect-root:hover .MuiSelect-iconOutlined {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiSelect-root.Mui-focused .MuiSelect-iconOutlined {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* Select 下拉菜单 — 玻璃拟态 */
.cyberpunk-mode .MuiList-root.MuiMenu-list {
  background-color: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.25);
}
.cyberpunk-mode .MuiMenuItem-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiMenuItem-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiMenuItem-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  color: var(--cyber-color-cyan, #00ffff);
}

/* ========== Rating 评分组件 ========== */

.cyberpunk-mode .MuiRating-root {
  color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiRating-root:hover {
  color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiRating-icon {
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.30));
}
.cyberpunk-mode .MuiRating-iconFilled {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.60));
}
.cyberpunk-mode .MuiRating-iconHover {
  color: var(--cyber-color-magenta, #ff00ff);
  filter: drop-shadow(0 0 8px rgba(255, 0, 255, 0.60));
}
.cyberpunk-mode .MuiRating-iconEmpty {
  color: rgba(0, 255, 255, 0.20);
}

/* ========== Autocomplete 自动完成 ========== */

/* 下拉面板 — 玻璃拟态 */
.cyberpunk-mode .MuiAutocomplete-paper {
  background-color: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.25);
  box-shadow: var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10));
}
.cyberpunk-mode .MuiAutocomplete-option {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiAutocomplete-option:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiAutocomplete-option[data-focus='true'] {
  background-color: rgba(0, 255, 255, 0.12);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiAutocomplete-option[aria-selected='true'] {
  background-color: rgba(0, 255, 255, 0.15);
  color: var(--cyber-color-cyan, #00ffff);
  border-left: 2px solid var(--cyber-color-cyan, #00ffff);
}

/* Autocomplete 标签 — 霓虹风格 */
.cyberpunk-mode .MuiChip-filled.MuiChip-colorDefault {
  background-color: rgba(0, 255, 255, 0.10);
  border: 1px solid rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiChip-filled.MuiChip-colorDefault:hover {
  background-color: rgba(0, 255, 255, 0.15);
  border-color: rgba(0, 255, 255, 0.50);
}

/* ========== Input 输入框 ========== */

.cyberpunk-mode .MuiInput-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiInput-underline:before {
  border-bottom-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiInput-underline:hover:before {
  border-bottom-color: rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiInput-underline:after {
  border-bottom-color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiInput-underline.Mui-error:after {
  border-bottom-color: var(--cyber-color-danger, #ff4444);
}

/* ========== FormControlLabel 表单标签 ========== */

.cyberpunk-mode .MuiFormControlLabel-root .MuiTypography-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiFormControlLabel-root:hover .MuiTypography-root {
  color: var(--cyber-color-cyan, #00ffff);
}

/* ========== MenuItem 菜单项增强 ========== */

.cyberpunk-mode .MuiMenuItem-root.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.18);
}
.cyberpunk-mode .MuiMenuItem-divider {
  border-color: rgba(0, 255, 255, 0.10);
}

/* ========== DialogTitle 对话框标题增强 ========== */

.cyberpunk-mode .MuiDialogTitle-root + .MuiDialogContent-root {
  padding-top: 20px;
}

/* ========== DialogContent 对话框内容增强 ========== */

.cyberpunk-mode .MuiDialogContent-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiDialogContent-root .MuiTypography-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}

/* ========== DialogActions 对话框操作区增强 ========== */

.cyberpunk-mode .MuiDialogActions-root .MuiButton-text {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiDialogActions-root .MuiButton-text:hover {
  color: var(--cyber-color-cyan, #00ffff);
}

/* ========== TabScrollButton 标签滚动按钮 ========== */

.cyberpunk-mode .MuiTabScrollButton-root {
  color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiTabScrollButton-root:hover {
  color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.08);
}

/* ========== TablePagination 表格分页 ========== */

.cyberpunk-mode .MuiTablePagination-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiTablePagination-selectIcon {
  color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiTablePagination-actions .MuiIconButton-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiTablePagination-actions .MuiIconButton-root:hover {
  color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.08);
}

/* ========== LinearProgress 线性进度条增强 ========== */

.cyberpunk-mode .MuiLinearProgress-root {
  height: designTokens.spacing.xs;
}
.cyberpunk-mode .MuiLinearProgress-barColorPrimary {
  background: linear-gradient(90deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
}
.cyberpunk-mode .MuiLinearProgress-barColorSecondary {
  background: linear-gradient(90deg, var(--cyber-color-magenta, #ff00ff), var(--cyber-color-cyan, #00ffff));
}

/* ========== CircularProgress 圆形进度条增强 ========== */

.cyberpunk-mode .MuiCircularProgress-colorPrimary {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiCircularProgress-colorSecondary {
  color: var(--cyber-color-magenta, #ff00ff);
}

/* ========== ExpansionPanel 折叠面板 ========== */

.cyberpunk-mode .MuiAccordionSummary-content {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiAccordionDetails-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  background-color: rgba(0, 255, 255, 0.03);
}

/* ========== MenuList 菜单列表 ========== */

.cyberpunk-mode .MuiMenuList-root {
  padding: designTokens.spacing.xs 0;
}
.cyberpunk-mode .MuiMenuList-root .MuiMenuItem-root {
  padding: designTokens.spacing.sm 16px;
}

/* ========== Popover 弹出层增强 ========== */

.cyberpunk-mode .MuiPopover-paper {
  box-shadow: var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10));
}

/* ========== Tooltip 提示增强 ========== */

.cyberpunk-mode .MuiTooltip-arrow {
  color: rgba(26, 26, 46, 0.95);
}

/* ========== Chip 标签增强 ========== */

.cyberpunk-mode .MuiChip-outlined {
  border-color: rgba(0, 255, 255, 0.30);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiChip-outlined:hover {
  border-color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.08);
}
.cyberpunk-mode .MuiChip-deleteIcon {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiChip-deleteIcon:hover {
  color: var(--cyber-color-danger, #ff4444);
}

/* ========== Avatar 头像增强 ========== */

.cyberpunk-mode .MuiAvatar-colorDefault {
  background-color: rgba(0, 255, 255, 0.20);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiAvatar-group .MuiAvatar-root {
  border-color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
}

/* ========== Badge 徽章增强 ========== */

.cyberpunk-mode .MuiBadge-colorPrimary {
  background-color: var(--cyber-color-cyan, #00ffff);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
}
.cyberpunk-mode .MuiBadge-colorSecondary {
  background-color: var(--cyber-color-magenta, #ff00ff);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
}
.cyberpunk-mode .MuiBadge-colorSuccess {
  background-color: var(--cyber-color-green, #00ff88);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
}
.cyberpunk-mode .MuiBadge-colorError {
  background-color: var(--cyber-color-danger, #ff4444);
  color: var(--color-surface, var(--color-primary-foreground, #ffffff));
}
.cyberpunk-mode .MuiBadge-colorWarning {
  background-color: var(--cyber-color-gold, #ffd700);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
}

/* ========== Divider 分割线增强 ========== */

.cyberpunk-mode .MuiDivider-light {
  border-color: rgba(0, 255, 255, 0.10);
}

/* ========== IconButton 图标按钮增强 ========== */

.cyberpunk-mode .MuiIconButton-colorPrimary {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiIconButton-colorSecondary {
  color: var(--cyber-color-magenta, #ff00ff);
}

/* ========== Link 链接增强 ========== */

.cyberpunk-mode .MuiLink-underlineHover:hover {
  text-decoration: underline;
  text-decoration-color: var(--cyber-color-cyan, #00ffff);
}

/* ========== ButtonGroup 按钮组 ========== */

.cyberpunk-mode .MuiButtonGroup-root {
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiButtonGroup-root .MuiButton-root {
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiButtonGroup-root .MuiButton-root:hover {
  border-color: rgba(0, 255, 255, 0.40);
}

/* ========== TextField 文本框增强 ========== */

.cyberpunk-mode .MuiTextField-root .MuiInputLabel-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiTextField-root .MuiInputLabel-root.Mui-focused {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiTextField-root .MuiFormHelperText-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiTextField-root .MuiFormHelperText-root.Mui-error {
  color: var(--cyber-color-danger, #ff4444);
}

/* ========== FormControl 表单控件 ========== */

.cyberpunk-mode .MuiFormControl-root .MuiInputLabel-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiFormControl-root .MuiInputLabel-root.Mui-focused {
  color: var(--cyber-color-cyan, #00ffff);
}

/* ========== FormGroup 表单组 ========== */

.cyberpunk-mode .MuiFormGroup-root {
  gap: designTokens.spacing.sm;
}

/* ========== Checkbox 复选框增强 ========== */

.cyberpunk-mode .MuiCheckbox-colorPrimary {
  color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiCheckbox-colorPrimary.Mui-checked {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiCheckbox-colorSecondary {
  color: rgba(255, 0, 255, 0.30);
}
.cyberpunk-mode .MuiCheckbox-colorSecondary.Mui-checked {
  color: var(--cyber-color-magenta, #ff00ff);
}

/* ========== Switch 开关增强 ========== */

.cyberpunk-mode .MuiSwitch-colorPrimary .MuiSwitch-thumb {
  background-color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiSwitch-colorSecondary .MuiSwitch-thumb {
  background-color: var(--cyber-color-magenta, #ff00ff);
}

/* ========== Radio 单选按钮增强 ========== */

.cyberpunk-mode .MuiRadio-colorPrimary {
  color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiRadio-colorPrimary.Mui-checked {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiRadio-colorSecondary {
  color: rgba(255, 0, 255, 0.30);
}
.cyberpunk-mode .MuiRadio-colorSecondary.Mui-checked {
  color: var(--cyber-color-magenta, #ff00ff);
}

/* ========== Slider 滑块增强 ========== */

.cyberpunk-mode .MuiSlider-colorPrimary {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiSlider-colorSecondary {
  color: var(--cyber-color-magenta, #ff00ff);
}
.cyberpunk-mode .MuiSlider-markLabel {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* ========== List 列表组件 ========== */

.cyberpunk-mode .MuiList-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiListItem-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiListItem-root:hover {
  background-color: rgba(0, 255, 255, 0.06);
}
.cyberpunk-mode .MuiListItemText-primary {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiListItemText-secondary {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* ========== ListItemIcon 列表项图标 ========== */

.cyberpunk-mode .MuiListItemIcon-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiListItemButton-root:hover .MuiListItemIcon-root {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root {
  color: var(--cyber-color-cyan, #00ffff);
}

/* ========== ListItemAvatar 列表项头像 ========== */

.cyberpunk-mode .MuiListItemAvatar-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}

/* ========== ListSubheader 列表副标题 ========== */

.cyberpunk-mode .MuiListSubheader-root {
  background-color: transparent;
  color: rgba(0, 255, 255, 0.60);
  font-weight: 600;
}

/* ========== Paper 纸张组件增强 ========== */

.cyberpunk-mode .MuiPaper-elevation1 {
  box-shadow: var(--shadow-custom, 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08));
}
.cyberpunk-mode .MuiPaper-elevation2 {
  box-shadow: var(--shadow-custom, 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08));
}
.cyberpunk-mode .MuiPaper-elevation4 {
  box-shadow: var(--shadow-custom, 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08));
}

/* ========== Card 卡片增强 ========== */

.cyberpunk-mode .MuiCardHeader-root {
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}
.cyberpunk-mode .MuiCardHeader-title {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .MuiCardHeader-subheader {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiCardContent-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .MuiCardActions-root {
  border-top: 1px solid rgba(0, 255, 255, 0.15);
}

/* ========== Alert 警告增强 ========== */

.cyberpunk-mode .MuiAlert-icon {
  color: currentColor;
}
.cyberpunk-mode .MuiAlert-action .MuiButton-root {
  color: currentColor;
}

/* ========== Backdrop 背景遮罩增强 ========== */

.cyberpunk-mode .MuiBackdrop-invisible {
  background-color: rgba(10, 10, 26, 0.60);
}

/* ========== Fade 淡入淡出动画 ========== */

.cyberpunk-mode .MuiFade-root {
  transition: opacity 200ms ease;
}

/* ========== Grow 缩放动画 ========== */

.cyberpunk-mode .MuiGrow-root {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ========== Slide 滑动动画 ========== */

.cyberpunk-mode .MuiSlide-root {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ========== Zoom 缩放动画 ========== */

.cyberpunk-mode .MuiZoom-root {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ========== Collapse 折叠动画 ========== */

.cyberpunk-mode .MuiCollapse-root {
  transition: height 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ========== TransitionGroup 过渡组 ========== */

.cyberpunk-mode .MuiTransitionGroup-root {
  transition: all 200ms ease;
}

/* ========== Cascader 级联选择器 ========== */

.cyberpunk-mode .MuiPopover-paper.cascader-popover {
  background-color: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.25);
  box-shadow: var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10));
}
.cyberpunk-mode .cascader-list .MuiListItem-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  transition: all 150ms ease;
}
.cyberpunk-mode .cascader-list .MuiListItem-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .cascader-list .MuiListItem-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  color: var(--cyber-color-cyan, #00ffff);
  border-left: 2px solid var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .cascader-path .MuiListItem-root {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .cascader-path .MuiListItem-root:hover {
  background-color: rgba(0, 255, 255, 0.06);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .cascader-divider {
  border-color: rgba(0, 255, 255, 0.10);
}

/* ========== DateRangePicker 日期范围选择器 ========== */

.cyberpunk-mode .date-range-picker .MuiTextField-root {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .date-range-picker .MuiTextField-root .MuiInputAdornment-root svg {
  color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .date-range-picker .MuiPopover-paper {
  background-color: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.25);
  box-shadow: var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10));
}
.cyberpunk-mode .date-range-picker .MuiTypography-subtitle1 {
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .date-range-picker .MuiTypography-h6 {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .date-range-picker .MuiButton-outlined {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
  border-color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .date-range-picker .MuiButton-outlined:hover {
  color: var(--cyber-color-cyan, #00ffff);
  border-color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.08);
}
.cyberpunk-mode .date-range-picker .MuiButton-contained {
  background: linear-gradient(135deg, var(--cyber-color-cyan, #00ffff) 0%, var(--cyber-color-magenta, #ff00ff) 100%);
  color: var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a));
}
.cyberpunk-mode .date-range-picker .date-cell {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .date-range-picker .date-cell:hover {
  background-color: rgba(0, 255, 255, 0.10);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .date-range-picker .date-cell.date-selected {
  background-color: rgba(0, 255, 255, 0.20);
  color: var(--cyber-color-cyan, #00ffff);
}
.cyberpunk-mode .date-range-picker .date-cell.date-in-range {
  background-color: rgba(0, 255, 255, 0.06);
}
.cyberpunk-mode .date-range-picker .date-cell.date-today {
  border-color: var(--cyber-color-magenta, #ff00ff);
  color: var(--cyber-color-magenta, #ff00ff);
}

/* ========== FileUpload 文件上传组件 ========== */

.cyberpunk-mode .file-upload .MuiPaper-root {
  background-color: rgba(26, 26, 46, 0.60);
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .file-upload .MuiPaper-root:hover {
  border-color: rgba(0, 255, 255, 0.50);
  background-color: rgba(0, 255, 255, 0.06);
}
.cyberpunk-mode .file-upload .MuiPaper-root[class*='dragging'] {
  border-color: var(--cyber-color-cyan, #00ffff);
  background-color: rgba(0, 255, 255, 0.10);
  box-shadow: var(--shadow-custom, 0 0 24px rgba(0, 255, 255, 0.30));
}
.cyberpunk-mode .file-upload .MuiTypography-body1 {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .file-upload .MuiTypography-caption {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .file-upload .upload-icon svg {
  color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .file-upload[class*='dragging'] .upload-icon svg {
  color: var(--cyber-color-cyan, #00ffff);
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.60));
}
.cyberpunk-mode .file-upload .file-item {
  background-color: rgba(10, 10, 26, 0.80);
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .file-upload .file-item.file-error {
  border-color: rgba(255, 68, 68, 0.50);
}
.cyberpunk-mode .file-upload .file-icon svg {
  color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .file-upload .file-item.file-error .file-icon svg {
  color: var(--cyber-color-danger, #ff4444);
}
.cyberpunk-mode .file-upload .file-name {
  color: var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff));
}
.cyberpunk-mode .file-upload .file-size {
  color: var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0));
}
.cyberpunk-mode .file-upload .MuiChip-colorSuccess {
  background-color: rgba(0, 255, 136, 0.15);
  color: var(--cyber-color-green, #00ff88);
  border: 1px solid rgba(0, 255, 136, 0.40);
}
.cyberpunk-mode .file-upload .MuiChip-colorError {
  background-color: rgba(255, 68, 68, 0.15);
  color: var(--cyber-color-danger, #ff4444);
  border: 1px solid rgba(255, 68, 68, 0.40);
}
.cyberpunk-mode .file-upload .MuiChip-colorPrimary {
  background-color: rgba(0, 255, 255, 0.15);
  color: var(--cyber-color-cyan, #00ffff);
  border: 1px solid rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .file-upload .MuiLinearProgress-root {
  background-color: rgba(0, 255, 255, 0.10);
}
.cyberpunk-mode .file-upload .MuiLinearProgress-bar {
  background: linear-gradient(90deg, var(--cyber-color-cyan, #00ffff), var(--cyber-color-magenta, #ff00ff));
  box-shadow: var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50));
}
`;

/**
 * 将玻璃拟态样式注入到 document
 * 在 ThemeProvider 中调用一次即可
 */
let stylesInjected = false;

export function injectCyberpunkStyles(): void {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;

  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-cyberpunk-styles', 'true');
  styleElement.textContent = cyberpunkGlassStyles;
  document.head.appendChild(styleElement);

  stylesInjected = true;
}

/**
 * 将 MUI 组件级赛博朋克样式注入到 document
 * 在 theme.ts 的 MuiCssBaseline 中调用
 */
let componentStylesInjected = false;

export function injectCyberpunkComponentStyles(): void {
  if (componentStylesInjected) return;
  if (typeof document === 'undefined') return;

  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-cyberpunk-component-styles', 'true');
  styleElement.textContent = cyberpunkComponentStyles;
  document.head.appendChild(styleElement);

  componentStylesInjected = true;
}
