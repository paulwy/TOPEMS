#!/usr/bin/env python3
"""
check-schema-defense-drift.py — TABLE_DEFS 列集合 vs 同文件内联 CREATE TABLE 列集合 静态对拍
（第三梯队 方案 C 止血脚本，纯静态解析，不编译 / 不连库）

背景（artifacts/tier2-fixes/tier3-feasibility.md 主题1）：
  各服务 schema_defense.rs 声称 TABLE_DEFS 是「单一事实源」，但同一 crate 里往往另有一份
  手写的 `CREATE TABLE IF NOT EXISTS <tbl> (...)` 文本，靠注释要求人肉两处同步。
  TABLE_DEFS 刻意只记 TYPE/NOT NULL/DEFAULT，UNIQUE/REFERENCES/CHECK 只存在于 CREATE 文本，
  所以本脚本【只比列名集合】，不比完整 DDL；且 id 列由 verify 阶段自动拼，TABLE_DEFS 刻意不写。

实测校正（2026-10-07，本脚本落地前 grep 取证）：
  * 29 个 schema_defense*.rs 里，绝大多数的 CREATE TABLE 只是一条骨架 format! 模板
        "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())"
    —— 里面是 {} 占位符、没有逐表列 DDL，不是对拍对象，脚本自动跳过。
  * 真正「同文件双写」（TABLE_DEFS 定义 + 同文件逐表带列 CREATE 块）的是：
        svc/gis/src/db/schema.rs        （gis/schema_defense.rs 仅 pub use 再导出）
        svc/ehs/src/models/mod.rs       （ehs/schema_defense.rs 另有一份独立 TABLE_DEFS）
    因此本脚本的扫描单位是「所有定义了 `pub const TABLE_DEFS` 的 .rs 文件」，而不仅是文件名
    schema_defense*.rs——否则 gis / ehs 这两个真正会漂移的文件会被漏掉。

判定规则：
  * 对每个 TABLE_DEFS 定义文件：
      - 抽 TABLE_DEFS 里每张表的列名集合（tuple 首元素）；
      - 抽【同文件】内联 `CREATE TABLE [IF NOT EXISTS] <tbl> (...)` 块的列名集合；
      - 两边都有的表才对拍：求差集
          only_in_tabledefs = TABLE_DEFS 有、CREATE 无（除归一化后的 id）
          only_in_create    = CREATE 有、TABLE_DEFS 无
        任一非空 → 记为 drift。
      - 只在 TABLE_DEFS 出现、同文件没有对应 CREATE 块的表 → INFO 跳过
        （这类服务的列 DDL 在 database/migrations/，本脚本不比迁移，不算 drift）。
      - 只在 CREATE 块出现、TABLE_DEFS 没有的表 → 记为 drift（CREATE 新表忘了补 TABLE_DEFS）。
  * id 归一化：TABLE_DEFS 不显式写 id，但运行期 expected = ["id"] + cols，所以对拍时
    把 id 视为两边都有，不报告。
  * 骨架 format! CREATE（含 {} 占位符）自动排除，不参与对拍。

退出码：
  * 0 = 无 drift（或没有可对拍的双写文件）
  * 1 = 发现至少一处列名集合差异，打印逐表明细。

用法：
  python3 scripts/check-schema-defense-drift.py            # 全量扫描
  python3 scripts/check-schema-defense-drift.py --root .   # 指定仓库根
"""
import os
import re
import sys


# ---------------------------------------------------------------------------
# 字符串感知的扫描工具：在 Rust 源码文本里跳过字符串字面量，避免把字符串里的
# 括号 / 逗号 / 引号当成代码结构。
# ---------------------------------------------------------------------------
class Scan:
    def __init__(self, text):
        self.s = text
        self.n = len(text)

    def skip_string(self, i):
        """若 s[i] 位于一个字符串字面量开头（" 或 r#" 或 ' ），跳到字面量结束；否则原样返回 i。
        返回新下标。仅做保守处理：识别 "..."（含 \" 转义）与 r#"..."# / r##"..."## 原始串。"""
        s = self.s
        # raw string: r#" ... "#  或 r##" ... "##
        m = re.match(r'r(#+)"', s[i:])
        if m:
            hashes = m.group(1)
            j = i + m.end()
            closer = '"' + hashes
            end = s.find(closer, j)
            if end == -1:
                return self.n
            return end + len(closer)
        if s[i] == '"':
            j = i + 1
            while j < self.n:
                c = s[j]
                if c == "\\" and j + 1 < self.n:
                    j += 2
                    continue
                if c == '"':
                    return j + 1
                j += 1
            return self.n
        return i

    def skip_line_comment(self, i):
        s = self.s
        if s[i:i + 2] == "//":
            j = s.find("\n", i)
            return self.n if j == -1 else j
        return i


