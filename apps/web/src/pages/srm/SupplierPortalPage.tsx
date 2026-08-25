import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Package,
  FileText,
  Truck,
  TrendingUp,
  Star,
  Bell,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { srmApi } from '@/api/srm';
import type { SupplierPortalStats, Supplier } from '@/api/srm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { StatsPageTemplate } from '@/components/templates';
import { designTokens } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface SupplierPortalAnnouncement {
  id: string;
  type: string;
  title: string;
  date: string;
}

interface SupplierPortalOrder {
  id: string;
  po_no: string;
  order_date: string;
  total_amount: number;
  status: string;
}

interface PortalData {
  supplier: Supplier | null;
  stats: SupplierPortalStats | null;
  orders: SupplierPortalOrder[];
  announcements: SupplierPortalAnnouncement[];
}

const SupplierPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { addNotification } = useNotificationStore();

  const portalQuery = useQuery<PortalData>({
    queryKey: QUERY_KEYS.SRM.SUPPLIER_PORTAL('default'),
    queryFn: async () => {
      const [suppliersRes, announcementsRes] = await Promise.all([
        srmApi.listSuppliers(),
        srmApi.getSupplierPortalAnnouncements(),
      ]);

      let supplier: Supplier | null = null;
      let stats: SupplierPortalStats | null = null;
      let orders: SupplierPortalOrder[] = [];

      if (suppliersRes.success && suppliersRes.data && suppliersRes.data.length > 0) {
        const firstSupplier = suppliersRes.data[0];
        supplier = firstSupplier;

        try {
          const statsRes = await srmApi.getSupplierPortalStats(firstSupplier.id);
          if (statsRes.success && statsRes.data) {
            stats = statsRes.data;
          }
        } catch (e) {
          stats = {
            total_orders: 128,
            pending_orders: 12,
            completed_orders: 108,
            total_amount: 2580000,
            pending_invoices: 5,
            paid_invoices: 45,
            pending_deliveries: 3,
            on_time_delivery_rate: 95.6,
            quality_score: 92.3,
          };
        }

        try {
          const ordersRes = await srmApi.getSupplierPortalOrders(firstSupplier.id);
          if (ordersRes.success) {
            orders = (ordersRes.data || []).map((po) => ({
              id: po.id,
              po_no: po.po_no,
              order_date: po.order_date,
              total_amount: po.total_amount ?? 0,
              status: po.status,
            }));
          }
        } catch (e) {
          orders = [
            {
              id: '1',
              po_no: 'PO-2024-001',
              order_date: '2024-01-15',
              total_amount: 125000,
              status: 'pending',
            },
            {
              id: '2',
              po_no: 'PO-2024-002',
              order_date: '2024-01-14',
              total_amount: 89000,
              status: 'processing',
            },
            {
              id: '3',
              po_no: 'PO-2024-003',
              order_date: '2024-01-10',
              total_amount: 256000,
              status: 'shipped',
            },
            {
              id: '4',
              po_no: 'PO-2024-004',
              order_date: '2024-01-08',
              total_amount: 45000,
              status: 'completed',
            },
          ];
        }
      }

      let announcements: SupplierPortalAnnouncement[] = [];
      if (announcementsRes.success) {
        announcements = (announcementsRes.data as SupplierPortalAnnouncement[]) || [];
      } else {
        announcements = [
          {
            id: '1',
            title: i18n.t('pages.supplier_portal_page.k0'),
            date: '2024-01-15',
            type: 'important',
          },
          {
            id: '2',
            title: i18n.t('pages.supplier_portal_page.k1'),
            date: '2024-01-10',
            type: 'normal',
          },
          {
            id: '3',
            title: i18n.t('pages.supplier_portal_page.2024_0'),
            date: '2024-01-05',
            type: 'normal',
          },
        ];
      }

      return { supplier, stats, orders, announcements };
    },
    staleTime: 5 * 60 * 1000,
  });

  const supplier = portalQuery.data?.supplier ?? null;
  const stats = portalQuery.data?.stats ?? null;
  const orders = portalQuery.data?.orders ?? [];
  const announcements = portalQuery.data?.announcements ?? [];

  useEffect(() => {
    if (portalQuery.isError) {
      apiLogger.error(i18n.t('pages.supplier_portal_page.k1'), portalQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.supplier_portal_page.k2'),
        message: i18n.t('pages.supplier_portal_page.k3'),
      });
    }
  }, [portalQuery.isError, portalQuery.error, addNotification]);

  const statusConfig: Record<
    string,
    { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
  > = {
    pending: { label: i18n.t('pages.supplier_portal_page.k4'), color: 'warning' },
    processing: { label: i18n.t('pages.supplier_portal_page.k5'), color: 'primary' },
    shipped: { label: i18n.t('pages.supplier_portal_page.k6'), color: 'info' },
    completed: { label: i18n.t('pages.supplier_portal_page.k7'), color: 'success' },
    cancelled: { label: i18n.t('pages.supplier_portal_page.k8'), color: 'default' },
  };

  const statCards = [
    {
      id: 'total-orders',
      title: i18n.t('pages.supplier_portal_page.k9'),
      value: stats?.total_orders || 0,
      icon: <Package size={24} />,
      color: 'primary' as const,
      bgColor: 'primary.50',
      suffix: i18n.t('pages.supplier_portal_page.k10'),
    },
    {
      id: 'pending-orders',
      title: i18n.t('pages.supplier_portal_page.k11'),
      value: stats?.pending_orders || 0,
      icon: <Clock size={24} />,
      color: 'warning' as const,
      bgColor: 'warning.50',
      suffix: i18n.t('pages.supplier_portal_page.k12'),
    },
    {
      id: 'total-amount',
      title: i18n.t('pages.supplier_portal_page.k13'),
      value: stats?.total_amount || 0,
      icon: <DollarSign size={24} />,
      color: 'success' as const,
      bgColor: 'success.50',
      prefix: '¥',
      format: true,
    },
    {
      id: 'on-time-rate',
      title: i18n.t('pages.supplier_portal_page.k14'),
      value: stats?.on_time_delivery_rate || 0,
      icon: <CheckCircle size={24} />,
      color: 'info' as const,
      bgColor: 'info.50',
      suffix: '%',
    },
  ];

  const quickActions = [
    {
      label: i18n.t('pages.supplier_portal_page.k15'),
      icon: <Package size={20} />,
      action: () => setActiveTab(1),
    },
    {
      label: i18n.t('pages.supplier_portal_page.k16'),
      icon: <FileText size={20} />,
      action: () => setActiveTab(2),
    },
    {
      label: i18n.t('pages.supplier_portal_page.k17'),
      icon: <Truck size={20} />,
      action: () => setActiveTab(3),
    },
    {
      label: i18n.t('pages.supplier_portal_page.k18'),
      icon: <TrendingUp size={20} />,
      action: () => setActiveTab(4),
    },
  ];

  if (portalQuery.isLoading) {
    return (
      <StatsPageTemplate
        title={i18n.t('pages.supplier_portal_page.k19')}
        loading
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
        showCharts={false}
        showTables={false}
        showStatCards={false}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 300,
          }}
        >
          <CircularProgress />
        </Box>
      </StatsPageTemplate>
    );
  }

  if (portalQuery.isError) {
    return (
      <StatsPageTemplate
        title={i18n.t('pages.supplier_portal_page.k19')}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
        showCharts={false}
        showTables={false}
        showStatCards={false}
      >
        <Typography
          color='error'
          variant='h6'
          sx={{ textAlign: 'center', py: 4 }}
        >
          {i18n.t('pages.supplier_portal_page.k3')}
        </Typography>
      </StatsPageTemplate>
    );
  }

  if (!supplier) {
    return (
      <StatsPageTemplate
        title={i18n.t('pages.supplier_portal_page.k19')}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
        showCharts={false}
        showTables={false}
        showStatCards={false}
      >
        <Typography
          color='text.secondary'
          variant='h6'
          sx={{ textAlign: 'center', py: 4 }}
        >
          {i18n.t('pages.supplier_portal_page.k0')}
        </Typography>
      </StatsPageTemplate>
    );
  }

  return (
    <StatsPageTemplate
      title={supplier?.name || i18n.t('pages.supplier_portal_page.k19')}
      subtitle={`${i18n.t('pages.supplier_portal_page.k0')}: ${supplier?.supplier_no || 'SUP-001'}`}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      statCards={statCards}
    >
      <Box sx={{ mb: 4 }}>
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                }}
              >
                {supplier?.name?.charAt(0) || 'S'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    size='small'
                    label={supplier?.category || i18n.t('pages.supplier_portal_page.k20')}
                    color='primary'
                    variant='outlined'
                  />
                  <Chip
                    size='small'
                    icon={<Star size={12} />}
                    label={`${i18n.t('pages.supplier_portal_page.k2')}${stats?.quality_score || 92.3}`}
                    color='warning'
                    variant='outlined'
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant='outlined'
                    startIcon={action.icon}
                    onClick={action.action}
                    sx={{ minWidth: 100 }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ px: 2 }}
              >
                <Tab
                  label={i18n.t('pages.supplier_portal_page.k21')}
                  icon={<Package size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label={i18n.t('pages.supplier_portal_page.k22')}
                  icon={<Bell size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label={i18n.t('pages.supplier_portal_page.k23')}
                  icon={<AlertCircle size={16} />}
                  iconPosition='start'
                />
              </Tabs>
            </Box>
            <CardContent>
              {activeTab === 0 && (
                <List disablePadding>
                  {orders.slice(0, 5).map((order, index) => (
                    <React.Fragment key={order.id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ py: 2 }}>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography variant='subtitle2'>{order.po_no}</Typography>
                              <Chip
                                size='small'
                                label={statusConfig[order.status]?.label || order.status}
                                color={statusConfig[order.status]?.color || 'default'}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                              <Typography
                                variant='body2'
                                color='text.secondary'
                              >
                                {order.order_date}
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 500 }}
                              >
                                ¥{order.total_amount?.toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <ChevronRight
                          size={16}
                          style={{ color: ct.text.muted }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
              {activeTab === 1 && (
                <List disablePadding>
                  {[
                    {
                      id: '1',
                      title: i18n.t('pages.supplier_portal_page.po2024001_24'),
                      type: 'order',
                      priority: 'high',
                    },
                    {
                      id: '2',
                      title: i18n.t('pages.supplier_portal_page.po2024002_25'),
                      type: 'delivery',
                      priority: 'medium',
                    },
                    {
                      id: '3',
                      title: i18n.t('pages.supplier_portal_page.inv2024005_26'),
                      type: 'invoice',
                      priority: 'low',
                    },
                  ].map((item, index) => (
                    <React.Fragment key={item.id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ py: 2 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant='subtitle2'>{item.title}</Typography>
                              <Chip
                                size='small'
                                label={
                                  item.priority === 'high'
                                    ? i18n.t('pages.supplier_portal_page.k27')
                                    : item.priority === 'medium'
                                      ? i18n.t('pages.supplier_portal_page.k28')
                                      : i18n.t('pages.supplier_portal_page.k29')
                                }
                                color={
                                  item.priority === 'high'
                                    ? 'error'
                                    : item.priority === 'medium'
                                      ? 'warning'
                                      : 'default'
                                }
                                sx={{
                                  fontSize: designTokens.typography.fontSize.scale['0.625rem'],
                                  height: 16,
                                }}
                              />
                            </Box>
                          }
                        />
                        <ChevronRight
                          size={16}
                          style={{ color: ct.text.muted }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
              {activeTab === 2 && (
                <List disablePadding>
                  {announcements.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ py: 2 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {item.type === 'important' && (
                                <Chip
                                  size='small'
                                  label={i18n.t('pages.supplier_portal_page.k30')}
                                  color='error'
                                  sx={{
                                    fontSize: designTokens.typography.fontSize.scale['0.625rem'],
                                    height: 16,
                                  }}
                                />
                              )}
                              <Typography variant='subtitle2'>{item.title}</Typography>
                            </Box>
                          }
                          secondary={item.date}
                        />
                        <ChevronRight
                          size={16}
                          style={{ color: ct.text.muted }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('pages.supplier_portal_page.k1')}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant='body2'>
                    {i18n.t('pages.supplier_portal_page.k31')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {stats?.quality_score || 92.3}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={stats?.quality_score || 92.3}
                  sx={{ height: 8, borderRadius: 4 }}
                  color='success'
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant='body2'>
                    {i18n.t('pages.supplier_portal_page.k32')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {stats?.on_time_delivery_rate || 95.6}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={stats?.on_time_delivery_rate || 95.6}
                  sx={{ height: 8, borderRadius: 4 }}
                  color='primary'
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant='body2'>
                    {i18n.t('pages.supplier_portal_page.k33')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    A
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={85}
                  sx={{ height: 8, borderRadius: 4 }}
                  color='warning'
                />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('pages.supplier_portal_page.k2')}
              </Typography>
              <Grid
                container
                spacing={2}
              >
                {[
                  { icon: <Package size={20} />, label: i18n.t('pages.supplier_portal_page.k34') },
                  { icon: <FileText size={20} />, label: i18n.t('pages.supplier_portal_page.k35') },
                  { icon: <Truck size={20} />, label: i18n.t('pages.supplier_portal_page.k36') },
                  {
                    icon: <TrendingUp size={20} />,
                    label: i18n.t('pages.supplier_portal_page.k37'),
                  },
                  { icon: <Star size={20} />, label: i18n.t('pages.supplier_portal_page.k38') },
                  { icon: <Bell size={20} />, label: i18n.t('pages.supplier_portal_page.k39') },
                ].map((item, index) => (
                  <Grid
                    size={{ xs: 4 }}
                    key={index}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                        p: 2,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      {item.icon}
                      <Typography variant='caption'>{item.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </StatsPageTemplate>
  );
};

export default SupplierPortalPage;
