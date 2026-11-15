# mes 快照基线漂移归因与重刷（2026-11-14）

## 结论先说

- 旧基线 `fixtures/mes_compile_schema.sql`（2026-09-28）**不是从生产生成的**，而是从本地 dev 库
  `postgres://…@127.0.0.1:5432/topems` 生成的。dev 的 `mes` schema 里有 42 张 `mes.core_*` 影子表
  （合计 1129 行数据），生产一张都没有；旧基线把这批影子表连同 `mes._sqlx_migrations` 一起固化进了
  编译快照，这是本次漂移的最大单一来源（730/2292 行）。
- 自本日起，`fixtures/*` 唯一真源为生产 `topems_prod`（只读导出），基线日期 **2026-11-14**。
- 旧口径“2031 行漂移”无法用任何自然 diff 复现；本文件统一采用下方“统计口径”的数字，后续请勿再引用 2031。

## 统计口径（可复现）

```bash
# 1) 旧基线内容区（旧文件头部 12 行 + 空行）
git show e4c1f4ff4:fixtures/mes_compile_schema.sql | awk 'NR>12' > /tmp/base_body.sql

# 2) 用旧基线的同一套管道，从 prod 重新导出（只读）
ssh xingzhai@192.168.3.129 "PGOPTIONS='-c default_transaction_read_only=on' \
  /opt/homebrew/bin/pg_dump -d topems_prod --schema-only --schema=mes --exclude-table=mes._sqlx_migrations" \
  | grep -vE '^--$|^-- (Name|Schema|Owner|PostgreSQL database dump)|^\\|^CREATE SCHEMA|^CREATE TRIGGER' \
  | grep -vE '^CREATE EXTENSION|^ALTER .* OWNER|^ALTER DEFAULT PRIVILEGES|^GRANT|^REVOKE' > /tmp/prod_body.sql

# 3) 变更行数
diff -u /tmp/base_body.sql /tmp/prod_body.sql | grep -cE '^[+-][^+-]'    # 3884
```

其它 diff 形态实测值（仅用于说明 2031 复现不出，不作为口径）：

| 形态 | 行数 |
| --- | --- |
| `diff`（默认） | 5974 |
| `diff -u` 全部行 | 6332 |
| `diff -u` 变更行 | **3884** |
| `diff -u -w` 变更行 | 3884 |
| 行序无关（`sort` 后 diff） | 3013 |

按行归因合计 **2292**（与 3884 的差额来自空白行重对齐、以及“搬移行”在 diff 中被两侧各计一次）：

| 类别 | 行数 | 归因 | 代表样例 |
| --- | ---: | --- | --- |
| A 仅旧基线有 | 730 | **基线来源错误**：dev 独有的 `mes.core_*` 影子表 + `mes._sqlx_migrations` | `mes.core_materials`、`mes.core_inventory`、`mes._sqlx_migrations` |
| B 仅 prod 有 | 107 | **基线陈旧**：真实新增表未收录 | `dashboard_stats`、`financial_records`、`production_lines`、`schema_defense_ledger`、`shifts`、`supply_chain_orders`、`tenant_backfill_quarantine`、`work_calendars`、`workshops`、`public.schema_defense_ledger` |
| C 列顺序噪声 | 43 | 定义完全一致，仅 attnum 顺序不同 | `work_stations`（37/38 列整体位移）、`capacities`、`equipment` |
| D 真实结构变化 | 477 | 列增删/类型/默认值/NOT NULL | `tenant_id` 批量补列、`timestamp→timestamptz`（67 处）、`uuid_generate_v4→gen_random_uuid`（10 处）、`used_hours double→numeric(10,2)` |
| E 非表对象 | 904 | prod 新增 RLS 与策略、索引/约束/序列差异 | ENABLE/FORCE RLS 44→102（新增 58）、CREATE POLICY 46→57（新增 54）；索引 275→90（旧基线 196 条挂在影子表上） |
| G 函数/触发器 | 31 | 定义差异 | `update_updated_at_column`、`prevent_archived_dict_write` |

D 类按变更种类拆分：`timestamp→timestamptz` 67、`uuid_generate_v4→gen_random_uuid` 10、
`double→numeric` 1、其它 58（含 `integer→bigint`、`numeric→double`、`varchar` 宽/窄、`NOT NULL` 收放）。

## 旧生成器的 4 处缺陷（本次已修）

1. 头部来源行被 sed 解析成乱码（`…topems@postgres://…:postgres://…/…`），无法追溯来源；
2. 未记录生成命令、`pg_dump`/服务端版本、账本水位、产物 sha256，不可复现；
3. 未排除 `mes._sqlx_migrations`，把 dev 本地账本固化进快照；
4. 白名单里的 `schema_defense_ledger` 在旧基线中不存在（生成时该表尚未创建）。

