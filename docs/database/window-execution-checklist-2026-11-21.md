# 开窗执行清单：W9-A / W9-B / W10（2026-11-21）

> 适用：`docs/database/window-readiness-2026-11-19.md` 中的 W9-A（`20261121235940`）、W9-B（`20261122090000`）、W10（`20261122150000`）。
> 本清单可照单执行；每一步都给出断言与失败回滚动作。整窗其它波次仍按窗口文档 §3 的顺序与硬依赖执行。
> 本清单不含任何生产写入；生产命令由当班 DBA 在窗口内执行。

## 0. 三件人工确认点（必须全部为「是」才允许动库）

| 编号 | 人工确认项 | 判定标准 | 谁确认 | 未确认的后果 |
|---|---|---|---|---|
| M1 | **C16 两次 PASS** | 窗口前 24h 内 1 次 + 开窗前 30min 1 次；两次均 `C16 PASS`（132 张 `READABLE` 且 `rows=0`，§7 例外查询 0 行）。两次之间发生任何写入/DDL/授权变更，前一次立即失效 | DBA（只读会话 `topems_prod`） | 不得动库；推迟窗口 |
| M2 | **同窗口二进制就绪** | W9 的 `erp` + `shared-auth` + `shared-db` 三个二进制已构建、可同一窗口发布；W10 无二进制依赖 | 发布负责人 | W9 先库后码会让 8 张合并表读 0 行、写被拒 |
| M3 | **备份完成且可读** | 第 1 节四组 `pg_dump` 全部生成，`pg_restore --list` 能读出对象，文件大小非 0 | DBA | 不允许执行任何迁移 |

> M1/M2/M3 是**必须人工确认的前置**。任何一项为「否」，后续步骤全部不执行。

## 1. 开窗前备份（必须，先于一切迁移）

备份对象：W9-A 的 8 张 erp 表、W9-B 的 `public.core_user_company_scopes`、W10 的 4 张 public 表，以及账本 `public._sqlx_migrations`。

```bash
# 变量按现场填写
PROD_DSN="postgresql://topems_prod@127.0.0.1:5432/topems_prod"
BK="/backup/window_$(date +%Y%m%d_%H%M%S)"; mkdir -p "$BK"

# 1) W9-A：erp 合并域 8 表（结构+数据+策略）
pg_dump "$PROD_DSN" -Fc \
  -t erp.company_relations -t erp.internal_transactions \
  -t erp.consolidation_scopes -t erp.consolidation_scope_companies \
  -t erp.consolidation_reports -t erp.consolidation_report_lines \
  -t erp.elimination_rules -t erp.elimination_candidates \
  -f "$BK/w9a_erp_8tables.dump"

# 2) W9-B：默认公司表
pg_dump "$PROD_DSN" -Fc -t public.core_user_company_scopes \
  -f "$BK/w9b_core_user_company_scopes.dump"

# 3) W10：审批/流程 4 表
pg_dump "$PROD_DSN" -Fc \
  -t public.approvals -t public.approval_records \
  -t public.core_workflow_instances -t public.core_workflow_tasks \
  -f "$BK/w10_public_4tables.dump"

# 4) 账本（回滚删行前必须可恢复）
pg_dump "$PROD_DSN" -Fc -t public._sqlx_migrations -f "$BK/ledger.dump"

# 断言：四份备份均可读且对象数 > 0
for f in "$BK"/*.dump; do
  echo "== $f"; pg_restore --list "$f" | grep -c '^[0-9]' ; done
```

**失败动作**：任一备份为空或不可读 → 停止，不进入第 2 节。

## 2. 准入检查（窗口前 24h 与 30min 各一次）

```bash
PGPASSFILE=<DBA 的 pgpass> \
PGOPTIONS="-c default_transaction_read_only=on -c app.rls_system=on" \
psql "postgresql://topems_prod@127.0.0.1:5432/topems_prod" \
  -f docs/database/window-preflight-2026-11-19.sql \
  > preflight_c16_$(date +%Y%m%d_%H%M%S).txt 2>&1
```

**断言**

