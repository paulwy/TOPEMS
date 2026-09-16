import React, { useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  url?: string;
}

export interface FileUploadProps {
  /** 已上传文件列表 */
  value?: UploadFile[];
  /** 文件列表变化回调 */
  onChange?: (files: UploadFile[]) => void;
  /** 接受的文件类型 */
  accept?: string;
  /** 是否支持多选 */
  multiple?: boolean;
  /** 最大文件数 */
  maxCount?: number;
  /** 最大文件大小（MB） */
  maxSize?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示文件列表 */
  showFileList?: boolean;
  /** 自定义上传函数（返回 Promise） */
  customRequest?: (file: File) => Promise<{ url?: string }>;
  /** 上传区域提示文字 */
  hint?: string;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 组件 ID（用于 a11y label 关联） */
  id?: string;
}

/** 格式化文件大小 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** 生成唯一 ID */
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const FileUpload: React.FC<FileUploadProps> = ({
  value = [],
  onChange,
  accept,
  multiple = true,
  maxCount,
  maxSize = 10,
  disabled = false,
  showFileList = true,
  customRequest,
  hint = '点击或拖拽文件到此处上传',
  className,
  style,
  id,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateFiles = useCallback(
    (files: UploadFile[]) => {
      onChange?.(files);
    },
    [onChange]
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        return `文件大小不能超过 ${maxSize}MB`;
      }
      if (accept) {
        const acceptTypes = accept.split(',').map((t) => t.trim().toLowerCase());
        const fileType = file.type.toLowerCase();
        const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const isValid = acceptTypes.some(
          (type) => fileType.startsWith(type.replace('/*', '')) || fileExt === type
        );
        if (!isValid) {
          return `不支持的文件类型`;
        }
      }
      return null;
    },
    [maxSize, accept]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const newFiles: UploadFile[] = [];
      const files = Array.from(fileList);

      for (const file of files) {
        if (maxCount && value.length + newFiles.length >= maxCount) break;

        const error = validateFile(file);
        newFiles.push({
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: error ? 'error' : 'pending',
          error: error || undefined,
        });
      }

      const allFiles = [...value, ...newFiles];
      updateFiles(allFiles);

      // 上传文件
      if (customRequest) {
        for (const uploadFile of newFiles) {
          if (uploadFile.status === 'error') continue;

          const updatedFiles = allFiles.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
          );
          updateFiles(updatedFiles);

          try {
            const result = await customRequest(uploadFile.file);
            const successFiles = updatedFiles.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: 'success' as const, progress: 100, url: result.url }
                : f
            );
            updateFiles(successFiles);
          } catch (err) {
            const errorFiles = updatedFiles.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : '上传失败',
                  }
                : f
            );
            updateFiles(errorFiles);
          }
        }
      }
    },
    [value, maxCount, validateFile, customRequest, updateFiles]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    updateFiles(value.filter((f) => f.id !== id));
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return (
          <Loader2
            size={16}
            className='animate-spin'
            style={{ color: 'var(--accent-primary)' }}
          />
        );
      case 'success':
        return (
          <CheckCircle
            size={16}
            style={{ color: 'var(--success-500)' }}
          />
        );
      case 'error':
        return (
          <AlertCircle
            size={16}
            style={{ color: 'var(--error-500)' }}
          />
        );
      default:
        return (
          <File
            size={16}
            style={{ color: 'var(--text-tertiary)' }}
          />
        );
    }
  };

  return (
    <div
      className={clsx('redesign-file-upload', className)}
      style={style}
    >
      {/* 上传区域 */}
      <div
        id={id}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role='button'
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-6)',
          border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          backgroundColor: isDragging ? 'var(--surface-2)' : 'var(--surface-1)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all var(--duration-fast) var(--ease-out)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Upload
            size={24}
            style={{ color: 'var(--text-secondary)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{hint}</div>
        {accept && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            支持格式：{accept}
            {maxSize && ` · 单个文件不超过 ${maxSize}MB`}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {/* 文件列表 */}
      {showFileList && value.length > 0 && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {value.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {getStatusIcon(file.status)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {formatFileSize(file.size)}
                  {file.error && (
                    <span style={{ color: 'var(--error-500)', marginLeft: 'var(--space-2)' }}>
                      {file.error}
                    </span>
                  )}
                </div>
                {file.status === 'uploading' && file.progress !== undefined && (
                  <div
                    style={{
                      marginTop: 'var(--space-1)',
                      height: 4,
                      backgroundColor: 'var(--surface-3)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${file.progress}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent-primary)',
                        transition: 'width var(--duration-fast) var(--ease-out)',
                      }}
                    />
                  </div>
                )}
              </div>
              <button
                type='button'
                onClick={() => removeFile(file.id)}
                disabled={file.status === 'uploading'}
                style={{
                  padding: 4,
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: file.status === 'uploading' ? 'not-allowed' : 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={`删除 ${file.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

FileUpload.displayName = 'RedesignFileUpload';
