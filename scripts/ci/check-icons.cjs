#!/usr/bin/env node
// 图标完整性检查（V64 阶段五新增）
//
// 用途：
// 1. 扫描 modules 目录下 config.ts 中所有 icon 字段引用的图标名
// 2. 检查这些图标名是否都在 lib/iconMapping.tsx 的 lucideIcons map 中注册
// 3. 输出缺失图标报告，CI 门禁用
//
// 用法：
//   node scripts/ci/check-icons.cjs                 # 全量检查
//   node scripts/ci/check-icons.cjs --json           # 输出 JSON 格式
//   node scripts/ci/check-icons.cjs --strict         # 严格模式：有缺失则 exit 1
//
// 退出码：
//   0 = 通过（或仅有警告）
//   1 = 严格模式下有缺失图标

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const MODULES_DIR = path.join(WEB_ROOT, 'modules');
const ICON_MAPPING_FILE = path.join(WEB_ROOT, 'lib', 'iconMapping.tsx');

// 收集 modules/*/config.ts 中所有 icon: '...' 引用
function collectIconRefs() {
  const refs = []; // { file, module, icon, line }
  if (!fs.existsSync(MODULES_DIR)) return refs;
  const moduleDirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
  for (const dir of moduleDirs) {
    if (!dir.isDirectory()) continue;
    const configPath = path.join(MODULES_DIR, dir.name, 'config.ts');
    if (!fs.existsSync(configPath)) continue;
    const content = fs.readFileSync(configPath, 'utf8');
    const lines = content.split('\n');
    const iconRegex = /icon:\s*['"]([^'"]+)['"]/g;
    lines.forEach((line, idx) => {
      let match;
      iconRegex.lastIndex = 0;
      while ((match = iconRegex.exec(line)) !== null) {
        refs.push({
          file: path.relative(path.resolve(__dirname, '../..'), configPath),
          module: dir.name,
          icon: match[1],
          line: idx + 1,
        });
      }
    });
  }
  return refs;
}

// 从 iconMapping.tsx 提取 lucideIcons map 中注册的所有图标名
function collectRegisteredIcons() {
  const content = fs.readFileSync(ICON_MAPPING_FILE, 'utf8');
  const registered = new Set();

  // 提取 import 语句中所有 PascalCase 标识符（包括别名）
  // 形如：  Name,  Name as Alias,  Name as Alias,
  const importRegex = /\b([A-Z][A-Za-z0-9]+)(?:\s+as\s+([A-Z][A-Za-z0-9]+))?,?/g;
  // 只在 import 块内匹配
  const importBlockMatch = content.match(/from\s+['"]lucide-react['"];?/);
  if (importBlockMatch) {
    const importBlock = content.slice(0, content.indexOf(importBlockMatch[0]));
    let m;
    while ((m = importRegex.exec(importBlock)) !== null) {
      registered.add(m[1]);
      if (m[2]) registered.add(m[2]);
    }
  }

  // 提取 lucideIcons map 中显式列出的键
  // 形如：  Name,  Name: SomeAlias,  Name as Alias,
  const mapStart = content.indexOf('export const lucideIcons');
  if (mapStart !== -1) {
    const mapEnd = content.indexOf('};', mapStart);
    const mapBlock = content.slice(mapStart, mapEnd);
    const keyRegex = /^\s*([A-Z][A-Za-z0-9]+)(?:\s*:\s*([A-Z][A-Za-z0-9]+))?\s*,?\s*$/gm;
    let m;
    while ((m = keyRegex.exec(mapBlock)) !== null) {
      registered.add(m[1]);
      // 如果是 Name: Alias 形式，Name 是键，Alias 是值，键就是用户引用的名字
    }
  }

  return registered;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const strict = args.includes('--strict');

  const refs = collectIconRefs();
  const registered = collectRegisteredIcons();

  const missing = [];
  const seenMissing = new Set();
  for (const ref of refs) {
    if (!registered.has(ref.icon) && !seenMissing.has(ref.icon)) {
      missing.push(ref);
      seenMissing.add(ref.icon);
    }
  }

  // 也收集 navigation/types.ts 中 NAVIGATION_GROUPS 引用的图标
  const navTypesPath = path.join(WEB_ROOT, 'lib', 'navigation', 'types.ts');
  if (fs.existsSync(navTypesPath)) {
    const content = fs.readFileSync(navTypesPath, 'utf8');
    const lines = content.split('\n');
    const iconRegex = /icon:\s*['"]([^'"]+)['"]/g;
    lines.forEach((line, idx) => {
      let match;
      iconRegex.lastIndex = 0;
      while ((match = iconRegex.exec(line)) !== null) {
        if (!registered.has(match[1]) && !seenMissing.has(match[1])) {
          missing.push({
            file: path.relative(path.resolve(__dirname, '../..'), navTypesPath),
            module: 'navigation/types',
            icon: match[1],
            line: idx + 1,
          });
          seenMissing.add(match[1]);
        }
      }
    });
  }

  const report = {
    total_icon_refs: refs.length,
    registered_icons: registered.size,
    missing_count: missing.length,
    missing,
  };

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('========================================');
    console.log('  图标完整性检查 (V64)');
    console.log('========================================');
    console.log(`图标引用总数: ${report.total_icon_refs}`);
    console.log(`iconMapping 已注册: ${report.registered_icons}`);
    console.log(`缺失图标: ${report.missing_count}`);
    console.log('');

    if (missing.length > 0) {
      console.log('⚠️  缺失的图标:');
      for (const m of missing) {
        console.log(`  - ${m.icon}  (来自 ${m.file}:${m.line}, 模块: ${m.module})`);
      }
      console.log('');
      console.log('建议：在 apps/web/src/lib/iconMapping.tsx 的 import 和 lucideIcons map 中添加该图标。');
    }

    console.log('');
    console.log('========================================');
    if (strict && missing.length > 0) {
      console.log('❌ 图标完整性检查未通过（严格模式下有缺失图标）');
      console.log('========================================');
      process.exit(1);
    } else {
      console.log('✅ 图标完整性检查完成');
      console.log('========================================');
    }
  }
}

main();
