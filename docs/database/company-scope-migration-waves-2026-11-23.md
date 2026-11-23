# 公司级隔离迁移波次方案（5 张表，2026-11-23）

> 范围：`public.core_tenant_modules`、`integration.core_inter_module_sync`、`public.search_entity_projections`、`public.monitor_settings`、`public.system_settings`。
> 性质：方案文档。本轮不写迁移 SQL、不改代码、不碰生产。
> 模板：沿用 `database/migrations/20261121235940_erp_consolidation_company_rls.sql` 的公司级范式。
> 统一模型：「集团母版 + 公司差异」——`company_id IS NULL` = 集团/平台母版行，租户内所有公司只读；公司行只表达差异、可写。

## 0. 本轮裁决与影响

| # | 裁决 | 对方案的影响 |
|---|---|---|
| 1 | W12-A1 → A2 → B1 → B2 → W13 全部排在主窗口之前，**串行**，不拆窗口后、不留降级路径 | 波次表改为严格串行；删除「A/B 可并行」与所有窗口后补做项；回滚只用于故障处置，不作为排期降级 |
| 2 | `core_tenant_modules` 存量行全部视为集团目录（`company_id = NULL`），租户内公司只读；唯一约束拆两条部分唯一索引 | 不再二选一、不再拆分存量行；删除旧 `(tenant_id, module_code)` 唯一约束，改为「母版」+「公司」两条部分唯一索引 |
| 3 | `search_entity_projections` 双写零降级：老表服务、新表双写、全量比对、通过后下线 | W13 扩为三步（建新表 → 切换 → 下线旧表），新增双写、回填、比对、切换、监控等工作项 |
| 4 | 模块开通 = 集团母版 + 公司差异：母版定义可开通范围，公司行表达实际开通 | `core_tenant_modules` 的策略与种子逻辑按「母版目录 + 公司开通行」重写 |
| 5 | `monitor_settings`：平台行只读，公司可覆盖，业务写只落公司行；`override_policy` 三档分级 | 删除业务对平台行的写路径；平台行仅平台通道维护；`platform_only` 由 CHECK + 触发器双兜底 |
| 6 | `system_settings`：平台行只读 + 公司覆盖 + `override_policy` 分级，新增公司作用域 API，工作量计入 W12-B2 | B2 增加 API 与平台参数治理（运维权限、二次确认、审计） |
| 7 | `core_inter_module_sync`：保留集团级任务，`company_id IS NULL` 合法（仅母公司可见可发起） | 回填不再把无公司任务视为异常；策略保留 NULL 分支 |
| 8 | 母公司搜索默认跨子公司（限本租户），支持按公司过滤；子公司固定只见本司 | 搜索策略与查询接口增加母公司范围分支与可选公司过滤 |

其余边界不变：只改文档；迁移件待窗口排期后再写；生产 DDL 未执行。

## 1. 波次划分与顺序

### 1.1 波次总表（严格串行，全部在 W1 之前）

| 顺序 | 波次 | 表 | 版本号 | 与上一步关系 |
|---|---|---|---|---|
| 1 | W12-A1 | `public.core_tenant_modules` | `20261123090000` | 起点 |
| 2 | W12-A2 | `integration.core_inter_module_sync` | `20261123100000` | 依赖 A1 的母版/公司模型 |
| 3 | W12-B1 | `public.monitor_settings` | `20261123110000` | 依赖 A 已完成公司上下文改造 |
| 4 | W12-B2 | `public.system_settings` + 公司作用域 API | `20261123120000` | 复用 B1 的平台行策略与 API 形态 |
| 5 | W13-1a | 订单公司归属补列（`sales_orders`/`purchase_orders`）+ `search_entity_projections_v2` 建表 + 双写 | `20261123140000` / `20261123141000` / `20261123142000` | 依赖 A/B 的写入端公司上下文；已合入 main |
| 6 | W13-2 | 按业务清单回填 → 零 NULL → 影子读比对 → 搜索切换 | 待创建（不得复用 `140000`–`142000`） | 依赖全量比对零差异 + 业务归属清单与四条规则 |
| 7 | W13-3 | 下线旧搜索表 | 待创建（不得复用 `140000`–`142000`） | 依赖切换后观察通过 |

