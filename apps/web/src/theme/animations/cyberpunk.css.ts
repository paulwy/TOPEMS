/**
 * 赛博朋克主题 — 玻璃拟态工具类
 *
 * 提供半透明卡片、模糊背景、发光边框等科技感视觉效果
 * 使用方式：在 sx prop 中引用 className，或直接使用 CSS 变量
 */

export const cyberpunkGlassClasses = {
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

export const cyberpunkGlassStyles = `
/* ========================================
   赛博朋克主题 — 玻璃拟态工具类
   ======================================== */

/* 基础玻璃卡片 */
.cyber-glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 255, 0.20);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: all 200ms ease-out;
}

.cyber-glass-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(0, 255, 255, 0.50);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

/* 高层玻璃面板（弹窗、下拉菜单） */
.cyber-glass-elevated {
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.30);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

/* 渐变边框卡片（VIP/重要数据） */
.cyber-glass-gradient-border {
  position: relative;
  border-radius: 12px;
  padding: 1px;
  background: linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%);
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
  box-shadow: 0 1px 0 rgba(0, 255, 255, 0.10);
}

/* ========================================
   赛博朋克主题 — 霓虹发光效果
   ======================================== */

/* 文字发光 */
.cyber-text-glow-primary {
  color: #00FFFF;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.50);
}

.cyber-text-glow-secondary {
  color: #FF00FF;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.50);
}

.cyber-text-glow-accent {
  color: #FFD700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.50);
}

/* 渐变文字 */
.cyber-text-gradient {
  background: linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.cyber-text-gradient-gold {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* 盒子发光 */
.cyber-box-glow-primary {
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.40), 0 0 40px rgba(0, 255, 255, 0.20);
}

.cyber-box-glow-secondary {
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.40), 0 0 40px rgba(255, 0, 255, 0.20);
}

.cyber-box-glow-hover {
  transition: box-shadow 200ms ease-out;
}

.cyber-box-glow-hover:hover {
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.60), 0 0 50px rgba(0, 255, 255, 0.20);
}

/* ========================================
   赛博朋克主题 — 动效
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
   注意：MuiSkeleton 中使用的动画名为 cyber-skeleton，
   这里同时定义两个名称以兼容自定义 class 和 MUI 内置 skeleton */
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
    box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
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
   响应 prefers-reduced-motion
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
export const cyberpunkComponentStyles = `
/* ========================================
   赛博朋克主题 — MUI 组件级样式覆盖
   仅在 .cyberpunk-mode 下生效
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10);
}
.cyberpunk-mode .MuiMenuItem-root {
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiMenuItem-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
}
.cyberpunk-mode .MuiMenuItem-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  color: #00FFFF;
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
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15);
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
  color: #E6F1FF;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 255, 255, 0.10);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Chip */
.cyberpunk-mode .MuiChip-root {
  background-color: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.30);
  color: #00FFFF;
}
.cyberpunk-mode .MuiChip-root:hover {
  background-color: rgba(0, 255, 255, 0.15);
  border-color: rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiChip-colorPrimary {
  background-color: rgba(0, 255, 255, 0.15);
  border-color: #00FFFF;
  color: #00FFFF;
}
.cyberpunk-mode .MuiChip-colorSuccess {
  background-color: rgba(0, 255, 136, 0.12);
  border-color: rgba(0, 255, 136, 0.50);
  color: #00FF88;
}
.cyberpunk-mode .MuiChip-colorWarning {
  background-color: rgba(255, 170, 0, 0.12);
  border-color: rgba(255, 170, 0, 0.50);
  color: #FFAA00;
}
.cyberpunk-mode .MuiChip-colorError {
  background-color: rgba(255, 68, 68, 0.12);
  border-color: rgba(255, 68, 68, 0.50);
  color: #FF4444;
}

/* Tabs */
.cyberpunk-mode .MuiTabs-indicator {
  background: linear-gradient(90deg, #00FFFF, #FF00FF);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiTab-root {
  color: #8892B0;
  text-transform: none;
}
.cyberpunk-mode .MuiTab-root:hover {
  color: #E6F1FF;
}
.cyberpunk-mode .MuiTab-root.Mui-selected {
  color: #00FFFF;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.40);
}

/* Pagination */
.cyberpunk-mode .MuiPaginationItem-root {
  color: #8892B0;
  border-color: rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .MuiPaginationItem-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: #00FFFF;
  border-color: rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiPaginationItem-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.15);
  color: #00FFFF;
  border-color: #00FFFF;
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.30);
}

