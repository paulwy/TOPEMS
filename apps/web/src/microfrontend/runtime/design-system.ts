import { designTokens, semanticTokens } from '@topems/tokens';
/**
 * V45.0 Track F: 微前端终极形态 — 统一设计系统
 *
 * DesignSystemManager 提供跨框架的设计令牌管理与主题同步：
 * - 设计令牌注册（颜色/字体/间距/圆角/阴影/动画等）
 * - 主题切换（亮色/暗色/自定义）
 * - CSS 变量同步（--ds-{category}-{name}）
 * - 跨框架同步（CustomEvent + CSS Variables + SharedState）
 * - 主题变更实时广播到所有微前端模块
 *
 * @example
 * designSystemManager.registerToken({ name: 'primary', value: '#7c3aed', type: TokenType.COLOR, category: 'color' });
 * designSystemManager.setTheme({ mode: 'dark', primary_color: '#5b21b6' });
 * designSystemManager.syncToCssVariables();
 */

// ==================== 类型定义 ====================

/** 设计令牌类型 */
export enum TokenType {
  COLOR = 'color',
  TYPOGRAPHY = 'typography',
  SPACING = 'spacing',
  BORDER = 'border',
  SHADOW = 'shadow',
  ANIMATION = 'animation',
  ZINDEX = 'z-index',
  BREAKPOINT = 'breakpoint',
}

/** 设计令牌 */
export interface DesignToken {
  /** 令牌名称（如 primary / spacing-md / font-size-lg） */
  name: string;
  /** 令牌值（如 #7c3aed / 16px / 1.5rem） */
  value: string | number;
  /** 令牌类型 */
  type: TokenType;
  /** 令牌描述 */
  description?: string;
  /** 令牌分类（如 color / spacing / typography / radius / shadow / animation / z-index / breakpoint） */
  category: string;
}

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'custom';

/** 主题配置 */
export interface ThemeConfig {
  /** 主题模式 */
  mode: ThemeMode;
  /** 主色 */
  primary_color: string;
  /** 辅色 */
  secondary_color: string;
  /** 背景色 */
  background: string;
  /** 文字颜色集合 */
  text_colors: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  /** 组件级覆盖 */
  component_overrides: Record<string, Record<string, string>>;
}

/** 主题变更回调 */
export type ThemeChangeCallback = (theme: ThemeConfig) => void;

/** 主题变更事件详情 */
export interface ThemeChangeEventDetail {
  theme: ThemeConfig;
  timestamp: number;
  source: string;
}

/** 设计系统事件名 */
export const DESIGN_SYSTEM_EVENTS = {
  THEME_CHANGE: 'design-system:theme-change',
  TOKEN_UPDATE: 'design-system:token-update',
  SYNC: 'design-system:sync',
} as const;

// ==================== 预置设计令牌 ====================

