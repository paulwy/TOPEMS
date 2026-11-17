# 零租户数据只读盘点与定性报告（2026-11-18）

> 范围：生产库 `topems_prod`，只读查询（仅 SELECT + 会话级临时表），未修改任何数据、未执行 DDL。
> 方法：扫描全部含 `tenant_id` 列的表，逐表统计 `count(*)`、`tenant_id IS NULL`、`tenant_id = '00000000-0000-0000-0000-000000000000'`，再结合 `created_at` 时间线、种子脚本与写入代码定性。
> 结论口径：**本报告只给处置建议，不回填、不清理**；真动数据需另开窗口并由用户确认。

## 1. 总量

| 指标 | 读数 |
|---|---|
| 含 `tenant_id` 列的表 | 982 |
| 有数据的表 | 43 |
| NULL 租户行 | 658 |
| 全零 UUID 租户行 | 789 |
| 存在零租户行的表 | 18 |
| 查询失败 | 0 |

零租户行集中在平台元数据、字典/菜单、审计与登录日志四类，业务表只有 `lims.lims_safety_tasks` 1 行。

## 2. 逐表读数与定性

| 表 | 总行 | NULL | 全零 | 定性 | 依据 | 处置建议 |
|---|---:|---:|---:|---|---|---|
| `ai.ai_models` | 4 | 0 | 4 | 平台语料 | DeepSeek Chat/Reasoner、Embedding、smoke-model；2026-10-26 初始化 | 保留（平台模型注册表） |
| `ai.ai_prompt_templates` | 3 | 0 | 3 | 平台语料 | 会议纪要、职位描述、SQL 优化；2026-10-26 | 保留（平台提示词模板） |
| `core.ai_faqs` | 15 | 0 | 15 | 平台语料 | 通用帮助 FAQ；2026-10-26 | 保留（帮助中心语料） |
| `public.core_dict_types` | 77 | 0 | 77 | 平台语料 | 系统字典类型；2026-11-05/06 | 保留；与 `database/seeds/default_dict_data.sql` 的 `…0001` 口径不一致，另行统一 |
| `public.core_dict_items` | 397 | 0 | 397 | 平台语料 | 系统字典项；2026-11-05/06 | 同上 |
| `public.core_menus` | 452 | 452 | 0 | 平台元数据 | 全部为 NULL，最后新增 2026-11-09 | 保留 NULL 语义（全局菜单定义） |
| `public.core_menu_groups` | 130 | 130 | 0 | 平台元数据 | 全部 NULL | 保留 |
| `public.core_roles` | 17 | 16 | 0 | 平台元数据 | 16 个内置角色（finance_manager 等），1 个租户角色 | 保留（内置角色） |
| `public.core_tenants` | 1 | 1 | 0 | 平台元数据 | default/默认租户自身行的 `tenant_id` 为 NULL | 保留（自引用） |
| `finance.core_finance_currencies` | 16 | 8 | 0 | 平台语料 | 8 个全局币种 + 8 个租户币种（CNY/USD/EUR/JPY/HKD/GBP/AUD/SGD） | 保留全局 8 行 |
| `finance.core_finance_report_line_map` | 48 | 48 | 0 | 平台语料 | 报表行映射，2026-11-09 初始化 | 保留 |
| `mobile.sync_policies` | 1 | 1 | 0 | 平台语料 | 默认同步策略，2026-11-02 | 保留 |
| `pm.project_type_configs` | 1 | 1 | 0 | 平台语料 | 默认项目类型配置，2026-10-26 | 保留 |
| `public.audit_logs` | 822 | 0 | 153 | **写入端兜底（仍在产生）** | 零租户行最大时间 2026-11-17 12:47，近 7 天 75 行；`get_tenant_id_from_claims` 对无租户 claims `unwrap_or_default()` | 修代码（见 §3），**不回填** |
| `public.core_login_logs` | 137 | 0 | 137 | **写入端兜底（仍在产生）** | 最大 2026-11-15 08:31，近 7 天 62 行；`record_login` 缺 `tenant_id` 时 `Uuid::nil()` + `scope_system()` | 修代码（见 §3），**不回填** |
| `finance.cqrs_projection_progress` | 2 | 0 | 2 | 基础设施 | 投影进度，非业务数据 | 按系统表处理，排除在租户收严清单外 |
| `scm.schema_defense_ledger` | 1 | 1 | 0 | 基础设施 | schema 防线台账，无 `created_at` | 系统表处理 |
| `lims.lims_safety_tasks` | 1 | 0 | 1 | **待定性（历史遗留）** | 单行业务数据，2026-11-11 写入，租户为全零 | **顺延**：查清归属前不收严 `lims` schema |

