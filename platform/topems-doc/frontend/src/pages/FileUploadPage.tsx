import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileApi } from '../hooks/useFileApi';
import { Upload as UploadIcon, FileIcon } from 'lucide-react';

export function FileUploadPage() {
  const navigate = useNavigate();
  const { loading, error, uploadFile } = useFileApi();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      await uploadFile(selectedFile);
      navigate('/');
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">上传文件</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center">
            <FileIcon className="h-12 w-12 text-blue-600 mb-4" />
            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              {loading ? '上传中...' : '开始上传'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <UploadIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              拖拽文件到此处，或
              <label className="text-blue-600 hover:text-blue-500 cursor-pointer mx-1">
                选择文件
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              支持所有文件类型，单个文件不超过 100MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
