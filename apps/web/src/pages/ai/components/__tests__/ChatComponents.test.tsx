import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import ChatHeader from '../ChatHeader';
import ChatInput from '../ChatInput';
import ChatMessageList from '../ChatMessageList';
import ChatSidebar from '../ChatSidebar';
import DocUploadDialog from '../DocUploadDialog';
import type { ChatMode, ChatSession, Message, QuickPrompt } from '../../hooks/useAiChat';

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../i18n/locales/zh/ai.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/shared.json'),
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
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1 && typeof (options as any)[keys[0]] === 'string') {
          base = `${base}:${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
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
    require('../../../../i18n/locales/zh/ai.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/shared.json'),
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
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1 && typeof (options as any)[keys[0]] === 'string') {
          base = `${base}:${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
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

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return {
    ...actual,
    Check: () => <svg data-testid='icon-check' />,
    ChevronRight: () => <svg data-testid='icon-chevron-right' />,
    Code: () => <svg data-testid='icon-code' />,
    Copy: () => <svg data-testid='icon-copy' />,
    FileCode: () => <svg data-testid='icon-file-code' />,
    FileText: () => <svg data-testid='icon-file-text' />,
    Lightbulb: () => <svg data-testid='icon-lightbulb' />,
    MessageSquare: () => <svg data-testid='icon-message' />,
    Plus: () => <svg data-testid='icon-plus' />,
    RefreshCw: () => <svg data-testid='icon-refresh' />,
    Send: () => <svg data-testid='icon-send' />,
    Sparkles: () => <svg data-testid='icon-sparkles' />,
    User: () => <svg data-testid='icon-user' />,
    X: () => <svg data-testid='icon-x' />,
  };
});

const fixedDate = new Date('2026-08-11T08:00:00');

const sessions: ChatSession[] = [
  {
    id: 's1',
    title: '质量问题分析',
    messages: [],
    timestamp: fixedDate,
    type: 'qa',
  },
  {
    id: 's2',
    title: '代码生成记录',
    messages: [],
    timestamp: new Date('2026-08-11T09:00:00'),
    type: 'code',
  },
];

const messages: Message[] = [
  {
    id: 'm1',
    role: 'user',
    content: '帮我分析质量异常',
    timestamp: fixedDate,
    type: 'qa',
  },
  {
    id: 'm2',
    role: 'assistant',
    content: '建议先隔离批次。\n```ts\nconst status = "hold";\n```',
    timestamp: new Date('2026-08-11T08:01:00'),
    type: 'code',
  },
];

describe('AI Chat 拆分组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ChatHeader 渲染会话标题、类型、模型选择，并触发回调', () => {
    const onToggleSidebar = vi.fn();
    const onChangeModel = vi.fn();
    const onNewChat = vi.fn();
    const onChangeTab = vi.fn();

    renderWithProviders(
      <ChatHeader
        selectedSession={sessions[0]}
        selectedModel='gpt-4'
        activeTab='qa'
        onToggleSidebar={onToggleSidebar}
        onChangeModel={onChangeModel}
        onNewChat={onNewChat}
        onChangeTab={onChangeTab}
      />
    );

    expect(screen.getByText('质量问题分析')).toBeInTheDocument();
    expect(screen.getByText('ai.chat.type.qa')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('展开'));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Claude' }));
    expect(onChangeModel).toHaveBeenCalledWith('claude');

    fireEvent.click(screen.getByLabelText('ai.chat.action.new_chat'));
    expect(onNewChat).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('tab', { name: 'ai.chat.tab.code' }));
    expect(onChangeTab).toHaveBeenCalledWith('code');
  });
});
