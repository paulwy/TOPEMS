# TopEMS Schema 归属评审（P1-2 阶段 0 前置）

> **状态**：评审报告（待架构负责人确认归属后进入执行） · **日期**：2026-08-31
> **关联**：`database-split-plan.md`（物理拆分预案）· `architecture-evolution-and-todo.md`（P1-2）
> **数据来源**：`topems-postgres`（pgvector/pgvector:pg18）实测定量 + 各服务 `schema_defense.rs` 声明

## 1. 评审结论摘要

1. **确认不进行物理拆分**（维持预案结论：29MB / 457 表远未达阈值），阶段 0「schema 归位」为当前唯一必要动作。
2. **核心发现**：`lims` / `qms` / `mes` / `pdm` 四个服务在 `schema_defense.rs` 中**声明了专属 schema**（`lims`/`qms`/`mes`/`pdm`），但**数据库中这些 schema 并不存在**，其业务表全部落入了 `public`。这是 public 巨型堆（219 张，48%）的主要成因。
3. **public 219 张表可 100% 归类**，无不可归属表；目标 schema 覆盖 11 个（lims/qms/mes/pdm/finance/bi/erp/master_data/platform/integration 保留 public）。
4. **qa 域建议两分**：`qa_lab_*` + `qa_lims_*`（31 张）→ `lims`；其余 `qa_*`（27 张，质量体系 apqp/fmea/spc/audit/corrective）→ `qms`。此点需业务 owner 确认（见 §4）。
5. `core_finance_*`（10 张）建议从 `core_` 前缀剥离归入 `finance`；`core_*` 平台级（30 张）保留 `public` 作为平台 schema（unified-core/iam 契约已有 `iam` schema，见 §4 决策项 B）。

## 2. 现状事实：声明 schema vs 实际表位置

| 服务 | schema_defense 声明 | 数据库实际 schema | public 中对应表 | 缺口 |
|---|---|---|---|---|
| lims | `lims` | ❌ 不存在 | `qa_lab_*`+`qa_lims_*`（31） | 表未归位 |
| qms | `qms` | ❌ 不存在 | `qa_*`（27）+`quality_records` | 表未归位 |
| mes | `mes` | ❌ 不存在（仅残留 `plugin_mes.audit_logs`） | `production_*`/`equipment`/`work_*`/`wip*`（17） | 表未归位 |
| pdm | `pdm` | ❌ 不存在 | `pdm_*`+`bom_items`（20） | 表未归位 |
| finance | `finance` | ✅ 存在（41） | `finance_*`（48）+`core_finance_*`（10） | 历史表未迁入 |
| analytics | `bi` | ✅ 存在（16） | `analytics_*`（13）+`report*`/`reports`（5） | 历史表未迁入 |
| erp | （schema_defense 路径不同） | ✅ 存在（41） | `material_*`（6） | 物料表未迁入 |

> 备注：`plugin_mes.audit_logs` / `plugin_ai.documents` 为各 1 张残留表（历史 `plugin_*` 命名遗留），建议随阶段 0 清理。

## 3. public 219 张表归属矩阵

| 目标 schema | 前缀 / 归属 | 表数 | 说明 |
|---|---|---|---|
| **finance** | `finance_*`（v54-v60 智能财务） | 48 | 风控/税务/分析/资金/反欺诈/调度 |
| **finance** | `core_finance_*` | 10 | 核心账务（vouchers/ledger/periods），core 前缀历史遗留 |
| **lims** | `qa_lab_*` / `qa_lims_*` | 31 | 实验室样品/方法/仪器/不确定度 |
| **platform（public 保留）** | `core_*` | 30 | users/roles/permissions/tenants/menus/doc/file/workflow/login/operation/guide/migration |
| **qms** | 其余 `qa_*` + `quality_records` | 27 | apqp/fmea/spc/audit/corrective/inspection |
| **pdm** | `pdm_*` + `bom_items` | 20 | BOM/物料/文档/项目/版本 |
| **mes** | `production_*` / `equipment*` / `work_*` / `wip*` / `capacities` / `batch_records` / `demand_forecasts` / `mes_qms_sync` | 17 | 生产/设备/工单/在制品/排程 |
| **bi** | `analytics_*` + `report*`/`reports` | 18 | 看板/数据集/报表 |
| **erp** | `material_*` | 6 | 物料 BOM/领退料/需求 |
| **master_data** | `core_master_data_*` / `core_mdm_*` + `*_master_data_refs` | 8 | 主数据及跨服务引用 |
| **platform（public 保留）** | `team*` | 2 | 团队（平台级） |
| **integration** | `conversion_*` | 2 | 跨模块转换规则/执行 |

**合计：219 张，全部归属，无待定。**

## 4. 待确认项与建议（需架构负责人落定）

### A. qa 域归属（预案待定项）
- **建议**：两分——`qa_lab_*`/`qa_lims_*` → `lims`（符合 lims 服务职责：样品/方法/仪器/不确定度）；其余 `qa_*` → `qms`（质量体系：apqp/fmea/spc/audit/corrective/inspection）。
- **备选**：全部并入 `qms`（lims 表也进 qms，但 lims 服务独立部署时无独立 schema 边界）。
- **理由**：与 lims/qms 服务的 `schema_defense` 声明一致，且与既有 `bi`/`finance` 的"服务= schema"约定对齐。