> 版本重编号：原方案 `20261123130000`（v2 建表）已由 W5-B215 `hrm.contracts` 占用，W13 第一段实际为 `140000`（`sales_orders.company_id`）、`141000`（`purchase_orders.company_id`）、`142000`（v2 建表 + 双写）。第二段尚未创建迁移，版本号按当前链尾顺延。执行口径以 `docs/database/window-execution-checklist-2026-11-21.md` §5C 为准。

### 1.2 与 W1–W11 的衔接

- 新开支线 W12/W13，不插入 W1–W11 编号，执行时间全部排在主窗口 W1 之前。
- 理由：5 张表都是请求路径或在用配置表；若先跑主窗口再补公司作用域，窗口内的验证会带着「子公司可互看」的已知缺陷，结论不可用。
- 串行执行，不设并行批次；每一步验收通过才进入下一步。

### 1.3 排序理由

- **A1 先于 A2**：同步任务写入前校验模块是否开通；母版/公司差异先落地，任务的公司归属才有稳定来源。
- **A2 后紧跟 B**：`core_inter_module_sync` 请求路径可达，策略生效后无公司上下文的请求会被拒绝，必须在同一发布列车完成 handler 改造；B 组复用同一套公司上下文注入。
- **B1 先于 B2**：两者结构相同（平台母版行 + 公司差异行），监控阈值影响面更小，先跑通平台行只读与公司覆盖，再复制到系统参数并新增公司作用域 API。
- **W13 最后且分三步**：搜索是派生副本，必须等源表公司过滤与写入端公司字段稳定；双写零降级要求老表持续服务，切换前必须完成全量比对，不能提前切读。

## 2. 版本号与文件名

| 版本号 | 迁移文件 | 回滚文件 |
|---|---|---|
| `20261123090000` | `database/migrations/20261123090000_core_tenant_modules_company_scope.sql` | `database/rollback/20261123090000_core_tenant_modules_company_scope.rollback.sql` |
| `20261123100000` | `database/migrations/20261123100000_core_inter_module_sync_company_scope.sql` | `database/rollback/20261123100000_core_inter_module_sync_company_scope.rollback.sql` |
| `20261123110000` | `database/migrations/20261123110000_monitor_settings_company_scope.sql` | `database/rollback/20261123110000_monitor_settings_company_scope.rollback.sql` |
| `20261123120000` | `database/migrations/20261123120000_system_settings_company_scope.sql` | `database/rollback/20261123120000_system_settings_company_scope.rollback.sql` |
| `20261123140000` | `database/migrations/20261123140000_erp_sales_orders_company_id.sql` | `database/rollback/20261123140000_erp_sales_orders_company_id.rollback.sql` |
| `20261123141000` | `database/migrations/20261123141000_erp_purchase_orders_company_id.sql` | `database/rollback/20261123141000_erp_purchase_orders_company_id.rollback.sql` |
| `20261123142000` | `database/migrations/20261123142000_search_projection_v2_company_scope.sql` | `database/rollback/20261123142000_search_projection_v2_company_scope.rollback.sql` |
| 待定 | 搜索切换（重命名/读切新表） | 待创建 |
| 待定 | 下线旧搜索表（legacy drop） | 待创建 |

按 `YYYYMMDDHHMMSS_slug.sql` 字典序执行；`20261123130000` 已被 W5-B215 占用，W13 第一段顺延到 `140000`–`142000`；第二段版本号须在当前链尾之后新建，不得复用 `140000`–`142000`。每档留 1 小时插槽，热修可插入中间档而不打乱顺序。

## 3. 列定义