## 新基线产物（2026-11-14）

| 文件 | 生成方式 | 规模 |
| --- | --- | --- |
| `fixtures/mes_compile_schema.sql` | `bash scripts/mes_guard.sh --sync-snapshot --snapshot-ssh xingzhai@192.168.3.129 --snapshot-db topems_prod --snapshot-pg-bin /opt/homebrew/bin` | 3026 行；内容区 sha256 `80d89008…709959`（整文件 sha256 随生成时间变化，仅内容区可作复现校验） |
| `fixtures/full_schema_contract.sql` | `ssh xingzhai@192.168.3.129 "PGOPTIONS='-c default_transaction_read_only=on' /opt/homebrew/bin/pg_dump -d topems_prod --schema-only --no-owner --no-privileges" \| grep -vE '^\\(un)?restrict'` | 70055 行（58 schema）；整文件 sha256 `8a7344eb…4e0f15` |
| `scripts/ci/data/prod_cols.psv` | `bash scripts/ci/refresh-prod-cols.sh`（默认已指向 192.168.3.129） | 17260 行；sha256 `d8c0adb6…30db7e8` |
| `scripts/ci/data/prod_cols.meta.json` | 同上，新增 `baseline_date`/`generator_cmd`/`server_version`/`client_version` | — |

版本信息：服务端 PostgreSQL 18.4 (Homebrew)，`pg_dump` 18.4 (Homebrew)，`psql` 18.4。
账本水位：`max(version)=20261114160000`，673 行（`public._sqlx_migrations`）。

`full_schema_contract.sql` 已剔除 PG18 的 `\restrict`/`\unrestrict` 元命令，保证 CI 的
`postgres:16` 客户端可直接导入；导入命令见 `.github/workflows/ci.yml` 的
`Import full schema snapshot`。

## 生成器的防跑错库护栏（fail-closed）

`--sync-snapshot` 在写文件前强制校验，任一不满足即退出且不产出文件：

- 目标库账本必须位于 `public._sqlx_migrations`；
- 目标库不得存在 `mes._sqlx_migrations`（dev 本地账本特征）；
- 库名必须具备 `*_prod` 特征（非生产需显式 `ALLOW_NONPROD_MES_SNAPSHOT=1`）；
- 账本 `max(version)`/行数必须可读且非 0。

## D 类中会影响代码正确性的子集

| 列 | 变化 | 代码侧假设 | 结论 |
| --- | --- | --- | --- |
| `mes.equipment.description` | `text` → `text NOT NULL` | [equipment.rs](../../svc/mes/src/modules/equipment.rs) 的 `CreateEquipmentRequest.description: Option<String>` 直绑该列 | **问题**：不传 description 的建机台请求会 23502 打 500。**证据**：prod `is_nullable=NO`，请求 DTO 为 `Option<String>` 且无默认值。**判定**：prod NOT NULL 即真相，不改列、不放宽、不默认空串。**修复归属**：mes 代码侧 400 校验（`None` 时返回 400「设备描述不能为空」），由 mes 线单独修，本窗口不动 `svc/mes` 代码 |
| `mes.capacities.used_hours` | `double precision` → `numeric(10,2)` | [capacity.rs](../../svc/mes/src/modules/capacity.rs) 全部 SELECT/RETURNING 均 `used_hours::float8`，按 `f64` 解码 | 安全（已显式 cast） |
| `mes.equipment_oee`（oee/availability 等 9 列） | `numeric` → `double precision` | [production_kanban.rs](../../svc/mes/src/modules/production_kanban.rs) 按 `f64` 解码；[anomaly_detection.rs](../../svc/mes/src/modules/anomaly_detection.rs) 先 `::numeric` 再 `BigDecimal` | 安全 |
| `mes.production_orders.quantity` / `completed_quantity` | `integer→bigint` / `numeric(12,2)→bigint` | [production_order.rs](../../svc/mes/src/modules/production_order.rs) 用 `quantity::float8` 后按 `f64`；[production_kanban.rs](../../svc/mes/src/modules/production_kanban.rs) 用 `i64` | 安全 |
| `mes.work_reports.approved_by` | `uuid` → `varchar(128)` | [work_report.rs](../../svc/mes/src/modules/work_report.rs) 按 `Option<String>` 收发 | 安全 |
| `mes.work_reports.report_no` | 收窄到 `varchar(64)` | 生成规则 `WR` + `%Y%m%d%H%M%S` = 16 字符 | 安全 |
| `mes.material_plans.tenant_id` | `text` → `uuid` | [material_plan.rs](../../svc/mes/src/modules/material_plan.rs) 查询侧 `tenant_id::text`，写入侧绑定 `Uuid` | 安全（prod 形状与代码一致，旧基线才是错的） |
| `mes.quality_inspections.quantity` 等 | `numeric(12,4) NOT NULL` → `numeric(12,2)` 可空 | 聚合读取，`BigDecimal`/`f64` | 安全（精度目标有损，登记） |
| `mes.process_flows.production_line` | `varchar(256)` → `varchar(128)` | 仅集成测试直接 INSERT | 低风险（登记） |
| `timestamp→timestamptz` 67 处 | 时区感知 | 代码统一 `DateTime<Utc>`，SQL 侧多处已 `::timestamptz` | 安全（登记） |
| `varchar` 收窄（`work_reports.*`、`status 50→32` 等） | 宽度收敛 | 写入值均为短枚举/编号 | 安全（登记） |

