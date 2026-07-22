#!/usr/bin/env python3
"""调试脚本：检查 mutation 块提取"""

import re

SRC_DIR = "/Users/air/TOPEMS/apps/web/src"

test_files = [
    "pages/mes/ProcessFlowPage.tsx",
    "pages/crm/CustomerManagementPage.tsx",
    "pages/wms/BatchManagementPage.tsx",
]

for rel_path in test_files:
    print(f"\n{'='*60}")
    print(f"文件: {rel_path}")
    print(f"{'='*60}")
    
    with open(f"{SRC_DIR}/{rel_path}", 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 简单统计 useMutation 出现次数
    count = len(re.findall(r'useMutation\s*\(', content))
    print(f"useMutation 出现次数: {count}")
    
    # 提取 mutation 变量名
    pattern1 = re.findall(r'const\s+(\w+)\s*=\s*useMutation\s*\(', content)
    print(f"const xxx = useMutation 形式: {pattern1}")
    
    # 尝试提取配置块
    pattern = r'const\s+(\w+)\s*=\s*useMutation\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)'
    matches = list(re.finditer(pattern, content, re.DOTALL))
    print(f"提取到的 mutation 块数量: {len(matches)}")
    
    for i, match in enumerate(matches):
        name = match.group(1)
        config = match.group(2)
        print(f"\n  [{i}] {name}")
        print(f"      配置长度: {len(config)} 字符")
        
        # 检查 onSuccess
        on_success_pattern = r'onSuccess\s*:\s*\(?[^)]*\)?\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
        on_success_match = re.search(on_success_pattern, config, re.DOTALL)
        if on_success_match:
            on_success_body = on_success_match.group(1)
            has_notify = 'addNotification' in on_success_body
            has_invalidate = 'invalidateQueries' in on_success_body
            print(f"      onSuccess: 有通知={has_notify}, 有失效={has_invalidate}")
        else:
            print(f"      onSuccess: 未找到")
