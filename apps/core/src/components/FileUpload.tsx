import React, { useState, useRef, useCallback } from 'react';
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
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Upload as UploadFile,
  FileDownload,
  Close,
  CheckCircle,
  Error,
  PlayArrow,
  Pause,
  InsertDriveFile,
  Description,
  Image,
  TableChart,
  PictureAsPdf,
  Movie,
  Audiotrack,
  Archive,
  TextSnippet,
  CloudUpload,
} from '@mui/icons-material';
import { fileApi, formatFileSize, type FileItem } from '../api/file';

export interface FileUploadProps {
  value?: string[];
  onChange?: (files: FileItem[]) => void;
  onUploadSuccess?: (files: FileItem[]) => void;
  maxCount?: number;
  accept?: string[];
  maxSize?: number;
  maxTotalSize?: number;
  height?: number | string;
  disabled?: boolean;
  className?: string;
  uploadText?: string;
  folderId?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
  result?: FileItem;
}

const generateId = () => `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getFileIconComponent = (type: string) => {
  if (type.startsWith('image/')) return <Image />;
  if (type.includes('pdf')) return <PictureAsPdf color="error" />;
  if (type.includes('word') || type.includes('document')) return <Description color="primary" />;
  if (type.includes('excel') || type.includes('spreadsheet')) return <TableChart color="success" />;
  if (type.includes('powerpoint') || type.includes('presentation')) return <Description color="warning" />;
  if (type.includes('zip') || type.includes('archive') || type.includes('rar')) return <Archive />;
  if (type.includes('video/')) return <Movie color="action" />;
  if (type.includes('audio/')) return <Audiotrack color="action" />;
  if (type.includes('text/')) return <TextSnippet />;
  return <InsertDriveFile />;
};

export const FileUpload: React.FC<FileUploadProps> = ({
  value: _value = [],
  onChange,
  onUploadSuccess,
  maxCount = 10,
  accept = [],
  maxSize = 100,
  maxTotalSize = 500,
  height = 160,
  disabled = false,
  className,
  uploadText = '上传文件',
  folderId,
}) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (accept.length > 0) {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type.toLowerCase();
        const isValid = accept.some(
          (type) => type.toLowerCase() === ext || type.toLowerCase() === mimeType
        );
        if (!isValid) return false;
      }
      if (file.size > maxSize * 1024 * 1024) return false;
      return true;
    },
    [accept, maxSize]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0 || disabled) return;

      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const newFiles: UploadingFile[] = [];
      let addedSize = 0;

      Array.from(fileList).forEach((file) => {
        if (files.length + newFiles.length >= maxCount) return;
        if (!validateFile(file)) return;
        if (totalSize + addedSize + file.size > maxTotalSize * 1024 * 1024) return;

        addedSize += file.size;
        newFiles.push({
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'pending',
        });
      });

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
        newFiles.forEach((f) => uploadFile(f.id, f.file));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, maxCount, maxTotalSize, validateFile, disabled, folderId]
  );

  const uploadFile = async (id: string, file: File) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'uploading' as const } : f)));

    try {
      const result = await fileApi.uploadFile(file, {
        folderId,
        onProgress: (percent) => {
          setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: percent } : f)));
        },
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'completed' as const, progress: 100, result } : f
        )
      );

      setFiles((current) => {
        const completed = current.filter((f) => f.status === 'completed' && f.result);
        const results = completed.map((f) => f.result!);
        onChange?.(results);
        return current;
      });

      onUploadSuccess?.([result]);
    } catch (error: unknown) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'error' as const, error: (error as Error).message || '上传失败' }
            : f
        )
      );
    }
  };

  const handleRemove = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        const completed = updated.filter((f) => f.status === 'completed' && f.result);
        const results = completed.map((f) => f.result!);
        onChange?.(results);
        return updated;
      });
    },
    [onChange]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const getStatusColor = (status: UploadingFile['status']) => {
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

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'error':
        return <Error fontSize="small" />;
      case 'paused':
        return <PlayArrow fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box className={className}>
      <UploadArea
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        isDragging={isDragging}
        isDisabled={disabled}
        sx={{ height }}
      >
        <CloudUpload sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'text.secondary' }} />
        <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>
          {isDragging ? '松开以上传文件' : '拖拽文件到此处，或点击选择文件'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          最多 {maxCount} 个文件，单个不超过 {maxSize}MB，总计不超过 {maxTotalSize}MB
        </Typography>
        {accept.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {accept.map((type) => (
              <Chip key={type} label={type} size="small" variant="outlined" />
            ))}
          </Box>
        )}
        <Button
          variant="contained"
          startIcon={<UploadFile />}
          sx={{ mt: 2 }}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={disabled}
        >
          {uploadText}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </UploadArea>

      {files.length > 0 && (
        <List sx={{ mt: 2, p: 0 }}>
          {files.map((file) => (
            <ListItem
              key={file.id}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                p: 1.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{getFileIconComponent(file.type)}</ListItemIcon>
              <ListItemText
                primary={file.name}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption">{formatFileSize(file.size)}</Typography>
                    {file.status === 'uploading' && (
                      <LinearProgress
                        variant="determinate"
                        value={file.progress}
                        sx={{ flex: 1, maxWidth: 120, height: 6, borderRadius: 3 }}
                      />
                    )}
                    {file.status === 'completed' && (
                      <Typography variant="caption" color="success.main">
                        上传完成
                      </Typography>
                    )}
                    {file.status === 'error' && (
                      <Typography variant="caption" color="error.main">
                        {file.error || '上传失败'}
                      </Typography>
                    )}
                    {file.status === 'paused' && (
                      <Typography variant="caption" color="warning.main">
                        已暂停
                      </Typography>
                    )}
                  </Box>
                }
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  size="small"
                  icon={getStatusIcon(file.status) || undefined}
                  label={file.status === 'uploading' ? `${Math.round(file.progress)}%` : ''}
                  color={getStatusColor(file.status)}
                  variant={file.status === 'uploading' ? 'outlined' : 'filled'}
                  sx={{ minWidth: 60, justifyContent: 'center' }}
                />
                {file.result?.url && (
                  <IconButton size="small" onClick={() => window.open(file.result?.url)} title="下载">
                    <FileDownload fontSize="small" />
                  </IconButton>
                )}
                {(file.status === 'uploading' || file.status === 'paused') && (
                  <IconButton size="small" title={file.status === 'paused' ? '继续' : '暂停'}>
                    {file.status === 'paused' ? (
                      <PlayArrow fontSize="small" />
                    ) : (
                      <Pause fontSize="small" />
                    )}
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => handleRemove(file.id)} title="移除">
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

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
    ? theme.palette.primary.light + '20'
    : isDisabled
      ? theme.palette.grey[50]
      : 'transparent',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease-in-out',
  color: isDisabled ? theme.palette.grey[400] : theme.palette.text.secondary,
  textAlign: 'center',
  padding: theme.spacing(3),
  '&:hover': {
    borderColor: isDisabled ? theme.palette.grey[300] : theme.palette.primary.main,
    backgroundColor: isDisabled ? 'transparent' : theme.palette.primary.light + '10',
  },
}));

export default FileUpload;
