import React, { useEffect, useState } from 'react';
import { useFileApi } from '../hooks/useFileApi';
import { useTauriFile } from '../hooks/useTauriFile';
import { FileMetadata } from '../types';
import { FileIcon, Download, Trash2, Eye, RefreshCw, FileText, Image } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8001';

export function FileListPage() {
  const { loading, error, listFiles, deleteFile, downloadFile } = useFileApi();
  const { saveBlobToTempAndOpen } = useTauriFile();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [tauriAvailable, setTauriAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      setTauriAvailable(true);
      console.log('[FileList] Tauri 可用');
    }
  }, []);

  const refreshFiles = async () => {
    try {
      const response = await listFiles();
      
      if (response?.data?.files) {
        setFiles(response.data.files);
        setTotal(response.data.total || 0);
      } else {
        setFiles([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('获取文件列表失败:', err);
      setFiles([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, [listFiles]);

  const getFileIcon = (file: FileMetadata) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pages', 'numbers', 'keynote'].includes(ext || '')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext || '')) {
      return <Image className="h-5 w-5 text-green-500" />;
    }
    return <FileIcon className="h-5 w-5 text-gray-400" />;
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      console.error('Download failed:', err);
      alert('下载失败，请重试');
    }
  };
  
  const handlePreview = async (file: FileMetadata) => {
    setPreviewingId(file.id);
    try {
      console.log('[Preview] 开始预览文件:', file.name);
      
      if (tauriAvailable) {
        console.log('[Preview] 使用 Tauri 打开文件');
        
        const response = await fetch(`${API_BASE_URL}/api/files/${file.id}/download`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('[Preview] 获取文件 blob 成功');
        
        await saveBlobToTempAndOpen(blob, file.name);
        console.log('[Preview] 文件已成功打开');
        
      } else {
        console.log('[Preview] 使用浏览器预览');
        
        const previewUrl = `${API_BASE_URL}/api/files/${file.id}/preview`;
        window.open(previewUrl, '_blank');
      }
      
    } catch (err) {
      console.error('[Preview] 预览失败:', err);
      alert('预览失败，请尝试下载查看');
    } finally {
      setPreviewingId(null);
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!window.confirm(`确定要删除文件 "${file.name}" 吗？`)) {
      return;
    }
    
    setDeletingId(file.id);
    try {
      await deleteFile(file.id);
      alert(`已删除: ${file.name}`);
      await refreshFiles();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">文件列表</h2>
          <p className="mt-1 text-sm text-gray-600">
            共 {total} 个文件 · {tauriAvailable ? '桌面模式' : '网页模式'}
          </p>
        </div>
        <button
          onClick={refreshFiles}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">暂无文件</h3>
          <p className="mt-1 text-sm text-gray-500">上传您的第一个文件开始使用</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex items-center">
                    {getFileIcon(file)}
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB · {file.created_by} · {file.content_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePreview(file)}
                      disabled={previewingId === file.id}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      title="预览"
                    >
                      <Eye className={`h-4 w-4 ${previewingId === file.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      title="下载"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      className="inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                      title="删除"
                    >
                      <Trash2 className={`h-4 w-4 ${deletingId === file.id ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
