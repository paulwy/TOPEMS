/**
 * AI Chat page centralized state + handlers hook.
 *
 * Extracted from AiChatPage to separate stateful logic from presentation.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/store';

export type ChatMode = 'qa' | 'summary' | 'code' | 'general';
export type MessageType = 'text' | 'code' | 'summary' | 'qa' | 'general';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: MessageType;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
  type: ChatMode;
}

export interface QuickPrompt {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactElement;
}

/** Returns the localized label for a message/session type. */
export const getTypeLabel = (type: Message['type'], t: (key: string) => string): string => {
  const labels: Record<string, string> = {
    qa: t('ai.chat.type.qa'),
    summary: t('ai.chat.type.summary'),
    code: t('ai.chat.type.code'),
    general: t('ai.chat.type.general'),
    text: t('ai.chat.type.text'),
  };
  return labels[type || 'text'];
};

const getMockSessions = (t: (key: string) => string): ChatSession[] => [
  {
    id: '1',
    title: t('ai.chat.mock.session_title_1'),
    messages: [],
    timestamp: new Date(Date.now() - 300000),
    type: 'qa',
  },
  {
    id: '2',
    title: t('ai.chat.mock.session_title_2'),
    messages: [],
    timestamp: new Date(Date.now() - 1800000),
    type: 'summary',
  },
  {
    id: '3',
    title: t('ai.chat.mock.session_title_3'),
    messages: [],
    timestamp: new Date(Date.now() - 3600000),
    type: 'code',
  },
  {
    id: '4',
    title: t('ai.chat.mock.session_title_4'),
    messages: [],
    timestamp: new Date(Date.now() - 7200000),
    type: 'general',
  },
];

const getMockMessages = (t: (key: string) => string): Message[] => [
  {
    id: '1',
    role: 'user',
    content: t('ai.chat.mock.message_1'),
    timestamp: new Date(Date.now() - 300000),
    type: 'qa',
  },
  {
    id: '2',
    role: 'assistant',
    content: t('ai.chat.mock.message_2'),
    timestamp: new Date(Date.now() - 280000),
    type: 'qa',
  },
  {
    id: '3',
    role: 'user',
    content: t('ai.chat.mock.message_3'),
    timestamp: new Date(Date.now() - 60000),
    type: 'qa',
  },
  {
    id: '4',
    role: 'assistant',
    content: t('ai.chat.mock.message_4'),
    timestamp: new Date(Date.now() - 30000),
    type: 'qa',
  },
];

export interface UseAiChatResult {
  // state
  messages: Message[];
  inputValue: string;
  selectedModel: string;
  isTyping: boolean;
  activeTab: ChatMode;
  sessions: ChatSession[];
  selectedSessionId: string;
  showSidebar: boolean;
  copiedId: string | null;
  docFile: File | null;
  docUploadDialog: boolean;
  codeLanguage: string;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  selectedSession: ChatSession | undefined;

  // setters
  setInputValue: (v: string) => void;
  setSelectedModel: (v: string) => void;
  setActiveTab: (tab: ChatMode) => void;
  setShowSidebar: (show: boolean) => void;
  setDocUploadDialog: (open: boolean) => void;
  setCodeLanguage: (v: string) => void;

  // callbacks
  handleSend: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleCopy: (content: string, id: string) => void;
  handleNewChat: () => void;
  handleSelectSession: (sessionId: string) => void;
  handleDeleteSession: (sessionId: string) => void;
  handleQuickPrompt: (prompt: QuickPrompt) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStartSummary: () => void;
  formatTime: (date: Date) => string;
}

export const useAiChat = (): UseAiChatResult => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [messages, setMessages] = useState<Message[]>(() => getMockMessages(t));
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatMode>('qa');
  const [sessions, setSessions] = useState<ChatSession[]>(() => getMockSessions(t));
  const [selectedSessionId, setSelectedSessionId] = useState('1');
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploadDialog, setDocUploadDialog] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      type: activeTab,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let responseContent = '';
      switch (activeTab) {
        case 'qa':
          responseContent = t('ai.chat.response.qa');
          break;
        case 'summary':
          responseContent = t('ai.chat.response.summary');
          break;
        case 'code':
          responseContent = t('ai.chat.response.code');
          break;
        default:
          responseContent = t('ai.chat.response.default');
      }

      const assistantMessage: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        type: activeTab,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
      addNotification({
        title: t('ai.chat.message.sent_title'),
        message: t('ai.chat.message.ai_replied'),
        type: 'success',
      });
    }, 1500);
  }, [inputValue, activeTab, addNotification, t]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addNotification({
      title: t('ai.chat.message.copy_success_title'),
      message: t('ai.chat.message.copy_success_body'),
      type: 'success',
    });
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: String(Date.now()),
      title: t('ai.chat.session.new_title'),
      messages: [],
      timestamp: new Date(),
      type: activeTab,
    };
    setSessions((prev) => [newSession, ...prev]);
    setSelectedSessionId(newSession.id);
    setMessages([]);
    addNotification({
      title: t('ai.chat.message.new_session_title'),
      message: t('ai.chat.message.session_created'),
      type: 'info',
    });
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (selectedSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        setSelectedSessionId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        setMessages([]);
      }
    }
    addNotification({
      title: t('ai.chat.message.delete_session_title'),
      message: t('ai.chat.message.session_deleted'),
      type: 'info',
    });
  };

  const handleQuickPrompt = (prompt: QuickPrompt) => {
    setInputValue(t('ai.chat.message.please'));
    setActiveTab(prompt.category as ChatMode);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      addNotification({
        title: t('ai.chat.message.file_upload_title'),
        message: t('ai.chat.message.file_selected'),
        type: 'info',
      });
    }
  };

  const handleStartSummary = () => {
    if (!docFile) return;
    setDocUploadDialog(false);
    setActiveTab('summary');
    setInputValue(t('ai.chat.message.summary_prompt'));
    addNotification({
      title: t('ai.chat.message.start_summary_title'),
      message: t('ai.chat.message.analyzing_document'),
      type: 'info',
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('ai.chat.time.just_now');
    if (minutes < 60) return t('ai.chat.time.minutes_ago', { count: minutes });
    if (hours < 24) return t('ai.chat.time.hours_ago', { count: hours });
    if (days < 7) return t('ai.chat.time.days_ago', { count: days });
    return date.toLocaleDateString();
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return {
    messages,
    inputValue,
    selectedModel,
    isTyping,
    activeTab,
    sessions,
    selectedSessionId,
    showSidebar,
    copiedId,
    docFile,
    docUploadDialog,
    codeLanguage,
    messagesEndRef,
    selectedSession,
    setInputValue,
    setSelectedModel,
    setActiveTab,
    setShowSidebar,
    setDocUploadDialog,
    setCodeLanguage,
    handleSend,
    handleKeyPress,
    handleCopy,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    handleQuickPrompt,
    handleFileUpload,
    handleStartSummary,
    formatTime,
  };
};
