import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import ChatHeader from '../ChatHeader';
import ChatInput from '../ChatInput';
import ChatMessageList from '../ChatMessageList';
import ChatSidebar from '../ChatSidebar';
import DocUploadDialog from '../DocUploadDialog';
import type { ChatMode, ChatSession, Message, QuickPrompt } from '../../hooks/useAiChat';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

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

  it('ChatHeader 在未选择会话时显示默认标题', () => {
    renderWithProviders(
      <ChatHeader
        selectedSession={undefined}
        selectedModel='gpt-3.5'
        activeTab='general'
        onToggleSidebar={vi.fn()}
        onChangeModel={vi.fn()}
        onNewChat={vi.fn()}
        onChangeTab={vi.fn()}
      />
    );

    expect(screen.getByText('ai.chat.title.default')).toBeInTheDocument();
  });

  it('ChatInput 渲染代码语言选择、输入变化和发送', () => {
    const onChangeInput = vi.fn();
    const onChangeCodeLanguage = vi.fn();
    const onKeyPress = vi.fn();
    const onSend = vi.fn();

    const { container } = renderWithProviders(
      <ChatInput
        activeTab='code'
        inputValue='生成接口代码'
        isTyping={false}
        codeLanguage='typescript'
        onChangeInput={onChangeInput}
        onChangeCodeLanguage={onChangeCodeLanguage}
        onKeyPress={onKeyPress}
        onSend={onSend}
        onOpenDocUpload={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('TypeScript');
    expect(screen.getByPlaceholderText('ai.chat.placeholder.code')).toHaveValue('生成接口代码');

    fireEvent.change(screen.getByPlaceholderText('ai.chat.placeholder.code'), {
      target: { value: '生成 Rust 代码' },
    });
    expect(onChangeInput).toHaveBeenCalledWith('生成 Rust 代码');

    fireEvent.keyDown(screen.getByPlaceholderText('ai.chat.placeholder.code'), { key: 'Enter' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Python' }));
    expect(onChangeCodeLanguage).toHaveBeenCalledWith('python');

    const sendButton = container.querySelectorAll('button')[0];
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('ChatInput 在摘要模式显示上传按钮，空输入或输入中禁用发送', () => {
    const onOpenDocUpload = vi.fn();
    const { container, rerender } = renderWithProviders(
      <ChatInput
        activeTab='summary'
        inputValue=''
        isTyping={false}
        codeLanguage='typescript'
        onChangeInput={vi.fn()}
        onChangeCodeLanguage={vi.fn()}
        onKeyPress={vi.fn()}
        onSend={vi.fn()}
        onOpenDocUpload={onOpenDocUpload}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ai.chat.action.upload_document' }));
    expect(onOpenDocUpload).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('button')[1]).toBeDisabled();

    rerender(
      <ChatInput
        activeTab='qa'
        inputValue='问题'
        isTyping
        codeLanguage='typescript'
        onChangeInput={vi.fn()}
        onChangeCodeLanguage={vi.fn()}
        onKeyPress={vi.fn()}
        onSend={vi.fn()}
        onOpenDocUpload={vi.fn()}
      />
    );
    expect(container.querySelectorAll('button')[0]).toBeDisabled();
  });

  it('ChatMessageList 渲染消息、代码块、复制按钮和用户角色文案', () => {
    const onCopy = vi.fn();
    const ref = React.createRef<HTMLDivElement>();

    renderWithProviders(
      <ChatMessageList
        messages={messages}
        isTyping={false}
        copiedId='m2'
        messagesEndRef={ref}
        onCopy={onCopy}
      />
    );

    expect(screen.getByText('ai.chat.role.user')).toBeInTheDocument();
    expect(screen.getByText('ai.chat.role.assistant')).toBeInTheDocument();
    expect(screen.queryByText('+ ai.chat.role.user +')).not.toBeInTheDocument();
    expect(screen.getByText('帮我分析质量异常')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('const status = "hold";'))
    ).toBeInTheDocument();
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('ai.chat.action.copy_message')[0]);
    expect(onCopy).toHaveBeenCalledWith('帮我分析质量异常', 'm1');
  });

  it('ChatMessageList 渲染输入中状态和空状态', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { rerender } = renderWithProviders(
      <ChatMessageList
        messages={[]}
        isTyping
        copiedId={null}
        messagesEndRef={ref}
        onCopy={vi.fn()}
      />
    );

    expect(screen.getByText('ai.chat.status.typing')).toBeInTheDocument();
    expect(screen.getByText('ai.chat.empty.title')).toBeInTheDocument();

    rerender(
      <ChatMessageList
        messages={[]}
        isTyping={false}
        copiedId={null}
        messagesEndRef={ref}
        onCopy={vi.fn()}
      />
    );
    expect(screen.queryByText('ai.chat.status.typing')).not.toBeInTheDocument();
  });

  it('ChatSidebar 渲染会话、模式和快捷提示，并触发回调', () => {
    const onSelectSession = vi.fn();
    const onDeleteSession = vi.fn();
    const onNewChat = vi.fn();
    const onChangeMode = vi.fn();
    const onQuickPrompt = vi.fn<[QuickPrompt], void>();

    renderWithProviders(
      <ChatSidebar
        sessions={sessions}
        selectedSessionId='s1'
        activeTab='qa'
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
        onNewChat={onNewChat}
        onChangeMode={onChangeMode}
        onQuickPrompt={onQuickPrompt}
        formatTime={(date) => date.toISOString().slice(11, 16)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ai.chat.action.new_chat' }));
    expect(onNewChat).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('代码生成记录'));
    expect(onSelectSession).toHaveBeenCalledWith('s2');

    fireEvent.click(screen.getAllByLabelText('关闭')[0]);
    expect(onDeleteSession).toHaveBeenCalledWith('s1');

    fireEvent.click(screen.getByText('ai.chat.tab.code'));
    expect(onChangeMode).toHaveBeenCalledWith('code');

    fireEvent.click(screen.getByText('ai.chat.quick_prompt.generate_code'));
    expect(onQuickPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ id: '3', category: 'code' })
    );
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('DocUploadDialog 渲染选择状态，并控制开始总结按钮', () => {
    const onClose = vi.fn();
    const onFileUpload = vi.fn();
    const onStartSummary = vi.fn();
    const file = new File(['hello'], 'summary.md', { type: 'text/markdown' });

    const { rerender } = renderWithProviders(
      <DocUploadDialog
        open
        docFile={null}
        onClose={onClose}
        onFileUpload={onFileUpload}
        onStartSummary={onStartSummary}
      />
    );

    expect(screen.getByText('ai.chat.dialog.upload_title')).toBeInTheDocument();
    expect(screen.getByText('ai.chat.dialog.click_to_select')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ai.chat.action.start_summary' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'ai.chat.action.cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const input = document.querySelector('#doc-upload') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileUpload).toHaveBeenCalledTimes(1);

    rerender(
      <DocUploadDialog
        open
        docFile={file}
        onClose={onClose}
        onFileUpload={onFileUpload}
        onStartSummary={onStartSummary}
      />
    );

    expect(screen.getByText('ai.chat.dialog.file_selected:summary.md')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ai.chat.action.start_summary' }));
    expect(onStartSummary).toHaveBeenCalledTimes(1);
  });
});
