export const gradients = {
  // 主色调渐变
  primary:
    'linear-gradient(135deg, var(--color-primary, var(--color-primary, #3b82f6)), var(--color-primary-hover, var(--color-primary-hover, #2563eb)))',
  secondary:
    'linear-gradient(135deg, var(--color-secondary, var(--color-secondary, #8b5cf6)), var(--color-secondary-hover, var(--color-secondary-hover, #7c3aed)))',
  brand:
    'linear-gradient(135deg, var(--color-primary, var(--color-primary, #3b82f6)), var(--color-secondary, var(--color-secondary, #8b5cf6)))',
  text: 'linear-gradient(135deg, var(--color-primary-light, var(--color-primary-light, #60a5fa)), var(--color-secondary-light, var(--color-secondary-light, #a78bfa)), var(--color-error-400, #f87171))',
  success:
    'linear-gradient(135deg, var(--color-success, var(--color-success, #22c55e)), var(--color-success-hover, var(--color-success-hover, #16a34a)))',
  warning:
    'linear-gradient(135deg, var(--color-warning, var(--color-warning, #f59e0b)), var(--color-warning-hover, #d97706))',
  error: 'linear-gradient(135deg, var(--color-error, #ef4444), var(--color-error-hover, #dc2626))',
  info: 'linear-gradient(135deg, var(--color-info, #0ea5e9), var(--color-info-hover, #0284c7))',

  // 模块专属渐变（与设计稿 CSS 变量 --gradient-module-* 保持同步）
  modules: {
    hrm: 'linear-gradient(135deg, var(--color-success, var(--color-success, #22c55e)) 0%, var(--color-success-700, #15803d) 100%)',
    crm: 'linear-gradient(135deg, var(--color-primary, var(--color-primary, #3b82f6)) 0%, var(--color-primary-700, #1d4ed8) 100%)',
    pm: 'linear-gradient(135deg, var(--color-secondary, var(--color-secondary, #8b5cf6)) 0%, var(--color-secondary-hover, var(--color-secondary-hover, #7c3aed)) 100%)',
    finance:
      'linear-gradient(135deg, var(--color-success, #22c55e) 0%, var(--color-success-hover, #16a34a) 100%)',
    mes: 'linear-gradient(135deg, var(--color-error, #ef4444) 0%, var(--color-error-700, #b91c1c) 100%)',
    scm: 'linear-gradient(135deg, var(--color-warning, var(--color-warning, #f59e0b)) 0%, var(--color-warning-hover, #d97706) 100%)',
    wms: 'linear-gradient(135deg, var(--color-info, #0ea5e9) 0%, var(--color-info-hover, #0284c7) 100%)',
    bi: 'linear-gradient(135deg, var(--color-secondary, #8b5cf6) 0%, var(--color-secondary-hover, #7c3aed) 100%)',
    gis: 'linear-gradient(135deg, var(--color-success, #22c55e) 0%, var(--color-success-hover, #16a34a) 100%)',
    im: 'linear-gradient(135deg, var(--color-success, #22c55e) 0%, var(--color-success-hover, #16a34a) 100%)',
    ai: 'linear-gradient(135deg, var(--color-secondary, var(--color-secondary, #8b5cf6)) 0%, var(--color-secondary-hover, var(--color-secondary-hover, #7c3aed)) 100%)',
    qms: 'linear-gradient(135deg, var(--color-secondary, #8b5cf6) 0%, var(--color-secondary, var(--color-secondary, #8b5cf6)) 100%)',
    flow: 'linear-gradient(135deg, var(--color-info, #0ea5e9) 0%, var(--color-info-hover, #0284c7) 100%)',
  },

  // 背景渐变
  backgrounds: {
    page: 'linear-gradient(to bottom right, var(--color-background, var(--color-background, #f8fafc)), var(--color-surface-light, var(--color-surface-light, #f1f5f9)))',
    card: 'linear-gradient(to bottom, var(--color-surface, var(--color-primary-foreground, #ffffff)), var(--color-surface, var(--color-primary-foreground, #ffffff)))',
    dark: 'linear-gradient(to bottom right, var(--color-background, #080c18), var(--color-surface, #0c1222))',
    hero: 'linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.90) 100%)',
    cta: 'linear-gradient(135deg, var(--color-primary, var(--color-primary, #3b82f6)) 0%, var(--color-secondary-hover, var(--color-secondary-hover, #7c3aed)) 100%)',
  },

  // CTA 等区域渐变
  sections: {
    cta: 'linear-gradient(135deg, var(--color-primary, var(--color-primary, #3b82f6)) 0%, var(--color-secondary-hover, var(--color-secondary-hover, #7c3aed)) 100%)',
    hero: 'linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.90) 100%)',
    heroText:
      'linear-gradient(135deg, var(--color-surface, var(--color-primary-foreground, #ffffff)) 0%, var(--color-primary-100, #dbeafe) 50%, var(--color-surface, var(--color-primary-foreground, #ffffff)) 100%)',
  },

  // 赛博风格渐变
  cyber: {
    border: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.1))',
    glow: 'radial-gradient(ellipse at top left, rgba(59,130,246,0.08), transparent 70%)',
    accent:
      'linear-gradient(135deg, var(--color-primary, var(--color-primary, #3b82f6)), var(--color-info, #0ea5e9))',
    accentSubtle: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.08))',
    text: 'linear-gradient(135deg, var(--color-primary-light, var(--color-primary-light, #60a5fa)), var(--color-info-400, #38bdf8), var(--color-secondary-light, var(--color-secondary-light, #a78bfa)))',
    surface: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(6,182,212,0.02))',
    cardHover: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.04))',
  },
};
