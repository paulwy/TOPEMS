import i18n from '@/i18n';
export interface DocTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  placeholders: string[];
}

export interface GenerateDocOptions {
  description?: string;
  params?: Array<{ name: string; type: string; description?: string }>;
  returns?: string;
  throws?: Array<{ type: string; description: string }>;
  deprecated?: boolean;
  seeAlso?: string[];
  examples?: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security';
  description: string;
  author?: string;
}

export interface ReadmeSection {
  title: string;
  content: string;
}

type Formatter = (template: string, values: Record<string, string>) => string;

export class DocGenerator {
  private templates: Map<string, DocTemplate> = new Map();
  private changelog: ChangelogEntry[] = [];
  private formatters: Map<string, Formatter> = new Map();

  constructor() {
    this.initDefaultTemplates();
    this.initDefaultFormatters();
  }

  generateDoc(
    kind: 'function' | 'class' | 'interface' | 'type' | 'method',
    name: string,
    options: GenerateDocOptions = {}
  ): string {
    const templateId = this.getTemplateId(kind);
    const template = this.templates.get(templateId);
    if (!template) return '';

    const values: Record<string, string> = {
      name,
      description: options.description || this.getDefaultDescription(kind, name),
      params: this.formatParams(options.params),
      returns: this.formatReturns(options.returns),
      throws: this.formatThrows(options.throws),
      seeAlso: this.formatSeeAlso(options.seeAlso),
      examples: this.formatExamples(options.examples),
      deprecated: options.deprecated ? '\n * @deprecated' : '',
    };

    return this.formatDoc(template.template, values);
  }