| 表 | 列 | 类型 | 可空 | 默认 | 索引 | 外键/引用 |
|---|---|---|---|---|---|---|
| `core_tenant_modules` | `company_id` | `uuid` | 是（NULL = 集团母版目录） | 无 | 部分唯一索引两条（见下）+ `(tenant_id, company_id) WHERE company_id IS NOT NULL` | `(tenant_id, company_id) → hrm.companies(tenant_id, id)` |
| `core_inter_module_sync` | `company_id` | `uuid` | 是（NULL = 集团级任务） | 无 | `(tenant_id, company_id, created_at DESC) WHERE company_id IS NOT NULL`；`(tenant_id) WHERE company_id IS NULL` | 同上 |
| `monitor_settings` | `company_id`；`override_policy` | `uuid`；`varchar(32) NOT NULL DEFAULT 'platform_only'` | 是（NULL = 集团母版行；`tenant_id` 也为 NULL 时 = 平台默认行） | 无 | 母版/平台行唯一 `(COALESCE(tenant_id, 零UUID), key) WHERE company_id IS NULL AND deleted_at IS NULL`；公司行唯一 `(tenant_id, company_id, key) WHERE company_id IS NOT NULL AND deleted_at IS NULL` | 同上（平台行 NULL 不校验） |
| `system_settings` | `company_id`；`override_policy` | `uuid`；`varchar(32) NOT NULL DEFAULT 'platform_only'` | 是（NULL = 集团母版行；`tenant_id` 也为 NULL 时 = 平台参数行） | 无 | 同 `monitor_settings` | 同上 |
| `search_entity_projections_v2` | `company_id` | `uuid` | 否 | 无 | 主键 `(tenant_id, entity_type, entity_id)`；`(tenant_id, company_id, entity_type)` | `(tenant_id, company_id) → hrm.companies(tenant_id, id)` |

**唯一约束替换（`core_tenant_modules`）**

```sql
-- 删除旧约束
ALTER TABLE public.core_tenant_modules
  DROP CONSTRAINT IF EXISTS core_tenant_modules_tenant_id_module_code_key;

-- 集团母版：同一租户内同一 module_code 只能有一条 NULL 行
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_tenant_modules_master
  ON public.core_tenant_modules (tenant_id, module_code)
  WHERE company_id IS NULL;

-- 公司差异：同一租户、同一公司、同一 module_code 只能有一条
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_tenant_modules_company
  ON public.core_tenant_modules (tenant_id, company_id, module_code)
  WHERE company_id IS NOT NULL;
```

**MONITOR / SYSTEM 的唯一与约束**

- 补部分唯一索引（见上表），避免同一公司同一 `key` 重复；母版/平台行用 `COALESCE(tenant_id, 零UUID)` 让平台行（`tenant_id IS NULL`）也受唯一约束。
- 增加 `CHECK (company_id IS NULL OR tenant_id IS NOT NULL)`（`NOT VALID` 后 `VALIDATE`），允许母版行存在。
- 增加 `CHECK (override_policy IN ('platform_only','company_overridable','company_only'))` 与作用域配对 CHECK：`platform_only` 只能出现在非公司行，`company_only` 只能出现在公司行。
- `platform_only` 的键不允许存在公司行：行级 CHECK 管单行，跨行由 BEFORE 触发器（`trg_<table>_override_policy`）兜底，违反返回 `insufficient_privilege`（42501），失败关闭。

**取值顺序（三层，两张表统一）**

`本司行 > 集团母版行（tenant_id 非空、company_id NULL）> 平台默认行（tenant_id/company_id 均 NULL）`。
`override_policy` 三档：`platform_only`（平台锁定，公司不可覆盖）、`company_overridable`（公司可覆盖）、`company_only`（只对公司有意义）。

**NULL 语义（写进 `COMMENT ON COLUMN`）**

- `core_tenant_modules.company_id`：`NULL = 集团母版目录项，定义可开通范围；租户内公司只读；公司行表达实际开通`。
- `core_inter_module_sync.company_id`：`NULL = 集团级同步任务，仅母公司/平台可见可发起；公司行按公司归属`。
- `monitor_settings.company_id`：`NULL = 集团母版行（tenant_id 非空）或平台默认行（tenant_id 也为 NULL）；业务写只落公司行`。
- `system_settings.company_id`：`NULL = 集团母版行（tenant_id 非空）或平台参数行（tenant_id 也为 NULL）；公司行可覆盖`。
- `override_policy`：`platform_only=平台锁定公司不可覆盖；company_overridable=公司可覆盖；company_only=只对公司有意义`。
- `search_entity_projections_v2.company_id`：`投影归属公司，NOT NULL；母公司可按公司过滤，子公司固定本司`。

