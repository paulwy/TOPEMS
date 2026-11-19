# 27 张零运行期路径表终态处置（2026-11-19）

- 日期：2026-11-19
- 上游清单：[rls-using-true-triage-2026-11-19.md](rls-using-true-triage-2026-11-19.md) 分组 C（37 张真漏配中的 27 张「无运行期路径」表）
- 迁移：
  - `database/migrations/20261119160000_drop_zero_path_legacy_tables.sql`（16 张归档后删除）
  - `database/migrations/20261119161000_zero_path_retained_tables_policy_fix.sql`（3 张保留表的策略收敛）
- 状态：迁移与回滚已落盘，**未 push、未开生产窗口**；生产执行仍受闸门 `app.drop_zero_path_tables_gate=zero-path-20261119` 约束。

## 1. 复核方法与结论

### 1.1 静态与动态引用

按审计表（`bi/gis/qms.audit_logs`）同口径复核，除 schema 限定名外还检查：

| 检查项 | 方法 | 结果 |
|---|---|---|
| schema 限定名 | 全仓 `svc/ lib/ cli/ deploy/ scripts/ .github/` 检索 27 张表名 | 除 `doc_service.core_doc_*`（形似、非本批）外**零命中** |
| 动态拼接 | `schema_prefix`、`format!("{}.audit_logs")`、`quote_ident`、`format('%I.%I')` 全量定位 | 动态拼接仅用于审计表；**不指向本批任何表** |
| 表名 helper | `lib/shared-db/src/schema.rs` 的 `mail_table()` / `portal_table()` 等 | 仅模块内自测调用，`svc/` **零调用** |
| 部署配置 | `deploy/`、`docker-compose*`、`.github/` 表名检索 | **查无** |
| 定时任务 | pg_cron / crontab / 调度 SQL | **查无** |
| 初始化脚本 | `database/postgres/02_create_performance_indexes.sql` 对 `doc.documents` 建索引 | 仅库初始化时执行（早于迁移链），**非运行期路径** |

**结论：27 张均无动态访问，本轮无一张因动态引用被移出候选。**

### 1.2 依赖封闭

对基线 schema（`database/baseline/prod_schema_20261117235500.sql.gz`）实测：

- 本批 27 张**无出向外键、无触发器、无视图/物化视图引用、无函数体引用**；
- 唯一入向外键：`iam.users.role_id → iam.roles.id`、`iam.position_roles.role_id → iam.roles.id`；
- 唯一种子写入：`database/seeds/default_roles.sql` 对 `iam.roles` 做 UPSERT。

**结论：`iam.roles` 依赖不封闭，移出删除候选，改为保留。**

### 1.3 行数

- 27 张中 24 张在 2026-11-19 只读普查中 `n_live_tup=0`、`n_tup_ins=0`；
- `iam.roles` 生产 4 行（全局角色字典）；
- `core.core_tenant_plugins`、`portal.user_preferences` 生产 0 行，且为遗留/预留壳。

## 2. 终态汇总

| 终态 | 数量 | 说明 |
|---|---:|---|
| 归档后删除（本批 `20261119160000`） | 16 | 生产 0 行；归档表仅承载结构快照，用于回滚 |
| 已由死表批 1/2 归档后删除 | 8 | `20261119100000` / `20261119110000` 已承接，不重复 DROP |
| 保留 | 3 | 2 张原登记保留 + `iam.roles` 复核拆出 |
| 因动态引用移出候选 | 0 | — |
| **合计** | **27** | |

## 3. 逐表处置表

