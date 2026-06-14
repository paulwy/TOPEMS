#!/usr/bin/env python3
import os

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_chip_problems():
    """查找所有有 Chip 问题的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 查找包含 label="{..." 模式的 Chip（可能包含嵌套引号）
                    if '<Chip' in content and 'label="{' in content:
                        files.append(filepath)
    return files

def fix_chip_line(line):
    """修复单行中的 Chip 问题"""
    if '<Chip' not in line or 'label="{' not in line:
        return line
    
    # 找到所有 label="{ 出现的位置
    while 'label="{' in line:
        label_start = line.find('label="{')
        if label_start == -1:
            break
        
        # 找到匹配的 }" (处理嵌套的花括号)
        depth = 1
        i = label_start + 8  # 跳过 'label="{'
        while i < len(line) and depth > 0:
            if line[i] == '{':
                depth += 1
            elif line[i] == '}':
                depth -= 1
            i += 1
        
        if depth == 0 and i <= len(line):
            # 找到了匹配的 }
            expression = line[label_start + 7:i-1]  # 提取 {...}
            # 移除 label="{...}" 部分
            line = line[:label_start] + line[i:]
            # 在 Chip 标签末尾添加 children
            # 找到 /> 或 > 的位置
            chip_end = line.find('/>', label_start)
            if chip_end != -1:
                line = line[:chip_end] + '>' + expression + '</Chip>'
            else:
                # 找到 > 的位置
                chip_end = line.find('>', label_start)
                if chip_end != -1:
                    line = line[:chip_end] + '>' + expression + '</Chip>'
    
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
    print("Finding files with Chip nested expression issues...")
    files = find_files_with_chip_problems()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()