import {
  Box,
  Typography,
  Switch,
  TextField,
  Stack,
  Divider,
} from '@mui/material';
import React from 'react';
import { FormSettings as FormSettingsType } from '../types';

interface FormSettingsProps {
  settings: FormSettingsType;
  onChange: (settings: FormSettingsType) => void;
  markUnsaved: () => void;
}

export const FormSettings: React.FC<FormSettingsProps> = ({
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
          表单字段
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置表单字段相关设置
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
                字段校验
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                启用表单字段数据校验
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
                富文本编辑
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                启用富文本编辑器
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
                电子签名
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                启用手写签名功能
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
          附件设置
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
              允许上传附件
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
            label='单文件最大大小（MB）'
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
            label='最大附件数量'
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
          数据校验
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
                表单版本管理
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                记录表单数据修改历史
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
            <Typography variant='body2'>自动保存表单草稿</Typography>
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
