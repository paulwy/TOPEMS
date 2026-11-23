# 公司级隔离统一改造清单（2026-11-23）

> 范围：`docs/database/rls-business-confirmation-2026-11-23.md` 所列 10 张表 + `finance.cqrs_events`（合计 11 张）。另：W14 订单两表（`erp.sales_orders`、`erp.purchase_orders`）的公司级策略已排期（`20261123150000`，计划已排、迁移件待建），见 §1 第 12–13 行。
> 目标模型：沿用 `erp` 已落地的公司级范式，并采用「集团母版 + 公司差异」：`company_id IS NULL` = 集团/平台母版行，租户内只读；公司行表达差异、可写。
> 本文件只是计划：不新增迁移文件、不改代码、不碰生产；迁移件待窗口排期后再写。

## 0. 唯一模板

```sql
-- 读：本司 + 母公司可见清单；平台通道全通；集团级行（company_id IS NULL）仅母公司/平台可见
tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
AND (
  COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
  OR company_id = erp.current_company_id()
  OR erp.company_readable(company_id)
  OR (
    company_id IS NULL
    AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
  )
)
```

- 写策略：`WITH CHECK` 复用同一谓词，并追加「`company_id IS NULL` 的行只允许平台通道写」。
- 辅助函数：**复用** `erp.group_tenant_of` / `erp.current_company_id` / `erp.company_readable` / `erp.parent_visible_company_ids`（均为 schema 限定、`STABLE`），不新增同名函数。
- 母公司识别：`app.actor_is_parent=on` + `app.visible_company_ids`（由 `erp.parent_visible_company_ids()` 读取）。
- 空归属语义分两类，策略不得混用：**目录 / 默认值类**（`core_tenant_modules`、`iam.tenant_permissions`）——`company_id IS NULL` 对租户内所有公司可读、仅平台通道可写；**任务 / 平台类**（`core_inter_module_sync`、`cqrs_events`、归档表）——`NULL` 行仅母公司 / 平台可见。照搬任务类模板会让子公司读不到通用授权，功能失效。

## 1. 逐表改造清单

