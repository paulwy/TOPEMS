import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Send,
  MessageSquare,
  FileText,
  Brain,
  ChevronLeft,
  Plus,
  Search,
  Clock,
  BookOpen,
  Trash2,
  Settings,
  Loader2,
  Sparkles,
  BarChart3,
  FileSearch,
  Copy,
  Check,
  Wand2,
  BarChart2,
  FileStack,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { aiApi } from '../api/ai';
import { useAppStore } from '../store';
import AISettingsModal from '../components/AISettingsModal';
import { AIDocumentGenerator, DocumentManager, AIAnalyzer } from '../components/ai';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/ModeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: string;
  updatedAt: Date;
  assistantRole?: AssistantRole;
}

type AssistantRole = 'general' | 'data' | 'document' | 'code';

interface AssistantRoleConfig {
  id: AssistantRole;
  name: string;
  description: string;
  icon: React.ReactNode;
  systemPrompt: string;
}

const STORAGE_KEY = 'topems_ai_conversations';
const CURRENT_CONVO_KEY = 'topems_ai_current_conversation';

const ASSISTANT_ROLES: AssistantRoleConfig[] = [
  {
    id: 'general',
    name: '通用助手',
    description: '全能型 AI 助手，可处理各种问题',
    icon: <Sparkles className='w-4 h-4' />,
    systemPrompt: '你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。',
  },
  {
    id: 'data',
    name: '数据分析助手',
    description: '专注于数据处理、分析和可视化',
    icon: <BarChart3 className='w-4 h-4' />,
    systemPrompt: '你是 TOPEMS 数据分析助手。专注于帮助用户分析数据、生成统计报告、解释数据趋势和提供数据可视化建议。',
  },
  {
    id: 'document',
    name: '文档助手',
    description: '帮助理解文档、提取信息和总结内容',
    icon: <FileSearch className='w-4 h-4' />,
    systemPrompt:
      '你是 TOPEMS 文档助手。专注于帮助用户理解文档内容、提取关键信息、总结文档要点和回答与文档相关的问题。',
  },
  {
    id: 'code',
    name: '编程助手',
    description: '提供代码审查、调试和最佳实践建议',
    icon: <FileText className='w-4 h-4' />,
    systemPrompt: '你是 TOPEMS 编程助手。专注于帮助用户编写、审查和调试代码，提供编程最佳实践建议，并解释技术概念。',
  },
];

const AIPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'analysis' | 'manage'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentRole, setCurrentRole] = useState<AssistantRole>('general');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从本地存储加载对话历史
  useEffect(() => {
    const savedConversations = localStorage.getItem(STORAGE_KEY);
    const savedCurrentConvo = localStorage.getItem(CURRENT_CONVO_KEY);

    if (savedConversations) {
      const parsedConversations: Conversation[] = JSON.parse(savedConversations).map((conv: any) => ({
        ...conv,
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
      setConversations(parsedConversations);

      if (savedCurrentConvo && parsedConversations.some((conv) => conv.id === savedCurrentConvo)) {
        setCurrentConversationId(savedCurrentConvo);
        const currentConv = parsedConversations.find((conv) => conv.id === savedCurrentConvo);
        if (currentConv) {
          setMessages(currentConv.messages);
          if (currentConv.assistantRole) {
            setCurrentRole(currentConv.assistantRole);
          }
        }
      } else if (parsedConversations.length > 0) {
        const latestConv = parsedConversations[0];
        setCurrentConversationId(latestConv.id);
        setMessages(latestConv.messages);
        if (latestConv.assistantRole) {
          setCurrentRole(latestConv.assistantRole);
        }
      } else {
        createNewConversation();
      }
    } else {
      createNewConversation();
    }

    loadDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 保存对话到本地存储
  const saveConversations = useCallback((updatedConversations: Conversation[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
  }, []);

  // 保存当前对话 ID
  const saveCurrentConversation = useCallback((conversationId: string | null) => {
    if (conversationId) {
      localStorage.setItem(CURRENT_CONVO_KEY, conversationId);
    } else {
      localStorage.removeItem(CURRENT_CONVO_KEY);
    }
    setCurrentConversationId(conversationId);
  }, []);

  // 创建新对话
  const createNewConversation = useCallback(() => {
    const id = Date.now().toString();
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `你好！我是 TOPEMS ${ASSISTANT_ROLES.find((r) => r.id === currentRole)?.name}，基于本地知识库为您提供服务。请告诉我有什么可以帮助您的？`,
      timestamp: new Date(),
    };

    const newConversation: Conversation = {
      id,
      title: '新对话',
      messages: [welcomeMessage],
      lastMessage: '新对话已创建',
      updatedAt: new Date(),
      assistantRole: currentRole,
    };

    const updatedConversations = [newConversation, ...conversations];
    saveConversations(updatedConversations);
    saveCurrentConversation(id);
    setMessages([welcomeMessage]);
    setInputText('');
  }, [currentRole, conversations, saveConversations, saveCurrentConversation]);

  const loadDocuments = async () => {
    try {
      const response = await aiApi.listDocuments();
      if (response.success && response.data) {
        const docs = 'items' in response.data ? response.data.items : response.data;
        setDocuments(docs);
      }
    } catch (err) {
      console.error('加载文档列表失败:', err);
      addNotification({ title: '加载失败', message: '加载文档列表失败', type: 'error' });
    }
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      saveCurrentConversation(conversationId);
      setMessages(conversation.messages);
      if (conversation.assistantRole) {
        setCurrentRole(conversation.assistantRole);
      }
    }
  };

  const handleToggleDocuments = () => {
    setShowDocuments(!showDocuments);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const filteredMessages = messages.filter((msg) => msg.content.toLowerCase().includes(searchQuery.toLowerCase()));
      if (filteredMessages.length > 0) {
        addNotification({ title: '搜索结果', message: `找到 ${filteredMessages.length} 条匹配结果`, type: 'success' });
      } else {
        addNotification({ title: '搜索结果', message: '未找到匹配结果', type: 'info' });
      }
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    if (confirm('确定要删除这个对话吗？')) {
      const updatedConversations = conversations.filter((c) => c.id !== conversationId);
      saveConversations(updatedConversations);

      if (currentConversationId === conversationId) {
        if (updatedConversations.length > 0) {
          handleSelectConversation(updatedConversations[0].id);
        } else {
          createNewConversation();
        }
      }
    }
  };

  // 切换助手角色
  const handleRoleChange = (role: AssistantRole) => {
    setCurrentRole(role);
    // 更新当前对话的角色
    if (currentConversationId) {
      const updatedConversations = conversations.map((conv) =>
        conv.id === currentConversationId ? { ...conv, assistantRole: role } : conv
      );
      saveConversations(updatedConversations);
    }
  };

  // 复制代码
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      addNotification({ title: '已复制', message: '代码已复制到剪贴板', type: 'success' });
    } catch (err) {
      addNotification({ title: '复制失败', message: '无法复制代码', type: 'error' });
    }
  };

  // Markdown 渲染组件
  const MarkdownRenderer = ({ content, isDark }: { content: string; isDark: boolean }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');

            if (!inline && match) {
              return (
                <div className='relative group'>
                  <button
                    onClick={() => handleCopyCode(codeContent)}
                    className='absolute right-2 top-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity'
                    title='复制代码'
                  >
                    {copiedCode === codeContent ? (
                      <Check className='w-4 h-4 text-green-400' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </button>
                  <SyntaxHighlighter
                    style={isDark ? vscDarkPlus : vs}
                    language={match[1]}
                    PreTag='div'
                    className='rounded-md text-sm my-2'
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                    {...props}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </div>
              );
            } else {
              return (
                <code
                  className={`${className} px-1.5 py-0.5 rounded text-sm ${
                    isDark ? 'bg-gray-700 text-pink-300' : 'bg-gray-100 text-pink-600'
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
          },
          // 其他 Markdown 元素的样式
          h1: ({ ...props }) => (
            <h1 className='text-2xl font-bold mb-4 mt-6 text-gray-900 dark:text-gray-100' {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className='text-xl font-semibold mb-3 mt-5 text-gray-900 dark:text-gray-100' {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className='text-lg font-semibold mb-2 mt-4 text-gray-900 dark:text-gray-100' {...props} />
          ),
          p: ({ ...props }) => <p className='mb-3 leading-relaxed text-gray-700 dark:text-gray-300' {...props} />,
          ul: ({ ...props }) => (
            <ul className='list-disc pl-6 mb-3 space-y-1 text-gray-700 dark:text-gray-300' {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className='list-decimal pl-6 mb-3 space-y-1 text-gray-700 dark:text-gray-300' {...props} />
          ),
          li: ({ ...props }) => <li className='mb-1' {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className='border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              {...props}
            />
          ),
          a: ({ ...props }) => (
            <a
              className='text-blue-600 dark:text-blue-400 hover:underline'
              target='_blank'
              rel='noopener noreferrer'
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className='overflow-x-auto my-3'>
              <table className='min-w-full border-collapse border border-gray-300 dark:border-gray-600' {...props} />
            </div>
          ),
          thead: ({ ...props }) => <thead className='bg-gray-100 dark:bg-gray-800' {...props} />,
          th: ({ ...props }) => (
            <th
              className='border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100 font-semibold'
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td
              className='border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300'
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);
    setLoading(true);

    try {
      const response = await aiApi.chat({ query: userMessage.content });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.success ? response.data.answer : '抱歉，处理您的请求时出现了问题。',
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // 更新或创建对话
      if (currentConversationId) {
        const updatedConversations = conversations.map((conv) => {
          if (conv.id === currentConversationId) {
            // 自动生成标题（使用第一条用户消息或前30个字符）
            const firstUserMessage = finalMessages.find((m) => m.role === 'user');
            const title = firstUserMessage
              ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
              : conv.title;

            return {
              ...conv,
              messages: finalMessages,
              title,
              lastMessage:
                assistantMessage.content.substring(0, 50) + (assistantMessage.content.length > 50 ? '...' : ''),
              updatedAt: new Date(),
            };
          }
          return conv;
        });
        saveConversations(updatedConversations);
      }

      addNotification({ title: '回复完成', message: 'AI已收到回复', type: 'success' });
    } catch (err) {
      console.error('AI 问答失败:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，连接 AI 服务时出现了问题，请稍后重试。',
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);

      if (currentConversationId) {
        const updatedConversations = conversations.map((conv) =>
          conv.id === currentConversationId ? { ...conv, messages: finalMessages, updatedAt: new Date() } : conv
        );
        saveConversations(updatedConversations);
      }

      addNotification({ title: 'AI服务错误', message: '连接AI服务失败', type: 'error' });
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDocumentGenerated = (content: string) => {
    addNotification({ title: '文档生成成功', message: '文档已成功生成', type: 'success' });
    setShowDocumentGenerator(false);
  };

  return (
    <div className='flex h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100'>AI 智能助手</h2>
            <div className='flex items-center space-x-2'>
              <Button variant='ghost' onClick={() => navigate('/dashboard')}>
                <ChevronLeft className='w-5 h-5' />
              </Button>
              <ModeToggle />
            </div>
          </div>
          <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'documents' | 'analysis' | 'manage')} className='w-full mb-4'>
            <TabsList className='w-full grid grid-cols-4'>
              <TabsTrigger value='chat' className='flex items-center gap-1 text-xs'>
                <MessageSquare className='w-4 h-4' />
                <span>AI 聊天</span>
              </TabsTrigger>
              <TabsTrigger value='documents' className='flex items-center gap-1 text-xs'>
                <Wand2 className='w-4 h-4' />
                <span>文档生成</span>
              </TabsTrigger>
              <TabsTrigger value='analysis' className='flex items-center gap-1 text-xs'>
                <BarChart2 className='w-4 h-4' />
                <span>文本分析</span>
              </TabsTrigger>
              <TabsTrigger value='manage' className='flex items-center gap-1 text-xs'>
                <FileStack className='w-4 h-4' />
                <span>文档管理</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab === 'chat' && (
            <Button onClick={handleNewConversation} className='w-full'>
              <Plus className='w-4 h-4 mr-2' />
              新对话
            </Button>
          )}
        </div>

        {activeTab === 'chat' && (
          <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='w-full justify-start'>
                  <div className='flex items-center space-x-2'>
                    {ASSISTANT_ROLES.find((r) => r.id === currentRole)?.icon}
                    <span className='text-sm'>{ASSISTANT_ROLES.find((r) => r.id === currentRole)?.name}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-56'>
                {ASSISTANT_ROLES.map((role) => (
                  <DropdownMenuItem key={role.id} onClick={() => handleRoleChange(role.id)} className='cursor-pointer'>
                    <div className='flex items-center space-x-2'>
                      {role.icon}
                      <div>
                        <p className='text-sm font-medium'>{role.name}</p>
                        <p className='text-xs text-gray-500'>{role.description}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className='flex-1 overflow-y-auto p-4'>
            <h3 className='text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3'>最近对话</h3>
            <div className='space-y-2'>
              {conversations.map((conv) => (
                <div key={conv.id} className='group'>
                  <div
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800'
                        : ''
                    }`}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex items-start space-x-3 flex-1 min-w-0'>
                        <div className='flex items-center'>
                          {conv.assistantRole && ASSISTANT_ROLES.find((r) => r.id === conv.assistantRole)?.icon}
                          {!conv.assistantRole && (
                            <MessageSquare
                              className={`w-5 h-5 ${currentConversationId === conv.id ? 'text-purple-500' : 'text-gray-400'}`}
                            />
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p
                            className={`text-sm font-medium line-clamp-1 ${currentConversationId === conv.id ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}
                          >
                            {conv.title}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400 line-clamp-1'>{conv.lastMessage}</p>
                        </div>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className='opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                    <p className='text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center'>
                      <Clock className='w-3 h-3 mr-1' />
                      {formatTime(conv.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className='flex-1 overflow-y-auto p-4'>
            <h3 className='text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3'>快速开始</h3>
            <div className='space-y-3'>
              <Card 
                className='cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors' 
                onClick={() => setShowDocumentGenerator(true)}
              >
                <CardContent className='p-4'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-purple-100 rounded-lg'>
                      <Wand2 className='w-5 h-5 text-purple-600' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>新建文档</p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>选择模板，AI 自动生成</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
          <div className='space-y-2'>
            {activeTab === 'chat' && (
              <Button variant='ghost' onClick={handleToggleDocuments} className='w-full justify-start'>
                <BookOpen className='w-4 h-4 mr-3' />
                文档库 ({documents.length})
              </Button>
            )}
            <Button variant='ghost' onClick={handleSettings} className='w-full justify-start'>
              <Settings className='w-4 h-4 mr-3' />
              设置
            </Button>
          </div>
          {showDocuments && activeTab === 'chat' && (
            <div className='mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-h-40 overflow-y-auto'>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>知识库文档列表：</p>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className='text-sm text-gray-700 dark:text-gray-300 truncate py-1 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer'
                >
                  • {doc.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='flex-1 flex flex-col'>
        {activeTab === 'chat' && (
          <>
            <header className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center'>
                    <Brain className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-gray-900 dark:text-gray-100'>
                      TOPEMS {ASSISTANT_ROLES.find((r) => r.id === currentRole)?.name}
                    </h3>
                    <p className='text-sm text-green-600 dark:text-green-400'>在线</p>
                  </div>
                </div>
                <div className='flex items-center space-x-3'>
                  <div className='relative'>
                    <Input
                      type='text'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder='搜索对话...'
                    />
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={handleSearch}
                      className='absolute right-2 top-1/2 -translate-y-1/2'
                    >
                      <Search className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            <div className='flex-1 overflow-y-auto p-6 space-y-6'>
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className='max-w-3xl w-full'>
                    <div
                      className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                        }`}
                      >
                        {message.role === 'user' ? <span className='text-sm'>U</span> : <Bot className='w-5 h-5' />}
                      </div>
                      <div
                        className={`rounded-lg p-4 max-w-2xl ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className='text-white whitespace-pre-wrap'>{message.content}</p>
                        ) : (
                          <MarkdownRenderer content={message.content} isDark={false} />
                        )}
                        <p
                          className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className='flex justify-start'>
                  <div className='flex items-start space-x-3'>
                    <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center'>
                      <Bot className='w-5 h-5 text-white' />
                    </div>
                    <div className='bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm flex items-center space-x-2'>
                      <Loader2 className='w-4 h-4 text-purple-500 animate-spin' />
                      <span className='text-gray-600 dark:text-gray-300 text-sm'>正在思考...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className='p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'>
              <div className='max-w-4xl mx-auto'>
                <div className='flex items-center space-x-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600'>
                  <Button variant='ghost' size='sm'>
                    <Plus className='w-5 h-5' />
                  </Button>
                  <Button variant='ghost' size='sm'>
                    <FileText className='w-5 h-5' />
                  </Button>
                  <Input
                    type='text'
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder='输入你的问题...'
                    className='flex-1 bg-transparent border-none'
                  />
                  <Button onClick={handleSend} disabled={!inputText.trim() || isTyping}>
                    {loading ? <Loader2 className='w-5 h-5 animate-spin mr-2' /> : <Send className='w-5 h-5 mr-2' />}
                    发送
                  </Button>
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400 text-center mt-2'>AI 基于知识库回答，建议仅作参考</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'documents' && (
          <div className='flex-1 p-6'>
            <Card className='h-full'>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-purple-100 rounded-lg'>
                      <Wand2 className='w-6 h-6 text-purple-600' />
                    </div>
                    <div>
                      <CardTitle className='text-xl'>AI 文档生成</CardTitle>
                      <p className='text-sm text-gray-500'>选择模板，填写信息，AI 帮你生成专业文档</p>
                    </div>
                  </div>
                  <Button onClick={() => setShowDocumentGenerator(true)}>
                    <Plus className='w-4 h-4 mr-2' />
                    开始创建
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-center py-12 text-gray-500'>
                  <Wand2 className='w-16 h-16 mx-auto mb-4 opacity-50' />
                  <p>点击"开始创建"选择模板并生成文档</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className='flex-1 p-6'>
            <Card className='h-full'>
              <CardHeader>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-blue-100 rounded-lg'>
                    <BarChart2 className='w-6 h-6 text-blue-600' />
                  </div>
                  <div>
                    <CardTitle className='text-xl'>AI 文本分析</CardTitle>
                    <p className='text-sm text-gray-500'>对文本进行情感分析、分类、实体提取和关键词提取</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AIAnalyzer
                  isOpen={true}
                  onClose={() => setShowAnalyzer(false)}
                  onAnalysisComplete={(results) => {
                    addNotification({
                      title: '分析完成',
                      message: '文本分析已完成',
                      type: 'success',
                    });
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className='flex-1 p-6 overflow-auto'>
            <DocumentManager />
          </div>
        )}
      </div>

      <AISettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <AIDocumentGenerator 
        isOpen={showDocumentGenerator}
        onClose={() => setShowDocumentGenerator(false)}
        onDocumentGenerated={handleDocumentGenerated}
      />
      <AIAnalyzer
        isOpen={showAnalyzer}
        onClose={() => setShowAnalyzer(false)}
        onAnalysisComplete={(results) => {
          addNotification({
            title: '分析完成',
            message: '文本分析已完成',
            type: 'success',
          });
        }}
      />
    </div>
  );
};

export default AIPage;
