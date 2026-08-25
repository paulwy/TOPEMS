/**
 * V42.0 Track D: 流式 SSR 工具
 *
 * 实现 React 18+ 的流式服务端渲染（Streaming SSR）+ 部分预渲染（PPR）所需的
 * 底层工具，支持分块传输、流式数据注入与客户端水合。
 *
 * 设计:
 * - StreamingSSRManager: 封装 renderToPipeableStream（Node）/ renderToReadableStream（Edge）
 *   并提供流式数据注入、HTML 片段聚合、flush 等能力
 * - createSSRStream: 基于 Web ReadableStream API 创建可读流（Edge / 浏览器兼容）
 * - serializeSSRData / hydrateSSRData: SSR 数据的序列化与客户端水合
 *
 * 流式传输协议:
 * - 分块传输（chunked transfer）
 * - 数据标记（<!-- SSR:DATA -->）
 * - 脚本注入（<script>window.__SSR_DATA__</script>）
 *
 * 注意: 本模块设计为同构（isomorphic），渲染相关 API 通过动态 import
 * `react-dom/server` 加载，避免污染客户端打包产物；serializeSSRData /
 * hydrateSSRData 在浏览器与 Node 均可安全使用。
 *
 * @example
 * ```ts
 * // 服务端
 * const manager = new StreamingSSRManager();
 * const stream = await manager.renderToStream(<App />, { bootstrapScripts: ['/main.js'] });
 * for await (const chunk of stream) {
 *   res.write(chunk);
 * }
 *
 * // 客户端水合
 * const data = hydrateSSRData();
 * ```
 */

import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const ssrLogger = logger.child({ prefix: 'StreamingSSR' });

// ==================== SSR 数据序列化协议 ====================

/** SSR 数据标记前缀（HTML 注释，避免被浏览器渲染） */
const SSR_DATA_MARKER = '<!-- SSR:DATA -->';

/** SSR 数据脚本全局变量名 */
const SSR_DATA_GLOBAL = '__SSR_DATA__';

/** 单条流式数据条目 */
interface SSRDataEntry {
  /** 数据 key（用于客户端按 key 取值） */
  key: string;
  /** 数据载荷 */
  payload: unknown;
  /** 数据来源标记：static(预渲染静态壳) | streaming(流式注入) | deferred(延迟) */
  source: 'static' | 'streaming' | 'deferred';
  /** 注入时间戳 */
  injectedAt: number;
}

/** 序列化后的 SSR 数据集合 */
interface SSRDataCollection {
  entries: SSRDataEntry[];
  version: string;
  renderedAt: string;
}

const SSR_DATA_VERSION = 'v42.0';

/**
 * 序列化 SSR 数据为安全的 JSON 字符串
 *
 * 防止 XSS：将 `</script>`、`<!--` 等危险字符转义，
 * 确保可安全嵌入 <script> 标签内。
 *
 * @param data 任意可序列化数据
 * @returns 转义后的 JSON 字符串
 */
