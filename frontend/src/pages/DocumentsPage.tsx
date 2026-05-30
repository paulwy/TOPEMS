import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Folder, Upload, Search, Plus, 
  ChevronLeft, Star, MoreVertical, Trash2, 
  Download, Eye, History, Share2, X, CheckCircle,
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { docApi, type Folder as FolderType } from '../api/doc';
import { useAppStore } from '../store';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/ModeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

const CreateFolderModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
  parentId?: string | null; 
}> = ({ 
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建文件夹</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="folderName">文件夹名称</Label>
            <Input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="输入文件夹名称"
              disabled={creating}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={creating}>
              取消
            </Button>
            <Button type="submit" disabled={creating || !folderName.trim()}>
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
      addNotification({ title: '加载失败', message: '加载文件列表失败', type: 'error' });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        addNotification({ title: '成功', message: '文件上传成功！', type: 'success' });
      } else {
        addNotification({ title: '失败', message: response.message || '文件上传失败', type: 'error' });
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('上传文件失败:', err);
      const errorMessage = err.response?.data?.message || err.message || '文件上传失败';
      addNotification({ title: '失败', message: errorMessage, type: 'error' });
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
        await loadFiles();
        addNotification({ title: '成功', message: '文件删除成功', type: 'success' });
      } else {
        addNotification({ title: '失败', message: '文件删除失败', type: 'error' });
      }
    } catch (err) {
      console.error('删除文件失败:', err);
      addNotification({ title: '失败', message: '文件删除失败', type: 'error' });
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
      await loadFiles();
      addNotification({ title: '成功', message: '文件夹删除成功', type: 'success' });
    } catch (err) {
      console.error('删除文件夹失败:', err);
      addNotification({ title: '失败', message: '文件夹删除失败', type: 'error' });
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
      addNotification({ title: '成功', message: '文件下载成功', type: 'success' });
    } catch (err) {
      console.error('下载失败:', err);
      addNotification({ title: '失败', message: '文件下载失败', type: 'error' });
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
    loadFiles();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                文件管理
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <ModeToggle />
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索文件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" onClick={() => setShowCreateFolderModal(true)}>
                      <Plus className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>新建文件夹</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="w-4 h-4 mr-2" />
                <span>{uploading ? '上传中...' : '上传'}</span>
              </Button>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">文件上传中...</span>
                <span className="text-sm text-blue-700 dark:text-blue-300">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    onClick={() => handleFolderSelect(null)}
                    className="w-full justify-start"
                  >
                    {selectedFolderId === null ? (
                      <FolderOpen className="w-5 h-5 mr-3" />
                    ) : (
                      <Folder className="w-5 h-5 mr-3" />
                    )}
                    <span className="font-medium">全部文件</span>
                  </Button>
                  
                  {folders.map((folder) => (
                    <div key={folder.id} className="group">
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleFolderSelect(folder.id)}
                          className="flex-1 justify-start"
                        >
                          {selectedFolderId === folder.id ? (
                            <FolderOpen className="w-5 h-5 mr-3" />
                          ) : (
                            <Folder className="w-5 h-5 mr-3" />
                          )}
                          <span className="font-medium truncate">{folder.name}</span>
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id, folder.name);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除文件夹</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard icon={Folder} title="文件夹" value={String(folders.length)} color="blue" />
              <StatCard icon={FileText} title="文件" value={String(files.length)} color="purple" />
              <StatCard icon={Star} title="星标" value={String(starredCount)} color="yellow" />
              <StatCard icon={History} title="最近更新" value={String(files.length)} color="green" />
            </div>

            {/* Files Grid/List */}
            <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'grid' | 'list')}>
              <TabsList className="mb-6">
                <TabsTrigger value="grid">网格视图</TabsTrigger>
                <TabsTrigger value="list">列表视图</TabsTrigger>
              </TabsList>
              <TabsContent value="grid">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredItems.map((item) => (
                    item.type === 'folder' ? (
                      <Card 
                        key={item.id} 
                        className="hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => handleFolderSelect(item.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <Folder className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDeleteFolder(item.id, item.name); 
                                      }} 
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>删除文件夹</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-1">{item.name}</h4>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <span>{item.updatedAt}</span>
                          </div>
                        </CardContent>
                      </Card>
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
              </TabsContent>
              <TabsContent value="list">
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">名称</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">大小</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">更新时间</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredItems.map((item) => (
                            item.type === 'folder' ? (
                              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => handleFolderSelect(item.id)}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Folder className="w-5 h-5 text-blue-500 mr-3" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">-</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.updatedAt}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(item.id, item.name); }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <FileText className="w-5 h-5 text-purple-500 mr-3" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                                      <div className="flex space-x-2 mt-1">
                                        {item.tags.map(tag => (
                                          <Badge key={tag} variant="outline">{tag}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.size || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.updatedAt}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => handlePreview(item)}>
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(item)}>
                                      <Download className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => toggleStar(item.id)}>
                                      <Star className="w-4 h-4" fill={item.starred ? "currentColor" : "none"} />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(item.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          </div>
          <div className={`w-12 h-12 ${colors[color as keyof typeof colors]} rounded-lg flex items-center justify-center text-white`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card className="hover:shadow-lg transition-all cursor-pointer group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <FileText className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onStarToggle(file.id); }}
                  >
                    <Star className={`w-4 h-4 ${file.starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>星标</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>更多操作</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-1">{file.name}</h4>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          {file.size && <span>{file.size}</span>}
          {file.size && <span className="mx-2">•</span>}
          <span>{file.updatedAt}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {file.tags.map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => { e.stopPropagation(); onPreview(file); }} 
        >
          <Eye className="w-4 h-4 mr-2" />
          预览
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => { e.stopPropagation(); onDownload(file); }} 
        >
          <Download className="w-4 h-4 mr-2" />
          下载
        </Button>
        <Button variant="ghost" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          分享
        </Button>
      </div>
    </Card>
  );
};

export default DocumentsPage;
