import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MessageSquare, Users, User, Clock, BellOff, Pin, MoreVertical } from 'lucide-react';
import type { ChatRoom } from '../../api/im';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ChatRoomItemProps {
  chatRoom: ChatRoom;
  isActive: boolean;
  onClick: () => void;
  onSettings?: (e: React.MouseEvent) => void;
}

export const ChatRoomItem: React.FC<ChatRoomItemProps> = ({
  chatRoom,
  isActive,
  onClick,
  onSettings,
}) => {
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  const theme = useTheme();
  useEffect(() => {
    const fetchOnlineStatus = async () => {
      const status: Record<string, boolean> = {};
      const members = Array.isArray(chatRoom.members) ? chatRoom.members : [];
      for (const memberId of members.slice(0, 5)) {
        try {
          const response = await fetch(`/im/api/users/${memberId}/online-status`);
          const data = await response.json();
          status[memberId] = data.data?.is_online || false;
        } catch {
          status[memberId] = false;
        }
      }
      setOnlineStatus(status);
    };

    fetchOnlineStatus();
    const interval = setInterval(fetchOnlineStatus, 30000);

    return () => clearInterval(interval);
  }, [chatRoom.members]);

  const getRoomIcon = () => {
    switch (chatRoom.room_type) {
      case 'direct':
        return <User style={{ width: 20, height: 20 }} />;
      case 'group':
        return <Users style={{ width: 20, height: 20 }} />;
      default:
        return <MessageSquare style={{ width: 20, height: 20 }} />;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return i18n.t('im.chat_room_item.k0');
    } else if (days < 7) {
      return `${days}${i18n.t('components.chat_room_item.k0')}`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getMemberCount = () => {
    if (Array.isArray(chatRoom.members)) {
      return chatRoom.members.length;
    }
    return 0;
  };

  const getOnlineCount = () => {
    const members = Array.isArray(chatRoom.members) ? chatRoom.members : [];
    return members.filter((m) => onlineStatus[m]).length;
  };

  const members = Array.isArray(chatRoom.members) ? chatRoom.members : [];
  const isOnline =
    chatRoom.room_type === 'direct' && members.length > 0 && onlineStatus[members[0]];

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        padding: 12,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        backgroundColor: isActive
          ? designTokens.colors.secondary[50]
          : chatRoom.is_pinned
            ? `${alpha(theme.palette.warning.main, 0.1)}`
            : undefined,
        borderLeft: isActive ? '4px solid primary.main' : '4px solid transparent',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 4,
        }}
      >
        {chatRoom.is_pinned && (
          <Pin style={{ width: 12, height: 12, color: theme.palette.warning.main }} />
        )}
        {chatRoom.is_muted && (
          <BellOff style={{ width: 12, height: 12, color: theme.palette.text.disabled }} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? theme.palette.primary.main : theme.palette.grey[200],
              color: isActive
                ? 'var(--color-primary-foreground)'
                : theme.palette.text.secondary,
            }}
          >
            {getRoomIcon()}
          </div>
          {isOnline && (
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 14,
                height: 14,
                backgroundColor: theme.palette.success.dark,
                borderRadius: 'full',
                border: '2px solid var(--color-primary-foreground)',
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontWeight: 500,
                color: theme.palette.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                paddingRight: 32,
              }}
            >
              {chatRoom.name || i18n.t('im.chat_room_item.k1')}
            </h3>
            {chatRoom.last_message_time && (
              <span
                style={{
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Clock style={{ width: 12, height: 12 }} />
                {formatTime(chatRoom.last_message_time)}
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: theme.palette.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {chatRoom.last_message || i18n.t('im.chat_room_item.k2')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {chatRoom.room_type !== 'direct' && (
                <span
                  style={{
                    fontSize: 12,
                    color: theme.palette.text.disabled,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {getOnlineCount() > 0 && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: theme.palette.success.dark,
                        borderRadius: 'full',
                      }}
                    />
                  )}
                  {getMemberCount()}
                  {i18n.t('components.chat_room_item.k0')}
                </span>
              )}
              {chatRoom.room_type === 'direct' && (
                <span
                  style={{
                    fontSize: 12,
                    color: isOnline ? theme.palette.success.dark : theme.palette.text.disabled,
                  }}
                >
                  {isOnline ? i18n.t('im.chat_room_item.k4') : i18n.t('im.chat_room_item.k3')}
                </span>
              )}
              {onSettings && (
                <button
                  onClick={onSettings}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical
                    style={{ width: 16, height: 16, color: theme.palette.text.disabled }}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
