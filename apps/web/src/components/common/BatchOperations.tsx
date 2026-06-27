import React, { useRef, useEffect } from 'react';
import { Box, Checkbox, Typography, Button } from '@mui/material';

export interface BatchAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'primary' | 'danger' | 'success' | 'warning' | 'default';
  disabled?: boolean;
}

interface BatchOperationsProps {
  selectedIds: string[];
  allItemsSelected: boolean;
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  actions: BatchAction[];
  onAction: (_actionId: string) => void;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedIds,
  allItemsSelected,
  totalItems,
  onSelectAll,
  onDeselectAll,
  actions,
  onAction,
}) => {
  const hasSelection = selectedIds.length > 0;
  const isIndeterminate = !allItemsSelected && hasSelection;

  const checkboxRef1 = useRef<HTMLButtonElement>(null);
  const checkboxRef2 = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const input1 = checkboxRef1.current?.querySelector('input');
    const input2 = checkboxRef2.current?.querySelector('input');
    if (input1) {
      input1.indeterminate = isIndeterminate;
    }
    if (input2) {
      input2.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const getButtonColor = (color: string) => {
    switch (color) {
      case 'primary':
        return 'primary';
      case 'danger':
        return 'error';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'inherit';
    }
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          bgcolor: 'grey.50',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Checkbox
            ref={checkboxRef1}
            checked={allItemsSelected}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectAll();
              } else {
                onDeselectAll();
              }
            }}
            size='small'
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {allItemsSelected ? '取消全选' : '全选'}
          </Typography>
          {hasSelection && (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                bgcolor: 'primary.light',
                color: 'primary.dark',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              已选择 {selectedIds.length} 项
            </Box>
          )}
          {!hasSelection && (
            <Typography
              variant='body2'
              color='text.disabled'
            >
              共 {totalItems} 项
            </Typography>
          )}
        </Box>

        {hasSelection && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actions.map((action) => (
              <Button
                key={action.id}
                onClick={() => onAction(action.id)}
                disabled={action.disabled}
                variant='contained'
                color={getButtonColor(action.color)}
                size='small'
                startIcon={action.icon}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ width: '48px' }}>
        <Checkbox
          ref={checkboxRef2}
          checked={allItemsSelected}
          onChange={(e) => {
            if (e.target.checked) {
              onSelectAll();
            } else {
              onDeselectAll();
            }
          }}
          size='small'
        />
      </Box>

      <Box sx={{ width: '48px' }}>
        <Checkbox size='small' />
      </Box>
    </>
  );
};

export { BatchOperations };
export default BatchOperations;