## 4. 回填与判空

| 表 | 处理规则 | 是否阻断 |
|---|---|---|
| `core_tenant_modules` | **存量行全部置 `company_id = NULL`**（视为集团母版）；不推断、不拆分；后续公司开通由业务在母版范围内新增公司行 | 不阻断 |
| `core_inter_module_sync` | 能解析公司（`data->>'company_id'`、源单关联、单公司租户）→ 回填；无公司痕迹 → 保持 `NULL`，作为合法集团级任务 | 不阻断；输出计数 |
| `monitor_settings` | 平台行（`tenant_id IS NULL`）保持 `company_id NULL` 且默认 `platform_only`（fail-closed，运维逐个放开）；存量租户级行**一律保留为集团母版行**（`company_id` 置 NULL），不推断、不拆分；既有公司行按母版策略归一 | 不阻断；平台/母版重复键仍前置断言 |
| `system_settings` | 同 `monitor_settings` | 不阻断；同上 |
| `search_entity_projections_v2` | 从源表按 `entity_type` 取公司；老表所有行都要进入回填范围 | **阻断**：新表出现 `company_id IS NULL` 或行数/校验和不一致即失败，切换不得进行 |

- 所有回填在迁移事务内执行；阻断性断言失败即整体回滚，账本不落行。
- 非阻断的 NULL 计数要 `RAISE NOTICE` 输出（租户数、行数），进入验收记录。
- 回填后 `ANALYZE` 相关表。

## 5. 策略模板

复用 `erp.group_tenant_of`、`erp.current_company_id`、`erp.company_readable`、`erp.parent_visible_company_ids`，不新增辅助函数。公共片段：

```sql
-- T 租户边界
tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
-- S 平台通道
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
-- P 母公司视角
COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
```

### 5.1 `core_tenant_modules`（母版 + 公司差异）

```sql
-- 读：母版目录租户内所有公司可见；公司行按本司 + 母公司可见
CREATE POLICY core_tenant_modules_company_select ON public.core_tenant_modules
FOR SELECT USING (
  T AND (S OR company_id IS NULL OR erp.company_readable(company_id))
);

-- 写：母版由母公司/平台维护；公司行仅本公司
CREATE POLICY core_tenant_modules_company_insert ON public.core_tenant_modules
FOR INSERT WITH CHECK (
  T AND (
    (company_id IS NULL AND (P OR S))
    OR (company_id IS NOT NULL AND company_id = erp.current_company_id())
  )
);
-- UPDATE 同 INSERT；DELETE 用同一谓词
```

### 5.2 `core_inter_module_sync`（集团级任务合法）

```sql
CREATE POLICY core_inter_module_sync_company_select ON integration.core_inter_module_sync
FOR SELECT USING (
  T AND (S OR erp.company_readable(company_id) OR (company_id IS NULL AND P))
);

CREATE POLICY core_inter_module_sync_company_insert ON integration.core_inter_module_sync
FOR INSERT WITH CHECK (
  T AND (
    (company_id IS NULL AND P)
    OR (company_id IS NOT NULL AND company_id = erp.current_company_id())
  )
);
-- UPDATE/DELETE 同谓词；系统通道按平台运维单独放行
```

### 5.3 `monitor_settings` / `system_settings`（平台行只读 + 公司覆盖）

