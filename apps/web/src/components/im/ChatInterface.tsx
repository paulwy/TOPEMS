import { TextField, Button, useTheme } from '@mui/material';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Users, Bell, Search, Plus, ChevronLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChatRoom, ChatMessage, Friend } from '../../api/im';
import { imApi } from '../../api/im';
import type { ImWsMessage } from '../../hooks/useImWebSocket';
import { useImWebSocket } from '../../hooks/useImWebSocket';
import { ChatRoomItem } from './ChatRoomItem';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { CreateRoomModal } from './CreateRoomModal';
import { NotificationList } from './NotificationList';
import { ContactList } from './ContactList';
import { ChatSettingsModal } from './ChatSettingsModal';

import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

type TabType = 'all' | 'direct' | 'group' | 'notifications' | 'contacts';

export const ChatInterface: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

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
    (message: string | ImWsMessage) => {
      const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
      if (selectedRoom && parsedMessage.chat_id === selectedRoom.id) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          chat_id: parsedMessage.chat_id!,
          sender_id: parsedMessage.sender_id,
          sender_name: parsedMessage.sender_name,
          message_type: 'text',
          content: parsedMessage.content,
          created_at: parsedMessage.timestamp,
          is_read: false,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    },
    [selectedRoom]
  );

  const handleWsOpen = useCallback(() => {
    addNotification({
      title: i18n.t('components.chat_interface.k0'),
      message: i18n.t('components.chat_interface.websocket_0'),
      type: 'success',
    });
  }, [addNotification]);

  const handleWsClose = useCallback(() => {
    addNotification({
      title: i18n.t('components.chat_interface.k1'),
      message: i18n.t('components.chat_interface.websocket_1'),
      type: 'warning',
    });
  }, [addNotification]);

  const { isConnected, connect, disconnect, send } = useImWebSocket({
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
        const data: unknown = response.data;
        const rooms = ((data as unknown as Record<string, unknown>).chat_rooms ||
          (data as unknown as Record<string, unknown>).chatRooms ||
          []) as ChatRoom[];
        setChatRooms(rooms);
      }
    } catch (error: unknown) {
      logger.error('Failed to load chat rooms:', error);
      addNotification({
        title: i18n.t('components.chat_interface.k2'),
        message: i18n.t('components.chat_interface.k3'),
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
        title: i18n.t('components.chat_interface.k4'),
        message: i18n.t('components.chat_interface.k5'),
        type: 'error',
      });
    }
  };

  const loadMessages = async (chatRoomId: string) => {
    try {
      const response = await imApi.listChatMessages(chatRoomId);
      if (response.success && response.data) {
        const data: unknown = response.data;
        const msgs = ((data as unknown as Record<string, unknown>).chat_messages ||
          (data as unknown as Record<string, unknown>).chatMessages ||
          []) as ChatMessage[];
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
        title: i18n.t('components.chat_interface.k6'),
        message: i18n.t('components.chat_interface.k7'),
        type: 'error',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm(i18n.t('components.chat_interface.k8'))) return;

    try {
      const response = await imApi.deleteChatMessage(messageId);
      if (response.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        addNotification({
          title: i18n.t('components.chat_interface.k9'),
          message: i18n.t('components.chat_interface.k10'),
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to delete message:', error);
      addNotification({
        title: i18n.t('components.chat_interface.k11'),
        message: i18n.t('components.chat_interface.k12'),
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
          title: i18n.t('components.chat_interface.k13'),
          message: i18n.t('components.chat_interface.k14'),
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
          title: i18n.t('components.chat_interface.k15'),
          message: i18n.t('components.chat_interface.k16'),
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
          title: i18n.t('components.chat_interface.k17'),
          message: i18n.t('components.chat_interface.k18'),
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
          title: i18n.t('components.chat_interface.k19'),
          message: i18n.t('components.chat_interface.k20'),
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to unpin room:', error);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom || !confirm(i18n.t('components.chat_interface.k21'))) return;
    try {
      const response = await imApi.deleteChatRoom(selectedRoom.id);
      if (response.success) {
        setChatRooms((prev) => prev.filter((r) => r.id !== selectedRoom.id));
        setSelectedRoom(null);
        setMessages([]);
        setIsSettingsModalOpen(false);
        addNotification({
          title: i18n.t('components.chat_interface.k22'),
          message: i18n.t('components.chat_interface.k23'),
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to delete room:', error);
      addNotification({
        title: i18n.t('components.chat_interface.k24'),
        message: i18n.t('components.chat_interface.k25'),
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
        const wsMessage: ImWsMessage = {
          msg_type: 'chat',
          chat_id: selectedRoom.id,
          sender_id: 'current-user',
          sender_name: i18n.t('components.chat_interface.k26'),
          content,
          timestamp: new Date().toISOString(),
        };
        send(wsMessage);
      } else {
        const response = await imApi.createChatMessage({
          chat_id: selectedRoom.id,
          sender_id: 'current-user',
          sender_name: i18n.t('components.chat_interface.k27'),
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
        title: i18n.t('components.chat_interface.k28'),
        message: i18n.t('components.chat_interface.k29'),
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
    { id: 'all' as TabType, label: i18n.t('components.chat_interface.k30'), icon: MessageSquare },
    {
      id: 'direct' as TabType,
      label: i18n.t('components.chat_interface.k31'),
      icon: MessageSquare,
    },
    { id: 'group' as TabType, label: i18n.t('components.chat_interface.k32'), icon: Users },
    { id: 'contacts' as TabType, label: i18n.t('components.chat_interface.k33'), icon: User },
    { id: 'notifications' as TabType, label: i18n.t('components.chat_interface.k34'), icon: Bell },
  ];

  return (
    <div
      style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--mui-palette-grey-50)' }}
    >
      <div
        style={{
          width: 320,
          backgroundColor: 'common.white',
          borderRight: '1px solid grey.200',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid var(--mui-palette-divider)' }}>
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
                onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
              >
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </Button>
              <h1 style={{ fontSize: 20, fontWeight: 'bold', color: theme.palette.text.primary }}>
                {i18n.t('components.chat_interface.k2')}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 'full',
                  backgroundColor: isConnected
                    ? theme.palette.success.dark
                    : theme.palette.error.main,
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
                color: theme.palette.text.disabled,
              }}
            />
            <TextField
              size='small'
              placeholder={i18n.t('components.chat_interface.k3')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ pl: 5, width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--mui-palette-divider)' }}>
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
                  borderBottom: `2px solid ${activeTab === tab.id ? theme.palette.primary.main : 'transparent'}`,
                  transition: 'all 0.15s',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color:
                    activeTab === tab.id
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
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
                    borderRadius: 'full',
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
                    color: theme.palette.grey[300],
                    margin: '0 auto',
                    marginBottom: 12,
                  }}
                />
                <p style={{ color: theme.palette.text.secondary }}>
                  {i18n.t('components.chat_interface.k35')}
                </p>
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
                backgroundColor: 'common.white',
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
                  <h2 style={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {selectedRoom.name || i18n.t('components.chat_interface.k36')}
                  </h2>
                  <p style={{ fontSize: 14, color: theme.palette.text.secondary }}>
                    {selectedRoom.room_type === 'direct'
                      ? i18n.t('components.chat_interface.k38')
                      : i18n.t('components.chat_interface.k37')}
                    {!isConnected && i18n.t('components.chat_interface.k4')}
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
                    color: theme.palette.text.disabled,
                  }}
                />
                <TextField
                  size='small'
                  placeholder={i18n.t('components.chat_interface.k5')}
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
                backgroundColor: theme.palette.grey[50],
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
                        color: theme.palette.grey[300],
                        margin: '0 auto',
                        marginBottom: 12,
                      }}
                    />
                    <p style={{ color: theme.palette.text.secondary }}>
                      {i18n.t('components.chat_interface.k39')}
                    </p>
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
                        color: theme.palette.grey[300],
                        margin: '0 auto',
                        marginBottom: 12,
                      }}
                    />
                    <p style={{ color: theme.palette.text.secondary }}>
                      {i18n.t('components.chat_interface.k40')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messageSearchQuery.trim() && filteredMessages.length > 0 && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 8,
                        backgroundColor: 'warning.100',
                        border: '1px solid #fde047',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 14, color: 'yellow.800' }}>
                        {i18n.t('components.chat_interface.k0')} {filteredMessages.length}{' '}
                        {i18n.t('components.chat_interface.k1')}
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
              backgroundColor: theme.palette.grey[50],
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <MessageSquare
                style={{
                  width: 64,
                  height: 64,
                  color: theme.palette.grey[300],
                  margin: '0 auto',
                  marginBottom: 16,
                }}
              />
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  marginBottom: 8,
                }}
              >
                {i18n.t('components.chat_interface.topemsim_6')}
              </h2>
              <p style={{ color: theme.palette.text.secondary, marginBottom: 16 }}>
                {activeTab === 'notifications'
                  ? i18n.t('components.chat_interface.k42')
                  : i18n.t('components.chat_interface.k41')}
              </p>
              {activeTab !== 'notifications' && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  variant='contained'
                >
                  {i18n.t('components.chat_interface.k7')}
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
