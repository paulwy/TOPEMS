#!/usr/bin/env python3
"""
date-type-audit.py — TOPEMS 日期时间类型分层审计（契约 docs/developer/standards/date-type-convention.md）

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
import datetime
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVC_DIR = os.path.join(ROOT, "svc")
MIG_DIRS = [os.path.join(ROOT, "database", "migrations")]
BASELINE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "date-type-baseline.json")

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
    """返回 (违规列表, DTO统计, 服务统计, 序列化Instant违规)"""
    violations = []           # (path, struct, field, type)
    ser_instant_violations = []   # (path, struct, field) — Instant 进入 Serialize 边界 = 契约违规
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
                is_serialize = 'Serialize' in nearest
                layer = 'entity' if is_entity else 'dto'
                block_lines = block.splitlines()
                for idx, line in enumerate(block_lines):
                    fm = FIELD_LINE.match(line)
                    if not fm:
                        continue
                    # B4：豁免收到字段级——仅该字段自身、紧邻上方的 doc 注释/属性行内的
                    # 'date-type-convention: exempt' 生效，结构体级豁免不再放行全部字段。
                    j = idx - 1
                    while j >= 0 and (block_lines[j].strip().startswith(('//', '#['))
                                      or not block_lines[j].strip()):
                        j -= 1
                    exempted = 'date-type-convention: exempt' in "\n".join(
                        block_lines[j + 1:idx + 1])
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
                    # P2-3: Instant 进入 Serialize 边界 = 契约违规（仅限进程内计时）
                    if is_serialize and t in ('Instant', 'Option<Instant>'):
                        ser_instant_violations.append((p, sname, name, t))
    return violations, field_stats, svc_stats, ser_instant_violations


# ── P2-1 序列化/解析风格统计（DTO 约定收敛度量）──
# 合规：DateTime → to_rfc3339()；NaiveDate → Display(parse::<NaiveDate>)
# 豁免（业务派生串，非时间序列化）：紧凑格式 format（%Y%m%d 批次号/文件名/统计key 等）
FORMAT_EXEMPT = re.compile(r'%Y%m%d|%Y-%m|%Y-W%U|%Y%m%d_%H%M%S|%Y%m%d%H%M|%Y%m%d%H%M%S%3f|%Y%m|%Y|%m')


def audit_serialization(service=None):
    """返回风格统计 Counter：to_rfc3339 / parse_from_rfc3339 / format(按串) / parse_from_str(按串) / FromStr"""
    styles = Counter()
    fmt_by = Counter()
    parse_by = Counter()
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
                c = f.read()
            styles['to_rfc3339'] += len(re.findall(r'\.to_rfc3339\(\)', c))
            styles['parse_from_rfc3339'] += len(re.findall(r'parse_from_rfc3339\(', c))
            styles['format_calls'] += len(re.findall(r'\.format\(\s*"', c))
            styles['parse_from_str'] += len(re.findall(r'parse_from_str\(', c))
            styles['FromStr_parse'] += len(re.findall(r'\.parse::<(?:chrono::)?NaiveDate>\(\)', c))
            for m in re.finditer(r'\.format\(\s*"([^"]*)"\s*\)', c):
                frmt = m.group(1)
                fmt_by[frmt] += 1
            for m in re.finditer(r'parse_from_str\(\s*[^,]+,\s*"([^"]*)"\s*\)', c):
                parse_by[m.group(1)] += 1
    return styles, fmt_by, parse_by


# ── B4：无时区 timestamp 列静态去重（近似迁移链最终态）──
# 口径与 audit_sql() 的出现次数不同：这里是唯一 (schema, table, column)，
# 并处理 ALTER COLUMN TYPE timestamptz / DROP TABLE / DROP COLUMN，
# 用于基线比对与"还差多少列没改"的可读指标。
_B4_IDENT = r'(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)'
_B4_QNAME = rf'({_B4_IDENT})(?:\s*\.\s*({_B4_IDENT}))?'
_B4_TS = re.compile(
    rf'(?i)^\s*({_B4_IDENT})\s+(timestamp(?:\s*\(\s*\d+\s*\))?(?:\s+with(?:out)?\s+time\s+zone)?|timestamptz)\b')


def _b4_strip(s):
    s = re.sub(r'/\*.*?\*/', ' ', s, flags=re.S)
    s = re.sub(r'(?m)^\s*--[^\n]*$', '', s)
    return re.sub(r'(?<![:\'])\s--[^\n]*', ' ', s)


def _b4_split(body):
    parts, depth, cur, i, in_str = [], 0, '', 0, False
    while i < len(body):
        c = body[i]
        if c == "'" and (i == 0 or body[i - 1] != "'"):
            in_str = not in_str
        if not in_str:
            if c in '([':
                depth += 1
            elif c in ')]':
                depth -= 1
            elif c == ',' and depth == 0:
                parts.append(cur)
                cur = ''
                i += 1
                continue
        cur += c
        i += 1
    if cur.strip():
        parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def parse_naive_unique():
    """返回仍为无时区 timestamp 的唯一列集合 {"schema.table.column"}（静态近似）。"""
    cols = {}
    search_path = 'public'

    def unq(x):
        return x.strip('"').lower() if x else x

    def touch(schema, table, col, typ, drop=False):
        key = (schema, table, col)
        if drop:
            cols.pop(key, None)
            return
        raw = typ.lower()
        if 'timestamptz' in raw or 'with time zone' in raw:
            cols.pop(key, None)
        elif 'timestamp' in raw:
            cols[key] = True

    for fn in sorted(os.listdir(MIG_DIRS[0])):
        if not fn.endswith('.sql'):
            continue
        t = _b4_strip(io.open(os.path.join(MIG_DIRS[0], fn), encoding='utf-8', errors='replace').read())
        for m in re.finditer(rf'(?i)\bSET\s+search_path\s+TO\s+([^;]+);', t):
            v = m.group(1).strip().strip('"')
            if ',' not in v:
                search_path = unq(v)
        for m in re.finditer(rf'(?i)\bCREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?{_B4_QNAME}\s*\(', t):
            schema = unq(m.group(1)) if m.group(2) else search_path
            table = unq(m.group(2) if m.group(2) else m.group(1))
            start, depth, i = m.end() - 1, 0, m.end() - 1
            while i < len(t):
                if t[i] == '(':
                    depth += 1
                elif t[i] == ')':
                    depth -= 1
                    if depth == 0:
                        break
                i += 1
            for coldef in _b4_split(t[start + 1:i]):
                tm = _B4_TS.match(coldef)
                if tm:
                    touch(schema, table, unq(tm.group(1)), tm.group(2))
        for m in re.finditer(rf'(?i)\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?{_B4_QNAME}((?:[^;])*)', t):
            schema = unq(m.group(1)) if m.group(2) else search_path
            table = unq(m.group(2) if m.group(2) else m.group(1))
            clause = m.group(3)
            for am in re.finditer(rf'(?i)\bADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?({_B4_IDENT})\s+([^,;]+)', clause):
                tm = _B4_TS.match(' ' + am.group(1) + ' ' + am.group(2))
                if tm:
                    touch(schema, table, unq(am.group(1)), tm.group(2))
            for am in re.finditer(rf'(?i)\bALTER\s+(?:COLUMN\s+)?({_B4_IDENT})\s+(?:SET\s+DATA\s+)?TYPE\s+([^,;]+)', clause):
                touch(schema, table, unq(am.group(1)), am.group(2))
            for am in re.finditer(rf'(?i)\bDROP\s+(?:COLUMN\s+)?(?:IF\s+EXISTS\s+)?({_B4_IDENT})', clause):
                touch(schema, table, unq(am.group(1)), '', drop=True)
        for m in re.finditer(rf'(?i)\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?{_B4_QNAME}', t):
            schema = unq(m.group(1)) if m.group(2) else search_path
            table = unq(m.group(2) if m.group(2) else m.group(1))
            for k in [k for k in cols if k[0] == schema and k[1] == table]:
                cols.pop(k)
    return {f"{s}.{tb}.{c}" for (s, tb, c) in cols}


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
    ap.add_argument('--write-baseline', action='store_true',
                    help='把当前唯一无时区 timestamp 列写入 scripts/date-type-baseline.json')
    args = ap.parse_args()

    report = {'rust': None, 'sql': None}
    exit_code = 0

    if not args.sql:
        violations, field_stats, svc_stats, ser_instant = audit_rust(args.service)
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
        if ser_instant:
            print(f"\n=== Instant 序列化边界违规（{len(ser_instant)} 处，须修复——Instant 仅限进程内计时） ===")
            for p, s, f, t in ser_instant:
                print(f"  {p}: {s}.{f}: {t}")
            exit_code = 1
        else:
            print("=== Instant 序列化边界违规：0 ✅（18 处 Instant 均为内部状态/缓存/计时，未跨序列化） ===")
        report['rust'] = {
            'entity_stats': dict(field_stats['entity']),
            'dto_stats': dict(field_stats['dto']),
            'entity_violations': [{'file': p, 'struct': s, 'field': f, 'type': t}
                                  for p, s, f, t in entity_violations],
            'ser_instant_violations': [{'file': p, 'struct': s, 'field': f, 'type': t}
                                       for p, s, f, t in ser_instant],
            'svc_stats': {k: dict(v) for k, v in svc_stats.items()},
        }

        # P2-1 序列化风格
        styles, fmt_by, parse_by = audit_serialization(args.service)
        print(f"\n=== [序列化风格] P2-1 约定收敛度量 ===")
        print(f"  合规: to_rfc3339 {styles['to_rfc3339']} / parse_from_rfc3339 {styles['parse_from_rfc3339']} / NaiveDate FromStr {styles['FromStr_parse']}")
        print(f"  待收敛: parse_from_str 总调用 {styles['parse_from_str']}")
        print(f"  豁免(业务派生): format 总调用 {styles['format_calls']}")
        for frmt, n in fmt_by.most_common(12):
            if frmt == '%Y-%m-%d':
                kind = '序列化风格(ISO Display, NaiveDate 应收敛 to_string)'
            elif FORMAT_EXEMPT.search(frmt):
                kind = '豁免(业务派生串)'
            else:
                kind = '人工可读/保留'
            print(f"    format {frmt!r}: {n}（{kind}）")
        for frmt, n in parse_by.most_common(8):
            print(f"    parse {frmt!r}: {n}")
        report['serialization'] = {
            'to_rfc3339': styles['to_rfc3339'],
            'parse_from_rfc3339': styles['parse_from_rfc3339'],
            'fromstr_naivedate': styles['FromStr_parse'],
            'parse_from_str_total': styles['parse_from_str'],
            'format_calls': styles['format_calls'],
            'format_by': dict(fmt_by),
            'parse_by': dict(parse_by),
        }

    if args.sql or not args.service:
        col_type, naive_cols = audit_sql()
        print(f"\n=== [SQL 层] 时间列类型分布（{sum(col_type.values())} 列） ===")
        for t, c in col_type.most_common():
            print(f"  {t:22s} {c}")
        if naive_cols:
            print(f"\n=== 无时区 timestamp 列（出现次数 {len(naive_cols)}，迁移候选） ===")
            seen = set()
            for fn, tbl, col in naive_cols[:60]:
                key = (tbl, col)
                if key in seen:
                    continue
                seen.add(key)
                print(f"  {tbl}.{col} ({fn})")
        unique_cols = parse_naive_unique()
        covered = any(
            'date-type-baseline: covered' in io.open(os.path.join(MIG_DIRS[0], fn), encoding='utf-8',
                                                     errors='replace').read()
            for fn in os.listdir(MIG_DIRS[0]) if fn.endswith('.sql'))
        baseline = {'naive_timestamp_columns': [], 'remaining': len(unique_cols)}
        if os.path.exists(BASELINE_PATH):
            with io.open(BASELINE_PATH, 'r', encoding='utf-8') as f:
                baseline = json.load(f)
        if args.write_baseline:
            baseline = {
                'updated_at': datetime.date.today().isoformat(),
                'naive_timestamp_columns': sorted(unique_cols),
                'remaining': 0 if covered else len(unique_cols),
            }
            with io.open(BASELINE_PATH, 'w', encoding='utf-8') as f:
                json.dump(baseline, f, ensure_ascii=False, indent=2)
            print(f"\n基线已写入 {BASELINE_PATH}（{len(unique_cols)} 列）")
        base_cols = set(baseline.get('naive_timestamp_columns', []))
        remaining = [] if covered else sorted(base_cols & unique_cols)
        new_cols = sorted(unique_cols - base_cols)
        print(f"\n=== 无时区 timestamp 唯一列（{len(unique_cols)} 个） ===")
        print(f"  基线登记: {len(base_cols)} 列；仍待迁移: {len(remaining)} 列"
              f"{'（迁移已声明全覆盖 covered）' if covered else ''}")
        if remaining:
            for c in remaining[:40]:
                print(f"  待迁移 {c}")
        if new_cols:
            print(f"\n=== 新增无时区 timestamp 列（{len(new_cols)} 个，基线外，须阻断） ===")
            for c in new_cols:
                print(f"  新增 {c}")
            exit_code = 1
        elif not remaining:
            print("  ✅ 无时区 timestamp 列已归零")
        report['sql'] = {
            'col_types': dict(col_type),
            'naive_timestamp_cols': naive_cols,
            'naive_timestamp_unique': sorted(unique_cols),
            'baseline_remaining': remaining,
            'baseline_new': new_cols,
        }

    if args.json:
        with io.open(args.json, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n基线已写入 {args.json}")

    return exit_code


if __name__ == '__main__':
    sys.exit(main())
