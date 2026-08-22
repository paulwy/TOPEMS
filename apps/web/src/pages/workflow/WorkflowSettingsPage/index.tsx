/**
 * 工作流系统设置页面
 *
 * 功能：
 * 1. 使用 SettingsPageTemplate + tabs 渲染工作流设置
 * 2. pageIcon 使用 Settings 图标
 * 3. 六个设置分组对应六个 tab
 * 4. 每个 tab 的 section content 为对应设置组件
 * 5. 使用 useNotificationStore 的 addNotification 通知保存成功
 * 6. 模拟设置数据
 *
 * @module pages/workflow
 * @path /workflow/settings
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Button } from '@mui/material';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore } from '../../../store';
import { SettingsPageTemplate } from '@/components/templates';
import type { SettingTab, SettingSection } from '@/components/templates/SettingsPageTemplate';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { SETTING_GROUPS } from './constants';
import type {
  GeneralSettings as GeneralSettingsType,
  ApprovalSettings as ApprovalSettingsType,
  NotificationSettings as NotificationSettingsType,
  FormSettings as FormSettingsType,
  PermissionSettings as PermissionSettingsType,
  IntegrationSettings as IntegrationSettingsType,
} from './types';
import { GeneralSettings } from './components/GeneralSettings';
import { ApprovalSettings } from './components/ApprovalSettings';
import { NotificationSettings } from './components/NotificationSettings';
import { FormSettings } from './components/FormSettings';
import { PermissionSettings } from './components/PermissionSettings';
import { IntegrationSettings } from './components/IntegrationSettings';

export const WorkflowSettingsPage: React.FC = () => {
  const { t: tWorkflow } = useTranslation('workflow');
  const { t: tPages } = useTranslation('pages');
  const { data: _backendData } = useQuery({
    queryKey: ['workflow-settings-page'],
    queryFn: async () => {
      try {
        return await workflowApi.settings.listSettings();
      } catch (_e) {
        return {};
      }
    },
  });
  const addNotification = useNotificationStore((state) => state.addNotification);
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
      title: tWorkflow('index.k0'),
      message: tWorkflow('index.k1'),
      type: 'success',
    });
    setHasUnsavedChanges(false);
    setConfirmDialogClosed();
  }, [addNotification, setConfirmDialogClosed, tWorkflow]);
  const handleSave = useCallback(() => {
    openConfirmDialog({
      title: tWorkflow('index.k2'),
      message: tWorkflow('index.k3'),
      onConfirm: confirmSave,
    });
  }, [confirmSave, openConfirmDialog, tWorkflow]);
  const handleReset = useCallback(() => {
    addNotification({
      title: tWorkflow('index.k4'),
      message: tWorkflow('index.k5'),
      type: 'info',
    });
  }, [addNotification, tWorkflow]);

  const getGroupMeta = useCallback((id: string) => SETTING_GROUPS.find((g) => g.id === id), []);

  const generalSection: SettingSection = useMemo(
    () => ({
      id: 'general',
      title: getGroupMeta('general')?.label || '',
      description: getGroupMeta('general')?.description,
      content: (
        <GeneralSettings
          settings={generalSettings}
          onChange={setGeneralSettings}
          markUnsaved={markUnsaved}
        />
      ),
    }),
    [generalSettings, getGroupMeta, markUnsaved]
  );

  const approvalSection: SettingSection = useMemo(
    () => ({
      id: 'approval',
      title: getGroupMeta('approval')?.label || '',
      description: getGroupMeta('approval')?.description,
      content: (
        <ApprovalSettings
          settings={approvalSettings}
          onChange={setApprovalSettings}
          markUnsaved={markUnsaved}
        />
      ),
    }),
    [approvalSettings, getGroupMeta, markUnsaved]
  );

  const notificationSection: SettingSection = useMemo(
    () => ({
      id: 'notification',
      title: getGroupMeta('notification')?.label || '',
      description: getGroupMeta('notification')?.description,
      content: (
        <NotificationSettings
          settings={notificationSettings}
          onChange={setNotificationSettings}
          markUnsaved={markUnsaved}
        />
      ),
    }),
    [notificationSettings, getGroupMeta, markUnsaved]
  );

  const formSection: SettingSection = useMemo(
    () => ({
      id: 'form',
      title: getGroupMeta('form')?.label || '',
      description: getGroupMeta('form')?.description,
      content: (
        <FormSettings
          settings={formSettings}
          onChange={setFormSettings}
          markUnsaved={markUnsaved}
        />
      ),
    }),
    [formSettings, getGroupMeta, markUnsaved]
  );

  const permissionSection: SettingSection = useMemo(
    () => ({
      id: 'permission',
      title: getGroupMeta('permission')?.label || '',
      description: getGroupMeta('permission')?.description,
      content: (
        <PermissionSettings
          settings={permissionSettings}
          onChange={setPermissionSettings}
          markUnsaved={markUnsaved}
        />
      ),
    }),
    [permissionSettings, getGroupMeta, markUnsaved]
  );

  const integrationSection: SettingSection = useMemo(
    () => ({
      id: 'integration',
      title: getGroupMeta('integration')?.label || '',
      description: getGroupMeta('integration')?.description,
      content: (
        <IntegrationSettings
          settings={integrationSettings}
          onChange={setIntegrationSettings}
          markUnsaved={markUnsaved}
        />
      ),
    }),
    [integrationSettings, getGroupMeta, markUnsaved]
  );

  const tabs: SettingTab[] = useMemo(
    () => [
      {
        id: 'general',
        label: getGroupMeta('general')?.label || '',
        icon: getGroupMeta('general')?.icon,
        sections: [generalSection],
      },
      {
        id: 'approval',
        label: getGroupMeta('approval')?.label || '',
        icon: getGroupMeta('approval')?.icon,
        sections: [approvalSection],
      },
      {
        id: 'notification',
        label: getGroupMeta('notification')?.label || '',
        icon: getGroupMeta('notification')?.icon,
        sections: [notificationSection],
      },
      {
        id: 'form',
        label: getGroupMeta('form')?.label || '',
        icon: getGroupMeta('form')?.icon,
        sections: [formSection],
      },
      {
        id: 'permission',
        label: getGroupMeta('permission')?.label || '',
        icon: getGroupMeta('permission')?.icon,
        sections: [permissionSection],
      },
      {
        id: 'integration',
        label: getGroupMeta('integration')?.label || '',
        icon: getGroupMeta('integration')?.icon,
        sections: [integrationSection],
      },
    ],
    [
      generalSection,
      approvalSection,
      notificationSection,
      formSection,
      permissionSection,
      integrationSection,
      getGroupMeta,
    ]
  );

  const footerContent = useMemo(
    () => (
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
            {tPages('index.k0')}
          </Typography>
        )}
        {!hasUnsavedChanges && <Box />}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<RotateCcw size={16} />}
            onClick={handleReset}
          >
            {tPages('index.k1')}
          </Button>
          <Button
            variant='contained'
            startIcon={<Save size={16} />}
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            {tPages('index.k2')}
          </Button>
        </Box>
      </Box>
    ),
    [handleReset, handleSave, hasUnsavedChanges, tPages]
  );

  return (
    <SettingsPageTemplate
      title={tWorkflow('title')}
      subtitle={tWorkflow('settings.title')}
      icon={<Settings size={20} />}
      tabs={tabs}
      showSaveButton={false}
      showResetButton={false}
      footerContent={footerContent}
    >
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
    </SettingsPageTemplate>
  );
};
export default WorkflowSettingsPage;
