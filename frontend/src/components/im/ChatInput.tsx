import React, { useState, useRef } from 'react';
import { Send, Paperclip, Image, FileText, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSendMessage: (content: string, type: 'text' | 'image' | 'file', fileUrl?: string, fileName?: string) => void;
  onUploadFile?: (file: File) => Promise<{ url: string; name: string } | null>;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFile,
  disabled = false,
  placeholder = '输入消息...',
}) => {
  const [message, setMessage] = useState('');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (type === 'image') {
        // 对于图片，创建本地预览
        const reader = new FileReader();
        reader.onload = () => {
          onSendMessage(reader.result as string, 'image', reader.result as string, file.name);
        };
        reader.readAsDataURL(file);
      } else if (onUploadFile) {
        // 对于文件，上传到服务器
        const result = await onUploadFile(file);
        if (result) {
          onSendMessage(file.name, 'file', result.url, result.name);
        }
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
      setShowFileMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  return (
    <div className='border-t border-gray-200 bg-white p-4'>
      <div className='flex items-end gap-3'>
        <div className='relative'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowFileMenu(!showFileMenu)}
            disabled={disabled || uploading}
            className='p-2'
          >
            <Paperclip className='w-5 h-5 text-gray-500' />
          </Button>

          {showFileMenu && (
            <div className='absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10'>
              <label className='flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer'>
                <Image className='w-4 h-4 mr-2 text-gray-500' />
                <span className='text-sm text-gray-700'>图片</span>
                <input
                  ref={imageInputRef}
                  type='file'
                  accept='image/*'
                  onChange={(e) => handleFileUpload(e, 'image')}
                  className='hidden'
                  disabled={uploading}
                />
              </label>
              <label className='flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer'>
                <FileText className='w-4 h-4 mr-2 text-gray-500' />
                <span className='text-sm text-gray-700'>文件</span>
                <input
                  ref={fileInputRef}
                  type='file'
                  onChange={(e) => handleFileUpload(e, 'file')}
                  className='hidden'
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>

        <div className='flex-1'>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || uploading}
            className='min-h-[40px] max-h-[120px] resize-none'
            rows={1}
          />
        </div>

        <Button onClick={handleSend} disabled={!message.trim() || disabled || uploading} size='sm' className='p-2'>
          <Send className='w-5 h-5' />
        </Button>
      </div>

      {uploading && (
        <div className='mt-2 text-sm text-gray-500 flex items-center gap-2'>
          <div className='animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-600'></div>
          上传中...
        </div>
      )}
    </div>
  );
};
