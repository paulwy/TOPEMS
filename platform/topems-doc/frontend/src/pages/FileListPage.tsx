import React, { useEffect, useState } from 'react';
import { useFileApi } from '../hooks/useFileApi';
import { FileMetadata } from '../types';
import { FileIcon, Download, Trash2, Eye } from 'lucide-react';

export function FileListPage() {
  const { loading, error, listFiles } = useFileApi();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await listFiles();
        setFiles(response.files);
        setTotal(response.total);
      } catch (err) {
        console.error('Failed to fetch files:', err);
      }
    };
    fetchFiles();
  }, [listFiles]);

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">文件列表</h2>
        <p className="mt-1 text-sm text-gray-600">
          共 {total} 个文件
        </p>
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
                    <FileIcon className="h-5 w-5 text-gray-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB · {file.created_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      title="预览"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      title="下载"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      className="inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
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
