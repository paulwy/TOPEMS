# A 组 194 行清理（由 454 行收缩）+ B 组 audit 孤儿处置确认稿（2026-11-06）

> 状态：**口径已定，进入执行前定稿**（第二轮，2026-11-06 14:xx）。
>
> **已定范围**：A 组缩减为 **194 行 / 4 张表** —— `crm.crm_master_data_refs` 121、`crm.returns` 18、
> `ehs.qa_ehs_risks` 19、`ehs.qa_ehs_environment_monitors` 36。
> `crm.customers` 2 行**不删**；`public.audit_logs` 258 行**不删**（原样保留，靠 RLS 隔离，见 §6）。
>
> 本轮 prod 仍**只读**（仅 `SELECT` / `information_schema` / `pg_catalog`），未执行任何 DML/DDL、未重启、未部署。
> 代码侧只改 `audit_query.rs` 的软删过滤并补测试；30 张可收紧表继续不动。
>
> 前置文档：[7 张脏租户表回填口径](tenant-backfill-plan-7-tables-2026-11-06.md)、
> [下一批 RLS 评估](rls-tenant-isolation-next-batch-2026-11-06.md)。
>
> 本文所有“命中数”均为 2026-11-06 在 `topems_prod` 上只读实测；所有 DML 语句**均为待窗口授权的草稿**，
> 不代表已执行。凡标 **⏳** 的条目，需你确认后才进入窗口执行清单；标 **✅ 已定** 的为已定口径。

## 0. 口径基线（先说清楚，避免数字对不上）

- 脏租户判定：`tenant_id IS NULL` 或 `tenant_id = '00000000-0000-0000-0000-000000000000'`。
- prod 当前仅 1 个正式租户 `00000000-0000-0000-0000-000000000001`；`public.core_users` / `iam.core_users` 均 0 行。
- A 组分析过的 6 张表（其中 4 张进入删除）：**无任何外键（入向 0 / 出向 0）、无触发器、无视图依赖**（本次重新核对，见 §9）。
- 因此删除不会触发级联；风险集中在“逻辑引用”和“业务语义”两点。
- 计数口径提醒：本稿所有校验 SQL 均避开 `entity_id = '…0099'` 的 NULL 陷阱
  （`NULL = uuid` 结果为 NULL，会让 `NOT (...)` 静默漏行）。已改用 `IS DISTINCT FROM` 或显式 `IS NULL` 分支。
- **计数会漂移，且不止 audit**：14:14 复核确认 13:44 之后又跑了一轮探针（13:52:37–13:56:34，audit 共 15 行），
  4 张目标表增加：`returns` 18 → **19**、`risks` 19 → **20**、`monitors` 36 → **38**、`refs` 121 不变；
  audit 0 租户 320 → **334**、NULL 租户 27 → **28**、合成 `…0099` 258 → **271**（全表 347 → **362**）。
  15 行增量 = 13 行合成 `…0099` + 1 行 `update_acceptance_plan`（0 租户、entity NULL）+ 1 行 `update|user`（NULL 租户）。
  新增业务行时间戳：`RET-20261106-000002` 13:52:59、`RSK-5A29F56A` 13:53:07、`ENV-17992915/14D12964` 13:53:04。
- 因此：§1 的 **194 是“已定口径”，14:14 实测为 198**（121 + 19 + 20 + 38）；窗口执行时**必须现场重测**，
  并把 `DELETE` 的期望行数改成现场值，**不要把 194/258 写死**。每条目标行的定位条件本身不变。
- 探针来源已定位（§14）：prod 仓库的 **pre-commit 钩子 `web-contract-smoke`** 执行
  `scripts/web_contract_smoke.py` 打 `localhost:8099`；不先处理它，清理后仍会回涨。

## 1. 总览表

| 表 | 已定目标行数 | 14:14 实测 | 全表 | 删除后剩余（按已定口径） | 处置（已定） | 可逆性 | 风险 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `crm.crm_master_data_refs` | 121 | 121 | 158 | 37 | 硬删（按 `master_data_id` 白名单） | 备份可恢复 | 中：主数据同步链路产物 |
| `crm.returns` | 18 | **19** | 19 | 0 | 硬删 | 备份可恢复（删后表为空） | 低-中：连续编号 + 冒烟账号佐证 |
| `ehs.qa_ehs_risks` | 19 | **20** | 20 | 0 | 硬删 | 备份可恢复 | 低：全部占位标题、无子表引用 |
| `ehs.qa_ehs_environment_monitors` | 36 | **38** | 38 | 0 | 硬删 | 备份可恢复 | 低：全部占位名称、无子表引用 |
| `crm.customers` | 2 | 2 | 302 | **302（不删）** | **不删**（已软删，保持现状） | 无需 | 中：业务主表，勿按“探针”一刀切 |
| `public.audit_logs` | 258（合成集） | **271** | 362 | **362（不删）** | **不删**，原样保留靠 RLS 隔离 | 无需 | 高：审计合规属性；且**仍在增长** |

合计**已定清理量 194 行**（14:14 实测口径为 **198 行**）；`customers` / `audit_logs` 的 273 行（2 + 271）
**保持原样**，不进入任何删除批次。
**重要**：所有数字随探针运行上涨；窗口开始时以现场重测为准（§0 / §5）。

## 2. 逐表小节

### 2.1 `crm.crm_master_data_refs`（121 / 158）

**1) 精确定位 SQL（实测 121）**

```sql
SELECT count(*) FROM crm.crm_master_data_refs
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND local_entity_id IS NULL;            -- 实测 121；全表 158；同条件下全表 0 租户也是 121
```

逐表对齐：文档 121 = 实测 121，**无偏差**。命中行的 `code/name` 仅 3 个不同值（`Acme Corp` 117、`Acme Industrial
Supply Co.` 1、空值 3）。

**2) 引用检查**

- 外键：出向 0、入向 0（`crm_master_data_refs_pkey PRIMARY KEY (master_data_id)`，无 FK）。
- 逻辑引用：`master_data_id` 在 13 张外部表（`erp.erp_master_data_audit_trail` 为 uuid，其余 text/varchar）
  **全部 0**；同表自匹配 121 已排除。`scm.suppliers.payload id` 仅 5 行能匹配、且供应商自身 `tenant_id` 为 NULL。
- 代码读取：`lib/shared-db/src/master_data_refs.rs:115,600` 以表名参数化读写引用；无按 `code='Acme Corp'` 的读取路径。

**3) 备份（按表快照）**

```bash
mkdir -p ~/backups/topems_prod/20261106
pg_dump -d topems_prod -Fc -n crm -t crm_master_data_refs \
  -f ~/backups/topems_prod/20261106/crm_master_data_refs.dump
# 同时导出目标行 CSV（用于人工核对）
psql -d topems_prod -X -c "\copy (SELECT * FROM crm.crm_master_data_refs WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND local_entity_id IS NULL) TO '~/backups/topems_prod/20261106/crm_master_data_refs.target.csv' WITH (FORMAT csv, HEADER true)"
```

**4) 执行语句（草稿，需批准）**

```sql
BEGIN;
SET LOCAL app.rls_system = 'on';

-- 预核对：必须 121
SELECT count(*) FROM crm.crm_master_data_refs
WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND local_entity_id IS NULL;

DELETE FROM crm.crm_master_data_refs
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND local_entity_id IS NULL;            -- 期望 DELETE 121

-- 后核对：剩余 37；其它租户行数不变（34×…0001 + 3×9bb6…）
SELECT count(*), count(*) FILTER (WHERE tenant_id <> '00000000-0000-0000-0000-000000000000') FROM crm.crm_master_data_refs;
COMMIT;
```

**为什么硬删**：该表**没有 `deleted_at` 列**（prod 实测），软删需要加列 DDL + 改 `shared-db` 读取逻辑，
成本高于收益；且这 121 行在收紧后对普通租户不可见，长期留在表里只会持续污染同步统计。

**5) 验证与回滚**

- 成功判据：剩余 **37** 行；`tenant_id<>0` 计数仍 **37**（删除前同为 37，即“非目标不变”）；`Acme Corp` 计数 0。
- 回滚：`pg_restore -d topems_prod -n crm -t crm_master_data_refs --data-only --exit-on-error <dump>`
  （`pg_restore` 的 `-t` 只认表名，必须与 `-n` 搭配；这是前次演练踩过的坑）。
- 恢复到 158 行、37 行非零租户 = 成功。

