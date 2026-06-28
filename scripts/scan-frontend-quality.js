#!/usr/bin/env node
/**
 * TOPEMS 前端质量扫描脚本
 * 
 * 检查内容：
 * 1. 设计Token使用情况 - 是否使用设计系统色值而非硬编码
 * 2. 响应式断点使用 - 是否正确使用响应式断点
 * 3. borderRadius检查 - 是否>=8px (md)
 * 4. 页面模板使用 - PageContainer/ListPageTemplate
 * 5. 硬编码色值 - 常见的不规范色值写法
 */

const fs = require('fs');
const path = require('path');

// 配置
const PAGES_DIR = path.join(__dirname, '../apps/web/src/pages');
const COMPONENTS_DIR = path.join(__dirname, '../apps/web/src/components');
const REPORT_DIR = path.join(__dirname, '../docs/reports');

// 跳过的目录
const SKIP_DIRS = [
  'mobile', 'mobile/', '/mobile/', 
  '__tests__', '__tests__/', '/__tests__/',
  'node_modules', '.stories.', '.test.'
];

// 跳过的文件模式
const SKIP_PATTERNS = [
  /\.test\./, /\.stories\./, /index\.tsx$/,
  /LoginPage/, /ErrorPage/, /FlowDesigner/, /Impage/,
  /EmployeeFinanceTab/
];

// 硬编码色值模式（需要替换为设计Token）
const HARDCODED_COLOR_PATTERNS = [
  { pattern: /#[0-9A-Fa-f]{3,8}/g, name: 'hex颜色', severity: 'warning' },
  { pattern: /rgb\s*\([^)]+\)/g, name: 'rgb颜色', severity: 'warning' },
  { pattern: /rgba\s*\([^)]+\)/g, name: 'rgba颜色', severity: 'warning' },
  { pattern: /hsl\s*\([^)]+\)/g, name: 'hsl颜色', severity: 'warning' },
];

// 需要使用设计Token的上下文关键词
const TOKEN_CONTEXT_KEYWORDS = [
  'backgroundColor', 'bgcolor', 'color', 'borderColor', 
  'border', 'fill', 'stroke', 'shadow'
];

// 响应式断点关键词
const RESPONSIVE_BREAKPOINTS = [
  'useMediaQuery', 'useResponsive', 'isMobile', 'isTablet', 'isDesktop',
  'xs', 'sm', 'md', 'lg', 'xl',
  'Grid', 'Grid2', 'Stack',
  '@media', 'sx={{', 'sx={{props'
];

// borderRadius相关关键词
const BORDER_RADIUS_KEYWORDS = [
  'borderRadius', 'radius', 'rounded'
];

// 统计结果
const results = {
  filesScanned: 0,
  filesWithHardcodedColors: [],
  filesWithoutResponsive: [],
  filesWithSmallBorderRadius: [],
  filesWithoutPageContainer: [],
  summary: {
    hardcodedColors: { total: 0, files: 0 },
    noResponsive: { total: 0, files: 0 },
    smallBorderRadius: { total: 0, files: 0 },
    noPageContainer: { total: 0, files: 0 },
  }
};

