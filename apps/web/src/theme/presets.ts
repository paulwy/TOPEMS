import type { ThemeOptions } from '@mui/material/styles';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

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
    nameZh: i18n.t('theme.presets.topems_0'),
    description: i18n.t('theme.presets.k1'),
    primary: {
      50: designTokens.colors.primary[50],
      100: 'colors.primary.100',
      200: '#bfdbfe',
      300: 'colors.primary.300',
      400: 'colors.primary.400',
      500: designTokens.colors.primary.main,
      600: 'colors.primary.dark',
      700: 'colors.primary.700',
      800: '#1e40af',
      900: designTokens.colors.primary[900],
      main: designTokens.colors.primary.main,
      light: 'colors.primary.400',
      dark: 'colors.primary.dark',
      contrastText: designTokens.colors.background.paper,
    },
  },
  {
    id: 'green',
    name: 'Emerald',
    nameZh: i18n.t('theme.presets.k2'),
    description: i18n.t('theme.presets.k3'),
    primary: {
      50: 'colors.success.50',
      100: 'colors.success.100',
      200: designTokens.colors.success[200],
      300: '#6ee7b7',
      400: '#34d399',
      500: designTokens.colors.success.dark,
      600: designTokens.colors.success.dark,
      700: designTokens.colors.success[700],
      800: 'colors.success.dark',
      900: '#064e3b',
      main: designTokens.colors.success.dark,
      light: '#34d399',
      dark: designTokens.colors.success.dark,
      contrastText: designTokens.colors.background.paper,
    },
  },
  {
    id: 'orange',
    name: 'Amber',
    nameZh: i18n.t('theme.presets.k4'),
    description: i18n.t('theme.presets.k5'),
    primary: {
      50: designTokens.colors.warning[50],
      100: 'colors.warning.100',
      200: 'colors.warning.200',
      300: '#fcd34d',
      400: 'colors.warning.400',
      500: designTokens.colors.warning.main,
      600: designTokens.colors.warning.dark,
      700: designTokens.colors.warning[700],
      800: 'colors.orange.800',
      900: '#78350f',
      main: designTokens.colors.warning.main,
      light: 'colors.warning.400',
      dark: designTokens.colors.warning.dark,
      contrastText: 'colors.common.black',
    },
  },
  {
    id: 'purple',
    name: 'Violet',
    nameZh: i18n.t('theme.presets.k6'),
    description: i18n.t('theme.presets.k7'),
    primary: {
      50: 'colors.secondary.50',
      100: 'colors.secondary.100',
      200: 'colors.secondary.200',
      300: 'colors.secondary.300',
      400: 'colors.secondary.light',
      500: designTokens.colors.secondary.main,
      600: 'colors.secondary.dark',
      700: designTokens.colors.secondary[700],
      800: '#5b21b6',
      900: '#4c1d95',
      main: designTokens.colors.secondary.main,
      light: 'colors.secondary.light',
      dark: 'colors.secondary.dark',
      contrastText: designTokens.colors.background.paper,
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    nameZh: i18n.t('theme.presets.k8'),
    description: i18n.t('theme.presets.k9'),
    primary: {
      50: `${designTokens.colors.common.white}1f2`,
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: designTokens.colors.error[500],
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      main: designTokens.colors.error[500],
      light: '#fb7185',
      dark: '#e11d48',
      contrastText: designTokens.colors.background.paper,
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    nameZh: i18n.t('theme.presets.k10'),
    description: i18n.t('theme.presets.k11'),
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: 'colors.teal.400',
      500: 'colors.teal.500',
      600: 'colors.teal.600',
      700: designTokens.colors.teal[700],
      800: '#115e59',
      900: '#134e4a',
      main: 'colors.teal.500',
      light: 'colors.teal.400',
      dark: 'colors.teal.600',
      contrastText: designTokens.colors.background.paper,
    },
  },
];

export const getPresetById = (id: string): ThemePreset | undefined =>
  themePresets.find((p) => p.id === id);

export const getPresetColors = (preset: ThemePreset) => ({
  primary: preset.primary || themePresets[0].primary!,
  secondary: preset.secondary || themePresets[0].secondary!,
});