```sql
-- 读：系统通道全可见；平台行所有公司只读；本集团母版行与公司行按本司/母公司可见
CREATE POLICY monitor_settings_company_select ON public.monitor_settings
FOR SELECT USING (
  S
  OR (tenant_id IS NULL AND company_id IS NULL)
  OR (T AND (company_id IS NULL OR erp.company_readable(company_id)))
);

-- 业务写：只落公司行
CREATE POLICY monitor_settings_company_insert ON public.monitor_settings
FOR INSERT WITH CHECK (
  T AND company_id IS NOT NULL AND company_id = erp.current_company_id()
);
-- UPDATE/DELETE 同谓词

-- 平台/母版行：只允许平台通道维护（不属于业务写路径）
CREATE POLICY monitor_settings_platform_maintain ON public.monitor_settings
FOR ALL USING (
  tenant_id IS NULL AND company_id IS NULL AND S
)
WITH CHECK (tenant_id IS NULL AND company_id IS NULL AND S);
```

`system_settings` 同结构，替换表名与策略前缀。业务侧按「本司行 > 集团母版行 > 平台默认行」取值；`platform_only` 的键写公司行由触发器拒绝（42501），服务层同样返回 403。

### 5.3.1 平台参数治理（B2 落地）

- **写权限**：平台参数写只授予平台运维角色（`is_superuser` 或 `admin:iam:write`），走平台通道（`app.rls_system='on'`）。
- **二次确认**：平台写请求必须携带 `x-platform-confirm`，单键写入值须等于该 `key`，批量写须为 `batch`；缺失或不符返回 400。
- **审计**：平台参数写入记录操作人、时间、旧值、新值与动作（create/update/delete/batch），落 `public.audit_logs`。
- **审批**：本轮不新造审批流；平台参数后续挂现有审批模块（在审批模块接入前，以二次确认 + 审计兜底）。
- **公司参数**：只落本司行，只写审计，不进入审批。

### 5.4 `search_entity_projections_v2`（母公司跨公司 + 公司过滤）

```sql
CREATE POLICY search_entity_projections_v2_company_select ON public.search_entity_projections_v2
FOR SELECT USING (
  T AND (S OR erp.company_readable(company_id))
);

CREATE POLICY search_entity_projections_v2_company_insert ON public.search_entity_projections_v2
FOR INSERT WITH CHECK (
  T AND company_id IS NOT NULL AND company_id = erp.current_company_id()
);
-- UPDATE/DELETE 同谓词
```

母公司跨子公司由 `company_readable` 提供；按公司过滤是查询参数，不改变策略边界。子公司只能命中自己（`visible_company_ids` 为空）。

所有表：`ENABLE + FORCE ROW LEVEL SECURITY`；删旧策略前先枚举 `pg_policies`。

## 6. 服务侧影响（只列清单）

| 表 | 服务 / handler | 必须改的点 | 失败策略 |
|---|---|---|---|
| `core_tenant_modules` | `svc/unified-core/src/modules/tenant/handlers.rs`：`seed_tenant_defaults`（约 515/521/539）、`list_tenant_modules`（939）、`activate_module`（972）、`deactivate_module`（1028）、`get_tenant_stats`（1426/3557 附近） | 种子写母版行（`company_id=NULL`）；开通/停用写公司行；列表返回母版 + 本公司（+ 母公司可见） | 缺公司上下文时开通/停用 400；列表只返回母版 |
| `integration.core_inter_module_sync` | `svc/integration/src/handlers/sync.rs`：`create_task`（136）、`get_task`（207）、`update_status`（259）、`get_pending`（318）、`get_statistics`（364）、`retry_failed`（446）、三个 trigger（541/612/683）、`get_integration_sync_stats`（796）、`get_sync_history`（921） | 公司级任务写 `company_id`；集团级任务由母公司/平台发起；查询与统计加公司过滤 | 缺公司且非母公司 → 422；后台任务缺公司 → 重试/死信 |
| `public.monitor_settings` | `svc/monitor/src/modules/monitor/settings.rs`：`list_settings`（69）、`batch_update_settings`（151）、`get_setting`（215）、`update_setting`（281）、`delete_setting`（346）；`alert_evaluator.rs`（176） | 三层取值（本司 > 母版 > 平台）；业务写只落本司行；`platform_only` 键写公司行 403；公司写只审计不审批 | 缺公司 → 400；改平台行或 `platform_only` → 403 |
| `public.system_settings` | `svc/erp/src/modules/settings.rs`：平台 CRUD（92/123/146/172/203/249）；**新增**公司作用域读写 API | 平台入口保持平台通道，写权限收到平台运维角色，需 `x-platform-confirm` 二次确认并写审计；公司作用域 handler 只落本司行、只审计；待审批模块就绪后挂平台写审批 | 平台入口拒绝业务租户 / 缺确认 400；新 API 缺公司 → 400；`platform_only` → 403 |
| `public.search_entity_projections` | `svc/search/src/projection.rs`（删除/写入/计数）、`svc/search/src/handlers.rs`：`search_handler`（303）、`suggestions_handler`（534） | 双写期同时写老表与 v2；切换后只写 canonical；查询默认本公司、母公司可跨子公司并可带公司过滤；子公司固定本司 | 缺公司 → 400；双写任一失败 → 整条投影失败并告警，不静默 |

