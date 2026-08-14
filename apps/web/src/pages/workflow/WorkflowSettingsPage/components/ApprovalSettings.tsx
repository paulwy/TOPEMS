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
import type { ApprovalSettings as ApprovalSettingsType } from '../types';
interface ApprovalSettingsProps {
  settings: ApprovalSettingsType;
  onChange: (settings: ApprovalSettingsType) => void;
  markUnsaved: () => void;
}
export const ApprovalSettings: React.FC<ApprovalSettingsProps> = ({
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
          {i18n.t('pages.approval_settings.k0')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {i18n.t('pages.approval_settings.k1')}
        </Typography>
        <Stack spacing={2}>
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>{i18n.t('workflow.approval_settings.k0')}</InputLabel>
            <Select
              value={settings.defaultApprovalStrategy}
              label={i18n.t('workflow.approval_settings.k1')}
              onChange={(e) => {
                onChange({
                  ...settings,
                  defaultApprovalStrategy: e.target.value,
                });
                markUnsaved();
              }}
            >
              <MenuItem value='sequential'>{i18n.t('workflow.approval_settings.k2')}</MenuItem>
              <MenuItem value='parallel'>{i18n.t('workflow.approval_settings.k3')}</MenuItem>
              <MenuItem value='any'>{i18n.t('workflow.approval_settings.k4')}</MenuItem>
              <MenuItem value='majority'>{i18n.t('workflow.approval_settings.k5')}</MenuItem>
            </Select>
          </FormControl>
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
                {i18n.t('pages.approval_settings.k2')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.approval_settings.k3')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableAutoApprove}
              onChange={(e) => {
                onChange({ ...settings, enableAutoApprove: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label={i18n.t('workflow.approval_settings.k6')}
            value={settings.autoApproveDays}
            onChange={(e) => {
              onChange({
                ...settings,
                autoApproveDays: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!settings.enableAutoApprove}
            helperText={i18n.t('workflow.approval_settings.k7')}
          />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.approval_settings.k4')}
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
              {i18n.t('pages.approval_settings.k5')}
            </Typography>
            <Switch
              checked={settings.timeoutEnabled}
              onChange={(e) => {
                onChange({ ...settings, timeoutEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label={i18n.t('workflow.approval_settings.k8')}
            value={settings.timeoutDays}
            onChange={(e) => {
              onChange({
                ...settings,
                timeoutDays: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!settings.timeoutEnabled}
          />
          <FormControl
            fullWidth
            size='small'
            disabled={!settings.timeoutEnabled}
          >
            <InputLabel>{i18n.t('workflow.approval_settings.k9')}</InputLabel>
            <Select
              value={settings.timeoutAction}
              label={i18n.t('workflow.approval_settings.k10')}
              onChange={(e) => {
                onChange({ ...settings, timeoutAction: e.target.value });
                markUnsaved();
              }}
            >
              <MenuItem value='escalate'>{i18n.t('workflow.approval_settings.k11')}</MenuItem>
              <MenuItem value='auto_approve'>{i18n.t('workflow.approval_settings.k12')}</MenuItem>
              <MenuItem value='auto_reject'>{i18n.t('workflow.approval_settings.k13')}</MenuItem>
              <MenuItem value='notify'>{i18n.t('workflow.approval_settings.k14')}</MenuItem>
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
          {i18n.t('pages.approval_settings.k6')}
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
                {i18n.t('pages.approval_settings.k7')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.approval_settings.k8')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableTransfer}
              onChange={(e) => {
                onChange({ ...settings, enableTransfer: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label={i18n.t('workflow.approval_settings.k15')}
            value={settings.maxTransferLevels}
            onChange={(e) => {
              onChange({
                ...settings,
                maxTransferLevels: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!settings.enableTransfer}
            helperText={i18n.t('workflow.approval_settings.0_16')}
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
                {i18n.t('pages.approval_settings.k9')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.approval_settings.k10')}
              </Typography>
            </Box>
            <Switch
              checked={settings.enableDelegate}
              onChange={(e) => {
                onChange({ ...settings, enableDelegate: e.target.checked });
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
            <Typography variant='body2'>{i18n.t('workflow.approval_settings.k17')}</Typography>
            <Switch
              checked={settings.delegateRequiresApproval}
              onChange={(e) => {
                onChange({
                  ...settings,
                  delegateRequiresApproval: e.target.checked,
                });
                markUnsaved();
              }}
              disabled={!settings.enableDelegate}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};