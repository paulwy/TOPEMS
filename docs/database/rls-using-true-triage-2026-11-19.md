# 37 条 `USING(true)` 策略逐表定性（2026-11-19）

## 0. 范围、数据来源与口径

**范围**：`docs/database/rls-normalization-draft-2026-11-19.md` §4 登记的 37 张「allow-all 残留」表。其中 6 张共享审计表
（`bi.audit_logs`、`gis.audit_log`、`gis.audit_logs`、`iam.audit_logs`、`flow.audit_logs`、`qms.audit_logs`）已在
`20261119141000_rls_intentional_policies_guard` 按有意放行登记并有守卫断言，本文只引用，不重复论证。

**数据来源**：

1. 锚点 schema 快照 `database/baseline/prod_schema_20261117235500.sql.gz` 还原后实测：37 张表各 1 条 allow-all 策略
   （35 条 `polcmd='*'`，`pdm.pdm_master_data_refs` 与 `public.alert_rules` 为 `SELECT`-only；`gis.track_positions` 的
   `relrowsecurity=false`，策略处于未生效状态）。
2. 代码路径：对 `svc/` 全量检索 schema 限定名，并在表所属服务内检索非限定 SQL；与
   `docs/quality/table-disposition-2026-11-19.md` 的「零 SQL 引用」 census 交叉核对。
3. 表去向：对照 `docs/quality/table-disposition-2026-11-19.md`（保留 / 归档候选 / 删除候选）与死表清单
   `20261119100000`、`20261119110000`（37 张均不在死表 DROP 清单内）。

**关键事实**：37 张中只有 `bi.audit_logs`（审计）与 `pdm.pdm_master_data_refs` 有 `tenant_id` 列，其余 35 张**没有租户列**。
因此「按 strict B 收紧」对多数表在物理上不可行，必须先按处置结论走「归档 / 删除 / 补列」，不能机械套表达式。

**判定口径**（沿用既定规则）：

- 有写入方且需要租户隔离 → 按 strict B 收紧；
- 无代码读写路径 → 跟表走归档/删除评估，不单独收紧；
- 二选一定性：**有意 fail-open**（安全，写入只经系统通道 / 跨租户全局主数据 / 已登记放行）或 **真漏配**
  （allow-all 无正当理由，租户连接可越权读写）。

---

## 1. 逐表清单

> 「读写路径」中的 `—` 表示全仓无该 schema 限定名、且所属服务内无非限定 SQL 命中（即零运行期路径）。
> 「写入方」中的「系统通道」指 `app.rls_system='on'`、service-role/admin 连接等不受 RLS 约束的路径。