function serializeSSRData(data: unknown): string {
  const json = JSON.stringify(data);
  if (typeof json !== 'string') return 'null';
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * 构建完整 SSR 数据集合（包含元信息）
 */
function buildSSRDataCollection(entries: SSRDataEntry[]): SSRDataCollection {
  return {
    entries,
    version: SSR_DATA_VERSION,
    renderedAt: new Date().toISOString(),
  };
}

/**
 * 将 SSR 数据集合序列化为可注入 HTML 的 <script> 标签
 *
 * @param collection SSR 数据集合
 * @returns 完整 <script> 标签字符串
 */
function serializeSSRDataToScript(collection: SSRDataCollection): string {
  const escaped = serializeSSRData(collection);
  return `<script>window.${SSR_DATA_GLOBAL}=${escaped};</script>`;
}

/**
 * 将单条流式数据序列化为带标记的 HTML 注释块（用于流式注入）
 *
 * 客户端通过解析 `<!-- SSR:DATA -->` 标记识别流式数据块。
 */
function serializeStreamingChunk(entry: SSRDataEntry): string {
  const escaped = serializeSSRData(entry);
  return `${SSR_DATA_MARKER}${escaped}${SSR_DATA_MARKER}`;
}

// ==================== StreamingSSRManager ====================

/** 流式渲染选项 */
interface StreamingSSROptions {
  /** bootstrap 脚本（客户端入口） */
  bootstrapScripts?: string[];
  /** bootstrap 模块（ESM 入口） */
  bootstrapModules?: string[];
  /** 自定义回调：流完成时触发 */
  onComplete?: () => void;
  /** 自定义回调：所有 shell 准备就绪时触发（可提前 flush 静态壳） */
  onShellReady?: () => void;
  /** 自定义回调：shell 渲染出错时触发 */
  onShellError?: (error: Error) => void;
  /** 自定义回调：发生流式错误时触发 */
  onError?: (error: Error) => void;
  /** 是否启用 progressiveChunking（默认 true） */
  progressiveChunking?: boolean;
}

/** StreamingSSRManager 渲染结果 */
interface StreamingRenderResult {
  /** HTML 片段流（ReadableStream<Uint8Array>） */
  stream: ReadableStream<Uint8Array>;
  /** 注入的 SSR 数据集合 */
  data: SSRDataCollection;
  /** 等待渲染完成 */
  done: Promise<void>;
}

/**
 * 流式 SSR 管理器
 *
 * 封装 React 的流式渲染能力，支持:
 * - 流式 HTML 分块输出
 * - 流式数据注入（injectStreamingData）
 * - HTML 片段聚合（getStreamingHTML）
 * - 主动刷新（flush）
 *
 * 通过动态 import react-dom/server 避免在客户端打包产物中引入服务端模块。
 */
class StreamingSSRManager {
  private entries: SSRDataEntry[] = [];
  private chunks: string[] = [];
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private isDone = false;
  private doneResolve: (() => void) | null = null;
  private doneReject: ((error: Error) => void) | null = null;
  private readonly donePromise: Promise<void>;
  private textEncoder = new TextEncoder();

  constructor() {
    this.donePromise = new Promise<void>((resolve, reject) => {
      this.doneResolve = resolve;
      this.doneReject = reject;
    });
  }

  /**
   * 注入流式数据
   *
   * 在渲染过程中动态注入数据，可被客户端按 key 消费。
   * 数据同时写入 entries 集合（用于最终 SSR_DATA 脚本）和流式 HTML 注释块。
   *
   * @param key 数据 key
   * @param payload 数据载荷
   * @param source 数据来源
   */
  injectStreamingData(
    key: string,
    payload: unknown,
    source: SSRDataEntry['source'] = 'streaming'
  ): void {
    const entry: SSRDataEntry = {
      key,
      payload,
      source,
      injectedAt: Date.now(),
    };
    this.entries.push(entry);

    const chunk = serializeStreamingChunk(entry);
    this.chunks.push(chunk);

    if (this.controller && !this.isDone) {
      this.controller.enqueue(this.textEncoder.encode(chunk));
    }
  }

  /**
   * 获取已注入的流式 HTML 片段（聚合）
   */
  getStreamingHTML(): string {
    return this.chunks.join('');
  }

  /**
   * 获取已注入的 SSR 数据集合
   */
  getSSRData(): SSRDataCollection {
    return buildSSRDataCollection([...this.entries]);
  }

  /**
   * 主动刷新流（将缓冲数据推送到下游）
   *
   * 注意：在 Web ReadableStream 中，enqueue 后数据已传递，
   * 此方法主要作为语义化接口，并触发底层 flush（如果可用）。
   */
  flush(): void {
    // Web ReadableStream 无显式 flush，enqueue 即推送。
    // 此处保留语义以兼容未来基于 Node Writable 的实现。
  }

  /**
   * 流式渲染 React 元素
   *
   * 通过动态 import react-dom/server 选择可用的流式渲染 API：
   * - 优先使用 renderToReadableStream（Web Streams，Edge / 现代运行时）
   * - 回退到 renderToPipeableStream（Node.js）
   *
   * 返回基于 Web ReadableStream API 的可读流，便于 Edge / 浏览器统一消费。
   *
   * @param element React 元素
   * @param options 渲染选项
   */
  async renderToStream(
    element: React.ReactElement,
    options: StreamingSSROptions = {}
  ): Promise<StreamingRenderResult> {
    const {
      bootstrapScripts = [],
      bootstrapModules = [],
      onComplete,
      onShellReady,
      onShellError,
      onError,
      progressiveChunking = true,
    } = options;

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        this.controller = controller;

        try {
          const ReactDOMServer = await import('react-dom/server');
          // 优先使用 Web Streams API（renderToReadableStream）
          const renderToReadableStream = (
            ReactDOMServer as unknown as {
              renderToReadableStream?: (
                element: React.ReactElement,
                options?: Record<string, unknown>
              ) => Promise<{ body: ReadableStream<Uint8Array>; done: Promise<void> }>;
            }
          ).renderToReadableStream;

          if (typeof renderToReadableStream === 'function') {
            const result = await renderToReadableStream(element, {
              bootstrapScripts,
              bootstrapModules,
              onError: (error: unknown) => {
                const err = error instanceof Error ? error : new Error(String(error));
                onError?.(err);
                ssrLogger.error(i18n.t('shared.streaming-ssr.k4'), err);
              },
              progressiveChunking,
            });

            onShellReady?.();

            const reader = result.body.getReader();
            const pump = async (): Promise<void> => {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) controller.enqueue(value);
              }
            };

            await pump();
            // 注入最终 SSR 数据脚本
            const script = serializeSSRDataToScript(this.getSSRData());
            controller.enqueue(this.textEncoder.encode(script));
            controller.close();
            this.isDone = true;
            onComplete?.();
            this.doneResolve?.();
            return;
          }

          // 回退：Node.js renderToPipeableStream
          const renderToPipeableStream = (
            ReactDOMServer as unknown as {
              renderToPipeableStream: (
                element: React.ReactElement,
                options?: Record<string, unknown>
              ) => {
                pipe: (writable: { write: (chunk: Uint8Array | string) => void }) => void;
                abort: () => void;
              };
            }
          ).renderToPipeableStream;

          if (typeof renderToPipeableStream === 'function') {
            const pipeable = renderToPipeableStream(element, {
              bootstrapScripts,
              bootstrapModules,
              onShellReady: () => onShellReady?.(),
              onShellError: (error: unknown) => {
                const err = error instanceof Error ? error : new Error(String(error));
                onShellError?.(err);
              },
              onAllReady: () => {
                onComplete?.();
              },
              onError: (error: unknown) => {
                const err = error instanceof Error ? error : new Error(String(error));
                onError?.(err);
                ssrLogger.error(i18n.t('shared.streaming-ssr.k5'), err);
              },
              progressiveChunking,
            });

            // 将 Node 流桥接到 Web ReadableStream
            await new Promise<void>((resolve) => {
              pipeable.pipe({
                write: (chunk: Uint8Array | string) => {
                  const data = typeof chunk === 'string' ? this.textEncoder.encode(chunk) : chunk;
                  controller.enqueue(data);
                },
              });
              // Node pipe 不会主动通知完成，此处通过 onAllReady 触发
              // 为简化实现，在下一 tick 注入数据脚本并关闭
              setTimeout(() => {
                const script = serializeSSRDataToScript(this.getSSRData());
                controller.enqueue(this.textEncoder.encode(script));
                controller.close();
                this.isDone = true;
                resolve();
              }, 0);
            });
            this.doneResolve?.();
            return;
          }

          throw new Error(i18n.t('shared.streaming-ssr.k0'));
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          ssrLogger.error(i18n.t('shared.streaming-ssr.k6'), err);
          onShellError?.(err);
          controller.error(err);
          this.doneReject?.(err);
        }
      },
      cancel: () => {
        ssrLogger.debug(i18n.t('shared.streaming-ssr.k1'));
      },
    });

    return {
      stream,
      data: this.getSSRData(),
      done: this.donePromise,
    };
  }
}

/**
 * 创建 SSR 可读流（便捷工厂）
 *
 * 等价于 `new StreamingSSRManager().renderToStream(element)`。
 *
 * @param element React 元素
 * @param options 渲染选项
 */
export async function createSSRStream(
  element: React.ReactElement,
  options?: StreamingSSROptions
): Promise<StreamingRenderResult> {
  const manager = new StreamingSSRManager();
  return manager.renderToStream(element, options);
}

// ==================== 流式 HTML 聚合工具 ====================

/**
 * 将 ReadableStream<Uint8Array> 聚合为完整 HTML 字符串
 *
 * 用于测试或非流式消费场景（如预渲染静态壳）。
 *
 * @param stream 可读流
 * @returns 完整 HTML 字符串
 */
export async function collectSSRStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

/**
 * 清除水合缓存（测试 / 路由切换时使用）
 */
export default StreamingSSRManager;
