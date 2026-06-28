const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. 修复 ColumnDef 的 key -> id
  if (content.includes("key: 'name'") || content.includes("key: 'description'") || content.includes("key: 'updatedAt'") || content.includes("key: 'database'")) {
    content = content.replace(/key: '(name|description|status|updatedAt|createdAt|database|type|label)'/g, "id: '$1'");
    changed = true;
  }

  // 2. 修复 RowAction 的 danger: true -> color: 'error'
  if (content.includes('danger: true')) {
    content = content.replace(/danger: true/g, "color: 'error'");
    changed = true;
  }

  // 3. 修复 TextField 的 InputProps -> slotProps
  // 简单的 InputProps: { ... } 替换
  if (content.includes('InputProps:') && !content.includes('slotProps:') && filePath.includes('lowcode')) {
    content = content.replace(/InputProps:\s*\{/g, 'slotProps: { input: {');
    // 这个比较复杂，需要平衡括号，先跳过，手动处理
  }

  // 4. 修复 TextField 的 inputProps (小写) -> slotProps
  if (content.includes('inputProps:') && filePath.includes('lowcode')) {
    content = content.replace(/inputProps:\s*\{/g, 'slotProps: { htmlInput: {');
    // 同样复杂，先跳过
  }

  return { content, changed };
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalChanged = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalChanged += processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const { content, changed } = fixFile(filePath);
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Fixed ColumnDef/RowAction in ${path.relative(process.cwd(), filePath)}`);
        totalChanged++;
      }
    }
  }

  return totalChanged;
}

console.log('Fixing low-code TypeScript errors...');
console.log('Processing components/lowcode...');
const compChanged = processDirectory(path.join(process.cwd(), 'src/components/lowcode'));
console.log('Processing pages/lowcode...');
const pagesChanged = processDirectory(path.join(process.cwd(), 'src/pages/lowcode'));
console.log(`Done! Fixed ${compChanged + pagesChanged} files.`);
