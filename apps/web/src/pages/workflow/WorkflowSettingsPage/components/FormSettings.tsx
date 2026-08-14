import { Box, Typography, Switch, TextField, Stack, Divider } from '@mui/material';
import React from 'react';
import type { FormSettings as FormSettingsType } from '../types';
import i18n from '@/i18n';
interface FormSettingsProps {
  settings: FormSettingsType;
  onChange: (settings: FormSettingsType) => void;
  markUnsaved: () => void;
}
export const FormSettings: React.FC<FormSettingsProps> = ({ settings, onChange, markUnsaved }) => {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          {i18n.t('pages.form_settings.k0')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {i18n.t('pages.form_settings.k1')}
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
                {i18n.t('pages.form_settings.k2')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.form_settings.k3')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableFieldValidation}
              onChange={(e) => {
                onChange({ ...settings, enableFieldValidation: e.target.checked });
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
                {i18n.t('pages.form_settings.k4')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.form_settings.k5')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableRichText}
              onChange={(e) => {
                onChange({ ...settings, enableRichText: e.target.checked });
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
                {i18n.t('pages.form_settings.k6')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.form_settings.k7')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableSignature}
              onChange={(e) => {
                onChange({ ...settings, enableSignature: e.target.checked });
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
          {i18n.t('pages.form_settings.k8')}
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
              {i18n.t('pages.form_settings.k9')}
            </Typography>
            <Switch
              checked={settings.enableAttachment}
              onChange={(e) => {
                onChange({ ...settings, enableAttachment: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label={i18n.t('workflow.form_settings.mb_0')}
            value={settings.maxAttachmentSize}
            onChange={(e) => {
              onChange({
                ...settings,
                maxAttachmentSize: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!settings.enableAttachment}
          />
          <TextField
            fullWidth
            type='number'
            label={i18n.t('workflow.form_settings.k1')}
            value={settings.maxAttachmentCount}
            onChange={(e) => {
              onChange({
                ...settings,
                maxAttachmentCount: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!settings.enableAttachment}
          />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.form_settings.k10')}
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
                {i18n.t('pages.form_settings.k11')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.form_settings.k12')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableFormVersion}
              onChange={(e) => {
                onChange({ ...settings, enableFormVersion: e.target.checked });
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
            <Typography variant='body2'>{i18n.t('workflow.form_settings.k2')}</Typography>
            <Switch
              checked={settings.autoSaveDraft}
              onChange={(e) => {
                onChange({ ...settings, autoSaveDraft: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};