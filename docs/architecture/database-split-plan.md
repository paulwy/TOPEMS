# TopEMS 数据库物理拆分预案（P1-2）

> **状态**：预案已定 + schema 归属评审完成 + **阶段 0（schema 归位）已执行落地（2026-08-31）** · **日期**：2026-08-31 · **归属待办**：P1-2（物理库拆分预案）
> **关联**：`docs/architecture/architecture-evolution-and-todo.md` · `database/postgres/init.sql` · `config/services.yaml` · **`database-schema-ownership-review.md`（归属评审报告）** · `TODO.md`（阶段 0 执行记录）

## 1. 现状基线（2026-08-31，阶段 0 执行后重测）

以下数据来自运行中的 `topems-postgres` 实例（docker，`pgvector/pgvector:pg18`），为阶段 0 schema 归位落地后的实测值：

| 指标 | 实测值 | 说明 |
|---|---|---|
| PostgreSQL 版本 | **18.6**（Debian pg18） | 文档多处标注 16，需同步修正 |
| 数据库总大小 | **~31 MB**（32,372,415 B） | 体量很小，远未触及单实例瓶颈 |
| 表总数 | **449 张**（20 个 schema） | 阶段 0 前 457 张（drop 5 双写冗余 + 1 残留） |
| public 承载表 | **37 张（8.2%）** | 阶段 0 前 219 张（48%），巨型堆已消除 |
| 最大业务 schema | **finance 58 张** | 阶段 0 前 erp 41 张 |
| RLS 覆盖 | **298 / 449（66%）** | 阶段 0 前 0%（P2-1 已启用，见 rls-coverage-report.md） |

### 表分布（按 schema，阶段 0 后）

| schema | 表数 | schema | 表数 |
|---|---|---|---|
| **finance** | **58** | pdm | 19 |
| erp | 41 | pm | 18 |
| **public** | **37**（平台 core_*/team*） | srm | 14 |
| **lims** | **31** | crm | 13 |
| **bi** | **31** | mobile | 10 |
| wms | 29 | integration | 9 |
| hrm | 28 | rs | 6 |
| **qms** | **26** | ai | 4 |
| **mes** | **26** | iam | 3 |
| **scm** | **26** | master_data | 0（已清空，保留空 schema） |
| gis | 20 | — | — |

> 新增 schema：lims / qms / mes / pdm / finance / master_data；`plugin_ai` / `plugin_mes` 残留已清理。

### 关键观察（阶段 0 后更新）

1. **public schema 巨型堆已消除**：219 张（48%）→ 37 张（8.2%），仅保留平台级 `core_*`（unified-core 域）与 `team*`，与"public=跨域共享"目标一致。
2. 阶段 0 执行中基于代码证据修正 11 项归属偏差（`bom_items`/`quality_records`→mes、`core_master_data_*`→public、refs→各业务服务），详见 `TODO.md` 阶段 0 记录。
3. 数据库 ~31MB、连接以 PgBouncer 汇聚，单实例容量与连接均无压力。

## 2. 拆分触发阈值（达到任一即启动评估）

| 阈值指标 | 当前值（2026-08-31 实测） | 触发值（建议） | 度量方式 |
|---|---|---|---|
| 数据库总大小 | **96 MB**（2026-08-31 实测，阶段 0 后 31MB→现 96MB） | **> 200 GB** | `pg_database_size` |
| 最大业务 schema 表数 | **public 262** / portal 120（独立服务） | **> 600 张** 或 schema 内单表 > 20GB | `pg_class` + 行数 |
| 活跃连接峰值（经 PgBouncer） | 开发单实例未压测 | **> 400** 持续 10 分钟 | PgBouncer stats |
| 跨 schema 查询占比 | 低（业务服务跨 schema 直读已清零，仅 4 项设计性 allow） | **> 30%** 查询跨 3+ schema | `pg_stat_statements` |
| 备份/恢复时间 | 秒级（整库 dump ~4MB） | **> 15 分钟** | RPO/RTO 实测 |

> **2026-08-31 阈值评估结论**：5 项阈值均未触发（DB 96MB vs 200GB、最大 schema 262 vs 600、跨 schema 直读清零、连接/备份无压力），**物理拆分不启动**，维持"阈值触发式"预案；待规模增长达任一阈值后再评估（见 §3 阶段 2）。阶段 1（逻辑隔离）已落地（门禁增强+基线显式化，见 §3）。

## 3. 分阶段迁移路径

### 阶段 0：schema 归位（先决条件，建议 1 个月内）
把 public 中按业务前缀归属的表迁入对应业务 schema，消灭"public 巨型堆"。

