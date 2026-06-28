import React, { useState } from 'react';
import {
  Box,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

import {
  Search,
  Folder,
  List as ViewListIcon,
  LayoutGrid as ViewModuleIcon,
  Eye as VisibilityIcon,
  Download as FileDownloadIcon,
  MoreVertical as MoreVertIcon,
  Star as StarIcon,
  StarOff as StarBorderIcon,
  Pencil as EditIcon,
  Share2 as ShareIcon,
  Trash2 as DeleteIcon,
  Image as ImageIcon,
  FileText,
  Table as TableIcon,
  Archive as ArchiveIcon,
  Film as FilmIcon,
  Music as MusicIcon,
  File,
  FolderOpen,
} from 'lucide-react';
import dayjs from 'dayjs';
import { formatFileSize, type FileItem, type FolderItem } from '../api/file';

export type ViewMode = 'grid' | 'list';

export interface FileListProps {
  files: FileItem[];
  folders?: FolderItem[];
  viewMode: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onFileClick?: (file: FileItem) => void;
  onFolderClick?: (folder: FolderItem) => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onRename?: (file: FileItem, newName: string) => void;
  onShare?: (file: FileItem) => void;
  onPreview?: (file: FileItem) => void;
  onToggleFavorite?: (file: FileItem) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  loading?: boolean;
}

const sizeMap = { small: 16, medium: 20, large: 24 } as const;

const getFileIcon = (mimeType: string, size: 'small' | 'medium' | 'large' = 'medium') => {
  const iconSize = sizeMap[size];

  if (mimeType.startsWith('image/')) return <ImageIcon size={iconSize} style={{ color: '#1976d2' }} />;
  if (mimeType.includes('pdf')) return <FileText size={iconSize} style={{ color: '#d32f2f' }} />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText size={iconSize} style={{ color: '#1976d2' }} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return <TableIcon size={iconSize} style={{ color: '#2e7d32' }} />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
    return <FileText size={iconSize} style={{ color: '#ed6c02' }} />;
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar'))
    return <ArchiveIcon size={iconSize} style={{ color: 'rgba(0, 0, 0, 0.54)' }} />;
  if (mimeType.includes('video/')) return <FilmIcon size={iconSize} style={{ color: 'rgba(0, 0, 0, 0.54)' }} />;
  if (mimeType.includes('audio/')) return <MusicIcon size={iconSize} style={{ color: 'rgba(0, 0, 0, 0.54)' }} />;
  if (mimeType.includes('text/')) return <FileText size={iconSize} style={{ color: 'rgba(0, 0, 0, 0.54)' }} />;
  return <File size={iconSize} style={{ color: 'rgba(0, 0, 0, 0.54)' }} />;
};

export const FileList: React.FC<FileListProps> = ({
  files,
  folders = [],
  viewMode,
  onViewModeChange,
  onFileClick,
  onFolderClick,
  onDownload,
  onDelete,
  onRename,
  onShare,
  onPreview,
  onToggleFavorite,
  selectedIds = [],
  onSelectionChange,
  showSearch = true,
  searchValue = '',
  onSearchChange,
  loading = false,
}) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuFile, setMenuFile] = useState<FileItem | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, file: FileItem) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuFile(file);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuFile(null);
  };

  const handleRenameClick = () => {
    if (menuFile) {
      setRenameFile(menuFile);
      setRenameValue(menuFile.name);
      setRenameDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleRenameConfirm = () => {
    if (renameFile && renameValue.trim()) {
      onRename?.(renameFile, renameValue.trim());
    }
    setRenameDialogOpen(false);
    setRenameFile(null);
    setRenameValue('');
  };

  const handleDeleteClick = () => {
    if (menuFile) {
      onDelete?.(menuFile);
    }
    handleMenuClose();
  };

  const handleToggleSelect = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onSelectionChange) {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((i) => i !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    }
  };

  const renderToolbar = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {showSearch && (
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(0, 0, 0, 0.54)',
            }}
          />
          <TextField
            fullWidth
            placeholder="搜索文件..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            sx={{ pl: 4 }}
            slotProps={{
              input: {
                size: 'small',
                sx: { pl: 4 },
              },
            }}
          />
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="列表视图">
          <IconButton
            size="small"
            color={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => onViewModeChange?.('list')}
          >
            <ViewListIcon size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title="网格视图">
          <IconButton
            size="small"
            color={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => onViewModeChange?.('grid')}
          >
            <ViewModuleIcon size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const renderGridView = () => (
    <Grid container spacing={2}>
      {folders.map((folder) => (
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={`folder-${folder.id}`}>
          <Box
            onClick={() => onFolderClick?.(folder)}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: 2,
              },
            }}
          >
            <FolderOpen size={40} style={{ color: '#ed6c02', marginBottom: 4 }} />
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {folder.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {folder.fileCount} 个文件
            </Typography>
          </Box>
        </Grid>
      ))}
      {files.map((file) => (
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={file.id}>
          <Box
            onClick={() => onFileClick?.(file)}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: selectedIds.includes(file.id) ? 'primary.main' : 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: 2,
              },
            }}
          >
            {onSelectionChange && (
              <Checkbox
                size="small"
                checked={selectedIds.includes(file.id)}
                onClick={(e) => handleToggleSelect(file.id, e)}
                sx={{ position: 'absolute', top: 4, right: 4, p: 0.5 }}
              />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              {getFileIcon(file.mimeType, 'large')}
            </Box>
            <Typography variant="body2" noWrap sx={{ fontWeight: 500, textAlign: 'center' }}>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
              {formatFileSize(file.size)}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 0.5,
                mt: 1,
                opacity: 0,
                transition: 'opacity 0.2s',
                '.MuiGrid-item:hover &': { opacity: 1 },
              }}
            >
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPreview?.(file); }} title="预览">
                <VisibilityIcon size={16} />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(file); }} title="下载">
                <FileDownloadIcon size={16} />
              </IconButton>
              <IconButton size="small" onClick={(e) => handleMenuOpen(e, file)} title="更多">
                <MoreVertIcon size={16} />
              </IconButton>
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );

  const renderListView = () => (
    <List sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      {folders.map((folder) => (
        <ListItem
          key={`folder-${folder.id}`}
          onClick={() => onFolderClick?.(folder)}
          sx={{
            cursor: 'pointer',
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemIcon>
            <Folder size={24} style={{ color: '#ed6c02' }} />
          </ListItemIcon>
          <ListItemText
            primary={folder.name}
            secondary={`${folder.fileCount} 个文件`}
          />
          <ListItemSecondaryAction>
            <Typography variant="caption" color="text.secondary">
              {dayjs(folder.createdAt).format('YYYY-MM-DD')}
            </Typography>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
      {files.map((file, index) => (
        <ListItem
          key={file.id}
          onClick={() => onFileClick?.(file)}
          sx={{
            cursor: 'pointer',
            borderBottom: index < files.length - 1 || folders.length > 0 ? '1px solid' : 'none',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
            ...(selectedIds.includes(file.id) ? { bgcolor: 'primary.50' } : {}),
          }}
        >
          {onSelectionChange && (
            <Checkbox
              edge="start"
              checked={selectedIds.includes(file.id)}
              onClick={(e) => handleToggleSelect(file.id, e)}
            />
          )}
          <ListItemIcon>{getFileIcon(file.mimeType)}</ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{file.name}</Typography>
                <Chip size="small" label={formatFileSize(file.size)} variant="outlined" />
              </Box>
            }
            secondary={dayjs(file.updatedAt).format('YYYY-MM-DD HH:mm')}
          />
          <ListItemSecondaryAction sx={{ display: 'flex', gap: 0.5 }}>
            {onToggleFavorite && (
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggleFavorite(file); }}>
                {file.tags?.includes('favorite') ? (
                  <StarIcon size={16} style={{ color: '#ed6c02' }} />
                ) : (
                  <StarBorderIcon size={16} />
                )}
              </IconButton>
            )}
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPreview?.(file); }} title="预览">
              <VisibilityIcon size={16} />
            </IconButton>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(file); }} title="下载">
              <FileDownloadIcon size={16} />
            </IconButton>
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, file)} title="更多操作">
              <MoreVertIcon size={16} />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box>
      {renderToolbar()}
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">加载中...</Typography>
        </Box>
      ) : files.length === 0 && folders.length === 0 ? (
        <Box sx={{ p: 8, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <File size={48} style={{ color: 'rgba(0, 0, 0, 0.26)', marginBottom: 8 }} />
          <Typography color="text.secondary">暂无文件</Typography>
        </Box>
      ) : viewMode === 'grid' ? (
        renderGridView()
      ) : (
        renderListView()
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        slotProps={{ paper: { sx: { minWidth: 160 } } }}
      >
        <MenuItem onClick={() => { onPreview?.(menuFile!); handleMenuClose(); }}>
          <VisibilityIcon size={16} style={{ marginRight: 8 }} /> 预览
        </MenuItem>
        <MenuItem onClick={() => { onDownload?.(menuFile!); handleMenuClose(); }}>
          <FileDownloadIcon size={16} style={{ marginRight: 8 }} /> 下载
        </MenuItem>
        <MenuItem onClick={handleRenameClick}>
          <EditIcon size={16} style={{ marginRight: 8 }} /> 重命名
        </MenuItem>
        <MenuItem onClick={() => { onShare?.(menuFile!); handleMenuClose(); }}>
          <ShareIcon size={16} style={{ marginRight: 8 }} /> 分享
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon size={16} style={{ marginRight: 8 }} /> 删除
        </MenuItem>
      </Menu>

      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>重命名文件</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>取消</Button>
          <Button onClick={handleRenameConfirm} variant="contained">确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileList;
