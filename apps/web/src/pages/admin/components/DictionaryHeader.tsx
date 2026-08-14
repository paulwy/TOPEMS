import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Book, Plus } from 'lucide-react';
import { BackButton } from '@/components/common';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';
interface DictionaryHeaderProps {
  onCreateClick: () => void;
}
const DictionaryHeader: React.FC<DictionaryHeaderProps> = ({ onCreateClick }) => {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BackButton href={DASHBOARD_PATHS.dashboard} />
            <Box>
              <Typography
                variant='h5'
                sx={{
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Book
                  size={28}
                  style={{ marginRight: 12 }}
                />
                {i18n.t('admin.dictionary_management_page.text_e1e56b')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mt: 0.5 }}
              >
                {i18n.t('admin.dictionary_management_page.text_4e16c7')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant='contained'
            startIcon={<Plus size={20} />}
            onClick={onCreateClick}
          >
            {i18n.t('admin.dictionary_management_page.text_2c293b')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
export default DictionaryHeader;