def find_matching(s, open_i, open_ch="(", close_ch=")"):
    """从 open_i（指向 open_ch）开始，字符串/注释感知地找到匹配的 close_ch，返回 close_ch 下标。"""
    sc = Scan(s)
    i = open_i
    depth = 0
    while i < len(s):
        c = s[i]
        ni = sc.skip_string(i)
        if ni != i:
            i = ni
            continue
        ni = sc.skip_line_comment(i)
        if ni != i:
            i = ni
            continue
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


# ---------------------------------------------------------------------------
# TABLE_DEFS 解析
# ---------------------------------------------------------------------------
TABLE_DEFS_HEADER = re.compile(r'pub\s+const\s+TABLE_DEFS\s*:\s*&\s*\[\s*\(\s*&\s*str')


def parse_table_defs(text):
    """返回 {table_name: set(columns)}。只解析本文件内 pub const TABLE_DEFS 定义。"""
    m = TABLE_DEFS_HEADER.search(text)
    if not m:
        return None
    # 从 header 后第一个 '=' 找外层 &[
    eq = text.find("=", m.end())
    arr_open = text.find("[", eq)
    close = find_matching(text, arr_open, "[", "]")
    if close == -1:
        return {}
    body = text[arr_open + 1:close]  # 外层数组内容

    result = {}
    sc = Scan(body)
    i = 0
    L = len(body)
    while i < L:
        # 跳过字符串 / 注释 / 空白
        ni = sc.skip_string(i)
        if ni != i:
            i = ni
            continue
        ni = sc.skip_line_comment(i)
        if ni != i:
            i = ni
            continue
        if body[i] != "(":
            i += 1
            continue
        # 一个表条目：( "tbl", &[ ("col","type"), ... ] )
        entry_close = find_matching(body, i, "(", ")")
        if entry_close == -1:
            break
        entry = body[i:entry_close + 1]
        # 表名 = entry 里第一个 "..."
        tm = re.search(r'"([A-Za-z_][A-Za-z0-9_.]*)"', entry)
        if not tm:
            i = entry_close + 1
            continue
        tbl = tm.group(1)
        # 列名 = entry 里所有  "col" , "  形态（tuple 首元素）
        cols = set(re.findall(r'"([A-Za-z_][A-Za-z0-9_]*)"\s*,\s*"', entry))
        result[tbl] = cols
        i = entry_close + 1
    return result


# ---------------------------------------------------------------------------
# 内联 CREATE TABLE 块解析
# ---------------------------------------------------------------------------
CREATE_RE = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?', re.IGNORECASE)
# 约束关键字开头的「列定义」其实是表级约束，不算列名
CONSTRAINT_KW = {
    "PRIMARY", "UNIQUE", "CHECK", "CONSTRAINT", "FOREIGN",
    "EXCLUDE", "EXCLUSION",
}


def _split_top_level_commas(body):
    """字符串/注释感知地按顶层逗号切分列定义。"""
    parts = []
    sc = Scan(body)
    depth = 0
    start = 0
    i = 0
    L = len(body)
    while i < L:
        c = body[i]
        ni = sc.skip_string(i)
        if ni != i:
            i = ni
            continue
        ni = sc.skip_line_comment(i)
        if ni != i:
            i = ni
            continue
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        elif c == "," and depth == 0:
            parts.append(body[start:i])
            start = i + 1
        i += 1
    tail = body[start:]
    if tail.strip():
        parts.append(tail)
    return parts


def _leading_ident(chunk):
    """从一段列定义文本取首个标识符（列名）。返回 (name, first_word_upper) 或 (None, None)。"""
    t = chunk.strip().rstrip(",").strip()
    if not t:
        return None, None
    m = re.match(r'^"?([A-Za-z_][A-Za-z0-9_]*)"?', t)
    if not m:
        return None, None
    return m.group(1), m.group(1).upper()


def parse_create_blocks(text):
    """返回 {table_name: set(columns)}。跳过骨架 format! CREATE（含 {} 占位符）。"""
    result = {}
    for m in CREATE_RE.finditer(text):
        # 该行（向后到换行）若含 {} 占位符 → 骨架模板，跳过
        line_end = text.find("\n", m.start())
        head_line = text[m.start(): line_end if line_end != -1 else len(text)]
        if "{}" in head_line:
            continue
        # 若这一行是注释行（// 或 //!），说明命中的是文档注释里的示例文本，跳过
        line_start = text.rfind("\n", 0, m.start()) + 1
        if text[line_start:m.start()].lstrip().startswith("//"):
            continue
        # 从 m.end() 扫到 '('，中间这段就是表名（可含 schema. 前缀 / 引号）
        k = m.end()
        while k < len(text) and text[k] not in "(\n":
            k += 1
        if k >= len(text) or text[k] != "(":
            continue
        tbl_txt = text[m.end():k].strip().strip('"').strip()
        # 可能带 schema. 前缀（gis.maps / "public"."foo"）
        tbl_txt = tbl_txt.split(".")[-1].strip('"').strip()
        body_close = find_matching(text, k, "(", ")")
        if body_close == -1:
            continue
        body = text[k + 1:body_close]
        cols = set()
        for chunk in _split_top_level_commas(body):
            name, first_up = _leading_ident(chunk)
            if not name:
                continue
            if first_up in CONSTRAINT_KW:
                continue
            cols.add(name)
        if tbl_txt:
            # 同文件同名表多个块时取并集
            result.setdefault(tbl_txt, set()).update(cols)
    return result


