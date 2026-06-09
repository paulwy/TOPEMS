import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Search, Plus, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Document } from '@/api/ai';
import { aiApi, SearchResult } from '@/api/ai';
import { useAppStore } from '@/store';

export interface DocumentManagerProps {
  className?: string;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ className }) => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<{
    total_documents: number;
    total_chunks: number;
    total_vectors: number;
    vector_dimension: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { document_title?: string; similarity: number; content: string; chunk_id: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await aiApi.listDocuments();
      if (response.success) {
        setDocuments(response.data.items);
      }
    } catch (err) {
      console.error('加载文档失败:', err);
      addNotification({
        title: '加载失败',
        message: '加载文档列表失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const mockStats = {
        total_documents: documents.length,
        total_chunks: 0,
        total_vectors: 0,
        vector_dimension: 384,
      };
      setStats(mockStats);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await aiApi.createDocument({ title: file.name, content: '', filename: file.name });

      if (response.success) {
        addNotification({
          title: '上传成功',
          message: `文档 "${file.name}" 已成功上传`,
          type: 'success',
        });
        loadDocuments();
        loadStats();
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      console.error('上传文档失败:', err);
      addNotification({
        title: '上传失败',
        message: '上传文档时出错',
        type: 'error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`确定要删除文档 "${doc.title}" 吗？`)) return;

    try {
      const response = await aiApi.deleteDocument(doc.id);

      if (response.success) {
        addNotification({
          title: '删除成功',
          message: `文档已删除`,
          type: 'success',
        });
        loadDocuments();
        loadStats();
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      console.error('删除文档失败:', err);
      addNotification({
        title: '删除失败',
        message: '删除文档时出错',
        type: 'error',
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const response = await aiApi.search({
        query: searchQuery,
        limit: 10,
      });

      if (response.success) {
        const results = response.data.documents.map((doc: Document, index: number) => ({
          document_title: doc.title,
          similarity: 0.8,
          content: doc.content.substring(0, 200),
          chunk_id: `${doc.id}-${index}`,
        }));
        setSearchResults(results);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      addNotification({
        title: '搜索失败',
        message: '搜索时出错',
        type: 'error',
      });
    } finally {
      setSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      case 'pending':
        return <Loader2 className='w-4 h-4 text-yellow-500 animate-spin' />;
      case 'partial':
        return <AlertCircle className='w-4 h-4 text-orange-500' />;
      default:
        return <AlertCircle className='w-4 h-4 text-red-500' />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processed':
        return '已处理';
      case 'pending':
        return '待处理';
      case 'partial':
        return '部分处理';
      case 'empty':
        return '内容为空';
      default:
        return '处理失败';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'partial':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>文档管理</h2>
          <p className='text-gray-500 dark:text-gray-400 mt-1'>管理知识库文档，支持向量搜索</p>
        </div>
        <div className='flex items-center space-x-3'>
          <Button onClick={loadDocuments} disabled={loading}>
            刷新
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Upload className='w-4 h-4 mr-2' />
                上传文档
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>上传文档</DialogTitle>
              </DialogHeader>
              <div className='space-y-4'>
                <p className='text-gray-500'>支持上传文本文件、Markdown、PDF 等格式</p>
                <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center'>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.txt,.md,.pdf,.json,.csv'
                    onChange={handleFileSelect}
                    className='hidden'
                    id='file-upload'
                  />
                  <label htmlFor='file-upload' className='cursor-pointer'>
                    <div className='flex flex-col items-center'>
                      <Upload className='w-12 h-12 text-gray-400 mb-3' />
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {uploading ? '上传中...' : '点击选择文件或拖放'}
                      </p>
                      <p className='text-xs text-gray-400 mt-1'>支持 .txt, .md, .pdf, .json, .csv</p>
                    </div>
                  </label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>文档总数</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{stats.total_documents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>分块数</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{stats.total_chunks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>向量数</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{stats.total_vectors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>向量维度</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{stats.vector_dimension}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue='documents'>
        <TabsList>
          <TabsTrigger value='documents'>文档列表</TabsTrigger>
          <TabsTrigger value='search'>向量搜索</TabsTrigger>
        </TabsList>

        <TabsContent value='documents' className='mt-4'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='w-8 h-8 text-gray-400 animate-spin' />
            </div>
          ) : (
            <div className='space-y-3'>
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className='p-4'>
                    <div className='flex items-start justify-between'>
                      <div className='flex items-start space-x-4'>
                        <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
                          <FileText className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center space-x-2'>
                            <h3 className='font-medium text-gray-900 dark:text-gray-100 truncate'>{doc.title}</h3>
                            <Badge className={getStatusBadgeColor(doc.status)}>
                              <div className='flex items-center space-x-1'>
                                {getStatusIcon(doc.status)}
                                <span>{getStatusText(doc.status)}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                            {doc.filename} • {formatFileSize(doc.file_size)}
                          </p>
                          {doc.description && (
                            <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>{doc.description}</p>
                          )}
                          {doc.error_message && <p className='text-xs text-red-500 mt-1'>错误: {doc.error_message}</p>}
                          <p className='text-xs text-gray-400 mt-2'>上传于: {formatDate(doc.created_at)}</p>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleDelete(doc)}
                              className='text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            >
                              <Trash2 className='w-4 h-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除文档</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {documents.length === 0 && (
                <Card>
                  <CardContent className='p-8 text-center'>
                    <FileText className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>暂无文档</h3>
                    <p className='text-gray-500 dark:text-gray-400 mb-4'>上传文档开始构建您的知识库</p>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Plus className='w-4 h-4 mr-2' />
                      上传文档
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value='search' className='mt-4'>
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center space-x-3 mb-6'>
                <Input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder='输入搜索内容...'
                  className='flex-1'
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : <Search className='w-4 h-4 mr-2' />}
                  搜索
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className='space-y-4'>
                  <h3 className='font-medium text-gray-900 dark:text-gray-100'>搜索结果 ({searchResults.length})</h3>
                  {searchResults.map((result, index) => (
                    <Card key={`${result.chunk_id}-${index}`}>
                      <CardContent className='p-4'>
                        <div className='flex items-start justify-between mb-2'>
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {result.document_title || '相关文档'}
                            </p>
                            <Badge variant='secondary' className='mt-1'>
                              相似度: {(result.similarity * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <p className='text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap'>{result.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <div className='text-center py-8'>
                  <Search className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
                  <p className='text-gray-500 dark:text-gray-400'>未找到相关内容</p>
                </div>
              )}

              {!searchQuery && (
                <div className='text-center py-8'>
                  <Search className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
                  <p className='text-gray-500 dark:text-gray-400'>输入搜索内容开始向量搜索</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
