import React from 'react';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import { FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ExportFormat = 'csv' | 'excel' | 'json';
export type ExportScope = 'current' | 'all' | 'selected';

export interface ExportMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  exporting?: boolean;
  exportComplete?: boolean;
  formats: ExportFormat[];
  scopes: ExportScope[];
  selectedCount: number;
  onExport: (format: ExportFormat, scope: ExportScope) => void;
}

/**
 * 导出菜单组件
 * 从 ListPageTemplate 中抽离的导出菜单 UI
 */
const ExportMenu: React.FC<ExportMenuProps> = ({
  anchorEl,
  open,
  onClose,
  formats,
  scopes,
  selectedCount,
  onExport,
}) => {
  const { t } = useTranslation();
  const renderFormatItems = (scope: ExportScope, disabled = false) =>
    formats.map((fmt) => {
      const icon =
        fmt === 'csv' ? (
          <FileText style={{ width: 16, height: 16 }} />
        ) : fmt === 'json' ? (
          <FileJson style={{ width: 16, height: 16 }} />
        ) : (
          <FileSpreadsheet style={{ width: 16, height: 16 }} />
        );
      const labelKey =
        fmt === 'csv'
          ? 'components.exportMenu.csvFormat'
          : fmt === 'json'
            ? 'components.exportMenu.jsonFormat'
            : 'components.exportMenu.excelFormat';
      const label = t(labelKey);
      return (
        <MenuItem
          key={`${scope}-${fmt}`}
          onClick={() => onExport(fmt, scope)}
          disabled={disabled}
        >
          <ListItemIcon>{icon}</ListItemIcon>
          <ListItemText>{label}</ListItemText>
        </MenuItem>
      );
    });

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      sx={{ '& .MuiMenu-paper': { minWidth: 200 } }}
    >
      {scopes.includes('current') && (
        <>
          <MenuItem
            disabled
            sx={{ pointerEvents: 'none', opacity: 0.6 }}
          >
            <ListItemText sx={{ fontWeight: 600, fontSize: 12 }}>
              <Typography component='span'>{t('components.exportMenu.currentPage')}</Typography>
            </ListItemText>
          </MenuItem>
          {renderFormatItems('current')}
        </>
      )}
      {(scopes.includes('all') || scopes.includes('selected')) && <Divider sx={{ my: 0.5 }} />}
      {scopes.includes('selected') && (
        <>
          <MenuItem
            disabled
            sx={{ pointerEvents: 'none', opacity: 0.6 }}
          >
            <ListItemText sx={{ fontWeight: 600, fontSize: 12 }}>
              <Typography component='span'>
                {t('components.exportMenu.selectedItems', { count: selectedCount })}
              </Typography>
            </ListItemText>
          </MenuItem>
          {renderFormatItems('selected', selectedCount === 0)}
        </>
      )}
    </Menu>
  );
};
