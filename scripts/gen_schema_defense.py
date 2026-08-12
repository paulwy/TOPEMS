#!/usr/bin/env python3
"""Generate schema_defense.rs files for 10 batch-2 services from live DB metadata."""

import subprocess
import os
import sys
import re

PROJECT_ROOT = "/Users/air/TOPEMS"

SERVICES = [
    ("erp", "erp"),
    ("hrm", "hrm"),
    ("crm", "crm"),
    ("pm", "pm"),
    ("scm", "scm"),
    ("wms", "wms"),
    ("srm", "srm"),
    ("pdm", "pdm"),
    ("mes", "mes"),
    ("qms", "qms"),
]


def query_db(sql):
    cmd = ["psql", "-h", "localhost", "-U", "topems", "-d", "topems", "-t", "-A", "-F", "|||", "-c", sql]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"SQL error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    rows = []
    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        parts = line.split("|||")
        rows.append(parts)
    return rows


def get_columns_for_schema(schema):
    sql = f"""
    SELECT table_name, column_name, data_type, character_maximum_length,
           numeric_precision, numeric_scale, is_nullable, column_default, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = '{schema}'
      AND table_name NOT LIKE 'sqlx_%%'
      AND table_name NOT LIKE '_sqlx_%%'
      AND column_name != 'id'
    ORDER BY table_name, ordinal_position
    """
    return query_db(sql)


def get_tables_for_schema(schema):
    sql = f"""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '{schema}'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'sqlx_%%'
      AND table_name NOT LIKE '_sqlx_%%'
    ORDER BY table_name
    """
    rows = query_db(sql)
    return [r[0] for r in rows]


def map_pg_type(data_type, char_max_len, num_precision, num_scale):
    if data_type == "character varying":
        return f"VARCHAR({char_max_len})" if char_max_len else "VARCHAR"
    elif data_type == "character":
        return f"CHAR({char_max_len})" if char_max_len else "CHAR"
    elif data_type == "text":
        return "TEXT"
    elif data_type == "integer":
        return "INTEGER"
    elif data_type == "bigint":
        return "BIGINT"
    elif data_type == "smallint":
        return "SMALLINT"
    elif data_type == "boolean":
        return "BOOLEAN"
    elif data_type == "uuid":
        return "UUID"
    elif data_type == "timestamp with time zone":
        return "TIMESTAMPTZ"
    elif data_type == "timestamp without time zone":
        return "TIMESTAMP"
    elif data_type == "date":
        return "DATE"
    elif data_type == "time without time zone":
        return "TIME"
    elif data_type == "numeric":
        if num_precision and num_scale and num_scale != "0":
            return f"DECIMAL({num_precision},{num_scale})"
        elif num_precision:
            return f"DECIMAL({num_precision})"
        return "DECIMAL"
    elif data_type == "real":
        return "REAL"
    elif data_type == "double precision":
        return "DOUBLE PRECISION"
    elif data_type == "jsonb":
        return "JSONB"
    elif data_type == "json":
        return "JSON"
    elif data_type == "bytea":
        return "BYTEA"
    elif data_type == "interval":
        return "INTERVAL"
    else:
        return data_type.upper()


def build_column_def(col_name, data_type, char_max_len, num_precision, num_scale, is_nullable, column_default):
    type_str = map_pg_type(data_type, char_max_len, num_precision, num_scale)
    parts = [type_str]
    if is_nullable == "NO":
        parts.append("NOT NULL")
    if column_default and column_default.strip():
        default = column_default.strip()
        if default.startswith("nextval("):
            pass
        elif default.startswith("uuid_generate_v4()"):
            parts.append("DEFAULT gen_random_uuid()")
        elif default.startswith("gen_random_uuid()"):
            parts.append("DEFAULT gen_random_uuid()")
        elif default.startswith("now()"):
            parts.append("DEFAULT NOW()")
        else:
            default_clean = re.sub(r"::[\w\s]+$", "", default)
            parts.append(f"DEFAULT {default_clean}")
    return " ".join(parts)


def generate_rust_file(schema, service_tag, tables, columns_by_table):
    lines = []
    lines.append("//! Schema 防御定义（自动生成自 DB 元数据）")
    lines.append("//!")
    lines.append(f"//! 服务: {service_tag} | Schema: {schema}")
    lines.append("//! 规范: 新增列需两处同步 -> CREATE TABLE 文本块 + TABLE_DEFS 数组")
    lines.append("")
    lines.append(f'pub const SERVICE_SCHEMA: &str = "{schema}";')
    lines.append("")
    lines.append(f'/// {service_tag} {len(tables)} 张表的列定义单一事实源。不含 id 列（verify 自动拼）。')
    lines.append("pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[")

    for table in tables:
        cols = columns_by_table.get(table, [])
        lines.append(f'    ("{table}", &[')
        for col in cols:
            col_name = col[1]
            data_type = col[2]
            char_max_len = col[3]
            num_precision = col[4]
            num_scale = col[5]
            is_nullable = col[6]
            column_default = col[7]
            type_def = build_column_def(col_name, data_type, char_max_len, num_precision, num_scale, is_nullable, column_default)
            lines.append(f'        ("{col_name}", "{type_def}"),')
        lines.append("    ]),")

    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main():
    stats = {}
    for schema, service_tag in SERVICES:
        svc_dir = os.path.join(PROJECT_ROOT, "svc", service_tag)
        if not os.path.isdir(svc_dir):
            print(f"SKIP: {service_tag}")
            continue

        tables = get_tables_for_schema(schema)
        columns = get_columns_for_schema(schema)

        columns_by_table = {}
        for col in columns:
            table_name = col[0]
            if table_name not in columns_by_table:
                columns_by_table[table_name] = []
            columns_by_table[table_name].append(col)

        rust_content = generate_rust_file(schema, service_tag, tables, columns_by_table)

        models_dir = os.path.join(svc_dir, "src", "models")
        if not os.path.isdir(models_dir):
            os.makedirs(models_dir)

        output_path = os.path.join(models_dir, "schema_defense.rs")
        with open(output_path, "w") as f:
            f.write(rust_content)

        total_cols = sum(len(cols) for cols in columns_by_table.values())
        stats[service_tag] = (len(tables), total_cols)
        print(f"  {service_tag}: {len(tables)} tables, {total_cols} cols")

    print(f"\nTotal: {len(stats)} services, {sum(s[0] for s in stats.values())} tables, {sum(s[1] for s in stats.values())} columns")


if __name__ == "__main__":
    main()
