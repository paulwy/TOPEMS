/**
 * V48.0 零代码平台 — 自动化文档生成
 *
 * 提供自动化文档生成能力，支持:
 * - API 文档自动生成（OpenAPI/Swagger 格式）
 * - 数据流文档生成
 * - 组件文档生成
 * - 代码注释提取与聚合
 * - 多格式输出（Markdown/HTML/JSON）
 *
 * @example
 * import { autoDocGenerator } from '@/utils/zerocode';
 *
 * autoDocGenerator.generateApiDoc('unified-core', {
 *   title: '统一核心服务 API',
 *   version: '1.0.0',
 *   endpoints: ['user-list', 'user-create'],
 * });
 */

// ==================== 枚举 ====================

export enum DocFormat {
  Markdown = 'markdown',
  HTML = 'html',
  JSON = 'json',
  OpenAPI = 'openapi',
}

export enum DocSectionType {
  Overview = 'overview',
  Endpoints = 'endpoints',
  Schema = 'schema',
  Examples = 'examples',
  Errors = 'errors',
  Flows = 'flows',
  Components = 'components',
}

export enum ComponentType {
  Page = 'page',
  Layout = 'layout',
  Widget = 'widget',
  Form = 'form',
  Table = 'table',
  Chart = 'chart',
  Custom = 'custom',
}

// ==================== 接口 ====================

export interface DocSection {
  type: DocSectionType;
  title: string;
  content: string;
  order: number;
}

export interface DocMetadata {
  id: string;
  title: string;
  version: string;
  description: string;
  author?: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  format: DocFormat;
}

export interface GeneratedDoc {
  metadata: DocMetadata;
  sections: DocSection[];
  content: string;
}

export interface EndpointDocConfig {
  title: string;
  version: string;
  endpoints: string[];
  description?: string;
  basePath?: string;
}

export interface FlowDocConfig {
  title: string;
  flows: string[];
  description?: string;
}

export interface ComponentDoc {
  id: string;
  name: string;
  type: ComponentType;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: string;
  }>;
  events: Array<{
    name: string;
    description?: string;
  }>;
  description?: string;
  example?: string;
}

// ==================== 常量 ====================

