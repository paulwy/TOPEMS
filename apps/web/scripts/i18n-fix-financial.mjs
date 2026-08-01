/**
 * 替换 FinancialAnalysisPage.tsx 中的 ¥{...}万 模式
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const filePath = path.join(projectRoot, 'src', 'pages', 'erp', 'FinancialAnalysisPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 替换 ¥{...}万 模式（不在 i18n.t 内的）
// 匹配: ¥{EXPR}万  其中 EXPR 不包含 }
const re = /¥\{([^}]+)\}万/g;
let count = 0;
content = content.replace(re, (match, expr, offset) => {
  // 检查是否已经在 i18n.t 内
  const before = content.slice(Math.max(0, offset - 30), offset);
  if (/i18n\.t\([^)]*$/.test(before)) return match;
  count++;
  return `{i18n.t('erp.financialanalysispage.¥{{v0}}万', { v0: ${expr} })}`;
});

fs.writeFileSync(filePath, content, 'utf-8');
console.log(`FinancialAnalysisPage.tsx: ${count} 处替换`);

// 处理 金额(元) 表头
content = fs.readFileSync(filePath, 'utf-8');
const thRe = /金额\(元\)/g;
content = content.replace(thRe, (match, offset) => {
  const before = content.slice(Math.max(0, offset - 50), offset);
  if (/i18n\.t\([^)]*$/.test(before)) return match;
  count++;
  return `{i18n.t('erp.financialanalysispage.金额(元)')}`;
});
fs.writeFileSync(filePath, content, 'utf-8');
console.log(`FinancialAnalysisPage.tsx: 金额(元) 替换完成`);

// 处理 - 可视化图表 和 - 明细数据
content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(
  /\{tabLabels\[activeTab\]\} - 可视化图表/g,
  "{i18n.t('erp.financialanalysispage.{{v0}} - 可视化图表', { v0: tabLabels[activeTab] })}"
);
content = content.replace(
  /\{tabLabels\[activeTab\]\} - 明细数据/g,
  "{i18n.t('erp.financialanalysispage.{{v0}} - 明细数据', { v0: tabLabels[activeTab] })}"
);
fs.writeFileSync(filePath, content, 'utf-8');
console.log(`FinancialAnalysisPage.tsx: tabLabels 替换完成`);