### B. core_* 平台级表去留（预案待定项）
- **建议**：30 张平台级 `core_*` + 2 张 `team*` **保留在 `public`**（作为平台 schema），不迁入 `iam`（iam 仅 3 张认证表 sessions/users/refresh_tokens，平台表留在 public 可避免破坏 unified-core 大量无前缀查询）。
- **但**：`core_finance_*`（10 张）剥离 → `finance`；`core_master_data_*`/`core_mdm_*`（5 张）→ `master_data`。
- **理由**：`core_finance_*`/`core_master_data_*` 属业务域，`core_` 前缀掩盖了真实归属，是归类最大模糊源。
- **平台共享层识别（2026-09-03 补充）**：保留 public 的 `core_*` 属**跨服务平台共享层**——unified-core 为 DDL 拥有者（schema_defense SERVICE_SCHEMA=public），但读写被多服务共享（ticket/communication/analytics/search/portal/finance 等，生产代码 440 处引用）。**DSH 边界模型应识别为「共享层」而非「unified-core 服务专属域」**；物理拆分的拆分单元映射已将其整层归入 `topems_core` 平台核心库，与本评审结论一致。

### C. material_* 归属（新识别待定）
- **建议**：`material_*`（6 张：boms/issue/return/requirement）→ **`mes`**（物料需求/领退料与生产强耦合，MRP 属 mes）。
- **备选**：→ `erp`（预案初稿建议 erp）。
- **理由**：`material_requirements` 由 mes MRP 驱动，`material_issues`/`material_returns` 为车间领退料；与 pdm 的 BOM 主数据通过 `master_data` 引用衔接即可。

### D. 跨域同步表
- **建议**：`mes_qms_sync` / `qa_qms_sync_records` 保留在各自业务 schema（mes / qms）作为域内同步记录；`conversion_*` → `integration`。

### E. plugin_* 残留
- **建议**：`plugin_mes.audit_logs` / `plugin_ai.documents` 随阶段 0 迁移至对应服务 schema（`mes`/`ai`）并 drop 残留 schema。

## 5. 阶段 0 执行路线（归属确认后）

1. **建缺失 schema**：`CREATE SCHEMA lims / qms / mes / pdm / master_data`（幂等，`integration` 已存在）。
2. **归位**：对上述归属矩阵逐表 `ALTER TABLE public.x SET SCHEMA <target>`（共 219 张；涉及外键/索引随表迁移，PostgreSQL 自动处理）。
3. **search_path 兼容期**：迁移期间保留 `public` 在 `search_path` 首位 + 服务级 `SEARCH_PATH` 显式设置（各服务 build 时已 set_var），避免代码中无前缀查询（`query!` 编译期受 search_path 影响）立即断裂。
4. **代码核对**：跑 `schema-boundary-gate`（已有 CI 门禁）+ 全量离线编译，修正带 `public.` 显式前缀的查询；`cargo sqlx prepare` 重生成 `.sqlx/` 缓存。
5. **验证**：`cargo check --workspace` 0 error + 各服务测试通过 + server 冒烟全 200。
6. **清理**：drop `plugin_mes`/`plugin_ai` 残留 schema（表已迁）。

## 6. 风险与影响

- **查询断裂风险**：`query!`/`query_as!` 在线编译依赖 search_path 解析——必须与"服务 build 时 set search_path"协同，按服务逐个迁移、逐批编译验证，不做一次性全量 `ALTER`。
- **外键跨 schema**：若 public 表之间存在跨目标 schema 的外键（如 `core_finance_*` ↔ `finance`），PostgreSQL 允许跨 schema 外键，但会削弱物理拆分能力；建议归位时一并收敛。
- **迁移可回退**：`ALTER TABLE SET SCHEMA` 可逆（迁回 public 即可）；执行前保留 `pg_dump -Fc` 全量备份。

---

## 7. 阶段 0 执行完成记录（2026-08-31）

> 待确认项 A-E 已全部执行落地（提交记录见 TODO.md）。物理库维持不拆分（29MB/457 表未达阈值）。

| 项 | 完成 | 提交 | 说明 |
|---|---|---|---|
| A qa 域两分 | ✅ | 4afa40cc6 | qa_lab_*→lims（12）；qa_ehs_*→**ehs**（~50，超原 A 项范围，EHS 域）；质量体系 qa_*→qms；78 张处理；ehs 测试加 search_path |
| B core_finance_* 剥离 | ✅ | ed6828def | 3 张 SET SCHEMA + 10 张同名归档（旧版数据保留 _archive_*） |
| B 子项 core_master_data_* | ✅ | 5c5eda8fe | 建 master_data schema + 5 张 SET SCHEMA（空表）；shared-db 默认表名加 master_data.* 前缀 |
| C material_* → mes | ✅ | 419a6d620 | 2 张 SET SCHEMA + 6 张同名归档 |
| D 跨域同步表 | ✅ | f1b298ed8 | 7 张归档（bi/integration/ehs/lims/qms 同名真相） |
| E plugin_* 残留清理 | ✅ | 多提交 | 全库 plugin_* SQL 引用清零 |

**阶段 0 结果**：public 410→400（活跃 299 + 归档 _archive_* 101，数据保留）；全量门禁 PASS；workspace 编译通过。

**遗留（下一轮候选）**：
1. `_archive_*` 101 张归档表确认无引用后清理；
2. core_crm_*/core_erp_*/core_hrm_* 等 core_* 业务表仍留 public（报告 B 项按"平台级"保留），后续可评估归位至各自业务域；
3. lims/qms 测试 qa_* 用例 `#[ignore]`（requires PostgreSQL），启用前需加 search_path。