**【已定】** 121 行随 A 组一起硬删（已定口径）；SCM 负责人确认仅作后续追溯，不再阻断执行。
若窗口前拿到“确属业务数据”的相反结论，请立即叫停该批次并回滚口径。

### 2.2 `crm.returns`（18 / 18）

**1) 精确定位 SQL（实测 18）**

```sql
SELECT count(*) FROM crm.returns
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND customer_id IS NULL
  AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';   -- 口径 18；14:14 实测 19
```

对齐：**已定口径 18**；14:14 实测 **19**（新增 `RET-20261106-000002`，13:52:59，来自同一轮契约冒烟）。
原 18 行 = 17 行 `RET-20261102-000001~000017` + `RET-20261106-000001`（12:44）；
`order_id/ticket_id/warehouse_id` 全空。

**2) 引用检查**

- 外键：0；代码写入/读取见 `svc/crm/src/modules/aftersales.rs:365`（INSERT）、`:158/:261`（COUNT/列表）、`:722`（软删）。
- 逻辑引用：`crm.return_items.return_id`、`mes.material_return_items.return_id`（uuid，2 张表）**全部 0**；
  `return_no` 跨表检查 1 张表（`mes.material_returns`）**0**。

**3) 备份**

```bash
pg_dump -d topems_prod -Fc -n crm -t returns -f ~/backups/topems_prod/20261106/crm_returns.dump
psql -d topems_prod -X -c "\copy (SELECT * FROM crm.returns WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND customer_id IS NULL AND created_by='e91e2228-ab9d-4ac3-99f4-fdcd9c723f21') TO '~/backups/topems_prod/20261106/crm_returns.target.csv' WITH (FORMAT csv, HEADER true)"
```

**4) 执行语句**

```sql
BEGIN; SET LOCAL app.rls_system='on';
DELETE FROM crm.returns
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND customer_id IS NULL
  AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';   -- 期望 DELETE 19（14:14 实测；窗口现场重测）
COMMIT;
```

**为什么硬删**：表有 `deleted_at`，但 `return_no` 是业务编号，软删会长期占用编号并留在“已删除”集合；
这些行 `customer_id/order_id` 全空、创建人是未绑定租户的冒烟账号，不具备任何业务可追溯性。

**5) 验证与回滚**：删除后全表 **0** 行；回滚用 `pg_restore --data-only -n crm -t returns`，恢复至现场基线行数即成功。

### 2.3 `crm.customers`（2 / 302）— 重点核查

**1) 精确定位 SQL（实测 2）**

```sql
SELECT count(*) FROM crm.customers
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND deleted_at IS NOT NULL
  AND id IN ('29cd66ab-2343-4ac8-8023-c74bd0f9b820',
             'c9d6ad2b-888b-41f3-935e-dbce0ccdf858');        -- 实测 2；全表 302
```

两行明细：

| id | code | name | owner_id | created_at | deleted_at |
| --- | --- | --- | --- | --- | --- |
| `29cd66ab-…f9b820` | `CUS-PROBE-2` | E2E Probe Customer | `56f4256f-…` | 11-06 07:31:23 | 11-06 07:31:39 |
| `c9d6ad2b-…df858` | （空） | E2E-CUST-1793921516083 | `56f4256f-…` | 11-06 07:31:56 | 11-06 07:31:56 |

**2) 引用检查（这表是业务主表，重点查）**

- 外键：0（无入向/出向 FK）。
- 逻辑引用（按 uuid）：全库 **22 张**含 `customer_id` 的表，命中目标 2 id 的行数 **0**
  （含 `crm.billing_records / contacts / customer_finance / customer_orders / customer_recommendations /
  customer_scores / customer_tags / interactions / opportunities / returns / rfm_results / sales_orders`、
  `erp.receivables / sales_orders`、`finance.*`、`mes.production_orders`、`scm/wms.*`）。
- 逻辑引用（按编号）：全库 **97 个** `code / customer_code / customer_no` 列，命中 `CUS-PROBE-2`、
  `E2E-CUST-1793921516083` 的行数 **0**。
- 代码读取：`.sqlx/query-257….json` 存在 `SELECT … FROM crm.customers WHERE id=$1 AND tenant_id=$2`；
  `svc/crm` 全链路按 `id + tenant_id` 取数，不存在按 name/code 的全表扫描。
- **结论**：这两行是**被软删的 E2E 探针**，且无任何下游引用；但因为 `crm.customers` 是客户主表，
  仍不建议把“探针”当作常规清理对象。

**3) 处置（已定）：不删**。两行 `deleted_at` 非空，业务列表/详情均不可见；收紧 RLS 后普通租户也不可见。
硬删的唯一收益是表内“0 租户”计数归零，收益极低、误判成本高。**本轮不备份、不删除、不更新**。

**4) 保留后的验证项（窗口执行完 A 组 4 张表后复核）**

```sql
-- 仍为 2 行，且 deleted_at 未被改动
SELECT count(*) FROM crm.customers
WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND deleted_at IS NOT NULL
  AND id IN ('29cd66ab-2343-4ac8-8023-c74bd0f9b820','c9d6ad2b-888b-41f3-935e-dbce0ccdf858');
-- 全表仍为 302（不因清理动作减少）
SELECT count(*) FROM crm.customers;
```

**5) 不可逆性**：不做任何动作，天然可逆。**注意**：不要把这 2 行当作后续“去脏租户”的删除对象。

### 2.4 `ehs.qa_ehs_risks`（19 / 19）

**1) 精确定位 SQL（实测 19）**

```sql
SELECT count(*) FROM ehs.qa_ehs_risks
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND title = '未命名风险'
  AND created_by IS NULL;                  -- 口径 19；14:14 实测 20
```

对齐：**已定口径 19**；14:14 实测 **20**（新增 `RSK-5A29F56A`，13:53:07）。
`created_by/department_id` 全 NULL，`risk_no = RSK-XXXXXXXX`。

**2) 引用检查**：FK 0；`ehs.qa_ehs_risk_controls.risk_id`、`pm.risk_events.risk_id` **均为 0**；
`public.qa_ehs_risks.risk_no` 跨表 0。代码见 `svc/ehs/src/modules/risk.rs:141,270,397,523,841`（按 id+tenant 读写，列表过滤 `deleted_at IS NULL`）。
**注意**：`risk_no` 有 UNIQUE 约束，软删会继续占用编号。

**3) 备份**

```bash
pg_dump -d topems_prod -Fc -n ehs -t qa_ehs_risks -f ~/backups/topems_prod/20261106/ehs_qa_ehs_risks.dump
```

**4) 执行语句**

```sql
BEGIN; SET LOCAL app.rls_system='on';
DELETE FROM ehs.qa_ehs_risks
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND title = '未命名风险'
  AND created_by IS NULL;                  -- 期望 DELETE 20（14:14 实测；窗口现场重测）
COMMIT;
```

**为什么硬删**：所有行标题都是默认占位、创建人/部门为空，是“建了但没用”的探针产物；软删会让
`risk_no` 唯一约束继续占用、且统计口径仍要额外排除。

**5) 验证与回滚**：删除后全表 **0**；回滚 `pg_restore --data-only -n ehs -t qa_ehs_risks` → 19 行即成功。

### 2.5 `ehs.qa_ehs_environment_monitors`（36 / 36）

**1) 精确定位 SQL（实测 36）**

```sql
SELECT count(*) FROM ehs.qa_ehs_environment_monitors
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND name = '未命名监测点'
  AND coalesce(created_by,'') = '';        -- 口径 36；14:14 实测 38
```

对齐：**已定口径 36**；14:14 实测 **38**（新增 `ENV-17992915`、`ENV-14D12964`，13:53:04，每轮冒烟固定产生 2 行）。
`monitor_no = ENV-XXXXXXXX`，`status='active'`。
注意 `created_by` 在 prod 是 **`character varying`（文本）** 且全为空，无法 join 用户表；
这与 `ehs.qa_ehs_risks.created_by`（uuid）不同，故两表判据不能混用。

**2) 引用检查**：FK 0；`monitor_no` 在其它表**无同名列**（0 张），无逻辑引用；代码 `svc/ehs/src/modules/environment.rs:92,227,287,358,387,450`（按 id+tenant，软删走 `deleted_at`）。`monitor_no` 有 UNIQUE 约束。

**3) 备份**

```bash
pg_dump -d topems_prod -Fc -n ehs -t qa_ehs_environment_monitors -f ~/backups/topems_prod/20261106/ehs_monitors.dump
```

