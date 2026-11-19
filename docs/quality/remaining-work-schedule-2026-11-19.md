# TOPEMS 剩余待办统一排期与推进方案（2026-11-19）

> 文档性质：只出方案，不应用任何迁移、不连接生产写入、不开生产窗口、不改业务代码。
> 本文把 2026-11-19 时点仍然成立的剩余事项统一排期，已闭环项不重做、不重复验证。
> 依据：`docs/quality/待办优先级与执行次序-2026-11-18.md`、`docs/quality/functional-closure-closure-2026-11-19.md`、`docs/quality/table-disposition-2026-11-19.md`、`docs/quality/dead-table-disposal-plan-2026-11-19.md`、`docs/database/rls-prod-vs-repo-census-2026-11-18.md`、`docs/database/window-rls-strict-20261118-runbook.md`、`docs/database/window-rls-strict-20261118-execution-log.md`、`TODO.md`。

---

## 0. 前提、基线与口径

### 0.1 已完成基线（不再排期）

| 事项 | 当前读数 / 结论 | 处理 |
|---|---|---|
| 第 1 波生产窗口 | 账本 721，max `20261119000002`，策略 1050，表 1344，参考数据 5172，`flow._deprecated_*` 12 张；新件监听 `127.0.0.1:8099` | 视为已闭环，不再重跑 |
| 功能清单 2 | 归零 | 只做防回归复跑 |
| 功能清单 1 | 33 条全部有结论 | 剩余是“处置动作”，不是“重新普查” |
| 功能清单 3 | 477 张逐表登记完成：保留 131 / 归档候选 139 / 删除候选 207 | 保留 131 不再加工；139、207 见下文 |
| 207 张删除候选 | 方案已出；批 1 `20261119100000`（19 张）、批 2 `20261119110000`（188 张）均未应用 | 排入 R3 / R4 |
| 批 2 放行条件 | 设计上要求批 1 观察 ≥7 天 | 作为硬串行条件 |
| 本地提交 | 13 条 commit 正在推送，pre-push 门禁运行中，结果未回报 | 作为 R0 阻断项 |

### 0.2 待应用 / 状态待核对的迁移

| 版本 | 内容 | 当前状态 | 说明 |
|---|---|---|---|
| `20261118124000` | 既有 RLS/策略相关迁移 | 运行手册写“defer、不在本波”；manifest 标 `applied (implicit)` | **状态冲突，必须只读核对账本实读**，不能凭单侧文档判定 |
| `20261119010000` | IAM 资源级 ACL：`role_id` / `effect` / `scope` / `deleted_at`、唯一索引、约束、两个权限码及角色授权 | `to_apply` | 后端 grant/revoke 代码已存在；前端零引用 |
| `20261119100000` | 死表批 1：19 张 DROP | `to_apply` | 依赖 DBA 外部消费确认 |
| `20261119110000` | 死表批 2：188 张 DROP | `to_apply` | 依赖批 1 观察 ≥7 天 |
| `20261119120000` | ERP 销售订单行项目 `erp.sales_order_items` | `to_apply` | 与 `svc/erp` 写入、`svc/scm` MRP 读取代码强耦合 |

已应用的第 1 波三件为 `20261118160000`、`20261119000001`、`20261119000002`，不在本表重复。

### 0.3 三类工作口径

- **本机可完成**：只读核对、隔离库演练、测试/门禁修复、代码或文档改动，不触生产、不开窗。
- **需要生产窗口**：应用迁移、替换二进制、需要生产前置读数/备份/回滚演练的 DDL 或代码耦合发布。
- **需要 DBA 外部核查**：仓库内证据无法覆盖的外部 BI/报表/ETL、库内定时任务、CDC/逻辑复制、连接白名单、低频访问等，只取证不写入。

### 0.4 已拍定的 RLS / 口径决策（2026-11-19）

| 编号 | 决策 | 落地口径 |
|---|---|---|
| P-1 | service token 按“会访问 `/erp/consolidation/*`”处理 | 不把仓库的 `tenant_id` 等值写法套到生产，保留系统通道。服务令牌是跨租户读的既有通道；按“不可达”假设处理会静默返回空列表，比报错更难查 |
| P-2 | 保留 `app.rls_system='on'` 系统通道 | 不删除、不收紧为仅迁移可用；它是服务令牌与后台任务的既有跨租户通道 |
| P-3 | 策略实测纳入强制巡检 | 建立策略期望快照（表、策略名、`USING`、`WITH CHECK`、`ENABLE`/`FORCE` 标志），门禁逐项比对，不一致即失败。**口径：账本 `success=t` + checksum 匹配不构成策略已落地的证据**；`20261114180000` 即反例——账本成功、checksum 与 sha384 一致，但 `pg_policies` 仍是旧形状 |
| P-4 | 集团-成员租户层级不做实现 | 把 `erp.group_tenant_of(uuid)` 当前恒等语义写成契约：只把 `NULL` / 全零 UUID 映射为 `NULL`，其余原样返回。扩展点：将来引入层级时，函数与 8 张表（`erp.company_relations`、`internal_transactions`、`consolidation_scopes`、`consolidation_scope_companies`、`consolidation_reports`、`consolidation_report_lines`、`elimination_rules`、`elimination_candidates`）的策略**必须同事务修改**，不得只改函数或只改策略 |
| P-5 | `DRIFT-01` 定性为误报 | 生产与契约均 `numeric(12,2)`，维持两位，不收敛为整数。另：本机 dev 库 `topems` 账本停在 `20261103000005`、缺 `20261105160000`，单独记一条待修（R0-6），不混入生产口径 |

P-3 的执行要求（与 §6.3 配套）：

- 期望快照必须来自仓库契约（迁移终态），不是从生产库反导；生产实测只作为比对对象。
- 比对维度至少包含：`schemaname`、`tablename`、`policyname`、`cmd`、`qual`（`USING`）、`with_check`、`pg_class.relrowsecurity`、`pg_class.relforcerowsecurity`。
- 任一表缺失、策略缺失/多出、表达式文本不一致、`ENABLE`/`FORCE` 标志不一致，均判失败。
- 账本与 checksum 只用于“迁移是否执行过”的辅助证据，不得替代策略实测。

### 0.5 本机 dev 库账本漂移（单独待修，不混入生产口径）

| 事项 | 现状 | 处理 |
|---|---|---|
| R0-6 本机 dev `topems` 账本落后 | `_sqlx_migrations` 停在 `20261103000005`，缺 `20261105160000` | 单独立项修复（补应用缺失迁移或重建 dev 库）；不影响 `topems_prod` 镜像 721 行账本与生产发布判定 |

