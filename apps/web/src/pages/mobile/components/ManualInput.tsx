import React from 'react';
import { Box, Typography, Chip, Paper, TextField } from '@mui/material';
import { Barcode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileButton } from '@/components/mobile';
import { sizeTokens } from '@/theme';

interface ManualInputProps {
  manualInput: string;
  onManualInputChange: (value: string) => void;
  onSubmit: () => void;
}

const ManualInput: React.FC<ManualInputProps> = ({
  manualInput,
  onManualInputChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('mobile.scan.action.manual_input')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {t('mobile.scan.status.manual_desc')}
        </Typography>

        <TextField
          fullWidth
          placeholder={t('mobile.scan.field.input_placeholder')}
          value={manualInput}
          onChange={(e) => onManualInputChange(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              minHeight: sizeTokens.inputHeightLg,
            },
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit();
            }
          }}
        />

        <MobileButton
          fullWidth
          variant='contained'
          onClick={onSubmit}
          disabled={!manualInput.trim()}
          startIcon={<Barcode style={{ width: 20, height: 20 }} />}
        >
          {t('mobile.scan.action.confirm')}
        </MobileButton>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('mobile.scan.label.supported_formats')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {['Code 128', 'EAN-13', 'UPC-A', 'QR Code', 'Code 39', 'ITF'].map((format) => (
            <Chip
              key={format}
              label={format}
              variant='outlined'
              size='small'
              sx={{ height: 28 }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ManualInput;
