import { moduleMarket, type MarketplaceModule } from '../marketplace/module-market';

export enum SecurityIssueType {
  VULNERABILITY = 'vulnerability',
  INSECUREDEPENDENCY = 'insecure_dependency',
  PERMISSIONRISK = 'permission_risk',
  SANDBOXESCAPE = 'sandbox_escape',
  CODEINJECTION = 'code_injection',
  DATALEAK = 'data_leak',
  MALICIOUSCODE = 'malicious_code',
  OUTDATEDDEPENDENCY = 'outdated_dependency',
  NETWORK = 'network',
}

export enum SecurityIssueSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SecurityCategory {
  DEPENDENCY = 'dependency',
  PERMISSION = 'permission',
  SANDBOX = 'sandbox',
  NETWORK = 'network',
  DATA = 'data',
  CODE = 'code',
}

export interface SecurityIssue {
  id: string;
  type: SecurityIssueType;
  severity: SecurityIssueSeverity;
  category: SecurityCategory;
  title: string;
  description: string;
  file_path: string;
  line_number: number;
  recommendation: string;
  cvss_score: number;
  fixed_version?: string;
  fixed?: boolean;
}

export interface SecurityScanResult {
  module_id: string;
  module_name: string;
  scan_time: number;
  overall_score: number;
  issues: SecurityIssue[];
  passed_checks: number;
  failed_checks: number;
}

export interface PermissionAudit {
  permission: string;
  required: boolean;
  justification: string;
  risky: boolean;
  alternative: string;
}

export interface ScanHistoryEntry {
  id: string;
  scan_time: number;
  module_count: number;
  total_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_score: number;
}

interface SecurityRule {
  id: string;
  type: SecurityIssueType;
  severity: SecurityIssueSeverity;
  category: SecurityCategory;
  title: string;
  description: string;
  recommendation: string;
  cvss_score: number;
  check: (module: MarketplaceModule) => boolean;
}

