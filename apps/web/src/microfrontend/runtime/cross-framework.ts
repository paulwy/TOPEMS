/**
 * V45.0 Track F: 微前端终极形态 — 跨框架兼容层
 *
 * 提供统一的框架适配器，支持 React / Vue / Angular / Svelte 组件
 * 在同一个微前端容器中混合挂载，并提供统一的生命周期与属性/事件传递。
 *
 * - FrameworkAdapter 接口：mount / unmount / update / getState / setErrorHandler
 * - ReactAdapter / VueAdapter / AngularAdapter / SvelteAdapter
 * - CrossFrameworkBridge: createAdapter / mountComponent / unmountComponent / transferProps / transferEvents
 * - 统一 props 格式 → 框架特定格式
 * - 统一事件 → 框架特定事件
 *
 * 注意：Vue / Angular / Svelte 适配器为模拟实现，不依赖实际框架包。
 *
 * @example
 * const adapter = crossFrameworkBridge.createAdapter(FrameworkType.REACT, MyComponent);
 * crossFrameworkBridge.mountComponent('widget-1', adapter, container, { title: 'Hello' });
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

// ==================== 安全工具函数 ====================

/**
 * HTML 转义函数，防止 XSS 攻击
 * 将特殊字符转换为 HTML 实体
 */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==================== 类型定义 ====================

/** 支持的框架类型 */
export enum FrameworkType {
  REACT = 'react',
  VUE = 'vue',
  ANGULAR = 'angular',
  SVELTE = 'svelte',
  VANILLA = 'vanilla',
}

/** 统一属性格式 */
export interface UnifiedProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 跨框架桥接属性多类型，索引签名 any 为设计约定
  [key: string]: any;
}

/** 统一事件格式 */
export interface UnifiedEvents {
  /** 事件名 -> 回调函数 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 跨框架事件负载多类型，设计约定
  [eventName: string]: (...args: any[]) => void;
}

/** 框架适配器接口 */
export interface FrameworkAdapter {
  /** 框架类型 */
  framework: FrameworkType;
  /** 将组件挂载到容器 */
  mount(container: HTMLElement, props: UnifiedProps): void;
  /** 卸载组件 */
  unmount(container: HTMLElement): void;
  /** 更新组件属性 */
  update(container: HTMLElement, props: UnifiedProps): void;
  /** 获取组件当前状态（模拟） */
  getState(): Record<string, unknown>;
  /** 设置错误处理回调 */
  setErrorHandler(handler: (error: Error) => void): void;
}

/** 统一生命周期 */
export interface UnifiedLifecycle {
  /** 框架类型 */
  framework: FrameworkType;
  /** 挂载 */
  mount: (container: HTMLElement, props: UnifiedProps) => void;
  /** 卸载 */
  unmount: (container: HTMLElement) => void;
  /** 更新 */
  update: (container: HTMLElement, props: UnifiedProps) => void;
  /** 状态监听 */
  watch: (callback: (state: Record<string, unknown>) => void) => () => void;
  /** 错误回调 */
  error: (error: Error) => void;
}

/** 生命周期钩子 */
export interface LifecycleHook {
  beforeMount?: (container: HTMLElement, props: UnifiedProps) => void;
  mounted?: (container: HTMLElement) => void;
  beforeUpdate?: (container: HTMLElement, props: UnifiedProps) => void;
  updated?: (container: HTMLElement) => void;
  beforeUnmount?: (container: HTMLElement) => void;
  unmounted?: (container: HTMLElement) => void;
  errorCaptured?: (error: Error, container: HTMLElement) => void;
}

/** 已挂载的组件实例 */
export interface MountedComponent {
  /** 实例 ID */
  id: string;
  /** 框架类型 */
  framework: FrameworkType;
  /** 适配器 */
  adapter: FrameworkAdapter;
  /** 挂载容器 */
  container: HTMLElement;
  /** 当前属性 */
  props: UnifiedProps;
  /** 事件映射 */
  events: UnifiedEvents;
  /** 挂载时间 */
  mountedAt: number;
}

// ==================== React 适配器 ====================

/**
 * React 组件适配器
 *
 * 使用 ReactDOM.createRoot 将 React 组件挂载到 DOM 容器。
 */
export class ReactAdapter implements FrameworkAdapter {
  readonly framework = FrameworkType.REACT;
  private component: React.ComponentType<object>;
  private root: ReactDOM.Root | null = null;
  private currentProps: UnifiedProps = {};
  private errorHandler: ((error: Error) => void) | null = null;
  private state: Record<string, unknown> = {};

