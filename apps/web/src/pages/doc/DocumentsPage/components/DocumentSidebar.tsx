import React from 'react';
import { Card, CardContent, Box, Button, Tooltip } from '@mui/material';
import { Folder, FolderOpen, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Folder as FolderType } from '@/api/doc';

interface DocumentSidebarProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onDeleteFolder: (id: string, name: string) => void;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  folders,
  selectedFolderId,
  onFolderSelect,
  onDeleteFolder,
}) => {
  const { t } = useTranslation();

  const renderFolderIcon = (isSelected: boolean) =>
    isSelected ? (
      <FolderOpen sx={{ width: 20, height: 20, mr: 1.5 }} />
    ) : (
      <Folder sx={{ width: 20, height: 20, mr: 1.5 }} />
    );

  return (
    <Box sx={{ width: 256, flexShrink: 0 }}>
      <Card sx={{ position: 'sticky', top: 96 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Button
              variant='text'
              onClick={() => onFolderSelect(null)}
              sx={{ justifyContent: 'flex-start', width: '100%' }}
            >
              {renderFolderIcon(selectedFolderId === null)}
              <span style={{ fontWeight: 500 }}>{t('doc.documents.all_files')}</span>
            </Button>

            {folders.map((folder) => (
              <Box
                key={folder.id}
                sx={{ '&:hover > .delete-btn': { opacity: 1 } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant='text'
                    onClick={() => onFolderSelect(folder.id)}
                    sx={{ flex: 1, justifyContent: 'flex-start' }}
                  >
                    {renderFolderIcon(selectedFolderId === folder.id)}
                    <span
                      style={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {folder.name}
                    </span>
                  </Button>
                  <Tooltip title={t('doc.documents.delete_folder')}>
                    <span>
                      <Button
                        variant='text'
                        size='small'
                        className='delete-btn'
                        sx={{
                          opacity: 0,
                          color: 'grey.400',
                          '&:hover': {
                            color: 'error.main',
                            bgcolor: 'error.50',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id, folder.name);
                        }}
                      >
                        <Trash2 sx={{ width: 16, height: 16 }} />
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocumentSidebar;
