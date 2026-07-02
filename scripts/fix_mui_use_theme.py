#!/usr/bin/env python3
"""
自动修复 React + MUI 项目中在内联样式里使用字符串形式 MUI 主题变量的问题。
使用 useTheme() 方案 - 改进版，正确定位组件顶层。
"""

import os
import re
import sys
import argparse
from pathlib import Path


# MUI 主题变量映射
MUI_VAR_MAP = {
    'primary.main': 'primary.main',
    'primary.light': 'primary.light',
    'primary.dark': 'primary.dark',
    'primary.contrastText': 'primary.contrastText',
    'secondary.main': 'secondary.main',
    'secondary.light': 'secondary.light',
    'secondary.dark': 'secondary.dark',
    'secondary.contrastText': 'secondary.contrastText',
    'success.main': 'success.main',
    'success.light': 'success.light',
    'success.dark': 'success.dark',
    'success.contrastText': 'success.contrastText',
    'warning.main': 'warning.main',
    'warning.light': 'warning.light',
    'warning.dark': 'warning.dark',
    'warning.contrastText': 'warning.contrastText',
    'error.main': 'error.main',
    'error.light': 'error.light',
    'error.dark': 'error.dark',
    'error.contrastText': 'error.contrastText',
    'info.main': 'info.main',
    'info.light': 'info.light',
    'info.dark': 'info.dark',
    'info.contrastText': 'info.contrastText',
    'text.primary': 'text.primary',
    'text.secondary': 'text.secondary',
    'text.disabled': 'text.disabled',
    'background.default': 'background.default',
    'background.paper': 'background.paper',
    'divider': 'divider',
    'action.active': 'action.active',
    'action.hover': 'action.hover',
    'action.selected': 'action.selected',
    'action.disabled': 'action.disabled',
    'action.disabledBackground': 'action.disabledBackground',
    'action.focus': 'action.focus',
    'common.black': 'common.black',
    'common.white': 'common.white',
}

GREY_PATTERN = re.compile(r"(['\"])grey\.(\d{2,3})\1")


def has_mui_vars_in_style(content: str) -> bool:
    """检查内容中是否有需要修复的 MUI 主题变量"""
    lines = content.split('\n')
    in_style = False
    brace_depth = 0
    
    for line in lines:
        if 'style={' in line:
            in_style = True
            brace_depth = line.count('{') - line.count('}')
        elif in_style:
            brace_depth += line.count('{') - line.count('}')
            if brace_depth <= 0:
                in_style = False
        
        if in_style or 'style={' in line:
            for var_name in MUI_VAR_MAP:
                if f"'{var_name}'" in line or f'"{var_name}"' in line:
                    return True
            if GREY_PATTERN.search(line):
                return True
    
    return False


def fix_mui_vars_in_content(content: str) -> tuple[str, int]:
    """修复内容中所有在内联样式里的字符串形式 MUI 主题变量"""
    fix_count = 0
    lines = content.split('\n')
    in_style = False
    brace_depth = 0
    new_lines = []
    
    for line in lines:
        new_line = line
        
        if 'style={' in line:
            in_style = True
            brace_depth = line.count('{') - line.count('}')
        elif in_style:
            brace_depth += line.count('{') - line.count('}')
            if brace_depth <= 0:
                in_style = False
        
        if in_style or 'style={' in line:
            for var_name, palette_path in MUI_VAR_MAP.items():
                old_str1 = f"'{var_name}'"
                new_str1 = f'theme.palette.{palette_path}'
                if old_str1 in new_line:
                    new_line = new_line.replace(old_str1, new_str1)
                    fix_count += 1
                
                old_str2 = f'"{var_name}"'
                new_str2 = f'theme.palette.{palette_path}'
                if old_str2 in new_line:
                    new_line = new_line.replace(old_str2, new_str2)
                    fix_count += 1
            
            # 处理 grey.xxx
            def replace_grey(match):
                nonlocal fix_count
                quote = match.group(1)
                shade = match.group(2)
                fix_count += 1
                return f'theme.palette.grey[{shade}]'
            
            new_line = GREY_PATTERN.sub(replace_grey, new_line)
        
        new_lines.append(new_line)
    
    return '\n'.join(new_lines), fix_count


def find_insert_position(content: str) -> int | None:
    """
    找到插入 useTheme 的位置。
    策略：找到第一个 React Hook（useState, useEffect, useRef, useMemo, useCallback 等）的位置，
    在它之前插入 useTheme，因为 Hooks 必须在组件顶层。
    """
    lines = content.split('\n')
    
    # 常见的 React Hooks
    hook_patterns = [
        r'const\s+\[.*\]\s*=\s*useState\s*\(',
        r'const\s+\[.*\]\s*=\s*useReducer\s*\(',
        r'useEffect\s*\(',
        r'useRef\s*\(',
        r'useMemo\s*\(',
        r'useCallback\s*\(',
        r'useContext\s*\(',
        r'const\s+\w+\s*=\s*useTheme\s*\(',
        r'const\s+\w+\s*=\s*use[A-Z]',
    ]
    
    first_hook_line = None
    first_hook_indent = None
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # 跳过注释行
        if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
            continue
        
        for pattern in hook_patterns:
            if re.search(pattern, line):
                indent = len(line) - len(line.lstrip())
                # 只考虑缩进为 2 的（组件顶层）
                if indent >= 2:
                    first_hook_line = i
                    first_hook_indent = indent
                    break
        if first_hook_line is not None:
            break
    
    if first_hook_line is None:
        return None
    
    # 计算这一行的字符偏移
    char_offset = sum(len(l) + 1 for l in lines[:first_hook_line])
    
    return char_offset


