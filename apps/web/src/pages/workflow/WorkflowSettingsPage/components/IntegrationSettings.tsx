import {
  Box,
  Typography,
  Switch,
  TextField,
  Stack,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import i18n from '@/i18n';
import React from 'react';
import type { IntegrationSettings as IntegrationSettingsType } from '../types';

interface IntegrationSettingsProps {
  settings: IntegrationSettingsType;
  onChange: (settings: IntegrationSettingsType) => void;
  markUnsaved: () => void;
}

export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  settings,
  onChange,
  markUnsaved,
}) => {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          {i18n.t('pages.integration_settings.k0')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {i18n.t('pages.integration_settings.webhook_1')}
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {i18n.t('pages.integration_settings.k2')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.integration_settings.k3')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableCallback}
              onChange={(e) => {
                onChange({
                  ...settings,
                  enableCallback: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label={i18n.t('pages.integration_settings.k0')}
            value={settings.callbackUrl}
            onChange={(e) => {
              onChange({
                ...settings,
                callbackUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder='https://example.com/api/callback'
            disabled={!settings.enableCallback}
          />
          <TextField
            fullWidth
            label={i18n.t('pages.integration_settings.token_1')}
            value={settings.callbackToken}
            onChange={(e) => {
              onChange({
                ...settings,
                callbackToken: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            type='password'
            placeholder={i18n.t('pages.integration_settings.token_2')}
            disabled={!settings.enableCallback}
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Webhook
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {i18n.t('pages.integration_settings.webhook_4')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.integration_settings.k5')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableWebhook}
              onChange={(e) => {
                onChange({
                  ...settings,
                  enableWebhook: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label={i18n.t('pages.integration_settings.webhook_6')}
            value={settings.webhookUrl}
            onChange={(e) => {
              onChange({
                ...settings,
                webhookUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder={i18n.t('pages.integration_settings.webhook_3')}
            disabled={!settings.enableWebhook}
            helperText={i18n.t('pages.integration_settings.k4')}
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.integration_settings.k7')}
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {i18n.t('pages.integration_settings.erp_8')}
            </Typography>
            <Switch
              checked={settings.enableErpSync}
              onChange={(e) => {
                onChange({
                  ...settings,
                  enableErpSync: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <FormControl
            fullWidth
            size='small'
            disabled={!settings.enableErpSync}
          >
            <InputLabel>ERP 系统类型</InputLabel>
            <Select
              value={settings.erpSystem}
              label={i18n.t('pages.integration_settings.erp_9')}
              onChange={(e) => {
                onChange({
                  ...settings,
                  erpSystem: e.target.value,
                });
                markUnsaved();
              }}
            >
              <MenuItem value='none'>{i18n.t('pages.integration_settings.k10')}</MenuItem>
              <MenuItem value='sap'>SAP</MenuItem>
              <MenuItem value='oracle'>Oracle EBS</MenuItem>
              <MenuItem value='ufida'>{i18n.t('pages.integration_settings.k5')}</MenuItem>
              <MenuItem value='kingdee'>{i18n.t('pages.integration_settings.k6')}</MenuItem>
              <MenuItem value='custom'>{i18n.t('pages.integration_settings.k7')}</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.integration_settings.api_11')}
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {i18n.t('pages.integration_settings.api_12')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.integration_settings.api_13')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableApiAccess}
              onChange={(e) => {
                onChange({
                  ...settings,
                  enableApiAccess: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label={i18n.t('pages.integration_settings.k14')}
            value={settings.apiRateLimit}
            onChange={(e) => {
              onChange({
                ...settings,
                apiRateLimit: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!settings.enableApiAccess}
            helperText={i18n.t('pages.integration_settings.0_15')}
          />
        </Stack>
      </Box>
    </Stack>
  );
};
