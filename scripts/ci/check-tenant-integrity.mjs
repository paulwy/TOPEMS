#!/usr/bin/env node
/**
 * scripts/ci/check-tenant-integrity.mjs
 *
 * 租户/公司数据完整性体检（演示与生产库通用）。背景见
 * docs/database/ledger-triage-20261125.md §10：本机曾出现「admin 在 iam.users 里存在，
 * 但 core_tenant_users 无成员记录、core_user_company_scopes 无范围」，而公司中间件是
 * fail-closed（没有范围就 403），再加上历史重建用户表留下的孤儿成员行占住 email 唯一槽，
 * 最终表现为「登录正常、所有公司级写接口 403」。这类问题不会报错、只会在运行期表现为 403，
 * 适合在部署前用一条 SQL 体检拦掉。
 *
 * 规则（命中即阻断；孤儿/错位属硬错误）：
 *   1) 孤儿成员：core_tenant_users 的 user_id 在 iam.users 里不存在（deleted_at IS NULL）；
 *   2) 范围指向不存在的公司：core_user_company_scopes.company_id 不在同租户 hrm.companies；
 *   3) 单公司租户漏范围：租户只有 1 家活跃公司时，每个活跃成员都必须有该公司范围记录
 *      （多公司租户按设计允许不配默认范围，不检查）。
 *
 * 用法：
 *   node scripts/ci/check-tenant-integrity.mjs            # 无 DB 时跳过（退出 0）
 *   node scripts/ci/check-tenant-integrity.mjs --db         # 连 MIGRATE_URL/DATABASE_URL 体检
 *   node scripts/ci/check-tenant-integrity.mjs --json
 */

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const WITH_DB = args.includes('--db');

const errors = [];
const fail = (rule, msg, rows) => errors.push({ rule, msg, rows });

function query(dsn, sql) {
    const out = execFileSync('psql', [dsn, '-tAq', '-F', '|', '-c', sql], {
        encoding: 'utf8',
        env: { ...process.env, PGOPTIONS: '-c statement_timeout=30000' },
    });
    return out.split('\n').map((l) => l.trim()).filter((l) => l !== '');
}

const SQL_ORPHAN_MEMBERS = `
select tu.tenant_id::text || '|' || tu.email || '|' || tu.user_id::text
from public.core_tenant_users tu
where tu.deleted_at is null
  and not exists (select 1 from iam.users u where u.id = tu.user_id)
order by 1 limit 50`;

const SQL_SCOPE_UNKNOWN_COMPANY = `
select s.tenant_id::text || '|' || s.user_id::text || '|' || s.company_id::text
from public.core_user_company_scopes s
where not exists (
    select 1 from hrm.companies c
    where c.tenant_id = s.tenant_id and c.id = s.company_id and c.deleted_at is null
)
order by 1 limit 50`;

const SQL_SINGLE_COMPANY_MEMBER_WITHOUT_SCOPE = `
with active_company as (
    select tenant_id, count(*) as n from hrm.companies where deleted_at is null group by tenant_id
), single as (
    select tenant_id from active_company where n = 1
), member as (
    select tu.tenant_id, tu.user_id, tu.email
    from public.core_tenant_users tu
    join iam.users u on u.id = tu.user_id
    where tu.deleted_at is null
      and tu.status = 'active'
      and u.is_active
      and u.deleted_at is null
      and tu.tenant_id in (select tenant_id from single)
)
select m.tenant_id::text || '|' || m.email || '|' || m.user_id::text
from member m
where not exists (
    select 1 from public.core_user_company_scopes s
    where s.tenant_id = m.tenant_id and s.user_id = m.user_id
)
order by 1 limit 50`;

function main() {
    if (!WITH_DB) {
        console.log('⏭  check-tenant-integrity：未给 --db，跳过 DB 体检');
        return 0;
    }
    const dsn = process.env.MIGRATE_URL || process.env.DATABASE_URL;
    if (!dsn) {
        console.error('✗ --db 需要 MIGRATE_URL 或 DATABASE_URL');
        return 2;
    }

    const checks = [
        ['orphan-member', '孤儿成员记录（user_id 在 iam.users 不存在）', SQL_ORPHAN_MEMBERS],
        ['scope-unknown-company', '公司范围指向不存在/已删除的公司', SQL_SCOPE_UNKNOWN_COMPANY],
        ['single-company-no-scope', '单公司租户的活跃成员缺公司范围', SQL_SINGLE_COMPANY_MEMBER_WITHOUT_SCOPE],
    ];

    for (const [rule, desc, sql] of checks) {
        let rows;
        try {
            rows = query(dsn, sql);
        } catch (e) {
            fail(rule, `查询失败：${String(e.message || e).split('\n')[0]}`, []);
            continue;
        }
        if (rows.length > 0) fail(rule, `${desc}：${rows.length} 行（最多列 50 行）`, rows);
    }

    if (JSON_MODE) {
        console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
    } else if (errors.length === 0) {
        console.log('✔ tenant-integrity ok：成员、公司范围与公司主数据一致');
    } else {
        for (const e of errors) {
            console.log(`✗ [${e.rule}] ${e.msg}`);
            for (const row of e.rows) console.log(`    ${row}`);
        }
        console.log('修复参考：scripts/db/backfill-admin-company-access.sh --apply（按租户/用户补齐成员与范围）');
    }
    return errors.length === 0 ? 0 : 1;
}

process.exit(main());
