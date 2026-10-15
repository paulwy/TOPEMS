// star barrel 别名精确移除：从 export { ... } from '...' 块中移除目标名字的条目
// 规则：条目匹配 `default as X`、`X`、`X as Y`（X 或 Y = 目标名）→ 移除整个条目；唯一条目→删整行/整块
const fs = require('fs');
const batch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const targets = batch.targets || batch;
let removed = 0, filesChanged = 0;
for (const [rel, names] of Object.entries(targets)) {
  const full = rel.startsWith('/') ? rel : `${process.cwd()}/${rel}`;
  if (!fs.existsSync(full)) { console.log(`⚠️ 不存在: ${rel}`); continue; }
  let src = fs.readFileSync(full, 'utf8');
  const nameSet = new Set(names);
  let changed = false;
  // 处理 export { ... } from '...'（单行或多行块）
  const re = /export\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]+['"];?/g;
  src = src.replace(re, (block, inner) => {
    const items = inner.split(',').map(s => s.trim()).filter(Boolean);
    const kept = items.filter(it => {
      // 解析条目：`default as X` | `X as Y` | `X`
      const m = it.match(/^(default|[\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (!m) return true; // 无法解析的行保留（保守）
      const alias = m[2];
      const name = m[1] === 'default' ? (m[2] || '') : m[1];
      if (nameSet.has(it) || (alias && nameSet.has(alias))) { removed++; changed = true; return false; }
      return true;
    });
    if (kept.length === 0) return ''; // 整块删（含 `from` 行）
    return `export { ${kept.join(', ')} } from '${block.match(/from\s*['"]([^'"]+)['"]/)[1]}';`;
  });
  if (changed) { fs.writeFileSync(full, src); filesChanged++; }
}
console.log(`✅ star 别名移除完成：${removed} 个导出，涉及 ${filesChanged} 个文件`);
