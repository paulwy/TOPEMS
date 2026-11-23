# 公司级隔离统一改造清单（2026-11-23）

> 范围：`docs/database/rls-business-confirmation-2026-11-23.md` 所列 11 张表 + `finance.cqrs_events`。
> 目标模型：沿用 `erp` 已落地的公司级范式，不另立新范式。
> 本文件只是计划：不新增迁移文件、不改代码、不碰生产；迁移件待业务确认后再写。

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
- 空归属语义：`company_id IS NULL` = 集团级/平台级，只对母公司或平台通道可见；不作为普通公司的默认可见行。

## 1. 逐表改造清单

| # | 表 | 是否加 `company_id` | 类型 / 可空 / 默认 | 回填来源与判空 | 策略 | 涉及服务 / 请求路径 | 分档 | 类型 |
|---|---|---|---|---|---|---|---|---|
| 1 | `iam.tenant_permissions` | 是 | `uuid` / NULL / 无默认；NULL = 全集团通用授权 | 现网运行期不写该表，先不回填；若已有行，按租户唯一公司回填，多公司无法判定则置 NULL 并列入认领 | 模板 + 写策略：NULL 行仅平台通道可写 | 权限服务（仅切换数据库存储后） | 窗口后（启用数据库存储前） | 迁移 |
| 2 | `finance.cqrs_events` | 第一步否，第二步是 | 第一步不动结构；第二步 `tenant_id uuid NULL` + `company_id uuid NULL` | 第二步从 `metadata`/`payload` 提取租户与公司；判不出置 NULL（仅平台可见） | 第一步只做授权收口；第二步套模板，NULL 行仅平台可见 | 事件服务、后台任务（整表读写） | 第一步窗口前；第二步窗口后 | 第一步纯授权；第二步迁移 |
| 3 | `public.core_tenant_modules` | 是 | `uuid` / NULL / 无默认；NULL = 集团统一目录项 | 单公司租户回填该公司；多公司且无开通公司线索的置 NULL（集团级）并列入认领 | 模板；NULL 行仅母公司/平台可见、仅母公司可写 | 公司开通接口、模块列表接口 | 窗口前 | 迁移 |
| 4 | `integration.core_inter_module_sync` | 是 | `uuid` / NULL / 无默认；NULL = 集团级任务 | 按任务创建时的公司上下文回填；无留痕的置 NULL（集团级）并列入认领 | 模板；NULL 行仅母公司/平台可见 | 同步接口、后台同步任务 | 窗口前 | 迁移 |
| 5 | `public.core_migration_history` | 否（集团级例外） | — | — | 仅 `tenant_id` 匹配 + 平台通道（`app.rls_system=on`）可读；业务角色不可读 | 升级接口（平台方式访问） | 窗口后（补齐平台通道约束） | 迁移（策略） |
| 6 | `public.core_users` | 是（启用时） | `uuid` / NULL / 无默认；启用前收紧为 NOT NULL | 0 行，不回填 | 模板 | 无（已无服务读写） | 窗口后（若业务要求重新启用） | 迁移 |
| 7 | `public._archive_core_workflow_instances` | 是 | `uuid` / NULL / 无默认；NULL 行仅平台可见 | 从对应在办流程实例回填；源无公司归属或关联不上的置 NULL | 模板；NULL 行仅母公司/平台可见 | 无服务读写；仅归档/迁移脚本 | 窗口后（开放母公司查询前） | 迁移 |
| 8 | `public._archive_core_workflow_versions` | 是 | `uuid` / NULL / 无默认；NULL 行仅平台可见 | 从对应流程版本/实例回填；判不出置 NULL | 模板；NULL 行仅母公司/平台可见 | 无服务读写；仅归档/迁移脚本 | 窗口后（开放母公司查询前） | 迁移 |
| 9 | `public.monitor_settings` | 是 | `uuid` / NULL / 无默认；NULL = 平台默认值 | 现有租户行按唯一公司回填；多公司置 NULL 并复核（会成为平台默认）；原 NULL 保持 NULL | 读：平台行（NULL）对所有公司只读 + 公司行套模板；写：NULL 行仅平台通道，公司行本司 | 监控设置接口 | 窗口前 | 迁移 |
| 10 | `public.search_entity_projections` | 是 | `uuid` / 回填期 NULL，验收前收紧 NOT NULL | 从实体源表回填；判不出归属的副本**删除并重建**，不留 NULL | 模板（不含 NULL 分支） | 搜索同步任务、搜索查询接口 | 窗口前 | 迁移 |
| 11 | `public.system_settings` | 是 | `uuid` / NULL / 无默认；NULL = 平台级参数 | 同 `monitor_settings`：唯一公司回填，多公司置 NULL 复核 | 读：平台行只读 + 公司行套模板；写：NULL 行平台通道，公司行本司 | 系统设置接口 | 窗口前 | 迁移 |

