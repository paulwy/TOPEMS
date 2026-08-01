#!/usr/bin/env python3
"""
TOPEMS RLS 修复脚本 - 批量给 handler 的 SELECT 查询追加 tenant_id 过滤
策略：在每个 SELECT 的 WHERE 子句中追加 AND tenant_id = $N，
     并在对应的 .bind() 链后追加对 claims.tenant_id 的绑定
"""
import re
import json
from pathlib import Path
from typing import List, Tuple, Optional

ROOT = Path("/Users/air/TOPEMS")
AUDIT_JSON = ROOT / "scripts" / "security" / "rls_audit_result.json"

# 如何从 claims 中获取 tenant_id 的 Rust 表达式
# 根据 Claims struct: pub tenant_id: Option<String>
CLAIMS_TENANT_EXPR = (
    "claims.tenant_id.as_deref().unwrap_or(\"00000000-0000-0000-0000-000000000000\")"
)


def count_placeholders(sql: str) -> int:
    """统计 SQL 中 $N 占位符的最大 N"""
    nums = re.findall(r"\$(\d+)", sql)
    if not nums:
        return 0
    return max(int(n) for n in nums)


def has_claims_param(fn_body: str) -> bool:
    """检查函数是否有 claims 参数"""
    return bool(re.search(r"Extension\s*\(\s*claims\s*\)\s*:\s*Extension<Claims>", fn_body)) or \
           bool(re.search(r"\bclaims\s*:\s*(?:&|)\s*Claims\b", fn_body))


def inject_tenant_filter_to_sql(sql: str) -> Optional[Tuple[str, int]]:
    """
    在 SQL 中注入 AND tenant_id = $N
    返回 (新 SQL, 新参数编号) 或 None
    """
    if re.search(r"\btenant_id\b\s*=", sql, re.IGNORECASE):
        return None  # 已经有 tenant_id 过滤

    # 找到 SELECT ... FROM ... WHERE ... 的位置
    # 策略：在 WHERE 之后、ORDER BY / GROUP BY / LIMIT / OFFSET / HAVING 之前
    # 找到 WHERE 关键字后面的条件块

    # 先找到 WHERE 位置
    where_match = re.search(r"\bWHERE\b", sql, re.IGNORECASE)
    if not where_match:
        # 没有 WHERE：添加 WHERE tenant_id = $1
        # 在 FROM ... 之后，ORDER BY / LIMIT 等之前插入
        from_match = re.search(r"\bFROM\s+[\w.\s,\"`]+", sql, re.IGNORECASE)
        if not from_match:
            return None
        insert_pos = from_match.end()
        # 检查是否有 ORDER / GROUP / LIMIT / HAVING / OFFSET
        after_clause_match = re.search(
            r"\b(ORDER\s+BY|GROUP\s+BY|LIMIT|OFFSET|HAVING)\b",
            sql[insert_pos:], re.IGNORECASE
        )
        if after_clause_match:
            where_insert_pos = insert_pos + after_clause_match.start()
            ph_num = count_placeholders(sql) + 1
            new_sql = sql[:where_insert_pos] + f" WHERE tenant_id = ${ph_num} " + sql[where_insert_pos:]
        else:
            ph_num = count_placeholders(sql) + 1
            new_sql = sql[:insert_pos] + f" WHERE tenant_id = ${ph_num} " + sql[insert_pos:]
        return new_sql, ph_num

    # 有 WHERE：在 WHERE 的条件集合中追加 AND tenant_id = $N
    # 在 WHERE 后找到合适的插入点：
    # - 如果有 ORDER BY / LIMIT / OFFSET / GROUP BY / HAVING：插入到这些关键字之前
    # - 否则插入到 WHERE 条件结尾

    where_end = where_match.end()
    rest_of_sql = sql[where_end:]

    # 找后续子句：ORDER BY, GROUP BY, LIMIT, OFFSET, HAVING, RETURNING 等
    # 需要平衡括号，防止在子查询的 ) 后截断
    insert_before_match = None
    depth = 0
    i = 0
    in_single_quote = False
    in_double_quote = False
    while i < len(rest_of_sql):
        c = rest_of_sql[i]
        if c == "'" and not in_double_quote:
            if in_single_quote and i + 1 < len(rest_of_sql) and rest_of_sql[i+1] == "'":
                i += 2
                continue
            in_single_quote = not in_single_quote
            i += 1
            continue
        if c == '"' and not in_single_quote:
            in_double_quote = not in_double_quote
            i += 1
            continue
        if in_single_quote or in_double_quote:
            i += 1
            continue
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        if depth == 0:
            m = re.match(
                r"\s*\b(ORDER\s+BY|GROUP\s+BY|LIMIT|OFFSET|HAVING|RETURNING|UNION|EXCEPT|INTERSECT)\b",
                rest_of_sql[i:], re.IGNORECASE
            )
            if m:
                insert_before_match = (where_end + i, where_end + i + m.start())
                break
        i += 1

    if insert_before_match:
        abs_insert_pos = insert_before_match[0]
        existing_text = sql[where_end:abs_insert_pos]
        ph_num = count_placeholders(sql) + 1
        new_condition = f" AND tenant_id = ${ph_num} "
        # 去除原条件尾部多余空白，插入新条件，然后保留原顺序
        new_sql = sql[:abs_insert_pos] + new_condition + sql[abs_insert_pos:]
    else:
        # 直接追加到末尾
        ph_num = count_placeholders(sql) + 1
        new_sql = sql[:where_end] + rest_of_sql.rstrip() + f" AND tenant_id = ${ph_num} " + \
                  ("\n" if sql.endswith("\n") else "")

    return new_sql, ph_num


