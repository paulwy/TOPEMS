import axios, { AxiosInstance } from 'axios';

export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

class ApiClient {
  private clients: Record<string, AxiosInstance> = {};
  private baseURLs = {
    iam: 'http://localhost:8002',
    doc: 'http://localhost:8001',
    ai: 'http://localhost:8003',
    flow: 'http://localhost:8004',
  };

  constructor() {
    Object.entries(this.baseURLs).forEach(([name, baseURL]) => {
      this.clients[name] = axios.create({
        baseURL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.clients[name].interceptors.response.use(
        (response) => response.data,
        (error) => {
          console.error(`API Error (${name}):`, error);
          return Promise.reject(error);
        }
      );
    });
  }

  get iam() {
    return this.clients.iam;
  }

  get doc() {
    return this.clients.doc;
  }

  get ai() {
    return this.clients.ai;
  }

  get flow() {
    return this.clients.flow;
  }

  setAuthToken(token: string) {
    Object.values(this.clients).forEach(client => {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    });
  }

  clearAuthToken() {
    Object.values(this.clients).forEach(client => {
      delete client.defaults.headers.common['Authorization'];
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
