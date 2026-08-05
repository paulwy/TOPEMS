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
} from '@mui/material';
import {
  Building2,
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
import { DashboardTemplate } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface PortalData {
  supplier: Supplier | null;
  stats: SupplierPortalStats | null;
  orders: any[];
  announcements: any[];
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
      let orders: any[] = [];

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
            orders = ordersRes.data || [];
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

      let announcements: any[] = [];
      if (announcementsRes.success) {
        announcements = announcementsRes.data || [];
      } else {
        announcements = [
          { id: '1', title: '关于春节期间发货安排的通知', date: '2024-01-15', type: 'important' },
          { id: '2', title: '新增供应商门户功能上线公告', date: '2024-01-10', type: 'normal' },
          { id: '3', title: '2024年第一季度质量考核结果', date: '2024-01-05', type: 'normal' },
        ];
      }

      return { supplier, stats, orders, announcements };
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = portalQuery.isLoading;
  const supplier = portalQuery.data?.supplier ?? null;
  const stats = portalQuery.data?.stats ?? null;
  const orders = portalQuery.data?.orders ?? [];
  const announcements = portalQuery.data?.announcements ?? [];

  useEffect(() => {
    if (portalQuery.isError) {
      apiLogger.error('加载供应商门户数据失败:', portalQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载供应商门户数据',
      });
    }
  }, [portalQuery.isError, portalQuery.error, addNotification]);

  const statusConfig: Record<
    string,
    { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
  > = {
    pending: { label: '待处理', color: 'warning' },
    processing: { label: '处理中', color: 'primary' },
    shipped: { label: '已发货', color: 'info' },
    completed: { label: '已完成', color: 'success' },
    cancelled: { label: '已取消', color: 'default' },
  };

  const statCards = [
    {
      title: '订单总数',
      value: stats?.total_orders || 0,
      icon: <Package size={24} />,
      color: 'primary.main',
      bgColor: 'primary.50',
      suffix: '个',
    },
    {
      title: '待处理订单',
      value: stats?.pending_orders || 0,
      icon: <Clock size={24} />,
      color: 'warning.main',
      bgColor: 'warning.50',
      suffix: '个',
    },
    {
      title: '累计金额',
      value: stats?.total_amount || 0,
      icon: <DollarSign size={24} />,
      color: 'success.main',
      bgColor: 'success.50',
      prefix: '¥',
      format: true,
    },
    {
      title: '按时交付率',
      value: stats?.on_time_delivery_rate || 0,
      icon: <CheckCircle size={24} />,
      color: 'info.main',
      bgColor: 'info.50',
      suffix: '%',
    },
  ];

  const quickActions = [
    { label: '查看订单', icon: <Package size={20} />, action: () => setActiveTab(1) },
    { label: '查看发票', icon: <FileText size={20} />, action: () => setActiveTab(2) },
    { label: '发货管理', icon: <Truck size={20} />, action: () => setActiveTab(3) },
    { label: '询报价', icon: <TrendingUp size={20} />, action: () => setActiveTab(4) },
  ];

  return (
    <PageContainer>
      <Box sx={{ mb: 4 }}>
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  fontSize: '1.5rem',
                }}
              >
                {supplier?.name?.charAt(0) || 'S'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 600 }}
                >
                  {supplier?.name || '示例供应商'}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  供应商编号: {supplier?.supplier_no || 'SUP-001'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    size='small'
                    label={supplier?.category || '原材料供应商'}
                    color='primary'
                    variant='outlined'
                  />
                  <Chip
                    size='small'
                    icon={<Star size={12} />}
                    label={`质量评分: ${stats?.quality_score || 92.3}`}
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
        sx={{ mb: 4 }}
      >
        {statCards.map((stat, index) => (
          <Grid
            size={{ xs: 12, sm: 6, md: 3 }}
            key={index}
          >
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 1 }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700 }}
                    >
                      {stat.prefix}
                      {stat.format ? (stat.value as number).toLocaleString() : stat.value}
                      {stat.suffix}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: stat.bgColor,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
                  label='最近订单'
                  icon={<Package size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label='待办事项'
                  icon={<Bell size={16} />}
                  iconPosition='start'
                />
                <Tab
                  label='公告通知'
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
                    { id: '1', title: '确认订单 PO-2024-001', type: 'order', priority: 'high' },
                    {
                      id: '2',
                      title: '发货提醒 PO-2024-002',
                      type: 'delivery',
                      priority: 'medium',
                    },
                    { id: '3', title: '发票对账 INV-2024-005', type: 'invoice', priority: 'low' },
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
                                    ? '高'
                                    : item.priority === 'medium'
                                      ? '中'
                                      : '低'
                                }
                                color={
                                  item.priority === 'high'
                                    ? 'error'
                                    : item.priority === 'medium'
                                      ? 'warning'
                                      : 'default'
                                }
                                sx={{ fontSize: '0.625rem', height: 16 }}
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
                                  label='重要'
                                  color='error'
                                  sx={{ fontSize: '0.625rem', height: 16 }}
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
                绩效指标
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant='body2'>质量评分</Typography>
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
                  <Typography variant='body2'>按时交付率</Typography>
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
                  <Typography variant='body2'>合作评分</Typography>
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
                快速入口
              </Typography>
              <Grid
                container
                spacing={2}
              >
                {[
                  { icon: <Package size={20} />, label: '订单管理' },
                  { icon: <FileText size={20} />, label: '发票管理' },
                  { icon: <Truck size={20} />, label: '发货管理' },
                  { icon: <TrendingUp size={20} />, label: '询报价' },
                  { icon: <Star size={20} />, label: '绩效评估' },
                  { icon: <Bell size={20} />, label: '消息通知' },
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
    </PageContainer>
  );
};

export default SupplierPortalPage;