**4) 执行语句**

```sql
BEGIN; SET LOCAL app.rls_system='on';
DELETE FROM ehs.qa_ehs_environment_monitors
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND name = '未命名监测点'
  AND coalesce(created_by,'') = '';        -- 期望 DELETE 38（14:14 实测；窗口现场重测）
COMMIT;
```

**5) 验证与回滚**：删除后全表 **0**；回滚 `pg_restore --data-only -n ehs -t qa_ehs_environment_monitors` → 36 行即成功。

## 3. 为什么是硬删，而不是软删/打标（横向说明）

| 表 | 有 `deleted_at` | 软删是否有效 | 结论 |
| --- | --- | --- | --- |
| `crm_master_data_refs` | **无** | 需加列 DDL + 改读取逻辑 | 硬删（或保留） |
| `crm.returns` | 有 | 有效，但占用 `return_no` 编号 | 硬删 |
| `crm.customers` | 有（已置位） | 已生效，无需再动 | **不删** |
| `ehs.qa_ehs_risks` | 有 | 有效，但占用 `risk_no` UNIQUE | 硬删 |
| `ehs.qa_ehs_environment_monitors` | 有 | 有效，但占用 `monitor_no` UNIQUE | 硬删 |
| `public.audit_logs` | 有 | **已修复**：本轮给 `audit_query.rs` 补 `deleted_at IS NULL`（见 §12） | **已定：不删**（原样保留） |

补一句：**软删不等于隔离**。这 5 张表的列表查询都带 `tenant_id` 条件；即便软删，`tenant_id=0` 行在收紧后
仍是“脏数据”，只是从“可见”变成“不可见”。硬删的目的不是让业务看不见，而是让统计与审计口径回到干净状态。

## 4. 备份与存放约定

- **本轮未创建任何目录/文件**（只读）。
- prod 上 `/backup` **不存在**；`~` 可用空间 ~11 GiB，4 张目标表总量 < 0.3 MB，快照成本可忽略。
- **约定**：`~/backups/topems_prod/<YYYYMMDD>/<schema>_<table>.dump` + 同名 `.target.csv`。
  若你要求放到 `/backup` 或外部挂载盘，请在窗口授权时给出路径；窗口内再 `mkdir`。
- 文件名固定（**仅 4 张**）：`crm_crm_master_data_refs` / `crm_returns` / `ehs_qa_ehs_risks` /
  `ehs_qa_ehs_environment_monitors`。`crm.customers` 与 `public.audit_logs` **不备份**（不删）。
- **备份自检**（恢复演练的最低要求）：
  `pg_restore -l <dump> | grep TABLE DATA` 应列出目标表；CSV 行数应等于**窗口现场**目标行数
  （口径 121/18/19/36，14:14 实测 121/19/20/38）。
- 保留期建议与现网备份策略一致；**不要**把快照留在 prod 库内（`CREATE TABLE bf_bak_*` 会扩表并进备份链），
  如必须库内留底，只在窗口事务内建临时表并在验证后 `DROP`。

## 5. 执行顺序、批次与行数核对

建议**按表独立事务**，每表“预统计 → DELETE → 后统计 → COMMIT”，任一计数不符立即 `ROLLBACK`：

**只 4 个批次，共 194 行（14:14 实测 198 行）**；`crm.customers`、`public.audit_logs` 不在执行清单内。

| 批次 | 表 | 期望影响行数（口径 → 14:14 实测） | 事务后剩余 |
| ---: | --- | ---: | ---: |
| 1 | `crm.returns` | 18 → **19** | 0 |
| 2 | `ehs.qa_ehs_risks` | 19 → **20** | 0 |
| 3 | `ehs.qa_ehs_environment_monitors` | 36 → **38** | 0 |
| 4 | `crm.crm_master_data_refs` | 121 → **121** | 37 |
| — | `crm.customers` | 不删 | 302 |
| — | `public.audit_logs` | 不删 | 362（仍会随探针上涨） |

统一模板：

```sql
BEGIN;
SET LOCAL app.rls_system = 'on';
-- a) 删除前快照计数（与上表“期望”比对）
-- b) DELETE ... WHERE ...（psql 会输出 DELETE n）
-- c) 删除后剩余行数 + 非目标行计数（与基线比对）
-- d) 一致则 COMMIT，否则 ROLLBACK
COMMIT;
```

