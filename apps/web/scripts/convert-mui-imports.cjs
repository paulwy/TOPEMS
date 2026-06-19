#!/usr/bin/env node

/**
 * MUI v7 升级脚本：将深度导入转换为顶级导入
 * 
 * Before: import Button from "@mui/material/Button";
 * After:  import { Button } from "@mui/material";
 */

const fs = require('fs');
const path = require('path');

// MUI Material 组件列表
const MUI_COMPONENTS = [
  'Accordion', 'AccordionActions', 'AccordionDetails', 'AccordionSummary',
  'Alert', 'AlertTitle', 'AppBar', 'Autocomplete', 'Avatar', 'AvatarGroup',
  'Backdrop', 'Badge', 'BottomNavigation', 'BottomNavigationAction',
  'Box', 'Breadcrumbs', 'Button', 'ButtonBase', 'ButtonGroup',
  'Card', 'CardActionArea', 'CardActions', 'CardContent', 'CardHeader', 'CardMedia',
  'Checkbox', 'Chip', 'CircularProgress', 'Collapse', 'Container',
  'CssBaseline', 'Dialog', 'DialogActions', 'DialogContent', 'DialogContentText',
  'DialogTitle', 'Divider', 'Drawer', 'Fab', 'Fade', 'FilledInput',
  'FormControl', 'FormControlLabel', 'FormGroup', 'FormHelperText', 'FormLabel',
  'Grid', 'Grid2', 'GridLegacy', 'Grow', 'Hidden', 'Icon', 'IconButton',
  'ImageList', 'ImageListItem', 'ImageListItemBar', 'Input', 'InputAdornment',
  'InputBase', 'InputLabel', 'LinearProgress', 'Link', 'List', 'ListItem',
  'ListItemAvatar', 'ListItemButton', 'ListItemIcon', 'ListItemSecondaryAction',
  'ListItemText', 'ListSubheader', 'Menu', 'MenuItem', 'MenuList',
  'MobileStepper', 'Modal', 'NativeSelect', 'NoSsr', 'OutlinedInput',
  'Pagination', 'PaginationItem', 'Paper', 'Popover', 'Popper',
  'Portal', 'Radio', 'RadioGroup', 'Rating', 'ScopedCssBaseline',
  'Select', 'Skeleton', 'Slide', 'Slider', 'Snackbar', 'SnackbarContent',
  'SpeedDial', 'SpeedDialAction', 'SpeedDialIcon', 'Stack', 'Step',
  'StepButton', 'StepConnector', 'StepContent', 'StepIcon', 'StepLabel',
  'Stepper', 'SvgIcon', 'SwipeableDrawer', 'Switch', 'Tab', 'TabContext',
  'TabList', 'TabPanel', 'TabScrollButton', 'Tabs', 'TextField', 'TextareaAutosize',
  'ThemeProvider', 'ToggleButton', 'ToggleButtonGroup', 'Toolbar', 'Tooltip',
  'Typography', 'Unstable_Grid2', 'Zoom',
  // 类型
  'AccordionProps', 'AlertProps', 'AppBarProps', 'AvatarProps', 'BadgeProps',
  'BoxProps', 'ButtonProps', 'CardProps', 'ChipProps', 'DialogProps',
  'FormControlProps', 'IconButtonProps', 'MenuProps', 'MenuItemProps',
  'SelectProps', 'TextFieldProps', 'Theme', 'ThemeOptions', 'PaletteMode',
];

// 递归获取所有 TypeScript/TSX 文件
function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
        getAllTsFiles(fullPath, files);
      }
    } else if (/\.(tsx?|jsx?)$/.test(item)) {
      files.push(fullPath);
    }
  }
  return files;
}

// 转换单个文件
function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 收集所有需要转换的导入
  const imports = new Map(); // componentName -> isTypeImport
  
  // 匹配深度导入模式
  // import Button from "@mui/material/Button";
  // import type { ButtonProps } from "@mui/material/Button";
  const deepImportRegex = /import\s+(type\s+)?(\w+)\s+from\s+["']@mui\/material\/(\w+)["'];?/g;
  
  content = content.replace(deepImportRegex, (match, isType, importedName, componentPath) => {
    if (importedName === componentPath) {
      imports.set(importedName, !!isType);
      modified = true;
      return ''; // 移除这行，稍后合并
    }
    return match;
  });
  
  if (!modified) return false;
  
  // 检查是否已有顶级导入
  const existingImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+["']@mui\/material["'];?/);
  
  if (existingImportMatch) {
    // 合并到现有导入
    const existingImports = existingImportMatch[1].split(',').map(s => s.trim());
    for (const [name, isType] of imports) {
      if (!existingImports.includes(name)) {
        existingImports.push(isType ? `type ${name}` : name);
      }
    }
    const newImport = `import { ${existingImports.join(', ')} } from "@mui/material";`;
    content = content.replace(existingImportMatch[0], newImport);
  } else {
    // 创建新的顶级导入
    const importItems = [];
    for (const [name, isType] of imports) {
      importItems.push(isType ? `type ${name}` : name);
    }
    const newImport = `import { ${importItems.join(', ')} } from "@mui/material";\n`;
    
    // 在文件开头插入
    const firstImportMatch = content.match(/^import\s+/m);
    if (firstImportMatch) {
      const insertPos = content.indexOf(firstImportMatch[0]);
      content = content.slice(0, insertPos) + newImport + content.slice(insertPos);
    } else {
      content = newImport + content;
    }
  }
  
  // 清理多余空行
  content = content.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

// 主函数
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  console.log('扫描目录:', srcDir);
  
  const files = getAllTsFiles(srcDir);
  console.log(`找到 ${files.length} 个文件`);
  
  let convertedCount = 0;
  for (const file of files) {
    try {
      if (convertFile(file)) {
        console.log('已转换:', path.relative(srcDir, file));
        convertedCount++;
      }
    } catch (err) {
      console.error('转换失败:', file, err.message);
    }
  }
  
  console.log(`\n完成！共转换 ${convertedCount} 个文件`);
}

main();