/* Avatar */
.cyberpunk-mode .MuiAvatar-root {
  border: 2px solid rgba(0, 255, 255, 0.40);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.20);
}

/* Badge */
.cyberpunk-mode .MuiBadge-badge {
  box-shadow: 0 0 8px currentColor;
}

/* Divider */
.cyberpunk-mode .MuiDivider-root {
  border-color: rgba(0, 255, 255, 0.15);
}

/* IconButton */
.cyberpunk-mode .MuiIconButton-root {
  color: #8892B0;
}
.cyberpunk-mode .MuiIconButton-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: #00FFFF;
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
  color: #E6F1FF;
}
.cyberpunk-mode .MuiTypography-body1,
.cyberpunk-mode .MuiTypography-body2 {
  color: #8892B0;
}

/* Alert */
.cyberpunk-mode .MuiAlert-root {
  background-color: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: #E6F1FF;
}
.cyberpunk-mode .MuiAlert-standardSuccess {
  background-color: rgba(0, 255, 136, 0.08);
  border-color: rgba(0, 255, 136, 0.30);
  color: #00FF88;
}
.cyberpunk-mode .MuiAlert-standardWarning {
  background-color: rgba(255, 170, 0, 0.08);
  border-color: rgba(255, 170, 0, 0.30);
  color: #FFAA00;
}
.cyberpunk-mode .MuiAlert-standardError {
  background-color: rgba(255, 68, 68, 0.08);
  border-color: rgba(255, 68, 68, 0.30);
  color: #FF4444;
}
.cyberpunk-mode .MuiAlert-standardInfo {
  background-color: rgba(0, 170, 255, 0.08);
  border-color: rgba(0, 170, 255, 0.30);
  color: #00AAFF;
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
  background-color: #00FFFF;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.50);
}

/* Checkbox */
.cyberpunk-mode .MuiCheckbox-root {
  color: rgba(255, 255, 255, 0.30);
}
.cyberpunk-mode .MuiCheckbox-root.Mui-checked {
  color: #00FFFF;
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* Radio */
.cyberpunk-mode .MuiRadio-root {
  color: rgba(255, 255, 255, 0.30);
}
.cyberpunk-mode .MuiRadio-root.Mui-checked {
  color: #00FFFF;
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* Slider */
.cyberpunk-mode .MuiSlider-rail {
  background-color: rgba(255, 255, 255, 0.10);
}
.cyberpunk-mode .MuiSlider-track {
  background: linear-gradient(90deg, #00FFFF, #FF00FF);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiSlider-thumb {
  background-color: #00FFFF;
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.60);
}
.cyberpunk-mode .MuiSlider-thumb:hover,
.cyberpunk-mode .MuiSlider-thumb.Mui-active {
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.80);
}

/* LinearProgress */
.cyberpunk-mode .MuiLinearProgress-root {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.cyberpunk-mode .MuiLinearProgress-bar {
  background: linear-gradient(90deg, #00FFFF, #FF00FF);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.40);
  border-radius: 4px;
}

/* CircularProgress */
.cyberpunk-mode .MuiCircularProgress-circle {
  stroke: #00FFFF;
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #E6F1FF;
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
  color: #E6F1FF;
}
.cyberpunk-mode .MuiAccordionSummary-root.Mui-expanded {
  color: #00FFFF;
  min-height: auto;
}

/* Link */
.cyberpunk-mode .MuiLink-root {
  color: #00FFFF;
  text-decoration: none;
}
.cyberpunk-mode .MuiLink-root:hover {
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.50);
}

/* Button */
.cyberpunk-mode .MuiButton-contained {
  background: linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%);
  color: #0A0A1A;
  font-weight: 600;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiButton-contained:hover {
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.60), 0 0 50px rgba(255, 0, 255, 0.30);
  transform: translateY(-1px);
}
.cyberpunk-mode .MuiButton-outlined {
  border-color: rgba(0, 255, 255, 0.50);
  color: #00FFFF;
}
.cyberpunk-mode .MuiButton-outlined:hover {
  border-color: #00FFFF;
  background-color: rgba(0, 255, 255, 0.08);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiButton-text {
  color: #00FFFF;
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
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: all 200ms ease-out;
}
.cyberpunk-mode .MuiCard-root:hover {
  background-color: rgba(255, 255, 255, 0.07);
  border-color: rgba(0, 255, 255, 0.50);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12);
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
  border-color: #00FFFF;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiOutlinedInput-input {
  color: #E6F1FF;
}

/* Table */
.cyberpunk-mode .MuiTableCell-root {
  border-bottom: 1px solid rgba(0, 255, 255, 0.10);
  color: #E6F1FF;
}
.cyberpunk-mode .MuiTableCell-head {
  background-color: rgba(0, 255, 255, 0.05);
  border-bottom: 2px solid rgba(0, 255, 255, 0.30);
  color: #00FFFF;
}

/* AppBar */
.cyberpunk-mode .MuiAppBar-root {
  background-color: rgba(10, 10, 26, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.20);
  box-shadow: 0 1px 0 rgba(0, 255, 255, 0.10);
}

/* ListItemButton (侧边栏) */
.cyberpunk-mode .MuiListItemButton-root.Mui-selected {
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.20) 0%, transparent 100%);
  border-left: 3px solid #00FFFF;
  color: #00FFFF;
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
  background-color: #0A0A1A;
  background-image:
    linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  background-attachment: fixed;
  color: #E6F1FF;
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
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.30);
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
  color: #FFFFFF;
}
.cyberpunk-mode ::-moz-selection {
  background: rgba(0, 255, 255, 0.30);
  color: #FFFFFF;
}