## 3. 写入端兜底是否仍在产生零租户行

### 3.1 审计 / 登录日志：是，仍在产生

- [access_log.rs](file:///Users/xingzhai/topems/svc/unified-core/src/modules/iam/user/access_log.rs#L421-L461)：`get_tenant_id_from_claims` 的 `unwrap_or_default()` 会把「超管无租户 / 服务事件」落成全零 UUID；生产 `audit_logs` 今日仍有新零租户行。
- [login_log_handlers.rs](file:///Users/xingzhai/topems/svc/unified-core/src/modules/audit/login_log_handlers.rs#L30-L58)：`record_login` 请求缺 `tenant_id` 时 `unwrap_or(Uuid::nil())`，并用 `scope_system()` 写入；近 7 天 62 行。
- 定性：这类行是**系统级事件**，不是丢失归属的业务数据；回填到任意租户都会造成错误归因。建议保留零租户语义，后续改为显式「系统事件」写入 + 系统通道读取，并按系统表处理策略。

### 3.2 BI 写路径：能力仍在，暂无实例

- `svc/analytics` 仍有 19 处 `Uuid::nil` 兜底，其中面向用户的创建路径 5 处：报表分享、行级权限、下钻路径/历史、对比结果、自助报表。
- 这些兜底只在 `TenantScope` 为 System（超管且无租户头）时生效；租户通道始终写入真实租户。
- 生产 `bi` 8 张表与 `analytics` 影子表均 **0 行**，未观测到零租户 BI 行。结论：**有产生能力，尚未产生数据**。
- 建议：用户可见的创建接口改回 `require_tenant()`（缺租户直接 400）；平台级语料（模板/看板）保留系统通道写入并显式标注。

## 4. 对决策 3 的影响

- `qms` / `mes` / `shared` 的首批候选表（`qms.qa_inspection_items`、`qms.qa_inspection_plans`、`qms.qa_sampling_plans` 等）**全部 0 行**，不存在回填阻塞，可直接收严。
- 需要顺延的表：`lims.lims_safety_tasks`（1 行零租户，归属未定）。
- 无 `tenant_id` 列的 6 张表（`*.schema_defense_ledger`、`mes.tenant_backfill_quarantine`、`qms.qa_apqp_approvals`、`qms.qa_inspection_plan_items`、`shared.audit_logs`）不适用租户谓词，按「系统表 / 后续补列」单列，不混入本批。

## 5. 处置清单（均需另行开窗或另行排期）

| 类别 | 表 | 建议 |
|---|---|---|
| 平台语料 | ai 3 表、core_dict 2 表、core_menus/menu_groups/roles/tenants、finance currencies/report_line_map、mobile.sync_policies、pm.project_type_configs | 保留零租户语义，补文档与策略注释；不做回填 |
| 写入端兜底 | public.audit_logs、public.core_login_logs | 先修代码（系统事件显式化），不回填历史行 |
| 基础设施 | finance.cqrs_projection_progress、scm/mes.schema_defense_ledger、mes.tenant_backfill_quarantine | 按系统表管理，排除在租户收严清单外 |
| 待定性 | lims.lims_safety_tasks | 查清单行归属后再决定回填或清理；`lims` 批次顺延 |
