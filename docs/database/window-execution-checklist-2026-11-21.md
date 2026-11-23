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

## 5B. W12：集团母版 + 公司差异 4 表（`20261123090000` → `20261123120000`）

**波次归属**：W12，开窗前置批次，全部排在 W1 之前；严格串行 **A1 → A2 → B1 → B2**，不设并行批次，每步断言 PASS 才进下一步。

**版本号与状态**

| 步骤 | 版本号 | 对象 | 状态 |
|---|---|---|---|
| W12-A1 | `20261123090000` | `public.core_tenant_modules` | 已合入仓库（代码与迁移均已在 main）；已交付但待执行 |
| W12-A2 | `20261123100000` | `integration.core_inter_module_sync` | 已合入仓库（代码与迁移均已在 main）；已交付但待执行 |
| W12-B1 | `20261123110000` | `public.monitor_settings` | 已合入仓库（代码与迁移均已在 main）；已交付但待执行 |
| W12-B2 | `20261123120000` | `public.system_settings` + `/system/company-settings` | 已合入仓库（代码与迁移均已在 main）；已交付但待执行 |

**顺序约束**

- A1 先于 A2：同步任务写入前要校验模块是否开通，母版/公司差异先落地，任务的公司归属才有稳定来源。
- A2 后紧跟 B：`core_inter_module_sync` 请求路径可达，策略生效后无公司上下文的 handler 会被拒绝，必须与 handler 改造同列车发布。
- B1 先于 B2：两者结构相同（平台母版行 + 公司差异行），先用影响面更小的监控阈值跑通，再复制到系统参数并上线公司作用域 API。
- 四步串行；A/B 两组都不依赖 W1–W11。

**前置条件**

1. 账本中该版本未 `success=t`（现场只读查 `_sqlx_migrations`，不得凭版本号判断）。
2. `hrm.companies` 具备 `(tenant_id, id)` 唯一键；`erp` 公司维度函数可用。
3. B1/B2：平台行 `(key)` 与母版行 `(tenant_id, key)` 重复计数为 0（多公司租户不因此中止）。
4. 同窗口代码：erp 服务（B2 公司作用域 API、平台参数系统通道）、monitor 服务（B1 写入收敛到公司上下文）；B1/B2 缺代码不得单独上迁移。
5. **备份对象**：`public.core_tenant_modules`、`integration.core_inter_module_sync`、`public.monitor_settings`、`public.system_settings` 的表结构与数据（含策略、触发器、函数定义），按步各备一份。

**执行命令**

```bash
# A1
PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261123090000 --ticket <现场工单号>

# A2（A1 断言 PASS 后）
PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261123100000 --ticket <现场工单号>

# B1（A2 断言 PASS 后）
PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261123110000 --ticket <现场工单号>

# B2（B1 断言 PASS 后）
PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261123120000 --ticket <现场工单号>
```

**前置/后置断言**

| 步骤 | 前置断言 | 后置断言 |
|---|---|---|
| A1 | 无 `company_id`；旧唯一约束存在；存量行数已统计；重复 `(tenant_id, module_code)` 为 0 | `company_id` 为 uuid、可空、无默认；旧唯一约束不存在；两条部分唯一索引谓词与列序正确；公司索引与 FK 存在；策略数=4 且名称精确；RLS FORCE；总行数不变 |
| A2 | 无 `company_id`；任务行数与可解析公司计数已统计 | `company_id` 为 uuid、可空、无默认；两条索引谓词与列序正确；公司 FK 已 `VALIDATE`；策略数=4 且名称精确；RLS ENABLE+FORCE；行数不变；无跨租户公司归属 |
| B1 | 平台行/母版行 `(tenant_id, key)` 重复为 0；`hrm.companies` 与公司维度函数存在 | `company_id` 可空无默认；`override_policy` NOT NULL 且取值合法；平台行全 `platform_only`、母版行全 `company_overridable`；`platform_only` 公司行冲突=0；旧唯一索引不存在；两条部分唯一索引谓词精确（default 含零 UUID）；三个 CHECK 与公司 FK 已 `VALIDATE`；触发器/函数存在；策略数=5 且名称精确；RLS ENABLE+FORCE |
| B2 | 同 B1；公司作用域 API 已随同窗口发布 | 同 B1（表名替换）+ `/system/company-settings` 契约测试通过 + 平台写权限（`admin:iam:write` + `is_superuser`）/二次确认/审计生效；缺公司上下文 400，`platform_only` 键写公司行 403 |

**失败回滚动作**

