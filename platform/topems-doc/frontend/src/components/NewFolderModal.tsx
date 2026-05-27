import { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useFolderApi } from '../hooks/useFolderApi';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string | null;
  onSuccess?: () => void;
}

export function NewFolderModal({ isOpen, onClose, parentId = null, onSuccess }: NewFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createFolder } = useFolderApi();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError('文件夹名称不能为空');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createFolder({ 
        name: folderName.trim(), 
        parent_id: parentId || undefined 
      });
      setFolderName('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('创建文件夹失败:', err);
      setError(err instanceof Error ? err.message : '创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setFolderName('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
          <div className="absolute top-4 right-4">
            <button
              onClick={handleClose}
              disabled={creating}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <div className="flex items-center justify-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <FolderPlus className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">
                创建新文件夹
              </h3>
              <p className="mt-2 text-sm text-gray-500 text-center">
                {parentId ? '在当前目录下创建子文件夹' : '创建根文件夹'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div>
              <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700">
                文件夹名称
              </label>
              <input
                type="text"
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                disabled={creating}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                placeholder="请输入文件夹名称"
                autoFocus
              />
            </div>

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={creating}
                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={creating || !folderName.trim()}
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