/* ========== 布局组件：AppHeader / AppSidebar ========== */

/* AppHeader Logo 图标 — 霓虹发光 */
.cyberpunk-mode .app-header-logo {
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.50), 0 0 24px rgba(255, 0, 255, 0.30);
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
  box-shadow: inset -1px 0 0 rgba(0, 255, 255, 0.05);
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
  color: #8892B0;
  transition: color 200ms ease;
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root:hover .MuiListItemIcon-root {
  color: #00FFFF;
}
.cyberpunk-mode [role='navigation'] .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root {
  color: #00FFFF;
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
  background-color: #0A0A1A !important;
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
  box-shadow: 0 0 80px rgba(0, 255, 255, 0.20);
}
.cyberpunk-mode .login-page .MuiBox-root:nth-child(3) {
  background: rgba(255, 0, 255, 0.10) !important;
  box-shadow: 0 0 80px rgba(255, 0, 255, 0.20);
}

/* 登录卡片 — 玻璃拟态 */
.cyberpunk-mode .login-page .MuiCard-root {
  background-color: rgba(26, 26, 46, 0.85) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 255, 255, 0.30) !important;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15) !important;
}

/* 登录页右侧装饰面板 — 霓虹渐变 */
.cyberpunk-mode .login-page .MuiBox-root:nth-child(4) > .MuiBox-root:first-child {
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.20) 0%, rgba(255, 0, 255, 0.20) 100%) !important;
  border: 1px solid rgba(0, 255, 255, 0.30);
}

/* 登录页标题文字 — 霓虹发光 */
.cyberpunk-mode .login-page h6,
.cyberpunk-mode .login-page .MuiTypography-h6 {
  color: #00FFFF !important;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.50);
}

/* ========== 错误页赛博朋克适配 ========== */

/* 错误页背景 — 深空 + 故障感红色光晕 */
.cyberpunk-mode .error-page {
  background-color: #0A0A1A !important;
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
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 68, 68, 0.15);
  border-radius: 16px;
}

/* 错误图标容器 — 红色霓虹发光 */
.cyberpunk-mode .error-page .MuiBox-root:nth-child(1) {
  background-color: rgba(255, 68, 68, 0.15) !important;
  box-shadow: 0 0 20px rgba(255, 68, 68, 0.40);
  border: 1px solid rgba(255, 68, 68, 0.30);
}

/* 错误图标 — 故障闪烁动画 */
.cyberpunk-mode .error-page svg {
  color: #FF4444 !important;
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
  color: #FF4444 !important;
  text-shadow: 0 0 8px rgba(255, 68, 68, 0.50);
}

/* 错误页正文 */
.cyberpunk-mode .error-page .MuiTypography-body1 {
  color: #8892B0 !important;
}

/* ========== Loading 加载组件赛博朋克适配 ========== */

/* Loading 文字 — 霓虹青 */
.cyberpunk-mode .cyber-loading .MuiTypography-root {
  color: #00FFFF;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* Loading Spinner — 霓虹青旋转环 */
.cyberpunk-mode .cyber-loading > div:first-child {
  border-color: rgba(0, 255, 255, 0.20) !important;
  border-top-color: #00FFFF !important;
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.30);
}

/* Loading Dots — 霓虹色 */
.cyberpunk-mode .cyber-loading > div:first-child > div {
  background-color: #00FFFF !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.50);
}

