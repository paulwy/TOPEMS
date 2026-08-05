#!/usr/bin/env node
// 无障碍 aria-label 覆盖率检查（V65 阶段三新增）
//
// 用途：
// 1. 扫描 apps/web/src 下所有 .tsx 文件中的 IconButton / Icon-only Button 组件
// 2. 检查这些组件是否提供了 aria-label 属性
// 3. 输出未覆盖清单，CI 门禁用
//
// 用法：
//   node scripts/ci/check-a11y.cjs                 # 全量检查，输出报告
//   node scripts/ci/check-a11y.cjs --json           # 输出 JSON 格式
//   node scripts/ci/check-a11y.cjs --strict         # 严格模式：超过阈值则 exit 1
//   node scripts/ci/check-a11y.cjs --threshold 10   # 自定义阈值（默认 10）
//
// 退出码：
//   0 = 通过（未覆盖数 ≤ 阈值）
//   1 = 严格模式下未覆盖数 > 阈值

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');
const COMPONENTS_DIR = path.join(WEB_ROOT, 'components');

// CLI 参数解析
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const strictMode = args.includes('--strict');
const thresholdIdx = args.indexOf('--threshold');
const threshold =
  thresholdIdx !== -1 && args[thresholdIdx + 1]
    ? parseInt(args[thresholdIdx + 1], 10)
    : 10;

// 递归收集所有 .tsx 文件
function collectTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 跳过 __tests__、node_modules、test 等目录
      if (['__tests__', 'node_modules', 'test', 'tests'].includes(entry.name)) continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

// 判断某行是否是 JSX 开标签的闭合 >
function isJsxClosingBracket(line) {
  const trimmed = line.trim();
  if (trimmed === '>' || trimmed === '/>') return true;
  // 行尾 > 但不是 =>（箭头函数）
  if (/>$/.test(trimmed) && !/=>\s*$/.test(trimmed) && !/[('"]/.test(trimmed.replace(/.*>/, ''))) return true;
  return false;
}

// 检测 IconButton 无 aria-label
// 匹配 <IconButton ...> 且不包含 aria-label 属性
function findIconButtonWithoutAriaLabel(content, filePath) {
  const violations = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const iconBtnMatch = line.match(/<IconButton\b/);
    if (!iconBtnMatch) continue;

    // 收集从 <IconButton 到 > 闭合的完整文本（可能跨多行）
    let fullTag = line;
    let endLine = i;
    if (!isJsxClosingBracket(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        fullTag += '\n' + lines[j];
        endLine = j;
        if (isJsxClosingBracket(lines[j])) break;
        if (j > i + 15) break; // 安全限制
      }
    }

    // 检查是否有 aria-label
    // 跳过含 spread 属性（{...props}）的 IconButton，因为 aria-label 可能通过 spread 传入
    if (!/\baria-label\b/.test(fullTag) && !/\{\.\.\.\w+\}/.test(fullTag)) {
      violations.push({
        file: path.relative(path.resolve(__dirname, '../..'), filePath),
        line: i + 1,
        endLine: endLine + 1,
        component: 'IconButton',
      });
    }
  }
  return violations;
}

// 检测 Icon-only Button（MUI <Button> 仅含图标子元素，无文本）
// 策略：匹配 <Button ...> 内部只有 <XxxIcon .../> 或 <Xxx size=.. /> 等图标组件
function findIconOnlyButtonWithoutAriaLabel(content, filePath) {
  const violations = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 匹配 <Button 但不匹配 <ButtonGroup 等
    const btnMatch = line.match(/<Button(?![\w])/);
    if (!btnMatch) continue;

    // 收集从 <Button 到 </Button> 的完整文本
    let fullTag = '';
    let endLine = i;
    let hasClose = false;
    for (let j = i; j < lines.length && j < i + 20; j++) {
      fullTag += lines[j] + '\n';
      endLine = j;
      if (lines[j].includes('</Button>')) {
        hasClose = true;
        break;
      }
      // 自闭合 <Button ... />
      if (j === i && lines[j].includes('/>')) {
        hasClose = true;
        break;
      }
    }
    if (!hasClose) continue;

    // 已经有 aria-label 则跳过
    if (/\baria-label\b/.test(fullTag)) continue;

    // 提取 > 和 </Button> 之间的内容
    const innerMatch = fullTag.match(/>([\s\S]*?)<\/Button>/);
    if (!innerMatch) continue;
    const inner = innerMatch[1].trim();

    // 如果内容为空，跳过（可能是不完整的标签）
    if (!inner) continue;

    // 判断是否是 icon-only：内容主要是图标组件
    // 匹配 <XxxIcon .../> 或已知的 lucide-react 图标 <Xxx size=.. />
    const iconPattern = /^<(?:[A-Z]\w*Icon|ExitToApp|RefreshCw|Add|Edit|Delete|Remove|Save|Cancel|Close|Search|Filter|Download|Upload|Visibility|VisibilityOff|ExpandMore|ExpandLess|ChevronRight|ChevronLeft|ChevronDown|ChevronUp|ArrowForward|ArrowBack|ArrowUp|ArrowDown|MoreVert|MoreHoriz|Settings|CloudUpload|CloudDownload|FileCopy|Print|Share|Check|Clear|FirstPage|LastPage|NavigateNext|NavigateBefore)\b[^>]*\/?>$/;

    if (iconPattern.test(inner)) {
      violations.push({
        file: path.relative(path.resolve(__dirname, '../..'), filePath),
        line: i + 1,
        endLine: endLine + 1,
        component: 'Button(icon-only)',
      });
    }
  }
  return violations;
}

// 主流程
function main() {
  const files = [...collectTsxFiles(PAGES_DIR), ...collectTsxFiles(COMPONENTS_DIR)];

  const allViolations = [];
  const fileSet = new Set();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [
      ...findIconButtonWithoutAriaLabel(content, filePath),
      ...findIconOnlyButtonWithoutAriaLabel(content, filePath),
    ];
    if (violations.length > 0) {
      allViolations.push(...violations);
      fileSet.add(filePath);
    }
  }

  const totalViolations = allViolations.length;
  const fileCount = fileSet.size;

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          totalViolations,
          fileCount,
          threshold,
          passed: totalViolations <= threshold,
          violations: allViolations,
        },
        null,
        2
      )
    );
  } else {
    // 文本报告
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  无障碍 aria-label 覆盖率检查');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  扫描文件数: ${files.length}`);
    console.log(`  未覆盖文件数: ${fileCount}`);
    console.log(`  未覆盖组件数: ${totalViolations}`);
    console.log(`  阈值: ${threshold}`);
    console.log(`  状态: ${totalViolations <= threshold ? '✅ 通过' : '❌ 未通过'}`);
    console.log('═══════════════════════════════════════════════════════════');

    if (allViolations.length > 0) {
      console.log('\n未覆盖清单 (top 30):');
      allViolations.slice(0, 30).forEach((v, idx) => {
        console.log(`  ${idx + 1}. [${v.component}] ${v.file}:${v.line}`);
      });
      if (allViolations.length > 30) {
        console.log(`  ... 还有 ${allViolations.length - 30} 条`);
      }
    }
  }

  if (strictMode && totalViolations > threshold) {
    process.exit(1);
  }
}

main();
