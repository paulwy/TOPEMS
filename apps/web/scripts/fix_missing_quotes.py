#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_missing_quotes():
    """查找所有有引号问题的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 查找有问题的模式
                    if 'variant="outline>' in content or 'variant="default>' in content or 'variant="secondary>' in content or 'variant="destructive>' in content:
                        files.append(filepath)
    return files

def fix_missing_quotes(content):
    """修复缺少的引号"""
    # 修复 variant="outline> 模式
    content = content.replace('variant="outline>', 'variant="outline">')
    content = content.replace('variant="default>', 'variant="default">')
    content = content.replace('variant="secondary>', 'variant="secondary">')
    content = content.replace('variant="destructive>', 'variant="destructive">')
    content = content.replace('color="error>', 'color="error">')
    
    return content

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复缺少的引号
    content = fix_missing_quotes(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with missing quotes...")
    files = find_files_with_missing_quotes()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()