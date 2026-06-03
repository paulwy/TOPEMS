import { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Trash2, Plus } from 'lucide-react';
import { useFolderApi } from '../hooks/useFolderApi';
import type { Folder as FolderType } from '../types';

interface FolderTreeProps {
  folders?: FolderType[];
  selectedFolderId?: string | null;
  onSelect?: (folderId: string | null) => void;
  onDelete?: (folderId: string) => void;
  onRefresh?: () => void;
  onCreateFolder?: (parentId: string | null) => void;
}

interface FolderItemProps {
  folder: FolderType;
  children: FolderType[];
  level: number;
  isSelected: boolean;
  onSelect: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onCreateFolder: (parentId: string) => void;
}

function FolderItem({ folder, children, level, isSelected, onSelect, onDelete, onCreateFolder }: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelect(folder);
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700'
            : 'hover:bg-gray-50 text-gray-700'
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-gray-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-400" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          {isSelected ? (
            <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{folder.name}</span>
        </div>
        <div className="flex items-center space-x-1">
          {isHovered && hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder(folder.id);
              }}
              className="p-1 hover:bg-green-100 rounded text-green-600 flex-shrink-0"
              title="在当前文件夹下新建"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
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
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <NestedFolderItem
              key={child.id}
              folder={child}
              allFolders={children}
              level={level + 1}
              isSelected={selectedFolderId === child.id}
              onSelect={onSelect}
              onDelete={onDelete}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NestedFolderItemProps {
  folder: FolderType;
  allFolders: FolderType[];
  level: number;
  isSelected: boolean;
  onSelect: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onCreateFolder: (parentId: string) => void;
}

function NestedFolderItem({ folder, allFolders, level, isSelected, onSelect, onDelete, onCreateFolder }: NestedFolderItemProps) {
  const children = allFolders.filter(f => f.parent_id === folder.id);
  
  return (
    <FolderItem
      folder={folder}
      children={children}
      level={level}
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onCreateFolder={onCreateFolder}
    />
  );
}

export function FolderTree({ 
  folders: externalFolders, 
  selectedFolderId = null, 
  onSelect, 
  onDelete,
  onRefresh,
  onCreateFolder
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
    const hasChildren = folders.some(f => f.parent_id === folder.id);
    if (hasChildren) {
      alert('无法删除包含子文件夹的文件夹，请先删除子文件夹');
      return;
    }

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

  const handleCreateSubFolder = (parentId: string) => {
    onCreateFolder?.(parentId);
  };

  const rootFolders = folders.filter(f => f.parent_id === null);

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
        rootFolders.map((folder) => {
          const children = folders.filter(f => f.parent_id === folder.id);
          return (
            <FolderItem
              key={folder.id}
              folder={folder}
              children={children}
              level={0}
              isSelected={selectedFolderId === folder.id}
              onSelect={handleFolderSelect}
              onDelete={handleDeleteFolder}
              onCreateFolder={handleCreateSubFolder}
            />
          );
        })
      )}
    </div>
  );
}