/** 预置设计令牌（50+ 个） */
export const PRESET_TOKENS: DesignToken[] = [
  // ---- 颜色（主色） ----
  {
    name: 'primary',
    value: '#7c3aed',
    type: TokenType.COLOR,
    category: 'color',
    description: '品牌主色',
  },
  {
    name: 'primary-light',
    value: '#a78bfa',
    type: TokenType.COLOR,
    category: 'color',
    description: '主色浅色',
  },
  {
    name: 'primary-dark',
    value: '#5b21b6',
    type: TokenType.COLOR,
    category: 'color',
    description: '主色深色',
  },
  {
    name: 'secondary',
    value: '#06b6d4',
    type: TokenType.COLOR,
    category: 'color',
    description: '品牌辅色',
  },
  {
    name: 'secondary-light',
    value: '#67e8f9',
    type: TokenType.COLOR,
    category: 'color',
    description: '辅色浅色',
  },
  {
    name: 'secondary-dark',
    value: '#0e7490',
    type: TokenType.COLOR,
    category: 'color',
    description: '辅色深色',
  },

  // ---- 颜色（语义） ----
  {
    name: 'success',
    value: designTokens.colors.success.dark,
    type: TokenType.COLOR,
    category: 'color',
    description: '成功色',
  },
  {
    name: 'warning',
    value: designTokens.colors.warning.main,
    type: TokenType.COLOR,
    category: 'color',
    description: '警告色',
  },
  {
    name: 'error',
    value: designTokens.colors.error.main,
    type: TokenType.COLOR,
    category: 'color',
    description: '错误色',
  },
  {
    name: 'info',
    value: designTokens.colors.primary.main,
    type: TokenType.COLOR,
    category: 'color',
    description: '信息色',
  },

  // ---- 颜色（灰阶） ----
  {
    name: 'gray-50',
    value: '#f9fafb',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 50',
  },
  {
    name: 'gray-100',
    value: '#f3f4f6',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 100',
  },
  {
    name: 'gray-200',
    value: '#e5e7eb',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 200',
  },
  {
    name: 'gray-300',
    value: '#d1d5db',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 300',
  },
  {
    name: 'gray-400',
    value: '#9ca3af',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 400',
  },
  {
    name: 'gray-500',
    value: 'colors.grey.500',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 500',
  },
  {
    name: 'gray-600',
    value: '#4b5563',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 600',
  },
  {
    name: 'gray-700',
    value: '#374151',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 700',
  },
  {
    name: 'gray-800',
    value: '#1f2937',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 800',
  },
  {
    name: 'gray-900',
    value: '#111827',
    type: TokenType.COLOR,
    category: 'color',
    description: '灰阶 900',
  },

  // ---- 颜色（背景/文字） ----
  {
    name: 'bg-primary',
    value: designTokens.colors.background.paper,
    type: TokenType.COLOR,
    category: 'color',
    description: '主背景色',
  },
  {
    name: 'bg-secondary',
    value: '#f9fafb',
    type: TokenType.COLOR,
    category: 'color',
    description: '次背景色',
  },
  {
    name: 'bg-dark',
    value: '#111827',
    type: TokenType.COLOR,
    category: 'color',
    description: '深色背景',
  },
  {
    name: 'text-primary',
    value: '#111827',
    type: TokenType.COLOR,
    category: 'color',
    description: '主文字色',
  },
  {
    name: 'text-secondary',
    value: 'colors.grey.500',
    type: TokenType.COLOR,
    category: 'color',
    description: '次文字色',
  },
  {
    name: 'text-disabled',
    value: '#9ca3af',
    type: TokenType.COLOR,
    category: 'color',
    description: '禁用文字色',
  },
  {
    name: 'text-inverse',
    value: designTokens.colors.background.paper,
    type: TokenType.COLOR,
    category: 'color',
    description: '反色文字',
  },

  // ---- 排版 ----
  {
    name: 'font-family',
    value: "'Inter', system-ui, -apple-system, sans-serif",
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字体族',
  },
  {
    name: 'font-size-xs',
    value: '0.75rem',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字号 XS',
  },
  {
    name: 'font-size-sm',
    value: '0.875rem',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字号 SM',
  },
  {
    name: 'font-size-base',
    value: '1rem',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字号 Base',
  },
  {
    name: 'font-size-lg',
    value: '1.125rem',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字号 LG',
  },
  {
    name: 'font-size-xl',
    value: '1.25rem',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字号 XL',
  },
  {
    name: 'font-size-2xl',
    value: '1.5rem',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字号 2XL',
  },
  {
    name: 'font-weight-normal',
    value: '400',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字重正常',
  },
  {
    name: 'font-weight-medium',
    value: '500',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字重中等',
  },
  {
    name: 'font-weight-semibold',
    value: '600',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字重半粗',
  },
  {
    name: 'font-weight-bold',
    value: '700',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '字重粗体',
  },
  {
    name: 'line-height-tight',
    value: '1.25',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '行高紧凑',
  },
  {
    name: 'line-height-normal',
    value: '1.5',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '行高正常',
  },
  {
    name: 'line-height-relaxed',
    value: '1.75',
    type: TokenType.TYPOGRAPHY,
    category: 'typography',
    description: '行高宽松',
  },

  // ---- 间距 ----
  {
    name: 'spacing-xs',
    value: '4px',
    type: TokenType.SPACING,
    category: 'spacing',
    description: '间距 XS',
  },
  {
    name: 'spacing-sm',
    value: '8px',
    type: TokenType.SPACING,
    category: 'spacing',
    description: '间距 SM',
  },
  {
    name: 'spacing-md',
    value: '16px',
    type: TokenType.SPACING,
    category: 'spacing',
    description: '间距 MD',
  },
  {
    name: 'spacing-lg',
    value: '24px',
    type: TokenType.SPACING,
    category: 'spacing',
    description: '间距 LG',
  },
  {
    name: 'spacing-xl',
    value: '32px',
    type: TokenType.SPACING,
    category: 'spacing',
    description: '间距 XL',
  },
  {
    name: 'spacing-2xl',
    value: '48px',
    type: TokenType.SPACING,
    category: 'spacing',
    description: '间距 2XL',
  },

  // ---- 圆角 ----
  {
    name: 'radius-sm',
    value: '4px',
    type: TokenType.BORDER,
    category: 'radius',
    description: '圆角 SM',
  },
  {
    name: 'radius-md',
    value: '8px',
    type: TokenType.BORDER,
    category: 'radius',
    description: '圆角 MD',
  },
  {
    name: 'radius-lg',
    value: '12px',
    type: TokenType.BORDER,
    category: 'radius',
    description: '圆角 LG',
  },
  {
    name: 'radius-xl',
    value: '16px',
    type: TokenType.BORDER,
    category: 'radius',
    description: '圆角 XL',
  },
  {
    name: 'radius-full',
    value: '9999px',
    type: TokenType.BORDER,
    category: 'radius',
    description: '全圆角',
  },

  // ---- 阴影 ----
  {
    name: 'shadow-sm',
    value: '0 1px 2px rgba(0,0,0,0.05)',
    type: TokenType.SHADOW,
    category: 'shadow',
    description: '阴影 SM',
  },
  {
    name: 'shadow-md',
    value: '0 4px 6px rgba(0,0,0,0.1)',
    type: TokenType.SHADOW,
    category: 'shadow',
    description: '阴影 MD',
  },
  {
    name: 'shadow-lg',
    value: '0 10px 15px rgba(0,0,0,0.1)',
    type: TokenType.SHADOW,
    category: 'shadow',
    description: '阴影 LG',
  },
  {
    name: 'shadow-xl',
    value: '0 20px 25px rgba(0,0,0,0.15)',
    type: TokenType.SHADOW,
    category: 'shadow',
    description: '阴影 XL',
  },

  // ---- 动画 ----
  {
    name: 'duration-fast',
    value: '150ms',
    type: TokenType.ANIMATION,
    category: 'animation',
    description: '动画时长快',
  },
  {
    name: 'duration-normal',
    value: '300ms',
    type: TokenType.ANIMATION,
    category: 'animation',
    description: '动画时长正常',
  },
  {
    name: 'duration-slow',
    value: '500ms',
    type: TokenType.ANIMATION,
    category: 'animation',
    description: '动画时长慢',
  },
  {
    name: 'ease-in-out',
    value: 'cubic-bezier(0.4, 0, 0.2, 1)',
    type: TokenType.ANIMATION,
    category: 'animation',
    description: '缓动函数',
  },
  {
    name: 'ease-bounce',
    value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    type: TokenType.ANIMATION,
    category: 'animation',
    description: '弹跳缓动',
  },

  // ---- Z-Index ----
  {
    name: 'z-dropdown',
    value: '1000',
    type: TokenType.ZINDEX,
    category: 'z-index',
    description: '下拉菜单层级',
  },
  {
    name: 'z-sticky',
    value: '1100',
    type: TokenType.ZINDEX,
    category: 'z-index',
    description: '吸顶层级',
  },
  {
    name: 'z-modal',
    value: '1300',
    type: TokenType.ZINDEX,
    category: 'z-index',
    description: '弹窗层级',
  },
  {
    name: 'z-toast',
    value: '1400',
    type: TokenType.ZINDEX,
    category: 'z-index',
    description: '提示层级',
  },

  // ---- 断点 ----
  {
    name: 'breakpoint-sm',
    value: '640px',
    type: TokenType.BREAKPOINT,
    category: 'breakpoint',
    description: '断点 SM',
  },
  {
    name: 'breakpoint-md',
    value: '768px',
    type: TokenType.BREAKPOINT,
    category: 'breakpoint',
    description: '断点 MD',
  },
  {
    name: 'breakpoint-lg',
    value: '1024px',
    type: TokenType.BREAKPOINT,
    category: 'breakpoint',
    description: '断点 LG',
  },
  {
    name: 'breakpoint-xl',
    value: '1280px',
    type: TokenType.BREAKPOINT,
    category: 'breakpoint',
    description: '断点 XL',
  },
];

