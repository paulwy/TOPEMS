import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { GeneralSettings } from '../GeneralSettings';
import { NotificationSettings } from '../NotificationSettings';
import { SettingSidebar } from '../SettingSidebar';
import type {
  GeneralSettings as GeneralSettingsType,
  NotificationSettings as NotificationSettingsType,
  SettingGroup,
} from '../../types';

const groups: SettingGroup[] = [
  {
    id: 'general',
    label: '基础设置',
    icon: <span data-testid='icon-general' />,
    description: '流程基础参数',
  },
  {
    id: 'notification',
    label: '通知设置',
    icon: <span data-testid='icon-notification' />,
    description: '审批消息提醒',
  },
];

const generalSettings: GeneralSettingsType = {
  workflowPrefix: 'WF',
  numberingRule: 'YYYYMMDD-SEQ',
  defaultPriority: 'medium',
  autoStartEnabled: false,
  draftAutoSave: true,
  draftAutoSaveInterval: 30,
  maxInstancePerDay: 20,
  enableVersionControl: true,
};

const notificationSettings: NotificationSettingsType = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  wechatEnabled: false,
  approvalNotify: true,
  timeoutNotify: true,
  completeNotify: false,
  rejectNotify: true,
  defaultTemplate: 'default',
};

describe('Workflow settings low dependency components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders setting sidebar groups and delegates group selection', () => {
    const onGroupChange = vi.fn();

    renderWithProviders(
      <SettingSidebar
        groups={groups}
        activeGroup='general'
        onGroupChange={onGroupChange}
      />
    );

    fireEvent.click(screen.getByText('通知设置'));

    expect(screen.getByText('基础设置')).toBeInTheDocument();
    expect(screen.getByText('流程基础参数')).toBeInTheDocument();
    expect(screen.getByTestId('icon-general')).toBeInTheDocument();
    expect(onGroupChange).toHaveBeenCalledWith('notification');
  });

  it('general settings updates text, select, switch and number values', () => {
    const onChange = vi.fn();
    const markUnsaved = vi.fn();

    renderWithProviders(
      <GeneralSettings
        settings={generalSettings}
        onChange={onChange}
        markUnsaved={markUnsaved}
      />
    );

    fireEvent.change(screen.getByLabelText('流程编号前缀'), { target: { value: 'FLOW' } });
    fireEvent.change(screen.getByLabelText('默认优先级'), { target: { value: 'high' } });
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(screen.getByRole('option', { name: '纯序号（0001）' }));
    fireEvent.click(screen.getAllByRole('switch')[0]);
    fireEvent.change(screen.getByLabelText('自动保存间隔（秒）'), { target: { value: '45' } });

    expect(onChange).toHaveBeenCalledWith({ ...generalSettings, workflowPrefix: 'FLOW' });
    expect(onChange).toHaveBeenCalledWith({ ...generalSettings, defaultPriority: 'high' });
    expect(onChange).toHaveBeenCalledWith({ ...generalSettings, numberingRule: 'SEQ' });
    expect(onChange).toHaveBeenCalledWith({ ...generalSettings, autoStartEnabled: true });
    expect(onChange).toHaveBeenCalledWith({ ...generalSettings, draftAutoSaveInterval: 45 });
    expect(markUnsaved).toHaveBeenCalledTimes(5);
  });

  it('notification settings updates channels, scenes and default template', () => {
    const onChange = vi.fn();
    const markUnsaved = vi.fn();

    renderWithProviders(
      <NotificationSettings
        settings={notificationSettings}
        onChange={onChange}
        markUnsaved={markUnsaved}
      />
    );

    fireEvent.click(screen.getAllByRole('switch')[1]);
    fireEvent.click(screen.getAllByRole('switch')[6]);
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: '详细模板' }));

    expect(screen.getByText('通知渠道')).toBeInTheDocument();
    expect(screen.getByText('通知场景')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith({ ...notificationSettings, smsEnabled: true });
    expect(onChange).toHaveBeenCalledWith({ ...notificationSettings, completeNotify: true });
    expect(onChange).toHaveBeenCalledWith({ ...notificationSettings, defaultTemplate: 'detailed' });
    expect(markUnsaved).toHaveBeenCalledTimes(3);
  });
});
