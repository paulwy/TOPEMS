import React from 'react';
import { User, FileText, Image, Check, CheckCheck } from 'lucide-react';
import type { ChatMessage } from '../../api/im';

interface MessageBubbleProps {
  message: ChatMessage;
  isSent: boolean;
  showStatus?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSent, showStatus = true }) => {
  const isImage = message.message_type === 'image';
  const isFile = message.message_type === 'file';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isSent ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSent ? 'ml-2 bg-indigo-600' : 'mr-2 bg-gray-300'
          }`}
        >
          <User className={`w-4 h-4 ${isSent ? 'text-white' : 'text-gray-600'}`} />
        </div>
        <div className={`rounded-lg p-3 ${isSent ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
          {!isSent && <div className='text-xs font-medium mb-1 opacity-70'>{message.sender_name}</div>}
          {isImage && message.content ? (
            <img
              src={message.content}
              alt='Shared image'
              className='rounded max-w-full cursor-pointer'
              style={{ maxHeight: '300px' }}
              onClick={() => window.open(message.content, '_blank')}
            />
          ) : isFile ? (
            <div className='flex items-center gap-2'>
              <FileText className='w-5 h-5' />
              <a
                href={message.file_url}
                target='_blank'
                rel='noopener noreferrer'
                className={`underline ${isSent ? 'text-white' : 'text-indigo-600'}`}
              >
                {message.file_name || message.content}
              </a>
            </div>
          ) : (
            <div className='whitespace-pre-wrap break-words'>{message.content}</div>
          )}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-xs ${isSent ? 'text-indigo-200' : 'text-gray-500'}`}
          >
            <span>{formatTime(message.created_at)}</span>
            {showStatus &&
              isSent &&
              (message.is_read ? <CheckCheck className='w-3 h-3' /> : <Check className='w-3 h-3' />)}
          </div>
        </div>
      </div>
    </div>
  );
};
