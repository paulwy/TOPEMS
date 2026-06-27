const fs = require('fs');
const path = require('path');

const filePath = '/Users/air/TOPEMS/apps/web/src/pages/crm/CustomerManagementPage.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('文件总行数:', lines.length);
console.log();

let mainComponentStart = -1;

for (let i = 0; i < Math.min(50, lines.length); i++) {
  const line = lines[i];
  if (line.match(/^const \w+.*React\.FC.*=.*=>\s*\{/) ||
      line.match(/^export default function \w+/) ||
      line.match(/^function \w+.*\(/)) {
    console.log(`第 ${i+1} 行: 找到组件定义: ${line.trim().slice(0, 80)}`);
    if (mainComponentStart === -1) {
      mainComponentStart = i;
      console.log(`  -> 设置为主组件，行号 ${i+1}`);
    }
  }
}

console.log();
console.log('搜索 return 语句:');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('return (')) {
    console.log(`第 ${i+1} 行: "${line.trim().slice(0, 80)}"`);
    console.log(`  -> 匹配 /^\\s*return\\s*\\(\\s*$/: ${!!line.match(/^\s*return\s*\(\s*$/)}`);
  }
}

console.log();
console.log('搜索最外层容器:');
for (let i = 565; i < 580; i++) {
  if (i < lines.length) {
    console.log(`第 ${i+1} 行: "${lines[i].trim().slice(0, 80)}"`);
  }
}
