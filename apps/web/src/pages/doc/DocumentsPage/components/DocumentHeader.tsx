import React from 'react';
import { Box, Typography, TextField, Tooltip, Button } from '@mui/material';
import { ChevronLeft, Search, Plus, Upload, Filter, Grid3X3, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModeToggle } from '@/components/theme/ModeToggle';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import type { ViewMode } from '../types';
import type { Folder as FolderType } from '@/api/doc';

interface DocumentHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  uploading: boolean;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFolder?: FolderType;
  children?: React.ReactNode;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  viewMode,
  onViewModeChange,
  uploading,
  onUploadClick,
  onNewFolderClick,
  fileInputRef,
  onFileUpload,
  selectedFolder,
  children,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box
      component='header'
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 64,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Button
              variant='text'
              onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
            >
              <ChevronLeft sx={{ width: 20, height: 20 }} />
            </Button>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'grey.900' }}
            >
              {t('doc.documents.file_management')}
            </Typography>
            {selectedFolder && (
              <Typography sx={{ color: 'grey.500' }}>/ {selectedFolder.name}</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ModeToggle />
            <Box sx={{ position: 'relative', flex: '1 1 auto', maxWidth: 320 }}>
              <Search
                sx={{
                  position: 'absolute',
                  left: 2,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: 'grey.400',
                }}
              />
              <TextField
                type='text'
                placeholder={t('doc.documents.search_placeholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                size='small'
                sx={{ pl: 10, width: '100%' }}
              />
            </Box>
            <Tooltip title={t('doc.documents.filter')}>
              <span>
                <Button
                  variant={showFilters ? 'contained' : 'text'}
                  size='small'
                  onClick={onToggleFilters}
                  aria-label={t('doc.documents.filter')}
                >
                  <Filter sx={{ width: 16, height: 16 }} />
                </Button>
              </span>
            </Tooltip>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'grey.200',
                borderRadius: 3,
                p: 0.5,
              }}
            >
              <Button
                variant='text'
                size='small'
                onClick={() => onViewModeChange('grid')}
                sx={{
                  bgcolor: viewMode === 'grid' ? 'background.paper' : 'transparent',
                  boxShadow: viewMode === 'grid' ? 1 : 0,
                }}
              >
                <Grid3X3 sx={{ width: 16, height: 16 }} />
              </Button>
              <Button
                variant='text'
                size='small'
                onClick={() => onViewModeChange('list')}
                sx={{
                  bgcolor: viewMode === 'list' ? 'background.paper' : 'transparent',
                  boxShadow: viewMode === 'list' ? 1 : 0,
                }}
              >
                <List sx={{ width: 16, height: 16 }} />
              </Button>
            </Box>
            <Tooltip title={t('doc.documents.new_folder')}>
              <span>
                <Button
                  variant='text'
                  onClick={onNewFolderClick}
                >
                  <Plus sx={{ width: 20, height: 20 }} />
                </Button>
              </span>
            </Tooltip>
            <Button
              onClick={onUploadClick}
              disabled={uploading}
            >
              <Upload sx={{ width: 16, height: 16, mr: 1 }} />
              <span>{uploading ? t('doc.documents.uploading') : t('doc.documents.upload')}</span>
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              style={{ display: 'none' }}
              onChange={onFileUpload}
              accept='*/*'
            />
          </Box>
        </Box>

        {children}
      </Box>
    </Box>
  );
};

export default DocumentHeader;
