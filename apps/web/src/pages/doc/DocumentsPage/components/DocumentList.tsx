import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  useTheme,
} from '@mui/material';
import { Folder, FileText, Star, History, Trash2, Upload, Eye, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from './StatCard';
import FileCard from './FileCard';
import type { FileItem, DisplayItem, ViewMode } from '../types';
import { DOC_PATHS } from '@/modules/doc/config';

interface DocumentListProps {
  folders: { id: string; name: string; updated_at: string }[];
  files: FileItem[];
  filteredItems: DisplayItem[];
  selectedFiles: string[];
  starredCount: number;
  viewMode: ViewMode;
  isDragging: boolean;
  onSelectFolder: (folderId: string | null) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onToggleSelect: (fileId: string) => void;
  onClearSelection: () => void;
  onBatchDelete: () => void;
  onStarToggle: (id: string) => void;
  onDownload: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  onDelete: (id: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropZoneRef: React.RefObject<HTMLDivElement>;
}

const DocumentList: React.FC<DocumentListProps> = ({
  folders,
  files,
  filteredItems,
  selectedFiles,
  starredCount,
  viewMode,
  isDragging,
  onSelectFolder,
  onDeleteFolder,
  onToggleSelect,
  onClearSelection,
  onBatchDelete,
  onStarToggle,
  onDownload,
  onPreview,
  onDelete,
  onViewModeChange,
  onDragOver,
  onDragLeave,
  onDrop,
  dropZoneRef,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 3,
        }}
      >
        <StatCard
          icon={Folder}
          title='文件夹'
          value={String(folders.length)}
          color='blue'
        />
        <StatCard
          icon={FileText}
          title='文件'
          value={String(files.length)}
          color='purple'
        />
        <StatCard
          icon={Star}
          title='星标'
          value={String(starredCount)}
          color='yellow'
        />
        <StatCard
          icon={History}
          title='最近更新'
          value={String(files.length)}
          color='green'
        />
      </Box>

      {selectedFiles.length > 0 && (
        <Card
          sx={{
            mb: 3,
            border: 1,
            borderColor: 'primary.200',
            bgcolor: 'primary.50',
          }}
        >
          <CardContent
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'primary.900' }}
              >
                已选择 {selectedFiles.length} 个文件
              </Typography>
              <Button
                variant='text'
                size='small'
                onClick={onClearSelection}
              >
                取消选择
              </Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant='contained'
                size='small'
                color='error'
                onClick={onBatchDelete}
              >
                <Trash2 sx={{ width: 16, height: 16, mr: 1 }} />
                批量删除
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box
        ref={dropZoneRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        sx={{
          mb: 3,
          border: 2,
          borderStyle: 'dashed',
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          borderColor: isDragging ? 'primary.main' : 'grey.300',
          bgcolor: isDragging ? 'primary.50' : 'transparent',
          '&:hover': { borderColor: 'grey.400' },
          transition: 'all 0.2s',
        }}
      >
        <Upload
          sx={{
            width: 48,
            height: 48,
            mx: 'auto',
            mb: 2,
            color: isDragging ? 'primary.main' : 'grey.400',
          }}
        />
        <Typography
          variant='h6'
          sx={{ mb: 1, color: isDragging ? 'primary.main' : 'grey.700' }}
        >
          {isDragging ? '释放以上传文件' : '拖拽文件到这里上传'}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'grey.500' }}
        >
          支持 PDF、Word、Excel、图片等格式
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={viewMode}
          onChange={(_, val) => onViewModeChange(val as ViewMode)}
        >
          <Tab
            value='grid'
            label='网格视图'
          />
          <Tab
            value='list'
            label='列表视图'
          />
        </Tabs>
      </Box>

      {viewMode === 'grid' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          {filteredItems.map((item) =>
            item.type === 'folder' ? (
              <Card
                key={item.id}
                onClick={() => onSelectFolder(item.id)}
                sx={{
                  '&:hover': { boxShadow: 6 },
                  transition: 'box-shadow 0.2s',
                  cursor: 'pointer',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 3,
                        bgcolor: 'primary.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Folder
                        sx={{
                          width: 28,
                          height: 28,
                          color: 'primary.main',
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        opacity: 0,
                      }}
                    >
                      <Button
                        variant='text'
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(item.id, item.name);
                        }}
                      >
                        <Trash2 sx={{ width: 16, height: 16 }} />
                      </Button>
                    </Box>
                  </Box>
                  <Typography
                    variant='h6'
                    sx={{
                      fontWeight: 600,
                      color: 'grey.900',
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    <span>{item.updatedAt}</span>
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <FileCard
                key={item.id}
                file={item}
                onStarToggle={(id) => onStarToggle(id)}
                onDownload={onDownload}
                onPreview={onPreview}
                isSelected={selectedFiles.includes(item.id)}
                onSelect={onToggleSelect}
                onClick={(file) => navigate(DOC_PATHS.documentDetail.replace(':id', file.id))}
              />
            )
          )}
        </Box>
      )}

      {viewMode === 'list' && (
        <Card sx={{ overflow: 'hidden' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component='table'
                sx={{ width: '100%' }}
              >
                <Box
                  component='thead'
                  sx={{ bgcolor: 'grey.100' }}
                >
                  <tr>
                    <th
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: theme.palette.grey[500],
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      名称
                    </th>
                    <th
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: theme.palette.grey[500],
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      大小
                    </th>
                    <th
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: theme.palette.grey[500],
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      更新时间
                    </th>
                    <th
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: theme.palette.grey[500],
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      操作
                    </th>
                  </tr>
                </Box>
                <Box
                  component='tbody'
                  sx={{
                    '& > tr': { borderTop: 1, borderColor: 'divider' },
                  }}
                >
                  {filteredItems.map((item) =>
                    item.type === 'folder' ? (
                      <tr
                        key={item.id}
                        onClick={() => onSelectFolder(item.id)}
                        style={{
                          cursor: 'pointer',
                        }}
                      >
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Folder
                              sx={{
                                width: 20,
                                height: 20,
                                color: 'primary.main',
                                mr: 1.5,
                              }}
                            />
                            <Box>
                              <Typography
                                variant='body2'
                                sx={{
                                  fontWeight: 500,
                                  color: 'grey.900',
                                }}
                              >
                                {item.name}
                              </Typography>
                            </Box>
                          </Box>
                        </td>
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            fontSize: '0.875rem',
                            color: theme.palette.grey[500],
                          }}
                        >
                          -
                        </td>
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            fontSize: '0.875rem',
                            color: theme.palette.grey[500],
                          }}
                        >
                          {item.updatedAt}
                        </td>
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Button
                              variant='text'
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFolder(item.id, item.name);
                              }}
                            >
                              <Trash2 sx={{ width: 16, height: 16 }} />
                            </Button>
                          </Box>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={item.id}
                        onClick={() => navigate(DOC_PATHS.documentDetail.replace(':id', item.id))}
                        style={{ cursor: 'pointer' }}
                      >
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FileText
                              sx={{
                                width: 20,
                                height: 20,
                                color: 'secondary.main',
                                mr: 1.5,
                              }}
                            />
                            <Box>
                              <Typography
                                variant='body2'
                                sx={{
                                  fontWeight: 500,
                                  color: 'grey.900',
                                }}
                              >
                                {item.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                {item.tags.map((tag) => (
                                  <Chip
                                    key={tag}
                                    label={tag}
                                    size='small'
                                    variant='outlined'
                                  />
                                ))}
                              </Box>
                            </Box>
                          </Box>
                        </td>
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            fontSize: '0.875rem',
                            color: theme.palette.grey[500],
                          }}
                        >
                          {item.size || '-'}
                        </td>
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            fontSize: '0.875rem',
                            color: theme.palette.grey[500],
                          }}
                        >
                          {item.updatedAt}
                        </td>
                        <td
                          style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Button
                              variant='text'
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreview(item);
                              }}
                            >
                              <Eye sx={{ width: 16, height: 16 }} />
                            </Button>
                            <Button
                              variant='text'
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownload(item);
                              }}
                            >
                              <Download sx={{ width: 16, height: 16 }} />
                            </Button>
                            <Button
                              variant='text'
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation();
                                onStarToggle(item.id);
                              }}
                            >
                              <Star
                                sx={{ width: 16, height: 16 }}
                                style={{
                                  fill: item.starred ? 'currentColor' : 'none',
                                }}
                              />
                            </Button>
                            <Button
                              variant='text'
                              size='small'
                              color='error'
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
                              }}
                            >
                              <Trash2 sx={{ width: 16, height: 16 }} />
                            </Button>
                          </Box>
                        </td>
                      </tr>
                    )
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DocumentList;
export { DocumentList };