统一要求：请求事务必须带 `app.tenant_id` + `app.company_id`；母公司跨公司必须显式 `app.actor_is_parent=on` + `app.visible_company_ids`；handler 不得自行拼租户级 SQL 绕过策略。

## 7. W13 双写零降级步骤

### 7.1 目标

老表 `public.search_entity_projections` 持续服务；新表 `public.search_entity_projections_v2` 双写并回填；全量比对通过后一次性切换；切换后下线旧表。全程搜索可用，不接受降级或停写。

### 7.2 步骤

| 步骤 | 动作 | 完成判据 |
|---|---|---|
| 1 | `20261123142000` 建 v2（`company_id uuid 可空`、PK、公司维度索引、RLS 策略；NOT NULL 留待第二段收紧） | 表/约束/策略存在；v2 为空 |
| 2 | 发布双写版本：投影写入路径同时写老表与 v2；读仍走老表 | 双写成功率 100%，无新增错误日志 |
| 3 | 回填 v2：按源表与老表补齐历史行，推导 `company_id` | v2 行数 ≥ 老表；`company_id IS NULL` 为 0 |
| 4 | 全量比对：按 `tenant_id/company_id/entity_type` 行数、主键集合、字段校验和 | 差异为 0；差异报告留档 |
| 5 | 切换（版本待建，不得复用 `140000`–`142000`）：老表改名 `search_entity_projections_legacy`，v2 改名 `search_entity_projections`；同时收紧 `company_id NOT NULL`；代码停止双写、只写 canonical、读 canonical | 重命名成功；搜索延迟与错误率不高于切换前 |
| 6 | 观察期（同一预窗口批次内）：读 canonical，legacy 只读保留 | 无差异、无错误；确认不再回读 legacy |
| 7 | 下线（版本待建，不得复用 `140000`–`142000`）：drop `search_entity_projections_legacy` | 旧表不存在；无对象依赖 |

### 7.3 比对与失败处置

- 比对维度：总行数、按租户/公司/实体类型分组行数、主键差集、关键字段（`name/contact/status/remark/source_updated_at`）校验和。
- 任一差异非 0：停止切换，保留双写，修复后重跑回填与比对；不得带着差异切读。
- 双写失败：记录失败投影并告警；该条投影视为未完成，下一轮重试；不允许只写一侧后继续。
- 切换失败：重命名在同一事务内，失败自动回退；代码仍指向 canonical。
- 下线前必须确认无视图/查询依赖 legacy。

## 8. 断言与回滚

### 8.1 每步断言

| 阶段 | 前置 | 后置 |
|---|---|---|
| A1 | 无 `company_id`；旧唯一约束存在；存量行数已统计 | 列/FK/索引存在；旧约束已删；两条部分唯一索引存在；存量行 `company_id IS NULL` 计数 = 原行数；策略 4 条；RLS FORCE |
| A2 | 无 `company_id`；任务行数、可解析公司计数已统计 | 列/FK/索引存在；策略 4 条；公司级任务全部有公司，集团级任务计数已输出 |
| B1 | 平台行与母版行 `(tenant_id, key)` 重复为 0（不因多公司租户中止） | 列/FK/CHECK 已校验；两条部分唯一索引存在；策略 5 条；平台行 `tenant_id/company_id` 均 NULL 且 `platform_only`；母版行 `company_overridable`；`platform_only` 公司行冲突 = 0；触发器存在 |
| B2 | 同 B1；公司作用域 API 已就绪 | 同 B1（表名替换）+ 新 API 契约测试通过 + 平台写权限/二次确认/审计生效 |
| W13-1 | 老表可服务；源表公司列可用 | v2 结构/策略正确；v2 为空或已开始双写 |
| W13-2 | 回填完成；全量比对差异 0 | 重命名成功；canonical 结构正确；legacy 只读 |
| W13-3 | 切换后观察通过；无依赖对象 | legacy 已 drop |

