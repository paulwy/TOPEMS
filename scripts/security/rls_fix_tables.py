#!/usr/bin/env python3
"""
TOPEMS RLS 修复脚本 - 批量给 CREATE TABLE 追加 tenant_id 列
处理 Rust 源文件和 SQL migration 文件中的 CREATE TABLE
"""
import re
import json
import sys
from pathlib import Path
from typing import Tuple, List, Dict

ROOT = Path("/Users/air/TOPEMS")
AUDIT_JSON = ROOT / "scripts" / "security" / "rls_audit_result.json"

TENANT_COL_RS = (
    "tenant_id Uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid"
)
TENANT_COL_SQL = (
    "tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'"
)

# Rust 中常见类型注解
RS_UUID_RE = re.compile(r"Uuid\s+(?:NOT\s+NULL|NULL)?", re.IGNORECASE)


def find_paren_end(content: str, start_open: int) -> int:
    """找到匹配的结束 ) 位置，考虑嵌套括号和字符串"""
    depth = 0
    i = start_open
    in_single_quote = False
    in_double_quote = False
    in_backtick = False
    in_rstring = False  # Rust raw string r#"..."#
    rstring_hashtag_count = 0

    while i < len(content):
        c = content[i]

        # 处理 Rust raw string
        if not in_single_quote and not in_double_quote and not in_backtick and not in_rstring:
            if c == 'r' and i + 1 < len(content):
                j = i + 1
                hashtags = 0
                while j < len(content) and content[j] == '#':
                    hashtags += 1
                    j += 1
                if j < len(content) and content[j] == '"':
                    in_rstring = True
                    rstring_hashtag_count = hashtags
                    i = j
                    i += 1
                    continue

        # 处理字符串退出
        if in_rstring:
            if c == '"' and rstring_hashtag_count >= 0:
                j = i + 1
                match_count = 0
                while j < len(content) and content[j] == '#' and match_count < rstring_hashtag_count:
                    match_count += 1
                    j += 1
                if match_count == rstring_hashtag_count:
                    in_rstring = False
                    rstring_hashtag_count = 0
                    i = j - 1
            i += 1
            continue

        if c == "'" and not in_double_quote and not in_backtick:
            # 处理 SQL '' 转义
            if in_single_quote and i + 1 < len(content) and content[i + 1] == "'":
                i += 2
                continue
            in_single_quote = not in_single_quote
            i += 1
            continue
        if c == '"' and not in_single_quote and not in_backtick:
            in_double_quote = not in_double_quote
            i += 1
            continue
        if c == '`' and not in_single_quote and not in_double_quote:
            in_backtick = not in_backtick
            i += 1
            continue

        if in_single_quote or in_double_quote or in_backtick:
            i += 1
            continue

        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def inject_tenant_id(content: str, is_sql: bool) -> Tuple[str, bool]:
    """在文件中所有 CREATE TABLE 的列定义里注入 tenant_id 列"""
    create_re = re.compile(
        r"CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[\w]+\.)?[\"`]?[\w]+[\"`]?\s*\(",
        re.IGNORECASE
    )

    modified = False
    result = content
    # 反向处理避免偏移问题
    matches = list(create_re.finditer(content))
    for m in reversed(matches):
        open_paren_pos = m.group(0).rfind('(') + m.start()
        close_paren_pos = find_paren_end(content, open_paren_pos)
        if close_paren_pos == -1:
            continue

        table_body = content[open_paren_pos:close_paren_pos + 1]

        # 检查是否已经有 tenant_id
        if re.search(r"\btenant_id\b", table_body, re.IGNORECASE):
            continue

        # 找到最后一个列定义（考虑嵌套的括号结构，如 CONSTRAINT ... ( ... ) ）
        # 简单策略：在开括号后第一列前插入 tenant_id，避免处理复杂嵌套
        col_start = open_paren_pos + 1
        # 跳过开头空白
        while col_start < close_paren_pos and content[col_start] in ' \t\n\r':
            col_start += 1

        # 如果是 SQL 文件，用 SQL 格式；Rust 文件可能用 UUID 或 Uuid
        tenant_def = TENANT_COL_SQL if is_sql else TENANT_COL_RS

        # 插入位置：在第一列之前
        # 检查前面是否已经是逗号
        indent_match = re.match(r"^(\s*)", content[col_start:])
        indent = indent_match.group(1) if indent_match else "    "

        # 我们插入到第一列前：先 tenant_id，然后换行加缩进和原内容
        before = content[:col_start]
        after = content[col_start:]

        # 如果是 Rust，判断是否需要加逗号分隔
        insert_text = f"{tenant_def},\n{indent}"
        result = result[:col_start] + insert_text + result[col_start:]
        modified = True

    return result, modified


def process_files():
    data = json.loads(AUDIT_JSON.read_text())
    tables = data["tables_missing_tenant"]

    # 去重：同一 (file_path) 只处理一次
    files_to_process: Dict[str, Dict] = {}
    for t in tables:
        fp = t["file_path"]
        if fp not in files_to_process:
            files_to_process[fp] = {"path": fp, "crate": t["crate"]}

    print(f"[*] 需要处理的文件数: {len(files_to_process)}")

    modified_count = 0
    fixed_files = []

    for info in sorted(files_to_process.values(), key=lambda x: x["path"]):
        fp = Path(info["path"])
        if not fp.exists():
            print(f"  [skip] 不存在: {fp}")
            continue

        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            print(f"  [skip] 读取失败 {fp}: {e}")
            continue

        is_sql = fp.suffix.lower() == ".sql"
        new_content, changed = inject_tenant_id(content, is_sql)

        if changed:
            try:
                fp.write_text(new_content, encoding="utf-8")
                print(f"  [OK] 已修复: {fp.relative_to(ROOT)}")
                modified_count += 1
                fixed_files.append(str(fp.relative_to(ROOT)))
            except Exception as e:
                print(f"  [ERR] 写入失败 {fp}: {e}")
        else:
            print(f"  [skip] 无需修复: {fp.relative_to(ROOT)}")

    print(f"\n[完成] 修复 {modified_count} 个文件")

    # 保存修复文件清单
    out_json = ROOT / "scripts" / "security" / "rls_fixed_tables.json"
    out_json.write_text(json.dumps({"fixed_files": fixed_files}, indent=2, ensure_ascii=False))
    print(f"修复清单已保存: {out_json}")


if __name__ == "__main__":
    process_files()
