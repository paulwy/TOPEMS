#!/usr/bin/env tsx
/**
 * 硬编码颜色替换脚本
 * 
 * 功能：
 * - 扫描 TypeScript/TSX 文件中的硬编码颜色值
 * - 根据映射表替换为 theme token
 * - 生成替换报告
 * - 支持白名单过滤
 * 
 * 使用方法：
 * 1. 分析模式（不修改文件）：
 *    tsx scripts/replace-hardcoded-colors.ts --analyze
 * 
 * 2. 替换单个文件：
 *    tsx scripts/replace-hardcoded-colors.ts --file apps/web/src/components/Button.tsx
 * 
 * 3. 批量替换（先测试）：
 *    tsx scripts/replace-hardcoded-colors.ts --batch --limit 5
 * 
 * 4. 全量替换（谨慎）：
 *    tsx scripts/replace-hardcoded-colors.ts --batch
 */

import * as fs from 'fs';
import * as path from 'path';
import { colorMappings, whitelist } from './color-mapping';

interface ReplacementResult {
  file: string;
  line: number;
  original: string;
  replaced: string;
  token: string;
  needsReview: boolean;
}

interface FileReport {
  file: string;
  totalColors: number;
  replacedColors: number;
  skippedColors: number;
  replacements: ReplacementResult[];
}

// 配置
const config = {
  targetDir: 'apps/web/src',
  extensions: ['.tsx', '.ts'],
  excludePatterns: [
    '.bak.',
    '.test.',
    '.spec.',
    '__tests__',
    'node_modules',
  ],
  // 主题定义文件 - 不替换
  themeFiles: [
    'theme/theme.ts',
    'theme/tokens.ts',
    'theme/presets.ts',
    'theme/gradients.ts',
    'theme/dataGridTheme.ts',
    'theme/storybook-theme.ts',
    'theme/index.ts',
    'constants/colors.ts',
    'packages/tokens/',
    'charts/chartTheme.ts',
  ],
};

/**
 * 查找文件中的硬编码颜色
 */
function findHardcodedColors(content: string, filePath: string): ReplacementResult[] {
  const results: ReplacementResult[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // 跳过注释行
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    // 匹配 # 开头的颜色（6位优先，避免3位优先导致 #10B981 被截断为 #10B）
    const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
    let match;
    while ((match = hexPattern.exec(line)) !== null) {
      const color = match[0];
      const mapping = findMapping(color);

      if (mapping && !isWhitelisted(color, line, filePath)) {
        results.push({
          file: filePath,
          line: lineIndex + 1,
          original: color,
          replaced: generateReplacement(color, mapping, line),
          token: mapping.token,
          needsReview: mapping.needsReview,
        });
      }
    }

    // 匹配 rgb() 和 rgba()
    const rgbPattern = /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g;
    const rgbaPattern = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g;

    [rgbPattern, rgbaPattern].forEach(pattern => {
      while ((match = pattern.exec(line)) !== null) {
        const color = match[0];
        const mapping = findMapping(color);

        if (mapping && !isWhitelisted(color, line, filePath)) {
          results.push({
            file: filePath,
            line: lineIndex + 1,
            original: color,
            replaced: generateReplacement(color, mapping, line),
            token: mapping.token,
            needsReview: mapping.needsReview,
          });
        }
      }
    });
  });

  return results;
}

/**
 * 查找颜色映射
 */
function findMapping(color: string) {
  // 标准化颜色值（移除空格差异）
  const normalizedColor = color.replace(/\s+/g, '').toLowerCase();

  return colorMappings.find(m => {
    const normalizedMapping = m.hardcoded.replace(/\s+/g, '').toLowerCase();
    return normalizedMapping === normalizedColor;
  });
}

/**
 * 检查是否在白名单中
 */
function isWhitelisted(color: string, line: string, filePath?: string): boolean {
  // 检查白名单
  if (whitelist.some(w => color.includes(w))) {
    return true;
  }

  // 主题定义文件 - 不替换
  if (filePath && config.themeFiles.some(tf => filePath.includes(tf))) {
    return true;
  }

  // 检查是否在渐变中（通常保留）
  if (line.includes('gradient') || line.includes('linear-gradient') || line.includes('radial-gradient')) {
    return true;
  }

  // style= 属性（HTML style prop，不支持 MUI token 简写）
  if (line.includes('style={{') || line.includes('style={{ ')) {
    return true;
  }

  // 检查是否是 CSS 变量定义（如 const something = '#fff'）
  if (line.includes('const') && line.includes('=') && !line.includes('sx') && !line.includes('style')) {
    return true;
  }

  return false;
}

/**
 * 生成替换字符串
 * 使用 MUI sx 简写格式（如 'primary.main'），替换时保留外层引号
 */
function generateReplacement(color: string, mapping: any, _line: string): string {
  return mapping.token;
}

/**
 * 替换文件中的颜色
 */
function replaceColorsInFile(filePath: string, replacements: ReplacementResult[]): string {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  replacements.forEach(replacement => {
    const lineIndex = replacement.line - 1;
    const originalLine = lines[lineIndex];

    // 简单替换（保守策略：只替换明确的颜色值）
    if (!replacement.needsReview) {
      lines[lineIndex] = originalLine.replace(replacement.original, replacement.replaced);
    }
  });

  return lines.join('\n');
}

/**
 * 扫描目录
 */
function scanDirectory(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // 排除特定目录
        if (!config.excludePatterns.some(p => fullPath.includes(p))) {
          traverse(fullPath);
        }
      } else if (stat.isFile()) {
        // 检查扩展名
        if (config.extensions.some(ext => item.endsWith(ext))) {
          // 排除特定文件
          if (!config.excludePatterns.some(p => item.includes(p))) {
            files.push(fullPath);
          }
        }
      }
    });
  }

  traverse(dir);
  return files;
}

