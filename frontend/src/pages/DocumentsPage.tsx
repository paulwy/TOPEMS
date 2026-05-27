import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Folder, Upload, Search, Plus, 
  ChevronRight, Star, MoreVertical, Trash2, 
  Download, Eye, History, Share2, X, CheckCircle,
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { docApi, type Folder as FolderType } from '../api/doc';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

interface File {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  sizeBytes?: number;
  updatedAt: string;
  starred: boolean;
  tags: string[];
  content_type?: string;
  folder_id?: string | null;
}

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentId?: string | null;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  parentId 
}) => {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('文件夹名称不能为空');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const request: any = { name: folderName.trim() };
      if (parentId) {
        request.parent_id = parentId;
      }
      const response = await docApi.createFolder(request);
      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.message || '创建失败，请重试');
      }
    } catch (err: any) {
      console.error('创建文件夹失败:', err);
      const errorMessage = err.response?.data?.message || err.message || '创建失败，请重试';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">创建文件夹</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              文件夹名称
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="输入文件夹名称"
              disabled={creating}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creating || !folderName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFolders();
    loadFiles();
  }, []);

  useEffect(() => {
    loadFiles();
  }, [selectedFolderId]);

  const loadFolders = async () => {
    try {
      const response = await docApi.listFolders();
      if (response.success && response.data.folders) {
        setFolders(response.data.folders);
      }
    } catch (err) {
      console.error('加载文件夹列表失败:', err);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await docApi.list(selectedFolderId || undefined);
      if (response.success && response.data.files) {
        const mappedFiles: File[] = response.data.files.map(f => ({
          id: f.id,
          name: f.name,
          type: 'file',
          size: formatFileSize(f.size),
          sizeBytes: f.size,
          updatedAt: new Date(f.updated_at).toLocaleString('zh-CN'),
          starred: false,
          tags: [],
          content_type: f.content_type,
          folder_id: f.folder_id
        }));
        setFiles(mappedFiles);
      }
    } catch (err) {
      console.error('加载文件列表失败:', err);
      showNotification('error', '加载文件列表失败');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const response = await docApi.upload(file, selectedFolderId || undefined);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.data) {
        const newFile: File = {
          id: response.data.id,
          name: response.data.name,
          type: 'file',
          size: formatFileSize(response.data.size),
          sizeBytes: response.data.size,
          updatedAt: new Date(response.data.created_at || response.data.updated_at).toLocaleString('zh-CN'),
          starred: false,
          tags: [],
          content_type: response.data.content_type,
          folder_id: response.data.folder_id
        };
        setFiles(prev => [newFile, ...prev]);
        showNotification('success', '文件上传成功！');
      } else {
        showNotification('error', response.message || '文件上传失败');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('上传文件失败:', err);
      const errorMessage = err.response?.data?.message || err.message || '文件上传失败';
      showNotification('error', errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;

    try {
      const response = await docApi.delete(id);
      if (response.success) {
        await loadFiles(); // 重新加载文件列表
        showNotification('success', '文件删除成功');
      } else {
        showNotification('error', '文件删除失败');
      }
    } catch (err) {
      console.error('删除文件失败:', err);
      showNotification('error', '文件删除失败');
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`确定要删除文件夹 "${name}" 吗？文件夹内的文件不会被删除。`)) return;

    try {
      await docApi.deleteFolder(id);
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
      await loadFolders();
      await loadFiles(); // 同时刷新文件列表
      showNotification('success', '文件夹删除成功');
    } catch (err) {
      console.error('删除文件夹失败:', err);
      showNotification('error', '文件夹删除失败');
    }
  };

  const handleDownload = async (file: File) => {
    try {
      const blob = await docApi.download(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification('success', '文件下载成功');
    } catch (err) {
      console.error('下载失败:', err);
      showNotification('error', '文件下载失败');
    }
  };

  const [previewingFile, setPreviewingFile] = useState<{
    id: string;
    name: string;
    contentType: string;
  } | null>(null);

  const handlePreview = (file: File) => {
    setPreviewingFile({
      id: file.id,
      name: file.name,
      contentType: file.content_type || '',
    });
  };

  const toggleStar = (id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, starred: !f.starred } : f
    ));
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleCreateFolderSuccess = () => {
    loadFolders();
    loadFiles(); // 同时刷新文件列表
  };

  const allItems = [
    ...folders.map(f => ({
      id: f.id,
      name: f.name,
      type: 'folder' as const,
      updatedAt: new Date(f.updated_at).toLocaleString('zh-CN'),
      starred: false,
      tags: []
    })),
    ...files
  ];

  const filteredItems = allItems.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const starredCount = files.filter(f => f.starred).length;
  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/dashboard')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                文件管理
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索文件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <button 
                onClick={() => setShowCreateFolderModal(true)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                title="新建文件夹"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? '上传中...' : '上传'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept="*/*"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">文件上传中...</span>
            <span className="text-sm text-blue-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-900' 
            : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="ml-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24">
              <div className="space-y-1">
                <button
                  onClick={() => handleFolderSelect(null)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    selectedFolderId === null 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {selectedFolderId === null ? (
                    <FolderOpen className="w-5 h-5" />
                  ) : (
                    <Folder className="w-5 h-5" />
                  )}
                  <span className="font-medium">全部文件</span>
                </button>
                
                {folders.map((folder) => (
                  <div key={folder.id} className="group">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleFolderSelect(folder.id)}
                        className={`flex-1 flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                          selectedFolderId === folder.id 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {selectedFolderId === folder.id ? (
                          <FolderOpen className="w-5 h-5" />
                        ) : (
                          <Folder className="w-5 h-5" />
                        )}
                        <span className="font-medium truncate">{folder.name}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id, folder.name);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除文件夹"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/dashboard')}>首页</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-900">
                文件管理
                {selectedFolder && (
                  <>
                    <ChevronRight className="w-4 h-4 inline-block mx-2" />
                    <span className="text-blue-600">{selectedFolder.name}</span>
                  </>
                )}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard icon={Folder} title="文件夹" value={String(folders.length)} color="blue" />
              <StatCard icon={FileText} title="文件" value={String(files.length)} color="purple" />
              <StatCard icon={Star} title="星标" value={String(starredCount)} color="yellow" />
              <StatCard icon={History} title="最近更新" value={String(files.length)} color="green" />
            </div>

            {/* Files Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  item.type === 'folder' ? (
                    <div 
                      key={item.id}
                      onClick={() => handleFolderSelect(item.id)}
                      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Folder className="w-7 h-7 text-blue-600" />
                          </div>
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteFolder(item.id, item.name); 
                              }} 
                              className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-1">{item.name}</h4>
                        <div className="text-sm text-slate-500 mb-3">
                          <span>{item.updatedAt}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <FileCard 
                      key={item.id} 
                      file={item} 
                      onStarToggle={(id) => toggleStar(id)} 
                      onDownload={handleDownload} 
                      onPreview={handlePreview} 
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">大小</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">更新时间</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredItems.map((item) => (
                        item.type === 'folder' ? (
                          <tr key={item.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleFolderSelect(item.id)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Folder className="w-5 h-5 text-blue-500 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{item.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">-</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.updatedAt}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(item.id, item.name); }}
                                  className="text-slate-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FileText className="w-5 h-5 text-purple-500 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{item.name}</div>
                                  <div className="flex space-x-2 mt-1">
                                    {item.tags.map(tag => (
                                      <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.size || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.updatedAt}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => handlePreview(item)}
                                  className="text-slate-500 hover:text-blue-600"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDownload(item)}
                                  className="text-slate-500 hover:text-green-600"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => toggleStar(item.id)}
                                  className="text-slate-500 hover:text-yellow-600"
                                >
                                  <Star className="w-4 h-4" fill={item.starred ? "currentColor" : "none"} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="text-slate-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateFolderModal 
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onSuccess={handleCreateFolderSuccess}
        parentId={selectedFolderId}
      />

      <DocumentPreviewModal
        isOpen={previewingFile !== null}
        onClose={() => setPreviewingFile(null)}
        fileId={previewingFile?.id || ''}
        fileName={previewingFile?.name || ''}
        contentType={previewingFile?.contentType || ''}
      />
    </div>
  );
};

interface StatCardProps {
  icon: any;
  title: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`w-12 h-12 ${colors[color as keyof typeof colors]} rounded-lg flex items-center justify-center text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

interface FileCardProps {
  file: File;
  onStarToggle: (id: string) => void;
  onDownload: (file: File) => void;
  onPreview: (file: File) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onStarToggle, onDownload, onPreview }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
            <FileText className="w-7 h-7 text-purple-600" />
          </div>
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onStarToggle(file.id); }} className="p-2 hover:bg-slate-100 rounded-lg">
              <Star className={`w-4 h-4 ${file.starred ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); }} className="p-2 hover:bg-slate-100 rounded-lg">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        <h4 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-1">{file.name}</h4>
        <div className="flex items-center text-sm text-slate-500 mb-3">
          {file.size && <span>{file.size}</span>}
          {file.size && <span className="mx-2">•</span>}
          <span>{file.updatedAt}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {file.tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{tag}</span>
          ))}
        </div>
      </div>
      <div className="px-6 py-3 bg-slate-50 rounded-b-xl flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onPreview(file); }} 
          className="text-sm text-slate-600 hover:text-blue-600 flex items-center space-x-1"
        >
          <Eye className="w-4 h-4" />
          <span>预览</span>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDownload(file); }} 
          className="text-sm text-slate-600 hover:text-green-600 flex items-center space-x-1"
        >
          <Download className="w-4 h-4" />
          <span>下载</span>
        </button>
        <button className="text-sm text-slate-600 hover:text-purple-600 flex items-center space-x-1">
          <Share2 className="w-4 h-4" />
          <span>分享</span>
        </button>
      </div>
    </div>
  );
};

export default DocumentsPage;