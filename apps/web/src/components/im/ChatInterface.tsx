import { TextField, Button } from '@mui/material';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Users, Bell, Search, Plus, ChevronLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChatRoom, ChatMessage, Friend } from '../../api/im';
import { imApi } from '../../api/im';
import type { WsMessage } from '../../hooks/useWebSocket';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ChatRoomItem } from './ChatRoomItem';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { CreateRoomModal } from './CreateRoomModal';
import { NotificationList } from './NotificationList';
import { ContactList } from './ContactList';
import { ChatSettingsModal } from './ChatSettingsModal';

import { useAppStore } from '../../store';
import { logger } from '@/utils/logger';

type TabType = 'all' | 'direct' | 'group' | 'notifications' | 'contacts';

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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleWsMessage = useCallback(
    (message: WsMessage) => {
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
    [selectedRoom]
  );

  const handleWsOpen = useCallback(() => {
    addNotification({
      title: '连接成功',
      message: 'WebSocket 连接已建立',
      type: 'success',
    });
  }, [addNotification]);

  const handleWsClose = useCallback(() => {
    addNotification({
      title: '连接断开',
      message: 'WebSocket 连接已断开',
      type: 'warning',
    });
  }, [addNotification]);

  const { isConnected, connect, disconnect, send } = useWebSocket({
    onMessage: handleWsMessage,
    onOpen: handleWsOpen,
    onClose: handleWsClose,
  });

  useEffect(() => {
    loadChatRooms();
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      markAllMessagesRead(selectedRoom.id);
    }
  }, [selectedRoom]);

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
    } catch (error: unknown) {
      logger.error('Failed to load chat rooms:', error);
      addNotification({
        title: '加载失败',
        message: '无法加载聊天室列表',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = async (friend: Friend) => {
    try {
      const existingRoom = chatRooms.find(
        (room) => room.room_type === 'direct' && room.members.includes(friend.friend_id)
      );

      if (existingRoom) {
        setSelectedRoom(existingRoom);
        loadMessages(existingRoom.id);
      } else {
        const response = await imApi.createChatRoom({
          name: friend.friend_name,
          room_type: 'direct',
          members: ['current-user', friend.friend_id],
          created_by: 'current-user',
        });

        if (response.success && response.data) {
          const newRoom = response.data;
          setChatRooms((prev) => [newRoom, ...prev]);
          setSelectedRoom(newRoom);
          setMessages([]);
        }
      }
      setActiveTab('direct');
    } catch (error: unknown) {
      logger.error('Failed to create chat room:', error);
      addNotification({
        title: '创建失败',
        message: '无法创建聊天会话',
        type: 'error',
      });
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
    } catch (error: unknown) {
      logger.error('Failed to load messages:', error);
    }
  };

  const markAllMessagesRead = async (_chatRoomId: string) => {
    try {
      const unreadMessages = messages.filter((m) => !m.is_read && m.sender_id !== 'current-user');
      for (const message of unreadMessages) {
        await imApi.markMessageRead(message.id);
      }
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
    } catch (error: unknown) {
      logger.error('Failed to mark messages as read:', error);
    }
  };

  const searchMessages = async (keyword: string) => {
    if (!selectedRoom || !keyword.trim()) {
      setFilteredMessages([]);
      return;
    }

    try {
      const response = await fetch(
        `/im/api/chat-rooms/${selectedRoom.id}/messages/search?keyword=${encodeURIComponent(keyword)}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        setFilteredMessages(data.data.messages || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to search messages:', error);
    }
  };

  const handleEditMessage = async (updatedMessage: ChatMessage) => {
    try {
      const response = await imApi.updateChatMessage(updatedMessage.id, updatedMessage.content);
      if (response.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMessage.id ? { ...m, content: updatedMessage.content } : m
          )
        );
      }
    } catch (error: unknown) {
      logger.error('Failed to edit message:', error);
      addNotification({
        title: '编辑失败',
        message: '无法编辑消息',
        type: 'error',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('确定要删除这条消息吗？')) return;

    try {
      const response = await imApi.deleteChatMessage(messageId);
      if (response.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        addNotification({
          title: '删除成功',
          message: '消息已删除',
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to delete message:', error);
      addNotification({
        title: '删除失败',
        message: '无法删除消息',
        type: 'error',
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMuteRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await imApi.muteChatRoom(selectedRoom.id);
      if (response.success) {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === selectedRoom.id ? { ...r, is_muted: true } : r))
        );
        setSelectedRoom((prev) => (prev ? { ...prev, is_muted: true } : null));
        addNotification({
          title: '成功',
          message: '已开启免打扰',
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to mute room:', error);
    }
  };

  const handleUnmuteRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await imApi.unmuteChatRoom(selectedRoom.id);
      if (response.success) {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === selectedRoom.id ? { ...r, is_muted: false } : r))
        );
        setSelectedRoom((prev) => (prev ? { ...prev, is_muted: false } : null));
        addNotification({
          title: '成功',
          message: '已关闭免打扰',
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to unmute room:', error);
    }
  };

  const handlePinRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await imApi.pinChatRoom(selectedRoom.id);
      if (response.success) {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === selectedRoom.id ? { ...r, is_pinned: true } : r))
        );
        setSelectedRoom((prev) => (prev ? { ...prev, is_pinned: true } : null));
        addNotification({
          title: '成功',
          message: '已置顶会话',
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to pin room:', error);
    }
  };

  const handleUnpinRoom = async () => {
    if (!selectedRoom) return;
    try {
      const response = await imApi.unpinChatRoom(selectedRoom.id);
      if (response.success) {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === selectedRoom.id ? { ...r, is_pinned: false } : r))
        );
        setSelectedRoom((prev) => (prev ? { ...prev, is_pinned: false } : null));
        addNotification({
          title: '成功',
          message: '已取消置顶',
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to unpin room:', error);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom || !confirm('确定要删除这个会话吗？')) return;
    try {
      const response = await imApi.deleteChatRoom(selectedRoom.id);
      if (response.success) {
        setChatRooms((prev) => prev.filter((r) => r.id !== selectedRoom.id));
        setSelectedRoom(null);
        setMessages([]);
        setIsSettingsModalOpen(false);
        addNotification({
          title: '成功',
          message: '会话已删除',
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to delete room:', error);
      addNotification({
        title: '失败',
        message: '删除会话失败',
        type: 'error',
      });
    }
  };

  const handleSendMessage = async (
    content: string,
    type: 'text' | 'image' | 'file',
    fileUrl?: string,
    fileName?: string
  ) => {
    if (!selectedRoom) return;

    try {
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
          setMessages((prev) => [...prev, response.data!]);
        }
      }
    } catch (error: unknown) {
      logger.error('Failed to send message:', error);
      addNotification({
        title: '发送失败',
        message: '消息发送失败',
        type: 'error',
      });
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
    } catch (error: unknown) {
      logger.error('Failed to upload file:', error);
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
    { id: 'contacts' as TabType, label: '通讯录', icon: User },
    { id: 'notifications' as TabType, label: '通知', icon: Bell },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'grey.50' }}>
      <div
        style={{
          width: 320,
          backgroundColor: 'white',
          borderRight: '1px solid grey.200',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid grey.200' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                variant='text'
                size='small'
                onClick={() => navigate('/dashboard')}
              >
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </Button>
              <h1 style={{ fontSize: 20, fontWeight: 'bold', color: 'text.primary' }}>消息</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '9999px',
                  backgroundColor: isConnected ? 'success.dark' : 'error.main',
                }}
              />
              <Button
                variant='text'
                size='small'
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus style={{ width: 20, height: 20 }} />
              </Button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: 'text.disabled',
              }}
            />
            <TextField
              size='small'
              placeholder='搜索聊天...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ pl: 5, width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid grey.200' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  paddingTop: 12,
                  paddingBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  borderBottom: `2px solid ${activeTab === tab.id ? 'primary.main' : 'transparent'}`,
                  transition: 'all 0.15s',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: activeTab === tab.id ? 'primary.main' : 'text.secondary',
                }}
              >
                <Icon style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'notifications' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <NotificationList />
          </div>
        ) : activeTab === 'contacts' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ContactList onSelectContact={(friend) => handleSelectContact(friend)} />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 32,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '9999px',
                    border: '4px solid primary.main',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <MessageSquare
                  style={{
                    width: 48,
                    height: 48,
                    color: 'grey.300',
                    margin: '0 auto',
                    marginBottom: 12,
                  }}
                />
                <p style={{ color: 'text.secondary' }}>暂无聊天记录</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <ChatRoomItem
                  key={room.id}
                  chatRoom={room}
                  isActive={selectedRoom?.id === room.id}
                  onClick={() => setSelectedRoom(room)}
                  onSettings={(e) => {
                    e.stopPropagation();
                    setSelectedRoom(room);
                    setIsSettingsModalOpen(true);
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedRoom && activeTab !== 'notifications' && activeTab !== 'contacts' ? (
          <>
            <div
              style={{
                backgroundColor: 'white',
                borderBottom: '1px solid grey.200',
                padding: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div>
                  <h2 style={{ fontWeight: 600, color: 'text.primary' }}>
                    {selectedRoom.name || '未命名会话'}
                  </h2>
                  <p style={{ fontSize: 14, color: 'text.secondary' }}>
                    {selectedRoom.room_type === 'direct' ? '私聊' : '群聊'}
                    {!isConnected && ' · 连接断开'}
                  </p>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 16,
                    height: 16,
                    color: 'text.disabled',
                  }}
                />
                <TextField
                  size='small'
                  placeholder='搜索消息...'
                  value={messageSearchQuery}
                  onChange={(e) => {
                    setMessageSearchQuery(e.target.value);
                    searchMessages(e.target.value);
                  }}
                  sx={{ pl: 5, width: '100%' }}
                />
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16,
                backgroundColor: 'grey.50',
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <MessageSquare
                      style={{
                        width: 48,
                        height: 48,
                        color: 'grey.300',
                        margin: '0 auto',
                        marginBottom: 12,
                      }}
                    />
                    <p style={{ color: 'text.secondary' }}>暂无消息，开始聊天吧</p>
                  </div>
                </div>
              ) : messageSearchQuery.trim() && filteredMessages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Search
                      style={{
                        width: 48,
                        height: 48,
                        color: 'grey.300',
                        margin: '0 auto',
                        marginBottom: 12,
                      }}
                    />
                    <p style={{ color: 'text.secondary' }}>未找到匹配的消息</p>
                  </div>
                </div>
              ) : (
                <>
                  {messageSearchQuery.trim() && filteredMessages.length > 0 && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 8,
                        backgroundColor: '#fef9c3',
                        border: '1px solid #fde047',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 14, color: '#854d0e' }}>
                        找到 {filteredMessages.length} 条匹配消息
                      </span>
                    </div>
                  )}
                  {(messageSearchQuery.trim() && filteredMessages.length > 0
                    ? filteredMessages
                    : messages
                  ).map((message) => (
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

            <ChatInput
              onSendMessage={handleSendMessage}
              onUploadFile={handleUploadFile}
              disabled={!isConnected}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'grey.50',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <MessageSquare
                style={{
                  width: 64,
                  height: 64,
                  color: 'grey.300',
                  margin: '0 auto',
                  marginBottom: 16,
                }}
              />
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'text.primary',
                  marginBottom: 8,
                }}
              >
                欢迎使用 TOPEMS IM
              </h2>
              <p style={{ color: 'text.secondary', marginBottom: 16 }}>
                {activeTab === 'notifications' ? '查看通知中心' : '选择一个聊天室开始聊天'}
              </p>
              {activeTab !== 'notifications' && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  variant='contained'
                >
                  创建聊天室
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadChatRooms}
      />

      {selectedRoom && (
        <ChatSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          chatRoom={selectedRoom}
          onMute={handleMuteRoom}
          onUnmute={handleUnmuteRoom}
          onPin={handlePinRoom}
          onUnpin={handleUnpinRoom}
          onDelete={handleDeleteRoom}
        />
      )}
    </div>
  );
};
