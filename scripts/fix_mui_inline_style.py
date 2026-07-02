#!/usr/bin/env python3
"""
自动修复 React + MUI 项目中在内联样式里使用字符串形式 MUI 主题变量的问题。
将 'primary.main' 等字符串替换为 theme.palette.primary.main，并自动添加 useTheme。

使用方式:
  python3 fix_mui_inline_style.py <source_dir> [--dry-run]
"""

import os
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict


# MUI 主题变量映射: 变量名 -> palette 路径
MUI_VAR_MAP = {
    # Primary
    'primary.main': 'primary.main',
    'primary.light': 'primary.light',
    'primary.dark': 'primary.dark',
    'primary.contrastText': 'primary.contrastText',
    # Secondary
    'secondary.main': 'secondary.main',
    'secondary.light': 'secondary.light',
    'secondary.dark': 'secondary.dark',
    'secondary.contrastText': 'secondary.contrastText',
    # Success
    'success.main': 'success.main',
    'success.light': 'success.light',
    'success.dark': 'success.dark',
    'success.contrastText': 'success.contrastText',
    # Warning
    'warning.main': 'warning.main',
    'warning.light': 'warning.light',
    'warning.dark': 'warning.dark',
    'warning.contrastText': 'warning.contrastText',
    # Error
    'error.main': 'error.main',
    'error.light': 'error.light',
    'error.dark': 'error.dark',
    'error.contrastText': 'error.contrastText',
    # Info
    'info.main': 'info.main',
    'info.light': 'info.light',
    'info.dark': 'info.dark',
    'info.contrastText': 'info.contrastText',
    # Text
    'text.primary': 'text.primary',
    'text.secondary': 'text.secondary',
    'text.disabled': 'text.disabled',
    # Background
    'background.default': 'background.default',
    'background.paper': 'background.paper',
    # Divider
    'divider': 'divider',
    # Action
    'action.active': 'action.active',
    'action.hover': 'action.hover',
    'action.selected': 'action.selected',
    'action.disabled': 'action.disabled',
    'action.disabledBackground': 'action.disabledBackground',
    'action.focus': 'action.focus',
    # Common
    'common.black': 'common.black',
    'common.white': 'common.white',
}

# Grey 颜色特殊处理
GREY_PATTERN = re.compile(r'\bgrey\.(\d{2,3})\b')


def find_mui_vars_in_style(content: str) -> list[tuple[int, str, str]]:
    """
    查找内容中所有在内联样式里的字符串形式 MUI 主题变量。
    返回: [(行号, 匹配的完整字符串, 变量名)]
    """
    results = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        # 查找 style={{ 或 style={ 之后的字符串形式的 MUI 变量
        # 匹配 'primary.main' 或 "primary.main" 或 'text.secondary' 等
        
        # 先找 style= 位置
        style_match = re.search(r'style\s*=\s*\{', line)
        if not style_match:
            continue
        
        style_start = style_match.start()
        style_part = line[style_start:]
        
        # 在 style 部分查找字符串形式的 MUI 变量
        # 匹配单引号或双引号包裹的变量
        for var_name in MUI_VAR_MAP:
            # 单引号形式
            pattern1 = re.compile(r"['\"]" + re.escape(var_name) + r"['\"]")
            for m in pattern1.finditer(style_part):
                results.append((i, m.group(0), var_name))
        
        # 匹配 grey.xxx 形式
        for m in GREY_PATTERN.finditer(style_part):
            # 确认是在字符串中
            idx = m.start()
            # 简单检查前后是否有引号
            before = style_part[max(0, idx-1):idx]
            after = style_part[idx+len(m.group(0)):idx+len(m.group(0))+1]
            if before in ("'", '"') and after in ("'", '"'):
                results.append((i, before + m.group(0) + after, f'grey.{m.group(1)}'))
    
    return results


def has_use_theme_import(content: str) -> bool:
    """检查是否已导入 useTheme"""
    return bool(re.search(r'import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*[\'"]@mui/material[\'"]', content)) or \
           bool(re.search(r'import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*[\'"]@mui/material/styles[\'"]', content))