执行前置检查（窗口开始前）：

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname='topems_prod' AND state<>'idle';  -- 确认无长事务
```

**B 组 orphan 标记**：不在 A 组 4 个批次内，放在 A 组验证通过后单独一个事务执行（见 §13）；
标记前先导出 `id + request_details` 快照，**标记不等于隔离**，隔离仍靠后续 RLS 收紧。

## 6. `public.audit_logs` 258 行（14:14 现场 271）：**已决定不删**（两路径对比存档）

> **决策（2026-11-06，用户已定）**：走**路径二**——原样保留，不删除、不归档、不打 `deleted_at`，
> 靠后续 RLS 收紧隔离。以下对比保留作决策依据与审计存档。
> 因此本表**不在** §5 批次内，也**不在** §4 备份清单内。

目标集（快照 258；14:14 实测 **271**，全表 362）：

```sql
SELECT count(*) FROM public.audit_logs
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND entity_id = '00000000-0000-0000-0000-000000000099';
-- 快照 258 / 全表 347；14:14 实测 271 / 362（13:52:37–13:56:34 新增 13 行合成探针）
-- 258 = project 49 / contract 95 / budget 57 / risk 19 / document 19 / vector 19
-- 时间：11-02 245 行、11-06 13 行（+13:52 delete_vector/delete_document、13:56 budget/contract/project/risk）
-- 全部 deleted_at IS NULL（prod 全表软删行 0）
```

删除后**全表剩余 91 行（14:14 口径，= 362 − 271）** = 0 租户非合成 63（含 17 行可归因项目）+ NULL 租户 28；
快照口径则为 89 行。
**注意**：在探针写入未停止前，这个集合会持续增长，删完还会回涨——见 §8 D13 / §14。

### 路径一：物理删除 258 行

| 维度 | 说明 |
| --- | --- |
| 动作 | `DELETE ... WHERE tenant_id='…0' AND entity_id='…0099'` |
| 代价 | 需**审计/安全书面批准** + 备份 + 证据留存；不可逆（除备份恢复） |
| 可逆性 | 仅靠 `pg_dump` 快照；恢复后 `id/created_at` 不变，但“删除事实”本身会留在 DBA 操作记录 |
| 对 RLS 收紧 | **没有实质帮助**：剩余 91 行仍有 63 行 `tenant_id=0`、28 行 NULL，收紧策略照样要处理脏租户分支 |
| 合规 | 审计日志属留存类数据，批量删除需说明“合成探针、非真实业务事件”，并保留删除前快照与审批记录 |
| 额外收益 | 表体量 216 kB → 更小；审计检索噪声显著降低 |

### 路径二：保留但打标/归档

先给一个关键事实：**打 `deleted_at` 无效**。`svc/unified-core/src/modules/audit/audit_query.rs:315-365`
的计数与列表 SQL **没有 `deleted_at IS NULL` 条件**，所以软删后审计页面照样能查到。可行子方案：

| 子方案 | 做法 | 代价 | 可逆性 | 对收紧的影响 |
| --- | --- | --- | --- | --- |
| 2a 归档表 | 新建 `public.audit_logs_archive`（同构），`INSERT … SELECT` 258 行后原表删除 | 需 DDL（建表+授权）+ DML；等于“带副本的物理删除” | 最好（归档表可回插） | 原表干净，等价路径一 |
| 2b 加标记列 | `ALTER TABLE ADD COLUMN data_origin text`，258 行置 `synthetic_probe` | 需 DDL + 查询层改造（否则标记无用） | 高（只回填 NULL） | 收紧策略可加 `data_origin IS NULL` 条件过滤，但引入新口径 |
| 2c 复用 `status` | 把 `status` 改成 `synthetic_probe` | 0 DDL | 高 | **不建议**：污染状态语义，前端状态映射会异常 |
| 2d 原样保留 + 靠 RLS | 什么都不改，`tenant_id` 保持 0；收紧后普通租户不可见，超管系统通道（`app.rls_system='on'`，见 `lib/shared-auth/src/middleware/tenant.rs:166-252`）仍可查 | **零 DDL/DML** | 完全可逆（未改数据） | 收紧策略必须明确“`tenant_id=0/NULL` 行仅系统通道可见” |

### 对比与推荐

| 维度 | 路径一（删 258） | 路径二（保留） |
| --- | --- | --- |
| 数据风险 | 不可逆（依赖备份） | 零 |
| 合规风险 | 需审批；否则“删审计”本身是问题 | 无 |
| 运维成本 | 备份+审批+执行+验证 | 0（2d）或 1 次 DDL（2a/2b） |
| 收紧收益 | 无（仍有 91 行脏租户） | 无（但 2d 不影响收紧） |
| 审计视图噪声 | 消除 | 保留（仅超管可见） |

**决策（已定）**：走 **2d**——原样保留 + 收紧后仅系统通道可见；不建归档表、不加标记列、不置 `deleted_at`。
若审计/安全后续明确要求“生产审计表不得含合成探针”，再另行审批走 **2a 归档表**（保留可查副本，原表干净）。
**路径一仅在书面批准后执行**。两种做法都不改变“17 行可归因项目已回填 …0001”这一已确认动作。

## 7. B 组 orphan：聚类分析（只读）

> 快照 **72 行**（定稿口径）；13:55 复查 73 行；**14:14 实测 74 行**——
> 比快照多 2 行：`update|user`（13:54:58，`tenant_id IS NULL`，实体 `e91e…`，payload `{}`）
> 与 `update_acceptance_plan`（13:56:30，`tenant_id=0`，`entity_id=NULL`）。
> 下表簇内计数按 **74 行现场值**给出，括号内为 72 行快照值；窗口执行时按同一 predicate 现场重测。

定义（14:14 实测 74，修正了 NULL 陷阱）：

```sql
SELECT count(*) FROM public.audit_logs a
WHERE (a.tenant_id = '00000000-0000-0000-0000-000000000000' OR a.tenant_id IS NULL)
  AND a.entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099'
  AND NOT (a.entity_type='project' AND a.entity_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM pm.projects p
                       WHERE p.id=a.entity_id AND p.tenant_id IS NOT NULL
                         AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'));
-- 快照 72 = 320(0 租户) - 258(合成) - 17(可归因) + 27(NULL 租户)
-- 14:14 实测 74 = 334(0 租户) - 271(合成) - 17(可归因) + 28(NULL 租户)
```

### 7.1 按 `action` / `entity_type` 聚类（11 类）

| 簇 | 行数 | `entity_id` 空 | `tenant_id` NULL | 时间窗 | 说明 |
| --- | ---: | ---: | ---: | --- | --- |
| `update_acceptance_plan` / project | 20（快照 19） | 20 | 0 | 11-02 11–13、11-05 11–12、11-06 05/12/13:56 | 无实体、payload `{"status": null}` |
| `update` / user | 20（快照 19） | 0 | 20 | 11-02 11:37–14:xx、11-06 12:4x / 13:54 | 全部指向冒烟账号 `e91e…`；最新 1 行 13:54:58 |
| `delete_project` / project | 9 | 0 | 0 | 10-26 20:12–21:15 | 删完即离场 |
| `create` / user | 7 | 0 | 7 | 10-26 17:54、11-06 05 | 含 `testuser_…@topems.local` / `fresh2026` |
| `create_project` / project | 7 | 0 | 0 | 10-26 20:13–21:15 | `L1-DBG-1` / `AUDIT-1` |
| `update_risk` / risk | 3 | 0 | 0 | 10-26 20:15–20:44 | 含 `22222222-2222-…` 测试 id |
| `create_risk` / risk | 3 | 0 | 0 | 10-26 20:14–20:44 | `L1-RISK-9` / `DRIFT-R-1` |
| `approval_start` / project | 2 | 0 | 0 | 10-26 21:14–21:15 | 仅这 2 行有 `user_name` |
| `delete` / user | 1 | 0 | 1 | 10-26 17:54 | 与 `create` 同一秒 |
| `approval_reject` / project | 1 | 0 | 0 | 10-26 21:15 | `reason: 不通过` |
| `approval_approve` / project | 1 | 0 | 0 | 10-26 21:14 | 审批闭环 |

聚合：**项目生命周期 40**（update_acceptance_plan 20 + delete 9 + create 7 + approval 4）、
**用户生命周期 28**（update 20 + create 7 + delete 1）、**风险 6**；合计 **74**（快照口径 72）。

### 7.2 按 `user_agent` / `ip_address` / `path` / `method`

- `user_agent`：**74/74 为 NULL**
- `ip_address`：**74/74 为 NULL**
- `user_name`：仅 2 行（`approval_start`）
- `path` / `method`：**该表没有这两列**（`information_schema` 实测；审计写入只记 `action`）

因此**无法按请求侧（path/method/UA/IP）归因到具体服务或脚本**，只能按业务动作 + payload 推断。

### 7.3 时间窗聚簇

| 窗口 | 行数 | 特征 |
| --- | ---: | --- |
| 2026-10-26 17:54–21:15 | 29 | 一次性“建用户 → 建项目 → 建风险 → 审批 → 删除”完整链路，最像**一轮手工/脚本化端到端演练** |
| 2026-11-02 11:35–14:xx | 36 | `update_acceptance_plan` 19（空实体）+ `update\|user` 17，频率高、无实体，像**定时冒烟/巡检脚本** |
| 2026-11-05 11:00–12:xx | 3 | 零散重跑 |
| 2026-11-06 05:27、12:44–12:48 | 4 | 与 258 合成探针同一时段，属同一套测试装置的另一分支 |

### 7.4 样本行与推断依据

| 簇 | 样本 | 依据 |
| --- | --- | --- |
| `create_project` | `f8ace030…` `{"code":"L1-DBG-1","name":"L1Debug","project_type":"INTERNAL"}` | 名称含 `DBG`，明确是调试工程 |
| `create_project` | `a61fde97…` `{"code":"AUDIT-1","name":"AuditCheck"}` | 名称即“审计自检” |
| `create_risk` | `a863a181…` `{"risk_code":"L1-RISK-9","risk_name":"L1 风险","project_id":"f8ace030…"}` | 风险挂在调试项目上 |
| `create_risk` | `b37a3bdd…` `{"risk_code":"DRIFT-R-1","risk_name":"漂移风险","project_id":"240784b4…"}` | 名称含 `DRIFT`，属漂移校验用例 |
| `update_risk` | `22222222-2222-2222-2222-222222222222` | 明显的人工占位 id |
| `create\|user` | `{"email":"testuser_1793008490@topems.local","username":"testuser_1793…","password":"Test@2026abc","roles":["admin"]}` | 测试域名 + 固定口令 + admin 角色，属**用户管理冒烟脚本** |
| `create\|user` | `{"email":"f@t.local","username":"fresh2026","full_name":"Fresh"}` | 同上 |
| `update_acceptance_plan` | `entity_id=NULL`，`{"status": null}` | 无实体、无内容，属“接口连通性探针” |
| `approval_*` | `4babc88f… / 5e17b27c…`，`{"approval_id":…,"from_status":"pending","to_status":"approved"}` | 审批闭环演练，且这 2 行有 `user_name` |

### 7.5 结论

- **无法精确归因到某个具体服务/脚本/测试工具**（缺少 path/method/UA/IP 四个维度）。
- 这类流量**仍在产生**（13:54 又新增 1 行），说明至少有一个“用户冒烟/巡检”任务在跑；不先停它，任何删除都只是暂时的。
- 可**较强推断**为三类人为/自动化测试流量：① 项目-风险-审批端到端演练（10-26）；② 用户管理冒烟
  （含 `testuser_*` / `fresh2026` / 固定口令）；③ 接口连通性巡检（`update_acceptance_plan` 空实体）。
- 另需注意：`create|user` 的 `request_details` 存了**明文口令**——这是独立的安全项（历史数据脱敏），不在本次清理范围内，
  但建议在拍板时一并决议是否删除/脱敏这批 payload。

### 7.6 保留 orphan 的具体做法（已定：零 DDL 标记）

| 项 | 做法 | 是否影响收紧 |
| --- | --- | --- |
| 字段 | **零 DDL**：复用已有的 `request_details`（jsonb），合并写入 `{"_orphan":"b72-20261106"}`；`tenant_id` 保持现状（0 或 NULL），不加列、不改类型 | 不影响 |
| 标记语句 | `UPDATE public.audit_logs SET request_details = COALESCE(request_details,'{}'::jsonb) || '{"_orphan":"b72-20261106"}' WHERE <§7 predicate>`；`?` 判重，天然幂等 | 不影响 |
| 可见性 | **标记本身不提供隔离**：旧策略下普通租户仍能看到 NULL 租户的标记行（§13 实测 3 行含 1 标记行）；隔离来自 RLS 收紧 + 系统通道 | 需要收紧策略显式保留系统通道 |
| 库内表 | **不建** `audit_orphans` 独立表/列，避免扩表与备份链变化 | 不影响 |
| 索引 | 不新增索引；`_orphan` 仅用于人工核对与导出，不做在线过滤条件 | 不影响 |
| 审计完整性 | 这是**改写审计行内容**：标记前须导出 `id + request_details` 原值快照；标记只加键、不改原有键值 | — |

**已定**：B 组**不删**，按 §13 的零 DDL 方案标记（定稿 72 行 / 14:14 现场 74 行，执行时现场重测）。

## 8. 已定 / 待定清单

| # | 事项 | 选项 | 结论 | 状态 |
| ---: | --- | --- | --- | --- |
| D1 | `crm.crm_master_data_refs` 121 行 | 删 / 保留 | **删**（硬删，窗口现场重测） | ✅ 已定 |
| D2 | `crm.returns` 18 行 | 删 / 保留 | **删**（现场 19） | ✅ 已定 |
| D3 | `ehs.qa_ehs_risks` 19 行 | 删 / 保留 | **删**（现场 20） | ✅ 已定 |
| D4 | `ehs.qa_ehs_environment_monitors` 36 行 | 删 / 保留 | **删**（现场 38） | ✅ 已定 |
| D5 | `crm.customers` 2 行 | 删 / 不删 | **不删**（已软删、业务主表） | ✅ 已定 |
| D6 | `public.audit_logs` 258 行（现场 271） | 路径一删 / 路径二保留 | **路径二 2d：不删**，靠 RLS 收紧隔离 | ✅ 已定 |
| D7 | B 组 orphan（72 / 现场 74） | 删 / 保留 / 标记 | **不删 + 零 DDL 标 orphan**（§13） | ✅ 已定 |
| D8 | 备份路径 | `~/backups/topems_prod/20261106/` 或指定 | 建议前者（prod `/backup` 不存在） | ⏳ 窗口确认 |
| D9 | 窗口内是否建库内备份表 | 允许 / 禁止 | 建议**禁止**，改用 dump 文件 | ⏳ 窗口确认 |
| D10 | 明文口令 payload（B 组 `create\|user`） | 一并处理 / 另立安全项 | 建议**另立安全项**（历史数据脱敏） | ⏳ 待定 |
| D11 | 30 张可收紧表的时点 | 清理后 / 并行 | 建议**清理确认并验证后再收紧** | ⏳ 待定 |
| D12 | `…0099` 合成探针写入源 | 停 / 不停 / 改脚本 | **已定位为 prod 仓库 pre-commit `web-contract-smoke` 钩子**（§14）；**已改造钩子**：默认只打本机/测试目标，prod 仓库位三层拒绝 + fail-closed，拒绝路径零请求（§14.4） | ✅ 已加固 |
| D13 | prod 写权限窗口 | 由你指定时点 | A 组 DML 与 B 组标记均需授权窗口 | ⏳ 待授权 |

## 9. 证据与可复现 SQL（只读）

```sql
-- E1 目标命中数（一次跑完 6 组）
SELECT 'refs' t, count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND local_entity_id IS NULL), count(*) FROM crm.crm_master_data_refs
UNION ALL SELECT 'returns', count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND customer_id IS NULL AND created_by='e91e2228-ab9d-4ac3-99f4-fdcd9c723f21'), count(*) FROM crm.returns
UNION ALL SELECT 'customers', count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND deleted_at IS NOT NULL AND id IN ('29cd66ab-2343-4ac8-8023-c74bd0f9b820','c9d6ad2b-888b-41f3-935e-dbce0ccdf858')), count(*) FROM crm.customers
UNION ALL SELECT 'risks', count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND title='未命名风险' AND created_by IS NULL), count(*) FROM ehs.qa_ehs_risks
UNION ALL SELECT 'monitors', count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND name='未命名监测点' AND coalesce(created_by,'')=''), count(*) FROM ehs.qa_ehs_environment_monitors
UNION ALL SELECT 'audit0099', count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000' AND entity_id='00000000-0000-0000-0000-000000000099'), count(*) FROM public.audit_logs;

