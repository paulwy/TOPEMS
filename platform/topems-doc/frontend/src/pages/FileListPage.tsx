import { useEffect, useState } from 'react';
import { useFileApi } from '../hooks/useFileApi';
import { useFolderApi } from '../hooks/useFolderApi';
import { useTauriFile } from '../hooks/useTauriFile';
import { FileMetadata, Folder } from '../types';
import {
  FileIcon,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  FileText,
  Image,
  Edit3,
  FolderPlus,
  History,
  Search,
} from 'lucide-react';
import { FilePreview } from '../components/FilePreview';
import { FileEditor } from '../components/FileEditor';
import { FolderTree } from '../components/FolderTree';
import { NewFolderModal } from '../components/NewFolderModal';
import { FileVersionHistoryModal } from '../components/FileVersionHistoryModal';

declare global {
  interface Window {
    __TAURI__?: object;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export function FileListPage() {
  const { loading, error, listFiles, deleteFile, downloadFile } = useFileApi();
  const { loading: folderLoading, error: folderError, listFolders } = useFolderApi();
  const { saveBlobToTempAndOpen } = useTauriFile();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [tauriAvailable, setTauriAvailable] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [editFile, setEditFile] = useState<FileMetadata | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      setTauriAvailable(true);
      console.log('[FileList] Tauri 可用');
    }
  }, []);

  const refreshFolders = async () => {
    try {
      const response = await listFolders();
      if (response?.data?.folders) {
        setFolders(response.data.folders);
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error('获取文件夹列表失败:', err);
      setFolders([]);
    }
  };

  const refreshFiles = async () => {
    try {
      const response = await listFiles(selectedFolderId || undefined);
      
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
    refreshFolders();
  }, [listFolders]);

  useEffect(() => {
    refreshFiles();
  }, [listFiles, selectedFolderId]);

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
    if (tauriAvailable) {
      // Tauri 桌面模式使用系统应用打开
      setPreviewingId(file.id);
      try {
        console.log('[Preview] 使用 Tauri 打开文件:', file.name);
        
        const downloadUrl = `${API_BASE_URL}/api/v1/files/${file.id}/download`;
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('[Preview] 获取文件 blob 成功, 大小:', blob.size, 'bytes');
        
        await saveBlobToTempAndOpen(blob, file.name);
        console.log('[Preview] 文件已成功打开');
        
      } catch (err) {
        console.error('[Preview] 预览失败:', err);
        alert('预览失败: ' + (err instanceof Error ? err.message : '未知错误'));
      } finally {
        setPreviewingId(null);
      }
    } else {
      // 网页模式使用内嵌预览组件
      setPreviewFile(file);
    }
  };

  const handleEdit = (file: FileMetadata) => {
    setEditFile(file);
  };

  const handleSaveEdit = () => {
    refreshFiles();
  };

  const handleShowVersionHistory = (file: FileMetadata) => {
    setVersionHistoryFile(file);
    setShowVersionHistoryModal(true);
  };

  const handleRestoreVersion = (restoredFile: FileMetadata) => {
    // 更新文件列表中对应文件
    setFiles(prev => prev.map(f => f.id === restoredFile.id ? restoredFile : f));
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

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleFolderDelete = (folderId: string) => {
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
    refreshFolders();
  };

  const handleCreateFolder = () => {
    setShowNewFolderModal(true);
  };

  const handleFolderCreated = () => {
    refreshFolders();
  };

  if (loading || folderLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || folderError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || folderError}</p>
      </div>
    );
  }

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const currentPath = selectedFolder ? selectedFolder.name : '全部文件';

  // 应用搜索筛选
  const filteredFiles = searchQuery
    ? files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  return (
    <div className="flex gap-6">
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">文件夹</h3>
            <button
              onClick={handleCreateFolder}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="新建文件夹"
            >
              <FolderPlus className="h-5 w-5" />
            </button>
          </div>
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelect={handleFolderSelect}
            onDelete={handleFolderDelete}
          />
        </div>
      </div>

      <div className="flex-1">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentPath}</h2>
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

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {filteredFiles.length === 0 && searchQuery ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">未找到匹配的文件</h3>
            <p className="mt-1 text-sm text-gray-500">尝试使用其他关键词搜索</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">暂无文件</h3>
            <p className="mt-1 text-sm text-gray-500">上传您的第一个文件开始使用</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredFiles.map((file) => (
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
                        <p className="text-xs text-gray-400 mt-1">
                          创建: {new Date(file.created_at).toLocaleString()} · 更新: {new Date(file.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleShowVersionHistory(file)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        title="版本历史"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePreview(file)}
                        disabled={previewingId === file.id}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        title="预览"
                      >
                        <Eye className={`h-4 w-4 ${previewingId === file.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleEdit(file)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        title="编辑"
                      >
                        <Edit3 className="h-4 w-4" />
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

        {previewFile && !tauriAvailable && (
          <FilePreview
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}

        {editFile && (
          <FileEditor
            file={editFile}
            onClose={() => setEditFile(null)}
            onSave={handleSaveEdit}
          />
        )}

        <NewFolderModal
          isOpen={showNewFolderModal}
          onClose={() => setShowNewFolderModal(false)}
          parentId={selectedFolderId}
          onSuccess={handleFolderCreated}
        />

        {showVersionHistoryModal && versionHistoryFile && (
          <FileVersionHistoryModal
            file={versionHistoryFile}
            onClose={() => {
              setShowVersionHistoryModal(false);
              setVersionHistoryFile(null);
            }}
            onRestore={handleRestoreVersion}
          />
        )}
      </div>
    </div>
  );
}
