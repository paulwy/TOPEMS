# 7 张脏租户表回填口径（2026-11-06）

> 状态：**仅分析与方案**。prod 全程只读（`SELECT` / `information_schema` / `pg_catalog`），未执行任何 DML/DDL，
> 未建迁移、未收紧策略。30 张可收紧表等本口径确认后再动。
>
> 关联：[下一批 RLS 评估](rls-tenant-isolation-next-batch-2026-11-06.md)、
> [连接治理 B.10.13](../database/connection-governance.md)。

## 0. 总览

prod 仅存在一个正式租户 `00000000-0000-0000-0000-000000000001`（默认租户）；
`public.core_users` 与 `iam.core_users` 均为 0 行，`mobile.mobile_users` 仅有 1 个冒烟测试账号
（`e91e2228-ab9d-4ac3-99f4-fdcd9c723f21`，`tenant_id` 为 NULL）。7 张表均**没有外键约束**。

| 表 | 总行 | NULL | 0 | 其他租户 | 脏行时间窗 | 可归因 | 孤儿 | 结论 |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |
| `public.audit_logs` | 347 | 27 | 320 | 0 | 10-26 17:54 ~ 11-06 12:48 | 17 | **330** | 仅回填 17；330 标 orphan/人工确认（其中 258 为合成探针） |
| `crm.rfm_results` | 300 | 0 | 300 | 0 | 11-06 12:44（同一分钟） | 300 | 0 | **全部回填 …0001** |
| `crm.crm_master_data_refs` | 158 | 0 | 121 | 37（…0001 34 / `9bb6…` 3） | 10-26 14:19 ~ 11-05 19:04 | 0 | 121 | 不归 …0001；清理或 orphan，需业务确认 |
| `crm.returns` | 18 | 0 | 18 | 0 | 11-02 11:35 ~ 11-06 12:44 | 0 | 18 | 探针数据，orphan/清理 |
| `crm.customers` | 302 | 0 | 2 | 300（…0001） | 11-06 07:31 | 0 | 2（已软删） | 不处理；可选硬删 |
| `ehs.qa_ehs_risks` | 19 | 0 | 19 | 0 | 11-02 11:36 ~ 11-06 12:44 | 0 | 19 | 探针数据，orphan/清理 |
| `ehs.qa_ehs_environment_monitors` | 36 | 0 | 36 | 0 | 11-02 11:35 ~ 11-06 12:44 | 0 | 36 | 探针数据，orphan/清理 |

合计：脏行 **843**，可归因 **317**（rfm 300 + audit 17），孤儿 **526**（audit 330、refs 121、returns 18、
customers 2、risks 19、monitors 36）。

**判据原则**：只用可在 SQL 里写成 `JOIN` / 子查询的字段；同一行有多个判据时取“可验证的最强判据”；
判据指向的父记录自身 `tenant_id` 为空/0 时**不算归因**。无法归因的行一律不猜、不默认填 …0001。

## 1. `public.audit_logs`

### 1.1 prod 实测

- 总 347 行：`tenant_id IS NULL` 27、`= 0` 320、其他 0。
- 时间：最早 `2026-10-26 17:54`，最晚 `2026-11-06 12:48`；脏行与该范围一致。
- `public.core_users` / `iam.core_users` 无任何用户记录，`mobile.mobile_users` 的测试账号 `tenant_id` 为 NULL；
  脏行的 `user_id` 有 318 行为空，其余 3 个 user id 均无法解析到任何租户。

### 1.2 归因判据与覆盖

唯一可写出的判据：`entity_type='project'` 时 `entity_id → pm.projects.id → pm.projects.tenant_id`。

```sql
SELECT count(*) AS attributed
FROM public.audit_logs a
JOIN pm.projects p ON p.id = a.entity_id
WHERE a.tenant_id = '00000000-0000-0000-0000-000000000000'
  AND a.entity_type = 'project'
  AND p.tenant_id IS NOT NULL
  AND p.tenant_id <> '00000000-0000-0000-0000-000000000000';
```

