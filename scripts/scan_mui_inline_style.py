#!/usr/bin/env python3
"""
扫描 React + MUI 项目中在内联样式 (style={{...}}) 里使用 MUI 主题变量的地方。
MUI 主题变量在内联样式中无法被解析，会导致样式失效。
"""

import os
import re
import sys
from pathlib import Path
from collections import defaultdict


MUI_THEME_PATTERNS = [
    # Palette colors
    r'\bprimary\.(main|light|dark|contrastText)\b',
    r'\bsecondary\.(main|light|dark|contrastText)\b',
    r'\bsuccess\.(main|light|dark|contrastText)\b',
    r'\bwarning\.(main|light|dark|contrastText)\b',
    r'\berror\.(main|light|dark|contrastText)\b',
    r'\binfo\.(main|light|dark|contrastText)\b',
    # Text
    r'\btext\.(primary|secondary|disabled)\b',
    # Background
    r'\bbackground\.(default|paper)\b',
    # Grey
    r'\bgrey\.\d{2,3}\b',
    # Divider
    r'\bdivider\b',
    # Action
    r'\baction\.(active|hover|selected|disabled|disabledBackground|focus)\b',
    # Common
    r'\bcommon\.(black|white)\b',
]

MUI_THEME_REGEX = re.compile('|'.join(MUI_THEME_PATTERNS))

INLINE_STYLE_PATTERNS = [
    # style={{ key: 'value' }} 形式 - 单引号或双引号
    r'style\s*=\s*\{[^{}]*?[\'"]\s*\w+\.[\w.]+\s*[\'"]',
    # style={{ key: value }} 形式 - 无引号 (如 color: primary.main)
    r'style\s*=\s*\{[^{}]*?\b(primary|secondary|success|warning|error|info|text|background|grey|divider|action|common)\.[\w.]+\b',
    # background: 'linear-gradient(..., primary.main, ...)'
    r'(?:background|backgroundImage|borderColor|color|fill|stroke)\s*:\s*[\'\"][^\'\"]*?\b(primary|secondary|success|warning|error|info|text|background|grey|divider|action|common)\.[\w.]+\b',
]


def find_inline_style_mui_vars(file_path: Path) -> list[tuple[int, str, str]]:
    """
    扫描文件中在内联样式里使用 MUI 主题变量的地方。
    返回: [(行号, 匹配的代码片段, 主题变量名)]
    """
    results = []
    
    try:
        content = file_path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, PermissionError):
        return results
    
    lines = content.split('\n')
    
    # 策略1: 逐行扫描 style={{ ... }} 块中的 MUI 主题变量
    # 先找 style= 起始位置，然后追踪匹配的大括号
    
    for i, line in enumerate(lines, 1):
        # 简单的行内检测：在行内查找 style= 后跟的 MUI 变量
        # 检测 style={{ ... }} 形式中的主题变量
        style_match = re.search(r'style\s*=\s*\{', line)
        if style_match:
            # 在这一行中查找 MUI 主题变量（在字符串中或直接作为值）
            # 匹配 'primary.main' 或 "primary.main" 或 primary.main
            for var_match in MUI_THEME_REGEX.finditer(line):
                var_name = var_match.group(0)
                # 确认这个变量在 style= 之后的区域
                if var_match.start() > style_match.start():
                    # 提取上下文
                    start = max(0, var_match.start() - 30)
                    end = min(len(line), var_match.end() + 30)
                    context = line[start:end].strip()
                    results.append((i, context, var_name))
        
        # 策略2: 检测 style 属性值中直接包含的主题变量（无 style= 前缀但在 style 对象内）
        # 这种更复杂，暂时先做简单的行内检测
    
    return results


def scan_directory(root_dir: Path, extensions: list[str] = None) -> dict[str, list[tuple[int, str, str]]]:
    """
    递归扫描目录中的所有目标文件。
    """
    if extensions is None:
        extensions = ['.tsx', '.ts', '.jsx', '.js']
    
    findings = defaultdict(list)
    
    for file_path in root_dir.rglob('*'):
        if not file_path.is_file():
            continue
        if file_path.suffix not in extensions:
            continue
        # 跳过 node_modules、dist、build 等目录
        parts = set(file_path.parts)
        skip_dirs = {'node_modules', 'dist', 'build', '.next', '.vite', 'coverage', '__tests__', 'test'}
        if parts & skip_dirs:
            continue
        
        file_findings = find_inline_style_mui_vars(file_path)
        if file_findings:
            findings[str(file_path)] = file_findings
    
    return findings


def print_report(findings: dict[str, list[tuple[int, str, str]]], root_dir: Path):
    """
    打印扫描报告。
    """
    total_files = len(findings)
    total_issues = sum(len(v) for v in findings.values())
    
    print("=" * 80)
    print("MUI 主题变量内联样式使用扫描报告")
    print("=" * 80)
    print(f"扫描目录: {root_dir}")
    print(f"问题文件数: {total_files}")
    print(f"问题总数: {total_issues}")
    print("=" * 80)
    print()
    
    # 按文件分组显示
    for file_path in sorted(findings.keys()):
        issues = findings[file_path]
        rel_path = os.path.relpath(file_path, root_dir)
        
        print(f"\n📄 {rel_path}  ({len(issues)} 处)")
        print("-" * 80)
        
        for line_num, context, var_name in issues:
            print(f"  行 {line_num:4d} | {var_name:25s} | ...{context}...")
    
    print()
    print("=" * 80)
    print("说明:")
    print("  这些 MUI 主题变量用在内联样式 (style={{...}}) 中时不会被解析，")
    print("  会导致样式失效。应该使用以下方式之一：")
    print("  1. 使用 sx 属性替代内联样式（MUI 组件）")
    print("  2. 使用 theme.palette.xxx 通过 useTheme() 获取实际颜色值")
    print("  3. 直接使用实际的十六进制颜色值")
    print("=" * 80)
    
    return total_issues


def main():
    if len(sys.argv) > 1:
        root_dir = Path(sys.argv[1]).resolve()
    else:
        # 默认扫描 apps/web/src
        script_dir = Path(__file__).resolve().parent
        root_dir = script_dir / 'apps' / 'web' / 'src'
        if not root_dir.exists():
            root_dir = Path.cwd()
    
    if not root_dir.exists():
        print(f"错误: 目录不存在: {root_dir}")
        sys.exit(1)
    
    print(f"开始扫描: {root_dir}")
    print()
    
    findings = scan_directory(root_dir)
    total_issues = print_report(findings, root_dir)
    
    sys.exit(0 if total_issues == 0 else 1)


if __name__ == '__main__':
    main()
