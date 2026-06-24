/**
 * 数据交换服务
 * 实现消息总线、事件发布订阅、数据同步等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../hooks/useNotification';

// ============================================
// 一、类型定义
// ============================================

/**
 * 消息类型
 */
export type MessageType =
  | 'command' // 命令
  | 'event' // 事件
  | 'query' // 查询
  | 'response'; // 响应

/**
 * 消息优先级
 */
export type MessagePriority = 'high' | 'normal' | 'low';

/**
 * 消息接口
 */
export interface Message<T = any> {
  id: string;
  type: MessageType;
  event_type?: string;
  payload: T;
  correlation_id?: string;

  metadata: {
    source_system: string;
    source_module: string;
    retry_count: number;
    max_retries: number;
    priority: MessagePriority;
    trace_id?: string;
  };

  timestamp: string;
  expires_at?: string;
}

/**
 * 事件定义
 */
export interface EventDefinition {
  name: string;
  description: string;
  payload_schema: Record<string, any>;
  source_module: string;
  target_modules: string[];
}

/**
 * 同步任务
 */
export interface SyncTask {
  id: string;
  name: string;
  source: {
    type: string;
    entity: string;
  };
  target: {
    type: string;
    entity: string;
  };
  sync_mode: 'full' | 'incremental' | 'realtime';
  status: 'idle' | 'running' | 'completed' | 'failed';
  last_run_at?: string;
  last_run_duration?: number;
  last_run_result?: {
    success: boolean;
    created: number;
    updated: number;
    failed: number;
  };
}

/**
 * 订阅配置
 */
export interface Subscription {
  id: string;
  name: string;
  event_types: string[];
  endpoint: string;
  endpoint_type: 'webhook' | 'queue' | 'service';
  status: 'active' | 'paused' | 'error';
  retry_policy?: {
    max_retries: number;
    retry_delay: number;
  };
}

// ============================================
// 二、预定义事件
// ============================================

/**
 * HRM模块事件
 */
export const HRM_EVENTS = {
  EMPLOYEE_CREATED: 'hrm.employee.created',
  EMPLOYEE_UPDATED: 'hrm.employee.updated',
  EMPLOYEE_RESIGNED: 'hrm.employee.resigned',
  ATTENDANCE_RECORDED: 'hrm.attendance.recorded',
  PAYROLL_CALCULATED: 'hrm.payroll.calculated',
  PAYROLL_APPROVED: 'hrm.payroll.approved',
  PAYROLL_PAID: 'hrm.payroll.paid',
} as const;

/**
 * CRM模块事件
 */
export const CRM_EVENTS = {
  CUSTOMER_CREATED: 'crm.customer.created',
  CUSTOMER_UPDATED: 'crm.customer.updated',
  OPPORTUNITY_CREATED: 'crm.opportunity.created',
  OPPORTUNITY_STAGE_CHANGED: 'crm.opportunity.stage_changed',
  INVOICE_ISSUED: 'crm.invoice.issued',
  INVOICE_RECEIVED: 'crm.invoice.received',
  COLLECTION_RECORDED: 'crm.collection.recorded',
} as const;

/**
 * SRM模块事件
 */
export const SRM_EVENTS = {
  SUPPLIER_CREATED: 'srm.supplier.created',
  SUPPLIER_UPDATED: 'srm.supplier.updated',
  PURCHASE_ORDER_CREATED: 'srm.purchase_order.created',
  PURCHASE_ORDER_APPROVED: 'srm.purchase_order.approved',
  GOODS_RECEIVED: 'srm.goods_received',
  INVOICE_RECEIVED: 'srm.invoice.received',
  PAYMENT_MADE: 'srm.payment.made',
} as const;

/**
 * PM模块事件
 */
export const PM_EVENTS = {
  PROJECT_CREATED: 'pm.project.created',
  PROJECT_STATUS_CHANGED: 'pm.project.status_changed',
  PROJECT_BUDGET_UPDATED: 'pm.project.budget_updated',
  COST_RECORDED: 'pm.cost.recorded',
  MILESTONE_COMPLETED: 'pm.milestone.completed',
  REVENUE_CONFIRMED: 'pm.revenue.confirmed',
} as const;

