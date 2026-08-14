import React from 'react';
import { Box, Typography, Button, ButtonGroup, useTheme } from '@mui/material';
import { X } from 'lucide-react';
import type { BatchAction } from './types';

interface ListBatchActionsProps<T = any> {
  show: boolean;
  selectedCount: number;
  selectedRows: T[];
  onClearSelection: () => void;
  batchActions: BatchAction<T>[];
  onBatchAction: (action: BatchAction<T>) => void;
  sticky?: boolean;
}

export const ListBatchActions = <T,>({
  show,
  selectedCount,
  selectedRows,
  onClearSelection,
  batchActions,
  onBatchAction,
  sticky = true,
}: ListBatchActionsProps<T>) => {
  const theme = useTheme();
  if (!show || selectedCount === 0) return null;

  const availableActions = batchActions.filter((action) => {
    if (action.minSelected && selectedCount < action.minSelected) {
      return false;
    }
    if (action.showWhenSelected === false) {
      return false;
    }
    return true;
  });

  const isActionDisabled = (action: BatchAction<T>) => {
    if (action.disabled) return true;
    if (action.disabledWhen && selectedRows.length > 0) {
      return action.disabledWhen(selectedRows);
    }
    return false;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        p: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'background.selectedDark' : 'primary.50',
        borderRadius: 1,
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.3)' : 'primary.200',
        position: sticky ? 'sticky' : 'static',
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 100 : undefined,
        boxShadow: sticky ? theme.shadows[2] : undefined,
      }}
    >
      <Typography
        variant='body2'
        sx={{ fontWeight: 500, color: 'primary.main' }}
      >
        已选择 {selectedCount} 条记录
      </Typography>

      <Button
        size='small'
        variant='outlined'
        onClick={onClearSelection}
        startIcon={<X size={16} />}
      >
        取消选择
      </Button>

      {availableActions.length > 0 && (
        <ButtonGroup
          size='small'
          variant='outlined'
        >
          {availableActions.map((action, index) => (
            <Button
              key={index}
              color={action.color || 'primary'}
              startIcon={action.icon}
              onClick={() => onBatchAction(action)}
              disabled={isActionDisabled(action)}
            >
              {action.label}
            </Button>
          ))}
        </ButtonGroup>
      )}
    </Box>
  );
};
