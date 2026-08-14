import React, { useState, useCallback, useMemo } from 'react';
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
import { useNotificationStore } from '@/store';
import { gisApi } from '@/api/gis';
import type { MapMarker as GisMapMarker } from '@/api/gis';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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

const MOCK_FENCES: FenceData[] = [
  {
    id: 'F001',
    name: i18n.t('gis.gis_fence_page.k0'),
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
    name: i18n.t('gis.gis_fence_page.a_1'),
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
    name: i18n.t('gis.gis_fence_page.k2'),
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
    name: i18n.t('gis.gis_fence_page.k3'),
    type: 'circle',
    radius: 30,
    coordinates: '39.8942, 116.3974',
    alertOnEnter: true,
    alertOnExit: true,
    status: 'inactive',
    createdAt: '2024-01-05 09:00:00',
    triggerCount: 12,
  },
];

export const GisFencePage: React.FC = () => {
  const { t } = useTranslation('gis');
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  const {
    data: mapMarkers = [],
    isPending: markersLoading,
    error: markersError,
  } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.GIS_MAP_MARKERS_BASE,
    queryFn: async () => {
      const res = await gisApi.listMapMarkers({ pagesize: 50 });
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(res.message || t('gis.gis_fence_page.k4'));
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: fences = MOCK_FENCES } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.GIS_FENCES_BASE,
    queryFn: async () => {
      return MOCK_FENCES;
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteFenceMutation = useMutation({
    mutationFn: async (fenceId: string) => {
      return fenceId;
    },
    onMutate: async (fenceId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.AD_HOC.GIS_FENCES_BASE });
      const previousFences = queryClient.getQueryData<FenceData[]>(['gis-fences']);
      queryClient.setQueryData<FenceData[]>(['gis-fences'], (old) =>
        old ? old.filter((f) => f.id !== fenceId) : []
      );
      return { previousFences };
    },
    onError: (_err, _fenceId, context) => {
      if (context?.previousFences) {
        queryClient.setQueryData(['gis-fences'], context.previousFences);
      }
      addNotification({
        title: t('gis.gis_fence_page.k6'),
        message: t('gis.gis_fence_page.k5'),
        type: 'error',
      });
    },
    onSuccess: () => {
      addNotification({
        title: t('gis.gis_fence_page.k8'),
        message: t('gis.gis_fence_page.k7'),
        type: 'success',
      });
    },
  });

  const loading = markersLoading;
  const error = markersError ? (markersError as Error).message : '';

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'circle':
        return t('gis.gis_fence_page.k9');
      case 'polygon':
        return t('gis.gis_fence_page.k10');
      case 'rectangle':
        return t('gis.gis_fence_page.k11');
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
              label={t('gis.gis_fence_page.k12')}
              color='warning'
              sx={{ mt: 0.5 }}
            />
          )}
          {fence.alertOnExit && (
            <Chip
              size='small'
              label={t('gis.gis_fence_page.k13')}
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
      title: t('gis.gis_fence_page.k14'),
      value: fences.length,
      icon: <Shield style={{ width: 24, height: 24 }} />,
      color: 'primary',
    },
    {
      id: 'active',
      title: t('gis.gis_fence_page.k15'),
      value: fences.filter((f) => f.status === 'active').length,
      icon: <CheckCircle style={{ width: 24, height: 24 }} />,
      color: 'success',
    },
    {
      id: 'triggered',
      title: t('gis.gis_fence_page.k16'),
      value: '45',
      icon: <AlertTriangle style={{ width: 24, height: 24 }} />,
      color: 'warning',
    },
    {
      id: 'pending',
      title: t('gis.gis_fence_page.k17'),
      value: '3',
      icon: <Clock style={{ width: 24, height: 24 }} />,
      color: 'error',
    },
  ];

  const handleSearch = useCallback(
    (query: string) => {
      setSearchTerm(query);
      addNotification({
        title: t('gis.gis_fence_page.k18'),
        message: `搜索: ${query}`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleFenceClick = useCallback(
    (fence: GeoFence) => {
      addNotification({
        title: t('gis.gis_fence_page.k19'),
        message: `选中: ${fence.name}`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleCreateFence = useCallback(() => {
    setOpenDialog(true);
  }, []);

  const handleSaveFence = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.GIS_FENCES_BASE,
      exact: false,
      refetchType: 'active',
    });
    setOpenDialog(false);
  }, [queryClient]);

  const handleDeleteFence = useCallback(
    (fenceId: string) => {
      deleteFenceMutation.mutate(fenceId);
    },
    [deleteFenceMutation]
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.GIS_MAP_MARKERS_BASE,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.GIS_FENCES_BASE,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);

  const filteredFences = useMemo(
    () => fences.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [fences, searchTerm]
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
      title={t('gis.gis_fence_page.k20')}
      subtitle={t('gis.gis_fence_page.k21')}
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
                title={t('gis.gis_fence_page.k22')}
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
                        <TableCell>{t('gis.gis_fence_page.k23')}</TableCell>
                        <TableCell>{t('gis.gis_fence_page.k24')}</TableCell>
                        <TableCell>{t('gis.gis_fence_page.k25')}</TableCell>
                        <TableCell>{t('gis.gis_fence_page.k26')}</TableCell>
                        <TableCell>{t('gis.gis_fence_page.k27')}</TableCell>
                        <TableCell>{t('gis.gis_fence_page.k28')}</TableCell>
                        <TableCell>{t('gis.gis_fence_page.k29')}</TableCell>
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
                                  label={t('gis.gis_fence_page.k30')}
                                  color='warning'
                                />
                              )}
                              {fence.alertOnExit && (
                                <Chip
                                  size='small'
                                  label={t('gis.gis_fence_page.k31')}
                                  color='info'
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{fence.triggerCount}</TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={
                                fence.status === 'active'
                                  ? t('gis.gis_fence_page.k33')
                                  : t('gis.gis_fence_page.k32')
                              }
                              color={fence.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size='small'
                                aria-label={t('gis.gis_fence_page.k34')}
                              >
                                <Edit size={16} />
                              </IconButton>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleDeleteFence(fence.id)}
                                aria-label={t('gis.gis_fence_page.k35')}
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
              <CardHeader title={t('gis.gis_fence_page.k36')} />
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
              <CardHeader title={t('gis.gis_fence_page.k37')} />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    {
                      time: '14:30',
                      location: t('gis.gis_fence_page.k38'),
                      type: t('gis.gis_fence_page.k39'),
                      device: '设备 #003',
                    },
                    {
                      time: '13:20',
                      location: t('gis.gis_fence_page.a_40'),
                      type: t('gis.gis_fence_page.k41'),
                      device: '设备 #005',
                    },
                    {
                      time: '12:00',
                      location: t('gis.gis_fence_page.k42'),
                      type: t('gis.gis_fence_page.k43'),
                      device: '人员 #012',
                    },
                  ].map((alert, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        backgroundColor:
                          alert.type === t('gis.gis_fence_page.k44') ? 'warning.50' : 'info.50',
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
                          label={
                            alert.type === t('gis.gis_fence_page.k46')
                              ? t('gis.gis_fence_page.k47')
                              : t('gis.gis_fence_page.k45')
                          }
                          color={alert.type === t('gis.gis_fence_page.k48') ? 'warning' : 'info'}
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
          <DialogTitle>{t('gis.gis_fence_page.k49')}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <TextField
                label={t('gis.gis_fence_page.k50')}
                placeholder={t('gis.gis_fence_page.k51')}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>{t('gis.gis_fence_page.k52')}</InputLabel>
                <Select
                  defaultValue='circle'
                  label={t('gis.gis_fence_page.k53')}
                >
                  <MenuItem value='circle'>{t('gis.gis_fence_page.k54')}</MenuItem>
                  <MenuItem value='polygon'>{t('gis.gis_fence_page.k55')}</MenuItem>
                  <MenuItem value='rectangle'>{t('gis.gis_fence_page.k56')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('gis.gis_fence_page.k57')}
                placeholder='如: 39.9042, 116.4074'
                fullWidth
              />
              <TextField
                label={t('gis.gis_fence_page.k58')}
                type='number'
                placeholder={t('gis.gis_fence_page.k59')}
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
                  label={t('gis.gis_fence_page.k60')}
                />
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label={t('gis.gis_fence_page.k61')}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>{t('gis.gis_fence_page.k62')}</Button>
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
