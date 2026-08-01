import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@mui/material';
import type { Plugin } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useNotificationStore } from '@/store';

export interface PluginInstallProgressProps {
  plugin: Plugin;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  onSuccess?: () => void;
}

/**
 * Shared install button + state used by both the marketplace card and the
 * detail dialog. Renders the appropriate label/icon based on install state
 * (installed / installing / free / paid) and surfaces success/failure via
 * the notification store.
 */
export const PluginInstallProgress: React.FC<PluginInstallProgressProps> = ({
  plugin,
  size = 'medium',
  fullWidth = true,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        addNotification({
          title: t('plugin.message.install_success'),
          message: t('plugin.marketplace_page.install_success_message', { name: plugin.name }),
          type: 'success',
        });
        onSuccess?.();
      } else {
        addNotification({
          title: t('plugin.message.install_failed'),
          message: t('plugin.message.install_failed_message'),
          type: 'error',
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      addNotification({
        title: t('plugin.message.install_failed'),
        message: err.message || t('plugin.message.install_failed_short'),
        type: 'error',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const iconSize = size === 'small' ? 16 : 20;

  return (
    <Button
      variant='contained'
      size={size}
      fullWidth={fullWidth}
      disabled={installed || isInstalling}
      onClick={handleInstall}
      startIcon={
        installed ? (
          <CheckCircle sx={{ width: iconSize, height: iconSize }} />
        ) : isInstalling ? (
          <Loader2
            sx={{ width: iconSize, height: iconSize, animation: 'spin 1s linear infinite' }}
          />
        ) : (
          <ShoppingCart sx={{ width: iconSize, height: iconSize }} />
        )
      }
    >
      {installed
        ? t('plugin.common.installed')
        : isInstalling
          ? t('plugin.common.installing')
          : plugin.is_free
            ? t('plugin.common.free_install')
            : t('plugin.common.purchase')}
    </Button>
  );
};

export default PluginInstallProgress;
