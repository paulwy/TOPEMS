#!/usr/bin/env python3
"""
React 组件命名规范检查脚本

功能：
- 检查 .tsx 组件文件名是否为 PascalCase（大驼峰）
- 检查组件导出名称是否与文件名一致
- 支持自动修复（重命名文件、更新导入引用）
- 支持 CI 模式（非零退出码）
- 支持指定检查目录
"""

import os
import re
import sys
import argparse
import shutil
from datetime import datetime
from pathlib import Path
from collections import defaultdict


DEFAULT_CHECK_DIRS = [
    'apps/web/src/components',
    'apps/web/src/pages',
]

TEST_FILE_PATTERNS = ['.test.tsx', '.spec.tsx', '.stories.tsx']

NON_COMPONENT_FILES = {'index.ts', 'types.ts', 'utils.ts', 'helpers.ts', 'constants.ts', 'config.ts'}

PASCAL_CASE_PATTERN = re.compile(r'^[A-Z][A-Za-z0-9]*$')

KEBAB_CASE_PATTERN = re.compile(r'^[a-z][a-z0-9-]*$')

FUNCTION_COMPONENT_PATTERN = re.compile(
    r'(?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9]*)\s*\(',
    re.MULTILINE
)

ARROW_COMPONENT_PATTERN = re.compile(
    r'(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+([A-Z][A-Za-z0-9]*)\s*[=:]\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>',
    re.MULTILINE
)

EXPORT_DEFAULT_PATTERN = re.compile(
    r'export\s+default\s+([A-Z][A-Za-z0-9]*)',
    re.MULTILINE
)

NAMED_EXPORT_PATTERN = re.compile(
    r'export\s*\{[^}]*\b([A-Z][A-Za-z0-9]*)\b[^}]*\}',
    re.MULTILINE
)

IMPORT_PATTERN = re.compile(
    r'''import\s+(?:(?:\{[^}]*\})|(?:[^'"\s]+))\s+from\s+['"]([^'"]+)['"]''',
    re.MULTILINE
)

IMPORT_NAMED_PATTERN = re.compile(
    r'import\s*\{([^}]+)\}\s*from\s+[\'"]([^\'"]+)[\'"]',
    re.MULTILINE
)

IMPORT_DEFAULT_PATTERN = re.compile(
    r'import\s+(\w+)\s+from\s+[\'"]([^\'"]+)[\'"]',
    re.MULTILINE
)


def is_pascal_case(name: str) -> bool:
    """检查名称是否为 PascalCase"""
    return bool(PASCAL_CASE_PATTERN.match(name))


def is_kebab_case(name: str) -> bool:
    """检查名称是否为 kebab-case"""
    return bool(KEBAB_CASE_PATTERN.match(name))


def to_pascal_case(name: str) -> str:
    """将各种命名格式转换为 PascalCase"""
    name = name.replace('-', ' ').replace('_', ' ')
    words = name.split()
    if not words:
        return name
    return ''.join(word.capitalize() for word in words)


def is_test_file(filename: str) -> bool:
    """检查是否为测试文件"""
    return any(filename.endswith(pattern) for pattern in TEST_FILE_PATTERNS)


def is_non_component_file(filename: str) -> bool:
    """检查是否为非组件文件"""
    return filename in NON_COMPONENT_FILES


def should_check_file(filepath: str) -> bool:
    """判断是否应该检查该文件"""
    filename = os.path.basename(filepath)
    
    if not filename.endswith('.tsx'):
        return False
    
    if is_test_file(filename):
        return False
    
    if filename == 'index.tsx':
        return False
    
    return True