  constructor(component: React.ComponentType<object>) {
    this.component = component;
  }

  mount(container: HTMLElement, props: UnifiedProps): void {
    try {
      this.currentProps = props;
      this.root = ReactDOM.createRoot(container);
      this.root.render(React.createElement(this.component, this.transformProps(props)));
      this.state = { mounted: true, framework: 'react', propsCount: Object.keys(props).length };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandler?.(error);
      throw error;
    }
  }

  unmount(_container: HTMLElement): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.state = { mounted: false };
  }

  update(container: HTMLElement, props: UnifiedProps): void {
    if (!this.root) {
      this.mount(container, props);
      return;
    }
    this.currentProps = props;
    this.root.render(React.createElement(this.component, this.transformProps(props)));
    this.state = { mounted: true, framework: 'react', propsCount: Object.keys(props).length };
  }

  getState(): Record<string, unknown> {
    return { ...this.state, currentProps: this.currentProps };
  }

  setErrorHandler(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /** React props 直接透传 */
  protected transformProps(props: UnifiedProps): UnifiedProps {
    return { ...props };
  }
}

// ==================== Vue 适配器（模拟） ====================

/**
 * Vue 组件适配器（模拟实现）
 *
 * 模拟 Vue 3 的 createApp + mount 流程，不依赖实际 Vue 运行时。
 */
export class VueAdapter implements FrameworkAdapter {
  readonly framework = FrameworkType.VUE;
  private app: { mount: (el: HTMLElement) => void; unmount: () => void } | null = null;
  private currentProps: UnifiedProps = {};
  private errorHandler: ((error: Error) => void) | null = null;
  private state: Record<string, unknown> = {};

  constructor(_componentDef: unknown) {}

  mount(container: HTMLElement, props: UnifiedProps): void {
    try {
      this.currentProps = props;
      // 模拟 Vue createApp
      this.app = {
        mount: (el: HTMLElement) => {
          el.innerHTML = this.renderTemplate(props);
        },
        unmount: () => {
          container.innerHTML = '';
        },
      };
      this.app.mount(container);
      this.state = { mounted: true, framework: 'vue', propsCount: Object.keys(props).length };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandler?.(error);
      throw error;
    }
  }

  unmount(_container: HTMLElement): void {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
    this.state = { mounted: false };
  }

  update(container: HTMLElement, props: UnifiedProps): void {
    if (!this.app) {
      this.mount(container, props);
      return;
    }
    this.currentProps = props;
    container.innerHTML = this.renderTemplate(props);
    this.state = { mounted: true, framework: 'vue', propsCount: Object.keys(props).length };
  }

  getState(): Record<string, unknown> {
    return { ...this.state, currentProps: this.currentProps };
  }

  setErrorHandler(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /** 模拟 Vue 模板渲染 */
  private renderTemplate(props: UnifiedProps): string {
    const entries = Object.entries(props)
      .map(
        ([k, v]) =>
          `${escapeHtml(k)}: ${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}`
      )
      .join('<br/>');
    return `<div data-framework="vue" style="padding: designTokens.spacing.md;border:1px solid var(--color-success-400);border-radius:6px;">
      <strong>[Vue {i18n.t('microfrontend.cross-framework.k0')}]</strong><br/>${entries || i18n.t('microfrontend.cross-framework.k0')}
    </div>`;
  }
}

// ==================== Angular 适配器（模拟） ====================

/**
 * Angular 组件适配器（模拟实现）
 *
 * 模拟 Angular 的 platformBrowserDynamic + bootstrapComponent 流程。
 */
export class AngularAdapter implements FrameworkAdapter {
  readonly framework = FrameworkType.ANGULAR;
  private platformRef: { destroy(): void } | null = null;
  private currentProps: UnifiedProps = {};
  private errorHandler: ((error: Error) => void) | null = null;
  private state: Record<string, unknown> = {};