## 复现与再生成规则

1. 任何 mes schema / public 共享表结构变更后，必须重跑 `--sync-snapshot`，不得手改快照。
2. 重新生成时必须看到头部写入：基线日期、来源（凭据脱敏）、服务端/`pg_dump` 版本、账本水位、生成命令、内容区 sha256。
3. 生成后自证 B 类 10 张表均在文件中（`grep '^CREATE TABLE'`），且 `grep -c '^CREATE TABLE mes.core_'` 必须为 0。

---

# dev 账本追平记录（同一窗口）

## 起点与终点

| 指标 | 追平前 | 追平后 |
| --- | --- | --- |
| dev `_sqlx_migrations` 行数 | 572 | 679 |
| dev 账本 `max(version)` | 20261109101400 | 20261114170000 |
| 相对 prod（673 行 / max 20261114160000）缺失版本 | 103 | 0（见下方版本集合比对） |

`dev` 的 `mes._sqlx_migrations`（本地账本）**保留未动**，只是不进入快照。

## 执行方式

- 53 个 `> anchor` 的版本：`PGHOST=/tmp bash scripts/migration/apply-forward.sh --db topems`，
  每版本单事务、失败即停。
- 50 个 `<= anchor` 的历史版本：`--apply-deferred <version> --ticket DEV-CATCHUP-20261114`
  逐条补投（正式入口，不手改账本），成功 47 条；最后 3 个阻塞版本（`20261105100000`/
  `20261105230000`/`20261108091000`）在 dev 侧归一后以 `--ticket CHG-2026-1114` 补投成功。
- 全部执行日志：`/tmp/snap20261114/dev_forward_*.log`、`dev_orphans*.log`；
  账本逐行记录 version/description/checksum（原始文件 SHA-384）可在 `_sqlx_migrations` 复核。
- 追平前全库备份：`/tmp/snap20261114/dev_topems_20261114.dump`（custom 格式）。

## 为通过 fail-closed 断言做的 dev 侧归一（逐条可复核）