def extract_component_names(content: str) -> dict:
    """
    从文件内容中提取组件名称
    返回: {
        'default': str or None,
        'named': list of str,
        'all': list of str
    }
    """
    result = {
        'default': None,
        'named': [],
        'all': []
    }
    
    default_match = EXPORT_DEFAULT_PATTERN.search(content)
    if default_match:
        result['default'] = default_match.group(1)
    
    for match in NAMED_EXPORT_PATTERN.finditer(content):
        name = match.group(1)
        if name not in result['named']:
            result['named'].append(name)
    
    func_components = set()
    for match in FUNCTION_COMPONENT_PATTERN.finditer(content):
        func_components.add(match.group(1))
    
    arrow_components = set()
    for match in ARROW_COMPONENT_PATTERN.finditer(content):
        arrow_components.add(match.group(1))
    
    all_components = func_components | arrow_components
    
    if result['default']:
        all_components.add(result['default'])
    
    result['all'] = sorted(all_components)
    result['named'] = sorted(set(result['named']) | all_components)
    
    return result


def get_filename_without_ext(filepath: str) -> str:
    """获取不带扩展名的文件名"""
    filename = os.path.basename(filepath)
    name, _ = os.path.splitext(filename)
    return name


def check_file(filepath: str, project_root: str) -> list:
    """
    检查单个文件的命名规范
    返回违规列表
    """
    violations = []
    filename = os.path.basename(filepath)
    name_without_ext = get_filename_without_ext(filepath)
    rel_path = os.path.relpath(filepath, project_root)
    
    if not is_pascal_case(name_without_ext):
        violations.append({
            'type': 'filename_not_pascal',
            'severity': 'error',
            'file': rel_path,
            'message': f'文件名 "{name_without_ext}" 不是 PascalCase',
            'suggestion': f'建议改为: {to_pascal_case(name_without_ext)}.tsx',
            'current': name_without_ext,
            'expected': to_pascal_case(name_without_ext),
        })
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except (IOError, OSError, PermissionError):
        return violations
    
    components = extract_component_names(content)
    
    expected_name = to_pascal_case(name_without_ext) if not is_pascal_case(name_without_ext) else name_without_ext
    
    component_found = False
    name_mismatch = False
    
    if components['default']:
        component_found = True
        if components['default'] != expected_name:
            name_mismatch = True
    
    if expected_name in components['named']:
        component_found = True
    
    if components['all'] and expected_name in components['all']:
        component_found = True
    
    if not component_found and components['all']:
        closest = None
        for comp in components['all']:
            if comp.lower() == expected_name.lower():
                closest = comp
                break
        
        if closest:
            violations.append({
                'type': 'component_name_mismatch',
                'severity': 'error',
                'file': rel_path,
                'message': f'组件名 "{closest}" 与文件名 "{expected_name}" 不一致',
                'suggestion': f'建议将组件名改为 {expected_name}',
                'current': closest,
                'expected': expected_name,
            })
        else:
            violations.append({
                'type': 'component_name_mismatch',
                'severity': 'warning',
                'file': rel_path,
                'message': f'未找到与文件名 "{expected_name}" 匹配的组件导出',
                'suggestion': f'确保文件导出名为 {expected_name} 的组件',
                'current': ', '.join(components['all'][:5]) if components['all'] else '无',
                'expected': expected_name,
            })
    
    return violations


def check_directory(dirpath: str, project_root: str) -> tuple:
    """
    递归检查目录中的文件
    返回 (violations, file_count, dir_warnings)
    """
    all_violations = []
    file_count = 0
    dir_warnings = []
    
    for root, dirs, files in os.walk(dirpath):
        dirs[:] = [d for d in dirs if d not in {'node_modules', 'dist', 'build', '.next', '__tests__'}]
        
        for d in dirs:
            if d.startswith('.'):
                continue
            if not is_kebab_case(d) and not is_pascal_case(d):
                dir_warnings.append({
                    'type': 'dir_naming',
                    'severity': 'warning',
                    'dir': os.path.relpath(os.path.join(root, d), project_root),
                    'message': f'目录名 "{d}" 命名不规范',
                    'suggestion': '推荐使用 kebab-case（小写加连字符）',
                })
        
        for filename in files:
            filepath = os.path.join(root, filename)
            
            if not should_check_file(filepath):
                continue
            
            file_count += 1
            violations = check_file(filepath, project_root)
            all_violations.extend(violations)
    
    return all_violations, file_count, dir_warnings