实测：**17 行**，指向 12 个真实项目，租户全部为 …0001。

330 行孤儿构成（已逐项 SQL 核对）：

| 类型 | 行数 | 说明 |
| --- | ---: | --- |
| 合成实体 `00000000-0000-0000-0000-000000000099` | 258 | project 49 / contract 95 / budget 57 / risk 19 / document 19 / vector 19，探针固定实体 |
| project 且 `entity_id IS NULL` | 19 | 无实体可 join |
| project 且 id 在 `pm.projects` 不存在 | 20 | 含 rs/pdm 项目表也无匹配 |
| risk 且 id 不存在（非 …0099） | 6 | `pm.project_risks` / `ehs.qa_ehs_risks` 均无匹配 |
| `entity_type='user'` 且 `tenant_id IS NULL` | 27 | 被审计用户已不存在 |

user 类审计行引用的用户 id（`e91e…`、`56f4…`、`000…e2e0`）在 `public.core_users`、`iam.core_users`、
`public.core_tenant_users`、`mobile.mobile_users` 中均无带租户记录，不能把“冒烟账号”当业务归属。

### 1.3 处置建议

- **回填 17 行 → …0001**（确定性 join，可核对）。
- **330 行标 orphan，不归 …0001**：审计日志一旦归到唯一正式租户，会混入真实审计视图，
  比“隐藏”更难纠错；且其中 258 行是固定探针实体。
- **不建议删审计日志**（合规属性）。若业务确认可清理，只删除 258 行固定 `…0099` 探针，
  且需单独审批 + 备份；其余 72 行（19 null entity / 20 不存在项目 / 6 不存在风险 / 27 已删用户）
  必须人工确认。
- **【高风险/必须人工确认】** 该表孤儿 330 行，是本批最大的一组“无法归因”数据；本轮不拍删除口径。

### 1.4 SQL 草稿（回填 17 行）

```sql
-- 0) 备份（DBA 窗口，任选其一）
-- pg_dump -Fc -t public.audit_logs -f /backup/audit_logs_20261106.dump
CREATE TABLE bf_bak_audit_logs_20261106 AS SELECT * FROM public.audit_logs;

BEGIN;
SET LOCAL app.rls_system = 'on';

-- 1) 预统计：必须 17
SELECT count(*) FROM public.audit_logs a
JOIN pm.projects p ON p.id = a.entity_id
WHERE a.entity_type = 'project'
  AND (a.tenant_id IS NULL OR a.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND p.tenant_id IS NOT NULL AND p.tenant_id <> '00000000-0000-0000-0000-000000000000';

-- 2) 更新（RETURNING 行数应为 17）
UPDATE public.audit_logs a
SET tenant_id = p.tenant_id
FROM pm.projects p
WHERE p.id = a.entity_id
  AND a.entity_type = 'project'
  AND (a.tenant_id IS NULL OR a.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND p.tenant_id IS NOT NULL
  AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'
RETURNING a.id;

-- 3) 后核对
SELECT count(*) FILTER (WHERE tenant_id IS NULL) AS nulls,
       count(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000000') AS zeros
FROM public.audit_logs;

-- 4) 确认后 COMMIT；否则 ROLLBACK
COMMIT;
```

回滚：

```sql
BEGIN;
UPDATE public.audit_logs a
SET tenant_id = b.tenant_id
FROM bf_bak_audit_logs_20261106 b
WHERE b.id = a.id;
COMMIT;
```

## 2. `crm.rfm_results`

### 2.1 prod 实测

- 总 300 行，全部 `tenant_id = 0`；无 NULL、无其他租户。
- 时间全部为 `2026-11-06 12:44`（同一分钟批量生成）。
- 判据：`customer_id → crm.customers.id → tenant_id`。实测 **300/300 可归因**，全部为 …0001
  （`crm.customers` 的 300 行正式数据均为 …0001）。无孤儿。

### 2.2 处置建议

**全部回填 …0001**。这是本批唯一“可全量归因”的大表，风险最低；回填后 RFM 结果与
真实客户租户一致，不会把测试数据带入其它租户。

