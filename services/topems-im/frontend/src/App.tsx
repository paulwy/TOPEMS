import React, { useState, useEffect, useRef } from 'react';
import { chatroomApi, messageApi, notificationApi, projectGroupApi } from './api/client';
import { ChatroomItem, MessageBubble, NotificationItem, ProjectCard } from './components/Widgets';
import type { Chatroom, ChatMessage, Notification, ProjectGroup } from './types';
import { 
  MessageSquare, 
  Bell, 
  Users, 
  Search, 
  Send,
  Plus,
  Settings,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react';

const App: React.FC = () => {
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [selectedChatroom, setSelectedChatroom] = useState<Chatroom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'projects' | 'notifications'>('chat');
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedChatroom) {
      loadMessages(selectedChatroom.id);
    }
  }, [selectedChatroom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const [chatroomsData, notificationsData, projectsData] = await Promise.all([
        chatroomApi.getAll(),
        notificationApi.getAll(),
        projectGroupApi.getAll(),
      ]);
      setChatrooms(chatroomsData);
      setNotifications(notificationsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadMessages = async (chatroomId: string) => {
    try {
      const messagesData = await messageApi.getByChatroom(chatroomId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatroom) return;
    
    try {
      const message = await messageApi.send({
        chatroom_id: selectedChatroom.id,
        sender_id: 'current-user',
        sender_name: '当前用户',
        message_type: 'text',
        content: newMessage,
      });
      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredChatrooms = chatrooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              消息
            </h1>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => alert('新建聊天功能开发中')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Settings size={20} />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索聊天..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'chat', label: '聊天', icon: MessageSquare },
            { key: 'projects', label: '项目', icon: Users },
            { key: 'notifications', label: '通知', icon: Bell, badge: unreadNotifications },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 flex items-center justify-center space-x-2 border-b-2 transition-colors relative ${
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {activeTab === 'chat' && (
            <div className="p-2 space-y-1">
              {filteredChatrooms.length > 0 ? (
                filteredChatrooms.map(chatroom => (
                  <ChatroomItem
                    key={chatroom.id}
                    chatroom={chatroom}
                    isActive={selectedChatroom?.id === chatroom.id}
                    onClick={() => {
                      setSelectedChatroom(chatroom);
                      setShowSidebar(false);
                    }}
                  />
                ))
              ) : (
                <div className="p-8 text-center">
                  <MessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">暂无聊天记录</p>
                  <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                    开始聊天
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="p-4 space-y-3">
              {projects.length > 0 ? (
                projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => alert('项目详情开发中')}
                  />
                ))
              ) : (
                <div className="p-8 text-center">
                  <Users className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">暂无项目组</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => alert('通知详情')}
                  />
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bell className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">暂无通知</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChatroom ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center space-x-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">{selectedChatroom.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedChatroom.member_count} 成员 · {selectedChatroom.room_type === 'direct' ? '私聊' : selectedChatroom.room_type === 'group' ? '群聊' : '项目组'}
                </p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Settings size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar bg-gray-50">
              {messages.length > 0 ? (
                messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isSent={message.sender_id === 'current-user'}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">暂无消息，开始聊天吧</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="mx-auto text-gray-300 mb-4" size={64} />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">欢迎使用 TOPEMS IM</h2>
              <p className="text-gray-500">选择一个聊天室开始聊天</p>
              <button
                onClick={() => setShowSidebar(true)}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                查看聊天列表
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
