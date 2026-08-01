import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MarketplacePlugin } from '../hooks/usePluginManagement';
import PluginInstallStepper from './PluginInstallStepper';
import PluginMarketplaceList from './PluginMarketplaceList';

interface PluginMarketplaceDialogProps {
  open: boolean;
  onClose: () => void;
  // list props
  search: string;
  onSearchChange: (value: string) => void;
  tab: number;
  onTabChange: (value: number) => void;
  plugins: MarketplacePlugin[];
  installedCodes: string[];
  onSelectPlugin: (plugin: MarketplacePlugin) => void;
  // stepper props
  installingPlugin: MarketplacePlugin | null;
  installStep: number;
  installLoading: boolean;
  installError: string | null;
  onInstallNext: () => void;
  onInstallBack: () => void;
}

const PluginMarketplaceDialog: React.FC<PluginMarketplaceDialogProps> = ({
  open,
  onClose,
  search,
  onSearchChange,
  tab,
  onTabChange,
  plugins,
  installedCodes,
  onSelectPlugin,
  installingPlugin,
  installStep,
  installLoading,
  installError,
  onInstallNext,
  onInstallBack,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Store size={24} />
          {t('admin.plugin_management_page.text_a5fdeb')}
        </Box>
      </DialogTitle>
      <DialogContent>
        {installingPlugin ? (
          <PluginInstallStepper
            plugin={installingPlugin}
            step={installStep}
            loading={installLoading}
            error={installError}
            onNext={onInstallNext}
            onBack={onInstallBack}
          />
        ) : (
          <PluginMarketplaceList
            search={search}
            onSearchChange={onSearchChange}
            tab={tab}
            onTabChange={onTabChange}
            plugins={plugins}
            installedCodes={installedCodes}
            onSelectPlugin={onSelectPlugin}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.plugin_management.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PluginMarketplaceDialog;
