#!/usr/bin/env python3
"""
精确分析 useCrudMutations 候选文件 - 最精确版
检查每个 mutation 的 onSuccess 是否有 addNotification + invalidateQueries
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


def find_matching_brace(text, start_pos):
    """从 start_pos 位置的 { 开始，找到匹配的 }"""
    if text[start_pos] != '{':
        return -1
    
    brace_count = 0
    pos = start_pos
    while pos < len(text):
        if text[pos] == '{':
            brace_count += 1
        elif text[pos] == '}':
            brace_count -= 1
            if brace_count == 0:
                return pos
        pos += 1
    return -1


def extract_mutations_detailed(content):
    """
    精确提取每个 mutation 的详细信息：
    - 变量名
    - onSuccess 函数体
    - onError 函数体
    """
    mutations = []
    
    # 找到所有 const xxx = useMutation( 的位置
    pattern = r'const\s+(\w+)\s*=\s*useMutation\s*\('
    for match in re.finditer(pattern, content):
        var_name = match.group(1)
        start_pos = match.end()
        
        # 找到配置对象的开始 {
        brace_start = content.find('{', start_pos)
        if brace_start == -1:
            continue
        
        # 找到配置对象的结束 }
        brace_end = find_matching_brace(content, brace_start)
        if brace_end == -1:
            continue
        
        config_text = content[brace_start:brace_end+1]
        
        # 提取 onSuccess 函数体
        on_success_body = None
        on_success_match = re.search(r'onSuccess\s*:\s*\(?[^)]*\)?\s*=>\s*\{', config_text)
        if on_success_match:
            success_brace_start = config_text.find('{', on_success_match.end() - 1)
            if success_brace_start != -1:
                success_brace_end = find_matching_brace(config_text, success_brace_start)
                if success_brace_end != -1:
                    on_success_body = config_text[success_brace_start:success_brace_end+1]
        
        # 提取 onError 函数体
        on_error_body = None
        on_error_match = re.search(r'onError\s*:\s*\(?[^)]*\)?\s*=>\s*\{', config_text)
        if on_error_match:
            error_brace_start = config_text.find('{', on_error_match.end() - 1)
            if error_brace_start != -1:
                error_brace_end = find_matching_brace(config_text, error_brace_start)
                if error_brace_end != -1:
                    on_error_body = config_text[error_brace_start:error_brace_end+1]
        
        mutations.append({
            'name': var_name,
            'on_success_body': on_success_body,
            'on_error_body': on_error_body,
        })
    
    return mutations


def has_crud_naming_patterns(mutation_names):
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


def get_crud_mutations(mutations):
    """获取 CRUD 相关的 mutation"""
    crud_keywords = ['create', 'add', 'update', 'edit', 'delete', 'remove']
    return [m for m in mutations if any(kw in m['name'].lower() for kw in crud_keywords)]


def extract_query_keys_from_body(body):
    """从函数体中提取被 invalidate 的 queryKey"""
    if not body:
        return set()
    
    pattern = r'queryClient\.invalidateQueries\s*\(\s*\{\s*queryKey\s*:\s*(\[[^\]]+\])'
    matches = re.findall(pattern, body)
    
    normalized = set()
    for key in matches:
        norm = re.sub(r'\s+', '', key)
        normalized.add(norm)
    
    return normalized


def has_optimistic_update(content):
    return 'setQueryData' in content or 'getQueryData' in content


def has_batch_operations(content):
    # 检查是否有 for 循环中调用 mutation
    for_pattern = r'for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+[^\)]+\)\s*\{'
    for match in re.finditer(for_pattern, content):
        brace_start = content.find('{', match.end() - 1)
        if brace_start != -1:
            brace_end = find_matching_brace(content, brace_start)
            if brace_end != -1:
                block = content[brace_start:brace_end]
                if re.search(r'\w+Mutation\.mutate', block):
                    return True
    
    # 检查 batch 命名的 mutation
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
    
    mutations = extract_mutations_detailed(content)
    mutation_count = len(mutations)
    mutation_names = [m['name'] for m in mutations]
    
    # 标准1: 至少 3 个独立 mutation
    if mutation_count < 3:
        return None, f'mutation数量不足3个({mutation_count}个)'
    
    # 标准2: 变量名包含 create/update/delete 等
    has_crud, crud_found = has_crud_naming_patterns(mutation_names)
    if not has_crud:
        missing = [k for k, v in crud_found.items() if not v]
        return None, f'缺少CRUD命名模式(缺少: {", ".join(missing)})'
    
    # 获取 CRUD mutations
    crud_mutations = get_crud_mutations(mutations)
    
    # 标准3: onSuccess 中有 addNotification + invalidateQueries
    # 至少有一个 CRUD mutation 满足
    success_complete = 0
    all_invalidated_keys = set()
    
    for mut in crud_mutations:
        if mut['on_success_body']:
            has_notify = 'addNotification' in mut['on_success_body']
            has_invalidate = 'invalidateQueries' in mut['on_success_body'] or 'queryClient.invalidateQueries' in mut['on_success_body']
            
            if has_notify and has_invalidate:
                success_complete += 1
            
            # 收集所有被失效的 queryKey
            keys = extract_query_keys_from_body(mut['on_success_body'])
            all_invalidated_keys.update(keys)
    
    if success_complete == 0:
        return None, 'onSuccess缺少通知+失效模式'
    
    # 标准4: onError 中有 addNotification 或 logger.error
    error_handled = 0
    for mut in crud_mutations:
        if mut['on_error_body']:
            has_notify = 'addNotification' in mut['on_error_body']
            has_logger = 'logger.error' in mut['on_error_body'] or 'apiLogger.error' in mut['on_error_body']
            if has_notify or has_logger:
                error_handled += 1
    
    if error_handled == 0:
        return None, 'onError缺少错误处理'
    
    # 标准6: 单一 queryKey 失效
    if len(all_invalidated_keys) > 1:
        return None, f'多queryKey失效({len(all_invalidated_keys)}个)'
    
    if len(all_invalidated_keys) == 0:
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
        'query_key_count': len(all_invalidated_keys),
        'success_complete': success_complete,
        'crud_mutation_count': len(crud_mutations),
        'error_handled': error_handled,
    }, None


def main():
    print("=" * 80)
    print("useCrudMutations 候选文件精确分析 - 最精确版")
    print("=" * 80)
    
    # 从 pages 目录中所有使用 useMutation 的文件开始
    all_mutation_files = find_files_with_pattern(PAGES_DIR, r'useMutation\s*\(')
    print(f"\n1. pages目录下使用 useMutation 的文件数: {len(all_mutation_files)}")
    
    # 排除已迁移文件
    migrated = USE_CRUD_MUTATIONS_FILES | USE_CRUD_OPERATIONS_FILES
    migrated_in_list = [f for f in all_mutation_files if f in migrated]
    remaining_files = [f for f in all_mutation_files if f not in migrated]
    print(f"2. 排除已迁移文件后剩余: {len(remaining_files)}")
    print(f"   - useCrudMutations: {sum(1 for f in migrated_in_list if f in USE_CRUD_MUTATIONS_FILES)} 个")
    print(f"   - useCrudOperations: {sum(1 for f in migrated_in_list if f in USE_CRUD_OPERATIONS_FILES)} 个")
    
    # 逐个分析
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
        'total_mutation_files': len(all_mutation_files),
        'migrated_files': len(migrated_in_list),
        'candidate_count': len(candidates),
        'candidates_by_module': {m: [c['path'] for c in sorted(fs, key=lambda x: x['path'])] 
                                  for m, fs in sorted(candidates_by_module.items())},
        'skip_reasons': {r: sorted(fs) for r, fs in skip_reasons.items()},
        'all_candidates': sorted([c['path'] for c in candidates]),
    }
    
    output_path = "/Users/air/TOPEMS/apps/web/scripts/crud_candidates_precise.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 详细结果已保存到: {output_path}")
    print(f"\n📊 统计汇总:")
    print(f"    pages目录总mutation文件: {len(all_mutation_files)}")
    print(f"    已迁移: {len(migrated_in_list)} 个")
    print(f"    符合条件可迁移: {len(candidates)} 个")
    print(f"    不符合条件: {total_skipped} 个")


if __name__ == '__main__':
    main()