/**
 * ERP模块事件
 */
export const ERP_EVENTS = {
  VOUCHER_CREATED: 'erp.voucher.created',
  VOUCHER_APPROVED: 'erp.voucher.approved',
  VOUCHER_POSTED: 'erp.voucher.posted',
  VOUCHER_REVERSED: 'erp.voucher.reversed',
  PERIOD_OPENED: 'erp.period.opened',
  PERIOD_CLOSED: 'erp.period.closed',
  ASSET_DEPRECIATION: 'erp.asset.depreciation',
} as const;

/**
 * 所有事件集合
 */
export const ALL_EVENTS = {
  ...HRM_EVENTS,
  ...CRM_EVENTS,
  ...SRM_EVENTS,
  ...PM_EVENTS,
  ...ERP_EVENTS,
} as const;

// ============================================
// 三、API接口
// ============================================

const exchangeApi = {
  // 消息发送
  sendMessage: (topic: string, message: any) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.post(`/api/integration/messages/${topic}`, message)
    ),

  publishEvent: (eventType: string, payload: any) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.post('/api/integration/events', {
        event_type: eventType,
        payload,
      })
    ),

  // 同步任务
  getSyncTasks: () =>
    import('../api/client').then((c) => c.apiClient.integration.get('/api/integration/sync/tasks')),

  triggerSync: (taskId: string, params?: { full_sync?: boolean }) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.post(`/api/integration/sync/tasks/${taskId}/trigger`, params)
    ),

  getSyncHistory: (params?: {
    task_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.get('/api/integration/sync/history', { params })
    ),

  // 订阅管理
  getSubscriptions: (params?: { event_type?: string; status?: string }) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.get('/api/integration/subscriptions', { params })
    ),

  createSubscription: (data: Partial<Subscription>) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.post('/api/integration/subscriptions', data)
    ),

  updateSubscription: (id: string, data: Partial<Subscription>) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.put(`/api/integration/subscriptions/${id}`, data)
    ),

  deleteSubscription: (id: string) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.delete(`/api/integration/subscriptions/${id}`)
    ),

  // 事件定义
  getEventDefinitions: () =>
    import('../api/client').then((c) =>
      c.apiClient.integration.get('/api/integration/events/definitions')
    ),

  // 消息监控
  getMessages: (params?: {
    topic?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.get('/api/integration/messages', { params })
    ),

  getDeadLetterMessages: (params?: { page?: number; page_size?: number }) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.get('/api/integration/dead-letter', { params })
    ),

  retryDeadLetter: (messageId: string) =>
    import('../api/client').then((c) =>
      c.apiClient.integration.post(`/api/integration/dead-letter/${messageId}/retry`, {})
    ),
};

// ============================================
// 四、Hooks
// ============================================

/**
 * 发布事件
 */
export function usePublishEvent() {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: ({ eventType, payload }: { eventType: string; payload: any }) =>
      exchangeApi.publishEvent(eventType, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exchange', 'events'] });
      success(variables.eventType);
    },
    onError: (error: any, variables) => {
      notifyError(error.message || `事件 ${variables.eventType} 发布失败`);
    },
  });
}

/**
 * 获取同步任务列表
 */
export function useSyncTasks() {
  return useQuery({
    queryKey: ['exchange', 'sync-tasks'],
    queryFn: () => exchangeApi.getSyncTasks(),
    staleTime: 60 * 1000,
  });
}

/**
 * 触发同步任务
 */
export function useTriggerSync() {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: ({ taskId, fullSync }: { taskId: string; fullSync?: boolean }) =>
      exchangeApi.triggerSync(taskId, { full_sync: fullSync }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exchange', 'sync-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['exchange', 'sync-history'] });
      success(`同步任务 ${variables.taskId} 已触发`);
    },
    onError: (error) => {
      notifyError(error.message || '触发同步任务失败');
    },
  });
}

/**
 * 获取同步历史
 */
export function useSyncHistory(params?: {
  task_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['exchange', 'sync-history', params],
    queryFn: () => exchangeApi.getSyncHistory(params),
    staleTime: 30 * 1000,
  });
}

