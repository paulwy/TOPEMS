import React, { useState, useEffect } from 'react';
import { FileMetadata } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

interface FilePreviewProps {
  file: FileMetadata;
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext);
  const isText = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp'].includes(ext);
  const isPdf = ext === 'pdf';

  useEffect(() => {
    if (isText || ext === 'md') {
      fetchTextContent();
    }
  }, [file.id]);

  const fetchTextContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/files/${file.id}/extract-text`);
      const data = await response.json();
      if (data.success && data.data) {
        setTextContent(data.data);
      } else {
        setError('无法提取文本内容');
      }
    } catch (err) {
      console.error('Failed to extract text:', err);
      setError('提取文本失败');
    } finally {
      setLoading(false);
    }
  };

  const getPreviewUrl = () => {
    if (isPdf) {
      return `${API_BASE_URL}/api/v1/files/${file.id}/preview-pdf`;
    }
    return `${API_BASE_URL}/api/v1/files/${file.id}/preview`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{file.name}</h2>
            <p className="text-sm text-gray-500">
              {(file.size / 1024).toFixed(2)} KB • {file.content_type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isImage && (
            <div className="flex items-center justify-center min-h-64">
              <img
                src={getPreviewUrl()}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}

          {isPdf && (
            <div className="w-full h-[70vh]">
              <iframe
                src={getPreviewUrl()}
                className="w-full h-full border-0"
                title={file.name}
              />
            </div>
          )}

          {isText && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : error ? (
                <div className="text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>
              ) : (
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap text-sm text-gray-800">
                  {textContent}
                </pre>
              )}
            </div>
          )}

          {!isImage && !isPdf && !isText && (
            <div className="flex flex-col items-center justify-center min-h-64 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">此文件类型无法直接预览</p>
              <a
                href={getPreviewUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                在新窗口中打开
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mr-2 transition-colors"
          >
            关闭
          </button>
          <a
            href={`${API_BASE_URL}/api/v1/files/${file.id}/download`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            下载
          </a>
        </div>
      </div>
    </div>
  );
};
