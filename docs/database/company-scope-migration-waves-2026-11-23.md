# 公司级隔离迁移波次方案（5 张表，2026-11-23）

> 范围：`public.core_tenant_modules`、`integration.core_inter_module_sync`、`public.search_entity_projections`、`public.monitor_settings`、`public.system_settings`。
> 性质：方案文档。本轮不写迁移 SQL、不改代码、不碰生产；迁移件待业务确认与窗口排期后再写。
> 模板：沿用 `database/migrations/20261121235940_erp_consolidation_company_rls.sql` 的公司级范式，不另立新范式。

## 0. 与既有材料的关系

- 默认处置与 `docs/database/rls-company-scope-remediation-plan-2026-11-23.md` 一致；本文件只细化执行波次、版本号、列/回填/策略/断言。
- 一处语义收紧：`core_tenant_modules` 的集团目录行（`company_id IS NULL`）**租户内所有公司只读可见**（否则子公司无法看到集团开通的模块），写仍限母公司/平台；此前清单里「NULL 仅母公司可见」仅适用于同步任务，不适用于目录。
- 统一模型不变：读 = 本司 + 母公司可见清单；写 = 本公司；平台通道只用于平台行与运维，不用于业务请求。

## 1. 波次划分与顺序

### 1.1 波次总表

| 波次 | 表 | 版本号 | 批次内顺序 | 与其他波关系 | 窗口位置 |
|---|---|---|---|---|---|
| W12-A1 | `public.core_tenant_modules` | `20261123090000` | 第 1 | 必须先于 A2 | 主窗口 W1 之前 |
| W12-A2 | `integration.core_inter_module_sync` | `20261123100000` | 第 2 | 依赖 A1 的公司上下文 | 主窗口 W1 之前 |
| W12-B1 | `public.monitor_settings` | `20261123110000` | 第 3 | 可与 A 并行，建议 A 后 | 主窗口 W1 之前 |
| W12-B2 | `public.system_settings` | `20261123120000` | 第 4 | 依赖 B1 的同一套平台行策略 | 主窗口 W1 之前 |
| W13 | `public.search_entity_projections` | `20261123130000` | 第 5 | 必须在 A/B 之后 | 主窗口 W1 之前，独立批次 |

### 1.2 与 W1–W11 的衔接

- **新开支线波次 W12 / W13，不插入 W1–W11 的既有编号，但执行时间排在主窗口 W1 之前。**
- 理由：这 5 张表都是请求路径或在用配置表，若先做主窗口其它 DDL 再补公司作用域，窗口内的业务验证会带着「子公司可互看」的已知缺陷跑，验收结论不可用。
- W11 已是独立小波且可任意同窗口执行；W12/W13 不复用其编号，避免与已归档的演练证据混淆。
- W12-A 与 W12-B 技术上互不依赖，可在同一窗口分两批执行；W13 必须单独批次，理由是重建搜索副本耗时且要观察同步结果。

### 1.3 为什么这样排序

- **`core_tenant_modules` 先于 `core_inter_module_sync`**：同步任务在写入前会校验模块是否开通；先把模块开通落到公司维度，任务的公司归属才有稳定来源。反过来会出现「任务已带公司、模块仍是租户级」的半状态。
- **`core_inter_module_sync` 紧跟其后且请求路径可达**：创建/重试/历史查询都是在线 handler，加列与代码必须在同一发布列车；策略一旦生效，没有公司上下文的请求会被拒绝，必须先完成 handler 改造再开流量。
- **`monitor_settings` 先于 `system_settings`**：两者结构相同（平台默认行 + 公司覆盖行），但监控阈值被告警评估器直接读取，影响面更小，先跑通策略与平台行只读，再复制到系统参数。
- **`search_entity_projections` 放最后**：它是派生副本，重建要以「源表已能按公司过滤 + 写入端已带 company_id」为前提；提前做会生成一批无归属副本，之后还要二次重建。且重建是全表重写，单独批次便于观察行数与延迟。
- **版本号也无法倒序**：`apply-forward` 按版本号顺序执行，09/10/11/12/13 的间隔让「前一版失败即停」的语义自然成立。

## 2. 版本号与文件名

