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

export const portalApi = {
  async getServices(): Promise<Service[]> {
    const response = await apiClient.get('/services');
    return response.data;
  },

  async getTodos(): Promise<Todo[]> {
    const response = await apiClient.get('/todos');
    return response.data;
  },

  async addTodo(title: string, service: string, due_date: string, priority: string): Promise<Todo> {
    const response = await apiClient.post('/todos', { title, service, due_date, priority });
    return response.data;
  },

  async completeTodo(id: string): Promise<void> {
    await apiClient.post(`/todos/${id}`);
  },

  async getUserInfo(): Promise<UserInfo> {
    const response = await apiClient.get('/user');
    return response.data;
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
};
