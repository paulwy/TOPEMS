#!/usr/bin/env python3
"""
自动修复 MES 编译错误 v3
统一为 DateTime<Utc>（和数据库 schema timestamptz 一致）
"""

import re
import sys

def parse_errors(log_file):
    """解析 cargo check 输出，提取错误信息"""
    errors = []
    with open(log_file, 'r') as f:
        lines = f.readlines()
    
    i = 0
    while i < len(lines):
        line = lines[i]
        if 'error[E0308]: mismatched types' in line or 'error[E0599]' in line or 'error[E0605]' in line:
            # 提取文件位置（在下一行）
            file_match = re.search(r'-->\s+(.+?):(\d+):(\d+)', lines[i+1])
            if file_match:
                file_path = file_match.group(1)
                line_num = int(file_match.group(2))
                
                # 提取 expected/found
                expected = None
                found = None
                j = i + 1
                while j < len(lines) and j < i + 10:
                    if 'expected' in lines[j] and 'found' in lines[j]:
                        # 格式：expected `DateTime<Utc>`, found `NaiveDateTime`
                        exp_match = re.search(r'expected\s+(.+?),\s+found', lines[j])
                        found_match = re.search(r'found\s+(.+)', lines[j])
                        if exp_match:
                            expected = exp_match.group(1).strip()
                        if found_match:
                            found = found_match.group(1).strip()
                        break
                    j += 1
                
                errors.append({
                    'file': file_path,
                    'line': line_num,
                    'expected': expected,
                    'found': found,
                })
        i += 1
    
    return errors

def fix_error(file_path, line_num, expected, found):
    """修复单个错误"""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    if line_num - 1 >= len(lines):
        return False
    
    line = lines[line_num - 1]
    original_line = line
    
    # 模式 1：expected DateTime<Utc>, found NaiveDateTime
    if expected and 'DateTime<Utc>' in expected and found and 'NaiveDateTime' in found and 'Option' not in found:
        # 在变量后面加 .and_utc()
        # 例如：updated_at: updated_at, → updated_at: updated_at.and_utc(),
        line = re.sub(r'(\w+):\s*(\w+),', r'\1: \2.and_utc(),', line)
    
    # 模式 2：expected DateTime<Utc>, found Option<NaiveDateTime>
    elif expected and 'DateTime<Utc>' in expected and found and 'Option<NaiveDateTime>' in found:
        # 加 .and_then(|d| Some(d.and_utc())).unwrap() 或类似
        # 例如：created_at: created_at, → created_at: created_at.map(|d| d.and_utc()).unwrap(),
        line = re.sub(r'(\w+):\s*(\w+),', r'\1: \2.map(|d| d.and_utc()).unwrap(),', line)
    
    # 模式 3：expected String, found Option<String>
    elif expected and expected.strip() == '`String`' and found and 'Option<String>' in found:
        # 加 .unwrap_or_default()
        line = re.sub(r'(\w+):\s*(\w+),', r'\1: \2.unwrap_or_default(),', line)
    
    # 模式 4：expected Option<String>, found String
    elif expected and 'Option<String>' in expected and found and found.strip() == '`String`':
        # 加 Some(...)
        line = re.sub(r'(\w+):\s*(\w+),', r'\1: Some(\2),', line)
    
    # 模式 5：expected Option<Uuid>, found Uuid
    elif expected and 'Option<Uuid>' in expected and found and found.strip() == '`Uuid`':
        # 加 Some(...)
        line = re.sub(r'(\w+):\s*(\w+),', r'\1: Some(\2),', line)
    
    # 模式 6：expected Uuid, found Option<Uuid>
    elif expected and expected.strip() == '`Uuid`' and found and 'Option<Uuid>' in found:
        # 加 .unwrap_or_default()
        line = re.sub(r'(\w+):\s*(\w+),', r'\1: \2.unwrap_or_default(),', line)
    
    if line != original_line:
        lines[line_num - 1] = line
        with open(file_path, 'w') as f:
            f.writelines(lines)
        return True
    
    return False

def main():
    log_file = '/tmp/mes_check_v425.log'
    
    print(f"解析错误日志: {log_file}")
    errors = parse_errors(log_file)
    print(f"找到 {len(errors)} 个错误")
    
    fixed = 0
    for error in errors:
        if fix_error(error['file'], error['line'], error['expected'], error['found']):
            fixed += 1
            print(f"  修复: {error['file']}:{error['line']} ({error['expected']} -> {error['found']})")
    
    print(f"\n共修复 {fixed} 个错误")

if __name__ == '__main__':
    main()
