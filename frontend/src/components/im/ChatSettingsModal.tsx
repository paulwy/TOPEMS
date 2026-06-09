import React from 'react';
import { X, BellOff, Bell, Pin, PinOff, Trash2, Users } from 'lucide-react';
import type { ChatRoom } from '../../api/im';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoom: ChatRoom;
  onMute: () => void;
  onUnmute: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  chatRoom,
  onMute,
  onUnmute,
  onPin,
  onUnpin,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200'>
          <h3 className='font-semibold text-gray-900'>聊天设置</h3>
          <button onClick={onClose} className='p-1 rounded-full hover:bg-gray-100 transition-colors'>
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Content */}
        <div className='p-4'>
          {/* Chat Info */}
          <div className='flex items-center gap-3 mb-4 pb-4 border-b border-gray-100'>
            <div className='w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center'>
              <Users className='w-6 h-6 text-indigo-600' />
            </div>
            <div>
              <div className='font-medium text-gray-900'>{chatRoom.name || '未命名会话'}</div>
              <div className='text-sm text-gray-500'>
                {chatRoom.room_type === 'direct' ? '私聊' : '群聊'} · {chatRoom.members?.length || 0} 人
              </div>
            </div>
          </div>

          {/* Settings Options */}
          <div className='space-y-2'>
            {/* Mute Toggle */}
            <button
              onClick={chatRoom.is_muted ? onUnmute : onMute}
              className='w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors'
            >
              {chatRoom.is_muted ? (
                <>
                  <Bell className='w-5 h-5 text-gray-400' />
                  <div className='flex-1 text-left'>
                    <div className='text-sm font-medium text-gray-900'>取消免打扰</div>
                    <div className='text-xs text-gray-500'>接收新消息通知</div>
                  </div>
                </>
              ) : (
                <>
                  <BellOff className='w-5 h-5 text-gray-400' />
                  <div className='flex-1 text-left'>
                    <div className='text-sm font-medium text-gray-900'>消息免打扰</div>
                    <div className='text-xs text-gray-500'>不再接收新消息通知</div>
                  </div>
                </>
              )}
            </button>

            {/* Pin Toggle */}
            <button
              onClick={chatRoom.is_pinned ? onUnpin : onPin}
              className='w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors'
            >
              {chatRoom.is_pinned ? (
                <>
                  <PinOff className='w-5 h-5 text-gray-400' />
                  <div className='flex-1 text-left'>
                    <div className='text-sm font-medium text-gray-900'>取消置顶</div>
                    <div className='text-xs text-gray-500'>从置顶列表移除</div>
                  </div>
                </>
              ) : (
                <>
                  <Pin className='w-5 h-5 text-gray-400' />
                  <div className='flex-1 text-left'>
                    <div className='text-sm font-medium text-gray-900'>置顶会话</div>
                    <div className='text-xs text-gray-500'>将此会话固定在列表顶部</div>
                  </div>
                </>
              )}
            </button>

            {/* Delete */}
            <button
              onClick={onDelete}
              className='w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors'
            >
              <Trash2 className='w-5 h-5 text-red-500' />
              <div className='flex-1 text-left'>
                <div className='text-sm font-medium text-red-600'>删除会话</div>
                <div className='text-xs text-red-400'>删除后无法恢复</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
