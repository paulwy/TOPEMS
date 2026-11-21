import React from 'react';
import { Box, Card, CardContent, Typography, Button, Tooltip } from '@mui/material';
import { Folder, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DisplayItem, FileItem } from '../types';
import FileCard from './FileCard';

interface DocumentGridProps {
  items: DisplayItem[];
  selectedFiles: string[];
  onFolderSelect: (folderId: string | null) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onStarToggle: (id: string) => void;
  onDownload: (file: DisplayItem) => void;
  onPreview: (file: DisplayItem) => void;
  onToggleFileSelect: (fileId: string) => void;
  onFileClick: (file: DisplayItem) => void;
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
  items,
  selectedFiles,
  onFolderSelect,
  onDeleteFolder,
  onStarToggle,
  onDownload,
  onPreview,
  onToggleFileSelect,
  onFileClick,
}) => {
  const { t } = useTranslation();

  return (
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
      {items.map((item) =>
        item.type === 'folder' ? (
          <Card
            key={item.id}
            onClick={() => onFolderSelect(item.id)}
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
                  <Tooltip title={t('doc.documents.delete_folder')}>
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
                  </Tooltip>
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
            file={item as unknown as FileItem}
            onStarToggle={(id) => onStarToggle(id)}
            onDownload={onDownload as unknown as (file: FileItem) => void}
            onPreview={onPreview as unknown as (file: FileItem) => void}
            isSelected={selectedFiles.includes(item.id)}
            onSelect={onToggleFileSelect}
            onClick={onFileClick as unknown as (file: FileItem) => void}
          />
        )
      )}
    </Box>
  );
};

export default DocumentGrid;
