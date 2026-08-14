import i18n from '@/i18n';
export type CSPDirective =
  | 'defaultSrc'
  | 'scriptSrc'
  | 'styleSrc'
  | 'imgSrc'
  | 'fontSrc'
  | 'connectSrc'
  | 'frameSrc'
  | 'objectSrc'
  | 'mediaSrc'
  | 'workerSrc'
  | 'manifestSrc'
  | 'prefetchSrc';

export enum CSPStrategy {
  STRICT = 'strict',
  BALANCED = 'balanced',
  PERMISSIVE = 'permissive',
}

export interface CSPPolicy {
  directives: Partial<Record<CSPDirective, string[]>>;
  reportOnly: boolean;
  nonce?: string;
  hashAlgorithms: ('sha256' | 'sha384' | 'sha512')[];
}

export interface CSPViolation {
  documentUri: string;
  violatedDirective: string;
  blockedUri: string;
  originalPolicy: string;
  disposition: 'enforce' | 'report';
}

const DIRECTIVE_MAP: Record<CSPDirective, string> = {
  defaultSrc: 'default-src',
  scriptSrc: 'script-src',
  styleSrc: 'style-src',
  imgSrc: 'img-src',
  fontSrc: 'font-src',
  connectSrc: 'connect-src',
  frameSrc: 'frame-src',
  objectSrc: 'object-src',
  mediaSrc: 'media-src',
  workerSrc: 'worker-src',
  manifestSrc: 'manifest-src',
  prefetchSrc: 'prefetch-src',
};

const STRATEGY_DEFAULTS: Record<CSPStrategy, Partial<Record<CSPDirective, string[]>>> = {
  [CSPStrategy.STRICT]: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    workerSrc: ["'none'"],
    manifestSrc: ["'self'"],
    prefetchSrc: ["'self'"],
  },
  [CSPStrategy.BALANCED]: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'https:'],
    frameSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", 'https:'],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
    prefetchSrc: ["'self'"],
  },
  [CSPStrategy.PERMISSIVE]: {
    defaultSrc: ["'self'", '*'],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", '*'],
    styleSrc: ["'self'", "'unsafe-inline'", '*'],
    imgSrc: ["'self'", 'data:', 'blob:', '*'],
    fontSrc: ["'self'", 'data:', '*'],
    connectSrc: ['*'],
    frameSrc: ['*'],
    objectSrc: ["'self'"],
    mediaSrc: ['*'],
    workerSrc: ["'self'", 'blob:'],
    manifestSrc: ["'self'"],
    prefetchSrc: ['*'],
  },
};

export class CSPManager {
  private policies: Map<string, CSPPolicy> = new Map();
  private modulePolicies: Map<string, Partial<Record<CSPDirective, string[]>>> = new Map();
  private violations: CSPViolation[] = [];
  private currentPolicy: CSPPolicy;
  private nonce: string;
  private maxViolations = 100;

  constructor(strategy: CSPStrategy = CSPStrategy.BALANCED) {
    this.nonce = this.generateNonce();
    this.currentPolicy = {
      directives: { ...STRATEGY_DEFAULTS[strategy] },
      reportOnly: false,
      nonce: this.nonce,
      hashAlgorithms: ['sha256', 'sha384'],
    };
    this.setupViolationListener();
  }

