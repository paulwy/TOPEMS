#!/usr/bin/env python3
import os

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_chip_garbage():
    """查找所有有 Chip 垃圾字符的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 查找有问题的模式
                    if '" >{' in content or '"} >{' in content:
                        files.append(filepath)
    return files

def fix_chip_garbage(content):
    """修复 Chip 标签中的垃圾字符"""
    # 修复 " >{ 模式
    content = content.replace('" >{', '>{')
    content = content.replace('"} >{', '">{')
    
    # 修复缺少闭合花括号的情况
    # 查找 <Chip ...>{... 模式，确保有正确的闭合
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        # 查找 Chip 标签中可能缺少闭合花括号的情况
        if '<Chip' in line and '{' in line and line.count('{') > line.count('}'):
            # 统计花括号
            open_braces = line.count('{')
            close_braces = line.count('}')
            if open_braces > close_braces:
                # 添加缺少的闭合花括号
                line = line.rstrip() + '}' * (open_braces - close_braces)
        
        new_lines.append(line)
    
    return '\n'.join(new_lines)

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复垃圾字符
    content = fix_chip_garbage(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with Chip garbage characters...")
    files = find_files_with_chip_garbage()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()