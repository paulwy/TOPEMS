import { moduleMarket, type MarketplaceModule } from '../marketplace/module-market';
import i18n from '@/i18n';

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
    title: i18n.t('microfrontend.security-scanner.k0'),
    description: i18n.t('microfrontend.security-scanner.k1'),
    recommendation: i18n.t('microfrontend.security-scanner.k2'),
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
    title: i18n.t('microfrontend.security-scanner.k3'),
    description: i18n.t('microfrontend.security-scanner.k4'),
    recommendation: i18n.t('microfrontend.security-scanner.k5'),
    cvss_score: 7.5,
    check: (mod) => mod.dependencies.length > 2,
  },
  {
    id: 'R003',
    type: SecurityIssueType.VULNERABILITY,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.DEPENDENCY,
    title: i18n.t('microfrontend.security-scanner.k6'),
    description: i18n.t('microfrontend.security-scanner.k7'),
    recommendation: i18n.t('microfrontend.security-scanner.k8'),
    cvss_score: 9.8,
    check: (mod) => mod.id === 'erp-integration',
  },
  {
    id: 'R004',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.PERMISSION,
    title: i18n.t('microfrontend.security-scanner.k9'),
    description: i18n.t('microfrontend.security-scanner.k10'),
    recommendation: i18n.t('microfrontend.security-scanner.k11'),
    cvss_score: 7.2,
    check: (mod) => mod.category === 'integration',
  },
  {
    id: 'R005',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.PERMISSION,
    title: i18n.t('microfrontend.security-scanner.k12'),
    description: i18n.t('microfrontend.security-scanner.k13'),
    recommendation: i18n.t('microfrontend.security-scanner.k14'),
    cvss_score: 4.0,
    check: (mod) => mod.category === 'business',
  },
  {
    id: 'R006',
    type: SecurityIssueType.SANDBOXESCAPE,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.SANDBOX,
    title: i18n.t('microfrontend.security-scanner.k15'),
    description: i18n.t('microfrontend.security-scanner.k16'),
    recommendation: i18n.t('microfrontend.security-scanner.k17'),
    cvss_score: 9.1,
    check: (mod) => mod.id === 'form-builder',
  },
  {
    id: 'R007',
    type: SecurityIssueType.SANDBOXESCAPE,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.SANDBOX,
    title: i18n.t('microfrontend.security-scanner.k18'),
    description: i18n.t('microfrontend.security-scanner.k19'),
    recommendation: i18n.t('microfrontend.security-scanner.k20'),
    cvss_score: 6.5,
    check: (mod) => mod.version.startsWith('1.'),
  },
  {
    id: 'R008',
    type: SecurityIssueType.CODEINJECTION,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.CODE,
    title: i18n.t('microfrontend.security-scanner.k21'),
    description: i18n.t('microfrontend.security-scanner.k22'),
    recommendation: i18n.t('microfrontend.security-scanner.eval_23'),
    cvss_score: 8.8,
    check: (mod) => mod.id === 'workflow-engine',
  },
  {
    id: 'R009',
    type: SecurityIssueType.CODEINJECTION,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.CODE,
    title: i18n.t('microfrontend.security-scanner.xss_0'),
    description: i18n.t('microfrontend.security-scanner.k24'),
    recommendation: i18n.t('microfrontend.security-scanner.k25'),
    cvss_score: 7.4,
    check: (mod) => mod.category === 'business' && mod.id !== 'crm-module',
  },
  {
    id: 'R010',
    type: SecurityIssueType.DATALEAK,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.DATA,
    title: i18n.t('microfrontend.security-scanner.k26'),
    description: i18n.t('microfrontend.security-scanner.k27'),
    recommendation: i18n.t('microfrontend.security-scanner.https_28'),
    cvss_score: 7.1,
    check: (mod) => mod.category === 'integration',
  },
  {
    id: 'R011',
    type: SecurityIssueType.DATALEAK,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.DATA,
    title: i18n.t('microfrontend.security-scanner.k29'),
    description: i18n.t('microfrontend.security-scanner.k30'),
    recommendation: i18n.t('microfrontend.security-scanner.k31'),
    cvss_score: 4.5,
    check: (mod) => mod.category === 'tools',
  },
  {
    id: 'R012',
    type: SecurityIssueType.MALICIOUSCODE,
    severity: SecurityIssueSeverity.CRITICAL,
    category: SecurityCategory.CODE,
    title: i18n.t('microfrontend.security-scanner.k32'),
    description: i18n.t('microfrontend.security-scanner.k33'),
    recommendation: i18n.t('microfrontend.security-scanner.k34'),
    cvss_score: 9.5,
    check: () => false,
  },
  {
    id: 'R013',
    type: SecurityIssueType.VULNERABILITY,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.DEPENDENCY,
    title: i18n.t('microfrontend.security-scanner.k35'),
    description: i18n.t('microfrontend.security-scanner.k36'),
    recommendation: i18n.t('microfrontend.security-scanner.k37'),
    cvss_score: 5.3,
    check: (mod) => mod.dependencies.length > 1,
  },
  {
    id: 'R014',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.LOW,
    category: SecurityCategory.PERMISSION,
    title: i18n.t('microfrontend.security-scanner.k38'),
    description: i18n.t('microfrontend.security-scanner.k39'),
    recommendation: i18n.t('microfrontend.security-scanner.k40'),
    cvss_score: 2.5,
    check: (_mod) => false,
  },
  {
    id: 'R015',
    type: SecurityIssueType.NETWORK,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.NETWORK,
    title: i18n.t('microfrontend.security-scanner.api_41'),
    description: i18n.t('microfrontend.security-scanner.k42'),
    recommendation: i18n.t('microfrontend.security-scanner.k43'),
    cvss_score: 5.0,
    check: (mod) => mod.category === 'integration',
  },
  {
    id: 'R016',
    type: SecurityIssueType.OUTDATEDDEPENDENCY,
    severity: SecurityIssueSeverity.LOW,
    category: SecurityCategory.DEPENDENCY,
    title: i18n.t('microfrontend.security-scanner.k44'),
    description: i18n.t('microfrontend.security-scanner.k45'),
    recommendation: i18n.t('microfrontend.security-scanner.k46'),
    cvss_score: 1.5,
    check: (mod) => mod.versions.length > 2,
  },
  {
    id: 'R017',
    type: SecurityIssueType.SANDBOXESCAPE,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.SANDBOX,
    title: i18n.t('microfrontend.security-scanner.k47'),
    description: i18n.t('microfrontend.security-scanner.k48'),
    recommendation: i18n.t('microfrontend.security-scanner.k49'),
    cvss_score: 4.2,
    check: (mod) => mod.category === 'theme',
  },
  {
    id: 'R018',
    type: SecurityIssueType.DATALEAK,
    severity: SecurityIssueSeverity.LOW,
    category: SecurityCategory.DATA,
    title: i18n.t('microfrontend.security-scanner.k50'),
    description: i18n.t('microfrontend.security-scanner.k51'),
    recommendation: i18n.t('microfrontend.security-scanner.k52'),
    cvss_score: 2.0,
    check: (mod) => mod.category === 'dashboard',
  },
  {
    id: 'R019',
    type: SecurityIssueType.VULNERABILITY,
    severity: SecurityIssueSeverity.HIGH,
    category: SecurityCategory.CODE,
    title: i18n.t('microfrontend.security-scanner.dos_53'),
    description: i18n.t('microfrontend.security-scanner.k54'),
    recommendation: i18n.t('microfrontend.security-scanner.k55'),
    cvss_score: 6.8,
    check: (mod) => mod.id === 'form-builder',
  },
  {
    id: 'R020',
    type: SecurityIssueType.INSECUREDEPENDENCY,
    severity: SecurityIssueSeverity.INFO,
    category: SecurityCategory.DEPENDENCY,
    title: i18n.t('microfrontend.security-scanner.k56'),
    description: i18n.t('microfrontend.security-scanner.k57'),
    recommendation: i18n.t('microfrontend.security-scanner.k58'),
    cvss_score: 0.5,
    check: (mod) => mod.dependencies.length > 0,
  },
  {
    id: 'R021',
    type: SecurityIssueType.PERMISSIONRISK,
    severity: SecurityIssueSeverity.INFO,
    category: SecurityCategory.PERMISSION,
    title: i18n.t('microfrontend.security-scanner.k59'),
    description: i18n.t('microfrontend.security-scanner.k60'),
    recommendation: i18n.t('microfrontend.security-scanner.k61'),
    cvss_score: 0.8,
    check: (mod) => mod.id === 'notification-center',
  },
  {
    id: 'R022',
    type: SecurityIssueType.CODEINJECTION,
    severity: SecurityIssueSeverity.MEDIUM,
    category: SecurityCategory.CODE,
    title: i18n.t('microfrontend.security-scanner.k62'),
    description: i18n.t('microfrontend.security-scanner.k63'),
    recommendation: i18n.t('microfrontend.security-scanner.k64'),
    cvss_score: 5.5,
    check: (mod) => mod.category === 'tools' && mod.id === 'workflow-engine',
  },
];

