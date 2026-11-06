# A 组 454 行清理 + B 组 72 行 audit 孤儿处置确认稿（2026-11-06）

> 状态：**确认稿，待用户逐条拍板**。本轮仍为只读：prod 仅执行 `SELECT` / `information_schema` / `pg_catalog`，
> 未执行任何 DML/DDL、未建迁移、未改动代码。30 张可收紧表继续不动。
>
> 前置文档：[7 张脏租户表回填口径](tenant-backfill-plan-7-tables-2026-11-06.md)、
> [下一批 RLS 评估](rls-tenant-isolation-next-batch-2026-11-06.md)。
>
> 本文所有“命中数”均为 2026-11-06 在 `topems_prod` 上只读实测；所有处置动作**均为待批准的草稿**，
> 不代表已定口径。凡标 **【待拍板】** 的条目，需你明确回复后才进入窗口执行清单。

## 0. 口径基线（先说清楚，避免数字对不上）

- 脏租户判定：`tenant_id IS NULL` 或 `tenant_id = '00000000-0000-0000-0000-000000000000'`。
- prod 当前仅 1 个正式租户 `00000000-0000-0000-0000-000000000001`；`public.core_users` / `iam.core_users` 均 0 行。
- A 组 6 张表：**无任何外键（入向 0 / 出向 0）、无触发器、无视图依赖**（本次重新核对，见 §9）。
- 因此删除不会触发级联；风险集中在“逻辑引用”和“业务语义”两点。
- 计数口径提醒：本稿所有校验 SQL 均避开 `entity_id = '…0099'` 的 NULL 陷阱
  （`NULL = uuid` 结果为 NULL，会让 `NOT (...)` 静默漏行）。已改用 `IS DISTINCT FROM` 或显式 `IS NULL` 分支。
- **计数会漂移（本轮新发现）**：prod 的 `public.audit_logs` **仍在持续写入**探针行。同一会话内 13:44 → 13:55 的复查：
  总行 347 → **350**、0 租户 320 → **322**、NULL 租户 27 → **28**、合成 `…0099` 258 → **260**。
  13:52 新增 `delete_vector` / `delete_document`（实体 `…0099`），13:54 新增 `update|user`（`e91e…`）。
  因此本文所有 audit 数字都标注为“**快照值**”，窗口执行时必须现场重测；删除语句本身按 `WHERE` 动态取当前集合，
  **不要把 258 写死成期望值**。其余 5 张表在本次复查中未见变化。

## 1. 总览表

| 表 | 目标行数 | 全表 | 删除后剩余 | 处置（建议） | 可逆性 | 风险 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `crm.crm_master_data_refs` | 121 | 158 | 37 | 硬删（按 `master_data_id` 白名单）**【待拍板】** | 备份可恢复 | 中：主数据同步链路产物，需 SCM 确认 |
| `crm.returns` | 18 | 18 | 0 | 硬删 **【待拍板】** | 备份可恢复（删后表为空） | 低-中：连续编号 + 冒烟账号可佐证 |
| `crm.customers` | 2 | 302 | 300 | **不删**（已软删，建议维持）；可选硬删 **【待拍板】** | 备份可恢复 | 中：业务主表，勿按“探针”一刀切 |
| `ehs.qa_ehs_risks` | 19 | 19 | 0 | 硬删 **【待拍板】** | 备份可恢复 | 低：全部“未命名风险”、无子表引用 |
| `ehs.qa_ehs_environment_monitors` | 36 | 36 | 0 | 硬删 **【待拍板】** | 备份可恢复 | 低：全部“未命名监测点”、无子表引用 |
| `public.audit_logs` | 258（快照，13:55 已涨到 260） | 347（13:55 为 350） | 89（13:55 为 90） | **两路径对比，见 §6；建议路径二（保留）** **【待拍板】** | 路径一依赖备份；路径二零删除 | 高：审计合规属性；且**仍在增长** |

