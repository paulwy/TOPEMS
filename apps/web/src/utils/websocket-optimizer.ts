/**
 * WebSocket 增强工具模块
 * 提供指数退避（带抖动）和心跳检测算法
 */

/**
 * 指数退避算法（带抖动）
 * - 基础延迟：minDelay
 * - 退避因子：2
 * - 抖动比例：±30%（避免雷鸣群效应）
 * @param attempt 当前重试次数（从 0 开始）
 * @param minDelay 最小延迟（毫秒）
 * @param maxDelay 最大延迟（毫秒）
 * @returns 计算后的延迟时间（毫秒）
 */
export function calculateBackoffDelay(
  attempt: number,
  minDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // 指数退避：min * 2^attempt
  const exponential = minDelay * Math.pow(2, attempt);

  // 上限限制
  const capped = Math.min(exponential, maxDelay);

  // 抖动：±30% 随机化，避免雷鸣群效应
  // 使用 decorrelated jitter 模式：random_between(0, min(cap, base * 3))
  const jittered = Math.random() * capped;

  return Math.floor(jittered);
}

/**
 * 心跳检测器
 * 监控连接是否健康，检测僵尸连接
 */
export class HeartbeatMonitor {
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPongTime: number = Date.now();
  private isRunning = false;

  constructor(
    private readonly sendPing: () => void,
    private readonly onTimeout: () => void,
    private readonly interval: number = 30000,
    private readonly timeout: number = 10000
  ) {}

  /**
   * 启动心跳检测
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastPongTime = Date.now();

    // 启动超时检测（在首次 ping 之前就开始监控）
    this.armTimeout();

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastPongTime;

      if (elapsed > this.interval + this.timeout) {
        // 超过间隔+超时时间未收到响应，判定为僵尸连接
        this.stop();
        this.onTimeout();
        return;
      }

      // 发送心跳 ping
      this.sendPing();
    }, this.interval);
  }

  /**
   * 启动/重置超时检测定时器
   */
  private armTimeout(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    this.timeoutTimer = setTimeout(() => {
      this.stop();
      this.onTimeout();
    }, this.interval + this.timeout);
  }

  /**
   * 收到 pong 响应时调用，重置超时计时器
   */
  recordPong(): void {
    this.lastPongTime = Date.now();
    // 重置超时检测
    if (this.isRunning) {
      this.armTimeout();
    }
  }

  /**
   * 停止心跳检测
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * 是否正在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * 重连策略配置
 */
interface ReconnectStrategyConfig {
  /** 最小延迟（毫秒） */
  minDelay: number;
  /** 最大延迟（毫秒） */
  maxDelay: number;
  /** 最大重试次数 */
  maxAttempts: number;
  /** 抖动模式 */
  jitterMode: 'none' | 'full' | 'equal' | 'decorrelated';
  /** 退避因子 */
  factor: number;
}

/**
 * 默认重连策略：指数退避 + 完全抖动
 */
export const DEFAULT_RECONNECT_STRATEGY: ReconnectStrategyConfig = {
  minDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10,
  jitterMode: 'full',
  factor: 2,
};

/**
 * 计算下次重连延迟时间
 */
export function getNextReconnectDelay(
  attempt: number,
  config: ReconnectStrategyConfig = DEFAULT_RECONNECT_STRATEGY
): number {
  const exponential = config.minDelay * Math.pow(config.factor, attempt);
  const capped = Math.min(exponential, config.maxDelay);

  switch (config.jitterMode) {
    case 'full':
      return Math.floor(Math.random() * capped);
    case 'equal':
      return Math.floor(capped / 2 + Math.random() * (capped / 2));
    case 'decorrelated':
      return Math.floor(Math.random() * Math.min(capped, config.minDelay * 3));
    case 'none':
    default:
      return capped;
  }
}
