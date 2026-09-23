#!/usr/bin/env python3
"""
自动修复未使用的导入
"""

import re
import subprocess
import sys
from collections import defaultdict

def get_lint_output():
    """获取 ESLint 输出"""
    result = subprocess.run(
        ['pnpm', 'lint'],
        capture_output=True,
        text=True,
        cwd='/Users/xingzhai/TOPEMS/apps/web'
    )
    return result.stdout

def parse_unused_imports(lint_output):
    """解析未使用的导入"""
    unused_imports = defaultdict(list)  # {file: [var_name, ...]}
    
    current_file = None
    lines = lint_output.split('\n')
    
    for line in lines:
        # 匹配文件路径
        if line.startswith('/'):
            current_file = line.strip()
            continue
        
        # 匹配未使用的变量
        match = re.search(r"'(\w+)' is defined but never used", line)
        if match and current_file:
            var_name = match.group(1)
            unused_imports[current_file].append(var_name)
    
    return unused_imports

def fix_file(file_path, unused_vars):
    """修复单个文件"""
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        modified = False
        new_lines = []
        
        for line in lines:
            # 检查是否是导入语句
            is_import = line.strip().startswith('import ')
            
            if is_import:
                # 检查是否包含未使用的变量
                should_remove = False
                for var in unused_vars:
                    if re.search(rf'\b{var}\b', line):
                        should_remove = True
                        break
                
                if should_remove:
                    modified = True
                    continue
            
            new_lines.append(line)
        
        if modified:
            with open(file_path, 'w') as f:
                f.writelines(new_lines)
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
    
    print("🔍 正在解析未使用的导入...")
    unused_imports = parse_unused_imports(lint_output)
    
    print(f"📊 发现 {len(unused_imports)} 个文件有未使用的导入")
    
    total_fixed = 0
    for file_path, unused_vars in unused_imports.items():
        print(f"\n📄 {file_path}")
        print(f"   未使用的变量: {', '.join(unused_vars)}")
        
        if fix_file(file_path, unused_vars):
            total_fixed += 1
    
    print(f"\n🎉 完成！修复了 {total_fixed} 个文件")

if __name__ == '__main__':
    main()
