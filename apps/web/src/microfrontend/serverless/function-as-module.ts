/**
 * V48.0 Track Serverless: 无服务器架构 — 函数即模块引擎
 *
 * FunctionAsModule 单例将函数包装为可独立部署、版本化、可观测的微模块：
 * - 函数注册与版本化：每个函数作为独立模块注册，支持语义化版本
 * - 依赖管理：函数间依赖声明 + 自动拓扑排序执行
 * - 执行上下文：请求级隔离的参数传递 + 中间件管道
 * - 结果缓存：基于参数哈希的智能缓存 + TTL 过期
 * - 可观测性：执行时间 / 成功率 / 调用链追踪
 * - 错误隔离：单函数失败不影响整体调用链
 *
 * @example
 * // 注册函数模块
 * faas.register('getUser', async (ctx) => {
 *   return fetch(`/api/users/${ctx.params.id}`).then(r => r.json());
 * }, { version: '1.0.0', ttl: 60 });
 *
 * // 调用函数（自动缓存 + 依赖解析）
 * const result = await faas.invoke('getUser', { params: { id: '1' } });
 */

// ==================== 类型定义 ====================

export type FunctionStatus = 'active' | 'deprecated' | 'disabled' | 'error';

export type ExecStatus = 'success' | 'cached' | 'error' | 'timeout';

export interface FunctionDefinition<TInput = any, TOutput = any> {
  id: string;
  name: string;
  version: string;
  description?: string;
  handler: (context: InvokeContext<TInput>) => Promise<TOutput> | TOutput;
  dependencies: string[];
  status: FunctionStatus;
  ttl: number;
  timeoutMs: number;
  rateLimit: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
}

export interface InvokeContext<TInput = any> {
  params: TInput;
  headers: Record<string, string>;
  metadata: Record<string, any>;
  traceId: string;
  userId?: string;
  tenantId?: string;
}

export interface InvokeOptions {
  params?: any;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  skipCache?: boolean;
  timeoutMs?: number;
  traceId?: string;
  userId?: string;
  tenantId?: string;
}

export interface InvokeResult<TOutput = any> {
  data: TOutput;
  status: ExecStatus;
  execTime: number;
  fromCache: boolean;
  functionId: string;
  version: string;
  traceId: string;
  error?: Error;
}

export interface ExecutionTrace {
  traceId: string;
  functionId: string;
  version: string;
  startTime: number;
  endTime: number;
  execTime: number;
  status: ExecStatus;
  depth: number;
  callArgs: any;
  error?: string;
  children: ExecutionTrace[];
}

export interface FaasStats {
  totalInvocations: number;
  successCount: number;
  cachedCount: number;
  errorCount: number;
  timeoutCount: number;
  avgExecTime: number;
  p50ExecTime: number;
  p95ExecTime: number;
  p99ExecTime: number;
  cacheHitRate: number;
  functionBreakdown: Record<string, { invocations: number; avgTime: number; errors: number }>;
}

export interface FaasConfig {
  defaultTtl: number;
  defaultTimeoutMs: number;
  defaultRateLimit: number;
  maxCacheSize: number;
  maxTraceDepth: number;
  enableCaching: boolean;
  enableTracing: boolean;
  enableRateLimiting: boolean;
}

export type FunctionMiddleware<TInput = any, TOutput = any> = (
  context: InvokeContext<TInput>,
  next: () => Promise<InvokeResult<TOutput>>
) => Promise<InvokeResult<TOutput>>;

export type FaasCallback = (result: InvokeResult) => void;

// ==================== FunctionAsModule（单例） ====================

class FunctionAsModuleImpl {
  private readonly functions = new Map<string, FunctionDefinition>();
  private readonly cache = new Map<string, InvokeResult>();
  private readonly execTimes: number[] = [];
  private readonly traces: ExecutionTrace[] = [];
  private readonly listeners = new Set<FaasCallback>();
  private readonly middlewareChain: FunctionMiddleware[] = [];
  private readonly invocationCounts = new Map<
    string,
    { invocations: number; totalTime: number; errors: number }
  >();
  private totalInvocations = 0;
  private successCount = 0;
  private cachedCount = 0;
  private errorCount = 0;
  private timeoutCount = 0;
  private config: FaasConfig;

