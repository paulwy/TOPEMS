#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

def find_files_with_duplicate_imports():
    """查找所有有重复 MUI 导入的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if content.count('from "@mui/material"') > 1:
                        files.append(filepath)
    return files

def remove_duplicate_mui_imports(content):
    """移除重复的 MUI 导入，保留一个完整的导入"""
    lines = content.split('\n')
    mui_imports = []
    other_lines = []
    
    for line in lines:
        if 'from "@mui/material"' in line:
            mui_imports.append(line)
        else:
            other_lines.append(line)
    
    if mui_imports:
        # 获取所有导入的组件
        all_components = set()
        for imp in mui_imports:
            match = re.match(r'import \{([^}]*)\} from "@mui/material";', imp)
            if match:
                components = [c.strip() for c in match.group(1).split(',')]
                all_components.update(components)
        
        # 创建一个完整的导入语句
        full_import = 'import { ' + ', '.join(sorted(all_components)) + ' } from "@mui/material";'
        
        # 在文件开头添加导入
        result = [full_import] + other_lines
    else:
        result = other_lines
    
    return '\n'.join(result)

def fix_button_ghost(content):
    """修复 Button variant="ghost" 问题"""
    content = content.replace('Button variant="ghost"', 'Button variant="text"')
    content = content.replace("Button variant='ghost'", "Button variant='text'")
    return content

def fix_chip_with_children(content):
    """修复 Chip 组件的 children 问题"""
    # 处理 <Chip size="small" className="xxx"><icon/>text</Chip> 这种情况
    # 需要把 children 转换为 icon 和 label 属性
    
    # 匹配 <Chip ...>...</Chip> 模式
    def replace_chip(match):
        attrs = match.group(1)
        children = match.group(2).strip()
        
        # 检查是否有图标和文本
        icon_match = re.match(r'<(\w+)\s*[^>]*>\s*([^<]*)\s*</\1>', children)
        if icon_match:
            icon_name = icon_match.group(1)
            text = icon_match.group(2).strip()
            # 创建新的 Chip 标签，使用 icon 属性
            return '<Chip ' + attrs + ' icon={<' + icon_name + ' className="w-3 h-3" />} label="' + text + '" />'
        else:
            # 只有文本，使用 label 属性
            return '<Chip ' + attrs + ' label="' + children + '" />'
    
    content = re.sub(r'<Chip([^>]*)>([^<]*)</Chip>', replace_chip, content)
    return content

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 移除重复的 MUI 导入
    content = remove_duplicate_mui_imports(content)
    
    # 修复 Button variant="ghost"
    content = fix_button_ghost(content)
    
    # 修复 Chip 的 children 问题
    content = fix_chip_with_children(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with duplicate MUI imports...")
    files = find_files_with_duplicate_imports()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nFix complete!")

if __name__ == "__main__":
    main()