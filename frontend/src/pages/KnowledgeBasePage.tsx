import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  FileText,
  Search,
  Filter,
  Trash2,
  Eye,
  Edit,
  Download,
  FolderOpen,
  Tag,
  Calendar,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  BookOpen,
  FileSearch,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { aiApi, Document } from '../api/ai';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentWithMeta extends Document {
  category?: string;
  tags?: string[];
  description?: string;
}

const KnowledgeBasePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [documents, setDocuments] = useState<DocumentWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithMeta | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
  });

  const categories = [
    { value: 'all', label: '全部' },
    { value: '技术文档', label: '技术文档' },
    { value: '业务流程', label: '业务流程' },
    { value: '产品说明', label: '产品说明' },
    { value: '培训资料', label: '培训资料' },
    { value: '规章制度', label: '规章制度' },
    { value: '其他', label: '其他' },
  ];

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await aiApi.listDocuments();
      if (response.success && response.data) {
        const docs = 'items' in response.data ? response.data.items : response.data;
        setDocuments(docs);
      }
    } catch (err) {
      console.error('加载文档列表失败:', err);
      addNotification({ title: '加载失败', message: '加载文档列表失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 搜索和过滤文档
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // 处理文件拖拽
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        ['txt', 'md', 'json', 'pdf', 'doc', 'docx'].some((ext) =>
          file.name.toLowerCase().endsWith(ext)
        )
      );
      setUploadFiles(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadFiles(files);
    }
  };

  // 上传文档
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      addNotification({ title: '提示', message: '请选择要上传的文件', type: 'warning' });
      return;
    }

    setUploading(true);
    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append('file', file);

        // 使用 fetch 直接上传，因为 aiApi 可能不支持 FormData
        const response = await fetch('/api/v1/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`上传失败: ${file.name}`);
        }
      }

      addNotification({
        title: '上传成功',
        message: `成功上传 ${uploadFiles.length} 个文档`,
        type: 'success',
      });
      setShowUploadDialog(false);
      setUploadFiles([]);
      loadDocuments();
    } catch (err) {
      console.error('上传失败:', err);
      addNotification({ title: '上传失败', message: '文档上传失败', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // 删除文档
  const handleDelete = async (docId: string) => {
    if (!confirm('确定要删除这个文档吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await aiApi.deleteDocument(docId);
      if (response.success) {
        addNotification({ title: '删除成功', message: '文档已删除', type: 'success' });
        loadDocuments();
      }
    } catch (err) {
      console.error('删除失败:', err);
      addNotification({ title: '删除失败', message: '删除文档失败', type: 'error' });
    }
  };

  // 查看文档详情
  const handleViewDetail = (doc: DocumentWithMeta) => {
    setSelectedDocument(doc);
    setShowDetailDialog(true);
  };

  // 编辑文档
  const handleEdit = (doc: DocumentWithMeta) => {
    setSelectedDocument(doc);
    setEditForm({
      title: doc.title,
      description: doc.description || '',
      category: doc.category || '',
      tags: doc.tags?.join(', ') || '',
    });
    setShowEditDialog(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedDocument) return;

    try {
      const updatedDoc = {
        ...selectedDocument,
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        tags: editForm.tags.split(',').map((t) => t.trim()).filter((t) => t),
      };

      const response = await aiApi.updateDocument(selectedDocument.id, updatedDoc);
      if (response.success) {
        addNotification({ title: '保存成功', message: '文档信息已更新', type: 'success' });
        setShowEditDialog(false);
        loadDocuments();
      }
    } catch (err) {
      console.error('保存失败:', err);
      addNotification({ title: '保存失败', message: '更新文档信息失败', type: 'error' });
    }
  };

  // 重新加载文档
  const handleReload = async () => {
    setLoading(true);
    try {
      const response = await aiApi.listDocuments();
      if (response.success) {
        addNotification({ title: '重新加载成功', message: '文档列表已刷新', type: 'success' });
        loadDocuments();
      }
    } catch (err) {
      addNotification({ title: '重新加载失败', message: '刷新文档列表失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '未知';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(parseInt(dateStr) * 1000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* 页面头部 */}
        <div className='mb-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center'>
                <BookOpen className='w-7 h-7 text-white' />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>知识库管理</h1>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  管理和组织企业的知识文档，为 AI 提供上下文支持
                </p>
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              <Button variant='outline' onClick={handleReload} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                重新加载
              </Button>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className='w-4 h-4 mr-2' />
                上传文档
              </Button>
            </div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <Card className='mb-6'>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-4'>
              <div className='flex-1 relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  type='text'
                  placeholder='搜索文档标题或文件名...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className='w-[180px]'>
                  <Filter className='w-4 h-4 mr-2' />
                  <SelectValue placeholder='选择分类' />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 文档统计 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center space-x-3'>
                <FileText className='w-8 h-8 text-purple-500' />
                <div>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>总文档数</p>
                  <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center space-x-3'>
                <FolderOpen className='w-8 h-8 text-blue-500' />
                <div>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>分类数量</p>
                  <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    {new Set(documents.map((d) => d.category || '未分类')).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center space-x-3'>
                <CheckCircle className='w-8 h-8 text-green-500' />
                <div>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>已处理</p>
                  <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    {documents.filter((d) => d.status === 'processed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 文档列表 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center justify-between'>
              <span>文档列表 ({filteredDocuments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className='text-center py-12'>
                <FileSearch className='w-16 h-16 mx-auto mb-4 text-gray-400' />
                <p className='text-gray-500 dark:text-gray-400 mb-2'>暂无文档</p>
                <p className='text-sm text-gray-400 dark:text-gray-500'>
                  点击"上传文档"按钮添加知识库文档
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex items-start space-x-3 flex-1'>
                        <FileText className='w-6 h-6 text-purple-500 mt-1' />
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center space-x-2 mb-1'>
                            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 truncate'>
                              {doc.title}
                            </h3>
                            {doc.category && (
                              <Badge variant='outline' className='text-xs'>
                                {doc.category}
                              </Badge>
                            )}
                            {doc.status === 'processed' && (
                              <Badge variant='default' className='text-xs bg-green-500'>
                                已处理
                              </Badge>
                            )}
                          </div>
                          <p className='text-sm text-gray-500 dark:text-gray-400 mb-2'>
                            文件名: {doc.filename}
                          </p>
                          <div className='flex items-center space-x-4 text-xs text-gray-400 dark:text-gray-500'>
                            <span className='flex items-center'>
                              <Calendar className='w-3 h-3 mr-1' />
                              {formatDate(doc.created_at)}
                            </span>
                            <span className='flex items-center'>
                              <File className='w-3 h-3 mr-1' />
                              {formatFileSize(doc.file_size)}
                            </span>
                            {doc.mime_type && (
                              <Badge variant='secondary' className='text-xs'>
                                {doc.mime_type}
                              </Badge>
                            )}
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className='flex items-center space-x-1 mt-2'>
                              <Tag className='w-3 h-3 text-gray-400' />
                              {doc.tags.map((tag, idx) => (
                                <Badge key={idx} variant='outline' className='text-xs'>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <Button variant='ghost' size='sm' onClick={() => handleViewDetail(doc)}>
                          <Eye className='w-4 h-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(doc)}>
                          <Edit className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleDelete(doc.id)}
                          className='text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 上传对话框 */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className='max-w-2xl'>
            <DialogHeader>
              <DialogTitle>上传文档</DialogTitle>
              <DialogDescription>
                上传文档到知识库，支持 txt、md、json、pdf、doc、docx 格式
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              {/* 拖拽上传区域 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className='w-12 h-12 mx-auto mb-4 text-gray-400' />
                <p className='text-gray-600 dark:text-gray-300 mb-2'>
                  拖拽文件到这里，或点击选择文件
                </p>
                <input
                  type='file'
                  multiple
                  onChange={handleFileSelect}
                  className='hidden'
                  id='file-upload'
                  accept='.txt,.md,.json,.pdf,.doc,.docx'
                />
                <Button variant='outline' onClick={() => document.getElementById('file-upload')?.click()}>
                  <Plus className='w-4 h-4 mr-2' />
                  选择文件
                </Button>
              </div>

              {/* 已选择的文件列表 */}
              {uploadFiles.length > 0 && (
                <div className='space-y-2'>
                  <Label>已选择的文件</Label>
                  {uploadFiles.map((file, idx) => (
                    <div key={idx} className='flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded'>
                      <div className='flex items-center space-x-2'>
                        <FileText className='w-4 h-4 text-purple-500' />
                        <span className='text-sm'>{file.name}</span>
                        <span className='text-xs text-gray-500'>{formatFileSize(file.size)}</span>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== idx))}
                      >
                        <X className='w-4 h-4' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowUploadDialog(false)}>
                取消
              </Button>
              <Button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}>
                {uploading ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className='w-4 h-4 mr-2' />
                    开始上传
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 文档详情对话框 */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className='max-w-3xl'>
            <DialogHeader>
              <DialogTitle>文档详情</DialogTitle>
            </DialogHeader>
            {selectedDocument && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm text-gray-500'>文档标题</Label>
                    <p className='text-lg font-semibold'>{selectedDocument.title}</p>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>文件名</Label>
                    <p className='text-lg'>{selectedDocument.filename}</p>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>文件大小</Label>
                    <p className='text-lg'>{formatFileSize(selectedDocument.file_size)}</p>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>文件类型</Label>
                    <p className='text-lg'>{selectedDocument.mime_type || '未知'}</p>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>创建时间</Label>
                    <p className='text-lg'>{formatDate(selectedDocument.created_at)}</p>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>更新时间</Label>
                    <p className='text-lg'>{formatDate(selectedDocument.updated_at)}</p>
                  </div>
                </div>
                {selectedDocument.category && (
                  <div>
                    <Label className='text-sm text-gray-500'>分类</Label>
                    <Badge variant='outline' className='mt-1'>{selectedDocument.category}</Badge>
                  </div>
                )}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div>
                    <Label className='text-sm text-gray-500'>标签</Label>
                    <div className='flex items-center space-x-1 mt-1'>
                      {selectedDocument.tags.map((tag, idx) => (
                        <Badge key={idx} variant='outline'>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDocument.description && (
                  <div>
                    <Label className='text-sm text-gray-500'>描述</Label>
                    <p className='text-base mt-1'>{selectedDocument.description}</p>
                  </div>
                )}
                {selectedDocument.file_path && (
                  <div>
                    <Label className='text-sm text-gray-500'>文件路径</Label>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      {selectedDocument.file_path}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowDetailDialog(false)}>
                关闭
              </Button>
              <Button onClick={() => {
                setShowDetailDialog(false);
                handleEdit(selectedDocument!);
              }}>
                <Edit className='w-4 h-4 mr-2' />
                编辑
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑文档对话框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className='max-w-2xl'>
            <DialogHeader>
              <DialogTitle>编辑文档信息</DialogTitle>
              <DialogDescription>
                更新文档的标题、描述、分类和标签信息
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label htmlFor='title'>文档标题</Label>
                <Input
                  id='title'
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor='category'>分类</Label>
                <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder='选择分类' />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.value !== 'all').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor='tags'>标签（用逗号分隔）</Label>
                <Input
                  id='tags'
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder='例如: 技术, API, 开发'
                />
              </div>
              <div>
                <Label htmlFor='description'>描述</Label>
                <Textarea
                  id='description'
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  placeholder='添加文档描述...'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit}>
                <CheckCircle className='w-4 h-4 mr-2' />
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default KnowledgeBasePage;