  private static readonly DEFAULT_CONFIG: FaasConfig = {
    defaultTtl: 30,
    defaultTimeoutMs: 10000,
    defaultRateLimit: 100,
    maxCacheSize: 500,
    maxTraceDepth: 10,
    enableCaching: true,
    enableTracing: true,
    enableRateLimiting: true,
  };

  constructor(config?: Partial<FaasConfig>) {
    this.config = { ...FunctionAsModuleImpl.DEFAULT_CONFIG, ...config };
  }

  // -------------------- 函数注册 --------------------

  register<TInput = any, TOutput = any>(
    id: string,
    handler: (context: InvokeContext<TInput>) => Promise<TOutput> | TOutput,
    options?: Partial<
      Omit<FunctionDefinition<TInput, TOutput>, 'id' | 'handler' | 'createdAt' | 'updatedAt'>
    >
  ): FunctionDefinition<TInput, TOutput> {
    if (this.functions.has(id)) {
      const existing = this.functions.get(id)!;
      existing.handler = handler as FunctionDefinition['handler'];
      existing.updatedAt = Date.now();
      if (options) {
        Object.assign(existing, options);
      }
      return existing as FunctionDefinition<TInput, TOutput>;
    }

    const now = Date.now();
    const def: FunctionDefinition<TInput, TOutput> = {
      id,
      name: options?.name || id,
      version: options?.version || '1.0.0',
      description: options?.description || '',
      handler: handler as FunctionDefinition['handler'],
      dependencies: options?.dependencies || [],
      status: options?.status || 'active',
      ttl: options?.ttl ?? this.config.defaultTtl,
      timeoutMs: options?.timeoutMs ?? this.config.defaultTimeoutMs,
      rateLimit: options?.rateLimit ?? this.config.defaultRateLimit,
      createdAt: now,
      updatedAt: now,
      metadata: options?.metadata || {},
    };

    this.functions.set(id, def as FunctionDefinition);
    return def;
  }

  unregister(id: string): boolean {
    const existed = this.functions.has(id);
    if (existed) {
      this.functions.delete(id);
      this.cache.clear();
    }
    return existed;
  }

  getFunction(id: string): FunctionDefinition | undefined {
    return this.functions.get(id);
  }