// 工具函数
function shouldSkip(filePath) {
  return SKIP_DIRS.some(dir => filePath.includes(dir)) ||
         SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function countMatches(pattern, content) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

// 扫描文件
function scanFile(filePath, relativePath) {
  if (shouldSkip(relativePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  results.filesScanned++;
  
  const fileIssues = {
    path: relativePath,
    issues: []
  };
  
  // 1. 检查硬编码色值
  const hardcodedColors = countMatches(/#[0-9A-Fa-f]{3,8}/g, content);
  if (hardcodedColors > 5) { // 超过5个硬编码色值
    fileIssues.issues.push({
      type: 'hardcoded_colors',
      count: hardcodedColors,
      severity: 'warning'
    });
    results.summary.hardcodedColors.total += hardcodedColors;
    results.summary.hardcodedColors.files++;
    results.filesWithHardcodedColors.push(fileIssues);
  }
  
  // 2. 检查响应式断点
  const hasResponsive = RESPONSIVE_BREAKPOINTS.some(keyword => content.includes(keyword));
  const isPageFile = relativePath.includes('/pages/') && content.includes('React');
  if (isPageFile && !hasResponsive && !content.includes('PageContainer')) {
    fileIssues.issues.push({
      type: 'no_responsive',
      severity: 'warning'
    });
    results.summary.noResponsive.total++;
    results.summary.noResponsive.files++;
    results.filesWithoutResponsive.push(fileIssues);
  }
  
  // 3. 检查borderRadius
  const smallRadiusMatches = content.match(/borderRadius\s*:\s*\d+/g);
  if (smallRadiusMatches) {
    const smallRadius = smallRadiusMatches.filter(m => {
      const value = parseInt(m.match(/\d+/)[0]);
      return value > 0 && value < 8;
    });
    if (smallRadius.length > 0) {
      fileIssues.issues.push({
        type: 'small_border_radius',
        count: smallRadius.length,
        severity: 'info',
        details: smallRadius.slice(0, 3)
      });
      results.summary.smallBorderRadius.total += smallRadius.length;
      results.summary.smallBorderRadius.files++;
      results.filesWithSmallBorderRadius.push(fileIssues);
    }
  }
  
  // 4. 检查PageContainer
  if (isPageFile && !content.includes('PageContainer') && !content.includes('ListPageTemplate')) {
    fileIssues.issues.push({
      type: 'no_page_container',
      severity: 'info'
    });
    results.summary.noPageContainer.total++;
    results.summary.noPageContainer.files++;
    results.filesWithoutPageContainer.push(fileIssues);
  }
}

// 递归扫描目录
function scanDirectory(dir, baseDir = '') {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(baseDir, item);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!shouldSkip(relativePath)) {
            scanDirectory(fullPath, relativePath);
          }
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          scanFile(fullPath, relativePath);
        }
      } catch (err) {
        // 跳过无法访问的文件
      }
    }
  } catch (err) {
    console.error(`扫描目录失败: ${dir}`, err.message);
  }
}

