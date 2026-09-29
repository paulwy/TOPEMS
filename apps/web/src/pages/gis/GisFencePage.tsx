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
import fenceApi, { type GeoFenceRecord, type CreateGeoFenceRequest } from '@/api/gis/fence';
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

export const GisFencePage: React.FC = () => {
  const { t } = useTranslation('gis');
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [fenceForm, setFenceForm] = useState<{
    name: string;
    shape_type: 'circle' | 'polygon' | 'rectangle';
    coordinates: string;
    radius?: number;
    eventTypes: { enter: boolean; exit: boolean };
  }>({ name: '', shape_type: 'circle', coordinates: '', eventTypes: { enter: true, exit: true } });

  /** 后端 GeoFenceRecord → 页面展示结构 */
  const toFenceData = useCallback((g: GeoFenceRecord): FenceData => {
    const coords = (g.coordinates as { coordinates?: [number, number] })?.coordinates ?? null;
    const coordinatesStr = coords
      ? `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`
      : typeof g.coordinates === 'string'
        ? g.coordinates
        : '';
    return {
      id: g.id,
      name: g.name,
      type: g.shape_type,
      radius: g.radius,
      coordinates: coordinatesStr,
      alertOnEnter: (g.event_types ?? []).includes('enter'),
      alertOnExit: (g.event_types ?? []).includes('exit'),
      status: g.status,
      createdAt: g.created_at,
      triggerCount: 0,
    };
  }, []);

  const {
    data: mapMarkers = [],
    isPending: markersLoading,
    error: markersError,
  } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.GIS_MAP_MARKERS_BASE,
    queryFn: async () => {
      const res = await gisApi.listMapMarkers({ page_size: 50 });
      if (res.success && res.data) {
        return res.data.items || [];
      }
      throw new Error(res.message || t('gis.gis_fence_page.k4'));
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: fences = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.GIS_FENCES_BASE,
    queryFn: async () => {
      const res = await fenceApi.listGeoFences();
      if (res.success && res.data) {
        return (Array.isArray(res.data) ? res.data : []).map(toFenceData);
      }
      throw new Error(res.message || t('gis.gis_fence_page.k4'));
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteFenceMutation = useMutation({
    mutationFn: async (fenceId: string) => {
      const res = await fenceApi.deleteGeoFence(fenceId);
      if (!res.success) {
        throw new Error(res.message || t('gis.gis_fence_page.k5'));
      }
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.GIS_FENCES_BASE });
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
            {t('gis.gis_fence_page.r1')} {getTypeLabel(fence.type)}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('gis.gis_fence_page.r2')} {fence.triggerCount}
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
            {t('gis.gis_fence_page.r1')} {marker.marker_type}
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
        message: i18n.t('gis.gis_fence_page.e1', { v1: query }),
        type: 'info',
      });
    },
    [addNotification, t]
  );

  const handleFenceClick = useCallback(
    (fence: GeoFence) => {
      addNotification({
        title: t('gis.gis_fence_page.k19'),
        message: i18n.t('gis.gis_fence_page.e2', { v1: fence.name }),
        type: 'info',
      });
    },
    [addNotification, t]
  );

  const handleCreateFence = useCallback(() => {
    setOpenDialog(true);
  }, []);

  const handleSaveFence = useCallback(async () => {
    if (!fenceForm.name.trim()) {
      addNotification({
        title: t('gis.gis_fence_page.k6'),
        message: t('gis.gis_fence_page.k5'),
        type: 'error',
      });
      return;
    }
    const coords = fenceForm.coordinates.split(',').map((c) => parseFloat(c.trim()));
    const [lat, lng] = coords;
    const payload: CreateGeoFenceRequest = {
      name: fenceForm.name.trim(),
      shape_type: fenceForm.shape_type,
      coordinates:
        fenceForm.shape_type === 'circle' && !Number.isNaN(lat) && !Number.isNaN(lng)
          ? { type: 'Point', coordinates: [lng, lat] }
          : { type: 'Point', coordinates: [lng ?? 0, lat ?? 0] },
      radius: fenceForm.radius,
      event_types: [
        ...(fenceForm.eventTypes.enter ? ['enter'] : []),
        ...(fenceForm.eventTypes.exit ? ['exit'] : []),
      ],
      status: 'active',
    };
    try {
      const res = await fenceApi.createGeoFence(payload);
      if (!res.success) {
        throw new Error(res.message || t('gis.gis_fence_page.k5'));
      }
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.GIS_FENCES_BASE,
        exact: false,
        refetchType: 'active',
      });
      setOpenDialog(false);
      setFenceForm({
        name: '',
        shape_type: 'circle',
        coordinates: '',
        eventTypes: { enter: true, exit: true },
      });
      addNotification({
        title: t('gis.gis_fence_page.k8'),
        message: t('gis.gis_fence_page.k7'),
        type: 'success',
      });
    } catch (e) {
      addNotification({
        title: t('gis.gis_fence_page.k6'),
        message: (e as Error).message,
        type: 'error',
      });
    }
  }, [fenceForm, queryClient, addNotification, t]);

  const handleDeleteFence = useCallback(
    (fenceId: string) => {
      deleteFenceMutation.mutate(fenceId);
    },
    [deleteFenceMutation]
  );

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
              {t('gis.gis_fence_page.e3')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('gis.gis_fence_page.e4')}
            </Typography>
          </div>
          <Button
            variant='contained'
            startIcon={<Plus />}
            onClick={handleCreateFence}
          >
            {t('gis.gis_fence_page.e5')}
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
                    placeholder={t('gis.gis_fence_page.m1')}
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
                                ({t('gis.gis_fence_page.l1', { v1: fence.radius })})
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
                      device: i18n.t('gis.gis_fence_page.l2'),
                    },
                    {
                      time: '13:20',
                      location: t('gis.gis_fence_page.a_40'),
                      type: t('gis.gis_fence_page.k41'),
                      device: i18n.t('gis.gis_fence_page.l3'),
                    },
                    {
                      time: '12:00',
                      location: t('gis.gis_fence_page.k42'),
                      type: t('gis.gis_fence_page.k43'),
                      device: i18n.t('gis.gis_fence_page.l4'),
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
                value={fenceForm.name}
                onChange={(e) => setFenceForm((f) => ({ ...f, name: e.target.value }))}
              />
              <FormControl fullWidth>
                <InputLabel>{t('gis.gis_fence_page.k52')}</InputLabel>
                <Select
                  value={fenceForm.shape_type}
                  label={t('gis.gis_fence_page.k53')}
                  onChange={(e) =>
                    setFenceForm((f) => ({
                      ...f,
                      shape_type: e.target.value as 'circle' | 'polygon' | 'rectangle',
                    }))
                  }
                >
                  <MenuItem value='circle'>{t('gis.gis_fence_page.k54')}</MenuItem>
                  <MenuItem value='polygon'>{t('gis.gis_fence_page.k55')}</MenuItem>
                  <MenuItem value='rectangle'>{t('gis.gis_fence_page.k56')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('gis.gis_fence_page.k57')}
                placeholder={t('gis.gis_fence_page.m2')}
                fullWidth
                value={fenceForm.coordinates}
                onChange={(e) => setFenceForm((f) => ({ ...f, coordinates: e.target.value }))}
              />
              <TextField
                label={t('gis.gis_fence_page.k58')}
                type='number'
                placeholder={t('gis.gis_fence_page.k59')}
                fullWidth
                value={fenceForm.radius ?? ''}
                onChange={(e) =>
                  setFenceForm((f) => ({
                    ...f,
                    radius: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
              />
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {t('gis.gis_fence_page.e6')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={fenceForm.eventTypes.enter}
                      onChange={(e) =>
                        setFenceForm((f) => ({
                          ...f,
                          eventTypes: { ...f.eventTypes, enter: e.target.checked },
                        }))
                      }
                    />
                  }
                  label={t('gis.gis_fence_page.k60')}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={fenceForm.eventTypes.exit}
                      onChange={(e) =>
                        setFenceForm((f) => ({
                          ...f,
                          eventTypes: { ...f.eventTypes, exit: e.target.checked },
                        }))
                      }
                    />
                  }
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
              {t('gis.gis_fence_page.e5')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default GisFencePage;