def find_all_imports(project_root: str) -> list:
    """
    查找项目中所有的 import 语句
    返回 [(file_path, import_path, import_type, import_names)]
    """
    imports = []
    
    src_dirs = [
        os.path.join(project_root, 'apps', 'web', 'src'),
    ]
    
    for src_dir in src_dirs:
        if not os.path.isdir(src_dir):
            continue
        
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [d for d in dirs if d not in {'node_modules', 'dist', 'build', '.next'}]
            
            for filename in files:
                if not (filename.endswith('.ts') or filename.endswith('.tsx')):
                    continue
                
                filepath = os.path.join(root, filename)
                
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                except (IOError, OSError, PermissionError):
                    continue
                
                for match in IMPORT_NAMED_PATTERN.finditer(content):
                    names_str = match.group(1)
                    import_path = match.group(2)
                    names = [n.strip().split(' as ')[0].strip() for n in names_str.split(',') if n.strip()]
                    imports.append((filepath, import_path, 'named', names, match.group(0)))
                
                for match in IMPORT_DEFAULT_PATTERN.finditer(content):
                    default_name = match.group(1)
                    import_path = match.group(2)
                    imports.append((filepath, import_path, 'default', [default_name], match.group(0)))
    
    return imports


def resolve_import_path(import_path: str, current_file: str, project_root: str) -> str:
    """
    解析 import 路径为绝对路径
    """
    if import_path.startswith('@/'):
        return os.path.join(project_root, 'apps', 'web', 'src', import_path[2:])
    elif import_path.startswith('./') or import_path.startswith('../'):
        current_dir = os.path.dirname(current_file)
        return os.path.normpath(os.path.join(current_dir, import_path))
    else:
        return None


