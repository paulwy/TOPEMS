// modules/TrackModule/TrackPanel.tsx
import React, { useState, useMemo } from 'react';
import { Search, Calendar, MapPin } from 'lucide-react';
import {Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Grid,
  Divider,
  Button, useTheme} from '@mui/material';
import type { DevicePoint } from '../../../../api/gis';
import type { TrackRecord, TrackStatistics, TrackPoint } from './types';
import TrackPlayer from './TrackPlayer';
import { logger } from '@/utils/logger';

interface TrackPanelProps {
  devicePoints: DevicePoint[];
  onClose: () => void;
}

// Mock track data generator for demonstration
const generateMockTrack = (device: DevicePoint): TrackRecord => {
  const points: TrackPoint[] = [];
  const numPoints = 20 + Math.floor(Math.random() * 30);
  let lat = device.latitude;
  let lng = device.longitude;

  for (let i = 0; i < numPoints; i++) {
    lat += (Math.random() - 0.5) * 0.001;
    lng += (Math.random() - 0.5) * 0.001;
    const point: TrackPoint = {
      position: [lat, lng],
      timestamp: new Date(Date.now() - (numPoints - i) * 60000).toISOString(),
      speed: 20 + Math.random() * 40,
      heading: Math.random() * 360,
      batterylevel: 100 - Math.floor((i / numPoints) * 100),
    };
    points.push(point);
  }

  return {
    id: `track-${device.id}`,
    device_id: device.id,
    device_name: device.name,
    points,
    start_time: points[0].timestamp,
    end_time: points[points.length - 1].timestamp,
    total_distance: Math.random() * 5000 + 1000,
  };
};

// Calculate statistics for a track
const calculateStatistics = (track: TrackRecord): TrackStatistics => {
  const speeds = track.points.filter((p) => p.speed !== undefined).map((p) => p.speed as number);

  const distances: number[] = [];
  for (let i = 0; i < track.points.length - 1; i++) {
    const p1 = track.points[i].position;
    const p2 = track.points[i + 1].position;
    const R = 6371000;
    const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
    const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1[0] * Math.PI) / 180) *
        Math.cos((p2[0] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distances.push(R * c);
  }

  const totalDistance = distances.reduce((a, b) => a + b, 0);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

  const startTime = new Date(track.start_time).getTime();
  const endTime = new Date(track.end_time).getTime();
  const duration = (endTime - startTime) / 1000;

  return {
    total_distance: totalDistance,
    avg_speed: avgSpeed,
    max_speed: maxSpeed,
    duration,
    point_count: track.points.length,
    start_time: track.start_time,
    end_time: track.end_time,
  };
};

