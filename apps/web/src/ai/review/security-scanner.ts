import i18n from '@/i18n';

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
    description: i18n.t('ai.security-scanner.k0'),
    remediation: i18n.t('ai.security-scanner.k1'),
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'xss-002',
    category: 'XSS',
    severity: 'high',
    pattern: /dangerouslySetInnerHTML/g,
    description: i18n.t('ai.security-scanner.k0'),
    remediation: i18n.t('ai.security-scanner.k2'),
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'xss-003',
    category: 'XSS',
    severity: 'high',
    pattern: /document\.write\s*\(/g,
    description: i18n.t('ai.security-scanner.k1'),
    remediation: i18n.t('ai.security-scanner.k2'),
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'injection-001',
    category: 'Injection',
    severity: 'critical',
    pattern: /\beval\s*\(/g,
    description: i18n.t('ai.security-scanner.eval_3'),
    remediation: i18n.t('ai.security-scanner.k4'),
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'injection-002',
    category: 'Injection',
    severity: 'high',
    pattern: /new\s+Function\s*\(/g,
    description: i18n.t('ai.security-scanner.k5'),
    remediation: i18n.t('ai.security-scanner.k6'),
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'injection-003',
    category: 'Injection',
    severity: 'high',
    pattern: /exec\s*\(\s*['"`]/g,
    description: i18n.t('ai.security-scanner.k7'),
    remediation: i18n.t('ai.security-scanner.k8'),
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'csrf-001',
    category: 'CSRF',
    severity: 'medium',
    pattern: /fetch\s*\([^)]*\)/g,
    description: i18n.t('ai.security-scanner.csrf_9'),
    remediation: i18n.t('ai.security-scanner.k10'),
    owaspId: 'A01:2021 - Broken Access Control',
  },
  {
    id: 'auth-001',
    category: 'Auth',
    severity: 'high',
    pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*token[^'"]*['"]/gi,
    description: i18n.t('ai.security-scanner.k11'),
    remediation: i18n.t('ai.security-scanner.k12'),
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
  {
    id: 'auth-002',
    category: 'Auth',
    severity: 'medium',
    pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*password[^'"]*['"]/gi,
    description: i18n.t('ai.security-scanner.k13'),
    remediation: i18n.t('ai.security-scanner.k14'),
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
  {
    id: 'auth-003',
    category: 'Auth',
    severity: 'high',
    pattern: /sessionStorage\.setItem\s*\(\s*['"][^'"]*token[^'"]*['"]/gi,
    description: i18n.t('ai.security-scanner.k3'),
    remediation: i18n.t('ai.security-scanner.k15'),
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
  {
    id: 'encryption-001',
    category: 'Encryption',
    severity: 'high',
    pattern: /\bmd5\b|\bsha1\b/gi,
    description: i18n.t('ai.security-scanner.md5sha1_16'),
    remediation: i18n.t('ai.security-scanner.sha256_17'),
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'encryption-002',
    category: 'Encryption',
    severity: 'high',
    pattern: /crypto\.createHash\s*\(\s*['"](md5|sha1)['"]/gi,
    description: i18n.t('ai.security-scanner.k18'),
    remediation: i18n.t('ai.security-scanner.sha256sha512_19'),
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'exposure-001',
    category: 'Exposure',
    severity: 'critical',
    pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
    description: i18n.t('ai.security-scanner.api_20'),
    remediation: i18n.t('ai.security-scanner.k21'),
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'exposure-002',
    category: 'Exposure',
    severity: 'high',
    pattern: /secret\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/gi,
    description: i18n.t('ai.security-scanner.k22'),
    remediation: i18n.t('ai.security-scanner.k23'),
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'exposure-003',
    category: 'Exposure',
    severity: 'medium',
    pattern: /console\.(log|error|warn)\([^)]*(?:password|secret|token|key)/gi,
    description: i18n.t('ai.security-scanner.k24'),
    remediation: i18n.t('ai.security-scanner.k25'),
    owaspId: 'A04:2021 - Insecure Design',
  },
  {
    id: 'exposure-004',
    category: 'Exposure',
    severity: 'medium',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
    description: i18n.t('ai.security-scanner.k26'),
    remediation: i18n.t('ai.security-scanner.https_27'),
    owaspId: 'A02:2021 - Cryptographic Failures',
  },
  {
    id: 'injection-004',
    category: 'Injection',
    severity: 'medium',
    pattern: /\.innerHTML\s*=|\.outerHTML\s*=/g,
    description: i18n.t('ai.security-scanner.htmlxss_28'),
    remediation: i18n.t('ai.security-scanner.k29'),
    owaspId: 'A03:2021 - Injection',
  },
  {
    id: 'auth-004',
    category: 'Auth',
    severity: 'medium',
    pattern: /httpOnly\s*:\s*false|httpOnly\s*=\s*false/gi,
    description: i18n.t('ai.security-scanner.k4'),
    remediation: i18n.t('ai.security-scanner.k30'),
    owaspId: 'A07:2021 - Identification and Authentication Failures',
  },
];

