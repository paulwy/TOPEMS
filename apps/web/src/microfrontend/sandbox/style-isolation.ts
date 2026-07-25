/**
 * V42.0 Track F: 微前端企业级 — 样式隔离
 *
 * 提供三种隔离模式:
 * 1. Shadow DOM（最强隔离，样式完全封装）
 * 2. Scoped CSS（为选择器添加前缀）
 * 3. CSS Modules（类名 hash 化，简化版）
 *
 * 同时提供:
 * - 样式冲突检测（相同选择器不同规则）
 * - CSS 优先级（specificity）计算
 *
 * @example
 * const iso = new StyleIsolation('crm', { mode: 'shadow', scopePrefix: 'mf-crm__' });
 * iso.createShadowRoot(containerEl);
 * iso.injectStyles('.btn { color: red; }');
 */

import { conflictDetector } from './conflict-detector';

// ==================== 类型定义 ====================

export type StyleIsolationMode = 'shadow' | 'scoped' | 'css_modules';

export interface StyleIsolationOptions {
  /** 隔离模式 */
  mode?: StyleIsolationMode;
  /** 作用域前缀（如 'mf-crm__'），scoped 模式必填 */
  scopePrefix?: string;
  /** 是否使用 adoptedStyleSheets（shadow 模式生效，性能更优） */
  adoptedStyleSheets?: boolean;
}

export interface StyleConflict {
  /** 冲突的 CSS 选择器 */
  selector: string;
  /** 涉及的模块 */
  modules: string[];
  /** 冲突时间戳 */
  timestamp: number;
  /** 严重级别 */
  severity: 'info' | 'warning' | 'error';
  /** 冲突详情（规则差异） */
  details: string;
}

export interface CSSSpecificity {
  /** 内联样式数量 */
  inline: number;
  /** ID 选择器数量 */
  ids: number;
  /** 类/属性/伪类选择器数量 */
  classes: number;
  /** 元素/伪元素选择器数量 */
  elements: number;
  /** 优先级元组 [inline, ids, classes, elements] */
  tuple: [number, number, number, number];
}

interface InjectedStyleRecord {
  /** 原始 CSS 文本 */
  raw: string;
  /** 处理后 CSS 文本 */
  processed: string;
  /** 注入的 <style> 元素（shadow 模式） */
  styleEl?: HTMLStyleElement;
  /** 是否使用 adoptedStyleSheets */
  viaAdopted?: boolean;
}

// ==================== StyleIsolation ====================

export class StyleIsolation {
  readonly moduleId: string;
  readonly options: Required<StyleIsolationOptions>;
  /** 已注入的样式记录 */
  private readonly styles = new Map<string, InjectedStyleRecord>();
  /** Shadow DOM 宿主元素 */
  private shadowHost: HTMLElement | null = null;
  /** Shadow Root 引用 */
  private shadowRoot: ShadowRoot | null = null;
  /** adoptedStyleSheet（若启用） */
  private adoptedSheet: CSSStyleSheet | null = null;
  /** 检测到的样式冲突 */
  private readonly conflicts: StyleConflict[] = [];

  constructor(moduleId: string, options: StyleIsolationOptions = {}) {
    this.moduleId = moduleId;
    this.options = {
      mode: options.mode ?? 'scoped',
      scopePrefix: options.scopePrefix ?? `mf-${moduleId}__`,
      adoptedStyleSheets: options.adoptedStyleSheets ?? false,
    };
  }

  /**
   * 创建 Shadow DOM
   *
   * 在指定宿主元素上 attachShadow，后续 injectStyles 将注入到此 shadow root。
   * 仅在 mode === 'shadow' 时使用。
   */
  createShadowRoot(element: HTMLElement): ShadowRoot {
    if (this.options.mode !== 'shadow') {
      console.warn(
        `[StyleIsolation] 模块 ${this.moduleId} 当前模式为 ${this.options.mode}，createShadowRoot 仅在 shadow 模式生效`
      );
    }
    // 已存在 shadow root 时直接复用
    if (element.shadowRoot) {
      this.shadowHost = element;
      this.shadowRoot = element.shadowRoot;
      return this.shadowRoot;
    }
    this.shadowHost = element;
    this.shadowRoot = element.attachShadow({ mode: 'open' });
    return this.shadowRoot;
  }

