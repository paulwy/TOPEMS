import React, { useCallback, useState, useRef } from 'react';
import {
  Upload,
  Camera,
  FileImage,
  FileText,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface MobileFileUploadProps {
  onFilesSelected: (_files: File[]) => void;
  onFilesUploaded?: (_files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  disabled?: boolean;
}

const MobileFileUpload: React.FC<MobileFileUploadProps> = ({
  onFilesSelected,
  onFilesUploaded,
  accept = '*',
  multiple = true,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <FileImage sx={{ width: 32, height: 32, color: 'success.dark' }} />;
    }
    if (type.includes('pdf')) {
      return <FileText sx={{ width: 32, height: 32, color: 'error.main' }} />;
    }
    if (
      type.includes('document') ||
      type.includes('spreadsheet') ||
      type.includes('presentation')
    ) {
      return <FileText sx={{ width: 32, height: 32, color: 'primary.main' }} />;
    }
    return <File sx={{ width: 32, height: 32, color: 'text.secondary' }} />;
  };

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      processFiles(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      // Check max files
      if (uploadedFiles.length + newFiles.length >= maxFiles) {
        break;
      }

      // Check file size
      if (file.size > maxFileSize) {
        continue;
      }

      // Check file type
      if (accept !== '*' && !file.type.match(accept)) {
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0,
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(uploadedFile);
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      onFilesSelected(newFiles.map((f) => f.file));
      uploadFiles(newFiles);
    }
  };

  const uploadFiles = async (files: UploadedFile[]) => {
    for (const file of files) {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: 'uploading' } : f))
      );

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setUploadedFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress: i } : f)));
      }

      // Mark as completed
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f))
      );
    }

    if (onFilesUploaded) {
      onFilesUploaded(files);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    const cameraInput = document.createElement('input');
    cameraInput.type = 'file';
    cameraInput.accept = 'image/*';
    cameraInput.capture = 'environment';
    cameraInput.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      processFiles(files);
    };
    cameraInput.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
        style={{
          position: 'relative',
          border: '2px dashed',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1,
          borderColor: isDragging ? 'primary.main' : 'grey.300',
          backgroundColor: isDragging ? 'primary.light' : 'transparent',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderRadius: '9999px',
              backgroundColor: isDragging ? '#dbeafe' : 'grey.100',
            }}
          >
            <Upload
              sx={{
                width: 32,
                height: 32,
                color: isDragging ? 'primary.dark' : 'text.secondary',
              }}
            />
          </div>
          <h3
            style={{
              marginTop: '16px',
              fontSize: '18px',
              fontWeight: 500,
              color: 'text.primary',
            }}
          >
            {isDragging ? '释放以上传文件' : '拖拽文件到此处'}
          </h3>
          <p style={{ marginTop: '4px', fontSize: '14px', color: 'text.secondary' }}>
            或点击选择文件
          </p>
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              fontSize: '12px',
              color: 'text.disabled',
            }}
          >
            <span>支持格式: {accept === '*' ? '所有格式' : accept}</span>
            <span>·</span>
            <span>最大 {formatFileSize(maxFileSize)}</span>
            <span>·</span>
            <span>最多 {maxFiles} 个文件</span>
          </div>
        </div>
      </div>

      {/* Quick Actions (Mobile Optimized) */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={triggerCamera}
          disabled={disabled}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            backgroundColor: 'success.light',
            color: '#15803d',
            borderRadius: '8px',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'background-color 0.2s',
          }}
        >
          <Camera sx={{ width: 20, height: 20, marginRight: '8px' }} />
          <span>拍照上传</span>
        </button>
        <button
          onClick={triggerFileInput}
          disabled={disabled}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            backgroundColor: 'primary.light',
            color: 'primary.dark',
            borderRadius: '8px',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'background-color 0.2s',
          }}
        >
          <FileText sx={{ width: 20, height: 20, marginRight: '8px' }} />
          <span>选择文件</span>
        </button>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'grey.700' }}>
            已选择 {uploadedFiles.length}/{maxFiles} 个文件
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: 'grey.50',
                  borderRadius: '8px',
                }}
              >
                {/* Preview/Icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid grey.200',
                    overflow: 'hidden',
                  }}
                >
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    getFileIcon(file.type)
                  )}
                </div>

                {/* File Info */}
                <div style={{ flex: 1, marginLeft: '12px', minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'text.secondary' }}>
                    {formatFileSize(file.size)}
                  </p>

                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div style={{ marginTop: '4px' }}>
                      <div
                        style={{
                          height: '6px',
                          backgroundColor: 'grey.200',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: 'primary.dark',
                            borderRadius: '9999px',
                            transition: 'all 0.2s',
                            width: `${file.progress}%`,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'text.secondary',
                          marginLeft: '4px',
                        }}
                      >
                        {file.progress}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Icon */}
                <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                  {file.status === 'pending' && (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Loader2
                        sx={{
                          width: 16,
                          height: 16,
                          color: 'text.disabled',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    </div>
                  )}
                  {file.status === 'uploading' && (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Loader2
                        sx={{
                          width: 16,
                          height: 16,
                          color: 'primary.dark',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    </div>
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle sx={{ width: 24, height: 24, color: 'success.dark' }} />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle sx={{ width: 24, height: 24, color: 'error.main' }} />
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(file.id)}
                  style={{
                    flexShrink: 0,
                    marginLeft: '8px',
                    padding: '4px',
                    color: 'text.disabled',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}
                >
                  <X sx={{ width: 20, height: 20 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            paddingTop: '24px',
            paddingBottom: '24px',
            color: 'text.disabled',
          }}
        >
          <File
            sx={{
              width: 48,
              height: 48,
              margin: 'auto',
              marginBottom: '12px',
              opacity: 0.5,
            }}
          />
          <p style={{ fontSize: '14px' }}>暂无上传文件</p>
        </div>
      )}
    </div>
  );
};

export default MobileFileUpload;
