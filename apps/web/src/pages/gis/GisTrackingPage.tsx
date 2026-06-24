import React, { useState } from 'react';
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
  TextField,
  IconButton,
  Slider,
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
} from 'lucide-react';

interface TrackingDevice {
  id: string;
  name: string;
  type: 'person' | 'vehicle' | 'asset';
  status: 'online' | 'offline' | 'moving';
  lastUpdate: string;
  battery: number;
  speed: number;
  location: string;
}

interface TrackPoint {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
}

export const GisTrackingPage: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState('DEV001');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const devices: TrackingDevice[] = [
    {
      id: 'DEV001',
      name: '配送车辆 #001',
      type: 'vehicle',
      status: 'moving',
      lastUpdate: '2024-01-15 14:35:00',
      battery: 85,
      speed: 45,
      location: '39.9042, 116.4074',
    },
    {
      id: 'DEV002',
      name: '巡检人员 #012',
      type: 'person',
      status: 'online',
      lastUpdate: '2024-01-15 14:34:00',
      battery: 72,
      speed: 3,
      location: '39.9142, 116.4174',
    },
    {
      id: 'DEV003',
      name: '设备 #003',
      type: 'asset',
      status: 'online',
      lastUpdate: '2024-01-15 14:30:00',
      battery: 95,
      speed: 0,
      location: '39.9242, 116.4274',
    },
    {
      id: 'DEV004',
      name: '配送车辆 #002',
      type: 'vehicle',
      status: 'offline',
      lastUpdate: '2024-01-15 10:00:00',
      battery: 20,
      speed: 0,
      location: '39.8942, 116.3974',
    },
  ];

  const trackHistory: TrackPoint[] = [
    { id: '1', timestamp: '14:35', latitude: 39.9042, longitude: 116.4074, speed: 45, accuracy: 5 },
    { id: '2', timestamp: '14:34', latitude: 39.9038, longitude: 116.407, speed: 42, accuracy: 5 },
    { id: '3', timestamp: '14:33', latitude: 39.9034, longitude: 116.4066, speed: 40, accuracy: 6 },
    { id: '4', timestamp: '14:32', latitude: 39.903, longitude: 116.4062, speed: 38, accuracy: 5 },
    { id: '5', timestamp: '14:31', latitude: 39.9026, longitude: 116.4058, speed: 35, accuracy: 5 },
    { id: '6', timestamp: '14:30', latitude: 39.9022, longitude: 116.4054, speed: 32, accuracy: 6 },
    { id: '7', timestamp: '14:29', latitude: 39.9018, longitude: 116.405, speed: 30, accuracy: 5 },
    { id: '8', timestamp: '14:28', latitude: 39.9014, longitude: 116.4046, speed: 28, accuracy: 5 },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'person':
        return <User size={16} />;
      case 'vehicle':
        return <Truck size={16} />;
      case 'asset':
        return <MapPin size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'moving':
        return 'primary';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'moving':
        return '移动中';
      case 'offline':
        return '离线';
      default:
        return status;
    }
  };

  const selectedDeviceData = devices.find((d) => d.id === selectedDevice);

  return (
    <Box sx={{ flex: 1 }}>
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
            onClick={() => setIsPlaying(!isPlaying)}
            color={isPlaying ? 'primary' : 'inherit'}
            size='small'
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          <Button
            variant='contained'
            size='small'
          >
            <RotateCcw size={20} />
          </Button>
        </Box>
      </Box>

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
                <Select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  sx={{ minHeight: 48 }}
                >
                  {devices.map((device) => (
                    <MenuItem
                      key={device.id}
                      value={device.id}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getTypeIcon(device.type)}
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
                            {getStatusLabel(device.status)} - {device.location}
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
                    {selectedDeviceData.status === 'moving' && (
                      <Navigation
                        size={20}
                        color='primary'
                      />
                    )}
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
                    当前速度
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedDeviceData.speed} <span style={{ fontSize: '14px' }}>km/h</span>
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
                    电量
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Slider
                      value={selectedDeviceData.battery}
                      disabled
                      sx={{ width: 120 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 500, minWidth: 30 }}
                    >
                      {selectedDeviceData.battery}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader title='轨迹地图' />
            <CardContent>
              <Box
                sx={{
                  height: 450,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Navigation
                  size={48}
                  color='#1976d2'
                />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  轨迹地图预览
                </Typography>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    display: 'flex',
                    gap: 2,
                  }}
                >
                  <Chip
                    size='small'
                    label='当前位置'
                    color='primary'
                    icon={<MapPin size={14} />}
                  />
                  <Chip
                    size='small'
                    label='历史轨迹'
                    color='warning'
                    icon={<Clock size={14} />}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title='播放控制' />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Box sx={{ flex: 1 }}>
                  <Slider
                    value={playbackSpeed}
                    onChange={(e, value) => setPlaybackSpeed(value as number)}
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
              <TableContainer>
                <Table>
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
                        <TableCell>{point.speed} km/h</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={`${point.accuracy}m`}
                            color={point.accuracy <= 5 ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
                      {selectedDeviceData.type === 'person'
                        ? '人员'
                        : selectedDeviceData.type === 'vehicle'
                          ? '车辆'
                          : '资产'}
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
                      {selectedDeviceData.lastUpdate}
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
                      sx={{ fontWeight: 500 }}
                    >
                      {selectedDeviceData.location}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GisTrackingPage;
