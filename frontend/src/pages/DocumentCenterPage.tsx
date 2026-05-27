import React, { useState, useEffect } from 'react';
import { 
  File, Folder, Upload, Download, Search, Filter, 
  ChevronLeft, ChevronRight, MoreVertical, Eye,
  Edit, Trash2, Copy, Share2, Star, Clock, Grid, List,
  X, CheckCircle, AlertCircle, Loader2, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  path: string;
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  type: 'folder';
  document_count: number;
  created_at: string;
}

const DocumentCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setTimeout(() => {
        setFolders([
          { id: '1', name: '项目文档', parent_id: null, type: 'folder', document_count: 15, created_at: '2024-01-01' },
          { id: '2', name: '技术文档', parent_id: null, type: 'folder', document_count: 23, created_at: '2024-01-15' },
          { id: '3', name: '规章制度', parent_id: null, type: 'folder', document_count: 8, created_at: '2024-02-01' },
        ]);
        
        setDocuments([
          {
            id: '1',
            name: '项目需求文档.docx',
            type: 'docx',
            size: 1024 * 512,
            category: '项目文档',
            tags: ['需求', 'PRD'],
            is_favorite: true,
            created_at: '2024-03-01',
            updated_at: '2024-03-15',
            created_by: '张三',
            path: '/项目文档',
          },
          {
            id: '2',
            name: '系统架构设计.pdf',
            type: 'pdf',
            size: 1024 * 1024 * 2.5,
            category: '技术文档',
            tags: ['架构', '设计'],
            is_favorite: false,
            created_at: '2024-02-20',
            updated_at: '2024-03-10',
            created_by: '李四',
            path: '/技术文档',
          },
          {
            id: '3',
            name: '员工手册.pdf',
            type: 'pdf',
            size: 1024 * 1024 * 1.2,
            category: '规章制度',
            tags: ['手册', '制度'],
            is_favorite: false,
            created_at: '2024-01-10',
            updated_at: '2024-01-10',
            created_by: '管理员',
            path: '/规章制度',
          },
          {
            id: '4',
            name: '数据统计报表.xlsx',
            type: 'xlsx',
            size: 1024 * 256,
            category: '项目文档',
            tags: ['统计', '报表'],
            is_favorite: true,
            created_at: '2024-03-05',
            updated_at: '2024-03-18',
            created_by: '王五',
            path: '/项目文档',
          },
        ]);
        
        setLoading(false);
      }, 500);
    } catch (err: any) {
      error(err.message || '加载数据失败');
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="w-8 h-8 text-green-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpload = () => {
    setShowUploadModal(true);
  };

  const handlePreview = (doc: Document) => {
    setSelectedDocument(doc);
    setShowPreviewModal(true);
  };

  const handleDownload = (doc: Document) => {
    success(`正在下载: ${doc.name}`);
  };

  const handleToggleFavorite = (docId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? { ...doc, is_favorite: !doc.is_favorite } : doc
    ));
    success('收藏状态已更新');
  };

  const handleDelete = (docId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    success('文件已删除');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <File className="w-7 h-7 mr-3 text-blue-600" />
                  文档中心
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  统一管理企业文档，支持分类、标签和全文搜索
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleUpload}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                上传文件
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => setCurrentPath([])}
            className="text-blue-600 hover:text-blue-700"
          >
            全部文档
          </button>
          {currentPath.map((path, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                className={idx === currentPath.length - 1 ? 'text-gray-900' : 'text-blue-600 hover:text-blue-700'}
              >
                {path}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索文件名、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部分类</option>
              <option value="项目文档">项目文档</option>
              <option value="技术文档">技术文档</option>
              <option value="规章制度">规章制度</option>
            </select>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={loadData}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Folders */}
        {currentPath.length === 0 && folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">文件夹</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => setCurrentPath([...currentPath, folder.name])}
                  className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
                >
                  <Folder className="w-10 h-10 text-yellow-500 mb-3" />
                  <div className="text-sm font-medium text-gray-900 truncate">{folder.name}</div>
                  <div className="text-xs text-gray-500">{folder.document_count} 个文件</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无文档</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {getFileIcon(doc.type)}
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(doc.id)}
                      className={`p-1 rounded transition-colors ${
                        doc.is_favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      <Star className="w-4 h-4" fill={doc.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1 truncate" title={doc.name}>
                    {doc.name}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">{formatFileSize(doc.size)}</p>
                  
                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded"
                        title="预览"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-100 rounded"
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getFileIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                        {doc.is_favorite && <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>·</span>
                        <span>{doc.category}</span>
                        <span>·</span>
                        <span>{doc.updated_at}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleFavorite(doc.id)}
                      className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg"
                    >
                      <Star className="w-4 h-4" fill={doc.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handlePreview(doc)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            success('文件上传成功');
            setShowUploadModal(false);
            loadData();
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <PreviewModal
          document={selectedDocument}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedDocument(null);
          }}
          onDownload={() => handleDownload(selectedDocument)}
        />
      )}
    </div>
  );
};

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

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
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">上传文件</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
            }`}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              拖拽文件到此处，或 <span className="text-blue-600 cursor-pointer">点击选择</span>
            </p>
            <p className="text-sm text-gray-500">
              支持 .pdf, .docx, .xlsx, .txt 等格式，单个文件不超过 100MB
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <File className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                  </div>
                  <button
                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onSuccess}
            disabled={files.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            开始上传
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview Modal Component
interface PreviewModalProps {
  document: Document;
  onClose: () => void;
  onDownload: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ document, onClose, onDownload }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{document.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatFileSize(document.size)} · {document.category} · {document.created_by}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div className="bg-white rounded-lg p-12 text-center">
            <File className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">文件预览功能开发中...</p>
            <p className="text-sm text-gray-400 mt-2">支持 PDF、Word、Excel 等格式的在线预览</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span>下载</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentCenterPage;
