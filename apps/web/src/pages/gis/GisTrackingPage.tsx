import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Slider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Search,
  Navigation,
  Clock,
  User,
  Truck,
  AlertCircle,
  Map,
} from 'lucide-react';
import { GisMapTemplate, type MapMarker, type TrackPoint } from '@/components/templates';
import { useAppStore } from '../../store';
import { PageContainer } from '@/components/common';
import { gisApi } from '@/api/gis';
import type { DevicePoint, DeviceLocationRecord } from '@/api/gis';

export const GisTrackingPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [selectedDevice, setSelectedDevice] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [devices, setDevices] = useState<DevicePoint[]>([]);
  const [trackHistory, setTrackHistory] = useState<DeviceLocationRecord[]>([]);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await gisApi.listDevicePoints({ pagesize: 100 });
      if (res.success && res.data) {
        setDevices(res.data.data || []);
        if (res.data.data && res.data.data.length > 0 && !selectedDevice) {
          setSelectedDevice(res.data.data[0].id);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载设备列表失败';
      setError(msg);
      addNotification({ title: '加载失败', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification, selectedDevice]);

  const loadTrack = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return;
      try {
        setTrackLoading(true);
        const res = await gisApi.getDeviceTrack({ device_id: deviceId, pagesize: 100 });
        if (res.success && res.data) {
          setTrackHistory(res.data.data || []);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '加载轨迹数据失败';
        addNotification({ title: '加载失败', message: msg, type: 'error' });
      } finally {
        setTrackLoading(false);
      }
    },
    [addNotification]
  );

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (selectedDevice) {
      loadTrack(selectedDevice);
    }
  }, [selectedDevice, loadTrack]);

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
    if (s?.includes('active') || s === 'online') return '在线';
    if (s === 'moving') return '移动中';
    if (s?.includes('inactive') || s === 'offline') return '离线';
    return status || '未知';
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
          状态: {getStatusLabel(device.status)}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          类型: {device.device_type}
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
      addNotification({ title: '搜索', message: `搜索设备: ${query}`, type: 'info' });
    },
    [addNotification]
  );

  const handleTrackPlayback = useCallback(
    (playing: boolean) => {
      setIsPlaying(playing);
      addNotification({
        title: '轨迹回放',
        message: playing ? '开始回放' : '暂停回放',
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
      title: '轨迹回放',
      message: newPlaying ? '开始回放' : '暂停回放',
      type: 'info',
    });
  }, [isPlaying, addNotification]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setPlaybackSpeed(1);
    addNotification({ title: '重置', message: '轨迹已重置', type: 'info' });
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
      title='轨迹追踪'
      subtitle='查看设备历史轨迹，支持回放和时间筛选'
      maxWidth='xl'
      headerProps={{
        pageIcon: <Map style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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
              轨迹追踪
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              实时追踪设备位置，查看历史轨迹
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
              <CardHeader title='选择设备' />
              <CardContent>
                <FormControl fullWidth>
                  <InputLabel id='device-select-label'>设备</InputLabel>
                  <Select
                    labelId='device-select-label'
                    value={selectedDevice}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    sx={{ minHeight: 48 }}
                    label='设备'
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
                      当前状态
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
                      设备类型
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
                      最后更新
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
              <CardHeader title='轨迹地图' />
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
              <CardHeader title='播放控制' />
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
                  <Typography variant='body2'>播放速度: {playbackSpeed}x</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardHeader title='轨迹历史' />
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
                          <TableCell>时间</TableCell>
                          <TableCell>经度</TableCell>
                          <TableCell>纬度</TableCell>
                          <TableCell>速度</TableCell>
                          <TableCell>精度</TableCell>
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
                                暂无轨迹数据
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
              <CardHeader title='设备信息' />
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
                        设备名称
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
                        设备类型
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
                        最后更新
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
                        当前位置
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
