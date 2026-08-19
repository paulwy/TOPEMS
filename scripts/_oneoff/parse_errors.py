#!/usr/bin/env python3
"""第一步：从编译错误日志中提取所有错误的精确位置和类型"""

import re
import json
import os

def parse_build_log(log_path):
    """解析编译日志，提取每个错误的位置和类型"""
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # 去掉 ANSI 颜色码
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    content = ansi_escape.sub('', content)
    
    errors = []
    
    # 分割成单个错误块 - 以 error[E 开头
    error_blocks = re.split(r'(?=error\[E\d+\])', content)
    
    for block in error_blocks:
        if not block.startswith('error['):
            continue
        
        # 提取错误代码
        err_code_match = re.match(r'error\[(\w+)\]', block)
        if not err_code_match:
            continue
        err_code = err_code_match.group(1)
        
        # 提取文件位置: --> path:line:col
        loc_match = re.search(r'-->\s*([^:]+):(\d+):(\d+)', block)
        if not loc_match:
            continue
        filepath = loc_match.group(1).strip()
        line_num = int(loc_match.group(2))
        col_num = int(loc_match.group(3))
        
        # 提取错误消息第一行
        first_line_match = re.search(r'error\[E\d+\]:\s*(.+)', block)
        err_msg = first_line_match.group(1) if first_line_match else ""
        
        # 提取有问题的代码行
        problematic_line = ""
        code_match = re.search(rf'{line_num}\s*\|\s*(.+)', block)
        if code_match:
            problematic_line = code_match.group(1).strip()
        
        # 分类错误类型
        err_type = classify_error(err_code, err_msg, problematic_line, block)
        
        errors.append({
            'filepath': filepath,
            'line': line_num,
            'col': col_num,
            'code': err_code,
            'msg': err_msg,
            'type': err_type,
            'problematic_line': problematic_line,
        })
    
    # 去重（同一个位置可能被报告两次，比如 Uuid 和 uuid::Uuid）
    unique = []
    seen = set()
    for e in errors:
        key = (e['filepath'], e['line'], e['type'])
        if key not in seen:
            seen.add(key)
            unique.append(e)
    
    return unique

def classify_error(err_code, err_msg, code_line, full_block):
    """根据错误消息分类为具体的修复模式"""
    
    # 模式 A: unwrap_or_default 方法不存在
    if 'no method named `unwrap_or_default`' in err_msg:
        if 'Uuid' in err_msg or 'uuid::Uuid' in err_msg:
            if '.to_string()' in code_line:
                return 'A1_UUID_UNWRAP_TOSTRING'  # xxx.unwrap_or_default().to_string()
            else:
                return 'A2_UUID_UNWRAP_BARE'  # xxx.unwrap_or_default()
        elif 'std::string::String' in err_msg:
            return 'A3_STRING_UNWRAP'  # xxx.unwrap_or_default()
        elif 'i32' in err_msg:
            return 'A4_I32_UNWRAP'  # xxx.unwrap_or_default()
        else:
            return 'A_UNKNOWN_UNWRAP'
    
    # 模式 B: xxx is not an iterator (因为调用了 .map())
    if 'is not an iterator' in err_msg:
        if 'Uuid' in err_msg or 'uuid::Uuid' in err_msg:
            return 'B1_UUID_MAP'  # xxx.map(|u| u.to_string()).unwrap_or_default()
        elif 'String' in err_msg:
            return 'B2_STRING_MAP'  # xxx.map(|d| ...).unwrap_or_default()
        else:
            return 'B_UNKNOWN_MAP'
    
    # 模式 C/D: E0308 mismatched types
    if err_code == 'E0308':
        # expected String, found Option<String> - 模式 D
        if 'expected `String`' in full_block and 'found `Option<String>`' in full_block:
            return 'D_OPT_TO_STRING_NEED_UNWRAP'  # 需要加 .unwrap_or_default()
        
        # expected Option<BigDecimal>, found BigDecimal - 模式 C
        if 'expected Option<BigDecimal>' in full_block or 'expected `Option<BigDecimal>`' in full_block:
            return 'C_BIGDECIMAL_NEED_SOME'  # 需要加 Some()
        
        # expected NaiveDateTime, found Option<NaiveDateTime> 在 Some() 里面
        if 'expected `NaiveDateTime`' in full_block and 'found `Option<NaiveDateTime>`' in full_block:
            return 'D2_DOUBLE_SOME_OPTION'  # Some(r.xxx) 但 r.xxx 已经是 Option
        
        # expected String, found Option<String> 在 Some() 里面
        if 'expected `String`' in full_block and 'found `Option<String>`' in full_block:
            # 如果代码有 Some(xxx) 模式
            if 'Some(' in code_line:
                return 'D3_SOME_OF_OPTION'  # Some(r.unit) 应该直接 r.unit
        
        # expected Option<NaiveDateTime>, found String (datetime_to_string 参数)
        if 'expected' in full_block and 'Option<NaiveDateTime>' in full_block and 'found `String`' in full_block:
            return 'D4_DATETIME_ARG_TYPE'  # datetime_to_string(r.xxx)，应该直接用 r.xxx
        
        # serde_json::from_str 期望 &str, 收到 &Value
        if 'expected `&str`' in full_block and 'found `&Value`' in full_block:
            return 'D5_SERDE_FROM_VALUE'  # from_str(&s) -> from_value(s)
        
        # 其他 E0308 暂时记下来
        return 'E0308_UNKNOWN'
    
    return 'UNKNOWN'

def main():
    log_path = '/tmp/mes-build.log'
    errors = parse_build_log(log_path)
    
    print(f"共提取到 {len(errors)} 个唯一错误位置\n")
    
    # 按类型统计
    by_type = {}
    for e in errors:
        t = e['type']
        by_type[t] = by_type.get(t, 0) + 1
    
    print("按错误类型统计:")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")
    
    # 按文件统计
    print("\n按文件统计:")
    by_file = {}
    for e in errors:
        f = os.path.basename(e['filepath'])
        by_file[f] = by_file.get(f, 0) + 1
    for f, c in sorted(by_file.items(), key=lambda x: -x[1]):
        print(f"  {f}: {c}")
    
    # 保存详细信息为 JSON
    out_path = '/Users/air/TOPEMS/mes_errors.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(errors, f, indent=2, ensure_ascii=False)
    print(f"\n详细错误信息已保存到: {out_path}")
    
    return errors

if __name__ == '__main__':
    main()
