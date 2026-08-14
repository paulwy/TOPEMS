import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'apps/web/src/ai/automation/v57-automation-panel.tsx',
  'apps/web/src/ai/devex/v59-devex-panel.tsx',
  'apps/web/src/ai/ethics/v60-ethics-panel.tsx',
  'apps/web/src/ai/security/v59-security-panel.tsx',
  'apps/web/src/ai/ux/v58-ux-panel.tsx',
  'apps/web/src/dev-platform/v53-platform-console.tsx',
  'apps/web/src/fullstack-automation/V55AutomationPanel.tsx',
];

let total = 0;
for (const f of files) {
  const content = readFileSync(f, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/\s(?:color|fill|stroke)=`/.test(lines[i]) && !lines[i].includes('={`')) {
      lines[i] = lines[i].replace(/=(`)/, '={$1');
      if (!lines[i].endsWith('}')) {
        lines[i] = lines[i].replace(/`$/, '`}');
      }
      total++;
    }
  }
  writeFileSync(f, lines.join('\n'), 'utf8');
}
console.log(`Fixed ${total} JSX attribute template literals`);
