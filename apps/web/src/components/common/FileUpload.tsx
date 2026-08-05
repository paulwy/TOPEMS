import React, { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  File as FileIcon,
  FileText,
  FileImage,
  FileSpreadsheet,
  Upload,
  X,
  Download,
  Check,
  AlertCircle,
  Pause,
  Play,
} from 'lucide-react';

/**
 * 文件上传组件属性
 */
export interface FileUploadProps {
  /** 当前文件URL列表 */
  value?: string[];
  /** 值改变回调 */
  onChange?: (files: string[]) => void;
  /** 最大上传数量 */
  maxCount?: number;
  /** 允许的文件类型，如 ['.pdf', '.doc', '.docx'] */
  accept?: string[];
  /** 单个文件最大大小（MB） */
  maxSize?: number;
  /** 总文件最大大小（MB） */
  maxTotalSize?: number;
  /** 上传区域高度 */
  height?: number | string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 上传按钮文本 */
  uploadText?: string;
}

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
}

// styled() retained: dynamic custom props (isDragging, isDisabled) require shouldForwardProp
const UploadArea = styled(Box, {
  shouldForwardProp: (prop) => !['isDragging', 'isDisabled'].includes(prop as string),
})<{
  isDragging?: boolean;
  isDisabled?: boolean;
}>(({ theme, isDragging, isDisabled }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  border: `2px dashed ${
    isDragging
      ? theme.palette.primary.main
      : isDisabled
        ? theme.palette.grey[300]
        : theme.palette.divider
  }`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: isDragging
    ? `${theme.palette.primary.light}20`
    : isDisabled
      ? theme.palette.grey[50]
      : 'transparent',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  color: isDisabled ? theme.palette.grey[400] : theme.palette.text.secondary,
  '&:hover': {
    borderColor: isDisabled ? theme.palette.grey[300] : theme.palette.primary.main,
    backgroundColor: isDisabled ? 'transparent' : `${theme.palette.primary.light}10`,
  },
}));

/**
 * 文件上传组件
 * 支持多文件上传、显示上传进度、删除和文件类型限制
 */
