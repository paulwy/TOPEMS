#!/usr/bin/env python3
"""
check_migration_column_types.py — 迁移建列类型 vs 代码结构体契约校验

背景：列名漂移修复的组织者迁移按 "f64→numeric" 等错误规则建列（000005 注释原文），
sqlx::query() 运行时解码报 mismatched types（f64 需 FLOAT8、DateTime<Utc> 需 TIMESTAMPTZ、
NaiveDate 需 DATE、Decimal 需 NUMERIC）。本脚本比对：
  1. 迁移文件（database/migrations/*.sql）中 ADD COLUMN / ALTER COLUMN TYPE 的最终类型
     （按文件名升序，ALTER TYPE 覆盖 ADD，得到每列的最终类型）
  2. 代码结构体字段（svc/*/src 中 `pub <col>:` 的 Rust 类型）→ 期望 PG 类型族
输出不匹配清单，辅助人工复核；匹配项列出供确认。

用法：
  python3 scripts/check_migration_column_types.py [--out f] [--limit N]
"""
import re
import subprocess
import collections
import sys
import os

MIG_DIR = "database/migrations"
SVC_DIR = "svc"

# Rust 类型 → 期望 PG 类型族（规范化后）
TYPE_MAP = [
    # (rust_pattern, pg_family_set)  pg 类型统一转大写去空格
    (r"f64", {"FLOAT8", "DOUBLEPRECISION", "DOUBLE"}),
    (r"f32", {"FLOAT4", "REAL"}),
    (r"i16", {"SMALLINT", "INT2"}),
    (r"i32", {"INTEGER", "INT", "INT4"}),
    (r"i64", {"BIGINT", "INT8"}),
    (r"u32", {"INTEGER", "INT", "INT4"}),
    (r"u64", {"BIGINT", "INT8"}),
    (r"bool", {"BOOLEAN", "BOOL"}),
    (r"String", {"TEXT", "VARCHAR", "CHARACTERVARYING", "CHAR", "CHARACTER"}),
    (r"Uuid", {"UUID"}),
    (r"DateTime<Utc>", {"TIMESTAMPTZ", "TIMESTAMPWITHTIMEZONE"}),
    (r"chrono::DateTime<chrono::Utc>", {"TIMESTAMPTZ", "TIMESTAMPWITHTIMEZONE"}),
    (r"chrono::DateTime<Utc>", {"TIMESTAMPTZ", "TIMESTAMPWITHTIMEZONE"}),
    (r"NaiveDateTime", {"TIMESTAMP", "TIMESTAMPWITHOUTTIMEZONE"}),
    (r"chrono::NaiveDateTime", {"TIMESTAMP", "TIMESTAMPWITHOUTTIMEZONE"}),
    (r"NaiveDate", {"DATE"}),
    (r"chrono::NaiveDate", {"DATE"}),
    (r"Decimal", {"NUMERIC", "DECIMAL"}),
    (r"BigDecimal", {"NUMERIC", "DECIMAL"}),
    (r"bigdecimal::BigDecimal", {"NUMERIC", "DECIMAL"}),
    (r"rust_decimal::Decimal", {"NUMERIC", "DECIMAL"}),
    (r"serde_json::Value", {"JSONB", "JSON"}),
    (r"JsonValue", {"JSONB", "JSON"}),
    (r"Vec<Uuid>", {"UUID[]"}),
    (r"Vec<String>", {"TEXT[]", "VARCHAR[]"}),
    (r"Vec<", {"JSONB"}),
]

def norm_pg(t):
    """PG 类型规范化：小写去空格、去长度/精度参数 → 大写无空格（VARCHAR(20)→VARCHAR、DECIMAL(18,2)→DECIMAL）"""
    t = re.sub(r"\s+", "", t.lower())
    t = re.sub(r"\([^)]*\)", "", t)
    return t.upper()

def rust_to_pg_family(rust_type):
    """结构体字段 Rust 类型 → 期望 PG 类型族（集合）。剥 Option/Box 再匹配。"""
    r = rust_type.strip()
    # 剥外层 Option<...> / Box<...>（可嵌套），剥后清理所有空白（泛型内可能带空格）
    while True:
        m = re.match(r"^(Option|Box|Arc|Rc)<(.+)>$", r, re.S)
        if m:
            r = m.group(2).strip()
        else:
            break
    r = re.sub(r"\s+", "", r)
    # 剥引用/指针
    r = r.lstrip("&'static").strip()
    for pat, fam in TYPE_MAP:
        if re.fullmatch(pat, r.strip(), re.S):
            return fam
    return None  # 未知类型，不判定