合计 A 组 **454 行（13:4x 快照）**；删除后 6 表合计剩余 **426 行**（37 + 0 + 300 + 0 + 0 + 89），
按 13:55 复查则 A 组为 **456 行**、剩余 **428 行**。
**重要**：audit 的这 3 个数会随时间上涨；窗口执行时以现场重测为准（见 §0 与 §5）。

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

**【待拍板】** 121 行是否确认为压测/同步残留（需 SCM/主数据负责人确认）；未确认前建议**只保留不删**。

### 2.2 `crm.returns`（18 / 18）

**1) 精确定位 SQL（实测 18）**

```sql
SELECT count(*) FROM crm.returns
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND customer_id IS NULL
  AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';   -- 实测 18；全表 18
```

对齐：文档 18 = 实测 18。17 行 `RET-20261102-000001~000017`（11-02），1 行 `RET-20261106-000001`（11-06）；
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
  AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';   -- 期望 DELETE 18
COMMIT;
```

**为什么硬删**：表有 `deleted_at`，但 `return_no` 是业务编号，软删会长期占用编号并留在“已删除”集合；
这些行 `customer_id/order_id` 全空、创建人是未绑定租户的冒烟账号，不具备任何业务可追溯性。

**5) 验证与回滚**：删除后全表 **0** 行；回滚用 `pg_restore --data-only -n crm -t returns`，恢复至 18 行即成功。

**【待拍板】** 是否确认 18 行为探针残留。

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

**3) 处置建议**：**不删**。两行 `deleted_at` 非空，业务列表/详情均不可见；收紧 RLS 后普通租户也不可见。
硬删的唯一收益是表内“0 租户”计数归零，收益极低、误判成本高。

**4) 备份（若你决定删，才需要）**

```bash
pg_dump -d topems_prod -Fc -n crm -t customers -f ~/backups/topems_prod/20261106/crm_customers.dump
```

**5) 执行语句（仅在你批准“删”时使用）与验证回滚**

```sql
BEGIN; SET LOCAL app.rls_system='on';
DELETE FROM crm.customers
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND deleted_at IS NOT NULL
  AND id IN ('29cd66ab-2343-4ac8-8023-c74bd0f9b820','c9d6ad2b-888b-41f3-935e-dbce0ccdf858');  -- 期望 DELETE 2
COMMIT;
```

验证：剩余 **300**、`tenant_id=…0001` 计数不变（300）；回滚 `pg_restore --data-only -n crm -t customers` → 302 行即成功。
**注意**：恢复后两行仍带 `deleted_at`，属正常状态，不要去改。

### 2.4 `ehs.qa_ehs_risks`（19 / 19）

**1) 精确定位 SQL（实测 19）**

```sql
SELECT count(*) FROM ehs.qa_ehs_risks
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND title = '未命名风险'
  AND created_by IS NULL;                  -- 实测 19；全表 19
```

对齐：文档 19 = 实测 19。`created_by/department_id` 全 NULL，`risk_no = RSK-XXXXXXXX`。

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
  AND created_by IS NULL;                  -- 期望 DELETE 19
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
  AND coalesce(created_by,'') = '';        -- 实测 36；全表 36
```

对齐：文档 36 = 实测 36。`monitor_no = ENV-XXXXXXXX`，`status='active'`。
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
  AND coalesce(created_by,'') = '';        -- 期望 DELETE 36
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
| `public.audit_logs` | 有 | **无效**：`audit_query.rs` 查询不过滤 `deleted_at` | 见 §6 两路径 |

补一句：**软删不等于隔离**。这 5 张表的列表查询都带 `tenant_id` 条件；即便软删，`tenant_id=0` 行在收紧后
仍是“脏数据”，只是从“可见”变成“不可见”。硬删的目的不是让业务看不见，而是让统计与审计口径回到干净状态。

## 4. 备份与存放约定

- **本轮未创建任何目录/文件**（只读）。
- prod 上 `/backup` **不存在**；`~` 可用空间 ~11 GiB，6 张表总量约 0.6 MB，快照成本可忽略。
- **建议约定（【待拍板】）**：`~/backups/topems_prod/<YYYYMMDD>/<schema>_<table>.dump` + 同名 `.target.csv`。
  若你要求放到 `/backup` 或外部挂载盘，请在拍板时给出路径；窗口内再 `mkdir`。