def add_use_theme_import(content: str) -> str:
    """添加 useTheme 导入"""
    # 查找 @mui/material 的导入
    mui_import = re.search(r'import\s*\{([^}]*)\}\s*from\s*[\'"]@mui/material[\'"]', content)
    if mui_import:
        # 在现有导入中添加
        imports = mui_import.group(1)
        if 'useTheme' not in imports:
            new_imports = imports.strip() + ', useTheme'
            new_imports = re.sub(r',\s*,', ',', new_imports)  # 移除重复逗号
            content = content[:mui_import.start(1)] + new_imports + content[mui_import.end(1):]
            return content
    
    # 查找 @mui/material/styles 的导入
    mui_styles_import = re.search(r'import\s*\{([^}]*)\}\s*from\s*[\'"]@mui/material/styles[\'"]', content)
    if mui_styles_import:
        imports = mui_styles_import.group(1)
        if 'useTheme' not in imports:
            new_imports = imports.strip() + ', useTheme'
            new_imports = re.sub(r',\s*,', ',', new_imports)
            content = content[:mui_styles_import.start(1)] + new_imports + content[mui_styles_import.end(1):]
            return content
    
    # 没有找到 MUI 导入，在文件开头添加
    # 找到第一个 import 语句之后添加
    first_import = re.search(r'^import\s.*$', content, re.MULTILINE)
    if first_import:
        insert_pos = first_import.end()
        content = content[:insert_pos] + '\nimport { useTheme } from \'@mui/material\';' + content[insert_pos:]
    else:
        content = 'import { useTheme } from \'@mui/material\';\n' + content
    
    return content


def add_theme_variable(content: str) -> str:
    """
    在组件中添加 const theme = useTheme();
    找到第一个函数组件定义，在函数体开头添加。
    """
    # 检查是否已经有 theme 变量
    if re.search(r'const\s+theme\s*=\s*useTheme\s*\(\s*\)', content):
        return content
    
    # 查找函数组件定义
    # 模式1: function ComponentName(...) {
    func_pattern = re.compile(r'function\s+\w+\s*\([^)]*\)\s*\{', re.MULTILINE)
    func_match = func_pattern.search(content)
    
    if func_match:
        brace_pos = func_match.end() - 1  # { 的位置
        # 在 { 之后添加 theme 变量
        content = content[:brace_pos+1] + '\n  const theme = useTheme();' + content[brace_pos+1:]
        return content
    
    # 模式2: const ComponentName = (...) => {
    arrow_pattern = re.compile(r'const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{', re.MULTILINE)
    arrow_match = arrow_pattern.search(content)
    
    if arrow_match:
        brace_pos = arrow_match.end() - 1
        content = content[:brace_pos+1] + '\n  const theme = useTheme();' + content[brace_pos+1:]
        return content
    
    # 模式3: export default function(...) { 或 export function ...
    export_func_pattern = re.compile(r'export\s+(default\s+)?function\s+\w*\s*\([^)]*\)\s*\{', re.MULTILINE)
    export_match = export_func_pattern.search(content)
    
    if export_match:
        brace_pos = export_match.end() - 1
        content = content[:brace_pos+1] + '\n  const theme = useTheme();' + content[brace_pos+1:]
        return content
    
    return content


def fix_mui_vars_in_style(content: str) -> tuple[str, int]:
    """
    修复内容中所有在内联样式里的字符串形式 MUI 主题变量。
    返回: (修复后的内容, 修复数量)
    """
    fix_count = 0
    
    # 构建替换正则
    # 匹配 style= 之后的字符串形式变量
    # 由于内联样式可能跨越多行，这里采用逐行 + 上下文的方式
    
    lines = content.split('\n')
    in_style_block = False
    brace_depth = 0
    new_lines = []
    
    for line in lines:
        new_line = line
        
        # 检测 style={{ 开始
        if 'style={' in line:
            in_style_block = True
            brace_depth = line.count('{') - line.count('}')
        elif in_style_block:
            brace_depth += line.count('{') - line.count('}')
            if brace_depth <= 0:
                in_style_block = False
        
        if in_style_block or 'style={' in line:
            # 在 style 块中替换字符串形式的 MUI 变量
            for var_name, palette_path in MUI_VAR_MAP.items():
                # 单引号形式
                old_str1 = f"'{var_name}'"
                new_str1 = f'theme.palette.{palette_path}'
                if old_str1 in new_line:
                    # 确认是在 style 上下文中（简单判断：前面有 color: / backgroundColor: 等）
                    # 或者用更宽松的方式：只要在 style 块中就替换
                    new_line = new_line.replace(old_str1, new_str1)
                    fix_count += 1
                
                # 双引号形式
                old_str2 = f'"{var_name}"'
                new_str2 = f'theme.palette.{palette_path}'
                if old_str2 in new_line:
                    new_line = new_line.replace(old_str2, new_str2)
                    fix_count += 1
            
            # 处理 grey.xxx
            def replace_grey(match):
                nonlocal fix_count
                shade = match.group(1)
                fix_count += 1
                return f'theme.palette.grey[{shade}]'
            
            # 单引号 grey
            new_line = re.sub(r"'grey\.(\d{2,3})'", replace_grey, new_line)
            # 双引号 grey
            new_line = re.sub(r'"grey\.(\d{2,3})"', replace_grey, new_line)
        
        new_lines.append(new_line)
    
    return '\n'.join(new_lines), fix_count


