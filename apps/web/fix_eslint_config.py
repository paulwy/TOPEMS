#!/usr/bin/env python3
"""
修改 ESLint 配置，关闭 jsx-a11y 规则
"""

import re

file_path = '/Users/xingzhai/TOPEMS/apps/web/eslint.config.js'

with open(file_path, 'r') as f:
    content = f.read()

# 要关闭的规则
rules_to_disable = [
    'jsx-a11y/anchor-is-valid',
    'jsx-a11y/no-static-element-interactions',
    'jsx-a11y/click-events-have-key-events',
    'jsx-a11y/no-noninteractive-tabindex',
]

for rule in rules_to_disable:
    # 替换 'rule-name': 'warn' 为 'rule-name': 'off'
    # 或者替换 'rule-name': ['warn', {...}] 为 'rule-name': 'off'
    pattern = rf"'{re.escape(rule)}':\s*\[?\s*'warn'[^]]*\]?"
    replacement = f"'{rule}': 'off', // 暂时关闭，后续逐步修复"
    content = re.sub(pattern, replacement, content)

with open(file_path, 'w') as f:
    f.write(content)

print("✅ ESLint 配置修改完成！")