| # | 表 | 模块 | 仓库代码读写路径 | 写入方 | 表去向 | 定性 | 理由 |
|---|---|---|---|---|---|---|---|
| 1 | `bi.audit_logs` | BI / 审计 | 审计服务动态 SQL `{prefix}.audit_logs` | 审计写入器（系统通道） | 删除候选*（见 §2 备注） | 有意 fail-open | 已登记并受 `20261119141000` 守卫；审计写入跨租户、租户侧只读 |
| 2 | `core.core_tenant_plugins` | 平台核心 | —（运行期读写走 `iam.core_tenant_plugins`：`svc/plugin-registry/.../tenant_plugins.rs:145,324`） | 无（同上走 iam schema） | 保留 | 真漏配 | 遗留 schema 副本、无 `tenant_id`、无路径；保留仅因种子数据，应按 iam 表下线或登记 |
| 3 | `doc.document_versions` | 文档中心（遗留） | —（活跃表为 `public.core_doc_document_versions`：`svc/unified-core/src/modules/doc/services/document.rs:126`） | 无 | 归档候选 | 真漏配 | 遗留同名副本；活跃表已按 strict B 管控（`document.rs:92-105`） |
| 4 | `doc.documents` | 文档中心（遗留） | —（活跃表 `public.core_doc_documents`：`document.rs:105`） | 无 | 归档候选 | 真漏配 | 同上；文档模块不访问 `doc.*` |
| 5 | `doc.folders` | 文档中心（遗留） | —（活跃表 `public.core_doc_folders`：`svc/unified-core/src/modules/doc/services/folder.rs:37-130`） | 无 | 归档候选 | 真漏配 | 同上 |
| 6 | `doc.templates` | 文档中心（遗留） | —（活跃表 `public.core_doc_templates`：`template.rs:39-145`） | 无 | 归档候选 | 真漏配 | 同上 |
| 7 | `doc_service.archives` | 文档服务（遗留） | — | 无 | 归档候选 | 真漏配 | 零引用；无 `tenant_id` |
| 8 | `doc_service.files` | 文档服务（遗留） | — | 无 | 归档候选 | 真漏配 | 零引用 |
| 9 | `doc_service.folders` | 文档服务（遗留） | — | 无 | 归档候选 | 真漏配 | 零引用 |
| 10 | `doc_service.templates` | 文档服务（遗留） | — | 无 | 归档候选 | 真漏配 | 零引用 |
| 11 | `erp.core_erp_materials` | ERP | 全局物料主数据只读：`svc/erp/src/modules/search.rs:103-111`（`only_own_schema_query!("erp", ...)`，注释明确跨租户共享） | 无（仅外部主数据装载） | 未登记（保留使用） | 有意 fail-open | 平台级物料字典，跨租户共享；只读，无租户列，隔离无意义 |
| 12 | `flow.audit_logs` | 流程（遗留） | 审计服务动态 SQL 前缀（同 §0 登记） | 审计写入器（系统通道） | 归档候选 | 有意 fail-open | 已登记并受守卫 |
| 13 | `flow.notifications` | 流程（遗留） | —（活跃表 `public.core_notifications`） | 无 | 归档候选 | 真漏配 | 历史 schema 副本，零引用 |
| 14 | `flow.workflows` | 流程（遗留） | — | 无 | 归档候选 | 真漏配 | 零引用；流程定义已迁 `public.core_*` |
| 15 | `gis.audit_log` | GIS / 审计 | 审计服务动态 SQL 前缀 | 审计写入器（系统通道） | 删除候选* | 有意 fail-open | 已登记并受守卫 |
| 16 | `gis.audit_logs` | GIS / 审计 | 审计服务动态 SQL 前缀 | 审计写入器（系统通道） | 删除候选* | 有意 fail-open | 已登记并受守卫 |
| 17 | `gis.geofence_alerts` | GIS | — | 无 | 删除候选 | 真漏配 | 零引用、生产 0 行；无 `tenant_id` |
| 18 | `gis.track_positions` | GIS | 只读：`svc/gis/src/modules/sync.rs:355`（按 `track_id` 批量读） | 无（仓内无 INSERT/UPDATE） | 删除候选（随死表批次） | 已处置（不启用 RLS） | 位置轨迹属敏感数据；`relrowsecurity=false`，策略完全未生效。写入来源复核：仓内零写入、部署/脚本/定时任务/动态拼接均查无、基线 0 行 → 按 P3 口径登记删除候选，见 §3 P3 |
| 19 | `iam.audit_logs` | 身份权限 / 审计 | 审计服务动态 SQL 前缀 | 审计写入器（系统通道） | 归档候选 | 有意 fail-open | 已登记并受守卫 |
| 20 | `iam.permissions` | 身份权限（遗留） | —（运行期用 `public.core_permissions`：`svc/unified-core/src/modules/iam/permission_verify.rs:151-153`） | 无 | 归档候选 | 真漏配 | 遗留全局权限目录；无 `tenant_id`、无路径 |
| 21 | `iam.roles` | 身份权限（遗留） | —（运行期用 `public.core_roles` / `iam.position_roles`） | 无 | 未登记 | 真漏配 | 遗留角色目录；无 `tenant_id`、无路径；若确认长期保留应改登记为有意放行 |
| 22 | `mail.emails` | 邮件（遗留） | —（仅前端类型引用，无 SQL） | 无 | 归档候选 | 真漏配 | 历史 schema 副本 |
| 23 | `mail.templates` | 邮件（遗留） | — | 无 | 归档候选 | 真漏配 | 零引用 |
| 24 | `mobile.oa_announcement_reads` | 移动端 | 写：`svc/mobile/src/modules/oa.rs:1630-1668`（`only_own_schema_query!("mobile", ...)` 普通租户连接，写入取认证主体） | 租户侧 OA 已读上报（**非系统通道**） | 未登记 | 已修复（**P2**，`20261119151000`） | 已补 `tenant_id`（回填自公告/用户主体）并 `SET NOT NULL`、严格 B 收紧、`(tenant_id,user_id)` 索引；`user_id` 改为 token `sub`，不再硬编码 |
| 25 | `notification.notifications` | 通知（遗留） | —（权威表 `public.core_notifications`） | 无 | 归档候选 | 真漏配 | 历史 schema 副本 |
| 26 | `pdm.pdm_master_data_refs` | 产品数据 | 写：`svc/pdm/src/event_handlers/mod.rs:255-300`（`scope_system()`，显式 `tenant_id`）；读：全仓无代码路径 | 系统通道（事件处理器） | 未登记 | 已修复（**P1**，`20261119150000`） | 已删除 `read(SELECT true)` + `write(系统通道)` 两条策略，收敛为 `rls_tenant_isolation`(ALL，严格 B)；无读代码路径，收紧不影响运行 |
| 27 | `pm.service_integrations` | 项目管理 | —（仅 OpenAPI 标签，无 SQL） | 无 | 删除候选 | 真漏配 | 零引用、无 `tenant_id` |
| 28 | `portal.user_preferences` | 门户 | —（门户设置经 HTTP 转 IAM，无本表 SQL） | 无 | 保留 | 真漏配 | 预留表；无 `tenant_id`、无路径；启用前须补租户列或登记为个人级放行 |
| 29 | `public.alert_rules` | 公共 / 监控 | —（`svc/monitor/.../alerts.rs` 仅 OpenAPI 标签，无 SQL） | 无 | 删除候选 | 真漏配 | SELECT-only 策略 + 零引用 + 无 `tenant_id`，随表删除 |
| 30 | `public.user_settings` | 公共 | — | 无 | 删除候选 | 真漏配 | 零引用；个人配置已收敛到 `core.user_preferences` |
| 31 | `qms.audit_logs` | 质量 / 审计 | 审计服务动态 SQL 前缀 | 审计写入器（系统通道） | 删除候选* | 有意 fail-open | 已登记并受守卫 |
| 32 | `qms.corrective_actions` | 质量（遗留） | —（`svc/ehs/.../environmental_compliance.rs` 命中仅为结构体字段名，非 SQL） | 无 | 删除候选 | 真漏配 | 零引用、0 行；活跃表为 `qms.qa_corrective_actions` |
| 33 | `qms.dashboard_metrics` | 质量（遗留） | — | 无 | 删除候选 | 真漏配 | 零引用、0 行 |
| 34 | `qms.inspection_items` | 质量（遗留） | —（`svc/lims/.../report.rs` 的 `inspection_items` 是 `public.qa_lab_inspection_reports` 的 JSONB 列） | 无 | 删除候选 | 真漏配 | 零引用；同名不同物 |
| 35 | `qms.quality_issues` | 质量（遗留） | — | 无 | 删除候选 | 真漏配 | 零引用、0 行；活跃表为 `qms.qa_quality_issues` |
| 36 | `report.reports` | 报表（遗留） | —（活跃报表走 `analytics.*`） | 无 | 归档候选 | 真漏配 | 历史 schema 副本，零引用 |
| 37 | `storage.files` | 文件存储（遗留） | —（活跃表 `public.core_files`：`svc/unified-core/src/modules/file/manage.rs:63-157`） | 无 | 归档候选 | 真漏配 | 遗留副本；活跃表按 `tenant_scope.sql_predicate("tenant_id")` 隔离 |

