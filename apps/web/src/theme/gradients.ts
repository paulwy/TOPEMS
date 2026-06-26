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
    hrm: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    crm: 'linear-gradient(135deg, #22c55e, #4ade80)',
    pm: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    finance: 'linear-gradient(135deg, #6366f1, #818cf8)',
    mes: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
    scm: 'linear-gradient(135deg, #10b981, #34d399)',
    wms: 'linear-gradient(135deg, #6366f1, #818cf8)',
    bi: 'linear-gradient(135deg, #ec4899, #f472b6)',
    gis: 'linear-gradient(135deg, #10b981, #34d399)',
    im: 'linear-gradient(135deg, #f43f5e, #fb7185)',
    ai: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    qms: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    flow: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
  },

  // 背景渐变
  backgrounds: {
    page: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)',
    card: 'linear-gradient(to bottom, #ffffff, #fafafa)',
    dark: 'linear-gradient(to bottom right, #111827, #1f2937)',
    hero: 'linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.90) 100%)',
    cta: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
  },

  // CTA 等区域渐变
  sections: {
    cta: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
    hero: 'linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.90) 100%)',
    heroText: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ffffff 100%)',
  },
};
