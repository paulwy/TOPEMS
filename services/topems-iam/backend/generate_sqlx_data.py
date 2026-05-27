#!/usr/bin/env python3
import json

queries = {}

# 从 main.rs 中提取所有 sqlx::query! 调用
with open('src/main.rs', 'r') as f:
    content = f.read()
    
# 查找所有 sqlx::query! 和 sqlx::query_scalar! 调用
import re

# 匹配 sqlx::query! 调用
query_pattern = r'sqlx::query!(.*?)\)'
scalar_pattern = r'sqlx::query_scalar!(.*?)\)'

matches = re.findall(query_pattern, content, re.DOTALL)
scalar_matches = re.findall(scalar_pattern, content, re.DOTALL)

print(f"Found {len(matches)} query! calls and {len(scalar_matches)} query_scalar! calls")

# 创建一个基本的 sqlx-data.json 结构
sqlx_data = {
    "db": {
        "postgres": {
            "version": "14.0.0",
            "sha256": "placeholder"
        }
    },
    "queries": {}
}

# 添加所有查询到缓存中（使用占位符描述）
for i, match in enumerate(matches + scalar_matches):
    # 提取 SQL 查询字符串
    sql_match = re.search(r'r#"([^"]+)"#|"([^"]+)"', match)
    if sql_match:
        sql = sql_match.group(1) or sql_match.group(2)
        # 清理 SQL
        sql = sql.strip().replace('\n', ' ').replace('  ', ' ')
        sqlx_data["queries"][sql] = {
            "describe": {
                "columns": [],
                "parameters": []
            }
        }

with open('.sqlx/sqlx-data.json', 'w') as f:
    json.dump(sqlx_data, f, indent=2)

print(f"Generated .sqlx/sqlx-data.json with {len(sqlx_data['queries'])} queries")
