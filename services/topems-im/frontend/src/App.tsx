import React, { useState, useEffect, useRef } from 'react';
import { chatroomApi, messageApi, notificationApi, projectGroupApi } from './api/client';
import { ChatroomItem, MessageBubble, NotificationItem, ProjectCard } from './components/Widgets';
import type { Chatroom, ChatMessage, Notification, ProjectGroup, User } from './types';
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
  UserPlus,
  UsersIcon,
  Paperclip,
  Image,
  FileText,
  File
} from 'lucide-react';

const App: React.FC = () => {
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [selectedChatroom, setSelectedChatroom] = useState<Chatroom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'direct' | 'group' | 'projects' | 'notifications'>('chat');
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'direct' | 'group'>('direct');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{name: string, progress: number}[]>([]);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadData();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedChatroom) {
      loadMessages(selectedChatroom.id);
    }
  }, [selectedChatroom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleIncomingMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(connectWebSocket, 5000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleIncomingMessage = (message: any) => {
    if (message.chat_id && selectedChatroom && selectedChatroom.id === message.chat_id) {
      const newMsg: ChatMessage = {
        id: message.id || Date.now().toString(),
        chatroom_id: message.chat_id,
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        message_type: message.message_type || 'text',
        content: message.content,
        attachments: [],
        created_at: message.timestamp || new Date().toISOString(),
        is_read: false,
      };
      setMessages(prev => [...prev, newMsg]);
    }
    
    setChatrooms(prev => prev.map(room => {
      if (room.id === message.chat_id) {
        return {
          ...room,
          last_message: message.content,
          last_message_time: message.timestamp,
          unread_count: room.id === selectedChatroom?.id ? room.unread_count : room.unread_count + 1,
        };
      }
      return room;
    }));
  };

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

      try {
        const usersResponse = await fetch('/api/v1/users');
        const usersData = await usersResponse.json();
        setUsers(usersData.success ? usersData.data : []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleCreateChat = async () => {
    try {
      if (createType === 'direct' && selectedUsers.length === 1) {
        const otherUser = users.find(u => u.id === selectedUsers[0]);
        if (otherUser) {
          const existingRoom = chatrooms.find(r => 
            r.room_type === 'direct' && r.name === otherUser.name
          );
          if (existingRoom) {
            setSelectedChatroom(existingRoom);
            setShowSidebar(false);
          } else {
            const newRoom: Chatroom = {
              id: Date.now().toString(),
              name: otherUser.name,
              room_type: 'direct',
              is_private: true,
              max_members: 2,
              member_count: 2,
              unread_count: 0,
              created_at: new Date().toISOString(),
            };
            setChatrooms([newRoom, ...chatrooms]);
            setSelectedChatroom(newRoom);
            setShowSidebar(false);
          }
        }
      } else if (createType === 'group' && selectedUsers.length >= 2 && groupName) {
        const newRoom: Chatroom = {
          id: Date.now().toString(),
          name: groupName,
          room_type: 'group',
          is_private: false,
          max_members: 100,
          member_count: selectedUsers.length + 1,
          unread_count: 0,
          created_at: new Date().toISOString(),
        };
        setChatrooms([newRoom, ...chatrooms]);
        setSelectedChatroom(newRoom);
        setShowSidebar(false);
      }
      setShowCreateModal(false);
      setSelectedUsers([]);
      setGroupName('');
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      if (createType === 'direct' && selectedUsers.length >= 1) {
        setSelectedUsers([userId]);
      } else if (createType === 'group') {
        setSelectedUsers([...selectedUsers, userId]);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedChatroom) return;

    const newUploads = Array.from(files).map(file => ({
      name: file.name,
      progress: 0
    }));
    setUploadingFiles([...uploadingFiles, ...newUploads]);
    setShowFileMenu(false);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadingFiles(prev => prev.map(u => 
          u.name === fileName ? { ...u, progress } : u
        ));
      }

      const fileMessage: ChatMessage = {
        id: Date.now().toString() + i,
        chatroom_id: selectedChatroom.id,
        sender_id: 'current-user',
        sender_name: '当前用户',
        message_type: 'file',
        content: file.name,
        attachments: [`/files/${file.name}`],
        created_at: new Date().toISOString(),
        is_read: true,
      };

      setMessages(prev => [...prev, fileMessage]);

      setUploadingFiles(prev => prev.filter(u => u.name !== fileName));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedChatroom) return;

    setShowFileMenu(false);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const imageMessage: ChatMessage = {
        id: Date.now().toString() + i,
        chatroom_id: selectedChatroom.id,
        sender_id: 'current-user',
        sender_name: '当前用户',
        message_type: 'image',
        content: URL.createObjectURL(file),
        attachments: [],
        created_at: new Date().toISOString(),
        is_read: true,
      };

      setMessages(prev => [...prev, imageMessage]);
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
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const wsMsg = {
          msg_type: 'message',
          chat_id: selectedChatroom.id,
          sender_id: 'current-user',
          sender_name: '当前用户',
          content: newMessage,
          timestamp: new Date().toISOString(),
        };
        wsRef.current.send(JSON.stringify(wsMsg));
      }
      
      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleEditMessage = async (message: ChatMessage) => {
    if (!editContent.trim()) return;
    
    try {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, content: editContent } : m
      ));
      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageApi.delete(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
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
      <div className={`${showSidebar ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              消息
            </h1>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => { setShowCreateModal(true); setCreateType('direct'); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Settings size={20} />
              </button>
            </div>
          </div>
          
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

        <div className="flex border-b border-gray-200">
          {[
            { key: 'chat', label: '全部', icon: MessageSquare },
            { key: 'direct', label: '私聊', icon: UserPlus },
            { key: 'group', label: '群聊', icon: UsersIcon },
            { key: 'projects', label: '项目', icon: Users },
            { key: 'notifications', label: '通知', icon: Bell, badge: unreadNotifications },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 flex items-center justify-center space-x-1 border-b-2 transition-colors relative ${
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <Icon size={16} />
                <span className="text-xs font-medium">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-2 right-3 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

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
                  <button 
                    onClick={() => { setShowCreateModal(true); setCreateType('direct'); }}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    开始聊天
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'direct' && (
            <div className="p-2 space-y-1">
              {chatrooms.filter(r => r.room_type === 'direct').length > 0 ? (
                chatrooms.filter(r => r.room_type === 'direct').map(chatroom => (
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
                  <UserPlus className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">暂无私聊</p>
                  <button 
                    onClick={() => { setShowCreateModal(true); setCreateType('direct'); }}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    发起私聊
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'group' && (
            <div className="p-2 space-y-1">
              {chatrooms.filter(r => r.room_type === 'group').length > 0 ? (
                chatrooms.filter(r => r.room_type === 'group').map(chatroom => (
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
                  <UsersIcon className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">暂无群聊</p>
                  <button 
                    onClick={() => { setShowCreateModal(true); setCreateType('group'); }}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    创建群聊
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {createType === 'direct' ? '发起私聊' : '创建群聊'}
              </h2>
              <button 
                onClick={() => { setShowCreateModal(false); setSelectedUsers([]); setGroupName(''); }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="flex mb-4">
                <button
                  onClick={() => { setCreateType('direct'); setSelectedUsers([]); }}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    createType === 'direct' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  一对一聊天
                </button>
                <button
                  onClick={() => { setCreateType('group'); setSelectedUsers([]); }}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    createType === 'group' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  群聊
                </button>
              </div>

              {createType === 'group' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">群聊名称</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="请输入群聊名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {createType === 'direct' ? '选择联系人' : '选择群成员'}
                  {createType === 'direct' && selectedUsers.length > 0 && (
                    <span className="ml-2 text-purple-600">已选择 1 人</span>
                  )}
                  {createType === 'group' && (
                    <span className="ml-2 text-purple-600">已选择 {selectedUsers.length} 人</span>
                  )}
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {users.map(user => (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.includes(user.id) 
                          ? 'bg-purple-50 border border-purple-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 ${
                        selectedUsers.includes(user.id) ? 'ring-2 ring-purple-600' : ''
                      }`}>
                        <span className="text-sm font-medium">{user.name[0]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          {user.status === 'online' ? '在线' : user.status === 'away' ? '离开' : '离线'}
                        </p>
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t">
              <button
                onClick={() => { setShowCreateModal(false); setSelectedUsers([]); setGroupName(''); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateChat}
                disabled={
                  (createType === 'direct' && selectedUsers.length !== 1) ||
                  (createType === 'group' && (selectedUsers.length < 2 || !groupName.trim()))
                }
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {selectedChatroom ? (
          <>
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
              <button 
                onClick={() => setShowChatSettings(!showChatSettings)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar bg-gray-50">
              {messages.length > 0 ? (
                messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isSent={message.sender_id === 'current-user'}
                    onEdit={(msg) => { setEditingMessage(msg); setEditContent(msg.content); }}
                    onDelete={handleDeleteMessage}
                    editingId={editingMessage?.id}
                    editContent={editingMessage?.id === message.id ? editContent : ''}
                    onSaveEdit={handleEditMessage}
                    onCancelEdit={() => { setEditingMessage(null); setEditContent(''); }}
                    onChangeEdit={setEditContent}
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

            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <button
                    onClick={() => setShowFileMenu(!showFileMenu)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Paperclip size={20} className="text-gray-500" />
                  </button>
                  
                  {showFileMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                      <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <Image size={18} className="mr-2 text-gray-500" />
                        <span className="text-sm text-gray-700">图片</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <FileText size={18} className="mr-2 text-gray-500" />
                        <span className="text-sm text-gray-700">文档</span>
                        <input
                          type="file"
                          accept=".doc,.docx,.pdf,.txt,.xlsx,.xls"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <File size={18} className="mr-2 text-gray-500" />
                        <span className="text-sm text-gray-700">其他文件</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                
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
              
              {uploadingFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <FileText size={16} className="text-gray-500" />
                      <span className="flex-1 text-gray-700">{file.name}</span>
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-gray-500 w-10 text-right">{file.progress}%</span>
                    </div>
                  ))}
                </div>
              )}
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

      {showChatSettings && selectedChatroom && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">聊天设置</h3>
            <button 
              onClick={() => setShowChatSettings(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl mb-3">
                {selectedChatroom.name.charAt(0).toUpperCase()}
              </div>
              <h4 className="font-semibold text-gray-900">{selectedChatroom.name}</h4>
              <p className="text-sm text-gray-500">
                {selectedChatroom.room_type === 'direct' ? '私聊' : selectedChatroom.room_type === 'group' ? '群聊' : '项目组'}
              </p>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">成员列表</h5>
              <div className="space-y-2">
                {users.slice(0, 5).map(user => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium">{user.name[0]}</span>
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">
                        {user.status === 'online' ? '在线' : user.status === 'away' ? '离开' : '离线'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">聊天信息</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">创建时间</span>
                  <span className="text-gray-900">{new Date(selectedChatroom.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">成员数量</span>
                  <span className="text-gray-900">{selectedChatroom.member_count} 人</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <button className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                退出聊天
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;