| # | 表 | 是否加 `company_id` | 类型 / 可空 / 默认 | 回填来源与判空 | 策略 | 涉及服务 / 请求路径 | 分档 | 类型 |
|---|---|---|---|---|---|---|---|---|
| 1 | `iam.tenant_permissions` | 是 | `uuid` / NULL / 无默认；NULL = 全集团通用授权 | 现网运行期不写该表，先不回填；若已有行，按租户唯一公司回填，多公司无法判定则置 NULL 并列入认领 | 目录类 NULL：租户内公司可读通用授权并叠加；NULL 行仅平台通道可写；`WITH CHECK` 阻止公司行改回 NULL | 权限服务（仅切换数据库存储后） | 窗口后（启用数据库存储前） | 迁移 |
| 2 | `finance.cqrs_events` | 第一步否，第二步是 | 第一步不动结构；第二步 `tenant_id uuid NULL` + `company_id uuid NULL` | 第二步从 `metadata`/`payload` 提取租户与公司；判不出置 NULL（仅平台可见） | 四步：授权收口 → 补列回填 → 零越权验证 → 开放查询（顺序不可颠倒）；NULL 行仅平台可见 | 事件服务、后台任务（整表读写） | 第一步窗口前；后三步窗口后 | 第一步纯授权；第二步迁移 |
| 3 | `public.core_tenant_modules` | 是 | `uuid` / NULL / 无默认；NULL = 集团母版目录 | **存量行全部置 NULL**（视为母版），不推断、不拆分；公司开通由业务在母版范围内新增公司行 | 母版行租户内只读、仅母公司/平台可写；公司行按本司，母公司可见 | 公司开通接口、模块列表接口 | 窗口前（W12-A1） | 迁移 |
| 4 | `integration.core_inter_module_sync` | 是 | `uuid` / NULL / 无默认；NULL = 集团级任务（合法） | 能解析公司则回填；无痕迹保持 NULL，作为集团级任务，不阻断 | 公司行按本司 + 母公司可见；NULL 行仅母公司/平台可见可发起 | 同步接口、后台同步任务 | 窗口前（W12-A2） | 迁移 |
| 5 | `public.core_migration_history` | 否（集团级例外） | — | — | 仅 `tenant_id` 匹配 + 平台通道（`app.rls_system=on`）可读；业务角色不可读 | 升级接口（平台方式访问） | 窗口后（补齐平台通道约束） | 迁移（策略） |
| 6 | `public.core_users` | 是（启用时） | `uuid` / NULL / 无默认；启用前收紧为 NOT NULL | 0 行，不回填 | 模板 | 无（已无服务读写） | 窗口后（若业务要求重新启用） | 迁移 |
| 7 | `public._archive_core_workflow_instances` | 是 | `uuid` / NULL / 无默认；NULL 行仅平台可见 | 从对应在办流程实例回填；源无公司归属或关联不上的置 NULL | 模板；NULL 行仅母公司/平台可见 | 无服务读写；仅归档/迁移脚本 | 窗口后（开放母公司查询前） | 迁移 |
| 8 | `public._archive_core_workflow_versions` | 是 | `uuid` / NULL / 无默认；NULL 行仅平台可见 | 从对应流程版本/实例回填；判不出置 NULL | 模板；NULL 行仅母公司/平台可见 | 无服务读写；仅归档/迁移脚本 | 窗口后（开放母公司查询前） | 迁移 |
| 9 | `public.monitor_settings` | 是 | `uuid` / NULL / 无默认；NULL = 集团母版行（`tenant_id` 非空）或平台默认行（`tenant_id` 也为 NULL）；另增 `override_policy` 三档 | 平台行（`tenant_id IS NULL`）保持 NULL 且默认 `platform_only`（fail-closed）；存量租户级行一律保留为集团母版行，不推断、不阻断；母版行默认 `company_overridable` | 平台行所有公司只读；母版行本集团可读、可被公司覆盖；公司行按本司 + 母公司可见；业务写只落公司行；`platform_only` 由 CHECK + 触发器双兜底 | 监控设置接口、告警评估器 | 窗口前（W12-B1） | 迁移 |
| 10 | `public.search_entity_projections` | 是（新表 v2） | `uuid` / 本段可空、第二段切换时收紧为 NOT NULL / 无默认 | 我方 `--draft` 按四条规则与既定优先级起草，业务只复核兜底/例外行并签字；脚本只校验，不推断、不回落；兜底行必须等于租户根公司；比对零差异才切换 | 子公司仅本司；母公司可跨子公司（限本租户），支持公司过滤 | 搜索同步任务、搜索查询接口 | 窗口前（W13，三步） | 迁移 x3 + 双写 |
| 11 | `public.system_settings` | 是 | `uuid` / NULL / 无默认；NULL = 集团母版参数（`tenant_id` 非空）或平台参数行（`tenant_id` 也为 NULL）；另增 `override_policy` 三档 | 平台行保持 NULL 且默认 `platform_only`；存量租户级行一律保留为集团母版行，不推断、不阻断；母版行默认 `company_overridable` | 平台行只读；母版行可被公司覆盖；公司行按本司；**新增公司作用域 API**；平台写限平台运维 + 二次确认 + 审计（审批后续挂现有审批模块） | 系统设置接口 + 新增公司作用域 API | 窗口前（W12-B2） | 迁移 + 代码 |
| 12 | `erp.sales_orders` | 已加（W13-1a `20261123140000`；本波不改结构） | `uuid` / 可空 / 无默认；W13 第二段回填后零 NULL，本波不收紧 NOT NULL | W13 第二段按业务清单回填；W14 前置为 `company_id IS NULL` 行数 = 0 | 公司级：`tenant_id = erp.group_tenant_of(app.tenant_id)` AND（`company_id = erp.current_company_id()` OR `erp.company_readable(company_id)`）；`company_id IS NULL` 仅平台通道/母公司通道可读，子公司不可见；写只放本司 + 平台通道；替换 `rls_tenant_isolation` | erp 订单写入/查询 | 窗口前（W14，排在 W13 第二段之后；计划已排、迁移件待建） | 迁移（策略） |
| 13 | `erp.purchase_orders` | 已加（W13-1a `20261123141000`；本波不改结构） | 同 `erp.sales_orders` | 同 `erp.sales_orders` | 同 `erp.sales_orders`（替换 `rls_tenant_isolation`） | erp 采购写入/查询 | 窗口前（W14，排在 W13 第二段之后；计划已排、迁移件待建） | 迁移（策略） |

### 1.1 `finance.cqrs_events` 四步走（顺序不可颠倒）