| 迁移 | dev 侧前置差异 | 处理 |
| --- | --- | --- |
| `20261104130000_p3_pk_5` | 守卫里 `'iam._sqlx_migrations'::regclass` 在表不存在时不短路，直接报错（prod 有该历史对象，dev 无） | 仅跳过该 1 个 iam 块执行，其余语句原样执行；账本按原始文件校验和登记 |
| `20261104140000` 等 | 同类 `'x.y'::regclass` 守卫未短路 | 临时副本把 `'x.y'::regclass` 改为 `to_regclass('x.y')`（仅守卫表达式，DDL 不动） |
| `20261105100000_p4_drop_shadow_tables_and_repoint_fks` | 迁移口径实测 dev 只有 **1** 条（`public.user_settings`），不是先前口算的 7；按 schema 放宽后共 21 条：9 条已在 `mobile.*`、7 条已在 `ehs.*`、5 条在 `public.*`（其中 4 条指向 public 旧父表）。dev 从未建立 `public.mobile_*` / `public.qa_ehs_drill_evaluations` 等影子子表 | 先删 `public.user_settings` 2 行孤儿（`user_id=nil`，2026-07-19 seed）并 `VALIDATE` 外键；用 DEV-TOPOLOGY 变体执行（仅把终态 `n<>18` 换成「dev 拓扑 21 条 + 父表必须为权威表」），账本按原始文件 SHA-384 登记；4 条 public QA EHS 外键已重指向 `ehs.*`，6 张 public 旧父表已删除 |
| `20261105230000_p4a4_drop_shadows_in_rebuild_chain` | 39 张目标中 dev 仍有 4 张：`public.report_templates`（0 行，2 入站 FK）、`public.report_schedules`（0 行，1 入站 FK）、`public.cqrs_projection_progress`（2 行）、`mes.schema_registry`（0 行，1 入站 FK）；`svc/` 的裸 `report_templates` 命中 `bi.report_templates`，pm 用 `pm.report_templates`，无 public 运行时引用 | 先删 `cqrs_projection_progress` 2 行 2026-08-05 空投影（`processed_count=0`）；首次 apply 因 `report_schedules` 同为目标表、其 FK 未被前置块解除，`report_templates` DROP 失败（迁移自身顺序依赖缺陷），补 `DROP CONSTRAINT report_schedules_template_id_fkey` 后 apply 通过；4 张表全部删除 |
| `20261108091000_iam_fix_employee_role_permission_codes` | dev `iam.roles` 为 7 列旧形状（`id/name(50)/description/created_at/tenant_id/deleted_at/status`），prod 为 12 列（含 `code/permissions/is_system/created_by/updated_by/updated_at`，无 `tenant_id`） | 重建到 prod 形状：补 6 列、`name` 放宽 255、`status` 回填 active 并 NOT NULL/default、9 行 code 按语义映射（普通用户→employee、部门经理→dept_manager、管理员→super_admin 等）、`permissions` 对齐 prod 同码角色、删 `tenant_id` 及索引、删 `roles_name_key`/`ck_roles_status_standard`、加 `UNIQUE(code)`、策略改为 prod 的 `iam_allow_all_roles USING (true)`；随后 apply 成功 |
| `20261112190000_w7_b4_ehs_rls_fail_closed` | 库内存在 `ehs.schema_defense_ledger.tenant_id`（prod 无）；3 张表 485 行 `tenant_id IS NULL` | 删除该游离列；485 行回填 nil UUID（`00000000-…-0000`，与 dev 主流数据一致）；策略数前置放宽，由迁移自身 apply+verify 收敛到 70 |
| `20261113100000_w7_b4_wms_rls_fail_closed_forward` | `wms.wms_master_data_refs` 多出 `tenant_id` + 1 条策略（prod 该表仅 `id/deleted_at`）；`wms.audit_logs=228`、`wms.inventory=70` 行 tenant 为 NULL | 删除游离列/策略/RLS；298 行回填 nil UUID |
| `20261114120000_w7_b4_six_schema_rls_fail_closed_forward` | 28 表有 41 条历史策略（prod 29）；`crm.audit_logs` 415 行 tenant 为 NULL；dev 缺 prod 历史的 23 张 true/true 残留表 | 删除 28 表历史策略后由迁移重建 29 条；415 行回填 nil UUID；残留表断言改为 WARNING（dev 无早期 RLS 批次，结构差异已在报告登记） |
| `mes.teams` | dev 多出 `ck_teams_status_standard`（prod 无此 CHECK） | `DROP CONSTRAINT ck_teams_status_standard`，与 prod 对齐 |

## mes.teams 与 prod 逐项对照（排序后逐行 diff = 完全一致）

| 项 | dev | prod | 结论 |
| --- | --- | --- | --- |
| 索引 | 5（`teams_pkey`、`idx_teams_status`、`idx_teams_team_code`、`idx_teams_work_station_id`、`teams_tenant_id_team_code_key`） | 5，同名同定义 | 一致 |
| 外键 | 1（`teams_work_station_id_fkey` → `mes.work_stations(id) ON DELETE SET NULL`） | 1，同定义 | 一致 |
| 列宽 | `team_code varchar(100)`、`team_name varchar(200)`、`team_type varchar(50)` | 同 | 一致 |
| NOT NULL 约束 | 7 条（`id/team_code/team_name/member_count/status/created_at/updated_at`） | 7 条 | 一致 |
| 复合唯一 | `UNIQUE NULLS NOT DISTINCT (tenant_id, team_code)` | 同 | 一致 |

唯一保留差异：`deleted_at` 的 attnum 顺序（列集合与定义完全一致，属顺序无关噪声）。

## 版本集合比对（比行数更强的追平证据）

```bash
ssh xingzhai@192.168.3.129 "/opt/homebrew/bin/psql -d topems_prod -X -A -t -c \
  \"select version from public._sqlx_migrations where success order by version;\"" > /tmp/prod_versions.txt
psql "postgres://air@localhost/topems?host=/tmp" -X -A -t -c \
  "select version from public._sqlx_migrations where success order by version;" > /tmp/dev_versions.txt
comm -23 /tmp/prod_versions.txt /tmp/dev_versions.txt   # prod - dev
comm -13 /tmp/prod_versions.txt /tmp/dev_versions.txt   # dev - prod
```

实测：`prod=673`、`dev=679`、交集 673。

| 集合差 | 结果 |
| --- | --- |
| `prod - dev` | **空** |
| `dev - prod` | 6 个：`20261107000019`、`20261107000020`、`20261109110100`、`20261112105000`、`20261114100000`、`20261114170000` |

这 6 个都是仓库里真实存在、prod 账本从未登记的版本（其中 `20261114170000` 晚于 prod 水位
`20261114160000`，其余 5 个是 prod 历史窗口未纳入的定向迁移）。先前预期的「`dev - prod` 仅
`20261114170000`」与实测不符，以本表为准。今天补投的 3 个版本均在 prod 账本中（故未出现在差集）。

