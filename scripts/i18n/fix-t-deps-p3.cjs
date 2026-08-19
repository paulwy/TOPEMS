#!/usr/bin/env node
/**
 * Fix remaining `t` references in dependency arrays and other contexts.
 * Replaces standalone `t` variable references with `i18n.t`.
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/mes/EquipmentDetailPage.tsx',
  'src/pages/mes/EquipmentManagementPage.tsx',
  'src/pages/mes/MesEquipmentPage.tsx',
  'src/pages/mes/MesQualityPage.tsx',
  'src/pages/mes/MesWorkOrderPage.tsx',
  'src/pages/mes/ProductionOrderManagementPage.tsx',
  'src/pages/mes/QualityInspectionPage.tsx',
  'src/pages/mes/TraceabilityDetailPage.tsx',
];

const WEB_ROOT = '/Users/air/TOPEMS/apps/web';
let totalFixed = 0;

for (const relPath of files) {
  const filePath = path.join(WEB_ROOT, relPath);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines with useTranslation, import, or i18n.t
    if (line.includes('useTranslation') || line.includes('import ') || line.includes('i18n.t(')) continue;

    // Fix: }, [equipment, t]); → }, [equipment, i18n.t]);
    if (/\[\s*[^[\]]*,\s*t\s*[,)\]]/.test(line) || /\[\s*t\s*[,)\]]/.test(line)) {
      lines[i] = line.replace(/\bt(?=\s*[,)\]])/g, 'i18n.t');
      // Actually better to just remove t from deps since i18n.t is stable
      // But keeping i18n.t is also fine
      modified = true;
      totalFixed++;
      continue;
    }

    // Fix: t('key') → i18n.t('key') (remaining t() calls)
    if (/\bt\s*\(\s*['"`]/.test(line) && !line.includes('i18n.t(')) {
      lines[i] = line.replace(/\bt\s*\(/g, 'i18n.t(');
      modified = true;
      totalFixed++;
    }
  }

  if (modified) {
    // Ensure i18n import
    const hasImport = lines.some((l) => l.includes("import i18n from '@/i18n'"));
    if (!hasImport) {
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) lastImport = i;
        else if (lastImport >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      }
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`  Fixed: ${relPath}`);
  }
}

console.log(`\nTotal fixes: ${totalFixed}`);
