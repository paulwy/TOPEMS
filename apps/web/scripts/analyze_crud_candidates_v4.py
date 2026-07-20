#!/usr/bin/env python3
"""
精确分析 useCrudMutations 候选文件 v4
使用行级 + 括号计数的方法提取 mutation 配置
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


def extract_mutation_info(content):
    """
    提取文件中所有 mutation 的信息：
    - 变量名
    - onSuccess 中是否有 addNotification
    - onSuccess 中是否有 invalidateQueries
    - onError 中是否有 addNotification 或 logger.error
    - 失效的 queryKey
    """
    lines = content.split('\n')
    mutations = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 查找 const xxx = useMutation(
        match = re.match(r'\s*const\s+(\w+)\s*=\s*useMutation\s*\(', line)
        if match:
            var_name = match.group(1)
            
            # 向前查找配置对象的开始 {
            config_start = -1
            j = i
            while j < len(lines) and j < i + 5:  # 最多向前找5行
                if '{' in lines[j]:
                    config_start = j
                    break
                j += 1
            
            if config_start == -1:
                i += 1
                continue
            
            # 使用括号计数找到配置对象的结束 }
            brace_count = 0
            config_lines = []
            found_first_brace = False
            k = config_start
            
            while k < len(lines):
                current_line = lines[k]
                for ch in current_line:
                    if ch == '{':
                        brace_count += 1
                        found_first_brace = True
                    elif ch == '}':
                        brace_count -= 1
                
                config_lines.append(current_line)
                
                if found_first_brace and brace_count == 0:
                    break
                k += 1
            
            config_text = '\n'.join(config_lines)
            
            # 分析 onSuccess
            on_success_info = analyze_on_success(config_text)
            
            # 分析 onError
            on_error_info = analyze_on_error(config_text)
            
            # 提取失效的 queryKey
            invalidated_keys = extract_invalidated_keys(config_text)
            
            mutations.append({
                'name': var_name,
                'on_success_has_notify': on_success_info['has_notify'],
                'on_success_has_invalidate': on_success_info['has_invalidate'],
                'on_error_has_notify': on_error_info['has_notify'],
                'on_error_has_logger': on_error_info['has_logger'],
                'invalidated_keys': invalidated_keys,
            })
            
            i = k + 1
            continue
        
        i += 1
    
    return mutations


def analyze_on_success(config_text):
    """分析 onSuccess 配置"""
    result = {'has_notify': False, 'has_invalidate': False}
    
    # 查找 onSuccess 块
    on_success_match = re.search(
        r'onSuccess\s*:\s*\(?[^)]*\)?\s*=>\s*\{',
        config_text,
        re.DOTALL
    )
    
    if not on_success_match:
        return result
    
    # 从 onSuccess 的 { 开始，找到对应的 }
    start_pos = config_text.find('{', on_success_match.end()) + 1
    if start_pos <= 0:
        return result
    
    brace_count = 1
    pos = start_pos
    while pos < len(config_text) and brace_count > 0:
        if config_text[pos] == '{':
            brace_count += 1
        elif config_text[pos] == '}':
            brace_count -= 1
        pos += 1
    
    on_success_body = config_text[start_pos:pos-1]
    
    result['has_notify'] = 'addNotification' in on_success_body
    result['has_invalidate'] = 'invalidateQueries' in on_success_body
    
    return result


def analyze_on_error(config_text):
    """分析 onError 配置"""
    result = {'has_notify': False, 'has_logger': False}
    
    on_error_match = re.search(
        r'onError\s*:\s*\(?[^)]*\)?\s*=>\s*\{',
        config_text,
        re.DOTALL
    )
    
    if not on_error_match:
        return result
    
    start_pos = config_text.find('{', on_error_match.end()) + 1
    if start_pos <= 0:
        return result
    
    brace_count = 1
    pos = start_pos
    while pos < len(config_text) and brace_count > 0:
        if config_text[pos] == '{':
            brace_count += 1
        elif config_text[pos] == '}':
            brace_count -= 1
        pos += 1
    
    on_error_body = config_text[start_pos:pos-1]
    
    result['has_notify'] = 'addNotification' in on_error_body
    result['has_logger'] = 'logger.error' in on_error_body or 'apiLogger.error' in on_error_body
    
    return result


def extract_invalidated_keys(config_text):
    """从配置中提取失效的 queryKey"""
    keys = set()
    
    # 在 onSuccess 中查找 invalidateQueries
    on_success_match = re.search(
        r'onSuccess\s*:\s*\(?[^)]*\)?\s*=>\s*\{',
        config_text,
        re.DOTALL
    )
    
    if not on_success_match:
        return keys
    
    start_pos = config_text.find('{', on_success_match.end()) + 1
    if start_pos <= 0:
        return keys
    
    brace_count = 1
    pos = start_pos
    while pos < len(config_text) and brace_count > 0:
        if config_text[pos] == '{':
            brace_count += 1
        elif config_text[pos] == '}':
            brace_count -= 1
        pos += 1
    
    on_success_body = config_text[start_pos:pos-1]
    
    # 查找所有 invalidateQueries 调用中的 queryKey
    pattern = r'invalidateQueries\s*\(\s*\{?\s*queryKey\s*:\s*(\[[^\]]+\])'
    matches = re.findall(pattern, on_success_body)
    
    for key in matches:
        normalized = re.sub(r'\s+', '', key)
        keys.add(normalized)
    
    return keys


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


def has_optimistic_update(mutations):
    """检查是否有乐观更新"""
    for mut in mutations:
        # 简化：检查 mutation 名中是否有 optimistic，或者配置中有 setQueryData
        pass
    return False  # 暂时简化，后面再精确检查


def has_batch_operations(content):
    """检查是否有批量操作"""
    for_pattern = r'\bfor\s*\([^)]+\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
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
    
    mutations = extract_mutation_info(content)
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
    
    # 获取 CRUD 相关的 mutation
    crud_keywords = ['create', 'add', 'update', 'edit', 'delete', 'remove']
    crud_mutations = [m for m in mutations if any(kw in m['name'].lower() for kw in crud_keywords)]
    
    # 标准3: onSuccess 中有 addNotification + invalidateQueries
    # 至少有一个 CRUD mutation 满足
    success_complete = 0
    for mut in crud_mutations:
        if mut['on_success_has_notify'] and mut['on_success_has_invalidate']:
            success_complete += 1
    
    if success_complete == 0:
        return None, 'onSuccess缺少通知+失效模式'
    
    # 标准4: onError 中有 addNotification 或 logger.error
    error_handled = 0
    for mut in crud_mutations:
        if mut['on_error_has_notify'] or mut['on_error_has_logger']:
            error_handled += 1
    
    if error_handled == 0:
        return None, 'onError缺少错误处理'
    
    # 标准6: 单一 queryKey 失效
    all_invalidated_keys = set()
    for mut in mutations:
        all_invalidated_keys.update(mut['invalidated_keys'])
    
    if len(all_invalidated_keys) > 1:
        return None, f'多queryKey失效({len(all_invalidated_keys)}个)'
    
    if len(all_invalidated_keys) == 0:
        return None, '无queryKey失效'
    
    # 标准7: 无乐观更新（简化检查：检查整个文件）
    if 'setQueryData' in content or 'getQueryData' in content:
        return None, '存在乐观更新(setQueryData/getQueryData)'
    
    # 标准8: 无批量操作
    if has_batch_operations(content):
        return None, '存在批量操作(for循环+mutation)'
    
    return {
        'path': rel_path,
        'module': get_module_from_path(rel_path),
        'mutation_count': mutation_count,
        'mutation_names': mutation_names,
        'query_key_count': len(all_invalidated_keys),
        'success_complete': success_complete,
        'crud_mutation_count': len(crud_mutations),
    }, None


def main():
    print("=" * 80)
    print("useCrudMutations 候选文件精确分析 v4")
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
    
    output_path = "/Users/air/TOPEMS/apps/web/scripts/crud_candidates_result_v4.json"
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
