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
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  MapPin,
  Plus,
  Edit,
  Delete,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { GisMapTemplate, type MapMarker, type GeoFence } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useAppStore } from '../../store';
import { gisApi } from '@/api/gis';
import type { MapMarker as GisMapMarker } from '@/api/gis';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface FenceData {
  id: string;
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  radius?: number;
  coordinates: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export const GisFencePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [fences, setFences] = useState<FenceData[]>([
    {
      id: 'F001',
      name: '仓库区域',
      type: 'polygon',
      coordinates: '39.9042, 116.4074',
      alertOnEnter: true,
      alertOnExit: true,
      status: 'active',
      createdAt: '2024-01-10 09:00:00',
      lastTriggered: '2024-01-15 14:30:00',
      triggerCount: 156,
    },
    {
      id: 'F002',
      name: '危险区域 A',
      type: 'circle',
      radius: 50,
      coordinates: '39.9142, 116.4174',
      alertOnEnter: true,
      alertOnExit: false,
      status: 'active',
      createdAt: '2024-01-12 10:00:00',
      lastTriggered: '2024-01-15 13:20:00',
      triggerCount: 89,
    },
    {
      id: 'F003',
      name: '办公区域',
      type: 'rectangle',
      coordinates: '39.9242, 116.4274',
      alertOnEnter: false,
      alertOnExit: true,
      status: 'active',
      createdAt: '2024-01-08 11:00:00',
      lastTriggered: '2024-01-15 12:00:00',
      triggerCount: 45,
    },
    {
      id: 'F004',
      name: '测试区域',
      type: 'circle',
      radius: 30,
      coordinates: '39.8942, 116.3974',
      alertOnEnter: true,
      alertOnExit: true,
      status: 'inactive',
      createdAt: '2024-01-05 09:00:00',
      triggerCount: 12,
    },
  ]);

  const [mapMarkers, setMapMarkers] = useState<GisMapMarker[]>([]);

  const loadMapMarkers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await gisApi.listMapMarkers({ pagesize: 50 });
      if (res.success && res.data) {
        setMapMarkers(res.data.items || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载地图标记失败';
      setError(msg);
      addNotification({ title: '加载失败', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadMapMarkers();
  }, [loadMapMarkers]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'circle':
        return '圆形';
      case 'polygon':
        return '多边形';
      case 'rectangle':
        return '矩形';
      default:
        return type;
    }
  };

  const parseCoordinates = (coords: string): [number, number] => {
    const [lat, lng] = coords.split(',').map((c) => parseFloat(c.trim()));
    return [lat || 0, lng || 0];
  };

  const mapFences: GeoFence[] = fences.map((fence) => ({
    id: fence.id,
    name: fence.name,
    type: fence.type,
    position: parseCoordinates(fence.coordinates),
    radius: fence.radius,
    color: fence.status === 'active' ? ct.error.main : ct.grey[500],
    alertOnEnter: fence.alertOnEnter,
    alertOnExit: fence.alertOnExit,
  }));

  const allMarkers: MapMarker[] = [
    ...fences.map((fence) => ({
      id: fence.id,
      name: fence.name,
      position: parseCoordinates(fence.coordinates),
      type: (fence.status === 'active' ? 'warning' : 'custom') as MapMarker['type'],
      popupContent: (
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {fence.name}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            类型: {getTypeLabel(fence.type)}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            触发次数: {fence.triggerCount}
          </Typography>
          {fence.alertOnEnter && (
            <Chip
              size='small'
              label='进入告警'
              color='warning'
              sx={{ mt: 0.5 }}
            />
          )}
          {fence.alertOnExit && (
            <Chip
              size='small'
              label='离开告警'
              color='info'
              sx={{ mt: 0.5, ml: 0.5 }}
            />
          )}
        </Box>
      ),
    })),
    ...mapMarkers.map((marker) => ({
      id: `marker-${marker.id}`,
      name: marker.name,
      position: [marker.position.lat, marker.position.lng] as [number, number],
      type: 'storage' as const,
      popupContent: (
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {marker.name}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            类型: {marker.marker_type}
          </Typography>
        </Box>
      ),
    })),
  ];

  const stats = [
    {
      id: 'total',
      title: '围栏总数',
      value: fences.length,
      icon: <Shield style={{ width: 24, height: 24 }} />,
      color: 'primary',
    },
    {
      id: 'active',
      title: '激活围栏',
      value: fences.filter((f) => f.status === 'active').length,
      icon: <CheckCircle style={{ width: 24, height: 24 }} />,
      color: 'success',
    },
    {
      id: 'triggered',
      title: '今日触发',
      value: '45',
      icon: <AlertTriangle style={{ width: 24, height: 24 }} />,
      color: 'warning',
    },
    {
      id: 'pending',
      title: '待处理告警',
      value: '3',
      icon: <Clock style={{ width: 24, height: 24 }} />,
      color: 'error',
    },
  ];

  const handleSearch = useCallback(
    (query: string) => {
      setSearchTerm(query);
      addNotification({ title: '搜索', message: `搜索: ${query}`, type: 'info' });
    },
    [addNotification]
  );

  const handleFenceClick = useCallback(
    (fence: GeoFence) => {
      addNotification({ title: '围栏详情', message: `选中: ${fence.name}`, type: 'info' });
    },
    [addNotification]
  );

  const handleCreateFence = useCallback(() => {
    setOpenDialog(true);
  }, []);

  const handleSaveFence = useCallback(() => {
    addNotification({ title: '成功', message: '围栏创建成功', type: 'success' });
    setOpenDialog(false);
  }, [addNotification]);

  const handleDeleteFence = useCallback(
    (fenceId: string) => {
      addNotification({ title: '成功', message: '围栏删除成功', type: 'success' });
      setFences((prev) => prev.filter((f) => f.id !== fenceId));
    },
    [addNotification]
  );

  const filteredFences = fences.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer
      title='地理围栏管理'
      subtitle='定义和管理地理围栏区域，设置进出告警规则'
      maxWidth='xl'
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
              地理围栏管理
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              定义和管理地理围栏区域，设置进出告警规则
            </Typography>
          </div>
          <Button
            variant='contained'
            startIcon={<Plus />}
            onClick={handleCreateFence}
          >
            创建围栏
          </Button>
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
          {stats.map((stat) => (
            <Grid
              size={{ xs: 6, sm: 3 }}
              key={stat.id}
            >
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {stat.title}
                    </Typography>
                  </Box>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid
          container
          spacing={3}
          sx={{ flex: 1, minHeight: 0 }}
        >
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardHeader
                title='围栏列表'
                action={
                  <TextField
                    placeholder='搜索围栏...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size='small'
                    sx={{ width: 200 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Search
                            size={16}
                            sx={{ mr: 1 }}
                          />
                        ),
                      },
                    }}
                  />
                }
              />
              <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>围栏名称</TableCell>
                        <TableCell>类型</TableCell>
                        <TableCell>坐标</TableCell>
                        <TableCell>告警规则</TableCell>
                        <TableCell>触发次数</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredFences.map((fence) => (
                        <TableRow key={fence.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <MapPin size={16} />
                              {fence.name}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={getTypeLabel(fence.type)}
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='caption'>{fence.coordinates}</Typography>
                            {fence.radius && (
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                (半径: {fence.radius}m)
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {fence.alertOnEnter && (
                                <Chip
                                  size='small'
                                  label='进入告警'
                                  color='warning'
                                />
                              )}
                              {fence.alertOnExit && (
                                <Chip
                                  size='small'
                                  label='离开告警'
                                  color='info'
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{fence.triggerCount}</TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={fence.status === 'active' ? '激活' : '停用'}
                              color={fence.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size='small'
                                aria-label='编辑'
                              >
                                <Edit size={16} />
                              </IconButton>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleDeleteFence(fence.id)}
                                aria-label='删除'
                              >
                                <Delete size={16} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardHeader title='地图预览' />
              <CardContent sx={{ flex: 1, p: 0 }}>
                <GisMapTemplate
                  initialCenter={[39.9042, 116.4074]}
                  initialZoom={13}
                  markers={allMarkers}
                  fences={mapFences}
                  onFenceClick={handleFenceClick}
                  searchable
                  onSearch={handleSearch}
                  sx={{ height: 400 }}
                />
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardHeader title='最近告警' />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    {
                      time: '14:30',
                      location: '仓库区域',
                      type: '进入',
                      device: '设备 #003',
                    },
                    {
                      time: '13:20',
                      location: '危险区域 A',
                      type: '进入',
                      device: '设备 #005',
                    },
                    {
                      time: '12:00',
                      location: '办公区域',
                      type: '离开',
                      device: '人员 #012',
                    },
                  ].map((alert, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        backgroundColor: alert.type === '进入' ? 'warning.50' : 'info.50',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {alert.location}
                        </Typography>
                        <Chip
                          size='small'
                          label={alert.type === '进入' ? '进入' : '离开'}
                          color={alert.type === '进入' ? 'warning' : 'info'}
                        />
                      </Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {alert.time} - {alert.device}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
        >
          <DialogTitle>创建地理围栏</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <TextField
                label='围栏名称'
                placeholder='输入围栏名称'
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>围栏类型</InputLabel>
                <Select
                  defaultValue='circle'
                  label='围栏类型'
                >
                  <MenuItem value='circle'>圆形</MenuItem>
                  <MenuItem value='polygon'>多边形</MenuItem>
                  <MenuItem value='rectangle'>矩形</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='中心坐标'
                placeholder='如: 39.9042, 116.4074'
                fullWidth
              />
              <TextField
                label='半径 (米)'
                type='number'
                placeholder='仅圆形围栏需要'
                fullWidth
              />
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                告警规则
              </Typography>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label='进入时告警'
                />
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label='离开时告警'
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>取消</Button>
            <Button
              variant='contained'
              onClick={handleSaveFence}
            >
              创建围栏
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default GisFencePage;
