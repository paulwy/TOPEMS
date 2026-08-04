import { Box, Typography, Switch, TextField, Stack, Divider } from '@mui/material';
import React from 'react';
import type { PermissionSettings as PermissionSettingsType } from '../types';

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
          流程权限
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置工作流权限控制方式
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
                基于角色的权限
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                使用系统角色控制流程访问
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
                基于部门的权限
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                使用组织架构控制流程访问
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
                管理员编辑所有流程
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                管理员可编辑所有流程定义
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
          审批规则
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
                允许自己审批
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                发起人可以审批自己发起的流程
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
                查看所有流程实例
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                管理员可查看所有流程实例
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
            <Typography variant='body2'>允许导出数据</Typography>
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
          管理员配置
        </Typography>
        <TextField
          fullWidth
          label='工作流管理员角色'
          value={settings.workflowAdminRole}
          onChange={(e) => {
            onChange({
              ...settings,
              workflowAdminRole: e.target.value,
            });
            markUnsaved();
          }}
          size='small'
          helperText='拥有此角色的用户为工作流管理员'
        />
      </Box>
    </Stack>
  );
};
