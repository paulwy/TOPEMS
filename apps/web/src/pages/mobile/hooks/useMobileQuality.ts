/**
 * MobileQuality state management and API calls hook
 * @refactor-split Extracted from MobileQualityPage.tsx
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useNotificationStore } from '@/store';
import { type QualityTask, type DefectRecord } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';

export interface DefectForm {
  defect_type: string;
  severity: DefectRecord['severity'];
  quantity: number;
  description: string;
}

export type TaskAction = 'start' | 'pass' | 'fail';
export type ChipColor = 'warning' | 'primary' | 'success' | 'error' | 'info' | 'default';
export type SeverityChipColor = 'warning' | 'error' | 'default';

export const useMobileQuality = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<QualityTask | null>(null);
  const [defectForm, setDefectForm] = useState<DefectForm>({
    defect_type: '',
    severity: 'minor',
    quantity: 1,
    description: '',
  });

  const tabs = useMemo(
    () => [t('mobile.quality.tabs.tasks'), t('mobile.quality.tabs.defect_report')],
    [t]
  );

  const tasksQuery = useQuery<QualityTask[]>({
    queryKey: ['mobile-quality-tasks', user?.fullName],
    queryFn: async () => {
      const mockTasks: QualityTask[] = [
        {
          id: '1',
          task_no: 'QT-2024-06-001',
          type: 'incoming',
          product_name: t('mobile.quality.product.resistor_10k'),
          batch_no: 'B20240601',
          quantity: 5000,
          status: 'pending',
          inspector: user?.fullName || '',
          due_date: '2024-06-28',
          created_at: '2024-06-28T08:00:00Z',
        },
        {
          id: '2',
          task_no: 'QT-2024-06-002',
          type: 'process',
          product_name: t('mobile.quality.product.pcb_soldering'),
          batch_no: 'B20240602',
          quantity: 1000,
          status: 'in_progress',
          inspector: user?.fullName || '',
          due_date: '2024-06-28',
          created_at: '2024-06-28T09:30:00Z',
        },
        {
          id: '3',
          task_no: 'QT-2024-06-003',
          type: 'finished',
          product_name: t('mobile.quality.product.smart_sensor_module'),
          batch_no: 'FG20240625',
          quantity: 320,
          status: 'passed',
          inspector: t('mobile.quality.operator.li_hua'),
          due_date: '2024-06-27',
          created_at: '2024-06-27T10:00:00Z',
        },
        {
          id: '4',
          task_no: 'QT-2024-06-004',
          type: 'outgoing',
          product_name: t('mobile.quality.product.data_collector'),
          batch_no: 'FG20240620',
          quantity: 150,
          status: 'failed',
          inspector: t('mobile.quality.operator.wang_qiang'),
          due_date: '2024-06-26',
          created_at: '2024-06-26T14:00:00Z',
        },
        {
          id: '5',
          task_no: 'QT-2024-06-005',
          type: 'incoming',
          product_name: t('mobile.quality.product.plastic_shell'),
          batch_no: 'B20240603',
          quantity: 2000,
          status: 'pending',
          inspector: user?.fullName || '',
          due_date: '2024-06-29',
          created_at: '2024-06-28T10:00:00Z',
        },
      ];
      return mockTasks;
    },
    staleTime: 5 * 60 * 1000,
  });
  const qualityTasks = tasksQuery.data ?? [];

  const defectsQuery = useQuery<DefectRecord[]>({
    queryKey: ['mobile-quality-defects', user?.fullName],
    queryFn: async () => {
      const mockDefects: DefectRecord[] = [
        {
          id: '1',
          task_id: 'QT-2024-06-002',
          product_name: t('mobile.quality.product.pcb_soldering'),
          batch_no: 'B20240602',
          defect_type: t('mobile.quality.defect_type.cold_solder'),
          severity: 'major',
          quantity: 5,
          description: t('mobile.quality.defect_desc.cold_solder'),
          reporter: user?.fullName || '',
          reported_at: '2024-06-28T10:30:00Z',
          status: 'open',
        },
        {
          id: '2',
          task_id: 'QT-2024-06-004',
          product_name: t('mobile.quality.product.data_collector'),
          batch_no: 'FG20240620',
          defect_type: t('mobile.quality.defect_type.scratch'),
          severity: 'minor',
          quantity: 3,
          description: t('mobile.quality.defect_desc.scratch'),
          reporter: t('mobile.quality.operator.wang_qiang'),
          reported_at: '2024-06-26T15:00:00Z',
          status: 'closed',
        },
        {
          id: '3',
          task_id: 'QT-2024-06-002',
          product_name: t('mobile.quality.product.pcb_soldering'),
          batch_no: 'B20240602',
          defect_type: t('mobile.quality.defect_type.component_offset'),
          severity: 'critical',
          quantity: 2,
          description: t('mobile.quality.defect_desc.component_offset'),
          reporter: user?.fullName || '',
          reported_at: '2024-06-28T11:00:00Z',
          status: 'processing',
        },
      ];
      return mockDefects;
    },
    staleTime: 5 * 60 * 1000,
  });
  const defectRecords = defectsQuery.data ?? [];
  const loading = tasksQuery.isLoading || defectsQuery.isLoading;

  useEffect(() => {
    if (tasksQuery.isError) {
      apiLogger.error(t('mobile.quality.message.load_tasks_failed'), tasksQuery.error);
    }
    if (defectsQuery.isError) {
      apiLogger.error(t('mobile.quality.message.load_defects_failed'), defectsQuery.error);
    }
  }, [tasksQuery.isError, tasksQuery.error, defectsQuery.isError, defectsQuery.error, t]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([tasksQuery.refetch(), defectsQuery.refetch()]);
  }, [tasksQuery, defectsQuery]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const getTypeLabel = useCallback(
    (type: string) => {
      const map: Record<string, string> = {
        incoming: t('mobile.quality.type.incoming'),
        process: t('mobile.quality.type.process'),
        finished: t('mobile.quality.type.finished'),
        outgoing: t('mobile.quality.type.outgoing'),
      };
      return map[type] || type;
    },
    [t]
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        pending: t('mobile.quality.status.pending'),
        in_progress: t('mobile.quality.status.in_progress'),
        passed: t('mobile.quality.status.passed'),
        failed: t('mobile.quality.status.failed'),
        open: t('mobile.quality.status.open'),
        processing: t('mobile.quality.status.processing'),
        closed: t('mobile.quality.status.closed'),
      };
      return map[status] || status;
    },
    [t]
  );

  const getStatusColor = useCallback((status: string): ChipColor => {
    const map: Record<string, ChipColor> = {
      pending: 'warning',
      in_progress: 'primary',
      passed: 'success',
      failed: 'error',
      open: 'warning',
      processing: 'primary',
      closed: 'success',
    };
    return map[status] || 'default';
  }, []);

  const getSeverityLabel = useCallback(
    (severity: string) => {
      const map: Record<string, string> = {
        minor: t('mobile.quality.severity.minor'),
        major: t('mobile.quality.severity.major'),
        critical: t('mobile.quality.severity.critical'),
      };
      return map[severity] || severity;
    },
    [t]
  );

  const getSeverityColor = useCallback((severity: string): SeverityChipColor => {
    const map: Record<string, SeverityChipColor> = {
      minor: 'warning',
      major: 'error',
      critical: 'error',
    };
    return map[severity] || 'default';
  }, []);

  const filteredTasks = useMemo(
    () =>
      qualityTasks.filter(
        (task) =>
          !searchQuery ||
          task.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.task_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.batch_no.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [qualityTasks, searchQuery]
  );

  const handleReportDefect = useCallback((task: QualityTask) => {
    setSelectedTask(task);
    setDefectForm({
      defect_type: '',
      severity: 'minor',
      quantity: 1,
      description: '',
    });
    setDefectDialogOpen(true);
  }, []);

  const submitDefectMutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newDefect: DefectRecord = {
        id: Date.now().toString(),
        task_id: selectedTask?.task_no || '',
        product_name: selectedTask?.product_name || '',
        batch_no: selectedTask?.batch_no || '',
        defect_type: defectForm.defect_type,
        severity: defectForm.severity,
        quantity: defectForm.quantity,
        description: defectForm.description,
        reporter: user?.fullName || '',
        reported_at: new Date().toISOString(),
        status: 'open',
      };
      return newDefect;
    },
    onSuccess: (newDefect) => {
      queryClient.setQueryData<DefectRecord[]>(
        ['mobile-quality-defects', user?.fullName],
        (prev) => [newDefect, ...(prev ?? [])]
      );
      setDefectDialogOpen(false);
      addNotification({
        title: t('mobile.quality.message.report_success'),
        message: t('mobile.quality.message.defect_reported'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('mobile.quality.message.report_failed'), err);
      addNotification({
        title: t('mobile.quality.message.report_failed_title'),
        message: t('mobile.quality.message.report_failed_retry'),
        type: 'error',
      });
    },
  });

  const handleSubmitDefect = useCallback(() => {
    if (!defectForm.defect_type || !defectForm.description) {
      addNotification({
        title: t('mobile.quality.message.fill_complete'),
        message: t('mobile.quality.message.fill_type_desc'),
        type: 'warning',
      });
      return;
    }
    submitDefectMutation.mutate();
  }, [defectForm, submitDefectMutation, addNotification, t]);

  const updateTaskStatusMutation = useMutation({
    mutationFn: async (params: { task: QualityTask; action: TaskAction }) => {
      return params;
    },
    onSuccess: ({ task, action }) => {
      queryClient.setQueryData<QualityTask[]>(['mobile-quality-tasks', user?.fullName], (prev) =>
        (prev ?? []).map((tItem) => {
          if (tItem.id === task.id) {
            if (action === 'start') {
              return { ...tItem, status: 'in_progress' };
            } else if (action === 'pass') {
              return { ...tItem, status: 'passed' };
            } else {
              return { ...tItem, status: 'failed' };
            }
          }
          return tItem;
        })
      );
      addNotification({
        title: t('mobile.quality.message.operation_success'),
        message: t('mobile.quality.message.task_status_updated'),
        type: 'success',
      });
    },
  });

  const handleTaskAction = useCallback(
    (task: QualityTask, action: TaskAction) => {
      updateTaskStatusMutation.mutate({ task, action });
    },
    [updateTaskStatusMutation]
  );

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    defectDialogOpen,
    setDefectDialogOpen,
    selectedTask,
    setSelectedTask,
    defectForm,
    setDefectForm,
    tabs,
    qualityTasks,
    defectRecords,
    loading,
    filteredTasks,
    handleRefresh,
    handleTabChange,
    getTypeLabel,
    getStatusLabel,
    getStatusColor,
    getSeverityLabel,
    getSeverityColor,
    handleReportDefect,
    handleSubmitDefect,
    handleTaskAction,
    submitDefectMutation,
    updateTaskStatusMutation,
  };
};
