#!/usr/bin/env python3
"""
TOPEMS 代码库 TODO/FIXME 扫描脚本

功能：
- 递归扫描指定目录
- 识别 TODO、FIXME、HACK、XXX、NOTE 标记
- 按优先级分类（FIXME > HACK > TODO > XXX > NOTE）
- 按文件类型统计
- 支持排除目录
- 输出格式：终端表格 + Markdown 报告
- 支持 --output 参数指定输出文件
- 支持 --summary 仅显示统计概览
"""

import os
import re
import sys
import argparse
from datetime import datetime
from collections import defaultdict
from pathlib import Path

TAG_PATTERNS = {
    'FIXME': re.compile(r'\bFIXME\b', re.IGNORECASE),
    'HACK': re.compile(r'\bHACK\b', re.IGNORECASE),
    'TODO': re.compile(r'\bTODO\b', re.IGNORECASE),
    'XXX': re.compile(r'\bXXX\b', re.IGNORECASE),
    'NOTE': re.compile(r'\bNOTE\b', re.IGNORECASE),
}

TAG_PRIORITY = {
    'FIXME': 1,
    'HACK': 2,
    'TODO': 3,
    'XXX': 4,
    'NOTE': 5,
}

DEFAULT_SCAN_DIRS = [
    'apps/web/src',
    'apps/core/src',
    'apps/crm/src',
    'apps/desktop/src',
    'apps/finance/src',
    'apps/hrm/src',
    'apps/mes/src',
    'apps/mobile/src',
    'apps/pm/src',
    'apps/scm/src',
    'svc',
    'lib/src',
]

DEFAULT_EXCLUDE_DIRS = [
    'node_modules',
    'target',
    'dist',
    'build',
    '.venv',
    'venv',
    '__pycache__',
    '.git',
    '.yarn',
    '.next',
    '.cache',
]

TARGET_EXTENSIONS = {'.rs', '.ts', '.tsx', '.py', '.js', '.jsx', '.css', '.scss', '.html', '.sh', '.bash', '.toml', '.yaml', '.yml', '.json'}

LINE_TAG_REGEX = re.compile(
    r'(?://|#|\*|<!--)\s*(?:@)?(FIXME|HACK|TODO|XXX|NOTE)\s*[:\-\(\[]?\s*(.*?)(?:\*\*/|-->)??$',
    re.IGNORECASE
)

INLINE_TAG_REGEX = re.compile(
    r'(?://|#|/\*)\s*(?:@)?(FIXME|HACK|TODO|XXX|NOTE)\s*[:\-\(\[]?\s*(.*?)(?:\*/)?$',
    re.IGNORECASE
)


def find_todos_in_line(line: str):
    """
    在单行中查找 TODO 标记
    返回 (tag_type, content) 或 None
    """
    match = LINE_TAG_REGEX.search(line)
    if match:
        return match.group(1).upper(), match.group(2).strip()
    match = INLINE_TAG_REGEX.search(line)
    if match:
        return match.group(1).upper(), match.group(2).strip()
    return None


def is_excluded_dir(dirpath: str, exclude_dirs: list) -> bool:
    """检查目录是否应该被排除"""
    dirname = os.path.basename(dirpath)
    return dirname in exclude_dirs


def scan_file(filepath: str) -> list:
    """
    扫描单个文件，查找所有 TODO/FIXME 等标记
    返回列表：[{file, line, tag, content}]
    """
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                line = line.rstrip()
                todo = find_todos_in_line(line)
                if todo:
                    tag, content = todo
                    results.append({
                        'file': filepath,
                        'line': line_num,
                        'tag': tag,
                        'content': content,
                    })
    except (IOError, OSError, PermissionError):
        pass
    return results


def scan_directory(root_dir: str, exclude_dirs: list, target_extensions: set = None) -> list:
    """
    递归扫描目录，查找所有包含 TODO 标记的文件
    """
    all_results = []
    
    if target_extensions is None:
        target_extensions = TARGET_EXTENSIONS
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if not is_excluded_dir(os.path.join(dirpath, d), exclude_dirs)]
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        
        for filename in filenames:
            _, ext = os.path.splitext(filename)
            if target_extensions and ext.lower() not in target_extensions:
                continue
            
            filepath = os.path.join(dirpath, filename)
            results = scan_file(filepath)
            all_results.extend(results)
    
    return all_results


def get_file_extension(filepath: str) -> str:
    """获取文件扩展名"""
    _, ext = os.path.splitext(filepath)
    return ext.lower() if ext else 'unknown'


def summarize_by_tag(results: list) -> dict:
    """按标签类型统计"""
    stats = defaultdict(int)
    for r in results:
        stats[r['tag']] += 1
    return dict(stats)