### 6 个 dev-only 版本归因（2026-11-14 实测）

| version | 文件在 `origin/main` | prod 账本 | prod 结构是否已体现意图 | 归类 |
| --- | --- | --- | --- | --- |
| `20261107000019` | 命中 `20261107000019_drop_communication_email_templates.sql` | 未登记 | `communication.core_email_templates` 仍存在、0 行；无代码引用（manifest `present_empty`） | **A 已废弃**：删除非功能必需，manifest `disposition=obsolete`，需未来 `> max` 的新版本清理 |
| `20261107000020` | 命中 `..._align_finance_payments_created_by_and_pm_tags.sql` | 未登记 | `finance.core_finance_payments.created_by` 已是 `varchar(100)`；`pm.projects.tags` 已是 `jsonb` | **A 已废弃**：manifest `class=effect_already_present`，prod 上两条分支均为 no-op |
| `20261109110100` | 命中 `20261109110100_p3_report_line_map.sql` | 未登记 | `finance.core_finance_report_line_map` 已存在，带 `rls_tenant_isolation` + `rls_global_read` 策略 | **A 被替代**：由 `20261109110160`（`supersedes: 202611091100`，prod 账本已入账）承接 |
| `20261112105000` | 命中 `20261112105000_w7_b4_wms_rls_fail_closed.sql` | 未登记 | `wms` 39 条策略全为 `rls_tenant_isolation`、38 张表 FORCE RLS | **A 被替代**：由 `20261113100000`（manifest `replaces`，prod 账本已入账）承接 |
| `20261114100000` | 命中 `20261114100000_w7_b4_status_check_widen_business_states.sql` | 未登记 | `crm.billing_records`/`iam.users`/`analytics.report_execution_records` 上 **0 条** `ck_*_status_standard`，意图未体现 | **B（不可按原文投递）**：不是「待投」，是「投了必失败」，详见下方专节 |
| `20261114170000` | 命中 `20261114170000_drop_finance_dead_tables_shells.sql` | 未登记 | 6 张 finance 空壳表仍存在（manifest：prod 6/6 = 0 行） | **B 待投窗口**：manifest `status=to_apply`、`本任务只写不投`，属正常待投而非漏账 |

结论：**无 C 类**（6 个文件都在 `origin/main`，不存在「只在 dev 的实验残留」）。`20261114100000`
并不是「main 里已撤下」——它仍在 main 且状态为 `to_apply`，但 prod 侧缺少其前置 `ck_*_status_standard`
约束，需单独排窗口前先做存在性核查。

## dev 账本权宜说明（重要）

- `20261105100000` 在 dev 使用 **DEV-TOPOLOGY 变体**执行（终态断言改为 dev 拓扑 21 条 + 父表必须为
  权威表），但 `_sqlx_migrations` 仍按**原文件 SHA-384** 登记。因此 **dev 账本该行不代表原文件原文
  被原样执行**，不能作为「该迁移在真实拓扑下验证通过」的证据；prod 侧该版本为当年真实应用。
- 相关 SQL 与结果：`/tmp/p4_dev_variant.sql` + 账本插入语句已随本次追平记录留档；dev 侧实际效果为
  4 条 public QA EHS 外键重指向 `ehs.*`、6 张 public 旧父表删除。

## 待修项（主分支迁移缺陷，本次不改）

- `20261105230000_p4a4_drop_shadows_in_rebuild_chain.sql`：前置解绑块排除了「本身也是删除目标」的子表，
  导致 `public.report_schedules` 指向 `public.report_templates` 的入站外键未被解除；而 DROP 顺序中
  `report_templates` 先于 `report_schedules`，在两者同时存在的库上必然失败。dev 侧以手工补
  `DROP CONSTRAINT report_schedules_template_id_fkey` 绕过，**迁移文件本身需修**（调整解绑条件或 DROP
  顺序），属主分支问题，不在 dev 侧顺手改。

## `20261114100000` 定性：不可按原文投递（2026-11-14 定稿）

**结论：不是「待投」，是「投了必失败」。不得按原文应用，需重写，重写单独立项。**

三条硬理由（均已实测）：

1. **前置对象不存在**：迁移里的 18 条 `ck_*_status_standard` 清单来自 dev 漂移库；prod 对应表上
   实际 **0 条**该类约束（抽样 `crm.billing_records`、`iam.users`、`analytics.report_execution_records`
   的 `pg_constraint` 均为 0 行）。
2. **不会自愈**：迁移对「表/约束缺失」是 `RAISE EXCEPTION`（文件头安全约定第 1 条），不会静默跳过，
   在 prod 上第一步即整事务中止。
