import React from 'react';
import { Box } from '@mui/material';
import { Folder, FileText, Star, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Folder as FolderType } from '@/api/doc';
import type { FileItem } from '../types';
import StatCard from './StatCard';

interface DocumentStatsProps {
  folders: FolderType[];
  files: FileItem[];
  starredCount: number;
}

const DocumentStats: React.FC<DocumentStatsProps> = ({ folders, files, starredCount }) => {
  const { t } = useTranslation();

  return (
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
        title={t('doc.documents.stat_folders')}
        value={String(folders.length)}
        color='blue'
      />
      <StatCard
        icon={FileText}
        title={t('doc.documents.stat_files')}
        value={String(files.length)}
        color='purple'
      />
      <StatCard
        icon={Star}
        title={t('doc.documents.stat_starred')}
        value={String(starredCount)}
        color='yellow'
      />
      <StatCard
        icon={History}
        title={t('doc.documents.stat_recent')}
        value={String(files.length)}
        color='green'
      />
    </Box>
  );
};

export default DocumentStats;