/**
 * 获取订阅列表
 */
export function useSubscriptions(params?: { event_type?: string; status?: string }) {
  return useQuery({
    queryKey: ['exchange', 'subscriptions', params],
    queryFn: () => exchangeApi.getSubscriptions(params),
    staleTime: 60 * 1000,
  });
}

/**
 * 创建订阅
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: (data: Partial<Subscription>) => exchangeApi.createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['exchange', 'subscriptions'],
      });
      success('新的数据订阅已创建');
    },
    onError: (error) => {
      notifyError(error.message || '创建数据订阅失败');
    },
  });
}

/**
 * 更新订阅
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subscription> }) =>
      exchangeApi.updateSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['exchange', 'subscriptions'],
      });
      success('数据订阅已更新');
    },
    onError: (error) => {
      notifyError(error.message || '更新数据订阅失败');
    },
  });
}

/**
 * 删除订阅
 */
export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: (id: string) => exchangeApi.deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['exchange', 'subscriptions'],
      });
      success('数据订阅已删除');
    },
    onError: (error) => {
      notifyError(error.message || '删除数据订阅失败');
    },
  });
}

/**
 * 获取事件定义
 */
export function useEventDefinitions() {
  return useQuery({
    queryKey: ['exchange', 'event-definitions'],
    queryFn: () => exchangeApi.getEventDefinitions(),
    staleTime: 10 * 60 * 1000, // 10分钟
  });
}

/**
 * 获取消息列表
 */
export function useMessages(params?: {
  topic?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['exchange', 'messages', params],
    queryFn: () => exchangeApi.getMessages(params),
    staleTime: 10 * 1000,
  });
}

/**
 * 获取死信消息
 */
export function useDeadLetterMessages(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ['exchange', 'dead-letter', params],
    queryFn: () => exchangeApi.getDeadLetterMessages(params),
    staleTime: 10 * 1000,
  });
}

/**
 * 重试死信消息
 */
export function useRetryDeadLetter() {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: (messageId: string) => exchangeApi.retryDeadLetter(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange', 'dead-letter'] });
      success('死信消息已重新投递');
    },
    onError: (error) => {
      notifyError(error.message || '消息重试失败');
    },
  });
}

// ============================================
// 五、事件总线Hook
// ============================================

/**
 * 事件总线Hook
 * 用于组件中发布和订阅事件
 */
export function useEventBus() {
  const publishEvent = usePublishEvent();

  /**
   * 发布HRM事件
   */
  const publishHrmEvent = (eventName: keyof typeof HRM_EVENTS, payload: any) => {
    return publishEvent.mutateAsync({
      eventType: HRM_EVENTS[eventName],
      payload,
    });
  };

  /**
   * 发布CRM事件
   */
  const publishCrmEvent = (eventName: keyof typeof CRM_EVENTS, payload: any) => {
    return publishEvent.mutateAsync({
      eventType: CRM_EVENTS[eventName],
      payload,
    });
  };

  /**
   * 发布SRM事件
   */
  const publishSrmEvent = (eventName: keyof typeof SRM_EVENTS, payload: any) => {
    return publishEvent.mutateAsync({
      eventType: SRM_EVENTS[eventName],
      payload,
    });
  };

  /**
   * 发布PM事件
   */
  const publishPmEvent = (eventName: keyof typeof PM_EVENTS, payload: any) => {
    return publishEvent.mutateAsync({
      eventType: PM_EVENTS[eventName],
      payload,
    });
  };

  /**
   * 发布ERP事件
   */
  const publishErpEvent = (eventName: keyof typeof ERP_EVENTS, payload: any) => {
    return publishEvent.mutateAsync({
      eventType: ERP_EVENTS[eventName],
      payload,
    });
  };

  return {
    publish: publishEvent.mutateAsync,
    publishHrmEvent,
    publishCrmEvent,
    publishSrmEvent,
    publishPmEvent,
    publishErpEvent,
    isPublishing: publishEvent.isPending,
  };
}

// ============================================
// 六、导出
// ============================================

export { exchangeApi };