-- E2a FK 出向（本表引用别人）
SELECT n.nspname||'.'||c.relname AS tbl, con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE con.contype='f' AND (n.nspname,c.relname) IN (('public','audit_logs'),('crm','crm_master_data_refs'),
 ('crm','returns'),('crm','customers'),('ehs','qa_ehs_risks'),('ehs','qa_ehs_environment_monitors'));

-- E2b FK 入向（别人引用本表）
SELECT n.nspname||'.'||c.relname AS ref_by, con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con JOIN pg_class c ON c.oid=con.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE con.contype='f' AND (n.nspname,c.relname) IN (('public','audit_logs'),('crm','crm_master_data_refs'),
 ('crm','returns'),('crm','customers'),('ehs','qa_ehs_risks'),('ehs','qa_ehs_environment_monitors'));

-- E3 逻辑引用（按 customer_id / return_id / risk_id / master_data_id，已实测全 0）
--    customer_id: 22 张表 → 0
--    return_id:   2 张表 → 0
--    risk_id:     2 张表 → 0
--    master_data_id: uuid 1 张 + text/varchar 13 张 → 0（排除本表自匹配）
--    code/customer_code: 97 列 → 0

-- E4 删除前“非目标”基线（用于删除后比对）
SELECT 'customers' t, count(*) FILTER (WHERE NOT (tenant_id='00000000-0000-0000-0000-000000000000'
         AND deleted_at IS NOT NULL AND id IN ('29cd66ab-2343-4ac8-8023-c74bd0f9b820','c9d6ad2b-888b-41f3-935e-dbce0ccdf858')), count(*) FROM crm.customers;
```

实测结果（2026-11-06）：

- E1（13:44 快照）：`refs 121/158`、`returns 18/18`、`customers 2/302`、`risks 19/19`、`monitors 36/36`、
  `audit0099 258/347`；`audit` 0 租户合计 320，NULL 27。
  **14:14 复核（本轮定稿口径）**：`refs 121/158`、`returns 19/19`、`customers 2/302`、`risks 20/20`、
  `monitors 38/38`、`audit0099 271/362`；`audit` 0 租户 334、NULL 28、软删行 **0**。
- E2a / E2b：**0 行**（出向、入向均无 FK）。
- E3：**全部 0**。
- 触发器 0、视图依赖 0（`pg_trigger` / `pg_views` 实测）。
- 表体量：audit 216 kB、customers 168 kB、refs 112 kB、risks 64 kB、monitors 48 kB、returns 48 kB。

## 10. 拿不准 / 明确标注未定的事项

1. **refs 121 行的来源**：只能看到“`local_entity_id` 全空 + 同名 `Acme Corp`”，无 path/UA 可追；需 SCM 负责人确认。
2. **B 组 orphan 的操作人**：`user_agent` / `ip_address` 全空、无 path/method 列；**写入装置已定位**（§14），
   但“谁在什么场景触发”仍无直接证据。标记方案已定（§13），不依赖责任人。
3. **审计留存的合规口径**（保存年限、删除审批人、是否需要归档表）：本稿不代替安全/合规意见。
4. **批量删除是否允许在业务时段执行**：表小（198 行、<1 MB 变更），但审计表有检索流量，建议仍在低峰窗口。
5. **`status` 列是否可以承载 `synthetic_probe`**：**已不采用**——改为 `request_details` 合并键（零 DDL，§13），
   前端状态映射无需改动。
6. **prod `app.rls_system` 之外的超管查询路径**：本稿依据 `lib/shared-auth/src/middleware/tenant.rs:166-252`；
   若收紧时新增/改名开关，本稿 §7.6 / §13 的“超管可见”前提需重新核对。
7. **探针写入的来源**：**已定位**（§14）：prod 仓库 pre-commit 钩子 `web-contract-smoke` 在 13:52 的一次提交尝试中
   执行 `scripts/web_contract_smoke.py`（默认打 `localhost:8099`）。仍未确定的是“谁/哪次提交”；本轮未停任务、未改配置。
8. **audit 目标集的时效性**：快照 258、14:14 已 271；窗口开始时重测的数才是基线，任何固定数字都可能过期。

## 11. 本轮边界声明

- prod：**只读**，未执行 DML/DDL，未重启、未部署、未停任何任务、未改任何配置。
- 仓库：**未建迁移、未改历史迁移字节**；代码只改 `audit_query.rs` 的软删过滤并补测试（§12）。
- 禁止项仍生效：不使用 `--no-verify`、不 force push。
- 30 张可收紧表：**继续不动**，等 A/B 组清理并验证后再排期。
- 本地演示库 `topems_audit_demo_20261106` 仅为验证 RLS/标记可见性（§13），与 prod 无关。

## 12. `audit_query.rs` 软删过滤修复（本轮唯一代码改动）

### 12.1 缺陷

`svc/unified-core/src/modules/audit/audit_query.rs` 中所有 `public.audit_logs` 查询都没有 `deleted_at IS NULL`，
而该表**有** `deleted_at` 列（prod `information_schema` 实测）。结果：一行被软删后，审计列表、统计、榜单、
趋势、导出仍会把它算进去——软删对审计查询**完全无效**。

> 另注：`svc/hrm/src/schema_defense.rs:813` 断言的是 `hrm.audit_logs`（不可变日志、无 `deleted_at`），
> 与本次修改的 `public.audit_logs` 是两张不同的表，不冲突。

### 12.2 改动清单（9 处，只加条件，不改字段/排序/分页）

| # | 位置 | 改动 |
| ---: | --- | --- |
| 1 | `query_audit_logs` 的 total SQL | `WHERE deleted_at IS NULL AND ...` |
| 2 | `query_audit_logs` 的 items SQL | 同上（`LIMIT/OFFSET` 不变） |
| 3 | `get_audit_log_stats` 的 `total` | 同上 |
| 4 | `get_audit_log_stats` 的 `today_total` | 同上 |
| 5 | `get_audit_log_stats` 的 `success_total` | 同上（`deleted_at IS NULL AND status='success'`） |
| 6 | `load_top_by_column`（by_action / by_entity_type / by_ip 等） | 新增 `deleted_filter`，仅 `table=="public.audit_logs"` 时拼 `AND deleted_at IS NULL` |
| 7 | `load_audit_top_users` | `WHERE deleted_at IS NULL AND created_at >= NOW()-INTERVAL '30 days'` |
| 8 | `load_trend` | 同一 `deleted_filter` |
| 9 | `fetch_export_rows`（CSV/JSON 导出） | `WHERE deleted_at IS NULL AND ...` |

**不改**：`permission_audit_logs`、`core_login_logs`（两张表**没有** `deleted_at` 列），保持原样；
`source` 路由、参数解析、分页、导出格式均未动。diff 规模 `+27 / -7`。

### 12.3 调用方与数据影响评估

- **路由**：`/api/core/iam/v1/audit/logs`、`/stats`、`/export`（`svc/unified-core/src/modules/audit/mod.rs:58-65`）。
- **前端**：唯一调用方 `apps/web/src/pages/admin/AuditLogPage.tsx:388,451`；无“回收站/已删”参数或视图。
- **现有数据**：prod `public.audit_logs` 362 行中 `deleted_at IS NOT NULL` = **0**；本地测试库 2615 行同样 **0**。
- **写入**：全仓库 grep **无**任何 `UPDATE/DELETE ... audit_logs` 设置 `deleted_at` 的代码
  （唯一命中都是本修复新增的 SELECT 条件）。
- **结论**：**当前行为中性（0 行受影响）**，修复只对“将来被软删的行”生效；不存在依赖“能查到软删行”的调用方，
  前端/i18n 无需改动。

### 12.4 改动前后行为对比（同一份数据）

| 场景 | 修复前 | 修复后 |
| --- | --- | --- |
| 审计列表 `total` / `items` | 含软删行 | 排除软删行 |
| 统计 `total` / `today_total` / `success_total` | 含软删行 | 排除 |
| `by_action` / `by_entity_type` / `by_user` / `trend` | 含软删行 | 排除 |
| 导出 CSV / JSON | 含软删行 | 排除 |
| 权限审计 `permission_audit_logs` / 登录日志 | 不变 | 不变（表无该列） |
| prod 现有 362 行 | 362 | 362（软删 0 行） |

### 12.5 测试

新增 `svc/unified-core/tests/audit_e2e.rs::audit_query_excludes_soft_deleted_rows`：
插入 3 行（`create_project` / `update_project` 未删，`delete_project` 置 `deleted_at=now()`），断言
`query_audit_logs` → `total=2`、`items=2`、不含 `delete_project`；`get_audit_log_stats` → `total=2`、
`by_action` 中 `delete_project` 计数 0。

```bash
DATABASE_URL="postgres://topems_app:<local_pwd>@127.0.0.1:5432/topems" \
  cargo test -p topems-unified-core --test audit_e2e
# running 4 tests ... test result: ok. 4 passed; 0 failed; 0 ignored

cargo fmt -p topems-unified-core -- --check   # PASS
```

> 注：`sqlx::test` 需要**带 host 的 TCP DSN**；`postgres://air@/topems` 会报 `role "anonymous" does not exist`。

## 13. B 组 orphan：零 DDL 标记方案与三方可见性实测

### 13.1 方案（零 DDL）

复用 `request_details`（jsonb，已有列；B 组 74/74 行为 NULL 或 `{}` / `{"status": null}`），合并写入一个键：

```json
{"_orphan": "b72-20261106"}
```

- 不加列、不建迁移、不改 RLS 策略、不改应用代码；下划线前缀避免与业务 payload 键冲突。
- 幂等：`AND NOT (request_details ? '_orphan')`。
- 回滚：`request_details - '_orphan'`（jsonb 减键，不触碰原有键）。
- 不写 `status`：会污染状态语义与前端状态映射（§10.5 已否）。

### 13.2 prod 标记草稿（**待窗口授权，本轮未执行**）

```sql
BEGIN;
SET LOCAL app.rls_system = 'on';

-- 0) 标记前快照（文件留底，库内不建表）
-- \copy (SELECT id, request_details FROM public.audit_logs WHERE <下方 predicate>) \
--   TO '~/backups/topems_prod/20261106/audit_orphans_before.csv' WITH (FORMAT csv, HEADER true)

-- 1) 预核对：定稿口径 72，14:14 现场 74
WITH b AS (
  SELECT a.id FROM public.audit_logs a
  WHERE (a.tenant_id = '00000000-0000-0000-0000-000000000000' OR a.tenant_id IS NULL)
    AND a.entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099'
    AND NOT (a.entity_type='project' AND a.entity_id IS NOT NULL
             AND EXISTS (SELECT 1 FROM pm.projects p
                         WHERE p.id=a.entity_id AND p.tenant_id IS NOT NULL
                           AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'))
)
SELECT count(*) FROM b;

-- 2) 标记（幂等）
UPDATE public.audit_logs a
SET request_details = COALESCE(a.request_details, '{}'::jsonb)
                      || '{"_orphan":"b72-20261106"}'::jsonb
WHERE (a.tenant_id = '00000000-0000-0000-0000-000000000000' OR a.tenant_id IS NULL)
  AND a.entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099'
  AND NOT (a.entity_type='project' AND a.entity_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM pm.projects p
                       WHERE p.id=a.entity_id AND p.tenant_id IS NOT NULL
                         AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'))
  AND NOT (a.request_details ? '_orphan');

-- 3) 后核对：marked 必须等于预核对值（期望 74），unmarked 必须 0
SELECT count(*) FILTER (WHERE request_details ? '_orphan') AS marked,
       count(*) FILTER (WHERE NOT (request_details ? '_orphan')) AS unmarked
FROM public.audit_logs
WHERE (tenant_id='00000000-0000-0000-0000-000000000000' OR tenant_id IS NULL)
  AND entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099';
COMMIT;
```

`?` 是 jsonb 键存在判断（等价 `jsonb_exists`）。**不要**用 `LIKE`/`::text` 匹配，避免误命中 payload 文本。

### 13.3 本地三方可见性实测（`topems_audit_demo_20261106`）

样本 4 行：正式租户 1 行正常、0 租户 1 行（标记）、NULL 租户 2 行（1 标记 / 1 未标记）。
查询角色 `topems_app`（非 owner、受 RLS 约束）；owner=`air` 仅用于切策略。

| 场景 | RLS 策略 | 可见行数 | 其中标记 orphan | 结论 |
| --- | --- | ---: | ---: | --- |
| 普通租户 `…0001` | **旧**（prod 现状：`tenant_id IS NULL OR tenant_id = app.tenant_id`） | 3 | 1 | **仅标记不隐藏** |
| 普通租户 `…0001`，查询加 `_orphan` 过滤 | 旧 | 1 | 1 | 过滤只靠查询条件 |
| 普通租户 `…0001` | **新**（`rls_system='on' OR tenant_id = app.tenant_id`） | 1 | 0 | 普通租户看不到 |
| 普通租户 `…0002` | 新 | 0 | 0 | 跨租户隔离 |
| 系统/超管 `app.rls_system='on'` | 新 | 4 | 2 | 系统通道仍可见 |
| 系统通道 + 照抄 `audit_query` 列表 SQL | 新 | 4 | 2（`? '_orphan'` 键可读） | **audit 查询不报错** |

复现（本地演示库，prod 无关）：

```bash
psql "postgres://topems_app:<local_pwd>@127.0.0.1:5432/topems_audit_demo_20261106" -X -A -F'|' <<'SQL'
SET app.tenant_id='00000000-0000-0000-0000-000000000001';
SELECT count(*) FROM public.audit_logs;                                     -- 新策略 1
SET app.rls_system='on';
SELECT count(*) FROM public.audit_logs;                                     -- 4
SELECT count(*) FROM public.audit_logs WHERE request_details ? '_orphan';   -- 2
SELECT count(*) FROM (SELECT id FROM public.audit_logs
                      WHERE deleted_at IS NULL ORDER BY created_at DESC
                      LIMIT 20 OFFSET 0) s;                                 -- 4
SQL
```

**结论**：标记本身**不提供隔离**（旧策略下普通租户能看到 NULL 租户的标记行）；隔离来自 RLS 收紧。
收紧后：普通租户 0 个 orphan、系统/超管可见全部、`audit_query` 列表 SQL 正常返回且 JSON 键保留。

### 13.4 风险与备选

- **审计不可变性**：这是改写审计行 payload，需“标记前快照 + 变更单”；只加键、不改原有键值。
- 若有系统按 `request_details` 全文检索，可能被 `_orphan` 命中（本仓库未发现此类查询）。
- **备选（不推荐）**：`ALTER TABLE ... ADD COLUMN data_origin text` + 回填 + 查询/RLS 改造；
  需 DDL 审批与前后端联动，收益与零 DDL 相同，故本轮不采用。

## 14. `…0099` 合成探针写入源定位（只读）

### 14.1 结论

写入源是 **pre-commit 钩子 `web-contract-smoke`** 在 prod 仓库上的一次提交尝试——钩子执行
`scripts/web_contract_smoke.py`，脚本默认打 `localhost:8099`（该机上的单体服务），于是把 `…0099`
合成探针写进了 prod。**不是定时任务，也不是 mobile 脚本。**

- `lefthook.yml` 的 `web-contract-smoke`：**13:52 事发时**仅当暂存区含 `apps/web/src/api/`、
  `apps/web/src/utils/apiPath.ts`、`svc/server/src/`、`lib/shared-service-client/src/` 且 **8099 在监听**时，
  才跑该脚本；有 FAIL 则 `exit 1` 阻断提交，日志固定写 `/tmp/web_smoke_precommit.log`。
  **2026-11-06 已改造**：移除 `lsof 8099` 静默 SKIP，改为默认 `WEB_SMOKE_ENV=local` + prod 仓库位拒绝层，
  失败一律透传退出码并打印 `[Gate WCS] BLOCKED`（见 §14.4）。
- `scripts/web_contract_smoke.py`：`TEST_UUID = 00000000-0000-0000-0000-000000000099`（路径 `:id` 统一替换）、
  默认 `WEB_BFF_URL=http://localhost:8099`、JWT `sub = TEST_UID = e91e2228-…`、未登记 body 的 POST/PUT 发 `{}`；
  扫描 `apps/web/src/api/**` 得到 4668 个端点。
- `scripts/mobile_contract_smoke.py` 本轮**没有运行**：`/tmp/mobile_smoke_precommit.log` 不存在
  （mobile 钩子需 8070 在监听，未触发）。**2026-11-06 已同口径加固**（默认 8070/本机、prod 只读、fail-closed，见 §14.4）。

### 14.2 证据链（逐条可复现）

1. **时间窗与行数吻合**：13:52:37–13:56:34 共 **15 行**，之后至 14:14 无新增。该时长正好等于
   `/tmp/web_smoke_precommit.log` 记录的 4668 端点跑批；一轮产物恰好是 13 行合成 audit（`…0099`）
   + `crm.returns` 1 + `ehs.qa_ehs_risks` 1 + `ehs.qa_ehs_environment_monitors` 2。
2. **逐行指纹**（prod 只读实测）：

   | 时间 | action | entity_type | entity_id | status | tenant | request_details |
   | --- | --- | --- | --- | --- | --- | --- |
   | 13:52:37 | `delete_document` | document | `…0099` | failed | `…0000` | `{}` |
   | 13:52:45 | `delete_vector` | vector | `…0099` | failed | `…0000` | `{}` |
   | 13:54:58 | `update` | user | `e91e…` | success | NULL | `{}` |
   | 13:56:30 | `update_acceptance_plan` | project | NULL | failed | `…0000` | `{"status":null}` |
   | 13:56:30–34 | budget / contract / project / risk 共 11 行 | 对应实体 | `…0099` | failed | `…0000` | 全 null / `{}` |

3. **端点与动作对应**：
   - `apps/web/src/api/ai/writeOps.ts:11` → `DELETE /vectors/{id}`；`apps/web/src/api/ai/documents.ts:42` → `DELETE /documents/{id}`；
     `svc/ai/src/modules/document.rs:401-405` 记录 `delete_document`，`vector.rs:565` / `document.rs:341` 为服务层；
     `…0099` 不存在 → `status=failed`；`log_document_operation` 不传 tenant → `lib/shared-db/src/audit.rs` COALESCE 落 `…0000`。
   - `e91e…` 是 web 脚本签发的 JWT `sub`（`scripts/web_contract_smoke.py:97`），`/users/me` 类端点会更新
     该账号 → `update`/`user`；与「钩子跑 web 脚本」一致，mobile 无关。
   - budget/contract/project/risk 的空 payload 是 web 脚本“未登记 body 发 `{}`”的直接产物。
4. **钩子运行痕迹（决定性证据）**：
   - `/tmp/web_smoke_precommit.log` **mtime 13:57**，内容：`4668` 端点、`4663/4668 PASS, 5 FAIL`；
     这正是 `lefthook.yml:393-407` 钩子的固定日志路径。
   - prod 仓库 `git log`：13:40:42 / 13:40:43 / 13:40:59 → **13:52–13:57 无提交记录** → 该次提交被 5 个 FAIL 阻断
     （钩子 `exit 1`，所以只留下日志、没有 commit）。
   - 5 个 FAIL 均为 ERP/Mobile 的 GET（`/api/erp/hr/employees`、`/api/mobile/workbench`），
     **不是**本次的 delete 端点；delete 的 404 在脚本里按可接受处理，后端仍记 `status=failed`。
   - 其他旁证：15 行 `user_name` / `user_agent` / `ip_address` **全部 NULL**（脚本不带 `x-username`，表无 UA/IP 列）；
     `~/TOPEMS/logs/server.out` mtime **10:44**（PID 76088 于 10:44:15 启动）→ 未覆盖 13:52；
     `nginx access.log` mtime **04:33** → 请求绕过 nginx 直连 `:8099`；
     `crontab -l` / `launchctl list` 无 smoke 任务；14:14 `ps` 无 smoke 进程；`~/.zsh_history` 无调用记录。

### 14.3 已排除

| 假设 | 排除依据 |
| --- | --- |
| cron / launchd 定时任务 | `crontab -l` / `launchctl list` 无 smoke 条目 |
| 仓库 e2e 测试（`cargo test`） | 测试连本地测试库，无写 prod 的路径；且窗口内无 cargo 进程 |
| mobile 契约脚本 | `/tmp/mobile_smoke_precommit.log` 不存在（mobile 钩子未触发），8070 未监听 |
| nginx 反代流量 | access.log 不覆盖该窗口（11-06 04:33 之后无写入） |
| 正常业务请求 | `…0099` / `e91e…` 是脚本常量，payload 全 null/空 |
| 8098 另一实例（PID 18497） | 钩子显式检查 8099；`web_contract_smoke.py` 默认只打 8099，不回落 8098 |

### 14.4 处置：已执行（钩子加固，2026-11-06）

原三个候选处置中采用并强化 **a) 目标环境守卫**；不采用 b)（不排除 8099，也不依赖“目标不可达就跳过”），
c) 仅作历史方案保留。**本轮仍未停任何任务、未重启、未部署、未改 prod 数据。**

