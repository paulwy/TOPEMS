#!/usr/bin/env python3
"""
合并 theme.ts 中重复的 MUI 组件定义。
把赛博朋克区域的 styleOverrides 内容合并到原组件定义中。
"""

import re

with open('/Users/air/TOPEMS/apps/web/src/theme/theme.ts', 'r') as f:
    lines = content_lines = f.readlines()

content = ''.join(content_lines)

# 找到赛博朋克区域的起始和结束
start_marker = '      // ========================================\n      // 赛博朋克主题专属样式覆盖\n      // 仅在 .cyberpunk-mode 下生效，不影响 light/dark\n      // ========================================'
end_marker = '      MuiCssBaseline: {'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

cyber_section = content[start_idx + len(start_marker):end_idx]

# 解析赛博朋克区域的组件
# 每个组件以 "      MuiXxx: {" 开始，styleOverrides: { 是第一层，然后里面有各种选择器
# 我们需要把每个组件的 styleOverrides 里的内容提取出来

def extract_component_blocks(text):
    """从文本中提取 MUI 组件定义块，返回 {组件名: styleOverrides 内部内容}"""
    blocks = {}
    pattern = r'      (Mui\w+):\s*\{\s*styleOverrides:\s*\{'
    
    matches = list(re.finditer(pattern, text))
    
    for i, match in enumerate(matches):
        comp_name = match.group(1)
        start_pos = match.end()  # styleOverrides { 内部开始位置
        
        # 找到对应的闭合：从 start_pos 开始，跳过 { } 配对
        # 先找到 styleOverrides 的 {，然后找到它的 }
        brace_count = 1
        pos = start_pos
        while brace_count > 0 and pos < len(text):
            if text[pos] == '{':
                brace_count += 1
            elif text[pos] == '}':
                brace_count -= 1
            pos += 1
        
        # styleOverrides 的内部内容（不含外层大括号）
        inner_content = text[start_pos:pos-1].rstrip()
        
        # 还需要跳过组件的闭合 } 和后面的逗号
        # 找到组件块的结束
        # 组件块格式： MuiXxx: { styleOverrides: { ... } },
        # 所以 styleOverrides 的 } 之后还有一个组件的 }
        
        blocks[comp_name] = inner_content
    
    return blocks

cyber_blocks = extract_component_blocks(cyber_section)
print(f'Extracted {len(cyber_blocks)} cyberpunk component blocks')

# 现在需要把这些内容合并到原定义中
# 策略：对每个重复组件，找到其原定义中的 styleOverrides { ... }，在闭合之前插入赛博朋克样式

before_content = content[:start_idx]

def merge_cyber_into_original(original_text, comp_name, cyber_inner):
    """把赛博朋克样式合并到原组件的 styleOverrides 中"""
    # 找到组件定义
    pattern = rf'(      {re.escape(comp_name)}:\s*\{{\s*styleOverrides:\s*\{{)'
    match = re.search(pattern, original_text)
    if not match:
        return original_text, False
    
    insert_pos = match.end()
    
    # 找到 styleOverrides 的闭合 }
    brace_count = 1
    pos = insert_pos
    while brace_count > 0 and pos < len(original_text):
        if original_text[pos] == '{':
            brace_count += 1
        elif original_text[pos] == '}':
            brace_count -= 1
        pos += 1
    
    # 在闭合 } 之前插入
    # cyber_inner 以换行结尾，需要适当缩进
    # 先给 cyber_inner 的每行增加缩进
    indented_cyber = ''
    for line in cyber_inner.split('\n'):
        if line.strip():
            indented_cyber += '            ' + line.lstrip() + '\n'
        else:
            indented_cyber += '\n'
    
    new_text = original_text[:pos-1] + indented_cyber + '            ' + original_text[pos-1:]
    return new_text, True

# 执行合并
merged_content = before_content
success_count = 0
fail_count = 0

for comp_name, cyber_inner in cyber_blocks.items():
    merged_content, ok = merge_cyber_into_original(merged_content, comp_name, cyber_inner)
    if ok:
        success_count += 1
    else:
        fail_count += 1
        # 新组件，直接追加到 components 末尾（在赛博朋克区域之前）
        # 我们需要找到 components 的闭合位置
        pass

print(f'Merged: {success_count}, New/skipped: {fail_count}')

# 新组件（如 MuiMenu）需要放到 components 对象中
# 找到原 components 中最后一个组件的位置，然后插入
# 简化方法：保留赛博朋克区域，但删除重复组件，只保留新组件

# 重建赛博朋克区域，只保留新组件
new_cyber_section = ''
for comp_name, cyber_inner in cyber_blocks.items():
    if comp_name not in set(re.findall(r'      (Mui\w+):\s*\{\s*styleOverrides:\s*\{', before_content)):
        new_cyber_section += f'      {comp_name}: {{\n        styleOverrides: {{\n'
        new_cyber_section += cyber_inner
        new_cyber_section += '        },\n      },\n'

# 最终内容：合并后的 before + 赛博朋克标记 + 新组件 + MuiCssBaseline + 后续
final_content = merged_content + start_marker + '\n' + new_cyber_section + content[end_idx:]

# 写回文件
with open('/Users/air/TOPEMS/apps/web/src/theme/theme.ts', 'w') as f:
    f.write(final_content)

print('Done! File written.')
