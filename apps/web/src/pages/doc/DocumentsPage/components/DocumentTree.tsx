import React from 'react';
import { Card, CardContent, Box, Button, Tooltip } from '@mui/material';
import { Folder, FolderOpen, Trash2 } from 'lucide-react';
import type { Folder as FolderType } from '@/api/doc';
import i18n from '@/i18n';

interface DocumentTreeProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onDeleteFolder: (id: string, name: string) => void;
}

export const DocumentTree: React.FC<DocumentTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onDeleteFolder,
}) => {
  return (
    <Box sx={{ width: 256, flexShrink: 0 }}>
      <Card sx={{ position: 'sticky', top: 96 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Button
              variant='text'
              onClick={() => onSelectFolder(null)}
              sx={{ justifyContent: 'flex-start', width: '100%' }}
            >
              {selectedFolderId === null ? (
                <FolderOpen sx={{ width: 20, height: 20, mr: 1.5 }} />
              ) : (
                <Folder sx={{ width: 20, height: 20, mr: 1.5 }} />
              )}
              <span style={{ fontWeight: 500 }}>{i18n.t('pages.document_tree.k0')}</span>
            </Button>

            {folders.map((folder) => (
              <Box
                key={folder.id}
                sx={{ '&:hover > .delete-btn': { opacity: 1 } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant='text'
                    onClick={() => onSelectFolder(folder.id)}
                    sx={{ flex: 1, justifyContent: 'flex-start' }}
                  >
                    {selectedFolderId === folder.id ? (
                      <FolderOpen sx={{ width: 20, height: 20, mr: 1.5 }} />
                    ) : (
                      <Folder sx={{ width: 20, height: 20, mr: 1.5 }} />
                    )}
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
                  <Tooltip title={i18n.t('pages.document_tree.k1')}>
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

export default DocumentTree;
