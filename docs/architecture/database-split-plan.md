# TopEMS 数据库物理拆分预案（P1-2）

> **状态**：预案已定 + schema 归属评审完成（2026-08-31） · **日期**：2026-08-31 · **归属待办**：P1-2（物理库拆分预案）
> **关联**：`docs/architecture/architecture-evolution-and-todo.md` · `database/postgres/init.sql` · `config/services.yaml` · **`database-schema-ownership-review.md`（归属评审报告）**

## 1. 现状基线（2026-08-31 实测）

以下数据来自运行中的 `topems-postgres` 实例（docker，`pgvector/pgvector:pg18`）：

| 指标 | 实测值 | 说明 |
|---|---|---|
| PostgreSQL 版本 | **18.6**（Debian pg18） | 文档多处标注 16，需同步修正 |
| 数据库总大小 | **29 MB** | 体量很小，远未触及单实例瓶颈 |
| 表总数 | **457 张**（17 个 schema） | 见下方分布 |
| RLS 覆盖 | **0 / 457（0%）** | 全部 schema 均未启用 RLS（见 P2-1 报告） |

### 表分布（按 schema）

| schema | 表数 | schema | 表数 |
|---|---|---|---|
| **public** | **219（48%）** | crm | 12 |
| erp | 41 | mobile | 10 |
| wms | 29 | integration | 9 |
| hrm | 28 | rs | 6 |
| scm | 25 | ai | 4 |
| gis | 20 | iam | 3 |
| pm | 18 | plugin_ai / plugin_mes | 1+1 |
| bi | 16 | srm | 14 |

### 关键观察

1. **public schema 承载 48% 的表（219 张）**，按业务前缀组织（qa 57 / finance 48 / core 45 / pdm 19 / analytics 13 / material 6…），大量业务表并未归入各自业务 schema——这是当前最大的"数据边界不整洁"来源。
2. 业务 schema（erp/wms/hrm/scm 等）已存在且表量适中，天然可作为物理拆分边界。
3. 数据库 29MB、连接以 PgBouncer 汇聚，单实例容量与连接均无压力。

## 2. 拆分触发阈值（达到任一即启动评估）

| 阈值指标 | 当前值 | 触发值（建议） | 度量方式 |
|---|---|---|---|
| 数据库总大小 | 29 MB | **> 200 GB** | `pg_database_size` |
| 最大业务 schema 表数 | erp 41 | **> 600 张** 或 schema 内单表 > 20GB | `pg_class` + 行数 |
| 活跃连接峰值（经 PgBouncer） | 未达压力 | **> 400** 持续 10 分钟 | PgBouncer stats |
| 跨 schema 查询占比 | 低（public 聚合） | **> 30%** 查询跨 3+ schema | `pg_stat_statements` |
| 备份/恢复时间 | 秒级 | **> 15 分钟** | RPO/RTO 实测 |

> 结论：当前 29MB / 457 表远未达到物理拆分阈值，**不建议现在执行物理拆分**。

## 3. 分阶段迁移路径

### 阶段 0：schema 归位（先决条件，建议 1 个月内）
把 public 中按业务前缀归属的表迁入对应业务 schema，消灭"public 巨型堆"。

- 目标：public 仅保留跨域共享表（`core_*` 平台级、`conversion_*` 集成级）。
- 动作：`ALTER TABLE SET SCHEMA` + 更新 SQLx 离线缓存（`.sqlx/`）与代码中未带 schema 前缀的查询。
- 风险：涉及大量代码中的表名解析，需配合 `search_path` 兼容期。
- 产出：public 表归位清单（`qa_*→?`、`finance_*→finance`、`pdm_*→pdm`、`analytics_*→bi`、`material_*→erp`…），需业务 owner 确认 qa 域归属。

### 阶段 1：逻辑隔离（建议 2-3 个月内）
- 以业务 schema 为逻辑边界，明确"跨 schema 访问必须走服务 API 或集成事件"，代码层禁止跨 schema 直读。
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

1. **当前不拆**：29MB 规模物理拆分只会增加运维复杂度而无收益，采纳"阈值触发式"预案。
2. **优先做阶段 0（schema 归位）**：这是真正的技术债，比物理拆分更紧迫，且是未来拆分的先决条件。
3. **待定项**：qa 域（57 表）的业务归属需确认（独立 qa schema 还是并入 mes/质量域）；public 中 `core_*` 45 表的去留（平台级保留 vs 迁入 unified_core schema）。
4. 文档版本同步：overview.md / 部署文档中 PG 版本统一为 18。

> 本预案为决策输入，是否启动阶段 0 及 qa 域归属由架构负责人评审后落定。

### 5.1 归属评审结论（2026-08-31）

详见 [`database-schema-ownership-review.md`](database-schema-ownership-review.md)。要点：

- **核心发现**：`lims`/`qms`/`mes`/`pdm` 声明专属 schema 但 DB 无此 schema，其表全部落 public——这是 public 巨型堆（219 张）主要成因。
- **public 219 张表已 100% 归类**（lims 31 / qms 27 / pdm 20 / mes 17 / finance 58 / bi 18 / erp 6 / master_data 8 / platform 保留 public 32 / integration 2）。
- **待确认项**（A-E）：qa 域两分（lab/lims→lims，其余→qms）；core_finance_*→finance 剥离；core_* 平台级保留 public；material_*→mes（备选 erp）；plugin_* 残留清理。
- **阶段 0 执行路线**：建缺失 schema → 逐表 SET SCHEMA → search_path 兼容期 → 门禁/离线编译核对 → 清理 plugin 残留。
