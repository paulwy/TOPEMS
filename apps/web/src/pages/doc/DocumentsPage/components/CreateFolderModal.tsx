import React, { useState, useEffect } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
} from '@mui/material';
import { apiLogger } from '@/utils/logger';

const CreateFolderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentId?: string | null;
  createFolderMutation: UseMutationResult<
    { success: boolean; message?: string },
    Error,
    { name: string; parentId?: string }
  >;
}> = ({ isOpen, onClose, onSuccess, parentId, createFolderMutation }) => {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('文件夹名称不能为空');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const request = { name: folderName.trim() } as { name: string; parentId?: string };
      if (parentId) {
        request.parentId = parentId;
      }
      const response = await createFolderMutation.mutateAsync(request);
      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.message || '创建失败，请重试');
      }
    } catch (err: unknown) {
      apiLogger.error('创建文件夹失败:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || '创建失败，请重试';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
    >
      <DialogContent>
        <DialogTitle>创建文件夹</DialogTitle>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant='body2'
              sx={{ mb: 1 }}
            >
              文件夹名称
            </Typography>
            <TextField
              id='folderName'
              type='text'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder='输入文件夹名称'
              disabled={creating}
              autoFocus
              fullWidth
              size='small'
            />
            {error && (
              <Typography
                variant='body2'
                sx={{ color: 'error.main', fontSize: '0.875rem', mt: 2 }}
              >
                {error}
              </Typography>
            )}
          </Box>
          <DialogActions>
            <Button
              type='button'
              variant='outlined'
              onClick={onClose}
              disabled={creating}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={creating || !folderName.trim()}
            >
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderModal;
