/**
 * MobileProduction state management and API calls hook
 * @refactor-split Extracted from MobileProductionPage.tsx (V79 Phase 2)
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useNotificationStore } from '@/store';
import { mobileApi, type ProductionOrder, type WorkReport, type Equipment } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';

export interface ReportForm {
  quantity: number;
  good_quantity: number;
  bad_quantity: number;
}

export const useMobileProduction = () => {
  const { t } = useTranslation();
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

  // Queries
  const ordersQuery = useQuery<ProductionOrder[]>({
    queryKey: ['mobile-production-orders', user?.fullName],
    queryFn: async () => {
      const mockOrders: ProductionOrder[] = [
        {
          id: '1',
          orderNo: 'PO-2024-06-001',
          product_name: t('mobile.production.product.smart_sensor_module'),
          quantity: 500,
          completed_quantity: 320,
          status: 'in_progress',
          workstation: t('mobile.production.workstation.a_line_station_1'),
          start_time: '2024-06-28T08:00:00Z',
          due_date: '2024-06-30',
          created_at: '2024-06-25T09:00:00Z',
        },
        {
          id: '2',
          orderNo: 'PO-2024-06-002',
          product_name: t('mobile.production.product.data_collector'),
          quantity: 200,
          completed_quantity: 0,
          status: 'pending',
          workstation: t('mobile.production.workstation.b_line_station_3'),
          due_date: '2024-07-02',
          created_at: '2024-06-27T10:00:00Z',
        },
        {
          id: '3',
          orderNo: 'PO-2024-05-098',
          product_name: t('mobile.production.product.pcb_assembly'),
          quantity: 1000,
          completed_quantity: 1000,
          status: 'completed',
          workstation: t('mobile.production.workstation.a_line_station_2'),
          start_time: '2024-06-20T08:00:00Z',
          end_time: '2024-06-26T17:00:00Z',
          due_date: '2024-06-27',
          created_at: '2024-06-18T09:00:00Z',
        },
        {
          id: '4',
          orderNo: 'PO-2024-06-003',
          product_name: t('mobile.production.product.power_module'),
          quantity: 300,
          completed_quantity: 150,
          status: 'paused',
          workstation: t('mobile.production.workstation.c_line_station_1'),
          start_time: '2024-06-27T08:00:00Z',
          due_date: '2024-07-01',
          created_at: '2024-06-26T14:00:00Z',
        },
        {
          id: '5',
          orderNo: 'PO-2024-06-004',
          product_name: t('mobile.production.product.communication_module'),
          quantity: 400,
          completed_quantity: 0,
          status: 'pending',
          workstation: t('mobile.production.workstation.b_line_station_2'),
          due_date: '2024-07-03',
          created_at: '2024-06-28T08:30:00Z',
        },
      ];
      return mockOrders;
    },
    staleTime: 5 * 60 * 1000,
  });

  const reportsQuery = useQuery<WorkReport[]>({
    queryKey: ['mobile-production-reports', user?.fullName],
    queryFn: async () => {
      const mockReports: WorkReport[] = [
        {
          id: '1',
          order_id: '1',
          orderNo: 'PO-2024-06-001',
          workstation: t('mobile.production.workstation.a_line_station_1'),
          operator: user?.fullName || '',
          quantity: 100,
          good_quantity: 98,
          bad_quantity: 2,
          start_time: '2024-06-28T08:00:00Z',
          end_time: '2024-06-28T10:30:00Z',
          duration: 150,
          created_at: '2024-06-28T10:30:00Z',
        },
        {
          id: '2',
          order_id: '1',
          orderNo: 'PO-2024-06-001',
          workstation: t('mobile.production.workstation.a_line_station_1'),
          operator: user?.fullName || '',
          quantity: 120,
          good_quantity: 118,
          bad_quantity: 2,
          start_time: '2024-06-28T10:45:00Z',
          end_time: '2024-06-28T13:15:00Z',
          duration: 150,
          created_at: '2024-06-28T13:15:00Z',
        },
        {
          id: '3',
          order_id: '3',
          orderNo: 'PO-2024-05-098',
          workstation: t('mobile.production.workstation.a_line_station_2'),
          operator: t('mobile.production.operator.li_hua'),
          quantity: 500,
          good_quantity: 495,
          bad_quantity: 5,
          start_time: '2024-06-25T08:00:00Z',
          end_time: '2024-06-25T17:00:00Z',
          duration: 540,
          created_at: '2024-06-25T17:00:00Z',
        },
      ];
      return mockReports;
    },
    staleTime: 5 * 60 * 1000,
  });

  const equipmentQuery = useQuery<Equipment[]>({
    queryKey: ['mobile-production-equipment'],
    queryFn: async () => {
      const mockEquipment: Equipment[] = [
        {
          id: '1',
          equipment_no: 'EQ-001',
          name: t('mobile.production.equipment.smt_1'),
          type: t('mobile.production.equipment_type.production'),
          status: 'running',
          location: t('mobile.production.location.a_line'),
          last_maintenance: '2024-06-20',
          next_maintenance: '2024-07-20',
          running_hours: 12580,
        },
        {
          id: '2',
          equipment_no: 'EQ-002',
          name: t('mobile.production.equipment.reflow_oven'),
          type: t('mobile.production.equipment_type.production'),
          status: 'running',
          location: t('mobile.production.location.a_line'),
          last_maintenance: '2024-06-15',
          next_maintenance: '2024-07-15',
          running_hours: 9876,
        },
        {
          id: '3',
          equipment_no: 'EQ-003',
          name: t('mobile.production.equipment.cnc_3'),
          type: t('mobile.production.equipment_type.processing'),
          status: 'maintenance',
          location: t('mobile.production.location.machining_workshop'),
          last_maintenance: '2024-06-28',
          next_maintenance: '2024-07-28',
          running_hours: 15600,
        },
        {
          id: '4',
          equipment_no: 'EQ-004',
          name: t('mobile.production.equipment.injection_2'),
          type: t('mobile.production.equipment_type.molding'),
          status: 'idle',
          location: t('mobile.production.location.b_line'),
          last_maintenance: '2024-06-10',
          next_maintenance: '2024-07-10',
          running_hours: 8500,
        },
        {
          id: '5',
          equipment_no: 'EQ-005',
          name: t('mobile.production.equipment.aging_test_bench'),
          type: t('mobile.production.equipment_type.testing'),
          status: 'fault',
          location: t('mobile.production.location.quality_dept'),
          last_maintenance: '2024-05-28',
          next_maintenance: '2024-06-28',
          running_hours: 6780,
        },
      ];
      return mockEquipment;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Error logging
  useEffect(() => {
    if (ordersQuery.isError) {
      apiLogger.error(t('mobile.production.message.load_orders_failed'), ordersQuery.error);
    }
    if (reportsQuery.isError) {
      apiLogger.error(t('mobile.production.message.load_reports_failed'), reportsQuery.error);
    }
    if (equipmentQuery.isError) {
      apiLogger.error(t('mobile.production.message.load_equipment_failed'), equipmentQuery.error);
    }
  }, [
    ordersQuery.isError,
    ordersQuery.error,
    reportsQuery.isError,
    reportsQuery.error,
    equipmentQuery.isError,
    equipmentQuery.error,
    t,
  ]);

  // Mutations
  const submitReportMutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const now = new Date();
      const newReport: WorkReport = {
        id: Date.now().toString(),
        order_id: selectedOrder?.id || '',
        orderNo: selectedOrder?.orderNo || '',
        workstation: selectedOrder?.workstation || '',
        operator: user?.fullName || '',
        quantity: reportForm.quantity,
        good_quantity: reportForm.good_quantity,
        bad_quantity: reportForm.bad_quantity,
        start_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        end_time: now.toISOString(),
        duration: 120,
        created_at: now.toISOString(),
      };
      return newReport;
    },
    onSuccess: (newReport) => {
      queryClient.setQueryData<WorkReport[]>(
        ['mobile-production-reports', user?.fullName],
        (prev) => [newReport, ...(prev ?? [])]
      );
      if (selectedOrder) {
        queryClient.setQueryData<ProductionOrder[]>(
          ['mobile-production-orders', user?.fullName],
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
        title: t('mobile.production.message.report_success'),
        message: t('mobile.production.message.reported_count', { count: reportForm.quantity }),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('mobile.production.message.report_failed'), err);
      addNotification({
        title: t('mobile.production.message.report_failed'),
        message: t('mobile.production.message.report_failed_retry'),
        type: 'error',
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async (params: {
      order: ProductionOrder;
      action: 'start' | 'pause' | 'resume';
    }) => {
      return params;
    },
    onSuccess: ({ order, action }) => {
      queryClient.setQueryData<ProductionOrder[]>(
        ['mobile-production-orders', user?.fullName],
        (prev) =>
          (prev ?? []).map((o) => {
            if (o.id === order.id) {
              if (action === 'start') {
                return { ...o, status: 'in_progress', start_time: new Date().toISOString() };
              } else if (action === 'pause') {
                return { ...o, status: 'paused' };
              } else {
                return { ...o, status: 'in_progress' };
              }
            }
            return o;
          })
      );
      addNotification({
        title: t('mobile.production.message.operation_success'),
        message: t('mobile.production.message.order_status_updated'),
        type: 'success',
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
        title: t('mobile.production.message.enter_quantity'),
        message: t('mobile.production.message.enter_report_quantity'),
        type: 'warning',
      });
      return;
    }
    if (reportForm.good_quantity + reportForm.bad_quantity !== reportForm.quantity) {
      addNotification({
        title: t('mobile.production.message.quantity_mismatch'),
        message: t('mobile.production.message.quantity_mismatch_desc'),
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

    // Mutations
    submitReportMutation,

    // Handlers
    handleRefresh,
    handleStartReport,
    handleSubmitReport,
    handleOrderAction,
  };
};
