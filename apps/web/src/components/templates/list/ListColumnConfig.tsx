import React from 'react';
import {
  Box,
  Typography,
  Button,
  Popover,
  Switch,
  List,
  ListItem,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { RotateCcw, Check, X } from 'lucide-react';
import type { ColumnDef, ColumnConfig } from './types';

interface ListColumnConfigProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  columns: ColumnDef[];
  columnConfig: ColumnConfig[];
  onVisibilityChange: (columnId: string, visible: boolean) => void;
  onReset: () => void;
  onConfigChange: (config: ColumnConfig[]) => void;
}

export const ListColumnConfig: React.FC<ListColumnConfigProps> = ({
  open,
  anchorEl,
  onClose,
  columns,
  columnConfig,
  onVisibilityChange,
  onReset,
  onConfigChange,
}) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      sx={{ minWidth: 280 }}
    >
      <Box sx={{ p: 2, minWidth: 280, maxWidth: 350 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            配置列显示
          </Typography>
          <Button
            size='small'
            onClick={onReset}
            startIcon={<RotateCcw size={14} />}
          >
            重置
          </Button>
        </Box>

        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2, fontSize: 12 }}
        >
          选择要显示的列
        </Typography>

        <List
          dense
          sx={{ maxHeight: 300, overflow: 'auto' }}
        >
          {columns.map((column) => {
            const config = columnConfig.find((c) => c.id === column.id);
            const isVisible = config ? config.visible : true;

            return (
              <ListItem
                key={column.id}
                sx={{ paddingY: 0.5 }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={isVisible}
                      onChange={(e) => onVisibilityChange(column.id, e.target.checked)}
                      size='small'
                    />
                  }
                  label={column.label || column.header || column.id}
                  sx={{ margin: 0 }}
                />
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            fullWidth
            onClick={() => {
              const allVisible = columns.map((col) => ({
                id: col.id,
                visible: true,
              }));
              onConfigChange(allVisible);
            }}
            startIcon={<Check size={14} />}
          >
            全选
          </Button>
          <Button
            size='small'
            fullWidth
            onClick={() => {
              const allHidden = columns.map((col) => ({
                id: col.id,
                visible: false,
              }));
              onConfigChange(allHidden);
            }}
            startIcon={<X size={14} />}
          >
            全不选
          </Button>
        </Box>
      </Box>
    </Popover>
  );
};