**已落地**

- `scripts/web_contract_smoke.py`
  - 默认 `WEB_SMOKE_ENV=local` → `http://127.0.0.1:8099`，仅允许 loopback；非 loopback 需 `WEB_SMOKE_ALLOW_REMOTE=1`。
  - prod 仓库位识别：`TOPEMS_INSTANCE=prod|production`，或 `DATABASE_URL` / 项目 `.env` 的库名为
    `topems_prod` / `*_prod`；**只读配置、零网络**，因此拒绝路径不会产生任何 prod 请求。
  - 目标位识别（关键补充）：prod 仓库 `.env` 实测指向 `topems_test`，只看仓库文件会漏判；
    故对 loopback 目标只读 `lsof` 监听表 + `ps eww` 取监听进程的 `DATABASE_URL` 库名，
    命中 `*_prod` 即拒绝（只读进程表、不建连、不打印 DSN）。
    prod 8099 由 launchd 以 `DATABASE_URL=…/topems_prod` 启动（实测），该层可在真实 prod 仓库直接生效。
  - prod 放行必须**全部满足**：`WEB_SMOKE_ENV=prod` + `ALLOW_PROD_SMOKE=1` +
    `PROD_SMOKE_CONFIRM=smoke-prod:<hostname>:<仓库目录>` + 非空 `PROD_SMOKE_REASON` +
    显式 `WEB_BFF_URL` + 显式 `JWT_SECRET`（prod 禁止回落 `.env` 取密）。
  - 退出码：`2` 配置非法 / `3` 环境或密钥不满足（含 2 秒连通性预检）/ `4` prod 拒绝层；
    所有拒绝均发生在 socket 之前，提示带可操作命令。
  - `--dry-run`：仅静态提取，不读密钥、不联网；prod 仓库位允许（零网络），但 `WEB_SMOKE_ENV=prod`
    仍要求完整授权，避免“干跑”成为绕行口子。
