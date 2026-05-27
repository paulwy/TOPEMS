import { useState, useEffect } from 'react';
import { Folder, FolderOpen, Trash2 } from 'lucide-react';
import { useFolderApi } from '../hooks/useFolderApi';
import type { Folder as FolderType } from '../types';

interface FolderTreeProps {
  folders?: FolderType[];
  selectedFolderId?: string | null;
  onSelect?: (folderId: string | null) => void;
  onDelete?: (folderId: string) => void;
  onRefresh?: () => void;
}

interface FolderItemProps {
  folder: FolderType;
  level: number;
  isSelected: boolean;
  onSelect: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
}

function FolderItem({ folder, level, isSelected, onSelect, onDelete }: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 text-blue-700'
          : 'hover:bg-gray-50 text-gray-700'
      }`}
      style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      onClick={() => onSelect(folder)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {isSelected ? (
          <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium truncate">{folder.name}</span>
      </div>
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(folder);
          }}
          className="p-1 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
          title="删除文件夹"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function FolderTree({ 
  folders: externalFolders, 
  selectedFolderId = null, 
  onSelect, 
  onDelete,
  onRefresh 
}: FolderTreeProps) {
  const { loading, error, listFolders, deleteFolder } = useFolderApi();
  const [folders, setFolders] = useState<FolderType[]>(externalFolders || []);
  const [showAllFiles, setShowAllFiles] = useState(!selectedFolderId);

  useEffect(() => {
    if (!externalFolders) {
      refreshFolders();
    }
  }, []);

  useEffect(() => {
    setFolders(externalFolders || []);
  }, [externalFolders]);

  const refreshFolders = async () => {
    try {
      const response = await listFolders();
      if (response?.data?.folders) {
        setFolders(response.data.folders);
        onRefresh?.();
      }
    } catch (err) {
      console.error('获取文件夹列表失败:', err);
    }
  };

  const handleFolderSelect = (folder: FolderType) => {
    setShowAllFiles(false);
    onSelect?.(folder.id);
  };

  const handleShowAllFiles = () => {
    setShowAllFiles(true);
    onSelect?.(null);
  };

  const handleDeleteFolder = async (folder: FolderType) => {
    if (!window.confirm(`确定要删除文件夹 "${folder.name}" 吗？文件夹内的文件不会被删除。`)) {
      return;
    }

    try {
      await deleteFolder(folder.id);
      alert('文件夹已删除');
      if (selectedFolderId === folder.id) {
        onSelect?.(null);
      }
      if (externalFolders) {
        onDelete?.(folder.id);
      } else {
        await refreshFolders();
      }
    } catch (err) {
      console.error('删除文件夹失败:', err);
      alert(err instanceof Error ? err.message : '删除失败，请重试');
    }
  };

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        加载文件夹失败: {error}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center space-x-2 px-3 py-2 cursor-pointer transition-colors ${
          showAllFiles
            ? 'bg-blue-50 text-blue-700'
            : 'hover:bg-gray-50 text-gray-700'
        }`}
        onClick={handleShowAllFiles}
      >
        {showAllFiles ? (
          <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium">全部文件</span>
      </div>

      {loading && folders.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">加载中...</div>
      ) : folders.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">暂无文件夹</div>
      ) : (
        folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            level={0}
            isSelected={selectedFolderId === folder.id}
            onSelect={handleFolderSelect}
            onDelete={handleDeleteFolder}
          />
        ))
      )}
    </div>
  );
}