const MODULE_PERMISSIONS: Record<string, PermissionAudit[]> = {
  'crm-module': [
    {
      permission: 'localStorage',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k65'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.indexeddb_66'),
    },
    {
      permission: 'network:api',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.crmapi_1'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.api_67'),
    },
    {
      permission: 'notification',
      required: false,
      justification: i18n.t('microfrontend.security-scanner.k68'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.k69'),
    },
  ],
  'bi-advanced': [
    {
      permission: 'localStorage',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k70'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.k71'),
    },
    {
      permission: 'network:api',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k72'),
      risky: true,
      alternative: i18n.t('microfrontend.security-scanner.k73'),
    },
    {
      permission: 'file:download',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k74'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.k75'),
    },
  ],
  'erp-integration': [
    {
      permission: 'network:api',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.erpapi_2'),
      risky: true,
      alternative: i18n.t('microfrontend.security-scanner.k76'),
    },
    {
      permission: 'localStorage',
      required: false,
      justification: i18n.t('microfrontend.security-scanner.k77'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.k78'),
    },
  ],
  'oauth-integration': [
    {
      permission: 'network:api',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k79'),
      risky: true,
      alternative: i18n.t('microfrontend.security-scanner.k80'),
    },
    {
      permission: 'cookie',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k81'),
      risky: false,
      alternative: 'HttpOnly Cookie',
    },
  ],
  'form-builder': [
    {
      permission: 'localStorage',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k82'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.k83'),
    },
    {
      permission: 'dom:modify',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k84'),
      risky: true,
      alternative: i18n.t('microfrontend.security-scanner.k85'),
    },
  ],
  'notification-center': [
    {
      permission: 'notification',
      required: false,
      justification: i18n.t('microfrontend.security-scanner.k86'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.k87'),
    },
    {
      permission: 'network:api',
      required: true,
      justification: i18n.t('microfrontend.security-scanner.k88'),
      risky: false,
      alternative: i18n.t('microfrontend.security-scanner.k89'),
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