| 版本号 | 迁移文件 | 回滚文件 |
|---|---|---|
| `20261123090000` | `database/migrations/20261123090000_core_tenant_modules_company_scope.sql` | `database/rollback/20261123090000_core_tenant_modules_company_scope.rollback.sql` |
| `20261123100000` | `database/migrations/20261123100000_core_inter_module_sync_company_scope.sql` | `database/rollback/20261123100000_core_inter_module_sync_company_scope.rollback.sql` |
| `20261123110000` | `database/migrations/20261123110000_monitor_settings_company_scope.sql` | `database/rollback/20261123110000_monitor_settings_company_scope.rollback.sql` |
| `20261123120000` | `database/migrations/20261123120000_system_settings_company_scope.sql` | `database/rollback/20261123120000_system_settings_company_scope.rollback.sql` |
| `20261123130000` | `database/migrations/20261123130000_search_entity_projections_company_scope.sql` | `database/rollback/20261123130000_search_entity_projections_company_scope.rollback.sql` |

说明：仓库规则是 `YYYYMMDDHHMMSS_slug.sql`，按字典序执行；已占用到 `20261122160000`，`20261123*` 目前无文件。09/10/11/12/13 每档留 1 小时，便于插入热修（如 `20261123093000`）而不打乱顺序。

## 3. 列定义

| 表 | 列 | 类型 | 可空 | 默认 | 索引 | 外键/引用 |
|---|---|---|---|---|---|---|
| `core_tenant_modules` | `company_id` | `uuid` | 是 | 无 | `(tenant_id, company_id) WHERE company_id IS NOT NULL`；另建 `(tenant_id, module_code) WHERE company_id IS NULL` 与 `(tenant_id, company_id, module_code) WHERE company_id IS NOT NULL` 两个部分唯一索引 | `(tenant_id, company_id) → hrm.companies(tenant_id, id)` |
| `core_inter_module_sync` | `company_id` | `uuid` | 是 | 无 | `(tenant_id, company_id, created_at DESC) WHERE company_id IS NOT NULL`；`(tenant_id) WHERE company_id IS NULL` | 同上 |
| `monitor_settings` | `company_id` | `uuid` | 是 | 无 | `(tenant_id, company_id, key) WHERE deleted_at IS NULL AND company_id IS NOT NULL`；平台行唯一 `(key) WHERE tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL` | 同上（平台行 NULL 不校验） |
| `system_settings` | `company_id` | `uuid` | 是 | 无 | 同 `monitor_settings` | 同上 |
| `search_entity_projections` | `company_id` | `uuid` | 先可空、回填后 `SET NOT NULL` | 无 | `(tenant_id, company_id, entity_type)` | `(tenant_id, company_id) → hrm.companies(tenant_id, id)`；最终 NOT NULL |

**必须同步处理的既有约束**

- `core_tenant_modules` 现有 `UNIQUE (tenant_id, module_code)` 会挡住「同一模块、不同公司各一行」。迁移必须先删除该约束，改为上面两个部分唯一索引；否则按公司开通直接报 `23505`。
- `monitor_settings` / `system_settings` 没有 key 唯一约束，先补上述部分唯一索引，否则同一公司同一 key 可重复，读取结果不确定。
- `search_entity_projections` 主键 `(tenant_id, entity_type, entity_id)` 不动。

**NULL 语义与注释（写进 `COMMENT ON COLUMN`）**

- `core_tenant_modules.company_id`：`NULL = 集团级目录项，租户内所有公司只读继承；写仅母公司或平台通道`。
- `core_inter_module_sync.company_id`：`NULL = 集团级同步任务，仅母公司/平台可见；业务请求创建的任务必须带公司`。
- `monitor_settings.company_id`：`NULL = 平台默认阈值（tenant_id 也为 NULL），所有公司只读；公司行可覆盖`。
- `system_settings.company_id`：`NULL = 平台级参数（tenant_id 也为 NULL），所有公司只读；公司行可覆盖`。
- `search_entity_projections.company_id`：`投影归属公司，NOT NULL；搜索按本司或母公司可见清单过滤`。

**约束表达**

- `monitor_settings` / `system_settings` 增加 `CHECK ((company_id IS NULL) = (tenant_id IS NULL))`（`NOT VALID` 后 `VALIDATE`），禁止「有租户、无公司」这种会意外变成全公司可见的行。
- `core_tenant_modules` 的 NULL 行允许 `tenant_id` 非空（集团目录属于租户），不加上面那条 CHECK。

## 4. 回填与判空

