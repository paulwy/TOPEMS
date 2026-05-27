#!/usr/bin/env python3
import re

with open('src/main.rs', 'r') as f:
    content = f.read()

# 替换 sqlx::query! 为 sqlx::query
content = content.replace('sqlx::query!', 'sqlx::query')

# 替换 sqlx::query_scalar! 为 sqlx::query_scalar
content = content.replace('sqlx::query_scalar!', 'sqlx::query_scalar')

# 处理参数绑定 - 需要将参数从括号内移到 .bind() 调用
# 匹配模式: query!(r#"..."#, param1, param2).fetch_one()
# 转换为: query(r#"..."#).bind(param1).bind(param2).fetch_one()

def replace_query_params(match):
    query_str = match.group(1)
    params = match.group(2).strip() if match.group(2) else ''
    
    # 移除末尾的逗号
    if params.endswith(','):
        params = params[:-1].strip()
    
    # 如果有参数，添加 .bind() 调用
    if params:
        param_list = [p.strip() for p in params.split(',')]
        bind_calls = ''.join([f'.bind({p})' for p in param_list])
        return f'sqlx::query({query_str}){bind_calls}'
    else:
        return f'sqlx::query({query_str})'

# 匹配 sqlx::query(...) 调用
pattern = r'sqlx::query\(\s*(r#"[^"]+"#|"[^"]+")\s*(,.*?)?\s*\)'
content = re.sub(pattern, replace_query_params, content)

# 同样处理 sqlx::query_scalar
pattern = r'sqlx::query_scalar\(\s*(r#"[^"]+"#|"[^"]+")\s*(,.*?)?\s*\)'
content = re.sub(pattern, replace_query_params, content)

with open('src/main.rs', 'w') as f:
    f.write(content)

print("Replaced sqlx macros with non-macro versions")
