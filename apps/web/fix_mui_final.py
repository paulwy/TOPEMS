#!/usr/bin/env python3
import os
import glob

def find_closing_brace(s, start):
    """找到匹配的闭合大括号，处理嵌套"""
    depth = 1
    i = start
    while i < len(s) and depth > 0:
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
        i += 1
    return i - 1

def remove_prop(content, prop_name):
    """移除指定的属性"""
    result = []
    i = 0
    while i < len(content):
        # 查找属性名
        idx = content.find(f'{prop_name}=', i)
        if idx == -1:
            result.append(content[i:])
            break
        
        # 添加属性名之前的内容
        result.append(content[i:idx])
        
        # 找到属性值的开始
        if content[idx + len(prop_name) + 1] == '{':
            # 找到匹配的闭合大括号
            end = find_closing_brace(content, idx + len(prop_name) + 2)
            # 跳过属性（包括可能的前导逗号和空格）
            i = end + 1
            # 清理前面的逗号和空格
            if result and result[-1] and result[-1][-1] in ', ':
                result[-1] = result[-1].rstrip(', ')
        else:
            # 非大括号属性值
            i = idx + len(prop_name) + 1
    
    return ''.join(result)

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 移除各种不支持的属性
    props_to_remove = ['InputProps', 'PaperProps', 'inputProps', 'primaryTypographyProps', 'InputLabelProps']
    for prop in props_to_remove:
        content = remove_prop(content, prop)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
        return True
    return False

def main():
    src_dir = "/Users/air/TOPEMS/apps/web/src"
    
    for filepath in glob.glob(os.path.join(src_dir, "**/*.tsx"), recursive=True):
        if filepath.endswith(".bak"):
            continue
        
        fix_file(filepath)

if __name__ == "__main__":
    main()