import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

const healthClient = axios.create({
  baseURL: '/',
  timeout: 5000,
});

export interface Service {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  status: string;
}

export interface Todo {
  id: string;
  title: string;
  service: string;
  service_name: string;
  due_date: string;
  priority: string;
  completed: boolean;
  todo_type: 'personal' | 'approval' | 'notification' | 'system';
  link_url?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  role: string;
  last_login: string;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ServiceHealth {
  service_name: string;
  status: HealthStatus;
  message: string;
  timestamp: string;
  uptime?: string;
  dependencies?: DependencyHealth[];
}

export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  message: string;
}

export interface HealthCheckResponse {
  overall_status: HealthStatus;
  services: ServiceHealth[];
  timestamp: string;
}

export interface HealthCheckResult {
  service_name: string;
  status: HealthStatus;
  message: string;
  response_time?: number;
}

export interface MonitoringService {
  service_name: string;
  status: string;
  response_time_ms: number;
  last_check: string;
  message?: string;
}

export interface MonitoringMetrics {
  requests_total: number;
  requests_success: number;
  requests_failed: number;
  avg_response_time_ms: number;
  active_connections: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

export interface Alert {
  id: string;
  rule_name: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  triggered_at: number;
  acknowledged: boolean;
}

export interface LogEntry {
  timestamp: number;
  level: string;
  service: string;
  message: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  service: string;
  service_name: string;
  notification_type: 'approval' | 'system' | 'info' | 'warning';
  read: boolean;
  created_at: number;
  link_url?: string;
}

export const portalApi = {
  async getServices(): Promise<Service[]> {
    const response = await apiClient.get('/services');
    return response.data.data;
  },

  async getTodos(): Promise<Todo[]> {
    const response = await apiClient.get('/todos');
    return response.data.data;
  },

  async addTodo(title: string, service: string, due_date: string, priority: string): Promise<Todo> {
    const response = await apiClient.post('/todos', { title, service, due_date, priority });
    return response.data.data;
  },

  async completeTodo(id: string): Promise<void> {
    await apiClient.post(`/todos/${id}`);
  },

  async deleteTodo(id: string): Promise<void> {
    await apiClient.delete(`/todos/${id}`);
  },

  async getUserInfo(): Promise<UserInfo> {
    const response = await apiClient.get('/user');
    return response.data.data;
  },

  async getServiceHealth(serviceName: string, healthUrl: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await healthClient.get(healthUrl);
      const responseTime = Date.now() - start;
      
      if (response.status === 200) {
        return {
          service_name: serviceName,
          status: 'healthy',
          message: response.data.message || 'Service is healthy',
          response_time: responseTime,
        };
      } else {
        return {
          service_name: serviceName,
          status: 'degraded',
          message: `HTTP ${response.status}`,
          response_time: responseTime,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        service_name: serviceName,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        response_time: responseTime,
      };
    }
  },

  async getAllServicesHealth(services: Service[]): Promise<HealthCheckResult[]> {
    const healthChecks = services.map(async (service) => {
      const healthUrl = `${service.url}/health`;
      return portalApi.getServiceHealth(service.name, healthUrl);
    });
    
    return Promise.all(healthChecks);
  },

  async getMonitoringServices(): Promise<MonitoringService[]> {
    const response = await apiClient.get('/monitoring/services');
    return response.data.data;
  },

  async getMonitoringMetrics(): Promise<MonitoringMetrics> {
    const response = await apiClient.get('/monitoring/metrics');
    return response.data.data;
  },

  async getMonitoringAlerts(): Promise<Alert[]> {
    const response = await apiClient.get('/monitoring/alerts');
    return response.data.data;
  },

  async acknowledgeAlert(id: string): Promise<void> {
    await apiClient.post(`/monitoring/alerts/${id}`);
  },

  async getMonitoringLogs(): Promise<LogEntry[]> {
    const response = await apiClient.get('/monitoring/logs');
    return response.data.data;
  },

  async getNotifications(): Promise<Notification[]> {
    const response = await apiClient.get('/notifications');
    return response.data.data;
  },

  async markNotificationRead(id: string): Promise<void> {
    await apiClient.post(`/notifications/${id}`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read');
  },
};