const FileUpload: React.FC<FileUploadProps> = ({
  value = [],
  onChange,
  maxCount = 10,
  accept = [],
  maxSize = 10,
  maxTotalSize = 100,
  height = 150,
  disabled = false,
  className,
  uploadText = '选择文件',
}) => {
  const [files, setFiles] = useState<UploadFile[]>(
    value.map((url, index) => {
      const name = url.split('/').pop() || `file-${index}`;
      return {
        id: `existing-${index}`,
        name,
        size: 0,
        type: '',
        url,
        progress: 100,
        status: 'completed' as const,
      };
    })
  );
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 生成唯一ID
   */
  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  /**
   * 获取文件图标
   */
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage size={24} />;
    if (type.includes('spreadsheet') || type.includes('excel'))
      return <FileSpreadsheet size={24} />;
    if (type.includes('pdf')) return <FileText size={24} />;
    return <FileIcon size={24} />;
  };

  /**
   * 格式化文件大小
   */
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '未知大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  /**
   * 验证文件类型
   */
  const validateFileType = (file: File): boolean => {
    if (accept.length === 0) return true;
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const mimeType = file.type;
    return accept.some((type) => type.toLowerCase() === ext || type.toLowerCase() === mimeType);
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      const validFiles: File[] = [];
      const remainingSlots = maxCount - files.length;
      let totalSize = files.reduce((acc, f) => acc + f.size, 0);

      Array.from(selectedFiles).forEach((file) => {
        if (validFiles.length >= remainingSlots) {
          logger.warn('已达到最大文件数量限制');
          return;
        }

        if (!validateFileType(file)) {
          logger.warn(`文件 ${file.name} 类型不允许`);
          return;
        }

        if (file.size > maxSize * 1024 * 1024) {
          logger.warn(`文件 ${file.name} 超过大小限制 ${maxSize}MB`);
          return;
        }

        if (totalSize + file.size > maxTotalSize * 1024 * 1024) {
          logger.warn('文件总大小超过限制');
          return;
        }

        totalSize += file.size;
        validFiles.push(file);
      });

      const newFiles: UploadFile[] = validFiles.map((file) => ({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending' as const,
      }));

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);

      // 模拟上传
      newFiles.forEach((newFile) => {
        simulateUpload(newFile.id);
      });

      onChange?.(updatedFiles.filter((f) => f.url).map((f) => f.url!));
    },

    [files, maxCount, maxSize, maxTotalSize, accept, onChange]
  );

  /**
   * 模拟上传过程
   */
  const simulateUpload = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: 'uploading' as const } : f))
    );

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  progress: 100,
                  status: 'completed' as const,
                  url: URL.createObjectURL(
                    prev.find((p) => p.id === fileId)?.status === 'pending'
                      ? new File([], fileId)
                      : new Blob([])
                  ),
                }
              : f
          )
        );
      } else {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress } : f)));
      }
    }, 300);
  };

  /**
   * 处理删除文件
   */
  const handleDelete = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    onChange?.(updatedFiles.filter((f) => f.url).map((f) => f.url!));
  };

  /**
   * 处理暂停/继续上传
   */
  const handlePause = (id: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: f.status === 'paused' ? 'uploading' : 'paused',
            }
          : f
      )
    );
  };

  /**
   * 处理拖拽
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'paused':
        return 'warning';
      default:
        return 'primary';
    }
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <Check size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      case 'paused':
        return <Play size={16} />;
      default:
        return null;
    }
  };

  return (
    <Box className={className}>
      {/* 上传区域 */}
      <UploadArea
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        isDragging={dragging}
        isDisabled={disabled}
        sx={{ height }}
      >
        <Upload size={32} />
        <Typography
          variant='body1'
          sx={{ mt: 1 }}
        >
          {dragging ? '松开以上传' : '拖拽文件到此处或点击上传'}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mt: 0.5 }}
        >
          最多 {maxCount} 个文件，单个不超过 {maxSize}MB，总计不超过 {maxTotalSize}MB
        </Typography>
        {accept.length > 0 && (
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              gap: 0.5,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {accept.map((type) => (
              <Chip
                key={type}
                label={type}
                size='small'
                variant='outlined'
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        )}
        <input
          ref={fileInputRef}
          type='file'
          multiple
          accept={accept.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />
      </UploadArea>

      {/* 文件列表 */}
      {files.length > 0 && (
        <List
          sx={{
            mt: 1,
            p: 0,
            '& .MuiListItem-root': {
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 8,
              mb: 1,
              p: '8px 12px',
            },
          }}
        >
          {files.map((file) => (
            <ListItem
              key={file.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                mt: 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{getFileIcon(file.type)}</ListItemIcon>
              <ListItemText
                primary={file.name}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='caption'>{formatSize(file.size)}</Typography>
                    {file.status === 'uploading' && (
                      <LinearProgress
                        variant='determinate'
                        value={file.progress}
                        sx={{ flex: 1, maxWidth: 100 }}
                      />
                    )}
                    {file.status === 'completed' && (
                      <Typography
                        variant='caption'
                        color='success.main'
                      >
                        上传完成
                      </Typography>
                    )}
                    {file.status === 'error' && (
                      <Typography
                        variant='caption'
                        color='error.main'
                      >
                        {file.error || '上传失败'}
                      </Typography>
                    )}
                    {file.status === 'paused' && (
                      <Typography
                        variant='caption'
                        color='warning.main'
                      >
                        已暂停
                      </Typography>
                    )}
                  </Box>
                }
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  size='small'
                  icon={getStatusIcon(file.status) || undefined}
                  label={
                    file.status === 'uploading' ? `${Math.round(file.progress)}%` : file.status
                  }
                  color={getStatusColor(file.status)}
                  variant={file.status === 'uploading' ? 'outlined' : 'filled'}
                />
                {file.url && (
                  <IconButton
                    size='small'
                    onClick={() => window.open(file.url)}
                  aria-label="下载"
                  >
                    <Download size={16} />
                  </IconButton>
                )}
                {(file.status === 'uploading' || file.status === 'paused') && (
                  <IconButton
                    size='small'
                    onClick={() => handlePause(file.id)}
                  aria-label="执行"
                  >
                    {file.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                  </IconButton>
                )}
                <IconButton
                  size='small'
                  onClick={() => handleDelete(file.id)}
                aria-label="关闭"
                >
                  <X size={16} />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FileUpload;
