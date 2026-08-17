import {
  Box,
  Typography,
  Switch,
  Stack,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import i18n from '@/i18n';
import React from 'react';
import type { NotificationSettings as NotificationSettingsType } from '../types';

interface NotificationSettingsProps {
  settings: NotificationSettingsType;
  onChange: (settings: NotificationSettingsType) => void;
  markUnsaved: () => void;
}
export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
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
          {i18n.t('pages.notification_settings.k0')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {i18n.t('pages.notification_settings.k1')}
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
                {i18n.t('pages.notification_settings.k2')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.notification_settings.k3')}
              </Typography>
            </Box>
            <Switch
              checked={settings.emailEnabled}
              onChange={(e) => {
                onChange({
                  ...settings,
                  emailEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
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
                {i18n.t('pages.notification_settings.k4')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.notification_settings.k5')}
              </Typography>
            </Box>
            <Switch
              checked={settings.smsEnabled}
              onChange={(e) => {
                onChange({
                  ...settings,
                  smsEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
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
                {i18n.t('pages.notification_settings.k6')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.notification_settings.k7')}
              </Typography>
            </Box>
            <Switch
              checked={settings.pushEnabled}
              onChange={(e) => {
                onChange({
                  ...settings,
                  pushEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
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
                {i18n.t('pages.notification_settings.k8')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.notification_settings.k9')}
              </Typography>
            </Box>
            <Switch
              checked={settings.wechatEnabled}
              onChange={(e) => {
                onChange({
                  ...settings,
                  wechatEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.notification_settings.k10')}
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
            <Typography variant='body2'>{i18n.t('workflow.notification_settings.k0')}</Typography>
            <Switch
              checked={settings.approvalNotify}
              onChange={(e) => {
                onChange({
                  ...settings,
                  approvalNotify: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
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
            <Typography variant='body2'>{i18n.t('workflow.notification_settings.k1')}</Typography>
            <Switch
              checked={settings.timeoutNotify}
              onChange={(e) => {
                onChange({
                  ...settings,
                  timeoutNotify: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
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
            <Typography variant='body2'>{i18n.t('workflow.notification_settings.k2')}</Typography>
            <Switch
              checked={settings.completeNotify}
              onChange={(e) => {
                onChange({
                  ...settings,
                  completeNotify: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
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
            <Typography variant='body2'>{i18n.t('workflow.notification_settings.k3')}</Typography>
            <Switch
              checked={settings.rejectNotify}
              onChange={(e) => {
                onChange({
                  ...settings,
                  rejectNotify: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.notification_settings.k11')}
        </Typography>
        <FormControl
          fullWidth
          size='small'
        >
          <InputLabel>{i18n.t('workflow.notification_settings.k4')}</InputLabel>
          <Select
            value={settings.defaultTemplate}
            label={i18n.t('workflow.notification_settings.k5')}
            onChange={(e) => {
              onChange({
                ...settings,
                defaultTemplate: e.target.value,
              });
              markUnsaved();
            }}
          >
            <MenuItem value='default'>{i18n.t('workflow.notification_settings.k6')}</MenuItem>
            <MenuItem value='concise'>{i18n.t('workflow.notification_settings.k7')}</MenuItem>
            <MenuItem value='detailed'>{i18n.t('workflow.notification_settings.k8')}</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Stack>
  );
};
