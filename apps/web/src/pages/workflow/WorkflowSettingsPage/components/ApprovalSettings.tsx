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
import React from 'react';
import { ApprovalSettings as ApprovalSettingsType } from '../types';

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
          审批策略
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置默认审批策略和规则
        </Typography>
        <Stack spacing={2}>
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>默认审批策略</InputLabel>
            <Select
              value={settings.defaultApprovalStrategy}
              label='默认审批策略'
              onChange={(e) => {
                onChange({
                  ...settings,
                  defaultApprovalStrategy: e.target.value,
                });
                markUnsaved();
              }}
            >
              <MenuItem value='sequential'>顺序审批</MenuItem>
              <MenuItem value='parallel'>并行审批</MenuItem>
              <MenuItem value='any'>任意一人审批</MenuItem>
              <MenuItem value='majority'>多数通过</MenuItem>
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
                自动审批
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                超时未处理自动通过
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
            label='自动审批天数'
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
            helperText='超过此天数未处理则自动通过'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          超时设置
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
              启用超时处理
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
            label='超时时限（天）'
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
            <InputLabel>超时处理方式</InputLabel>
            <Select
              value={settings.timeoutAction}
              label='超时处理方式'
              onChange={(e) => {
                onChange({ ...settings, timeoutAction: e.target.value });
                markUnsaved();
              }}
            >
              <MenuItem value='escalate'>升级到上级</MenuItem>
              <MenuItem value='auto_approve'>自动通过</MenuItem>
              <MenuItem value='auto_reject'>自动驳回</MenuItem>
              <MenuItem value='notify'>仅通知提醒</MenuItem>
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
          转交规则
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
                允许转交
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                审批人可将任务转交给他人
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
            label='最大转交流数'
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
            helperText='最多可转交的层级数，0 表示不限制'
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
                允许委托
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                审批人可委托他人代审批
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
            <Typography variant='body2'>委托需审批人确认</Typography>
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
