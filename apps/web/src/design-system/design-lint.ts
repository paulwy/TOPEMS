import { v51DesignTokens } from './tokens/v51-tokens';
import i18n from '@/i18n';

// ============================================================
// V51.0 Design Compliance Linting
// 设计合规性检查工具
// - 颜色对比度检查 (WCAG AA)
// - 间距一致性检查
// - 排版规范检查
// - 组件使用模式检查
// - 生成合规报告
// ============================================================

export interface LintIssue {
  id: string;
  category: 'color' | 'spacing' | 'typography' | 'component';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  file?: string;
  line?: number;
}

export interface LintReport {
  timestamp: string;
  total: number;
  errors: number;
  warnings: number;
  info: number;
  issues: LintIssue[];
  passed: boolean;
  score: number;
  checks: {
    colorContrast: boolean;
    spacingConsistency: boolean;
    typographyScale: boolean;
    componentUsage: boolean;
  };
}

// ============================================================
// 颜色对比度检查 (WCAG AA)
// ============================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ColorContrastCheck {
  foreground: string;
  background: string;
  minRatio: number;
  actualRatio: number;
  pass: boolean;
  label: string;
}

export function checkColorContrast(
  foreground: string,
  background: string,
  label: string,
  minRatio: number = 4.5
): ColorContrastCheck {
  const actual = contrastRatio(foreground, background);
  return {
    foreground,
    background,
    minRatio,
    actualRatio: Math.round(actual * 100) / 100,
    pass: actual >= minRatio,
    label,
  };
}

export function runColorContrastChecks(): ColorContrastCheck[] {
  const lightBg = v51DesignTokens.semantic.surface.card.light;
  const darkBg = v51DesignTokens.semantic.surface.card.dark;
  const issues: ColorContrastCheck[] = [];

  const textPairs: Array<{ fg: string; bg: string; label: string; minRatio?: number }> = [
    {
      fg: v51DesignTokens.semantic.text.primary.light,
      bg: lightBg,
      label: 'Light / Primary Text on Card',
    },
    {
      fg: v51DesignTokens.semantic.text.secondary.light,
      bg: lightBg,
      label: 'Light / Secondary Text on Card',
      minRatio: 4.5,
    },
    {
      fg: v51DesignTokens.semantic.text.tertiary.light,
      bg: lightBg,
      label: 'Light / Tertiary Text on Card',
      minRatio: 3,
    },
    {
      fg: v51DesignTokens.semantic.text.primary.dark,
      bg: darkBg,
      label: 'Dark / Primary Text on Card',
    },
    {
      fg: v51DesignTokens.semantic.text.secondary.dark,
      bg: darkBg,
      label: 'Dark / Secondary Text on Card',
      minRatio: 4.5,
    },
    {
      fg: v51DesignTokens.semantic.text.tertiary.dark,
      bg: darkBg,
      label: 'Dark / Tertiary Text on Card',
      minRatio: 3,
    },
    {
      fg: v51DesignTokens.colors.primary.contrastText,
      bg: v51DesignTokens.colors.primary.main,
      label: 'Primary Button Text',
    },
    {
      fg: v51DesignTokens.colors.error.contrastText,
      bg: v51DesignTokens.colors.error.main,
      label: 'Error Button Text',
    },
    {
      fg: v51DesignTokens.colors.success.contrastText,
      bg: v51DesignTokens.colors.success.main,
      label: 'Success Button Text',
    },
  ];

  for (const pair of textPairs) {
    issues.push(checkColorContrast(pair.fg, pair.bg, pair.label, pair.minRatio));
  }

  return issues;
}

export function lintColorContrast(): LintIssue[] {
  const checks = runColorContrastChecks();
  const issues: LintIssue[] = [];

  for (const check of checks) {
    if (!check.pass) {
      issues.push({
        id: `color-contrast-${check.label.replace(/\s+/g, '-').toLowerCase()}`,
        category: 'color',
        severity: 'error',
        message: `${i18n.t('components.design-lint.k0')}${check.label}${i18n.t('components.design-lint.k1')}${check.actualRatio}${i18n.t('components.design-lint.1_2')}${check.minRatio}:1`,
        suggestion: `${i18n.t('components.design-lint.k3')}${check.foreground}${i18n.t('components.design-lint.k4')}${check.background}${i18n.t('components.design-lint.k5')}`,
      });
    }
  }

  return issues;
}

// ============================================================
// 间距一致性检查
// ============================================================

const validSpacingValues = new Set([
  '0',
  '4px',
  '8px',
  '12px',
  '16px',
  '20px',
  '24px',
  '32px',
  '40px',
  '48px',
  '56px',
  '64px',
  '80px',
  '0.5rem',
  '1rem',
  '1.5rem',
  '2rem',
  '3rem',
  '4rem',
  'var(--v51-spacing-xs)',
  'var(--v51-spacing-sm)',
  'var(--v51-spacing-md)',
  'var(--v51-spacing-base)',
  'var(--v51-spacing-lg)',
  'var(--v51-spacing-xl)',
]);