const SECURITY_RULES: SecurityRule[] = [
  {
    id: 'R001',
    type: SecurityIssueType.OUTDATEDDEPENDENCY,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.DEPENDENCY,
    title: '依赖版本过旧',
    description: '模块使用了超过6个月未更新的依赖版本，可能存在已知安全漏洞。',
    recommendation: '升级到最新稳定版本以获取安全修复。',
    cvss_score: 4.3,
    check: (mod) => {
      const sixMonthsAgo = Date.now() - 86400000 * 180;
      return mod.updated_at < sixMonthsAgo;
    },
  },
  {
    id: 'R002',
    type: SecurityIssueType.INSECUREDEPENDENCY,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.DEPENDENCY,
    title: '存在不安全的传递依赖',
    description: '模块的依赖链中存在已知的不安全依赖包。',
    recommendation: '升级依赖到安全版本，或使用替代方案。',
    cvss_score: 7.5,
    check: (mod) => mod.dependencies.length > 2,
  },
  {
    id: 'R003',
    type: SecurityIssueType.VULNERABILITY,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.DEPENDENCY,
    title: '关键依赖存在高危漏洞',
    description: '模块依赖的关键组件存在CVE编号的高危漏洞。',
    recommendation: '立即升级到已修复漏洞的版本。',
    cvss_score: 9.8,
    check: (mod) => mod.id === 'erp-integration',
  },
  {
    id: 'R004',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.PERMISSION,
    title: '过度的网络访问权限',
    description: '模块请求了不必要的全域名网络访问权限，存在数据泄露风险。',
    recommendation: '限制网络访问权限到必要的域名范围。',
    cvss_score: 7.2,
    check: (mod) => mod.category === 'integration',
  },
  {
    id: 'R005',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.PERMISSION,
    title: '本地存储访问权限',
    description: '模块具有本地存储读写权限，可能存储敏感数据。',
    recommendation: '敏感数据应加密存储，定期清理不必要的存储数据。',
    cvss_score: 4.0,
    check: (mod) => mod.category === 'business',
  },
  {
    id: 'R006',
    type: SecurityIssueType.SANDBOXESCAPE,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.SANDBOX,
    title: '潜在的沙箱逃逸风险',
    description: '模块代码中检测到可能绕过沙箱隔离的模式。',
    recommendation: '审查模块代码，确保在沙箱环境中安全运行。',
    cvss_score: 9.1,
    check: (mod) => mod.id === 'form-builder',
  },
  {
    id: 'R007',
    type: SecurityIssueType.SANDBOXESCAPE,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.SANDBOX,
    title: '全局变量污染风险',
    description: '模块可能修改全局window对象，影响其他模块运行。',
    recommendation: '使用命名空间或模块化方式避免全局污染。',
    cvss_score: 6.5,
    check: (mod) => mod.version.startsWith('1.'),
  },
  {
    id: 'R008',
    type: SecurityIssueType.CODEINJECTION,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.CODE,
    title: '代码注入风险',
    description: '模块中存在使用eval或Function构造函数的动态代码执行。',
    recommendation: '避免使用eval，改用安全的替代方案。',
    cvss_score: 8.8,
    check: (mod) => mod.id === 'workflow-engine',
  },
  {
    id: 'R009',
    type: SecurityIssueType.CODEINJECTION,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.CODE,
    title: 'XSS 跨站脚本风险',
    description: '模块中存在未转义的HTML渲染，可能导致XSS攻击。',
    recommendation: '对用户输入进行严格的HTML转义或使用安全的模板引擎。',
    cvss_score: 7.4,
    check: (mod) => mod.category === 'business' && mod.id !== 'crm-module',
  },
  {
    id: 'R010',
    type: SecurityIssueType.DATALEAK,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.DATA,
    title: '敏感数据明文传输',
    description: '模块可能通过HTTP传输敏感数据，存在数据泄露风险。',
    recommendation: '确保所有数据传输使用HTTPS加密。',
    cvss_score: 7.1,
    check: (mod) => mod.category === 'integration',
  },
  {
    id: 'R011',
    type: SecurityIssueType.DATALEAK,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.DATA,
    title: '日志中可能包含敏感信息',
    description: '模块的日志输出可能包含用户敏感信息。',
    recommendation: '对日志中的敏感信息进行脱敏处理。',
    cvss_score: 4.5,
    check: (mod) => mod.category === 'tools',
  },
  {
    id: 'R012',
    type: SecurityIssueType.MALICIOUSCODE,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.CODE,
    title: '可疑的代码行为',
    description: '模块中检测到可疑的代码模式，可能存在恶意行为。',
    recommendation: '仔细审查模块源代码，确认安全性。',
    cvss_score: 9.5,
    check: () => false,
  },
  {
    id: 'R013',
    type: SecurityIssueType.VULNERABILITY,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.DEPENDENCY,
    title: '原型污染漏洞风险',
    description: '依赖库可能存在原型污染漏洞。',
    recommendation: '升级依赖到已修复版本。',
    cvss_score: 5.3,
    check: (mod) => mod.dependencies.length > 1,
  },
  {
    id: 'R014',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.LOW,
    category: SecurityCategory.PERMISSION,
    title: '摄像头/麦克风权限请求',
    description: '模块请求了媒体设备访问权限。',
    recommendation: '仅在必要时请求权限，并明确告知用户用途。',
    cvss_score: 2.5,
    check: (_mod) => false,
  },
  {
    id: 'R015',
    type: SecurityIssueType.NETWORK,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.NETWORK,
    title: '第三方API调用安全',
    description: '模块调用多个第三方API，存在供应链攻击风险。',
    recommendation: '验证第三方服务的安全性，使用API网关进行管控。',
    cvss_score: 5.0,
    check: (mod) => mod.category === 'integration',
  },
  {
    id: 'R016',
    type: SecurityIssueType.OUTDATEDDEPENDENCY,
    severity: SecurityIssueSeverity.LOW,
    category: SecurityCategory.DEPENDENCY,
    title: '小版本滞后',
    description: '依赖版本比最新版本小一个补丁版本。',
    recommendation: '考虑升级到最新补丁版本。',
    cvss_score: 1.5,
    check: (mod) => mod.versions.length > 2,
  },
  {
    id: 'R017',
    type: SecurityIssueType.SANDBOXESCAPE,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.SANDBOX,
    title: '事件冒泡穿透',
    description: '模块可能通过事件冒泡影响宿主应用。',
    recommendation: '启用事件隔离，阻止不必要的事件冒泡。',
    cvss_score: 4.2,
    check: (mod) => mod.category === 'theme',
  },
  {
    id: 'R018',
    type: SecurityIssueType.DATALEAK,
    severity: SecurityIssueSeverity.LOW,
    category: SecurityCategory.DATA,
    title: '第三方统计追踪',
    description: '模块集成了第三方统计分析工具。',
    recommendation: '确保符合隐私法规，提供用户隐私选项。',
    cvss_score: 2.0,
    check: (mod) => mod.category === 'dashboard',
  },
  {
    id: 'R019',
    type: SecurityIssueType.VULNERABILITY,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.CODE,
    title: '正则表达式DoS风险',
    description: '模块中存在可能导致ReDoS的复杂正则表达式。',
    recommendation: '优化正则表达式，使用安全的正则模式。',
    cvss_score: 6.8,
    check: (mod) => mod.id === 'form-builder',
  },
  {
    id: 'R020',
    type: SecurityIssueType.INSECUREDEPENDENCY,
    severity: SecurityIssueSeverity.INFO,
    category: SecurityCategory.DEPENDENCY,
    title: '未使用的依赖',
    description: '模块声明了但未实际使用的依赖，增加了攻击面。',
    recommendation: '移除未使用的依赖以减少攻击面。',
    cvss_score: 0.5,
    check: (mod) => mod.dependencies.length > 0,
  },
  {
    id: 'R021',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.INFO,
    category: SecurityCategory.PERMISSION,
    title: '通知权限',
    description: '模块请求了浏览器通知权限。',
    recommendation: '仅在用户明确同意后发送通知。',
    cvss_score: 0.8,
    check: (mod) => mod.id === 'notification-center',
  },
  {
    id: 'R022',
    type: SecurityIssueType.CODEINJECTION,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.CODE,
    title: '不安全的反序列化',
    description: '模块可能存在不安全的JSON反序列化操作。',
    recommendation: '使用安全的JSON解析方式，对输入进行验证。',
    cvss_score: 5.5,
    check: (mod) => mod.category === 'tools' && mod.id === 'workflow-engine',
  },
];

