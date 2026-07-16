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
import { IntegrationSettings as IntegrationSettingsType } from '../types';

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
          回调配置
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置系统回调和 Webhook
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
                启用回调
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                流程状态变更时回调外部系统
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
            label='回调地址'
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
            label='回调 Token'
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
            placeholder='用于签名验证的 Token'
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
                启用 Webhook
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                接收外部系统触发的流程
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
            label='Webhook 地址'
            value={settings.webhookUrl}
            onChange={(e) => {
              onChange({
                ...settings,
                webhookUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder='系统生成的 Webhook 接收地址'
            disabled={!settings.enableWebhook}
            helperText='外部系统可通过此地址触发工作流'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          外部系统
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
              ERP 系统同步
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
              label='ERP 系统类型'
              onChange={(e) => {
                onChange({
                  ...settings,
                  erpSystem: e.target.value,
                });
                markUnsaved();
              }}
            >
              <MenuItem value='none'>无</MenuItem>
              <MenuItem value='sap'>SAP</MenuItem>
              <MenuItem value='oracle'>Oracle EBS</MenuItem>
              <MenuItem value='ufida'>用友</MenuItem>
              <MenuItem value='kingdee'>金蝶</MenuItem>
              <MenuItem value='custom'>自定义</MenuItem>
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
          API 访问
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
                启用 API 访问
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                允许通过 API 操作工作流
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
            label='API 调用频率限制（次/分钟）'
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
            helperText='0 表示不限制'
          />
        </Stack>
      </Box>
    </Stack>
  );
};