const TrackPanel: React.FC<TrackPanelProps> = ({ devicePoints, onClose }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DevicePoint | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [statistics, setStatistics] = useState<TrackStatistics | null>(null);

  // Filter devices based on search
  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devicePoints;
    const query = searchQuery.toLowerCase();
    return devicePoints.filter(
      (device) =>
        device.name.toLowerCase().includes(query) ||
        device.device_type?.toLowerCase().includes(query) ||
        device.id.toLowerCase().includes(query)
    );
  }, [devicePoints, searchQuery]);

  // Handle device selection
  const handleDeviceSelect = (device: DevicePoint) => {
    setSelectedDevice(device);
    const track = generateMockTrack(device);
    setCurrentTrack(track);
    setStatistics(calculateStatistics(track));
    setIsPlaying(false);
  };

  // Handle play/pause
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTrack((prev) => (prev ? { ...prev } : null));
  };

  // Handle speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  // Handle seek
  const handleSeek = (index: number) => {
    // In a real implementation, this would seek to the specific point
    logger.info('Seek to index:', index);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 4,
          py: 3,
          borderBottom: 1,
          borderColor: 'grey.200',
        }}
      >
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          设备轨迹追踪
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ p: 1, '&:hover': { bgcolor: 'grey.100' } }}
        >
          <svg
            width={20}
            height={20}
            fill='none'
            stroke='text.secondary'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Device List */}
        <Box
          sx={{
            width: '33.33%',
            borderRight: 1,
            borderColor: 'grey.200',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'grey.200' }}>
            <Box sx={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: theme.palette.text.disabled,
                }}
              />
              <TextField
                placeholder='搜索设备...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size='small'
                fullWidth
                sx={{ pl: 9 }}
              />
            </Box>
          </Box>

          {/* Device List */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {filteredDevices.map((device) => (
              <Button
                key={device.id}
                onClick={() => handleDeviceSelect(device)}
                sx={{
                  width: '100%',
                  px: 4,
                  py: 3,
                  textAlign: 'left',
                  borderBottom: 1,
                  borderColor: 'grey.200',
                  bgcolor: selectedDevice?.id === device.id ? 'primary.light' : 'transparent',
                  '&:hover': { bgcolor: 'grey.50' },
                  textTransform: 'none',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: '50%' }}>
                    <MapPin
                      size={16}
                      style={{ color: theme.palette.success.dark }}
                    />
                  </Box>
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
                      {device.name}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {device.device_type}
                    </Typography>
                  </Box>
                </Box>
              </Button>
            ))}
            {filteredDevices.length === 0 && (
              <Box
                sx={{
                  px: 4,
                  py: 8,
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                }}
              >
                未找到设备
              </Box>
            )}
          </Box>
        </Box>

        {/* Track Player */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {currentTrack ? (
            <Box sx={{ flex: 1, p: 4, overflowY: 'auto' }}>
              <TrackPlayer
                track={currentTrack}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onSpeedChange={handleSpeedChange}
                onSeek={handleSeek}
                statistics={statistics}
              />

              {/* Track Points List */}
              <Box sx={{ mt: 4 }}>
                <Typography sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}>
                  轨迹点列表
                </Typography>
                <Box
                  sx={{
                    maxHeight: 256,
                    overflowY: 'auto',
                    border: 1,
                    borderColor: 'grey.200',
                    borderRadius: 2,
                  }}
                >
                  <table style={{ width: '100%', fontSize: '0.875rem' }}>
                    <thead
                      style={{
                        backgroundColor: theme.palette.grey[50],
                        position: 'sticky',
                        top: 0,
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            color: theme.palette.text.secondary,
                            fontWeight: 500,
                          }}
                        >
                          #
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            color: theme.palette.text.secondary,
                            fontWeight: 500,
                          }}
                        >
                          时间
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            color: theme.palette.text.secondary,
                            fontWeight: 500,
                          }}
                        >
                          坐标
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            color: theme.palette.text.secondary,
                            fontWeight: 500,
                          }}
                        >
                          速度
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTrack.points.slice(0, 50).map((point, index) => (
                        <tr
                          key={index}
                          style={{ borderBottom: '1px solid var(--mui-palette-grey-100)' }}
                        >
                          <td style={{ padding: '8px 12px', color: theme.palette.text.secondary }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--mui-palette-text-secondary)' }}>
                            {new Date(point.timestamp).toLocaleTimeString()}
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              color: theme.palette.text.secondary,
                            }}
                          >
                            {point.position[0].toFixed(5)}, {point.position[1].toFixed(5)}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--mui-palette-text-secondary)' }}>
                            {point.speed?.toFixed(1) || '-'} km/h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {currentTrack.points.length > 50 && (
                    <Box
                      sx={{
                        px: 3,
                        py: 2,
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        bgcolor: 'grey.50',
                      }}
                    >
                      显示前 50 个点，共 {currentTrack.points.length} 个点
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Calendar
                  size={48}
                  sx={{ color: 'action.disabled', margin: '0 auto 12px' }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  从左侧列表选择设备以查看轨迹
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TrackPanel;