- 文件名固定：`crm_crm_master_data_refs` / `crm_returns` / `crm_customers` / `ehs_qa_ehs_risks` /
  `ehs_qa_ehs_environment_monitors` / `public_audit_logs`。
- **备份自检**（恢复演练的最低要求）：
  `pg_restore -l <dump> | grep TABLE DATA` 应列出目标表；CSV 行数应等于目标行数（121/18/2/19/36/258）。
- 保留期建议与现网备份策略一致；**不要**把快照留在 prod 库内（`CREATE TABLE bf_bak_*` 会扩表并进备份链），
  如必须库内留底，只在窗口事务内建临时表并在验证后 `DROP`。

## 5. 执行顺序、批次与行数核对

建议**按表独立事务**，每表“预统计 → DELETE → 后统计 → COMMIT”，任一计数不符立即 `ROLLBACK`：

| 批次 | 表 | 期望影响行数 | 事务后剩余 |
| ---: | --- | ---: | ---: |
| 1 | `crm.returns` | 18 | 0 |
| 2 | `ehs.qa_ehs_risks` | 19 | 0 |
| 3 | `ehs.qa_ehs_environment_monitors` | 36 | 0 |
| 4 | `crm.crm_master_data_refs` | 121 | 37 |
| 5 | `crm.customers`（可选） | 2 | 300 |
| 6 | `public.audit_logs`（若走路径一） | **N（窗口现场重测，快照 258，13:55 为 260）** | 89 / 90 |

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

## 6. `public.audit_logs` 258 行：两条路径对比

目标集（实测 258，全表 347）：

```sql
SELECT count(*) FROM public.audit_logs
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND entity_id = '00000000-0000-0000-0000-000000000099';
-- 快照 258 / 全表 347；13:55 复查为 260 / 350（仍在上涨）
-- 258 = project 49 / contract 95 / budget 57 / risk 19 / document 19 / vector 19
-- 时间：11-02 245 行、11-06 13 行（+13:52~13:55 新增 delete_vector / delete_document）
-- 全部 deleted_at IS NULL
```

删除后**全表剩余 89 行（快照）** = 0 租户非合成 62（含 17 行可归因项目）+ NULL 租户 27；
13:55 复查则为 90 行。
**注意**：在探针写入未停止前，这个集合会持续增长，删完还会回涨——见 §8 D12。

### 路径一：物理删除 258 行

| 维度 | 说明 |
| --- | --- |
| 动作 | `DELETE ... WHERE tenant_id='…0' AND entity_id='…0099'` |
| 代价 | 需**审计/安全书面批准** + 备份 + 证据留存；不可逆（除备份恢复） |
| 可逆性 | 仅靠 `pg_dump` 快照；恢复后 `id/created_at` 不变，但“删除事实”本身会留在 DBA 操作记录 |
| 对 RLS 收紧 | **没有实质帮助**：剩余 89 行仍有 62 行 `tenant_id=0`、27 行 NULL，收紧策略照样要处理脏租户分支 |
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
| 收紧收益 | 无（仍有 89 行脏租户） | 无（但 2d 不影响收紧） |
| 审计视图噪声 | 消除 | 保留（仅超管可见） |

**建议（待你拍板）**：默认走 **2d（原样保留 + 收紧后仅系统通道可见）**；若审计/安全明确要求“生产审计表不得含
合成探针”，再走 **2a 归档表**（保留可查副本，原表干净）。**路径一仅在书面批准后执行**。
两种做法都不改变“17 行可归因项目已回填 …0001”这一已确认动作。

## 7. B 组 72 行：聚类分析（只读）

> 快照 72 行；13:55 复查为 **73 行**（新增 1 行 `update|user`，13:54:58，`tenant_id IS NULL`，实体 `e91e…`，payload `{}`）。
> 下表的 19 就是这 1 行到来前的计数。

定义（实测 72，修正了 NULL 陷阱）：