| 表 | 自动推断规则 | 不能推断时 | 是否阻断 |
|---|---|---|---|
| `core_tenant_modules` | 租户下只有 1 家公司 → 该公司；有明确开通公司痕迹 → 该公司 | 多公司且无痕迹 → 保留 `NULL`（集团目录，租户内只读），并输出待业务拆分清单 | 不阻断；但若业务选「按公司」，这些行需在验收前拆分 |
| `core_inter_module_sync` | `data->>'company_id'` 有效 → 该公司；`source_entity`/`source_id` 能关联到带公司的源单 → 源单公司；单公司租户 → 该公司 | 多公司且无痕迹 → 保留 `NULL`（集团级任务，仅母公司可见） | 不阻断；输出清单供业务认领 |
| `monitor_settings` | `tenant_id IS NULL` → 平台行（`company_id` 保持 NULL）；租户下只有 1 家公司 → 该公司 | 多公司租户的租户级行无法判定 | **阻断**：`RAISE EXCEPTION`，打印租户与 key 清单，事务回滚；不得把这些行改成 NULL（会从「某租户覆盖」扩大为「全公司可见」） |
| `system_settings` | 同上 | 同上 | **阻断**，理由同上 |
| `search_entity_projections` | 按 `entity_type` 回到源表取 `company_id`（源表已有公司列的部分） | 判不出的副本不保留 | **阻断**：回填后 `company_id IS NULL` 的行数必须为 0，否则 `RAISE EXCEPTION`；先重跑投影重建再重试迁移 |

- 回填全部在迁移事务内执行；任何阻断性断言失败即整体回滚，账本不落行。
- 非阻断的 NULL 行要在迁移输出里 `RAISE NOTICE` 计数（租户数、行数），供验收记录；不要静默。
- 回填完成后统一 `ANALYZE` 上述表，避免新索引上线后统计信息失真。

## 5. 策略模板

不需要新增辅助函数，直接复用 `erp.group_tenant_of`、`erp.current_company_id`、`erp.company_readable`、`erp.parent_visible_company_ids`（均为 schema 限定、`STABLE`）。跨 schema 调用是显式依赖，迁移头注释写明。

公共片段：

```sql
-- T: 租户边界
tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
-- S: 平台通道
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
-- P: 母公司视角
COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
```

### 5.1 `core_tenant_modules`

```sql
-- 读：集团目录（NULL，租户内只读） + 本司 + 母公司可见子公司
CREATE POLICY core_tenant_modules_company_select ON public.core_tenant_modules
FOR SELECT USING (
  T AND (
    S
    OR company_id IS NULL
    OR erp.company_readable(company_id)
  )
);

-- 写：本公司；集团目录仅母公司或平台
CREATE POLICY core_tenant_modules_company_insert ON public.core_tenant_modules
FOR INSERT WITH CHECK (
  T AND (
    (company_id IS NOT NULL AND company_id = erp.current_company_id())
    OR (company_id IS NULL AND (P OR S))
  )
);
-- UPDATE 同 INSERT 的 USING + WITH CHECK；DELETE 用同一 USING
```

### 5.2 `core_inter_module_sync`

```sql
-- 读：本司 + 母公司可见；集团级任务仅母公司/平台
CREATE POLICY core_inter_module_sync_company_select ON integration.core_inter_module_sync
FOR SELECT USING (
  T AND (
    S
    OR erp.company_readable(company_id)
    OR (company_id IS NULL AND P)
  )
);

-- 写：必须带公司；系统通道不豁免（后台任务也要带 app.company_id）
CREATE POLICY core_inter_module_sync_company_insert ON integration.core_inter_module_sync
FOR INSERT WITH CHECK (
  T AND company_id IS NOT NULL AND company_id = erp.current_company_id()
);
-- UPDATE/DELETE 同谓词；集团级任务由平台通道另行放行
```

### 5.3 `monitor_settings` / `system_settings`

```sql
-- 读：平台默认行所有公司只读 + 本司 + 母公司可见子公司
CREATE POLICY monitor_settings_company_select ON public.monitor_settings
FOR SELECT USING (
  (tenant_id IS NULL AND company_id IS NULL)
  OR (
    T AND (
      S
      OR erp.company_readable(company_id)
    )
  )
);

-- 写公司行：仅本公司
CREATE POLICY monitor_settings_company_insert ON public.monitor_settings
FOR INSERT WITH CHECK (
  T AND company_id IS NOT NULL AND company_id = erp.current_company_id()
);

-- 平台行写：仅平台通道（单独策略，避免和公司行混用）
CREATE POLICY monitor_settings_platform_write ON public.monitor_settings
FOR ALL USING (tenant_id IS NULL AND company_id IS NULL AND S)
WITH CHECK (tenant_id IS NULL AND company_id IS NULL AND S);
```

