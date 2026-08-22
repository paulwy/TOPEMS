import { designTokens } from '@topems/tokens';
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
import i18n from '@/i18n';
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
      setError(i18n.t('pages.create_folder_modal.k0'));
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
        setError(response.message || i18n.t('pages.create_folder_modal.k1'));
      }
    } catch (err: unknown) {
      apiLogger.error(i18n.t('pages.create_folder_modal.k0'), err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        error.response?.data?.message || error.message || i18n.t('pages.create_folder_modal.k2');
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
        <DialogTitle>{i18n.t('pages.create_folder_modal.k3')}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant='body2'
              sx={{ mb: 1 }}
            >
              {i18n.t('pages.create_folder_modal.k0')}
            </Typography>
            <TextField
              id='folderName'
              type='text'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={i18n.t('pages.create_folder_modal.k4')}
              disabled={creating}
              autoFocus
              fullWidth
              size='small'
            />
            {error && (
              <Typography
                variant='body2'
                sx={{ color: 'error.main', fontSize: designTokens.typography.fontSize.scale['0.875rem'], mt: 2 }}
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
              {i18n.t('pages.create_folder_modal.k1')}
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={creating || !folderName.trim()}
            >
              {creating
                ? i18n.t('pages.create_folder_modal.k1')
                : i18n.t('pages.create_folder_modal.k5')}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderModal;