1. 先回滚服务（停止写公司行），再跑对应回滚 SQL；A/B 一律按 **B2 → B1 → A2 → A1** 逆序。
2. 回滚脚本先统计 `company_id IS NOT NULL` 行数：非 0 时 `RAISE EXCEPTION` 并打印计数，不静默丢归属；A1/B1/B2 仅在显式 `SET app.allow_scope_rollback='on'` 后可继续，A2 不提供 override。
3. 回滚后断言：列/索引/FK/策略/触发器均已移除，恢复原租户级唯一约束与策略，行数不变。

## 5C. W13：订单公司归属 + 搜索 v2（第一段已合入，第二段卡业务前置）

**波次归属**：W13，排在 W12 之后、W1 之前。第一段（结构 + 双写 + 脚本）与第二段（回填 → 切换 → 下线）分开执行，第二段未获业务清单与规则确认前不得开跑。

**版本号与状态**

| 步骤 | 版本号 | 内容 | 状态 |
|---|---|---|---|
| W13-1a | `20261123140000` | `erp.sales_orders.company_id` 补列 | 已合入仓库（迁移与回滚已在 main）；已交付但待执行 |
| W13-1a | `20261123141000` | `erp.purchase_orders.company_id` 补列 | 已合入仓库（迁移与回滚已在 main）；已交付但待执行 |
| W13-1b | `20261123142000` | `public.search_entity_projections_v2` 建表 + 双写（读仍走 v1） | 已合入仓库（迁移、双写代码、回滚已在 main）；已交付但待执行 |
| W13-1c | — | 回填/对账脚本（`scripts/db/w13_backfill_company_attribution.py`、`w13_reconcile_search_projection.py`） | 已交付但待执行（仅交付，未对生产执行） |
| W13-2 | 待定 | 按清单回填 → 零 NULL 断言 → 影子读全量比对 | 卡在业务前置 |
| W13-3 | 待定 | 重命名切换（v1→legacy、v2→canonical）+ 停止双写 | 卡在业务前置 |
| W13-4 | 待定 | 观察窗 → 下线旧表 → 清理 | 卡在业务前置 |

> 版本号口径：`20261123130000` 已被 W5-B215 占用；订单补列为 `140000`/`141000`，v2 建表为 `142000`；切换与下线待建时另行取号，不得复用 `140000`–`142000`。

**顺序约束**

- `20261123140000` / `20261123141000` 先于 `20261123142000`；三笔均已按版本顺序在 main。
- 第二段严格 **回填 → 零 NULL → 影子读比对零差异 → 切换 → 观察 → 下线**；不得提前切读，不得带差异上线。
- 双写要求全链路可用：老表持续服务，读路径保持 v1，任何一步失败只停双写、不降级。

**前置条件（第一段）**

1. 账本中三个版本未 `success=t`。
2. `erp.sales_orders`、`erp.purchase_orders` 存在且无 `company_id`；行数已统计。
3. `hrm.companies` 与公司维度函数可用；`topems_app` 角色可写 v2。
4. 同窗口代码：erp（订单写入带请求公司上下文，缺上下文 fail-closed）、search（投影 v1/v2 双写）。
5. **备份对象**：`erp.sales_orders`、`erp.purchase_orders`（结构+数据）、`public.search_entity_projections`（老表全量）、v2 建表前的 `pg_dump` 结构与策略基线。

**前置条件（第二段）**

1. 业务归属清单与四条归属规则：见 §5C.1、§5C.2；未确认前不得开跑。
2. 老表与 v2 的行数/主键集合/关键字段校验和比对方案已确认；观察窗时长与责任人已确定。
3. 上述任一未确认：**第二段不得开跑**，只保留双写与脚本。

### 5C.1 业务归属清单字段要求（可直接转业务）

CSV 表头固定三列 `entity_type,entity_id,company_id`，一行一实体：

| 字段 | 要求 |
|---|---|
| `entity_type` | 取值仅限 `sales_order` / `purchase_order` / `customer` |
| `entity_id` | 对应源表主键 UUID |
| `company_id` | 必须属于该实体所在租户的 `hrm.companies`，不得跨租户 |
| 行约束 | 脚本不推断、不猜默认公司；同一实体重复且公司冲突时拒绝执行 |

### 5C.2 四条归属规则（待业务确认，未定论）

以下四条**均为待业务确认事项，尚未定论**，确认前不得据此回填或切换：

1. 有客户/供应商的订单，是否一律按客户/供应商所属公司归属；
2. 无客户或跨公司单据，是否按创建时请求公司上下文兜底，历史缺上下文如何处置；
3. 无法判定的历史行是否允许源表 `company_id` 暂留 NULL、必须先补全再切换（v2 在切换时才要求 `company_id NOT NULL`）；
4. 平台级/集团级或跨公司单据的归属口径（母公司、平台 NULL 还是指定主办公司）。

