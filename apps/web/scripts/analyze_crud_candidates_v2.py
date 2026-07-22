#!/usr/bin/env python3
"""
精确分析 useCrudMutations 候选文件 v2
修复 queryKey 统计逻辑：统计不同的 queryKey 数量，而不是 invalidateQueries 调用次数
只分析 pages 目录下的文件
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

SRC_DIR = "/Users/air/TOPEMS/apps/web/src"
PAGES_DIR = "/Users/air/TOPEMS/apps/web/src/pages"

# 已迁移文件（相对于 src 目录的路径）
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
    """查找包含指定模式的文件"""
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
    """读取文件内容"""
    filepath = os.path.join(SRC_DIR, rel_path)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        return ""


def extract_mutation_vars(content):
    """提取所有 mutation 变量名"""
    # 匹配 const xxx = useMutation(...)
    pattern1 = re.findall(r'const\s+(\w+)\s*=\s*useMutation\s*\(', content)
    # 匹配 const { mutate: xxx } = useMutation(...)
    pattern2 = re.findall(r'const\s*\{\s*[^}]*mutate\s*:\s*(\w+)[^}]*\}\s*=\s*useMutation\s*\(', content)
    # 匹配 let xxx = useMutation(...)
    pattern3 = re.findall(r'let\s+(\w+)\s*=\s*useMutation\s*\(', content)
    
    all_vars = pattern1 + pattern2 + pattern3
    
    # 过滤掉非 mutation 变量（如 queryClient 等可能误匹配的）
    mutation_vars = [v for v in all_vars if any(kw in v.lower() for kw in 
                     ['mutat', 'create', 'add', 'update', 'edit', 'delete', 'remove', 
                      'submit', 'approve', 'save', 'send'])]
    
    # 如果过滤后为空，返回全部（可能命名不标准）
    return mutation_vars if mutation_vars else all_vars


def has_crud_naming_patterns(mutation_vars):
    """检查是否有 create/update/delete 等命名模式"""
    patterns = {
        'create': ['create', 'add', 'new', 'insert', 'submit'],
        'update': ['update', 'edit', 'modify', 'change', 'save'],
        'delete': ['delete', 'remove', 'destroy', 'del'],
    }
    
    found = {'create': False, 'update': False, 'delete': False}
    
    for var_name in mutation_vars:
        var_lower = var_name.lower()
        for category, keywords in patterns.items():
            for kw in keywords:
                if kw in var_lower:
                    found[category] = True
                    break
    
    return all(found.values()), found


def extract_invalidated_query_keys(content):
    """提取所有被 invalidate 的 queryKey，去重"""
    # 匹配 invalidateQueries({ queryKey: [...] }) 形式
    pattern1 = re.findall(r'invalidateQueries\s*\(\s*\{\s*queryKey\s*:\s*(\[[^\]]+\])', content)
    # 匹配 invalidateQueries(['xxx']) 形式
    pattern2 = re.findall(r'invalidateQueries\s*\(\s*(\[[^\]]+\])', content)
    
    all_keys = pattern1 + pattern2
    
    # 规范化：去掉空格，作为字符串比较
    normalized_keys = set()
    for key in all_keys:
        # 简单规范化：去掉空白字符
        normalized = re.sub(r'\s+', '', key)
        normalized_keys.add(normalized)
    
    return normalized_keys


def has_optimistic_update(content):
    """检查是否有乐观更新（setQueryData / getQueryData 在 mutation 上下文中）"""
    # 检查是否有 setQueryData 或 getQueryData
    return 'setQueryData' in content or 'getQueryData' in content


def has_batch_mutation_operations(content):
    """检查是否有批量操作（for 循环 + mutation 调用）"""
    # 查找 for 循环块
    for_pattern = r'\bfor\s*\([^)]+\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
    
    for_matches = re.findall(for_pattern, content, re.DOTALL)
    
    for block in for_matches:
        # 检查 for 循环内是否有 mutation 调用
        if re.search(r'\w+Mutation\.mutate', block) or re.search(r'\.mutate\s*\(', block):
            return True
    
    return False


def get_module_from_path(rel_path):
    """从路径中提取模块名"""
    parts = Path(rel_path).parts
    if len(parts) >= 2 and parts[0] == 'pages':
        return parts[1]
    return 'other'


def analyze_file(rel_path):
    """分析单个文件，返回分析结果"""
    content = read_file_content(rel_path)
    if not content:
        return None, '无法读取文件'
    
    mutation_vars = extract_mutation_vars(content)
    mutation_count = len(mutation_vars)
    
    # 标准1: 至少 3 个独立 mutation 变量
    if mutation_count < 3:
        return None, f'mutation数量不足3个({mutation_count}个)'
    
    # 标准2: 变量名包含 create/update/delete 等
    has_crud, crud_found = has_crud_naming_patterns(mutation_vars)
    if not has_crud:
        missing = [k for k, v in crud_found.items() if not v]
        return None, f'缺少CRUD命名模式(缺少: {", ".join(missing)})'
    
    # 标准3: 有 addNotification
    if 'addNotification' not in content:
        return None, '缺少addNotification'
    
    # 标准4: 有错误日志 (logger.error 或 apiLogger.error)
    if 'logger.error' not in content and 'apiLogger.error' not in content:
        return None, '缺少错误日志'
    
    # 标准6: 单一 queryKey 失效（统计不同的 queryKey 数量）
    invalidated_keys = extract_invalidated_query_keys(content)
    if len(invalidated_keys) > 1:
        return None, f'多queryKey失效({len(invalidated_keys)}个)'
    
    if len(invalidated_keys) == 0:
        return None, '无queryKey失效'
    
    # 标准7: 无乐观更新
    if has_optimistic_update(content):
        return None, '存在乐观更新(setQueryData/getQueryData)'
    
    # 标准8: 无批量操作
    if has_batch_mutation_operations(content):
        return None, '存在批量操作(for循环+mutation)'
    
    # 符合所有条件
    return {
        'path': rel_path,
        'module': get_module_from_path(rel_path),
        'mutation_count': mutation_count,
        'mutation_vars': mutation_vars,
        'query_key_count': len(invalidated_keys),
    }, None


def main():
    print("=" * 80)
    print("useCrudMutations 候选文件精确分析 v2")
    print("=" * 80)
    
    # 1. 获取 pages 目录下所有使用 useMutation 的文件
    all_mutation_files = find_files_with_pattern(PAGES_DIR, r'useMutation\s*\(')
    print(f"\n1. pages目录下使用 useMutation 的文件总数: {len(all_mutation_files)}")
    
    # 2. 排除已使用 useCrudMutations / useCrudOperations 的文件
    migrated = USE_CRUD_MUTATIONS_FILES | USE_CRUD_OPERATIONS_FILES
    migrated_in_pages = [f for f in all_mutation_files if f in migrated]
    remaining_files = [f for f in all_mutation_files if f not in migrated]
    print(f"2. 排除已迁移文件后剩余: {len(remaining_files)}")
    print(f"   - useCrudMutations: {sum(1 for f in migrated_in_pages if f in USE_CRUD_MUTATIONS_FILES)} 个文件")
    print(f"   - useCrudOperations: {sum(1 for f in migrated_in_pages if f in USE_CRUD_OPERATIONS_FILES)} 个文件")
    
    # 3. 逐个分析剩余文件
    candidates = []
    skip_reasons = defaultdict(list)
    
    for rel_path in remaining_files:
        result, skip_reason = analyze_file(rel_path)
        if result:
            candidates.append(result)
        else:
            # 归类跳过原因
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
    
    # 4. 输出候选文件
    print(f"\n3. 候选文件数量: {len(candidates)}")
    
    # 按模块分组
    candidates_by_module = defaultdict(list)
    for c in candidates:
        candidates_by_module[c['module']].append(c)
    
    print(f"\n{'=' * 80}")
    print("✅ 候选文件清单（按模块分组）")
    print(f"{'=' * 80}")
    
    for module in sorted(candidates_by_module.keys()):
        module_candidates = candidates_by_module[module]
        print(f"\n📦 {module} ({len(module_candidates)} 个文件):")
        for c in sorted(module_candidates, key=lambda x: x['path']):
            print(f"   - {c['path']}")
            print(f"     mutation变量({c['mutation_count']}个): {', '.join(c['mutation_vars'][:6])}")
    
    # 5. 跳过原因统计
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
    
    # 6. 优先迁移建议
    print(f"\n{'=' * 80}")
    print("🎯 优先迁移建议")
    print(f"{'=' * 80}")
    
    module_counts = [(m, len(fs)) for m, fs in candidates_by_module.items()]
    module_counts.sort(key=lambda x: -x[1])
    
    print("\n按模块文件数排序（建议优先迁移文件数多的模块）:")
    for i, (module, count) in enumerate(module_counts, 1):
        print(f"  {i}. {module}: {count} 个文件")
    
    # 7. 输出 JSON 格式便于后续处理
    output = {
        'total_mutation_files_in_pages': len(all_mutation_files),
        'migrated_files': len(migrated_in_pages),
        'candidate_count': len(candidates),
        'candidates_by_module': {m: [c['path'] for c in sorted(fs, key=lambda x: x['path'])] 
                                  for m, fs in sorted(candidates_by_module.items())},
        'skip_reasons': {r: sorted(fs) for r, fs in skip_reasons.items()},
        'all_candidates': sorted([c['path'] for c in candidates]),
    }
    
    output_path = "/Users/air/TOPEMS/apps/web/scripts/crud_candidates_result_v2.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 详细结果已保存到: {output_path}")
    print(f"\n📊 预计可迁移总数: {len(candidates)} 个文件")
    print(f"    已迁移: {len(migrated_in_pages)} 个文件")
    print(f"    待迁移: {len(candidates)} 个文件")
    print(f"    总潜力: {len(migrated_in_pages) + len(candidates)} 个文件")


if __name__ == '__main__':
    main()
