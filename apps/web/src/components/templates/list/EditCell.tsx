import React from 'react';
import {
  Checkbox,
  FormControl,
  Input,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import type { ColumnDef } from './types';
import { useTranslation } from 'react-i18next';

export interface EditCellProps<T> {
  column: ColumnDef<T>;
  value: unknown;
  onChange: (value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * 行内编辑单元格
 * 从 ListPageTemplate 中抽离的行内编辑 UI
 */
export function EditCell<T>({ column, value, onChange, onSave, onCancel }: EditCellProps<T>) {
  const inlineEdit = column.inlineEdit;
  const editType = inlineEdit?.type ?? 'text';
  const options = inlineEdit?.options ?? [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  switch (editType) {
    case 'select':
      return (
        <FormControl
          size='small'
          sx={{ width: '100%', minWidth: 120 }}
        >
          <Select
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            onKeyDown={handleKeyDown}
            displayEmpty
          >
            {options.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case 'number':
      return (
        <TextField
          size='small'
          type='number'
          value={value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          autoFocus
          onKeyDown={handleKeyDown}
          sx={{ width: '100%', minWidth: 100 }}
        />
      );

    case 'date':
      return (
        <TextField
          size='small'
          type='date'
          value={value !== undefined ? String(value).split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          onKeyDown={handleKeyDown}
          sx={{ width: '100%', minWidth: 120 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );

    case 'datetime':
      return (
        <TextField
          size='small'
          type='datetime-local'
          value={value !== undefined ? String(value).replace('Z', '') : ''}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          onKeyDown={handleKeyDown}
          sx={{ width: '100%', minWidth: 150 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );

    case 'checkbox':
      return (
        <Checkbox
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          onKeyDown={handleKeyDown}
        />
      );

    case 'text':
    default:
      return (
        <Input
          value={value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          size='small'
          fullWidth
          autoFocus
          onKeyDown={handleKeyDown}
        />
      );
  }
}