**执行命令（第一段）**

```bash
# 订单补列（140000 → 141000 顺序执行）
PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261123140000 --ticket <现场工单号>

PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261123141000 --ticket <现场工单号>

# v2 建表 + 策略（141000 断言 PASS 后）
PROD_CHANGE_TICKET=<现场工单号> \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261123142000 --ticket <现场工单号>
```

```bash
# 第二段：回填先 dry-run，逐行核对未匹配清单后再 --apply（须业务清单就绪）
python3 scripts/db/w13_backfill_company_attribution.py \
  --dsn "$PROD_DSN" --mapping company_attribution.csv --dry-run \
  --output unmatched.csv

python3 scripts/db/w13_backfill_company_attribution.py \
  --dsn "$PROD_DSN" --mapping company_attribution.csv --apply \
  --output unmatched.csv
```

**前置/后置断言**

| 步骤 | 前置断言 | 后置断言 |
|---|---|---|
| 140000 | `erp.sales_orders` 存在、无 `company_id`；行数已记录 | `company_id` 为 uuid、可空、无默认；列注释存在；行数不变；无索引/FK 新增 |
| 141000 | `erp.purchase_orders` 存在、无 `company_id`；行数已记录 | 同 140000 口径 |
| 142000 | v1 `public.search_entity_projections` 可服务；公司维度函数可用 | v2 表/列/主键/索引 `(tenant_id, company_id, entity_type)` 存在；策略=2（system/company_read）；RLS ENABLE+FORCE；`topems_app` 读写授权；v1 数据未动 |
| 回填（第二段） | 映射清单表头与取值合法；`--dry-run` 未匹配清单已清零或逐行确认 | 源表与 v2 的 `company_id` 与清单一致；v2 `company_id IS NULL` 为 0；失败整体回滚（单事务） |
| 影子读比对 | 回填完成；双写成功率 100% | 按租户/公司/实体类型的行数、主键差集、关键字段校验和差异均为 0 |
| 切换 | 比对零差异；legacy 未 drop | 重命名成功；canonical 结构正确；读走 v2；搜索延迟/错误率不高于切换前 |
| 下线 | 观察窗通过；无对象依赖 legacy | legacy 表不存在；无残留权限/策略 |

**失败回滚动作**

1. **第一段结构回滚**：先停双写/停止写 `company_id`，再按 **142000 → 141000 → 140000** 逆序执行 `database/rollback/*.rollback.sql`；142000 回滚即 drop v2（双写产物，切流前安全）；补列回滚 drop 列，列内归属随列丢失。
2. **回填不可逆**：`--apply` 只写 `company_id`，回滚只退结构、不退数据；回填错误必须以新的更正清单再跑一次覆盖，不得用回滚件「还原」。
3. **切换后回滚**：仅在 legacy 未 drop 前有效——canonical 改回 v2 名、legacy 改回 canonical 名，并回滚代码到只读 v1/双写；下线后再回滚属事故处置，只能从备份恢复。
4. 所有回滚件不得删除业务行；回滚后重新核对订单两表 `constraints 0/0`、v2 策略/表状态。

## 5D. 业务前置汇总与被阻断波次

| 前置项 | 内容 | 卡住的波次 |
|---|---|---|
| 11 张表剩余待回执 8 项 | 人员权限通用授权行、内部事件流水公司追溯、升级执行记录权限、旧用户副本保留、两张归档表母公司查询、Q-G3 八条、Q-G4 父写范围、Q-G5 关系追加/更正与历史重述（见 `rls-company-scope-remediation-plan-2026-11-23.md`） | 公司级 RLS 策略批次（W9 之后的 company-scope 落地）；不阻断 W12 与 W13 第一段；W13 第二段的可见性验收取决于 Q-G4 的母公司可见口径与 Q-G5 的期间快照，与这 11 张表无关 |
| W13 归属清单 | CSV `entity_type,entity_id,company_id`，一行一实体、不推断（字段要求见 §5C.1） | W13-2 回填 |
| W13 四条归属规则 | 四条问题与选项见 §5C.2；**待业务确认，未定论**，此处不复述结论 | W13-2 回填与 W13-3 切换 |
| Q-G3 八条 | 见 `rls-company-scope-remediation-plan-2026-11-23.md` 清单 | 公司级策略的可见性验收（W9 及后续） |
| Q-G4 / Q-G5 | 父写动作范围；关系只追加不更正、历史是否追溯重述 | 对应审批/关系表的公司级策略 |

