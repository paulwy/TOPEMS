import React from 'react';

export interface SettingGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface GeneralSettings {
  workflowPrefix: string;
  numberingRule: string;
  defaultPriority: string;
  autoStartEnabled: boolean;
  draftAutoSave: boolean;
  draftAutoSaveInterval: number;
  maxInstancePerDay: number;
  enableVersionControl: boolean;
}

export interface ApprovalSettings {
  defaultApprovalStrategy: string;
  enableAutoApprove: boolean;
  autoApproveDays: number;
  timeoutEnabled: boolean;
  timeoutDays: number;
  timeoutAction: string;
  enableTransfer: boolean;
  maxTransferLevels: number;
  enableDelegate: boolean;
  delegateRequiresApproval: boolean;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  wechatEnabled: boolean;
  approvalNotify: boolean;
  timeoutNotify: boolean;
  completeNotify: boolean;
  rejectNotify: boolean;
  defaultTemplate: string;
}

export interface FormSettings {
  enableFieldValidation: boolean;
  enableRichText: boolean;
  enableAttachment: boolean;
  maxAttachmentSize: number;
  maxAttachmentCount: number;
  enableSignature: boolean;
  enableFormVersion: boolean;
  autoSaveDraft: boolean;
}

export interface PermissionSettings {
  enableRoleBased: boolean;
  enableDeptBased: boolean;
  adminCanEditAll: boolean;
  allowSelfApproval: boolean;
  allowViewAllInstances: boolean;
  allowExportData: boolean;
  workflowAdminRole: string;
}

export interface IntegrationSettings {
  enableCallback: boolean;
  callbackUrl: string;
  callbackToken: string;
  enableWebhook: boolean;
  webhookUrl: string;
  enableErpSync: boolean;
  erpSystem: string;
  enableApiAccess: boolean;
  apiRateLimit: number;
}
