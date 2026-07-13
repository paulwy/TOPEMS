#!/usr/bin/env python3
import os
import re
import json
from collections import defaultdict

API_DIR = '/Users/air/TOPEMS/apps/web/src/api'
OUTPUT_JSON = '/Users/air/TOPEMS/apps/web/src/api/_stats.json'
OUTPUT_MD = '/Users/air/TOPEMS/apps/web/src/api/_stats.md'


def find_ts_files(base_dir):
    ts_files = []
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d != '__tests__']
        for f in files:
            if f.endswith('.ts') and f != 'types.ts':
                ts_files.append(os.path.join(root, f))
    return ts_files


def count_functions_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return 0, 0, []

    lines = content.split('\n')
    total_functions = 0
    top_level_exports = 0
    function_details = []

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if re.match(r'^export\s+(async\s+)?function\s+\w+', stripped):
            total_functions += 1
            top_level_exports += 1
            match = re.match(r'^export\s+(?:async\s+)?function\s+(\w+)', stripped)
            if match:
                function_details.append(match.group(1))

        elif re.match(r'^export\s+const\s+\w+\s*[:=].*=>', stripped):
            total_functions += 1
            top_level_exports += 1
            match = re.match(r'^export\s+const\s+(\w+)', stripped)
            if match:
                function_details.append(match.group(1))

        elif re.match(r'^export\s+const\s+\w+\s*[:=]\s*\{', stripped):
            top_level_exports += 1
            match = re.match(r'^export\s+const\s+(\w+)', stripped)
            obj_name = match.group(1) if match else 'unknown'

            brace_count = line.count('{') - line.count('}')
            j = i + 1
            obj_functions = 0
            while j < len(lines) and brace_count > 0:
                inner_line = lines[j]
                inner_stripped = inner_line.strip()

                brace_count += inner_line.count('{') - inner_line.count('}')

                if inner_stripped and not inner_stripped.startswith('//') and not inner_stripped.startswith('*') and not inner_stripped.startswith('/*'):
                    if re.match(r'^\w+\s*:\s*(async\s*)?\(', inner_stripped) or re.match(r'^\w+\s*=\s*(async\s*)?\(', inner_stripped):
                        obj_functions += 1
                        func_match = re.match(r'^(\w+)', inner_stripped)
                        if func_match:
                            function_details.append(f'{obj_name}.{func_match.group(1)}')
                    elif re.match(r'^async\s+\w+\s*\(', inner_stripped):
                        obj_functions += 1
                        func_match = re.match(r'^async\s+(\w+)', inner_stripped)
                        if func_match:
                            function_details.append(f'{obj_name}.{func_match.group(1)}')
                    elif re.match(r'^\w+\s*\(', inner_stripped):
                        first_word = inner_stripped.split('(')[0].strip()
                        if first_word and first_word not in ['if', 'for', 'while', 'switch', 'return', 'const', 'let', 'var', 'else', 'try', 'catch', 'finally', 'do', 'throw', 'new', 'typeof', 'instanceof', 'in', 'of']:
                            if not re.match(r'^\w+\s*:', first_word):
                                obj_functions += 1
                                func_match = re.match(r'^(\w+)', inner_stripped)
                                if func_match:
                                    function_details.append(f'{obj_name}.{func_match.group(1)}')

                j += 1

            total_functions += obj_functions
            i = j - 1

        elif re.match(r'^export\s+default\s+', stripped):
            top_level_exports += 1

        i += 1

    return total_functions, top_level_exports, function_details


def get_module_name(file_path, base_dir):
    rel_path = os.path.relpath(file_path, base_dir)
    parts = rel_path.split(os.sep)
    if len(parts) > 1:
        return parts[0]
    return 'root'


def main():
    ts_files = find_ts_files(API_DIR)

    file_stats = []
    module_stats = defaultdict(lambda: {'files': 0, 'functions': 0, 'exports': 0})

    total_files = 0
    total_functions = 0
    total_exports = 0

    for fpath in sorted(ts_files):
        functions, exports, func_details = count_functions_in_file(fpath)
        module = get_module_name(fpath, API_DIR)

        file_stats.append({
            'file': os.path.relpath(fpath, API_DIR),
            'module': module,
            'functions': functions,
            'exports': exports,
        })

        module_stats[module]['files'] += 1
        module_stats[module]['functions'] += functions
        module_stats[module]['exports'] += exports

        total_files += 1
        total_functions += functions
        total_exports += exports

    module_list = []
    for module, stats in sorted(module_stats.items(), key=lambda x: -x[1]['functions']):
        module_list.append({
            'module': module,
            'files': stats['files'],
            'functions': stats['functions'],
            'exports': stats['exports'],
        })

    file_stats_sorted = sorted(file_stats, key=lambda x: -x['functions'])

    result = {
        'summary': {
            'total_files': total_files,
            'total_functions': total_functions,
            'total_exports': total_exports,
        },
        'modules': module_list,
        'files': file_stats_sorted,
    }

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    top_modules = module_list[:15]
    top_files = file_stats_sorted[:15]

    md_lines = []
    md_lines.append('# API 模块统计报告')
    md_lines.append('')
    md_lines.append('## 概览')
    md_lines.append('')
    md_lines.append(f'- **总 API 文件数**: {total_files}')
    md_lines.append(f'- **总导出项数**: {total_exports}')
    md_lines.append(f'- **总函数数**: {total_functions}')
    md_lines.append('')

    md_lines.append('## 按模块统计 - Top 15')
    md_lines.append('')
    md_lines.append('| 排名 | 模块 | 文件数 | 导出项数 | 函数数 |')
    md_lines.append('|------|------|--------|----------|--------|')
    for idx, m in enumerate(top_modules, 1):
        md_lines.append(f'| {idx} | {m["module"]} | {m["files"]} | {m["exports"]} | {m["functions"]} |')
    md_lines.append('')

    md_lines.append('## 按文件统计 - Top 15')
    md_lines.append('')
    md_lines.append('| 排名 | 文件 | 模块 | 导出项数 | 函数数 |')
    md_lines.append('|------|------|------|----------|--------|')
    for idx, f in enumerate(top_files, 1):
        md_lines.append(f'| {idx} | {f["file"]} | {f["module"]} | {f["exports"]} | {f["functions"]} |')
    md_lines.append('')

    md_lines.append('## 所有模块统计')
    md_lines.append('')
    md_lines.append('| 模块 | 文件数 | 导出项数 | 函数数 |')
    md_lines.append('|------|--------|----------|--------|')
    for m in module_list:
        md_lines.append(f'| {m["module"]} | {m["files"]} | {m["exports"]} | {m["functions"]} |')
    md_lines.append('')

    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_lines))

    print(f'统计完成！')
    print(f'总 API 文件数: {total_files}')
    print(f'总导出项数: {total_exports}')
    print(f'总函数数: {total_functions}')
    print(f'JSON 报告: {OUTPUT_JSON}')
    print(f'Markdown 报告: {OUTPUT_MD}')
    print()
    print('=== 按模块统计 Top 15 ===')
    for idx, m in enumerate(top_modules[:15], 1):
        print(f'{idx:2d}. {m["module"]:30s} - 文件: {m["files"]:3d}, 导出: {m["exports"]:3d}, 函数: {m["functions"]:3d}')
    print()
    print('=== 按文件统计 Top 15 ===')
    for idx, f in enumerate(top_files[:15], 1):
        print(f'{idx:2d}. {f["file"]:50s} - 函数: {f["functions"]:3d}')


if __name__ == '__main__':
    main()