结论：W12 四步无业务阻断，可按窗口执行；W13 仅第一段（三笔迁移 + 双写 + 脚本）可执行，第二段在清单与四条规则确认前保持只双写。

## 6. 整组验收（三波都成功后）

```bash
node scripts/ci/check-ledger-ddl-drift.mjs   # 或 bash scripts/ci/check-ledger-ddl-drift.sh
```

- 账本：四条 `success=t`（W9-A / W9-B / W10 / W11），W9-A/W9-B 指纹与 §2.4 逐字一致。
- erp 8 表各 4 条公司维度策略；public 4 表各 1 条严格租户策略 + 1 条租户索引。
- W11：`integration.mes_erp_sync.mes_order_id` 可空、`ck_mes_erp_sync_success_requires_mes_order` 已校验、`success + NULL` 行数为 0。
- 数据：演练库目标表均为 0 行，W9-B 回填 0 行；生产按 §4.12 现场记录回填行数（以实际记录为准）。
- 应用冒烟：不带 `app.company_id` 的请求读 8 张合并表应为 0 行；带本公司头可读本公司；母公司按可见集合可读子公司；兄弟公司互不可见。
- W12（开窗前）：四版本 `20261123090000`–`20261123120000` 均 `success=t`；四表策略数 4/4/5/5、RLS FORCE；公司列/FK/索引/触发器/函数与 §5B 断言一致；平台行 `platform_only`、母版行 `company_overridable`、公司行冲突为 0。
- W13（开窗前，仅第一段）：`20261123140000`/`141000`/`142000` 均 `success=t`；订单两表 `company_id` 为 uuid、可空、无默认；v2 表/2 条策略（system/company_read）/RLS FORCE 就绪；v1 数据与读路径未动；回填/切换/下线**未执行**（第二段卡业务前置，见 §5D）。

## 7. 回滚总表

| 波次 | 触发条件 | 命令 | 断言 | 账本 |
|---|---|---|---|---|
| W10 | 5.x 任一断言失败 | `20261122150000_...rollback.sql` | 4 表各 1 策略、索引 0、`approvals/approval_records` 无 WITH CHECK | 自删 1 行 |
| W11 | 5A.x 任一断言失败 | `20261122160000_...rollback.sql` | `mes_order_id` 恢复 NOT NULL、成功约束不存在 | 自删 1 行（有 NULL 行时明确失败） |
| W9-B | 4.x 任一断言失败 | `20261122090000_...rollback.sql` | `is_default` 列与索引均不存在 | 自删 1 行 |
| W9-A | 3.x 任一断言失败 | `20261121235940_...rollback.sql` | 8 表各 1 条 `rls_tenant_isolation`、6 列/3 函数已删 | **不自删，手工 DELETE 1 行** |
| W12-B2 | §5B B2 断言失败 | `20261123120000_...rollback.sql` | 列/索引/CHECK/触发器/函数/策略移除；公司行非 0 需显式 `app.allow_scope_rollback='on'` | 自删 1 行（公司行非 0 时明确失败） |
| W12-B1 | §5B B1 断言失败 | `20261123110000_...rollback.sql` | 列/索引/CHECK/触发器/函数/策略移除；公司行非 0 需显式豁免 | 自删 1 行（公司行非 0 时明确失败） |
| W12-A2 | §5B A2 断言失败 | `20261123100000_...rollback.sql` | 列/索引/FK/策略移除；不提供 override | 自删 1 行（公司行非 0 时明确失败） |
| W12-A1 | §5B A1 断言失败 | `20261123090000_...rollback.sql` | 列/索引/FK/策略移除，恢复旧唯一约束；公司行非 0 需显式豁免 | 自删 1 行（公司行非 0 时明确失败） |
| W13-142000 | §5C 142000 断言失败 | `20261123142000_...rollback.sql` | v2 表/策略/授权移除；v1 不变 | 自删 1 行 |
| W13-141000 | §5C 141000 断言失败 | `20261123141000_...rollback.sql` | `purchase_orders.company_id` 不存在 | 自删 1 行 |
| W13-140000 | §5C 140000 断言失败 | `20261123140000_...rollback.sql` | `sales_orders.company_id` 不存在 | 自删 1 行 |
| W13 回填 | 清单错误/归属错误 | **不可回滚** | 只退结构不退数据；用更正清单重新 `--apply` 覆盖 | 不回滚、不删数据 |

W9 两波必须 **B → A**；W12 必须 **B2 → B1 → A2 → A1**；W13 第一段必须 **142000 → 141000 → 140000**，且回填不可逆。W10 独立，可与 W9 分别回滚。回滚后若仍不满足断言，停止并考虑从第 1 节备份恢复对应对象。

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