1. §9 汇总：C1–C15、C17、C19 全部 `PASS`；C18 以 §7.5 为准（`legacy=0 / grants=0 / dict=0`）。
2. `C16` 行：`readable=132, no_priv=0, nonzero=0, missing=0`，且 §7 例外查询 0 行。
3. 任何 `NO_PRIV`、任一表 `rows > 0`、或漏带 `app.rls_system=on` 导致的 0 行假 PASS，均判 `C16 NOT PASS`。

**失败动作**：不执行第 3 节起的任何迁移；推迟窗口。不得用另一次 PASS 抵消本次 FAIL。

> 说明：`C16` 必须用合规只读角色（`topems_prod`），不能用 superuser 或 BYPASSRLS，否则判定恒真。

## 3. W9-A：ERP 合并域公司维度（`20261121235940`）

**前置断言（只读，任一不符即停）**

```sql
-- 3.1 账本：W9 两版本均未 success=t；三条前置 success=t
SELECT version, success FROM public._sqlx_migrations
WHERE version IN (20261114180000,20261120235900,20261121100000,
                  20261121235940,20261122090000) ORDER BY version;

-- 3.2 8 表各 1 条 rls_tenant_isolation、FORCE RLS 已开
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, count(p.policyname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='erp' AND c.relname IN ('company_relations','internal_transactions',
  'consolidation_scopes','consolidation_scope_companies','consolidation_reports',
  'consolidation_report_lines','elimination_rules','elimination_candidates')
GROUP BY 1,2,3 ORDER BY 1;
-- 期望：8 行，均 t | t | 1

-- 3.3 W9-A 新增列尚不存在（仅这 4 张；scope_companies.company_id 是迁移前既有，勿误判）
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='erp' AND column_name IN ('company_id','period_version')
  AND table_name IN ('consolidation_scopes','consolidation_reports',
                     'consolidation_report_lines','elimination_rules');
-- 期望：0 行

-- 3.4 三个函数尚不存在
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='erp' AND proname IN ('current_company_id','parent_visible_company_ids','company_readable');
-- 期望：0 行
```

**执行**

```bash
PROD_CHANGE_TICKET=ERP-COMPANY-RLS-20261122 \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261121235940 --ticket ERP-COMPANY-RLS-20261122
```

**执行后断言（§4.12）**

```sql
-- 3.5 账本与指纹：success=t，checksum 必须等于 §2.4
SELECT version, success, encode(checksum,'hex') FROM public._sqlx_migrations
WHERE version=20261121235940;
-- 期望 sha384 = 9989aa836c96530ba3bdbe22d6c23e13d984e16957fbe9971069bac660a262e866b82b6cc682e6c7a98ab0578146f9c7

-- 3.6 8 表 t/t/4（策略名 <表名>_company_select/_insert/_update/_delete）
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, count(p.policyname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='erp' AND c.relname IN ('company_relations','internal_transactions',
  'consolidation_scopes','consolidation_scope_companies','consolidation_reports',
  'consolidation_report_lines','elimination_rules','elimination_candidates')
GROUP BY 1,2,3 ORDER BY 1;
-- 期望：8 行，均 t | t | 4

-- 3.7 列形状：4 张 company_id 可空；2 张 period_version integer NOT NULL DEFAULT 1
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='erp' AND column_name IN ('company_id','period_version')
  AND table_name IN ('consolidation_scopes','consolidation_reports',
                     'consolidation_report_lines','elimination_rules') ORDER BY 1,2;

-- 3.8 3 个函数存在且 SECURITY INVOKER（prosecdef=false）
SELECT proname, prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='erp' AND proname IN ('current_company_id','parent_visible_company_ids','company_readable');
```

**失败回滚动作**

```bash
psql "$PROD_DSN" -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261121235940_erp_consolidation_company_rls.rollback.sql
# A 的回滚文件不自删账本，必须手工清理 1 行
psql "$PROD_DSN" -c "DELETE FROM public._sqlx_migrations WHERE version=20261121235940;"
```

回滚后重跑 3.2–3.4，期望：8 表各 1 条 `rls_tenant_isolation`、新增列 0、函数 0。回滚会丢弃 `company_id` / `period_version` 的已填值。

## 4. W9-B：默认公司（`20261122090000`）