// ==================== 预置主题 ====================

/** 亮色主题 */
export const LIGHT_THEME: ThemeConfig = {
  mode: 'light',
  primary_color: 'secondary.600',
  secondary_color: 'cyan.500',
  background: 'primary.contrastText',
  text_colors: {
    primary: '#111827',
    secondary: 'colors.grey.500',
    disabled: '#9ca3af',
  },
  component_overrides: {},
};

/** 暗色主题 */
export const DARK_THEME: ThemeConfig = {
  mode: 'dark',
  primary_color: 'secondary.400',
  secondary_color: 'cyan.300',
  background: 'grey.900',
  text_colors: {
    primary: '#f9fafb',
    secondary: '#9ca3af',
    disabled: '#4b5563',
  },
  component_overrides: {},
};

// ==================== DesignSystemManager ====================

/**
 * 设计系统管理器
 *
 * 管理设计令牌与主题，并通过 CSS 变量 + CustomEvent 实现跨框架同步。
 */
export class DesignSystemManager {
  /** 设计令牌: name -> DesignToken */
  private readonly tokens = new Map<string, DesignToken>();
  /** 当前主题 */
  private currentTheme: ThemeConfig;
  /** 主题变更监听器 */
  private readonly themeListeners = new Set<ThemeChangeCallback>();
  /** CSS 变量根元素（默认 document.documentElement） */
  private rootElement: HTMLElement | null = null;
  /** 跨框架共享状态（用于无 DOM 环境同步） */
  private sharedState: Map<string, any> = new Map();

