#!/usr/bin/env python3
"""
自动修复 mes 模块 Option<String> → String 类型不匹配错误
主要修复模式：
1. Some(r.xxx) → r.xxx.unwrap_or_default()
2. r.xxx → r.xxx.unwrap_or_default()
"""

import re
import subprocess
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path("/Users/xingzhai/TOPEMS")

def get_error_files():
    """获取有错误的文件列表"""
    result = subprocess.run(
        ["grep", "-o", r"svc/mes/src/modules/[a-z_/]*\.rs", "/tmp/mes_check.log"],
        capture_output=True,
        text=True
    )
    files = list(set(result.stdout.strip().split("\n")))
    return [f for f in files if f.endswith(".rs")]

def fix_some_pattern(file_path):
    """修复 Some(r.xxx) → r.xxx.unwrap_or_default()"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # 模式1：Some(r.xxx) → r.xxx.unwrap_or_default()
    content = re.sub(r'Some\(r\.(\w+)\)', r'r.\1.unwrap_or_default()', content)
    
    # 模式2：Some(result.xxx) → result.xxx.unwrap_or_default()
    content = re.sub(r'Some\(result\.(\w+)\)', r'result.\1.unwrap_or_default()', content)
    
    with open(file_path, 'w') as f:
        f.write(content)

def main():
    print("开始自动修复 mes 模块 Option<String> → String 类型不匹配错误...")
    
    # 获取有错误的文件列表
    files = get_error_files()
    print(f"找到 {len(files)} 个有错误的文件")
    
    # 修复每个文件
    fixed_count = 0
    for file_rel in files:
        file_path = PROJECT_ROOT / file_rel
        if not file_path.exists():
            continue
        
        print(f"修复: {file_rel}")
        
        # 修复 Some(r.xxx) 模式
        fix_some_pattern(file_path)
        
        fixed_count += 1
    
    print(f"完成！修复了 {fixed_count} 个文件")
    print("请重新运行 cargo check 验证修复效果")

if __name__ == "__main__":
    main()