- 目标：public 仅保留跨域共享表（`core_*` 平台级、`conversion_*` 集成级）。
- 动作：`ALTER TABLE SET SCHEMA` + 更新 SQLx 离线缓存（`.sqlx/`）与代码中未带 schema 前缀的查询。
- 风险：涉及大量代码中的表名解析，需配合 `search_path` 兼容期。
- 产出：public 表归位清单（`qa_*→?`、`finance_*→finance`、`pdm_*→pdm`、`analytics_*→bi`、`material_*→erp`…），需业务 owner 确认 qa 域归属。

### 阶段 1：逻辑隔离 ✅（2026-08-31 已落地第一轮）
- 以业务 schema 为逻辑边界，明确"跨 schema 访问必须走服务 API 或集成事件"，代码层禁止跨 schema 直读。
- **本轮落地**：
  1. **门禁增强**：`scripts/check_schema_boundary.py` 新增**无前缀跨 schema 直读检测**——基于静态表归属映射 `scripts/schema_boundary_tables.json`（409 表单归属 + 16 同名多 schema），按各服务 `search_path` 解析裸表引用归属，非本服务 schema 即报违规。
  2. **服务覆盖补齐**：`schema_boundary.json` services 15 → 28（补 lims/mes/pdm/analytics/master-data/unified-core/monitor/portal/rd/search/ticket/tms/plugin-registry），各带 `schema` + `search_path`；清理失效 plugin_* allow。
  3. **存量显式化 + 增量阻断**：17 项既有无前缀跨 schema 引用入 `bare_ref_baseline`（输出"已知基线"不阻塞，标注处理建议）；**新增**无前缀跨 schema 直读/显式未授权引用 → 门禁 FAIL。已负向验证（master-data 新增 `FROM production_orders` → FAIL）。
  4. **修复检查工具别名误报**：`extract_schema_refs` 排除本 SQL 已声明的表别名（如 mes `FROM bom_items bi` 的 `bi.*` 不再误判为 bi schema）。
  5. **unified-core 显式跨 schema 只读** `portal.user_preferences` 入 allow（声明合法跨读）。
- **已知基线（17 项）✅ 已全部治理确认（2026-08-31）**：
  - communication→gis 3 项：✅ 已改走 gis HTTP API（历史完成）。
  - finance→pm/erp 4 项 / hrm→erp 2 项 / monitor→hrm/wms/pm 4 项 / ai/analytics→users：✅ 逐项代码核查**无 SQL 直读残留**（已改走 API 或本无直读）；erp→finance 直读本轮已改走 finance API（见 TODO 2026-08-31）。
  - unified-core audit_logs(同名多 schema)/users：✅ 维持声明——audit_logs 各业务 schema 自有（审计表设计如此，门禁 ambiguous 声明不阻塞）；users 平台契约保留 public。
- **同名多 schema 表（audit_logs 等 14 张）**：各服务自有同名表（audit_logs 18 个 schema 中 17 空 + shared 主表 345 行，代码按 search_path/显式前缀解析本服务表），门禁 `ambiguous` 声明不阻塞；**设计合理，无需物理收敛**，仅保持显式前缀规范。
- **待办（阶段 1 后续）**：已全部完成（17 项基线治理 + 同名多 schema 声明）；剩余为阶段 2 物理拆分（触发阈值达成后再做）。

### 剩余跨域白名单复核（2026-08-31）

当前 `schema_boundary.json` 仅 3 项 `allow` + 1 项白名单外合法引用，逐项代码核查：

| 白名单 | 引用位置 | 性质 | 复核结论 |
|---|---|---|---|
| ~~`hrm.allow=['mobile']`~~（已撤销） | svc/hrm/src/modules/attendance.rs | ~~历史考勤数据迁移只读~~ → **2026-08-31 已清理**：user_id 分支改走 `hrm.employees` 映射 → `hrm.attendance_records`，mobile 直读清除；`mobile.mobile_attendance` 0 行无影响 | ✅ **已治理**（allow 撤销，hrm 引用 226 无违规，292 测试通过） |
| `integration.allow=['qms','lims']` | svc/integration/src/qms_lims_ehs.rs | 集成编排事务**直写**（INSERT/UPDATE，经 `only_own_schema_query` 宏显式声明） | ✅ **成立**：跨域编排必须直写目标 schema 保证事务原子性，走 API 会破坏原子性；宏显式声明合规。 |
| `unified-core.allow=['portal']` | svc/unified-core/src/modules/iam/user/profile.rs | IAM 只读用户偏好（SELECT portal.user_preferences，notification_settings/shortcuts/language/timezone） | ✅ **成立**：用户偏好归 portal schema，unified-core 作为 IAM 平台核心只读消费，设计合理。 |
| ~~`shared-ai→hrm.vectors`~~（已治理） | lib/shared-ai/src/vector_store.rs | ~~AI 向量读写 hrm.vectors~~ → **2026-08-31 已迁移**：`hrm.vectors → ai.vectors`（迁移 20260831190900，数据 0 行，DROP 旧表）；引用仅 shared-ai 5 处，ai 服务边界 schema=ai 自有合法 | ✅ **已治理**（ai.vectors 自有 schema，门禁 ai PASS 引用 42，编译通过） |

