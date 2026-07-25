/**
 * V48.0 零代码平台 — API 可视化对接
 *
 * 提供可视化 API 对接能力，支持:
 * - API 端点注册与管理
 * - 请求/响应结构可视化
 * - 字段映射与类型转换
 * - 实时调试与 Mock
 * - 连接健康检查
 *
 * @example
 * import { apiVisualIntegration } from '@/utils/zerocode';
 *
 * apiVisualIntegration.registerEndpoint({
 *   id: 'user-list',
 *   method: 'GET',
 *   path: '/api/users',
 *   responseSchema: { type: 'array', items: { $ref: 'User' } },
 * });
 */

// ==================== 枚举 ====================

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum EndpointStatus {
  Draft = 'draft',
  Active = 'active',
  Deprecated = 'deprecated',
  Archived = 'archived',
}

export enum FieldType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Date = 'date',
  DateTime = 'datetime',
  Object = 'object',
  Array = 'array',
  Enum = 'enum',
  Reference = 'reference',
}

export enum MappingDirection {
  Request = 'request',
  Response = 'response',
  Both = 'both',
}

export enum ConnectionStatus {
  Unknown = 'unknown',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Degraded = 'degraded',
}

// ==================== 接口 ====================

export interface SchemaField {
  name: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
  enumValues?: string[];
  ref?: string;
  children?: SchemaField[];
}

export interface ApiSchema {
  name: string;
  fields: SchemaField[];
  description?: string;
}

