#!/usr/bin/env python3
"""调试 onSuccess 匹配"""

import re

SRC_DIR = "/Users/air/TOPEMS/apps/web/src"

with open(f"{SRC_DIR}/pages/mes/ProcessFlowPage.tsx", 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 createMutation 那段
start = content.find('const createMutation = useMutation')
end = content.find('const updateMutation = useMutation')
create_block = content[start:end]

print("createMutation 块:")
print("-" * 60)
print(create_block[:500])
print("-" * 60)

# 测试不同的正则模式
patterns = [
    (r'onSuccess\s*:\s*\(?[^)]*\)?\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}', '模式1'),
    (r'onSuccess\s*:\s*\(\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}', '模式2'),
    (r'onSuccess.*?=>\s*\{', '模式3(简单)'),
]

for pattern, name in patterns:
    matches = re.findall(pattern, create_block, re.DOTALL)
    print(f"\n{name}: 找到 {len(matches)} 个匹配")
    if matches:
        for i, m in enumerate(matches):
            if isinstance(m, tuple):
                m = m[0]
            print(f"  [{i}] 长度: {len(m)}")
            print(f"      内容预览: {m[:100]}...")

# 直接搜索 onSuccess
on_success_pos = create_block.find('onSuccess')
print(f"\nonSuccess 位置: {on_success_pos}")
if on_success_pos >= 0:
    print(f"周围内容: {create_block[on_success_pos:on_success_pos+200]}")
