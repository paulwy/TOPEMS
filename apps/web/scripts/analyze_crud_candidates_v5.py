#!/usr/bin/env python3
"""
精确分析 useCrudMutations 候选文件 v5
简化方法：直接在文件中搜索模式，不复杂的括号匹配
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

SRC_DIR = "/Users/air/TOPEMS/apps/web/src"
PAGES_DIR = "/Users/air/TOPEMS/apps/web/src/pages"

USE_CRUD_MUTATIONS_FILES = {
    "pages/mes/MaterialRequirementPage.tsx",
    "pages/mes/MaterialBOMPage.tsx",
    "pages/im/MailPage/hooks.tsx",
    "pages/finance/FinanceAssetPage.tsx",
    "pages/pdm/PdmBomPage.tsx",
    "pages/qms/QmsStandardDetailPage.tsx",
    "pages/pdm/PdmProductConfigPage.tsx",
    "pages/pdm/ProductPage.tsx",
    "pages/qms/QmsInspectionPage.tsx",
    "pages/pdm/MaterialPage.tsx",
    "pages/pdm/BomPage.tsx",
    "pages/pdm/DocumentPage.tsx",
}

USE_CRUD_OPERATIONS_FILES = {
    "pages/srm/SrmOrderPage.tsx",
    "pages/scm/ScmSupplierPage.tsx",
    "pages/lims/LimsTestMethodPage.tsx",
    "pages/lims/BarcodePage.tsx",
    "pages/finance/FinanceVoucherPage/index.tsx",
    "pages/finance/FinanceBudgetPage.tsx",
    "pages/ehs/HazardPage.tsx",
    "pages/ehs/EmergencyPage.tsx",
    "pages/bi/DatasetPage.tsx",
    "pages/bi/BIReportPage.tsx",
    "pages/monitor/MonitorAlertsPage.tsx",
    "pages/srm/SrmContractPage.tsx",
    "pages/bi/BIDataSourcePage.tsx",
}


def find_files_with_pattern(directory, pattern, extensions=('.ts', '.tsx')):
    result = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(extensions):
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, SRC_DIR)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if re.search(pattern, content):
                            result.append(rel_path)
                except:
                    pass
    return sorted(result)


def read_file_content(rel_path):
    filepath = os.path.join(SRC_DIR, rel_path)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        return ""


def count_use_mutation(content):
    """统计 useMutation 调用次数"""
    return len(re.findall(r'useMutation\s*\(', content))


def extract_mutation_names(content):
    """提取 mutation 变量名"""
    pattern1 = re.findall(r'const\s+(\w+)\s*=\s*useMutation\s*\(', content)
    pattern2 = re.findall(r'let\s+(\w+)\s*=\s*useMutation\s*\(', content)
    return pattern1 + pattern2


def has_crud_naming_patterns(mutation_names):
    """检查是否有 create/update/delete 等命名模式"""
    patterns = {
        'create': ['create', 'add', 'new', 'insert', 'submit'],
        'update': ['update', 'edit', 'modify', 'change', 'save'],
        'delete': ['delete', 'remove', 'destroy', 'del'],
    }
    
    found = {'create': False, 'update': False, 'delete': False}
    
    for name in mutation_names:
        name_lower = name.lower()
        for category, keywords in patterns.items():
            for kw in keywords:
                if kw in name_lower:
                    found[category] = True
                    break
    
    return all(found.values()), found


def get_crud_mutation_count(mutation_names):
    """统计 CRUD 相关的 mutation 数量"""
    crud_keywords = ['create', 'add', 'update', 'edit', 'delete', 'remove']
    count = 0
    for name in mutation_names:
        if any(kw in name.lower() for kw in crud_keywords):
            count += 1
    return count


def extract_invalidated_query_keys(content):
    """提取所有被 invalidate 的 queryKey，去重"""
    # 匹配各种形式的 invalidateQueries
    pattern = r'invalidateQueries\s*\(\s*\{?\s*queryKey\s*:\s*(\[[^\]]+\])'
    matches = re.findall(pattern, content)
    
    normalized = set()
    for key in matches:
        # 简单规范化
        norm = re.sub(r'\s+', '', key)
        normalized.add(norm)
    
    return normalized


def has_on_success_pattern_for_crud(content):
    """
    检查是否存在这样的模式：
    在 useMutation 配置中，onSuccess 同时包含 addNotification 和 invalidateQueries
    
    简化方法：检查文件中是否有 onSuccess 块同时包含这两个
    """
    # 查找 onSuccess: ... => { ... } 形式的块
    # 使用一个更宽松的模式：onSuccess 和下一个 onError 或 } 之间的内容
    on_success_blocks = re.findall(
        r'onSuccess\s*:\s*\(?[^)]*\)?\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}',
        content,
        re.DOTALL
    )
    
    count = 0
    for block in on_success_blocks:
        has_notify = 'addNotification' in block
        has_invalidate = 'invalidateQueries' in block
        if has_notify and has_invalidate:
            count += 1
    
    return count


def has_on_error_pattern_for_crud(content):
    """检查 onError 中是否有 addNotification 或 logger.error"""
    on_error_blocks = re.findall(
        r'onError\s*:\s*\(?[^)]*\)?\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}',
        content,
        re.DOTALL
    )
    
    count = 0
    for block in on_error_blocks:
        has_notify = 'addNotification' in block
        has_logger = 'logger.error' in block or 'apiLogger.error' in block
        if has_notify or has_logger:
            count += 1
    
    return count


def has_optimistic_update(content):
    """检查是否有乐观更新"""
    return 'setQueryData' in content or 'getQueryData' in content


def has_batch_operations(content):
    """检查是否有批量操作"""
    # 查找 for 循环
    for_pattern = r'\bfor\s*\([^)]+\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}'
    for_matches = re.findall(for_pattern, content, re.DOTALL)
    
    for block in for_matches:
        if re.search(r'\w+Mutation\.mutate', block):
            return True
    
    return False


def get_module_from_path(rel_path):
    parts = Path(rel_path).parts
    if len(parts) >= 2 and parts[0] == 'pages':
        return parts[1]
    return 'other'


def analyze_file(rel_path):
    content = read_file_content(rel_path)
    if not content:
        return None, '无法读取文件'
    
    mutation_count = count_use_mutation(content)
    mutation_names = extract_mutation_names(content)
    
    # 标准1: 至少 3 个独立 mutation
    if mutation_count < 3:
        return None, f'mutation数量不足3个({mutation_count}个)'
    
    # 标准2: 变量名包含 create/update/delete 等
    has_crud, crud_found = has_crud_naming_patterns(mutation_names)
    if not has_crud:
        missing = [k for k, v in crud_found.items() if not v]
        return None, f'缺少CRUD命名模式(缺少: {", ".join(missing)})'
    
    # 标准3: onSuccess 中有 addNotification + invalidateQueries
    success_count = has_on_success_pattern_for_crud(content)
    if success_count == 0:
        return None, 'onSuccess缺少通知+失效模式'
    
    # 标准4: onError 中有 addNotification 或 logger.error
    error_count = has_on_error_pattern_for_crud(content)
    if error_count == 0:
        return None, 'onError缺少错误处理'
    
    # 标准6: 单一 queryKey 失效
    invalidated_keys = extract_invalidated_query_keys(content)
    if len(invalidated_keys) > 1:
        return None, f'多queryKey失效({len(invalidated_keys)}个)'
    
    if len(invalidated_keys) == 0:
        return None, '无queryKey失效'
    
    # 标准7: 无乐观更新
    if has_optimistic_update(content):
        return None, '存在乐观更新(setQueryData/getQueryData)'
    
    # 标准8: 无批量操作
    if has_batch_operations(content):
        return None, '存在批量操作(for循环+mutation)'
    
    return {
        'path': rel_path,
        'module': get_module_from_path(rel_path),
        'mutation_count': mutation_count,
        'mutation_names': mutation_names,
        'query_key_count': len(invalidated_keys),
        'success_count': success_count,
        'error_count': error_count,
        'crud_mutation_count': get_crud_mutation_count(mutation_names),
    }, None


def main():
    print("=" * 80)
    print("useCrudMutations 候选文件精确分析 v5")
    print("=" * 80)
    
    all_mutation_files = find_files_with_pattern(PAGES_DIR, r'useMutation\s*\(')
    print(f"\n1. pages目录下使用 useMutation 的文件总数: {len(all_mutation_files)}")
    
    migrated = USE_CRUD_MUTATIONS_FILES | USE_CRUD_OPERATIONS_FILES
    migrated_in_pages = [f for f in all_mutation_files if f in migrated]
    remaining_files = [f for f in all_mutation_files if f not in migrated]
    print(f"2. 排除已迁移文件后剩余: {len(remaining_files)}")
    print(f"   - useCrudMutations: {sum(1 for f in migrated_in_pages if f in USE_CRUD_MUTATIONS_FILES)} 个")
    print(f"   - useCrudOperations: {sum(1 for f in migrated_in_pages if f in USE_CRUD_OPERATIONS_FILES)} 个")
    
    candidates = []
    skip_reasons = defaultdict(list)
    
    for rel_path in remaining_files:
        result, skip_reason = analyze_file(rel_path)
        if result:
            candidates.append(result)
        else:
            if 'mutation数量不足' in skip_reason:
                skip_reasons['mutation数量不足3个'].append(rel_path)
            elif '缺少CRUD命名模式' in skip_reason:
                skip_reasons['缺少CRUD命名模式'].append(rel_path)
            elif '多queryKey失效' in skip_reason:
                skip_reasons['多queryKey失效'].append(rel_path)
            elif '无queryKey失效' in skip_reason:
                skip_reasons['无queryKey失效'].append(rel_path)
            elif '存在乐观更新' in skip_reason:
                skip_reasons['存在乐观更新'].append(rel_path)
            elif '存在批量操作' in skip_reason:
                skip_reasons['存在批量操作'].append(rel_path)
            elif 'onSuccess缺少' in skip_reason:
                skip_reasons['onSuccess缺少通知+失效模式'].append(rel_path)
            elif 'onError缺少' in skip_reason:
                skip_reasons['onError缺少错误处理'].append(rel_path)
            else:
                skip_reasons[skip_reason].append(rel_path)
    
    print(f"\n3. ✅ 候选文件数量: {len(candidates)}")
    
    candidates_by_module = defaultdict(list)
    for c in candidates:
        candidates_by_module[c['module']].append(c)
    
    print(f"\n{'=' * 80}")
    print("候选文件清单（按模块分组）")
    print(f"{'=' * 80}")
    
    for module in sorted(candidates_by_module.keys()):
        module_candidates = candidates_by_module[module]
        print(f"\n📦 {module} ({len(module_candidates)} 个文件):")
        for c in sorted(module_candidates, key=lambda x: x['path']):
            print(f"   - {c['path']}")
            print(f"     mutation({c['mutation_count']}个): {', '.join(c['mutation_names'][:5])}")
    
    print(f"\n{'=' * 80}")
    print("❌ 跳过原因统计")
    print(f"{'=' * 80}")
    
    total_skipped = sum(len(files) for files in skip_reasons.values())
    print(f"\n总跳过文件数: {total_skipped}")
    
    for reason, files in sorted(skip_reasons.items(), key=lambda x: -len(x[1])):
        print(f"\n  {reason}: {len(files)} 个文件")
        for f in sorted(files)[:3]:
            print(f"    - {f}")
        if len(files) > 3:
            print(f"    ... 还有 {len(files) - 3} 个文件")
    
    print(f"\n{'=' * 80}")
    print("🎯 优先迁移建议")
    print(f"{'=' * 80}")
    
    module_counts = [(m, len(fs)) for m, fs in candidates_by_module.items()]
    module_counts.sort(key=lambda x: -x[1])
    
    print("\n按模块文件数排序:")
    for i, (module, count) in enumerate(module_counts, 1):
        print(f"  {i}. {module}: {count} 个文件")
    
    output = {
        'total_mutation_files_in_pages': len(all_mutation_files),
        'migrated_files': len(migrated_in_pages),
        'candidate_count': len(candidates),
        'candidates_by_module': {m: [c['path'] for c in sorted(fs, key=lambda x: x['path'])] 
                                  for m, fs in sorted(candidates_by_module.items())},
        'skip_reasons': {r: sorted(fs) for r, fs in skip_reasons.items()},
        'all_candidates': sorted([c['path'] for c in candidates]),
    }
    
    output_path = "/Users/air/TOPEMS/apps/web/scripts/crud_candidates_result_v5.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 详细结果已保存到: {output_path}")
    print(f"\n📊 统计汇总:")
    print(f"    pages目录总mutation文件: {len(all_mutation_files)}")
    print(f"    已迁移: {len(migrated_in_pages)} 个")
    print(f"    符合条件可迁移: {len(candidates)} 个")
    print(f"    不符合条件: {total_skipped} 个")


if __name__ == '__main__':
    main()