### 2.3 SQL 草稿

```sql
CREATE TABLE bf_bak_rfm_20261106 AS SELECT * FROM crm.rfm_results;

BEGIN;
SET LOCAL app.rls_system = 'on';

-- 预统计：必须 300
SELECT count(*) FROM crm.rfm_results r
JOIN crm.customers c ON c.id = r.customer_id
WHERE (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND c.tenant_id IS NOT NULL AND c.tenant_id <> '00000000-0000-0000-0000-000000000000';

UPDATE crm.rfm_results r
SET tenant_id = c.tenant_id
FROM crm.customers c
WHERE c.id = r.customer_id
  AND (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND c.tenant_id IS NOT NULL
  AND c.tenant_id <> '00000000-0000-0000-0000-000000000000'
RETURNING r.id;

-- 后核对：0 行残留
SELECT count(*) FROM crm.rfm_results
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';
COMMIT;
```

回滚：`UPDATE crm.rfm_results r SET tenant_id=b.tenant_id FROM bf_bak_rfm_20261106 b WHERE b.id=r.id;`

## 3. `crm.crm_master_data_refs`

### 3.1 prod 实测

- 总 158 行：`= 0` 121、其他 37（…0001 34、`9bb66b3d-…` 3）、NULL 0。
- 脏行时间：`2026-10-26 14:19` ~ `2026-11-05 19:04`。
- 121 行脏数据的特征：`local_entity_id` 全部为 NULL；`code/name` 117 行为 `Acme Corp`、
  1 行 `Acme Industrial Supply Co.`、3 行空值，共仅 3 个不同 name/code。
- 可写出的判据：`payload_snapshot->>'id' → scm.suppliers.id → tenant_id`。
  实测 payload id 能匹配 5 行 refs，但对应 2 个 `scm.suppliers` 的 `tenant_id` 均为 NULL，
  **不能推导出租户**；其余 116 行 payload id 在本地供应商表无记录。
- 因此**可归因 0 行，孤儿 121 行**。

旁证：同表 34 行 `tenant_id = …0001` 的记录（`E2E-EMP-…`、`测试数据`）说明“带认证的同步路径”能正确落租户；
121 行 0 租户来自未设置租户的同步/测试路径。`9bb6…` 3 行属于一个不在 `core_tenants` 的测试租户，
不在本批脏行范围，但建议一并核实来源。

### 3.2 处置建议

- **不归 …0001**：117 行同名 `Acme Corp` 进入默认租户的主数据引用列表会形成明显脏数据。
- 首选 **标记 orphan（保持 0）**，收紧后普通租户不可见；次选在业务确认后**清理 121 行**。
  清理前必须备份，并用 `master_data_id` 白名单删除，禁止按 `code='Acme Corp'` 裸条件删除。
- **【高风险/必须人工确认】** 121 行全部无法归因，且是同步链路的产物；需 SCM/主数据负责人确认是否为
  压测残留后再决定删除。

### 3.3 SQL 草稿

归因（预期影响 0 行，仅用于留证，不建议在 prod 执行）：

```sql
SELECT count(*) FROM crm.crm_master_data_refs r
JOIN scm.suppliers s ON s.id = (r.payload_snapshot->>'id')::uuid
WHERE (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND s.tenant_id IS NOT NULL AND s.tenant_id <> '00000000-0000-0000-0000-000000000000';
```

清理（**需授权**，先备份）：

```sql
CREATE TABLE bf_bak_refs_20261106 AS SELECT * FROM crm.crm_master_data_refs;
CREATE TABLE bf_orphan_refs_20261106 AS
SELECT master_data_id FROM crm.crm_master_data_refs
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND local_entity_id IS NULL;

BEGIN;
DELETE FROM crm.crm_master_data_refs r
USING bf_orphan_refs_20261106 o
WHERE r.master_data_id = o.master_data_id;
-- 必须 DELETE 121
COMMIT;
```