  constructor(_componentClass: unknown) {}

  mount(container: HTMLElement, props: UnifiedProps): void {
    try {
      this.currentProps = props;
      // 模拟 Angular bootstrap
      this.platformRef = {
        destroy: () => {
          container.innerHTML = '';
        },
      };
      container.innerHTML = this.renderTemplate(props);
      this.state = { mounted: true, framework: 'angular', propsCount: Object.keys(props).length };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandler?.(error);
      throw error;
    }
  }

  unmount(_container: HTMLElement): void {
    if (this.platformRef) {
      this.platformRef.destroy();
      this.platformRef = null;
    }
    this.state = { mounted: false };
  }

  update(container: HTMLElement, props: UnifiedProps): void {
    if (!this.platformRef) {
      this.mount(container, props);
      return;
    }
    this.currentProps = props;
    container.innerHTML = this.renderTemplate(props);
    this.state = { mounted: true, framework: 'angular', propsCount: Object.keys(props).length };
  }

  getState(): Record<string, unknown> {
    return { ...this.state, currentProps: this.currentProps };
  }

  setErrorHandler(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /** 模拟 Angular 模板渲染 */
  private renderTemplate(props: UnifiedProps): string {
    const entries = Object.entries(props)
      .map(
        ([k, v]) =>
          `<li><strong>{{ ${escapeHtml(k)} }}</strong>: ${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</li>`
      )
      .join('');
    return `<div data-framework="angular" style="padding:12px;border:1px solid ${designTokens.colors.error['600']};border-radius:6px;">
      <strong>{i18n.t('microfrontend.cross-framework.ngular_0')}</strong>
      <ul style="margin: designTokens.spacing.sm 0 0;padding-left:20px;">${entries || i18n.t('microfrontend.cross-framework.lili_1')}</ul>
    </div>`;
  }
}

// ==================== Svelte 适配器（模拟） ====================

/**
 * Svelte 组件适配器（模拟实现）
 *
 * 模拟 Svelte 的 new Component({ target }) 流程。
 */
export class SvelteAdapter implements FrameworkAdapter {
  readonly framework = FrameworkType.SVELTE;
  private instance: { $destroy(): void; $set(props: UnifiedProps): void } | null = null;
  private currentProps: UnifiedProps = {};
  private errorHandler: ((error: Error) => void) | null = null;
  private state: Record<string, unknown> = {};

  constructor(_componentDef: unknown) {}

  mount(container: HTMLElement, props: UnifiedProps): void {
    try {
      this.currentProps = props;
      // 模拟 Svelte 组件实例化
      this.instance = {
        $destroy: () => {
          container.innerHTML = '';
        },
        $set: (newProps: UnifiedProps) => {
          this.currentProps = newProps;
          container.innerHTML = this.renderTemplate(newProps);
        },
      };
      container.innerHTML = this.renderTemplate(props);
      this.state = { mounted: true, framework: 'svelte', propsCount: Object.keys(props).length };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandler?.(error);
      throw error;
    }
  }

  unmount(_container: HTMLElement): void {
    if (this.instance) {
      this.instance.$destroy();
      this.instance = null;
    }
    this.state = { mounted: false };
  }

  update(container: HTMLElement, props: UnifiedProps): void {
    if (!this.instance) {
      this.mount(container, props);
      return;
    }
    this.instance.$set(props);
    this.state = { mounted: true, framework: 'svelte', propsCount: Object.keys(props).length };
  }

  getState(): Record<string, unknown> {
    return { ...this.state, currentProps: this.currentProps };
  }