def insert_theme_at_position(content: str, insert_pos: int, indent: int = 2) -> str:
    """在指定位置插入 const theme = useTheme();"""
    new_line = ' ' * indent + 'const theme = useTheme();\n'
    content = content[:insert_pos] + new_line + content[insert_pos:]
    return content


def add_use_theme_import(content: str) -> str:
    """添加 useTheme 导入"""
    # 先检查是否已经导入
    if re.search(r'import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*[\'"]@mui/material[\'"]', content):
        return content
    if re.search(r'import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*[\'"]@mui/material/styles[\'"]', content):
        return content
    
    # 查找 @mui/material 的导入
    mui_import = re.search(r'import\s*\{([^}]*)\}\s*from\s*[\'"]@mui/material[\'"]', content)
    if mui_import:
        imports = mui_import.group(1)
        new_imports = imports.strip() + ', useTheme'
        new_imports = re.sub(r',\s*,', ',', new_imports)
        content = content[:mui_import.start(1)] + new_imports + content[mui_import.end(1):]
        return content
    
    # 查找 @mui/material/styles 的导入
    mui_styles = re.search(r'import\s*\{([^}]*)\}\s*from\s*[\'"]@mui/material/styles[\'"]', content)
    if mui_styles:
        imports = mui_styles.group(1)
        new_imports = imports.strip() + ', useTheme'
        new_imports = re.sub(r',\s*,', ',', new_imports)
        content = content[:mui_styles.start(1)] + new_imports + content[mui_styles.end(1):]
        return content
    
    # 没有 MUI 导入，在第一个 import 后添加
    first_import = re.search(r'^import\s.*$', content, re.MULTILINE)
    if first_import:
        insert_pos = first_import.end()
        content = content[:insert_pos] + '\nimport { useTheme } from \'@mui/material\';' + content[insert_pos:]
    else:
        content = 'import { useTheme } from \'@mui/material\';\n' + content
    
    return content


def insert_theme_in_component(content: str, component_info: tuple[int, int, int]) -> str:
    """在组件函数体开头插入 const theme = useTheme();"""
    line_num, char_offset, indent = component_info
    
    # 检查这个位置之后是否已经有 theme = useTheme
    after_brace = content[char_offset:char_offset + 200]
    if re.search(r'const\s+\w+\s*=\s*useTheme\s*\(\s*\)', after_brace):
        return content
    
    # 插入位置：在 { 之后换行，加上缩进
    new_line = '\n' + ' ' * (indent + 2) + 'const theme = useTheme();'
    content = content[:char_offset] + new_line + content[char_offset:]
    
    return content


def process_file(file_path: Path, dry_run: bool = False) -> tuple[bool, int]:
    """处理单个文件"""
    try:
        content = file_path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, PermissionError):
        return False, 0
    
    # 先检查是否有需要修复的内容
    if not has_mui_vars_in_style(content):
        return False, 0
    
    # 修复变量
    new_content, fix_count = fix_mui_vars_in_content(content)
    
    if fix_count == 0:
        return False, 0
    
    # 添加 useTheme 导入
    new_content = add_use_theme_import(new_content)
    
    # 找到插入位置（第一个 Hook 之前）
    insert_pos = find_insert_position(new_content)
    
    if insert_pos is None:
        # 没有找到 Hook，尝试找组件函数体的开始
        # 这里简单处理：跳过该文件
        return False, 0
    
    # 检查是否已经有 useTheme
    if 'const theme = useTheme()' in new_content:
        # 已经有了，只需要替换变量
        pass
    else:
        # 在第一个 Hook 之前插入
        new_content = insert_theme_at_position(new_content, insert_pos, indent=2)
    
    if not dry_run:
        file_path.write_text(new_content, encoding='utf-8')
    
    return True, fix_count


def main():
    parser = argparse.ArgumentParser(description='修复内联样式中的 MUI 主题变量 (useTheme 方案)')
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
        
        parts = set(file_path.parts)
        if parts & skip_dirs:
            continue
        
        total_files += 1
        modified, fix_count = process_file(file_path, args.dry_run)
        if modified:
            rel_path = file_path.relative_to(source_dir)
            modified_files.append((str(rel_path), fix_count))
            total_fixes += fix_count
    
    print('=' * 80)
    print('MUI 内联样式主题变量修复报告 (useTheme 方案)')
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
    print('  2. 多组件文件可能需要手动添加 useTheme 到其他组件')
    print('  3. 非组件文件（如工具函数）可能需要手动处理')
    print('  4. 如果文件已有 useTheme 但变量名不同，可能需要调整')


if __name__ == '__main__':
    main()