  /**
   * 注入样式
   *
   * 根据隔离模式自动选择注入位置和处理方式:
   * - shadow: 注入到 Shadow DOM 的 <style>
   * - scoped: 全局 <style>，选择器添加前缀
   * - css_modules: 类名 hash 化后注入全局 <style>
   */
  injectStyles(css: string): void {
    const processed = this.processCSS(css);
    const id = this.hash(css);

    // 已注入相同 CSS，跳过
    if (this.styles.has(id)) {
      return;
    }

    let styleEl: HTMLStyleElement | undefined;
    let viaAdopted = false;

    if (this.options.mode === 'shadow') {
      if (!this.shadowRoot && typeof document !== 'undefined') {
        // 自动创建一个宿主元素（隐藏）
        const host = document.createElement('div');
        host.setAttribute('data-mf-shadow-host', this.moduleId);
        host.style.display = 'none';
        document.body.appendChild(host);
        this.createShadowRoot(host);
      }
      if (
        this.options.adoptedStyleSheets &&
        this.shadowRoot &&
        'adoptedStyleSheets' in this.shadowRoot
      ) {
        // 使用 adoptedStyleSheets
        try {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(processed);
          const existing = Array.from(this.shadowRoot.adoptedStyleSheets);
          this.shadowRoot.adoptedStyleSheets = [...existing, sheet];
          this.adoptedSheet = sheet;
          viaAdopted = true;
        } catch {
          // 降级到 <style>
          styleEl = this.createStyleElement(processed);
          this.shadowRoot?.appendChild(styleEl);
        }
      } else if (this.shadowRoot) {
        styleEl = this.createStyleElement(processed);
        this.shadowRoot.appendChild(styleEl);
      }
    } else {
      // scoped / css_modules: 注入到 document.head
      if (typeof document !== 'undefined') {
        styleEl = this.createStyleElement(processed);
        styleEl.setAttribute('data-mf-module', this.moduleId);
        styleEl.setAttribute('data-mf-mode', this.options.mode);
        document.head.appendChild(styleEl);
      }
    }

    this.styles.set(id, { raw: css, processed, styleEl, viaAdopted });

    // 注册选择器到冲突检测器
    const selectors = this.extractSelectors(css);
    for (const selector of selectors) {
      conflictDetector.registerStyle(this.moduleId, selector);
    }
  }

  /**
   * CSS 作用域化
   *
   * 为每个选择器添加模块前缀，例如:
   *   .btn { color: red; }
   * 变成:
   *   .mf-crm__.btn { color: red; }
   *
   * 保留 @keyframes / @media 等规则。
   */
  scopeCSS(css: string, scope?: string): string {
    const prefix = scope ?? this.options.scopePrefix;
    return this.processCSS(css, prefix);
  }

  /** 移除所有注入的样式 */
  removeStyles(): void {
    for (const [, record] of this.styles) {
      // 移除 <style>
      if (record.styleEl && record.styleEl.parentNode) {
        record.styleEl.parentNode.removeChild(record.styleEl);
      }
      // 移除 adoptedStyleSheet
      if (record.viaAdopted && this.shadowRoot) {
        try {
          this.shadowRoot.adoptedStyleSheets = this.shadowRoot.adoptedStyleSheets.filter(
            (s) => s !== this.adoptedSheet
          );
        } catch {
          /* ignore */
        }
      }
    }
    this.styles.clear();
    this.adoptedSheet = null;
  }

  /** 获取已注入的样式数量 */
  getStyleCount(): number {
    return this.styles.size;
  }

  /** 获取 Shadow Root（若已创建） */
  getShadowRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  /** 获取宿主元素（若已创建） */
  getShadowHost(): HTMLElement | null {
    return this.shadowHost;
  }

  // ==================== 冲突检测 ====================

  /**
   * 检测样式冲突（相同选择器不同规则）
   *
   * 通过 conflictDetector 收集的全局选择器注册表，
   * 找出当前模块与其他模块共同使用的选择器。
   */
  detectStyleConflicts(): StyleConflict[] {
    const found: StyleConflict[] = [];
    const report = conflictDetector.getConflictReport();
    for (const c of report.styleConflicts) {
      if (c.modules.includes(this.moduleId)) {
        found.push({
          selector: c.selector,
          modules: c.modules,
          timestamp: c.timestamp,
          severity: c.severity,
          details: `选择器 "${c.selector}" 被多个模块使用: ${c.modules.join(', ')}`,
        });
      }
    }
    this.conflicts.push(...found);
    return found;
  }

  /** 获取已记录的冲突列表 */
  getConflicts(): StyleConflict[] {
    return [...this.conflicts];
  }

