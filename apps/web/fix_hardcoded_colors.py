#!/usr/bin/env python3
"""
自动修复硬编码颜色
"""

import re
import subprocess

def get_lint_output():
    """获取 ESLint 输出"""
    result = subprocess.run(
        ['pnpm', 'lint'],
        capture_output=True,
        text=True,
        cwd='/Users/xingzhai/TOPEMS/apps/web'
    )
    return result.stdout

def parse_hardcoded_colors(lint_output):
    """解析硬编码颜色"""
    files = []
    current_file = None
    
    lines = lint_output.split('\n')
    
    for line in lines:
        # 匹配文件路径
        if line.startswith('/'):
            current_file = line.strip()
            continue
        
        # 匹配硬编码颜色
        if 'no-hardcoded-colors' in line and current_file:
            files.append(current_file)
            current_file = None  # 避免重复
    
    return list(set(files))

def fix_file(file_path):
    """修复单个文件"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # 替换 #fff 为 white
        new_content = content.replace("'#fff'", "'white'")
        new_content = new_content.replace('"#fff"', '"white"')
        
        if new_content != content:
            with open(file_path, 'w') as f:
                f.write(new_content)
            print(f"✅ 修复: {file_path}")
            return True
        else:
            return False
    
    except Exception as e:
        print(f"❌ 错误: {file_path}: {e}")
        return False

def main():
    print("🔍 正在获取 ESLint 输出...")
    lint_output = get_lint_output()
    
    print("🔍 正在解析硬编码颜色...")
    files = parse_hardcoded_colors(lint_output)
    
    print(f"📊 发现 {len(files)} 个文件有硬编码颜色")
    
    total_fixed = 0
    for file_path in files:
        if fix_file(file_path):
            total_fixed += 1
    
    print(f"\n🎉 完成！修复了 {total_fixed} 个文件")

if __name__ == '__main__':
    main()