### 1.1 `finance.cqrs_events` 两步走（单独展开）

- **窗口前（纯授权收口，不改结构）**
  - 撤销业务角色对该表的 SELECT/INSERT/UPDATE/DELETE；只保留事件服务角色与平台角色。
  - 以 `pg_roles` / 角色成员关系核对生效结果；接口侧声明「禁止业务直读」只是补充，不是边界。
  - 不产生迁移文件。
- **窗口后（迁移）**
  - 加 `tenant_id uuid NULL`、`company_id uuid NULL`，不设默认值。
  - 回填：写入端补租户/公司上下文列；历史行从 `metadata`/`payload` 提取，判不出置 NULL。
  - 策略：`tenant_id` 套模板；`company_id IS NULL` 行仅平台可见。
  - 完成后，业务查询若需要，再按 1.2 的业务选项单独开放。

## 2. 合并族配套改造（Q-G4 / Q-G5 定稿后执行）

| 项 | 内容 | 类型 |
|---|---|---|
| 父写动作白名单 | 新建动作白名单表（动作类型、允许的执行角色、是否留痕）；跨公司写策略使用 `app.actor_is_parent=on` + `app.visible_company_ids`，逐动作放行，不代记账 | 迁移 |
| 审计公司归属 | 合并报表表与动作留痕补 `actor_company_id uuid NULL`（记录操作人所属公司）；历史行判不出置 NULL 并标注 | 迁移 |
| 组织关系追加式 | `erp.company_relations` 撤销 UPDATE/DELETE 策略（或新增历史表），只允许新增与 `expiry_date` 到期关闭；禁止原地改写 | 迁移（策略） |
| 合并范围固化 | 合并报表保存生成时的 `scope_id`/范围快照，重算只新建版本，不回溯改写旧版 | 迁移（字段/约束） |
| Q-G3 唯一键 | 报表头（公司 + 范围 + 类型 + 期间 + 版本）与报表行（报表 + 行号）唯一键，配合 Q-G3 第 3/4 条 | 迁移 |

## 3. 分档汇总

### 3.1 窗口前必须先做（8 项 + 1 项条件）

| # | 项 | 类型 |
|---|---|---|
| 1 | `finance.cqrs_events` 授权收口（撤业务角色，保留事件服务/平台角色） | 纯授权 |
| 2 | `public.core_tenant_modules` 加列 + 公司级策略 | 迁移 |
| 3 | `integration.core_inter_module_sync` 加列 + 公司级策略 | 迁移 |
| 4 | `public.monitor_settings` 加列 + 平台行只读策略 | 迁移 |
| 5 | `public.system_settings` 加列 + 平台行只读策略 | 迁移 |
| 6 | `public.search_entity_projections` 加列 + 重建副本 + 公司级策略 | 迁移 |
| 7 | Q-G4 父写白名单 + 审计 `actor_company_id` | 迁移 |
| 8 | Q-G5 组织关系追加式 + 合并范围固化 | 迁移 |
| 条件 9 | `iam.tenant_permissions` 加列 + 主键修复 + 策略（仅当本窗口启用数据库存储） | 迁移 |

