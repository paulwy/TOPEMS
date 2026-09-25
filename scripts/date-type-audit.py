#!/usr/bin/env python3
"""
date-type-audit.py — TOPEMS 日期时间类型分层审计（契约 docs/date_type_convention.md）

检查三层：
  1. 实体层（#[derive(FromRow)] DB 映射 struct）：String/NaiveDateTime/int 时间字段 = 违规
  2. DTO/其他层：时间字段类型分布统计（供人工判断）
  3. SQL 迁移层：时间列类型分布 + 无时区 timestamp 列清单（迁移候选）

用法：
  python3 scripts/date-type-audit.py                  # 全项目，exit 1 = 存在实体层违规
  python3 scripts/date-type-audit.py --service mes    # 单服务
  python3 scripts/date-type-audit.py --sql            # 仅 SQL 层
  python3 scripts/date-type-audit.py --json out.json  # 输出 JSON 基线

基线（2026-09-25）：svc/* 1616 个 .rs 时间字段 3348 处；migrations 279 个 .sql 时间列 840 处。
"""
import re
import io
import os
import sys
import json
import argparse
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVC_DIR = os.path.join(ROOT, "svc")
MIG_DIRS = [os.path.join(ROOT, "database", "migrations")]

# ── 时间字段名模式（宽松前缀 + 时间后缀；避免把 schedule_no 之类当时间）──
_TIME_PREFIX = (r"(?:created|updated|deleted|started|finished|completed|approved|issued|returned|"
                r"received|paid|shipped|delivered|closed|archived|modified|synced|read|sent|"
                r"effective|expired|due|planned|actual|estimated|scheduled|recorded|occurred|"
                r"generated|processed|imported|exported|published|reviewed|checked|inspected|"
                r"maintained|repaired|installed|dispatched|arrived|departed|entered|exited|"
                r"begin|end|start|last|next|first|hire|birth|login|logout|access|join|leave|"
                r"execute|run|finish|close|open|issue|approve|confirm|cancel|ship|receive|pay|"
                r"settle|invoice|deliver|collect|apply|grant|revoke|expire|refresh|notify|"
                r"schedule|publish|archive|restore|lock|unlock)")
TIME_NAME = re.compile(
    rf"^{_TIME_PREFIX}[a-z_]*_(?:at|on|date|time|ts|timestamp)$"
    rf"|^{_TIME_PREFIX}(?:date|time|ts|timestamp)$"
    rf"|^[a-z_]+_(?:at|on|date|time|ts|timestamp)$"
    rf"|^[a-z][a-z0-9_]+_(?:at|on|date|time|ts|timestamp)$"
    rf"|^(?:date|time|timestamp|datetime|start_time|end_time|start_date|end_date)$",
    re.I)

FIELD_LINE = re.compile(
    r'^\s*(?:pub\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(Option<)?\s*'
    r'((?:chrono::)?(?:DateTime<[^>]*>|NaiveDateTime|NaiveDate|String|i64|u64|i32|u32|f64|Instant)'
    r'|[A-Za-z_][A-Za-z0-9_:<>]*)\s*(>)?\s*,?\s*$')
STRUCT_DEF = re.compile(r'^\s*(?:pub\s+)?struct\s+\w+(?:<[^>]*>)?\s*(?:where[^{]*)?\{', re.M)
FROMROW = re.compile(r'#\[derive\(([^\]]*FromRow[^\]]*)\]')

COL_DECL = re.compile(
    r'(?i)\b((?:[a-z_]+_(?:at|on|date|time|ts|timestamp))|(?:created|updated|deleted)_at|'
    r'date|time|timestamp|start_date|end_date|start_time|end_time|expires_at|due_date)\s+'
    r'(timestamptz|timestamp(?:\s*(?:\(\d+\))?(?:\s+with(?:out)?\s+time\s+zone)?)?|date|'
    r'time(?:\s*\(\d+\))?|varchar\(\d+\)|varchar|text|char\(\d+\)|bigint|integer|int|'
    r'numeric\(\d+,\d+\)|numeric|double precision|real|boolean|uuid|jsonb|json|interval)')


def norm_type(t, opt):
    core = t
    if 'DateTime<' in t:
        m = re.search(r'DateTime<(\w+)>', t)
        core = f"DateTime<{m.group(1)}>" if m else "DateTime<?>"
    elif 'NaiveDateTime' in t:
        core = 'NaiveDateTime'
    elif 'NaiveDate' in t:
        core = 'NaiveDate'
    elif 'String' in t:
        core = 'String'
    elif 'Instant' in t:
        core = 'Instant'
    elif t in ('i64', 'u64', 'i32', 'u32'):
        core = 'int-timestamp'
    elif t == 'f64':
        core = 'f64'
    return f"Option<{core}>" if opt else core


def find_struct_block(content, sm):
    start = sm.end() - 1
    depth = 0
    i = start
    while i < len(content):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                break
        i += 1
    return content[start:i]


