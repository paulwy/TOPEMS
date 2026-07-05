import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Popover,
  IconButton,
  Tooltip,
  Card,
  CardActionArea,
  Stack,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { Palette } from 'lucide-react';
import { themePresets, getPresetById, type ThemePreset } from '@/theme/presets';

const STORAGE_KEY = 'topems-theme-preset';

interface ThemePresetSwitcherProps {
  sx?: SxProps<Theme>;
}

function applyPresetToCSS(preset: ThemePreset) {
  const root = document.documentElement;
  if (preset.primary) {
    const p = preset.primary;
    root.style.setProperty('--preset-primary-50', p[50] || '');
    root.style.setProperty('--preset-primary-100', p[100] || '');
    root.style.setProperty('--preset-primary-200', p[200] || '');
    root.style.setProperty('--preset-primary-300', p[300] || '');
    root.style.setProperty('--preset-primary-400', p[400] || '');
    root.style.setProperty('--preset-primary-500', p[500] || '');
    root.style.setProperty('--preset-primary-600', p[600] || '');
    root.style.setProperty('--preset-primary-700', p[700] || '');
    root.style.setProperty('--preset-primary-800', p[800] || '');
    root.style.setProperty('--preset-primary-900', p[900] || '');
    root.style.setProperty('--preset-primary-main', p.main || '');
    root.style.setProperty('--preset-primary-light', p.light || '');
    root.style.setProperty('--preset-primary-dark', p.dark || '');
    root.style.setProperty('--preset-primary-contrastText', p.contrastText || '');
  }
  if (preset.secondary) {
    const s = preset.secondary;
    root.style.setProperty('--preset-secondary-50', s[50] || '');
    root.style.setProperty('--preset-secondary-100', s[100] || '');
    root.style.setProperty('--preset-secondary-200', s[200] || '');
    root.style.setProperty('--preset-secondary-300', s[300] || '');
    root.style.setProperty('--preset-secondary-400', s[400] || '');
    root.style.setProperty('--preset-secondary-500', s[500] || '');
    root.style.setProperty('--preset-secondary-600', s[600] || '');
    root.style.setProperty('--preset-secondary-700', s[700] || '');
    root.style.setProperty('--preset-secondary-800', s[800] || '');
    root.style.setProperty('--preset-secondary-900', s[900] || '');
    root.style.setProperty('--preset-secondary-main', s.main || '');
    root.style.setProperty('--preset-secondary-light', s.light || '');
    root.style.setProperty('--preset-secondary-dark', s.dark || '');
    root.style.setProperty('--preset-secondary-contrastText', s.contrastText || '');
  }
  if (preset.accent) {
    root.style.setProperty('--preset-accent', preset.accent);
  }
  root.setAttribute('data-theme-preset', preset.id);
}

function resetPresetCSS() {
  const root = document.documentElement;
  const props = Array.from(root.style).filter((p) => p.startsWith('--preset-'));
  props.forEach((p) => root.style.removeProperty(p));
  root.removeAttribute('data-theme-preset');
}

export function ThemePresetSwitcher({ sx }: ThemePresetSwitcherProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activePreset, setActivePreset] = useState<string>('default');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const preset = getPresetById(stored);
      if (preset) {
        setActivePreset(stored);
        applyPresetToCSS(preset);
      }
    }
  }, []);

  const handlePresetChange = useCallback((preset: ThemePreset) => {
    setActivePreset(preset.id);
    localStorage.setItem(STORAGE_KEY, preset.id);
    if (preset.id === 'default') {
      resetPresetCSS();
    } else {
      applyPresetToCSS(preset);
    }
    setAnchorEl(null);
  }, []);

  return (
    <Box sx={sx}>
      <Tooltip title='切换主题配色'>
        <IconButton
          size='small'
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Palette size={18} />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, minWidth: 320 } } }}
      >
        <Typography
          variant='subtitle2'
          sx={{ mb: 1.5 }}
        >
          选择主题配色
        </Typography>
        <Stack spacing={1}>
          {themePresets.map((preset) => (
            <Card
              key={preset.id}
              elevation={0}
              sx={{
                border: `2px solid ${activePreset === preset.id ? preset.primary?.main || 'primary.main' : 'transparent'}`,
                borderRadius: 3,
                transition: 'border-color 0.2s',
              }}
            >
              <CardActionArea
                onClick={() => handlePresetChange(preset)}
                sx={{ p: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {/* Color preview swatches */}
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    {[
                      preset.primary?.[100],
                      preset.primary?.[300],
                      preset.primary?.[500],
                      preset.primary?.[700],
                      preset.primary?.[900],
                    ].map((color, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          backgroundColor: color || 'grey.300',
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      component='span'
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {preset.nameZh}
                    </Typography>
                    <Typography
                      component='span'
                      variant='caption'
                      color='text.secondary'
                    >
                      {preset.description}
                    </Typography>
                  </Box>
                  {activePreset === preset.id && (
                    <Typography
                      component='span'
                      variant='caption'
                      color='primary.main'
                      sx={{ fontWeight: 600 }}
                    >
                      当前
                    </Typography>
                  )}
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Popover>
    </Box>
  );
}

export default ThemePresetSwitcher;
