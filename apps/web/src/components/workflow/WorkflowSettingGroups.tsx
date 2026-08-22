import React from 'react';
import { Settings, CheckSquare, Bell, FileText, Shield, Plug } from 'lucide-react';
import type { SettingGroup } from '@/pages/workflow/WorkflowSettingsPage/types';
import i18n from '@/i18n';

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'general',
    label: i18n.t('workflow.constants.k0'),
    icon: <Settings size={18} />,
    description: i18n.t('workflow.constants.k1'),
  },
  {
    id: 'approval',
    label: i18n.t('workflow.constants.k2'),
    icon: <CheckSquare size={18} />,
    description: i18n.t('workflow.constants.k3'),
  },
  {
    id: 'notification',
    label: i18n.t('workflow.constants.k4'),
    icon: <Bell size={18} />,
    description: i18n.t('workflow.constants.k5'),
  },
  {
    id: 'form',
    label: i18n.t('workflow.constants.k6'),
    icon: <FileText size={18} />,
    description: i18n.t('workflow.constants.k7'),
  },
  {
    id: 'permission',
    label: i18n.t('workflow.constants.k8'),
    icon: <Shield size={18} />,
    description: i18n.t('workflow.constants.k9'),
  },
  {
    id: 'integration',
    label: i18n.t('workflow.constants.k10'),
    icon: <Plug size={18} />,
    description: i18n.t('workflow.constants.k11'),
  },
];