/* Loading Pulse — 霓虹脉冲 */
.cyberpunk-mode .cyber-loading > div:first-child {
  background-color: #00FFFF !important;
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.50);
}

/* ========== EmptyState 空状态适配 ========== */

/* 空状态容器 */
.cyberpunk-mode [role='status'][aria-live='polite'] {
  color: #E6F1FF;
}

/* 空状态图标容器 — 霓虹圆形背景 */
.cyberpunk-mode [role='status'][aria-live='polite'] > .MuiBox-root:first-child {
  background-color: rgba(0, 255, 255, 0.08) !important;
  border: 1px solid rgba(0, 255, 255, 0.20);
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.15);
}

/* 空状态图标 — 霓虹发光 */
.cyberpunk-mode [role='status'][aria-live='polite'] svg {
  color: #00FFFF !important;
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.50));
}

/* 空状态标题 */
.cyberpunk-mode [role='status'][aria-live='polite'] .MuiTypography-h6,
.cyberpunk-mode [role='status'][aria-live='polite'] .MuiTypography-subtitle1 {
  color: #E6F1FF !important;
}

/* 空状态描述 */
.cyberpunk-mode [role='status'][aria-live='polite'] .MuiTypography-body2 {
  color: #8892B0 !important;
}

/* ========== 焦点环无障碍 ========== */

/* 赛博朋克模式焦点环 — 霓虹青双环 */
.cyberpunk-mode *:focus-visible {
  outline: 2px solid #00FFFF;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(0, 255, 255, 0.20);
}

/* 按钮/链接焦点 */
.cyberpunk-mode .MuiButton-root:focus-visible,
.cyberpunk-mode .MuiIconButton-root:focus-visible,
.cyberpunk-mode .MuiListItemButton-root:focus-visible,
.cyberpunk-mode .MuiChip-root:focus-visible {
  outline: 2px solid #00FFFF;
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
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(0, 255, 255, 0.10);
}

/* 搜索结果项 hover — 霓虹扫光 */
.cyberpunk-mode .global-search-bar .MuiListItemButton-root {
  transition: all 150ms ease;
  border-left: 2px solid transparent;
}
.cyberpunk-mode .global-search-bar .MuiListItemButton-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  border-left-color: #00FFFF;
}

/* 搜索结果选中项 */
.cyberpunk-mode .global-search-bar .MuiListItemButton-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-left-color: #00FFFF;
  box-shadow: inset 0 0 12px rgba(0, 255, 255, 0.10);
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
  color: #8892B0;
}
.cyberpunk-mode .MuiBreadcrumbs-li a {
  color: #8892B0;
  transition: color 150ms ease;
}
.cyberpunk-mode .MuiBreadcrumbs-li a:hover {
  color: #00FFFF;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiBreadcrumbs-li .MuiTypography-root {
  color: #00FFFF;
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
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4), 0 -1px 0 rgba(0, 255, 255, 0.10);
}

/* 底部导航项 */
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root {
  color: #8892B0;
  transition: color 200ms ease;
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root:hover {
  color: #E6F1FF;
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root.Mui-selected {
  color: #00FFFF;
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root.Mui-selected .MuiBottomNavigationAction-label {
  color: #00FFFF;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .bottom-tab-bar .MuiBottomNavigationAction-root.Mui-selected svg {
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.60));
}

/* 底部导航 Badge — 霓虹发光 */
.cyberpunk-mode .bottom-tab-bar .MuiBadge-badge {
  background: linear-gradient(135deg, #FF00FF, #00FFFF);
  border: 1px solid rgba(255, 255, 255, 0.30);
  box-shadow: 0 0 8px rgba(255, 0, 255, 0.50);
}

/* ========== NotificationPanel 通知中心 ========== */

/* 通知面板容器 — 玻璃拟态 */
.cyberpunk-mode .notification-panel {
  background-color: rgba(26, 26, 46, 0.95) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 255, 255, 0.30) !important;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15) !important;
  border-radius: 12px !important;
}

/* 通知面板标题 */
.cyberpunk-mode .notification-panel h3 {
  color: #00FFFF !important;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 通知面板分割线 */
.cyberpunk-mode .notification-panel > div:first-child {
  border-bottom-color: rgba(0, 255, 255, 0.20) !important;
}

/* 通知面板按钮 */
.cyberpunk-mode .notification-panel button {
  color: #8892B0;
  transition: color 150ms ease;
}
.cyberpunk-mode .notification-panel button:hover {
  color: #00FFFF;
}

/* 通知项文字 */
.cyberpunk-mode .notification-panel * {
  color: #E6F1FF;
}
.cyberpunk-mode .notification-panel .text-secondary,
.cyberpunk-mode .notification-panel [class*='secondary'] {
  color: #8892B0 !important;
}

/* 通知未读标识 — 霓虹脉冲 */
.cyberpunk-mode .notification-panel [class*='unread'],
.cyberpunk-mode .notification-panel .bg-blue-500,
.cyberpunk-mode .notification-panel .bg-primary {
  background-color: #00FFFF !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.60);
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
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.08);
}

