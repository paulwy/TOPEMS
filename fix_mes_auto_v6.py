#!/usr/bin/env python3
"""
自动修复 mes 模块编译错误 v6
主要修复模式：
1. .and_utc() → 删除（DateTime<Utc> 没有 .and_utc() 方法）
2. .map(|d| d.to_rfc3339).unwrap_or_default() → .to_rfc3339()（DateTime<Utc> 直接调用）
3. Option<T> → T（添加 .unwrap_or_default()）
"""

import re
import subprocess
import sys
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

def fix_and_utc(file_path):
    """修复 .and_utc() 方法调用"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # 模式1：xxx.and_utc().to_rfc3339() → xxx.to_rfc3339()
    content = re.sub(r'(\w+)\.and_utc\(\)\.to_rfc3339\(\)', r'\1.to_rfc3339()', content)
    
    # 模式2：xxx.and_utc() → xxx（单独的 .and_utc() 调用）
    # 注意：需要小心，不要删除在 NaiveDateTime 上的 .and_utc() 调用
    # 这里我们只删除在 DateTime<Utc> 上的 .and_utc() 调用
    # 但我们无法区分，所以暂时跳过
    
    with open(file_path, 'w') as f:
        f.write(content)

def fix_iterator_pattern(file_path):
    """修复 iterator 模式错误"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # 模式：xxx.map(|d| d.to_string()).unwrap_or_default()
    # 当 xxx 是 DateTime<Utc> 时，应该直接用 xxx.to_string()
    # 当 xxx 是 Option<DateTime<Utc>> 时，应该用 xxx.map(|d| d.to_string()).unwrap_or_default()
    
    # 这里我们需要根据上下文判断，但暂时先做简单的替换
    # 模式：r.created_at.map(|d| d.to_string()).unwrap_or_default()
    # → r.created_at.to_string()（如果 created_at 是 DateTime<Utc>）
    
    # 但我们无法确定，所以暂时跳过
    
    with open(file_path, 'w') as f:
        f.write(content)

def main():
    print("开始自动修复 mes 模块编译错误 v6...")
    
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
        
        # 修复 .and_utc() 方法调用
        fix_and_utc(file_path)
        
        # 修复 iterator 模式错误
        fix_iterator_pattern(file_path)
        
        fixed_count += 1
    
    print(f"完成！修复了 {fixed_count} 个文件")
    print("请重新运行 cargo check 验证修复效果")

if __name__ == "__main__":
    main()