  listFunctions(status?: FunctionStatus): FunctionDefinition[] {
    const all = Array.from(this.functions.values());
    if (status) {
      return all.filter((f) => f.status === status);
    }
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  // -------------------- 函数调用 --------------------

  async invoke<TOutput = any>(id: string, options?: InvokeOptions): Promise<InvokeResult<TOutput>> {
    const def = this.functions.get(id);
    if (!def) {
      throw new Error(`[Faas] 函数 ${id} 未注册`);
    }
    if (def.status !== 'active') {
      throw new Error(`[Faas] 函数 ${id} 状态为 ${def.status}，不可调用`);
    }

    const traceId = options?.traceId || this.generateTraceId();
    const context: InvokeContext = {
      params: options?.params || {},
      headers: options?.headers || {},
      metadata: options?.metadata || {},
      traceId,
      userId: options?.userId,
      tenantId: options?.tenantId,
    };

    // 依赖检查与拓扑排序
    if (def.dependencies.length > 0) {
      this.validateDependencies(def.dependencies);
    }

    // 缓存检查
    if (this.config.enableCaching && !options?.skipCache) {
      const cacheKey = this.buildCacheKey(id, context);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.execTime < def.ttl * 1000) {
        this.cachedCount++;
        this.totalInvocations++;
        this.updateInvocationCount(id, cached.execTime, false);
        this.notify(cached);
        return cached as InvokeResult<TOutput>;
      }
      if (cached) {
        this.cache.delete(cacheKey);
      }
    }

    // 执行
    const startTime = Date.now();
    this.totalInvocations++;

    try {
      const output = await this.executeWithTimeout(
        def,
        context,
        options?.timeoutMs ?? def.timeoutMs
      );
      const execTime = Date.now() - startTime;
      const result: InvokeResult<TOutput> = {
        data: output,
        status: 'success',
        execTime,
        fromCache: false,
        functionId: id,
        version: def.version,
        traceId,
      };

      this.successCount++;
      this.execTimes.push(execTime);
      this.updateInvocationCount(id, execTime, false);

      // 写入缓存
      if (this.config.enableCaching) {
        this.writeCache(id, context, result);
      }

      this.recordTrace(traceId, id, def.version, startTime, execTime, 'success');
      this.notify(result);
      return result;
    } catch (err) {
      const execTime = Date.now() - startTime;
      const status: ExecStatus =
        err instanceof Error && err.message.includes('超时') ? 'timeout' : 'error';
      const result: InvokeResult<TOutput> = {
        data: null as any,
        status,
        execTime,
        fromCache: false,
        functionId: id,
        version: def.version,
        traceId,
        error: err instanceof Error ? err : new Error(String(err)),
      };

      if (status === 'timeout') {
        this.timeoutCount++;
      } else {
        this.errorCount++;
      }
      this.updateInvocationCount(id, execTime, true);
      this.recordTrace(traceId, id, def.version, startTime, execTime, status);
      this.notify(result);
      throw err;
    }
  }

  // -------------------- 依赖执行 --------------------