---

## 2. 分组小结

| 组 | 数量 | 表 |
|---|---|---|
| A. 有意 fail-open（已登记 / 逻辑成立） | **7** | 6 张共享审计表 + `erp.core_erp_materials` |
| B. 真漏配且**有活路径**（需处置，本轮已全部收口） | **3** | `pdm.pdm_master_data_refs`、`mobile.oa_announcement_reads`、`gis.track_positions` |
| C. 真漏配但**无运行期路径**（随处置，不单独收紧） | **27** | 其余全部（含 doc/doc_service/mail/storage/flow/notification/report 遗留副本、iam 遗留目录、qms 4 张遗留表、3 张删除候选公共表、2 张保留/未登记表） |
| 合计 | **37** | 有意 fail-open 7 / 真漏配 30 |

> \* 6 张审计表中 `bi/gis/qms` 的 4 张在 `table-disposition` 里被标为「删除候选」，依据是静态 grep 零引用。但审计写入器使用
> `format!` 动态 schema 前缀，静态扫描不可见；该「删除候选」结论与运行期写入冲突，处置前必须以审计服务实际前缀名单复核，
> 不能按删除执行。这是 census 口径的已知盲区，建议在处置清单里给审计表加「动态 SQL 例外」标注。

---

## 3. 需要收紧的表（按风险排序）