回滚：按 `bf_bak_refs_20261106` 的 `master_data_id` 重新插入（或整表 restore）。
注意该表主键是 `master_data_id`，**没有 id 列**。

## 4. `crm.returns`

### 4.1 prod 实测

- 总 18 行，全部 `tenant_id = 0`；时间：17 行在 `2026-11-02`（`RET-20261102-000001` ~ `000017` 连续编号），
  1 行在 `2026-11-06 12:44`（`RET-20261106-000001`）。
- `customer_id`、`order_id`、`ticket_id`、`warehouse_id` 全部为空；
  `created_by` 全部为冒烟账号 `e91e…`（`mobile.mobile_users`，`tenant_id` 为 NULL）。
- 可写出的判据只有 `customer_id → crm.customers` 与 `created_by → 用户表`，实测均为 0 行；
  **可归因 0，孤儿 18**。

### 4.2 处置建议

- **不归 …0001**：退货单会进入正式业务列表并被审批流看到。
- 首选 orphan（保持 0，收紧后不可见）；业务确认是压测残留后**清理 18 行**（连续编号 + 冒烟账号可佐证）。

### 4.3 SQL 草稿

```sql
-- 归因（预期 0 行）
SELECT count(*) FROM crm.returns x
JOIN crm.customers c ON c.id = x.customer_id
WHERE (x.tenant_id IS NULL OR x.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND c.tenant_id IS NOT NULL AND c.tenant_id <> '00000000-0000-0000-0000-000000000000';

-- 清理（需授权）
CREATE TABLE bf_bak_returns_20261106 AS SELECT * FROM crm.returns;
CREATE TABLE bf_orphan_returns_20261106 AS
SELECT id FROM crm.returns
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND customer_id IS NULL
  AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';

BEGIN;
DELETE FROM crm.returns x USING bf_orphan_returns_20261106 o WHERE x.id = o.id;
COMMIT;
```

回滚：按备份表 `id` 重新插入 / 整表 restore。

## 5. `crm.customers`

### 5.1 prod 实测

- 总 302 行：300 行 `tenant_id = …0001`（真实客户），2 行 `= 0`，无 NULL。
- 2 行脏数据均为 E2E 探针，且**已软删除**：
  - `29cd66ab-…` / `E2E Probe Customer` / `CUS-PROBE-2`，创建 07:31:23、删除 07:31:39；
  - `c9d6ad2b-…` / `E2E-CUST-1793921516083`，创建 07:31:56、删除 07:31:56。
- `owner_id = 56f4256f-…` 在 `public.core_users` / `iam.core_users` / `mobile.mobile_users` 均无记录，无法归因。
- **可归因 0，孤儿 2（均已软删）**。该表绝大多数是真业务数据，清理必须极其保守。

### 5.2 处置建议

- **不回填、不修改**：两行已 `deleted_at` 非空，业务查询与列表均不可见；收紧 RLS 后普通租户也不可见。
- 可选：业务确认后按 id 硬删除这 2 行；**禁止**用“owner 无法归因就填 …0001”的兜底规则，
  否则探针客户会进入默认租户客户列表。

### 5.3 SQL 草稿

```sql
-- 归因（预期 0 行）
SELECT count(*) FROM crm.customers c
JOIN iam.core_users u ON u.id = c.owner_id
WHERE (c.tenant_id IS NULL OR c.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND u.tenant_id IS NOT NULL AND u.tenant_id <> '00000000-0000-0000-0000-000000000000';

-- 可选硬删（需授权；两行已软删）
CREATE TABLE bf_bak_customers_20261106 AS SELECT * FROM crm.customers
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

BEGIN;
DELETE FROM crm.customers
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND deleted_at IS NOT NULL
  AND id IN ('29cd66ab-2343-4ac8-8023-c74bd0f9b820',
             'c9d6ad2b-888b-41f3-935e-dbce0ccdf858');
-- 必须 DELETE 2
COMMIT;
```

## 6. `ehs.qa_ehs_risks`

### 6.1 prod 实测

