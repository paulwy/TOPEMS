const fs = require('fs');
const path = require('path');

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

    // 1. 找到 ListPageTemplate 的 title 和 subtitle
    // 使用简单的正则匹配字符串字面量
    const titleMatch = content.match(/title\s*=\s*['"`]([^'"`]*)['"`]/);
    const subtitleMatch = content.match(/subtitle\s*=\s*['"`]([^'"`]*)['"`]/);

    const titleValue = titleMatch ? titleMatch[1] : '';
    const subtitleValue = subtitleMatch ? subtitleMatch[1] : '';

    if (!titleValue && !subtitleValue) {
      return { success: false, message: '未找到字符串字面量的 title 或 subtitle，跳过' };
    }

    // 2. 添加 PageContainer import
    const commonImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/common['"]/;
    const commonMatch = content.match(commonImportRegex);

    if (commonMatch) {
      if (!commonMatch[1].includes('PageContainer')) {
        const newImports = commonMatch[1].trim() + ', PageContainer';
        content = content.replace(commonImportRegex, `import {${newImports}} from '@/components/common'`);
      }
    } else {
      // 在第一个 import 后添加
      const firstImportRegex = /(import\s+.*?from\s+['"].*?['"];?\n)/;
      const match = content.match(firstImportRegex);
      if (match) {
        const importLine = "import { PageContainer } from '@/components/common';\n";
        content = content.replace(firstImportRegex, match[1] + importLine);
      }
    }

    // 3. 找到主 return 语句和最外层容器
    // 策略：找到文件中最后一个 return ( 或 return <
    const returnMatches = [...content.matchAll(/return\s*\(\s*\n/g)];
    let returnIndex = -1;
    
    if (returnMatches.length > 0) {
      returnIndex = returnMatches[returnMatches.length - 1].index;
    } else {
      const returnMatches2 = [...content.matchAll(/return\s*</g)];
      if (returnMatches2.length > 0) {
        returnIndex = returnMatches2[returnMatches2.length - 1].index;
      }
    }

    if (returnIndex === -1) {
      return { success: false, message: '未找到 return 语句' };
    }

    // 从 return 后找第一个标签
    const afterReturn = content.indexOf('(', returnIndex);
    const startSearch = afterReturn !== -1 ? afterReturn + 1 : returnIndex;

    // 跳过空白
    let firstTagPos = startSearch;
    while (firstTagPos < content.length && /\s/.test(content[firstTagPos])) {
      firstTagPos++;
    }

    // 找到第一个标签名
    const tagMatch = content.slice(firstTagPos).match(/^<(\w+)/);
    if (!tagMatch) {
      return { success: false, message: '未找到最外层容器标签' };
    }

    const tagName = tagMatch[1];
    const tagStart = firstTagPos;

    // 找到开标签的结束
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

    // 提取 sx 属性
    let sxAttr = '';
    const sxMatch = openingTag.match(/sx\s*=\s*\{[\s\S]*\}/);
    if (sxMatch) {
      sxAttr = sxMatch[0];
    }

    // 构建 PageContainer 开标签
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

    // 替换开标签
    content = content.slice(0, tagStart) + pageContainerOpen + content.slice(tagEnd);

    // 计算偏移量
    const offset = pageContainerOpen.length - (tagEnd - tagStart);

    // 4. 找到匹配的闭合标签
    // 从开标签结束位置开始，计算深度
    let depth = 1;
    let pos = tagStart + pageContainerOpen.length;
    let closeStart = -1;
    let closeEnd = -1;

    while (pos < content.length && depth > 0) {
      const nextOpen = content.indexOf(`<${tagName}`, pos);
      const nextClose = content.indexOf(`</${tagName}`, pos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        // 检查是不是自闭合
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
          closeStart = nextClose;
          closeEnd = content.indexOf('>', nextClose) + 1;
          break;
        }
        pos = nextClose + 1;
      }
    }

    if (closeStart === -1) {
      return { success: false, message: `未找到闭合标签 </${tagName}>` };
    }

    // 替换闭合标签
    content = content.slice(0, closeStart) + pageContainerClose + content.slice(closeEnd);

    // 5. 将 ListPageTemplate 的 title 和 subtitle 设为空
    // 只替换 ListPageTemplate 标签内的
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
    'admin/AccountManagementPage.tsx',
    'admin/BankAccountManagementPage.tsx',
    'admin/DictionaryManagementPage.tsx',
    'admin/MigrationAdminPage.tsx',
    'admin/PermissionManagementPage.tsx',
    'admin/PluginManagementPage.tsx',
    'admin/RoleManagementPage.tsx',
    'admin/UserManagementPage.tsx',
    'asset/AssetManagementPage.tsx',
    'asset/EquipmentInspectionPage.tsx',
    'asset/EquipmentMaintenancePage.tsx',
    'asset/EquipmentManagementPage.tsx',
    'asset/OfficeSuppliesManagementPage.tsx',
    'asset/VehicleManagementPage.tsx',
    'bi/BIDataSourcePage.tsx',
    'bi/BIReportPage.tsx',
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
    'notification/NotificationArchivePage.tsx',
    'notification/NotificationTemplatesPage.tsx',
    'oa/AnnouncementManagementPage.tsx',
    'oa/MeetingRoomManagementPage.tsx',
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  console.log('='.repeat(70));
  console.log('页面迁移工具 v3 - 迁移到 PageContainer 统一布局');
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