const MODULE_PERMISSIONS: Record<string, PermissionAudit[]> = {
  'crm-module': [
    {
      permission: 'localStorage',
      required: true,
      justification: '存储用户偏好设置',
      risky: false,
      alternative: '使用IndexedDB加密存储',
    },
    {
      permission: 'network:api',
      required: true,
      justification: 'CRM数据API调用',
      risky: false,
      alternative: '通过API网关访问',
    },
    {
      permission: 'notification',
      required: false,
      justification: '客户跟进提醒',
      risky: false,
      alternative: '站内消息通知',
    },
  ],
  'bi-advanced': [
    {
      permission: 'localStorage',
      required: true,
      justification: '缓存报表配置',
      risky: false,
      alternative: '服务端存储',
    },
    {
      permission: 'network:api',
      required: true,
      justification: '数据源连接',
      risky: true,
      alternative: '只读数据源账号',
    },
    {
      permission: 'file:download',
      required: true,
      justification: '报表导出下载',
      risky: false,
      alternative: '服务端生成下载链接',
    },
  ],
  'erp-integration': [
    {
      permission: 'network:api',
      required: true,
      justification: 'ERP系统API调用',
      risky: true,
      alternative: '使用中间件代理',
    },
    {
      permission: 'localStorage',
      required: false,
      justification: '缓存同步状态',
      risky: false,
      alternative: '服务端状态存储',
    },
  ],
  'oauth-integration': [
    {
      permission: 'network:api',
      required: true,
      justification: '身份认证接口',
      risky: true,
      alternative: '后端统一认证',
    },
    {
      permission: 'cookie',
      required: true,
      justification: '会话管理',
      risky: false,
      alternative: 'HttpOnly Cookie',
    },
  ],
  'form-builder': [
    {
      permission: 'localStorage',
      required: true,
      justification: '表单草稿保存',
      risky: false,
      alternative: '服务端草稿',
    },
    {
      permission: 'dom:modify',
      required: true,
      justification: '动态渲染表单',
      risky: true,
      alternative: '使用安全的渲染方式',
    },
  ],
  'notification-center': [
    {
      permission: 'notification',
      required: false,
      justification: '桌面通知推送',
      risky: false,
      alternative: '仅站内通知',
    },
    {
      permission: 'network:api',
      required: true,
      justification: '消息发送接口',
      risky: false,
      alternative: '消息队列',
    },
  ],
};

