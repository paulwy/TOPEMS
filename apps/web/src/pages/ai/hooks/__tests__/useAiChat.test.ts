import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAiChat, getTypeLabel } from '../useAiChat';

const storeMock = vi.hoisted(() => ({ addNotification: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: storeMock.addNotification })
      : { addNotification: storeMock.addNotification }
  ),
}));

describe('useAiChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.addNotification.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render and return initial state', () => {
    const { result } = renderHook(() => useAiChat());
    expect(result.current).toBeDefined();
    expect(result.current.inputValue).toBe('');
    expect(result.current.selectedModel).toBe('gpt-4');
    expect(result.current.isTyping).toBe(false);
    expect(result.current.activeTab).toBe('qa');
    expect(result.current.showSidebar).toBe(true);
    expect(result.current.copiedId).toBeNull();
    expect(result.current.docFile).toBeNull();
    expect(result.current.docUploadDialog).toBe(false);
    expect(result.current.codeLanguage).toBe('typescript');
  });

  it('should initialize messages and sessions with mock data', () => {
    const { result } = renderHook(() => useAiChat());
    expect(result.current.messages.length).toBeGreaterThan(0);
    expect(result.current.sessions.length).toBeGreaterThan(0);
    expect(result.current.selectedSessionId).toBe('1');
  });

  it('getTypeLabel should return correct type label', () => {
    const t = (key: string) => key;
    expect(getTypeLabel('qa', t)).toBe('ai.chat.type.qa');
    expect(getTypeLabel('summary', t)).toBe('ai.chat.type.summary');
    expect(getTypeLabel('code', t)).toBe('ai.chat.type.code');
    expect(getTypeLabel('general', t)).toBe('ai.chat.type.general');
    expect(getTypeLabel('text', t)).toBe('ai.chat.type.text');
    expect(getTypeLabel(undefined, t)).toBe('ai.chat.type.text');
  });

  it('setInputValue / setSelectedModel / setActiveTab should update state', () => {
    const { result } = renderHook(() => useAiChat());
    act(() => {
      result.current.setInputValue('hello');
      result.current.setSelectedModel('claude');
      result.current.setActiveTab('code');
      result.current.setShowSidebar(false);
      result.current.setDocUploadDialog(true);
      result.current.setCodeLanguage('python');
    });
    expect(result.current.inputValue).toBe('hello');
    expect(result.current.selectedModel).toBe('claude');
    expect(result.current.activeTab).toBe('code');
    expect(result.current.showSidebar).toBe(false);
    expect(result.current.docUploadDialog).toBe(true);
    expect(result.current.codeLanguage).toBe('python');
  });

  it('handleSend should return directly when input is empty', async () => {
    const { result } = renderHook(() => useAiChat());
    const initialLen = result.current.messages.length;
    await act(async () => {
      await result.current.handleSend();
    });
    expect(result.current.messages.length).toBe(initialLen);
    expect(result.current.isTyping).toBe(false);
  });

  it('handleSend should add user message and simulate reply', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAiChat());
    act(() => {
      result.current.setInputValue('hello');
    });
    const initialLen = result.current.messages.length;
    await act(async () => {
      await result.current.handleSend();
    });
    expect(result.current.messages.length).toBe(initialLen + 1);
    expect(result.current.isTyping).toBe(true);
    expect(result.current.inputValue).toBe('');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.messages.length).toBe(initialLen + 2);
    expect(result.current.isTyping).toBe(false);
    expect(result.current.messages[result.current.messages.length - 1].role).toBe('assistant');
  });

  it('handleKeyPress Enter should trigger send', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAiChat());
    act(() => {
      result.current.setInputValue('test');
    });
    const initialLen = result.current.messages.length;
    const preventDefault = vi.fn();
    await act(async () => {
      result.current.handleKeyPress({
        key: 'Enter',
        shiftKey: false,
        preventDefault,
      } as any);
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.messages.length).toBe(initialLen + 1);
  });

  it('handleKeyPress Shift+Enter should not trigger send', () => {
    const { result } = renderHook(() => useAiChat());
    const initialLen = result.current.messages.length;
    const preventDefault = vi.fn();
    act(() => {
      result.current.handleKeyPress({
        key: 'Enter',
        shiftKey: true,
        preventDefault,
      } as any);
    });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.messages.length).toBe(initialLen);
  });

  it('handleCopy should copy content and set copiedId', () => {
    vi.useFakeTimers();
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useAiChat());
    act(() => {
      result.current.handleCopy('hello world', 'msg-1');
    });
    expect(writeText).toHaveBeenCalledWith('hello world');
    expect(result.current.copiedId).toBe('msg-1');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copiedId).toBeNull();
  });

  it('handleNewChat should create new session and clear messages', () => {
    const { result } = renderHook(() => useAiChat());
    const initialSessions = result.current.sessions.length;
    act(() => {
      result.current.handleNewChat();
    });
    expect(result.current.sessions.length).toBe(initialSessions + 1);
    expect(result.current.messages).toEqual([]);
    expect(storeMock.addNotification).toHaveBeenCalled();
  });

  it('handleSelectSession should switch selected session', () => {
    const { result } = renderHook(() => useAiChat());
    act(() => {
      result.current.handleSelectSession('2');
    });
    expect(result.current.selectedSessionId).toBe('2');
    expect(result.current.selectedSession?.id).toBe('2');
  });

  it('handleDeleteSession should delete specified session', () => {
    const { result } = renderHook(() => useAiChat());
    const initialSessions = result.current.sessions.length;
    act(() => {
      result.current.handleDeleteSession('2');
    });
    expect(result.current.sessions.length).toBe(initialSessions - 1);
  });

  it('handleQuickPrompt should set input value and switch tab', () => {
    const { result } = renderHook(() => useAiChat());
    act(() => {
      result.current.handleQuickPrompt({ id: 'p1', label: 'test', category: 'code' });
    });
    expect(result.current.inputValue).toBe('ai.chat.message.please');
    expect(result.current.activeTab).toBe('code');
  });

  it('handleFileUpload should set file and notify', () => {
    const { result } = renderHook(() => useAiChat());
    const mockFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
    act(() => {
      result.current.handleFileUpload({ target: { files: [mockFile] } } as any);
    });
    expect(result.current.docFile).toEqual(mockFile);
    expect(storeMock.addNotification).toHaveBeenCalled();
  });

  it('handleStartSummary should not execute when no file', () => {
    const { result } = renderHook(() => useAiChat());
    const initialTab = result.current.activeTab;
    act(() => {
      result.current.handleStartSummary();
    });
    expect(result.current.activeTab).toBe(initialTab);
  });

  it('handleStartSummary should start summary when file present', () => {
    const { result } = renderHook(() => useAiChat());
    const mockFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
    act(() => {
      result.current.handleFileUpload({ target: { files: [mockFile] } } as any);
    });
    act(() => {
      result.current.handleStartSummary();
    });
    expect(result.current.docUploadDialog).toBe(false);
    expect(result.current.activeTab).toBe('summary');
    expect(result.current.inputValue).toBe('ai.chat.message.summary_prompt');
  });

  it('formatTime should return correct time string', () => {
    const { result } = renderHook(() => useAiChat());
    expect(result.current.formatTime(new Date())).toBe('ai.chat.time.just_now');
    const fiveMinAgo = new Date(Date.now() - 5 * 60000);
    expect(result.current.formatTime(fiveMinAgo)).toBe('ai.chat.time.minutes_ago');
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
    expect(result.current.formatTime(twoHoursAgo)).toBe('ai.chat.time.hours_ago');
  });

  it('should return messagesEndRef', () => {
    const { result } = renderHook(() => useAiChat());
    expect(result.current.messagesEndRef).toBeDefined();
    expect(result.current.messagesEndRef.current).toBeNull();
  });
});
