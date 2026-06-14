#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

# shadcn Badge variant 到 MUI Chip variant 的映射
# shadcn: default, secondary, destructive, outline
# MUI Chip: filled, outlined
VARIANT_MAP = {
    'default': 'filled',
    'secondary': 'filled',
    'destructive': 'filled',
    'outline': 'outlined',
}

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

def fix_chip_variant(content):
    """修复 Chip 组件的 variant 值"""
    # 替换静态 variant 值
    for old_variant, new_variant in VARIANT_MAP.items():
        content = content.replace(f'variant="{old_variant}"', f'variant="{new_variant}"')
    
    # 处理动态 variant 值（如 variant={colors[status] || "outline"}）
    # 需要将表达式中的值也进行映射
    # 找到所有 variant={...} 的模式
    pattern = r'variant=\{([^}]+)\}'
    matches = re.findall(pattern, content)
    
    for match in matches:
        original_expr = match
        new_expr = match
        
        # 替换表达式中的字符串值
        for old_variant, new_variant in VARIANT_MAP.items():
            # 处理 "outline" 形式
            new_expr = new_expr.replace(f'"{old_variant}"', f'"{new_variant}"')
            # 处理 'outline' 形式
            new_expr = new_expr.replace(f"'{old_variant}'", f"'{new_variant}'")
        
        if new_expr != original_expr:
            content = content.replace(f'variant={{{original_expr}}}', f'variant={{{new_expr}}}')
    
    return content

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复 variant 值
    content = fix_chip_variant(content)
    
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