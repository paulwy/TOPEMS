const fs = require('fs');
const path = require('path');
const items = require(path.join(__dirname, 'scan-precise-details.json'));
const ROOT = path.resolve(__dirname, '../../apps/web/src');

const filtered = items.filter((x) => {
  const p = x.file;
  const l = x.content || '';
  if (p.startsWith('pages/bi/')) return false;
  if (p.startsWith('tmp/')) return false;
  if (p.startsWith('schemas/')) return false;
  if (
    p === 'sw.ts' ||
    p.includes('codegen.ts') ||
    p.includes('performance-bottleneck') ||
    p.includes('ExternalErpAdapters')
  )
    return false;
  if (!fs.existsSync(path.join(ROOT, p))) return false;
  const t = String(l || '').trim();
  if (t.startsWith("'") || t.startsWith('"')) {
    const m = t.match(/^(['"`])(.*?)\1\s*\|/);
    if (m) return false;
  }
  return true;
});
const byFile = {};
filtered.forEach((x) => (byFile[x.file] = (byFile[x.file] || 0) + 1));
const top = Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);
console.log('Top 30 files with UI hardcode:');
top.forEach(([f, c]) => console.log(c.toString().padStart(4), f));
console.log('Total files:', Object.keys(byFile).length, '| Total REAL UI entries:', filtered.length);
fs.writeFileSync(path.join(__dirname, 'top-ui-files.json'), JSON.stringify(top, null, 2));
