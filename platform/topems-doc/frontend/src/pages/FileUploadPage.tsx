import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileApi } from '../hooks/useFileApi';
import { Upload as UploadIcon, FileIcon, CheckCircle } from 'lucide-react';

interface UploadResult {
  id: string;
  name: string;
  size: number;
}

export function FileUploadPage() {
  const navigate = useNavigate();
  const { loading, error, uploadFile } = useFileApi();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

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
      setUploadResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    console.log('=== handleUpload 开始 ===');
    console.log('selectedFile:', selectedFile);
    console.log('selectedFile name:', selectedFile.name);
    console.log('selectedFile size:', selectedFile.size);
    console.log('selectedFile type:', selectedFile.type);
    
    try {
      const result = await uploadFile(selectedFile);
      console.log('=== uploadFile 返回结果 ===', result);
      setUploadResult({
        id: result.id,
        name: result.name,
        size: result.size
      });
    } catch (err) {
      console.error('=== Upload failed with error ===', err);
      console.error('=== Error stack ===', (err as Error).stack);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">上传文件</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {uploadResult ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-green-900 mb-2">上传成功！</h3>
          <p className="text-green-700 mb-6">{uploadResult.name}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              查看文件列表
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              继续上传
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
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
              <div className="mt-6 flex space-x-4">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  {loading ? '上传中...' : '开始上传'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
              </div>
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
      )}
    </div>
  );
}
