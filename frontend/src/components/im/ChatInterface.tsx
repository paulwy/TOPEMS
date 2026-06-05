import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Users, Bell, Search, Plus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { imApi, ChatRoom, ChatMessage } from '../../api/im';
import { useWebSocket, WsMessage } from '../../hooks/useWebSocket';
import { ChatRoomItem } from './ChatRoomItem';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { CreateRoomModal } from './CreateRoomModal';
import { NotificationList } from './NotificationList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '../../store';

type TabType = 'all' | 'direct' | 'group' | 'notifications';

export const ChatInterface: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket 连接
  const { isConnected, connect, disconnect, send } = useWebSocket({
    onMessage: (message: WsMessage) => {
      if (selectedRoom && message.chat_id === selectedRoom.id) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          chat_id: message.chat_id!,
          sender_id: message.sender_id,
          sender_name: message.sender_name,
          message_type: 'text',
          content: message.content,
          created_at: message.timestamp,
          is_read: false,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    },
    onOpen: () => {
      addNotification({ title: '连接成功', message: 'WebSocket 连接已建立', type: 'success' });
    },
    onClose: () => {
      addNotification({ title: '连接断开', message: 'WebSocket 连接已断开', type: 'warning' });
    },
  });

  // 加载聊天室列表
  useEffect(() => {
    loadChatRooms();
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // 加载选中聊天室的消息并标记为已读
  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      markAllMessagesRead(selectedRoom.id);
    }
  }, [selectedRoom]);

  // 滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const response = await imApi.listChatRooms();
      if (response.success && response.data) {
        const data: any = response.data;
        const rooms = data.chat_rooms || data.chatRooms || [];
        setChatRooms(rooms);
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      addNotification({ title: '加载失败', message: '无法加载聊天室列表', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatRoomId: string) => {
    try {
      const response = await imApi.listChatMessages(chatRoomId);
      if (response.success && response.data) {
        const data: any = response.data;
        const msgs = data.chat_messages || data.chatMessages || [];
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markAllMessagesRead = async (chatRoomId: string) => {
    try {
      const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== 'current-user');
      for (const message of unreadMessages) {
        await imApi.markMessageRead(message.id);
      }
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const searchMessages = async (keyword: string) => {
    if (!selectedRoom || !keyword.trim()) {
      setFilteredMessages([]);
      return;
    }

    try {
      const response = await fetch(`/im/api/v1/chat-rooms/${selectedRoom.id}/messages/search?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success && data.data) {
        setFilteredMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to search messages:', error);
    }
  };

  const handleEditMessage = async (updatedMessage: ChatMessage) => {
    try {
      const response = await imApi.updateChatMessage(updatedMessage.id, updatedMessage.content);
      if (response.success) {
        setMessages(prev => prev.map(m => 
          m.id === updatedMessage.id ? { ...m, content: updatedMessage.content } : m
        ));
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      addNotification({ title: '编辑失败', message: '无法编辑消息', type: 'error' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('确定要删除这条消息吗？')) return;

    try {
      const response = await imApi.deleteChatMessage(messageId);
      if (response.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        addNotification({ title: '删除成功', message: '消息已删除', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      addNotification({ title: '删除失败', message: '无法删除消息', type: 'error' });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (
    content: string,
    type: 'text' | 'image' | 'file',
    fileUrl?: string,
    fileName?: string
  ) => {
    if (!selectedRoom) return;

    try {
      // 通过 WebSocket 发送消息
      if (type === 'text' && isConnected) {
        const wsMessage: WsMessage = {
          msg_type: 'chat',
          chat_id: selectedRoom.id,
          sender_id: 'current-user',
          sender_name: '当前用户',
          content,
          timestamp: new Date().toISOString(),
        };
        send(wsMessage);
      } else {
        // 通过 API 发送消息（用于文件等）
        const response = await imApi.createChatMessage({
          chat_id: selectedRoom.id,
          sender_id: 'current-user',
          sender_name: '当前用户',
          message_type: type,
          content,
          file_url: fileUrl,
          file_name: fileName,
        });

        if (response.success && response.data) {
          setMessages((prev) => [...prev, response.data]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addNotification({ title: '发送失败', message: '消息发送失败', type: 'error' });
    }
  };

  const handleUploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await imApi.uploadFile(formData);
      if (response.success && response.data) {
        const uploadedFile = response.data.files?.[0];
        if (uploadedFile) {
          return { url: uploadedFile.file_path, name: uploadedFile.file_name };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return null;
    }
  };

  const filteredRooms = chatRooms.filter((room) => {
    const matchesSearch = room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true;
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'direct' && room.room_type === 'direct') ||
      (activeTab === 'group' && room.room_type === 'group');
    return matchesSearch && matchesTab;
  });

  const tabs = [
    { id: 'all' as TabType, label: '全部', icon: MessageSquare },
    { id: 'direct' as TabType, label: '私聊', icon: MessageSquare },
    { id: 'group' as TabType, label: '群聊', icon: Users },
    { id: 'notifications' as TabType, label: '通知', icon: Bell },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">消息</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索聊天..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex items-center justify-center gap-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chat Rooms List or Notifications */}
        {activeTab === 'notifications' ? (
          <div className="flex-1 overflow-y-auto">
            <NotificationList />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无聊天记录</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <ChatRoomItem
                  key={room.id}
                  chatRoom={room}
                  isActive={selectedRoom?.id === room.id}
                  onClick={() => setSelectedRoom(room)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom && activeTab !== 'notifications' ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedRoom.name || '未命名会话'}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedRoom.room_type === 'direct' ? '私聊' : '群聊'}
                    {!isConnected && ' · 连接断开'}
                  </p>
                </div>
              </div>
              {/* Message Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索消息..."
                  value={messageSearchQuery}
                  onChange={(e) => {
                    setMessageSearchQuery(e.target.value);
                    searchMessages(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">暂无消息，开始聊天吧</p>
                  </div>
                </div>
              ) : messageSearchQuery.trim() && filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">未找到匹配的消息</p>
                  </div>
                </div>
              ) : (
                <>
                  {messageSearchQuery.trim() && filteredMessages.length > 0 && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <span className="text-sm text-yellow-800">
                        找到 {filteredMessages.length} 条匹配消息
                      </span>
                    </div>
                  )}
                  {(messageSearchQuery.trim() && filteredMessages.length > 0 ? filteredMessages : messages).map((message) => (
                    <MessageBubble 
                      key={message.id} 
                      message={message} 
                      isSent={message.sender_id === 'current-user'}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Chat Input */}
            <ChatInput onSendMessage={handleSendMessage} onUploadFile={handleUploadFile} disabled={!isConnected} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">欢迎使用 TOPEMS IM</h2>
              <p className="text-gray-500 mb-4">
                {activeTab === 'notifications' ? '查看通知中心' : '选择一个聊天室开始聊天'}
              </p>
              {activeTab !== 'notifications' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  创建聊天室
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadChatRooms}
      />
    </div>
  );
};