- **第一步（窗口前，纯授权收口，不改结构）**
  - 撤销业务角色对该表的 SELECT/INSERT/UPDATE/DELETE；只保留事件服务角色与平台角色。
  - 以 `pg_roles` / 角色成员关系核对生效结果；接口侧声明「禁止业务直读」只是补充，不是边界。
  - 不产生迁移文件。
- **第二步（窗口后，补列与回填）**
  - 加 `tenant_id uuid NULL`、`company_id uuid NULL`，不设默认值。
  - 回填：写入端补租户/公司上下文列；历史行从 `metadata`/`payload` 提取，判不出置 NULL。
  - 策略：`tenant_id` 套模板；`company_id IS NULL` 行仅平台可见。
- **第三步（零越权验证）**
  - 用业务角色只读会话验证：跨租户 0 行、跨公司 0 行；平台通道按预期可见。
  - 验证未通过不得进入第四步。
- **第四步（开放查询）**
  - 仅在第三步通过后，再按 1.2 的业务选项单独开放业务查询。
  - 顺序不可颠倒：先开查询、后补列或后验收，即跨租户可读。
- **历史事件影响**：判不出归属的历史事件置 NULL，仅平台可见；业务查询会缺这段历史，需提前告知业务。

## 2. 合并族配套改造（Q-G4 / Q-G5 定稿后执行）

| 项 | 内容 | 类型 |
|---|---|---|
| 父写动作白名单 | 新建动作白名单表（动作类型、允许的执行角色、是否留痕）；跨公司写策略使用 `app.actor_is_parent=on` + `app.visible_company_ids`，逐动作放行，不代记账 | 迁移 |
| 审计公司归属 | 合并报表表与动作留痕补 `actor_company_id uuid NULL`（记录操作人所属公司）；历史行判不出置 NULL 并标注 | 迁移 |
| 组织关系追加式 | `erp.company_relations` 撤销 UPDATE/DELETE 策略（或新增历史表），只允许新增与 `expiry_date` 到期关闭；禁止原地改写 | 迁移（策略） |
| 合并范围固化 | 合并报表保存生成时的 `scope_id`/范围快照，重算只新建版本，不回溯改写旧版 | 迁移（字段/约束） |
| Q-G3 唯一键 | 报表头（公司 + 范围 + 类型 + 期间 + 版本）与报表行（报表 + 行号）唯一键，配合 Q-G3 第 3/4 条 | 迁移 |

## 3. 分档汇总

### 3.1 窗口前必须先做（10 项 + 1 项条件）

| # | 项 | 类型 |
|---|---|---|
| 1 | `finance.cqrs_events` 授权收口（撤业务角色，保留事件服务/平台角色） | 纯授权 |
| 2 | `public.core_tenant_modules` 加列 + 母版/公司策略 + 唯一索引替换 | 迁移 |
| 3 | `integration.core_inter_module_sync` 加列 + 公司级策略 | 迁移 |
| 4 | `public.monitor_settings` 加列 + 平台行只读策略 | 迁移 |
| 5 | `public.system_settings` 加列 + 平台行只读策略 + 新增公司作用域 API | 迁移 + 代码 |
| 6 | 搜索 v2 建表 + 双写 + 回填 + 全量比对 | 迁移 + 代码 |
| 7 | 搜索切换（老表服务 → 新表服务） | 迁移 |
| 8 | 搜索旧表下线 | 迁移 |
| 9 | Q-G4 父写白名单 + 审计 `actor_company_id`（已回执，待排期） | 迁移 |
| 10 | Q-G5 组织关系追加式 + 合并范围固化（已回执，待排期） | 迁移 |
| 条件 11 | `iam.tenant_permissions` 加列 + 主键修复 + 策略（仅当本窗口启用数据库存储） | 迁移 |

W12-A1 → A2 → B1 → B2 → W13 严格串行，全部排在主窗口之前，不拆窗口后、不留降级路径。

另：W14 订单两表公司级策略（`20261123150000`）排在 W13 第二段之后，状态为「计划已排、迁移件待建」，不计入上述 10 项。

### 3.2 窗口后可补齐（迁移）

- `iam.tenant_permissions`：若不启用数据库存储，加列/主键/策略全部后置（启用前必须完成）。
- `finance.cqrs_events`：加 `tenant_id`/`company_id` 并回填。
- `public.core_users`：仅当业务要求重新启用时补列并收紧 NOT NULL。
- 两张归档表：仅当业务要求母公司在线查询时补列并开放入口。
- `public.core_migration_history`：平台通道策略约束（低风险，可随后补）。