  constructor() {
    this.currentTheme = { ...LIGHT_THEME };
    this.loadPresetTokens();
  }

  /** 加载预置令牌 */
  private loadPresetTokens(): void {
    PRESET_TOKENS.forEach((token) => {
      this.tokens.set(token.name, { ...token });
    });
  }

  // -------------------- 令牌管理 --------------------

  /** 注册设计令牌 */
  registerToken(token: DesignToken): void {
    this.tokens.set(token.name, { ...token });
    this.broadcastTokenUpdate(token);
  }

  /** 批量注册设计令牌 */
  registerTokens(tokens: DesignToken[]): void {
    tokens.forEach((t) => {
      this.tokens.set(t.name, { ...t });
    });
    tokens.forEach((t) => this.broadcastTokenUpdate(t));
  }

  /** 获取令牌 */
  getToken(name: string): DesignToken | undefined {
    return this.tokens.get(name);
  }

  /** 按分类获取令牌 */
  getTokensByCategory(category: string): DesignToken[] {
    return Array.from(this.tokens.values()).filter((t) => t.category === category);
  }

  /** 按类型获取令牌 */
  getTokensByType(type: TokenType): DesignToken[] {
    return Array.from(this.tokens.values()).filter((t) => t.type === type);
  }

  /** 获取所有令牌 */
  getAllTokens(): DesignToken[] {
    return Array.from(this.tokens.values());
  }

  /** 删除令牌 */
  removeToken(name: string): boolean {
    return this.tokens.delete(name);
  }

  /** 获取令牌总数 */
  get tokenCount(): number {
    return this.tokens.size;
  }

  // -------------------- 主题管理 --------------------

  /** 设置当前主题 */
  setTheme(theme: Partial<ThemeConfig>, source = 'api'): void {
    this.currentTheme = {
      ...this.currentTheme,
      ...theme,
      text_colors: {
        ...this.currentTheme.text_colors,
        ...(theme.text_colors || {}),
      },
      component_overrides: {
        ...this.currentTheme.component_overrides,
        ...(theme.component_overrides || {}),
      },
    };

    // 同步主题相关令牌
    if (theme.primary_color) {
      this.updateTokenValue('primary', theme.primary_color);
    }
    if (theme.secondary_color) {
      this.updateTokenValue('secondary', theme.secondary_color);
    }
    if (theme.background) {
      this.updateTokenValue('bg-primary', theme.background);
    }
    if (theme.text_colors?.primary) {
      this.updateTokenValue('text-primary', theme.text_colors.primary);
    }
    if (theme.text_colors?.secondary) {
      this.updateTokenValue('text-secondary', theme.text_colors.secondary);
    }

    // 同步 CSS 变量
    this.syncToCssVariables();
    // 广播主题变更
    this.broadcastThemeChange(source);
    // 通知监听器
    this.notifyThemeListeners();
  }

  /** 获取当前主题 */
  getTheme(): ThemeConfig {
    return { ...this.currentTheme };
  }

  /** 切换亮色/暗色主题 */
  toggleTheme(): void {
    if (this.currentTheme.mode === 'dark') {
      this.setTheme({ ...LIGHT_THEME }, 'toggle');
    } else {
      this.setTheme({ ...DARK_THEME }, 'toggle');
    }
  }

  /** 设置为暗色主题 */
  setDarkTheme(): void {
    this.setTheme({ ...DARK_THEME }, 'api');
  }

  /** 设置为亮色主题 */
  setLightTheme(): void {
    this.setTheme({ ...LIGHT_THEME }, 'api');
  }