export interface FieldMapping {
  id: string;
  direction: MappingDirection;
  sourceField: string;
  targetField: string;
  transform?: string;
  required?: boolean;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  status: EndpointStatus;
  requestSchema?: ApiSchema;
  responseSchema: ApiSchema;
  mappings: FieldMapping[];
  mockEnabled: boolean;
  mockData?: unknown;
  description?: string;
  tags: string[];
  timeout?: number;
  headers: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface DebugRequest {
  endpointId: string;
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface DebugResponse {
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: unknown;
  error?: string;
}

export interface DebugSession {
  id: string;
  request: DebugRequest;
  response?: DebugResponse;
  status: 'pending' | 'success' | 'error';
  startedAt: number;
  finishedAt?: number;
}

export interface ConnectionHealth {
  id: string;
  endpointId: string;
  status: ConnectionStatus;
  latency: number;
  lastCheckedAt: number;
  message?: string;
}

// ==================== API 可视化对接器 ====================

export class ApiVisualIntegration {
  private endpoints: Map<string, ApiEndpoint> = new Map();
  private schemas: Map<string, ApiSchema> = new Map();
  private debugSessions: Map<string, DebugSession> = new Map();
  private healthCache: Map<string, ConnectionHealth> = new Map();

  // ==================== 端点管理 ====================

  registerEndpoint(
    config: Omit<
      ApiEndpoint,
      'id' | 'status' | 'mappings' | 'mockEnabled' | 'createdAt' | 'updatedAt' | 'headers' | 'tags'
    > & {
      id?: string;
      tags?: string[];
      headers?: Record<string, string>;
      mockEnabled?: boolean;
    }
  ): ApiEndpoint {
    const now = Date.now();
    const endpoint: ApiEndpoint = {
      id: config.id ?? `ep-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name: config.name,
      method: config.method,
      path: config.path,
      status: EndpointStatus.Draft,
      requestSchema: config.requestSchema,
      responseSchema: config.responseSchema,
      mappings: [],
      mockEnabled: config.mockEnabled ?? false,
      mockData: config.mockData,
      description: config.description,
      tags: config.tags ?? [],
      timeout: config.timeout,
      headers: config.headers ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.endpoints.set(endpoint.id, endpoint);
    if (endpoint.requestSchema) {
      this.schemas.set(endpoint.requestSchema.name, endpoint.requestSchema);
    }
    this.schemas.set(endpoint.responseSchema.name, endpoint.responseSchema);
    return this.cloneEndpoint(endpoint);
  }

  updateEndpoint(
    id: string,
    patch: Partial<Omit<ApiEndpoint, 'id' | 'createdAt'>>
  ): ApiEndpoint | null {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return null;
    const updated: ApiEndpoint = {
      ...endpoint,
      ...patch,
      id: endpoint.id,
      createdAt: endpoint.createdAt,
      updatedAt: Date.now(),
    };
    this.endpoints.set(id, updated);
    return this.cloneEndpoint(updated);
  }

  removeEndpoint(id: string): boolean {
    return this.endpoints.delete(id);
  }

  getEndpoint(id: string): ApiEndpoint | undefined {
    const ep = this.endpoints.get(id);
    return ep ? this.cloneEndpoint(ep) : undefined;
  }

  listEndpoints(status?: EndpointStatus, tag?: string): ApiEndpoint[] {
    let result = Array.from(this.endpoints.values());
    if (status) result = result.filter((e) => e.status === status);
    if (tag) result = result.filter((e) => e.tags.includes(tag));
    return result.map((e) => this.cloneEndpoint(e));
  }

  setEndpointStatus(id: string, status: EndpointStatus): boolean {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return false;
    endpoint.status = status;
    endpoint.updatedAt = Date.now();
    return true;
  }

  enableMock(id: string, data?: unknown): boolean {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return false;
    endpoint.mockEnabled = true;
    if (data !== undefined) endpoint.mockData = data;
    endpoint.updatedAt = Date.now();
    return true;
  }

  disableMock(id: string): boolean {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return false;
    endpoint.mockEnabled = false;
    endpoint.updatedAt = Date.now();
    return true;
  }

  // ==================== Schema 管理 ====================

  registerSchema(schema: ApiSchema): void {
    this.schemas.set(schema.name, schema);
  }

  getSchema(name: string): ApiSchema | undefined {
    return this.schemas.get(name);
  }

  listSchemas(): ApiSchema[] {
    return Array.from(this.schemas.values());
  }

  // ==================== 字段映射 ====================

  addMapping(endpointId: string, mapping: Omit<FieldMapping, 'id'>): FieldMapping | null {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;
    const fullMapping: FieldMapping = {
      ...mapping,
      id: `map-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    endpoint.mappings.push(fullMapping);
    endpoint.updatedAt = Date.now();
    return { ...fullMapping };
  }

  removeMapping(endpointId: string, mappingId: string): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;
    const before = endpoint.mappings.length;
    endpoint.mappings = endpoint.mappings.filter((m) => m.id !== mappingId);
    endpoint.updatedAt = Date.now();
    return endpoint.mappings.length < before;
  }

  listMappings(endpointId: string): FieldMapping[] {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return [];
    return endpoint.mappings.map((m) => ({ ...m }));
  }

  // ==================== 调试 ====================

  createDebugSession(request: DebugRequest): DebugSession {
    const session: DebugSession = {
      id: `dbg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      request,
      status: 'pending',
      startedAt: Date.now(),
    };
    this.debugSessions.set(session.id, session);
    return { ...session };
  }

  async executeDebugSession(sessionId: string): Promise<DebugSession> {
    const session = this.debugSessions.get(sessionId);
    if (!session) throw new Error(`Debug session ${sessionId} not found`);

    const endpoint = this.endpoints.get(session.request.endpointId);
    if (endpoint?.mockEnabled && endpoint.mockData !== undefined) {
      session.response = {
        status: 200,
        duration: 0,
        headers: { 'content-type': 'application/json' },
        body: endpoint.mockData,
      };
      session.status = 'success';
      session.finishedAt = Date.now();
      this.debugSessions.set(sessionId, session);
      return { ...session };
    }

    const start = performance.now();
    try {
      const url = this.buildUrl(session.request);
      const init: RequestInit = {
        method: session.request.method,
        headers: { 'content-type': 'application/json', ...session.request.headers },
      };
      if (session.request.body) {
        init.body = JSON.stringify(session.request.body);
      }
      const resp = await fetch(url, init);
      const text = await resp.text();
      const body = this.tryParseJson(text);
      const end = performance.now();
      session.response = {
        status: resp.status,
        duration: Math.round(end - start),
        headers: this.extractHeaders(resp.headers),
        body,
      };
      session.status = resp.ok ? 'success' : 'error';
    } catch (err) {
      const end = performance.now();
      session.response = {
        status: 0,
        duration: Math.round(end - start),
        headers: {},
        body: null,
        error: err instanceof Error ? err.message : String(err),
      };
      session.status = 'error';
    }
    session.finishedAt = Date.now();
    this.debugSessions.set(sessionId, session);
    return { ...session };
  }

  getDebugSession(id: string): DebugSession | undefined {
    const session = this.debugSessions.get(id);
    return session ? { ...session } : undefined;
  }

  listDebugSessions(limit: number = 20): DebugSession[] {
    return Array.from(this.debugSessions.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
      .map((s) => ({ ...s }));
  }

  // ==================== 健康检查 ====================

  async checkConnection(endpointId: string): Promise<ConnectionHealth> {
    const endpoint = this.endpoints.get(endpointId);
    const id = endpointId;
    if (!endpoint) {
      const health: ConnectionHealth = {
        id,
        endpointId,
        status: ConnectionStatus.Disconnected,
        latency: 0,
        lastCheckedAt: Date.now(),
        message: 'Endpoint not found',
      };
      this.healthCache.set(id, health);
      return health;
    }
    const start = performance.now();
    try {
      const url = this.buildUrl({
        endpointId,
        method: endpoint.method,
        path: endpoint.path,
        headers: endpoint.headers,
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout ?? 10000);
      const resp = await fetch(url, {
        method: endpoint.method,
        headers: endpoint.headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const end = performance.now();
      const latency = Math.round(end - start);
      const status = resp.ok
        ? ConnectionStatus.Connected
        : resp.status >= 500
          ? ConnectionStatus.Degraded
          : ConnectionStatus.Disconnected;
      const health: ConnectionHealth = {
        id,
        endpointId,
        status,
        latency,
        lastCheckedAt: Date.now(),
        message: `HTTP ${resp.status}`,
      };
      this.healthCache.set(id, health);
      return health;
    } catch {
      const end = performance.now();
      const health: ConnectionHealth = {
        id,
        endpointId,
        status: ConnectionStatus.Disconnected,
        latency: Math.round(end - start),
        lastCheckedAt: Date.now(),
        message: 'Connection failed',
      };
      this.healthCache.set(id, health);
      return health;
    }
  }

  getConnectionHealth(endpointId: string): ConnectionHealth | undefined {
    return this.healthCache.get(endpointId);
  }

  listConnectionHealth(): ConnectionHealth[] {
    return Array.from(this.healthCache.values());
  }

  // ==================== 内部方法 ====================

  private cloneEndpoint(ep: ApiEndpoint): ApiEndpoint {
    return {
      ...ep,
      requestSchema: ep.requestSchema ? { ...ep.requestSchema } : undefined,
      responseSchema: { ...ep.responseSchema },
      mappings: ep.mappings.map((m) => ({ ...m })),
      headers: { ...ep.headers },
      tags: [...ep.tags],
    };
  }

  private buildUrl(req: DebugRequest): string {
    if (req.query && Object.keys(req.query).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      return queryString ? `${req.path}?${queryString}` : req.path;
    }
    return req.path;
  }

  private tryParseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

export const apiVisualIntegration = new ApiVisualIntegration();
export default apiVisualIntegration;
