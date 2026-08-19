#!/usr/bin/env python3
"""第二步：基于解析的错误数据，精确修复每个位置"""

import json
import re
import os

PROJECT_ROOT = "/Users/air/TOPEMS"

def load_errors():
    with open(f"{PROJECT_ROOT}/mes_errors.json", 'r', encoding='utf-8') as f:
        return json.load(f)

def fix_line(filepath, line_num, err_type, original_line):
    """根据错误类型修复单行"""
    
    line = original_line
    
    # ============================================================
    # A1: UUID_UNWRAP_TOSTRING
    # xxx.unwrap_or_default().to_string() -> xxx.to_string()
    # ============================================================
    if err_type == 'A1_UUID_UNWRAP_TOSTRING':
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.unwrap_or_default\(\)\.to_string\(\)',
            lambda m: f'{m.group(1)}.to_string()',
            line
        )
    
    # ============================================================
    # A2: UUID_UNWRAP_BARE
    # xxx.unwrap_or_default() -> xxx (去掉，因为本身就是 Uuid)
    # ============================================================
    elif err_type == 'A2_UUID_UNWRAP_BARE':
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.unwrap_or_default\(\)(?![\.\w])',
            lambda m: m.group(1),
            line
        )
    
    # ============================================================
    # A3: STRING_UNWRAP
    # xxx.unwrap_or_default() -> xxx (去掉，因为本身就是 String)
    # ============================================================
    elif err_type == 'A3_STRING_UNWRAP':
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.unwrap_or_default\(\)(?![\.\w])',
            lambda m: m.group(1),
            line
        )
    
    # ============================================================
    # A4: I32_UNWRAP
    # xxx.unwrap_or_default() -> xxx (去掉，因为本身就是 i32)
    # ============================================================
    elif err_type == 'A4_I32_UNWRAP':
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.unwrap_or_default\(\)(?![\.\w])',
            lambda m: m.group(1),
            line
        )
    
    # ============================================================
    # B1: UUID_MAP
    # xxx.map(|u| u.to_string()).unwrap_or_default() -> xxx.to_string()
    # ============================================================
    elif err_type == 'B1_UUID_MAP':
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.map\(\|(\w+)\| \2\.to_string\(\)\)\.unwrap_or_default\(\)',
            lambda m: f'{m.group(1)}.to_string()',
            line
        )
    
    # ============================================================
    # B2: STRING_MAP
    # xxx.map(|param| body).unwrap_or_default() -> 把 param 替换为 xxx 后的 body
    # ============================================================
    elif err_type == 'B2_STRING_MAP':
        def replace_map(match):
            var = match.group(1)
            param = match.group(2)
            body = match.group(3)
            new_body = re.sub(r'\b' + re.escape(param) + r'\b', var, body)
            return new_body
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.map\(\|(\w+)\| ([^)]+)\)\.unwrap_or_default\(\)',
            replace_map,
            line
        )
    
    # ============================================================
    # C: BIGDECIMAL_NEED_SOME
    # big_decimal_to_f64(r.xxx) -> big_decimal_to_f64(Some(r.xxx))
    # 注意：只处理没有 Some 的
    # ============================================================
    elif err_type == 'C_BIGDECIMAL_NEED_SOME':
        def replace_bd(match):
            inner = match.group(1).strip()
            if inner.startswith('Some('):
                return match.group(0)
            return f'big_decimal_to_f64(Some({inner}))'
        line = re.sub(
            r'big_decimal_to_f64\(([^)]+)\)',
            replace_bd,
            line
        )
    
    # ============================================================
    # D: OPT_TO_STRING_NEED_UNWRAP
    # 期望 String, 收到 Option<String>
    # r.team_code.clone() -> r.team_code.clone().unwrap_or_default()
    # ============================================================
    elif err_type == 'D_OPT_TO_STRING_NEED_UNWRAP':
        line = re.sub(
            r':\s*(\w+(?:\.\w+)*)\.clone\(\)(\s*[,)\n])',
            lambda m: f': {m.group(1)}.clone().unwrap_or_default(){m.group(2)}',
            line
        )
    
    # ============================================================
    # D2: DOUBLE_SOME_OPTION
    # Some(r.start_time) 但 r.start_time 是 Option<NaiveDateTime>
    # naive_to_utc(Some(r.xxx)) -> naive_to_utc(r.xxx)
    # ============================================================
    elif err_type == 'D2_DOUBLE_SOME_OPTION':
        line = re.sub(
            r'naive_to_utc\(Some\((\w+(?:\.\w+)*)\)\)',
            lambda m: f'naive_to_utc({m.group(1)})',
            line
        )
    
    # ============================================================
    # D3: SOME_OF_OPTION - 代码有 Some(r.unit) 而 r.unit 是 Option<String>
    # Some(r.unit) -> r.unit (去掉 Some)
    # ============================================================
    elif err_type == 'D3_SOME_OF_OPTION':
        line = re.sub(
            r':\s*Some\((\w+(?:\.\w+)*)\)(\s*[,)\n])',
            lambda m: f': {m.group(1)}{m.group(2)}',
            line
        )
    
    # ============================================================
    # D4: DATETIME_ARG_TYPE
    # datetime_to_string(r.required_date) 期望 Option<NaiveDateTime> 但收到 String
    # -> 直接用 r.required_date
    # ============================================================
    elif err_type == 'D4_DATETIME_ARG_TYPE':
        line = re.sub(
            r'datetime_to_string\((\w+(?:\.\w+)*)\)',
            lambda m: m.group(1),
            line
        )
    
    # ============================================================
    # D5: SERDE_FROM_VALUE
    # and_then(|s| serde_json::from_str(&s).ok()) -> from_value(s).ok()
    # ============================================================
    elif err_type == 'D5_SERDE_FROM_VALUE':
        line = re.sub(
            r'and_then\(\|(\w+)\| serde_json::from_str\(&\1\)\.ok\(\)\)',
            lambda m: f'and_then(|{m.group(1)}| serde_json::from_value({m.group(1)}).ok())',
            line
        )
    
    if line != original_line:
        return line, True
    return line, False

