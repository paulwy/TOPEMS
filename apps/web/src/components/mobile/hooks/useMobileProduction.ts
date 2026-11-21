/**
 * MobileProduction state management and API calls hook
 * @refactor-split Extracted from MobileProductionPage.tsx (V79 Phase 2)
 *
 * 批 33「宁缺勿假」：删除硬编码 mock 数据集，全部改接 productionApi 真实端点。
 * - 读：上游未接入时后端返回 200 + message 含「未接入」+ data.items=[]，
 *   前端据此在空态文案上区分「服务未接入」与「查无数据」。
 * - 写：上游未接入时后端返回 503 + body.code=503 + message 含「未接入」，
 *   前端 onError 必须识别 503 并给出「操作未执行」的友好中文提示，
 *   不得落到通用「请求失败」错误弹窗，也不得被当作成功。
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useNotificationStore } from '@/store';
import { type ProductionOrder, type WorkReport, type Equipment, productionApi } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface ReportForm {
  quantity: number;
  good_quantity: number;
  bad_quantity: number;
}

/**
 * 识别 axios 抛出的 503（service unavailable）。
 * 后端契约：HTTP 503 + body.code=503 + message 含「未接入」。
 * 兼容直接 throw new Error(...) 等非 axios 路径。
 */
const isServiceUnavailableError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const e = err as {
    response?: { status?: number; data?: { code?: number } };
    code?: number | string;
  };
  return e.response?.status === 503 || e.response?.data?.code === 503 || e.code === 503;
};

/**
 * 读接口：后端在「上游未接入」时返回 200 + data.degraded === true + 空 items。
 * 用结构化标记判定（不读 message 文案），驱动空态文案切换。
 */
const detectNotConnected = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && (data as { degraded?: unknown }).degraded === true;

