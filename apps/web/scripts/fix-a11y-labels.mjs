#!/usr/bin/env node

/**
 * 自动修复 jsx-a11y/label-has-associated-control 警告
 * 
 * 修复模式：
 *   <label style={{...}}>标签文本</label>
 *   <Input ... />
 * 
 * 修复为：
 *   <label htmlFor="generated-id" style={{...}}>标签文本</label>
 *   <Input id="generated-id" ... />
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, '..');

const files = [
  'src/components/redesign/primitives/Avatar.tsx',
  'src/components/redesign/primitives/FileUpload.tsx',
  'src/pages/crm/CrmContractRedesignPage.tsx',
  'src/pages/crm/CrmCustomerRedesignPage.tsx',
  'src/pages/crm/CrmOpportunityRedesignPage.tsx',
  'src/pages/erp/ErpSalesOrderRedesignPage.tsx',
  'src/pages/erp/PurchaseOrderPage.tsx',
  'src/pages/hrm/HrmAttendanceRedesignPage.tsx',
  'src/pages/hrm/HrmEmployeeRedesignPage.tsx',
  'src/pages/hrm/HrmPerformanceRedesignPage.tsx',
  'src/pages/mes/MesWorkOrderPage.tsx',
  'src/pages/oa/AnnouncementPage.tsx',
  'src/pages/qms/QmsAuditRedesignPage.tsx',
  'src/pages/qms/QmsEightDRedesignPage.tsx',
  'src/pages/qms/QmsInspectionRedesignPage.tsx',
  'src/pages/qms/QmsNonconformanceRedesignPage.tsx',
  'src/pages/wms/WmsLocationPage.tsx',
  'src/pages/wms/WmsOutboundOrderPage.tsx',
  'src/pages/wms/WmsStocktakePage.tsx',
];

let totalFixed = 0;

files.forEach((file) => {
  const filePath = path.join(baseDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file}: file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = 0;

  // 匹配 <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
  const labelPattern = /<label style=\{\{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 \}\}>/g;

  let match;
  const matches = [];
  while ((match = labelPattern.exec(content)) !== null) {
    matches.push({
      index: match.index,
      fullMatch: match[0],
    });
  }

  console.log(`Found ${matches.length} labels in ${file}`);

  // 从后往前替换，避免索引偏移
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, fullMatch } = matches[i];
    
    // 生成唯一 id
    const id = `field-${i + 1}`;
    
    // 给 label 添加 htmlFor
    const newLabel = fullMatch.replace(
      '<label style=',
      `<label htmlFor="${id}" style=`
    );
    
    // 找到 label 结束后紧跟的组件
    const afterLabel = content.slice(index + fullMatch.length);
    
    // 跳过 label 的闭合标签 </label>，然后匹配 <Input 或 <Select 或 <textarea 或 <FileUpload
    const componentMatch = afterLabel.match(/^([\s\S]*?<\/label>\s*)(<(?:Input|Select|textarea|FileUpload))/);
    
    if (componentMatch) {
      // 给组件添加 id
      const newContent = 
        content.slice(0, index) + 
        newLabel + 
        componentMatch[1] +
        componentMatch[2] +
        ` id="${id}"` +
        afterLabel.slice(componentMatch[0].length);
      
      content = newContent;
      fixed++;
    } else {
      console.log(`  No component found after label at index ${index}`);
      console.log(`  After label: ${afterLabel.slice(0, 100)}`);
    }
  }

  if (fixed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${fixed} labels in ${file}`);
    totalFixed += fixed;
  }
});

console.log(`\nTotal fixed: ${totalFixed}`);
