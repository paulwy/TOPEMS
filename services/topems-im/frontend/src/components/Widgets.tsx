import React from 'react';
import type { Chatroom, ChatMessage, Notification } from '../types';

export const ChatroomItem: React.FC<{
  chatroom: Chatroom;
  isActive: boolean;
  onClick: () => void;
}> = ({ chatroom, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg ${
        isActive ? 'bg-purple-50' : ''
      }`}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
          {chatroom.name.charAt(0).toUpperCase()}
        </div>
        {chatroom.room_type === 'direct' && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">{chatroom.name}</h3>
          {chatroom.last_message_time && (
            <span className="text-xs text-gray-500">
              {new Date(chatroom.last_message_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate">{chatroom.last_message || '暂无消息'}</p>
      </div>
      {chatroom.unread_count > 0 && (
        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">{chatroom.unread_count > 9 ? '9+' : chatroom.unread_count}</span>
        </div>
      )}
    </div>
  );
};

export const MessageBubble: React.FC<{ message: ChatMessage; isSent: boolean }> = ({ message, isSent }) => {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3 animate-slide-in`}>
      <div className={`chat-bubble ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
        {!isSent && <p className="text-xs text-gray-500 mb-1 font-medium">{message.sender_name}</p>}
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isSent ? 'text-purple-200' : 'text-gray-400'}`}>
          {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export const NotificationItem: React.FC<{ notification: Notification; onClick: () => void }> = ({ 
  notification, 
  onClick 
}) => {
  const iconColors = {
    info: 'bg-blue-100 text-blue-600',
    warning: 'bg-yellow-100 text-yellow-600',
    success: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
  };

  const icons = {
    info: '💡',
    warning: '⚠️',
    success: '✅',
    error: '❌',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
        !notification.is_read ? 'bg-purple-50' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${iconColors[notification.notification_type]}`}>
          {icons[notification.notification_type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-900">{notification.title}</h4>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">{notification.content}</p>
          <p className="text-xs text-gray-400">
            {new Date(notification.created_at).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>
    </div>
  );
};

export const ProjectCard: React.FC<{
  project: ProjectGroup;
  onClick: () => void;
}> = ({ project, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer animate-fade-in"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{project.name}</h3>
            <p className="text-sm text-gray-500">负责人: {project.leader_name}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          project.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {project.status === 'active' ? '进行中' : '已归档'}
        </span>
      </div>
      {project.description && (
        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
      )}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>👥 {project.member_count} 成员</span>
        <span>创建于 {new Date(project.created_at).toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  );
};
