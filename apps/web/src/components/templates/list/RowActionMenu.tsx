import React from 'react';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import type { RowAction } from './types';

export interface RowActionMenuProps<T = any> {
  anchorEl: HTMLElement | null;
  open: boolean;
  selectedRow: T | null;
  actions?: RowAction<T>[];
  onClose: () => void;
  onAction: (action: RowAction<T>) => void;
}

/**
 * 行操作下拉菜单
 * 从 ListPageTemplate 中抽离的行操作菜单 UI
 */
export function RowActionMenu<T = any>({
  anchorEl,
  open,
  selectedRow,
  actions,
  onClose,
  onAction,
}: RowActionMenuProps<T>) {
  if (!actions || actions.length === 0) return null;

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      {actions.map((action, index) => {
        if (action.show && selectedRow && !action.show(selectedRow)) return null;

        return (
          <React.Fragment key={index}>
            {action.divider && <Divider />}
            <MenuItem onClick={() => onAction(action)}>
              {action.icon && (
                <ListItemIcon sx={{ color: `${action.color}.main` }}>{action.icon}</ListItemIcon>
              )}
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          </React.Fragment>
        );
      })}
    </Menu>
  );
}
