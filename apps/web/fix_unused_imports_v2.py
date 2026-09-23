#!/usr/bin/env python3
"""
自动修复未使用的导入（支持多行导入）
"""

import re
import subprocess
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
            # 排除 catch 错误参数和函数参数
            if 'caught errors' not in line and 'unused args' not in line:
                unused_imports[current_file].append(var_name)
    
    return unused_imports

def fix_file(file_path, unused_vars):
    """修复单个文件"""
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        modified = False
        new_lines = []
        in_import_block = False
        import_block_vars = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # 检查是否是导入块开始
            if re.match(r'^import\s*\{', line):
                in_import_block = True
                import_block_vars = []
                new_lines.append(line)
                i += 1
                continue
            
            # 检查是否在导入块中
            if in_import_block:
                # 检查是否是导入块结束
                if re.match(r'^\s*\}\s*from', line):
                    in_import_block = False
                    
                    # 过滤掉未使用的变量
                    filtered_vars = [v for v in import_block_vars if v not in unused_vars]
                    
                    if len(filtered_vars) == 0:
                        # 整个导入块都未使用，删除整个导入块
                        new_lines.pop()  # 删除导入块开始行
                        # 同时删除前面的导入块开始行
                        while new_lines and not re.match(r'^import\s*\{', new_lines[-1]):
                            new_lines.pop()
                        if new_lines:
                            new_lines.pop()  # 删除导入块开始行
                        modified = True
                    elif len(filtered_vars) != len(import_block_vars):
                        # 有部分未使用，重写导入块
                        # 删除之前添加的导入块开始行和内容
                        while new_lines and not re.match(r'^import\s*\{', new_lines[-1]):
                            new_lines.pop()
                        if new_lines:
                            new_lines.pop()
                        
                        # 写入新的导入块
                        new_lines.append('import {\n')
                        for var in filtered_vars:
                            new_lines.append(f'  {var},\n')
                        new_lines.append(line)
                        modified = True
                    else:
                        # 没有未使用的，保留原来的内容
                        for var in import_block_vars:
                            # 找到原来的行
                            pass
                        new_lines.append(line)
                    
                    i += 1
                    continue
                
                # 提取变量名
                match = re.match(r'^\s*(\w+),?\s*$', line)
                if match:
                    var_name = match.group(1)
                    import_block_vars.append(var_name)
                    
                    # 检查是否是未使用的
                    if var_name in unused_vars:
                        modified = True
                        i += 1
                        continue
                
                new_lines.append(line)
                i += 1
                continue
            
            # 普通行
            new_lines.append(line)
            i += 1
        
        if modified:
            with open(file_path, 'w') as f:
                f.writelines(new_lines)
            print(f"✅ 修复: {file_path}")
            return True
        else:
            return False
    
    except Exception as e:
        print(f"❌ 错误: {file_path}: {e}")
        import traceback
        traceback.print_exc()
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
