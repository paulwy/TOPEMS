/**
 * 工作流系统设置页面
 *
 * 功能：
 * 1. 使用 PageContainer + 设置页布局（左侧导航 + 右侧内容）
 * 2. backButton 返回 /workflow/dashboard
 * 3. pageIcon 使用 Settings 图标
 * 4. 左侧设置分组（6个分组）
 * 5. 每个分组有图标和描述
 * 6. 右侧显示当前选中分组的设置内容
 * 7. 每个设置项有保存按钮
 * 8. 使用 useAppStore 的 addNotification 通知保存成功
 * 9. 模拟设置数据
 *
 * @module pages/workflow
 * @path /workflow/settings
 */

import {
  Box,
  Typography,
  Switch,
  TextField,
  Button,
  Stack,
  Paper,
  Divider,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import React, { useState, useCallback, useMemo } from 'react';
import { Settings, CheckSquare, Bell, FileText, Shield, Plug, Save, RotateCcw } from 'lucide-react';

import { useAppStore } from '../../store';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';

interface SettingGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'general',
    label: '通用设置',
    icon: <Settings size={18} />,
    description: '基础参数、流程编号规则',
  },
  {
    id: 'approval',
    label: '审批设置',
    icon: <CheckSquare size={18} />,
    description: '审批策略、超时设置、转交规则',
  },
  {
    id: 'notification',
    label: '通知设置',
    icon: <Bell size={18} />,
    description: '通知渠道、消息模板',
  },
  {
    id: 'form',
    label: '表单设置',
    icon: <FileText size={18} />,
    description: '表单字段、数据校验',
  },
  {
    id: 'permission',
    label: '权限设置',
    icon: <Shield size={18} />,
    description: '流程权限、管理员配置',
  },
  {
    id: 'integration',
    label: '集成设置',
    icon: <Plug size={18} />,
    description: '外部系统、回调配置',
  },
];

