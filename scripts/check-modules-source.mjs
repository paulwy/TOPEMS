#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const modulesDir = path.join(ROOT, 'apps/web/src/modules');
const entries = fs.readdirSync(modulesDir).filter((d) => {
  const s = fs.statSync(path.join(modulesDir, d));
  return s.isDirectory() && fs.existsSync(path.join(modulesDir, d, 'config.ts'));
});

const results = [];
for (const mod of entries) {
  const content = fs.readFileSync(path.join(modulesDir, mod, 'config.ts'), 'utf8');
  const source = content.match(/source:\s*['"](core|plugin)['"]/)?.[1] || 'unknown';
  const suite = content.match(/suite:\s*['"]([^'"]+)['"]/)?.[1] || '-';
  const status = content.match(/status:\s*['"]([^'"]+)['"]/)?.[1] || '-';
  results.push({ module: mod, source, suite, status });
}

console.log('source=plugin 模块清单:');
results
  .filter((r) => r.source === 'plugin')
  .sort((a, b) => a.module.localeCompare(b.module))
  .forEach((m) => console.log(`  ${m.module.padEnd(14)} suite=${m.suite.padEnd(14)} status=${m.status}`));

console.log('\nsource=core 模块清单:');
results
  .filter((r) => r.source === 'core')
  .sort((a, b) => a.module.localeCompare(b.module))
  .forEach((m) => console.log(`  ${m.module.padEnd(14)} suite=${m.suite.padEnd(14)} status=${m.status}`));
