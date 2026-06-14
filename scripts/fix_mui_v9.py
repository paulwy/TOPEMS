#!/usr/bin/env python3
"""
修复 MUI v9 API 兼容性问题的脚本
- 将 Stack 的 direction, alignItems, justifyContent, flexWrap 属性移入 sx prop
- 将 Typography 的 fontWeight 属性移入 sx prop
"""

import re
import sys

def fix_stack_props(content):
    """修复 Stack 组件的属性问题"""
    
    # 处理多行 Stack 标签
    # 模式: <Stack 后面跟着 direction, alignItems, justifyContent 等属性
    
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # 检查是否是 Stack 开始标签
        if '<Stack' in line and not '</Stack>' in line:
            # 收集完整的 Stack 标签（可能跨多行）
            stack_content = line
            indent_level = len(line) - len(line.lstrip())
            
            # 如果标签没有在同一行关闭，继续收集
            while '>' not in stack_content.split('<Stack')[1].split('>')[0] if '<Stack' in stack_content else True:
                i += 1
                if i >= len(lines):
                    break
                stack_content += '\n' + lines[i]
            
            # 提取属性
            props_to_move = {}
            remaining_props = []
            
            # 提取 direction
            direction_match = re.search(r'direction="([^"]*)"', stack_content)
            if direction_match:
                props_to_move['flexDirection'] = direction_match.group(1)
                stack_content = re.sub(r'\s*direction="[^"]*"', '', stack_content)
            
            # 提取 alignItems
            alignItems_match = re.search(r'alignItems="([^"]*)"', stack_content)
            if alignItems_match:
                props_to_move['alignItems'] = alignItems_match.group(1)
                stack_content = re.sub(r'\s*alignItems="[^"]*"', '', stack_content)
            
            # 提取 justifyContent
            justifyContent_match = re.search(r'justifyContent="([^"]*)"', stack_content)
            if justifyContent_match:
                props_to_move['justifyContent'] = justifyContent_match.group(1)
                stack_content = re.sub(r'\s*justifyContent="[^"]*"', '', stack_content)
            
            # 提取 flexWrap
            flexWrap_match = re.search(r'flexWrap="([^"]*)"', stack_content)
            if flexWrap_match:
                props_to_move['flexWrap'] = flexWrap_match.group(1)
                stack_content = re.sub(r'\s*flexWrap="[^"]*"', '', stack_content)
            
            # 提取 useFlexGap
            useFlexGap_match = re.search(r'useFlexGap=\{true\}', stack_content)
            if useFlexGap_match:
                stack_content = re.sub(r'\s*useFlexGap=\{true\}', '', stack_content)
            
            # 如果有需要移动的属性
            if props_to_move:
                # 检查是否已有 sx prop
                sx_match = re.search(r'sx=\{\{([^}]*)\}\}', stack_content)
                if sx_match:
                    # 合并到现有的 sx prop
                    existing_sx = sx_match.group(1)
                    new_props = ', '.join([f'{k}: "{v}"' for k, v in props_to_move.items()])
                    if existing_sx.strip():
                        updated_sx = f'{{ {existing_sx.strip()}, {new_props} }}'
                    else:
                        updated_sx = f'{{ {new_props} }}'
                    stack_content = re.sub(r'sx=\{\{[^}]*\}\}', f'sx={updated_sx}', stack_content)
                else:
                    # 添加新的 sx prop
                    sx_props = ', '.join([f'{k}: "{v}"' for k, v in props_to_move.items()])
                    # 在 > 或 /> 之前插入 sx prop
                    if '/>' in stack_content:
                        stack_content = stack_content.replace('/>', f' sx={{ {{ {sx_props} }} }} />')
                    else:
                        stack_content = stack_content.replace('>', f' sx={{ {{ {sx_props} }} }}>')
            
            result.append(stack_content)
        else:
            result.append(line)
        
        i += 1
    
    return '\n'.join(result)

def fix_typography_fontweight(content):
    """修复 Typography 组件的 fontWeight 属性问题"""
    
    # 处理 fontWeight="xxx" 模式
    def replace_fontweight(match):
        full_match = match.group(0)
        weight_value = match.group(1)
        
        # 检查是否已有 sx prop
        sx_match = re.search(r'sx=\{\{([^}]*)\}\}', full_match)
        if sx_match:
            # 合并到现有的 sx prop
            existing_sx = sx_match.group(1)
            if existing_sx.strip():
                updated_sx = f'{{ {existing_sx.strip()}, fontWeight: "{weight_value}" }}'
            else:
                updated_sx = f'{{ fontWeight: "{weight_value}" }}'
            result = re.sub(r'sx=\{\{[^}]*\}\}', f'sx={updated_sx}', full_match)
        else:
            # 添加新的 sx prop
            result = re.sub(r'\s*fontWeight="[^"]*"', f' sx={{ {{ fontWeight: "{weight_value}" }} }}', full_match)
        
        return result
    
    # 匹配 Typography 标签中的 fontWeight 属性
    pattern = r'<Typography[^>]*fontWeight="([^"]*)"[^>]*>'
    content = re.sub(pattern, replace_fontweight, content)
    
    return content

def main():
    if len(sys.argv) < 2:
        print("Usage: python fix_mui_v9.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 修复 Stack 属性
    content = fix_stack_props(content)
    
    # 修复 Typography fontWeight
    content = fix_typography_fontweight(content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed {file_path}")

if __name__ == '__main__':
    main()
