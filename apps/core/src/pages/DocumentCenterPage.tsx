import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  Upload as UploadFile,
  CreateNewFolder,
  Delete,
  Edit,
  Share,
  Download,
  Visibility,
  ChevronRight,
  InsertDriveFile,
  Description,
  Image,
  TableChart,
  PictureAsPdf,
  Movie,
  Audiotrack,
  Archive,
  TextSnippet,
  Search,
  Refresh,
  MoreVert,
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import dayjs from 'dayjs';
import { fileApi, formatFileSize, type FileItem, type FolderItem } from '../api/file';
import { FileUpload } from '../components/FileUpload';
import { FileList, type ViewMode } from '../components/FileList';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const getFileIconComponent = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image color="primary" />;
  if (mimeType.includes('pdf')) return <PictureAsPdf color="error" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <Description color="primary" />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <TableChart color="success" />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <Description color="warning" />;
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar')) return <Archive color="action" />;
  if (mimeType.includes('video/')) return <Movie color="action" />;
  if (mimeType.includes('audio/')) return <Audiotrack color="action" />;
  if (mimeType.includes('text/')) return <TextSnippet color="action" />;
  return <InsertDriveFile color="action" />;
};

export const DocumentCenterPage: React.FC = () => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: '全部文件' },
  ]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  const loadFolders = useCallback(async () => {
    try {
      const data = await fileApi.listFolders(null);
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (searchQuery.trim()) {
        const result = await fileApi.searchFiles(searchQuery);
        setFiles(result.items);
      } else {
        const result = await fileApi.listFiles({
          folderId: currentFolderId || undefined,
          pageSize: 100,
        });
        setFiles(result.items);
      }
    } catch (err) {
      setError('加载文件列表失败');
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, searchQuery]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFolderClick = async (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    if (!expandedFolders.includes(folder.id)) {
      setExpandedFolders((prev) => [...prev, folder.id]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const item = breadcrumbs[index];
    setCurrentFolderId(item.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
    setShowDetailPanel(true);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const blob = await fileApi.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!window.confirm(`确定要删除文件 "${file.name}" 吗？`)) return;
    try {
      await fileApi.deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleRename = async (file: FileItem, newName: string) => {
    try {
      const updated = await fileApi.renameFile(file.id, newName);
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
      if (selectedFile?.id === file.id) {
        setSelectedFile(updated);
      }
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newFolder = await fileApi.createFolder(newFolderName.trim(), currentFolderId || undefined);
      setFolders((prev) => [...prev, newFolder]);
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Create folder failed:', err);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadDialog(false);
    loadFiles();
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const renderTreeItem = (folder: FolderItem, level: number = 0) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    return (
      <TreeItem
        key={folder.id}
        itemId={folder.id}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Folder fontSize="small" sx={{ color: 'warning.main' }} />
            <Typography variant="body2" noWrap>
              {folder.name}
            </Typography>
          </Box>
        }
        onClick={() => handleFolderClick(folder)}
      >
        {childFolders.map((child) => renderTreeItem(child, level + 1))}
      </TreeItem>
    );
  };

  const rootFolders = folders.filter((f) => f.parentId === null);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InsertDriveFile color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            文档中心
          </Typography>
        </Box>
        <Box sx={{ flex: 1, maxWidth: 400, position: 'relative' }}>
          <Search sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'text.secondary' }} fontSize="small" />
          <TextField
            fullWidth
            size="small"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{ sx: { pl: 4 } }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="刷新">
            <IconButton size="small" onClick={loadFiles}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="新建文件夹">
            <IconButton size="small" onClick={() => setShowNewFolderDialog(true)}>
              <CreateNewFolder fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<UploadFile />}
            onClick={() => setShowUploadDialog(true)}
            size="small"
          >
            上传文件
          </Button>
        </Box>
      </Box>

      <Breadcrumbs separator={<ChevronRight fontSize="small" />} sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        {breadcrumbs.map((item, index) => (
          <Link
            key={item.id || 'root'}
            component="button"
            variant="body2"
            color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
            onClick={() => handleBreadcrumbClick(index)}
            sx={{ textDecoration: 'none', fontWeight: index === breadcrumbs.length - 1 ? 500 : 400 }}
          >
            {item.name}
          </Link>
        ))}
      </Breadcrumbs>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Box
          sx={{
            width: 240,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'auto',
            p: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              cursor: 'pointer',
              borderRadius: 1,
              mb: 1,
              ...(currentFolderId === null ? { bgcolor: 'primary.50' } : {}),
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => {
              setCurrentFolderId(null);
              setBreadcrumbs([{ id: null, name: '全部文件' }]);
            }}
          >
            <FolderOpen fontSize="small" sx={{ color: currentFolderId === null ? 'primary.main' : 'warning.main' }} />
            <Typography variant="body2" sx={{ fontWeight: currentFolderId === null ? 500 : 400 }}>
              全部文件
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <SimpleTreeView
            expandedItems={expandedFolders}
            onExpandedItemsChange={(_event, nodeIds) => setExpandedFolders(nodeIds)}
            sx={{ flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
          >
            {rootFolders.map((folder) => renderTreeItem(folder))}
          </SimpleTreeView>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {currentFolderId === null && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                文件夹
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {rootFolders.map((folder) => (
                  <Box
                    key={folder.id}
                    onClick={() => handleFolderClick(folder)}
                    sx={{
                      width: 120,
                      p: 2,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2,
                      },
                    }}
                  >
                    <Folder sx={{ fontSize: 36, color: 'warning.main', mx: 'auto', mb: 1 }} />
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                      {folder.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {folder.fileCount} 个文件
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <FileList
            files={files}
            folders={currentFolderId === null ? [] : rootFolders.filter((f) => f.parentId === currentFolderId)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onFileClick={handleFileClick}
            onFolderClick={handleFolderClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRename={handleRename}
            onShare={() => {}}
            onPreview={handleFileClick}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            showSearch={false}
            loading={loading}
          />
        </Box>

        {showDetailPanel && selectedFile && (
          <Box
            sx={{
              width: 320,
              borderLeft: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'auto',
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                文件详情
              </Typography>
              <IconButton size="small" onClick={() => setShowDetailPanel(false)}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              {getFileIconComponent(selectedFile.mimeType)}
              <Typography variant="body1" sx={{ mt: 2, fontWeight: 500, textAlign: 'center', wordBreak: 'break-all' }}>
                {selectedFile.name}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                基本信息
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  大小
                </Typography>
                <Typography variant="body2">{formatFileSize(selectedFile.size)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  类型
                </Typography>
                <Typography variant="body2">{selectedFile.mimeType}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  创建时间
                </Typography>
                <Typography variant="body2">{dayjs(selectedFile.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  修改时间
                </Typography>
                <Typography variant="body2">{dayjs(selectedFile.updatedAt).format('YYYY-MM-DD HH:mm')}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                操作
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  size="small"
                  startIcon={<Visibility fontSize="small" />}
                  onClick={() => handleFileClick(selectedFile)}
                >
                  预览
                </Button>
                <Button
                  fullWidth
                  size="small"
                  startIcon={<Download fontSize="small" />}
                  onClick={() => handleDownload(selectedFile)}
                >
                  下载
                </Button>
                <Button
                  fullWidth
                  size="small"
                  startIcon={<Share fontSize="small" />}
                  onClick={() => {}}
                >
                  分享
                </Button>
                <Button
                  fullWidth
                  size="small"
                  startIcon={<Edit fontSize="small" />}
                  onClick={() => {}}
                >
                  重命名
                </Button>
                <Button
                  fullWidth
                  size="small"
                  startIcon={<Delete fontSize="small" />}
                  color="error"
                  onClick={() => handleDelete(selectedFile)}
                >
                  删除
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>上传文件</DialogTitle>
        <DialogContent>
          <FileUpload
            folderId={currentFolderId || undefined}
            maxCount={10}
            maxSize={100}
            maxTotalSize={500}
            onUploadSuccess={handleUploadSuccess}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showNewFolderDialog}
        onClose={() => setShowNewFolderDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>新建文件夹</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewFolderDialog(false)}>取消</Button>
          <Button onClick={handleCreateFolder} variant="contained" disabled={!newFolderName.trim()}>
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentCenterPage;
