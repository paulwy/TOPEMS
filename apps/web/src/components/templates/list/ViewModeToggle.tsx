import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Columns3, FileText } from 'lucide-react';
import type { ListViewMode } from './types';
import { useTranslation } from 'react-i18next';

export interface ViewModeToggleProps {
  modes: ListViewMode[];
  current: ListViewMode;
  onChange: (mode: ListViewMode) => void;
}

/**
 * 视图模式切换按钮（表格视图 / 卡片视图）
 * 从 ListPageTemplate 中抽离的视图切换 UI
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ modes, current, onChange }) => {
  const { t } = useTranslation();
  if (!modes || modes.length <= 1) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
      <Box sx={{ display: 'inline-flex', bgcolor: 'action.hover', borderRadius: 2, p: 0.5 }}>
        {modes.map((mode) => (
          <Tooltip
            key={mode}
            title={
              mode === 'table'
                ? ` + ${t('components.viewModeToggle.175e01')} + `
                : t('components.viewModeToggle.6cef16')
            }
          >
            <IconButton
              size='small'
              onClick={() => onChange(mode)}
              sx={{
                borderRadius: 1.5,
                bgcolor: current === mode ? 'background.paper' : 'transparent',
                boxShadow: current === mode ? 1 : 'none',
                color: current === mode ? 'primary.main' : 'text.secondary',
                '&:hover': {
                  bgcolor: current === mode ? 'background.paper' : 'action.selected',
                },
              }}
              aria-label='配置列'
            >
              {mode === 'table' ? <Columns3 size={18} /> : <FileText size={18} />}
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
};
