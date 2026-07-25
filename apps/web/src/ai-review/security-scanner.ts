export type SecurityCategory = 'XSS' | 'Injection' | 'CSRF' | 'Auth' | 'Encryption' | 'Exposure';
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityFinding {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  file: string;
  line: number;
  description: string;
  remediation: string;
}

export interface ScanResult {
  findings: SecurityFinding[];
  risk_score: number;
  high_risk_count: number;
  scanned_at: number;
  passed: boolean;
}

export interface ScanRule {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  pattern: RegExp;
  description: string;
  remediation: string;
  owaspId: string;
}

const OWASP_RULES: ScanRule[] = [
  {
    id: 'xss-001',
    category: 'XSS',
    severity: 'critical',
    pattern: /innerHTML\s*=/g,
    description: '直接使用 innerHTML 可能导致存储型 XSS 攻击',
    remediation: '使用 textContent 或对输入进行严格消毒',
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'xss-002',
    category: 'XSS',
    severity: 'high',
    pattern: /dangerouslySetInnerHTML/g,
    description: 'React dangerouslySetInnerHTML 可能导致 XSS',
    remediation: '使用 DOMPurify 等库进行 HTML 消毒',
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'xss-003',
    category: 'XSS',
    severity: 'high',
    pattern: /document\.write\s*\(/g,
    description: 'document.write 容易受到 XSS 攻击',
    remediation: '避免使用 document.write，使用 DOM 操作 API',
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'injection-001',
    category: 'Injection',
    severity: 'critical',
    pattern: /\beval\s*\(/g,
    description: '使用 eval() 可能导致代码注入',
    remediation: '避免使用 eval()，使用 Function 构造器或其他安全替代方案',
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'injection-002',
    category: 'Injection',
    severity: 'high',
    pattern: /new\s+Function\s*\(/g,
    description: '使用 new Function() 存在代码注入风险',
    remediation: '避免动态执行代码',
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'injection-003',
    category: 'Injection',
    severity: 'high',
    pattern: /exec\s*\(\s*['"`]/g,
    description: '命令执行可能导致远程代码执行',
    remediation: '使用参数化查询，避免拼接命令字符串',
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'csrf-001',
    category: 'CSRF',
    severity: 'medium',
    pattern: /fetch\s*\([^)]*\)/g,
    description: '跨站请求可能缺少 CSRF 保护',
    remediation: '使用 CSRF Token 机制，验证 Origin/Referer 头',
    owaspId: 'A01:2021 - Broken Access Control',
  },
  {
    id: 'auth-001',
    category: 'Auth',
    severity: 'high',
    pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*token[^'"]*['"]/gi,
    description: '将 token 存储在 localStorage 容易受到 XSS 窃取',
    remediation: '使用 HttpOnly Cookie 存储敏感凭证',
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
  {
    id: 'auth-002',
    category: 'Auth',
    severity: 'medium',
    pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*password[^'"]*['"]/gi,
    description: '密码不应存储在浏览器本地',
    remediation: '不应在客户端存储密码，使用安全的认证机制',
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
  {
    id: 'auth-003',
    category: 'Auth',
    severity: 'high',
    pattern: /sessionStorage\.setItem\s*\(\s*['"][^'"]*token[^'"]*['"]/gi,
    description: 'Token 存储在 sessionStorage 存在安全风险',
    remediation: '使用 HttpOnly 和 Secure Cookie',
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
  {
    id: 'encryption-001',
    category: 'Encryption',
    severity: 'high',
    pattern: /\bmd5\b|\bsha1\b/gi,
    description: '使用弱哈希算法（MD5/SHA1）',
    remediation: '使用 SHA-256 或更强的哈希算法',
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'encryption-002',
    category: 'Encryption',
    severity: 'high',
    pattern: /crypto\.createHash\s*\(\s*['"](md5|sha1)['"]/gi,
    description: '使用弱哈希算法创建哈希',
    remediation: '使用 sha256 或 sha512',
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'exposure-001',
    category: 'Exposure',
    severity: 'critical',
    pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
    description: '可能在源代码中暴露 API 密钥',
    remediation: '使用环境变量或密钥管理服务',
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'exposure-002',
    category: 'Exposure',
    severity: 'high',
    pattern: /secret\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/gi,
    description: '可能在源代码中暴露密钥/秘密',
    remediation: '使用环境变量或密钥管理系统',
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'exposure-003',
    category: 'Exposure',
    severity: 'medium',
    pattern: /console\.(log|error|warn)\([^)]*(?:password|secret|token|key)/gi,
    description: '日志中可能泄露敏感信息',
    remediation: '移除敏感信息的日志输出',
    owaspId: 'A04:2021 - Insecure Design',
  },
  {
    id: 'exposure-004',
    category: 'Exposure',
    severity: 'medium',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
    description: '使用 HTTP 而非 HTTPS 传输数据',
    remediation: '始终使用 HTTPS 进行安全通信',
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'injection-004',
    category: 'Injection',
    severity: 'medium',
    pattern: /\.innerHTML\s*=|\.outerHTML\s*=/g,
    description: '直接操作 HTML 内容可能导致 XSS',
    remediation: '使用 textContent 或框架的安全渲染方法',
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'auth-004',
    category: 'Auth',
    severity: 'medium',
    pattern: /httpOnly\s*:\s*false|httpOnly\s*=\s*false/gi,
    description: 'Cookie 设置为非 HttpOnly，容易受到 XSS 窃取',
    remediation: '启用 HttpOnly、Secure 和 SameSite 属性',
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
];

export class SecurityScanner {
  private rules: ScanRule[];

  constructor() {
    this.rules = [...OWASP_RULES];
  }

  scan_code(code: string, file: string = 'inline'): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (const rule of this.rules) {
      const matches = code.match(new RegExp(rule.pattern.source, rule.pattern.flags));
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          const lineNo = this.find_line_number(code, matches[i]);
          findings.push({
            id: `${rule.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            category: rule.category,
            severity: rule.severity,
            file,
            line: lineNo,
            description: rule.description,
            remediation: rule.remediation,
          });
        }
      }
    }

    return findings.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  scan_dependencies(dependencies: Record<string, string>): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const knownVulnerabilities: Record<
      string,
      { severity: SecuritySeverity; description: string; remediation: string }
    > = {
      lodash: {
        severity: 'medium',
        description: '检查 lodash 版本是否存在已知漏洞',
        remediation: '升级到最新版本或使用 lodash-es',
      },
      axios: {
        severity: 'low',
        description: '检查 axios 版本安全性',
        remediation: '保持 axios 更新到最新版本',
      },
      express: {
        severity: 'medium',
        description: '检查 express 版本是否存在已知漏洞',
        remediation: '升级到 express 4.x 最新版',
      },
      jquery: {
        severity: 'high',
        description: '使用 jQuery 可能存在 XSS 漏洞',
        remediation: '考虑移除 jQuery 依赖',
      },
    };

    for (const [name, version] of Object.entries(dependencies)) {
      const vuln = knownVulnerabilities[name.toLowerCase()];
      if (vuln) {
        findings.push({
          id: `dep-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          category: 'Exposure',
          severity: vuln.severity,
          file: `package.json`,
          line: 0,
          description: `依赖 ${name}@${version}: ${vuln.description}`,
          remediation: vuln.remediation,
        });
      }
    }

    return findings;
  }

  scan_config(config: Record<string, unknown>): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const configStr = JSON.stringify(config);

    if (/debug\s*[:=]\s*true/i.test(configStr)) {
      findings.push({
        id: `config-debug-${Date.now()}`,
        category: 'Exposure',
        severity: 'medium',
        file: 'config',
        line: 0,
        description: '生产环境中启用了 debug 模式',
        remediation: '在生产环境中禁用 debug 模式',
      });
    }

    if (/cors\s*[:=]\s*['"]\*['"]/i.test(configStr)) {
      findings.push({
        id: `config-cors-${Date.now()}`,
        category: 'CSRF',
        severity: 'medium',
        file: 'config',
        line: 0,
        description: 'CORS 配置为允许所有来源',
        remediation: '限制 CORS 为特定的可信域名',
      });
    }

    return findings;
  }

  generate_report(findings: SecurityFinding[]): ScanResult {
    const highRiskCount = findings.filter(
      (f) => f.severity === 'critical' || f.severity === 'high'
    ).length;

    const riskScore = this.calculate_risk_score(findings);
    const passed = highRiskCount === 0;

    return {
      findings,
      risk_score: riskScore,
      high_risk_count: highRiskCount,
      scanned_at: Date.now(),
      passed,
    };
  }

  get_finding_by_id(id: string): SecurityFinding | undefined {
    return this.rules.find((r) => r.id === id) as unknown as SecurityFinding;
  }

  list_findings(): ScanRule[] {
    return [...this.rules];
  }

  get_risk_score(findings: SecurityFinding[]): number {
    return this.calculate_risk_score(findings);
  }

  private calculate_risk_score(findings: SecurityFinding[]): number {
    let score = 100;
    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }
    return Math.max(0, Math.min(100, score));
  }

  private find_line_number(code: string, match: string): number {
    const idx = code.indexOf(match);
    if (idx === -1) return 1;
    return code.slice(0, idx).split('\n').length;
  }
}

export const securityScanner = new SecurityScanner();
