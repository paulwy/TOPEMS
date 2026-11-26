#!/usr/bin/env node
/**
 * scripts/ci/check-migration-archive.mjs
 *
 * 迁移账本空档归档表（database/migrations-archive.tsv）的门禁。
 *
 * 背景：本机账本与 schema 已脱钩，43 条历史空档永不补记账本，见
 * docs/database/ledger-triage-20261125.md。归档表用于「解释 pending 噪声」，
 * 必须防止它腐化成"把新迁移藏起来"的白名单。
 *
 * 规则（命中即阻断）：
 *   1) 表头必须含 version/description/status/reason_category/reason/evidence/decided_on；
 *   2) version 必须是 14 位时间戳，且 database/migrations 下存在 `version_*.sql`；
 *   3) status 仅允许 archived / replayable-not-applied；
 *   4) reason_category 仅允许固定枚举；reason 非空；decided_on 为 YYYY-MM-DD；
 *   5) version 不得重复；
 *   6) 冻结线：任何条目 version 必须 < FROZEN_CUTOFF（新增迁移不得进归档表）；
 *   7) 判读表 database/migrations-triage.tsv（本库不适用、prod/空库仍需跑）：class 枚举、
 *      version 有对应文件、与归档表版本互斥；判读行只记录本库拒绝原因、不承诺未执行，
 *      不做账本互斥校验。
 *   8) 互斥（需 DB）：给出 --db 且能连 MIGRATE_URL/DATABASE_URL 时，仅 archived 版本不得出现在
 *      public._sqlx_migrations 中（archived = 明确不记账、永不重放，二者互斥）；replayable 与判读行不在此列。
 *
 * 用法：
 *   node scripts/ci/check-migration-archive.mjs
 *   node scripts/ci/check-migration-archive.mjs --db          # 额外做账本互斥校验
 *   node scripts/ci/check-migration-archive.mjs --json
 *   ARCHIVE_PATH=/tmp/x.tsv node scripts/ci/check-migration-archive.mjs   # 自测用
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const ARCHIVE = process.env.ARCHIVE_PATH || join(ROOT, 'database/migrations-archive.tsv');
const MIGRATIONS_DIR = join(ROOT, 'database/migrations');

const REQUIRED_COLS = ['version', 'description', 'status', 'reason_category', 'reason', 'evidence', 'decided_on'];
const STATUSES = new Set(['archived', 'replayable-not-applied']);
const CATEGORIES = new Set([
    'legacy-hole',          // 历史空档（幂等通过但效果已在库中，未执行）
    'dep-moved',            // 依赖对象已搬迁
    'data-precondition',    // 历史数据前置不满足
    'enum-converged',       // 枚举值已收敛
    'policy-conflict',      // 与既有 RLS 策略冲突
    'perm-revoked',         // 需要已收回的角色权限
    'rls-seed-conflict',    // 种子写入被 RLS 拒绝
    'fk-precondition',      // 外键前置数据缺失
    'other',                // 未归类（需人工复核，应在 reason 里写清）
]);
// 冻结线：归档表只解释「2026-11-25 之前的 43 条历史空档」；新增迁移一律不得进表。
const FROZEN_CUTOFF = 20261201000000;

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const WITH_DB = args.includes('--db');

const errors = [];
const fail = (msg) => errors.push(msg);

function parseTsv(text) {
    const lines = text.split('\n').filter((l) => l.trim() !== '' && !l.startsWith('#'));
    if (lines.length === 0) return { header: [], rows: [] };
    const header = lines[0].split('\t');
    const rows = lines.slice(1).map((l) => {
        const cells = l.split('\t');
        const obj = {};
        header.forEach((k, i) => (obj[k] = (cells[i] ?? '').trim()));
        return obj;
    });
    return { header, rows };
}

if (!existsSync(ARCHIVE)) {
    fail(`归档表不存在：${ARCHIVE}`);
} else {
    const { header, rows } = parseTsv(readFileSync(ARCHIVE, 'utf-8'));
    const missing = REQUIRED_COLS.filter((c) => !header.includes(c));
    if (missing.length) fail(`表头缺列：${missing.join(', ')}`);
    if (rows.length === 0) fail('归档表无数据行');

    const files = existsSync(MIGRATIONS_DIR) ? readdirSync(MIGRATIONS_DIR) : [];
    const seen = new Set();

    for (const r of rows) {
        const tag = r.version || '<空版本>';
        if (!/^\d{14}$/.test(r.version)) fail(`${tag}: version 不是 14 位时间戳`);
        if (Number(r.version) >= FROZEN_CUTOFF) {
            fail(`${tag}: 越过冻结线（>= ${FROZEN_CUTOFF}）；新增迁移不得进归档表`);
        }
        if (seen.has(r.version)) fail(`${tag}: version 重复`);
        seen.add(r.version);
        if (!files.some((f) => f.startsWith(`${r.version}_`) && f.endsWith('.sql'))) {
            fail(`${tag}: database/migrations 下找不到 ${r.version}_*.sql`);
        }
        if (!STATUSES.has(r.status)) fail(`${tag}: status 非法（${r.status}）`);
        if (!CATEGORIES.has(r.reason_category)) fail(`${tag}: reason_category 非法（${r.reason_category}）`);
        if (!r.reason) fail(`${tag}: reason 为空`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.decided_on)) fail(`${tag}: decided_on 非 YYYY-MM-DD`);
        if (r.status === 'archived' && r.reason_category === 'other' && r.reason.length < 10) {
            fail(`${tag}: archived 且归为 other 时必须在 reason 写清原因`);
        }
    }

    // ---- 判读表（database/migrations-triage.tsv）：本库不适用、但目标环境仍需执行 ----
    // 与归档表分工：归档=永不重放（与账本互斥）；判读=记录本库拒绝原因，允许在目标环境记账，
    // 故判读行不做账本互斥校验，只守结构（class 枚举 / 版本有文件 / 与归档表不重叠）。
    const TRIAGE = process.env.TRIAGE_PATH || join(ROOT, 'database/migrations-triage.tsv');
    const TRIAGE_CLASSES = new Set(['gated-cleanup', 'bootstrap-only', 'prod-directed']);
    let triageRows = [];
    if (existsSync(TRIAGE)) {
        const parsed = parseTsv(readFileSync(TRIAGE, 'utf-8'));
        triageRows = parsed.rows;
        const missing = ['version', 'description', 'class', 'reason', 'evidence', 'decided_on'].filter(
            (c) => !parsed.header.includes(c),
        );
        if (missing.length) fail(`triage 表头缺列：${missing.join(', ')}`);
        const tSeen = new Set();
        for (const r of triageRows) {
            const tag = `triage ${r.version || '<空版本>'}`;
            if (!/^\d{14}$/.test(r.version)) fail(`${tag}: version 不是 14 位时间戳`);
            if (tSeen.has(r.version)) fail(`${tag}: version 重复`);
            tSeen.add(r.version);
            if (!TRIAGE_CLASSES.has(r.class)) fail(`${tag}: class 非法（${r.class}）`);
            if (!r.reason) fail(`${tag}: reason 为空`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(r.decided_on)) fail(`${tag}: decided_on 非 YYYY-MM-DD`);
            if (!files.some((f) => f.startsWith(`${r.version}_`) && f.endsWith('.sql'))) {
                fail(`${tag}: database/migrations 下找不到 ${r.version}_*.sql`);
            }
            if (seen.has(r.version)) fail(`${tag}: 与归档表版本重复（归档与判读互斥）`);
        }
    }

    // 互斥（需 DB）：archived = 永不重放，若账本里已有该版本说明归档判定与事实矛盾。
    // replayable-not-applied 的账本虚记（历史快照导入、execution_time=0）属重放评审范畴，
    // 不在归档互斥门禁内判定；判读行同样不做账本互斥。
    if (WITH_DB && errors.length === 0) {
        const dsn = process.env.MIGRATE_URL || process.env.DATABASE_URL;
        if (!dsn) {
            fail('--db 需要 MIGRATE_URL 或 DATABASE_URL');
        } else {
            try {
                const out = execFileSync('psql', [dsn, '-tAc', 'select version from public._sqlx_migrations where success'], {
                    encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
                });
                const installed = new Set(out.split('\n').map((s) => s.trim()).filter(Boolean));
                for (const r of rows) {
                    if (r.status !== 'archived') continue;
                    if (installed.has(String(Number(r.version)))) {
                        fail(`${r.version}: 已在 _sqlx_migrations 记账，与归档表互斥（二者只能存其一）`);
                    }
                }
                // 判读行不做账本互斥：其语义是「本库不适用」的拒绝记录，允许在目标环境记账。
            } catch (e) {
                fail(`连库失败，无法做互斥校验：${String(e.message).split('\n')[0]}`);
            }
        }
    }

    if (JSON_MODE) {
        console.log(JSON.stringify({ archive: ARCHIVE, rows: rows.length, errors }, null, 2));
    } else if (errors.length === 0) {
        const archived = rows.filter((r) => r.status === 'archived').length;
        console.log(
            `✔ migration-archive ok：归档 ${rows.length} 行（archived ${archived} / replayable ${rows.length - archived}），` +
                `判读 ${triageRows.length} 行，冻结线 ${FROZEN_CUTOFF}${WITH_DB ? '，归档行已做账本互斥校验' : ''}`,
        );
    }
}

if (errors.length && !JSON_MODE) {
    console.error('✗ migration-archive 校验失败：');
    for (const e of errors) console.error(`  - ${e}`);
}
process.exit(errors.length ? 1 : 0);
