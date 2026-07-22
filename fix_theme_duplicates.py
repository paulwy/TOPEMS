#!/usr/bin/env python3
"""
合并 theme.ts 中重复的 MUI 组件定义。
原有的组件定义在前，新增的赛博朋克样式在后，需要把赛博朋克样式合并到原定义的 styleOverrides 中。
"""

import re

with open('/Users/air/TOPEMS/apps/web/src/theme/theme.ts', 'r') as f:
    content = f.read()

# 找到赛博朋克区域的起始和结束标记
start_marker = '      // ========================================\n      // 赛博朋克主题专属样式覆盖\n      // 仅在 .cyberpunk-mode 下生效，不影响 light/dark\n      // ========================================'
end_marker = '      MuiCssBaseline: {'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print('ERROR: Could not find markers')
    exit(1)

# 提取赛博朋克区域的内容
cyber_section = content[start_idx + len(start_marker):end_idx]

# 提取所有组件定义
component_pattern = r'      (Mui\w+):\s*\{\s*styleOverrides:\s*\{'
components = re.findall(component_pattern, cyber_section)

print(f'Found {len(components)} components in cyberpunk section:')
for c in components:
    print(f'  - {c}')

# 检查哪些组件在原定义中已经存在
# 原定义在 start_marker 之前
before_section = content[:start_idx]
existing_components = set(re.findall(r'      (Mui\w+):\s*\{\s*styleOverrides:\s*\{', before_section))

print(f'\nExisting components before cyber section: {len(existing_components)}')
duplicates = [c for c in components if c in existing_components]
new_components = [c for c in components if c not in existing_components]
print(f'Duplicates: {len(duplicates)}')
print(f'New components: {len(new_components)}')
for c in duplicates:
    print(f'  DUP: {c}')