/**
 * 分析单个文件
 */
function analyzeFile(filePath: string): FileReport {
  const content = fs.readFileSync(filePath, 'utf-8');
  const replacements = findHardcodedColors(content, filePath);

  return {
    file: filePath,
    totalColors: replacements.length,
    replacedColors: replacements.filter(r => !r.needsReview).length,
    skippedColors: replacements.filter(r => r.needsReview).length,
    replacements,
  };
}

/**
 * 生成报告
 */
function generateReport(reports: FileReport[]): void {
  console.log('\n========================================');
  console.log('硬编码颜色替换报告');
  console.log('========================================\n');

  // 统计汇总
  const totalFiles = reports.length;
  const totalColors = reports.reduce((sum, r) => sum + r.totalColors, 0);
  const replacedColors = reports.reduce((sum, r) => sum + r.replacedColors, 0);
  const skippedColors = reports.reduce((sum, r) => sum + r.skippedColors, 0);

  console.log(`扫描文件数：${totalFiles}`);
  console.log(`发现硬编码颜色：${totalColors}`);
  console.log(`可自动替换：${replacedColors}`);
  console.log(`需人工审核：${skippedColors}`);
  console.log(`替换率：${((replacedColors / totalColors) * 100).toFixed(2)}%\n`);

  // 高频文件
  const topFiles = reports
    .filter(r => r.totalColors > 0)
    .sort((a, b) => b.totalColors - a.totalColors)
    .slice(0, 10);

  if (topFiles.length > 0) {
    console.log('高频文件（Top 10）：');
    topFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.file} - ${file.totalColors} 处`);
    });
    console.log('');
  }

  // 详细替换列表
  console.log('详细替换列表：');
  reports.forEach(report => {
    if (report.replacements.length > 0) {
      console.log(`\n文件：${report.file}`);
      report.replacements.forEach(r => {
        const status = r.needsReview ? '⚠️  需审核' : '✅ 可替换';
        console.log(`  Line ${r.line}: ${r.original} → ${r.token} ${status}`);
      });
    }
  });

  console.log('\n========================================\n');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const autoYes = args.includes('--yes');

  const reports: FileReport[] = [];

  switch (mode) {
    case '--analyze':
      // 分析模式：扫描所有文件，不修改
      console.log('正在扫描文件...');
      const files = scanDirectory(config.targetDir);
      console.log(`找到 ${files.length} 个文件`);

      files.forEach(file => {
        const report = analyzeFile(file);
        if (report.totalColors > 0) {
          reports.push(report);
        }
      });

      generateReport(reports);
      break;

    case '--file':
      // 单文件模式
      const filePath = args[1];
      if (!filePath || !fs.existsSync(filePath)) {
        console.error('请提供有效的文件路径');
        process.exit(1);
      }

      const fileReport = analyzeFile(filePath);
      reports.push(fileReport);
      generateReport(reports);

      // 执行替换
      if (fileReport.replacedColors > 0) {
        let answer = 'n';
        if (autoYes) {
          answer = 'y';
        } else {
          console.log('是否执行替换？(y/n)');
          answer = await new Promise<string>(resolve => {
            process.stdin.once('data', data => resolve(data.toString().trim()));
          });
        }

        if (answer === 'y') {
          const newContent = replaceColorsInFile(filePath, fileReport.replacements);
          fs.writeFileSync(filePath, newContent, 'utf-8');
          console.log(`✅ 已替换 ${fileReport.replacedColors} 处颜色`);
        } else {
          console.log('❌ 取消替换');
        }
      }
      break;

    case '--batch':
      // 批量模式
      const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined;

      console.log('正在扫描文件...');
      const batchFiles = scanDirectory(config.targetDir);
      console.log(`找到 ${batchFiles.length} 个文件`);

      // 按硬编码颜色数量排序，优先处理高频文件
      const analyzedFiles = batchFiles
        .map(file => analyzeFile(file))
        .filter(r => r.totalColors > 0)
        .sort((a, b) => b.totalColors - a.totalColors);

      const targetFiles = limit ? analyzedFiles.slice(0, limit) : analyzedFiles;

      generateReport(targetFiles);

      if (targetFiles.length > 0) {
        let answer = 'n';
        if (autoYes) {
          answer = 'y';
        } else {
          console.log(`是否批量替换 ${targetFiles.length} 个文件？(y/n)`);
          answer = await new Promise<string>(resolve => {
            process.stdin.once('data', data => resolve(data.toString().trim()));
          });
        }

        if (answer === 'y') {
          let totalReplaced = 0;
          targetFiles.forEach(report => {
            if (report.replacedColors > 0) {
              const newContent = replaceColorsInFile(report.file, report.replacements);
              fs.writeFileSync(report.file, newContent, 'utf-8');
              console.log(`✅ ${report.file} - ${report.replacedColors} 处`);
              totalReplaced += report.replacedColors;
            }
          });
          console.log(`\n✅ 批量替换完成，共替换 ${totalReplaced} 处颜色`);
        } else {
          console.log('❌ 取消替换');
        }
      }
      break;

    default:
      console.log(`
使用方法：
  --analyze                      分析所有文件（不修改）
  --file <path>                  替换单个文件
  --file <path> --yes            替换单个文件（跳过确认）
  --batch                        批量替换
  --batch --limit N              批量替换（限制文件数）
  --batch --limit N --yes        批量替换（跳过确认）
      `);
      break;
  }
}

main().catch(console.error);