#!/usr/bin/env node
/**
 * scripts/fix-mixed-import-type.cjs
 * 查找 "import type { A, B, type C, type D } from 'x'" 同时混合 value+type 的错误模式：
 *  - crmApi / useCrmMock 这些 value 被错误地放进了 import type {} 中
 *  - 修复为分开的 import { value } from 'x' + import type { Type1, Type2 } from 'x'
 *
 * USAGE:
 *   node scripts/fix-mixed-import-type.cjs --help             # 显示本帮助并退出
 *   node scripts/fix-mixed-import-type.cjs                    # 默认 DRY-RUN：只打印会被修改的文件清单，不写文件
 *   node scripts/fix-mixed-import-type.cjs --apply            # 真正修改文件（会写磁盘）
 *   node scripts/fix-mixed-import-type.cjs --root <path>      # 指定扫描根目录（默认 apps/web/src）
 *   node scripts/fix-mixed-import-type.cjs --pattern <regex>  # 只扫描匹配文件路径正则的文件
 *
 * 默认行为强调：不传 --apply 永远不会修改文件，避免 --help 调用或临时调参时误改整仓。
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.resolve(__dirname, '..', 'apps', 'web', 'src');

// ====================== CLI 解析 ======================
function parseArgs(argv) {
  const opts = {
    help: false,
    apply: false,
    root: DEFAULT_ROOT,
    pattern: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--apply') opts.apply = true;
    else if (a === '--root' && argv[i + 1]) {
      opts.root = argv[++i];
    } else if (a === '--pattern' && argv[i + 1]) {
      opts.pattern = new RegExp(argv[++i]);
    } else if (a.startsWith('--')) {
      process.stderr.write(`[fix-mixed-import-type] ⚠️  未知参数: ${a}\n`);
      opts.help = true;
    }
  }
  return opts;
}

const USAGE = String.raw`
fix-mixed-import-type.cjs — 拆分 import type 中混入 value 的错误模式

USAGE:
  node scripts/fix-mixed-import-type.cjs [OPTIONS]

OPTIONS:
  -h, --help                显示帮助并退出（不执行扫描）
      --apply               真正执行写文件；不传则 DRY-RUN 仅打印命中
      --root <path>         扫描根目录（默认 apps/web/src）
      --pattern <regex>     只处理路径匹配 regex 的文件（如 .*crm.*）

EXAMPLES:
  node scripts/fix-mixed-import-type.cjs                              # 预览全仓改动量
  node scripts/fix-mixed-import-type.cjs --pattern '.*crm.*' --apply  # 只修 crm 目录并写磁盘

RULES:
  • import type { A, B, type C } → 拆分为 import { A, B } + import type { C }
  • 没有 value、没有 type、纯注释引用的 import 保持不变
`;

// ====================== 逻辑 ======================
function collectSrcFiles(dir, pattern, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectSrcFiles(full, pattern, list);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      if (pattern && !pattern.test(full)) continue;
      list.push(full);
    }
  }
  return list;
}

function splitImports(block /* string inside {} */) {
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

function fixFile(file, apply) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  const re = /^import\s+type\s*\{([\s\S]*?)\}\s*from\s*(['"`][^'"`]+['"`])\s*;?/gm;

  content = content.replace(re, (match, innerBlock, fromSpec) => {
    const items = splitImports(innerBlock);
    const typeItems = [];
    const valueItems = [];
    for (const it of items) {
      if (it.startsWith('type ')) {
        typeItems.push(it.slice(5).trim());
      } else {
        valueItems.push(it);
      }
    }
    if (valueItems.length === 0) return match;
    if (typeItems.length === 0) {
      return `import { ${valueItems.join(', ')} } from ${fromSpec}`;
    }
    return (
      `import { ${valueItems.join(', ')} } from ${fromSpec};\n` +
      `import type { ${typeItems.join(', ')} } from ${fromSpec}`
    );
  });

  const changed = content !== original;
  if (changed && apply) {
    fs.writeFileSync(file, content, 'utf8');
  }
  return { changed, original, content };
}

// ====================== 入口 ======================
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  const label = opts.apply ? '[APPLY] 会写磁盘' : '[DRY-RUN] 不写磁盘（加 --apply 才写）';
  process.stderr.write(`[fix-mixed-import-type] ${label}\n`);
  process.stderr.write(`[fix-mixed-import-type] 扫描根: ${opts.root}\n`);

  const root = path.resolve(opts.root);
  if (!fs.existsSync(root)) {
    process.stderr.write(`[fix-mixed-import-type] ❌ root 不存在: ${root}\n`);
    process.exit(2);
  }

  const files = collectSrcFiles(root, opts.pattern);
  process.stderr.write(`[fix-mixed-import-type] 待扫描文件数: ${files.length}\n\n`);

  let fixed = 0;
  for (const f of files) {
    const { changed } = fixFile(f, opts.apply);
    const rel = path.relative(root, f);
    if (changed) {
      console.log(`[${opts.apply ? 'FIXED' : 'would fix'}] ${rel}`);
      fixed++;
    }
  }
  console.log(`\nTotal files: ${files.length}`);
  console.log(`Total ${opts.apply ? 'fixed' : 'would fix'}: ${fixed}`);
  if (!opts.apply && fixed > 0) {
    process.stderr.write(`\n[fix-mixed-import-type] 💡 当前为 DRY-RUN，加 --apply 才会写文件。\n`);
  }
  process.exit(0);
}

main();
