#!/usr/bin/env python3
"""
精确分析 useCrudMutations 候选文件 - 最终版
从 100 个使用 queryClient.invalidateQueries 的文件中筛选
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


def extract_invalidated_query_keys(content):
    """提取所有被 queryClient.invalidateQueries 失效的 queryKey，去重"""
    pattern = r'queryClient\.invalidateQueries\s*\(\s*\{\s*queryKey\s*:\s*(\[[^\]]+\])'
    matches = re.findall(pattern, content)
    
    normalized = set()
    for key in matches:
        norm = re.sub(r'\s+', '', key)
        normalized.add(norm)
    
    return normalized


def has_add_notification(content):
    """检查文件中是否有 addNotification"""
    return 'addNotification' in content


def has_error_logging(content):
    """检查是否有错误日志"""
    return 'logger.error' in content or 'apiLogger.error' in content


def has_optimistic_update(content):
    """检查是否有乐观更新"""
    return 'setQueryData' in content or 'getQueryData' in content


def has_batch_operations(content):
    """检查是否有批量操作（for 循环中调用 mutation）"""
    # 简化：检查是否有 for 循环并且有批量删除/更新的迹象
    # 或者检查 selectedIds + for 循环 + api 调用
    
    # 检查是否有 for...of 循环中调用 api
    for_of_pattern = r'for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+[^\)]+\)\s*\{'
    for_matches = re.findall(for_of_pattern + r'([^}]*(?:\{[^}]*\}[^}]*)*)\}', content, re.DOTALL)
    
    for block in for_matches:
        if re.search(r'\w+Mutation\.mutate', block):
            return True
        if re.search(r'\.delete\s*\(', block) and 'api' in block.lower():
            return True
    
    # 检查 batchDelete / batchUpdate 等命名的 mutation
    if re.search(r'\bbatch\w*Mutation\b', content, re.IGNORECASE):
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
    
    # 标准3: 有 addNotification
    if not has_add_notification(content):
        return None, '缺少addNotification'
    
    # 标准4: 有错误日志
    if not has_error_logging(content):
        return None, '缺少错误日志'
    
    # 标准6: 单一 queryKey 失效（统计不同的 queryKey）
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
        return None, '存在批量操作'
    
    return {
        'path': rel_path,
        'module': get_module_from_path(rel_path),
        'mutation_count': mutation_count,
        'mutation_names': mutation_names,
        'query_key_count': len(invalidated_keys),
    }, None


def main():
    print("=" * 80)
    print("useCrudMutations 候选文件精确分析 - 最终版")
    print("=" * 80)
    
    # 1. 获取使用 queryClient.invalidateQueries 的文件（约100个）
    files_with_invalidate = find_files_with_pattern(
        PAGES_DIR, 
        r'queryClient\.invalidateQueries'
    )
    print(f"\n1. 使用 queryClient.invalidateQueries 的文件数: {len(files_with_invalidate)}")
    
    # 2. 排除已迁移文件
    migrated = USE_CRUD_MUTATIONS_FILES | USE_CRUD_OPERATIONS_FILES
    migrated_in_list = [f for f in files_with_invalidate if f in migrated]
    remaining_files = [f for f in files_with_invalidate if f not in migrated]
    print(f"2. 排除已迁移文件后剩余: {len(remaining_files)}")
    print(f"   - useCrudMutations: {sum(1 for f in migrated_in_list if f in USE_CRUD_MUTATIONS_FILES)} 个")
    print(f"   - useCrudOperations: {sum(1 for f in migrated_in_list if f in USE_CRUD_OPERATIONS_FILES)} 个")
    
    # 3. 逐个分析
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
            elif '缺少addNotification' in skip_reason:
                skip_reasons['缺少addNotification'].append(rel_path)
            elif '缺少错误日志' in skip_reason:
                skip_reasons['缺少错误日志'].append(rel_path)
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
            print(f"     mutation({c['mutation_count']}个): {', '.join(c['mutation_names'][:6])}")
    
    print(f"\n{'=' * 80}")
    print("❌ 跳过原因统计")
    print(f"{'=' * 80}")
    
    total_skipped = sum(len(files) for files in skip_reasons.values())
    print(f"\n总跳过文件数: {total_skipped}")
    
    for reason, files in sorted(skip_reasons.items(), key=lambda x: -len(x[1])):
        print(f"\n  {reason}: {len(files)} 个文件")
        for f in sorted(files)[:5]:
            print(f"    - {f}")
        if len(files) > 5:
            print(f"    ... 还有 {len(files) - 5} 个文件")
    
    print(f"\n{'=' * 80}")
    print("🎯 优先迁移建议")
    print(f"{'=' * 80}")
    
    module_counts = [(m, len(fs)) for m, fs in candidates_by_module.items()]
    module_counts.sort(key=lambda x: -x[1])
    
    print("\n按模块文件数排序（建议优先迁移文件数多的模块）:")
    for i, (module, count) in enumerate(module_counts, 1):
        print(f"  {i}. {module}: {count} 个文件")
    
    output = {
        'total_files_with_invalidate': len(files_with_invalidate),
        'migrated_files': len(migrated_in_list),
        'candidate_count': len(candidates),
        'candidates_by_module': {m: [c['path'] for c in sorted(fs, key=lambda x: x['path'])] 
                                  for m, fs in sorted(candidates_by_module.items())},
        'skip_reasons': {r: sorted(fs) for r, fs in skip_reasons.items()},
        'all_candidates': sorted([c['path'] for c in candidates]),
    }
    
    output_path = "/Users/air/TOPEMS/apps/web/scripts/crud_candidates_final.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 详细结果已保存到: {output_path}")
    print(f"\n📊 统计汇总:")
    print(f"    使用invalidateQueries的文件: {len(files_with_invalidate)}")
    print(f"    已迁移: {len(migrated_in_list)} 个")
    print(f"    符合条件可迁移: {len(candidates)} 个")
    print(f"    不符合条件: {total_skipped} 个")


if __name__ == '__main__':
    main()