| # | 表名 | schema | 模块 | 复核结论 | 行数 | 终态 | 依据 |
|---:|---|---|---|---|---:|---|---|
| 1 | `core_tenant_plugins` | `core` | 平台核心 | 零静态/动态引用；无 `tenant_id`；生产为 `(id, deleted_at)` 两列壳；权威表 `iam.core_tenant_plugins` | 0 | **保留**（仅系统通道） | 遗留壳保留以维持迁移链形态；策略改为 `rls_system_only`，不再 allow-all |
| 2 | `document_versions` | `doc` | 文档中心（遗留） | 零引用；活跃表 `public.core_doc_document_versions` | 0 | 归档后删除 | 历史 schema 副本 |
| 3 | `documents` | `doc` | 文档中心（遗留） | 零引用；活跃表 `public.core_doc_documents`；init 索引脚本非运行期 | 0 | 归档后删除 | 同上 |
| 4 | `folders` | `doc` | 文档中心（遗留） | 零引用；活跃表 `public.core_doc_folders` | 0 | 归档后删除 | 同上 |
| 5 | `templates` | `doc` | 文档中心（遗留） | 零引用；活跃表 `public.core_doc_templates` | 0 | 归档后删除 | 同上 |
| 6 | `archives` | `doc_service` | 文档服务（遗留） | 零引用；`doc_service.core_doc_*` 属另一组活跃表 | 0 | 归档后删除 | 零路径空壳 |
| 7 | `files` | `doc_service` | 文档服务（遗留） | 零引用 | 0 | 归档后删除 | 同上 |
| 8 | `folders` | `doc_service` | 文档服务（遗留） | 零引用 | 0 | 归档后删除 | 同上 |
| 9 | `templates` | `doc_service` | 文档服务（遗留） | 零引用 | 0 | 归档后删除 | 同上 |
| 10 | `notifications` | `flow` | 流程（遗留） | 零引用；活跃表 `public.core_notifications` | 0 | 归档后删除 | 历史 schema 副本 |
| 11 | `workflows` | `flow` | 流程（遗留） | 零引用；流程定义已迁 `public.core_*` | 0 | 归档后删除 | 同上 |
| 12 | `geofence_alerts` | `gis` | GIS | 零引用、无 `tenant_id` | 0 | 已由 `20261119110000` 删除 | 死表批 2，已含归档 |
| 13 | `permissions` | `iam` | 身份权限（遗留） | 零引用；活跃表 `public.core_permissions` | 0 | 归档后删除 | 遗留全局目录 |
| 14 | `roles` | `iam` | 身份权限 | 无 `svc/` 直接 SQL；入向外键 `iam.users`、`iam.position_roles`；`default_roles.sql` 种子写入 | 4 | **保留**（移出候选） | 全局角色字典，租户隔离不适用；改为「全局只读 + 写仅系统通道」 |
| 15 | `emails` | `mail` | 邮件（遗留） | 零引用 | 0 | 归档后删除 | 历史 schema 副本 |
| 16 | `templates` | `mail` | 邮件（遗留） | 零引用 | 0 | 归档后删除 | 同上 |
| 17 | `notifications` | `notification` | 通知（遗留） | 零引用；活跃表 `public.core_notifications` | 0 | 归档后删除 | 同上 |
| 18 | `service_integrations` | `pm` | 项目管理 | 零引用、无 `tenant_id` | 0 | 已由 `20261119100000` 删除 | 死表批 1，已含归档 |
| 19 | `user_preferences` | `portal` | 门户 | 零 SQL；门户设置经 IAM → `core.user_preferences`；无 `tenant_id` | 0 | **保留**（仅系统通道） | 预留表，fail-closed；策略改为 `rls_system_only` |
| 20 | `alert_rules` | `public` | 公共 / 监控 | 零引用、SELECT-only 策略 | 0 | 已由 `20261119110000` 删除 | 死表批 2 |
| 21 | `user_settings` | `public` | 公共 | 零引用 | 0 | 已由 `20261119110000` 删除 | 死表批 2 |
| 22 | `corrective_actions` | `qms` | 质量（遗留） | 零引用；活跃表 `qms.qa_corrective_actions` | 0 | 已由 `20261119110000` 删除 | 死表批 2 |
| 23 | `dashboard_metrics` | `qms` | 质量（遗留） | 零引用 | 0 | 已由 `20261119110000` 删除 | 死表批 2 |
| 24 | `inspection_items` | `qms` | 质量（遗留） | 零引用；同名不同物（`public.qa_lab_inspection_reports` 的 JSONB 列） | 0 | 已由 `20261119110000` 删除 | 死表批 2 |
| 25 | `quality_issues` | `qms` | 质量（遗留） | 零引用；活跃表 `qms.qa_quality_issues` | 0 | 已由 `20261119110000` 删除 | 死表批 2 |
| 26 | `reports` | `report` | 报表（遗留） | 零引用；活跃报表走 `analytics.*` | 0 | 归档后删除 | 历史 schema 副本 |
| 27 | `files` | `storage` | 文件存储（遗留） | 零引用；活跃表 `public.core_files` | 0 | 归档后删除 | 历史 schema 副本 |

## 4. 保留口径（不允许「保留 + 全放行 + 不解释」）

| 表 | 为什么保留 | 为什么不做租户隔离 | 新策略 |
|---|---|---|---|
| `core.core_tenant_plugins` | 遗留壳与迁移链形态；权威数据在 `iam.core_tenant_plugins` | 生产无 `tenant_id`，且运行期零读写；补列无意义 | `rls_system_only`（ALL，仅 `app.rls_system='on'`） |
| `portal.user_preferences` | portal 预留表，后续门户能力可能启用 | 生产无 `tenant_id`，运行期零 SQL；启用前需补租户列 | `rls_system_only`（ALL，仅 `app.rls_system='on'`） |
| `iam.roles` | 全局角色字典；被 `iam.users`、`iam.position_roles` 外键引用；种子 UPSERT 持续写入 | 角色是平台级共享字典，无租户维度 | `rls_global_read`（SELECT true）+ `rls_system_write`（ALL，仅系统通道） |

## 5. 归档与回滚

- 归档表：`archive.drop_20261119_zp__<schema>__<table>`，`LIKE ... INCLUDING ALL EXCLUDING DEFAULTS`，保留 180 天；
- 元数据：`archive._drop_manifest`、`_rls_policy_snapshot`、`_fk_snapshot`、`_view_snapshot`、`_column_defaults`、`_sequence_snapshot`；
- 每表在 DROP 前断言 `源行数 = 归档行数 = 插入行数`，失败整事务回滚；
- 前置断言：本批不得出现入向外键或依赖视图（出现即中止，要求拆表）；
- 后置断言：16 张 `to_regclass` 均为 NULL、16 张归档表齐全、manifest 16 行；
- 回滚：`database/rollback/20261119160000_drop_zero_path_legacy_tables.rollback.sql` 按 manifest 恢复结构与数据；策略迁移回滚按快照恢复原策略。

## 6. 验证

- `env -u DATABASE_URL bash scripts/migration/validate.sh`：文件名/顺序/事务控制/checksums 通过；
- `bash scripts/migration/gen-manifest.sh --check`：无漂移；
- `MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1 bash scripts/dev/run-migration-drill.sh anchor` 重生成快照；
- 真实 HEAD `bash scripts/dev/run-migration-drill.sh anchor`：非特权连接（`topems_test_runner`、`rolsuper=false`、`rolbypassrls=false`）、`[5/5]` 快照比对 PASS。
