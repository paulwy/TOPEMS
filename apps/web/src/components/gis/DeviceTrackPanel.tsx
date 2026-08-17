import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  Activity,
  Gauge,
  Battery,
  Navigation,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Slider,
  Stack,
  Grid,
  Button,
  useTheme,
} from '@mui/material';
import type { DevicePoint, DeviceLocationRecord, TrackQueryParams } from '../../api/gis';
import { gisApi } from '../../api/gis';
import { logger } from '@/utils/logger';
import L from 'leaflet';
import { designTokens } from '@topems/tokens';
import 'leaflet/dist/leaflet.css';

interface DeviceTrackPanelProps {
  devicePoints: DevicePoint[];
  onClose: () => void;
}

const MAX_TRACK_POINTS = 500;

const DeviceTrackPanel: React.FC<DeviceTrackPanelProps> = ({ devicePoints, onClose }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [trackData, setTrackData] = useState<DeviceLocationRecord[]>([]);
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statistics, setStatistics] = useState<{
    total_distance: number;
    avg_speed: number;
    max_speed: number;
    track_points: number;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [timeRange, setTimeRange] = useState({
    start: '',
    end: '',
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchTrackData();
    }
  }, [selectedDevice, timeRange]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isPlaying && trackData.length > 0 && currentIndex < trackData.length - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    } else if (currentIndex >= trackData.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentIndex, trackData.length]);

  const fetchTrackData = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      const params: TrackQueryParams = { device_id: selectedDevice };
      if (timeRange.start) params.start_time = timeRange.start;
      if (timeRange.end) params.end_time = timeRange.end;
      params.pagesize = MAX_TRACK_POINTS;

      const response = await gisApi.getDeviceTrack(params);
      if (response.success && response.data) {
        const data = response.data.items || [];
        const limitedData = data.slice(0, MAX_TRACK_POINTS);
        setTrackData(limitedData);
        setCurrentIndex(0);
        setIsPlaying(false);

        const statsResponse = await gisApi.getDeviceTrackStatistics(selectedDevice);
        if (statsResponse.success && statsResponse.data) {
          setStatistics(statsResponse.data);
        }
      }
    } catch (error: unknown) {
      logger.error('Failed to fetch track data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (currentIndex >= trackData.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toFixed(2)}${i18n.t('components.device_track_panel.k0')}`;
    }
    return `${(meters / 1000).toFixed(2)}${i18n.t('components.device_track_panel.k1')}`;
  };

  const formatSpeed = (kmh: number): string => {
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const deviceWithTracks = devicePoints;

  if (trackData.length > 0) {
    const trackCoords = trackData.map(
      (point) => [point.latitude, point.longitude] as [number, number]
    );
    const currentPoint = trackData[currentIndex];

    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 4,
            py: 3,
            background: `linear-gradient(to right, ${designTokens.colors.purple['600']}, primary.dark)`,
            color: 'common.white',
          }}
        >
          <Typography
            variant='subtitle1'
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Navigation size={20} />
            {i18n.t('components.device_track_panel.k0')}
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              p: 1,
              color: 'common.white',
              '&:hover': { bgcolor: 'action.disabledBackground' },
            }}
            aria-label={i18n.t('gis.device_track_panel.k0')}
          >
            <X size={20} />
          </IconButton>
        </Box>

        <Box sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={4}>
            <Grid
              container
              spacing={4}
            >
              <Grid size='grow'>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <InputLabel>{i18n.t('gis.device_track_panel.k1')}</InputLabel>
                  <Select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    label={i18n.t('gis.device_track_panel.k2')}
                  >
                    <MenuItem value=''>{i18n.t('gis.device_track_panel.k3')}</MenuItem>
                    {deviceWithTracks.map((device) => (
                      <MenuItem
                        key={device.id}
                        value={device.id}
                      >
                        {device.name} ({device.device_type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={3}>
                <TextField
                  type='datetime-local'
                  label={i18n.t('gis.device_track_panel.k4')}
                  value={timeRange.start}
                  onChange={(e) => setTimeRange((prev) => ({ ...prev, start: e.target.value }))}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  type='datetime-local'
                  label={i18n.t('gis.device_track_panel.k5')}
                  value={timeRange.end}
                  onChange={(e) => setTimeRange((prev) => ({ ...prev, end: e.target.value }))}
                  size='small'
                  fullWidth
                />
              </Grid>
            </Grid>

            <Button
              onClick={() => setTimeRange({ start: '', end: '' })}
              sx={{
                fontSize: '0.75rem',
                color: 'primary.dark',
                textTransform: 'none',
              }}
            >
              {i18n.t('components.device_track_panel.k1')}
            </Button>

            <Button
              onClick={fetchTrackData}
              disabled={loading}
              startIcon={
                <RefreshCw
                  size={16}
                  className={loading ? 'animate-spin' : ''}
                />
              }
              sx={{
                bgcolor: 'grey.100',
                '&:hover': { bgcolor: 'border.default' },
                textTransform: 'none',
                color: 'grey.700',
              }}
            >
              {i18n.t('components.device_track_panel.k2')}
            </Button>

            <Button
              onClick={togglePlayback}
              disabled={trackData.length === 0}
              startIcon={isPlaying ? <Pause size={16} /> : <Play size={16} />}
              sx={{
                bgcolor: isPlaying ? 'warning.main' : 'success.dark',
                color: 'common.white',
                '&:hover': { bgcolor: isPlaying ? 'warning.dark' : 'success.dark' },
                '&:disabled': { opacity: 0.5 },
                textTransform: 'none',
              }}
            >
              {isPlaying
                ? i18n.t('gis.device_track_panel.k7')
                : i18n.t('gis.device_track_panel.k6')}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                [i18n.t('components.device_track_panel.k3')]:{' '}
                <Box
                  component='span'
                  sx={{ fontWeight: 500 }}
                >
                  {currentIndex + 1}
                </Box>{' '}
                / {trackData.length}
              </Typography>
              <Slider
                min={0}
                max={trackData.length - 1}
                value={currentIndex}
                onChange={(_e, value) => setCurrentIndex(value as number)}
                disabled={isPlaying}
                sx={{ flex: 1 }}
              />
            </Box>

            <Button
              onClick={() => setShowStatistics(!showStatistics)}
              endIcon={showStatistics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              sx={{
                width: '100%',
                bgcolor: 'grey.50',
                '&:hover': { bgcolor: 'grey.100' },
                textTransform: 'none',
                py: 2,
              }}
            >
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.700' }}
              >
                {i18n.t('components.device_track_panel.k4')}
              </Typography>
            </Button>

            {showStatistics && statistics && (
              <Grid
                container
                spacing={3}
              >
                <Grid size={4}>
                  <Paper sx={{ bgcolor: 'primary.light', borderRadius: 3, p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        color: 'primary.dark',
                        mb: 1,
                      }}
                    >
                      <Navigation size={16} />
                      <Typography variant='caption'>
                        {i18n.t('gis.device_track_panel.k8')}
                      </Typography>
                    </Box>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, color: 'primary.dark' }}
                    >
                      {formatDistance(statistics.total_distance)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper sx={{ bgcolor: 'success.light', borderRadius: 3, p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        color: 'success.dark',
                        mb: 1,
                      }}
                    >
                      <Gauge size={16} />
                      <Typography variant='caption'>
                        {i18n.t('gis.device_track_panel.k9')}
                      </Typography>
                    </Box>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, color: 'success.dark' }}
                    >
                      {formatSpeed(statistics.avg_speed)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper sx={{ bgcolor: 'white7ed', borderRadius: 3, p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        color: 'warning.dark',
                        mb: 1,
                      }}
                    >
                      <Activity size={16} />
                      <Typography variant='caption'>
                        {i18n.t('gis.device_track_panel.k10')}
                      </Typography>
                    </Box>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, color: 'error.dark' }}
                    >
                      {formatSpeed(statistics.max_speed)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper sx={{ bgcolor: 'secondary.light', borderRadius: 3, p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        color: 'secondary.dark',
                        mb: 1,
                      }}
                    >
                      <Activity size={16} />
                      <Typography variant='caption'>
                        {i18n.t('gis.device_track_panel.k11')}
                      </Typography>
                    </Box>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, color: 'secondary.dark' }}
                    >
                      {statistics.track_points}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        color: 'text.secondary',
                        mb: 1,
                      }}
                    >
                      <Clock size={16} />
                      <Typography variant='caption'>
                        {i18n.t('gis.device_track_panel.k12')}
                      </Typography>
                    </Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color: 'grey.800' }}
                    >
                      {formatTime(statistics.start_time)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        color: 'text.secondary',
                        mb: 1,
                      }}
                    >
                      <Clock size={16} />
                      <Typography variant='caption'>
                        {i18n.t('gis.device_track_panel.k13')}
                      </Typography>
                    </Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color: 'grey.800' }}
                    >
                      {formatTime(statistics.end_time)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            <Paper sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 4 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.700', mb: 2 }}
              >
                {i18n.t('components.device_track_panel.k5')}
              </Typography>
              <Grid
                container
                spacing={3}
              >
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    [i18n.t('components.device_track_panel.k6')]:
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ ml: 2, color: 'grey.700' }}
                  >
                    {formatTime(currentPoint.timestamp)}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    [i18n.t('components.device_track_panel.k7')]:
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      ml: 2,
                      color: 'grey.700',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    {currentPoint.latitude.toFixed(6)}, {currentPoint.longitude.toFixed(6)}
                  </Typography>
                </Grid>
                {currentPoint.accuracy !== undefined && (
                  <Grid size={6}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      [i18n.t('components.device_track_panel.k8')]:
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ ml: 2, color: 'grey.700' }}
                    >
                      {currentPoint.accuracy} m
                    </Typography>
                  </Grid>
                )}
                {currentPoint.speed !== undefined && (
                  <Grid size={6}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      [i18n.t('components.device_track_panel.k9')]:
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ ml: 2, color: 'grey.700' }}
                    >
                      {formatSpeed(currentPoint.speed)}
                    </Typography>
                  </Grid>
                )}
                {currentPoint.heading !== undefined && (
                  <Grid size={6}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      [i18n.t('components.device_track_panel.k10')]:
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ ml: 2, color: 'grey.700' }}
                    >
                      {currentPoint.heading}°
                    </Typography>
                  </Grid>
                )}
                {currentPoint.batterylevel !== undefined && (
                  <Grid size={6}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      [i18n.t('components.device_track_panel.k11')]:
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ ml: 2, color: 'grey.700' }}
                    >
                      <Battery
                        size={16}
                        style={{
                          display: 'inline',
                          color:
                            currentPoint.batterylevel > 50
                              ? theme.palette.success.dark
                              : currentPoint.batterylevel > 20
                                ? theme.palette.warning.main
                                : theme.palette.error.main,
                        }}
                      />
                      {currentPoint.batterylevel}%
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            <Box
              sx={{
                height: 256,
                borderRadius: 3,
                overflow: 'hidden',
                border: 1,
                borderColor: 'grey.200',
              }}
            >
              <MapContainer
                center={[currentPoint.latitude, currentPoint.longitude]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
                <Polyline
                  positions={trackCoords.slice(0, currentIndex + 1)}
                  color='primary.main'
                  weight={3}
                  opacity={0.8}
                />
                <Polyline
                  positions={trackCoords.slice(currentIndex + 1)}
                  color='var(--mui-palette-text-disabled)'
                  weight={2}
                  opacity={0.4}
                  dashArray='5,5'
                />
                {trackCoords.length > 1 && (
                  <Marker
                    position={trackCoords[0]}
                    icon={
                      new L.Icon({
                        iconUrl:
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322C55E'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                        iconSize: [24, 24],
                        iconAnchor: [12, 24],
                      })
                    }
                  >
                    <Popup>{i18n.t('gis.device_track_panel.k14')}</Popup>
                  </Marker>
                )}
                <Marker
                  position={[currentPoint.latitude, currentPoint.longitude]}
                  icon={
                    new L.Icon({
                      iconUrl:
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EF4444'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                    })
                  }
                >
                  <Popup>
                    <Box sx={{ fontSize: '0.875rem' }}>
                      <Typography sx={{ fontWeight: 500 }}>
                        {i18n.t('gis.device_track_panel.k15')}
                      </Typography>
                      <Typography>{formatTime(currentPoint.timestamp)}</Typography>
                    </Box>
                  </Popup>
                </Marker>
                {trackCoords.length > 1 &&
                  trackCoords[trackCoords.length - 1] !== trackCoords[currentIndex] && (
                    <Marker
                      position={trackCoords[trackCoords.length - 1]}
                      icon={
                        new L.Icon({
                          iconUrl:
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                          iconSize: [24, 24],
                          iconAnchor: [12, 24],
                        })
                      }
                    >
                      <Popup>{i18n.t('gis.device_track_panel.k16')}</Popup>
                    </Marker>
                  )}
              </MapContainer>
            </Box>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 4,
          py: 3,
          background: `linear-gradient(to right, ${designTokens.colors.purple['600']}, primary.dark)`,
          color: 'common.white',
        }}
      >
        <Typography
          variant='subtitle1'
          sx={{
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Navigation size={20} />
          {i18n.t('components.device_track_panel.k12')}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            p: 1,
            color: 'common.white',
            '&:hover': { bgcolor: 'action.disabledBackground' },
          }}
          aria-label={i18n.t('gis.device_track_panel.k17')}
        >
          <X size={20} />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Navigation
            size={48}
            sx={{ color: 'action.disabled', margin: '0 auto 12px' }}
          />
          <Typography sx={{ color: 'text.secondary' }}>
            {i18n.t('gis.device_track_panel.k18')}
          </Typography>
          <FormControl
            sx={{ mt: 4, minWidth: 200 }}
            size='small'
          >
            <InputLabel>{i18n.t('gis.device_track_panel.k19')}</InputLabel>
            <Select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              label={i18n.t('gis.device_track_panel.k20')}
            >
              <MenuItem value=''>{i18n.t('gis.device_track_panel.k21')}</MenuItem>
              {deviceWithTracks.map((device) => (
                <MenuItem
                  key={device.id}
                  value={device.id}
                >
                  {device.name} ({device.device_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
};

export default DeviceTrackPanel;