3. **值域仍窄于代码真实写入**：即便约束存在，迁移拟加的值域也覆盖不了代码字面量——
   `tms_carriers` 缺 `suspended`、`mes_erp_sync_logs` 缺 `pending`、`integration_sync_logs`
   的代码三值一个都不在目标集合、`report_execution_records` 缺 `completed`/`failed`、
   `finance_v60_alerts` 缺 `draft`/`pending`、`qa_alert_messages` 缺 `open`/`pending`；
   一旦投产，第一条真实业务写入就会 `23514 check_violation`。

处置：**不删文件、不改 SQL、保留旧回滚文件**；仅登记结论并把 manifest 状态改为
`superseded`（不改旧文件内容与 checksum）。重写由 `20261115000000_w7_b4_status_check_widen_forward.sql`
前向承接，论证与 dev 演练见
[status-check-widen-forward-20261115.md](status-check-widen-forward-20261115.md)。

**2026-11-15 更新：`20261114100000` 已标记为不可投递、被 `20261115000000` 取代，旧迁移不再进入任何窗口。**

`20261114170000` 仍按正常待投记录（manifest `to_apply`、只写不投），等窗口落刀。

## 收敛数字

| 对比 | 变更行 |
| --- | --- |
| 旧基线（2026-09-28，来源 dev）vs prod | **3884**（按行归因合计 2292） |
| 新基线（2026-11-14，来源 prod）vs prod 现导 | **0** |

复现：

```bash
# 0 漂移验证（剔除生成器追加的 5 行 preamble）
diff -u <(sed -n '20,$p' fixtures/mes_compile_schema.sql) /tmp/prod_now_body.sql | grep -cE '^[+-][^+-]'   # 0
node scripts/ci/check-decode-contract.mjs   # rc=0
node scripts/ci/check-baseline-integrity.mjs # PASS
```

## dev 迁移账本对齐生产（2026-11-15）

目的：dev 不再落后于 prod，后续 RLS / 数据演练有可靠基线。

| 侧 | 库 | 对齐前 | 对齐后 |
| --- | --- | --- | --- |
| dev | `127.0.0.1:5432/topems` | 679 行 / max `20261114170000` | **686 行 / max `20261115100000`** |
| prod | `topems_prod`（只读） | 681 行 / max `20261115100000` | 不变 |

补应用 7 笔（按版本升序，全部 `success=t`，前置校验每笔文件 SHA-384 与 prod 账本 checksum 一致）：

`20261114180000` erp consolidation group tenant rls → `20261114190000` forecast v53 mark synthetic →
`20261114200000` mes rls fail closed 22 → `20261114201000` add tenant id 8 tables →
`20261114202000` erp crm portal rls fail closed 8 → `20261115000000` status check widen forward →
`20261115100000` wms po snapshot backfill。

应用工具：`scripts/migration/apply-forward.sh`（非 prod 路径，不用 `--only`，anchor 逐段推进）。

对齐结论（可复核）：

- 账本：dev **686 行 / max `20261115100000`**，prod **681 行 / max `20261115100000`**，两边 max 一致；
  5 行差额即 dev 独有的 5 笔（`20261107000019`、`20261107000020`、`20261109110100`、`20261112105000`、`20261114100000`），
  不存在「prod 有 dev 无」的版本。
- 7 笔新版本在 dev 的 `checksum` 与 prod 逐笔相同（7/7）。
- 策略：本批涉及的 16 张表（8 张 M2b 表 + 16 张 MES 残留表，含重叠）逐表与 prod 一致（每表 1 条 `rls_tenant_isolation`、`force_rls=true`）。
- 黑盒（非超户 `topems_app`）：16/16 表租户读隔离通过（A 的 GUC 只读到 A 的行）、16/16 跨租户写被阻断；
  11 张 fail-closed 表无 GUC 读 0 行，5 张 fail-open 表见 K8 登记。
- 结构残留（与本批无关的 dev 代际差）见「本轮不处理的差异」一节。

三处 dev 侧前置处理（均只影响 dev，已留档 `/tmp/topems_dev_align/`）：

1. `erp.group_tenant_of` 属主为超级用户 `air`（dev 演练遗留），`CREATE OR REPLACE` 报
   `must be owner of function`；函数体与 prod 一致，仅属主不同，改属主为 `topems_app`。
2. `crm.core_crm_customers` / `erp.core_erp_suppliers` 在 dev 不存在（见下节待拆除登记），按 prod 3 列形状补建。
3. 6 张 erp/crm/portal 表上 10 条旧策略挡住 `20261114202000`（见下节），先删后应用。

## 待拆除登记：`crm.core_crm_customers` / `core_erp_suppliers`（已由 `20261115130000` 拆除）