```sql
SELECT count(*) FROM public.audit_logs a
WHERE (a.tenant_id = '00000000-0000-0000-0000-000000000000' OR a.tenant_id IS NULL)
  AND a.entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099'
  AND NOT (a.entity_type='project' AND a.entity_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM pm.projects p
                       WHERE p.id=a.entity_id AND p.tenant_id IS NOT NULL
                         AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'));
-- 72 = 320(0 租户) - 258(合成) - 17(可归因) + 27(NULL 租户)
```

### 7.1 按 `action` / `entity_type` 聚类（11 类）

| 簇 | 行数 | `entity_id` 空 | `tenant_id` NULL | 时间窗 | 说明 |
| --- | ---: | ---: | ---: | --- | --- |
| `update_acceptance_plan` / project | 19 | 19 | 0 | 11-02 11–13、11-05 11–12、11-06 05/12 | 无实体、payload `{"status": null}` |
| `update` / user | 19（13:55 为 20） | 0 | 19（13:55 为 20） | 11-02 11:37–14:xx、11-06 12:4x / 13:54 | 全部指向冒烟账号 `e91e…`；最新 1 行 13:54:58 |
| `delete_project` / project | 9 | 0 | 0 | 10-26 20:12–21:15 | 删完即离场 |
| `create` / user | 7 | 0 | 7 | 10-26 17:54、11-06 05 | 含 `testuser_…@topems.local` / `fresh2026` |
| `create_project` / project | 7 | 0 | 0 | 10-26 20:13–21:15 | `L1-DBG-1` / `AUDIT-1` |
| `update_risk` / risk | 3 | 0 | 0 | 10-26 20:15–20:44 | 含 `22222222-2222-…` 测试 id |
| `create_risk` / risk | 3 | 0 | 0 | 10-26 20:14–20:44 | `L1-RISK-9` / `DRIFT-R-1` |
| `approval_start` / project | 2 | 0 | 0 | 10-26 21:14–21:15 | 仅这 2 行有 `user_name` |
| `delete` / user | 1 | 0 | 1 | 10-26 17:54 | 与 `create` 同一秒 |
| `approval_reject` / project | 1 | 0 | 0 | 10-26 21:15 | `reason: 不通过` |
| `approval_approve` / project | 1 | 0 | 0 | 10-26 21:14 | 审批闭环 |

聚合：**项目生命周期 39**（update_acceptance_plan 19 + delete 9 + create 7 + approval 4）、
**用户生命周期 27**（update 19 + create 7 + delete 1；13:55 为 28）、**风险 6**。

### 7.2 按 `user_agent` / `ip_address` / `path` / `method`

- `user_agent`：**72/72 为 NULL**
- `ip_address`：**72/72 为 NULL**
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

### 7.6 保留 orphan 的具体做法（若选择“不删”）

| 项 | 做法 | 是否影响收紧 |
| --- | --- | --- |
| 字段 | **不新增**任何标记列；`tenant_id` 保持现状（0 或 NULL） | 不影响 |
| 标记方式 | 用只读查询固化清单：`entity_id IS DISTINCT FROM '…0099'` + 非可归因条件，导出 72 个 `id` 作为附件 | 不影响 |
| 可见性 | 收紧后普通租户不可见；超管系统通道（`app.rls_system='on'`）仍可查 | 需要在收紧策略里显式保留系统通道 |
| 库内表 | **不建** `audit_orphans` 之类的独立表/列，避免扩表与备份链变化 | 不影响 |
| 索引 | `audit_logs_tenant_id_idx` 已存在，查询已覆盖 | 不影响 |

**【待拍板】** B 组 72 行：保留（推荐）还是逐条核实后删除；若删除，按 §5 模板拆 3 个子批次（项目类 39 / 用户类 27 / 风险类 6）。

## 8. 需要你拍板的清单

