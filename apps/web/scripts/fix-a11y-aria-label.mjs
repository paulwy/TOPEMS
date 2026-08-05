#!/usr/bin/env node
// a11y aria-label 自动修复脚本（V65 阶段三）
//
// 策略（逐行处理，可靠处理多行 JSX）：
// A. IconButton 有 title 无 aria-label → 在 title 行前插入 aria-label=同表达式
// B. IconButton 无 title 无 aria-label → 从子图标组件名推断 aria-label

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');
const COMPONENTS_DIR = path.join(WEB_ROOT, 'components');

const ICON_LABEL_MAP = {
  Add: '新增', Create: '新增', AddCircle: '新增', Plus: '新增',
  Edit: '编辑', EditIcon: '编辑', Pencil: '编辑', Edit2: '编辑', Edit3: '编辑', PenTool: '编辑',
  Delete: '删除', DeleteIcon: '删除', Trash: '删除', Trash2: '删除', Remove: '删除',
  DeleteOutline: '删除', DeleteOutlineIcon: '删除',
  Save: '保存', SaveIcon: '保存',
  Cancel: '取消',
  Close: '关闭', CloseIcon: '关闭', Clear: '清除',
  X: '关闭', XIcon: '关闭', XCircle: '关闭',
  Check: '确认', CheckIcon: '确认', CheckCircle: '完成', CheckCheck: '全部确认',
  Copy: '复制', ContentCopy: '复制', FileCopy: '复制',
  Download: '下载', DownloadIcon: '下载',
  Upload: '上传', UploadIcon: '上传', CloudUpload: '上传',
  CloudDownload: '下载',
  Refresh: '刷新', RefreshCw: '刷新', RefreshIcon: '刷新', Replay: '刷新',
  RotateCcw: '重置', RotateCw: '旋转',
  Search: '搜索', SearchIcon: '搜索',
  Filter: '筛选', FilterIcon: '筛选',
  Settings: '设置', SettingsIcon: '设置',
  More: '更多', MoreVert: '更多', MoreHoriz: '更多', MoreHorizontal: '更多', MoreVertical: '更多',
  Visibility: '查看', VisibilityOff: '隐藏', View: '查看', Eye: '查看', EyeOff: '隐藏',
  ExpandMore: '展开', ExpandLess: '折叠', Expand: '展开',
  ChevronRight: '展开', ChevronLeft: '展开', ChevronDown: '展开', ChevronUp: '展开',
  ChevronsRight: '前进',
  Fullscreen: '全屏', FullscreenExit: '退出全屏',
  Maximize: '最大化', Minimize: '最小化', Minimize2: '最小化',
  ArrowBack: '返回', ArrowForward: '前进', ArrowUp: '向上', ArrowDown: '向下',
  ArrowLeft: '返回', ArrowRight: '前进',
  ArrowRightLeft: '交换', MoveVertical: '移动',
  NavigateNext: '下一个', NavigateBefore: '上一个',
  FirstPage: '第一页', LastPage: '最后一页',
  Print: '打印', PrintIcon: '打印',
  Share: '分享', ShareIcon: '分享',
  Power: '启用/禁用', PowerIcon: '启用/禁用',
  Play: '执行', PlayIcon: '执行', PlayCircle: '执行',
  Pause: '暂停', PauseIcon: '暂停',
  Stop: '停止', StopIcon: '停止',
  Info: '信息', InfoIcon: '信息',
  Warning: '警告', WarningIcon: '警告', AlertTriangle: '警告',
  Help: '帮助', HelpIcon: '帮助', HelpCircle: '帮助',
  Sort: '排序', SortIcon: '排序',
  Star: '收藏', StarIcon: '收藏', Favorite: '收藏', BookmarkCheck: '收藏',
  Menu: '菜单',
  Home: '首页',
  Logout: '退出', Login: '登录', ExitToApp: '退出',
  Notifications: '通知', Bell: '通知',
  Lock: '锁定', Unlock: '解锁',
  Drag: '拖拽',
  ZoomIn: '放大', ZoomOut: '缩小',
  Undo: '撤销', Redo: '重做',
  Reset: '重置',
  Send: '发送',
  Code: '代码', FileCode: '代码文件',
  Bug: '缺陷',
  Lightbulb: '提示',
  Zap: '优化',
  Sparkles: 'AI生成',
  Columns3: '配置列', Columns: '配置列',
  Barcode: '扫码',
  Camera: '拍照', Video: '视频',
  Image: '图片',
  List: '列表', Grid: '网格', Grid3X3: '网格',
  ToggleRight: '切换',
  Square: '选择',
  Circle: '状态',
  Flashlight: '手电筒',
  SwitchCamera: '切换相机',
  PanelLeftOpen: '展开侧栏',
  BookOpen: '打开文档',
  UserPlus: '添加用户', UserMinus: '移除用户',
  History: '历史', HistoryIcon: '历史', Archive: '归档',
  Reply: '回复',
  Minus: '减少',
  Crop: '裁剪',
  Palette: '调色板',
  MessageSquare: '消息',
  Phone: '电话',
  Mic: '麦克风',
  Sun: '切换主题',
  Badge: '徽章',
  Locate: '定位',
  Layers: '图层',
  Navigation: '导航',
};

function collectTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests'].includes(entry.name)) continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function inferLabelFromIcon(iconName) {
  if (ICON_LABEL_MAP[iconName]) return ICON_LABEL_MAP[iconName];
  if (iconName.endsWith('Icon')) {
    const base = iconName.slice(0, -4);
    if (ICON_LABEL_MAP[base]) return ICON_LABEL_MAP[base];
  }
  return null;
}

// 提取 title 属性的完整表达式（同行内）
// 返回 { indent, expr } 或 null
function extractTitleExpr(line) {
  // title={...} — 匹配到行尾（title 表达式通常不跨行）
  const bracedMatch = line.match(/^(\s*)title\s*=\s*(\{.*\})\s*$/);
  if (bracedMatch) return { indent: bracedMatch[1], expr: bracedMatch[2] };
  // title='...' 或 title="..."
  const quotedMatch = line.match(/^(\s*)title\s*=\s*(['"].*['"])\s*$/);
  if (quotedMatch) return { indent: quotedMatch[1], expr: quotedMatch[2] };
  return null;
}

// 从行中提取图标组件名 <IconName .../>
function extractIconName(line) {
  const match = line.match(/<([A-Z]\w*)\b/);
  return match ? match[1] : null;
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let fixCount = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 检测 <IconButton 开头
    if (/<IconButton\b/.test(line)) {
      // 收集完整 IconButton 开标签（从 <IconButton 到 > 闭合，可能跨多行）
      const blockStart = i;
      let blockEnd = i;
      let blockContent = line;

      while (blockEnd < lines.length) {
        const current = lines[blockEnd];
        if (blockEnd > blockStart && current.trim() === '>') break;
        if (blockEnd > blockStart && />\s*$/.test(current) && !/[('"]/.test(current.replace(/.*>/, ''))) break;
        if (blockEnd === blockStart && />\s*$/.test(current)) break;
        if (blockEnd > blockStart + 15) break;
        blockEnd++;
        if (blockEnd < lines.length) blockContent += '\n' + lines[blockEnd];
      }

      const hasAriaLabel = /\baria-label\b/.test(blockContent);
      let applied = false;

      if (!hasAriaLabel) {
        // 策略 A：检查是否有 title 属性，在 title 行前插入 aria-label
        for (let j = blockStart; j <= blockEnd && j < lines.length; j++) {
          const titleExpr = extractTitleExpr(lines[j]);
          if (titleExpr) {
            // 输出 blockStart 到 title 行之前
            for (let k = blockStart; k < j; k++) newLines.push(lines[k]);
            // 插入 aria-label
            newLines.push(`${titleExpr.indent}aria-label=${titleExpr.expr}`);
            // 输出 title 行到 blockEnd
            for (let k = j; k <= blockEnd && k < lines.length; k++) newLines.push(lines[k]);
            fixCount++;
            applied = true;
            break;
          }
        }

        // 策略 B：无 title，从子图标推断
        // 扫描 blockEnd+1 到 blockEnd+12 行，寻找第一个 <IconName 模式
        // （支持条件渲染 {cond ? <IconA/> : <IconB/>} 的情况）
        if (!applied) {
          let iconName = null;
          for (let j = blockEnd + 1; j < Math.min(blockEnd + 12, lines.length); j++) {
            const childLine = lines[j];
            if (/<\/IconButton>/.test(childLine)) break;
            const name = extractIconName(childLine);
            if (name) {
              iconName = name;
              break;
            }
          }
          if (iconName) {
            const label = inferLabelFromIcon(iconName);
            if (label) {
              const closingLine = lines[blockEnd];
              if (closingLine.trim() === '>') {
                // > 单独一行：输出 block 内容到 > 前，插入 aria-label，输出 >
                for (let k = blockStart; k < blockEnd; k++) newLines.push(lines[k]);
                const indent = closingLine.match(/^(\s*)/)[1];
                newLines.push(`${indent}aria-label="${label}"`);
                newLines.push(closingLine);
                fixCount++;
                applied = true;
              } else if (/>\s*$/.test(closingLine) && blockEnd === blockStart) {
                // 单行 <IconButton ...>：在 > 前插入
                newLines.push(closingLine.replace(/>$/, `aria-label="${label}" >`));
                fixCount++;
                applied = true;
              } else {
                // > 在多行 block 的最后一行行尾
                for (let k = blockStart; k < blockEnd; k++) newLines.push(lines[k]);
                newLines.push(closingLine.replace(/>$/, `aria-label="${label}"\n>`));
                fixCount++;
                applied = true;
              }
            }
          }
        }
      }

      if (!applied) {
        // 无修复，输出原始 block
        for (let k = blockStart; k <= blockEnd && k < lines.length; k++) newLines.push(lines[k]);
      }

      i = blockEnd + 1;
      continue;
    }

    newLines.push(line);
    i++;
  }

  if (fixCount > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'));
  }
  return fixCount;
}

function main() {
  const files = [...collectTsxFiles(PAGES_DIR), ...collectTsxFiles(COMPONENTS_DIR)];
  let totalFixed = 0;
  let fileCount = 0;

  for (const filePath of files) {
    const fixed = fixFile(filePath);
    if (fixed > 0) {
      totalFixed += fixed;
      fileCount++;
      console.log(`  ✅ ${path.relative(path.resolve(__dirname, '..'), filePath)}: ${fixed} 处`);
    }
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`  修复完成: ${fileCount} 个文件, ${totalFixed} 处 aria-label`);
  console.log(`═══════════════════════════════════`);
}

main();
