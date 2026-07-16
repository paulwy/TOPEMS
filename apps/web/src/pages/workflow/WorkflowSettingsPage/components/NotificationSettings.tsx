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
import React from 'react';
import { NotificationSettings as NotificationSettingsType } from '../types';

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
          通知渠道
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置工作流通知的发送渠道
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
                邮件通知
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过邮件发送审批通知
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
                短信通知
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过短信发送紧急通知
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
                站内推送
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                在系统内推送实时消息
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
                企业微信
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过企业微信发送通知
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
          通知场景
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
            <Typography variant='body2'>审批待办通知</Typography>
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
            <Typography variant='body2'>超时提醒</Typography>
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
            <Typography variant='body2'>流程完成通知</Typography>
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
            <Typography variant='body2'>驳回通知</Typography>
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
          消息模板
        </Typography>
        <FormControl
          fullWidth
          size='small'
        >
          <InputLabel>默认消息模板</InputLabel>
          <Select
            value={settings.defaultTemplate}
            label='默认消息模板'
            onChange={(e) => {
              onChange({
                ...settings,
                defaultTemplate: e.target.value,
              });
              markUnsaved();
            }}
          >
            <MenuItem value='default'>默认模板</MenuItem>
            <MenuItem value='concise'>简洁模板</MenuItem>
            <MenuItem value='detailed'>详细模板</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Stack>
  );
};
