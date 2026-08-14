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
import type { GeneralSettings as GeneralSettingsType } from '../types';
interface GeneralSettingsProps {
  settings: GeneralSettingsType;
  onChange: (settings: GeneralSettingsType) => void;
  markUnsaved: () => void;
}
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
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
          {i18n.t('pages.general_settings.k0')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {i18n.t('pages.general_settings.k1')}
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label={i18n.t('workflow.general_settings.k0')}
              value={settings.workflowPrefix}
              onChange={(e) => {
                onChange({ ...settings, workflowPrefix: e.target.value });
                markUnsaved();
              }}
              size='small'
              helperText={i18n.t('workflow.general_settings.k1')}
            />
            <TextField
              fullWidth
              label={i18n.t('workflow.general_settings.k2')}
              value={settings.defaultPriority}
              onChange={(e) => {
                onChange({ ...settings, defaultPriority: e.target.value });
                markUnsaved();
              }}
              size='small'
              select
              slotProps={{ select: { native: true } }}
            >
              <option value='low'>{i18n.t('pages.general_settings.k2')}</option>
              <option value='medium'>{i18n.t('pages.general_settings.k3')}</option>
              <option value='high'>{i18n.t('pages.general_settings.k4')}</option>
              <option value='urgent'>{i18n.t('workflow.general_settings.k3')}</option>
            </TextField>
          </Box>
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>{i18n.t('workflow.general_settings.k4')}</InputLabel>
            <Select
              value={settings.numberingRule}
              label={i18n.t('workflow.general_settings.k5')}
              onChange={(e) => {
                onChange({ ...settings, numberingRule: e.target.value });
                markUnsaved();
              }}
            >
              <MenuItem value='YYYYMMDD-SEQ'>{i18n.t('workflow.general_settings.20240101001_6')}</MenuItem>
              <MenuItem value='YYYY-MM-SEQ'>{i18n.t('workflow.general_settings.202401001_7')}</MenuItem>
              <MenuItem value='PREFIX-YYYYMMDD-SEQ'>{i18n.t('workflow.general_settings.k8')}</MenuItem>
              <MenuItem value='SEQ'>{i18n.t('workflow.general_settings.0001_9')}</MenuItem>
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
          {i18n.t('pages.general_settings.k5')}
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
                {i18n.t('pages.general_settings.k6')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.general_settings.k7')}
              </Typography>
            </Box>
            <Switch
              checked={settings.autoStartEnabled}
              onChange={(e) => {
                onChange({ ...settings, autoStartEnabled: e.target.checked });
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
                {i18n.t('pages.general_settings.k8')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.general_settings.k9')}
              </Typography>
            </Box>
            <Switch
              checked={settings.draftAutoSave}
              onChange={(e) => {
                onChange({ ...settings, draftAutoSave: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label={i18n.t('workflow.general_settings.k10')}
            value={settings.draftAutoSaveInterval}
            onChange={(e) => {
              onChange({
                ...settings,
                draftAutoSaveInterval: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!settings.draftAutoSave}
          />
          <TextField
            fullWidth
            type='number'
            label={i18n.t('workflow.general_settings.k11')}
            value={settings.maxInstancePerDay}
            onChange={(e) => {
              onChange({
                ...settings,
                maxInstancePerDay: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText={i18n.t('workflow.general_settings.k12')}
          />
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
                {i18n.t('pages.general_settings.k10')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.general_settings.k11')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableVersionControl}
              onChange={(e) => {
                onChange({ ...settings, enableVersionControl: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};