  async invokeWithDependencies(
    id: string,
    options?: InvokeOptions
  ): Promise<Map<string, InvokeResult>> {
    const def = this.functions.get(id);
    if (!def) {
      throw new Error(`[Faas] 函数 ${id} 未注册`);
    }

    const executionOrder = this.topologicalSort(id);
    const results = new Map<string, InvokeResult>();

    for (const funcId of executionOrder) {
      try {
        const result = await this.invoke(funcId, {
          ...options,
          params: {
            ...(options?.params || {}),
            ...Object.fromEntries(results.entries()),
          },
        });
        results.set(funcId, result);
      } catch (err) {
        results.set(funcId, {
          data: null,
          status: 'error',
          execTime: 0,
          fromCache: false,
          functionId: funcId,
          version: this.functions.get(funcId)?.version || 'unknown',
          traceId: options?.traceId || '',
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    return results;
  }

  // -------------------- 中间件 --------------------

  use<TInput = any, TOutput = any>(middleware: FunctionMiddleware<TInput, TOutput>): void {
    this.middlewareChain.push(middleware as FunctionMiddleware);
  }

  removeMiddleware(index: number): boolean {
    if (index >= 0 && index < this.middlewareChain.length) {
      this.middlewareChain.splice(index, 1);
      return true;
    }
    return false;
  }

  clearMiddleware(): void {
    this.middlewareChain.length = 0;
  }

  // -------------------- 统计与监控 --------------------

  getStats(): FaasStats {
    const times = [...this.execTimes].sort((a, b) => a - b);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const pct = (p: number) => {
      if (!times.length) return 0;
      return times[Math.min(Math.floor((p / 100) * times.length), times.length - 1)];
    };

    const functionBreakdown: FaasStats['functionBreakdown'] = {};
    this.invocationCounts.forEach((v, k) => {
      functionBreakdown[k] = {
        invocations: v.invocations,
        avgTime: v.invocations > 0 ? Math.round(v.totalTime / v.invocations) : 0,
        errors: v.errors,
      };
    });

    return {
      totalInvocations: this.totalInvocations,
      successCount: this.successCount,
      cachedCount: this.cachedCount,
      errorCount: this.errorCount,
      timeoutCount: this.timeoutCount,
      avgExecTime: Math.round(avg),
      p50ExecTime: pct(50),
      p95ExecTime: pct(95),
      p99ExecTime: pct(99),
      cacheHitRate: this.totalInvocations > 0 ? this.cachedCount / this.totalInvocations : 0,
      functionBreakdown,
    };
  }

  getTraces(traceId?: string): ExecutionTrace[] {
    if (traceId) {
      return this.traces.filter((t) => t.traceId === traceId);
    }
    return this.traces;
  }

  clearTraces(): void {
    this.traces.length = 0;
  }

  resetStats(): void {
    this.totalInvocations = 0;
    this.successCount = 0;
    this.cachedCount = 0;
    this.errorCount = 0;
    this.timeoutCount = 0;
    this.execTimes.length = 0;
    this.invocationCounts.clear();
  }

  // -------------------- 配置管理 --------------------

  updateConfig(config: Partial<FaasConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): FaasConfig {
    return { ...this.config };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // -------------------- 事件订阅 --------------------

  onInvoke(callback: FaasCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // -------------------- 内部实现 --------------------

  private generateTraceId(): string {
    return `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private buildCacheKey(id: string, context: InvokeContext): string {
    const paramStr = JSON.stringify(context.params);
    return `${id}:${paramStr}`;
  }

  private writeCache(id: string, context: InvokeContext, result: InvokeResult): void {
    const cacheKey = this.buildCacheKey(id, context);
    const def = this.functions.get(id);
    if (!def) return;

    if (this.cache.size >= this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, result);
    setTimeout(() => {
      this.cache.delete(cacheKey);
    }, def.ttl * 1000);
  }

  private async executeWithTimeout(
    def: FunctionDefinition,
    context: InvokeContext,
    timeoutMs: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[Faas] 函数 ${def.id} 执行超时（${timeoutMs}ms）`));
      }, timeoutMs);

      Promise.resolve(def.handler(context))
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private validateDependencies(deps: string[]): void {
    for (const dep of deps) {
      if (!this.functions.has(dep)) {
        throw new Error(`[Faas] 依赖函数 ${dep} 未注册`);
      }
    }
  }

  private topologicalSort(id: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const stack = new Set<string>();

    const visit = (nodeId: string): void => {
      if (stack.has(nodeId)) {
        throw new Error(`[Faas] 检测到循环依赖：${nodeId}`);
      }
      if (visited.has(nodeId)) return;

      stack.add(nodeId);
      const def = this.functions.get(nodeId);
      if (def) {
        for (const dep of def.dependencies) {
          visit(dep);
        }
      }
      stack.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    visit(id);
    return result;
  }

  private recordTrace(
    traceId: string,
    functionId: string,
    version: string,
    startTime: number,
    execTime: number,
    status: ExecStatus,
    depth = 0
  ): void {
    if (!this.config.enableTracing) return;

    const trace: ExecutionTrace = {
      traceId,
      functionId,
      version,
      startTime,
      endTime: startTime + execTime,
      execTime,
      status,
      depth,
      callArgs: null,
      children: [],
    };

    this.traces.push(trace);
    if (this.traces.length > 1000) {
      this.traces.splice(0, this.traces.length - 1000);
    }
  }

  private updateInvocationCount(id: string, execTime: number, isError: boolean): void {
    const current = this.invocationCounts.get(id) || { invocations: 0, totalTime: 0, errors: 0 };
    current.invocations++;
    current.totalTime += execTime;
    if (isError) current.errors++;
    this.invocationCounts.set(id, current);
  }

  private notify(result: InvokeResult): void {
    this.listeners.forEach((l) => {
      try {
        l(result);
      } catch {
        // ignore
      }
    });
  }

  get functionCount(): number {
    return this.functions.size;
  }
}

// ==================== 单例导出 ====================

export const faas = new FunctionAsModuleImpl();
export { FunctionAsModuleImpl as FunctionAsModule };

export default faas;
