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
 * 8. 使用 useNotificationStore 的 addNotification 通知保存成功
 * 9. 模拟设置数据
 *
 * @module pages/workflow
 * @path /workflow/settings
 */
import { Box, Typography, Button, Paper } from '@mui/material';
import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workflowApi } from '@/api/workflow';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useNotificationStore } from '../../../store';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { SETTING_GROUPS } from './constants';
import type {
  GeneralSettings as GeneralSettingsType,
  ApprovalSettings as ApprovalSettingsType,
  NotificationSettings as NotificationSettingsType,
  FormSettings as FormSettingsType,
  PermissionSettings as PermissionSettingsType,
  IntegrationSettings as IntegrationSettingsType,
} from './types';
import i18n from '@/i18n';
import { SettingSidebar } from './components/SettingSidebar';
import { GeneralSettings } from './components/GeneralSettings';
import { ApprovalSettings } from './components/ApprovalSettings';
import { NotificationSettings } from './components/NotificationSettings';
import { FormSettings } from './components/FormSettings';
import { PermissionSettings } from './components/PermissionSettings';
import { IntegrationSettings } from './components/IntegrationSettings';
export const WorkflowSettingsPage: React.FC = () => {
  const { data: backendData } = useQuery({
    queryKey: ['workflow-settings-page'],
    queryFn: async () => {
      try {
        return await workflowApi.settings.listSettings();
      } catch (e) {
        return {};
      }
    },
  });
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeGroup, setActiveGroup] = useState('general');
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsType>({
    workflowPrefix: 'WF',
    numberingRule: 'YYYYMMDD-SEQ',
    defaultPriority: 'medium',
    autoStartEnabled: true,
    draftAutoSave: true,
    draftAutoSaveInterval: 30,
    maxInstancePerDay: 1000,
    enableVersionControl: true,
  });
  const [approvalSettings, setApprovalSettings] = useState<ApprovalSettingsType>({
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
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsType>({
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
  const [formSettings, setFormSettings] = useState<FormSettingsType>({
    enableFieldValidation: true,
    enableRichText: true,
    enableAttachment: true,
    maxAttachmentSize: 10,
    maxAttachmentCount: 5,
    enableSignature: false,
    enableFormVersion: true,
    autoSaveDraft: true,
  });
  const [permissionSettings, setPermissionSettings] = useState<PermissionSettingsType>({
    enableRoleBased: true,
    enableDeptBased: false,
    adminCanEditAll: true,
    allowSelfApproval: false,
    allowViewAllInstances: false,
    allowExportData: true,
    workflowAdminRole: 'workflow_admin',
  });
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettingsType>({
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // 确认对话框状态
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();
  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);
  const confirmSave = useCallback(() => {
    addNotification({
      title: i18n.t('workflow.index.k0'),
      message: i18n.t('workflow.index.k1'),
      type: 'success',
    });
    setHasUnsavedChanges(false);
    setConfirmDialogClosed();
  }, [addNotification]);
  const handleSave = useCallback(() => {
    openConfirmDialog({
      title: i18n.t('workflow.index.k2'),
      message: i18n.t('workflow.index.k3'),
      onConfirm: confirmSave,
    });
  }, [confirmSave, openConfirmDialog]);
  const handleReset = useCallback(() => {
    addNotification({
      title: i18n.t('workflow.index.k4'),
      message: i18n.t('workflow.index.k5'),
      type: 'info',
    });
  }, [addNotification]);
  const renderContent = useMemo(() => {
    switch (activeGroup) {
      case 'general':
        return (
          <GeneralSettings
            settings={generalSettings}
            onChange={setGeneralSettings}
            markUnsaved={markUnsaved}
          />
        );
      case 'approval':
        return (
          <ApprovalSettings
            settings={approvalSettings}
            onChange={setApprovalSettings}
            markUnsaved={markUnsaved}
          />
        );
      case 'notification':
        return (
          <NotificationSettings
            settings={notificationSettings}
            onChange={setNotificationSettings}
            markUnsaved={markUnsaved}
          />
        );
      case 'form':
        return (
          <FormSettings
            settings={formSettings}
            onChange={setFormSettings}
            markUnsaved={markUnsaved}
          />
        );
      case 'permission':
        return (
          <PermissionSettings
            settings={permissionSettings}
            onChange={setPermissionSettings}
            markUnsaved={markUnsaved}
          />
        );
      case 'integration':
        return (
          <IntegrationSettings
            settings={integrationSettings}
            onChange={setIntegrationSettings}
            markUnsaved={markUnsaved}
          />
        );
      default:
        return (
          <GeneralSettings
            settings={generalSettings}
            onChange={setGeneralSettings}
            markUnsaved={markUnsaved}
          />
        );
    }
  }, [
    activeGroup,
    generalSettings,
    approvalSettings,
    notificationSettings,
    formSettings,
    permissionSettings,
    integrationSettings,
    markUnsaved,
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
          <SettingSidebar
            groups={SETTING_GROUPS}
            activeGroup={activeGroup}
            onGroupChange={setActiveGroup}
          />
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
                  {i18n.t('pages.index.k0')}
                </Typography>
              )}
              {!hasUnsavedChanges && <Box />}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant='outlined'
                  startIcon={<RotateCcw size={16} />}
                  onClick={handleReset}
                >
                  {i18n.t('pages.index.k1')}
                </Button>
                <Button
                  variant='contained'
                  startIcon={<Save size={16} />}
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                >
                  {i18n.t('pages.index.k2')}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};
export default WorkflowSettingsPage;