### 3.2 窗口后可补齐（迁移）

- `iam.tenant_permissions`：若不启用数据库存储，加列/主键/策略全部后置（启用前必须完成）。
- `finance.cqrs_events`：加 `tenant_id`/`company_id` 并回填。
- `public.core_users`：仅当业务要求重新启用时补列并收紧 NOT NULL。
- 两张归档表：仅当业务要求母公司在线查询时补列并开放入口。
- `public.core_migration_history`：平台通道策略约束（低风险，可随后补）。

## 4. 材料与清单自洽性自检

| 表 | 对外材料默认处置 | 本清单结论 | 一致 |
|---|---|---|---|
| `iam.tenant_permissions` | 加公司归属；保留集团级行 | 加 `company_id`（NULL=集团级）+ 策略；窗口后/启用前 | ✅ |
| `finance.cqrs_events` | 先授权收口；后续加租户/公司归属 | 两步走：窗口前授权、窗口后迁移 | ✅ |
| `core_tenant_modules` | 按公司开通；集团统一仅母公司 | 加 `company_id` + 模板 + NULL 仅母公司 | ✅ |
| `core_inter_module_sync` | 公司级任务；集团级仅母公司 | 加 `company_id` + 模板 + NULL 仅母公司 | ✅ |
| `core_migration_history` | 集团级例外，仅平台运维 | 不加列，策略限平台通道 | ✅ |
| `core_users` | 归档不启用；启用前补公司归属 | 加列列为启用前置；窗口后 | ✅ |
| `_archive_core_workflow_instances` | 补公司归属；默认不开放 | 加 `company_id`；窗口后开放前 | ✅ |
| `_archive_core_workflow_versions` | 同上 | 同上 | ✅ |
| `monitor_settings` | 平台默认 + 公司覆盖 | 加 `company_id`；NULL 平台行只读、公司行可覆盖 | ✅ |
| `search_entity_projections` | 补公司归属并重建副本；母公司默认可跨子公司搜索 | 加 `company_id` 并收紧 NOT NULL；模板 | ✅ |
| `system_settings` | 平台参数 + 公司覆盖 | 加 `company_id`；NULL 平台行只读、公司行可覆盖 | ✅ |

**措辞残留检查**

- 对外材料已删除「已有按公司隔离」「有公司列」等与实况不符的表述；现状统一写为「无公司归属列、只有租户级策略，属于待改造」。
- 对外材料不含迁移版本号、哈希、门禁读数。
- 可选选项均可在目标模型内表达：不存在「全平台共用」「公司完全自建且无归属」这类无法建模的分支。

## 5. 仍需业务拍板的问题（汇总）

1. 人员权限是否保留「全集团通用」授权行（默认保留）。
2. 内部事件流水是否需要按公司追溯并开放查询（默认不开放）。
3. 公司开通模块按公司还是集团统一（默认按公司）。
4. 模块同步任务是公司级还是集团级（默认公司级）。
5. 升级执行记录是否只给平台运维（默认是）。
6. 旧用户副本是否需要保留（默认归档）。
7. 两张归档表是否开放母公司查询（默认不开放）。
8. 监控阈值是否允许公司覆盖平台默认（默认允许）。
9. 母公司搜索默认是否跨子公司（默认跨子公司；选「按公司切换」需额外收紧策略）。
10. 系统参数是否允许公司覆盖平台值（默认允许）。
11. Q-G3 八条回执（默认视为同意；与「内部事件流水」无联动）。
12. Q-G4 父写动作范围（默认仅审批与下达）。
13. Q-G5 关系是否只追加不更正、历史是否追溯重述（默认只追加、不追溯）。