  /** 更新令牌值（内部） */
  private updateTokenValue(name: string, value: string | number): void {
    const token = this.tokens.get(name);
    if (token) {
      token.value = value;
    }
  }

  // -------------------- CSS 变量同步 --------------------

  /** 将所有令牌同步到 CSS 变量（--ds-{category}-{name}） */
  syncToCssVariables(root?: HTMLElement): void {
    const el = root || this.rootElement || this.getDefaultRoot();
    if (!el) return;
    this.rootElement = el;

    this.tokens.forEach((token) => {
      const varName = this.toCssVarName(token);
      el.style.setProperty(varName, String(token.value));
    });

    // 同步主题模式
    el.style.setProperty('--ds-theme-mode', this.currentTheme.mode);
    el.setAttribute('data-theme', this.currentTheme.mode);
  }

  /** 获取 CSS 变量名 */
  toCssVarName(token: DesignToken): string {
    return `--ds-${token.category}-${token.name}`;
  }

  /** 获取所有 CSS 变量键值对 */
  getCssVariables(): Array<{ name: string; value: string }> {
    return this.getAllTokens().map((t) => ({
      name: this.toCssVarName(t),
      value: String(t.value),
    }));
  }

  /** 获取默认根元素 */
  private getDefaultRoot(): HTMLElement | null {
    if (typeof document !== 'undefined') {
      return document.documentElement;
    }
    return null;
  }

  // -------------------- 跨框架同步 --------------------

  /**
   * 同步到所有框架
   *
   * 三种同步机制：
   * 1. CSS Variables（DOM 层面，自动继承）
   * 2. CustomEvent（事件广播，各框架监听）
   * 3. SharedState（共享状态，无 DOM 环境可用）
   */
  syncToFramework(): void {
    // 1. CSS Variables
    this.syncToCssVariables();

    // 2. CustomEvent
    this.broadcastSync();

    // 3. SharedState
    this.syncToSharedState();
  }

  /** 广播主题变更（CustomEvent） */
  private broadcastThemeChange(source: string): void {
    if (typeof window === 'undefined') return;
    const detail: ThemeChangeEventDetail = {
      theme: this.getTheme(),
      timestamp: Date.now(),
      source,
    };
    window.dispatchEvent(new CustomEvent(DESIGN_SYSTEM_EVENTS.THEME_CHANGE, { detail }));
  }

  /** 广播令牌更新（CustomEvent） */
  private broadcastTokenUpdate(token: DesignToken): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(DESIGN_SYSTEM_EVENTS.TOKEN_UPDATE, {
        detail: { token, timestamp: Date.now() },
      })
    );

    // 同步到 CSS 变量
    const el = this.rootElement || this.getDefaultRoot();
    if (el) {
      el.style.setProperty(this.toCssVarName(token), String(token.value));
    }
  }

  /** 广播同步事件 */
  private broadcastSync(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(DESIGN_SYSTEM_EVENTS.SYNC, {
        detail: {
          theme: this.getTheme(),
          tokenCount: this.tokens.size,
          timestamp: Date.now(),
        },
      })
    );
  }

  /** 同步到共享状态 */
  private syncToSharedState(): void {
    this.sharedState.set('theme', this.getTheme());
    this.sharedState.set('tokens', this.getAllTokens());
    this.sharedState.set('cssVars', this.getCssVariables());
  }

  /** 获取共享状态 */
  getSharedState(key: string): unknown {
    return this.sharedState.get(key);
  }

  // -------------------- 事件订阅 --------------------

  /** 监听主题变更 */
  watchThemeChange(callback: ThemeChangeCallback): () => void {
    this.themeListeners.add(callback);
    return () => this.themeListeners.delete(callback);
  }

  /** 监听全局设计系统事件（CustomEvent） */
  watchEvent(eventType: string, handler: (detail: unknown) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent;
      handler(customEvent.detail);
    };
    window.addEventListener(eventType, listener);
    return () => window.removeEventListener(eventType, listener);
  }

  /** 通知主题监听器 */
  private notifyThemeListeners(): void {
    const theme = this.getTheme();
    this.themeListeners.forEach((l) => {
      try {
        l(theme);
      } catch {
        // ignore
      }
    });
  }

  /** 设置根元素 */
  setRootElement(el: HTMLElement): void {
    this.rootElement = el;
  }
}

// ==================== 单例导出 ====================

export const designSystemManager = new DesignSystemManager();

export default designSystemManager;