`system_settings` 同结构，替换表名与策略前缀。

### 5.4 `search_entity_projections`

```sql
CREATE POLICY search_entity_projections_company_select ON public.search_entity_projections
FOR SELECT USING (
  T AND (S OR erp.company_readable(company_id))
);

CREATE POLICY search_entity_projections_company_insert ON public.search_entity_projections
FOR INSERT WITH CHECK (
  T AND company_id IS NOT NULL AND company_id = erp.current_company_id()
);
-- UPDATE/DELETE 同谓词
```

所有表：`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`；删除旧策略前先枚举 `pg_policies`，不要只删已知策略名。

## 6. 服务侧影响（只列清单，不改代码）

| 表 | 服务 / handler | 必须改的点 | 失败策略 |
|---|---|---|---|
| `core_tenant_modules` | `svc/unified-core/src/modules/tenant/handlers.rs`：`seed_tenant_defaults`（约 515/521/539）、`list_tenant_modules`（959）、`activate_module`（1001）、`deactivate_module`（1053）、`get_tenant_stats`（3557） | 路由解析公司上下文并注入请求事务；INSERT/UPDATE 写 `company_id`；列表增加公司过滤；开通种子按「每公司一行」或「集团目录一行」二选一 | 无公司上下文的开通/停用直接 400；列表只返回集团目录 + 本司（+ 母公司可见） |
| `integration.core_inter_module_sync` | `svc/integration/src/handlers/sync.rs`：`create_task`（136）、`get_task`（207）、`update_status`（259）、`get_pending`（318）、`get_statistics`（364）、`retry_failed`（446）、三个 trigger（541/612/683）、`get_integration_sync_stats`（796）、`get_sync_history`（921） | 所有 INSERT/SELECT/UPDATE 增加 `company_id`；创建与重试要求公司上下文；trigger 从源单推导公司；统计按公司聚合 | 创建缺公司 → 422；后台任务缺公司 → 重试/死信，不按租户兜底；查询缺公司 → 400 |
| `public.monitor_settings` | `svc/monitor/src/modules/monitor/settings.rs`：`list_settings`（69）、`batch_update_settings`（151）、`get_setting`（215）、`update_setting`（281）、`delete_setting`（346）；`alert_evaluator.rs`（176 处读取） | 读写带 `company_id`；平台默认行只读；`DELETE` 的 `(tenant_id IS NULL OR tenant_id=$1)` 改为「平台行走平台通道、公司行仅本司」；告警评估按公司取阈值 | 无公司上下文 → 400；尝试改平台行 → 拒绝（策略 + handler 双重） |
| `public.system_settings` | `svc/erp/src/modules/settings.rs`：`get`（92）、按 key 读（123）、`create`（146）、`update`（172）、`delete`（203）、seed（249） | 现有 handler 走平台连接（平台行保持）；若业务选「公司可覆盖」，需新增租户/公司作用域的读写入口，否则只保留平台统一 | 平台入口不得受理业务租户请求；新增入口缺公司 → 400 |
| `public.search_entity_projections` | `svc/search/src/projection.rs`：重建/删除（58）、写入（77）、计数（225）；`svc/search/src/handlers.rs`：`search_handler`（303）、`suggestions_handler`（534） | 投影写入带 `company_id`；重建任务按源表公司过滤；查询按本司 + 母公司可见清单；计数按公司 | 无公司上下文 → 400；重建中任一行判不出公司 → 整批失败并告警，不写入 NULL |

统一要求：请求事务必须同时带 `app.tenant_id`、`app.company_id`；母公司跨公司读必须显式 `app.actor_is_parent=on` + `app.visible_company_ids`，不能靠 handler 拼 SQL 绕过策略。

## 7. 断言与回滚

### 7.1 每步断言

| 阶段 | 前置断言 | 后置断言 |
|---|---|---|
| W12-A1 | 无 `company_id` 列；`core_tenant_modules` 仅 1 条租户级策略；旧唯一约束存在；多公司租户行数已统计 | 列/索引/外键存在；旧唯一约束已删除；两个部分唯一索引存在；策略 4 条（select/insert/update/delete）；RLS `ENABLE+FORCE`；NULL 行计数已输出 |
| W12-A2 | 同上前置；`data`/`source_*` 可解析率已统计 | 列/索引/外键存在；策略 4 条；无「有公司但不在本公司」的写入；NULL 任务计数已输出 |
| W12-B1 | 无列；多公司租户的租户级行数为 0（否则预检就失败） | 列/FK/CHECK 已校验；平台行唯一索引与公司行唯一索引存在；策略 5 条（含平台写）；平台行 `tenant_id/company_id` 均为 NULL |
| W12-B2 | 同 B1 | 同 B1（表名替换） |
| W13 | 投影表无 `company_id`；源表公司列可用；重建任务已就绪 | 列 NOT NULL；FK/索引存在；`company_id IS NULL` 行数为 0；投影行数与源表可检索行数一致；策略 3 条 |