export const WorkflowSettingsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeGroup, setActiveGroup] = useState('general');

  const [generalSettings, setGeneralSettings] = useState({
    workflowPrefix: 'WF',
    numberingRule: 'YYYYMMDD-SEQ',
    defaultPriority: 'medium',
    autoStartEnabled: true,
    draftAutoSave: true,
    draftAutoSaveInterval: 30,
    maxInstancePerDay: 1000,
    enableVersionControl: true,
  });

  const [approvalSettings, setApprovalSettings] = useState({
    defaultApprovalStrategy: 'sequential',
    enableAutoApprove: false,
    autoApproveDays: 3,
    timeoutEnabled: true,
    timeoutDays: 7,
    timeoutAction: 'escalate',
    enableTransfer: true,
    maxTransferLevels: 3,
    enableDelegate: true,
    delegateRequiresApproval: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    wechatEnabled: false,
    approvalNotify: true,
    timeoutNotify: true,
    completeNotify: true,
    rejectNotify: true,
    defaultTemplate: 'default',
  });

  const [formSettings, setFormSettings] = useState({
    enableFieldValidation: true,
    enableRichText: true,
    enableAttachment: true,
    maxAttachmentSize: 10,
    maxAttachmentCount: 5,
    enableSignature: false,
    enableFormVersion: true,
    autoSaveDraft: true,
  });

  const [permissionSettings, setPermissionSettings] = useState({
    enableRoleBased: true,
    enableDeptBased: false,
    adminCanEditAll: true,
    allowSelfApproval: false,
    allowViewAllInstances: false,
    allowExportData: true,
    workflowAdminRole: 'workflow_admin',
  });

  const [integrationSettings, setIntegrationSettings] = useState({
    enableCallback: true,
    callbackUrl: '',
    callbackToken: '',
    enableWebhook: false,
    webhookUrl: '',
    enableErpSync: false,
    erpSystem: 'none',
    enableApiAccess: true,
    apiRateLimit: 100,
  });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    setConfirmDialogOpen(true);
  }, []);

  const confirmSave = useCallback(() => {
    addNotification({
      title: '保存成功',
      message: '工作流设置已保存',
      type: 'success',
    });
    setHasUnsavedChanges(false);
    setConfirmDialogOpen(false);
  }, [addNotification]);

  const handleReset = useCallback(() => {
    addNotification({
      title: '已重置',
      message: '当前分组设置已恢复默认值',
      type: 'info',
    });
  }, [addNotification]);

  const renderGeneralSettings = () => (
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
              value={generalSettings.workflowPrefix}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, workflowPrefix: e.target.value });
                markUnsaved();
              }}
              size='small'
              helperText='流程编号的前缀标识'
            />
            <TextField
              fullWidth
              label='默认优先级'
              value={generalSettings.defaultPriority}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, defaultPriority: e.target.value });
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
              value={generalSettings.numberingRule}
              label='编号规则'
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, numberingRule: e.target.value });
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
              checked={generalSettings.autoStartEnabled}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, autoStartEnabled: e.target.checked });
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
              checked={generalSettings.draftAutoSave}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, draftAutoSave: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='自动保存间隔（秒）'
            value={generalSettings.draftAutoSaveInterval}
            onChange={(e) => {
              setGeneralSettings({
                ...generalSettings,
                draftAutoSaveInterval: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!generalSettings.draftAutoSave}
          />
          <TextField
            fullWidth
            type='number'
            label='每日最大发起数'
            value={generalSettings.maxInstancePerDay}
            onChange={(e) => {
              setGeneralSettings({
                ...generalSettings,
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
              checked={generalSettings.enableVersionControl}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, enableVersionControl: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  const renderApprovalSettings = () => (
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
              value={approvalSettings.defaultApprovalStrategy}
              label='默认审批策略'
              onChange={(e) => {
                setApprovalSettings({
                  ...approvalSettings,
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
              checked={approvalSettings.enableAutoApprove}
              onChange={(e) => {
                setApprovalSettings({ ...approvalSettings, enableAutoApprove: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='自动审批天数'
            value={approvalSettings.autoApproveDays}
            onChange={(e) => {
              setApprovalSettings({
                ...approvalSettings,
                autoApproveDays: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!approvalSettings.enableAutoApprove}
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
              checked={approvalSettings.timeoutEnabled}
              onChange={(e) => {
                setApprovalSettings({ ...approvalSettings, timeoutEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='超时时限（天）'
            value={approvalSettings.timeoutDays}
            onChange={(e) => {
              setApprovalSettings({
                ...approvalSettings,
                timeoutDays: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!approvalSettings.timeoutEnabled}
          />
          <FormControl
            fullWidth
            size='small'
            disabled={!approvalSettings.timeoutEnabled}
          >
            <InputLabel>超时处理方式</InputLabel>
            <Select
              value={approvalSettings.timeoutAction}
              label='超时处理方式'
              onChange={(e) => {
                setApprovalSettings({ ...approvalSettings, timeoutAction: e.target.value });
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
              checked={approvalSettings.enableTransfer}
              onChange={(e) => {
                setApprovalSettings({ ...approvalSettings, enableTransfer: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='最大转交流数'
            value={approvalSettings.maxTransferLevels}
            onChange={(e) => {
              setApprovalSettings({
                ...approvalSettings,
                maxTransferLevels: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!approvalSettings.enableTransfer}
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
              checked={approvalSettings.enableDelegate}
              onChange={(e) => {
                setApprovalSettings({ ...approvalSettings, enableDelegate: e.target.checked });
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
              checked={approvalSettings.delegateRequiresApproval}
              onChange={(e) => {
                setApprovalSettings({
                  ...approvalSettings,
                  delegateRequiresApproval: e.target.checked,
                });
                markUnsaved();
              }}
              disabled={!approvalSettings.enableDelegate}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  const renderNotificationSettings = () => (
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
              checked={notificationSettings.emailEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
              checked={notificationSettings.smsEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
              checked={notificationSettings.pushEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
              checked={notificationSettings.wechatEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
              checked={notificationSettings.approvalNotify}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
              checked={notificationSettings.timeoutNotify}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
              checked={notificationSettings.completeNotify}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
              checked={notificationSettings.rejectNotify}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
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
            value={notificationSettings.defaultTemplate}
            label='默认消息模板'
            onChange={(e) => {
              setNotificationSettings({
                ...notificationSettings,
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

  const renderFormSettings = () => (
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
              checked={formSettings.enableFieldValidation}
              onChange={(e) => {
                setFormSettings({ ...formSettings, enableFieldValidation: e.target.checked });
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
              checked={formSettings.enableRichText}
              onChange={(e) => {
                setFormSettings({ ...formSettings, enableRichText: e.target.checked });
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
              checked={formSettings.enableSignature}
              onChange={(e) => {
                setFormSettings({ ...formSettings, enableSignature: e.target.checked });
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
              checked={formSettings.enableAttachment}
              onChange={(e) => {
                setFormSettings({ ...formSettings, enableAttachment: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='单文件最大大小（MB）'
            value={formSettings.maxAttachmentSize}
            onChange={(e) => {
              setFormSettings({
                ...formSettings,
                maxAttachmentSize: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!formSettings.enableAttachment}
          />
          <TextField
            fullWidth
            type='number'
            label='最大附件数量'
            value={formSettings.maxAttachmentCount}
            onChange={(e) => {
              setFormSettings({
                ...formSettings,
                maxAttachmentCount: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!formSettings.enableAttachment}
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
              checked={formSettings.enableFormVersion}
              onChange={(e) => {
                setFormSettings({ ...formSettings, enableFormVersion: e.target.checked });
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
              checked={formSettings.autoSaveDraft}
              onChange={(e) => {
                setFormSettings({ ...formSettings, autoSaveDraft: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  const renderPermissionSettings = () => (
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
              checked={permissionSettings.enableRoleBased}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
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
              checked={permissionSettings.enableDeptBased}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
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
              checked={permissionSettings.adminCanEditAll}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
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
              checked={permissionSettings.allowSelfApproval}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
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
              checked={permissionSettings.allowViewAllInstances}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
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
              checked={permissionSettings.allowExportData}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
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
          value={permissionSettings.workflowAdminRole}
          onChange={(e) => {
            setPermissionSettings({
              ...permissionSettings,
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

  const renderIntegrationSettings = () => (
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
              checked={integrationSettings.enableCallback}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
                  enableCallback: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='回调地址'
            value={integrationSettings.callbackUrl}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                callbackUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder='https://example.com/api/callback'
            disabled={!integrationSettings.enableCallback}
          />
          <TextField
            fullWidth
            label='回调 Token'
            value={integrationSettings.callbackToken}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                callbackToken: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            type='password'
            placeholder='用于签名验证的 Token'
            disabled={!integrationSettings.enableCallback}
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
              checked={integrationSettings.enableWebhook}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
                  enableWebhook: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='Webhook 地址'
            value={integrationSettings.webhookUrl}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                webhookUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder='系统生成的 Webhook 接收地址'
            disabled={!integrationSettings.enableWebhook}
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
              checked={integrationSettings.enableErpSync}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
                  enableErpSync: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <FormControl
            fullWidth
            size='small'
            disabled={!integrationSettings.enableErpSync}
          >
            <InputLabel>ERP 系统类型</InputLabel>
            <Select
              value={integrationSettings.erpSystem}
              label='ERP 系统类型'
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
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
              checked={integrationSettings.enableApiAccess}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
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
            value={integrationSettings.apiRateLimit}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                apiRateLimit: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!integrationSettings.enableApiAccess}
            helperText='0 表示不限制'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderContent = useMemo(() => {
    switch (activeGroup) {
      case 'general':
        return renderGeneralSettings();
      case 'approval':
        return renderApprovalSettings();
      case 'notification':
        return renderNotificationSettings();
      case 'form':
        return renderFormSettings();
      case 'permission':
        return renderPermissionSettings();
      case 'integration':
        return renderIntegrationSettings();
      default:
        return renderGeneralSettings();
    }
  }, [
    activeGroup,
    generalSettings,
    approvalSettings,
    notificationSettings,
    formSettings,
    permissionSettings,
    integrationSettings,
  ]);

  const currentGroup = SETTING_GROUPS.find((g) => g.id === activeGroup);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Settings size={20} />,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
        },
      }}
    >
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
            minHeight: 600,
          }}
        >
          <Box
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              p: 2,
            }}
          >
            <Stack spacing={0.5}>
              {SETTING_GROUPS.map((group) => (
                <Box
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    bgcolor: activeGroup === group.id ? 'primary.50' : 'transparent',
                    borderLeft: activeGroup === group.id ? '3px solid' : '3px solid transparent',
                    borderLeftColor: 'primary.main',
                    '&:hover': {
                      bgcolor: activeGroup === group.id ? 'primary.50' : 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeGroup === group.id ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {group.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: activeGroup === group.id ? 600 : 400,
                          color: activeGroup === group.id ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {group.label}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block' }}
                      >
                        {group.description}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                {currentGroup?.label}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {currentGroup?.description}
              </Typography>
            </Box>

            {renderContent}

            <Box
              sx={{
                mt: 4,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {hasUnsavedChanges && (
                <Typography
                  variant='body2'
                  color='warning.main'
                >
                  有未保存的更改
                </Typography>
              )}
              {!hasUnsavedChanges && <Box />}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant='outlined'
                  startIcon={<RotateCcw size={16} />}
                  onClick={handleReset}
                >
                  重置
                </Button>
                <Button
                  variant='contained'
                  startIcon={<Save size={16} />}
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                >
                  保存设置
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmSave}
        title='保存设置'
        message='确定要保存当前的工作流设置吗？'
      />
    </PageContainer>
  );
};

export default WorkflowSettingsPage;
