#!/usr/bin/env python3
"""权限码三端对账（FE / BE / DB）

扫描三处的 `<module>:<resource>:<action>` 权限码，输出差异分类，供 P3 权限码统一专项使用。

用法：
  python3 scripts/audit_permission_codes.py --summary
  python3 scripts/audit_permission_codes.py --json > /tmp/perm.json

db 集合口径（批 26 变更）：
  读 public.core_permissions 表（运行时真实可用码）。历史上的「扫 SQL 文件」口径会把
  「声明了但从未落库」与「历史迁移建了但 SQL 无声明」混进 db_only，已改为独立输出
  code_drift（sql_only_never_persisted / db_only_not_in_sql）供漂移比对。
  连接串优先级：--dsn > 环境变量 TOPEMS_AUDIT_DSN > 环境变量 DATABASE_URL > 仓库根 .env 的
  DATABASE_URL；均无或 psql 不可用时回退 SQL 扫描（输出标注 db_source: sql_fallback 及原因）。

SQL 声明基线口径（批 39 变更）：
  sql_declared 只扫 database/init（现行声明）；database/migrations 拆为独立字段
  sql_history_orphan / sql_history_codes / sql_history_also_current，仅作回溯取证，
  不再计入声明基线。批 25 已 DELETE 的字面量原本留在 migrations 里，会被旧口径
  （init ∪ migrations）永远计入 SQL-only、无法收敛；新口径下它们落入
  sql_history_orphan（历史孤立字面量），不再污染声明基线。

分类口径：
  ① be_only      BE 校验声明但 FE 未引用（前端菜单/按钮可能缺约束）
  ② fe_only      FE 引用但 BE 未声明（前端引用不存在的码，或被 DB 授权兜底）
  ③ rename       归一化（去 _/-）后同义的命名不一致组
  ④ fe_orphan    FE 引用但 BE 与 DB 都没有（真正的前端孤儿权限码）

退出码：默认恒为 0（只做对账报告，不拦截流水线）；加 ``--gate`` 时改为门禁模式——
live DB 不可用（禁止静默回退 SQL 扫描）或存在「live DB 有、init 与 migrations 均无字面量」
的权限码即 exit 1。CI 用 ephemeral 种子库（迁移链空库全量应用）只读校验，不引入生产凭据。
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from typing import Dict, Iterable, List, Set, Tuple

CODE_RE = re.compile(r"""['"]([a-z][a-z0-9_]+):([a-z][a-z0-9_]*):([a-z][a-z0-9_]*)['"]""")

# 批27：排除测试文件——单测 mock 里的权限码字面量不是生产消费，计入基线会制造假 orphan
# （批15 实测 +19/+7，批26 口径改源后 finance:account:read 即为此类）。
SKIP_MARKERS = (
    '/target/', '/node_modules/', '/dist/', '/.next/', '/__pycache__/',
    '/__tests__/', '.test.', '.spec.',
)


def _iter_files(root: str, exts: Iterable[str]) -> Iterable[str]:
    for ext in exts:
        for path in glob.glob(f'{root}/**/*{ext}', recursive=True):
            if any(marker in path for marker in SKIP_MARKERS):
                continue
            yield path


def scan_codes(root: str, exts: Iterable[str], limit_per_code: int = 5) -> Dict[str, List[Tuple[str, int]]]:
    """返回 {code: [(file, line), ...]}，每个 code 最多保留 limit_per_code 条证据。"""
    found: Dict[str, List[Tuple[str, int]]] = defaultdict(list)
    for path in _iter_files(root, exts):
        try:
            with open(path, encoding='utf-8', errors='ignore') as handle:
                lines = handle.read().split('\n')
        except OSError:
            continue
        for lineno, line in enumerate(lines, 1):
            stripped = line.strip()
            # SQL 注释与"旧码改写条件"不构成注册：跳过 -- 注释、
            # 以及 UPDATE/DELETE 中 WHERE code = '<旧码>' 的改写判定（统一迁移据此兼容历史库）。
            if stripped.startswith('--'):
                continue
            if re.search(r"WHERE\s+(?:[a-z_]+\\.)?code\s*=\s*['\"]", line, re.IGNORECASE):
                continue
            for match in CODE_RE.finditer(line):
                code = match.group(0)[1:-1]
                if len(found[code]) < limit_per_code:
                    found[code].append((path, lineno))
    return dict(found)


def normalize(code: str) -> str:
    """归一化 resource 段：去掉下划线/连字符，用于识别同义不同命名。

    只对标准三段码生效；非三段码（如 admin:iam:tenant:write）原样返回，避免 split 解包失败。
    """
    parts = code.split(':')
    if len(parts) != 3:
        return code
    module, resource, action = parts
    return f'{module}:{re.sub(r"[_\\-]", "", resource.to_string() if False else resource)}:{action}'


