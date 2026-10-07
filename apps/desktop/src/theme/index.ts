import { createTheme } from '@mui/material/styles';
import { ThemeOptions } from '@mui/material';
import { designTokens } from '@topems/tokens';

export type ThemeMode = 'light' | 'dark';

export const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5252',
      dark: '#9a0036',
    },
    background: {
      default: designTokens.colors.surface[100],
      paper: designTokens.colors.background.paper,
    },
    text: {
      primary: '#1a202c',
      secondary: '#4a5568',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
};

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#42a5f5',
      light: '#64b5f6',
      dark: '#1e88e5',
    },
    secondary: {
      main: '#ff5252',
      light: '#ff7979',
      dark: '#e53935',
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
    text: {
      primary: designTokens.colors.common.white,
      secondary: '#b0bec5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
};

export const createAppTheme = (mode: ThemeMode) => {
  return createTheme(mode === 'light' ? lightThemeOptions : darkThemeOptions);
};