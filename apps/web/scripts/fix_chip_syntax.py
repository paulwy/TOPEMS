#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_chip():
    """查找所有使用 Chip 的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if '<Chip' in content:
                        files.append(filepath)
    return files

def fix_chip_syntax(content):
    """修复 Chip 组件的语法问题"""
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        if '<Chip' in line:
            # 确保 Chip 标签正确闭合
            # 查找所有 <Chip ...> 模式并确保有正确的闭合
            while '<Chip' in line:
                # 找到 <Chip 的位置
                chip_start = line.find('<Chip')
                
                # 找到对应的 > 或 />
                # 处理可能的嵌套花括号
                depth = 0
                i = chip_start
                found_end = False
                while i < len(line):
                    if line[i] == '{':
                        depth += 1
                    elif line[i] == '}':
                        depth -= 1
                    elif line[i] == '>' and depth == 0:
                        # 找到标签结束
                        found_end = True
                        break
                    i += 1
                
                if found_end and i < len(line):
                    # 检查是否已经有闭合标签
                    if '/>' in line[chip_start:i+1]:
                        # 自闭合标签，需要改为非自闭合并添加 children 和闭合标签
                        # 找到 /> 的位置
                        self_close_pos = line.find('/>', chip_start, i+1)
                        if self_close_pos != -1:
                            # 替换 /> 为 >
                            line = line[:self_close_pos] + '>' + line[self_close_pos+2:]
                    # 确保有闭合标签
                    if '</Chip>' not in line:
                        # 添加闭合标签
                        # 找到行尾并添加
                        line = line.rstrip() + '</Chip>'
            
            # 检查花括号平衡
            open_braces = line.count('{')
            close_braces = line.count('}')
            
            if open_braces > close_braces:
                line = line.rstrip() + '}' * (open_braces - close_braces)
            elif close_braces > open_braces:
                # 移除多余的闭合花括号
                line = line.rstrip()
                extra = close_braces - open_braces
                while extra > 0 and line.endswith('}'):
                    line = line[:-1]
                    extra -= 1
        
        new_lines.append(line)
    
    return '\n'.join(new_lines)

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复语法问题
    content = fix_chip_syntax(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with Chip components...")
    files = find_files_with_chip()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()