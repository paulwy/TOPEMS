#!/usr/bin/env python3
import os
import re

def fix_module(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'CREATE TABLE' not in content:
        return False
    
    lines = content.split('\n')
    init_start = None
    init_end = None
    
    for i, line in enumerate(lines):
        if 'pub async fn init_database' in line:
            init_start = i
            brace_count = 0
            for j in range(i, len(lines)):
                brace_count += lines[j].count('{')
                brace_count -= lines[j].count('}')
                if brace_count == 0 and '}' in lines[j]:
                    init_end = j
                    break
    
    if init_start is None or init_end is None:
        return False
    
    init_lines = lines[init_start:init_end+1]
    full_init = '\n'.join(init_lines)
    
    sql_blocks = re.findall(r'sqlx::query\(\s*r#"(.*?)"#\s*\)\s*\.execute\(pool\)\s*\.await\?;', full_init, re.DOTALL)
    
    if len(sql_blocks) == 0:
        return False
    
    sql_content = sql_blocks[0]
    
    statements = []
    current_stmt = []
    for line in sql_content.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue
        current_stmt.append(stripped)
        if stripped.endswith(';'):
            statements.append(' '.join(current_stmt))
            current_stmt = []
    
    if len(statements) <= 1:
        return False
    
    new_init_lines = [init_lines[0]]
    
    for stmt in statements:
        if stmt.startswith('CREATE TABLE'):
            new_init_lines.append('    sqlx::query(')
            new_init_lines.append('        r#"')
            new_init_lines.append('        ' + stmt)
            new_init_lines.append('        "#,')
            new_init_lines.append('    )')
            new_init_lines.append('    .execute(pool)')
            new_init_lines.append('    .await?;')
        else:
            new_init_lines.append('    sqlx::query("' + stmt + '")')
            new_init_lines.append('        .execute(pool)')
            new_init_lines.append('        .await?;')
        new_init_lines.append('')
    
    new_init_lines.append('    Ok(())')
    new_init_lines.append('}')
    
    new_content = '\n'.join(lines[:init_start] + new_init_lines + lines[init_end+1:])
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True

if __name__ == '__main__':
    modules_dir = '/Users/air/TOPEMS/svc/unified-core/src/modules'
    
    fixed_count = 0
    for filename in os.listdir(modules_dir):
        filepath = os.path.join(modules_dir, filename, 'mod.rs')
        if os.path.exists(filepath):
            if fix_module(filepath):
                print(f"Fixed: {filename}/mod.rs")
                fixed_count += 1
            else:
                print(f"Skipped: {filename}/mod.rs")
    
    print(f"\nFixed {fixed_count} modules.")