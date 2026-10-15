// multi-file 配对删除器 v2：decl 去 export 前缀 + reexport 块条目精确移除（支持单行/多行块）
// 修复 multi-restore.cjs 缺陷（双逗号/块错位）——逐文件读改写，A/C 两类分开处理
const fs = require('fs');
const batch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const targets = batch.targets || batch; // { rel: [names] } 或 { name: [defFiles] }
let removed = 0, filesChanged = 0;
const report = [];

for (const [key, val] of Object.entries(targets)) {
  // 两种 batch 格式：{file:[names]} 或 {name:[defFiles]}——统一转为 {file:[names]}
  const fileToNames = {};
  if (Array.isArray(val) && val.every(v => typeof v === 'string' && v.includes('/'))) {
    // {name:[defFiles]} 格式
    for (const f of val) { fileToNames[f] = (fileToNames[f] || []).concat(key); }
  } else {
    fileToNames[key] = val;
  }
  for (const [rel, names] of Object.entries(fileToNames)) {
    const full = rel.startsWith('/') ? rel : `${process.cwd()}/${rel}`;
    if (!fs.existsSync(full)) { report.push(`⚠️ 不存在: ${rel}`); continue; }
    const nameSet = new Set(names);
    let src = fs.readFileSync(full, 'utf8');
    const orig = src;
    // A 类：decl 去 export 前缀（export const/function/class/let/var/interface/type）
    const declRe = new RegExp('export\\s+(?:(?:declare|abstract|async)\\s+)?(const|function|class|let|var|interface|type)\\s+(' + [...nameSet].join('|') + ')\\b', 'g');
    src = src.replace(declRe, (m, kw, name) => { if (nameSet.has(name)) { removed++; return `${kw} ${name}`; } return m; });
    // C 类：export { ... } from '...' 块条目移除（单行或多行）
    const re = /export\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]+['"];?/g;
    src = src.replace(re, (block, inner) => {
      const items = inner.split(',').map(s => s.trim()).filter(Boolean);
      const kept = items.filter(it => {
        const m = it.match(/^(default|[\w$]+)(?:\s+as\s+([\w$]+))?$/);
        if (!m) return true;
        const alias = m[2];
        const nm = m[1] === 'default' ? (m[2] || '') : m[1];
        if (nameSet.has(it) || (alias && nameSet.has(alias))) { removed++; return false; }
        return true;
      });
      if (kept.length === 0) return '';
      return `export { ${kept.join(', ')} } from '${block.match(/from\s*['"]([^'"]+)['"]/)[1]}';`;
    });
    if (src !== orig) { fs.writeFileSync(full, src); filesChanged++; }
  }
}
console.log(`✅ multi 配对删除：${removed} 个导出标记，涉及 ${filesChanged} 个文件`);