### P1 `pdm.pdm_master_data_refs` —— 跨租户读泄漏，且已有租户列

- 状态：**已实施**（`database/migrations/20261119150000_pdm_master_data_refs_rls_strict_forward.sql`，回滚 `database/rollback/20261119150000_pdm_master_data_refs_rls_strict_forward.rollback.sql`）。
- 迁移前实测策略为两条：`pdm_master_data_refs_read`（SELECT/`true`）与 `pdm_master_data_refs_write`（ALL/仅 `app.rls_system='on'`）；迁移后收敛为 1 条 `rls_tenant_isolation`（ALL，严格 B）。
- 读路径复核：全仓除事件处理器写入（`scope_system()`，系统通道）外无该表 SELECT，故不存在「收紧后读空集」风险，未新增 `scope_with` 调用。

- 迁移前现状：`pdm_master_data_refs_read`（`SELECT`，`USING(true)`），表有 `tenant_id`；写入走 `scope_system()` 系统通道，安全。
- 风险：任意租户连接 `SELECT` 可读到全部租户的主数据引用映射（物料/产品 → 主数据 ID），可用于推断他租户的产品结构。
- 迁移实现（已落盘）：删除两条原策略，改为 canonical strict B：

```sql
CREATE POLICY rls_tenant_isolation ON pdm.pdm_master_data_refs
  FOR ALL
  USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
          OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
  WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
          OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
```

- 验证：`relrowsecurity/relforcerowsecurity=true`；`pg_policy` 恰好 1 条；以租户 A 的 GUC 查询只返回 A 行（跨租户 0 行）；
  `app.rls_system='on'` 时全量可见；事件处理器写入回归通过；进 `run-migration-drill.sh`。

### P2 `mobile.oa_announcement_reads` —— 有租户侧写入，无租户列

- 状态：**已实施**（`database/migrations/20261119151000_mobile_oa_announcement_reads_tenant_rls.sql`，回滚 `database/rollback/20261119151000_mobile_oa_announcement_reads_tenant_rls.rollback.sql`），按「功能保留」方案（下方建议 1）。
- 回填可追溯：优先 `mobile.oa_announcements.tenant_id`，剩余再按 `user_id` 从 `public.core_users.tenant_id` 推；迁移内 `RAISE EXCEPTION` 断言 0 行 NULL 后才 `SET NOT NULL`。
- 代码：`svc/mobile/src/modules/oa.rs:mark_announcement_read` 改用认证主体 `Claims`（`user_id = sub`、`tenant_id = claims.tenant_id`，缺失即 401），不再硬编码 `"default_user"`；事务仍为中间件已设 `app.tenant_id` 的请求级 `scope_with`。

- 迁移前现状：写入口 `svc/mobile/src/modules/oa.rs:1649`（普通租户连接），`INSERT ... ON CONFLICT DO NOTHING`；`user_id` 硬编码
  `"default_user"`；策略为 ALL/`true`；无 `tenant_id`。
- 风险：任何租户可读/写/删所有租户的公告已读回执，形成跨租户个人信息泄漏与状态污染；且 `default_user` 说明功能未闭环。
- 方案选择：采用方案 1（功能保留）——迁移补 `tenant_id NOT NULL` + 回填，按 P1 的 strict B 收紧，`user_id` 改为真实登录用户。
- 验证：跨租户 `SELECT` 0 行、跨租户 `INSERT` 被 `WITH CHECK` 拒绝；同租户上报幂等（`ON CONFLICT`）不回归。

### P3 `gis.track_positions` —— 策略存在但 RLS 未启用（最隐蔽）