---

## 1. 一页结论

1. **先恢复“可相信的基线”，再谈开窗**：推送/CI 结果、测试 DSN 卫生、两个门禁的真实可发布验证，三者任一未收口，窗口的“绿色”都不能作为发布判定。
2. **功能闭环遗留先分诊、后施工**：11 条半成品、6 条历史残留、4 条影子表、10 条刻意禁用，先逐条定“建设 / 下线 / 登记未实现”，不在本轮直接开发。
3. **ERP 行项目与 IAM 资源级 ACL 是两条代码-迁移耦合项**：要么同窗口“先迁移、后换二进制”，要么在发布中明确屏蔽；不能只上代码或只上迁移。
4. **死表批 1 必须等 DBA 外部消费书面确认**；批 2 必须等批 1 观察满 ≥7 天。两者与 ERP/IAM 无业务依赖，但受“迁移单写者”约束，只能串行开窗。
5. **归档候选 139 目前只有登记、没有方案**，优先级低于删除候选；建议排在批 2 之后，避免同一时期大规模 schema 变更。
6. **`check-ledger-ddl-drift` 与 `check-rls-permissions` 当前的通过结论不可用于发布判定**：缺少“非特权角色 + 真实 721 行账本”的连接，靠快照库豁免跑通；必须先补夹具和阴性测试。
7. **测试 DSN 卫生是独立风险**：`#[sqlx::test]` 继承调用者 `DATABASE_URL`，11-18 已有测试进程连到 `topems_prod` 镜像并生成 `_sqlx_test` schema；现有 guard 只覆盖部分文件，运行脚本未统一覆写 DSN。

推荐总顺序：

```text
R0 可信基线（本机，阻断所有窗口）
  ├─ R1 功能与结构收口（本机，可与 R0 并行）
  │    └─ 产出 R2 的迁移/预演/决策输入
  ├─ X  DBA 外部消费核查（外部，可与 R0/R1 并行）
  ▼
R2 第一个生产窗口：ERP 行项目（必选）+ IAM ACL（按拍板）+ 124000（按拍板）
  ▼
R3 死表批 1 窗口（19 张，DBA 签字后）
  ▼ ≥7 天观察
R4 死表批 2 窗口（188 张）
  ▼
R5 归档 139、RLS 遗留与大项（按项立项，不排死日期）
```

---

## 2. 剩余事项总表

> “拍板”列：是 = 需要用户/业务明确决策；否 = 技术执行项，按既有结论推进。
> “窗口/迁移”列：是 = 需要生产窗口或迁移应用；否 = 本机或纯核查。

### 2.1 基线与验证（R0）

| ID | 事项 | 现状 | 卡点（技术/业务） | 拍板 | 窗口/迁移 | 验收判据 |
|---|---|---|---|---|---|---|
| R0-1 | 推送与 CI 基线收口 | 13 条本地 commit 正在推送，pre-push 门禁在跑，结果未回报。**2026-11-19 进展：`migration-drill-anchor` 已改为 HEAD 干净 worktree + 模板库 `topems_drill_template`，22 条待应用迁移演练绿；`cargo-fmt-check` 仅格式化 HEAD 已提交的 `svc/unified-core/src/routes/mod.rs`，`permission_verify.rs` / `resource_permission.rs` 属其他会话在途未提交文件，未触碰，整体 fmt 仍红** | 技术/流程：门禁可能红；远端状态未确认；fmt 红项跨会话 | 否（除非需改变推送策略；禁止 force/amend） | 否 | push 退出码 0；`origin/main..HEAD` 为 0；CI 首个 run 全绿或仅登记已知红项；保存 pre-push 输出；后续窗口二进制必须从该已验证 commit 构建 |
| R0-2 | 测试 DSN 卫生 | `#[sqlx::test]` 继承调用者 `DATABASE_URL`；运行脚本未统一覆写；11-18 测试进程连过 `topems_prod` 镜像并生成 `_sqlx_test`；guard 仅覆盖 57 个文件 | 技术 + 流程：guard 覆盖不全，手工 `export` 可绕过 | 是（D-9：采用包装脚本 + 全量 guard + 独立测试角色到哪一层） | 否 | 见 §6.2 的五条验收；核心是 `DATABASE_URL=生产/镜像` 时测试必须快速失败，且 `topems_prod` 镜像中 `_sqlx_test%` schema 为 0 |
| R0-3 | 两个门禁的发布级验证 | `check-ledger-ddl-drift` 与 `check-rls-permissions` 无“非特权且带真实 721 行账本”的连接；此前分别用 `MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1`、`RLS_PERMISSIONS_ALLOW_SUPERUSER=1` 在本机放行，结论不可用于发布判定。**2026-11-19 进展：本机 `topems_prod` 已建只读角色 `topems_drift`，ledger 门禁零豁免跑通（721 行，见 §6.1.1）；RLS 门禁与两个门禁的阴性用例仍待** | 技术：缺真实账本夹具/非特权角色；不是业务判断 | 否（技术方案可自定，但发布口径需确认） | 否 | 见 §6.1；非特权角色、真实 721 行账本、零豁免跑通；阴性用例能红；输出记录库名/角色/账本行数/max 版本/策略数 |
| R0-4 | 迁移清单与账本一致性 | `20261118124000` 运行手册与执行日志明确“显式 defer、账本中不存在”，manifest 却标 `applied (implicit)`；其余四件 `to_apply` | 技术 + 文档一致性：状态双源 | 是（D-2：`20261118124000` 应用还是保持 defer） | 否（核对）；若决定应用则进入 R2 | 每个版本在账本、manifest、运行手册三处状态唯一；`gen-manifest --check` 绿；`apply-forward` dry list 与预期一致；不得出现“manifest 已应用但账本无行” |
| R0-5 | 窗口验收读数模板 | 既有窗口靠人工读数，模板散落在各文档 | 流程：口径不统一 | 否 | 否 | 固定记录：账本行数/max、表数（r,p）、策略数、参考数据行数、二进制 SHA、备份标识、前后 delta；所有窗口复用 |
| R0-6 | 本机 dev 库账本漂移 | 本机 dev 库 `topems` 的 `_sqlx_migrations` 停在 `20261103000005`，缺 `20261105160000`；与生产镜像 721 行账本无关 | 技术：dev 库历史断档；不影响生产发布判定 | 否 | 否 | 补应用缺失迁移或重建 dev 库后，dev 账本连续且 `max(version)` 与仓库一致；该修复不得混入生产口径或窗口读数 |

### 2.2 功能闭环遗留（R1，本机为主）

