import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DocumentUploadProgressProps {
  uploadProgress: number;
}

const DocumentUploadProgress: React.FC<DocumentUploadProgressProps> = ({ uploadProgress }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3, py: 2 }}>
      <Card
        sx={{
          bgcolor: 'primary.50',
          border: 1,
          borderColor: 'primary.200',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'primary.900' }}
            >
              {t('doc.documents.upload_in_progress')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'primary.700' }}
            >
              {uploadProgress}%
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              bgcolor: 'primary.200',
              borderRadius: 1,
              height: 8,
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                height: 8,
                borderRadius: 1,
                transition: 'width 0.3s',
                width: `${uploadProgress}%`,
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocumentUploadProgress;
