#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_extra_braces():
    """查找所有有多余花括号的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 查找有问题的模式 - 可能有空格
                    if re.search(r'\)\s*\}\s*\}\s*,', content):
                        files.append(filepath)
    return files

def fix_extra_braces(content):
    """修复多余的花括号"""
    # 修复 ) }} 模式
    content = re.sub(r'\)\s*\}\s*\}\s*,', '),', content)
    
    return content

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复多余的花括号
    content = fix_extra_braces(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with extra braces...")
    files = find_files_with_extra_braces()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()