  /**
   * 计算 CSS 优先级（specificity）
   *
   * 返回形如 [0, 1, 2, 1] 的元组，依次为:
   * [inline, ids, classes/attributes/pseudo-classes, elements/pseudo-elements]
   *
   * @example
   * getCSSSpecificity('#nav .item:hover') // { tuple: [0, 1, 2, 0], ... }
   */
  getCSSSpecificity(selector: string): CSSSpecificity {
    const inline = 0;
    let ids = 0;
    let classes = 0;
    let elements = 0;

    // 简化解析：按非字符边界拆分
    // 移除伪元素和伪类的特殊处理
    const cleaned = selector.replace(/\s+/g, ' ').trim();
    // 拆分成单独的简单选择器
    const tokens = cleaned.split(/(?=[.#\[:])/).flatMap((part) => part.split(/\s+/));

    for (const token of tokens) {
      if (!token) continue;
      // ID 选择器
      const idMatches = token.match(/#[\w-]+/g);
      if (idMatches) ids += idMatches.length;

      // 类选择器、属性选择器、伪类
      const classMatches = token.match(/\.[\w-]+/g);
      if (classMatches) classes += classMatches.length;
      const attrMatches = token.match(/\[[^\]]+\]/g);
      if (attrMatches) classes += attrMatches.length;
      const pseudoClassMatches = token.match(/:[a-zA-Z-]+/g);
      if (pseudoClassMatches) {
        // 伪元素 :: 双冒号
        const pseudoElementMatches = token.match(/::[a-zA-Z-]+/g);
        if (pseudoElementMatches) {
          elements += pseudoElementMatches.length;
        }
        // 单冒号可能是伪类也可能是伪元素（旧语法）
        const pseudoClassesOnly = pseudoClassMatches.filter((m) => !m.startsWith('::'));
        classes += pseudoClassesOnly.length - (pseudoElementMatches?.length ?? 0);
      }

      // 元素选择器（不以 # . : [ 开头的 token）
      const elementMatches = token.match(/^[a-zA-Z][\w-]*/);
      if (
        elementMatches &&
        !token.startsWith('#') &&
        !token.startsWith('.') &&
        !token.startsWith('[') &&
        !token.startsWith(':')
      ) {
        elements += 1;
      }
    }

    // 通配符 * 不增加优先级
    return {
      inline,
      ids,
      classes,
      elements,
      tuple: [inline, ids, classes, elements],
    };
  }

  // ==================== 内部实现 ====================

  /** 创建 <style> 元素 */
  private createStyleElement(css: string): HTMLStyleElement {
    const el = document.createElement('style');
    el.setAttribute('type', 'text/css');
    el.textContent = css;
    return el;
  }

  /** 根据模式处理 CSS */
  private processCSS(css: string, explicitPrefix?: string): string {
    const prefix = explicitPrefix ?? this.options.scopePrefix;
    if (this.options.mode === 'shadow') {
      // Shadow DOM 内不需要前缀，CSS 自然隔离
      return css;
    }
    if (this.options.mode === 'css_modules') {
      // 类名 hash 化: .btn -> .mf-crm__btn-<hash>
      return this.hashClassNames(css);
    }
    // scoped: 添加前缀
    return this.addScopePrefix(css, prefix);
  }

  /**
   * 为每个选择器添加前缀
   *
   * 处理规则:
   * - 跳过 @keyframes / @font-face / @import 等声明
   * - 跳过 :root / html / body 选择器（添加前缀无意义）
   * - 其他选择器前添加前缀
   */
  private addScopePrefix(css: string, prefix: string): string {
    // 简化实现：按 } 拆分规则块
    return css.replace(/([^{}]+)\{([^{}]*)\}/g, (_match, selectors: string, body: string) => {
      const trimmed = selectors.trim();
      // 跳过 @ 规则
      if (trimmed.startsWith('@')) {
        // 对 @media / @supports 等，递归处理内部规则
        if (trimmed.startsWith('@media') || trimmed.startsWith('@supports')) {
          const inner = _match.substring(_match.indexOf('{') + 1, _match.lastIndexOf('}'));
          return `${trimmed} { ${this.addScopePrefix(inner, prefix)} }`;
        }
        return _match;
      }
      // 处理选择器列表（逗号分隔）
      const scoped = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          // html/body/:root 直接添加前缀（不强加 .mf-xxx 前缀）
          if (s === 'html' || s === 'body' || s === ':root') {
            return `${prefix}root ${s}`;
          }
          return `${prefix} ${s}`;
        })
        .join(', ');
      return `${scoped} { ${body} }`;
    });
  }

  /** CSS Modules 简化版: 类名 hash 化 */
  private hashClassNames(css: string): string {
    const prefix = this.options.scopePrefix;
    return css.replace(/\.([a-zA-Z_][\w-]*)/g, (_match, name: string) => {
      return `.${prefix}${name}-${this.hash(name)}`;
    });
  }

  /** 从 CSS 中提取所有选择器 */
  private extractSelectors(css: string): string[] {
    const selectors: string[] = [];
    const regex = /([^{}]+)\{/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(css)) !== null) {
      const sel = match[1].trim();
      if (!sel.startsWith('@')) {
        // 拆分逗号
        for (const s of sel.split(',')) {
          const trimmed = s.trim();
          if (trimmed) selectors.push(trimmed);
        }
      }
    }
    return selectors;
  }

  /** 简单字符串 hash（djb2） */
  private hash(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(36).substring(0, 6);
  }
}
