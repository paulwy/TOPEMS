import React from 'react';
import { FormControl, Select, MenuItem, TextField, Checkbox, Input } from '@mui/material';
import type { ColumnDef } from './types';

interface InlineEditCellProps<T> {
  column: ColumnDef<T>;
  value: unknown;
  onChange: (value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