# ---------------------------------------------------------------------------
# 扫描入口
# ---------------------------------------------------------------------------
def find_tabledef_files(root):
    """返回所有定义了 pub const TABLE_DEFS 的 .rs 文件（相对 root 路径）。"""
    hits = []
    for base in ("svc", "lib"):
        d = os.path.join(root, base)
        if not os.path.isdir(d):
            continue
        for dirpath, dirnames, filenames in os.walk(d):
            if "target" in dirpath.split(os.sep):
                continue
            for fn in filenames:
                if not fn.endswith(".rs"):
                    continue
                p = os.path.join(dirpath, fn)
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        head = f.read(4000)
                except (OSError, UnicodeDecodeError):
                    continue
                if TABLE_DEFS_HEADER.search(head) or "pub const TABLE_DEFS" in head:
                    hits.append(p)
    return sorted(set(hits))


def main():
    root = "."
    args = sys.argv[1:]
    if "--root" in args:
        root = args[args.index("--root") + 1]
    os.chdir(root)

    files = find_tabledef_files(".")
    if not files:
        print("[drift] 未发现任何定义 TABLE_DEFS 的 .rs 文件")
        return 0

    total_drift = 0
    total_compared = 0
    total_skip_no_create = 0

    print(f"[drift] 扫描 {len(files)} 个 TABLE_DEFS 定义文件\n")

    for p in files:
        with open(p, "r", encoding="utf-8") as f:
            text = f.read()
        tdefs = parse_table_defs(text) or {}
        creates = parse_create_blocks(text)

        # 只对「同文件确有带列 CREATE 块」的文件做对拍，否则纯 INFO
        real_create = {t: c for t, c in creates.items()
                       if not (len(c) <= 1 and "id" in c and len(tdefs) == 0)}

        if not tdefs:
            continue

        file_drift = []
        compared = 0
        skip_no_create = 0
        for tbl, td_cols in sorted(tdefs.items()):
            td_norm = set(td_cols) | {"id"}  # id 运行期自动拼
            if tbl not in creates:
                skip_no_create += 1
                continue
            cr_cols = set(creates[tbl])
            only_td = sorted(td_norm - cr_cols)
            only_cr = sorted(cr_cols - td_norm)
            compared += 1
            if only_td or only_cr:
                file_drift.append((tbl, only_td, only_cr))

        # CREATE 里有、TABLE_DEFS 里没有的表
        create_only_tables = sorted(set(creates) - set(tdefs))

        if compared == 0 and not create_only_tables:
            # 该文件没有可对拍的双写（列 DDL 在迁移里）→ 仅计数，不打印细节
            total_skip_no_create += skip_no_create
            continue

        print(f"=== {p} ===")
        print(f"    TABLE_DEFS 表数={len(tdefs)}  同文件带列 CREATE 块表数={len(creates)}  "
              f"实际对拍表数={compared}")
        for tbl, only_td, only_cr in file_drift:
            total_drift += 1
            print(f"  [DRIFT] 表 {tbl}:")
            if only_td:
                print(f"      TABLE_DEFS 有而 CREATE 无 : {only_td}")
            if only_cr:
                print(f"      CREATE 有而 TABLE_DEFS 无: {only_cr}")
        for tbl in create_only_tables:
            total_drift += 1
            print(f"  [DRIFT] 表 {tbl}: CREATE 块存在但 TABLE_DEFS 未登记此表 "
                  f"(CREATE 列={sorted(creates[tbl])})")
        total_compared += compared
        total_skip_no_create += skip_no_create
        print()

    print("=" * 60)
    print(f"[drift] 汇总: 对拍表数={total_compared}  "
          f"无双写跳过表数={total_skip_no_create}  drift 处数={total_drift}")
    if total_drift > 0:
        print("[drift] 结论: 发现 TABLE_DEFS 与内联 CREATE TABLE 列名集合漂移 → FAIL (exit 1)")
        return 1
    print("[drift] 结论: 所有双写文件列名集合一致 → PASS (exit 0)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