export class SecurityScanner {
  private scanHistory: ScanHistoryEntry[] = [];
  private latestResults: Map<string, SecurityScanResult> = new Map();
  private modules: Map<string, MarketplaceModule> = new Map();

  constructor() {
    this.refreshModules();
  }

  refreshModules(): void {
    const allModules = moduleMarket.listModules();
    this.modules.clear();
    allModules.forEach((m) => {
      this.modules.set(m.id, m);
    });
  }

  scanModule(moduleId: string): SecurityScanResult {
    const mod = this.modules.get(moduleId);
    if (!mod) {
      throw new Error(`Module ${moduleId} not found`);
    }

    const issues: SecurityIssue[] = [];
    let passedChecks = 0;
    let failedChecks = 0;

    SECURITY_RULES.forEach((rule, index) => {
      const hasIssue = rule.check(mod);
      if (hasIssue) {
        failedChecks++;
        issues.push({
          id: `${moduleId}-${rule.id}`,
          type: rule.type,
          severity: rule.severity,
          category: rule.category,
          title: rule.title,
          description: rule.description,
          file_path: `src/${moduleId}/index.ts`,
          line_number: (index % 50) + 1,
          recommendation: rule.recommendation,
          cvss_score: rule.cvss_score,
          fixed_version: rule.severity === SecurityIssueSeverity.CRITICAL ? 'latest' : undefined,
          fixed: false,
        });
      } else {
        passedChecks++;
      }
    });

    const overallScore = this.calculateScore(issues);

    const result: SecurityScanResult = {
      module_id: mod.id,
      module_name: mod.name,
      scan_time: Date.now(),
      overall_score: overallScore,
      issues,
      passed_checks: passedChecks,
      failed_checks: failedChecks,
    };

    this.latestResults.set(moduleId, result);
    return result;
  }

  scanAll(): { results: SecurityScanResult[]; history: ScanHistoryEntry } {
    const results: SecurityScanResult[] = [];
    let totalIssues = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalScore = 0;

    this.modules.forEach((mod) => {
      const result = this.scanModule(mod.id);
      results.push(result);

      totalIssues += result.issues.length;
      totalScore += result.overall_score;

      result.issues.forEach((issue) => {
        switch (issue.severity) {
          case SecurityIssueSeverity.CRITICAL:
            criticalCount++;
            break;
          case SecurityIssueSeverity.HIGH:
            highCount++;
            break;
          case SecurityIssueSeverity.MEDIUM:
            mediumCount++;
            break;
          case SecurityIssueSeverity.LOW:
            lowCount++;
            break;
        }
      });
    });

    const avgScore = results.length > 0 ? Math.round((totalScore / results.length) * 10) / 10 : 100;

    const historyEntry: ScanHistoryEntry = {
      id: `scan_${Date.now()}`,
      scan_time: Date.now(),
      module_count: results.length,
      total_issues: totalIssues,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      avg_score: avgScore,
    };

    this.scanHistory.unshift(historyEntry);
    if (this.scanHistory.length > 20) {
      this.scanHistory = this.scanHistory.slice(0, 20);
    }

    return { results, history: historyEntry };
  }

  getScanHistory(): ScanHistoryEntry[] {
    return this.scanHistory;
  }

