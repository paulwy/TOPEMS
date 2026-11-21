import React from 'react';
import { Box, Typography } from '@mui/material';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DocumentDropZoneProps {
  dropZoneRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const DocumentDropZone: React.FC<DocumentDropZoneProps> = ({
  dropZoneRef,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const { t } = useTranslation();

  return (
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
        {isDragging ? ` + ${t('doc.documents.drop_release')} + ` : t('doc.documents.drop_tip')}
      </Typography>
      <Typography
        variant='body2'
        sx={{ color: 'grey.500' }}
      >
        {t('doc.documents.drop_format_tip')}
      </Typography>
    </Box>
  );
};

export default DocumentDropZone;
