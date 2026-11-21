import { designTokens } from '@topems/tokens';
import styles from './MobileInventoryPage.module.css';
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
  BottomTabBar,
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
  inventoryApi,
} from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { useQuery } from '@tanstack/react-query';
import { MOBILE_PATHS } from '@/module-configs/mobile/config';
import { MobilePageTemplate } from '@/components/templates';
import { EmptyState } from '@/components';
import { QUERY_KEYS } from '@/lib/reactQuery';

const MobileInventoryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const tabs = [
    i18n.t('mobile.mobile_inventory_page.k3'),
    i18n.t('mobile.mobile_inventory_page.k2'),
    i18n.t('mobile.mobile_inventory_page.k1'),
    i18n.t('mobile.mobile_inventory_page.k0'),
  ];
  const [itemsNotConnected, setItemsNotConnected] = useState(false);
  const [stocktakeNotConnected, setStocktakeNotConnected] = useState(false);
  const [inboundNotConnected, setInboundNotConnected] = useState(false);
  const [outboundNotConnected, setOutboundNotConnected] = useState(false);
  // 后端在「上游服务未接入」时返回 200 + degrade 标记（data.degraded === true）+ items=[]。
  // 用结构化标记而非 message 文案判定，避免依赖中文串（响应文案可变，标记是契约）。
  const detectNotConnected = (data: unknown, set: (v: boolean) => void) => {
    const degraded =
      typeof data === 'object' &&
      data !== null &&
      (data as { degraded?: unknown }).degraded === true;
    set(degraded);
  };
  const itemsQuery = useQuery<InventoryItem[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_ITEMS_BASE,
    queryFn: async () => {
      const res = await inventoryApi.listItems();
      detectNotConnected(res?.data, setItemsNotConnected);
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const inventoryItems = itemsQuery.data ?? [];
  const stocktakeQuery = useQuery<StocktakeTask[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_STOCKTAKE_BASE,
    queryFn: async () => {
      const res = await inventoryApi.listStocktakeTasks();
      detectNotConnected(res?.data, setStocktakeNotConnected);
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const stocktakeTasks = stocktakeQuery.data ?? [];
  const inboundQuery = useQuery<InboundOrder[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_INBOUND_BASE,
    queryFn: async () => {
      const res = await inventoryApi.listInboundOrders();
      detectNotConnected(res?.data, setInboundNotConnected);
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const inboundOrders = inboundQuery.data ?? [];
  const outboundQuery = useQuery<OutboundOrder[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_INVENTORY_OUTBOUND_BASE,
    queryFn: async () => {
      const res = await inventoryApi.listOutboundOrders();
      detectNotConnected(res?.data, setOutboundNotConnected);
      return res?.data?.items ?? [];
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
    {
      id: 'home',
      label: i18n.t('mobile.mobile_inventory_page.k40'),
      icon: <Home className={styles.il1} />,
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_inventory_page.k41'),
      icon: <ListTodo className={styles.il2} />,
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_inventory_page.k42'),
      icon: <ScanLine className={styles.il3} />,
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_inventory_page.k43'),
      icon: <CheckSquare className={styles.il4} />,
      badge: 3,
    },
    {
      id: 'profile',
      label: i18n.t('mobile.mobile_inventory_page.k44'),
      icon: <User className={styles.il5} />,
    },
  ];
  return (
    <MobilePageTemplate
      title={i18n.t('mobile.mobile_inventory_page.k45')}
      bottomNav={
        <BottomTabBar
          tabs={bottomTabs}
          activeTab=''
          onChange={handleBottomTabChange}
        />
      }
      actions={[
        <IconButton
          size='large'
          sx={{ minWidth: 44, minHeight: 44 }}
          onClick={() => navigate(MOBILE_PATHS.scanPage)}
          aria-label={i18n.t('mobile.mobile_inventory_page.k46')}
        >
          <Barcode className={styles.il6} />
        </IconButton>,
      ]}
      headerProps={{
        showBack: true,
        onBackClick: () => navigate(MOBILE_PATHS.workbench),
        showNotifications: true,
        notificationCount: 5,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant='fullWidth'
        sx={{
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                    <Search className={styles.il7} />
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
                {filteredItems.length === 0 && (
                  <EmptyState
                    compact
                    icon={<Package size={28} />}
                    title={
                      itemsNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_material_not_connected_title')
                        : i18n.t('mobile.mobile_inventory_page.empty_material_title')
                    }
                    description={
                      itemsNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_material_not_connected_desc')
                        : i18n.t('mobile.mobile_inventory_page.empty_material_desc')
                    }
                  />
                )}
                {filteredItems.map((item, index) => (
                  <React.Fragment key={item.id ?? index}>
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
                          <Package className={styles.il8} />
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
                              sx={{
                                height: 18,
                                fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                              }}
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
                            {i18n.t('pages.mobile_inventory_page.k0')}: {item.location}
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
                {stocktakeTasks.length === 0 && (
                  <EmptyState
                    compact
                    icon={<ClipboardList size={28} />}
                    title={
                      stocktakeNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_stocktake_not_connected_title')
                        : i18n.t('mobile.mobile_inventory_page.empty_stocktake_title')
                    }
                    description={
                      stocktakeNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_stocktake_not_connected_desc')
                        : i18n.t('mobile.mobile_inventory_page.empty_stocktake_desc')
                    }
                  />
                )}
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
                          sx={{
                            height: 20,
                            fontSize: designTokens.typography.fontSize.scale['0.7rem'],
                          }}
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
                          {i18n.t('pages.mobile_inventory_page.k4')}: {task.due_date}
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
                            {task.status === 'pending'
                              ? i18n.t('mobile.mobile_inventory_page.k51')
                              : i18n.t('mobile.mobile_inventory_page.k50')}
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
                {inboundOrders.length === 0 && (
                  <EmptyState
                    compact
                    icon={<Warehouse size={28} />}
                    title={
                      inboundNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_inbound_not_connected_title')
                        : i18n.t('mobile.mobile_inventory_page.empty_inbound_title')
                    }
                    description={
                      inboundNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_inbound_not_connected_desc')
                        : i18n.t('mobile.mobile_inventory_page.empty_inbound_desc')
                    }
                  />
                )}
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
                          <Warehouse className={styles.il9} />
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
                              sx={{
                                height: 18,
                                fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                              }}
                            />
                            <Chip
                              label={getStatusLabel(order.status)}
                              size='small'
                              color={
                                getStatusColor(order.status) as React.ComponentProps<
                                  typeof Chip
                                >['color']
                              }
                              sx={{
                                height: 18,
                                fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                              }}
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
                            {order.total_items}
                            {i18n.t('pages.mobile_inventory_page.k0')}
                          </Typography>
                          <Typography variant='body2'>
                            {order.total_quantity.toLocaleString()}
                            {i18n.t('pages.mobile_inventory_page.k1')}
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
                {outboundOrders.length === 0 && (
                  <EmptyState
                    compact
                    icon={<Truck size={28} />}
                    title={
                      outboundNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_outbound_not_connected_title')
                        : i18n.t('mobile.mobile_inventory_page.empty_outbound_title')
                    }
                    description={
                      outboundNotConnected
                        ? i18n.t('mobile.mobile_inventory_page.empty_outbound_not_connected_desc')
                        : i18n.t('mobile.mobile_inventory_page.empty_outbound_desc')
                    }
                  />
                )}
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
                          <Truck className={styles.il10} />
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
                              sx={{
                                height: 18,
                                fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                              }}
                            />
                            <Chip
                              label={getStatusLabel(order.status)}
                              size='small'
                              color={
                                getStatusColor(order.status) as React.ComponentProps<
                                  typeof Chip
                                >['color']
                              }
                              sx={{
                                height: 18,
                                fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                              }}
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
                            {order.total_items}
                            {i18n.t('pages.mobile_inventory_page.k2')}
                          </Typography>
                          <Typography variant='body2'>
                            {order.total_quantity.toLocaleString()}
                            {i18n.t('pages.mobile_inventory_page.k3')}
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
    </MobilePageTemplate>
  );
};
export default MobileInventoryPage;