  setErrorHandler(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /** 模拟 Svelte 模板渲染 */
  private renderTemplate(props: UnifiedProps): string {
    const entries = Object.entries(props)
      .map(
        ([k, v]) =>
          `<span style="display:inline-block;margin:2px 6px;padding:2px 8px;background:${designTokens.colors.error['600']};color:var(--color-primary-foreground);border-radius:3px;">${escapeHtml(k)}: ${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</span>`
      )
      .join('');
    return `<div data-framework="svelte" style="padding:12px;border:1px solid ${designTokens.colors.error['600']};border-radius:6px;">
      <strong>[Svelte {i18n.t('microfrontend.cross-framework.k1')}]</strong><br/>${entries || i18n.t('microfrontend.cross-framework.k2')}
    </div>`;
  }
}

// ==================== CrossFrameworkBridge ====================

/**
 * 跨框架桥接器
 *
 * 统一管理多框架适配器的创建、挂载、卸载与属性/事件传递。
 */
export class CrossFrameworkBridge {
  /** 已挂载的组件: id -> MountedComponent */
  private readonly mounted = new Map<string, MountedComponent>();
  /** 适配器工厂注册表: framework -> 工厂函数 */
  private readonly adapterFactories = new Map<
    FrameworkType,
    (component: unknown) => FrameworkAdapter
  >();
  /** 状态监听器 */
  private readonly stateListeners = new Set<(components: MountedComponent[]) => void>();

  constructor() {
    this.registerBuiltInAdapters();
  }

  /** 注册内置适配器工厂 */
  private registerBuiltInAdapters(): void {
    this.adapterFactories.set(
      FrameworkType.REACT,
      (c) => new ReactAdapter(c as React.ComponentType<object>)
    );
    this.adapterFactories.set(FrameworkType.VUE, (c) => new VueAdapter(c));
    this.adapterFactories.set(FrameworkType.ANGULAR, (c) => new AngularAdapter(c));
    this.adapterFactories.set(FrameworkType.SVELTE, (c) => new SvelteAdapter(c));
  }

  /**
   * 创建框架适配器
   */
  createAdapter(framework: FrameworkType, component: unknown): FrameworkAdapter {
    const factory = this.adapterFactories.get(framework);
    if (!factory) {
      throw new Error(`${i18n.t('microfrontend.cross-framework.k3')}${framework}`);
    }
    return factory(component);
  }

  /**
   * 挂载组件
   */
  mountComponent(
    id: string,
    adapter: FrameworkAdapter,
    container: HTMLElement,
    props: UnifiedProps = {},
    events: UnifiedEvents = {}
  ): MountedComponent {
    // 若已存在则先卸载
    if (this.mounted.has(id)) {
      this.unmountComponent(id);
    }

    const mergedProps = this.transferProps(adapter.framework, props, events);
    adapter.mount(container, mergedProps);

    const mounted: MountedComponent = {
      id,
      framework: adapter.framework,
      adapter,
      container,
      props: mergedProps,
      events,
      mountedAt: Date.now(),
    };
    this.mounted.set(id, mounted);
    this.notifyListeners();
    return mounted;
  }

  /**
   * 卸载组件
   */
  unmountComponent(id: string): boolean {
    const mounted = this.mounted.get(id);
    if (!mounted) return false;
    try {
      mounted.adapter.unmount(mounted.container);
    } catch (err) {
      console.error(
        `${i18n.t('microfrontend.cross-framework.k4')}${id}${i18n.t('microfrontend.cross-framework.k5')}`,
        err
      );
    }
    this.mounted.delete(id);
    this.notifyListeners();
    return true;
  }

  /**
   * 更新组件属性
   */
  updateComponent(id: string, props: UnifiedProps): boolean {
    const mounted = this.mounted.get(id);
    if (!mounted) return false;
    const mergedProps = this.transferProps(mounted.framework, props, mounted.events);
    mounted.props = mergedProps;
    mounted.adapter.update(mounted.container, mergedProps);
    this.notifyListeners();
    return true;
  }

