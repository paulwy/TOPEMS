import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  useTheme,
  List,
  Divider,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Package,
  Search,
  ClipboardList,
  Warehouse,
  Truck,
  Barcode,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  MobileLayout,
  PullToRefresh,
  MobileSkeleton,
  MobileCard,
  MobileButton,
} from '@/components/mobile';
import { useNotificationStore } from '@/store';
import {
  type InventoryItem,
  type StocktakeTask,
  type InboundOrder,
  type OutboundOrder,
} from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { useQuery } from '@tanstack/react-query';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';
import { QUERY_KEYS } from '@/lib/reactQuery';
const MobileInventoryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const tabs = [i18n.t('mobile.mobile_inventory_page.k3'), i18n.t('mobile.mobile_inventory_page.k2'), i18n.t('mobile.mobile_inventory_page.k1'), i18n.t('mobile.mobile_inventory_page.k0')];
  const itemsQuery = useQuery<InventoryItem[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_ITEMS_BASE,
    queryFn: async () => {
      const mockItems: InventoryItem[] = [
        {
          id: '1',
          sku: 'MAT-001',
          name: i18n.t('pages.mobile_inventory_page.10k_0'),
          category: i18n.t('mobile.mobile_inventory_page.k4'),
          quantity: 15000,
          unit: i18n.t('mobile.mobile_inventory_page.k5'),
          location: 'A1-03-05',
          batch_no: 'B20240601',
          status: 'normal',
          last_updated: '2024-06-28 10:30',
        },
        {
          id: '2',
          sku: 'MAT-002',
          name: i18n.t('pages.mobile_inventory_page.100f_1'),
          category: i18n.t('mobile.mobile_inventory_page.k6'),
          quantity: 8500,
          unit: i18n.t('mobile.mobile_inventory_page.k7'),
          location: 'A1-03-06',
          batch_no: 'B20240602',
          status: 'normal',
          last_updated: '2024-06-28 09:15',
        },
        {
          id: '3',
          sku: 'MAT-003',
          name: i18n.t('pages.mobile_inventory_page.pcb_2'),
          category: i18n.t('mobile.mobile_inventory_page.k8'),
          quantity: 500,
          unit: i18n.t('mobile.mobile_inventory_page.k9'),
          location: 'A2-01-02',
          batch_no: 'B20240528',
          status: 'low_stock',
          last_updated: '2024-06-27 16:45',
        },
        {
          id: '4',
          sku: 'MAT-004',
          name: i18n.t('mobile.mobile_inventory_page.k10'),
          category: i18n.t('mobile.mobile_inventory_page.k11'),
          quantity: 0,
          unit: i18n.t('mobile.mobile_inventory_page.k12'),
          location: 'B1-02-03',
          batch_no: 'B20240520',
          status: 'out_of_stock',
          last_updated: '2024-06-26 14:20',
        },
        {
          id: '5',
          sku: 'FG-001',
          name: i18n.t('mobile.mobile_inventory_page.k13'),
          category: i18n.t('mobile.mobile_inventory_page.k14'),
          quantity: 320,
          unit: i18n.t('mobile.mobile_inventory_page.k15'),
          location: 'C1-01-01',
          batch_no: 'FG20240625',
          expiry_date: '2025-06-25',
          status: 'normal',
          last_updated: '2024-06-28 08:00',
        },
        {
          id: '6',
          sku: 'FG-002',
          name: i18n.t('mobile.mobile_inventory_page.k16'),
          category: i18n.t('mobile.mobile_inventory_page.k17'),
          quantity: 150,
          unit: i18n.t('mobile.mobile_inventory_page.k18'),
          location: 'C1-02-01',
          batch_no: 'FG20240620',
          status: 'normal',
          last_updated: '2024-06-27 17:30',
        },
      ];
      return mockItems;
    },
    staleTime: 5 * 60 * 1000,
  });
  const inventoryItems = itemsQuery.data ?? [];
  const stocktakeQuery = useQuery<StocktakeTask[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_STOCKTAKE_BASE,
    queryFn: async () => {
      const mockStocktakeTasks: StocktakeTask[] = [
        {
          id: '1',
          title: i18n.t('pages.mobile_inventory_page.a_3'),
          warehouse: i18n.t('pages.mobile_inventory_page.a_4'),
          status: 'in_progress',
          total_items: 120,
          counted_items: 85,
          assignee: i18n.t('mobile.mobile_inventory_page.k19'),
          due_date: '2024-06-30',
          created_at: '2024-06-25T09:00:00Z',
        },
        {
          id: '2',
          title: i18n.t('mobile.mobile_inventory_page.k20'),
          warehouse: i18n.t('pages.mobile_inventory_page.c_5'),
          status: 'pending',
          total_items: 45,
          counted_items: 0,
          assignee: i18n.t('mobile.mobile_inventory_page.k21'),
          due_date: '2024-07-05',
          created_at: '2024-06-28T08:00:00Z',
        },
        {
          id: '3',
          title: i18n.t('pages.mobile_inventory_page.b_6'),
          warehouse: i18n.t('pages.mobile_inventory_page.b_7'),
          status: 'completed',
          total_items: 80,
          counted_items: 80,
          assignee: i18n.t('mobile.mobile_inventory_page.k22'),
          due_date: '2024-06-20',
          created_at: '2024-06-15T09:00:00Z',
        },
      ];
      return mockStocktakeTasks;
    },
    staleTime: 5 * 60 * 1000,
  });
  const stocktakeTasks = stocktakeQuery.data ?? [];
  const inboundQuery = useQuery<InboundOrder[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_INBOUND_BASE,
    queryFn: async () => {
      const mockInboundOrders: InboundOrder[] = [
        {
          id: '1',
          orderNo: 'IN-2024-06-0891',
          supplier: i18n.t('mobile.mobile_inventory_page.k23'),
          type: 'purchase',
          status: 'in_progress',
          total_items: 5,
          total_quantity: 5000,
          expected_date: '2024-06-28',
          created_at: '2024-06-26T10:00:00Z',
        },
        {
          id: '2',
          orderNo: 'IN-2024-06-0892',
          supplier: i18n.t('mobile.mobile_inventory_page.k24'),
          type: 'purchase',
          status: 'pending',
          total_items: 3,
          total_quantity: 2000,
          expected_date: '2024-06-30',
          created_at: '2024-06-27T14:00:00Z',
        },
        {
          id: '3',
          orderNo: 'IN-2024-06-0890',
          supplier: i18n.t('mobile.mobile_inventory_page.k25'),
          type: 'purchase',
          status: 'completed',
          total_items: 2,
          total_quantity: 10000,
          expected_date: '2024-06-25',
          created_at: '2024-06-20T09:00:00Z',
        },
      ];
      return mockInboundOrders;
    },
    staleTime: 5 * 60 * 1000,
  });
  const inboundOrders = inboundQuery.data ?? [];
  const outboundQuery = useQuery<OutboundOrder[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_OUTBOUND_BASE,
    queryFn: async () => {
      const mockOutboundOrders: OutboundOrder[] = [
        {
          id: '1',
          orderNo: 'OUT-2024-06-0567',
          customer: i18n.t('mobile.mobile_inventory_page.k26'),
          type: 'sales',
          status: 'in_progress',
          total_items: 3,
          total_quantity: 500,
          expected_date: '2024-06-28',
          created_at: '2024-06-27T16:00:00Z',
        },
        {
          id: '2',
          orderNo: 'OUT-2024-06-0566',
          customer: i18n.t('mobile.mobile_inventory_page.k27'),
          type: 'sales',
          status: 'pending',
          total_items: 5,
          total_quantity: 1200,
          expected_date: '2024-06-30',
          created_at: '2024-06-28T08:30:00Z',
        },
        {
          id: '3',
          orderNo: 'OUT-2024-06-0565',
          customer: i18n.t('mobile.mobile_inventory_page.k28'),
          type: 'sales',
          status: 'completed',
          total_items: 2,
          total_quantity: 300,
          expected_date: '2024-06-26',
          created_at: '2024-06-25T10:00:00Z',
        },
      ];
      return mockOutboundOrders;
    },
    staleTime: 5 * 60 * 1000,
  });
  const outboundOrders = outboundQuery.data ?? [];
  const loading =
    itemsQuery.isLoading ||
    stocktakeQuery.isLoading ||
    inboundQuery.isLoading ||
    outboundQuery.isLoading;
  useEffect(() => {
    if (itemsQuery.isError) {
      apiLogger.error(i18n.t('pages.mobile_inventory_page.k8'), itemsQuery.error);
    }
    if (stocktakeQuery.isError) {
      apiLogger.error(i18n.t('pages.mobile_inventory_page.k9'), stocktakeQuery.error);
    }
    if (inboundQuery.isError) {
      apiLogger.error(i18n.t('pages.mobile_inventory_page.k10'), inboundQuery.error);
    }
    if (outboundQuery.isError) {
      apiLogger.error(i18n.t('pages.mobile_inventory_page.k11'), outboundQuery.error);
    }
  }, [
    itemsQuery.isError,
    itemsQuery.error,
    stocktakeQuery.isError,
    stocktakeQuery.error,
    inboundQuery.isError,
    inboundQuery.error,
    outboundQuery.isError,
    outboundQuery.error,
  ]);
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      itemsQuery.refetch(),
      stocktakeQuery.refetch(),
      inboundQuery.refetch(),
      outboundQuery.refetch(),
    ]);
  }, [itemsQuery, stocktakeQuery, inboundQuery, outboundQuery]);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      normal: i18n.t('mobile.mobile_inventory_page.k29'),
      low_stock: i18n.t('mobile.mobile_inventory_page.k30'),
      out_of_stock: i18n.t('mobile.mobile_inventory_page.k31'),
      frozen: i18n.t('mobile.mobile_inventory_page.k32'),
      pending: i18n.t('mobile.mobile_inventory_page.k33'),
      in_progress: i18n.t('mobile.mobile_inventory_page.k34'),
      completed: i18n.t('mobile.mobile_inventory_page.k35'),
    };
    return map[status] || status;
  };
  const getStatusColor = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default'> = {
      normal: 'success',
      low_stock: 'warning',
      out_of_stock: 'error',
      frozen: 'info',
      pending: 'warning',
      in_progress: 'primary',
      completed: 'success',
    };
    return map[status] || 'default';
  };
  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      purchase: i18n.t('mobile.mobile_inventory_page.k36'),
      return: i18n.t('mobile.mobile_inventory_page.k37'),
      transfer: i18n.t('mobile.mobile_inventory_page.k38'),
      sales: i18n.t('mobile.mobile_inventory_page.k39'),
    };
    return map[type] || type;
  };
  const filteredItems = inventoryItems.filter(
    (item) =>
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(MOBILE_PATHS.workbench);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scanPage);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        navigate(MOBILE_PATHS.settings);
        break;
    }
  };
  const bottomTabs = [
    { id: 'home', label: i18n.t('mobile.mobile_inventory_page.k40'), icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: i18n.t('mobile.mobile_inventory_page.k41'), icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: i18n.t('mobile.mobile_inventory_page.k42'), icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_inventory_page.k43'),
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: i18n.t('mobile.mobile_inventory_page.k44'), icon: <User style={{ width: 22, height: 22 }} /> },
  ];
  return (
    <MobileLayout
      title={i18n.t('mobile.mobile_inventory_page.k45')}
      showBack
      onBackClick={() => navigate(MOBILE_PATHS.workbench)}
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={bottomTabs}
      activeTab=''
      onTabChange={handleBottomTabChange}
      rightActions={
        <IconButton
          size='large'
          sx={{ minWidth: 44, minHeight: 44 }}
          onClick={() => navigate(MOBILE_PATHS.scanPage)}
          aria-label={i18n.t('mobile.mobile_inventory_page.k46')}
        >
          <Barcode style={{ width: 20, height: 20 }} />
        </IconButton>
      }
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant='fullWidth'
          sx={{
            '& .MuiTab-root': {
              minHeight: 44,
              fontSize: '0.875rem',
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab}
            />
          ))}
        </Tabs>
        {activeTab === 0 && (
          <Box sx={{ px: 2, pt: 2 }}>
            <TextField
              fullWidth
              size='small'
              placeholder={i18n.t('mobile.mobile_inventory_page.k47')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  minHeight: 44,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search style={{ width: 20, height: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        )}
        <PullToRefresh onRefresh={handleRefresh}>
          {loading ? (
            <MobileSkeleton
              type='list'
              count={6}
            />
          ) : (
            <>
              {activeTab === 0 && (
                <List disablePadding>
                  {filteredItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <MobileCard
                        leftIcon={
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: `${getStatusColor(item.status)}.lighter`,
                              color: `${getStatusColor(item.status)}.main`,
                            }}
                          >
                            <Package style={{ width: 20, height: 20 }} />
                          </Avatar>
                        }
                        title={item.name}
                        subtitle={
                          <Box sx={{ mt: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Chip
                                label={getStatusLabel(item.status)}
                                size='small'
                                color={
                                  getStatusColor(item.status) as React.ComponentProps<
                                    typeof Chip
                                  >['color']
                                }
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {item.sku}
                              </Typography>
                            </Box>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              [i18n.t('pages.mobile_inventory_page.k0')]: {item.location}
                            </Typography>
                          </Box>
                        }
                        showArrow
                        divider={index < filteredItems.length - 1}
                        rightContent={
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant='subtitle2'
                              sx={{ fontWeight: 600 }}
                            >
                              {item.quantity.toLocaleString()}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {item.unit}
                            </Typography>
                          </Box>
                        }
                        onClick={() =>
                          addNotification({
                            title: i18n.t('mobile.mobile_inventory_page.k48'),
                            message: `${i18n.t('pages.mobile_inventory_page.k12')}${item.name}${i18n.t('pages.mobile_inventory_page.k13')}`,
                            type: 'info',
                          })
                        }
                      />
                    </React.Fragment>
                  ))}
                </List>
              )}
              {activeTab === 1 && (
                <List disablePadding>
                  {stocktakeTasks.map((task, index) => (
                    <React.Fragment key={task.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          mx: 2,
                          my: 1,
                          p: 2,
                          borderRadius: 2,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ClipboardList
                              style={{ width: 18, height: 18, color: theme.palette.primary.main }}
                            />
                            <Typography
                              variant='subtitle2'
                              sx={{ fontWeight: 600 }}
                            >
                              {task.title}
                            </Typography>
                          </Box>
                          <Chip
                            label={getStatusLabel(task.status)}
                            size='small'
                            color={
                              getStatusColor(task.status) as React.ComponentProps<
                                typeof Chip
                              >['color']
                            }
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              {i18n.t('pages.mobile_inventory_page.k1')}
                            </Typography>
                            <Typography variant='body2'>{task.warehouse}</Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              {i18n.t('pages.mobile_inventory_page.k2')}
                            </Typography>
                            <Typography variant='body2'>{task.assignee}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {i18n.t('pages.mobile_inventory_page.k3')}
                            </Typography>
                            <Typography variant='caption'>
                              {task.counted_items}/{task.total_items}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: '100%',
                              height: 6,
                              bgcolor: 'grey.200',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${(task.counted_items / task.total_items) * 100}%`,
                                height: '100%',
                                bgcolor: 'primary.main',
                                borderRadius: 3,
                                transition: 'width 0.3s',
                              }}
                            />
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            [i18n.t('pages.mobile_inventory_page.k4')]: {task.due_date}
                          </Typography>
                          {task.status !== 'completed' && (
                            <MobileButton
                              size='small'
                              variant='outlined'
                              onClick={() =>
                                addNotification({
                                  title: i18n.t('mobile.mobile_inventory_page.k49'),
                                  message: `${i18n.t('pages.mobile_inventory_page.k14')}${task.title}`,
                                  type: 'info',
                                })
                              }
                            >
                              {task.status === 'pending' ? i18n.t('mobile.mobile_inventory_page.k51') : i18n.t('mobile.mobile_inventory_page.k50')}
                            </MobileButton>
                          )}
                        </Box>
                      </Paper>
                      {index < stocktakeTasks.length - 1 && <Divider sx={{ mx: 2 }} />}
                    </React.Fragment>
                  ))}
                </List>
              )}
              {activeTab === 2 && (
                <List disablePadding>
                  {inboundOrders.map((order, index) => (
                    <React.Fragment key={order.id}>
                      <MobileCard
                        leftIcon={
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: 'success.lighter',
                              color: 'success.main',
                            }}
                          >
                            <Warehouse style={{ width: 20, height: 20 }} />
                          </Avatar>
                        }
                        title={order.orderNo}
                        subtitle={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant='body2'
                              sx={{ mb: 0.5 }}
                            >
                              {order.supplier}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={getTypeLabel(order.type)}
                                size='small'
                                variant='outlined'
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                              <Chip
                                label={getStatusLabel(order.status)}
                                size='small'
                                color={
                                  getStatusColor(order.status) as React.ComponentProps<
                                    typeof Chip
                                  >['color']
                                }
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            </Box>
                          </Box>
                        }
                        showArrow
                        divider={index < inboundOrders.length - 1}
                        rightContent={
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              {order.total_items}{i18n.t('pages.mobile_inventory_page.k0')}
                            </Typography>
                            <Typography variant='body2'>
                              {order.total_quantity.toLocaleString()}{i18n.t('pages.mobile_inventory_page.k1')}
                            </Typography>
                          </Box>
                        }
                        onClick={() =>
                          addNotification({
                            title: i18n.t('mobile.mobile_inventory_page.k52'),
                            message: `${i18n.t('pages.mobile_inventory_page.k15')}${order.orderNo}`,
                            type: 'info',
                          })
                        }
                      />
                    </React.Fragment>
                  ))}
                </List>
              )}
              {activeTab === 3 && (
                <List disablePadding>
                  {outboundOrders.map((order, index) => (
                    <React.Fragment key={order.id}>
                      <MobileCard
                        leftIcon={
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: 'info.lighter',
                              color: 'info.main',
                            }}
                          >
                            <Truck style={{ width: 20, height: 20 }} />
                          </Avatar>
                        }
                        title={order.orderNo}
                        subtitle={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant='body2'
                              sx={{ mb: 0.5 }}
                            >
                              {order.customer}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={getTypeLabel(order.type)}
                                size='small'
                                variant='outlined'
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                              <Chip
                                label={getStatusLabel(order.status)}
                                size='small'
                                color={
                                  getStatusColor(order.status) as React.ComponentProps<
                                    typeof Chip
                                  >['color']
                                }
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            </Box>
                          </Box>
                        }
                        showArrow
                        divider={index < outboundOrders.length - 1}
                        rightContent={
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              {order.total_items}{i18n.t('pages.mobile_inventory_page.k2')}
                            </Typography>
                            <Typography variant='body2'>
                              {order.total_quantity.toLocaleString()}{i18n.t('pages.mobile_inventory_page.k3')}
                            </Typography>
                          </Box>
                        }
                        onClick={() =>
                          addNotification({
                            title: i18n.t('mobile.mobile_inventory_page.k53'),
                            message: `${i18n.t('pages.mobile_inventory_page.k16')}${order.orderNo}`,
                            type: 'info',
                          })
                        }
                      />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}
        </PullToRefresh>
      </PageContainer>
    </MobileLayout>
  );
};
export default MobileInventoryPage;