prod 历史遗留死壳，dev 为对齐账本于 2026-11-15 临时补建；2026-11-15 已用前向迁移
`20261115130000_drop_shell_tables_crm_erp_2` 在 prod 与 dev 双库拆除，现双库均无此表。

- 形状：仅 3 列 `id uuid NOT NULL DEFAULT gen_random_uuid()` / `tenant_id uuid` / `deleted_at timestamptz`，两表均 0 行；
  prod 侧 `rls=true`、`force_rls=true`、每表 1 条 `rls_tenant_isolation`（fail-closed）；pkey `<table>_pkey`、
  `idx_<schema>_<table>_tenant_id` 各 1 条；prod 属主 `topems_prod`、`relacl` 为空。
- 引用面：prod 只读核查——外键 0、触发器 0、视图 0、函数文本引用 0，仅自身 pkey 与 `tenant_id` 索引；代码侧 0 引用。

### 账本外生效的删除：`20261107000027_drop_dead_tables_batch31.sql`

该文件在仓库中存在（移除 `erp.core_erp_suppliers`、`crm.core_crm_customers`、
`crm.customers_tenant_null_backup_20260919` 三张表），但**dev 与 prod 的 `_sqlx_migrations` 都没有该版本**。
事实与可见影响：

- dev：文件被绕过账本执行过——dev 上这三张表确实已不存在（本次对齐 M2a 前即为空），
  而账本 686 行中查无 `20261107000027`。因账本无记录，`sqlx migrate` 不会把它当已应用版本，
  也不会校验其 checksum；若在新环境重放该文件，对 dev 是 no-op（表已不在），
  但会在账本里首次登记该版本，造成「同名版本、不同环境有/无记录」的代际差。
- prod：**从未生效**——两表在 prod 一直存在（本次拆除前仍为 3 列 0 行），说明该文件只被局部环境用过。
- 风险定性：属于「账本外生效」（apply-forward 方案 B 的已知取舍在真实历史中的一次实例）。
  它不会造成数据错误，但会让「账本 = 真实结构」的推断在该版本上失效；本仓库因此不复用该版本号，
  改用 `20261115130000` 前向补丁显式承接，并在 manifest 登记。
- 处置：`20261115130000` 已带前置断言（存在 / 0 行 / 无外键 / 无视图 / 无触发器）与完整 rollback；
  投产后需刷新 `scripts/ci/data/prod_cols.psv`（否则 decode-contract 报「目录存在、库中已删」）。


## `20261114202000` 已知前提：只删 `*_allow_all_*`，不清理残留 `tenant_isolation_*`

该迁移对每张表只 `DROP POLICY IF EXISTS <schema>_allow_all_<table>` 再 `CREATE POLICY rls_tenant_isolation`，
**不处理其他命名残留的策略**。风险点：

- PostgreSQL 多条 permissive 策略是 **OR** 关系，只要旧的 fail-open 策略（`app.tenant_id` 为 NULL/空/nil 时放行、
  或 `tenant_id IS NULL` 放行）还在，新建的 fail-closed 策略会被短路，收紧等于没做。
- prod 因为窗口 C 先清理了旧策略，所以没撞上；**从旧备份恢复的环境、或先跑过早期 fail-open 策略的环境会撞上**，
  表现为 `policy "rls_tenant_isolation" for table "..." already exists` 或收紧后仍可见全量行。

dev 实测报错原文（事务整笔回滚，账本未记）：

```text
psql:database/migrations/20261114202000_erp_crm_portal_rls_fail_closed_8.sql:23: ERROR:  policy "rls_tenant_isolation" for table "meeting_rooms" already exists
NOTICE:  policy "erp_allow_all_meeting_rooms" for relation "erp.meeting_rooms" does not exist, skipping
```

dev 处置：人工前置删掉 6 张表上 10 条旧策略（4 条同名 `rls_tenant_isolation` + 4 条 `tenant_isolation_<table>` +
`tenant_isolation_expenses` + `tenant_isolation_portal_announcements`），再以 `anchor=20261114201000` 重跑，通过。
脚本与前置快照：`/tmp/topems_dev_align/dev_repair_drop_m2b_policies.sql`、`dev_pre_m2b_policies.txt`。

**人工前置清理操作顺序**（恢复/新环境投本笔前）：

```sql
-- 1) 逐表查残留策略；除目标名外全部视为残留
SELECT schemaname, tablename, policyname FROM pg_policies
 WHERE (schemaname||'.'||tablename) IN ('erp.meeting_rooms','erp.meeting_bookings','erp.vehicles',
       'erp.vehicle_requests','erp.expenses','crm.core_crm_customers','erp.core_erp_suppliers','portal.portal_announcements');
-- 2) 先快照再删；多条 permissive 会互相短路
DROP POLICY IF EXISTS <residual_name> ON <table>;
-- 3) 再投 20261114202000，确认每表最终只剩 1 条 rls_tenant_isolation
```

