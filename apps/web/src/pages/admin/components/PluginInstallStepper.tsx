import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { CheckCircle, Download, GitBranch, Shield } from 'lucide-react';
import type { MarketplacePlugin } from '../hooks/usePluginManagement';
interface PluginInstallStepperProps {
  plugin: MarketplacePlugin;
  step: number;
  loading: boolean;
  error: string | null;
  onNext: () => void;
  onBack: () => void;
}
const PluginInstallStepper: React.FC<PluginInstallStepperProps> = ({
  plugin,
  step,
  loading,
  error,
  onNext,
  onBack,
}) => {
  return (
    <Box>
      <Stepper
        activeStep={step}
        sx={{ mb: 3 }}
      >
        <Step>
          <StepLabel>{i18n.t('admin.plugin_management.confirm')}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{i18n.t('admin.plugin_management.install')}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{i18n.t('admin.plugin_management.done')}</StepLabel>
        </Step>
      </Stepper>
      {step === 0 && (
        <Box>
          <Typography
            variant='h6'
            gutterBottom
          >
            {i18n.t('admin.plugin_management_page.text_bc8cd3')}
          </Typography>
          <Typography
            variant='body1'
            sx={{ mb: 2 }}
          >
            {i18n.t('admin.plugin_management_page.text_bad7b0')}
          </Typography>
          <Box sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {plugin.name}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {plugin.description}
            </Typography>
            <Stack
              direction='row'
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GitBranch size={14} />
                <Typography variant='caption'>
                  {i18n.t('admin.plugin_management_page.text_e9685f')} {plugin.latest_version}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Download size={14} />
                <Typography variant='caption'>
                  {i18n.t('admin.plugin_management_page.text_47bc83')} {plugin.downloads}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {i18n.t('admin.plugin_management_page.text_44d55a')}
          </Typography>
          <List dense>
            {plugin.permissions.map((perm) => (
              <ListItem
                key={perm.code}
                disableGutters
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Shield size={14} />
                </ListItemIcon>
                <ListItemText
                  primary={perm.name}
                  secondary={perm.code}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      {step === 1 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          {loading ? (
            <>
              <CircularProgress
                size={48}
                sx={{ mb: 2 }}
              />
              <Typography>
                {i18n.t('admin.plugin_management_page.text_e94719')} {plugin.name}...
              </Typography>
            </>
          ) : error ? (
            <Alert
              severity='error'
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          ) : null}
        </Box>
      )}
      {step === 2 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle
            size={64}
            color='green'
            style={{ marginBottom: 16 }}
          />
          <Typography
            variant='h6'
            gutterBottom
          >
            {i18n.t('admin.plugin_management_page.text_176e15')}
          </Typography>
          <Typography color='text.secondary'>
            {plugin.name} {i18n.t('admin.plugin_management_page.text_45f0ab')}
          </Typography>
        </Box>
      )}
      <Stack
        direction='row'
        spacing={2}
        sx={{ justifyContent: 'flex-end', mt: 3 }}
      >
        {step > 0 && step < 2 && (
          <Button
            onClick={onBack}
            disabled={loading}
          >
            {i18n.t('admin.plugin_management_page.text_eeb690')}
          </Button>
        )}
        {step < 2 ? (
          <Button
            variant='contained'
            onClick={onNext}
            disabled={loading}
          >
            {step === 0 ? i18n.t('admin.plugin_management.next') : i18n.t('admin.plugin_management.install')}
          </Button>
        ) : (
          <Button
            variant='contained'
            onClick={onNext}
          >
            {i18n.t('admin.plugin_management_page.text_769d88')}
          </Button>
        )}
      </Stack>
    </Box>
  );
};
export default PluginInstallStepper;