- 总 19 行，全部 `tenant_id = 0`；`created_by` 全部 NULL，`department_id` 全部 NULL。
- 标题全部为 `未命名风险`，编号 `RSK-XXXXXXXX`；时间 11-02 13:58–14:06（17 行）+ 11-06 12:44（2 行）。
- 可写出的判据：`created_by → 用户表`、`department_id → hrm.departments`；实测均为 0 行。
- **可归因 0，孤儿 19**。

### 6.2 处置建议

- **不归 …0001**：未命名风险会进入默认租户的风险台账。
- 首选 orphan；业务确认后可清理 19 行（同一批 `未命名风险` + 空创建人可佐证）。

### 6.3 SQL 草稿

```sql
SELECT count(*) FROM ehs.qa_ehs_risks r
LEFT JOIN iam.core_users u ON u.id = r.created_by
LEFT JOIN hrm.departments d ON d.id = r.department_id
WHERE (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND (u.tenant_id IS NOT NULL OR d.tenant_id IS NOT NULL);

-- 清理（需授权）
CREATE TABLE bf_bak_risks_20261106 AS SELECT * FROM ehs.qa_ehs_risks;
CREATE TABLE bf_orphan_risks_20261106 AS
SELECT id FROM ehs.qa_ehs_risks
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND title = '未命名风险' AND created_by IS NULL;

BEGIN;
DELETE FROM ehs.qa_ehs_risks r USING bf_orphan_risks_20261106 o WHERE r.id = o.id;
COMMIT;
```

## 7. `ehs.qa_ehs_environment_monitors`

### 7.1 prod 实测

- 总 36 行，全部 `tenant_id = 0`；`created_by` 全部为空串/NULL；`monitor_no = ENV-XXXXXXXX`，
  名称全部为 `未命名监测点`，状态 `active`；时间 11-02 后段 + 11-06 12:44。
- `created_by` 在 prod 是文本列，且全部为空，无法 join 用户表；无其它业务外键。
- **可归因 0，孤儿 36**。

### 7.2 处置建议

- **不归 …0001**。
- 首选 orphan；业务确认后清理 36 行。若担心误删真实监测点，保留 orphan、只做“收紧后不可见”最稳妥。

### 7.3 SQL 草稿

```sql
SELECT count(*) FROM ehs.qa_ehs_environment_monitors
WHERE (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000')
  AND coalesce(created_by,'') <> '';

-- 清理（需授权）
CREATE TABLE bf_bak_monitors_20261106 AS SELECT * FROM ehs.qa_ehs_environment_monitors;
CREATE TABLE bf_orphan_monitors_20261106 AS
SELECT id FROM ehs.qa_ehs_environment_monitors
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND name = '未命名监测点' AND coalesce(created_by,'') = '';

BEGIN;
DELETE FROM ehs.qa_ehs_environment_monitors m USING bf_orphan_monitors_20261106 o WHERE m.id = o.id;
COMMIT;
```

## 8. 孤儿人工确认清单

| 分组 | 行数 | 构成 | 建议 |
| --- | ---: | --- | --- |
| A. 高置信探针残留 | 454 | audit 258 固定 `…0099` + refs 121（117 `Acme Corp`）+ returns 18 + customers 2（已软删）+ risks 19 + monitors 36 | 业务确认后清理；audit 需合规审批 |
| B. 来源不明，需人工核查 | 72 | audit：project `entity_id` 空 19、project 不存在 20、risk 不存在 6、`user` 类 NULL 27 | 不猜；逐条核实后再定 |
| 合计 | 526 | — | 本轮**不执行任何清理** |

必读：
1. 526 行孤儿中**没有一行**能通过“父记录自身带非零租户”的 join 归因；不要用“prod 只有一个租户”做推断。
2. 审计日志的 72 行 B 组必须由安全/审计负责人确认；删除审计数据不属于常规运维。
3. `crm.crm_master_data_refs` 的 121 行需 SCM/主数据负责人确认同步链路来源。

## 9. 本地演练

