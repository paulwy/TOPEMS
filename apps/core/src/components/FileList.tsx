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
  InsertDriveFile,
  Description,
  Image,
  TableChart,
  PictureAsPdf,
  Movie,
  Audiotrack,
  Archive,
  TextSnippet,
  MoreVert,
  Visibility,
  FileDownload,
  Edit,
  Delete,
  Share,
  Star,
  StarBorder,
  Folder,
  ViewList,
  ViewModule,
  Search,
} from '@mui/icons-material';
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

const getFileIcon = (mimeType: string, size: 'small' | 'medium' | 'large' = 'medium') => {
  const props = { fontSize: size };

  if (mimeType.startsWith('image/')) return <Image color="primary" {...props} />;
  if (mimeType.includes('pdf')) return <PictureAsPdf color="error" {...props} />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <Description color="primary" {...props} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return <TableChart color="success" {...props} />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
    return <Description color="warning" {...props} />;
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar'))
    return <Archive color="action" {...props} />;
  if (mimeType.includes('video/')) return <Movie color="action" {...props} />;
  if (mimeType.includes('audio/')) return <Audiotrack color="action" {...props} />;
  if (mimeType.includes('text/')) return <TextSnippet color="action" {...props} />;
  return <InsertDriveFile color="action" {...props} />;
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
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'text.secondary',
            }}
            fontSize="small"
          />
          <TextField
            fullWidth
            size="small"
            placeholder="搜索文件..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            sx={{ pl: 4 }}
            InputProps={{ sx: { pl: 4 } }}
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
            <ViewList fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="网格视图">
          <IconButton
            size="small"
            color={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => onViewModeChange?.('grid')}
          >
            <ViewModule fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const renderGridView = () => (
    <Grid container spacing={2}>
      {folders.map((folder) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={`folder-${folder.id}`}>
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
            <Folder sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
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
        <Grid item xs={6} sm={4} md={3} lg={2} key={file.id}>
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
                <Visibility fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(file); }} title="下载">
                <FileDownload fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => handleMenuOpen(e, file)} title="更多">
                <MoreVert fontSize="small" />
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
            <Folder sx={{ color: 'warning.main' }} />
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
                  <Star fontSize="small" color="warning" />
                ) : (
                  <StarBorder fontSize="small" />
                )}
              </IconButton>
            )}
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPreview?.(file); }} title="预览">
              <Visibility fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(file); }} title="下载">
              <FileDownload fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, file)} title="更多操作">
              <MoreVert fontSize="small" />
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
          <InsertDriveFile sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
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
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem onClick={() => { onPreview?.(menuFile!); handleMenuClose(); }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} /> 预览
        </MenuItem>
        <MenuItem onClick={() => { onDownload?.(menuFile!); handleMenuClose(); }}>
          <FileDownload fontSize="small" sx={{ mr: 1 }} /> 下载
        </MenuItem>
        <MenuItem onClick={handleRenameClick}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> 重命名
        </MenuItem>
        <MenuItem onClick={() => { onShare?.(menuFile!); handleMenuClose(); }}>
          <Share fontSize="small" sx={{ mr: 1 }} /> 分享
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> 删除
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
