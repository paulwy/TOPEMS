import { describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material/styles';
import {
  glassSx,
  shadowGlowSx,
  gradientTextSx,
  pageGradientBgSx,
  type GlowStrength,
} from '@/theme/effects';

// 轻量 theme：只取 effects 依赖的 palette 字段
const theme = createTheme({
  palette: {
    primary: { main: '#365ae3' },
    secondary: { main: '#7c3aed' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
}) as Parameters<typeof glassSx>[0];

const resolve = <T>(sx: (t: typeof theme) => T): T => sx(theme);

describe('theme/effects（design demo → MUI sx 等价映射）', () => {
  it('glassSx 返回玻璃拟态（半透明底 + backdrop blur）', () => {
    const s = resolve(glassSx);
    expect(s.backdropFilter).toBe('blur(12px)');
    expect(s.WebkitBackdropFilter).toBe('blur(12px)');
    // 背景为 85% 不透明的 paper 色（alpha 混入）
    expect(s.backgroundColor).toContain('rgba(255, 255, 255, 0.85)');
  });

  it('shadowGlowSx 按强度生成品牌色外发光，色值来自 theme', () => {
    const sMd = resolve(shadowGlowSx('md'));
    expect(sMd.boxShadow).toContain('54, 90, 227'); // #365ae3 的 rgb
    const sLg = resolve(shadowGlowSx('lg'));
    const sSm = resolve(shadowGlowSx('sm'));
    // 强度越高 alpha 越大（ring 值递增：0.12 / 0.18 / 0.28）
    const alphaOf = (str: string) => Number(str.match(/rgba\(54, 90, 227, ([\d.]+)\)/)?.[1]);
    expect(alphaOf(sLg.boxShadow!)).toBeGreaterThan(alphaOf(sMd.boxShadow!));
    expect(alphaOf(sSm.boxShadow!)).toBeLessThan(alphaOf(sMd.boxShadow!));
  });

  it('shadowGlowSx 默认强度为 md', () => {
    const def = resolve(shadowGlowSx());
    const md = resolve(shadowGlowSx('md'));
    expect(def.boxShadow).toBe(md.boxShadow);
  });

  it('gradientTextSx 使用 theme 真实色值并裁剪文字', () => {
    const s = resolve(gradientTextSx);
    expect(s.background).toContain('#365ae3');
    expect(s.background).toContain('#7c3aed');
    expect(s.backgroundClip).toBe('text');
    expect(s.WebkitBackgroundClip).toBe('text');
    expect(s.WebkitTextFillColor).toBe('transparent');
  });

  it('pageGradientBgSx 返回双椭圆渐变 + 底色', () => {
    const s = resolve(pageGradientBgSx);
    expect(s.background).toContain('radial-gradient(ellipse at 10% 0%');
    expect(s.background).toContain('radial-gradient(ellipse at 90% 10%');
    expect(s.background).toContain('#f8fafc');
  });

  it('GlowStrength 类型仅接受 sm/md/lg（编译期约束，运行期无异常）', () => {
    const strengths: GlowStrength[] = ['sm', 'md', 'lg'];
    strengths.forEach((st) => {
      expect(typeof resolve(shadowGlowSx(st)).boxShadow).toBe('string');
    });
  });
});
