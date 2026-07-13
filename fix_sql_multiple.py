#!/usr/bin/env python3
import os
import re

def split_sql_statements(content):
    statements = re.split(r'(?<=;)\s*\n', content)
    return [s.strip() for s in statements if s.strip()]

def fix_module(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'CREATE TABLE' not in content:
        return False
    
    init_match = re.search(r'pub async fn init_database\(pool: &PgPool\) -> Result<\(\), sqlx::Error>\s*\{(.*?)\}\s*$', content, re.DOTALL)
    if not init_match:
        return False
    
    init_body = init_match.group(1)
    
    sql_match = re.search(r'sqlx::query\(\s*r#"([^"]*)"#\s*\)\s*\.execute\(pool\)\s*\.await\?;', init_body, re.DOTALL)
    if not sql_match:
        return False
    
    sql_content = sql_match.group(1)
    statements = split_sql_statements(sql_content)
    
    if len(statements) <= 1:
        return False
    
    new_statements = []
    for stmt in statements:
        if stmt.strip():
            new_statements.append(stmt.strip())
    
    new_init_body_lines = []
    for stmt in new_statements:
        if stmt.startswith('CREATE TABLE'):
            new_init_body_lines.append('    sqlx::query(')
            new_init_body_lines.append('        r#"')
            new_init_body_lines.append('        ' + stmt)
            new_init_body_lines.append('        "#,')
            new_init_body_lines.append('    )')
            new_init_body_lines.append('    .execute(pool)')
            new_init_body_lines.append('    .await?;')
        else:
            new_init_body_lines.append('    sqlx::query("' + stmt + '")')
            new_init_body_lines.append('        .execute(pool)')
            new_init_body_lines.append('        .await?;')
        new_init_body_lines.append('')
    
    new_init_body = '\n'.join(new_init_body_lines)
    
    new_content = content[:init_match.start(1)] + new_init_body + content[init_match.end(1):]
    
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