| ID | 事项 | 现状 | 卡点（技术/业务） | 拍板 | 窗口/迁移 | 验收判据 |
|---|---|---|---|---|---|---|
| R1-1 | 11 条功能半成品分诊 | 清单 1 结论为“读接口存在但上游从未写入”，不是缺一条 INSERT：`ai.model_usage_stats`、`core.core_plugin_categories`、`erp.consolidation_report_lines`、`gis.track_positions`、`gis.track_records`、`mes.production_costs`、`scm.demand_forecast`、`wms.replenishment_suggestion_snapshots`、`srm.bidding_suppliers`、`srm.contract_terms`、`mdm.data_asset_categories` | 业务/产品：建设需要真实上游数据源与口径；技术实现不是主要成本 | 是（D-5：逐条“建设 / 下线 / 登记未实现”） | 否 | 每条有处置结论、责任方、目标版本；选择“建设”的必须给出上游数据源；选择“登记”的不得伪造数据；清单 1 复跑不再出现“待定” |
| R1-2 | 6 条历史残留 + 4 条影子表 | 历史残留：`approval_records`、`approvals`、`sys_db_changes`、`scm.purchase_inquiries`、`purchase_inquiry_items`、`supplier_quote_items`；影子表：`mobile.mobile_attendance`、`mobile.oa_announcements`、`scm.supplier_products`、`scm.sync_record_details` | 技术：读路径仍指向旧表/影子表；业务：需确认权威表与下线节奏 | 是（部分：权威表与下线顺序） | 否 | 读路径切换到权威表或接口下线；清单 3 复跑一致；不得出现“权威表有数据、影子表仍被读” |
| R1-3 | 10 条刻意禁用 | 端点返回 501，真实表为空，属于刻意禁用 | 无技术卡点；只需防误开 | 否 | 否 | 501 行为保持不变；文档/开关标注“禁用”；不得为了清单好看补假数据 |
| R1-4 | IAM 资源级 ACL 前后端闭环 | 后端 `grant_role_resource_permissions` / `revoke_role_resource_permissions` 已存在；`20261119010000` 未应用；`apps/web` 零引用，无前端界面；`check_user_resource_permission` 目前恒 false | 业务/产品：是否现在建设前端授予界面；技术：代码与迁移强耦合 | 是（D-3：建设前端 / 仅保留后端并登记未暴露） | 是（`20261119010000`） | 若建设：角色授予、用户 allow/deny 例外、撤销、软删、平台/租户 scope、审计全链路 e2e；授权后 check=true、撤销后 false。若不建设：明确登记“未暴露”，不得宣称闭环；后端路由必须与迁移同窗口或屏蔽，禁止只上代码 |
| R1-5 | ERP 销售订单行项目 | 迁移 `20261119120000` 未应用；`svc/erp/src/modules/sales_order.rs` 已写行项目，`svc/scm/src/modules/mrp.rs` 已读 `erp.sales_order_items`；迁移内对 `scm.sales_order_items` 仅加废弃注释 | 业务：确认 ERP 为权威写入、行项目口径；技术：代码-迁移同窗口 | 是（D-4：权威表与行项目语义） | 是（`20261119120000`） | 迁移先建表，旧二进制忽略新表不报错；换新二进制后订单创建/更新写入行项目，MRP 能读到并产生需求；跨租户读取为 0；回滚脚本演练通过；只上迁移不写行、只上代码缺表，均判失败 |
| R1-6 | `core_doc_document_versions` e2e | 修复已进入 `3f3acd77e`；还缺创建/更新/恢复三条路径的端到端断言 | 技术：测试覆盖 | 否 | 否 | e2e 覆盖创建、更新、恢复；版本行数与内容正确；跨租户隔离；测试使用测试 DSN |
| R1-7 | 清单 2 防回归 + 清单 1 复跑 | 清单 2 归零；清单 1 33 条有结论 | 无 | 否 | 否 | 复跑普查脚本，清单 2 仍为 0；清单 1 结论不回退；输出存档 |

### 2.3 死表处置（R3 / R4，生产窗口 + DBA）

| ID | 事项 | 现状 | 卡点（技术/业务） | 拍板 | 窗口/迁移 | 验收判据 |
|---|---|---|---|---|---|---|
| X-1 | 207 张外部消费核查 | 仓库内已证明零引用、生产 0 行、FK 闭环、无视图/授权/publication/FDW；无法证明外部 BI/ETL、库内 job、CDC/复制、低频访问 | DBA 外部核查：这是唯一能卡住批 1 的非代码项 | 否（取证）；是（放行签字，D-6） | 否（纯核查） | 按 `dead-table-disposal-plan` §5.1 逐项签字：连接白名单、`pg_stat_statements`、复制槽/订阅、外部报表/ETL 清单、库内 job、最近访问时间；207 张逐表有“无外部消费”结论或剔除出候选 |
| R3-1 | 死表批 1：19 张 | 迁移 `20261119100000` 已出、未应用；隔离库演练已过（19 表/14 策略/1 视图可恢复） | DBA 签字 + 生产备份 + 窗口；技术无新增阻塞 | 是（D-6：窗口授权与 DBA 签字） | 是 | 账本 +1；业务 schema 表数 −19；`archive` 新增 19 张归档表 + 6 张元数据表（总 `r,p` 净 +6）；策略数 −14；视图 −1；归档表 19 张齐全且 0 行；业务参考数据不变；无 42P01/5xx；回滚演练可恢复 |
| R4-1 | 死表批 2：188 张 | 迁移 `20261119110000` 已出、未应用；隔离库演练已过（188 表/116 策略/30 条内聚 FK/1 序列可恢复） | 硬依赖批 1 观察 ≥7 天；DBA 对批 2 外部消费再次确认；生产备份 | 是（D-7：观察判据与放行） | 是 | 批 1 观察期内无 42P01、无 5xx 抬升、DBA 无外部报错；账本 +1；业务 schema 表数 −188，`archive` +188（总 `r,p` 不变）；策略数 −116；FK −30；归档表 188 张齐全且 0 行；序列回滚可恢复；参考数据不变 |
| R5-1 | 归档候选 139 | 只有逐表登记，无迁移草案、无目标 schema 方案 | 技术：归档 schema/权限/回滚；业务：历史数据保留口径 | 是（D-8：目标 schema 与时机） | 是（后续窗口） | 逐表映射到归档对象；代码零引用、生产 0 行；归档 schema 不进入 search_path；迁移与回滚在隔离库演练；外部消费确认 |

### 2.4 RLS 遗留、历史波次与大项（R5，按项立项）