## `20261114200000` 已知前提：同样只删固定名单，不清同名旧策略

`20261114200000`（mes rls fail closed 22）与上一笔同源缺陷：每表只 `DROP POLICY IF EXISTS` 固定名单里的策略名
（`rls_tenant_isolation` 及个别 `tenant_isolation_*`），**不清理名单外的残留**。旧 fail-open 策略一残留，
多条 permissive 即 OR 短路，新 fail-closed 策略被短路，收紧名义生效、实际 fail-open。

dev 实测受影响 16 张表（各多 1 条 `tenant_isolation_<table>`）：

| 模块 | 表 |
| --- | --- |
| mes（11） | `mes.equipment`、`mes.equipment_inspection_records`、`mes.equipment_maintenance_records`、`mes.module_settings`、`mes.process_route_steps`、`mes.process_routes`、`mes.production_orders`、`mes.production_processes`、`mes.production_records`、`mes.quality_standards`、`mes.work_stations`（另 `mes.module_settings` 当时 `force_rls=false`） |
| tms（3） | `tms.tms_carriers`、`tms.tms_drivers`、`tms.tms_vehicles` |
| crm（1） | `crm.billing_records` |
| erp（1） | `erp.erp_master_data_refs` |

合计 16 张表、16 条残留策略（每表 1 条 `tenant_isolation_<table>`）。

清理动作与结果（2026-11-15，dev）：删 16 条残留 + `mes.module_settings` 置 FORCE RLS，
库内策略总数 **1344 → 1328**；清理后 16/16 表各 1 条 `rls_tenant_isolation`、`force_rls=true`，与 prod 逐表一致。
脚本：`/tmp/topems_dev_align/dev_repair_drop_mes_residual_policies.sql`；删前快照：`dev_16_policies_before.txt`。

非超户黑盒验证（`topems_app`：`rolsuper=false`、`rolbypassrls=false`，16 张表逐张、不抽样）：

| 断言 | 结果 |
| --- | --- |
| GUC=租户A 读（A、B 各插一行） | 16/16 只读到 A 的 1 行 |
| 跨租户写（GUC=A 写 tenant_id=B） | 16/16 被拒（`insufficient_privilege`） |
| 无 GUC 读 | 11 张 mes 表 = 0 行；5 张 fail-open 表 = 2 行（见下） |
| 探针清理 | 超户绕过 RLS 复核 `residual_total=0` |

5 张 fail-open 表：`crm.billing_records`、`erp.erp_master_data_refs`、`tms.tms_carriers`、`tms.tms_drivers`、
`tms.tms_vehicles`。其 prod 策略谓词本身即
`current_setting('app.tenant_id', true) IS NULL OR ='' OR = nil OR tenant_id IS NULL OR tenant_id = GUC`，
无 GUC 时放行全量，**dev 现与 prod 逐字同义**。这是 prod 侧待收紧缺口，不是本批引入的 dev 漂移，本轮保持与 prod 一致，
待另行排期收紧（收紧需与代码侧租户上下文改造同步，否则读侧会静默 0 行）。

## 本轮不处理的差异（dev 代际差，非本批引入）

以下差异与本批 7 笔迁移无关，仅登记，不在本轮修改：

1. `qms.qa_alert_messages` 的 `tenant_isolation_qa_alert_messages` 在同名策略上定义不同
   （prod 为复合 fail-open 表达式，dev 为旧式 fail-open）。两侧都 fail-open，语义等价，属既有环境漂移。
2. 列级漂移（按「表+列名」逐列比对 56 张表）：dev **缺 29 列 / 7 表**——`integration.integration_sync_logs`(7)、
   `mes.production_records`(9)、`finance.reconciliation_snapshots`(4)、`mes.equipment`(3)、
   `mes.production_orders`(3)、`erp.erp_master_data_refs`(2：`id`、`deleted_at`)、`mes.work_stations`(1)；
   dev **多 39 列 / 10 表**——`erp.expenses`(15)、`portal.portal_announcements`(10)、`erp.vehicle_requests`(5)、
   `ehs.health_records`(2)、`erp.meeting_bookings`(2) 等。典型：dev 的 `erp.meeting_rooms` 为
   `name varchar(200)` / `location varchar(200)` / `facilities jsonb`，prod 为 `varchar(255)` / `varchar(255)` / `text[]`。
3. `status` CHECK 约束：**prod 的 18 条在 dev 上逐条一致（18/18 命中）**；dev 另有 6 条更严的约束
   （`erp.company_relations`、`erp.elimination_rules`、`mes.process_route_steps`、`mes.process_routes`、
   `mes.production_processes`、`mes.quality_standards`），来自 dev 独有迁移 `20261114100000` 的扩张口径，属「dev 更严」，不影响对齐。

