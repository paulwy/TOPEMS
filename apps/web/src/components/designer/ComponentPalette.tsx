import { designTokens } from '@topems/tokens';
/**
 * ComponentPalette — 组件面板
 *
 * 显示可用组件列表，支持拖拽到画布。
 * 按分类分组显示。
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import i18n from '@/i18n';
import { LazyIcon } from '@/components/icons/LazyIcon';
import { BUILTIN_COMPONENTS, type DesignerComponent, type ComponentCategory } from './types';

interface ComponentPaletteProps {
  /** 拖拽开始回调 */
  onDragStart?: (component: DesignerComponent) => void;
  /** 拖拽结束回调 */
  onDragEnd?: () => void;
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  layout: i18n.t('components.component_palette.k0'),
  form: i18n.t('components.component_palette.k1'),
  display: i18n.t('components.component_palette.k2'),
  action: i18n.t('components.component_palette.k3'),
  chart: i18n.t('components.component_palette.k4'),
  custom: i18n.t('components.component_palette.k5'),
};

const CATEGORY_ORDER: ComponentCategory[] = [
  'layout',
  'form',
  'display',
  'action',
  'chart',
  'custom',
];

export function ComponentPalette({ onDragStart, onDragEnd }: ComponentPaletteProps) {
  const grouped = React.useMemo(() => {
    const map = new Map<ComponentCategory, DesignerComponent[]>();
    for (const comp of BUILTIN_COMPONENTS) {
      const list = map.get(comp.category) ?? [];
      list.push(comp);
      map.set(comp.category, list);
    }
    return map;
  }, []);

  const handleDragStart = (e: React.DragEvent, comp: DesignerComponent) => {
    e.dataTransfer.setData('component-type', comp.type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(comp);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <Paper
      elevation={1}
      sx={{
        width: 240,
        height: '100%',
        overflow: 'auto',
        p: 1.5,
        borderRadius: 2,
      }}
    >
      <Typography
        variant='subtitle2'
        sx={{ mb: 1.5, fontWeight: 600 }}
      >
        {i18n.t('components.component_palette.k0')}
      </Typography>

      {CATEGORY_ORDER.map((category) => {
        const comps = grouped.get(category);
        if (!comps || comps.length === 0) return null;

        return (
          <Box
            key={category}
            sx={{ mb: 2 }}
          >
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}
            >
              {CATEGORY_LABELS[category]}
            </Typography>
            <List
              dense
              disablePadding
            >
              {comps.map((comp) => {
                const iconName = comp.icon || null;

                return (
                  <ListItem
                    key={comp.type}
                    disablePadding
                    sx={{ py: 0.25 }}
                  >
                    <ListItemButton
                      draggable
                      onDragStart={(e) => handleDragStart(e, comp)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        borderRadius: 1,
                        py: 0.5,
                        cursor: 'grab',
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:active': { cursor: 'grabbing' },
                      }}
                    >
                      {iconName && (
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <LazyIcon
                            name={iconName}
                            size={16}
                          />
                        </ListItemIcon>
                      )}
                      <ListItemText
                        primary={comp.label}
                        slotProps={{ primary: { sx: { fontSize: designTokens.typography.fontSize.scale['0.8rem'] } } }}
                      />
                      {comp.isContainer && (
                        <Chip
                          size='small'
                          label={i18n.t('components.component_palette.k6')}
                          sx={{ fontSize: designTokens.typography.fontSize.scale['0.6rem'], height: 18 }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        );
      })}

      <Divider sx={{ my: 1 }} />

      <Typography
        variant='caption'
        sx={{ color: 'text.secondary' }}
      >
        {i18n.t('components.component_palette.k1')}
      </Typography>
    </Paper>
  );
}