def fix_violations(violations: list, project_root: str) -> dict:
    """
    尝试自动修复违规
    返回修复统计
    """
    fix_stats = {
        'files_renamed': 0,
        'imports_updated': 0,
        'skipped': 0,
        'errors': [],
    }
    
    rename_map = {}
    
    for v in violations:
        if v['type'] != 'filename_not_pascal':
            continue
        
        abs_path = os.path.join(project_root, v['file'])
        dirname = os.path.dirname(abs_path)
        new_filename = v['expected'] + '.tsx'
        new_path = os.path.join(dirname, new_filename)
        
        if os.path.exists(new_path):
            fix_stats['errors'].append(f'跳过 {v["file"]}: 目标文件已存在')
            fix_stats['skipped'] += 1
            continue
        
        rename_map[abs_path] = new_path
    
    all_imports = find_all_imports(project_root)
    
    import_updates = defaultdict(list)
    
    for abs_old_path, abs_new_path in rename_map.items():
        old_name = os.path.splitext(os.path.basename(abs_old_path))[0]
        new_name = os.path.splitext(os.path.basename(abs_new_path))[0]
        
        for imp_file, imp_path, imp_type, imp_names, imp_stmt in all_imports:
            resolved = resolve_import_path(imp_path, imp_file, project_root)
            if not resolved:
                continue
            
            resolved_with_ext = resolved
            if not resolved.endswith('.tsx') and not resolved.endswith('.ts'):
                if os.path.exists(resolved + '.tsx'):
                    resolved_with_ext = resolved + '.tsx'
                elif os.path.exists(resolved + '.ts'):
                    resolved_with_ext = resolved + '.ts'
                elif os.path.isdir(resolved):
                    index_tsx = os.path.join(resolved, 'index.tsx')
                    index_ts = os.path.join(resolved, 'index.ts')
                    if os.path.exists(index_tsx):
                        resolved_with_ext = index_tsx
                    elif os.path.exists(index_ts):
                        resolved_with_ext = index_ts
            
            if os.path.normpath(resolved_with_ext) == os.path.normpath(abs_old_path):
                import_updates[imp_file].append({
                    'old_path': imp_path,
                    'new_path': imp_path.replace(old_name, new_name) if old_name in imp_path else imp_path,
                    'old_name': old_name,
                    'new_name': new_name,
                    'import_type': imp_type,
                    'import_names': imp_names,
                    'statement': imp_stmt,
                })
    
    backup_dir = os.path.join(project_root, '.backup', f'naming-fix-{datetime.now().strftime("%Y%m%d-%H%M%S")}')
    os.makedirs(backup_dir, exist_ok=True)
    
    for abs_old_path, abs_new_path in rename_map.items():
        rel_old = os.path.relpath(abs_old_path, project_root)
        backup_path = os.path.join(backup_dir, rel_old)
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        shutil.copy2(abs_old_path, backup_path)
        
        try:
            os.rename(abs_old_path, abs_new_path)
            fix_stats['files_renamed'] += 1
        except OSError as e:
            fix_stats['errors'].append(f'重命名失败 {rel_old}: {e}')
            fix_stats['skipped'] += 1
    
    for imp_file, updates in import_updates.items():
        try:
            with open(imp_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except (IOError, OSError):
            continue
        
        original_content = content
        modified = False
        
        for update in updates:
            if update['import_type'] == 'default':
                old_stmt = update['statement']
                if update['old_name'] in old_stmt and update['old_path'] in old_stmt:
                    new_stmt = old_stmt.replace(update['old_name'], update['new_name'])
                    if update['old_path'] != update['new_path']:
                        new_stmt = new_stmt.replace(update['old_path'], update['new_path'])
                    content = content.replace(old_stmt, new_stmt)
                    modified = True
            elif update['import_type'] == 'named':
                old_stmt = update['statement']
                if update['old_path'] != update['new_path']:
                    new_stmt = old_stmt.replace(update['old_path'], update['new_path'])
                    content = content.replace(old_stmt, new_stmt)
                    modified = True
        
        if modified:
            rel_imp = os.path.relpath(imp_file, project_root)
            backup_path = os.path.join(backup_dir, rel_imp)
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original_content)
            
            with open(imp_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            fix_stats['imports_updated'] += 1
    
    if fix_stats['files_renamed'] > 0 or fix_stats['imports_updated'] > 0:
        print(f"\n备份已保存到: {backup_dir}")
    
    return fix_stats


def print_report(violations: list, dir_warnings: list, file_count: int, ci_mode: bool = False):
    """打印检查报告"""
    error_count = sum(1 for v in violations if v['severity'] == 'error')
    warning_count = sum(1 for v in violations if v['severity'] == 'warning')
    
    if ci_mode:
        if error_count > 0:
            print(f"FAIL: 发现 {error_count} 个错误, {warning_count} 个警告, 共检查 {file_count} 个文件")
        else:
            print(f"PASS: 检查通过, 共 {file_count} 个文件")
        return
    
    print("\n" + "=" * 80)
    print("React 组件命名规范检查报告")
    print(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"检查文件数: {file_count}")
    print("=" * 80)
    
    print(f"\n【统计摘要】")
    print(f"  错误 (Error):   {error_count}")
    print(f"  警告 (Warning): {warning_count + len(dir_warnings)}")
    print(f"  总违规数:       {len(violations) + len(dir_warnings)}")
    
    if dir_warnings:
        print(f"\n{'=' * 80}")
        print(f"目录命名警告 ({len(dir_warnings)})")
        print(f"{'=' * 80}")
        for w in sorted(dir_warnings, key=lambda x: x['dir']):
            print(f"\n  目录: {w['dir']}")
            print(f"  问题: {w['message']}")
            print(f"  建议: {w['suggestion']}")
    
    filename_violations = [v for v in violations if v['type'] == 'filename_not_pascal']
    name_mismatch_violations = [v for v in violations if v['type'] == 'component_name_mismatch']
    
    if filename_violations:
        print(f"\n{'=' * 80}")
        print(f"文件名不符合 PascalCase ({len(filename_violations)})")
        print(f"{'=' * 80}")
        for v in sorted(filename_violations, key=lambda x: x['file']):
            print(f"\n  文件: {v['file']}")
            print(f"  当前: {v['current']}")
            print(f"  建议: {v['expected']}")
    
    if name_mismatch_violations:
        print(f"\n{'=' * 80}")
        print(f"组件名与文件名不一致 ({len(name_mismatch_violations)})")
        print(f"{'=' * 80}")
        for v in sorted(name_mismatch_violations, key=lambda x: x['file']):
            print(f"\n  文件: {v['file']}")
            print(f"  问题: {v['message']}")
            print(f"  建议: {v['suggestion']}")
    
    print(f"\n{'=' * 80}")
    if error_count == 0:
        print("✅ 所有检查通过！")
    else:
        print(f"❌ 发现 {error_count} 个错误需要修复")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description='React 组件命名规范检查脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python scripts/check_component_naming.py                        # 使用默认目录检查
  python scripts/check_component_naming.py --ci                   # CI 模式，有违规则非零退出
  python scripts/check_component_naming.py --fix                  # 自动修复命名问题
  python scripts/check_component_naming.py --path apps/web/src    # 检查指定目录
  python scripts/check_component_naming.py --path components --path pages  # 多个目录
  python scripts/check_component_naming.py --fix --dry-run        # 预览修复效果
        """
    )
    
    parser.add_argument(
        '--path', '-p',
        action='append',
        default=None,
        help='要检查的目录（可多次指定），默认为 components 和 pages 目录'
    )
    
    parser.add_argument(
        '--fix',
        action='store_true',
        default=False,
        help='尝试自动修复命名问题（重命名文件并更新导入）'
    )
    
    parser.add_argument(
        '--ci',
        action='store_true',
        default=False,
        help='CI 模式：简洁输出，有违规时返回非零退出码'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        default=False,
        help='预览模式：只显示将要做的修改，不实际执行'
    )
    
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent.parent
    
    if args.path:
        check_dirs = []
        for p in args.path:
            if os.path.isabs(p):
                check_dirs.append(p)
            else:
                check_dirs.append(os.path.join(project_root, p))
    else:
        check_dirs = [os.path.join(project_root, d) for d in DEFAULT_CHECK_DIRS]
    
    check_dirs = [d for d in check_dirs if os.path.exists(d)]
    
    if not check_dirs:
        print("错误：没有有效的检查目录", file=sys.stderr)
        sys.exit(1)
    
    if not args.ci:
        print(f"开始检查组件命名规范...")
        print(f"检查目录: {len(check_dirs)} 个")
        for d in check_dirs:
            print(f"  - {os.path.relpath(d, project_root)}")
    
    all_violations = []
    total_files = 0
    all_dir_warnings = []
    
    for check_dir in check_dirs:
        if os.path.isdir(check_dir):
            violations, file_count, dir_warnings = check_directory(check_dir, project_root)
            all_violations.extend(violations)
            total_files += file_count
            all_dir_warnings.extend(dir_warnings)
    
    print_report(all_violations, all_dir_warnings, total_files, ci_mode=args.ci)
    
    if args.fix:
        filename_violations = [v for v in all_violations if v['type'] == 'filename_not_pascal']
        
        if not filename_violations:
            if not args.ci:
                print("\n没有需要修复的文件名问题。")
        else:
            if args.dry_run:
                print(f"\n【预览】将要修复 {len(filename_violations)} 个文件:")
                for v in sorted(filename_violations, key=lambda x: x['file']):
                    print(f"  {v['file']} -> {os.path.dirname(v['file'])}/{v['expected']}.tsx")
            else:
                print(f"\n开始自动修复...")
                fix_stats = fix_violations(all_violations, project_root)
                print(f"\n【修复结果】")
                print(f"  重命名文件: {fix_stats['files_renamed']}")
                print(f"  更新导入:   {fix_stats['imports_updated']}")
                print(f"  跳过:       {fix_stats['skipped']}")
                if fix_stats['errors']:
                    print(f"  错误:")
                    for err in fix_stats['errors'][:10]:
                        print(f"    - {err}")
    
    error_count = sum(1 for v in all_violations if v['severity'] == 'error')
    
    if args.ci and error_count > 0:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == '__main__':
    main()
