import React, { useState, useEffect } from 'react';
import { FileMetadata } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

interface FileEditorProps {
  file: FileMetadata;
  onClose: () => void;
  onSave?: (newFile: FileMetadata) => void;
}

export const FileEditor: React.FC<FileEditorProps> = ({ file, onClose, onSave }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditable, setIsEditable] = useState(false);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const editableExtensions = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'yaml', 'yml', 'toml', 'ini', 'cfg'];

  useEffect(() => {
    setIsEditable(editableExtensions.includes(ext));
    if (isEditable) {
      fetchContent();
    }
  }, [file.id]);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/files/${file.id}/extract-text`);
      const data = await response.json();
      if (data.success && data.data) {
        setContent(data.data);
      } else {
        setError('无法获取文件内容');
      }
    } catch (err) {
      console.error('Failed to fetch file content:', err);
      setError('获取文件内容失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // 注意：由于我们的后端是内存存储，需要重新上传文件才能更新
    // 这里提供一个简单的实现，创建一个Blob并上传
    setSaving(true);
    setError(null);
    
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, file.name);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/files`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success && data.data) {
        if (onSave) {
          onSave(data.data);
        }
        alert('保存成功！');
        onClose();
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save file:', err);
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!isEditable) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">此文件类型无法编辑</h2>
          <p className="text-gray-600 mb-6">
            编辑器仅支持文本文件格式（.txt, .md, .json, .html, .css, .js 等）。
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">编辑 {file.name}</h2>
            <p className="text-sm text-gray-500">
              {(file.size / 1024).toFixed(2)} KB
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

        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : error ? (
            <div className="flex-1 p-4">
              <div className="text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-sm resize-none outline-none"
              spellCheck={false}
            />
          )}
        </div>

        <div className="border-t border-gray-200 p-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {content.length} 字符
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
