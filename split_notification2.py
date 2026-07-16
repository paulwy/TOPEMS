#!/usr/bin/env python3
"""
拆分 notification.rs 为多个子模块 - v2
"""

# 读取原始文件
with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification.rs', 'r') as f:
    content = f.read()
    lines = content.split('\n')

print(f"Total lines: {len(lines)}")

# 先删除原文件开头的 doc comment 和 imports
doc_comment = lines[0]  # //! Notification submodule - Notification handlers with database support
print(f"Doc comment: {doc_comment}")

# ===== 精确找到每个函数/结构体的起止行 =====
# 我们通过下一个 pub item 来确定当前 item 的结束位置

import re

# 收集所有 pub 项的起始行
pub_starts = []
for i, line in enumerate(lines):
    if re.match(r'^pub (struct|enum|async fn|fn) ', line):
        pub_starts.append((i+1, line.strip()))

print("\nPublic items start lines:")
for lineno, item in pub_starts:
    print(f"  {lineno}: {item}")

# 私有函数的起始行
private_starts = []
for i, line in enumerate(lines):
    if re.match(r'^(async fn|fn) ', line):
        private_starts.append((i+1, line.strip()))

print("\nPrivate functions start lines:")
for lineno, item in private_starts:
    print(f"  {lineno}: {item}")
