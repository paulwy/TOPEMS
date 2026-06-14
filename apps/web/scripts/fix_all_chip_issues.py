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
                    # 查找有问题的模式
                    if '<Chip' in content:
                        # 检查是否有缺少闭合花括号或引号的情况
                        lines = content.split('\n')
                        for line in lines:
                            if '<Chip' in line:
                                # 检查是否有不平衡的花括号
                                if line.count('{') != line.count('}'):
                                    files.append(filepath)
                                    break
                                # 检查是否有缺少闭合引号的三元表达式
                                if '?' in line and ':' in line:
                                    # 检查引号平衡
                                    if line.count('"') % 2 != 0 or line.count("'") % 2 != 0:
                                        files.append(filepath)
                                        break
    return list(set(files))

def fix_chip_line(line):
    """修复单行中的 Chip 问题"""
    if '<Chip' not in line:
        return line
    
    # 检查并修复花括号平衡
    open_braces = line.count('{')
    close_braces = line.count('}')
    
    if open_braces > close_braces:
        # 添加缺少的闭合花括号
        line = line.rstrip() + '}' * (open_braces - close_braces)
    elif close_braces > open_braces:
        # 移除多余的闭合花括号（这比较复杂，简单处理）
        line = line.rstrip()
        # 从末尾移除多余的 }
        extra = close_braces - open_braces
        while extra > 0 and line.endswith('}'):
            line = line[:-1]
            extra -= 1
    
    return line

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    changed = False
    new_lines = []
    
    for line in lines:
        original_line = line
        line = fix_chip_line(line)
        if line != original_line:
            changed = True
        new_lines.append(line)
    
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with Chip issues...")
    files = find_files_with_chip_issues()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()