| ID | 事项 | 现状 | 卡点（技术/业务） | 拍板 | 窗口/迁移 | 验收判据 |
|---|---|---|---|---|---|---|
| R5-2 | `bi.audit_logs` 的 `allow_all` 与 erp 合并报表 8 张 | `bi.audit_logs` 仓库与生产均为 `USING (true)`；另有 8 张 erp 合并报表族使用 `tenant_id = erp.group_tenant_of(GUC)`，需业务定性，不计入 318 张宽松表 | 业务：外部报表/合并口径是否依赖；技术：收紧后可能影响审计查询 | 是（D-10：是否收紧、何时收紧；8 张口径） | 是（策略变更窗口） | 收紧后 A/B 对比无未预期拒绝；审计查询/报表签字；8 张合并报表口径有书面结论；CI 策略形状门禁覆盖 |
| R5-3 | 空 GUC 策略形状 CI 门禁 | 318 张是早于 `20261118160000` 的重放中间态，不是仓库终态；终态 317/318 已收紧，唯一例外 `bi.audit_logs` 两侧同为 `allow_all`；76 张空串放行已随收紧修正。剩余是策略侧删除分支与 CI 形状门禁 | 技术：门禁规则与 allowlist | 否（allowlist 需复核） | 否（先 CI） | 门禁能拦截 `current_setting(...)= ''` / `IS NULL` / 零分支等宽松写法；allowlist 有理由与到期日；阴性用例能红；以终态重算而非 318 中间态作为基线 |
| R5-4 | 11-18 波次遗留：`scm` 影子/库存/双写 | `scm.wms_inventory_snapshots` 租户 NULL 与 `InventoryUpdated` 无发布方、`scm.supplier_products` 缺 `material_code`/`priority`、`scm.sync_record_details` 键语义、库存看板死投影、`erp.materials`/`pdm.pdm_materials` 双活跃写等仍是 11-18 排期遗留 | 技术 + 业务：**11-18 的“加列/改键”方案与 11-19 收口结论（影子表、权威在 SRM/WMS）存在冲突**，需先统一口径 | 是（D-11：以 11-19 收口为准还是重开方案） | 部分需要（库存回填/双写收敛） | 先出“冲突项对照表”，每条只保留一个方案；再按方案实施；未统一前不动迁移与代码 |
| R5-5 | 大项：materials 收敛、看板、EHS 57、WMS B、M-3 | 11-18 文档中的 W5 大项，均为触发式，未进入当前三张清单 | 业务优先级与前置条件 | 是（按触发条件逐项） | 视项而定 | 触发条件、验收判据沿用 11-18 文档；未触发不排期、不占窗口 |

---

## 3. 波次、排序依据与出口条件

### 3.1 R0：可信基线（本机，阻断所有窗口）

**包含**：R0-1 推送/CI、R0-2 测试 DSN、R0-3 门禁验证、R0-4 迁移状态一致性、R0-5 读数模板、R0-6 本机 dev 账本漂移（非窗口阻断项）。

**为什么排第一**：

- 13 条 commit 的推送结果决定后续二进制从哪个 SHA 构建；未确认前开窗，等于用不可追溯的件做生产变更。
- 测试 DSN 污染会让测试/门禁结论本身失真；11-18 已有测试进程连到 `topems_prod` 镜像，属于已发生事件，不是假设风险。
- 两个门禁目前靠快照库豁免跑通，绿色只代表“脚本能跑”，不代表“发布可过”。
- `20261118124000` 的 manifest 与运行手册冲突，若不先核对，`apply-forward` 可能在 R2 出现“多应用/漏应用”的意外。

**出口条件**：R0-1、R0-2、R0-3、R0-4 全部有书面结果；R0-2、R0-3 的验收必须包含阴性用例；未满足则 R2 及以后不得开窗，除非用户明确签署豁免并记录“本次不使用门禁绿色作为发布判定”。

### 3.2 R1：功能与结构收口（本机，可与 R0 并行）

**包含**：R1-1 至 R1-7，以及 R3/R4 的本地预演、R5 的方案草案。

**为什么可与 R0 并行**：两者都不触生产；R1 的产出是决策与预演，不依赖 R0 的推送结果。唯一互斥是 `database/migrations/**` 与 manifest：R1 只读引用，不得与 R0-4 同时编辑同一文件。

**出口条件**：11 条半成品、6+4 条残留/影子、10 条禁用全部有处置结论；IAM、ERP 两条耦合项有“同窗口/屏蔽”的明确发布方案；ERP 与 IAM 迁移在隔离库预演通过；死表外部消费取证包已送 DBA。

### 3.3 R2：第一个生产窗口（功能耦合项）

**候选内容与顺序**：

1. `R2-1`：`20261119120000` ERP 行项目（必选，业务确认后）。
2. `R2-2`：`20261119010000` IAM ACL（若 D-3 决定保留后端/建设前端，则同窗口；若决定暂不暴露，则本窗口不应用，或在发布中屏蔽 grant/revoke 路由）。
3. `R2-3`：`20261118124000`（仅当 D-2 决定应用；否则保持 defer 并把 manifest 改成与账本一致）。

**窗口内顺序**：

```text
只读前置读数 → 备份 → 逐条迁移（单事务、单写者）
  → 每条迁移后读数
  → 换二进制（代码耦合项）
  → 健康检查 + 冒烟
  → 窗口后读数
```

**为什么 ERP 先于死表批 1**：ERP 是功能缺口，迁移与代码都已就绪，且不依赖 DBA 外部消费签字；死表批 1 的唯一外部阻塞是 DBA 签字。两者没有业务依赖，但受“迁移单写者”约束不能并行。若 DBA 签字先到且用户要求先做死表，可交换 R2/R3 顺序，但必须在文档中记录交换理由，且仍不得并行。

**出口条件**：账本、表数、策略数、行数 delta 与预期一致；ERP 写入与 MRP 读取冒烟通过；IAM（若上）grant/revoke 冒烟通过；二进制 SHA 与已验证 commit 一致；无 42P01/5xx。

### 3.4 R3：死表批 1 窗口（19 张）

**前置**：X-1 对批 1 的 DBA 书面确认；生产备份可用；回滚脚本已演练；R0 的读数模板与门禁口径已固定。

**为什么必须单独窗口**：批 1 是第一次大规模 `DROP TABLE`，需要把“外部消费签字、备份、回滚、观察”四件事绑在一个可审计窗口里；与 ERP/IAM 混在一起会放大故障定位难度。

**出口条件**：见 R3-1 验收；观察期从窗口结束时刻开始计时。