  /**
   * 属性传递：统一 props 格式 → 框架特定格式
   *
   * - React: 直接透传
   * - Vue: 转为 props + attrs
   * - Angular: 转为 @Input 绑定
   * - Svelte: 转为 export let
   */
  transferProps(
    framework: FrameworkType,
    props: UnifiedProps,
    events: UnifiedEvents = {}
  ): UnifiedProps {
    const eventProps = this.transferEvents(framework, events);
    switch (framework) {
      case FrameworkType.REACT:
        // React: 事件作为 onXxx 回调属性
        return { ...props, ...eventProps };
      case FrameworkType.VUE:
        // Vue: 事件通过 $emit 触发，这里将回调注入 $listeners 模拟
        return { ...props, $listeners: eventProps, $attrs: { ...props } };
      case FrameworkType.ANGULAR:
        // Angular: 事件通过 @Output EventEmitter
        return { ...props, $outputs: eventProps };
      case FrameworkType.SVELTE:
        // Svelte: 事件通过 createEventDispatcher
        return { ...props, $callbacks: eventProps };
      default:
        return { ...props, ...eventProps };
    }
  }

  /**
   * 事件传递：统一事件 → 框架特定事件
   *
   * 统一格式: { onClick: fn, onSubmit: fn }
   * - React: onClick={fn}
   * - Vue: @click="fn"
   * - Angular: (click)="fn($event)"
   * - Svelte: on:click={fn}
   */
  transferEvents(framework: FrameworkType, events: UnifiedEvents): UnifiedProps {
    const result: UnifiedProps = {};
    switch (framework) {
      case FrameworkType.REACT:
        // React: onXxx 格式直接透传
        Object.entries(events).forEach(([name, handler]) => {
          const reactName = name.startsWith('on')
            ? name
            : `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
          result[reactName] = handler;
        });
        break;
      case FrameworkType.VUE:
        // Vue: 转为 onXxx 格式（Vue 3 composition API）
        Object.entries(events).forEach(([name, handler]) => {
          const vueName = name.startsWith('on')
            ? name
            : `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
          result[vueName] = handler;
        });
        break;
      case FrameworkType.ANGULAR:
        // Angular: 转为 onXxx 格式
        Object.entries(events).forEach(([name, handler]) => {
          const ngName = name.startsWith('on')
            ? name
            : `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
          result[ngName] = handler;
        });
        break;
      case FrameworkType.SVELTE:
        // Svelte: 转为 onXxx 回调
        Object.entries(events).forEach(([name, handler]) => {
          const svelteName = name.startsWith('on')
            ? name
            : `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
          result[svelteName] = handler;
        });
        break;
      default:
        Object.assign(result, events);
    }
    return result;
  }

  /** 获取已挂载的组件 */
  getMountedComponent(id: string): MountedComponent | undefined {
    return this.mounted.get(id);
  }

  /** 列出所有已挂载的组件 */
  listMountedComponents(): MountedComponent[] {
    return Array.from(this.mounted.values());
  }

  /** 按框架筛选已挂载的组件 */
  getComponentsByFramework(framework: FrameworkType): MountedComponent[] {
    return this.listMountedComponents().filter((c) => c.framework === framework);
  }

  /** 注册自定义适配器工厂 */
  registerAdapterFactory(
    framework: FrameworkType,
    factory: (component: unknown) => FrameworkAdapter
  ): void {
    this.adapterFactories.set(framework, factory);
  }

  /** 订阅组件变更 */
  onComponentsChange(callback: (components: MountedComponent[]) => void): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  /** 卸载所有组件 */
  unmountAll(): void {
    for (const id of Array.from(this.mounted.keys())) {
      this.unmountComponent(id);
    }
  }

  /** 获取已挂载组件数量 */
  get size(): number {
    return this.mounted.size;
  }

  /** 通知监听器 */
  private notifyListeners(): void {
    const components = this.listMountedComponents();
    this.stateListeners.forEach((l) => {
      try {
        l(components);
      } catch {
        // ignore
      }
    });
  }
}

// ==================== 单例导出 ====================

export const crossFrameworkBridge = new CrossFrameworkBridge();

export default crossFrameworkBridge;