环境：本地 `topems`（163 MB）克隆到 `topems_bf_rehearsal`，演练结束已 `DROP DATABASE`；
主开发库未被修改。演练角色为本地 superuser（等价于窗口期 DBA），并在会话内 `SET app.rls_system='on'`。

构造的 NULL/0 样本（固定前缀 `bfbf0000-…` / `BF-REF-…`）：

- rfm：1 行指向真实客户（可归因）+ 1 行指向不存在客户（孤儿）；
- returns：1 行指向真实客户 + 1 行指向不存在客户；
- refs：1 行 payload 指向真实供应商 + 1 行指向不存在供应商；
- audit：1 行 NULL 指向真实项目 + 1 行 0 指向不存在项目；
- risks / monitors / customers：各 1 行无判据样本（本地 risks 缺少 `created_by` 列，refs/returns/rfm 的
  `tenant_id` 为 NOT NULL，故这些表用 0 样本，NULL 分支由 audit/customers/monitors 覆盖）。

### 9.1 回填前（含样本）

```text
t|total|nulls|zeros|other
rfm|273|0|273|0
audit|2617|135|2482|0
refs|831|0|816|15
returns|185|0|185|0
customers|294|1|104|189
risks|245|0|182|63
monitors|219|1|218|0
```

### 9.2 执行回填（命中行数）

```text
updated|rfm|190        （基线 189 + 样本 1）
updated|audit|4        （基线 3 + 样本 1）
updated|refs|1         （样本 1）
updated|returns|1      （样本 1）
customers / risks / monitors：0
```

### 9.3 回填后

```text
t|total|nulls|zeros|other
rfm|273|0|83|190
audit|2617|134|2479|4
refs|831|0|815|16
returns|185|0|184|1
customers|294|1|104|189
risks|245|0|182|63
monitors|219|1|218|0
```

按租户计数（更新后）：rfm 0→83、…0001→190；audit 0→2479、…0001→4、NULL→134；
refs 0→815、…0001 13、`c6ff…` 3；returns 0→184、…0001→1。
非脏租户计数未变化，说明脚本没有误伤其它行。

样本核对：rfm/returns/refs/audit 的“可归因样本”均变为 …0001；对应“孤儿样本”保持 0；
risks 保持 0、monitors/customers 保持 NULL，符合“无判据不更新”。

### 9.4 回滚

```text
UPDATE crm.rfm_results ...              -> UPDATE 273
UPDATE public.audit_logs ...            -> UPDATE 2617
UPDATE crm.crm_master_data_refs ...     -> UPDATE 816
UPDATE crm.returns ...                  -> UPDATE 185
回滚后分布 = 回填前基线（rfm 273/0、audit 2617/135/2482、refs 831/816/15、returns 185/185）
```

### 9.5 清理复核

删除 11 行构造样本、DROP 7 张备份表后，最终基数回到演练前：

```text
rfm 271/271(0)  audit 2615/2481(0)  refs 829/814(0)  returns 183/183(0)
customers 293/104(0)  risks 244/181(0)  monitors 218/218(0)
```

结论：脚本可执行；可归因行按预期回填；孤儿样本与其它租户行未被误改；备份表回滚可精确恢复。

## 10. 风险与待拍板

1. **prod 未执行任何 DML/DDL**；以上 UPDATE/DELETE 均为草稿，窗口授权后才可执行。
2. 需业务/合规确认：A 组 454 行是否清理（尤其 audit 258、refs 121、returns 18）。
3. 需人工核查：B 组 72 行审计孤儿。
4. 默认口径（未获确认前）：**只回填 rfm 300 + audit 17；其余保持 0/NULL 并标记 orphan**，
   不放行任何删除，也不把孤儿兜底到 …0001。
5. 收紧策略仍在本批之后：30 张非回填表与 7 张回填表的前置顺序为“先回填确认 → 再收紧”。
6. 附带观察（不在本批范围）：user 类审计的 `request_details` 含明文口令字段，
   建议另立安全项评估脱敏与历史数据清理。