/* 设置页区域标题图标 — 霓虹发光 */
.cyberpunk-mode .settings-page-section svg {
  color: #00FFFF;
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.40));
}

/* 设置页保存按钮 — 霓虹脉冲 */
.cyberpunk-mode .settings-page-save-btn {
  background: linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%);
  color: #0A0A1A;
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .settings-page-save-btn:hover {
  box-shadow: 0 0 24px rgba(0, 255, 255, 0.60), 0 0 40px rgba(255, 0, 255, 0.30);
  transform: translateY(-1px);
}

/* 设置页重置按钮 — 霓虹边框 */
.cyberpunk-mode .settings-page-reset-btn {
  border-color: rgba(255, 170, 0, 0.50);
  color: #FFAA00;
}
.cyberpunk-mode .settings-page-reset-btn:hover {
  border-color: #FFAA00;
  background-color: rgba(255, 170, 0, 0.08);
  box-shadow: 0 0 12px rgba(255, 170, 0, 0.30);
}

/* 设置页表单标签 */
.cyberpunk-mode .MuiFormLabel-root {
  color: #E6F1FF;
}
.cyberpunk-mode .MuiFormHelperText-root {
  color: #8892B0;
}

/* 设置页成功/错误提示 */
.cyberpunk-mode .settings-success-alert {
  background-color: rgba(0, 255, 136, 0.08) !important;
  border: 1px solid rgba(0, 255, 136, 0.30);
  color: #00FF88;
}
.cyberpunk-mode .settings-error-alert {
  background-color: rgba(255, 68, 68, 0.08) !important;
  border: 1px solid rgba(255, 68, 68, 0.30);
  color: #FF4444;
}

/* ========== ModeToggle 主题切换按钮 ========== */

/* 主题切换按钮 — 霓虹边框 */
.cyberpunk-mode .theme-toggle-btn {
  border-color: rgba(0, 255, 255, 0.40);
  color: #00FFFF;
}
.cyberpunk-mode .theme-toggle-btn:hover {
  border-color: #00FFFF;
  background-color: rgba(0, 255, 255, 0.08);
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.30);
}

/* ========== ToggleButton 分段控件 ========== */

.cyberpunk-mode .MuiToggleButton-root {
  border-color: rgba(0, 255, 255, 0.20);
  color: #8892B0;
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiToggleButton-root:hover {
  border-color: rgba(0, 255, 255, 0.40);
  background-color: rgba(0, 255, 255, 0.06);
  color: #E6F1FF;
}
.cyberpunk-mode .MuiToggleButton-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.12);
  border-color: #00FFFF;
  color: #00FFFF;
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.20);
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
  color: #00FFFF !important;
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .MuiTableSortLabel-root {
  color: #00FFFF;
}
.cyberpunk-mode .MuiTableSortLabel-root:hover {
  color: #00FFFF;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 表格行 hover — 霓虹扫光 */
.cyberpunk-mode .MuiTableRow-root:hover {
  background-color: rgba(0, 255, 255, 0.04) !important;
}
.cyberpunk-mode .MuiTableRow-root:hover .MuiTableCell-body {
  color: #E6F1FF;
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
  color: #8892B0;
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
  border-color: #00FFFF;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 步骤图标 — 霓虹发光 */
.cyberpunk-mode .MuiStepLabel-iconContainer .MuiSvgIcon-root {
  color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .Mui-active .MuiStepLabel-iconContainer .MuiSvgIcon-root,
.cyberpunk-mode .Mui-completed .MuiStepLabel-iconContainer .MuiSvgIcon-root {
  color: #00FFFF;
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.60));
}
.cyberpunk-mode .MuiStepLabel-label {
  color: #8892B0;
}
.cyberpunk-mode .MuiStepLabel-label.Mui-active {
  color: #00FFFF;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
  font-weight: 600;
}
.cyberpunk-mode .MuiStepLabel-label.Mui-completed {
  color: #00FF88;
}

/* 步骤替代图标（圆形数字） */
.cyberpunk-mode .MuiStepIcon-text {
  fill: #0A0A1A;
  font-weight: 700;
}
.cyberpunk-mode .MuiStepIcon-root.Mui-active {
  color: #00FFFF;
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.50));
}
.cyberpunk-mode .MuiStepIcon-root.Mui-completed {
  color: #00FF88;
  filter: drop-shadow(0 0 6px rgba(0, 255, 136, 0.40));
}

