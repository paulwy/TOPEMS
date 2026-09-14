import { alpha, type Theme } from '@mui/material/styles';

/**
 * Design demo → MUI sx 等价映射工具库（Phase 2）
 *
 * 背景：项目未引入 Tailwind，design demo（navigation-menu-demo.design/colors_and_type.css）
 * 中的 `bg-glass` / `shadow-glow` / `gradient-text` / `page-gradient-bg` 等工具类
 * 需以「等价 MUI sx 映射」落地，供任何组件组合使用：
 *
 * ```tsx
 * sx={(theme) => ({ ...glassSx(theme), position: 'sticky', top: 0 })}
 * ```
 *
 * 实现约定（沿用项目已验证的 MUI v9 + exactOptionalPropertyTypes 方案）：
 * - 全部为 `(theme) => object` 函数形式（函数式 sx 本身即合法 SxProps，可独立使用）
 * - 色值一律从 theme 取真实值（不写 `primary.main` 这类 sx 不解析的字符串，
 *   见 HeaderLogo 渐变文字修复记录），浅色/暗色自动适配
 * - 只表达视觉效果，不携带布局/定位语义，由调用方组合
 */

/** 玻璃拟态（design demo `bg-glass` / `.glass-header`） */
export const glassSx = (theme: Theme) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.85),
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
});

export type GlowStrength = 'sm' | 'md' | 'lg';

const GLOW_ALPHA: Record<GlowStrength, { ring: number; spread: number }> = {
  sm: { ring: 0.12, spread: 0.08 },
  md: { ring: 0.18, spread: 0.14 },
  lg: { ring: 0.28, spread: 0.22 },
};

/** 品牌色外发光（design demo `shadow-glow` / `.selected-glow`） */
export const shadowGlowSx =
  (strength: GlowStrength = 'md') =>
  (theme: Theme) => {
    const { ring, spread } = GLOW_ALPHA[strength];
    return {
      boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, ring)}, 0 0 20px ${alpha(
        theme.palette.primary.main,
        spread
      )}`,
    };
  };

/** 渐变文字（design demo `gradient-text`，primary → secondary） */
export const gradientTextSx = (theme: Theme) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
});

/** 页面渐变背景（design demo `page-gradient-bg`：双椭圆品牌色径向渐变 + 底色） */
export const pageGradientBgSx = (theme: Theme) => ({
  background: `radial-gradient(ellipse at 10% 0%, ${alpha(
    theme.palette.primary.main,
    0.06
  )} 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, ${alpha(
    theme.palette.secondary.main,
    0.05
  )} 0%, transparent 45%), ${theme.palette.background.default}`,
});