**前置断言**：W9-A 已 PASS；`is_default` 列与 `uq_user_company_scopes_default` 均不存在。

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='core_user_company_scopes' AND column_name='is_default'; -- 0 行
SELECT to_regclass('public.uq_user_company_scopes_default'); -- NULL
```

**执行**

```bash
PROD_CHANGE_TICKET=COMPANY-DEFAULT-20261121 \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261122090000 --ticket COMPANY-DEFAULT-20261121
```

**执行后断言**

```sql
-- 4.1 账本指纹
SELECT version, success, encode(checksum,'hex') FROM public._sqlx_migrations
WHERE version=20261122090000;
-- 期望 sha384 = 19a04c0122968ff6caede8dc002a06816acfac50ef31dd8507e757b01ff25596db8581994ddfd88d6aa7ce6349f333ee

-- 4.2 列与部分唯一索引
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='core_user_company_scopes' AND column_name='is_default';
-- 期望 boolean | NO | false
SELECT indexdef FROM pg_indexes
WHERE schemaname='public' AND indexname='uq_user_company_scopes_default';
-- 期望 UNIQUE ... (tenant_id, user_id) WHERE is_default

-- 4.3 三条抽查均应为 0 行
SELECT tenant_id,user_id FROM public.core_user_company_scopes
WHERE is_default GROUP BY 1,2 HAVING count(*)>1;                          -- 重复默认
SELECT tenant_id,user_id FROM public.core_user_company_scopes
GROUP BY 1,2 HAVING count(*) FILTER (WHERE is_default)=0;                 -- 无默认用户
SELECT s.id FROM public.core_user_company_scopes s WHERE s.is_default AND EXISTS (
  SELECT 1 FROM public.core_user_company_scopes e
  WHERE e.tenant_id=s.tenant_id AND e.user_id=s.user_id
    AND (e.created_at,e.id)<(s.created_at,s.id));                          -- 非最早默认
```

**失败回滚动作**

```bash
psql "$PROD_DSN" -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261122090000_core_user_company_scopes_is_default.rollback.sql
```

该回滚会删索引与列，并自删账本行。若 W9-A 也要回退，必须先 B 后 A。

## 5. W10：审批/流程 4 表（`20261122150000`）

**前置断言**：4 表存在、`tenant_id` 列存在、各恰好 1 条策略；4 条 `idx_<table>_tenant_id` 均不存在。

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, count(p.policyname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='public' AND c.relname IN
  ('approvals','approval_records','core_workflow_instances','core_workflow_tasks')
GROUP BY 1,2,3 ORDER BY 1;  -- 期望 4 行，均 t | t | 1

SELECT to_regclass('public.idx_'||t||'_tenant_id') FROM unnest(ARRAY[
  'approvals','approval_records','core_workflow_instances','core_workflow_tasks']) t;
-- 期望 4 行均为 NULL
```

**执行**

```bash
PROD_CHANGE_TICKET=RLS-APPROVAL-20261122 \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261122150000 --ticket RLS-APPROVAL-20261122
```

**执行后断言**

```sql
-- 5.1 账本
SELECT version, success, encode(checksum,'hex') FROM public._sqlx_migrations
WHERE version=20261122150000;  -- 记录现场值（迁移内无 §2.4 指纹条目）

-- 5.2 4 表 t/t、1 条 rls_tenant_isolation、严格 USING + WITH CHECK、索引存在
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       count(p.policyname) AS policies,
       count(*) FILTER (WHERE p.policyname='rls_tenant_isolation' AND p.cmd='ALL'
         AND p.permissive='PERMISSIVE' AND p.roles='{public}'::name[]
         AND p.with_check IS NOT NULL AND p.qual=p.with_check) AS strict_ok,
       to_regclass('public.idx_'||c.relname||'_tenant_id') IS NOT NULL AS idx_ok
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='public' AND c.relname IN
  ('approvals','approval_records','core_workflow_instances','core_workflow_tasks')
GROUP BY 1,2,3 ORDER BY 1;
-- 期望 4 行，均 t | t | 1 | 1 | t

-- 5.3 tenant_id 列保留
SELECT table_name, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND column_name='tenant_id'
  AND table_name IN ('approvals','approval_records','core_workflow_instances','core_workflow_tasks');
-- 期望 4 行，均 YES
```

**失败回滚动作**