/* ========== Timeline 时间线 ========== */

/* 时间线节点 — 霓虹发光 */
.cyberpunk-mode .MuiTimelineItem-root::before {
  background-color: transparent;
}
.cyberpunk-mode .MuiTimelineDot-root {
  background-color: #00FFFF;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.60);
  border: 2px solid rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-outlined {
  background-color: transparent;
  border-color: #00FFFF;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-filledSuccess {
  background-color: #00FF88;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.60);
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-filledError {
  background-color: #FF4444;
  box-shadow: 0 0 8px rgba(255, 68, 68, 0.60);
}
.cyberpunk-mode .MuiTimelineDot-root.MuiTimelineDot-filledWarning {
  background-color: #FFD700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.60);
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
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, rgba(0, 255, 255, 0.50), rgba(0, 255, 255, 0.10));
}

/* 时间线内容 */
.cyberpunk-mode .MuiTimelineContent-root {
  color: #E6F1FF;
}
.cyberpunk-mode .MuiTimelineOppositeContent-root {
  color: #8892B0;
}

/* 时间线分隔符 */
.cyberpunk-mode .MuiTimelineSeparator-root {
  position: relative;
}

/* ========== TreeView 树形组件 ========== */

/* 树节点 — hover 霓虹 */
.cyberpunk-mode .MuiTreeItem-root {
  color: #8892B0;
  transition: color 150ms ease;
}
.cyberpunk-mode .MuiTreeItem-root:hover {
  color: #E6F1FF;
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
  border-left: 2px solid #00FFFF;
}
.cyberpunk-mode .MuiTreeItem-content.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.18);
}
.cyberpunk-mode .MuiTreeItem-content.Mui-selected .MuiTreeItem-label {
  color: #00FFFF;
}

/* 树展开/折叠图标 */
.cyberpunk-mode .MuiTreeItem-iconContainer svg {
  color: #00FFFF;
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
  color: #00FFFF;
}
.cyberpunk-mode .MuiPickersCalendarHeader-label {
  color: #E6F1FF;
  font-weight: 600;
}
.cyberpunk-mode .MuiPickersCalendarHeader-labelContainer svg {
  color: #00FFFF;
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
  color: #8892B0;
  border-color: transparent;
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiPickersDay-root:hover {
  background-color: rgba(0, 255, 255, 0.10);
  color: #00FFFF;
  border-color: rgba(0, 255, 255, 0.30);
}
.cyberpunk-mode .MuiPickersDay-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.20) !important;
  color: #00FFFF;
  border: 1px solid #00FFFF;
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.40);
  font-weight: 600;
}
.cyberpunk-mode .MuiPickersDay-root.Mui-selected:hover {
  background-color: rgba(0, 255, 255, 0.30) !important;
}
.cyberpunk-mode .MuiPickersDay-today {
  border-color: #FF00FF;
  color: #FF00FF;
}

/* 日期选择器月份/年份选择 */
.cyberpunk-mode .MuiMonthPicker-root,
.cyberpunk-mode .MuiYearPicker-root {
  background-color: transparent;
}
.cyberpunk-mode .MuiPickersMonth-root,
.cyberpunk-mode .MuiPickersYear-root {
  color: #8892B0;
  transition: all 150ms ease;
}
.cyberpunk-mode .MuiPickersMonth-root:hover,
.cyberpunk-mode .MuiPickersYear-root:hover {
  background-color: rgba(0, 255, 255, 0.08);
  color: #00FFFF;
}
.cyberpunk-mode .MuiPickersMonth-root.Mui-selected,
.cyberpunk-mode .MuiPickersYear-root.Mui-selected {
  background-color: rgba(0, 255, 255, 0.15);
  color: #00FFFF;
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
  color: #8892B0;
  transition: color 150ms ease;
}
.cyberpunk-mode .MuiClockNumber-root.Mui-selected {
  color: #00FFFF;
  background-color: rgba(0, 255, 255, 0.15);
}
.cyberpunk-mode .MuiClockPointer-root {
  background-color: #00FFFF;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.50);
}
.cyberpunk-mode .MuiClockPointer-thumb {
  background-color: #00FFFF;
  border-color: #00FFFF;
}