  private setupViolationListener(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
        const violation: CSPViolation = {
          documentUri: e.documentURI,
          violatedDirective: e.violatedDirective,
          blockedUri: e.blockedURI,
          originalPolicy: e.originalPolicy,
          disposition: e.disposition as 'enforce' | 'report',
        };
        this.violations.push(violation);
        if (this.violations.length > this.maxViolations) {
          this.violations = this.violations.slice(-this.maxViolations);
        }
      });
    }
  }

  applyPolicy(policy?: Partial<CSPPolicy>): void {
    if (policy) {
      this.currentPolicy = {
        ...this.currentPolicy,
        ...policy,
        directives: policy.directives ? { ...policy.directives } : this.currentPolicy.directives,
      };
    }

    if (typeof document !== 'undefined') {
      const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (existingMeta) {
        existingMeta.remove();
      }

      const meta = document.createElement('meta');
      meta.httpEquiv = this.currentPolicy.reportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';
      meta.content = this.buildPolicyString();
      document.head.appendChild(meta);
    }
  }

  private buildPolicyString(): string {
    const parts: string[] = [];
    const mergedDirectives = this.getMergedDirectives();

    Object.entries(mergedDirectives).forEach(([key, values]) => {
      const directiveName = DIRECTIVE_MAP[key as CSPDirective];
      if (directiveName && values && values.length > 0) {
        const valuesWithNonce =
          this.currentPolicy.nonce && key === 'scriptSrc'
            ? [...values, `'nonce-${this.currentPolicy.nonce}'`]
            : values;
        parts.push(`${directiveName} ${valuesWithNonce.join(' ')}`);
      }
    });

    return parts.join('; ');
  }

  private getMergedDirectives(): Partial<Record<CSPDirective, string[]>> {
    const merged: Partial<Record<CSPDirective, string[]>> = { ...this.currentPolicy.directives };

    this.modulePolicies.forEach((modulePolicy) => {
      Object.entries(modulePolicy).forEach(([key, values]) => {
        const directive = key as CSPDirective;
        if (!merged[directive]) {
          merged[directive] = [];
        }
        if (values) {
          values.forEach((v) => {
            if (!merged[directive]!.includes(v)) {
              merged[directive]!.push(v);
            }
          });
        }
      });
    });

    return merged;
  }

  updateDirective(directive: CSPDirective, values: string[]): void {
    this.currentPolicy.directives[directive] = [...values];
    this.applyPolicy();
  }

  addModulePolicy(moduleName: string, directives: Partial<Record<CSPDirective, string[]>>): void {
    this.modulePolicies.set(moduleName, directives);
    this.applyPolicy();
  }

  removeModulePolicy(moduleName: string): boolean {
    const removed = this.modulePolicies.delete(moduleName);
    if (removed) {
      this.applyPolicy();
    }
    return removed;
  }

  getViolations(): CSPViolation[] {
    return [...this.violations];
  }

  generateNonce(): string {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  rotateNonce(): string {
    this.nonce = this.generateNonce();
    this.currentPolicy.nonce = this.nonce;
    this.applyPolicy();
    return this.nonce;
  }

  getCurrentNonce(): string {
    return this.nonce;
  }

  async hashContent(
    content: string,
    algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'
  ): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest(algorithm.toUpperCase(), data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashBase64 = btoa(String.fromCharCode(...hashArray));
      return `'${algorithm}-${hashBase64}'`;
    }
    return `'${algorithm}-${btoa(content).slice(0, 32)}'`;
  }

  evaluatePolicy(): {
    score: number;
    risks: string[];
    strengths: string[];
  } {
    const directives = this.getMergedDirectives();
    const risks: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    const scriptSrc = directives.scriptSrc || [];
    if (scriptSrc.includes("'unsafe-inline'")) {
      risks.push(i18n.t('microfrontend.csp-manager.k0'));
      score -= 15;
    }
    if (scriptSrc.includes("'unsafe-eval'")) {
      risks.push(i18n.t('microfrontend.csp-manager.k1'));
      score -= 20;
    }
    if (scriptSrc.includes('*')) {
      risks.push(i18n.t('microfrontend.csp-manager.k2'));
      score -= 25;
    }
    if (scriptSrc.includes("'nonce-") || scriptSrc.some((s) => /'sha\d+-/.test(s))) {
      strengths.push(i18n.t('microfrontend.csp-manager.k0'));
      score += 10;
    }

    const objectSrc = directives.objectSrc || [];
    if (objectSrc.includes("'none'")) {
      strengths.push(i18n.t('microfrontend.csp-manager.k3'));
      score += 5;
    } else {
      risks.push(i18n.t('microfrontend.csp-manager.k4'));
      score -= 10;
    }

    const defaultSrc = directives.defaultSrc || [];
    if (defaultSrc.includes("'self'") && !defaultSrc.includes('*')) {
      strengths.push(i18n.t('microfrontend.csp-manager.k5'));
      score += 5;
    }

    const frameSrc = directives.frameSrc || [];
    if (frameSrc.includes("'none'")) {
      strengths.push(i18n.t('microfrontend.csp-manager.k6'));
      score += 5;
    }

    if (this.currentPolicy.reportOnly) {
      strengths.push(i18n.t('microfrontend.csp-manager.k1'));
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      risks,
      strengths,
    };
  }

  getRecommendations(): string[] {
    const { risks } = this.evaluatePolicy();
    const recommendations: string[] = [];

    if (risks.some((r) => r.includes('unsafe-inline'))) {
      recommendations.push(i18n.t('microfrontend.csp-manager.k2'));
    }
    if (risks.some((r) => r.includes('unsafe-eval'))) {
      recommendations.push(i18n.t('microfrontend.csp-manager.k3'));
    }
    if (risks.some((r) => r.includes(i18n.t('microfrontend.csp-manager.k4')))) {
      recommendations.push(i18n.t('microfrontend.csp-manager.k5'));
    }
    if (risks.some((r) => r.includes('object-src'))) {
      recommendations.push(i18n.t('microfrontend.csp-manager.k6'));
    }
    if (!risks.some((r) => r.includes('frame-src'))) {
      recommendations.push(i18n.t('microfrontend.csp-manager.k7'));
    }

    recommendations.push(i18n.t('microfrontend.csp-manager.csp_8'));
    recommendations.push(i18n.t('microfrontend.csp-manager.k9'));

    return recommendations;
  }

  getPolicy(): CSPPolicy {
    return {
      ...this.currentPolicy,
      directives: { ...this.getMergedDirectives() },
    };
  }

  setStrategy(strategy: CSPStrategy): void {
    this.currentPolicy.directives = { ...STRATEGY_DEFAULTS[strategy] };
    this.applyPolicy();
  }

  clearViolations(): void {
    this.violations = [];
  }
}

export const cspManager = new CSPManager();
export default cspManager;