### 3.5 R4：死表批 2 窗口（188 张）

**前置**：批 1 观察 ≥7 天且判据全部满足；DBA 对批 2 再次确认；备份与回滚演练完成。

**为什么必须串行**：批 2 的 188 张包含 30 条内聚 FK、116 条策略、1 个序列，爆炸半径远大于批 1；设计上已规定“批 1 观察 ≥7 天再放行”，这是硬约束，不得用“批 1 看起来没事”提前。

**出口条件**：见 R4-1 验收；观察期结束后再进入 R5 的归档 139。

### 3.6 R5：归档 139、RLS 遗留与大项（按项立项）

**顺序建议**：R5-1 归档 139 → R5-2 `bi.audit_logs` / R5-3 策略形状门禁 → R5-4 历史波次遗留 → R5-5 大项。

**为什么排最后**：归档 139 与批 2 都是 schema 大变更，放在同一时期会增加锁与回滚复杂度；RLS 策略收紧需要业务确认外部报表依赖；大项本身是触发式，不应抢占当前窗口。

---

## 4. 并行与串行

### 4.1 可并行

| 并行组 | 内容 | 前提 |
|---|---|---|
| P-A | R0-2 测试 DSN、R0-3 门禁夹具、R0-4 迁移状态核对 | 三者改不同文件；R0-4 只读；不得同时编辑 `database/migrations/**` |
| P-B | R1-1/R1-2/R1-3 功能分诊、R1-6 e2e、R1-7 复跑 | 均为本机/测试，不触生产 |
| P-C | R1-4 前端与后端、R1-5 ERP 预演 | 代码目录不同；迁移文件冻结，只读引用 |
| P-D | X-1 DBA 外部消费核查 | 外部执行，与 R0/R1 无文件冲突 |
| P-E | R5-1 归档方案、R5-3 策略门禁开发 | 只出草案/CI，不应用生产 |

### 4.2 必须串行

| 串行链 | 原因 |
|---|---|
| R0-1 推送/CI → 任何窗口 | 二进制必须来自已验证 commit；未确认的推送结果不能作为发布基线 |
| R0-2 测试 DSN → 任何“测试通过”结论 | 测试可能连到生产镜像，结论会被污染 |
| R0-3 门禁验证 → 任何“门禁绿”发布判定 | 当前绿色来自豁免，不是发布级证据 |
| R0-4 `20261118124000` 状态核对 → R2 迁移应用 | 状态双源会导致 apply-forward 多应用/漏应用 |
| R2 内：迁移 → 换二进制 | ERP/IAM 新代码依赖新表/新列；顺序反了会缺表/缺列 |
| R2 → R3 → R4 的迁移应用 | 迁移单写者、manifest/checksum 单写者；不得并行开窗 |
| R3 批 1 → ≥7 天观察 → R4 批 2 | 设计硬约束；批 2 爆炸半径更大 |
| R5-1 归档 139 → 批 2 之后 | 避免同期大规模 schema 变更叠加 |
| R1-4 IAM 决策 → 前端/后端实现 → `20261119010000` 应用 | 未决定是否暴露前，不应把 ACL 能力当成已交付 |

---

## 5. 三类工作划分

### 5.1 本机可完成

- R0-1 推送/CI 结果收口（只读核对与记录）。
- R0-2 测试 DSN 卫生修复与验证。
- R0-3 门禁夹具、非特权角色、阴性测试。
- R0-4 账本/manifest/运行手册一致性核对。
- R0-5 读数模板。
- R1-1 至 R1-3 功能分诊；R1-6 e2e；R1-7 复跑。
- R1-4 前端/后端实现（若决定建设）。
- R1-5 ERP 代码审查与隔离库预演。
- R3/R4 迁移在隔离库的复演与回滚演练。
- R5-1 归档 139 方案草案；R5-3 策略形状 CI 门禁。
- X-1 的仓库内取证包与 SQL 清单。

### 5.2 需要生产窗口

- R2-1 `20261119120000` + 二进制（ERP 行项目）。
- R2-2 `20261119010000` + 二进制（IAM ACL，按 D-3）。
- R2-3 `20261118124000`（仅当 D-2 决定应用）。
- R3-1 `20261119100000`（批 1，19 张）。
- R4-1 `20261119110000`（批 2，188 张）。
- R5-1 归档 139（后续窗口）。
- R5-2 `bi.audit_logs` 策略收紧（后续窗口，若决定做）。

### 5.3 需要 DBA 外部核查

| ID | 核查项 | 时点 | 产出 / 签字 | 阻塞 |
|---|---|---|---|---|
| X-1 | 207 张删除候选的外部 BI/报表/ETL、库内 job、CDC/复制、连接白名单、低频访问 | R3 前（批 1）、R4 前（批 2） | 逐表“无外部消费”结论或剔除名单；批 1/批 2 分别签字 | R3-1、R4-1 |
| X-2 | 归档 139 的外部消费与读取权限 | R5-1 前 | 逐表外部消费结论 + 归档后读取方式 | R5-1 |
| X-3 | 生产窗口前备份可用性、只读前置读数、连接白名单、复制/CDC 状态 | 每个生产窗口前 | 备份标识/校验、窗口前读数、连接清单 | R2/R3/R4 |
| X-4 | 批 1 观察期内的外部报错、慢查询、连接异常 | R3 后 ≥7 天 | 观察期日报/结论 | R4-1 |

> DBA 只做核查与签字，不代替业务拍板；任何“疑似仍在用”的表，先移出候选，不在窗口内强行 DROP。

---

## 6. 验证缺口专章

### 6.1 `check-ledger-ddl-drift` 与 `check-rls-permissions`

**现状**

- 两个门禁都缺少“非特权角色 + 真实 721 行账本”的连接。
- `check-ledger-ddl-drift` 已拒绝 superuser/BYPASSRLS，但当前用 `MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1` 在空账本快照库放行；空账本无法验证 721 行版本链与 DDL 的真实对应关系。
- `check-rls-permissions` 当前用 `RLS_PERMISSIONS_ALLOW_SUPERUSER=1` 在特权连接/特权目标角色上放行；脚本自身会打印“结论不可用于发布判定”。
- 两者都只能证明“脚本能跑”，不能证明“发布可过”。

**为什么必须修**

- `check-ledger-ddl-drift` 要证明仓库 migration 与实际 DDL/账本一致；空账本会掩盖缺版本、错版本与漂移。
- `check-rls-permissions` 要证明非特权角色在真实策略下可见/不可见正确；超级用户/BYPASSRLS 会绕过 RLS，使结论失真。
- 第 1 波后生产账本已是 721 行 / max `20261119000002`；夹具必须复现这个规模，否则测不到真实版本链。

