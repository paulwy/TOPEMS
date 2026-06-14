#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_chip_final_issues():
    """查找所有有 Chip 最终问题的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 查找有问题的模式
                    if '</Chip>}' in content or '</Chip>    );}}' in content:
                        files.append(filepath)
    return files

def fix_chip_final_issues(content):
    """修复 Chip 的最终问题"""
    # 修复 </Chip>} 模式 - 移除多余的花括号
    content = content.replace('</Chip>}', '</Chip>')
    
    # 修复 </Chip>    );}} 模式
    content = content.replace('</Chip>    );}}', '</Chip>    );')
    
    # 修复可能缺少的闭合花括号在表达式中
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        if '<Chip' in line and '</Chip>' in line:
            # 检查表达式中的花括号平衡
            # 找到 Chip 标签内的内容
            chip_start = line.find('<Chip')
            chip_end = line.find('</Chip>')
            
            if chip_start != -1 and chip_end != -1:
                chip_content = line[chip_start:chip_end]
                
                # 统计花括号
                open_braces = chip_content.count('{')
                close_braces = chip_content.count('}')
                
                if open_braces > close_braces:
                    # 在 </Chip> 前添加缺少的花括号
                    line = line[:chip_end] + '}' * (open_braces - close_braces) + line[chip_end:]
        
        new_lines.append(line)
    
    return '\n'.join(new_lines)

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复问题
    content = fix_chip_final_issues(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with final Chip issues...")
    files = find_files_with_chip_final_issues()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()