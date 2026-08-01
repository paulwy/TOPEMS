import React from 'react';
import { Card, CardContent, Box, Typography, Button, Chip, useTheme } from '@mui/material';
import { Folder, FileText, Eye, Download, Star, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DisplayItem } from '../types';

interface DocumentListProps {
  items: DisplayItem[];
  onFolderSelect: (folderId: string | null) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onStarToggle: (id: string) => void;
  onDownload: (file: DisplayItem) => void;
  onPreview: (file: DisplayItem) => void;
  onDelete: (id: string) => void;
  onFileClick: (file: DisplayItem) => void;
}

const thStyle = (color: string): React.CSSProperties => ({
  padding: '12px 24px',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 500,
  color,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

const tdBaseStyle: React.CSSProperties = {
  padding: '16px 24px',
  whiteSpace: 'nowrap',
};

const DocumentList: React.FC<DocumentListProps> = ({
  items,
  onFolderSelect,
  onDeleteFolder,
  onStarToggle,
  onDownload,
  onPreview,
  onDelete,
  onFileClick,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const grey500 = theme.palette.grey[500];

  return (
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
                <th style={thStyle(grey500)}>{t('common.name')}</th>
                <th style={thStyle(grey500)}>{t('doc.field.size')}</th>
                <th style={thStyle(grey500)}>{t('doc.field.updated_at')}</th>
                <th style={thStyle(grey500)}>{t('common.actions')}</th>
              </tr>
            </Box>
            <Box
              component='tbody'
              sx={{
                '& > tr': { borderTop: 1, borderColor: 'divider' },
              }}
            >
              {items.map((item) =>
                item.type === 'folder' ? (
                  <tr
                    key={item.id}
                    onClick={() => onFolderSelect(item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={tdBaseStyle}>
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
                        ...tdBaseStyle,
                        fontSize: '0.875rem',
                        color: grey500,
                      }}
                    >
                      -
                    </td>
                    <td
                      style={{
                        ...tdBaseStyle,
                        fontSize: '0.875rem',
                        color: grey500,
                      }}
                    >
                      {item.updatedAt}
                    </td>
                    <td
                      style={{
                        ...tdBaseStyle,
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
                    onClick={() => onFileClick(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={tdBaseStyle}>
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
                        ...tdBaseStyle,
                        fontSize: '0.875rem',
                        color: grey500,
                      }}
                    >
                      {item.size || '-'}
                    </td>
                    <td
                      style={{
                        ...tdBaseStyle,
                        fontSize: '0.875rem',
                        color: grey500,
                      }}
                    >
                      {item.updatedAt}
                    </td>
                    <td
                      style={{
                        ...tdBaseStyle,
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
  );
};

export default DocumentList;
