# 组织字段口径定案与存量冻结（W5-C / E4-15）

日期：2026-11-21
范围：`database/migrations/`、`svc/`、`lib/`、`apps/web/src/`
状态：口径已定；存量未清理，新增迁移已设门禁。

## 1. 定案口径

沿用 V69.1 已落地的语义，不再引入第四套字段：

| 字段 | 语义 | 使用规则 |
| --- | --- | --- |
| `tenant_id` | 租户隔离键，RLS 与请求作用域的唯一边界 | 所有租户表必须有；查询、写入、策略一律以它为准 |
| `org_id` | 组织层级键（部门/组织树/业务组织），不是租户 | 只表达组织归属；不得再当 `tenant_id` 的别名使用 |
| `company_id` | 法人主体键 | 只用于开户行、合并范围、内部交易等确实需要法人主体的表；不得当租户或组织层级使用 |
| `organization_id` | 已废弃的第三套别名 | 不得出现在新迁移、新表、新查询中；存量按基线只减不增 |

依据：`database/migrations/20260810000002_v69_rename_company_id_to_org_id.sql` 与
`database/migrations/20260810000003_v69_unify_organization_id.sql` 已明确
“`organization_id` 要么并入 `tenant_id`，要么改为 `org_id`”，`company_id` 仅保留
B/C 类法人主体表。

## 2. 为什么现在仍未收敛

2026-11-19 至 2026-11-21 的 canonical 重建迁移重新引入了 `organization_id`：

- `20261120235900_hrm_schema_canonical.sql`：HRM 多表同时保留 `tenant_id` 与
  `organization_id`；
- `20261120110000_ai_schema_canonical.sql`、`20261120200000_lims_schema_canonical.sql`：
  新表直接以 `organization_id` 建列；
- `20261120210000_wms_schema_canonical.sql`：WMS 多表出现
  `tenant_id` + `organization_id` + `org_id` 三列并存。

本地 `topems` 库实测，WMS 内部也不是同一口径：

| 表 | `organization_id` 与 `tenant_id` | `organization_id` 与 `org_id` | 判定 |
| --- | --- | --- | --- |
| `wms.inbound_orders` | 18/18 行相等 | 16/18 行不同 | `organization_id` 是租户重复列，`org_id` 才是独立组织值 |
| `wms.warehouses` | 29/29 行不同 | 29/29 行不同 | `organization_id` 是独立组织值，`org_id` 反而接近租户值 |
| `wms.locations` | 10/10 行不同 | 10/10 行不同 | 同上，不能按租户别名处理 |
| `wms.inventory` | 74/74 行不同 | 4/74 行不同 | 多数等于 `org_id`，少数不等，需保留待人工定性 |
| `wms.audit_logs` | 6403/7243 行不同 | 0 行不同 | `organization_id` 是 `org_id` 的重复列 |

HRM 侧则相对统一：`hrm.departments`、`hrm.employees`、`hrm.positions`、
`hrm.attendance_records` 的 `organization_id` 逐行等于 `tenant_id`，且代码已只读
`tenant_id`/`org_id`。另 `hrm.departments`/`employees`/`positions` 三列并存，且
`departments_company_id_fkey` 实际是 `FOREIGN KEY (org_id) REFERENCES hrm.companies(id)`，
约束名与列名不一致，不能按名字推断语义。

结论：不能把 `organization_id` 一概当作 `tenant_id` 重复列。必须先做**表级**比对
（`organization_id IS DISTINCT FROM tenant_id`、`IS DISTINCT FROM org_id`），
只在“逐行相等且代码不再读取”的表上删列；WMS 至少存在两种相反分布，必须逐表处理。

## 3. 计数口径

审计文档中的 `company_id 404 / org_id 382 / organization_id 250` 是生产克隆库的
**列数**，不是源码出现次数；本地库列数为 `15 / 32 / 140`，与生产克隆不可直接比较。

本门禁改用可静态复现的源码口径：`database/migrations/**/*.sql` 中
**新增列定义**（`CREATE TABLE` 内联列 + `ALTER TABLE ADD COLUMN`）的
`organization_id` 次数，按文件冻结在
`scripts/ci/org-field-baseline.json`。清理用的 `DROP COLUMN` / `RENAME COLUMN` /
`SELECT` 不计入，避免门禁误伤收敛动作。当前基线：

- 文件数：30
- 新增列定义次数：281

门禁规则：

1. 新迁移文件出现 `organization_id`：阻断；
2. 已有迁移文件次数上升：阻断；
3. 次数下降：通过，提示用 `--update-baseline` 核销；
4. 默认全量；pre-commit 用 `--changed-only` 只看暂存迁移。

命令：

```bash
node scripts/ci/check-org-field.mjs
node scripts/ci/check-org-field.mjs --changed-only
node scripts/ci/check-org-field.mjs --update-baseline
```

## 4. 清理顺序（按表比对后执行）

按“代码先改、数据后删、单模块回滚”的顺序执行，不跨模块一把梭：

1. **HRM（已完成 5 列）**：`departments`/`employees`/`positions`/`attendance_records`
   四表 `organization_id` 逐行等于 `tenant_id`，已删列；第三批
   `initialization_status` 同样逐行等于 `tenant_id` 且代码只读 `tenant_id`，已删列。
   `initialization_logs`/`companies` 仍保留（存在与 `tenant_id` 不同的行），待单独定性。
2. **WMS（完成前两表）**：`audit_logs` 已删 `organization_id`（等于 `org_id`）；
   `inbound_orders` 已删（等于 `tenant_id`，代码改读 `tenant_id`）。
   `warehouses`/`locations`/`inventory` 的 `organization_id` 是独立组织值，保留，
   先纠正 `org_id` 语义。
3. **AI / LIMS / MES**：canonical 迁移改为 `tenant_id` 建列；测试夹具同步。
4. **CRM / Finance**：只保留 `org_id` 与确有法人语义的 `company_id`，
   `organization_id` 不再新增。

每一步验收：该模块 `organization_id` 引用为 0、相关测试绿、迁移可回滚、
门禁基线下降并核销。

## 5. 明确未完成

- 首批 HRM 4 列、第二批 WMS 2 列、第三批 HRM 1 列已在迁移中删除（待生产窗口执行），
  其余存量未删除；
- 代码中 `organization_id` 仍有约 120 处，集中在 WMS/LIMS/MES/HRM setup；
- 本文件完成“口径定案 + 新增冻结 + 计数基线 + HRM 首批 + WMS 两表 + HRM setup 一表”，
  不等于三套字段已全部合并。
