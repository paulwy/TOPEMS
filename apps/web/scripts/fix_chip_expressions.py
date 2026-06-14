#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_chip_issues():
    """查找所有有 Chip 问题的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 查找包含 label="{...}" 模式的 Chip
                    if re.search(r'<Chip[^>]*label="\{[^"]*\}"', content):
                        files.append(filepath)
    return files

def fix_chip_expressions(content):
    """修复 Chip 的表达式问题"""
    # 查找所有 <Chip ... label="{...}" /> 模式
    # 当 label 包含表达式时，需要改为使用 children
    
    def replace_chip(match):
        full_match = match.group(0)
        attrs = match.group(1)
        expression = match.group(2)
        
        # 移除 label 属性，添加 children
        # 首先移除 label="..." 部分
        attrs_clean = re.sub(r'\s*label="\{[^"]*\}"', '', attrs)
        
        # 返回使用 children 的形式
        return f'<Chip{attrs_clean}>{expression}</Chip>'
    
    content = re.sub(r'<Chip([^>]*)label="(\{[^"]*\})" ?\/?>', replace_chip, content)
    
    return content

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复 Chip 表达式
    content = fix_chip_expressions(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with Chip expression issues...")
    files = find_files_with_chip_issues()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()