**修复方案（R0-3）**

1. 建隔离夹具库 `topems_gate_20261119`：从生产快照做 schema-only 恢复，并恢复 `_sqlx_migrations` 的 721 行（或从生产只读导出账本后导入）；不复制业务数据。
2. 建非特权角色 `topems_gate`：无 SUPERUSER、无 BYPASSRLS、非表 owner；只授予门禁需要的 SELECT 与必要元数据权限。
3. 两个门禁统一指向夹具：`MIGRATE_URL` / `MIGRATION_DRIFT_DB_URL`（以及 `check-rls-permissions` 读取的 `DATABASE_URL` / `.env`）指向夹具；**清空所有豁免环境变量**（`MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER`、`RLS_PERMISSIONS_ALLOW_SUPERUSER`）。
4. 加阴性用例：
   - 人为改一条 DDL/账本 → `check-ledger-ddl-drift` 必须非 0。
   - 撤销一个关键表 SELECT 或加入宽松策略 → `check-rls-permissions` 必须非 0。
5. 输出必须记录：数据库名、连接角色、账本行数、max 版本、策略数、是否使用豁免；CI 归档该输出。
6. 发布判定使用“窗口前快照”而非陈旧快照；快照时间与窗口时间差超过约定阈值时，重新取证。

**验收判据**

- 非特权角色、721 行账本、零豁免，两个门禁均通过。
- 阴性用例均失败（非 0），且失败原因指向注入点。
- 输出中无“allow_empty_ledger / superuser / bypassrls”字样。
- 同一夹具上重复运行结果稳定。

#### 6.1.1 已执行：本机 `topems_prod` 镜像只读角色 `topems_drift`（2026-11-19）

范围：仅本机 `topems_prod` 镜像；不连接远程、不修改业务表、不给任何业务表读权限。

**建角色 SQL（已执行，用户批准）**

```sql
-- 以本机特权连接执行（socket peer / 管理角色）
CREATE ROLE topems_drift LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'pw';                    -- 口令只经 psql 变量传入，不落仓库

GRANT CONNECT ON DATABASE topems_prod TO topems_drift;
GRANT USAGE ON SCHEMA public, finance, mes, mobile TO topems_drift;

-- 账本与断言清单实际读取的 IAM 目录表（非业务表）
GRANT SELECT ON public._sqlx_migrations TO topems_drift;
GRANT SELECT ON public.core_permissions,
                public.core_role_permissions,
                public.core_roles TO topems_drift;
```

说明：`check-ledger-ddl-drift` 的 12 项断言中，`column_type` / `index_exists` / `constraint_absent` 只读 `pg_catalog`；`data_rows` 读取 `public.core_permissions` 等 3 张 IAM 目录表（`perm.batch16.*` 三项在 `20261107000012` 已记账时按 `skip_if_applied` 跳过，`perm.batch17.total_rows` 仍需读 `core_permissions`）。业务 schema（`erp` / `mes` 业务表 / `wms` 等）未授予任何 SELECT。

**口令传递**

- 口令由 `openssl rand` 生成，MBP 本机 `~/.pgpass`（`600`）保存，格式 `127.0.0.1:5432:topems_prod:topems_drift:<pw>`。
- 运行门禁时用 `PGPASSFILE=~/.pgpass`；不写 `.env`、不进 commit、不打印明文。

**验证结果（无任何豁免环境变量）**

```text
$ env -u MIGRATION_DRIFT_ALLOW_SUPERUSER -u MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER -u PGPASSWORD \
  PGPASSFILE="$HOME/.pgpass" \
  MIGRATION_DRIFT_DB_URL='postgresql://topems_drift@127.0.0.1:5432/topems_prod' \
  node scripts/migration/check-ledger-ddl-drift.mjs
[Gate DRIFT] 目标库 127.0.0.1:5432/topems_prod（...；来源 MIGRATION_DRIFT_DB_URL（环境变量））；断言 12 项
[Gate DRIFT] NOTE 3 项源迁移未记账，按规则跳过结构断言（非静默）：
  - perm.batch16.hrm_training_plan_rows（后续迁移 20261107000012 已记账，数据按设计移除）
  - perm.batch16.hrm_training_plan_grants（后续迁移 20261107000012 已记账，数据按设计移除）
  - perm.batch16.total_rows（后续迁移 20261107000012 已记账，数据按设计移除）
[Gate DRIFT] PASS 断言 12 项，记账校验 9 项，耗时 111 ms
exit=0
```

连接身份与账本（同一角色直查）：

```text
current_user=topems_drift, rolsuper=f, rolbypassrls=f
ledger_rows=721, max_version=20261119000002, success_true=721
mes.production_orders readable=false, erp schema USAGE=false
业务表可读数量=0（可读对象仅 _sqlx_migrations + 3 张 IAM 目录表）
```

结论：`check-ledger-ddl-drift` 已有“非特权 + 真实 721 行账本 + 零豁免”的发布级验证路径；`20261107000012` 的三项跳过是清单显式声明的设计下线，不是漂移。

**回滚（精确）**

```sql
REVOKE ALL ON public.core_permissions,
               public.core_role_permissions,
               public.core_roles,
               public._sqlx_migrations FROM topems_drift;
REVOKE ALL ON SCHEMA public, finance, mes, mobile FROM topems_drift;
REVOKE ALL ON DATABASE topems_prod FROM topems_drift;
DROP ROLE topems_drift;
```

```bash
# 删除本机口令记录（只删 topems_drift 那一行）
sed -i '' '/^127\.0\.0\.1:5432:topems_prod:topems_drift:/d' ~/.pgpass
```

回滚后验证：`SELECT count(*) FROM pg_roles WHERE rolname='topems_drift'` 为 0；`psql "postgresql://topems_drift@127.0.0.1:5432/topems_prod"` 认证失败。

**保留缺口**

- `check-rls-permissions` 仍缺非特权且可读策略/角色的连接；`topems_drift` 当前只授了 `_sqlx_migrations` 与 3 张 IAM 目录表，未授 `pg_policies` 之外的业务对象读取。若要它承担 RLS 巡检，需按 §6.3 的策略快照门禁另行授权（`pg_catalog` 默认可读，但策略实测可能需要业务表 USAGE/所有权语义），不能用豁免替代。
- `topems_gate` 夹具库方案（§6.1 修复方案 R0-3）仍适用于 CI；本机 `topems_drift` 只解决“本机 `topems_prod` 镜像”的验证路径，不替代隔离夹具与阴性用例。