## 4. 材料与清单自洽性自检

| 表 | 对外材料业务回执 | 本清单结论 | 一致 |
|---|---|---|---|
| `iam.tenant_permissions` | A：保留全集团通用授权行 | 目录类 NULL：租户内公司可读并叠加，仅平台通道可写；窗口后/启用前 | ✅ |
| `finance.cqrs_events` | B：按公司隔离并可查询 | 四步：授权收口 → 补列回填 → 零越权验证 → 开放查询；查询在验收后 | ✅ |
| `core_tenant_modules` | 集团母版 + 公司差异；存量全部视为母版 | 加 `company_id`；母版租户内只读、公司行可写；唯一索引替换 | ✅ |
| `core_inter_module_sync` | 公司任务按公司；集团任务仅母公司 | 加 `company_id`；NULL 合法、仅母公司可见可发起 | ✅ |
| `core_migration_history` | 集团级例外，仅平台运维 | 不加列，策略限平台通道 | ✅ |
| `core_users` | 归档不启用；启用前补公司归属 | 加列列为启用前置；窗口后 | ✅ |
| `_archive_core_workflow_instances` | 补公司归属；默认不开放 | 加 `company_id`；窗口后开放前 | ✅ |
| `_archive_core_workflow_versions` | 同上 | 同上 | ✅ |
| `monitor_settings` | 平台母版只读 + 公司覆盖，写只落公司行 | 加 `company_id` + `override_policy`；存量租户行统一为集团母版（不推断、不阻断）；平台行只读、`platform_only` 拒绝公司行 | ✅ |
| `search_entity_projections` | 子公司仅本司；母公司可跨子公司并可过滤 | 新表 v2 `company_id` 本段可空、第二段切换收紧为 NOT NULL；双写零降级三步切换 | ✅ |
| `system_settings` | 平台母版只读 + 公司覆盖 + 公司作用域 API | 加 `company_id` + `override_policy`；存量租户行统一为集团母版（不推断、不阻断）；平台写限平台运维 + 二次确认 + 审计；新增公司作用域 API | ✅ |
| `erp.sales_orders` | 归属按 W13 四条规则（1A / 2B / 3B / 4A），子公司仅本司 | W14 换公司级策略；前置零 NULL；`company_id IS NULL` 仅平台/母公司通道可见 | ✅ |
| `erp.purchase_orders` | 同上 | 同上 | ✅ |

**措辞残留检查**

- 对外材料已删除「已有按公司隔离」「有公司列」等与实况不符的表述；现状统一写为「无公司归属列、只有租户级策略，属于待改造」。
- 对外材料不含迁移版本号、哈希、门禁读数。
- 可选选项均可在目标模型内表达：不存在「全平台共用」「公司完全自建且无归属」这类无法建模的分支。

## 5. 回执结果与未闭合项（汇总）

> 回执状态：业务已于 2026-11-23 完成回执（业务已确认，明细见 `rls-business-confirmation-2026-11-23.md` §8）；仍未闭合：CSV 业务复核签字、母公司待指定清单清零、例外行签字（规则优先级已既定）。

已裁决、不再作为问题的：公司开通模块粒度、模块同步任务粒度、监控阈值覆盖、系统参数覆盖与 API、母公司搜索范围、W12/W13 排期、搜索是否降级、`core_tenant_modules` 存量行处置（见波次方案 §11）。

已回执（2026-11-23）：

1. 人员权限：A（保留全集团通用授权行）。
2. 内部事件流水：B（按公司隔离并可查询）。
3. 升级执行记录：A（仅平台运维）。
4. 旧用户副本：A（归档保留、不启用）。
5. 两张归档表：A（都不开放母公司查询）。
6. Q-G3：八条全部同意。
7. Q-G4：A（仅审批与下达）。
8. Q-G5：问题 1 A；问题 2 A（只追加、不追溯）。

未闭合（不阻断 W12 与 W13 第一段）：

1. W13 CSV 业务复核签字：我方已可 `--draft` 起草，业务只须复核兜底与例外行、修改少数行并签字。
2. 母公司待指定清单清零：仅 0 个或多个根的租户需要业务指定主办公司，其余自动解析。
3. 例外行签字：业务把兜底行改为非根公司时，须填 `exception_note` 并在例外清单上签字。