阻断规则：前置/后置任一不满足 → `RAISE EXCEPTION`，不写账本；B1/B2 不再因多公司租户中止，存量租户级行统一保留为集团母版行。既有公司行若对应 `platform_only` 的母版/平台行，显式失败（不静默改策略）。

### 8.2 回滚行为

- 顺序：先回滚服务（停止写 `company_id` / 停止双写），再跑回滚 SQL。
- A/B 组回滚：删策略 → 删索引/约束 → `DROP COLUMN company_id`；恢复原租户级策略；`core_tenant_modules` 重建旧唯一约束（若存量已全为 NULL，可重建）。
- 有数据保护：回滚脚本统计 `company_id IS NOT NULL` 行数；非 0 时要求显式 `SET app.allow_scope_rollback='on'`，否则 `RAISE EXCEPTION` 并打印计数，不静默丢归属。
- 搜索：
  - 切换前回滚：drop v2、停止双写，老表继续服务。
  - 切换后回滚：将 canonical 改回 `search_entity_projections_v2`、legacy 改回 canonical，并回滚代码；仅在 legacy 未 drop 前有效。
  - 下线迁移执行后再回滚需从备份恢复旧表，属事故处置，不在常规路径。
- 所有回滚件不得删除业务行。

### 8.3 隔离库演练

统一用 `topems_drill_company_scope_20261123`（从 `topems_test` 模板创建，演练后 `DROP`）：

1. 造母公司 P、子公司 A/B（同租户）。
2. 按 A1→A2→B1→B2→W13 顺序执行，逐步断言。
3. 搜索双写：造增量写入、回填、比对、切换、下线全流程；人为制造 1 条差异验证阻断。
4. 可见性矩阵（§9.3）。
5. 逐波回滚验证；有公司行时回滚明确失败，清理后成功。

## 9. 门禁登记

### 9.1 `migration_manifest.yaml`

- 已登记 7 条条目，`status: to_apply`：W12 四条（09/10/11/12）+ W13 第一段三条（14/14.1/14.2，即 `20261123140000`/`141000`/`142000`）；W13 第二段待建后补登记。
- `effect` 写明：加列/回填/唯一索引替换/策略改造/新表/重命名/下线。
- `destructive_scan`：A1 删除旧唯一约束；W13-3 `DROP TABLE` 仅限 legacy；其余无 DELETE/TRUNCATE。
- `note` 写明串行依赖：A1→A2→B1→B2→W13-1→W13-2→W13-3；W13-2 以比对零差异为前提。

### 9.2 `migration_drift_assertions.json`

- A/B 四张表各至少 4 条：列可空性、FK、策略数量与名称、唯一索引；monitor/system 另加 CHECK 已校验与平台行计数为 0 的异常行。
- `core_tenant_modules` 额外断言旧唯一约束不存在、两条部分唯一索引存在、存量行 `company_id IS NULL`。
- W13：v2 列 NOT NULL、PK/索引/FK/策略存在；切换后 canonical 的 `company_id NOT NULL`；legacy 不存在。
- `source` 填对应版本号，`source_tokens` 用稳定 token。

### 9.3 `checksums.txt`

- 已追加 W12 四条 + W13 第一段三条（共 7 个迁移、7 个回滚文件）的 sha256，按路径排序；W13 第二段建好后按同样方式追加。

### 9.4 夹具库锚点

