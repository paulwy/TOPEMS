import React from 'react';
import { Box, Typography, Paper, IconButton, Checkbox, TextField } from '@mui/material';
import { Plus, MoveVertical, Trash2 } from 'lucide-react';
import type { DataSourceField, SelectedField } from '../types';

interface FieldSelectorProps {
  unselectedFields: DataSourceField[];
  selectedFields: SelectedField[];
  handleAddField: (field: DataSourceField) => void;
  handleRemoveField: (fieldId: string) => void;
  handleReorderFields: (fromIndex: number, toIndex: number) => void;
  handleFieldUpdate: (fieldId: string, updates: Partial<SelectedField>) => void;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  unselectedFields,
  selectedFields,
  handleAddField,
  handleRemoveField,
  handleReorderFields,
  handleFieldUpdate,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 1, color: 'grey.600' }}
        >
          可用字段
        </Typography>
        <Paper sx={{ p: 1, maxHeight: 300, overflowY: 'auto', borderRadius: 1 }}>
          {unselectedFields.length === 0 ? (
            <Typography
              variant='caption'
              sx={{ p: 2, display: 'block', color: 'grey.400' }}
            >
              所有字段已添加
            </Typography>
          ) : (
            unselectedFields.map((field) => (
              <Box
                key={field.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {field.label}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.400' }}
                  >
                    {field.type}
                  </Typography>
                </Box>
                <IconButton
                  size='small'
                  onClick={() => handleAddField(field)}
                  sx={{ p: 0.5 }}
                aria-label="新增"
                >
                  <Plus sx={{ width: 16, height: 16, color: 'primary.main' }} />
                </IconButton>
              </Box>
            ))
          )}
        </Paper>
      </Box>

      <Box sx={{ flex: 1, minWidth: 250 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, color: 'grey.600' }}
          >
            已选字段 ({selectedFields.length})
          </Typography>
          <Typography
            variant='caption'
            sx={{ color: 'grey.400' }}
          >
            拖拽排序
          </Typography>
        </Box>
        <Paper sx={{ p: 1, maxHeight: 300, overflowY: 'auto', borderRadius: 1 }}>
          {selectedFields.length === 0 ? (
            <Typography
              variant='caption'
              sx={{ p: 2, display: 'block', color: 'grey.400' }}
            >
              请从左侧添加字段
            </Typography>
          ) : (
            selectedFields.map((field, index) => (
              <Box
                key={field.fieldId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: 'grey.50',
                }}
              >
                <IconButton
                  size='small'
                  aria-label='拖拽排序'
                  sx={{ p: 0.5, cursor: 'move', opacity: 0.5 }}
                  onMouseDown={() => {
                    const handleDragOver = (e: DragEvent) => {
                      e.preventDefault();
                    };
                    const handleDrop = (e: DragEvent) => {
                      e.preventDefault();
                      if (e.dataTransfer) {
                        const targetIndex = parseInt(e.dataTransfer.getData('index'));
                        handleReorderFields(index, targetIndex);
                      }
                    };
                    document.addEventListener('dragover', handleDragOver);
                    document.addEventListener('drop', handleDrop);
                  }}
                >
                  <MoveVertical sx={{ width: 14, height: 14 }} />
                </IconButton>
                <Checkbox
                  checked={field.visible}
                  onChange={(e) => handleFieldUpdate(field.fieldId, { visible: e.target.checked })}
                  size='small'
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    size='small'
                    value={field.label}
                    onChange={(e) => handleFieldUpdate(field.fieldId, { label: e.target.value })}
                    sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                  />
                </Box>
                <IconButton
                  size='small'
                  onClick={() => handleRemoveField(field.fieldId)}
                  sx={{ p: 0.5 }}
                aria-label="删除"
                >
                  <Trash2 sx={{ width: 14, height: 14, color: 'error.main' }} />
                </IconButton>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Box>
  );
};