def process_file(file_path: Path, fn_line_numbers: List[int]) -> Tuple[int, List[str]]:
    """
    处理单个文件中的所有需要修复的 handler 函数
    返回修复的函数数量，和修复的函数名列表
    """
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        print(f"  [ERR] 读文件失败 {file_path}: {e}")
        return 0, []

    lines = content.splitlines(keepends=True)
    original_len = len(content)

    modified = False
    fixed_fns = []

    # 策略：对每个目标函数，找到 sqlx::query(...) 或 sqlx::query_as(...) 或 sqlx::query_scalar(...) 的 SQL 字符串
    # 注入 tenant_id 过滤，然后在 .bind() 链最后追加绑定

    # 先获取函数名列表
    data = json.loads(AUDIT_JSON.read_text())
    target_fns = [h["function_name"] for h in data["handlers_missing_filter"]
                  if h["file_path"] == str(file_path)]

    if not target_fns:
        return 0, []

    # 找到每个函数的范围（用花括号匹配）
    fn_re = re.compile(
        r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+(" + "|".join(re.escape(n) for n in target_fns) + r")\s*\(",
        re.MULTILINE
    )

    matches = list(fn_re.finditer(content))
    for m in matches:
        fn_name = m.group(1)
        fn_start = m.start()

        # 找函数体范围
        brace_start = content.find("{", fn_start)
        if brace_start == -1:
            continue
        depth = 0
        i = brace_start
        while i < len(content):
            c = content[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        fn_end = i + 1
        fn_body = content[fn_start:fn_end]

        # 检查是否有 claims 参数（没有的话不处理，风险太大）
        if not has_claims_param(fn_body):
            # 没有 claims，跳过
            continue

        # 现在在 fn_body 中找所有 sqlx 查询（SELECT 的）
        # 模式匹配：
        # sqlx::query( r#" SELECT ... "# )  或 sqlx::query!( r#" SELECT ... " )
        # sqlx::query_as::<_, T>( r#" SELECT ... "# )
        # sqlx::query_scalar::<_, T>( r#" SELECT ... "# )

        # 对于 fn_body 中的查询，我们逐个处理并在 content 上替换（用偏移量）
        body_offset = fn_start
        query_pattern = re.compile(
            r"sqlx::(?:query|query_as|query_scalar|query_as_with|query_scalar_with)"
            r"(?:\s*<[^>]*>)?\s*\(\s*"
            r"(?:r#\"#*\"?|r\"|\"|r'\d*'?)"  # 起始字符串标记
        )

        # 更简单的模式：找包含 SELECT 的 SQL 字符串字面量（在 sqlx::* 调用中）
        # 用更安全的方法：逐个查询替换

        # 使用 finditer 在 fn_body 中查找
        qmatches = list(re.finditer(r"sqlx::(?:query|query_as|query_scalar)[^;]*?;", fn_body, re.DOTALL))
        if not qmatches:
            # 可能是跨多行的，换模式：从 sqlx::query 开始到 .fetch_ 或 .execute 之前的 SQL 部分
            qmatches = list(re.finditer(r"sqlx::(?:query|query_as|query_scalar)", fn_body))

        # 反向处理 fn_body 中的查询
        changed_in_fn = False
        new_fn_body = fn_body
        for qm in reversed(qmatches):
            qstart_in_body = qm.start()
            # 找到 SQL 字符串开始：下一个 ( 后面的字符串
            paren_idx = fn_body.find("(", qstart_in_body)
            if paren_idx == -1:
                continue
            sql_start = paren_idx + 1
            # 跳过空白
            while sql_start < len(fn_body) and fn_body[sql_start] in ' \t\n\r':
                sql_start += 1

            # 判断字符串类型
            sql_text_start = sql_start
            str_prefix = ""
            if fn_body[sql_text_start:sql_text_start+2] == 'r#':
                # Rust raw string
                j = sql_text_start + 2
                hashtags = 0
                while j < len(fn_body) and fn_body[j] == '#':
                    hashtags += 1
                    j += 1
                if j < len(fn_body) and fn_body[j] == '"':
                    str_prefix = fn_body[sql_text_start:j+1]
                    sql_content_start = j + 1
                    # 找结束 " + hashtags 个 #
                    k = sql_content_start
                    while k < len(fn_body):
                        if fn_body[k] == '"':
                            end_candidate = k + 1
                            hash_count = 0
                            while end_candidate < len(fn_body) and fn_body[end_candidate] == '#' and hash_count < hashtags:
                                hash_count += 1
                                end_candidate += 1
                            if hash_count == hashtags:
                                sql_content_end = k
                                sql_end = end_candidate
                                break
                        k += 1
                    else:
                        continue
                else:
                    continue
            elif fn_body[sql_text_start] == 'r':
                # r"..."
                if sql_text_start + 1 < len(fn_body) and fn_body[sql_text_start+1] == '"':
                    str_prefix = 'r"'
                    sql_content_start = sql_text_start + 2
                    sql_content_end = fn_body.find('"', sql_content_start)
                    if sql_content_end == -1:
                        continue
                    sql_end = sql_content_end + 1
                else:
                    continue
            elif fn_body[sql_text_start] == '"':
                str_prefix = '"'
                sql_content_start = sql_text_start + 1
                sql_content_end = fn_body.find('"', sql_content_start)
                if sql_content_end == -1:
                    continue
                sql_end = sql_content_end + 1
            else:
                continue

            sql_content = fn_body[sql_content_start:sql_content_end]

            # 判断是否是 SELECT 查询（非 INSERT UPDATE DELETE）
            sql_no_ws = re.sub(r"\s+", " ", sql_content.strip()).upper()
            if not sql_no_ws.startswith("SELECT") and not sql_no_ws.startswith(" WITH"):
                # 检查是否含有 SELECT（可能是子查询的 INSERT...RETURNING SELECT 我们也跳过）
                if not re.search(r"\bSELECT\b", sql_no_ws):
                    continue

            # 尝试注入过滤
            result = inject_tenant_filter_to_sql(sql_content)
            if result is None:
                continue
            new_sql_content, new_ph_num = result

            # 替换 SQL 内容
            new_fn_body = (
                new_fn_body[:sql_content_start]
                + new_sql_content
                + new_fn_body[sql_content_end:]
            )

            # 现在在后面找 .bind() 链，在合适的位置插入新的 .bind()
            # 找到 sql 字符串结束后，到 .fetch_* 或 .execute() 之间的所有 .bind()
            after_sql = new_fn_body[sql_end:]
            # 找 .fetch_ 或 .execute 或 .map()（但 bind 在 fetch/execute 之前）
            stop_match = re.search(r"\.\s*(?:fetch|execute|map|try_map|build_query)", after_sql)
            if stop_match:
                stop_rel = stop_match.start()
            else:
                stop_rel = len(after_sql)

            bind_section = after_sql[:stop_rel]
            rest_section = after_sql[stop_rel:]

            # 在 bind_section 末尾追加新的 .bind()
            # 去掉尾部空白后加 .bind(...)
            bind_section_stripped = bind_section.rstrip()
            if bind_section_stripped.endswith(")"):
                # 有之前的 bind，直接追加
                new_bind_section = (
                    bind_section_stripped
                    + f"\n            .bind({CLAIMS_TENANT_EXPR})"
                    + ("\n        " if "\n" in bind_section else "")
                )
            else:
                # 没有之前的 bind
                indent = "            "
                new_bind_section = (
                    bind_section_stripped
                    + f"\n{indent}.bind({CLAIMS_TENANT_EXPR})"
                )

            new_fn_body = (
                new_fn_body[:sql_end]
                + new_bind_section
                + rest_section
            )

            changed_in_fn = True

        if changed_in_fn:
            # 替换整个函数体
            content = content[:fn_start] + new_fn_body + content[fn_end:]
            modified = True
            fixed_fns.append(fn_name)

    if modified:
        try:
            file_path.write_text(content, encoding="utf-8")
            return len(fixed_fns), fixed_fns
        except Exception as e:
            print(f"  [ERR] 写文件失败 {file_path}: {e}")
            return 0, []
    return 0, []


def main():
    data = json.loads(AUDIT_JSON.read_text())
    handlers = data["handlers_missing_filter"]
    print(f"[*] 需要处理的 handler 总数: {len(handlers)}")

    # 按文件聚合
    by_file = {}
    for h in handlers:
        fp = h["file_path"]
        by_file.setdefault(fp, []).append(h["line_number"])

    print(f"[*] 涉及文件数: {len(by_file)}")

    total_fixed = 0
    fixed_details = []
    for fp in sorted(by_file.keys()):
        path = Path(fp)
        if not path.exists():
            print(f"  [skip] 不存在: {fp}")
            continue
        count, fns = process_file(path, by_file[fp])
        if count > 0:
            rel = path.relative_to(ROOT)
            print(f"  [OK] {rel}: 修复 {count} 个函数 -> {', '.join(fns[:5])}{'...' if len(fns)>5 else ''}")
            total_fixed += count
            for fn in fns:
                fixed_details.append({"file": str(rel), "function": fn})

    print(f"\n[完成] 修复 {total_fixed} 个 handler 查询")
    out = ROOT / "scripts" / "security" / "rls_fixed_handlers.json"
    out.write_text(json.dumps({"total_fixed": total_fixed, "items": fixed_details},
                             indent=2, ensure_ascii=False))
    print(f"修复清单已保存: {out}")


if __name__ == "__main__":
    main()
