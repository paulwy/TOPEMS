import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UninstallTarget } from '../hooks/usePluginManagement';

interface PluginUninstallDialogProps {
  target: UninstallTarget | null;
  onTierChange: (tier: UninstallTarget['tier']) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  getMessage: (pluginCode: string, tier: UninstallTarget['tier']) => string;
}

const PluginUninstallDialog: React.FC<PluginUninstallDialogProps> = ({
  target,
  onTierChange,
  onClose,
  onConfirm,
  isPending,
  getMessage,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
    >
      <DialogTitle>
        {target?.tier === 'delete'
          ? ` + ${t('admin.plugin_management.permanently_delete_plugin')}`
          : t('admin.plugin_management.uninstall_plugin')}
      </DialogTitle>
      <DialogContent>
        {target && (
          <>
            <Typography sx={{ mb: 3 }}>{getMessage(target.code, target.tier)}</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, mb: 1 }}
              >
                {t('admin.plugin_management_page.text_28766c')}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
              >
                <Button
                  variant={target.tier === 'disable' ? 'contained' : 'outlined'}
                  size='small'
                  onClick={() => onTierChange('disable')}
                >
                  {t('admin.plugin_management_page.text_710ad0')}
                </Button>
                <Button
                  variant={target.tier === 'uninstall' ? 'contained' : 'outlined'}
                  size='small'
                  onClick={() => onTierChange('uninstall')}
                >
                  {t('admin.plugin_management_page.text_81824c')}
                </Button>
                <Button
                  variant={target.tier === 'delete' ? 'contained' : 'outlined'}
                  size='small'
                  color='error'
                  onClick={() => onTierChange('delete')}
                >
                  {t('admin.plugin_management_page.text_732796')}
                </Button>
              </Stack>
            </Box>
            <Typography
              variant='caption'
              color='textSecondary'
            >
              {target.tier === 'disable' && t('admin.plugin_management_page.text_de1a1b')}
              {target.tier === 'uninstall' && t('admin.plugin_management_page.text_028310')}
              {target.tier === 'delete' && t('admin.plugin_management_page.text_7b8249')}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.plugin_management.cancel')}</Button>
        <Button
          onClick={onConfirm}
          variant='contained'
          color={target?.tier === 'delete' ? 'error' : 'primary'}
          disabled={isPending}
        >
          {isPending
            ? t('admin.plugin_management_page.text_2fb90b')
            : target?.tier === 'delete'
              ? t('admin.plugin_management.confirm_delete')
              : t('admin.plugin_management.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PluginUninstallDialog;
