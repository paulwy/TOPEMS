import React from 'react';
import { v51DesignTokens, injectV51CSSVariables } from './tokens/v51-tokens';

// ============================================================
// V51.0 Theme Manager
// 主题管理系统：setTheme / getTheme / toggleDarkMode / setPrimaryColor / setFontSize
// 支持 localStorage 持久化、系统偏好检测、主题过渡
// ============================================================

type V51ThemeMode = 'light' | 'dark' | 'system';

interface V51ThemeConfig {
  mode: V51ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  fontSize: number;
  borderRadius: string;
  density: 'compact' | 'normal' | 'comfortable';
  animations: boolean;
}

const STORAGE_KEY = 'v51-design-system-theme';

const defaultConfig: V51ThemeConfig = {
  mode: 'system',
  primaryColor: v51DesignTokens.colors.primary.main,
  secondaryColor: v51DesignTokens.colors.secondary.main,
  fontSize: 14,
  borderRadius: v51DesignTokens.borderRadius.lg,
  density: 'normal',
  animations: true,
};

type ThemeChangeListener = (config: V51ThemeConfig) => void;

class ThemeManagerSingleton {
  private config: V51ThemeConfig;
  private listeners: Set<ThemeChangeListener> = new Set();
  private mediaQueryList: MediaQueryList | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.config = this.loadFromStorage();
    this.setupSystemPreferenceListener();
  }

  private loadFromStorage(): V51ThemeConfig {
    if (typeof window === 'undefined') return { ...defaultConfig };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultConfig, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('[ThemeManager] Failed to parse stored config', e);
    }
    return { ...defaultConfig };
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('[ThemeManager] Failed to save config to localStorage', e);
    }
  }

  private setupSystemPreferenceListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    try {
      this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQueryList.addEventListener('change', (e) => {
        if (this.config.mode === 'system') {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    } catch (e) {
      console.error('[ThemeManager] Failed to setup system preference listener', e);
    }
  }

  private getResolvedMode(): 'light' | 'dark' {
    if (this.config.mode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return this.config.mode;
  }

  private applyTheme(mode: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.colorScheme = mode;

    injectV51CSSVariables();

    if (this.config.animations) {
      body.classList.add('v51-theme-transition');
      if (this.transitionTimer) {
        clearTimeout(this.transitionTimer);
      }
      this.transitionTimer = setTimeout(() => {
        body.classList.remove('v51-theme-transition');
      }, 300);
    }

    this.emitChange();
  }

  private emitChange(): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.config });
      } catch (e) {
        console.error('[ThemeManager] Listener callback error', e);
      }
    }
  }

  getTheme(): V51ThemeConfig {
    return { ...this.config };
  }

  setTheme(config: Partial<V51ThemeConfig>): void {
    const prevMode = this.config.mode;
    this.config = { ...this.config, ...config };
    this.saveToStorage();

    const resolvedMode = this.getResolvedMode();
    if (config.mode && config.mode !== prevMode) {
      this.applyTheme(resolvedMode);
    } else {
      this.emitChange();
    }
  }

  setMode(mode: V51ThemeMode): void {
    this.setTheme({ mode });
  }

  toggleDarkMode(): void {
    const resolvedMode = this.getResolvedMode();
    this.setMode(resolvedMode === 'light' ? 'dark' : 'light');
  }

  setPrimaryColor(color: string): void {
    this.setTheme({ primaryColor: color });
  }

  setSecondaryColor(color: string): void {
    this.setTheme({ secondaryColor: color });
  }

  setFontSize(size: number): void {
    this.setTheme({ fontSize: Math.max(12, Math.min(20, size)) });
  }

  setBorderRadius(radius: string): void {
    this.setTheme({ borderRadius: radius });
  }

  setDensity(density: 'compact' | 'normal' | 'comfortable'): void {
    this.setTheme({ density });
  }

  setAnimations(enabled: boolean): void {
    this.setTheme({ animations: enabled });
  }

  reset(): void {
    this.config = { ...defaultConfig };
    this.saveToStorage();
    this.applyTheme(this.getResolvedMode());
  }

  subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  init(): void {
    injectV51CSSVariables();
    this.applyTheme(this.getResolvedMode());
  }
}

export const themeManager = new ThemeManagerSingleton();

// ============================================================
// React Context & Hook
// ============================================================

interface V51ThemeContextValue {
  theme: V51ThemeConfig;
  setTheme: (config: Partial<V51ThemeConfig>) => void;
  setMode: (mode: V51ThemeMode) => void;
  toggleDarkMode: () => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setFontSize: (size: number) => void;
  setBorderRadius: (radius: string) => void;
  setDensity: (density: 'compact' | 'normal' | 'comfortable') => void;
  setAnimations: (enabled: boolean) => void;
  reset: () => void;
}

const V51ThemeContext = React.createContext<V51ThemeContextValue | null>(null);

export const V51ThemeProvider: React.FC<{ children: React.ReactNode; initOnMount?: boolean }> = ({
  children,
  initOnMount = true,
}) => {
  const [theme, setThemeState] = React.useState<V51ThemeConfig>(() => themeManager.getTheme());

  React.useEffect(() => {
    if (initOnMount) {
      themeManager.init();
    }
    const unsubscribe = themeManager.subscribe((newTheme) => {
      setThemeState(newTheme);
    });
    return unsubscribe;
  }, [initOnMount]);

  const value = React.useMemo<V51ThemeContextValue>(
    () => ({
      theme,
      setTheme: (config) => themeManager.setTheme(config),
      setMode: (mode) => themeManager.setMode(mode),
      toggleDarkMode: () => themeManager.toggleDarkMode(),
      setPrimaryColor: (color) => themeManager.setPrimaryColor(color),
      setSecondaryColor: (color) => themeManager.setSecondaryColor(color),
      setFontSize: (size) => themeManager.setFontSize(size),
      setBorderRadius: (radius) => themeManager.setBorderRadius(radius),
      setDensity: (density) => themeManager.setDensity(density),
      setAnimations: (enabled) => themeManager.setAnimations(enabled),
      reset: () => themeManager.reset(),
    }),
    [theme]
  );

  return <V51ThemeContext.Provider value={value}>{children}</V51ThemeContext.Provider>;
};

export const useV51Theme = (): V51ThemeContextValue => {
  const ctx = React.useContext(V51ThemeContext);
  if (!ctx) throw new Error('useV51Theme must be used within V51ThemeProvider');
  return ctx;
};

export { defaultConfig, STORAGE_KEY };
