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
          基础参数
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置工作流系统的基础参数
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label='流程编号前缀'
              value={settings.workflowPrefix}
              onChange={(e) => {
                onChange({ ...settings, workflowPrefix: e.target.value });
                markUnsaved();
              }}
              size='small'
              helperText='流程编号的前缀标识'
            />
            <TextField
              fullWidth
              label='默认优先级'
              value={settings.defaultPriority}
              onChange={(e) => {
                onChange({ ...settings, defaultPriority: e.target.value });
                markUnsaved();
              }}
              size='small'
              select
              slotProps={{ select: { native: true } }}
            >
              <option value='low'>低</option>
              <option value='medium'>中</option>
              <option value='high'>高</option>
              <option value='urgent'>紧急</option>
            </TextField>
          </Box>
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>编号规则</InputLabel>
            <Select
              value={settings.numberingRule}
              label='编号规则'
              onChange={(e) => {
                onChange({ ...settings, numberingRule: e.target.value });
                markUnsaved();
              }}
            >
              <MenuItem value='YYYYMMDD-SEQ'>年月日-序号（20240101-001）</MenuItem>
              <MenuItem value='YYYY-MM-SEQ'>年月-序号（2024-01-001）</MenuItem>
              <MenuItem value='PREFIX-YYYYMMDD-SEQ'>前缀-年月日-序号</MenuItem>
              <MenuItem value='SEQ'>纯序号（0001）</MenuItem>
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
          流程控制
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
                自动启动流程
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                满足条件时自动发起流程
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
                草稿自动保存
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                自动保存表单草稿
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
            label='自动保存间隔（秒）'
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
            label='每日最大发起数'
            value={settings.maxInstancePerDay}
            onChange={(e) => {
              onChange({
                ...settings,
                maxInstancePerDay: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText='每个用户每天最多发起的流程数，0 表示不限制'
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
                版本控制
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                启用流程定义版本管理
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