def find_struct_field(col, svc_hint=None):
    """在 svc 下 grep `pub <col>:`，返回 (文件, rust_type) 列表。svc_hint 优先。"""
    roots = [SVC_DIR]
    if svc_hint:
        roots = [os.path.join(SVC_DIR, svc_hint)]
    results = []
    pat = re.compile(r"pub\s+" + re.escape(col) + r"\s*:\s*([^,{]+?)(?:\s*,|\s*})", re.S)
    for root in roots:
        try:
            out = subprocess.run(
                ["grep", "-rn", f"pub {col}:", root, "--include=*.rs"],
                capture_output=True, text=True, timeout=60,
            ).stdout
        except Exception:
            continue
        for line in out.splitlines():
            # "file:line:    pub col: Option<DateTime<Utc>>,"
            parts = line.split(":", 2)
            if len(parts) < 3:
                continue
            f = parts[0]
            m = pat.search(parts[2])
            if m:
                results.append((f, m.group(1).strip()))
    return results

def parse_migrations():
    """解析全部迁移，返回 (schema.table, col) -> 最终 PG 类型（按文件名升序应用）。"""
    final = {}
    files = sorted(f for f in os.listdir(MIG_DIR) if f.endswith(".sql"))
    pat_add = re.compile(
        r"ALTER\s+TABLE\s+([\w.]+)\s+ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)\s+([^\s,;()]+(?:\s*\(\s*[\w,]+\s*\))?(?:\s*\[\])?)(\s+DEFAULT\s+[^,;]+)?",
        re.I,
    )
    pat_alt = re.compile(
        r"ALTER\s+TABLE\s+([\w.]+)\s+ALTER\s+COLUMN\s+(\w+)\s+TYPE\s+([^\s,;()]+(?:\s*\(\s*[\w,]+\s*\))?(?:\s*\[\])?)",
        re.I,
    )
    for fn in files:
        s = open(os.path.join(MIG_DIR, fn), encoding="utf-8").read()
        for m in pat_add.finditer(s):
            tbl, col, t = m.group(1), m.group(2), m.group(3)
            final[(tbl, col)] = norm_pg(t)
        for m in pat_alt.finditer(s):
            tbl, col, t = m.group(1), m.group(2), m.group(3)
            final[(tbl, col)] = norm_pg(t)
    return final

def main():
    args = sys.argv[1:]
    out_file = None
    limit = None
    for i, a in enumerate(args):
        if a == "--out" and i + 1 < len(args):
            out_file = args[i + 1]
        if a == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])

    final = parse_migrations()
    ok, bad, skip, unknown = [], [], [], []

    for (tbl, col), pg in sorted(final.items()):
        # 尝试 svc_hint：表名 → 服务名（取 schema 部分或表名前缀）
        svc_hint = None
        if "." in tbl:
            svc_hint = tbl.split(".")[0]
            if svc_hint == "public":
                svc_hint = None
        fields = find_struct_field(col, svc_hint)
        if not fields:
            skip.append(f"  {tbl}.{col}: {pg}  <- 代码未找到 pub {col}: 字段（跳过）")
            continue
        matched_any = False
        notes = []
        for f, rtype in fields:
            fam = rust_to_pg_family(rtype)
            if fam is None:
                notes.append(f"{rtype}(未知类型)")
                continue
            if pg in fam:
                matched_any = True
                notes.append(f"{rtype} ✓")
            else:
                notes.append(f"{rtype}(期望 {sorted(fam)[0]}) ✗")
        rec = f"  {tbl}.{col}: {pg}  <- {', '.join(dict.fromkeys(notes))}  [{f.split('/')[-2] + '/' + f.split('/')[-1] if fields else ''}]"
        if matched_any:
            ok.append(rec)
        else:
            bad.append(rec)

    lines = []
    lines.append(f"迁移建列总数: {len(final)}，匹配: {len(ok)}，不匹配: {len(bad)}，代码未找到字段: {len(skip)}")
    lines.append("")
    lines.append("=== 不匹配（迁移建列类型 vs 代码契约，需人工复核）===")
    for r in bad:
        lines.append(r)
    lines.append("")
    lines.append("=== 匹配确认 ===")
    for r in ok:
        lines.append(r)
    lines.append("")
    lines.append("=== 代码未找到字段（跳过）===")
    for r in skip:
        lines.append(r)
    text = "\n".join(lines)
    if out_file:
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"报告已写入 {out_file}（{len(bad)} 项不匹配）")
    else:
        print(text[: (limit * 150) if limit else None])

if __name__ == "__main__":
    main()
