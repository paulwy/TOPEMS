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

const MobileInventoryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = ['库存', '盘点', '入库', '出库'];

  const itemsQuery = useQuery<InventoryItem[]>({
    queryKey: ['mobile-inventory-items'],
    queryFn: async () => {
      const mockItems: InventoryItem[] = [
        {
          id: '1',
          sku: 'MAT-001',
          name: '电子元件 电阻10kΩ',
          category: '电子元件',
          quantity: 15000,
          unit: '个',
          location: 'A1-03-05',
          batch_no: 'B20240601',
          status: 'normal',
          last_updated: '2024-06-28 10:30',
        },
        {
          id: '2',
          sku: 'MAT-002',
          name: '电容 100μF',
          category: '电子元件',
          quantity: 8500,
          unit: '个',
          location: 'A1-03-06',
          batch_no: 'B20240602',
          status: 'normal',
          last_updated: '2024-06-28 09:15',
        },
        {
          id: '3',
          sku: 'MAT-003',
          name: 'PCB电路板',
          category: '电路板',
          quantity: 500,
          unit: '块',
          location: 'A2-01-02',
          batch_no: 'B20240528',
          status: 'low_stock',
          last_updated: '2024-06-27 16:45',
        },
        {
          id: '4',
          sku: 'MAT-004',
          name: '塑料外壳',
          category: '结构件',
          quantity: 0,
          unit: '个',
          location: 'B1-02-03',
          batch_no: 'B20240520',
          status: 'out_of_stock',
          last_updated: '2024-06-26 14:20',
        },
        {
          id: '5',
          sku: 'FG-001',
          name: '智能传感器模块',
          category: '成品',
          quantity: 320,
          unit: '台',
          location: 'C1-01-01',
          batch_no: 'FG20240625',
          expiry_date: '2025-06-25',
          status: 'normal',
          last_updated: '2024-06-28 08:00',
        },
        {
          id: '6',
          sku: 'FG-002',
          name: '数据采集器',
          category: '成品',
          quantity: 150,
          unit: '台',
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
    queryKey: ['mobile-inventory-stocktake'],
    queryFn: async () => {
      const mockStocktakeTasks: StocktakeTask[] = [
        {
          id: '1',
          title: 'A区月度盘点',
          warehouse: 'A仓库',
          status: 'in_progress',
          total_items: 120,
          counted_items: 85,
          assignee: '张明',
          due_date: '2024-06-30',
          created_at: '2024-06-25T09:00:00Z',
        },
        {
          id: '2',
          title: '成品区季度盘点',
          warehouse: 'C仓库',
          status: 'pending',
          total_items: 45,
          counted_items: 0,
          assignee: '李华',
          due_date: '2024-07-05',
          created_at: '2024-06-28T08:00:00Z',
        },
        {
          id: '3',
          title: 'B区上月复盘',
          warehouse: 'B仓库',
          status: 'completed',
          total_items: 80,
          counted_items: 80,
          assignee: '王强',
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
    queryKey: ['mobile-inventory-inbound'],
    queryFn: async () => {
      const mockInboundOrders: InboundOrder[] = [
        {
          id: '1',
          orderNo: 'IN-2024-06-0891',
          supplier: '深圳电子科技有限公司',
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
          supplier: '东莞五金制品厂',
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
          supplier: '广州包装材料厂',
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
    queryKey: ['mobile-inventory-outbound'],
    queryFn: async () => {
      const mockOutboundOrders: OutboundOrder[] = [
        {
          id: '1',
          orderNo: 'OUT-2024-06-0567',
          customer: '北京智能科技有限公司',
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
          customer: '上海自动化设备厂',
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
          customer: '深圳电子科技有限公司',
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
      apiLogger.error('加载库存物料失败:', itemsQuery.error);
    }
    if (stocktakeQuery.isError) {
      apiLogger.error('加载盘点任务失败:', stocktakeQuery.error);
    }
    if (inboundQuery.isError) {
      apiLogger.error('加载入库订单失败:', inboundQuery.error);
    }
    if (outboundQuery.isError) {
      apiLogger.error('加载出库订单失败:', outboundQuery.error);
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
      normal: '正常',
      low_stock: '低库存',
      out_of_stock: '缺货',
      frozen: '冻结',
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
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
      purchase: '采购',
      return: '退货',
      transfer: '调拨',
      sales: '销售',
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
    { id: 'home', label: '工作台', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <MobileLayout
      title='移动库存'
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
        aria-label="扫码"
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
              placeholder='搜索物料名称、编码'
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
                              库位: {item.location}
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
                            title: '物料详情',
                            message: `查看 ${item.name} 详情`,
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
                              仓库
                            </Typography>
                            <Typography variant='body2'>{task.warehouse}</Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              负责人
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
                              盘点进度
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
                            截止日期: {task.due_date}
                          </Typography>
                          {task.status !== 'completed' && (
                            <MobileButton
                              size='small'
                              variant='outlined'
                              onClick={() =>
                                addNotification({
                                  title: '开始盘点',
                                  message: `开始 ${task.title}`,
                                  type: 'info',
                                })
                              }
                            >
                              {task.status === 'pending' ? '开始' : '继续'}
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
                              {order.total_items}种物料
                            </Typography>
                            <Typography variant='body2'>
                              {order.total_quantity.toLocaleString()}件
                            </Typography>
                          </Box>
                        }
                        onClick={() =>
                          addNotification({
                            title: '入库单详情',
                            message: `查看 ${order.orderNo}`,
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
                              {order.total_items}种物料
                            </Typography>
                            <Typography variant='body2'>
                              {order.total_quantity.toLocaleString()}件
                            </Typography>
                          </Box>
                        }
                        onClick={() =>
                          addNotification({
                            title: '出库单详情',
                            message: `查看 ${order.orderNo}`,
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