export function lintSpacing(
  components: Array<{ name: string; spacingValues: string[] }>
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const component of components) {
    for (const value of component.spacingValues) {
      const normalizedValue = value.replace(/\s+/g, '');
      if (
        !validSpacingValues.has(normalizedValue) &&
        !normalizedValue.startsWith('calc(') &&
        !normalizedValue.startsWith('clamp(')
      ) {
        issues.push({
          id: `spacing-${component.name}-${normalizedValue.replace(/[^a-z0-9]/gi, '')}`,
          category: 'spacing',
          severity: 'warning',
          message: `${i18n.t('components.design-lint.k6')}${component.name}${i18n.t('components.design-lint.k7')}${value}`,
          suggestion: i18n.t('design_system.design-lint.k0'),
        });
      }
    }
  }

  return issues;
}

// ============================================================
// 排版规范检查
// ============================================================

const validFontSizes = new Set<string>(Object.values(v51DesignTokens.typography.fontSize));
const validFontWeights = new Set<number>(Object.values(v51DesignTokens.typography.fontWeight));
const validLineHeights = new Set<number>(Object.values(v51DesignTokens.typography.lineHeight));

export function lintTypography(
  components: Array<{
    name: string;
    fontSize?: string;
    fontWeight?: number;
    lineHeight?: number;
  }>
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const component of components) {
    if (component.fontSize && !validFontSizes.has(component.fontSize)) {
      issues.push({
        id: `typography-size-${component.name}`,
        category: 'typography',
        severity: 'warning',
        message: `${i18n.t('components.design-lint.k8')}${component.name}${i18n.t('components.design-lint.k9')}${component.fontSize}`,
        suggestion: `${i18n.t('components.design-lint.v51_10')}${Object.values(v51DesignTokens.typography.fontSize).join(', ')}`,
      });
    }

    if (component.fontWeight && !validFontWeights.has(component.fontWeight)) {
      issues.push({
        id: `typography-weight-${component.name}`,
        category: 'typography',
        severity: 'warning',
        message: `${i18n.t('components.design-lint.k11')}${component.name}${i18n.t('components.design-lint.k12')}${component.fontWeight}`,
        suggestion: `${i18n.t('components.design-lint.v51_13')}${Array.from(validFontWeights).join(', ')}`,
      });
    }

    if (component.lineHeight && !validLineHeights.has(component.lineHeight)) {
      issues.push({
        id: `typography-lineheight-${component.name}`,
        category: 'typography',
        severity: 'info',
        message: `${i18n.t('components.design-lint.k14')}${component.name}${i18n.t('components.design-lint.k15')}${component.lineHeight}`,
        suggestion: `${i18n.t('components.design-lint.v51_16')}${Array.from(validLineHeights).join(', ')}`,
      });
    }
  }

  return issues;
}

// ============================================================
// 组件使用模式检查
// ============================================================

const v51Components = [
  'V51Button',
  'V51Card',
  'V51Input',
  'V51Select',
  'V51Table',
  'V51Dialog',
  'V51Toast',
  'V51Tabs',
  'V51Badge',
  'V51Skeleton',
  'V51Avatar',
];

export interface ComponentUsageCheck {
  componentName: string;
  usageCount: number;
  hasSxProp: boolean;
  hasAccessibilityLabel: boolean;
  issues: string[];
}

export function lintComponentUsage(
  usages: Array<{ component: string; sx?: boolean; ariaLabel?: boolean }>
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const usage of usages) {
    if (!v51Components.includes(usage.component) && usage.component.startsWith('V51')) {
      issues.push({
        id: `component-unknown-${usage.component}`,
        category: 'component',
        severity: 'warning',
        message: `${i18n.t('components.design-lint.v51_17')}${usage.component}`,
        suggestion: `${i18n.t('components.design-lint.v51_18')}${v51Components.join(', ')}`,
      });
    }

    if (v51Components.includes(usage.component) && usage.component !== 'V51Skeleton' && !usage.sx) {
      issues.push({
        id: `component-sx-${usage.component}`,
        category: 'component',
        severity: 'info',
        message: `${i18n.t('components.design-lint.k19')}${usage.component}${i18n.t('components.design-lint.sxprop_20')}`,
        suggestion: i18n.t('shared.design-lint.k0'),
      });
    }

    if (['V51Button', 'V51IconButton'].includes(usage.component) && !usage.ariaLabel) {
      issues.push({
        id: `component-a11y-${usage.component}`,
        category: 'component',
        severity: 'warning',
        message: `${i18n.t('components.design-lint.k21')}${usage.component}${i18n.t('components.design-lint.arialabel_22')}`,
        suggestion: i18n.t('shared.design-lint.k1'),
      });
    }
  }

  return issues;
}

