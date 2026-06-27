const fs = require('fs');
const path = require('path');

function findMainComponentAndOuterContainer(lines) {
  let mainComponentStart = -1;
  let returnLine = -1;
  let outerOpenLine = -1;
  let outerCloseLine = -1;
  let outerTagName = null;
  let depth = 0;
  let inMainComponent = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (mainComponentStart === -1 && (
      line.match(/^const \w+.*React\.FC.*=.*=>\s*\{/) ||
      line.match(/^export default function \w+/) ||
      line.match(/^function \w+.*\(/)
    )) {
      mainComponentStart = i;
      inMainComponent = true;
      braceDepth = 0;
      continue;
    }

    if (!inMainComponent) continue;

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;

    if (returnLine === -1 && line.match(/^\s{2}return\s*\(\s*$/)) {
      returnLine = i;
      continue;
    }

    if (returnLine !== -1 && outerOpenLine === -1) {
      const trimmed = line.trim();
      if (trimmed.startsWith('<')) {
        const tagMatch = trimmed.match(/^<(\w+|>)/);
        if (tagMatch) {
          outerOpenLine = i;
          outerTagName = tagMatch[1] === '>' ? 'Fragment' : tagMatch[1];
          depth = 1;
          continue;
        }
      }
    }

    if (outerOpenLine !== -1 && depth > 0) {
      const openRegex = new RegExp(`<${outerTagName === 'Fragment' ? '' : outerTagName}`, 'g');
      const closeRegex = new RegExp(outerTagName === 'Fragment' ? '<\\/>' : `<\\/${outerTagName}>`, 'g');
      
      const selfCloseRegex = new RegExp(outerTagName === 'Fragment' ? '<\\/>' : `<${outerTagName}[^>]*\\/>`, 'g');
      const selfMatches = (line.match(selfCloseRegex) || []).length;
      
      let openMatches = (line.match(openRegex) || []).length - selfMatches;
      let closeMatches = (line.match(closeRegex) || []).length;

      depth += openMatches - closeMatches;

      if (depth <= 0) {
        outerCloseLine = i;
        break;
      }
    }

    if (braceDepth <= 0 && mainComponentStart < i) {
      break;
    }
  }

  return {
    mainComponentStart,
    returnLine,
    outerOpenLine,
    outerCloseLine,
    outerTagName
  };
}

function migratePage(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    if (content.includes('PageContainer')) {
      return { success: false, message: '已使用 PageContainer，跳过' };
    }

    if (!content.includes('ListPageTemplate')) {
      return { success: false, message: '未使用 ListPageTemplate，跳过' };
    }

    const lines = content.split('\n');
    const info = findMainComponentAndOuterContainer(lines);

    if (info.outerOpenLine === -1 || info.outerCloseLine === -1) {
      return { success: false, message: `未找到最外层容器 (returnLine: ${info.returnLine})` };
    }

    const titleMatch = content.match(/title\s*=\s*['"`]([^'"`]*)['"`]/);
    const subtitleMatch = content.match(/subtitle\s*=\s*['"`]([^'"`]*)['"`]/);

    const titleValue = titleMatch ? titleMatch[1] : '';
    const subtitleValue = subtitleMatch ? subtitleMatch[1] : '';

    if (!titleValue && !subtitleValue) {
      return { success: false, message: '未找到字符串字面量的 title 或 subtitle，跳过' };
    }

    const commonImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/common['"]/;
    const commonMatch = content.match(commonImportRegex);

    if (commonMatch) {
      if (!commonMatch[1].includes('PageContainer')) {
        const newImports = commonMatch[1].trim() + ', PageContainer';
        content = content.replace(commonImportRegex, `import {${newImports}} from '@/components/common'`);
      }
    } else {
      const templateImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/templates['"]/;
      const tmplMatch = content.match(templateImportRegex);
      if (tmplMatch) {
        const importLine = "\nimport { PageContainer } from '@/components/common';";
        content = content.replace(templateImportRegex, match => match + importLine);
      } else {
        const firstImportRegex = /(import\s+.*?from\s+['"].*?['"];?\n)/;
        const match = content.match(firstImportRegex);
        if (match) {
          const importLine = "import { PageContainer } from '@/components/common';\n";
          content = content.replace(firstImportRegex, match[1] + importLine);
        }
      }
    }

    const newLines = content.split('\n');

    const openLineContent = newLines[info.outerOpenLine];
    const closeLineContent = newLines[info.outerCloseLine];

    const indentMatch = openLineContent.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';

    let pageContainerOpen = `${indent}<PageContainer`;
    if (titleValue) pageContainerOpen += ` title='${titleValue}'`;
    if (subtitleValue) pageContainerOpen += ` subtitle='${subtitleValue}'`;
    pageContainerOpen += '>';

    const pageContainerClose = `${indent}</PageContainer>`;

    newLines[info.outerOpenLine] = pageContainerOpen + '\n' + openLineContent;
    newLines[info.outerCloseLine] = closeLineContent + '\n' + pageContainerClose;

    content = newLines.join('\n');

    const lptRegex = /<ListPageTemplate[\s\S]*?(\/>\s*$|<\/ListPageTemplate>)/m;
    const lptMatch = content.match(lptRegex);
    
    if (lptMatch) {
      let lptContent = lptMatch[0];
      lptContent = lptContent.replace(/title\s*=\s*['"`]([^'"`]*)['"`]/, "title=''");
      lptContent = lptContent.replace(/subtitle\s*=\s*['"`]([^'"`]*)['"`]/, "subtitle=''");
      content = content.replace(lptRegex, lptContent);
    }

    if (content === originalContent) {
      return { success: false, message: '内容未发生变化' };
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, message: `迁移成功 (title: ${titleValue.slice(0, 30)}...)` };

  } catch (e) {
    return { success: false, message: `错误: ${e.message}` };
  }
}

function main() {
  const basePath = '/Users/air/TOPEMS/apps/web/src/pages';

  const filesToMigrate = [
    'crm/CRMBillingPage.tsx',
    'crm/CRMCustomerScoringPage.tsx',
    'crm/CRMCustomerSegmentationPage.tsx',
    'crm/CRMRecommendationPage.tsx',
    'crm/ContactManagementPage.tsx',
    'crm/CustomerManagementPage.tsx',
    'crm/InteractionManagementPage.tsx',
    'crm/OpportunityManagementPage.tsx',
    'ehs/EhsAccidentPage.tsx',
    'ehs/EhsDrillPage.tsx',
    'ehs/EhsHazardPage.tsx',
    'ehs/EhsIncidentReportPage.tsx',
    'ehs/EhsPlanPage.tsx',
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  console.log('='.repeat(70));
  console.log('页面迁移工具 v5 - 迁移到 PageContainer 统一布局');
  console.log('='.repeat(70));
  console.log();

  for (const fileRel of filesToMigrate) {
    const filePath = path.join(basePath, fileRel);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${fileRel} - 文件不存在`);
      errorCount++;
      continue;
    }

    const result = migratePage(filePath);

    if (result.success) {
      console.log(`✅ ${fileRel} - ${result.message}`);
      successCount++;
    } else if (result.message.includes('跳过')) {
      console.log(`⏭️  ${fileRel} - ${result.message}`);
      skipCount++;
    } else {
      console.log(`❌ ${fileRel} - ${result.message}`);
      errorCount++;
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log(`迁移完成: 成功 ${successCount}, 跳过 ${skipCount}, 错误 ${errorCount}`);
  console.log('='.repeat(70));
}

main();