### 6.2 测试 DSN 卫生

**事件与现状**

- `#[sqlx::test]` 在运行时读取调用者的 `DATABASE_URL`；测试代码本身不能为每个 test 指定独立 DSN。
- 11-18 已有测试进程连到 `topems_prod` 镜像，并生成 `_sqlx_test` schema；当天 15:40 已人工清理。这说明“测试误连生产镜像”不是理论风险。
- 仓库已有 `topems_test_support::sqlx_dsn_guard!()`，覆盖 57 个文件；但新文件需要手工加宏，运行脚本也未统一覆写 `DATABASE_URL`，手工 `export` 仍可绕过。
- 当前 `.env` 中 `DATABASE_URL` 指向本地 `topems`、`MIGRATE_URL` 指向 `topems`、`TEST_DATABASE_URL` 指向 `topems_test_runner`；这只是当前机器状态，不是强制约束。

**方案（分三层，R0-2）**

**P0 立即（不改业务代码）**

1. 所有测试入口脚本（`scripts/test/run-*.sh` 及等价包装）统一：
   - 要求 `TEST_DATABASE_URL` 非空；
   - 将子进程的 `DATABASE_URL` 覆写为 `TEST_DATABASE_URL`（或直接 `unset DATABASE_URL`，由测试框架只读 `TEST_DATABASE_URL`，需与现有 guard 兼容）；
   - 打印脱敏后的有效 DSN（隐藏密码）；
   - 任一条件不满足立即退出。
2. 加 `scripts/test/check-test-dsn.sh` 预检：`DATABASE_URL` 命中生产/镜像命名模式、或 `TEST_DATABASE_URL` 为空时失败。
3. CI 中显式设置测试 DSN；禁止在 CI 注入生产 secret。

**P1 结构性**

1. 全量覆盖 `#[sqlx::test]` 文件：CI 增加静态检查，统计 `#[sqlx::test]` 文件数与含 `sqlx_dsn_guard!()` 的文件数，二者必须相等；新文件未加 guard 直接红。
2. 非 `#[sqlx::test]` 但会连库的测试也纳入 guard 或统一测试 harness。
3. 测试角色 `topems_test_runner`：无 SUPERUSER、无 BYPASSRLS、非生产镜像 owner；撤销其在 `topems_prod` 镜像上的 CREATE 权限（如当前是 owner，需 DBA 评估改 owner 或换独立库）。
4. 建议测试目标使用独立库/实例，不复用 `topems_prod` 镜像名；guard 对 `topems_prod` 及同类命名直接拒绝。

**P2 检测与治理**

1. 定期在 `topems_prod` 镜像上扫描 `pg_namespace` 中 `_sqlx_test%`；发现即告警，清理必须由 owner 确认，不自动删。
2. 环境 provisioning 文档固定 `TEST_DATABASE_URL`；禁止把生产 `DATABASE_URL` 写进开发/测试 shell profile。
3. 每次门禁/测试报告记录“实际连接的数据库名 + 角色”，让误连可见。

**验收判据**

- `env -u DATABASE_URL TEST_DATABASE_URL=<test> cargo test ...` 能正常跑；`DATABASE_URL=<prod/镜像> TEST_DATABASE_URL=<test> cargo test ...` 必须快速失败。
- 测试入口脚本输出的有效 DSN 指向测试库，密码脱敏。
- CI 静态检查：`#[sqlx::test]` 文件与 guard 覆盖数一致。
- `topems_prod` 镜像中 `_sqlx_test%` schema 数为 0。
- 用一个“假生产 DSN”做负向演练，guard/预检必须拒绝。

**非目标**

- 本轮不改生产 DSN，不改生产 `.env`，不清理任何生产库对象。
- 不把“测试通过”建立在生产镜像上；镜像只用于只读核对，不作为测试目标。

### 6.3 策略期望快照门禁（P-3 落地设计）

**要解决的问题**

`check-ledger-ddl-drift` 只能证明“账本 + 列类型/约束/索引/少量数据行”一致，看不见策略。`20261114180000` 已证明：账本 `success=t`、checksum 与 sha384 一致，`pg_policies` 仍是旧形状（无 `group_tenant_of`，含 `app.rls_system` 旁路）。因此必须把策略本身做成可逐项比对的期望快照。

**产物**

| 产物 | 位置 | 说明 |
|---|---|---|
| 期望快照 | `database/rls_policy_expected.json` | 从仓库契约（迁移终态/隔离演练库）生成并评审后提交；不由生产反导 |
| 比对脚本 | `scripts/ci/check-rls-policy-snapshot.mjs` | 读取快照 + 目标库实测，逐项比对，fail-closed |
| 快照生成入口 | 同上 `--emit` | 仅用于初始化/评审，输出到 stdout，人工 diff 后提交 |
| 接线 | `.github`/`lefthook.yml`/`run-nightly-gates.sh` | PR 阶段静态校验快照格式；发布前用非特权连接跑实测比对 |

**比对维度（逐项相等）**

- 身份：`schemaname`、`tablename`、`policyname`、`cmd`
- 谓词：`qual`（`USING`）、`with_check`（`WITH CHECK`），按 PostgreSQL 规范化文本比较
- 表级标志：`pg_class.relrowsecurity`（ENABLE）、`pg_class.relforcerowsecurity`（FORCE）
- 角色范围：`roles`（`pg_policies.roles`）

**判定规则**

1. 快照中的每个 key（schema.table.policy + cmd）必须在实测中存在，且谓词/标志完全一致；缺失或文本不同 → FAILED。
2. 实测中同一批受管表出现快照外的策略 → FAILED（防止“新增宽松策略”绕过）。
3. 受管表的 `relrowsecurity=false` 或 `relforcerowsecurity=false`（快照要求为 true 时）→ FAILED。
4. 快照未覆盖的表不参与判定，但输出计数并在报告中标注覆盖面；扩大覆盖面只改快照，不改判定逻辑。
5. 账本/checksum 不作为通过依据；若账本包含某迁移但策略不匹配，仍 FAILED，并在失败信息中直接引用 `pg_policies` 实测值。

**初始化与评审**

1. 在干净 HEAD 的隔离演练库（§6.1 的 anchor drill 产物）执行 `--emit`，得到终态策略快照。
2. 人工 diff：只接受与 `20261114180000`、`20261118110000`、`20261119130000/131000` 等策略迁移终态一致的条目；生产旧形状不得写入快照。
3. 提交快照；PR 阶段只校验快照 JSON 结构与重复 key，不连库。
4. 发布前用非特权连接（本机可先用 `topems_drift`，CI 用 `topems_gate` 夹具）跑实测比对；输出记录库名、角色、受管表数、策略数、diff 数。

