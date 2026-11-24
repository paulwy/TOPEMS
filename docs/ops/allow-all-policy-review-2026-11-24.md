# Allow-all 策略豁免/隔离口径评审（2026-11-24）

## 1. 范围与方法

生产库 `topems_prod` 快照中 `pg_policies.qual='true'` 的策略共 **37 条**（角色均为 `{public}`，多数 `cmd=ALL`，少数 `SELECT`）。逐条对照三方证据：

1. **代码基准**：`database/rls_policy_expected.json`（迁移链生成）中该表的策略口径（全局只读 / 系统通道 / 租户隔离 / 有意全放行）；
2. **源码依赖**：运行时 `.rs`（排除 `**/tests/`）全限定 SQL 引用；
3. **表用途**：业务实体 / 目录模板 / 日志审计 / 配置偏好 / 聚合指标。

> 本台账只给口径建议与待复核项，**不在本地对生产库改策略**；策略变更需生产窗口 + 产品/安全确认。

## 2. 档 1：基准有意全局，豁免保持（2 条）

代码基准明确保留全放行，不视为缺陷：

| 策略表 | 基准口径 | 处置建议 |
|---|---|---|
| `erp.core_erp_materials` | 基准 `erp_allow_all_core_erp_materials` ALL = true | 保持全放行（主数据物料目录，全局参考） |
| `gis.track_positions` | 基准 `rls_enabled=false` + allow-all=true | 保持豁免（轨迹点位，设计上不按租户 RLS） |

## 3. 档 2：基准已收紧、生产漂移，应按基准改回（5 条）

基准策略已收紧为系统通道 / 租户隔离 / 全局只读，但生产仍挂 `qual=true` 全放行，属**策略漂移**，应在窗口按基准策略订正：

| 生产表 | 生产现状 | 基准目标口径 | 漂移点 |
|---|---|---|---|
| `iam.roles` | ALL = true | `rls_global_read` SELECT=true（全局只读）+ `rls_system_write`（系统通道写） | 写侧被放开，应收紧为系统通道 |
| `core.core_tenant_plugins` | ALL = true | `rls_system_only`（仅系统通道） | 非系统通道读写被放开 |
| `mobile.oa_announcement_reads` | ALL = true | `rls_tenant_isolation`（租户隔离） | 缺租户谓词 |
| `pdm.pdm_master_data_refs` | SELECT = true | `rls_tenant_isolation`（租户隔离） | 读侧缺租户谓词 |
| `portal.user_preferences` | ALL = true | `rls_system_only`（仅系统通道） | 非系统通道读写被放开 |

> 订正方式：以基准 `rls_policy_expected.json` 中同名表策略为准，DROP 生产 `*_allow_all_*` 策略、重建基准策略；变更前在预发演练并核对应用系统通道注入是否在位。

### 3.1 订正路径核对（2026-11-25）

逐条比对迁移链，档 2 五条在链上**均已有对应严格化 forward 迁移**，策略文本与基准 JSON 一致、回滚齐全；生产 `qual=true` 漂移根因为账本滞后（水位 `20261119000002`，下列脚本未重放），正常订正 = 追平账本重放既有迁移，**无需新增链上迁移**。

| 生产表 | 基准目标口径 | 链上既有迁移 | 兜底补丁（账本不可重放时窗口直改） |
|---|---|---|---|
| `iam.roles` | `rls_global_read` SELECT(true) + `rls_system_write` ALL | `20261119161000_zero_path_retained_tables_policy_fix.sql` | `scripts/ops/rls-tier2-drift-fix-2026-11-25.sql` |
| `core.core_tenant_plugins` | `rls_system_only` ALL | `20261119161000_zero_path_retained_tables_policy_fix.sql` | 同上 |
| `portal.user_preferences` | `rls_system_only` ALL | `20261119161000_zero_path_retained_tables_policy_fix.sql` | 同上 |
| `mobile.oa_announcement_reads` | `rls_tenant_isolation` ALL | `20261119151000_mobile_oa_announcement_reads_tenant_rls.sql` | 同上 |
| `pdm.pdm_master_data_refs` | `rls_tenant_isolation` ALL | `20261119150000_pdm_master_data_refs_rls_strict_forward.sql` | 同上 |