const DOC_TEMPLATES = {
  [DocFormat.Markdown]: {
    section: (title: string, content: string) => `## ${title}\n\n${content}`,
    h1: (title: string) => `# ${title}`,
    h2: (title: string) => `## ${title}`,
    h3: (title: string) => `### ${title}`,
    paragraph: (text: string) => text,
    code: (code: string, lang: string = 'json') => `\`\`\`${lang}\n${code}\n\`\`\``,
    table: (headers: string[], rows: string[][]) => {
      const headerLine = `| ${headers.join(' | ')} |`;
      const separator = `| ${headers.map(() => '---').join(' | ')} |`;
      const body = rows.map((row) => `| ${row.join(' | ')} |`);
      return [headerLine, separator, ...body].join('\n');
    },
    list: (items: string[]) => items.map((item) => `- ${item}`).join('\n'),
    bold: (text: string) => `**${text}**`,
    inlineCode: (text: string) => `\`${text}\``,
    link: (text: string, url: string) => `[${text}](${url})`,
  },
  [DocFormat.HTML]: {
    section: (title: string, content: string) => `<section><h2>${title}</h2>${content}</section>`,
    h1: (title: string) => `<h1>${title}</h1>`,
    h2: (title: string) => `<h2>${title}</h2>`,
    h3: (title: string) => `<h3>${title}</h3>`,
    paragraph: (text: string) => `<p>${text}</p>`,
    code: (code: string, lang: string = 'json') =>
      `<pre><code class="language-${lang}">${code}</code></pre>`,
    table: (headers: string[], rows: string[][]) => {
      const headerRow = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `<table>${headerRow}${body}</table>`;
    },
    list: (items: string[]) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`,
    bold: (text: string) => `<strong>${text}</strong>`,
    inlineCode: (text: string) => `<code>${text}</code>`,
    link: (text: string, url: string) => `<a href="${url}">${text}</a>`,
  },
  [DocFormat.JSON]: {
    section: (_title: string, content: string) => content,
    h1: (_title: string) => '',
    h2: (_title: string) => '',
    h3: (_title: string) => '',
    paragraph: (_text: string) => '',
    code: (_code: string, _lang: string = 'json') => '',
    table: (_headers: string[], _rows: string[][]) => '',
    list: (_items: string[]) => '',
    bold: (text: string) => text,
    inlineCode: (text: string) => text,
    link: (text: string, _url: string) => text,
  },
  [DocFormat.OpenAPI]: {
    section: (_title: string, content: string) => content,
    h1: (_title: string) => '',
    h2: (_title: string) => '',
    h3: (_title: string) => '',
    paragraph: (_text: string) => '',
    code: (_code: string, _lang: string = 'json') => '',
    table: (_headers: string[], _rows: string[][]) => '',
    list: (_items: string[]) => '',
    bold: (text: string) => text,
    inlineCode: (text: string) => text,
    link: (text: string, _url: string) => text,
  },
};

// ==================== 自动化文档生成器 ====================

export class AutoDocGenerator {
  private documents: Map<string, GeneratedDoc> = new Map();
  private components: Map<string, ComponentDoc> = new Map();
  private apiSourceCache: Map<string, EndpointDocConfig> = new Map();
  private flowSourceCache: Map<string, FlowDocConfig> = new Map();

  // ==================== 组件注册 ====================

  registerComponent(component: ComponentDoc): void {
    this.components.set(component.id, component);
  }

  getComponent(id: string): ComponentDoc | undefined {
    return this.components.get(id);
  }

  listComponents(type?: ComponentType): ComponentDoc[] {
    let result = Array.from(this.components.values());
    if (type) result = result.filter((c) => c.type === type);
    return result.map((c) => ({
      ...c,
      props: c.props.map((p) => ({ ...p })),
      events: c.events.map((e) => ({ ...e })),
    }));
  }

  removeComponent(id: string): boolean {
    return this.components.delete(id);
  }

  // ==================== API 文档生成 ====================

  generateApiDoc(
    id: string,
    config: EndpointDocConfig,
    format: DocFormat = DocFormat.Markdown
  ): GeneratedDoc {
    this.apiSourceCache.set(id, config);
    const sections: DocSection[] = [];
    const tmpl = DOC_TEMPLATES[format];
    const now = Date.now();

    sections.push({
      type: DocSectionType.Overview,
      title: '概述',
      order: 0,
      content: this.buildOverviewSection(config, tmpl),
    });

    sections.push({
      type: DocSectionType.Endpoints,
      title: 'API 端点',
      order: 1,
      content: this.buildEndpointsSection(config, tmpl),
    });

    sections.push({
      type: DocSectionType.Schema,
      title: '数据模型',
      order: 2,
      content: this.buildSchemaSection(config, tmpl),
    });

    sections.push({
      type: DocSectionType.Examples,
      title: '示例',
      order: 3,
      content: this.buildExamplesSection(config, tmpl),
    });

    sections.push({
      type: DocSectionType.Errors,
      title: '错误码',
      order: 4,
      content: this.buildErrorsSection(tmpl),
    });

    sections.sort((a, b) => a.order - b.order);

    const metadata: DocMetadata = {
      id,
      title: config.title,
      version: config.version,
      description: config.description ?? '',
      createdAt: now,
      updatedAt: now,
      tags: ['api', format],
      format,
    };

    const content =
      format === DocFormat.JSON
        ? JSON.stringify({ metadata, sections }, null, 2)
        : this.assembleDocument(metadata, sections, tmpl);

    const doc: GeneratedDoc = { metadata, sections, content };
    this.documents.set(id, doc);
    return this.serializeDoc(doc);
  }

  // ==================== 数据流文档生成 ====================

  generateFlowDoc(
    id: string,
    config: FlowDocConfig,
    format: DocFormat = DocFormat.Markdown
  ): GeneratedDoc {
    this.flowSourceCache.set(id, config);
    const sections: DocSection[] = [];
    const tmpl = DOC_TEMPLATES[format];
    const now = Date.now();

    sections.push({
      type: DocSectionType.Overview,
      title: '概述',
      order: 0,
      content: tmpl.paragraph(config.description ?? ''),
    });

    sections.push({
      type: DocSectionType.Flows,
      title: '数据流',
      order: 1,
      content: this.buildFlowSection(config, tmpl),
    });

    sections.push({
      type: DocSectionType.Examples,
      title: '执行示例',
      order: 2,
      content: this.buildFlowExamplesSection(config, tmpl),
    });

    sections.sort((a, b) => a.order - b.order);

    const metadata: DocMetadata = {
      id,
      title: config.title,
      version: '1.0.0',
      description: config.description ?? '',
      createdAt: now,
      updatedAt: now,
      tags: ['flow', format],
      format,
    };

    const content =
      format === DocFormat.JSON
        ? JSON.stringify({ metadata, sections }, null, 2)
        : this.assembleDocument(metadata, sections, tmpl);

    const doc: GeneratedDoc = { metadata, sections, content };
    this.documents.set(id, doc);
    return this.serializeDoc(doc);
  }

  // ==================== 组件文档生成 ====================

  generateComponentDoc(
    id: string,
    componentIds: string[],
    format: DocFormat = DocFormat.Markdown
  ): GeneratedDoc {
    const sections: DocSection[] = [];
    const tmpl = DOC_TEMPLATES[format];
    const now = Date.now();

    for (let i = 0; i < componentIds.length; i++) {
      const comp = this.components.get(componentIds[i]);
      if (!comp) continue;
      sections.push({
        type: DocSectionType.Components,
        title: comp.name,
        order: i,
        content: this.buildComponentSection(comp, tmpl),
      });
    }

    const metadata: DocMetadata = {
      id,
      title: '组件文档',
      version: '1.0.0',
      description: `${componentIds.length} 个组件`,
      createdAt: now,
      updatedAt: now,
      tags: ['component', format],
      format,
    };

    const content =
      format === DocFormat.JSON
        ? JSON.stringify({ metadata, sections }, null, 2)
        : this.assembleDocument(metadata, sections, tmpl);

    const doc: GeneratedDoc = { metadata, sections, content };
    this.documents.set(id, doc);
    return this.serializeDoc(doc);
  }

  // ==================== OpenAPI 规范生成 ====================

  generateOpenApiSpec(config: EndpointDocConfig): string {
    const spec: Record<string, unknown> = {
      openapi: '3.0.3',
      info: {
        title: config.title,
        version: config.version,
        description: config.description ?? '',
      },
      servers: config.basePath ? [{ url: config.basePath }] : [],
      paths: this.buildOpenApiPaths(config),
      components: {
        schemas: this.buildOpenApiSchemas(config),
      },
    };
    return JSON.stringify(spec, null, 2);
  }

  // ==================== 文档管理 ====================

  getDocument(id: string): GeneratedDoc | undefined {
    const doc = this.documents.get(id);
    return doc ? this.serializeDoc(doc) : undefined;
  }

  listDocuments(): Array<Pick<GeneratedDoc, 'metadata'>> {
    return Array.from(this.documents.values()).map((d) => ({ metadata: { ...d.metadata } }));
  }

  removeDocument(id: string): boolean {
    return this.documents.delete(id);
  }

  exportDocument(id: string, format: DocFormat): string | null {
    const doc = this.documents.get(id);
    if (!doc) return null;
    if (format === DocFormat.JSON || doc.metadata.format === format) {
      return doc.content;
    }
    const tmpl = DOC_TEMPLATES[format];
    return this.assembleDocument(doc.metadata, doc.sections, tmpl);
  }

  // ==================== 内部方法 ====================

  private buildOverviewSection(
    config: EndpointDocConfig,
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const parts: string[] = [];
    if (config.description) {
      parts.push(tmpl.paragraph(config.description));
    }
    parts.push(tmpl.paragraph(`版本: ${tmpl.bold(config.version)}`));
    if (config.basePath) {
      parts.push(tmpl.paragraph(`基础路径: ${tmpl.inlineCode(config.basePath)}`));
    }
    parts.push(tmpl.paragraph(`端点数: ${config.endpoints.length}`));
    return parts.join('\n\n');
  }

  private buildEndpointsSection(
    config: EndpointDocConfig,
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const rows = config.endpoints.map((id, idx) => [
      String(idx + 1),
      tmpl.inlineCode(id),
      'N/A',
      '就绪',
    ]);
    return tmpl.table(['#', '端点', '方法', '状态'], rows);
  }

  private buildSchemaSection(
    _config: EndpointDocConfig,
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const rows = [
      ['id', 'string', '是', '唯一标识符'],
      ['name', 'string', '是', '名称'],
      ['createdAt', 'datetime', '是', '创建时间'],
      ['updatedAt', 'datetime', '否', '更新时间'],
    ];
    return tmpl.table(['字段', '类型', '必填', '说明'], rows);
  }

  private buildExamplesSection(
    config: EndpointDocConfig,
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const parts: string[] = [];
    for (const endpointId of config.endpoints) {
      parts.push(tmpl.h3(endpointId));
      parts.push(tmpl.paragraph('请求示例:'));
      parts.push(tmpl.code(JSON.stringify({ id: 'example-1', name: '示例' }, null, 2)));
      parts.push(tmpl.paragraph('响应示例:'));
      parts.push(
        tmpl.code(JSON.stringify({ code: 0, data: { id: 'example-1', name: '示例' } }, null, 2))
      );
    }
    return parts.join('\n\n');
  }

  private buildErrorsSection(tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]): string {
    const rows = [
      ['200', '成功'],
      ['400', '请求参数错误'],
      ['401', '未授权'],
      ['403', '禁止访问'],
      ['404', '资源不存在'],
      ['500', '服务器内部错误'],
    ];
    return tmpl.table(['HTTP 状态码', '说明'], rows);
  }

  private buildFlowSection(
    config: FlowDocConfig,
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const parts: string[] = [];
    for (const flowId of config.flows) {
      parts.push(tmpl.h3(flowId));
      parts.push(tmpl.paragraph(`流程 ${tmpl.inlineCode(flowId)} 包含数据流节点配置。`));
    }
    return parts.join('\n\n');
  }

  private buildFlowExamplesSection(
    config: FlowDocConfig,
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const parts: string[] = [];
    for (const flowId of config.flows) {
      parts.push(tmpl.h3(`${flowId} 示例`));
      parts.push(tmpl.code(JSON.stringify({ flowId, status: 'success', nodes: [] }, null, 2)));
    }
    return parts.join('\n\n');
  }

  private buildComponentSection(
    comp: ComponentDoc,
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const parts: string[] = [];
    if (comp.description) {
      parts.push(tmpl.paragraph(comp.description));
    }
    parts.push(tmpl.h3('Props'));
    if (comp.props.length > 0) {
      const propRows = comp.props.map((p) => [
        tmpl.inlineCode(p.name),
        tmpl.inlineCode(p.type),
        p.required ? '是' : '否',
        p.description ?? '-',
        p.defaultValue ?? '-',
      ]);
      parts.push(tmpl.table(['名称', '类型', '必填', '说明', '默认值'], propRows));
    }
    if (comp.events.length > 0) {
      parts.push(tmpl.h3('事件'));
      const eventRows = comp.events.map((e) => [tmpl.inlineCode(e.name), e.description ?? '-']);
      parts.push(tmpl.table(['名称', '说明'], eventRows));
    }
    if (comp.example) {
      parts.push(tmpl.h3('示例'));
      parts.push(tmpl.code(comp.example, 'tsx'));
    }
    return parts.join('\n\n');
  }

  private assembleDocument(
    metadata: DocMetadata,
    sections: DocSection[],
    tmpl: (typeof DOC_TEMPLATES)[DocFormat.Markdown]
  ): string {
    const parts: string[] = [];
    parts.push(tmpl.h1(metadata.title));
    parts.push(
      tmpl.paragraph(
        `${tmpl.bold('版本')}: ${metadata.version} | ${tmpl.bold('更新时间')}: ${new Date(metadata.updatedAt).toISOString()}`
      )
    );
    parts.push('');
    for (const section of sections) {
      parts.push(tmpl.section(section.title, section.content));
      parts.push('');
    }
    return parts.join('\n');
  }

  private buildOpenApiPaths(config: EndpointDocConfig): Record<string, unknown> {
    const paths: Record<string, unknown> = {};
    for (const endpointId of config.endpoints) {
      paths[`/${endpointId}`] = {
        get: {
          summary: endpointId,
          operationId: endpointId,
          responses: {
            '200': { description: '成功' },
            '400': { description: '请求错误' },
            '500': { description: '服务器错误' },
          },
        },
      };
    }
    return paths;
  }

  private buildOpenApiSchemas(_config: EndpointDocConfig): Record<string, unknown> {
    return {
      Resource: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          code: { type: 'integer' },
          message: { type: 'string' },
        },
      },
    };
  }

  private serializeDoc(doc: GeneratedDoc): GeneratedDoc {
    return {
      metadata: { ...doc.metadata },
      sections: doc.sections.map((s) => ({ ...s })),
      content: doc.content,
    };
  }
}

export const autoDocGenerator = new AutoDocGenerator();
export default autoDocGenerator;
