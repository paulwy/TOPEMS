#!/usr/bin/env python3
"""
分析 useCrudMutations 候选文件
从 100 个 useMutation 文件中精确筛选符合"标准 CRUD 三件套模式"的文件
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

SRC_DIR = "/Users/air/TOPEMS/apps/web/src"

# 已迁移文件（排除定义文件和导出文件）
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


def find_files_with_pattern(directory, pattern):
    """查找包含指定模式的文件"""
    result = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, directory)
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


def count_mutation_variables(content):
    """统计 useMutation 调用次数和独立 mutation 变量"""
    # 匹配 useMutation 调用
    mutation_calls = re.findall(r'(\w+)\s*=\s*useMutation\s*\(', content)
    # 也匹配 const { mutate: xxx } = useMutation(...) 这种解构形式
    destructured = re.findall(r'const\s*\{\s*[^}]*\}\s*=\s*useMutation\s*\(', content)
    
    return len(mutation_calls) + len(destructured), mutation_calls


def has_crud_naming_patterns(mutation_vars, content):
    """检查是否有 create/update/delete 等命名模式"""
    patterns = {
        'create': ['create', 'add', 'new', 'insert'],
        'update': ['update', 'edit', 'modify', 'change'],
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


def has_on_success_pattern(content):
    """检查 onSuccess 中是否有 addNotification + invalidateQueries"""
    # 查找 onSuccess 块
    on_success_blocks = re.findall(r'onSuccess\s*:\s*\(?[^)]*\)?\s*=>\s*\{([^}]+)\}', content, re.DOTALL)
    
    for block in on_success_blocks:
        has_notify = 'addNotification' in block
        has_invalidate = 'invalidateQueries' in block
        if has_notify and has_invalidate:
            return True
    
    # 也检查简写形式
    if 'addNotification' in content and 'invalidateQueries' in content:
        return True
    
    return False


def has_on_error_pattern(content):
    """检查 onError 中是否有 addNotification 或 logger.error"""
    on_error_blocks = re.findall(r'onError\s*:\s*\(?[^)]*\)?\s*=>\s*\{([^}]+)\}', content, re.DOTALL)
    
    for block in on_error_blocks:
        if 'addNotification' in block or 'logger.error' in block or 'apiLogger.error' in block:
            return True
    
    # 也检查整体
    if 'addNotification' in content or 'logger.error' in content or 'apiLogger.error' in content:
        return True
    
    return False


def count_query_keys_invalidated(content):
    """统计失效的 queryKey 数量"""
    # 匹配 invalidateQueries 调用
    invalidate_calls = re.findall(r'invalidateQueries\s*\(\s*\{?\s*queryKey\s*:', content)
    return len(invalidate_calls)


def has_optimistic_update(content):
    """检查是否有乐观更新（setQueryData / getQueryData）"""
    return 'setQueryData' in content or 'getQueryData' in content


def has_batch_operations(content):
    """检查是否有批量操作（for 循环 + mutation 调用）"""
    # 简单模式：检查 for 循环和 mutate 调用的组合
    has_for_loop = bool(re.search(r'\bfor\s*\(', content))
    has_mutate = '.mutate' in content
    
    if has_for_loop and has_mutate:
        # 更精确地检查：在 for 循环内部是否有 mutate 调用
        # 这是一个简化检查
        for_blocks = re.findall(r'\bfor\s*\([^)]+\)\s*\{([^}]+)\}', content, re.DOTALL)
        for block in for_blocks:
            if '.mutate' in block or 'mutation.mutate' in block:
                return True
    
    return False


def get_module_from_path(rel_path):
    """从路径中提取模块名"""
    parts = Path(rel_path).parts
    if len(parts) >= 2 and parts[0] == 'pages':
        return parts[1]
    return 'other'


def main():
    print("=" * 80)
    print("useCrudMutations 候选文件分析")
    print("=" * 80)
    
    # 1. 获取所有使用 useMutation 的文件
    all_mutation_files = find_files_with_pattern(SRC_DIR, r'useMutation\s*\(')
    print(f"\n1. 使用 useMutation 的文件总数: {len(all_mutation_files)}")
    
    # 2. 排除已使用 useCrudMutations / useCrudOperations 的文件
    migrated = USE_CRUD_MUTATIONS_FILES | USE_CRUD_OPERATIONS_FILES
    remaining_files = [f for f in all_mutation_files if f not in migrated]
    print(f"2. 排除已迁移文件后剩余: {len(remaining_files)}")
    print(f"   - useCrudMutations: {len(USE_CRUD_MUTATIONS_FILES)} 个文件")
    print(f"   - useCrudOperations: {len(USE_CRUD_OPERATIONS_FILES)} 个文件")
    
    # 3. 逐个分析剩余文件
    candidates = []
    skip_reasons = defaultdict(list)
    
    for rel_path in remaining_files:
        content = read_file_content(rel_path)
        if not content:
            skip_reasons['无法读取'].append(rel_path)
            continue
        
        mutation_count, mutation_vars = count_mutation_variables(content)
        
        # 标准1: 至少 3 个独立 mutation 变量
        if mutation_count < 3:
            skip_reasons['mutation数量不足3个'].append(rel_path)
            continue
        
        # 标准2: 变量名包含 create/update/delete 等
        has_crud, crud_found = has_crud_naming_patterns(mutation_vars, content)
        if not has_crud:
            skip_reasons['缺少CRUD命名模式'].append(rel_path)
            continue
        
        # 标准3: onSuccess 中有 addNotification + invalidateQueries
        if not has_on_success_pattern(content):
            skip_reasons['缺少onSuccess通知+失效模式'].append(rel_path)
            continue
        
        # 标准4: onError 中有 addNotification 或 logger.error
        if not has_on_error_pattern(content):
            skip_reasons['缺少onError处理模式'].append(rel_path)
            continue
        
        # 标准6: 单一 queryKey 失效
        query_key_count = count_query_keys_invalidated(content)
        if query_key_count > 1:
            skip_reasons[f'多queryKey失效({query_key_count}个)'].append(rel_path)
            continue
        
        # 标准7: 无乐观更新
        if has_optimistic_update(content):
            skip_reasons['存在乐观更新'].append(rel_path)
            continue
        
        # 标准8: 无批量操作
        if has_batch_operations(content):
            skip_reasons['存在批量操作'].append(rel_path)
            continue
        
        # 符合所有条件
        candidates.append({
            'path': rel_path,
            'module': get_module_from_path(rel_path),
            'mutation_count': mutation_count,
            'mutation_vars': mutation_vars,
        })
    
    # 4. 输出结果
    print(f"\n3. 候选文件数量: {len(candidates)}")
    
    # 按模块分组
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
            print(f"     mutation变量: {', '.join(c['mutation_vars'][:5])}")
    
    # 5. 跳过原因统计
    print(f"\n{'=' * 80}")
    print("跳过原因统计")
    print(f"{'=' * 80}")
    
    for reason, files in sorted(skip_reasons.items(), key=lambda x: -len(x[1])):
        print(f"\n❌ {reason}: {len(files)} 个文件")
        for f in sorted(files)[:5]:
            print(f"   - {f}")
        if len(files) > 5:
            print(f"   ... 还有 {len(files) - 5} 个文件")
    
    # 6. 优先迁移建议
    print(f"\n{'=' * 80}")
    print("优先迁移建议")
    print(f"{'=' * 80}")
    
    module_counts = [(m, len(fs)) for m, fs in candidates_by_module.items()]
    module_counts.sort(key=lambda x: -x[1])
    
    print("\n按模块文件数排序（建议优先迁移文件数多的模块）:")
    for i, (module, count) in enumerate(module_counts[:10], 1):
        print(f"  {i}. {module}: {count} 个文件")
    
    # 7. 输出 JSON 格式便于后续处理
    output = {
        'total_mutation_files': len(all_mutation_files),
        'migrated_files': len(migrated),
        'candidate_count': len(candidates),
        'candidates_by_module': {m: [c['path'] for c in fs] for m, fs in candidates_by_module.items()},
        'skip_reasons': {r: fs for r, fs in skip_reasons.items()},
        'all_candidates': [c['path'] for c in candidates],
    }
    
    output_path = "/Users/air/TOPEMS/apps/web/scripts/crud_candidates_result.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细结果已保存到: {output_path}")
    print(f"\n预计可迁移总数: {len(candidates)} 个文件")


if __name__ == '__main__':
    main()
