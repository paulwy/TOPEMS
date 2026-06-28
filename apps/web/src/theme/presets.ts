import type { ThemeOptions } from '@mui/material/styles';

export interface ThemePreset {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  /** Primary color palette override */
  primary?: {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
    main?: string;
    light?: string;
    dark?: string;
    contrastText?: string;
  };
  /** Secondary color palette override */
  secondary?: {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
    main?: string;
    light?: string;
    dark?: string;
    contrastText?: string;
  };
  /** Accent color (used for special emphasis) */
  accent?: string;
  /** Whether this preset uses a dark background by default */
  defaultDark?: boolean;
  /** CSS gradient class name */
  gradientClass?: string;
}

export const themePresets: ThemePreset[] = [
  {
    id: 'default',
    name: 'TOPEMS Blue',
    nameZh: 'TOPEMS 蓝',
    description: '默认主题 — 蓝色主色调，适合制造企业管理系统',
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
  },
  {
    id: 'green',
    name: 'Emerald',
    nameZh: '翡翠绿',
    description: '绿色主色调，适合环保和可持续发展相关业务',
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
  },
  {
    id: 'orange',
    name: 'Amber',
    nameZh: '琥珀橙',
    description: '暖色调主题，适合物流和仓储管理业务',
    primary: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#000000',
    },
  },
  {
    id: 'purple',
    name: 'Violet',
    nameZh: '紫罗兰',
    description: '紫色调主题，适合科研和创新型业务',
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    nameZh: '玫瑰红',
    description: '红色调主题，适合安全和质量管控业务',
    primary: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      main: '#f43f5e',
      light: '#fb7185',
      dark: '#e11d48',
      contrastText: '#ffffff',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    nameZh: '青碧',
    description: '青色主色调，适合海洋和港口相关业务',
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      main: '#14b8a6',
      light: '#2dd4bf',
      dark: '#0d9488',
      contrastText: '#ffffff',
    },
  },
];

export const getPresetById = (id: string): ThemePreset | undefined =>
  themePresets.find((p) => p.id === id);

export const getPresetColors = (preset: ThemePreset) => ({
  primary: preset.primary || themePresets[0].primary!,
  secondary: preset.secondary || themePresets[0].secondary!,
});
