#!/usr/bin/env python3
"""
更精确的 MES 编译错误自动修复脚本
解析 cargo check 输出，按 expected/found 模式精确修复
"""

import re
import sys
from pathlib import Path

def parse_cargo_check(log_file):
    """解析 cargo check 日志，提取错误信息"""
    with open(log_file, 'r') as f:
        output = f.read()
    
    errors = []
    
    # 匹配错误模式
    error_pattern = re.compile(
        r'error\[E\d+\]:.*?\n'
        r'\s*--> (.*?):(\d+):(\d+)\n'
        r'(.*?)(?=\n\s*(?:error|warning|$))',
        re.MULTILINE | re.DOTALL
    )
    
    for match in error_pattern.finditer(output):
        file_path = match.group(1)
        line = int(match.group(2))
        col = int(match.group(3))
        context = match.group(4)
        full_match = match.group(0)
        
        # 提取 expected/found 类型
        expected_match = re.search(r'expected `(.*?)`', context)
        found_match = re.search(r'found `(.*?)`', context)
        
        expected = expected_match.group(1) if expected_match else None
        found = found_match.group(1) if found_match else None
        
        errors.append({
            'file': file_path,
            'line': line,
            'col': col,
            'context': context,
            'expected': expected,
            'found': found,
            'message': full_match
        })
    
    return errors

def fix_errors(errors):
    """根据错误模式精确修复"""
    fixes_applied = 0
    
    # 按文件分组
    files = {}
    for error in errors:
        file_path = error['file']
        if file_path not in files:
            files[file_path] = []
        files[file_path].append(error)
    
    for file_path, file_errors in files.items():
        file = Path(file_path)
        if not file.exists():
            continue
        
        lines = file.read_text().split('\n')
        
        for error in file_errors:
            line_num = error['line'] - 1  # 0-indexed
            if line_num >= len(lines):
                continue
            
            line = lines[line_num]
            original_line = line
            
            expected = error['expected']
            found = error['found']
            
            # 错误模式 1: expected String, found Option<String>
            # 修复方法: 在 Option<String> 后加 .unwrap_or_default()
            if expected == 'String' and found == 'Option<String>':
                # 提取变量名
                var_match = re.search(r'(\w+):\s*r\.(\w+)', line)
                if var_match:
                    var_name = var_match.group(2)
                    line = line.replace(f'r.{var_name},', f'r.{var_name}.unwrap_or_default(),')
                
                # 另一种模式: s.xxx,
                var_match2 = re.search(r'(\w+):\s*s\.(\w+)', line)
                if var_match2:
                    var_name = var_match2.group(2)
                    line = line.replace(f's.{var_name},', f's.{var_name}.unwrap_or_default(),')
            
            # 错误模式 2: expected Option<String>, found String
            # 修复方法: 在 String 前加 Some(...)
            elif expected == 'Option<String>' and found == 'String':
                # 模式 1: r.xxx,
                var_match = re.search(r'(\w+):\s*r\.(\w+),', line)
                if var_match:
                    var_name = var_match.group(2)
                    line = line.replace(f'r.{var_name},', f'Some(r.{var_name}),')
                
                # 模式 2: batch.xxx.clone(),
                var_match2 = re.search(r'(\w+):\s*batch\.(\w+)\.clone\(\),', line)
                if var_match2:
                    var_name = var_match2.group(2)
                    line = line.replace(f'batch.{var_name}.clone(),', f'Some(batch.{var_name}.clone()),')
            
            # 错误模式 3: expected DateTime<Utc>, found NaiveDateTime
            # 修复方法: 在 NaiveDateTime 后加 .and_utc()
            elif expected == 'DateTime<Utc>' and found == 'NaiveDateTime':
                # 提取变量名
                var_match = re.search(r'(\w+):\s*(\w+),', line)
                if var_match:
                    var_name = var_match.group(2)
                    line = line.replace(f'{var_name}: {var_name},', f'{var_name}: {var_name}.and_utc(),')
            
            # 错误模式 4: expected Option<DateTime<Utc>>, found Option<NaiveDateTime>
            # 修复方法: 在 Option<NaiveDateTime> 后加 .map(|d| d.and_utc())
            elif expected == 'Option<DateTime<Utc>>' and found == 'Option<NaiveDateTime>':
                # 需要在 Option<NaiveDateTime> 后加 .map(|d| d.and_utc())
                pass
            
            # 错误模式 5: expected NaiveDateTime, found DateTime<Utc>
            # 修复方法: 在 DateTime<Utc> 后加 .naive_utc()
            elif expected == 'NaiveDateTime' and found == 'DateTime<Utc>':
                # 需要在 DateTime<Utc> 后加 .naive_utc()
                pass
            
            # 错误模式 6: expected Option<NaiveDateTime>, found Option<DateTime<Utc>>
            # 修复方法: 在 Option<DateTime<Utc>> 后加 .map(|d| d.naive_utc())
            elif expected == 'Option<NaiveDateTime>' and found == 'Option<DateTime<Utc>>':
                # 需要在 Option<DateTime<Utc>> 后加 .map(|d| d.naive_utc())
                pass
            
            # 错误模式 7: expected DateTime<Utc>, found Option<DateTime<Utc>>
            # 修复方法: 在 Option<DateTime<Utc>> 后加 .unwrap_or_default()
            elif expected == 'DateTime<Utc>' and found == 'Option<DateTime<Utc>>':
                var_match = re.search(r'(\w+):\s*(\w+)', line)
                if var_match:
                    var_name = var_match.group(2)
                    line = line.replace(f'{var_name}: {var_name},', f'{var_name}: {var_name}.unwrap_or_default(),')
            
            if line != original_line:
                lines[line_num] = line
                fixes_applied += 1
        
        # 写回文件
        file.write_text('\n'.join(lines))
    
    return fixes_applied

def main():
    log_file = '/tmp/mes_check_v457.log'
    
    print(f"解析 {log_file}...")
    errors = parse_cargo_check(log_file)
    print(f"解析出 {len(errors)} 个错误")
    
    # 统计错误类型
    expected_counts = {}
    found_counts = {}
    for error in errors:
        if error['expected']:
            expected_counts[error['expected']] = expected_counts.get(error['expected'], 0) + 1
        if error['found']:
            found_counts[error['found']] = found_counts.get(error['found'], 0) + 1
    
    print("\nExpected 类型分布:")
    for exp, count in sorted(expected_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {exp}: {count}")
    
    print("\nFound 类型分布:")
    for found, count in sorted(found_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {found}: {count}")
    
    print("\n批量修复...")
    fixes = fix_errors(errors)
    print(f"应用了 {fixes} 处修复")
    
    print("完成！")

if __name__ == '__main__':
    main()