def fix_all():
    errors = load_errors()
    
    # 按文件分组
    by_file = {}
    for e in errors:
        # 把相对路径转成绝对路径
        rel_path = e['filepath']
        if not rel_path.startswith('/'):
            abs_path = os.path.join(PROJECT_ROOT, rel_path)
        else:
            abs_path = rel_path
        
        if abs_path not in by_file:
            by_file[abs_path] = []
        by_file[abs_path].append(e)
    
    print(f"需要修复 {len(by_file)} 个文件，共 {len(errors)} 处错误\n")
    
    total_fixed = 0
    total_remaining = 0
    
    for filepath, file_errors in by_file.items():
        if not os.path.exists(filepath):
            print(f"  [跳过] 文件不存在: {filepath}")
            total_remaining += len(file_errors)
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        file_fixed = 0
        file_failed = []
        
        for err in file_errors:
            line_idx = err['line'] - 1  # 转 0-based
            if line_idx < 0 or line_idx >= len(lines):
                file_failed.append(f"行号超出范围: {err['line']}")
                continue
            
            original = lines[line_idx]
            new_line, fixed = fix_line(filepath, err['line'], err['type'], original)
            
            if fixed:
                lines[line_idx] = new_line
                file_fixed += 1
            else:
                file_failed.append(f"行 {err['line']} ({err['type']}): 未能匹配模式")
        
        # 写入文件
        if file_fixed > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(lines)
        
        status = f"{file_fixed} 修复"
        if file_failed:
            status += f", {len(file_failed)} 失败"
            for ff in file_failed[:3]:
                status += f"\n    - {ff}"
        print(f"  {os.path.basename(filepath)}: {status}")
        
        total_fixed += file_fixed
        total_remaining += len(file_failed)
    
    print(f"\n修复完成: {total_fixed} 成功, {total_remaining} 未修复")
    return total_fixed, total_remaining

if __name__ == '__main__':
    fix_all()