/* 日期选择器工具栏 */
.cyberpunk-mode .MuiDateTimePickerToolbar-root,
.cyberpunk-mode .MuiDatePickerToolbar-root,
.cyberpunk-mode .MuiTimePickerToolbar-root {
  background-color: rgba(0, 255, 255, 0.05);
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}
.cyberpunk-mode .MuiPickersToolbar-text {
  color: #E6F1FF;
}
.cyberpunk-mode .MuiPickersToolbar-penIconButton {
  color: #00FFFF;
}

/* 日期选择器底部操作按钮 */
.cyberpunk-mode .MuiDialogActions-root .MuiButton-root {
  color: #00FFFF;
}
.cyberpunk-mode .MuiDialogActions-root .MuiButton-contained {
  background: linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%);
  color: #0A0A1A;
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 136, 0.20);
}

/* Snackbar 错误 — 霓虹红边框 */
.cyberpunk-mode .MuiSnackbarContent-root.MuiSnackbarContent-colorError {
  border-color: rgba(255, 68, 68, 0.50);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 68, 68, 0.20);
}

/* Snackbar 警告 — 霓虹金边框 */
.cyberpunk-mode .MuiSnackbarContent-root.MuiSnackbarContent-colorWarning {
  border-color: rgba(255, 215, 0, 0.50);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.20);
}

/* Snackbar 信息 — 霓虹青边框 */
.cyberpunk-mode .MuiSnackbarContent-root.MuiSnackbarContent-colorInfo {
  border-color: rgba(0, 170, 255, 0.50);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 170, 255, 0.20);
}

/* ========== Dialog 过渡增强 ========== */