**阴性用例**

- 手工把一条策略改回 `app.rls_system` 旧形状 → 必须 FAILED，并指出表/策略/期望 vs 实际。
- 删除一条策略或 `NO FORCE ROW LEVEL SECURITY` → 必须 FAILED。
- 新增一条宽松策略（`USING (true)`）→ 必须 FAILED。
- 空快照/快照格式错误 → 必须 FAILED（不得静默 0 条通过）。

**当前状态**

- 设计已拍定并纳入强制巡检口径；脚本与快照尚未落地（本轮只完成 B/C 与文档口径）。
- 现有 `scripts/ci/check-rls-policy-shape.sh` 是静态形状检查，不替代实测快照比对。

---

## 7. 需要拍板的清单

| 编号 | 决策点 | 选项 | 建议 | 阻塞 |
|---|---|---|---|---|
| D-1 | 推送/CI 若红，是否改变推送策略 | 修复后重推 / 改变策略 | 修复后重推；禁止 force/amend/跳过钩子 | R2+ 全部 |
| D-2 | `20261118124000` 应用还是保持 defer | 应用 / defer 并修 manifest | 先只读核对账本；若账本无行且无功能需求，保持 defer，并把 manifest 改成与账本一致；不要隐式应用 | R0-4、R2 |
| D-3 | IAM 资源级 ACL 是否建设前端 | 建前端 / 仅后端并登记未暴露 | 若业务确需资源级授权则建最小可用前端；否则登记“未暴露”，不宣称闭环；无论哪种，后端路由与 `20261119010000` 必须同窗口或屏蔽 | R1-4、R2-2 |
| D-4 | ERP 是否为销售订单行项目权威写入 | 是 / 否 | 按迁移注释与代码现状，建议确认 ERP 权威；同时确认行项目字段、软删/重建、金额口径 | R1-5、R2-1 |
| D-5 | 11 条半成品如何处置 | 逐条建设 / 下线 / 登记未实现 | 默认“登记未实现”，只有业务给出上游数据源与口径才建设；禁止伪造数据 | R1-1、清单 1 收口 |
| D-6 | 死表批 1 是否开窗 | 开 / 延后 | 必须等 X-1 DBA 书面确认与备份；确认后开窗 | R3-1 |
| D-7 | 批 2 观察判据与放行 | 按 ≥7 天 / 延长 | 按 ≥7 天且无 42P01、无 5xx 抬升、DBA 无外部报错；任一异常延长观察 | R4-1 |
| D-8 | 归档 139 的目标与时机 | 归档 schema / 其他；批 2 后 / 更晚 | 建议批 2 之后，单独方案与窗口；不进入 search_path | R5-1 |
| D-9 | 测试 DSN 强制层级 | 仅脚本 / 脚本+guard+CI / 再加独立测试实例 | 建议脚本 + 全量 guard + CI 静态检查 + 独立测试角色；独立实例按资源条件推进 | R0-2 |
| D-10 | `bi.audit_logs` 是否收紧 `allow_all`；erp 合并报表 8 张口径 | 收紧 / 保留；8 张按 `group_tenant_of` 保留或改口径 | 先确认外部报表/合并依赖；无依赖则收紧并纳入策略形状门禁；8 张逐张给书面口径 | R5-2 |
| D-11 | 11-18 的 `scm` 影子表方案与 11-19 收口冲突 | 以 11-19 为准 / 重开方案 | 先出冲突对照表；同一张表只保留一个方案；未统一前不动迁移与代码 | R5-4 |

---

## 8. 停手条件与回滚原则

### 8.1 通用停手条件

- 前置读数（账本行数/max、表数、策略数、参考数据、二进制 SHA）与预期不符。
- 备份不可用、备份标识未记录、回滚脚本未演练。
- 迁移执行报错、超时、锁等待异常。
- 出现 42P01（表不存在）、5xx 抬升、跨租户数据异常。
- 二进制 SHA 与已验证 commit 不一致。
- 门禁使用了豁免变量，或测试连到了生产/镜像。
- DBA 外部核查未签字，或观察期判据未满足。

### 8.2 回滚原则

- 每条迁移必须有成对回滚脚本；回滚脚本按 version 精确删除自身账本行，幂等，不存在也不报错，并把账本行数断言写入脚本。
- DROP 类迁移的回滚只恢复结构/归档对象，不伪造业务数据；恢复后核对表数、策略数、FK、序列。
- 回滚后重新跑窗口前读数；未回到基线不得继续下一批。
- 不在同一窗口内“回滚后立刻重试”；先定位原因，再决定是否重开窗口。

### 8.3 窗口读数模板（建议固定）

| 项 | 窗口前 | 窗口后 | 预期 delta |
|---|---|---|---|
| 账本行数 |  |  | +迁移条数 |
| 账本 max 版本 |  |  | 本次最后一条 |
| 表数（r,p） |  |  | 按迁移说明 |
| 策略数 |  |  | 按迁移说明 |
| 参考数据行数 |  |  | 0 |
| 二进制 SHA |  |  | 已验证 commit |
| 备份标识 |  | — | 可恢复 |

---

## 9. 与既有文档的关系与本轮边界

- 本文不替代 `dead-table-disposal-plan-2026-11-19.md` 的逐表清单与 §5.1 核查表；R3/R4 的验收以该文档为准。
- 本文不重做 `functional-closure-closure-2026-11-19.md` 的 33 条结论；R1 只做处置分诊。
- 本文不重做 `table-disposition-2026-11-19.md` 的 477 张登记；保留 131 不再加工。
- 本文不改变第 1 波已闭环读数；所有窗口 delta 以窗口前实读为基准。
- 本轮实际动作：仅新增本文档。未应用迁移、未连接生产写入、未开窗、未改业务代码。

---

## 10. 下一步（按顺序）

1. 等 R0-1 推送/pre-push 结果；若红，先修复，不开窗。
2. 并行启动 R0-2、R0-3、R0-4，产出测试 DSN 验收、门禁夹具与阴性用例、`20261118124000` 状态结论。
3. 启动 R1-1 至 R1-3 分诊，形成 11+6+4+10 的处置表；同时送 X-1 取证包给 DBA。
4. 完成 R1-4/R1-5 的决策与隔离库预演，锁定 R2 窗口内容。
5. R0 出口条件满足后开 R2；R2 验收通过后再排 R3；R3 观察满 ≥7 天再排 R4。
6. R4 完成后再启动 R5-1 归档 139 与 RLS 遗留。
