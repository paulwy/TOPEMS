export type ThemeMode = 'light' | 'dark' | 'cyberpunk';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  shadowColor: string;
  borderRadius: number;
}

export const lightTheme: ThemeConfig = {
  mode: 'light',
  primaryColor: 'var(--color-fallback-ant-blue, var(--color-fallback-ant-blue, #1890ff))',
  secondaryColor: 'var(--color-fallback-ant-green, var(--color-fallback-ant-green, #52c41a))',
  accentColor: 'var(--color-fallback-ant-purple, var(--color-fallback-ant-purple, #722ed1))',
  backgroundColor: 'var(--color-surface, var(--color-primary-foreground, var(--color-primary-foreground, #ffffff)))',
  surfaceColor: 'var(--color-surface, var(--color-primary-foreground, var(--color-primary-foreground, #ffffff)))',
  textColor: 'var(--color-fallback-panel-bg, var(--color-fallback-panel-bg, #1a1a2e))',
  textSecondaryColor: 'var(--color-text-secondary, var(--color-text-secondary, #64748b))',
  borderColor: 'var(--color-fallback-border-light, var(--color-fallback-border-light, #dddddd))',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: 8,
};

export const darkTheme: ThemeConfig = {
  mode: 'dark',
  primaryColor: 'var(--color-fallback-ant-blue, var(--color-fallback-ant-blue, #1890ff))',
  secondaryColor: 'var(--color-fallback-ant-green, var(--color-fallback-ant-green, #52c41a))',
  accentColor: 'var(--color-fallback-ant-purple, var(--color-fallback-ant-purple, #722ed1))',
  backgroundColor: 'var(--color-background, var(--color-background, #080c18))',
  surfaceColor: 'var(--color-fallback-panel-bg, var(--color-fallback-panel-bg, #1a1a2e))',
  textColor: 'var(--color-surface, var(--color-primary-foreground, var(--color-primary-foreground, #ffffff)))',
  textSecondaryColor: 'var(--color-grey-300, var(--color-grey-300, #d1d5db))',
  borderColor: 'var(--color-grey-700, var(--color-grey-700, #374151))',
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: 8,
};

export const cyberpunkTheme: ThemeConfig = {
  mode: 'cyberpunk',
  primaryColor: 'var(--cyber-color-cyan, var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff)))',
  secondaryColor: 'var(--cyber-color-green, var(--cyber-color-green, var(--cyber-color-green, #00ff88)))',
  accentColor: 'var(--cyber-color-magenta, var(--cyber-color-magenta, var(--cyber-color-magenta, #ff00ff)))',
  backgroundColor: 'var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)))',
  surfaceColor: 'var(--color-primary-foreground, var(--color-primary-foreground, #0f172a))',
  textColor: 'var(--color-surface, var(--color-primary-foreground, var(--color-primary-foreground, #ffffff)))',
  textSecondaryColor: 'var(--color-secondary-light, var(--color-secondary-light, #a78bfa))',
  borderColor: 'var(--cyber-color-cyan, var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff)))',
  shadowColor: 'rgba(0, 255, 255, 0.3)',
  borderRadius: 8,
};

export function getThemeByMode(mode: ThemeMode): ThemeConfig {
  switch (mode) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
    case 'cyberpunk':
      return cyberpunkTheme;
    default:
      return lightTheme;
  }
}

export function applyThemeToStyles(theme: ThemeConfig): Record<string, string> {
  return {
    '--topems-primary': theme.primaryColor,
    '--topems-secondary': theme.secondaryColor,
    '--topems-accent': theme.accentColor,
    '--topems-bg': theme.backgroundColor,
    '--topems-surface': theme.surfaceColor,
    '--topems-text': theme.textColor,
    '--topems-text-secondary': theme.textSecondaryColor,
    '--topems-border': theme.borderColor,
    '--topems-shadow': theme.shadowColor,
    '--topems-radius': `${theme.borderRadius}px`,
  };
}