  generateApiDocs(
    interfaceName: string,
    properties: Array<{ name: string; type: string; required: boolean; description?: string }>
  ): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * ${interfaceName}`);
    lines.push(` *`);
    lines.push(` * @description API interface for ${interfaceName}`);
    lines.push(` *`);
    lines.push(` * @property {Object} [data] Response data`);
    lines.push(` */`);
    lines.push(`export interface ${interfaceName} {`);
    lines.push('');

    for (const prop of properties) {
      const optional = prop.required ? '' : '?';
      const desc = prop.description ? ` ${prop.description}` : '';

      lines.push(`  /**`);
      lines.push(`   * @description ${desc || prop.name} property`);
      lines.push(`   * @type {${prop.type}}`);
      lines.push(`   */`);
      lines.push(`  ${prop.name}${optional}: ${prop.type};`);
      lines.push('');
    }

    lines.push(`}`);

    return lines.join('\n');
  }

  generateReadme(
    moduleName: string,
    options: {
      description: string;
      features?: string[];
      installation?: string;
      usage?: string;
      api?: Array<{ name: string; description: string; signature?: string }>;
      examples?: string[];
      license?: string;
    }
  ): string {
    const sections: ReadmeSection[] = [];

    sections.push({
      title: `# ${moduleName}`,
      content: options.description,
    });

    if (options.features && options.features.length > 0) {
      sections.push({
        title: i18n.t('ai.doc-generator.k0'),
        content: options.features.map((f) => `- ${f}`).join('\n'),
      });
    }

    if (options.installation) {
      sections.push({
        title: i18n.t('ai.doc-generator.k1'),
        content: `\`\`\`bash\n${options.installation}\n\`\`\``,
      });
    }

    if (options.usage) {
      sections.push({
        title: i18n.t('ai.doc-generator.k2'),
        content: `\`\`\`typescript\n${options.usage}\n\`\`\``,
      });
    }

    if (options.api && options.api.length > 0) {
      sections.push({
        title: '## 📖 API',
        content: options.api
          .map(
            (m) =>
              `### ${m.name}\n\n${m.description}\n\n\`\`\`typescript\n${m.signature || m.name}()\n\`\`\``
          )
          .join('\n\n'),
      });
    }

    if (options.examples && options.examples.length > 0) {
      sections.push({
        title: i18n.t('ai.doc-generator.k3'),
        content: options.examples
          .map((e, i) => `${i18n.t('ai.doc-generator.k4')}${i + 1}\n\n\`\`\`typescript\n${e}\n\`\`\``)
          .join('\n\n'),
      });
    }

    if (options.license) {
      sections.push({
        title: i18n.t('ai.doc-generator.k5'),
        content: options.license,
      });
    }

    return sections.map((s) => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');
  }

  generateChangelog(
    version?: string,
    entries?: Omit<ChangelogEntry, 'version' | 'date'>[]
  ): string {
    const targetVersion = version || 'Unreleased';
    const targetDate = new Date().toISOString().split('T')[0];

    const pendingEntries = entries || this.changelog.filter((e) => e.version === targetVersion);

    const groups: Record<string, ChangelogEntry[]> = {
      added: [],
      changed: [],
      fixed: [],
      removed: [],
      deprecated: [],
      security: [],
    };

    for (const entry of pendingEntries) {
      const fullEntry: ChangelogEntry = {
        ...entry,
        version: targetVersion,
        date: targetDate,
      };
      if (groups[entry.type]) {
        groups[entry.type].push(fullEntry);
      }
    }

    const typeLabels: Record<string, string> = {
      added: i18n.t('ai.doc-generator.k6'),
      changed: i18n.t('ai.doc-generator.k7'),
      fixed: i18n.t('ai.doc-generator.k8'),
      removed: i18n.t('ai.doc-generator.k9'),
      deprecated: i18n.t('ai.doc-generator.k10'),
      security: i18n.t('ai.doc-generator.k11'),
    };

    const lines: string[] = [];
    lines.push(`# Changelog`);
    lines.push('');
    lines.push(`## [${targetVersion}] - ${targetDate}`);
    lines.push('');

    let hasContent = false;
    for (const [type, group] of Object.entries(groups)) {
      if (group.length > 0) {
        hasContent = true;
        lines.push(`### ${typeLabels[type]}`);
        lines.push('');
        for (const entry of group) {
          lines.push(`- ${entry.description}${entry.author ? ` (${entry.author})` : ''}`);
        }
        lines.push('');
      }
    }

    if (!hasContent) {
      lines.push(i18n.t('ai.doc-generator.k0'));
      lines.push('');
    }

    return lines.join('\n');
  }

  getDocTemplate(kind: 'function' | 'class' | 'interface' | 'type' | 'method'): DocTemplate | null {
    const templateId = this.getTemplateId(kind);
    return this.templates.get(templateId) || null;
  }

  formatDoc(template: string, values: Record<string, string>): string {
    const formatter = this.formatters.get('default');
    if (formatter) {
      return formatter(template, values);
    }

    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
  }

  addChangelogEntry(entry: Omit<ChangelogEntry, 'date'>): void {
    this.changelog.push({
      ...entry,
      date: new Date().toISOString().split('T')[0],
    });
  }

  getChangelog(): ChangelogEntry[] {
    return [...this.changelog];
  }

  clearChangelog(): void {
    this.changelog = [];
  }

  private getTemplateId(kind: string): string {
    switch (kind) {
      case 'function':
        return 'tsdoc-function';
      case 'method':
        return 'tsdoc-method';
      case 'class':
        return 'tsdoc-class';
      case 'interface':
        return 'tsdoc-interface';
      case 'type':
        return 'tsdoc-type';
      default:
        return 'tsdoc-function';
    }
  }

  private formatParams(
    params?: Array<{ name: string; type: string; description?: string }>
  ): string {
    if (!params || params.length === 0) return '';

    return params
      .map((p) => {
        const desc = p.description ? ` - ${p.description}` : '';
        return ` * @param {${p.type}} ${p.name}${desc}`;
      })
      .join('\n');
  }

  private formatReturns(returns?: string): string {
    if (!returns) return '';
    return ` * @returns {${returns}}`;
  }

  private formatThrows(throws?: Array<{ type: string; description: string }>): string {
    if (!throws || throws.length === 0) return '';
    return throws.map((t) => ` * @throws {${t.type}} ${t.description}`).join('\n');
  }

  private formatSeeAlso(seeAlso?: string[]): string {
    if (!seeAlso || seeAlso.length === 0) return '';
    return seeAlso.map((s) => ` * @see ${s}`).join('\n');
  }

  private formatExamples(examples?: string[]): string {
    if (!examples || examples.length === 0) return '';
    return examples
      .map((ex, _i) => ` * @example\n * \`\`\`typescript\n * ${ex}\n * \`\`\``)
      .join('\n');
  }

  private getDefaultDescription(kind: string, name: string): string {
    const defaults: Record<string, string> = {
      function: `Function ${name}`,
      class: `Class ${name}`,
      interface: `Interface ${name}`,
      type: `Type ${name}`,
      method: `Method ${name}`,
    };
    return defaults[kind] || `Entity ${name}`;
  }

  private initDefaultTemplates(): void {
    this.templates.set('tsdoc-function', {
      id: 'tsdoc-function',
      name: 'TSDoc Function',
      description: 'TSDoc template for functions',
      template: `/**
 * {{description}}
{{params}}
{{returns}}
{{throws}}
{{seeAlso}}
{{deprecated}}
{{examples}}
 */
export function {{name}}(): void {
  /* TEMPLATE: Implement function body */
}`,
      placeholders: [
        'name',
        'description',
        'params',
        'returns',
        'throws',
        'seeAlso',
        'deprecated',
        'examples',
      ],
    });

    this.templates.set('tsdoc-method', {
      id: 'tsdoc-method',
      name: 'TSDoc Method',
      description: 'TSDoc template for class methods',
      template: `/**
 * {{description}}
{{params}}
{{returns}}
{{throws}}
{{seeAlso}}
{{deprecated}}
{{examples}}
 */
public {{name}}(): void {
  /* TEMPLATE: Implement method body */
}`,
      placeholders: [
        'name',
        'description',
        'params',
        'returns',
        'throws',
        'seeAlso',
        'deprecated',
        'examples',
      ],
    });

    this.templates.set('tsdoc-class', {
      id: 'tsdoc-class',
      name: 'TSDoc Class',
      description: 'TSDoc template for classes',
      template: `/**
 * {{description}}
{{seeAlso}}
{{deprecated}}
{{examples}}
 */
export class {{name}} {
  /* TEMPLATE: Implement class members (properties / methods) */
}`,
      placeholders: ['name', 'description', 'seeAlso', 'deprecated', 'examples'],
    });

    this.templates.set('tsdoc-interface', {
      id: 'tsdoc-interface',
      name: 'TSDoc Interface',
      description: 'TSDoc template for interfaces',
      template: `/**
 * {{description}}
{{seeAlso}}
{{deprecated}}
 */
export interface {{name}} {
  /* TEMPLATE: Define interface properties and method signatures */
}`,
      placeholders: ['name', 'description', 'seeAlso', 'deprecated'],
    });

    this.templates.set('tsdoc-type', {
      id: 'tsdoc-type',
      name: 'TSDoc Type',
      description: 'TSDoc template for type aliases',
      template: `/**
 * {{description}}
{{seeAlso}}
{{deprecated}}
 */
export type {{name}} = /* TEMPLATE: Define type alias body */ unknown;`,
      placeholders: ['name', 'description', 'seeAlso', 'deprecated'],
    });
  }

  private initDefaultFormatters(): void {
    this.formatters.set('default', (template, values) => {
      let result = template;
      for (const [key, value] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
      result = result.replace(/\{\{\w+\}\}/g, '');
      return result;
    });
  }
}

export const docGenerator = new DocGenerator();