// ============================================================
// 合规报告生成
// ============================================================

export function generateLintReport(
  issues: LintIssue[],
  options?: {
    passedThreshold?: number;
  }
): LintReport {
  const passedThreshold = options?.passedThreshold ?? 90;

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const info = issues.filter((i) => i.severity === 'info').length;
  const total = issues.length;

  const maxScore = 100;
  const penalty = errors * 10 + warnings * 5 + info * 2;
  const score = Math.max(0, maxScore - penalty);

  return {
    timestamp: new Date().toISOString(),
    total,
    errors,
    warnings,
    info,
    issues,
    passed: score >= passedThreshold,
    score,
    checks: {
      colorContrast: !issues.some((i) => i.category === 'color' && i.severity === 'error'),
      spacingConsistency: !issues.some((i) => i.category === 'spacing' && i.severity === 'error'),
      typographyScale: !issues.some((i) => i.category === 'typography' && i.severity === 'error'),
      componentUsage: !issues.some((i) => i.category === 'component' && i.severity === 'error'),
    },
  };
}

export function runAllChecks(
  components: Array<{
    name: string;
    spacingValues?: string[];
    fontSize?: string;
    fontWeight?: number;
    lineHeight?: number;
    usages?: Array<{ component: string; sx?: boolean; ariaLabel?: boolean }>;
  }>
): LintReport {
  const allIssues: LintIssue[] = [];

  allIssues.push(...lintColorContrast());

  const spacingComponents = components
    .filter((c) => c.spacingValues)
    .map((c) => ({ name: c.name, spacingValues: c.spacingValues! }));
  if (spacingComponents.length > 0) {
    allIssues.push(...lintSpacing(spacingComponents));
  }

  const typographyComponents = components
    .filter((c) => c.fontSize || c.fontWeight || c.lineHeight)
    .map((c) => ({
      name: c.name,
      fontSize: c.fontSize,
      fontWeight: c.fontWeight,
      lineHeight: c.lineHeight,
    }));
  if (typographyComponents.length > 0) {
    allIssues.push(...lintTypography(typographyComponents));
  }

  const componentUsages = components.flatMap((c) => c.usages || []);
  if (componentUsages.length > 0) {
    allIssues.push(...lintComponentUsage(componentUsages));
  }

  return generateLintReport(allIssues);
}

export function formatReport(report: LintReport): string {
  const lines: string[] = [];

  lines.push('========================================');
  lines.push(i18n.t('components.design-lint.k23'));
  lines.push('========================================');
  lines.push('');
  lines.push(`${i18n.t('components.design-lint.k24')}${report.timestamp}`);
  lines.push(`${i18n.t('components.design-lint.k25')}${report.score}/100 ${report.passed ? '✅' : '❌'}`);
  lines.push(`${i18n.t('components.design-lint.k26')}${report.total}`);
  lines.push(`${i18n.t('components.design-lint.k27')}${report.errors}`);
  lines.push(`${i18n.t('components.design-lint.k28')}${report.warnings}`);
  lines.push(`${i18n.t('components.design-lint.k29')}${report.info}`);
  lines.push('');
  lines.push(i18n.t('components.design-lint.k30'));
  lines.push(`${i18n.t('components.design-lint.k31')}${report.checks.colorContrast ? i18n.t('design_system.design-lint.k1') : i18n.t('design_system.design-lint.k2')}`);
  lines.push(`${i18n.t('components.design-lint.k32')}${report.checks.spacingConsistency ? i18n.t('design_system.design-lint.k3') : i18n.t('design_system.design-lint.k4')}`);
  lines.push(`${i18n.t('components.design-lint.k33')}${report.checks.typographyScale ? i18n.t('design_system.design-lint.k5') : i18n.t('design_system.design-lint.k6')}`);
  lines.push(`${i18n.t('components.design-lint.k34')}${report.checks.componentUsage ? i18n.t('design_system.design-lint.k7') : i18n.t('design_system.design-lint.k8')}`);
  lines.push('');

  if (report.issues.length > 0) {
    lines.push(i18n.t('components.design-lint.k35'));
    lines.push('----------');
    for (const issue of report.issues) {
      const severityIcon =
        issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      lines.push(`${severityIcon} [${issue.category}] ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`   💡 ${issue.suggestion}`);
      }
    }
  } else {
    lines.push(i18n.t('components.design-lint.k36'));
  }

  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}

export const v51DesignLint = {
  checkColorContrast,
  lintColorContrast,
  lintSpacing,
  lintTypography,
  lintComponentUsage,
  generateLintReport,
  runAllChecks,
  formatReport,
  runColorContrastChecks,
};
