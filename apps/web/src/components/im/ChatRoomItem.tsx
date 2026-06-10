import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, User, Clock, BellOff, Pin, MoreVertical } from 'lucide-react';
import type { ChatRoom } from '../../api/im';

interface ChatRoomItemProps {
  chatRoom: ChatRoom;
  isActive: boolean;
  onClick: () => void;
  onSettings?: (e: React.MouseEvent) => void;
}

export const ChatRoomItem: React.FC<ChatRoomItemProps> = ({ chatRoom, isActive, onClick, onSettings }) => {
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchOnlineStatus = async () => {
      const status: Record<string, boolean> = {};
      const members = Array.isArray(chatRoom.members) ? chatRoom.members : [];
      for (const memberId of members.slice(0, 5)) {
        try {
          const response = await fetch(`/im/api/v1/users/${memberId}/online-status`);
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
        return <User className='w-5 h-5' />;
      case 'group':
        return <Users className='w-5 h-5' />;
      default:
        return <MessageSquare className='w-5 h-5' />;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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
  const isOnline = chatRoom.room_type === 'direct' && members.length > 0 && onlineStatus[members[0]];

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors relative ${
        isActive ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-gray-50'
      } ${chatRoom.is_pinned ? 'bg-amber-50/50' : ''}`}
    >
      {/* Pinned & Muted Indicators */}
      <div className='absolute top-2 right-2 flex gap-1'>
        {chatRoom.is_pinned && <Pin className='w-3 h-3 text-amber-500' />}
        {chatRoom.is_muted && <BellOff className='w-3 h-3 text-gray-400' />}
      </div>

      <div className='flex items-start gap-3'>
        <div className='relative'>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {getRoomIcon()}
          </div>
          {isOnline && (
            <div className='absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white' />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between'>
            <h3 className='font-medium text-gray-900 truncate pr-8'>{chatRoom.name || '未命名会话'}</h3>
            {chatRoom.last_message_time && (
              <span className='text-xs text-gray-500 flex items-center gap-1'>
                <Clock className='w-3 h-3' />
                {formatTime(chatRoom.last_message_time)}
              </span>
            )}
          </div>
          <div className='flex items-center justify-between mt-1'>
            <p className='text-sm text-gray-500 truncate flex-1'>{chatRoom.last_message || '暂无消息'}</p>
            <div className='flex items-center gap-2'>
              {chatRoom.room_type !== 'direct' && (
                <span className='text-xs text-gray-400 flex items-center gap-1'>
                  {getOnlineCount() > 0 && <span className='w-1.5 h-1.5 bg-green-500 rounded-full' />}
                  {getMemberCount()}人
                </span>
              )}
              {chatRoom.room_type === 'direct' && (
                <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                  {isOnline ? '在线' : '离线'}
                </span>
              )}
              {onSettings && (
                <button onClick={onSettings} className='p-1 rounded hover:bg-gray-200 transition-colors'>
                  <MoreVertical className='w-4 h-4 text-gray-400' />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
