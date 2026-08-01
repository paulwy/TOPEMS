import React from 'react';
import { Card, CardContent, Box, Typography, Button } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DocumentBatchActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchDelete: () => void;
}

const DocumentBatchActions: React.FC<DocumentBatchActionsProps> = ({
  selectedCount,
  onClearSelection,
  onBatchDelete,
}) => {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
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
            {t('doc.documents.selected_count', { count: selectedCount })}
          </Typography>
          <Button
            variant='text'
            size='small'
            onClick={onClearSelection}
          >
            {t('doc.documents.clear_selection')}
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
            {t('doc.documents.batch_delete')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DocumentBatchActions;