- `lefthook.yml` 的 `web-contract-smoke`：移除 `lsof 8099` 静默 SKIP；`WEB_SMOKE_ENV` 缺省 `local`；
  失败透传真实退出码并打印 `[Gate WCS] BLOCKED` 与首尾日志，不再静默跳过。
- `scripts/mobile_contract_smoke.py`（**同口径加固**）：默认 `WEB_SMOKE_ENV=local` +
  `http://127.0.0.1:8070/api/mobile`；仓库位/目标位/授权/确认串/显式 URL 与密钥五道齐全才允许 prod；
  `prepare_data()`（直写 `mobile.mobile_users`/`iam.users`/`hrm.employees`）与 `pre_create()` 只在测试环境执行；
  prod 目标 `READ_ONLY=True`，跳过两者且只跑 GET（写方法全部排除）；退出码 2/3/4 与 web 一致。
- `lefthook.yml` 的 `mobile-contract-smoke`：移除 `lsof 8070` 静默 SKIP；失败透传退出码并打印
  `[Gate MCS] BLOCKED`，不再静默跳过。
- 明文口令：脚本内**无硬编码口令/token**；`TEST_UID` / `TEST_UUID` 是合成 UUID；
  `JWT_SECRET` 只从环境变量或本地 `.env` 读取，缺失时报 exit 3 并提示配置方式。
