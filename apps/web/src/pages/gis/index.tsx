import React, { useState } from 'react';
import { GisProvider, useGis } from '../../context/GisContext';
import MapView from '../../components/gis/MapView';
import { PageContainer } from '@/components/common';
import {
  MapPin,
  ArrowRight,
  Warehouse,
  Camera,
  Map,
  Building2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Box,
  Paper,
  Stack,
  Chip,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Button,
} from '@mui/material';
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from '../../api/gis';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

type TabType =
  | 'map'
  | 'devicePoints'
  | 'pipelines'
  | 'storageLocations'
  | 'evidenceRecords'
  | 'factoryMaps'
  | 'businessLocations';

const GisContent: React.FC = () => {
  const { t } = useTranslation('gis');
  const { state, loadAllData } = useGis();
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const {
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
    statistics,
    loading,
    error,
  } = state;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'map', label: t('gis.index.k0'), icon: <Map size={18} /> },
    { id: 'devicePoints', label: t('gis.index.k1'), icon: <MapPin size={18} /> },
    { id: 'pipelines', label: t('gis.index.k2'), icon: <ArrowRight size={18} /> },
    {
      id: 'storageLocations',
      label: t('gis.index.k3'),
      icon: <Warehouse size={18} />,
    },
    { id: 'evidenceRecords', label: t('gis.index.k4'), icon: <Camera size={18} /> },
    { id: 'factoryMaps', label: t('gis.index.k5'), icon: <Map size={18} /> },
    {
      id: 'businessLocations',
      label: t('gis.index.k6'),
      icon: <Building2 size={18} />,
    },
  ];

  const getStatusStyle = (status: string) => {
    if (!status) return { bgcolor: 'grey.100', color: 'grey.600' };
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes(t('gis.index.k7')))
      return { bgcolor: 'success.lighter', color: 'success.700' };
    if (s.includes('pending') || s.includes(t('gis.index.k8')))
      return { bgcolor: 'warning.light', color: 'warning.700' };
    if (s.includes('inactive') || s.includes(t('gis.index.k9')))
      return { bgcolor: 'error.lighter', color: 'error.darker' };
    return { bgcolor: 'grey.100', color: 'grey.600' };
  };

  const StatusChip: React.FC<{ status: string }> = ({ status }) => {
    const style = getStatusStyle(status);
    return (
      <Chip
        label={status}
        size='small'
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const renderDataTable = (data: unknown[], type: TabType) => {
    if (data.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color='text.secondary'>{t('gis.index.k10')}</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'grey.50' }}>
              {type === 'devicePoints' && (
                <>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e1')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e2')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e3')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e4')}
                  </th>
                </>
              )}
              {type === 'pipelines' && (
                <>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e1')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e2')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e7')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e8')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e4')}
                  </th>
                </>
              )}
              {type === 'storageLocations' && (
                <>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e1')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e2')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e12')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e3')}
                  </th>
                </>
              )}
              {type === 'evidenceRecords' && (
                <>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e14')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e2')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e16')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e17')}
                  </th>
                </>
              )}
              {type === 'factoryMaps' && (
                <>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e1')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e19')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e2')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e21')}
                  </th>
                </>
              )}
              {type === 'businessLocations' && (
                <>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e1')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e2')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e24')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e25')}
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    {t('gis.index.e4')}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {type === 'devicePoints' &&
              (data as DevicePoint[]).map((item) => (
                <tr
                  key={item.id}
                  style={{ borderTop: '1px solid grey.200' }}
                >
                  <td style={{ padding: '12px 16px' }}>{item.name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.device_type}</td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{<StatusChip status={item.status} />}</td>
                </tr>
              ))}
            {type === 'pipelines' &&
              (data as Pipeline[]).map((item) => (
                <tr
                  key={item.id}
                  style={{ borderTop: '1px solid grey.200' }}
                >
                  <td style={{ padding: '12px 16px' }}>{item.name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.pipeline_type}</td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    {item.start_point
                      ? `${item.start_point[0].toFixed(4)}, ${item.start_point[1].toFixed(4)}`
                      : ''}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    {item.end_point
                      ? `${item.end_point[0].toFixed(4)}, ${item.end_point[1].toFixed(4)}`
                      : ''}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{<StatusChip status={item.status} />}</td>
                </tr>
              ))}
            {type === 'storageLocations' &&
              (data as StorageLocation[]).map((item) => (
                <tr
                  key={item.id}
                  style={{ borderTop: '1px solid grey.200' }}
                >
                  <td style={{ padding: '12px 16px' }}>{item.name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.location_type}</td>
                  <td style={{ padding: '12px 16px' }}>{item.capacity}</td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </td>
                </tr>
              ))}
            {type === 'evidenceRecords' &&
              (data as EvidenceRecord[]).map((item) => (
                <tr
                  key={item.id}
                  style={{ borderTop: '1px solid grey.200' }}
                >
                  <td style={{ padding: '12px 16px' }}>{item.title}</td>
                  <td style={{ padding: '12px 16px' }}>{item.evidence_type}</td>
                  <td style={{ padding: '12px 16px' }}>{item.recorded_by}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.recorded_at ? new Date(item.recorded_at).toLocaleString() : ''}
                  </td>
                </tr>
              ))}
            {type === 'factoryMaps' &&
              (data as FactoryMap[]).map((item) => (
                <tr
                  key={item.id}
                  style={{ borderTop: '1px solid grey.200' }}
                >
                  <td style={{ padding: '12px 16px' }}>{item.name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.code}</td>
                  <td style={{ padding: '12px 16px' }}>{item.map_type}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
            {type === 'businessLocations' &&
              (data as BusinessLocation[]).map((item) => (
                <tr
                  key={item.id}
                  style={{ borderTop: '1px solid grey.200' }}
                >
                  <td style={{ padding: '12px 16px' }}>{item.business_name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.business_type}</td>
                  <td style={{ padding: '12px 16px' }}>{item.address}</td>
                  <td style={{ padding: '12px 16px' }}>{item.contact_person}</td>
                  <td style={{ padding: '12px 16px' }}>{<StatusChip status={item.status} />}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Box>
    );
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'devicePoints':
        return devicePoints;
      case 'pipelines':
        return pipelines;
      case 'storageLocations':
        return storageLocations;
      case 'evidenceRecords':
        return evidenceRecords;
      case 'factoryMaps':
        return factoryMaps;
      case 'businessLocations':
        return businessLocations;
      default:
        return [];
    }
  };

  return (
    <PageContainer
      title={t('gis.index.m1')}
      padding={false}
      maxWidth={false}
    >
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, ${ct.cyan[50]} 100%)`,
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
          <Stack
            direction='row'
            spacing={2}
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              mb: 4,
            }}
          >
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {t('gis.index.e1')}
                </Typography>
                <Typography color='text.secondary'>{t('gis.index.e27')}</Typography>
              </Box>
            </Stack>
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Button
                onClick={() => loadAllData(true)}
                startIcon={
                  <RefreshCw
                    size={18}
                    className={loading ? 'animate-spin' : ''}
                  />
                }
                sx={{
                  bgcolor: 'common.white',
                  border: 1,
                  borderColor: 'grey.200',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'grey.50' },
                  textTransform: 'none',
                }}
              >
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {t('gis.index.k11')}
                </Typography>
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert
              severity='error'
              icon={<AlertTriangle size={20} />}
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>
          )}

          <Snackbar
            open={Boolean(notification)}
            autoHideDuration={3000}
            onClose={() => setNotification(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert
              severity={notification?.type === 'success' ? 'success' : 'error'}
              onClose={() => setNotification(null)}
              icon={
                notification?.type === 'success' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <AlertCircle size={20} />
                )
              }
            >
              {notification?.message}
            </Alert>
          </Snackbar>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(6, 1fr)',
              },
              gap: 4,
              mb: 6,
            }}
          >
            <Paper
              sx={{
                borderRadius: 2,
                p: 4,
                boxShadow: 1,
                border: 1,
                borderColor: 'grey.100',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'success.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MapPin
                    size={20}
                    style={{ color: 'success.dark' }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {statistics?.device_points || devicePoints.length}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('gis.index.e28')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
            <Paper
              sx={{
                borderRadius: 2,
                p: 4,
                boxShadow: 1,
                border: 1,
                borderColor: 'grey.100',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'indigo.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowRight
                    size={20}
                    style={{ color: 'primary.light' }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {statistics?.pipelines || pipelines.length}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('gis.index.e29')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
            <Paper
              sx={{
                borderRadius: 2,
                p: 4,
                boxShadow: 1,
                border: 1,
                borderColor: 'grey.100',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'warning.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Warehouse
                    size={20}
                    style={{ color: 'warning.dark' }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {statistics?.storage_locations || storageLocations.length}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('gis.index.e30')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
            <Paper
              sx={{
                borderRadius: 2,
                p: 4,
                boxShadow: 1,
                border: 1,
                borderColor: 'grey.100',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'secondary.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera
                    size={20}
                    style={{ color: ct.pink.dark }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {statistics?.evidence_records || evidenceRecords.length}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('gis.index.e31')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
            <Paper
              sx={{
                borderRadius: 2,
                p: 4,
                boxShadow: 1,
                border: 1,
                borderColor: 'grey.100',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'secondary.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Map
                    size={20}
                    style={{ color: ct.purple.dark }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {statistics?.factory_maps || factoryMaps.length}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('gis.index.e32')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
            <Paper
              sx={{
                borderRadius: 2,
                p: 4,
                boxShadow: 1,
                border: 1,
                borderColor: 'grey.100',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: ct.teal[100],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2
                    size={20}
                    style={{ color: ct.teal.main }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {statistics?.business_locations || businessLocations.length}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('gis.index.e33')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>

          <Paper
            sx={{
              borderRadius: 2,
              boxShadow: 1,
              border: 1,
              borderColor: 'grey.100',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                borderBottom: 1,
                borderColor: 'grey.100',
                overflowX: 'auto',
              }}
            >
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 20,
                    py: 12,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    color: activeTab === tab.id ? 'cyan.dark' : 'text.secondary',
                    borderBottom: activeTab === tab.id ? 2 : 0,
                    borderColor: activeTab === tab.id ? 'cyan.dark' : 'transparent',
                    bgcolor: activeTab === tab.id ? 'cyan.light' : 'transparent',
                    '&:hover': {
                      bgcolor: activeTab === tab.id ? 'cyan.light' : 'grey.50',
                    },
                    textTransform: 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </Box>

            <Box sx={{ p: 4 }}>
              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 12,
                  }}
                >
                  <CircularProgress sx={{ color: 'info.main' }} />
                </Box>
              ) : activeTab === 'map' ? (
                <Box
                  sx={{
                    height: 600,
                    border: 1,
                    borderColor: 'grey.200',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <MapView
                    devicePoints={devicePoints}
                    pipelines={pipelines}
                    storageLocations={storageLocations}
                  />
                </Box>
              ) : (
                renderDataTable(getCurrentData(), activeTab)
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </PageContainer>
  );
};

const GisMapPage: React.FC = () => {
  return (
    <GisProvider>
      <GisContent />
    </GisProvider>
  );
};

export default GisMapPage;
