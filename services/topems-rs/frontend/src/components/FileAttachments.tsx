import { useState, useEffect } from 'react';
import { listDocuments, createDocumentRelation, deleteDocumentRelation } from '../api/docIntegration';

interface FileAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  doc_service_file_id: string;
  doc_service_url?: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface FileAttachmentsProps {
  entityType: string;
  entityId: string;
  currentUser: string;
}

export default function FileAttachments({ entityType, entityId, currentUser }: FileAttachmentsProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    file_name: '',
    doc_service_file_id: '',
    doc_service_url: '',
    file_size: 0,
    file_type: '',
    description: '',
  });

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  const loadAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listDocuments(entityType, entityId);
      if (response.success) {
        setAttachments(response.data || []);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('加载附件失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await createDocumentRelation({
        entity_type: entityType,
        entity_id: entityId,
        doc_service_file_id: uploadData.doc_service_file_id,
        doc_service_url: uploadData.doc_service_url || undefined,
        file_name: uploadData.file_name,
        file_size: uploadData.file_size,
        file_type: uploadData.file_type || undefined,
        description: uploadData.description || undefined,
        created_by: currentUser,
      });
      if (response.success) {
        setShowUpload(false);
        setUploadData({
          file_name: '',
          doc_service_file_id: '',
          doc_service_url: '',
          file_size: 0,
          file_type: '',
          description: '',
        });
        loadAttachments();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('上传附件失败');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个附件吗？')) return;
    try {
      const response = await deleteDocumentRelation(id);
      if (response.success) {
        loadAttachments();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('删除附件失败');
      console.error(err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">📎 附件管理</h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          {showUpload ? '取消' : '+ 添加附件'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {showUpload && (
        <form onSubmit={handleUpload} className="mb-6 p-4 bg-gray-50 rounded-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文件名 *</label>
              <input
                type="text"
                required
                value={uploadData.file_name}
                onChange={(e) => setUploadData({ ...uploadData, file_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入文件名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文档服务文件ID *</label>
              <input
                type="text"
                required
                value={uploadData.doc_service_file_id}
                onChange={(e) => setUploadData({ ...uploadData, doc_service_file_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="DOC服务的文件ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文档URL</label>
              <input
                type="url"
                value={uploadData.doc_service_url}
                onChange={(e) => setUploadData({ ...uploadData, doc_service_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文件大小 (bytes)</label>
              <input
                type="number"
                value={uploadData.file_size}
                onChange={(e) => setUploadData({ ...uploadData, file_size: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文件类型</label>
              <input
                type="text"
                value={uploadData.file_type}
                onChange={(e) => setUploadData({ ...uploadData, file_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如: pdf, docx, xlsx"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="附件描述..."
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              上传
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无附件</div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">
                      {attachment.file_type?.includes('pdf') ? '📄' : 
                       attachment.file_type?.includes('doc') ? '📝' : 
                       attachment.file_type?.includes('xls') ? '📊' : '📎'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </p>
                    {attachment.file_type && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        {attachment.file_type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size)} • {attachment.created_by} • {formatDate(attachment.created_at)}
                  </p>
                  {attachment.description && (
                    <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {attachment.doc_service_url && (
                  <a
                    href={attachment.doc_service_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    查看
                  </a>
                )}
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