- 文档：`docs/deploy/macos-deployment.md` §2.6 + 新增 §2.6.1（默认行为、三层拒绝、绕过条件、误用后果）。

**场景验证（本地 stub `127.0.0.1:18099` 记录请求数，prod 全程只读）**

| 场景 | 命令要点 | 退出码 | 外发请求 |
| --- | --- | ---: | --- |
| A 本地开发机 | 默认 local + `WEB_BFF_URL=stub`，`--limit 5` | 0（5/5 PASS） | +5（仅 stub） |
| B prod 仓库位模拟 | `TOPEMS_INSTANCE=prod`，未给 prod 授权 | **4** | **0**（stub 5→5） |
| B2 目标位模拟 | 仓库 dev，目标监听进程 `DATABASE_URL=…/topems_prod` | **4** | **0**（日志文件未创建） |
| C1 prod 缺开关 | `WEB_SMOKE_ENV=prod`，无 `ALLOW_PROD_SMOKE` | **4** | 0 |
| C2 prod 缺第二确认 | 有 `ALLOW_PROD_SMOKE`，无 `PROD_SMOKE_CONFIRM` | **4** | 0 |
| C3 prod 缺原因 | 有 CONFIRM，无 `PROD_SMOKE_REASON` | **4** | 0 |
| C4 授权齐全 | 五项齐全 + stub 目标 | 0（5/5 PASS） | +5（仅 stub） |
| D1 CI 无 BFF | `WEB_BFF_URL=127.0.0.1:18098`（无监听） | **3**（1 秒内） | 0 |
| D2 CI 无密钥 | `WEB_SMOKE_NO_DOTENV=1` 且无 `JWT_SECRET` | **3** | 0 |
| E1/E2/E3 非法配置 | 非法 `WEB_SMOKE_ENV` / 非法 `TOPEMS_INSTANCE` / 非 loopback 未授权 | **2** | 0 |
| F1–F3 dry-run | prod 仓库位 / 授权齐全 / 无密钥，`--dry-run` | 0 | 0 |
| H1 钩子级 prod | 暂存 mock 文件 + `TOPEMS_INSTANCE=prod` 跑 `lefthook run pre-commit` | 非零（4） | 0（10→10） |
| H2 钩子级本地 | 同上，目标 stub | 0（4668 端点 PASS） | +4668（仅 stub） |

**mobile 场景验证（与 web 同口径，stub `127.0.0.1:18096` 记录请求数）**

| 场景 | 命令要点 | 退出码 | 外发请求 |
| --- | --- | ---: | --- |
| M-A 本地开发机 | 默认 local + `MOBILE_BASE_URL=stub` | 0（114/114 PASS） | +123（仅 stub，含 9 次测试环境预创建） |
| M-B prod 仓库位 | `TOPEMS_INSTANCE=prod`，未授权 | **4** | **0**（184→184） |
| M-B2 目标位 | 仓库 dev，目标监听进程 `DATABASE_URL=…/topems_prod` | **4** | **0**（prod stub 日志未创建） |
| M-C1/C2/C3 prod 逐层缺项 | 缺 ALLOW / CONFIRM / REASON | **4** | 0 |
| M-C4 授权齐全（只读） | 五项齐全 + stub | 0（61/61 PASS） | +61，**全部 GET**（0 写入） |
| M-D1/D2 CI 无服务/无密钥 | 无监听端口 / `WEB_SMOKE_NO_DOTENV=1` | **3**（1 秒内） | 0 |
| M-E1/E2/E3 非法配置 | 非法 env / instance / 非 loopback | **2** | 0 |
| M-F1–F3 dry-run | prod 仓库位 / 授权齐全 / 无密钥 | 0 | 0 |
| M-H1 钩子级 prod | 暂存 mock + `TOPEMS_INSTANCE=prod` | 非零（4） | 0（184→184） |
| M-H2 钩子级本地 | 同上，目标 stub | 0（114/114 PASS） | +123（仅 stub） |

**prod `audit_logs` 只读核对**：验证前基线 14:38:12 = `362 / 362 / 271`（total / 脏租户 / 合成 `…0099`），
web 与 mobile 验证后 14:43:58 / 14:50:29 / 14:51:42 / 15:01:17 均保持 `362 / 362 / 271`，
**前后一致、无新增行**，证明两条路径的拒绝与外发均为零。

**残余风险（下一轮）**

- mobile 已与 web 同口径加固；其 `prepare_data()` 直写库能力保留在测试环境（徒手执行 `python3 scripts/mobile_contract_smoke.py`
  且 `DATABASE_URL` 指向非 prod 库时仍会写入测试库），prod 目标已强制只读并跳过全部写路径。
- `--no-verify` 无法被门禁拦截（prod 仓库 13:40:59 / 14:07:15 已登记两次例外），需靠流程复核。
- 钩子加固后，默认提交不再产生 `…0099` 合成探针；A 组清理与 B 组标记完成后，不会再因该钩子回涨
  （除非有人按 §2.6.1 完整授权主动跑 prod 探针）。