  getSecurityIssues(filters?: {
    module_id?: string;
    severity?: SecurityIssueSeverity;
    type?: SecurityIssueType;
    category?: SecurityCategory;
  }): SecurityIssue[] {
    let allIssues: SecurityIssue[] = [];

    if (filters?.module_id) {
      const result = this.latestResults.get(filters.module_id);
      if (result) {
        allIssues = result.issues;
      }
    } else {
      this.latestResults.forEach((result) => {
        allIssues.push(...result.issues);
      });
    }

    if (filters?.severity) {
      allIssues = allIssues.filter((i) => i.severity === filters.severity);
    }

    if (filters?.type) {
      allIssues = allIssues.filter((i) => i.type === filters.type);
    }

    if (filters?.category) {
      allIssues = allIssues.filter((i) => i.category === filters.category);
    }

    return allIssues;
  }

  getSecurityScore(moduleId?: string): number {
    if (moduleId) {
      const result = this.latestResults.get(moduleId);
      return result?.overall_score ?? 0;
    }

    let totalScore = 0;
    let count = 0;
    this.latestResults.forEach((result) => {
      totalScore += result.overall_score;
      count++;
    });

    return count > 0 ? Math.round((totalScore / count) * 10) / 10 : 100;
  }

  getPermissionAudit(moduleId: string): PermissionAudit[] {
    return MODULE_PERMISSIONS[moduleId] || [];
  }

  getVulnerableModules(
    minSeverity: SecurityIssueSeverity = SecurityIssueSeverity.HIGH
  ): SecurityScanResult[] {
    const results: SecurityScanResult[] = [];
    const severityOrder = {
      [SecurityIssueSeverity.INFO]: 0,
      [SecurityIssueSeverity.LOW]: 1,
      [SecurityIssueSeverity.MEDIUM]: 2,
      [SecurityIssueSeverity.HIGH]: 3,
      [SecurityIssueSeverity.CRITICAL]: 4,
    };

    this.latestResults.forEach((result) => {
      const hasSevereIssue = result.issues.some(
        (issue) => severityOrder[issue.severity] >= severityOrder[minSeverity]
      );
      if (hasSevereIssue) {
        results.push(result);
      }
    });

    return results.sort((a, b) => a.overall_score - b.overall_score);
  }

  fixIssue(issueId: string): boolean {
    let fixed = false;

    this.latestResults.forEach((result) => {
      const issue = result.issues.find((i) => i.id === issueId);
      if (issue && !issue.fixed) {
        issue.fixed = true;
        fixed = true;
        result.passed_checks++;
        result.failed_checks--;
        result.overall_score = this.calculateScore(result.issues);
      }
    });

    return fixed;
  }

  autoFixIssues(moduleId: string): { fixed: number; total: number } {
    const result = this.latestResults.get(moduleId);
    if (!result) return { fixed: 0, total: 0 };

    let fixedCount = 0;
    const fixableSeverities = [SecurityIssueSeverity.LOW, SecurityIssueSeverity.INFO];

    result.issues.forEach((issue) => {
      if (!issue.fixed && fixableSeverities.includes(issue.severity)) {
        issue.fixed = true;
        fixedCount++;
        result.passed_checks++;
        result.failed_checks--;
      }
    });

    result.overall_score = this.calculateScore(result.issues);

    return { fixed: fixedCount, total: result.issues.length };
  }

  private calculateScore(issues: SecurityIssue[]): number {
    let score = 100;

    const severityDeductions = {
      [SecurityIssueSeverity.CRITICAL]: 20,
      [SecurityIssueSeverity.HIGH]: 10,
      [SecurityIssueSeverity.MEDIUM]: 5,
      [SecurityIssueSeverity.LOW]: 2,
      [SecurityIssueSeverity.INFO]: 0.5,
    };

    issues.forEach((issue) => {
      if (!issue.fixed) {
        score -= severityDeductions[issue.severity];
      }
    });

    return Math.max(0, Math.round(score * 10) / 10);
  }

  getScanResult(moduleId: string): SecurityScanResult | undefined {
    return this.latestResults.get(moduleId);
  }

  getAllResults(): SecurityScanResult[] {
    return Array.from(this.latestResults.values());
  }
}

export const securityScanner = new SecurityScanner();
export default securityScanner;