- `build-drift-gate-db.sh` 锚点从 `20261122160000` 前移到 `20261123142000`（当前链尾；第二段建好后再前移）；基线仍为 `20261117235500` + 前向重放。
- 预期读数以重建现场实测为准，写入脚本头部与 `environment-provisioning.md` §11，不照抄旧数。
- 默认路径（不改任何环境变量）跑 `ledger-ddl-drift`，要求 PASS 且 7 条新断言真正执行、无 NOTE 跳过。

## 10. 验收标准

### 10.1 迁移与门禁

- 7 条迁移（W12 四条 + W13 第一段三条）账本 `success=t`，顺序正确；回滚件可独立执行。W13 第二段迁移建好后另行验收。
- manifest / drift / checksums 各含已登记的 7 条并通过。
- 夹具库重建到 `20261123142000`，默认门禁 PASS，新断言非跳过。

### 10.2 结构

- 4 张表有 `company_id`；`core_tenant_modules` 两条部分唯一索引生效、旧约束不存在；monitor/system 平台行唯一索引与 CHECK 生效；v2 本段为 `company_id uuid 可空`，第二段切换时收紧为 NOT NULL。
- 所有表 `ENABLE + FORCE RLS`，策略数量符合 §5；legacy 已下线。

### 10.3 RLS 隔离实证（`gis_ro_smoke` 只读角色口径）

用非超户、无 `BYPASSRLS` 的 `topems_app`，P/A/B 三家公司逐表断言：

| 场景 | 期望 |
|---|---|
| `company=A` | 只看到 A 的行 + 母版/平台行；B 行数 0 |
| `company=B` | 只看到 B 的行；A 行数 0 |
| `company=P`，无母公司视角 | 只看到 P；A/B 不可见 |
| `company=P` + `actor_is_parent=on` + `visible=[A,B]` | 看到 P+A+B；可按公司过滤 |
| 未设 `app.company_id` | 公司行 0；写入被拒 |
| A 写 B 的行 | 0 行/被拒 |
| A 改平台母版行 | 被拒（读可见） |
| `core_tenant_modules` 母版行 | A/B 只读；P 可写；A/B 开通行可写 |
| `core_inter_module_sync` 集团任务 | A/B 不可见；P 可见可发起 |
| 搜索 | A 只搜本司；P 默认跨 A/B，可带公司过滤 |

记录 `EXPLAIN`，确认走 `(tenant_id, company_id)` 索引。

### 10.4 搜索双写验收

- 双写期：老表与 v2 差异 0；投影写入成功率 100%。
- 切换后：搜索结果与切换前逐条一致；延迟/错误率不高于基线；无降级。
- legacy 下线后：无对象依赖，回滚路径已归档说明（备份恢复）。

### 10.5 业务验收

- 5 张表缺公司上下文均 fail-closed（400/403）。
- 模块母版定义可开通范围、公司行表达实际开通；监控/系统参数平台值只读、公司覆盖生效。
- 搜索母公司可跨子公司并支持公司过滤，子公司只见本司。

## 11. 原「待拍板」项的裁决结果

| # | 原问题 | 裁决 | 依据 |
|---|---|---|---|
| 1 | `core_tenant_modules` 按公司还是集团 | 集团母版 + 公司差异；存量全部视为母版 | 裁决 2、4 |
| 2 | `system_settings` 是否新增公司覆盖 API | 是，计入 W12-B2 | 裁决 6 |
| 3 | `monitor_settings` 是否允许公司覆盖 | 是；平台行只读，写只落公司行 | 裁决 5 |
| 4 | `core_inter_module_sync` 是否保留集团级任务 | 保留；NULL 合法，仅母公司可见可发起 | 裁决 7 |
| 5 | 母公司搜索范围 | 默认跨子公司（限本租户），支持公司过滤 | 裁决 8 |
| 6 | W12/W13 是否整体前置 | 是，全部串行排在主窗口前 | 裁决 1 |
| 7 | 搜索重建是否接受降级 | 不接受；双写零降级 | 裁决 3 |
| 8 | `core_tenant_modules` 多公司存量行如何处理 | 全部视为集团母版，不推断、不阻断 | 裁决 2 |
