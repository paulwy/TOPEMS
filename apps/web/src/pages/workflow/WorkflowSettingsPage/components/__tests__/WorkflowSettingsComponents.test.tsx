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

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../../i18n/locales/zh/workflow.json'),
    require('../../../../../i18n/locales/zh/common.json'),
    require('../../../../../i18n/locales/zh/components.json'),
    require('../../../../../i18n/locales/zh/pages.json'),
    require('../../../../../i18n/locales/zh/templates.json'),
    require('../../../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = i18nMap[key] ?? key;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) base = `${base}:${JSON.stringify(options)}`;
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base}:${strVal}`;
      }
    }
    return base;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../../../i18n/locales/zh/workflow.json'),
    require('../../../../../i18n/locales/zh/common.json'),
    require('../../../../../i18n/locales/zh/components.json'),
    require('../../../../../i18n/locales/zh/pages.json'),
    require('../../../../../i18n/locales/zh/templates.json'),
    require('../../../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = i18nMap[key] ?? key;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) base = `${base}:${JSON.stringify(options)}`;
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base}:${strVal}`;
      }
    }
    return base;
  };
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

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