阻断规则：前置/postcheck 任一不满足 → `RAISE EXCEPTION`，不写账本；B1/B2 遇到多公司租户的租户级行直接失败，不做「改成平台行」的自动处置。

### 7.2 回滚行为

- 顺序：先回滚服务（停止写 `company_id`），再跑回滚 SQL；否则新写入的行会丢公司归属。
- 回滚 SQL：删策略 → 删索引/约束 → `DROP COLUMN company_id`（search 表先 `DROP NOT NULL` 再删列）。
- 有数据保护：回滚脚本开头统计 `company_id IS NOT NULL` 的行数；非 0 时要求显式 `SET app.allow_scope_rollback='on'`，否则 `RAISE EXCEPTION` 并打印计数，不静默删归属。
- 平台行（monitor/system）：回滚前断言不存在 `tenant_id IS NULL AND company_id IS NOT NULL` 的异常行；存在即失败。
- 回滚后恢复原有租户级策略（按迁移前 `pg_policies` 快照重建），并重新 `VALIDATE` 旧唯一约束（`core_tenant_modules`）。

### 7.3 隔离库演练

5 张表都要演练，统一用独立库 `topems_drill_company_scope_20261123`（从 `topems_test` 模板创建，演练后 `DROP`）：

1. 造 3 家公司：母公司 P、子公司 A、子公司 B，同租户。
2. 按波次顺序执行正向迁移，记录每步账本与断言结果。
3. 用非超户、无 `BYPASSRLS` 的 `topems_app` 角色跑可见性矩阵（见 §9.3）。
4. 制造一条「多公司租户级 monitor 行」，验证 B1 预检会阻断。
5. 逐波执行回滚，验证有 `company_id` 行时回滚明确失败，清理后成功。
6. 演练库 `DROP`，不保留。

## 8. 门禁登记

### 8.1 `database/migration_manifest.yaml`

每条按既有字段登记：`version`、`file`、`status: to_apply`、`effect`、`destructive_scan`、`note`。

- `effect` 写清：加列/回填/替换唯一约束/策略改造，以及「窗口前支线 W12/W13」。
- `destructive_scan` 写清：删除旧唯一约束、建部分唯一索引、`DROP COLUMN` 仅在回滚件；迁移内无 DELETE/TRUNCATE。
- `note` 写清顺序依赖：A1 → A2；B1 → B2；W13 必须在 A/B 之后且需先完成投影重建。
- 5 条版本按 09/10/11/12/13 顺序排，`status` 均为 `to_apply`，不得提前写 `applied`。

### 8.2 `database/migration_drift_assertions.json`

每张表至少 4 条：

1. `columns`：`company_id` 存在，`is_nullable` 符合预期（search 最终 `NO`，其余 `YES`）。
2. `constraints`：外键 `fk_<table>_company` 存在；monitor/system 的 CHECK 已 `convalidated`。
3. `policies`：`pg_policies` 中该表公司级策略数量与名称（select/insert/update/delete，monitor/system 另加 platform_write）。
4. `data_rows`：search 的 `company_id IS NULL` 行数为 0；monitor/system 的 `tenant_id IS NULL AND company_id IS NOT NULL` 行数为 0；tenant_modules/inter_module_sync 的 NULL 行数只做记录、不设 0。
5. `indexes`（可选）：部分唯一索引存在（`pg_indexes` 按名匹配）。

`source` 填对应版本号，`source_tokens` 用迁移文件里的稳定 token（列名、约束名），保持现有断言风格。

### 8.3 `database/checksums.txt`

- 追加 5 个迁移文件 + 5 个回滚文件的 `sha256`，按文件路径排序；不要手工改已有行。
- 用仓库现有生成方式重算（若脚本存在），避免格式漂移。

### 8.4 夹具库锚点