| # | 事项 | 选项 | 我的建议 | 状态 |
| ---: | --- | --- | --- | --- |
| D1 | `crm.crm_master_data_refs` 121 行 | 删 / 保留 | **保留**（等 SCM 确认残留来源） | 待拍板 |
| D2 | `crm.returns` 18 行 | 删 / 保留 | 删（连续编号 + 冒烟账号佐证） | 待拍板 |
| D3 | `ehs.qa_ehs_risks` 19 行 | 删 / 保留 | 删（全部占位标题、无引用） | 待拍板 |
| D4 | `ehs.qa_ehs_environment_monitors` 36 行 | 删 / 保留 | 删（同上） | 待拍板 |
| D5 | `crm.customers` 2 行 | 删 / 不删 | **不删**（已软删、业务主表） | 待拍板 |
| D6 | `public.audit_logs` 258 行 | 路径一删 / 路径二保留 | **路径二 2d（原样保留）**；如需隔离用 2a 归档表 | 待拍板 |
| D7 | B 组 72 行 | 保留 / 逐条核实后删 | **保留**，固化为只读清单 | 待拍板 |
| D8 | 备份路径 | `~/backups/topems_prod/20261106/` 或你指定 | 上者（`/backup` 不存在） | 待拍板 |
| D9 | 是否允许窗口内建库内备份表 | 允许 / 禁止 | **禁止**（改用 dump 文件） | 待拍板 |
| D10 | 明文口令 payload（B 组 `create\|user`） | 一并处理 / 另立安全项 | **另立安全项** | 待拍板 |
| D11 | 30 张可收紧表的时点 | 清理后 / 并行 | **清理确认并验证后再收紧** | 待拍板 |
| D12 | 仍在运行的探针写入（13:52 `delete_vector`/`delete_document`、13:54 `update\|user`） | 先定位并停掉 / 不管 | **先定位并停掉**，否则 A 组 audit 与 B 组会持续回涨 | 待拍板 |

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

- E1（13:4x 快照）：`refs 121/158`、`returns 18/18`、`customers 2/302`、`risks 19/19`、`monitors 36/36`、
  `audit0099 258/347`；`audit` 0 租户合计 320，NULL 27。**13:55 复查**：`audit0099 260/350`，0 租户 322，NULL 28。
- E2a / E2b：**0 行**（出向、入向均无 FK）。
- E3：**全部 0**。
- 触发器 0、视图依赖 0（`pg_trigger` / `pg_views` 实测）。
- 表体量：audit 216 kB、customers 168 kB、refs 112 kB、risks 64 kB、monitors 48 kB、returns 48 kB。

## 10. 拿不准 / 明确标注未定的事项

1. **refs 121 行的来源**：只能看到“`local_entity_id` 全空 + 同名 `Acme Corp`”，无 path/UA 可追；需 SCM 负责人确认。
2. **B 组 72 行的责任人**：`user_agent` / `ip_address` 全空、无 path/method 列，本稿只做推断，不做定论。
3. **审计留存的合规口径**（保存年限、删除审批人、是否需要归档表）：本稿不代替安全/合规意见。
4. **批量删除是否允许在业务时段执行**：表小（454 行、<1 MB 变更），但审计表有检索流量，建议仍在低峰窗口。
5. **`status` 列是否可以承载 `synthetic_probe`**：不建议，但若你倾向“零 DDL”，需要前端状态映射同步评估（未评估）。
6. **prod `app.rls_system` 之外的超管查询路径**：本稿依据 `lib/shared-auth/src/middleware/tenant.rs:166-252`；
   若收紧时新增/改名开关，本稿 §7.6 的“超管可见”前提需重新核对。
7. **探针写入的来源**：`audit_logs` 无 path/method、`user_agent`/`ip_address` 全空，本稿无法定位是哪个任务在 13:52/13:54
   写入；需要从应用侧日志或部署任务清单反查。**在查清前，清理无法保证“一次删净”**。
8. **audit 目标集的时效性**：快照 258、13:55 已 260；窗口开始时重测的数才是基线，任何固定数字都可能过期。

## 11. 本轮边界声明

- prod：**只读**，未执行 DML/DDL，未重启、未部署。
- 仓库：未建迁移、未改代码；本文档为唯一新增文件。
- 禁止项仍生效：不使用 `--no-verify`、不 force push。
- 30 张可收紧表：**继续不动**，等 A/B 组拍板并验证后再排期。
