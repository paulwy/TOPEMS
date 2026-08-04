import React from 'react';
import { Settings, CheckSquare, Bell, FileText, Shield, Plug } from 'lucide-react';
import type { SettingGroup } from './types';

export const SETTING_GROUPS: SettingGroup[] = [
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
