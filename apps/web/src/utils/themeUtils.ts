import { useTheme } from '@mui/material/styles';

export function useDarkAwareValue(lightValue: string, darkValue: string): string {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? darkValue : lightValue;
}

export function invertColor(hex: string): string {
  const r = 255 - parseInt(hex.slice(1, 3), 16);
  const g = 255 - parseInt(hex.slice(3, 5), 16);
  const b = 255 - parseInt(hex.slice(5, 7), 16);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
