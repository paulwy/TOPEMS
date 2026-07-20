import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Chip,
  Paper,
  LinearProgress,
} from '@mui/material';
import { Upload, X, File, FileImage, FileText, FileArchive, FileCode } from 'lucide-react';

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export interface FileUploadLocale {
  dragText?: string;
  clickText?: string;
  maxSizeText?: string;
  maxFilesText?: string;
  acceptText?: string;
  processing?: string;
  completed?: string;
  failed?: string;
  retry?: string;
  remove?: string;
  sizeExceeded?: string;
  uploadFailed?: string;
}

export interface FileUploadProps {
  files?: UploadFile[];
  onChange?: (files: UploadFile[]) => void;
  onUpload?: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  locale?: FileUploadLocale;
}

const FileIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type.startsWith('image/')) return <FileImage size={20} />;
  if (type.includes('pdf') || type.includes('document')) return <FileText size={20} />;
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return <FileArchive size={20} />;
  if (type.includes('code') || type.includes('json') || type.includes('xml') || type.includes('javascript')) return <FileCode size={20} />;
  return <File size={20} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileUpload: React.FC<FileUploadProps> = ({
  files = [],
  onChange,
  onUpload,
  accept,
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  disabled = false,
  fullWidth = false,
  className,
  locale,
}) => {
  const dragText = locale?.dragText ?? '拖拽文件到此处，或点击选择文件';
  const clickText = locale?.clickText ?? '点击选择文件';
  const processingText = locale?.processing ?? '处理中...';
  const completedText = locale?.completed ?? '上传完成';
  const failedText = locale?.failed ?? '上传失败';
  const retryText = locale?.retry ?? '重试';
  const removeText = locale?.remove ?? '移除';
  const sizeExceededText = locale?.sizeExceeded ?? '文件大小超过限制';
  const uploadFailedText = locale?.uploadFailed ?? '上传失败';
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [disabled]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    handleFiles(selectedFiles);
    event.target.value = '';
  }, []);

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const validFiles: UploadFile[] = [];
    
    for (const file of newFiles) {
      if (files.length + validFiles.length >= maxFiles) {
        break;
      }
      
      if (file.size > maxSize) {
        validFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'error',
          error: sizeExceededText,
        });
        continue;
      }
      
      validFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending',
      });
    }
    
    const updatedFiles = [...files, ...validFiles];
    onChange?.(updatedFiles);
    
    if (onUpload) {
      const pendingFiles = validFiles.filter((f) => f.status === 'pending');
      const fileObjects = newFiles.slice(0, pendingFiles.length);
      
      try {
        await onUpload(fileObjects);
        
        const completedFiles = updatedFiles.map((file) => {
          if (file.status === 'pending') {
            return { ...file, status: 'completed' as const, progress: 100 };
          }
          return file;
        });
        
        onChange?.(completedFiles);
      } catch {
        const errorFiles = updatedFiles.map((file) => {
          if (file.status === 'pending') {
            return { ...file, status: 'error' as const, error: uploadFailedText };
          }
          return file;
        });
        
        onChange?.(errorFiles);
      }
    }
  }, [files, maxFiles, maxSize, onChange, onUpload]);

  const handleRemove = useCallback((fileId: string) => {
    const updatedFiles = files.filter((file) => file.id !== fileId);
    onChange?.(updatedFiles);
  }, [files, onChange]);

  return (
    <Box className={className}>
      <Paper
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          p: 4,
          border: `2px dashed ${isDragging ? 'primary.main' : 'divider'}`,
          backgroundColor: isDragging ? 'primary.light' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          textAlign: 'center',
          ...(fullWidth && { width: '100%' }),
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Upload
            size={48}
            sx={{
              mx: 'auto',
              color: isDragging ? 'primary.main' : 'text.secondary',
            }}
          />
        </Box>
        
        <Typography variant="body1" sx={{ mb: 1 }}>
          {isDragging ? dragText : clickText}
        </Typography>
        
        <Typography variant="caption" color="text.secondary">
          {locale?.acceptText ?? `支持 ${accept || '所有格式'} 文件，最大 ${formatFileSize(maxSize)}，最多 ${maxFiles} 个文件`}
        </Typography>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />
      </Paper>

      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {files.map((file) => (
            <Box
              key={file.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                mb: 1,
                backgroundColor: 'background.default',
                borderRadius: 1,
                border: file.status === 'error' ? '1px solid error.main' : '1px solid divider',
              }}
            >
              <Box sx={{ color: file.status === 'error' ? 'error.main' : 'text.secondary' }}>
                <FileIcon type={file.type} />
              </Box>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(file.size)}
                </Typography>
                
                {file.status === 'uploading' && (
                  <LinearProgress
                    value={file.progress}
                    sx={{ mt: 1, height: 4 }}
                  />
                )}
              </Box>
              
              <Chip
                label={
                  file.status === 'pending' ? (locale?.processing ?? '等待上传') :
                  file.status === 'uploading' ? `${locale?.processing ?? '上传中'} ${file.progress}%` :
                  file.status === 'completed' ? completedText :
                  failedText
                }
                size="small"
                color={
                  file.status === 'completed' ? 'success' :
                  file.status === 'error' ? 'error' :
                  file.status === 'uploading' ? 'primary' :
                  'default'
                }
              />
              
              <IconButton onClick={() => handleRemove(file.id)} size="small" aria-label={removeText}>
                <X size={18} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export { FileUpload };