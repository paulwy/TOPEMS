import React, { useRef, useState, useCallback } from 'react';
import cx from 'clsx';
import styles from './FileUpload.module.css';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
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
  hint,
  className,
  style,
  id,
}) => {
  const { t } = useTranslation();
  const resolvedHint = hint ?? t('components.file_upload.hint');
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
        return t('components.file_upload.size_limit_error', { maxSize });
      }
      if (accept) {
        const acceptTypes = accept.split(',').map((type) => type.trim().toLowerCase());
        const fileType = file.type.toLowerCase();
        const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const isValid = acceptTypes.some(
          (type) => fileType.startsWith(type.replace('/*', '')) || fileExt === type
        );
        if (!isValid) {
          return t('components.file_upload.type_error');
        }
      }
      return null;
    },
    [maxSize, accept, t]
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
                    error:
                      err instanceof Error
                        ? err.message
                        : t('components.file_upload.upload_failed'),
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
            className={cx('animate-spin', styles.il1)}
          />
        );
      case 'success':
        return (
          <CheckCircle
            size={16}
            className={styles.il2}
          />
        );
      case 'error':
        return (
          <AlertCircle
            size={16}
            className={styles.il3}
          />
        );
      default:
        return (
          <File
            size={16}
            className={styles.il4}
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
          className={styles.il5}
        >
          <Upload
            size={24}
            className={styles.il6}
          />
        </div>
        <div className={styles.il7}>
          {resolvedHint}
        </div>
        {accept && (
          <div className={styles.il8}>
            {t('components.file_upload.supported_formats', { accept })}
            {maxSize && ` · ${t('components.file_upload.max_size_hint', { maxSize })}`}
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
        className={styles.il9}
      />

      {/* 文件列表 */}
      {showFileList && value.length > 0 && (
        <div
          className={styles.il10}
        >
          {value.map((file) => (
            <div
              key={file.id}
              className={styles.il11}
            >
              {getStatusIcon(file.status)}
              <div className={styles.il12}>
                <div
                  className={styles.il13}
                >
                  {file.name}
                </div>
                <div className={styles.il14}>
                  {formatFileSize(file.size)}
                  {file.error && (
                    <span className={styles.il15}>
                      {file.error}
                    </span>
                  )}
                </div>
                {file.status === 'uploading' && file.progress !== undefined && (
                  <div
                    className={styles.il16}
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
                aria-label={t('components.file_upload.remove', { name: file.name })}
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