// 生成报告
function generateReport() {
  const totalFiles = results.filesScanned;
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    TOPEMS 前端质量扫描报告');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  
  console.log('📊 扫描概览');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`  扫描文件数: ${totalFiles}`);
  console.log(`  扫描时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('');
  
  console.log('📋 问题汇总');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`  ⚠️  硬编码色值: ${results.summary.hardcodedColors.files} 个文件, ${results.summary.hardcodedColors.total} 处`);
  console.log(`  ⚠️  缺少响应式: ${results.summary.noResponsive.files} 个文件`);
  console.log(`  ℹ️  小borderRadius: ${results.summary.smallBorderRadius.files} 个文件, ${results.summary.smallBorderRadius.total} 处`);
  console.log(`  ℹ️  缺少PageContainer: ${results.summary.noPageContainer.files} 个文件`);
  console.log('');
  
  // 详细问题列表
  if (results.filesWithHardcodedColors.length > 0) {
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('⚠️  硬编码色值 (Top 10)');
    console.log('───────────────────────────────────────────────────────────────────');
    results.filesWithHardcodedColors.slice(0, 10).forEach(f => {
      console.log(`  ${f.path}`);
      console.log(`    └─ ${f.issues[0].count} 处硬编码颜色值`);
    });
    if (results.filesWithHardcodedColors.length > 10) {
      console.log(`  ... 还有 ${results.filesWithHardcodedColors.length - 10} 个文件`);
    }
    console.log('');
  }
  
  if (results.filesWithoutResponsive.length > 0) {
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('⚠️  缺少响应式设计的页面 (Top 10)');
    console.log('───────────────────────────────────────────────────────────────────');
    results.filesWithoutResponsive.slice(0, 10).forEach(f => {
      console.log(`  ${f.path}`);
    });
    if (results.filesWithoutResponsive.length > 10) {
      console.log(`  ... 还有 ${results.filesWithoutResponsive.length - 10} 个文件`);
    }
    console.log('');
  }
  
  if (results.filesWithoutPageContainer.length > 0) {
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('ℹ️  缺少 PageContainer 的页面');
    console.log('───────────────────────────────────────────────────────────────────');
    results.filesWithoutPageContainer.slice(0, 10).forEach(f => {
      console.log(`  ${f.path}`);
    });
    if (results.filesWithoutPageContainer.length > 10) {
      console.log(`  ... 还有 ${results.filesWithoutPageContainer.length - 10} 个文件`);
    }
    console.log('');
  }
  
  // 优化建议
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    优化建议');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('1. 硬编码色值 → 使用设计Token');
  console.log('   当前: color: "#FF0000"');
  console.log('   建议: color: "error.main" 或 theme.palette.error.main');
  console.log('');
  console.log('2. 缺少响应式 → 使用响应式组件');
  console.log('   当前: <Box>');
  console.log('   建议: <Grid container> <Grid item xs={12} md={6}>');
  console.log('');
  console.log('3. borderRadius → 使用标准值');
  console.log('   当前: borderRadius: 4');
  console.log('   建议: borderRadius: 2 (theme.shape.borderRadius)');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  
  return {
    totalFiles,
    summary: results.summary,
    score: calculateScore()
  };
}

function calculateScore() {
  // 计算质量分数 (0-100)
  const totalIssues = 
    results.summary.hardcodedColors.files +
    results.summary.noResponsive.files +
    results.summary.noPageContainer.files;
  
  const score = Math.max(0, 100 - (totalIssues / results.filesScanned) * 10);
  return score.toFixed(1);
}

// 导出JSON报告
function exportJsonReport() {
  const reportData = {
    timestamp: new Date().toISOString(),
    totalFiles: results.filesScanned,
    summary: results.summary,
    qualityScore: calculateScore(),
    issues: {
      hardcodedColors: results.filesWithHardcodedColors.map(f => ({
        file: f.path,
        count: f.issues[0]?.count || 0
      })).sort((a, b) => b.count - a.count),
      noResponsive: results.filesWithoutResponsive.map(f => f.path),
      smallBorderRadius: results.filesWithSmallBorderRadius.map(f => ({
        file: f.path,
        count: f.issues[0]?.count || 0,
        examples: f.issues[0]?.details || []
      })).sort((a, b) => b.count - a.count),
      noPageContainer: results.filesWithoutPageContainer.map(f => f.path),
    },
    recommendations: [
      {
        priority: 'P1',
        title: '硬编码色值替换',
        description: '将硬编码的hex/rgb颜色值替换为MUI主题变量',
        affectedFiles: results.summary.hardcodedColors.files,
        estimatedEffort: `${Math.ceil(results.summary.hardcodedColors.files / 10)}人天`
      },
      {
        priority: 'P2',
        title: 'borderRadius标准化',
        description: '统一使用theme.shape.borderRadius或标准md值(8px)',
        affectedFiles: results.summary.smallBorderRadius.files,
        estimatedEffort: `${Math.ceil(results.summary.smallBorderRadius.files / 20)}人天`
      },
      {
        priority: 'P3',
        title: 'PageContainer迁移',
        description: '将剩余页面迁移到PageContainer统一布局',
        affectedFiles: results.summary.noPageContainer.files,
        estimatedEffort: `${Math.ceil(results.summary.noPageContainer.files / 5)}人天`
      }
    ]
  };
  
  // 确保报告目录存在
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  // 导出JSON
  const jsonPath = path.join(REPORT_DIR, 'frontend-quality-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 JSON报告已导出: ${jsonPath}`);
  
  return reportData;
}

// 执行扫描
console.log('🔍 开始扫描...');
scanDirectory(PAGES_DIR);
scanDirectory(COMPONENTS_DIR);

const report = generateReport();
console.log(`📈 前端质量分数: ${report.score}/100`);

// 导出JSON报告
const jsonReport = exportJsonReport();

process.exit(0);
