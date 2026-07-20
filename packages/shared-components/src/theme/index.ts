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
  primaryColor: '#1890ff',
  secondaryColor: '#52c41a',
  accentColor: '#722ed1',
  backgroundColor: '#ffffff',
  surfaceColor: '#ffffff',
  textColor: '#1f1f1f',
  textSecondaryColor: '#8c8c8c',
  borderColor: '#d9d9d9',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: 8,
};

export const darkTheme: ThemeConfig = {
  mode: 'dark',
  primaryColor: '#1890ff',
  secondaryColor: '#52c41a',
  accentColor: '#722ed1',
  backgroundColor: '#141414',
  surfaceColor: '#1f1f1f',
  textColor: '#ffffff',
  textSecondaryColor: '#bfbfbf',
  borderColor: '#434343',
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: 8,
};

export const cyberpunkTheme: ThemeConfig = {
  mode: 'cyberpunk',
  primaryColor: '#00ffff',
  secondaryColor: '#00ff88',
  accentColor: '#ff00ff',
  backgroundColor: '#0a0a1a',
  surfaceColor: '#12122a',
  textColor: '#ffffff',
  textSecondaryColor: '#a0a0ff',
  borderColor: '#00ffff',
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