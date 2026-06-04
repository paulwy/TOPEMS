import { useState, useEffect } from 'react';
import { X, History, Download, RotateCcw, FileText } from 'lucide-react';
import { useFileVersionApi } from '../hooks/useFileVersionApi';
import type { FileMetadata, FileVersion } from '../types';

interface FileVersionHistoryModalProps {
  file: FileMetadata;
  onClose: () => void;
  onRestore?: (file: FileMetadata) => void;
}

export function FileVersionHistoryModal({ file, onClose, onRestore }: FileVersionHistoryModalProps) {
  const { loading, error, listVersions, downloadVersion, restoreVersion } = useFileVersionApi();
  const [versions, setVersions] = useState<FileVersion[]>([]);

  useEffect(() => {
    loadVersions();
  }, [file.id]);

  const loadVersions = async () => {
    try {
      const response = await listVersions(file.id);
      if (response?.data?.versions) {
        setVersions(response.data.versions);
      }
    } catch (err) {
      console.error('加载版本历史失败:', err);
    }
  };

  const handleDownload = async (version: FileVersion) => {
    try {
      const blob = await downloadVersion(file.id, version.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = file.name.split('.').pop();
      const baseName = file.name.replace(`.${ext}`, '');
      link.download = `${baseName}_v${version.version}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载版本失败:', err);
      alert('下载失败，请重试');
    }
  };

  const handleRestore = async (version: FileVersion) => {
    if (!window.confirm(`确定要将文件恢复到版本 ${version.version} 吗？`)) {
      return;
    }

    try {
      const response = await restoreVersion(file.id, version.id);
      if (response.data) {
        alert('恢复成功');
        onRestore?.(response.data);
        onClose();
      }
    } catch (err) {
      console.error('恢复版本失败:', err);
      alert(err instanceof Error ? err.message : '恢复失败，请重试');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">版本历史</h2>
                <p className="text-sm text-gray-500">{file.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {loading && versions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="mt-4 text-gray-500">暂无历史版本</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-auto">
                {versions.map((version) => (
                  <div key={version.id} className="py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-600">
                          版本 {version.version}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span>{formatSize(version.size)}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(version.created_at)}</span>
                        <span className="mx-2">•</span>
                        <span>创建者: {version.created_by}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        MD5: {version.checksum}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(version)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="下载此版本"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRestore(version)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                        title="恢复此版本"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
