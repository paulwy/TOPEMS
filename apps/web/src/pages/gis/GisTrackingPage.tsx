import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  CircularProgress,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import { MapPin, Play, Pause, RotateCcw, User, Truck, AlertCircle, Map } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { GisMapTemplate, type MapMarker, type TrackPoint } from '@/components/templates';
import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import { gisApi } from '@/api/gis';
import type { DevicePoint, DeviceLocationRecord } from '@/api/gis';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

export const GisTrackingPage: React.FC = () => {
  const { t } = useTranslation('gis');
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [selectedDevice, setSelectedDevice] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    data: devices = [],
    isPending: loading,
    error: devicesError,
  } = useQuery<DevicePoint[]>({
    queryKey: QUERY_KEYS.GIS.DEVICE_POINTS,
    queryFn: async () => {
      const res = await gisApi.listDevicePoints({ pagesize: 100 });
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(t('gis.gis_tracking_page.k0'));
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: trackHistory = [], isPending: trackLoading } = useQuery<DeviceLocationRecord[]>({
    queryKey: QUERY_KEYS.GIS.DEVICE_TRACK(selectedDevice || 'none'),
    queryFn: async () => {
      if (!selectedDevice) return [];
      const res = await gisApi.getDeviceTrack({ device_id: selectedDevice, pagesize: 100 });
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(t('gis.gis_tracking_page.k1'));
    },
    enabled: !!selectedDevice,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const error = devicesError
    ? devicesError instanceof Error
      ? devicesError.message
      : t('gis.gis_tracking_page.k2')
    : '';

  // Auto-select first device when devices load
  React.useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0].id);
    }
  }, [devices, selectedDevice]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'person':
        return <User size={16} />;
      case 'vehicle':
        return <Truck size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes('active') || s === 'online') return 'success';
    if (s === 'moving') return 'primary';
    if (s?.includes('inactive') || s === 'offline') return 'error';
    return 'default';
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes('active') || s === 'online') return t('gis.gis_tracking_page.k3');
    if (s === 'moving') return t('gis.gis_tracking_page.k4');
    if (s?.includes('inactive') || s === 'offline') return t('gis.gis_tracking_page.k5');
    return status || t('gis.gis_tracking_page.k6');
  };

  const getMarkerType = (status: string): 'device' | 'storage' | 'warning' | 'custom' => {
    const s = status?.toLowerCase();
    if (s?.includes('active') || s === 'online') return 'device';
    if (s === 'moving') return 'custom';
    if (s?.includes('inactive') || s === 'offline') return 'warning';
    return 'custom';
  };

  const selectedDeviceData = devices.find((d) => d.id === selectedDevice);

  const mapMarkers: MapMarker[] = devices.map((device) => ({
    id: device.id,
    name: device.name,
    position: [device.latitude, device.longitude],
    type: getMarkerType(device.status),
    popupContent: (
      <Box>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600 }}
        >
          {device.name}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('gis.gis_tracking_page.r1')} {getStatusLabel(device.status)}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('gis.gis_fence_page.r1')} {device.device_type}
        </Typography>
      </Box>
    ),
  }));

  const mapTrackPoints: TrackPoint[] = trackHistory.map((point) => ({
    id: point.id,
    timestamp: point.timestamp,
    position: [point.latitude, point.longitude],
    speed: point.speed,
    accuracy: point.accuracy,
  }));

  const handleSearch = useCallback(
    (query: string) => {
      addNotification({
        title: t('gis.gis_tracking_page.k7'),
        message: i18n.t('gis.gis_tracking_page.e1', { v1: query }),
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleTrackPlayback = useCallback(
    (playing: boolean) => {
      setIsPlaying(playing);
      addNotification({
        title: t('gis.gis_tracking_page.k8'),
        message: playing ? t('gis.gis_tracking_page.k10') : t('gis.gis_tracking_page.k9'),
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
    setIsPlaying(false);
    setPlaybackSpeed(1);
  }, []);

  const handlePlayPause = useCallback(() => {
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);
    addNotification({
      title: t('gis.gis_tracking_page.k11'),
      message: newPlaying ? t('gis.gis_tracking_page.k13') : t('gis.gis_tracking_page.k12'),
      type: 'info',
    });
  }, [isPlaying, addNotification]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setPlaybackSpeed(1);
    addNotification({
      title: t('gis.gis_tracking_page.k15'),
      message: t('gis.gis_tracking_page.k14'),
      type: 'info',
    });
  }, [addNotification]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer
      title={t('gis.gis_tracking_page.k16')}
      subtitle={t('gis.gis_tracking_page.k17')}
      maxWidth='xl'
      headerProps={{
        pageIcon: <Map style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <div>
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold', mb: 1 }}
            >
              {t('gis.gis_tracking_page.e2')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('gis.gis_tracking_page.e3')}
            </Typography>
          </div>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant='contained'
              onClick={handlePlayPause}
              color={isPlaying ? 'primary' : 'inherit'}
              size='small'
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </Button>
            <Button
              variant='contained'
              size='small'
              onClick={handleReset}
            >
              <RotateCcw size={20} />
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert
            severity='error'
            sx={{ mb: 3 }}
            icon={<AlertCircle size={20} />}
          >
            {error}
          </Alert>
        )}

        <Grid
          container
          spacing={3}
          sx={{ mb: 4 }}
        >
          <Grid size={{ xs: 12, lg: 3 }}>
            <Card>
              <CardHeader title={t('gis.gis_tracking_page.k18')} />
              <CardContent>
                <FormControl fullWidth>
                  <InputLabel id='device-select-label'>{t('gis.gis_tracking_page.k19')}</InputLabel>
                  <Select
                    labelId='device-select-label'
                    value={selectedDevice}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    sx={{ minHeight: 48 }}
                    label={t('gis.gis_tracking_page.k20')}
                  >
                    {devices.map((device) => (
                      <MenuItem
                        key={device.id}
                        value={device.id}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {getTypeIcon(device.device_type)}
                          <div>
                            <Typography
                              variant='body1'
                              sx={{ fontWeight: 500 }}
                            >
                              {device.name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {getStatusLabel(device.status)} - {device.latitude.toFixed(4)},{' '}
                              {device.longitude.toFixed(4)}
                            </Typography>
                          </div>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          {selectedDeviceData && (
            <>
              <Grid size={{ xs: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 2 }}
                    >
                      {t('gis.gis_tracking_page.e4')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        size='medium'
                        label={getStatusLabel(selectedDeviceData.status)}
                        color={getStatusColor(selectedDeviceData.status)}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 2 }}
                    >
                      {t('gis.gis_tracking_page.e5')}
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {selectedDeviceData.device_type}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 2 }}
                    >
                      {t('gis.gis_tracking_page.e6')}
                    </Typography>
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 500 }}
                    >
                      {selectedDeviceData.last_inspected || selectedDeviceData.updated_at || '-'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>

        <Grid
          container
          spacing={3}
          sx={{ flex: 1, minHeight: 0 }}
        >
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardHeader title={t('gis.gis_tracking_page.k21')} />
              <CardContent sx={{ flex: 1, p: 0 }}>
                {trackLoading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 450,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : (
                  <GisMapTemplate
                    initialCenter={
                      selectedDeviceData
                        ? [selectedDeviceData.latitude, selectedDeviceData.longitude]
                        : [31.2304, 121.4737]
                    }
                    initialZoom={14}
                    markers={mapMarkers}
                    trackPoints={mapTrackPoints}
                    onTrackPlayback={handleTrackPlayback}
                    searchable
                    onSearch={handleSearch}
                    sx={{ height: 450 }}
                  />
                )}
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardHeader title={t('gis.gis_tracking_page.k22')} />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Box sx={{ flex: 1 }}>
                    <Slider
                      value={playbackSpeed}
                      onChange={(_, value) => setPlaybackSpeed(value as number)}
                      min={0.5}
                      max={4}
                      step={0.5}
                      marks={[
                        { value: 0.5, label: '0.5x' },
                        { value: 1, label: '1x' },
                        { value: 2, label: '2x' },
                        { value: 4, label: '4x' },
                      ]}
                    />
                  </Box>
                  <Typography variant='body2'>{t('gis.gis_tracking_page.m1', { v1: playbackSpeed })}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardHeader title={t('gis.gis_tracking_page.k23')} />
              <CardContent>
                {trackLoading ? (
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('gis.gis_tracking_page.k24')}</TableCell>
                          <TableCell>{t('gis.gis_tracking_page.k25')}</TableCell>
                          <TableCell>{t('gis.gis_tracking_page.k26')}</TableCell>
                          <TableCell>{t('gis.gis_tracking_page.k27')}</TableCell>
                          <TableCell>{t('gis.gis_tracking_page.k28')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trackHistory.map((point) => (
                          <TableRow key={point.id}>
                            <TableCell>{point.timestamp}</TableCell>
                            <TableCell>{point.longitude.toFixed(4)}</TableCell>
                            <TableCell>{point.latitude.toFixed(4)}</TableCell>
                            <TableCell>{point.speed || 0} km/h</TableCell>
                            <TableCell>
                              <Chip
                                size='small'
                                label={`${point.accuracy || 0}m`}
                                color={(point.accuracy || 0) <= 5 ? 'success' : 'warning'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {trackHistory.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              sx={{ textAlign: 'center', py: 4 }}
                            >
                              <Typography
                                variant='body2'
                                color='text.secondary'
                              >
                                {t('gis.gis_tracking_page.e7')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardHeader title={t('gis.gis_tracking_page.k29')} />
              <CardContent>
                {selectedDeviceData && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('gis.gis_tracking_page.e8')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {selectedDeviceData.name}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('gis.gis_tracking_page.e5')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {selectedDeviceData.device_type}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('gis.gis_tracking_page.e6')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {selectedDeviceData.updated_at || '-'}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('gis.gis_tracking_page.e11')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}
                      >
                        {selectedDeviceData.latitude.toFixed(4)},{' '}
                        {selectedDeviceData.longitude.toFixed(4)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default GisTrackingPage;
