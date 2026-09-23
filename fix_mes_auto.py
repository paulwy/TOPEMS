#!/usr/bin/env python3
"""
自动修复 MES 编译错误脚本
解析 cargo check 输出，按错误模式批量修复
"""

import re
import subprocess
import sys
from pathlib import Path

def run_cargo_check():
    """从文件读取 cargo check 输出"""
    with open('/tmp/mes_check_v445.log', 'r') as f:
        return f.read()

def parse_errors(output):
    """解析 cargo check 输出，提取错误信息"""
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
        
        errors.append({
            'file': file_path,
            'line': line,
            'col': col,
            'context': context,
            'message': match.group(0)
        })
    
    return errors

def fix_errors(errors):
    """根据错误模式批量修复"""
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
            
            # 错误模式 1: .unwrap_or_default() 在 String/Uuid/NaiveDateTime 上
            if '.unwrap_or_default()' in line and (
                'String' in error['context'] or 
                'Uuid' in error['context'] or 
                'NaiveDateTime' in error['context']
            ):
                line = line.replace('.unwrap_or_default()', '')
            
            # 错误模式 2: .map(|v| v.to_string()) 在 Uuid 上
            if '.map(|v| v.to_string()).unwrap_or_default()' in line and 'Uuid' in error['context']:
                line = line.replace('.map(|v| v.to_string()).unwrap_or_default()', '.to_string()')
            
            # 错误模式 3: .to_string() 在 Option<Uuid>/Option<String> 上
            if '.to_string()' in line and (
                'Option<Uuid>' in error['context'] or 
                'Option<String>' in error['context']
            ):
                line = line.replace('.to_string()', '.map(|v| v.to_string()).unwrap_or_default()')
            
            # 错误模式 4: .map(|d| d.to_rfc3339()) 在 NaiveDateTime 上
            if '.map(|d| d.to_rfc3339()).unwrap_or_default()' in line and 'NaiveDateTime' in error['context']:
                line = line.replace('.map(|d| d.to_rfc3339()).unwrap_or_default()', '.to_rfc3339()')
            
            # 错误模式 5: .to_rfc3339() 在 NaiveDateTime 上
            if '.to_rfc3339()' in line and 'NaiveDateTime' in error['context']:
                line = line.replace('.to_rfc3339()', 'Utc.from_utc_datetime(&d).to_rfc3339()')
            
            # 错误模式 6: Utc.from_utc_datetime(&d) 在 DateTime<Utc> 上
            if 'Utc.from_utc_datetime(&d)' in line and 'DateTime<Utc>' in error['context']:
                line = line.replace('Utc.from_utc_datetime(&d).to_rfc3339()', 'd.to_rfc3339()')
            
            # 错误模式 7: expected DateTime<Utc>, found NaiveDateTime
            if 'expected `DateTime<Utc>`, found `NaiveDateTime`' in error['context']:
                # 需要在 NaiveDateTime 后加 .and_utc()
                # 但这需要知道具体是哪个变量
                pass
            
            # 错误模式 8: expected Option<DateTime<Utc>>, found Option<NaiveDateTime>
            if 'expected `Option<DateTime<Utc>>`, found `Option<NaiveDateTime>`' in error['context']:
                # 需要在 Option<NaiveDateTime> 后加 .map(|d| d.and_utc())
                pass
            
            # 错误模式 9: expected Uuid, found Option<Uuid>
            if 'expected `Uuid`, found `Option<Uuid>`' in error['context']:
                # 需要在 Option<Uuid> 后加 .unwrap_or_default()
                pass
            
            if line != original_line:
                lines[line_num] = line
                fixes_applied += 1
        
        # 写回文件
        file.write_text('\n'.join(lines))
    
    return fixes_applied

def main():
    print("运行 cargo check...")
    output = run_cargo_check()
    
    # 统计错误数
    error_count = len(re.findall(r'error\[E\d+\]', output))
    print(f"发现 {error_count} 个错误")
    
    print("解析错误...")
    errors = parse_errors(output)
    print(f"解析出 {len(errors)} 个错误")
    
    print("批量修复...")
    fixes = fix_errors(errors)
    print(f"应用了 {fixes} 处修复")
    
    print("完成！")

if __name__ == '__main__':
    main()
