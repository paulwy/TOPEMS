import React from 'react';
import { Box, Typography, Button, Paper, IconButton } from '@mui/material';
import { Flashlight, Image, Barcode, Package, CheckSquare, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileButton } from '@/components/mobile';
import { designTokens } from '@/theme/tokens';
import { alpha } from '@mui/material/styles';
import { sizeTokens } from '@/theme';

const ct= designTokens.colors;

interface ScannerViewProps {
  scanning: boolean;
  scanResult: string | null;
  flashOn: boolean;
  onFlashToggle: () => void;
  onManualTabClick: () => void;
  onRescan: () => void;
  onCopyResult: () => void;
}

const ScannerView: React.FC<ScannerViewProps> = ({
  scanning,
  scanResult,
  flashOn,
  onFlashToggle,
  onManualTabClick,
  onRescan,
  onCopyResult,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          borderRadius: 2,
          overflow: 'hidden',
          mb: 3,
          backgroundColor: ct.grey[900],
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${ct.grey[900]} 0%, ${ct.blue[900]} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '70%',
              aspectRatio: 1,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 30,
                height: 30,
                borderTop: '3px solid',
                borderLeft: '3px solid',
                borderColor: 'primary.main',
                borderRadius: '4px 0 0 0',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 30,
                height: 30,
                borderTop: '3px solid',
                borderRight: '3px solid',
                borderColor: 'primary.main',
                borderRadius: '0 4px 0 0',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: 30,
                height: 30,
                borderBottom: '3px solid',
                borderLeft: '3px solid',
                borderColor: 'primary.main',
                borderRadius: '0 0 0 4px',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderBottom: '3px solid',
                borderRight: '3px solid',
                borderColor: 'primary.main',
                borderRadius: '0 0 4px 0',
              }}
            />

            {scanning && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 2,
                  bgcolor: 'primary.main',
                  boxShadow: '0 0 10px rgba(0, 229, 255, 0.8)',
                  animation: 'scanLine 2s ease-in-out infinite',
                }}
                style={{
                  animation: 'scanLine 2s ease-in-out infinite',
                }}
              />
            )}
          </Box>

          <style>{`
            @keyframes scanLine {
              0%, 100% { top: 15%; }
              50% { top: 85%; }
            }
          `}</style>
        </Box>

        {scanResult && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: alpha(ct.grey[900], 0.85),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
          >
            <Box
              sx={{
                width: { xs: 52, sm: 56, md: 60 },
                height: { xs: 52, sm: 56, md: 60 },
                borderRadius: '50%',
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <CheckSquare style={{ width: 32, height: 32, color: ct.background.paper }} />
            </Box>
            <Typography
              variant='h6'
              sx={{ color: 'common.white', mb: 1, fontWeight: 600 }}
            >
              {t('mobile.scan.message.scan_success')}
            </Typography>
            <Typography
              variant='body2'
              sx={{
                color: alpha(ct.background.paper, 0.9),
                mb: 2,
                textAlign: 'center',
                wordBreak: 'break-all',
                px: 2,
              }}
            >
              {scanResult}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <MobileButton
                variant='outlined'
                size='small'
                onClick={onRescan}
                sx={{ color: 'common.white', borderColor: alpha(ct.background.paper, 0.5) }}
              >
                {t('mobile.scan.action.rescan')}
              </MobileButton>
              <MobileButton
                variant='contained'
                size='small'
                onClick={onCopyResult}
              >
                {t('mobile.scan.action.copy_result')}
              </MobileButton>
            </Box>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <IconButton
            sx={{
              width: { xs: 48, sm: 52, md: 56 },
              height: { xs: 48, sm: 52, md: 56 },
              bgcolor: flashOn ? 'warning.main' : 'grey.100',
              color: flashOn ? 'common.white' : 'text.primary',
              '&:hover': {
                bgcolor: flashOn ? 'warning.dark' : 'grey.200',
              },
            }}
            onClick={onFlashToggle}
            aria-label='手电筒'
          >
            <Flashlight style={{ width: 24, height: 24 }} />
          </IconButton>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {t('mobile.scan.action.flashlight')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <IconButton
            sx={{
              width: { xs: 48, sm: 52, md: 56 },
              height: { xs: 48, sm: 52, md: 56 },
              bgcolor: 'grey.100',
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'grey.200',
              },
            }}
            aria-label='图片'
          >
            <Image style={{ width: 24, height: 24 }} />
          </IconButton>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {t('mobile.scan.action.album')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <IconButton
            sx={{
              width: { xs: 48, sm: 52, md: 56 },
              height: { xs: 48, sm: 52, md: 56 },
              bgcolor: 'grey.100',
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'grey.200',
              },
            }}
            onClick={onManualTabClick}
            aria-label='扫码'
          >
            <Barcode style={{ width: 24, height: 24 }} />
          </IconButton>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {t('mobile.scan.section.manual')}
          </Typography>
        </Box>
      </Box>

      {scanResult && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('mobile.scan.label.related_info')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: sizeTokens.inputHeightLg,
                height: sizeTokens.inputHeightLg,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.lighter',
                color: 'primary.main',
              }}
            >
              <Package style={{ width: 24, height: 24 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {t('mobile.scan.name.resistor_10k')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('mobile.scan.label.material_code')}: {scanResult}
              </Typography>
            </Box>
            <Button endIcon={<ArrowRight style={{ width: 16, height: 16 }} />}>
              {t('mobile.scan.action.view')}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ScannerView;