def audit_rust(service=None):
    """返回 (违规列表, DTO统计, 服务统计)"""
    violations = []           # (path, struct, field, type)
    field_stats = defaultdict(Counter)   # 层 -> 类型 -> 计数
    svc_stats = defaultdict(Counter)
    for root, dirs, files in os.walk(SVC_DIR):
        for fn in sorted(files):
            if not fn.endswith('.rs'):
                continue
            svc = 'svc-root'
            parts = root.split(os.sep)
            if 'svc' in parts:
                svc = parts[parts.index('svc') + 1]
            if service and svc != service:
                continue
            p = os.path.join(root, fn)
            with io.open(p, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            for sm in STRUCT_DEF.finditer(content):
                name_m = re.search(r'struct\s+(\w+)', content[sm.start():sm.end()])
                sname = name_m.group(1) if name_m else '?'
                block = find_struct_block(content, sm)
                # 是否实体：取 struct 上方最近的 #[derive(...)]（忽略前一个 struct 的 derive）
                before = content[max(0, sm.start() - 600):sm.start()]
                derives = re.findall(r'#\[derive\(([^\]]*)\)\]', before)
                nearest = derives[-1] if derives else ''
                is_entity = 'FromRow' in nearest
                exempted = 'date-type-convention: exempt' in before
                layer = 'entity' if is_entity else 'dto'
                for line in block.splitlines():
                    fm = FIELD_LINE.match(line)
                    if not fm:
                        continue
                    name, opt, typ = fm.group(1), bool(fm.group(2)), fm.group(3)
                    if not TIME_NAME.match(name):
                        continue
                    t = norm_type(typ, opt)
                    field_stats[layer][t] += 1
                    svc_stats[svc][layer + ':' + t] += 1
                    if is_entity and t in ('String', 'Option<String>', 'int-timestamp', 'Option<int-timestamp>') and not exempted:
                        violations.append((p, sname, name, t))
                    elif is_entity and t in ('NaiveDateTime', 'Option<NaiveDateTime>') and not exempted:
                        # 需要豁免注释才算合规；先报告供人工确认
                        violations.append((p, sname, name, t + '(需豁免注释)'))
    return violations, field_stats, svc_stats


def audit_sql():
    """返回 (列类型分布, 无时区列清单)"""
    col_type = Counter()
    naive_cols = []            # (file, table, column)
    for base in MIG_DIRS + [os.path.join(ROOT, 'svc')]:
        for root, dirs, files in os.walk(base):
            for fn in sorted(files):
                if not fn.endswith('.sql'):
                    continue
                p = os.path.join(root, fn)
                with io.open(p, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                content = re.sub(r'(?m)^\s*--.*$', '', content)
                for m in COL_DECL.finditer(content):
                    col, raw = m.group(1).lower(), m.group(2).lower().strip()
                    if 'timestamptz' in raw or 'timestamp with time zone' in raw:
                        t = 'timestamptz'
                    elif 'timestamp' in raw:
                        t = 'timestamp(无时区)'
                        table_m = re.search(r'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:\w+\.)?(\w+)',
                                            content[max(0, m.start()-3000):m.start()], re.I)
                        naive_cols.append((os.path.basename(fn), table_m.group(1) if table_m else '?', col))
                    elif raw == 'date':
                        t = 'date'
                    elif raw.startswith('time'):
                        t = 'time'
                    elif 'varchar' in raw or 'text' in raw or 'char' in raw:
                        t = 'varchar/text'
                    elif raw in ('bigint', 'integer', 'int'):
                        t = 'int'
                    elif 'numeric' in raw or 'double' in raw or 'real' in raw:
                        t = 'numeric'
                    else:
                        t = 'other:' + raw
                    col_type[t] += 1
    return col_type, naive_cols


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--service', help='仅审计指定服务')
    ap.add_argument('--sql', action='store_true', help='仅 SQL 层')
    ap.add_argument('--json', help='输出 JSON 基线文件')
    args = ap.parse_args()

    report = {'rust': None, 'sql': None}
    exit_code = 0

    if not args.sql:
        violations, field_stats, svc_stats = audit_rust(args.service)
        entity_violations = [v for v in violations]
        if args.service:
            scope = f"服务 {args.service}"
        else:
            scope = "全项目"
        print(f"=== [Rust 层] {scope} ===")
        for layer in ('entity', 'dto'):
            parts = ', '.join(f"{t}:{c}" for t, c in field_stats[layer].most_common())
            print(f"  {layer:8s} {parts}")
        if entity_violations:
            print(f"\n=== 实体层违规（{len(entity_violations)} 处，须修复） ===")
            for p, s, f, t in entity_violations:
                print(f"  {p}: {s}.{f}: {t}")
            exit_code = 1
        else:
            print("\n=== 实体层违规：0 ✅（契约达标） ===")
        report['rust'] = {
            'entity_stats': dict(field_stats['entity']),
            'dto_stats': dict(field_stats['dto']),
            'entity_violations': [{'file': p, 'struct': s, 'field': f, 'type': t}
                                  for p, s, f, t in entity_violations],
            'svc_stats': {k: dict(v) for k, v in svc_stats.items()},
        }

    if args.sql or not args.service:
        col_type, naive_cols = audit_sql()
        print(f"\n=== [SQL 层] 时间列类型分布（{sum(col_type.values())} 列） ===")
        for t, c in col_type.most_common():
            print(f"  {t:22s} {c}")
        if naive_cols:
            print(f"\n=== 无时区 timestamp 列（{len(naive_cols)} 个，迁移候选） ===")
            seen = set()
            for fn, tbl, col in naive_cols[:60]:
                key = (tbl, col)
                if key in seen:
                    continue
                seen.add(key)
                print(f"  {tbl}.{col} ({fn})")
        report['sql'] = {
            'col_types': dict(col_type),
            'naive_timestamp_cols': naive_cols,
        }

    if args.json:
        with io.open(args.json, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n基线已写入 {args.json}")

    return exit_code


if __name__ == '__main__':
    sys.exit(main())
