/**
 * SSE (Server-Sent Events) 客户端工具
 * 
 * 支持连接SSE端点、接收事件、解析数据、错误处理和自动重连
 * 使用 fetch + ReadableStream 实现，支持自定义请求头和POST请求
 */

export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export interface SSEClientOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  withCredentials?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type SSEEventHandler = (event: SSEEvent) => void;
export type SSEErrorHandler = (error: Error) => void;
export type SSEOpenHandler = () => void;
export type SSECloseHandler = () => void;

export class SSEClient {
  private options: SSEClientOptions;
  private controller: AbortController | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private eventHandlers: Map<string, SSEEventHandler[]> = new Map();
  private messageHandlers: SSEEventHandler[] = [];
  private openHandlers: SSEOpenHandler[] = [];
  private closeHandlers: SSECloseHandler[] = [];
  private errorHandlers: SSEErrorHandler[] = [];
  private reconnectAttempts = 0;
  private closed = false;
  private lastEventId: string | null = null;

  constructor(options: SSEClientOptions) {
    this.options = {
      method: 'GET',
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...options,
    };
  }

  /**
   * 连接SSE端点
   */
  async connect(): Promise<void> {
    if (this.controller) {
      this.controller.abort();
    }

    this.closed = false;
    this.controller = new AbortController();

    try {
      const headers: Record<string, string> = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...this.options.headers,
      };

      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }

      const response = await fetch(this.options.url, {
        method: this.options.method,
        headers,
        body: this.options.body,
        credentials: this.options.withCredentials ? 'include' : 'same-origin',
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('SSE response body is null');
      }

      this.reader = response.body.getReader();
      this.reconnectAttempts = 0;

      this.openHandlers.forEach(handler => handler());

      await this.readStream();
    } catch (error) {
      if (this.closed) {
        return;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandlers.forEach(handler => handler(err));

      if (this.options.reconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)) {
        this.reconnectAttempts++;
        setTimeout(() => {
          if (!this.closed) {
            this.connect();
          }
        }, this.options.reconnectInterval);
      } else {
        this.closeHandlers.forEach(handler => handler());
      }
    }
  }

  /**
   * 读取SSE流
   */
  private async readStream(): Promise<void> {
    if (!this.reader) {
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await this.reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 按换行符分割事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let event: SSEEvent = { data: '' };

        for (const line of lines) {
          if (line === '') {
            // 空行表示事件结束
            if (event.data !== '' || event.event) {
              this.dispatchEvent(event);
            }
            event = { data: '' };
            continue;
          }

          if (line.startsWith(':')) {
            // 注释行，忽略
            continue;
          }

          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) {
            // 没有冒号，整行作为字段名，值为空
            continue;
          }

          const field = line.slice(0, colonIndex);
          const value = line.slice(colonIndex + 1).replace(/^ /, '');

          switch (field) {
            case 'id':
              event.id = value;
              this.lastEventId = value;
              break;
            case 'event':
              event.event = value;
              break;
            case 'data':
              event.data += (event.data ? '\n' : '') + value;
              break;
            case 'retry':
              event.retry = parseInt(value, 10);
              if (!isNaN(event.retry)) {
                this.options.reconnectInterval = event.retry;
              }
              break;
          }
        }

        // 处理缓冲区中可能的最后一个事件
        if (event.data !== '' || event.event) {
          this.dispatchEvent(event);
        }
      }
    } catch (error) {
      if (this.closed) {
        return;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandlers.forEach(handler => handler(err));

      if (this.options.reconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)) {
        this.reconnectAttempts++;
        setTimeout(() => {
          if (!this.closed) {
            this.connect();
          }
        }, this.options.reconnectInterval);
      } else {
        this.closeHandlers.forEach(handler => handler());
      }
    }
  }

  /**
   * 分发事件
   */
  private dispatchEvent(event: SSEEvent): void {
    // 触发特定事件类型的处理器
    if (event.event) {
      const handlers = this.eventHandlers.get(event.event);
      if (handlers) {
        handlers.forEach(handler => handler(event));
      }
    }

    // 触发通用消息处理器
    this.messageHandlers.forEach(handler => handler(event));
  }

  /**
   * 添加特定事件类型的处理器
   */
  on(event: string, handler: SSEEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * 移除特定事件类型的处理器
   */
  off(event: string, handler: SSEEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 添加通用消息处理器
   */
  onMessage(handler: SSEEventHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * 移除通用消息处理器
   */
  offMessage(handler: SSEEventHandler): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * 添加连接打开处理器
   */
  onOpen(handler: SSEOpenHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * 添加连接关闭处理器
   */
  onClose(handler: SSECloseHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * 添加错误处理器
   */
  onError(handler: SSEErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.closed = true;

    if (this.reader) {
      this.reader.cancel();
      this.reader = null;
    }

    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }

    this.closeHandlers.forEach(handler => handler());
  }

  /**
   * 获取当前重连尝试次数
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * 获取最后一个事件ID
   */
  getLastEventId(): string | null {
    return this.lastEventId;
  }

  /**
   * 检查连接是否已关闭
   */
  isClosed(): boolean {
    return this.closed;
  }
}

/**
 * 创建SSE客户端的便捷函数
 */
export function createSSEClient(options: SSEClientOptions): SSEClient {
  return new SSEClient(options);
}

export default SSEClient;