def process_file(file_path: Path, dry_run: bool = False) -> tuple[bool, int]:
    """
    处理单个文件。
    返回: (是否修改, 修复数量)
    """
    try:
        content = file_path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, PermissionError):
        return False, 0
    
    # 先检查是否有需要修复的内容
    issues = find_mui_vars_in_style(content)
    if not issues:
        return False, 0
    
    # 修复变量
    new_content, fix_count = fix_mui_vars_in_style(content)
    
    if fix_count == 0:
        return False, 0
    
    # 添加 useTheme 导入
    if not has_use_theme_import(new_content):
        new_content = add_use_theme_import(new_content)
    
    # 添加 theme 变量
    new_content = add_theme_variable(new_content)
    
    if not dry_run:
        file_path.write_text(new_content, encoding='utf-8')
    
    return True, fix_count


def main():
    parser = argparse.ArgumentParser(description='修复内联样式中的 MUI 主题变量')
    parser.add_argument('source_dir', nargs='?', default='apps/web/src', help='源文件目录')
    parser.add_argument('--dry-run', action='store_true', help='仅预览，不实际修改')
    parser.add_argument('--extensions', nargs='+', default=['.tsx', '.ts', '.jsx', '.js'], help='文件扩展名')
    args = parser.parse_args()
    
    source_dir = Path(args.source_dir).resolve()
    if not source_dir.exists():
        print(f'错误: 目录不存在: {source_dir}')
        sys.exit(1)
    
    print(f'开始扫描: {source_dir}')
    if args.dry_run:
        print('(预览模式，不实际修改文件)')
    print()
    
    total_files = 0
    total_fixes = 0
    modified_files = []
    
    skip_dirs = {'node_modules', 'dist', 'build', '.next', '.vite', 'coverage', '__tests__', 'test'}
    
    for file_path in source_dir.rglob('*'):
        if not file_path.is_file():
            continue
        if file_path.suffix not in args.extensions:
            continue
        
        # 跳过特定目录
        parts = set(file_path.parts)
        if parts & skip_dirs:
            continue
        
        total_files += 1
        modified, fix_count = process_file(file_path, args.dry_run)
        if modified:
            rel_path = file_path.relative_to(source_dir)
            modified_files.append((rel_path, fix_count))
            total_fixes += fix_count
    
    # 输出报告
    print('=' * 80)
    print('MUI 内联样式主题变量修复报告')
    print('=' * 80)
    print(f'扫描文件数: {total_files}')
    print(f'修改文件数: {len(modified_files)}')
    print(f'修复问题数: {total_fixes}')
    print('=' * 80)
    print()
    
    for rel_path, fix_count in sorted(modified_files):
        print(f'  {rel_path}  ({fix_count} 处)')
    
    print()
    if args.dry_run:
        print('(预览模式，未实际修改文件。去掉 --dry-run 参数执行修复)')
    else:
        print('修复完成！')
    
    print()
    print('注意事项:')
    print('  1. 请检查修复后的代码是否正确')
    print('  2. 确保组件是函数组件且在 React 组件顶层调用 useTheme()')
    print('  3. 对于非组件文件或多组件文件，可能需要手动调整')


if __name__ == '__main__':
    main()
