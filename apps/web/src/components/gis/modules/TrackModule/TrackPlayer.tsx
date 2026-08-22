import { designTokens } from '@topems/tokens';
// modules/TrackModule/TrackPlayer.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';
import { Box, Typography, Paper, IconButton, Grid, Button, useTheme } from '@mui/material';
import type { TrackRecord, TrackStatistics } from './types';
import i18n from '@/i18n';

interface TrackPlayerProps {
  track: TrackRecord | null;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
  statistics: TrackStatistics | null;
}

const TrackPlayer: React.FC<TrackPlayerProps> = ({
  track,
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onSeek,
  statistics,
}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const speedOptions = [0.5, 1, 2, 4];

  // Calculate current position based on currentIndex
  const currentPosition = track?.points[currentIndex]?.position;

  // Handle playback
  useEffect(() => {
    if (isPlaying && track && currentIndex < track.points.length - 1) {
      const interval = 100 / playbackSpeed;
      intervalRef.current = setTimeout(() => {
        setCurrentIndex((prev) => {
          if (prev >= track.points.length - 1) {
            onPause();
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    }
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, track, currentIndex, onPause]);

  // Handle progress bar click
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!track || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const index = Math.floor(percent * track.points.length);
      setCurrentIndex(index);
      onSeek(index);
    },
    [track, onSeek]
  );

  // Reset on track change
  useEffect(() => {
    setCurrentIndex(0);
  }, [track?.id]);

  if (!track) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 64,
          bgcolor: 'grey.50',
          borderRadius: 2,
        }}
      >
        <Typography sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}>
          {i18n.t('components.track_player.k0')}
        </Typography>
      </Box>
    );
  }

  const progress = track.points.length > 1 ? (currentIndex / (track.points.length - 1)) * 100 : 0;

  return (
    <Paper sx={{ borderRadius: 2, boxShadow: 2, p: 4 }}>
      {/* Track Info */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          {track.device_name}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          {new Date(track.start_time).toLocaleString()} -{' '}
          {new Date(track.end_time).toLocaleString()}
        </Typography>
      </Box>

      {/* Progress Bar */}
      <Box
        sx={{
          height: 8,
          bgcolor: 'grey.200',
          borderRadius: '50%',
          cursor: 'pointer',
          mb: 4,
        }}
        onClick={handleProgressClick}
      >
        <Box
          sx={{
            height: '100%',
            bgcolor: 'primary.dark',
            borderRadius: '50%',
            transition: 'all',
            width: `${progress}%`,
          }}
        />
      </Box>

      {/* Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => setCurrentIndex(0)}
            sx={{ p: 2, '&:hover': { bgcolor: 'grey.100' } }}
            aria-label={i18n.t('gis.track_player.k0')}
            title={i18n.t('gis.track_player.k1')}
          >
            <SkipBack
              size={20}
              style={{ color: theme.palette.text.secondary }}
            />
          </IconButton>
          <IconButton
            onClick={isPlaying ? onPause : onPlay}
            sx={{
              p: 3,
              bgcolor: 'primary.dark',
              color: 'common.white',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
            aria-label={isPlaying ? i18n.t('gis.track_player.k3') : i18n.t('gis.track_player.k2')}
            title={isPlaying ? i18n.t('gis.track_player.k5') : i18n.t('gis.track_player.k4')}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </IconButton>
          <IconButton
            onClick={onStop}
            sx={{ p: 2, '&:hover': { bgcolor: 'grey.100' } }}
            aria-label={i18n.t('gis.track_player.k6')}
            title={i18n.t('gis.track_player.k7')}
          >
            <Square
              size={20}
              style={{ color: theme.palette.text.secondary }}
            />
          </IconButton>
          <IconButton
            onClick={() => setCurrentIndex(track.points.length - 1)}
            sx={{ p: 2, '&:hover': { bgcolor: 'grey.100' } }}
            aria-label={i18n.t('gis.track_player.k8')}
            title={i18n.t('gis.track_player.k9')}
          >
            <SkipForward
              size={20}
              style={{ color: theme.palette.text.secondary }}
            />
          </IconButton>
        </Box>

        {/* Speed Control */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            [i18n.t('components.track_player.k1')]:
          </Typography>
          {speedOptions.map((speed) => (
            <Button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              sx={{
                px: 2,
                py: 1,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                borderRadius: 1,
                bgcolor: playbackSpeed === speed ? 'primary.dark' : 'grey.100',
                color:
                  playbackSpeed === speed
                    ? 'var(--color-primary-foreground)'
                    : 'text.secondary',
                '&:hover': {
                  bgcolor: playbackSpeed === speed ? 'primary.dark' : 'grey.200',
                },
                textTransform: 'none',
              }}
            >
              {speed}x
            </Button>
          ))}
        </Box>
      </Box>

      {/* Statistics */}
      {statistics && (
        <Box sx={{ mt: 4, pt: 4, borderTop: 1, borderColor: 'grey.200' }}>
          <Grid
            container
            spacing={4}
          >
            <Grid size={4}>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('components.track_player.k2')}
              </Typography>
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                {statistics.total_distance < 1000
                  ? `${statistics.total_distance.toFixed(0)}${i18n.t('components.track_player.k0')}`
                  : `${(statistics.total_distance / 1000).toFixed(2)}${i18n.t('components.track_player.k1')}`}
              </Typography>
            </Grid>
            <Grid size={4}>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('components.track_player.k3')}
              </Typography>
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                {statistics.avg_speed.toFixed(1)} km/h
              </Typography>
            </Grid>
            <Grid size={4}>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('components.track_player.k4')}
              </Typography>
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                {statistics.max_speed.toFixed(1)} km/h
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Current Position */}
      {currentPosition && (
        <Box sx={{ mt: 4, pt: 4, borderTop: 1, borderColor: 'grey.200' }}>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('components.track_player.k5')}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              color: 'grey.700',
            }}
          >
            {currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TrackPlayer;