def project_env_value(key: str) -> str:
    """从仓库根 .env 读取键值（不打印内容）。找不到返回空串。"""
    try:
        with open('.env', encoding='utf-8') as fh:
            for line in fh:
                line = line.strip()
                if line.startswith(f'{key}='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    except OSError:
        pass
    return ''


def resolve_dsn(dsn: str | None = None) -> Tuple[str, str]:
    """按「显式 > 审计专用 > 项目 .env > 进程环境」顺序解析 DSN，并返回来源标签。

    2026-11-17 修正：此前 ``DATABASE_URL`` 进程环境优先于项目 ``.env``。开发机/CI
    常把 ``DATABASE_URL`` 指向测试库（如 ``topems_test_runner``），一旦该库的
    ``core_permissions`` 缺列，脚本会静默降级到 SQL 扫描并输出严重失真的 DB 计数
    （实测 12 vs 真实 1157）。审计的对象是项目库，故 ``.env`` 优先于进程环境；
    显式 ``--dsn`` 与 ``TOPEMS_AUDIT_DSN`` 仍可覆盖。
    """
    if dsn:
        return dsn, '--dsn'
    audit_dsn = os.environ.get('TOPEMS_AUDIT_DSN')
    if audit_dsn:
        return audit_dsn, 'TOPEMS_AUDIT_DSN'
    project_dsn = project_env_value('DATABASE_URL')
    if project_dsn:
        return project_dsn, '.env:DATABASE_URL'
    env_dsn = os.environ.get('DATABASE_URL')
    if env_dsn:
        return env_dsn, 'env:DATABASE_URL'
    return '', 'none'


def dsn_dbname(target: str) -> str:
    """从 DSN 提取库名用于报错（不泄露账号密码）。"""
    tail = target.rsplit('/', 1)[-1] if target else ''
    return tail.split('?', 1)[0] or '(unknown)'


def collect_live_db(
    dsn: str | None = None, limit_per_code: int = 5
) -> Tuple[Dict[str, List[Tuple[str, int]]] | None, str | None, str]:
    """读取 core_permissions 表（运行时真实可用码）。

    批 26 口径变更：此前 db 集合来自 scan_codes('database/init') + scan_codes('database/migrations')，
    即「SQL 文件里的码声明」，不是数据库表。二者不等价（实测 SQL 声明 1108 / DB 实际 1238），
    会把「SQL-only（声明了但从未落库）」与「DB-only（历史迁移链建了但 SQL 无声明）」混进
    db_only，导致对账基线失真。现改为读 live DB；SQL 声明集单独作为漂移比对输出。

    返回 (码集, 错误信息, DSN 来源标签)。psql 不可用或连接失败时返回 (None, 原因, 来源)，
    调用方回退到 SQL 扫描并在输出中显式标注降级。
    """
    target, source = resolve_dsn(dsn)
    if not target:
        return None, '未提供 DSN（--dsn / TOPEMS_AUDIT_DSN / .env / 进程环境均无）', source
    try:
        proc = subprocess.run(
            [  # 固定 psql 参数，无用户输入拼接
                'psql', target, '-t', '-A', '-c',
                "SELECT code FROM public.core_permissions "
                "WHERE code ~ '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$' "
                "AND deleted_at IS NULL ORDER BY 1",
            ],
            capture_output=True, text=True, timeout=60,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return None, f'{source}: {type(exc).__name__}: {exc}', source
    if proc.returncode != 0:
        first = (proc.stderr or '').strip().split('\n')[0][:200]
        return None, f'{source} → {dsn_dbname(target)}: {first}', source
    codes = [line.strip() for line in proc.stdout.split('\n') if line.strip()]
    if not codes:
        return None, f'{source} → {dsn_dbname(target)}: core_permissions 查询返回 0 行', source
    return {code: [('live:public.core_permissions', 0)] for code in codes}, None, source


def scan_sql_declared(limit_per_code: int = 5) -> Dict[str, List[Tuple[str, int]]]:
    """现行 SQL 声明集：仅扫 ``database/init``。

    批 39 口径修正：此前 ``init ∪ migrations`` 并集被算作「SQL 声明」，
    导致批 25 已在 live DB ``DELETE`` 的码，其字面量仍留在 migrations 历史文件里
    （``DELETE ... code IN ('...', ...)`` 多行列表 / 早期迁移 INSERT 后又被后续迁移清理），
    永远计入 ``SQL-only`` 差集、无法收敛。现拆为两个独立集合：

    - ``scan_sql_declared`` —— **声明基线**，仅 ``database/init``（现行声明）。
    - ``scan_sql_history``  —— **历史回溯**，仅 ``database/migrations``，独立输出为
      ``code_drift.sql_history_*``，不参与声明基线判定。

    ``fe_orphan`` / ``db_only`` / ``fe_only`` 等主分类口径不变；live DB 仍是权威。
    """
    return scan_codes('database/init', ('.sql',), limit_per_code)


def scan_sql_history(limit_per_code: int = 5) -> Dict[str, List[Tuple[str, int]]]:
    """历史迁移文件里出现过的码字面量：仅扫 ``database/migrations``。

    用于回溯取证（查「某码曾经在哪次迁移引入/删除」），**不**作为现行声明基线。
    其中相当一部分是批 25 已 ``DELETE`` 的字面量、或早期迁移 INSERT 后被后续清理的码，
    与 live DB / init 都不重合，应单独输出、不计入 ``sql_only``。
    """
    return scan_codes('database/migrations', ('.sql',), limit_per_code)


def classify(fe: Dict, be: Dict, db: Dict) -> Dict:
    fe_set, be_set, db_set = set(fe), set(be), set(db)
    be_valid = be_set | db_set

    be_only = sorted(be_set - fe_set)
    fe_only = sorted(fe_set - be_set)
    fe_orphan = sorted(fe_set - be_valid)
    db_only = sorted(db_set - fe_set - be_set)

    # ③ 命名不一致：对三端全集按归一化分组，组内出现多个确切写法即视为同义双码
    #    （典型：mes:workorder:read(BE) vs mes:work_order:read(DB+FE)）
    all_codes = be_set | db_set | fe_set
    by_norm: Dict[str, List[str]] = defaultdict(list)
    for code in sorted(all_codes):
        by_norm[normalize(code)].append(code)
    rename_groups = []
    for norm in sorted(by_norm.keys()):
        variants = by_norm[norm]
        if len(variants) < 2:
            continue
        sides = {}
        for variant in variants:
            sides[variant] = {
                'be': variant in be_set,
                'db': variant in db_set,
                'fe': variant in fe_set,
            }
        rename_groups.append({'normalized': norm, 'variants': sides})

    return {
        'counts': {
            'fe': len(fe_set),
            'be': len(be_set),
            'db': len(db_set),
            'both_fe_be': len(fe_set & be_set),
            'be_only': len(be_only),
            'fe_only': len(fe_only),
            'fe_orphan': len(fe_orphan),
            'db_only': len(db_only),
            'rename_groups': len(rename_groups),
        },
        'be_only': be_only,
        'fe_only': fe_only,
        'fe_orphan': fe_orphan,
        'db_only': db_only,
        'rename_groups': rename_groups,
        'module_distribution': {
            'fe_only': dict(Counter(c.split(':')[0] for c in fe_only).most_common()),
            'fe_orphan': dict(Counter(c.split(':')[0] for c in fe_orphan).most_common()),
            'be_only': dict(Counter(c.split(':')[0] for c in be_only).most_common()),
        },
        'evidence': {
            'fe_orphan': {c: fe.get(c, []) for c in fe_orphan[:80]},
            'rename_evidence': {
                variant: (be.get(variant) or db.get(variant) or fe.get(variant) or [])
                for group in rename_groups
                for variant in group['variants']
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='FE/BE/DB 权限码三端对账')
    parser.add_argument('--json', action='store_true', help='输出完整 JSON')
    parser.add_argument('--summary', action='store_true', help='仅输出统计摘要（默认）')
    parser.add_argument('--limit', type=int, default=5, help='每个码保留的证据条数')
    parser.add_argument(
        '--gate',
        action='store_true',
        help='门禁模式：live DB 不可用或存在「DB 有、SQL(init∪migrations) 无」的码时 exit 1',
    )
    parser.add_argument(
        '--dsn',
        default=None,
        help='数据库连接串（默认取 TOPEMS_AUDIT_DSN / DATABASE_URL / .env 的 DATABASE_URL）',
    )
    args = parser.parse_args()

    fe = scan_codes('apps/web/src', ('.ts', '.tsx'), args.limit)
    be = scan_codes('svc', ('.rs',), args.limit)

    # 批 26：db 集合改为读 live DB（运行时真实可用码）；SQL 声明集单独输出做漂移比对
    # 批 39：SQL 声明基线拆为两路——
    #   sql_declared = database/init（现行声明，与 live DB 做漂移比对）
    #   sql_history  = database/migrations（历史回溯取证，独立输出，不计入声明基线）
    live_db, live_err, dsn_source = collect_live_db(dsn=args.dsn, limit_per_code=args.limit)
    sql_declared = scan_sql_declared(args.limit)
    sql_history = scan_sql_history(args.limit)
    if live_db is not None:
        db = live_db
        db_source = 'live'
    else:
        db = sql_declared
        db_source = 'sql_fallback'

    report = classify(fe, be, db)

    # 口径与漂移信息（区分「口径变更」与「数据变化」）
    db_set, sql_set, hist_set = set(db), set(sql_declared), set(sql_history)
    report['db_source'] = db_source
    report['db_source_error'] = live_err
    report['db_dsn_source'] = dsn_source
    report['code_drift'] = {
        'live_db_codes': len(db_set),
        'sql_declared_codes': len(sql_set),
        'in_both': len(db_set & sql_set),
        # 声明基线（init）与 live DB 的差集：真·冗余 / 真·未落地
        'sql_only_never_persisted': sorted(sql_set - db_set),
        'db_only_not_in_sql': sorted(db_set - sql_set),
        # 历史迁移回溯（migrations）：与 live/init 三方对照
        'sql_history_codes': len(hist_set),
        # 仅在历史 migrations、既不在 init 声明、也不在 live DB 的码
        # —— 典型为批 25 DELETE 后仍留在迁移文件里的字面量 / 已废弃码
        'sql_history_orphan': sorted(hist_set - db_set - sql_set),
        # migrations 里仍在 live DB / init 中的码（即现行码的历史引入点）
        'sql_history_also_current': len(hist_set & (db_set | sql_set)),
        # 防复发（2026-11-18）：live DB 有、但 init 与 migrations 都没有字面量的码。
        # 非空即说明存在「运行期自举/手工种入」的未登记权限码（如 2026-10-26
        # iam::init_database 写入的 69 条伞码），门禁模式下直接失败。
        'db_only_not_in_any_sql': sorted(db_set - sql_set - hist_set),
    }

    gate_problems: List[str] = []
    if args.gate:
        if db_source != 'live':
            gate_problems.append(
                f'live DB 不可用（{live_err}）；--gate 禁止回退 SQL 扫描，请检查 DSN'
            )
        unregistered = report['code_drift']['db_only_not_in_any_sql']
        if unregistered:
            preview = ', '.join(unregistered[:20])
            gate_problems.append(
                f'{len(unregistered)} 个权限码在 live DB 存在、但 init 与 migrations 均无字面量：'
                f'{preview}{" …" if len(unregistered) > 20 else ""}'
            )
        report['gate'] = {'pass': not gate_problems, 'problems': gate_problems}

    if args.json:
        json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write('\n')
        return 0 if not gate_problems else 1

    counts = report['counts']
    print('权限码三端对账')
    src = report.get('db_source')
    print(f"  DSN 来源：{report.get('db_dsn_source')}")
    if src == 'live':
        print('  DB 来源：live（读 public.core_permissions）')
    else:
        print(f'  DB 来源：sql_fallback（{report.get("db_source_error")}）')
        print('  WARN: DB 侧已降级为 SQL 文件扫描，不代表运行时真实可用码；不要用该 DB 计数做基线或门禁判据。')
    print(f"  FE {counts['fe']} | BE {counts['be']} | DB {counts['db']} | FE∩BE {counts['both_fe_be']}")
    drift = report.get('code_drift') or {}
    if drift:
        print(
            f"  漂移：SQL 声明(init) {drift['sql_declared_codes']} | live DB {drift['live_db_codes']} | "
            f"交集 {drift['in_both']} | SQL-only {len(drift['sql_only_never_persisted'])} | "
            f"DB-only {len(drift['db_only_not_in_sql'])}"
        )
        if 'sql_history_codes' in drift:
            print(
                f"  历史迁移(migrations) {drift['sql_history_codes']} 条；"
                f"其中仅历史、未在 init/live 的孤立字面量 {len(drift['sql_history_orphan'])} 条；"
                f"仍为现行码的历史引入点 {drift['sql_history_also_current']} 条"
            )
        print(
            f"  未登记（live DB 有、init∪migrations 无字面量）: "
            f"{len(drift['db_only_not_in_any_sql'])}"
        )
    print(f"  ① be_only {counts['be_only']}   ② fe_only {counts['fe_only']}   ④ fe_orphan {counts['fe_orphan']}   db_only {counts['db_only']}")
    print(f"  ③ 命名不一致组 {counts['rename_groups']}")
    for group in report['rename_groups'][:20]:
        parts = []
        for variant, sides in group['variants'].items():
            where = '/'.join(k.upper() for k, on in sides.items() if on)
            parts.append(f'{variant}({where})')
        print('    - ' + ' vs '.join(parts))
    if report['module_distribution']['fe_orphan']:
        print('  ④ fe_orphan 模块分布（前 10）:', dict(list(report['module_distribution']['fe_orphan'].items())[:10]))
    if gate_problems:
        for problem in gate_problems:
            print(f'GATE FAIL: {problem}', file=sys.stderr)
        return 1
    if args.gate:
        print(f"GATE PASS：live DB {counts['db']} 个码均已由 database/init ∪ database/migrations 声明")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
