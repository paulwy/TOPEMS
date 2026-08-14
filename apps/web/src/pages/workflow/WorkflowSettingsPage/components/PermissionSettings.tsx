import { Box, Typography, Switch, TextField, Stack, Divider } from '@mui/material';
import React from 'react';
import type { PermissionSettings as PermissionSettingsType } from '../types';
import i18n from '@/i18n';
interface PermissionSettingsProps {
  settings: PermissionSettingsType;
  onChange: (settings: PermissionSettingsType) => void;
  markUnsaved: () => void;
}
export const PermissionSettings: React.FC<PermissionSettingsProps> = ({
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
          {i18n.t('pages.permission_settings.k0')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {i18n.t('pages.permission_settings.k1')}
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
                {i18n.t('pages.permission_settings.k2')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.permission_settings.k3')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableRoleBased}
              onChange={(e) => {
                onChange({
                  ...settings,
                  enableRoleBased: e.target.checked,
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
                {i18n.t('pages.permission_settings.k4')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.permission_settings.k5')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableDeptBased}
              onChange={(e) => {
                onChange({
                  ...settings,
                  enableDeptBased: e.target.checked,
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
                {i18n.t('pages.permission_settings.k6')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.permission_settings.k7')}
              </Typography>
            </Box>
            <Switch
              checked={settings.adminCanEditAll}
              onChange={(e) => {
                onChange({
                  ...settings,
                  adminCanEditAll: e.target.checked,
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
          {i18n.t('pages.permission_settings.k8')}
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
                {i18n.t('pages.permission_settings.k9')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.permission_settings.k10')}
              </Typography>
            </Box>
            <Switch
              checked={settings.allowSelfApproval}
              onChange={(e) => {
                onChange({
                  ...settings,
                  allowSelfApproval: e.target.checked,
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
                {i18n.t('pages.permission_settings.k11')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.permission_settings.k12')}
              </Typography>
            </Box>
            <Switch
              checked={settings.allowViewAllInstances}
              onChange={(e) => {
                onChange({
                  ...settings,
                  allowViewAllInstances: e.target.checked,
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
            <Typography variant='body2'>{i18n.t('workflow.permission_settings.k0')}</Typography>
            <Switch
              checked={settings.allowExportData}
              onChange={(e) => {
                onChange({
                  ...settings,
                  allowExportData: e.target.checked,
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
          {i18n.t('pages.permission_settings.k13')}
        </Typography>
        <TextField
          fullWidth
          label={i18n.t('workflow.permission_settings.k1')}
          value={settings.workflowAdminRole}
          onChange={(e) => {
            onChange({
              ...settings,
              workflowAdminRole: e.target.value,
            });
            markUnsaved();
          }}
          size='small'
          helperText={i18n.t('workflow.permission_settings.k2')}
        />
      </Box>
    </Stack>
  );
};