def summarize_by_file_type(results: list) -> dict:
    """按文件类型统计"""
    stats = defaultdict(int)
    for r in results:
        ext = get_file_extension(r['file'])
        stats[ext] += 1
    return dict(stats)


def summarize_by_file(results: list) -> dict:
    """按文件统计"""
    stats = defaultdict(int)
    for r in results:
        stats[r['file']] += 1
    return dict(stats)


def format_table(headers: list, rows: list, col_widths: list = None) -> str:
    """格式化表格输出"""
    if not rows:
        return "（无数据）"
    
    if col_widths is None:
        col_widths = [len(str(h)) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                col_widths[i] = max(col_widths[i], len(str(cell)))
    
    def format_row(cells):
        return " | ".join(str(c).ljust(col_widths[i]) for i, c in enumerate(cells))
    
    separator = "-+-".join("-" * w for w in col_widths)
    
    lines = [
        format_row(headers),
        separator,
    ]
    for row in rows:
        lines.append(format_row(row))
    
    return "\n".join(lines)


def print_terminal_report(results: list, summary_only: bool = False):
    """在终端打印报告"""
    if not results:
        print("未找到任何 TODO/FIXME 标记。")
        return
    
    by_tag = summarize_by_tag(results)
    by_file_type = summarize_by_file_type(results)
    by_file = summarize_by_file(results)
    
    print("\n" + "=" * 80)
    print("TOPEMS 代码库 TODO/FIXME 扫描报告")
    print(f"扫描时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"总标记数: {len(results)}")
    print("=" * 80)
    
    print("\n【按优先级统计】")
    sorted_tags = sorted(by_tag.items(), key=lambda x: TAG_PRIORITY.get(x[0], 99))
    tag_rows = [(tag, count, f"{count / len(results) * 100:.1f}%") for tag, count in sorted_tags]
    print(format_table(["标签类型", "数量", "占比"], tag_rows))
    
    print("\n【按文件类型统计】")
    sorted_ext = sorted(by_file_type.items(), key=lambda x: -x[1])
    ext_rows = [(ext, count, f"{count / len(results) * 100:.1f}%") for ext, count in sorted_ext]
    print(format_table(["文件类型", "数量", "占比"], ext_rows))
    
    print(f"\n【涉及文件数】{len(by_file)} 个")
    
    top_files = sorted(by_file.items(), key=lambda x: -x[1])[:15]
    print(f"\n【Top 15 文件（标记最多）】")
    file_rows = [(os.path.basename(f), count, f) for f, count in top_files]
    print(format_table(["文件名", "标记数", "路径"], file_rows))
    
    if not summary_only:
        print("\n【详细列表（按优先级排序）】")
        sorted_results = sorted(
            results,
            key=lambda x: (TAG_PRIORITY.get(x['tag'], 99), x['file'], x['line'])
        )
        
        current_tag = None
        for r in sorted_results:
            if r['tag'] != current_tag:
                current_tag = r['tag']
                print(f"\n--- {current_tag} ---")
            
            relative_path = os.path.relpath(r['file'], os.getcwd())
            content_preview = r['content'][:100] if r['content'] else "(无内容)"
            print(f"  {relative_path}:{r['line']}  {content_preview}")
    
    print("\n" + "=" * 80)


def generate_markdown_report(results: list, scan_dirs: list, exclude_dirs: list) -> str:
    """生成 Markdown 格式的报告"""
    by_tag = summarize_by_tag(results)
    by_file_type = summarize_by_file_type(results)
    by_file = summarize_by_file(results)
    
    lines = []
    
    lines.append("# TOPEMS 代码库 TODO/FIXME 扫描报告")
    lines.append("")
    lines.append(f"> 扫描时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"> 扫描目录: {', '.join(scan_dirs)}")
    lines.append(f"> 排除目录: {', '.join(exclude_dirs)}")
    lines.append(f"> 总标记数: **{len(results)}**")
    lines.append(f"> 涉及文件数: **{len(by_file)}**")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    lines.append("## 一、按优先级统计")
    lines.append("")
    lines.append("| 优先级 | 标签类型 | 数量 | 占比 |")
    lines.append("|--------|----------|------|------|")
    sorted_tags = sorted(by_tag.items(), key=lambda x: TAG_PRIORITY.get(x[0], 99))
    for tag, count in sorted_tags:
        priority = TAG_PRIORITY.get(tag, 99)
        pct = f"{count / len(results) * 100:.1f}%"
        lines.append(f"| {priority} | **{tag}** | {count} | {pct} |")
    lines.append("")
    
    lines.append("## 二、按文件类型统计")
    lines.append("")
    lines.append("| 文件类型 | 数量 | 占比 |")
    lines.append("|----------|------|------|")
    sorted_ext = sorted(by_file_type.items(), key=lambda x: -x[1])
    for ext, count in sorted_ext:
        pct = f"{count / len(results) * 100:.1f}%"
        lines.append(f"| `{ext}` | {count} | {pct} |")
    lines.append("")
    
    lines.append("## 三、Top 文件排行")
    lines.append("")
    lines.append("| 排名 | 文件名 | 标记数 | 文件路径 |")
    lines.append("|------|--------|--------|----------|")
    top_files = sorted(by_file.items(), key=lambda x: -x[1])[:30]
    for idx, (filepath, count) in enumerate(top_files, 1):
        basename = os.path.basename(filepath)
        rel_path = os.path.relpath(filepath, os.getcwd())
        lines.append(f"| {idx} | `{basename}` | {count} | `{rel_path}` |")
    lines.append("")
    
    lines.append("## 四、详细标记列表")
    lines.append("")
    
    sorted_results = sorted(
        results,
        key=lambda x: (TAG_PRIORITY.get(x['tag'], 99), x['file'], x['line'])
    )
    
    current_tag = None
    for r in sorted_results:
        if r['tag'] != current_tag:
            current_tag = r['tag']
            lines.append(f"### {current_tag}")
            lines.append("")
            lines.append("| 文件 | 行号 | 内容 |")
            lines.append("|------|------|------|")
        
        rel_path = os.path.relpath(r['file'], os.getcwd())
        content = r['content'].replace('|', '\\|') if r['content'] else "(无内容)"
        lines.append(f"| `{rel_path}` | {r['line']} | {content} |")
    
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(f"*报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description='TOPEMS 代码库 TODO/FIXME 扫描脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python scripts/scan_todos.py                        # 使用默认配置扫描
  python scripts/scan_todos.py --summary              # 仅显示统计概览
  python scripts/scan_todos.py --output report.md     # 输出 Markdown 报告到文件
  python scripts/scan_todos.py --dir src --dir lib    # 扫描指定目录
  python scripts/scan_todos.py --exclude test --exclude .git  # 排除指定目录
        """
    )
    
    parser.add_argument(
        '--dir', '-d',
        action='append',
        default=None,
        help='要扫描的目录（可多次指定），默认为项目核心代码目录'
    )
    
    parser.add_argument(
        '--exclude', '-e',
        action='append',
        default=None,
        help='要排除的目录名（可多次指定）'
    )
    
    parser.add_argument(
        '--output', '-o',
        default=None,
        help='输出 Markdown 报告到指定文件'
    )
    
    parser.add_argument(
        '--summary', '-s',
        action='store_true',
        default=False,
        help='仅显示统计概览，不显示详细列表'
    )
    
    parser.add_argument(
        '--ext',
        action='append',
        default=None,
        help='指定要扫描的文件扩展名（可多次指定，如 .rs .ts）'
    )
    
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent.parent
    
    if args.dir:
        scan_dirs = args.dir
    else:
        scan_dirs = DEFAULT_SCAN_DIRS
    
    scan_dirs = [os.path.join(project_root, d) if not os.path.isabs(d) else d for d in scan_dirs]
    scan_dirs = [d for d in scan_dirs if os.path.exists(d)]
    
    if not scan_dirs:
        print("错误：没有有效的扫描目录", file=sys.stderr)
        sys.exit(1)
    
    exclude_dirs = args.exclude if args.exclude else DEFAULT_EXCLUDE_DIRS
    target_extensions = {e.lower() for e in args.ext} if args.ext else None
    
    print(f"开始扫描...")
    print(f"扫描目录: {len(scan_dirs)} 个")
    print(f"排除目录: {', '.join(exclude_dirs)}")
    
    all_results = []
    for scan_dir in scan_dirs:
        if os.path.isdir(scan_dir):
            results = scan_directory(scan_dir, exclude_dirs, target_extensions)
            all_results.extend(results)
            print(f"  {scan_dir}: 找到 {len(results)} 个标记")
    
    print_terminal_report(all_results, summary_only=args.summary)
    
    if args.output:
        output_path = args.output
        if not os.path.isabs(output_path):
            output_path = os.path.join(os.getcwd(), output_path)
        
        markdown = generate_markdown_report(all_results, [os.path.relpath(d, project_root) for d in scan_dirs], exclude_dirs)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(markdown)
        
        print(f"\nMarkdown 报告已保存到: {output_path}")


if __name__ == '__main__':
    main()