- 结论：**不启用 RLS，登记为删除候选，随死表批次处理**（未生成 DDL 迁移）。
- 迁移前现状：`pg_class.relrowsecurity=false`、`relforcerowsecurity=false`，`gis_allow_all_track_positions` 实际不生效；无 `tenant_id`。
- 写入来源复核（按用户口径逐项给证据）：
  - 仓库代码：唯一命中为只读 `svc/gis/src/modules/sync.rs:355`；批量位置上报写的是 `gis.device_location_records`（`svc/gis/src/modules/sync.rs:158-163`），**非本表**；全仓无 `INSERT INTO gis.track_positions` / `UPDATE gis.track_positions`。
  - 部署配置：`deploy/` 全目录检索 `track_positions` —— **查无**。
  - 脚本与定时任务：`scripts/` 仅 `scripts/schema_boundary_tables.json:385`（表归属声明）与 `scripts/ci/data/prod_cols.psv:5208-5218`（列采集），无写入；`database/`、`deploy/`、`scripts/` 检索 `pg_cron` / `cron.schedule` —— **查无**。
  - 外部采集/动态拼接：`format!` / `quote_ident` 动态表名在 `svc/gis`、`svc/mobile`、`svc/pdm` —— **查无**。
  - 数据量：基线数据快照 `baseline_20261117235500_data.sql.gz` 无 `COPY gis.track_positions` 块 → **0 行**。
- 因此：既无写入方、表内 0 行，按口径不启用 RLS（避免把不确定读写锁死），随死表批次删除；`gis_allow_all_track_positions` 悬空策略随表一并消失。


### 低风险但建议登记（不收紧）

`iam.roles`、`iam.permissions`、`core.core_tenant_plugins`、`portal.user_preferences` 四张「保留 / 未登记」表均无 `tenant_id`、
当前无运行期路径。它们不属于「有写入方且需租户隔离」，按口径不单独收紧；但长期保留应像 6 张审计表一样在
`20261119141000` 登记为有意放行并加守卫，或并入归档/删除批次二选一，避免下一次普查重复出现。

---

## 4. 实施与验收（本轮已落地）

1. **P1**：`20261119150000_pdm_master_data_refs_rls_strict_forward.sql`（单独迁移，最小面、已有租户列）。
2. **P2**：`20261119151000_mobile_oa_announcement_reads_tenant_rls.sql` + `svc/mobile/src/modules/oa.rs` 主体修复（选择「补列收紧」）。
3. **P3**：不生成 DDL，登记删除候选（见 §3 P3 与 `docs/quality/table-disposition-2026-11-19.md` 补充登记）。
4. 27 张无路径表不新建收紧迁移，跟随 `table-disposition` 的归档/删除批次处理。
5. 所有收紧迁移均走 `scripts/dev/run-migration-drill.sh anchor`（干净 worktree、非特权连接、`PASS: drill:anchor`），
   并保持「表存在 → 严格断言；表缺失 → 仅白名单跳过，名单外 RAISE」的既有守卫口径。

## 5. 验证方法

| 对象 | 验证 | 期望 |
|---|---|---|
| P1 策略 | `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='pdm' AND tablename='pdm_master_data_refs'` | 仅 1 条 `rls_tenant_isolation`，`cmd=ALL`，`qual/with_check` 同时含 `app.rls_system` 与 `app.tenant_id` |
| P1 开关 | `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid='pdm.pdm_master_data_refs'::regclass` | `t / t` |
| P1 隔离 | 非特权连接 `SET LOCAL app.tenant_id='<租户A>'` 后 `SELECT count(*)` | 只返回租户 A 行；换成其他租户 → 0 行；`app.rls_system='on'` → 全量可见 |
| P2 列 | `SELECT is_nullable FROM information_schema.columns WHERE table_schema='mobile' AND table_name='oa_announcement_reads' AND column_name='tenant_id'` | `NO` |
| P2 策略 | 同 P1 的策略查询（schema=`mobile`） | 仅 1 条 `rls_tenant_isolation` |
| P2 隔离 | 租户 A 下 `INSERT ... (tenant_id=B)` | 被 `WITH CHECK` 拒绝；同租户重复上报 `ON CONFLICT DO NOTHING` 不报错 |
| P2 索引 | `to_regclass('mobile.idx_oa_announcement_reads_tenant_user')` | 非空 |
| P3 | `SELECT relrowsecurity FROM pg_class WHERE oid='gis.track_positions'::regclass` | 保持 `false`（不启用，随死表批次删除） |
| 全局 | `bash scripts/dev/run-migration-drill.sh anchor` | `PASS: drill:anchor`，`[conn] topems_test_runner / rolsuper=false / rolbypassrls=false`，`[5/5]` 快照比对通过 |

