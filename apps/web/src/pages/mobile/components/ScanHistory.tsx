import React from 'react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  List,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import { History, Search, Trash2, Clock, Barcode, QrCode } from 'lucide-react';
import { MobileCard } from '@/components/mobile';
import type { ScanHistoryItem } from '../hooks/useMobileScan';

interface ScanHistoryProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  scanHistory: ScanHistoryItem[];
  filteredHistory: ScanHistoryItem[];
  onClearHistory: () => void;
  onItemClick: (content: string) => void;
}
const ScanHistory: React.FC<ScanHistoryProps> = ({
  searchQuery,
  onSearchChange,
  scanHistory,
  filteredHistory,
  onClearHistory,
  onItemClick,
}) => {
  const theme = useTheme();
  return (
    <Box>
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          size='small'
          placeholder={i18n.t('mobile.scan.action.search_history')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              minHeight: { xs: 44, sm: 48, md: 52 },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search style={{ width: 20, height: 20 }} />
                </InputAdornment>
              ),
              endAdornment:
                scanHistory.length > 0 ? (
                  <InputAdornment position='end'>
                    <IconButton
                      size='small'
                      onClick={onClearHistory}
                      aria-label={i18n.t('mobile.scan_history.k0')}
                    >
                      <Trash2 style={{ width: 18, height: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
            },
          }}
        />
      </Box>
      {filteredHistory.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
          }}
        >
          <Box
            sx={{
              width: { xs: 52, sm: 60, md: 64 },
              height: { xs: 52, sm: 60, md: 64 },
              borderRadius: '50%',
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <History style={{ width: 32, height: 32, color: theme.palette.text.secondary }} />
          </Box>
          <Typography
            variant='subtitle1'
            sx={{ mb: 1, fontWeight: 500 }}
          >
            {i18n.t('mobile.scan.status.empty_history')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('mobile.scan.status.history_desc')}
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {filteredHistory.map((item) => (
            <React.Fragment key={item.id}>
              <MobileCard
                leftIcon={
                  item.type === 'qrcode' ? (
                    <QrCode style={{ width: 20, height: 20 }} />
                  ) : (
                    <Barcode style={{ width: 20, height: 20 }} />
                  )
                }
                title={item.content}
                subtitle={
                  item.relatedData
                    ? `${item.relatedData.type}: ${item.relatedData.name}`
                    : item.format
                }
                showArrow
                divider
                rightContent={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={item.format}
                      size='small'
                      variant='outlined'
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                }
                badge={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock style={{ width: 12, height: 12, color: theme.palette.text.secondary }} />
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {item.time}
                    </Typography>
                  </Box>
                }
                onClick={() => onItemClick(item.content)}
              />
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};
export default ScanHistory;