**结论**：4 项设计性保留中 2 项**确认成立**（integration 直写、unified-core 只读），2 项**已治理**（hrm→mobile 清理+allow 撤销、shared-ai 向量迁移至 ai.vectors）；白名单剩余 2 项均确认成立，**无待处理项**。
- 引入 `schema-boundary-gate`（已有 `scripts/check_schema_boundary.py`）纳入 CI，阻止新增跨 schema 直连 SQL。

### 阶段 2：物理拆分（触发阈值达成后再做）
候选拆分域（按业务耦合度由高到低）：
1. **财务域**（finance/erp/billing 关联紧密）——如需拆分，先拆 finance
2. **制造域**（mes/pdm/qa）
3. **供应链域**（scm/wms/srm）

拆分方式：
- 每域独立 `CREATE DATABASE` + 独立连接串 + 独立 PgBouncer pool
- 通过 `config/services.yaml` 的 `database_url` 覆盖配置，服务级灰度切换
- 跨域数据需求走 `integration` 服务事件同步（已有 Redis Stream 基础）

## 4. 回退方案

- 拆分前保留完整逻辑备份（`pg_dump -Fc`），可整库回退。
- 灰度：按服务逐个切换 `DATABASE_URL`，任一服务回归即切回单库，其余服务不受影响。
- 数据一致性：跨域同步走事件（Redis Stream + DLQ），拆分期间允许短暂最终一致。

## 5. 建议与开放决策

1. **当前不拆**：~31MB 规模物理拆分只会增加运维复杂度而无收益，采纳"阈值触发式"预案。
2. **阶段 0（schema 归位）已完成（2026-08-31）**：public 219 → 37 张，建 lims/qms/mes/pdm/finance/master_data schema；执行中修正 11 项归属偏差（详见 `TODO.md` 阶段 0 记录与 §5.1）。
3. **待定项（阶段 0 后剩余）**：`public.core_*` 37 张平台级表是否迁入 `unified_core` schema（当前在 public 由 unified-core 服务拥有）；qa 域归属已随阶段 0 落定（lims/qms 分设）。
4. 文档版本同步：overview.md / 部署文档中 PG 版本统一为 18。

> 本预案为决策输入；阶段 0（schema 归位）与阶段 1 第一轮（逻辑隔离门禁）均已落地，阶段 2（物理拆分）待阈值达成后启动。

### 5.1 归属评审结论（2026-08-31）

详见 [`database-schema-ownership-review.md`](database-schema-ownership-review.md)。要点：

- **核心发现**：`lims`/`qms`/`mes`/`pdm` 声明专属 schema 但 DB 无此 schema，其表全部落 public——这是 public 巨型堆（219 张）主要成因。
- **public 219 张表已 100% 归类**（lims 31 / qms 27 / pdm 20 / mes 17 / finance 58 / bi 18 / erp 6 / master_data 8 / platform 保留 public 32 / integration 2）。
- **待确认项**（A-E）：qa 域两分（lab/lims→lims，其余→qms）；core_finance_*→finance 剥离；core_* 平台级保留 public；material_*→mes（备选 erp）；plugin_* 残留清理。
- **阶段 0 执行结果（2026-08-31，已落地）**：A–E 全部批准执行。建 lims/qms/mes/pdm/finance/master_data；182 张表 SET SCHEMA 归位 + drop 5 双写冗余 + plugin 清理；**执行中发现 11 项归属矩阵与代码证据偏差并修正**：
  - `bom_items`/`quality_records` → **mes**（mes 完整 CRUD/建表 def；pdm 用 `pdm_bom_items` 不同表、qms 不引用）
  - `core_master_data_*`/`core_mdm_*`（5 张）→ **public**（unified-core schema_defense 建表+读写，master-data 服务不引用）
  - `crm/scm_master_data_refs` → **crm/scm**（shared-db `MasterDataRefService` 无前缀，search_path 首位）；erp/pdm refs 已在各自 schema，master_data 冗余副本已 drop
  - 最终 master_data schema 清空（0 张，保留空 schema）
- **阶段 0 验证**：`cargo check --workspace` 0 error · 静态边界门禁 PASS · 216 表无前缀可达冒烟 · 精确扫描无前缀回归 0 项 · unified-core 连库自检 30 表一致 · 迁移备份 `/tmp/topems_pre_schema_migration.dump`。