```bash
psql "$PROD_DSN" -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261122150000_public_approval_workflow_tenant_isolation.rollback.sql
```

回滚删 4 条索引、恢复 `approvals` / `approval_records` 为「严格 USING、无 WITH CHECK」，并自删账本行；保留 `tenant_id` 与已回填值。

## 5A. W11：integration.mes_erp_sync 成功约束（`20261122160000`）

**波次归属**：W11，独立小波。与 W9-A / W9-B / W10 无依赖，可与任一波同窗口执行；版本号最大，`apply-forward` 按版本顺序天然排在三波之后。

**窗口内顺序约束**

- 必须在 `20261121180000_integration_schema_canonical` 之后（本迁移依赖该表已存在）。
- 必须在**恢复/开启 ERP→MES 同步流量之前**完成：当前代码按「先建记录（`mes_order_id` 可空）→ 成功后回填」写入，若生产列仍为 `NOT NULL`，每次同步都会在首条 INSERT 报 `23502`。
- 与 W9/W10 可分别回滚，互不影响。

**前置条件与断言**

```sql
-- 0) 现场记录行数（预期很小或 0；仅统计，不写库）
SELECT count(*) AS total,
       count(*) FILTER (WHERE sync_status='success') AS success_rows,
       count(*) FILTER (WHERE sync_status='success' AND mes_order_id IS NULL) AS violating_rows
FROM integration.mes_erp_sync;

-- 1) 表与列存在、当前为 NOT NULL、约束尚不存在
SELECT is_nullable FROM information_schema.columns
WHERE table_schema='integration' AND table_name='mes_erp_sync' AND column_name='mes_order_id';
-- 期望：NO

SELECT count(*) FROM pg_constraint
WHERE conrelid='integration.mes_erp_sync'::regclass
  AND conname='ck_mes_erp_sync_success_requires_mes_order';
-- 期望：0

-- 2) 若 violating_rows > 0，停止：先人工核对，不得直接执行迁移
```

**执行**

```bash
PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261122160000 --ticket <现场工单号>
```

迁移内已开启系统通道做全租户断言；`PGOPTIONS` 为双保险。

**执行后断言**

```sql
-- 5A.1 账本
SELECT version, success FROM public._sqlx_migrations WHERE version=20261122160000;
-- 期望：1 行，success=t

-- 5A.2 列可空 + 约束已校验
SELECT c.is_nullable, k.convalidated
FROM information_schema.columns c
LEFT JOIN pg_constraint k
  ON k.conrelid='integration.mes_erp_sync'::regclass
 AND k.conname='ck_mes_erp_sync_success_requires_mes_order'
WHERE c.table_schema='integration' AND c.table_name='mes_erp_sync' AND c.column_name='mes_order_id';
-- 期望：1 行，YES | t

-- 5A.3 不存在违反成功约束的行
SELECT count(*) FROM integration.mes_erp_sync
WHERE sync_status='success' AND mes_order_id IS NULL;
-- 期望：0
```

**失败回滚动作**

```bash
# 先确认 NULL 行数量；>0 时回滚会明确失败，需先人工处理
PGOPTIONS="-c app.rls_system=on" psql "$PROD_DSN" -Atc \
  "SELECT count(*) FROM integration.mes_erp_sync WHERE mes_order_id IS NULL"

psql "$PROD_DSN" -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261122160000_mes_erp_sync_mes_order_id_nullable.rollback.sql
```

回滚件先断言无 `mes_order_id IS NULL` 行（有则 `RAISE EXCEPTION` 并给出计数，不静默跳过、不删数据），再恢复 `NOT NULL`、删除成功约束、自删账本 1 行。回滚后 `mes_order_id` 恢复 `NOT NULL`，约束不存在。

## 6. 整组验收（三波都成功后）

```bash
node scripts/ci/check-ledger-ddl-drift.mjs   # 或 bash scripts/ci/check-ledger-ddl-drift.sh
```

