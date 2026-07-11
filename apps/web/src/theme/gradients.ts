export const gradients = {
  // 主色调渐变
  primary: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  secondary: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  brand: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  text: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
  success: 'linear-gradient(135deg, #22c55e, #16a34a)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  error: 'linear-gradient(135deg, #ef4444, #dc2626)',
  info: 'linear-gradient(135deg, #0ea5e9, #0284c7)',

  // 模块专属渐变（与设计稿 CSS 变量 --gradient-module-* 保持同步）
  modules: {
    hrm: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
    crm: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    pm: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    finance: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    mes: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
    scm: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    wms: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    bi: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    gis: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    im: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    ai: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    qms: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    flow: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
  },

  // 背景渐变
  backgrounds: {
    page: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)',
    card: 'linear-gradient(to bottom, #ffffff, #fafafa)',
    dark: 'linear-gradient(to bottom right, #080c18, #0c1222)',
    hero: 'linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.90) 100%)',
    cta: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
  },

  // CTA 等区域渐变
  sections: {
    cta: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
    hero: 'linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.90) 100%)',
    heroText: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ffffff 100%)',
  },

  // 赛博风格渐变
  cyber: {
    border: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.1))',
    glow: 'radial-gradient(ellipse at top left, rgba(59,130,246,0.08), transparent 70%)',
    accent: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    accentSubtle: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.08))',
    text: 'linear-gradient(135deg, #60a5fa, #22d3ee, #a78bfa)',
    surface: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(6,182,212,0.02))',
    cardHover: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.04))',
  },
};
