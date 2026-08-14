#!/usr/bin/env node
/**
 * V215-Hotfix · 修复 JSX 属性中 designTokens 引用缺少 {} 包装
 *
 * 将 stroke=designTokens.colors.grey['300'] 修复为 stroke={designTokens.colors.grey['300']}
 *
 * 用法:
 *   node scripts/audit/fix-jsx-designtokens-braces.mjs --apply
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const APPLY = process.argv.includes('--apply');

const FILES = [
  'apps/web/src/ai/automation/v57-automation-panel.tsx',
  'apps/web/src/components/common/LazyImage.tsx',
  'apps/web/src/microfrontend/ai-ops/AIOpsPanel.tsx',
  'apps/web/src/microfrontend/observability/dashboard/ObservabilityDashboard.tsx',
  'apps/web/src/microfrontend/security/SecurityCenter.tsx',
  'apps/web/src/pages/automation/AutomationDesignerPage/components/DesignerCanvas.tsx',
  'apps/web/src/pages/mes/AnomalyDetectionPage.tsx',
  'apps/web/src/pages/monitor/MetricsDashboardPage.tsx',
];

// Match: word=designTokens.xxx.xxx['xxx'] or word=designTokens.xxx.xxx
// But NOT word={designTokens. (already fixed)
const RE = /([a-zA-Z_$][\w$]*)=designTokens\.([\w.$\[\]'"]+?)(?=\s|\/>|>|$)/gm;

let total = 0;

for (const rel of FILES) {
  const full = join(ROOT, rel);
  let content;
  try {
    content = readFileSync(full, 'utf8');
  } catch {
    continue;
  }

  const matches = content.match(RE) || [];
  if (matches.length === 0) continue;

  const fixed = content.replace(RE, (match, name, expr) => {
    total++;
    return `${name}={designTokens.${expr}}`;
  });

  if (fixed !== content) {
    console.log(`  ${rel}: ${matches.length} fixes`);
    if (APPLY) {
      writeFileSync(full, fixed, 'utf8');
    }
  }
}

console.log(`\nTotal: ${total} fixes`);
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
