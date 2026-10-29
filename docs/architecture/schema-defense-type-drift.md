# TABLE_DEFS ↔ 迁移 DDL 类型差异收敛报告（B 扩展终稿）

> 更新：2026-10-29 B 扩展三批修权威完成。门禁 `check-schema-defense.mjs` 最终 **errors=0、warnings=0、类型差异 0**（TABLE_DEFS PASS 408）。
> 数据源：门禁 `--drift-json`（唯一仲裁）。处置原则：契约优先修迁移；迁移 FK uuid 权威时修契约；JSONB/生成列语义不可逆项重建或改契约。

## 一、收敛路径

| 批次 | 内容 | 结果 |
|---|---|---|
| 提取器 3 连修 | `ALTER COLUMN TYPE` 支持（USING 截断）、迁移合并后写覆盖（svc 先、database/migrations 主权威最后）、数组类型 `(?:\[\])?` 可选后缀（修复 `\[\]?` 误解析为 `[` 必需导致的整列丢失回归） | 门禁恢复 errors=0 |
| 生成器 v1 | 71 处跨族差异（旧提取视图）→ 62 列自动生成 + 9 人工核 | 迁移 `20261029200000_schema_defense_type_align.sql` 首批 86 条 |
| 生成器 v2 | 以 `--drift-json` 为唯一仲裁重算：34 处跨族（门禁新视图），17 列自动生成 + 17 人工核 | 追加第二批（回改旧视图误向：inventory 3、documents 1）+ 数值/文本/vector/jsonb 互转 |
| 第三批 | 契约 UUID、迁移 varchar 5 列改迁移（USING ::uuid）；契约 TEXT、迁移 jsonb 2 列改迁移（USING ::text） | WARN 21 → 1 |
| 契约修正 | 迁移 uuid 权威侧 7 列契约笔误 varchar → UUID（wms/mobile/ehs/pm/qms/lims 6 文件） | WARN 1 → 0 |
| 第四批 | fixed_assets 生成列 float8 → NUMERIC(20,4)（DROP+ADD 重建 STORED 表达式） | 类型差异 0 |

## 二、最终处置明细（34 处跨族）

### 自动生成（24 列 → 迁移 `20261029200000_schema_defense_type_align.sql`）
- **数组族（18 列）**：TEXT[]/UUID[] 目标——`ARRAY[...]` 包层 + 契约 default 保留（core_* / customers / documents / finance_v5x / pdm_* / push_notifications / ticket_knowledge_articles / media_files 等）
- **数值族（8 列）**：numeric(p,s)/double precision/int/bigint 契约优先 USING 无损转换（bank_accounts、discrepancy_records、inbound_orders 6、production_orders 2、production_records、supplier_admissions、documents.file_size、inventory 3 回改、core_workflow_tasks）
- **文本化（2 列）**：supplier_admissions.registered_capital → varchar(50)、qa_eightd d1_team/d4_root_cause jsonb→text（::text）
- **vector（1 列）**：document_chunks.embedding jsonb → vector(1536)（`#>> '{}'` 取文本再 cast）
- **jsonb 收敛（1 列）**：projects.tags text[] → JSONB（to_jsonb，修复 20260725000000 ADD JSONB 与 20261023000001 ADD text[] 双定义冲突）

### 契约修正（7 列 → 6 文件 schema_defense）
迁移侧 uuid 为 FK 权威，契约 varchar 为防御笔误：
| 表.列 | 文件 | 原契约 | 修正 |
|---|---|---|---|
| batches.warehouse_id / location_id / supplier_id | svc/wms/src/schema_defense.rs | VARCHAR(100) | UUID |
| patrol_records.checked_by | svc/mobile/src/schema_defense.rs | VARCHAR(100) | UUID |
| qa_ehs_hazards.reported_by | svc/ehs/src/schema_defense.rs（含 models/mod.rs 同段） | VARCHAR(64) | UUID |
| settlements.created_by | svc/pm/src/schema_defense.rs | VARCHAR(100) | UUID |
| qa_eightd_reports.created_by | svc/qms/src/models/schema_defense.rs | VARCHAR(64) | UUID |
| samples.created_by | svc/lims/src/models/schema_defense.rs | VARCHAR(64) | UUID |

### 生成列重建（2 列）
- fixed_assets.net_value / monthly_depreciation：FLOAT8 GENERATED → NUMERIC(20,4) GENERATED ALWAYS AS ... STORED（DROP COLUMN + ADD COLUMN 重建，表达式同型 numeric）

## 三、门禁机制升级（check-schema-defense.mjs）
1. `ALTER COLUMN ... TYPE ... USING` 提取（USING 表达式截断，避免吞入类型）
2. 迁移合并**后写覆盖**：svc/*/migrations 先、database/migrations 最后（主权威），同目录文件名排序；ALTER TYPE 覆盖 CREATE/ADD 早期定义
3. 类型正则支持数组后缀 `(?:\[\])?`（可选整组，修复 `\[\]?` 误解析）
4. `--drift-json <path>` 模式：导出列级差异（契约/迁移/族/schema），作为自动修复唯一仲裁数据源

## 四、残留说明
- 无跨族残留；同族口径差异（时区列族 timestamp↔timestamptz、文本列族 TEXT↔VARCHAR(n)）保留 INFO 观察（运行时无冲突）
- 迁移对存量库执行约束：varchar→uuid 5 列（audit_logs.resource_id、contracts.created_by、materials.created_by、reports.created_by、training_records.employee_id）USING ::uuid 要求存量值为合法 UUID；empty 库新建无风险
- WSL/协作机：拉取后跑 `bash scripts/migration/validate.sh` + 空库新建 + migrate.sh run + 服务启动回归（含本迁移幂等）