- `scripts/migration/build-drift-gate-db.sh` 当前把夹具重放到 `20261122160000`；本方案落地后需前移到 `20261123130000`。
- 重建方式不变：基线快照 `20261117235500` + `apply-forward` 前向重放（新增 5 条），授权在重放后执行。
- 预期读数（表数、账本行数）以重建现场实测为准，写入脚本头部与 `docs/quality/environment-provisioning.md` §11；**不得照抄旧读数或估数**。
- 门禁验证：不设任何覆盖变量，走 `.env` 默认 `topems_gate`，要求 `PASS` 且 5 条新断言真正执行（无 NOTE 跳过）。

## 9. 验收标准

### 9.1 迁移与门禁

- 5 条迁移账本 `success=t`，顺序与版本号一致；回滚件可独立执行。
- `migration_manifest.yaml`、`migration_drift_assertions.json`、`checksums.txt` 均含 5 条且校验通过。
- 夹具库重建到 `20261123130000`，`ledger-ddl-drift` 默认路径 PASS，5 条新断言非跳过。

### 9.2 结构

- 5 张表均有 `company_id`；search 为 NOT NULL，其余可空语义符合 §3。
- 外键、部分唯一索引、CHECK 均已校验；`core_tenant_modules` 旧 `(tenant_id, module_code)` 唯一约束已不存在。
- 5 张表均 `ENABLE + FORCE ROW LEVEL SECURITY`，策略数量符合 §5。

### 9.3 RLS 隔离实证（参照 `gis_ro_smoke` 只读角色口径）

用非超户、无 `BYPASSRLS` 的 `topems_app` 角色（禁止用 superuser / BYPASSRLS，否则判定恒真），造 P/A/B 三家公司，逐表断言：

| 场景 | 期望 |
|---|---|
| `tenant=P租户, company=A` | 只看到 A 的行 + 允许的集团目录/平台默认行；B 的行数为 0 |
| `tenant=P租户, company=B` | 只看到 B 的行；A 的行数为 0 |
| `tenant=P租户, company=P, actor_is_parent=on, visible=[A,B]` | 能看到 A+B；未声明母公司视角时只看到 P |
| 未设置 `app.company_id` | 公司行数为 0（fail-closed）；写入被拒绝 |
| 以 A 的身份写 B 的行 | 0 行受影响 / 被策略拒绝 |
| 以 A 的身份改平台默认行（monitor/system） | 被拒绝；只读查询可见 |
| 集团目录行（tenant_modules，company_id NULL） | A/B 可读，A/B 不可写；P 可写 |
| 集团级同步任务（NULL） | A/B 不可见；P 可见 |
| 搜索 | 只返回本司；P 开母公司视角后可跨 A/B；无公司上下文返回 0 行 |

同时记录每张表的 `EXPLAIN`，确认走 `(tenant_id, company_id)` 索引，不做全表扫。

### 9.4 业务验收

- 5 张表的请求路径在缺公司上下文时均 fail-closed（400/403），无静默全租户返回。
- 监控告警按公司阈值生效；系统参数平台值与公司覆盖值读取正确。
- 搜索副本重建后条数与源数据一致，跨公司不可见。

## 10. 需要拍板的点

1. **`core_tenant_modules` 的默认粒度**：按公司（本方案默认）还是集团统一目录。若按公司，现有 `(tenant_id, module_code)` 唯一约束必须替换；若集团统一，可不加列，但需确认子公司是否只读继承。
2. **`system_settings` 是否要有公司覆盖入口**：现有 handler 全部是平台级；业务若选「公司可覆盖」，需要新增租户/公司作用域 API，属于代码新增，不只是加列。
3. **`monitor_settings` 平台默认值是否允许公司覆盖**：影响 B1 的策略分支与告警评估器的取值顺序。
4. **`core_inter_module_sync` 集团级任务是否保留**：保留则 NULL 语义与「仅母公司可见」成立；不保留则回填时所有任务必须有公司，无法判定的行要阻断而非置 NULL。
5. **搜索母公司默认范围**：默认跨子公司（本方案），若业务要求逐公司切换，需要额外的收紧策略。
6. **W12/W13 是否整体排在主窗口之前**：本方案按「窗口前支线」排；若排期不允许，至少 W12-A/A2 不能后置，否则请求路径会带着租户级可见性进入窗口验证。
7. **搜索重建的停机/双写窗口**：全表重建期间是否接受搜索短暂降级，或需要双写切换。
8. **`core_tenant_modules` 多公司租户的存量行**：保留为集团目录（租户内只读）是否可接受，还是必须先由业务拆分到各公司。
