import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, MessageSquare, FileText, Brain, 
  ChevronLeft, Plus, Search, Clock, BookOpen, 
  Trash2, Settings, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../api/ai';
import { useAppStore } from '../store';
import AISettingsModal from '../components/AISettingsModal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/ModeToggle';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
}

const AIPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 TOPEMS AI 助手，基于本地知识库为您提供服务。请告诉我有什么可以帮助您的？',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    
    loadDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDocuments = async () => {
    try {
      const response = await aiApi.listDocuments();
      if (response.success && response.data) {
        const docs = ('items' in response.data) ? response.data.items : response.data;
        setDocuments(docs);
        const sampleConversations: Conversation[] = [
          {
            id: '1',
            title: '项目相关咨询',
            lastMessage: '关于项目管理的问题...',
            updatedAt: new Date(Date.now() - 3600000)
          },
          {
            id: '2',
            title: '文档检索',
            lastMessage: '查询知识库文档...',
            updatedAt: new Date(Date.now() - 7200000)
          },
          {
            id: '3',
            title: '数据分析',
            lastMessage: '分析试验数据...',
            updatedAt: new Date(Date.now() - 10800000)
          }
        ];
        setConversations(sampleConversations);
      }
    } catch (err) {
      console.error('加载文档列表失败:', err);
      addNotification({ title: '加载失败', message: '加载文档列表失败', type: 'error' });
    }
  };

  const handleNewConversation = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 TOPEMS AI 助手，基于本地知识库为您提供服务。请告诉我有什么可以帮助您的？',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    setCurrentConversationId(null);
    setInputText('');
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `你正在查看会话 ${conversationId}，继续提问吧！`,
      timestamp: new Date()
    }]);
  };

  const handleToggleDocuments = () => {
    setShowDocuments(!showDocuments);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const filteredMessages = messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filteredMessages.length > 0) {
        addNotification({ title: '搜索结果', message: `找到 ${filteredMessages.length} 条匹配结果`, type: 'success' });
      } else {
        addNotification({ title: '搜索结果', message: '未找到匹配结果', type: 'info' });
      }
    }
  };

  const handleDeleteConversation = () => {
    if (confirm('确定要删除当前对话吗？')) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: '你好！我是 TOPEMS AI 助手，基于本地知识库为您提供服务。请告诉我有什么可以帮助您的？',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setCurrentConversationId(null);
      if (currentConversationId) {
        setConversations(prev => prev.filter(c => c.id !== currentConversationId));
      }
    }
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
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setLoading(true);

    try {
      const response = await aiApi.chat({ query: userMessage.content });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.success ? response.data.answer : '抱歉，处理您的请求时出现了问题。',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      addNotification({ title: '回复完成', message: 'AI已收到回复', type: 'success' });
    } catch (err) {
      console.error('AI 问答失败:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，连接 AI 服务时出现了问题，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      addNotification({ title: 'AI服务错误', message: '连接AI服务失败', type: 'error' });
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              AI 知识库
            </h2>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <ModeToggle />
            </div>
          </div>
          <Button 
            onClick={handleNewConversation}
            className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            新对话
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">最近对话</h3>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  currentConversationId === conv.id ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800' : ''
                }`}>
                <div className="flex items-start">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className={`w-5 h-5 ${currentConversationId === conv.id ? 'text-purple-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-sm font-medium line-clamp-1 ${currentConversationId === conv.id ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>{conv.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{conv.lastMessage}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(conv.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <Button variant="ghost" onClick={handleToggleDocuments} className="w-full justify-start">
              <BookOpen className="w-4 h-4 mr-3" />
              文档库 ({documents.length})
            </Button>
            <Button variant="ghost" onClick={handleSettings} className="w-full justify-start">
              <Settings className="w-4 h-4 mr-3" />
              设置
            </Button>
          </div>
          {showDocuments && (
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">知识库文档列表：</p>
              {documents.map((doc) => (
                <div key={doc.id} className="text-sm text-gray-700 dark:text-gray-300 truncate py-1 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
                  • {doc.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">TOPEMS AI</h3>
                <p className="text-sm text-green-600 dark:text-green-400">在线</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索对话..."
                />
                <Button variant="ghost" size="sm" onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="ghost" onClick={handleDeleteConversation} className="text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-3xl">
                <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                  }`}>
                    {message.role === 'user' ? (
                      <span className="text-sm">U</span>
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                  <div className={`rounded-lg p-4 max-w-2xl ${
                    message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700'
                  }`}>
                    <p className={message.role === 'user' ? 'text-white' : 'text-gray-800 dark:text-gray-200'}>{message.content}</p>
                    <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                  <span className="text-gray-600 dark:text-gray-300 text-sm">正在思考...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <Button variant="ghost" size="sm">
                <Plus className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <FileText className="w-5 h-5" />
              </Button>
              <Input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入你的问题..."
                className="flex-1 bg-transparent border-none"
              />
              <Button 
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                发送
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              AI 基于知识库回答，建议仅作参考
            </p>
          </div>
        </div>
      </div>

      <AISettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default AIPage;