兜底补丁三件套（**仅落本地，未连生产、未执行**）：
- 订正：`scripts/ops/rls-tier2-drift-fix-2026-11-25.sql`（快照既有策略 → DROP 全放行 → 按基准重建 → 后置断言）
- 回滚：`scripts/ops/rls-tier2-drift-fix-2026-11-25.rollback.sql`（从 `archive._rls_policy_snapshot` 本批次快照恢复）
- 只读核对：`scripts/ops/rls-tier2-drift-fix-2026-11-25.verify.sql`（逐表比对策略集合/cmd/qual 分支/RLS+FORCE）

> 注意：`mobile.oa_announcement_reads`、`pdm.pdm_master_data_refs` 的补列/回填/索引在既有完整迁移内；兜底补丁前置断言校验 `tenant_id` 列存在，缺失则中止，须先走既有迁移，不在补丁内补数据结构。

## 4. 档 3：基准未收录（30 条）—— 按用途分档定性

代码基准未对这些表登记 RLS 策略。按用途初分为 6 个子类，标注倾向与待复核点。

### 4.3a 日志 / 审计（6 条）—— 倾向豁免，走系统/审计通道

`bi.audit_logs`、`flow.audit_logs`、`gis.audit_log`、`gis.audit_logs`、`iam.audit_logs`、`qms.audit_logs`

> 审计/日志数据通常由审计查询通道读取，不按业务租户谓词收敛；建议确认读取端点是否已限审计角色/系统通道，而非补业务隔离策略。

### 4.3b 模板 / 字典 / 权限目录（4 条）—— 倾向全局只读豁免

`doc.templates`、`doc_service.templates`、`mail.templates`、`iam.permissions`

> 模板与权限定义为全局参考数据；若存在租户私有模板需求，需另行建模，不应在目录表上混租户数据。

### 4.3c 全局配置 / 规则 / 偏好（3 条）—— 待归属确认

`public.alert_rules`、`public.user_settings`、`pm.service_integrations`

> 告警规则、用户偏好、服务集成配置需先确认归属模型（平台级 vs 租户级）；`public.user_settings` 源码运行时未直接命中，需复核是否遗留表。

### 4.3d 通知 / 消息（3 条）—— 待确认广播还是私有

`flow.notifications`、`notification.notifications`、`mail.emails`

> 需确认是全局广播/系统通知（可豁免）还是租户私有消息（应补租户隔离 + 接收者谓词）。

### 4.3e 业务实体（13 条）—— 应隔离候选，需运行时复核

`doc.documents`、`doc.folders`、`doc.document_versions`、`doc_service.archives`、`doc_service.files`、`doc_service.folders`、`flow.workflows`、`gis.geofence_alerts`、`qms.corrective_actions`、`qms.inspection_items`、`qms.quality_issues`、`report.reports`、`storage.files`

> 这些表名义上属租户业务实体，但运行时全限定 SQL 未在源码直接命中（源码访问的是其他 schema/表名），需先复核：① 是否为历史重复/遗留表；② 若为活表，应用层是否已有租户谓词；确认后再决定补严格策略。

### 4.3f 聚合指标（1 条）—— 全局只读候选

`qms.dashboard_metrics`

> 看板聚合指标，倾向只读全局；需确认指标是否按租户预聚合。

## 5. 复核要点与结论

- **硬结论**：2 条有意全局豁免；5 条生产漂移应按基准订正；其余 30 条基准未收录，需按用途与运行时链路定性。
- **风险优先级**：档 2 的 5 条漂移 > 档 3e 的业务实体 > 档 3d 通知消息 > 其余。
- **方法局限**：生产账本滞后（水位 `20261119000002` vs 头版本 `20261124200000`），追平迁移后需重跑本对照；档 3 表的源码命中可能受裸表名/动态 SQL 影响，运行时复核以路由→服务→SQL 链路为准。
