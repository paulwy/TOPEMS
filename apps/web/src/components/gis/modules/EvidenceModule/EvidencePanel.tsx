import { designTokens } from '@topems/tokens';
// modules/EvidenceModule/EvidencePanel.tsx
import React, { useState, useCallback } from 'react';
import { Camera, Mic, Video, List, Grid, Search, X, Tag } from 'lucide-react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Chip,
  Grid as MuiGrid,
  Stack,
  Button,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import type { EvidenceRecord, EvidenceType } from './types';
import PhotoCapture from './PhotoCapture';
import AudioCapture from './AudioCapture';
import VideoCapture from './VideoCapture';

interface EvidencePanelProps {
  position: [number, number]; // [lat, lng]
  onCapture: (record: EvidenceRecord) => void;
  onClose: () => void;
  existingRecords?: EvidenceRecord[];
}

type ViewMode = 'list' | 'grid';
type CaptureMode = 'photo' | 'audio' | 'video' | null;

const EvidencePanel: React.FC<EvidencePanelProps> = ({
  position,
  onCapture,
  onClose,
  existingRecords = [],
}) => {
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [records, setRecords] = useState<EvidenceRecord[]>(existingRecords);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<EvidenceType | 'all'>('all');

  // Handle capture
  const handlePhotoCapture = useCallback(
    (file: File, thumbnail?: string) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `${i18n.t('components.evidence_panel.__0')}${new Date().toLocaleString()}`,
        evidence_type: 'photo',
        position,
        file_url: URL.createObjectURL(file),
        thumbnail_url: thumbnail,
        filesize: file.size,
        recorded_by: 'current-user',
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture]
  );

  const handleAudioCapture = useCallback(
    (file: File, duration: number) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `${i18n.t('components.evidence_panel.__1')}${new Date().toLocaleString()}`,
        evidence_type: 'audio',
        position,
        file_url: URL.createObjectURL(file),
        duration,
        filesize: file.size,
        recorded_by: 'current-user',
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture]
  );

  const handleVideoCapture = useCallback(
    (file: File, thumbnail?: string, duration?: number) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `${i18n.t('components.evidence_panel.__2')}${new Date().toLocaleString()}`,
        evidence_type: 'video',
        position,
        file_url: URL.createObjectURL(file),
        thumbnail_url: thumbnail,
        duration,
        filesize: file.size,
        recorded_by: 'current-user',
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture]
  );

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || record.evidence_type === filterType;
    return matchesSearch && matchesType;
  });

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render capture mode
  if (captureMode === 'photo') {
    return (
      <Box sx={{ height: '100%' }}>
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </Box>
    );
  }

  if (captureMode === 'audio') {
    return (
      <Box sx={{ height: '100%' }}>
        <AudioCapture
          onCapture={handleAudioCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </Box>
    );
  }

  if (captureMode === 'video') {
    return (
      <Box sx={{ height: '100%' }}>
        <VideoCapture
          onCapture={handleVideoCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </Box>
    );
  }

  // Main panel
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 16,
          py: 12,
          borderBottom: 1,
          borderColor: 'grey.200',
        }}
      >
        <Typography
          sx={{
            fontSize: designTokens.typography.fontSize.scale['1.125rem'],
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {i18n.t('components.evidence_panel.k3')}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ borderRadius: 4, '&:hover': { bgcolor: 'grey.100' } }}
          aria-label={i18n.t('components.evidence_panel.k0')}
        >
          <X
            size={20}
            style={{ color: theme.palette.text.secondary }}
          />
        </IconButton>
      </Box>

      {/* Capture Buttons */}
      <Box
        sx={{
          p: 16,
          borderBottom: 1,
          borderColor: 'grey.200',
          bgcolor: 'grey.50',
        }}
      >
        <Typography
          sx={{
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            color: 'text.secondary',
            mb: 12,
          }}
        >
          {i18n.t('components.evidence_panel.k4')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 12 }}>
          <Button
            onClick={() => setCaptureMode('photo')}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              p: 16,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 8,
              '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.light' },
              textTransform: 'none',
            }}
          >
            <Box sx={{ p: 12, bgcolor: 'primary.lightest', borderRadius: 'full' }}>
              <Camera
                size={24}
                sx={{ color: 'primary.dark' }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                fontWeight: 500,
                color: 'grey.700',
              }}
            >
              {i18n.t('components.evidence_panel.k5')}
            </Typography>
          </Button>
          <Button
            onClick={() => setCaptureMode('audio')}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              p: 16,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 8,
              '&:hover': { bgcolor: 'success.light', borderColor: 'success.light' },
              textTransform: 'none',
            }}
          >
            <Box sx={{ p: 12, bgcolor: 'success.lighter', borderRadius: 'full' }}>
              <Mic
                size={24}
                style={{ color: theme.palette.success.dark }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                fontWeight: 500,
                color: 'grey.700',
              }}
            >
              {i18n.t('components.evidence_panel.k6')}
            </Typography>
          </Button>
          <Button
            onClick={() => setCaptureMode('video')}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              p: 16,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 8,
              '&:hover': { bgcolor: 'secondary.light', borderColor: 'secondary.light' },
              textTransform: 'none',
            }}
          >
            <Box sx={{ p: 12, bgcolor: 'secondary.lightest', borderRadius: 'full' }}>
              <Video
                size={24}
                sx={{ color: 'secondary.dark' }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                fontWeight: 500,
                color: 'grey.700',
              }}
            >
              {i18n.t('components.evidence_panel.k7')}
            </Typography>
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ p: 16, borderBottom: 1, borderColor: 'grey.200' }}>
        <Box sx={{ position: 'relative', mb: 12 }}>
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'text.disabled',
            }}
          >
            <Search size={16} />
          </Box>
          <TextField
            placeholder={i18n.t('components.evidence_panel.k8')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size='small'
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                pl: 36,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                '& fieldset': { borderColor: 'grey.200' },
                '&:hover fieldset': { borderColor: 'grey.300' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 8 }}>
          {(['all', 'photo', 'audio', 'video'] as const).map((type) => (
            <Chip
              key={type}
              label={
                type === 'all'
                  ? i18n.t('components.evidence_panel.k1')
                  : type === 'photo'
                    ? i18n.t('components.evidence_panel.k2')
                    : type === 'audio'
                      ? i18n.t('components.evidence_panel.k3')
                      : i18n.t('components.evidence_panel.k4')
              }
              onClick={() => setFilterType(type)}
              sx={{
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                bgcolor: filterType === type ? 'primary.main' : 'grey.100',
                color: filterType === type ? 'var(--color-primary-foreground)' : 'text.secondary',
                '&:hover': {
                  bgcolor: filterType === type ? 'primary.main' : 'grey.200',
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* View Mode Toggle */}
      <Box
        sx={{
          px: 16,
          py: 8,
          borderBottom: 1,
          borderColor: 'grey.200',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 4,
            bgcolor: 'grey.100',
            borderRadius: 8,
            p: 4,
          }}
        >
          <IconButton
            onClick={() => setViewMode('grid')}
            sx={{
              borderRadius: 4,
              bgcolor: viewMode === 'grid' ? 'background.paper' : 'transparent',
              boxShadow: viewMode === 'grid' ? 1 : 0,
              '&:hover': { bgcolor: viewMode === 'grid' ? 'background.paper' : 'action.hover' },
            }}
            aria-label={i18n.t('components.evidence_panel.k5')}
          >
            <Grid
              size={16}
              sx={{ color: 'text.secondary' }}
            />
          </IconButton>
          <IconButton
            onClick={() => setViewMode('list')}
            sx={{
              borderRadius: 4,
              bgcolor: viewMode === 'list' ? 'background.paper' : 'transparent',
              boxShadow: viewMode === 'list' ? 1 : 0,
              '&:hover': { bgcolor: viewMode === 'list' ? 'background.paper' : 'action.hover' },
            }}
            aria-label={i18n.t('components.evidence_panel.k6')}
          >
            <List
              size={16}
              sx={{ color: 'text.secondary' }}
            />
          </IconButton>
        </Box>
      </Box>

      {/* Records List/Grid */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 16 }}>
        {filteredRecords.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Tag
              size={48}
              sx={{ color: 'action.disabled', mb: 1.5 }}
            />
            <Typography sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}>
              {i18n.t('components.evidence_panel.k7')}
            </Typography>
          </Box>
        ) : viewMode === 'grid' ? (
          <MuiGrid
            container
            spacing={12}
          >
            {filteredRecords.map((record) => (
              <MuiGrid
                key={record.id}
                size={6}
              >
                <Paper
                  sx={{
                    border: 1,
                    borderColor: 'grey.200',
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 2 },
                  }}
                >
                  {record.thumbnail_url ? (
                    <Box
                      component='img'
                      src={record.thumbnail_url}
                      alt={record.title}
                      sx={{ width: '100%', height: 96, objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: 96,
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {record.evidence_type === 'photo' && (
                        <Camera
                          size={32}
                          style={{ color: theme.palette.text.disabled }}
                        />
                      )}
                      {record.evidence_type === 'audio' && (
                        <Mic
                          size={32}
                          style={{ color: theme.palette.text.disabled }}
                        />
                      )}
                      {record.evidence_type === 'video' && (
                        <Video
                          size={32}
                          style={{ color: theme.palette.text.disabled }}
                        />
                      )}
                    </Box>
                  )}
                  <Box sx={{ p: 8 }}>
                    <Typography
                      sx={{
                        fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                        fontWeight: 500,
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {record.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                        color: 'text.secondary',
                      }}
                    >
                      {record.evidence_type === 'photo'
                        ? i18n.t('components.evidence_panel.k8')
                        : record.evidence_type === 'audio'
                          ? i18n.t('components.evidence_panel.k9')
                          : i18n.t('components.evidence_panel.k10')}
                      {record.duration && ` · ${formatDuration(record.duration)}`}
                    </Typography>
                  </Box>
                </Paper>
              </MuiGrid>
            ))}
          </MuiGrid>
        ) : (
          <Stack spacing={8}>
            {filteredRecords.map((record) => (
              <Paper
                key={record.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  p: 12,
                  border: 1,
                  borderColor: 'grey.200',
                  borderRadius: 8,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                {record.thumbnail_url ? (
                  <Box
                    component='img'
                    src={record.thumbnail_url}
                    alt={record.title}
                    sx={{
                      width: 48,
                      height: 48,
                      objectFit: 'cover',
                      borderRadius: 4,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'grey.100',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {record.evidence_type === 'photo' && (
                      <Camera
                        size={20}
                        style={{ color: theme.palette.text.disabled }}
                      />
                    )}
                    {record.evidence_type === 'audio' && (
                      <Mic
                        size={20}
                        style={{ color: theme.palette.text.disabled }}
                      />
                    )}
                    {record.evidence_type === 'video' && (
                      <Video
                        size={20}
                        style={{ color: theme.palette.text.disabled }}
                      />
                    )}
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {record.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                      color: 'text.secondary',
                    }}
                  >
                    {new Date(record.recorded_at).toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    textAlign: 'right',
                    fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                    color: 'text.secondary',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                      color: 'text.secondary',
                    }}
                  >
                    {formatFileSize(record.filesize)}
                  </Typography>
                  {record.duration && (
                    <Typography
                      sx={{
                        fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                        color: 'text.secondary',
                      }}
                    >
                      {formatDuration(record.duration)}
                    </Typography>
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default EvidencePanel;
