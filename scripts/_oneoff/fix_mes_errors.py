#!/usr/bin/env python3
"""批量修复 TOPEMS MES 服务编译错误 - 精确版"""

import re
import os
import sys

def fix_file(filepath):
    """逐行精确修复文件中的编译错误"""
    if not os.path.exists(filepath):
        print(f"  跳过不存在的文件: {os.path.basename(filepath)}")
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixes = 0
    new_lines = []
    
    for i, line in enumerate(lines):
        original = line
        
        # ============================================================
        # 模式 1: Uuid/String/i32 上的 unwrap_or_default() 调用
        # ============================================================
        
        # 1a: xxx.unwrap_or_default().to_string() -> xxx.to_string()
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.unwrap_or_default\(\)\.to_string\(\)',
            lambda m: f'{m.group(1)}.to_string()',
            line
        )
        
        # 1b: String.unwrap_or_default() -> String
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.unwrap_or_default\(\)(?![\.\w])',
            lambda m: m.group(1),
            line
        )
        
        # ============================================================
        # 模式 2: Uuid 上的 .map(|u| u.to_string()).unwrap_or_default()
        # ============================================================
        
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.map\(\|(\w+)\| \2\.to_string\(\)\)\.unwrap_or_default\(\)',
            lambda m: f'{m.group(1)}.to_string()',
            line
        )
        
        # ============================================================
        # 模式 3: .map(|param| body).unwrap_or_default() 用于非 Option 类型
        # ============================================================
        
        def replace_map_closure(match):
            var = match.group(1)
            param = match.group(2)
            body = match.group(3)
            new_body = re.sub(r'\b' + re.escape(param) + r'\b', var, body)
            return new_body
        
        line = re.sub(
            r'(\w+(?:\.\w+)*)\.map\(\|(\w+)\| ([^)]+)\)\.unwrap_or_default\(\)',
            replace_map_closure,
            line
        )
        
        # ============================================================
        # 模式 4: 需要加 .unwrap_or_default() 的情况
        # ============================================================
        
        for opt_field in ['team_code', 'team_name', 'maintenance_type']:
            pattern = rf'({opt_field}):\s*(\w+(?:\.\w+)*)\.clone\(\)(\s*[,)\n])'
            replacement = rf'\1: \2.clone().unwrap_or_default()\3'
            line = re.sub(pattern, replacement, line)
        
        # ============================================================
        # 模式 5: Some(expr) 但 expr 已经是 Option 类型
        # ============================================================
        
        line = re.sub(
            r'(unit):\s*Some\((\w+(?:\.\w+)*)\)(\s*[,)\n])',
            lambda m: f'{m.group(1)}: {m.group(2)}{m.group(3)}',
            line
        )
        
        for known_opt in ['equipment_name', 'equipment_no']:
            pattern = rf'({known_opt}):\s*Some\((\w+(?:\.\w+)*)\)(\s*[,)\n])'
            line = re.sub(pattern, rf'\1: \2\3', line)
        
        line = re.sub(
            r'naive_to_utc\(Some\((\w+(?:\.\w+)*)\)\)',
            lambda m: f'naive_to_utc({m.group(1)})',
            line
        )
        
        # ============================================================
        # 模式 6: datetime_to_string 参数类型不匹配
        # ============================================================
        
        line = re.sub(
            r'datetime_to_string\((r\.(?:required_date|created_at|updated_at))\)',
            lambda m: m.group(1),
            line
        )
        
        # ============================================================
        # 模式 7: serde_json::from_str(&s) 但 s 是 Value
        # ============================================================
        
        line = re.sub(
            r'and_then\(\|(\w+)\| serde_json::from_str\(&\1\)\.ok\(\)\)',
            lambda m: f'and_then(|{m.group(1)}| serde_json::from_value({m.group(1)}).ok())',
            line
        )
        
        # ============================================================
        # 模式 8: big_decimal_to_f64 需要 Option<BigDecimal>
        # ============================================================
        
        def replace_big_decimal(match):
            inner = match.group(1)
            if inner.startswith('Some('):
                return match.group(0)
            return f'big_decimal_to_f64(Some({inner}))'
        
        line = re.sub(
            r'big_decimal_to_f64\(([^)]+)\)',
            replace_big_decimal,
            line
        )
        
        if line != original:
            fixes += 1
        
        new_lines.append(line)
    
    if fixes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"  {os.path.basename(filepath)}: {fixes} 处修复")
    
    return fixes

def main():
    project_root = "/Users/air/TOPEMS"
    files = [
        f"{project_root}/svc/mes/src/modules/production/process.rs",
        f"{project_root}/svc/mes/src/modules/production/order.rs",
        f"{project_root}/svc/mes/src/modules/production/plan.rs",
        f"{project_root}/svc/mes/src/modules/production/batch.rs",
        f"{project_root}/svc/mes/src/modules/production/workstation.rs",
        f"{project_root}/svc/mes/src/modules/production/equipment.rs",
        f"{project_root}/svc/mes/src/modules/quality_management/inspection.rs",
        f"{project_root}/svc/mes/src/modules/quality_management/patrol.rs",
        f"{project_root}/svc/mes/src/modules/quality_management/standard.rs",
        f"{project_root}/svc/mes/src/modules/quality_management/mod.rs",
        f"{project_root}/svc/mes/src/modules/team.rs",
        f"{project_root}/svc/mes/src/modules/work_schedule.rs",
        f"{project_root}/svc/mes/src/modules/equipment.rs",
        f"{project_root}/svc/mes/src/modules/material_requirement.rs",
        f"{project_root}/svc/mes/src/modules/process_flow.rs",
        f"{project_root}/svc/mes/src/modules/process_route.rs",
    ]
    
    print("开始修复 MES 编译错误...\n")
    total = 0
    
    for f in files:
        total += fix_file(f)
    
    print(f"\n总计修复: {total} 处")
    return total

if __name__ == '__main__':
    sys.exit(0 if main() >= 0 else 1)
