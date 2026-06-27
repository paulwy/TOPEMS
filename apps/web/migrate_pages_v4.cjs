const fs = require('fs');
const path = require('path');

function findMainComponentReturn(content) {
  const lines = content.split('\n');
  
  let componentStart = -1;
  let returnLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^const \w+.*React\.FC.*=.*=>\s*\{/) || 
        line.match(/^export default function \w+/) ||
        line.match(/^function \w+.*\{/)) {
      if (componentStart === -1) {
        componentStart = i;
      }
    }
    if (componentStart !== -1 && line.match(/^\s*return\s*\(\s*$/)) {
      returnLine = i;
      break;
    }
  }
  
  return returnLine;
}

function findMatchingCloseTag(content, startPos, tagName) {
  let depth = 1;
  let pos = startPos;
  
  while (pos < content.length && depth > 0) {
    const nextOpen = content.indexOf(`<${tagName}`, pos);
    const nextClose = content.indexOf(`</${tagName}`, pos);
    
    if (nextClose === -1) break;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const afterOpen = content.indexOf('>', nextOpen);
      if (afterOpen !== -1 && content[afterOpen - 1] === '/') {
        pos = afterOpen + 1;
        continue;
      }
      depth++;
      pos = nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) {
        const closeEnd = content.indexOf('>', nextClose);
        return { start: nextClose, end: closeEnd + 1 };
      }
      pos = nextClose + 1;
    }
  }
  
  return null;
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
      const firstImportRegex = /(import\s+.*?from\s+['"].*?['"];?\n)/;
      const match = content.match(firstImportRegex);
      if (match) {
        const importLine = "import { PageContainer } from '@/components/common';\n";
        content = content.replace(firstImportRegex, match[1] + importLine);
      }
    }

    const returnLineIndex = findMainComponentReturn(content);
    if (returnLineIndex === -1) {
      return { success: false, message: '未找到主组件的 return 语句' };
    }

    const lines = content.split('\n');
    let returnStartPos = 0;
    for (let i = 0; i < returnLineIndex; i++) {
      returnStartPos += lines[i].length + 1;
    }
    returnStartPos += lines[returnLineIndex].indexOf('return');

    const afterReturn = content.indexOf('(', returnStartPos);
    const startSearch = afterReturn !== -1 ? afterReturn + 1 : returnStartPos;

    let firstTagPos = startSearch;
    while (firstTagPos < content.length && /\s/.test(content[firstTagPos])) {
      firstTagPos++;
    }

    const tagMatch = content.slice(firstTagPos).match(/^<(\w+)/);
    if (!tagMatch) {
      return { success: false, message: '未找到最外层容器标签' };
    }

    const tagName = tagMatch[1];
    const tagStart = firstTagPos;

    let tagEnd = tagStart + tagMatch[0].length;
    let inString = false;
    let stringChar = '';
    let braceDepth = 0;

    while (tagEnd < content.length) {
      const c = content[tagEnd];
      if (inString) {
        if (c === stringChar && content[tagEnd - 1] !== '\\') {
          inString = false;
        }
        tagEnd++;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inString = true;
        stringChar = c;
      } else if (c === '{') {
        braceDepth++;
      } else if (c === '}') {
        braceDepth--;
      } else if (c === '>' && braceDepth === 0) {
        tagEnd++;
        break;
      }
      tagEnd++;
    }

    const openingTag = content.slice(tagStart, tagEnd);

    let sxAttr = '';
    const sxMatch = openingTag.match(/sx\s*=\s*\{[\s\S]*\}/);
    if (sxMatch) {
      sxAttr = sxMatch[0];
    }

    let pageContainerAttrs = [];
    if (sxAttr) {
      pageContainerAttrs.push(sxAttr);
    }
    if (titleValue) {
      pageContainerAttrs.push(`title='${titleValue}'`);
    }
    if (subtitleValue) {
      pageContainerAttrs.push(`subtitle='${subtitleValue}'`);
    }

    const pageContainerOpen = `<PageContainer ${pageContainerAttrs.join(' ')}>`;
    const pageContainerClose = '</PageContainer>';

    content = content.slice(0, tagStart) + pageContainerOpen + content.slice(tagEnd);

    const offset = pageContainerOpen.length - (tagEnd - tagStart);

    const closeInfo = findMatchingCloseTag(content, tagStart + pageContainerOpen.length, tagName);
    if (!closeInfo) {
      return { success: false, message: `未找到匹配的闭合标签 </${tagName}>` };
    }

    content = content.slice(0, closeInfo.start) + pageContainerClose + content.slice(closeInfo.end);

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
  console.log('页面迁移工具 v4 - 迁移到 PageContainer 统一布局');
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