- 账本：四条 `success=t`（W9-A / W9-B / W10 / W11），W9-A/W9-B 指纹与 §2.4 逐字一致。
- erp 8 表各 4 条公司维度策略；public 4 表各 1 条严格租户策略 + 1 条租户索引。
- W11：`integration.mes_erp_sync.mes_order_id` 可空、`ck_mes_erp_sync_success_requires_mes_order` 已校验、`success + NULL` 行数为 0。
- 数据：演练库目标表均为 0 行，W9-B 回填 0 行；生产按 §4.12 现场记录回填行数（以实际记录为准）。
- 应用冒烟：不带 `app.company_id` 的请求读 8 张合并表应为 0 行；带本公司头可读本公司；母公司按可见集合可读子公司；兄弟公司互不可见。

## 7. 回滚总表

| 波次 | 触发条件 | 命令 | 断言 | 账本 |
|---|---|---|---|---|
| W10 | 5.x 任一断言失败 | `20261122150000_...rollback.sql` | 4 表各 1 策略、索引 0、`approvals/approval_records` 无 WITH CHECK | 自删 1 行 |
| W11 | 5A.x 任一断言失败 | `20261122160000_...rollback.sql` | `mes_order_id` 恢复 NOT NULL、成功约束不存在 | 自删 1 行（有 NULL 行时明确失败） |
| W9-B | 4.x 任一断言失败 | `20261122090000_...rollback.sql` | `is_default` 列与索引均不存在 | 自删 1 行 |
| W9-A | 3.x 任一断言失败 | `20261121235940_...rollback.sql` | 8 表各 1 条 `rls_tenant_isolation`、6 列/3 函数已删 | **不自删，手工 DELETE 1 行** |

W9 两波必须 **B → A**；W10 独立，可与 W9 分别回滚。回滚后若仍不满足断言，停止并考虑从第 1 节备份恢复对应对象。

## 8. 本次演练证据（2026-11-21）

- 演练库：`topems_drill_w9w10_20261121`（由本地全量库模板创建，76MB），演练后已 `DROP` 并确认不存在。
- 路径：先按回滚件回退到迁移前 → 断言 PASS → 按 W9-A → W9-B → W10 前向 → §4.12/W10 断言 PASS → 再回滚 → 断言迁移前 PASS → 删 W9-A 账本行 → 重放三波 → 断言再次 PASS。
- W11 单独演练（2026-11-22）：演练库 `topems_drill_mes_erp_20261122`（由 `topems_test` 模板创建，演练后已 `DROP`）。迁移前 `is_nullable=NO`、无约束、`pending + NULL` 插入报 `23502`；迁移后 `YES`、约束 `convalidated=t`、`pending + NULL` 成功、`success + NULL` 被 `23514` 拒绝、`success + uuid` 成功；保留 1 条 NULL 行回滚 → 明确失败（exit=3），清掉 NULL 行后回滚成功并恢复 `NOT NULL`、删除约束。
- 账本指纹：W9-A `9989aa83…f9c7`、W9-B `19a04c01…33ee`，两者与文档 §2.4 逐字一致；W10 实测 `866f5644…681b5`。
- 公司可见性（无数据、直接调函数）：无公司上下文 → 全拒绝；本公司 → 可见；兄弟公司 → 不可见；母公司 + 可见集合 → 可见集合内可读，集合外仍拒绝；集合为空 → 仅本公司。
- 演练观察：`erp.consolidation_scope_companies.company_id` 是迁移前既有列（NOT NULL），不属于 W9-A 的「6 个新增列」；断言与验收时不要把它计入新增。

## 9. 本次未做（边界）

- 未连接生产库，未执行任何生产 DDL 或授权变更；C16 生产结论仍须由 DBA 按第 2 节两次复跑给出。
- 未改动代码、迁移、回滚件与既有断言；本清单为新增文档。

### 附：本会话本地只读预跑（非生产，仅证明脚本可执行）

本地 `topems_test` 已推进到 `20261122150000`，不是窗口前锚点，因此 C1–C19 结果不能作为生产准入结论。实际输出：C1 FAIL（会话非 topems_prod）、C2 FAIL（786/786 行）、C3–C7/C9/C10/C12/C13/C19 `ALREADY_APPLIED`、C8/C11/C14 PASS、C15/C16/C17/C18 FAIL。C16 明细：`readable=0, no_priv=0, nonzero=0, missing=132`（本地表已按历史批次归档/删除）。原始输出见 `/tmp/c16_local_20261121.txt`。
