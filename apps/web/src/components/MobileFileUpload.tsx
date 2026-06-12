import React, { useCallback, useState, useRef } from "react";
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
} from "lucide-react";

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  status: "pending" | "uploading" | "completed" | "error";
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
  accept = "*",
  multiple = true,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <FileImage className="w-8 h-8 text-green-500" />;
    }
    if (type.includes("pdf")) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (
      type.includes("document") ||
      type.includes("spreadsheet") ||
      type.includes("presentation")
    ) {
      return <FileText className="w-8 h-8 text-blue-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      processFiles(files);
    },
    [],
  );

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
    },
    [],
  );

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
      if (accept !== "*" && !file.type.match(accept)) {
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "pending",
        progress: 0,
      };

      // Generate preview for images
      if (file.type.startsWith("image/")) {
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
        prev.map((f) => (f.id === file.id ? { ...f, status: "uploading" } : f)),
      );

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, progress: i } : f)),
        );
      }

      // Mark as completed
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "completed", progress: 100 } : f,
        ),
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
    const cameraInput = document.createElement("input");
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.capture = "environment";
    cameraInput.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      processFiles(files);
    };
    cameraInput.click();
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}
        `}
      >
        <div className="flex flex-col items-center">
          <div
            className={`p-4 rounded-full ${isDragging ? "bg-blue-100" : "bg-gray-100"}`}
          >
            <Upload
              className={`w-8 h-8 ${isDragging ? "text-blue-600" : "text-gray-500"}`}
            />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {isDragging ? "释放以上传文件" : "拖拽文件到此处"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">或点击选择文件</p>
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>支持格式: {accept === "*" ? "所有格式" : accept}</span>
            <span>·</span>
            <span>最大 {formatFileSize(maxFileSize)}</span>
            <span>·</span>
            <span>最多 {maxFiles} 个文件</span>
          </div>
        </div>
      </div>

      {/* Quick Actions (Mobile Optimized) */}
      <div className="flex space-x-3">
        <button
          onClick={triggerCamera}
          disabled={disabled}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-5 h-5 mr-2" />
          <span>拍照上传</span>
        </button>
        <button
          onClick={triggerFileInput}
          disabled={disabled}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-5 h-5 mr-2" />
          <span>选择文件</span>
        </button>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            已选择 {uploadedFiles.length}/{maxFiles} 个文件
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center p-3 bg-gray-50 rounded-lg"
              >
                {/* Preview/Icon */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getFileIcon(file.type)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 ml-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>

                  {/* Progress Bar */}
                  {file.status === "uploading" && (
                    <div className="mt-1">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 ml-1">
                        {file.progress}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0 ml-3">
                  {file.status === "pending" && (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {file.status === "uploading" && (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                  {file.status === "completed" && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无上传文件</p>
        </div>
      )}
    </div>
  );
};

export default MobileFileUpload;