/* Dialog 进入动画 — 缩放 + 淡入 + 霓虹光晕 */
@keyframes cyber-dialog-in {
  0% {
    transform: scale(0.92) translateY(20px);
    opacity: 0;
    box-shadow: 0 0 0 rgba(0, 255, 255, 0);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15);
  }
}
.cyberpunk-mode .MuiDialog-paper {
  animation: cyber-dialog-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Dialog 标题 — 霓虹发光 */
.cyberpunk-mode .MuiDialogTitle-root {
  color: #00FFFF;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.30);
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}

/* Dialog 内容 */
.cyberpunk-mode .MuiDialogContent-root {
  color: #E6F1FF;
}

/* Dialog 操作区 */
.cyberpunk-mode .MuiDialogActions-root {
  border-top: 1px solid rgba(0, 255, 255, 0.15);
  padding: 16px 24px;
}

/* ========== CommandPalette 命令面板 ========== */

/* 命令面板容器 — 深空玻璃拟态 + HUD 边框装饰 */
.cyberpunk-mode .command-palette .MuiDialog-paper {
  background-color: rgba(10, 10, 26, 0.92) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 255, 255, 0.40);
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 60px rgba(0, 255, 255, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
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
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    #00FFFF 20%,
    #FF00FF 50%,
    #00FFFF 80%,
    transparent 100%);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.60);
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
    linear-gradient(to right, #00FFFF 0, #00FFFF 12px, transparent 12px) top left no-repeat,
    linear-gradient(to bottom, #00FFFF 0, #00FFFF 12px, transparent 12px) top left no-repeat,
    linear-gradient(to left, #00FFFF 0, #00FFFF 12px, transparent 12px) top right no-repeat,
    linear-gradient(to bottom, #00FFFF 0, #00FFFF 12px, transparent 12px) top right no-repeat,
    linear-gradient(to right, #00FFFF 0, #00FFFF 12px, transparent 12px) bottom left no-repeat,
    linear-gradient(to top, #00FFFF 0, #00FFFF 12px, transparent 12px) bottom left no-repeat,
    linear-gradient(to left, #00FFFF 0, #00FFFF 12px, transparent 12px) bottom right no-repeat,
    linear-gradient(to top, #00FFFF 0, #00FFFF 12px, transparent 12px) bottom right no-repeat;
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
  border-color: #00FFFF;
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.40);
}

/* 命令面板搜索图标 — 霓虹发光 */
.cyberpunk-mode .command-palette .MuiInputAdornment-root svg {
  color: #00FFFF;
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.50));
}

/* 命令面板快捷键 Chip — 霓虹风格 */
.cyberpunk-mode .command-palette .MuiChip-root {
  background-color: rgba(0, 255, 255, 0.10);
  border: 1px solid rgba(0, 255, 255, 0.40);
  color: #00FFFF;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-weight: 600;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.20);
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
  border-left-color: #00FFFF;
  box-shadow:
    inset 4px 0 12px rgba(0, 255, 255, 0.20),
    inset 0 0 16px rgba(0, 255, 255, 0.05);
}

/* 选中项左侧扫光指示器 */
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: #00FFFF;
  box-shadow: 0 0 12px #00FFFF, 0 0 24px rgba(0, 255, 255, 0.50);
  animation: cyber-pulse-glow 1.5s ease-in-out infinite;
}

/* 命令面板列表项图标 — 选中时霓虹发光 */
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root svg {
  color: #00FFFF !important;
  filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.70));
}

/* 命令面板列表项主文本 — 选中时霓虹色 */
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected .MuiListItemText-primary {
  color: #00FFFF;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.40);
}

/* 命令面板列表项次文本 — 路径提示 */
.cyberpunk-mode .command-palette .MuiListItemText-secondary {
  color: #8892B0 !important;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem !important;
}

/* 命令面板右侧箭头 — 选中时显示霓虹 */
.cyberpunk-mode .command-palette .MuiListItemButton-root svg {
  transition: all 180ms ease;
}
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected > div > svg:last-child,
.cyberpunk-mode .command-palette .MuiListItemButton-root.Mui-selected svg[lucide='arrow-right'] {
  color: #00FFFF;
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
  color: #8892B0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
}

/* 命令面板空状态 — 霓虹 */
.cyberpunk-mode .command-palette .MuiTypography-root[color='text.secondary'] {
  color: #8892B0 !important;
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
  height: 40px;
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
  width: 32px;
  height: 32px;
  border: 2px solid #00FFFF;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.50);
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
  height: 2px;
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
  background: linear-gradient(90deg, transparent, #00FFFF, transparent);
  box-shadow: 0 0 12px #00FFFF;
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
  gap: 4px;
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
  color: #00FF88;
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
    #00FFFF 0%,
    #0088FF 25%,
    #FF00FF 75%,
    #FF0088 100%) !important;
  box-shadow:
    0 0 12px rgba(0, 255, 255, 0.60),
    0 0 24px rgba(255, 0, 255, 0.30),
    inset 0 0 12px rgba(255, 255, 255, 0.20);
  animation: cyber-pulse-glow 3s ease-in-out infinite;
  overflow: hidden;
}

/* Logo 内部字符 — 高对比度 */
.cyberpunk-mode .app-header-logo .MuiTypography-root {
  color: #0A0A1A !important;
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
    linear-gradient(to right, #FFFFFF 0, #FFFFFF 4px, transparent 4px) top left no-repeat,
    linear-gradient(to bottom, #FFFFFF 0, #FFFFFF 4px, transparent 4px) top left no-repeat,
    linear-gradient(to left, #FFFFFF 0, #FFFFFF 4px, transparent 4px) top right no-repeat,
    linear-gradient(to bottom, #FFFFFF 0, #FFFFFF 4px, transparent 4px) top right no-repeat,
    linear-gradient(to right, #FFFFFF 0, #FFFFFF 4px, transparent 4px) bottom left no-repeat,
    linear-gradient(to top, #FFFFFF 0, #FFFFFF 4px, transparent 4px) bottom left no-repeat,
    linear-gradient(to left, #FFFFFF 0, #FFFFFF 4px, transparent 4px) bottom right no-repeat,
    linear-gradient(to top, #FFFFFF 0, #FFFFFF 4px, transparent 4px) bottom right no-repeat;
  background-size: 4px 1px, 1px 4px, 4px 1px, 1px 4px, 4px 1px, 1px 4px, 4px 1px, 1px 4px;
  opacity: 0.80;
  pointer-events: none;
}

/* AppHeader 标题 — 渐变文字 + 多层发光 */
.cyberpunk-mode .app-header-title {
  background: linear-gradient(135deg,
    #00FFFF 0%,
    #FFFFFF 30%,
    #FF00FF 60%,
    #00FFFF 100%) !important;
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
  background: linear-gradient(180deg, #00FFFF, #FF00FF);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.60);
  border-radius: 2px;
}

/* ========== 自定义滚动条 — 命令面板独立风格 ========== */

.cyberpunk-mode .command-palette ::-webkit-scrollbar {
  width: 6px;
}
.cyberpunk-mode .command-palette ::-webkit-scrollbar-track {
  background: transparent;
}
.cyberpunk-mode .command-palette ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #00FFFF, #FF00FF);
  border-radius: 3px;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.50);
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