export const useMobileProduction = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>({
    quantity: 0,
    good_quantity: 0,
    bad_quantity: 0,
  });
  // 空态「服务未接入」信号（仅驱动空态文案，不影响数据加载）
  const [ordersNotConnected, setOrdersNotConnected] = useState(false);
  const [reportsNotConnected, setReportsNotConnected] = useState(false);
  const [equipmentNotConnected, setEquipmentNotConnected] = useState(false);
  // Queries
  const ordersQuery = useQuery<ProductionOrder[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.MOBILE_PRODUCTION_ORDERS_BASE, user?.fullName],
    queryFn: async () => {
      const res = await productionApi.listOrders();
      setOrdersNotConnected(detectNotConnected(res?.data));
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const reportsQuery = useQuery<WorkReport[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.MOBILE_PRODUCTION_REPORTS_BASE, user?.fullName],
    queryFn: async () => {
      const res = await productionApi.listWorkReports();
      setReportsNotConnected(detectNotConnected(res?.data));
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const equipmentQuery = useQuery<Equipment[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_PRODUCTION_EQUIPMENT_BASE,
    queryFn: async () => {
      const res = await productionApi.listEquipment();
      setEquipmentNotConnected(detectNotConnected(res?.data));
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  // Error logging
  useEffect(() => {
    if (ordersQuery.isError) {
      apiLogger.error(i18n.t('mobile.production.message.load_orders_failed'), ordersQuery.error);
    }
    if (reportsQuery.isError) {
      apiLogger.error(i18n.t('mobile.production.message.load_reports_failed'), reportsQuery.error);
    }
    if (equipmentQuery.isError) {
      apiLogger.error(
        i18n.t('mobile.production.message.load_equipment_failed'),
        equipmentQuery.error
      );
    }
  }, [
    ordersQuery.isError,
    ordersQuery.error,
    reportsQuery.isError,
    reportsQuery.error,
    equipmentQuery.isError,
    equipmentQuery.error,
  ]);
  // Mutations
  const submitReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) {
        throw new Error('no selected order');
      }
      const now = new Date();
      const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const res = await productionApi.submitWorkReport({
        order_id: selectedOrder.id,
        quantity: reportForm.quantity,
        good_quantity: reportForm.good_quantity,
        bad_quantity: reportForm.bad_quantity,
        start_time: start.toISOString(),
        end_time: now.toISOString(),
        workstation: selectedOrder.workstation,
      });
      if (!res?.success) {
        throw new Error(res?.message || 'submit work report failed');
      }
      return res.data;
    },
    onSuccess: (newReport) => {
      if (newReport) {
        queryClient.setQueryData<WorkReport[]>(
          [...QUERY_KEYS.AD_HOC.MOBILE_PRODUCTION_REPORTS_BASE, user?.fullName],
          (prev) => [newReport, ...(prev ?? [])]
        );
      }
      if (selectedOrder) {
        queryClient.setQueryData<ProductionOrder[]>(
          [...QUERY_KEYS.AD_HOC.MOBILE_PRODUCTION_ORDERS_BASE, user?.fullName],
          (prev) =>
            (prev ?? []).map((o) => {
              if (o.id === selectedOrder.id) {
                const newCompleted = o.completed_quantity + reportForm.quantity;
                return {
                  ...o,
                  completed_quantity: newCompleted,
                  status: newCompleted >= o.quantity ? 'completed' : 'in_progress',
                };
              }
              return o;
            })
        );
      }
      setReportDialogOpen(false);
      addNotification({
        title: i18n.t('mobile.production.message.report_success'),
        message: i18n.t('mobile.production.message.reported_count', {
          count: reportForm.quantity,
        }),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      // 503：上游生产服务未接入，操作未执行。给出明确中文提示，不落到通用「请求失败」。
      if (isServiceUnavailableError(err)) {
        apiLogger.warn('[mobile-production] submitWorkReport 503 service unavailable', err);
        addNotification({
          title: i18n.t('mobile.production.message.service_unavailable_title'),
          message: i18n.t('mobile.production.message.service_unavailable_desc'),
          type: 'warning',
        });
        return;
      }
      apiLogger.error(i18n.t('mobile.production.message.report_failed'), err);
      addNotification({
        title: i18n.t('mobile.production.message.report_failed'),
        message: i18n.t('mobile.production.message.report_failed_retry'),
        type: 'error',
      });
    },
  });
  const updateOrderStatusMutation = useMutation({
    mutationFn: async (params: {
      order: ProductionOrder;
      action: 'start' | 'pause' | 'resume';
    }) => {
      const { order, action } = params;
      // resume 等价于再次 start（后端 start 端点幂等恢复 in_progress）
      if (action === 'pause') {
        const res = await productionApi.pauseOrder(order.id);
        if (!res?.success) {
          throw new Error(res?.message || 'pause order failed');
        }
        return { order, action, data: res.data };
      }
      const res = await productionApi.startOrder(order.id);
      if (!res?.success) {
        throw new Error(res?.message || 'start order failed');
      }
      return { order, action, data: res.data };
    },
    onSuccess: ({ order, action, data }) => {
      // 用后端返回的最新 order 状态覆盖本地缓存，避免与服务端漂移
      queryClient.setQueryData<ProductionOrder[]>(
        [...QUERY_KEYS.AD_HOC.MOBILE_PRODUCTION_ORDERS_BASE, user?.fullName],
        (prev) =>
          (prev ?? []).map((o) => {
            if (o.id !== order.id) return o;
            if (data) return { ...o, ...data };
            if (action === 'start' || action === 'resume') {
              return { ...o, status: 'in_progress', start_time: new Date().toISOString() };
            }
            return { ...o, status: 'paused' };
          })
      );
      addNotification({
        title: i18n.t('mobile.production.message.operation_success'),
        message: i18n.t('mobile.production.message.order_status_updated'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      if (isServiceUnavailableError(err)) {
        apiLogger.warn('[mobile-production] updateOrderStatus 503 service unavailable', err);
        addNotification({
          title: i18n.t('mobile.production.message.service_unavailable_title'),
          message: i18n.t('mobile.production.message.service_unavailable_desc'),
          type: 'warning',
        });
        return;
      }
      apiLogger.error(i18n.t('mobile.production.message.report_failed'), err);
      addNotification({
        title: i18n.t('mobile.production.message.report_failed'),
        message: i18n.t('mobile.production.message.report_failed_retry'),
        type: 'error',
      });
    },
  });
  // Handlers
  const handleRefresh = useCallback(async () => {
    await Promise.all([ordersQuery.refetch(), reportsQuery.refetch(), equipmentQuery.refetch()]);
  }, [ordersQuery, reportsQuery, equipmentQuery]);
  const handleStartReport = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setReportForm({
      quantity: 0,
      good_quantity: 0,
      bad_quantity: 0,
    });
    setReportDialogOpen(true);
  };
  const handleSubmitReport = () => {
    if (reportForm.quantity <= 0) {
      addNotification({
        title: i18n.t('mobile.production.message.enter_quantity'),
        message: i18n.t('mobile.production.message.enter_report_quantity'),
        type: 'warning',
      });
      return;
    }
    if (reportForm.good_quantity + reportForm.bad_quantity !== reportForm.quantity) {
      addNotification({
        title: i18n.t('mobile.production.message.quantity_mismatch'),
        message: i18n.t('mobile.production.message.quantity_mismatch_desc'),
        type: 'warning',
      });
      return;
    }
    submitReportMutation.mutate();
  };
  const handleOrderAction = (order: ProductionOrder, action: 'start' | 'pause' | 'resume') => {
    updateOrderStatusMutation.mutate({ order, action });
  };
  return {
    // State
    searchQuery,
    setSearchQuery,
    reportDialogOpen,
    setReportDialogOpen,
    selectedOrder,
    setSelectedOrder,
    reportForm,
    setReportForm,
    // Query Results
    productionOrders: ordersQuery.data ?? [],
    workReports: reportsQuery.data ?? [],
    equipmentList: equipmentQuery.data ?? [],
    loading: ordersQuery.isLoading || reportsQuery.isLoading || equipmentQuery.isLoading,
    // 空态「服务未接入」信号
    ordersNotConnected,
    reportsNotConnected,
    equipmentNotConnected,
    // Mutations
    submitReportMutation,
    updateOrderStatusMutation,
    // Handlers
    handleRefresh,
    handleStartReport,
    handleSubmitReport,
    handleOrderAction,
  };
};
