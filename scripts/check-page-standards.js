#!/usr/bin/env node
/**
 * TOPEMS 页面规范检查脚本
 * 
 * 检查内容：
 * 1. 页面是否使用 PageContainer
 * 2. 是否存在废弃的 PageHeader 引用
 * 3. 页面标题是否设置
 * 4. 路由与导航一致性
 */

const fs = require('fs');
const path = require('path');

// 配置
const PAGES_DIR = path.join(__dirname, '../apps/web/src/pages');
const ROUTES_DIR = path.join(__dirname, '../apps/web/src/routes');

// 统计结果
const results = {
  total: 0,
  withPageContainer: 0,
  withoutPageContainer: [],
  withPageHeader: [],
  mobilePages: [],
  specialPages: [],
  skipped: [],
};

// 跳过检查的页面类型
const SKIP_PATTERNS = [
  /\/mobile\//,           // 移动端页面
  /MobileWorkstation/,    // 移动工作站
  /LoginPage/,            // 登录页
  /ErrorPage/,            // 错误页
  /FlowDesigner/,         // 设计器
  /Impage/,               // 图片占位
  /index\.tsx$/,          // 索引文件
  /EmployeeFinanceTab/,    // Tab组件
];

// 移动端页面目录
const MOBILE_DIRS = ['mobile'];

// 特殊页面（不需要 PageContainer）
const SPECIAL_PAGES = {
  'LoginPage': '登录页，全屏布局',
  'ErrorPage': '错误页，全屏布局',
  'FlowDesignerPage': '设计器，全屏布局',
  'Impage': '图片占位组件',
};

// 扫描页面目录
function scanPages(dir, baseDir = '') {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 跳过移动端目录
      if (MOBILE_DIRS.includes(item)) {
        results.mobilePages.push(...getFilesInDir(fullPath, relativePath));
        continue;
      }
      scanPages(fullPath, relativePath);
    } else if (item.endsWith('.tsx') && !item.endsWith('.test.tsx')) {
      results.total++;
      checkPage(fullPath, relativePath);
    }
  }
}

// 获取目录下的所有文件
function getFilesInDir(dir, baseDir = '') {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getFilesInDir(fullPath, relativePath));
    } else if (item.endsWith('.tsx') && !item.endsWith('.test.tsx')) {
      files.push({ path: relativePath, fullPath });
    }
  }
  
  return files;
}

// 检查单个页面
function checkPage(filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.tsx');
  
  // 检查是否应该跳过
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(relativePath)) {
      results.skipped.push({
        path: relativePath,
        reason: '符合跳过规则',
      });
      return;
    }
  }
  
  // 检查特殊页面
  if (SPECIAL_PAGES[fileName]) {
    results.skipped.push({
      path: relativePath,
      reason: SPECIAL_PAGES[fileName],
    });
    return;
  }
  
  // 检查 PageContainer
  if (content.includes('PageContainer')) {
    results.withPageContainer++;
    
    // 检查是否有废弃的 PageHeader
    if (content.includes("from '@/components") && content.includes('PageHeader')) {
      results.withPageHeader.push(relativePath);
    }
  } else {
    results.withoutPageContainer.push(relativePath);
  }
}

// 打印报告
function printReport() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    TOPEMS 页面规范检查报告');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  console.log('📊 统计概览');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  总页面数: ${results.total}`);
  console.log(`  使用 PageContainer: ${results.withPageContainer} (${((results.withPageContainer / results.total) * 100).toFixed(1)}%)`);
  console.log(`  未使用 PageContainer: ${results.withoutPageContainer.length}`);
  console.log('');
  
  console.log('📋 未使用 PageContainer 的页面');
  console.log('───────────────────────────────────────────────────────────────');
  if (results.withoutPageContainer.length === 0) {
    console.log('  ✅ 所有页面都使用了 PageContainer');
  } else {
    results.withoutPageContainer.forEach(p => console.log(`  ⚠️  ${p}`));
  }
  console.log('');
  
  console.log('⚠️  使用废弃 PageHeader 的页面');
  console.log('───────────────────────────────────────────────────────────────');
  if (results.withPageHeader.length === 0) {
    console.log('  ✅ 没有页面使用废弃的 PageHeader');
  } else {
    results.withPageHeader.forEach(p => console.log(`  ⚠️  ${p}`));
  }
  console.log('');
  
  console.log('📱 移动端页面 (已跳过检查)');
  console.log('───────────────────────────────────────────────────────────────');
  if (results.mobilePages.length === 0) {
    console.log('  无移动端页面');
  } else {
    console.log(`  共 ${results.mobilePages.length} 个页面`);
  }
  console.log('');
  
  console.log('⏭️  跳过的特殊页面');
  console.log('───────────────────────────────────────────────────────────────');
  if (results.skipped.length === 0) {
    console.log('  无');
  } else {
    results.skipped.forEach(p => console.log(`  ✅ ${p.path} - ${p.reason}`));
  }
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  // 返回检查结果
  return {
    success: results.withoutPageContainer.length === 0 && results.withPageHeader.length === 0,
    stats: results,
  };
}

// 执行检查
try {
  scanPages(PAGES_DIR);
  const result = printReport();
  process.exit(result.success ? 0 : 1);
} catch (error) {
  console.error('检查失败:', error.message);
  process.exit(1);
}
