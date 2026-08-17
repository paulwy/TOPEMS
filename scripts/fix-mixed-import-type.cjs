/**
 * scripts/fix-mixed-import-type.cjs
 * 查找 "import type { A, B, type C, type D } from 'x'" 同时混合 value+type 的错误模式：
 *  - crmApi / useCrmMock 这些 value 被错误地放进了 import type {} 中
 *  - 修复为分开的 import { value } from 'x' + import type { Type1, Type2 } from 'x'
 *
 * 只处理以下 4 个 CRM 页面 + 其他类似模式文件：
 *  CRMBillingPage, CRMCustomerScoringPage, CRMCustomerSegmentationPage, CRMRecommendationPage
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'apps', 'web', 'src');

function collectSrcFiles(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectSrcFiles(full, list);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) list.push(full);
  }
  return list;
}

function splitImports(block /* string inside {} */) {
  // 解析逗号分隔项 (忽略大括号内部嵌套)
  const items = [];
  let depth = 0;
  let cur = '';
  for (const ch of block) {
    if (ch === '{' || ch === '<') depth++;
    else if (ch === '}' || ch === '>') depth--;
    else if (ch === ',' && depth === 0) {
      if (cur.trim()) items.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) items.push(cur.trim());
  return items;
}

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 匹配 import type { ... } from 'x'; 跨越多行 (允许内部嵌套大括号 + type 前缀)
  const re = /^import\s+type\s*\{([\s\S]*?)\}\s*from\s*(['"`][^'"`]+['"`])\s*;?/gm;

  content = content.replace(re, (match, innerBlock, fromSpec) => {
    const items = splitImports(innerBlock);
    const typeItems = [];
    const valueItems = [];
    for (const it of items) {
      // 去掉尾部注释
      if (it.startsWith('type ')) {
        typeItems.push(it.slice(5).trim());
      } else {
        valueItems.push(it);
      }
    }
    if (valueItems.length === 0) return match; // 无 value，保持原样
    if (typeItems.length === 0) {
      // 全是 value，直接改成普通 import
      return `import { ${valueItems.join(', ')} } from ${fromSpec}`;
    }
    return (
      `import { ${valueItems.join(', ')} } from ${fromSpec};\n` +
      `import type { ${typeItems.join(', ')} } from ${fromSpec}`
    );
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const files = collectSrcFiles(ROOT);
  let fixed = 0;
  for (const f of files) {
    if (fixFile(f)) {
      console.log('[fixed]', path.relative(ROOT, f));
      fixed++;
    }
  }
  console.log('Total files fixed:', fixed);
}

main();
