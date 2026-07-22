#!/usr/bin/env python3
"""
TOPEMS Rust 死代码检测脚本

功能：
  1. 检测从未使用的私有函数
  2. 检测从未使用的私有结构体/枚举
  3. 检测从未使用的模块
  4. 统计死代码比例

用法：
  python scripts/check_dead_code.py                  # 统计并输出报告
  python scripts/check_dead_code.py --ci              # CI 模式，超过阈值则退出码 1
  python scripts/check_dead_code.py --threshold 5.0   # 设置死代码比例阈值（默认 8%）

注意：此脚本为静态分析，仅作参考。实际应以 clippy 和 cargo test 为准。
"""

import os
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SVC_DIR = PROJECT_ROOT / "svc"
LIB_DIR = PROJECT_ROOT / "lib"

RUST_FILE_PATTERN = re.compile(r'\.rs$')
FN_PATTERN = re.compile(r'^\s*(pub\s+)?(async\s+)?fn\s+(\w+)')
STRUCT_PATTERN = re.compile(r'^\s*(pub\s+)?struct\s+(\w+)')
ENUM_PATTERN = re.compile(r'^\s*(pub\s+)?enum\s+(\w+)')
MOD_PATTERN = re.compile(r'^\s*pub\s+mod\s+(\w+)')
MOD_FILE_PATTERN = re.compile(r'^\s*mod\s+(\w+)\s*;')

TEST_FILE_PATTERNS = ['test', 'tests', 'spec', 'mock', 'example', 'demo']


def is_test_file(filepath):
    name = filepath.name.lower()
    if 'test' in name or 'mock' in name or 'example' in name or 'demo' in name:
        return True
    parts = filepath.parts
    for part in parts:
        if part in ('tests', 'test', 'benches', 'examples'):
            return True
    return False


def scan_rust_file(filepath):
    private_fns = []
    private_structs = []
    private_enums = []
    all_items = 0

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception:
        return private_fns, private_structs, private_enums, all_items, content

    in_comment_block = False
    for line in lines:
        stripped = line.strip()

        if stripped.startswith('/*'):
            in_comment_block = True
        if '*/' in stripped:
            in_comment_block = False
            continue
        if in_comment_block or stripped.startswith('//') or stripped.startswith('#'):
            continue

        fn_match = FN_PATTERN.match(line)
        if fn_match:
            is_pub = fn_match.group(1) is not None
            fn_name = fn_match.group(3)
            all_items += 1
            if not is_pub and not fn_name.startswith('_'):
                private_fns.append(fn_name)

        struct_match = STRUCT_PATTERN.match(line)
        if struct_match:
            is_pub = struct_match.group(1) is not None
            struct_name = struct_match.group(2)
            all_items += 1
            if not is_pub and not struct_name.startswith('_'):
                private_structs.append(struct_name)

        enum_match = ENUM_PATTERN.match(line)
        if enum_match:
            is_pub = enum_match.group(1) is not None
            enum_name = enum_match.group(2)
            all_items += 1
            if not is_pub and not enum_name.startswith('_'):
                private_enums.append(enum_name)

    return private_fns, private_structs, private_enums, all_items, content


def find_unused_items(root_dir, is_lib=False):
    all_private_items = defaultdict(list)
    total_items = 0

    rust_files = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if RUST_FILE_PATTERN.search(filename):
                filepath = Path(dirpath) / filename
                if is_test_file(filepath):
                    continue
                if '/target/' in str(filepath):
                    continue
                rust_files.append(filepath)

    all_contents = {}
    for filepath in rust_files:
        private_fns, private_structs, private_enums, all_items, content = scan_rust_file(filepath)
        total_items += all_items
        all_contents[filepath] = content

        for fn_name in private_fns:
            all_private_items[('fn', fn_name)].append(filepath)
        for struct_name in private_structs:
            all_private_items[('struct', struct_name)].append(filepath)
        for enum_name in private_enums:
            all_private_items[('enum', enum_name)].append(filepath)

    unused_items = []
    for (item_type, item_name), files in all_private_items.items():
        used = False
        for filepath in all_contents:
            content = all_contents[filepath]
            pattern = re.compile(r'\b' + re.escape(item_name) + r'\b')
            matches = pattern.findall(content)
            count = len(matches)
            if item_type == 'fn':
                def_count = len(re.findall(r'\bfn\s+' + re.escape(item_name) + r'\b', content))
                use_count = count - def_count
            elif item_type == 'struct':
                def_count = len(re.findall(r'\bstruct\s+' + re.escape(item_name) + r'\b', content))
                use_count = count - def_count
            elif item_type == 'enum':
                def_count = len(re.findall(r'\benum\s+' + re.escape(item_name) + r'\b', content))
                use_count = count - def_count
            else:
                use_count = count
            if use_count > 0:
                used = True
                break

        if not used and len(files) == 1:
            unused_items.append({
                'type': item_type,
                'name': item_name,
                'file': str(files[0]),
            })

    return unused_items, total_items


def main():
    parser = argparse.ArgumentParser(description='TOPEMS Rust 死代码检测')
    parser.add_argument('--ci', action='store_true', help='CI 模式，超过阈值则退出码 1')
    parser.add_argument('--threshold', type=float, default=8.0, help='死代码比例阈值 (%%)')
    args = parser.parse_args()

    print("=" * 70)
    print("TOPEMS Rust 死代码检测报告")
    print("=" * 70)

    all_unused = []
    total = 0

    lib_unused, lib_total = find_unused_items(LIB_DIR, is_lib=True)
    all_unused.extend(lib_unused)
    total += lib_total

    svc_dirs = [d for d in SVC_DIR.iterdir() if d.is_dir()]
    for svc_dir in sorted(svc_dirs):
        svc_unused, svc_total = find_unused_items(svc_dir)
        all_unused.extend(svc_unused)
        total += svc_total

    dead_code_pct = (len(all_unused) / total * 100) if total > 0 else 0.0

    print(f"\n📊 统计概览")
    print(f"  总检测项数: {total}")
    print(f"  疑似死代码项: {len(all_unused)}")
    print(f"  死代码比例: {dead_code_pct:.2f}%")
    print(f"  阈值: {args.threshold:.2f}%")

    if all_unused:
        print(f"\n⚠️  疑似死代码列表 (前 30 项):")
        print(f"{'类型':<8} {'名称':<40} {'文件'}")
        print("-" * 70)
        for item in all_unused[:30]:
            rel_path = os.path.relpath(item['file'], PROJECT_ROOT)
            print(f"{item['type']:<8} {item['name']:<40} {rel_path}")

        if len(all_unused) > 30:
            print(f"\n... 还有 {len(all_unused) - 30} 项未显示")

    print(f"\n{'=' * 70}")

    if args.ci:
        if dead_code_pct > args.threshold:
            print(f"❌ 死代码比例 {dead_code_pct:.2f}% 超过阈值 {args.threshold:.2f}%")
            print("   请清理无用代码或调整阈值")
            sys.exit(1)
        else:
            print(f"✅ 死代码比例 {dead_code_pct:.2f}% 在阈值 {args.threshold:.2f}% 以内")
            sys.exit(0)
    else:
        print("💡 提示：此为静态近似检测，精确结果请使用 clippy::dead_code lint")
        print(f"   运行: cargo clippy --workspace -- -W clippy::dead_code")


if __name__ == '__main__':
    main()
