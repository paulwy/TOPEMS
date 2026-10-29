# TABLE_DEFS ↔ 迁移 DDL 类型差异待核清单（B 扩展首轮分流）

> 生成：2026-10-29 B 扩展（列级一致性校验）。分流：时区列族（timestamp↔timestamptz/timetz/time）与文本列族（TEXT↔VARCHAR/CHAR）归 INFO（同族口径差异，运行时无冲突）；跨族差异 = 真实漂移，列于本清单待核。
> 处置：真实差异需人工核对后修权威（迁移或 TABLE_DEFS）；同族差异如需收敛可后续统一口径。

共 59 处真实类型差异（跨族）。

| 表 | 列 | TABLE_DEFS 类型 | 迁移类型 |
|---|---|---|---|
| bank_accounts | balance | `DECIMAL(20,4) DEFAULT 0` | `DOUBLE PRECISION NOT NULL DEFAULT` |
| batches | available_quantity | `NUMERIC(18, 4) NOT NULL DEFAULT 0` | `double precision` |
| batches | quantity | `NUMERIC(18, 4) NOT NULL DEFAULT 0` | `double precision` |
| batches | warehouse_id | `VARCHAR(100) NOT NULL` | `uuid …(+4)` |
| core_doc_documents | tags | `TEXT[]` | `text` |
| core_guide_progress | completed_lessons | `UUID[] NOT NULL DEFAULT '{}'` | `UUID` |
| core_plugins | tags | `TEXT[]` | `TEXT` |
| core_tenants | quota_plugins | `TEXT[]` | `TEXT` |
| core_tickets | tags | `TEXT[]` | `text` |
| core_workflow_tasks | priority | `TEXT` | `integer default` |
| customers | revenue | `DECIMAL(15,2)` | `DOUBLE PRECISION` |
| customers | tags | `TEXT[] NOT NULL DEFAULT '{}'` | `TEXT` |
| discrepancy_records | counted_quantity | `NUMERIC(15, 2) NOT NULL` | `double precision` |
| discrepancy_records | discrepancy_quantity | `NUMERIC(15, 2) NOT NULL` | `double precision …(+1)` |
| discrepancy_records | system_quantity | `NUMERIC(15, 2) NOT NULL` | `double precision` |
| documents | tags | `TEXT[]` | `text` |
| documents | version | `VARCHAR(20)` | `INTEGER` |
| finance_v56_tax_suggestions | action_items | `TEXT[]` | `text` |
| finance_v57_analysis_dimensions | hierarchy | `TEXT[]` | `text` |
| finance_v57_analysis_results | dimensions | `TEXT[] NOT NULL` | `text` |
| finance_v57_analysis_results | measures | `TEXT[] NOT NULL` | `text` |
| finance_v57_forecast_models | features | `TEXT[]` | `text` |
| finance_v58_cash_pools | entities | `TEXT[] NOT NULL DEFAULT '{}'` | `text` |
| fixed_assets | monthly_depreciation | `DECIMAL(20,4)` | `float8 generated always as ((original_value - salvage_value)` |
| fixed_assets | net_value | `DECIMAL(20,4)` | `float8 generated always as (original_value - accumulated_depreciation)` |
| inventory | available_quantity | `DOUBLE PRECISION NOT NULL DEFAULT 0` | `numeric(15, 2)` |
| inventory | quantity | `DOUBLE PRECISION NOT NULL DEFAULT 0` | `numeric(15, 2)` |
| inventory | reserved_quantity | `DOUBLE PRECISION NOT NULL DEFAULT 0` | `numeric(15, 2)` |
| locations | capacity | `NUMERIC(15, 2)` | `double precision` |
| locations | position | `JSONB NOT NULL` | `character varying(50)` |
| media_files | tags | `TEXT[]` | `text` |
| patrol_records | checked_by | `VARCHAR(100) NOT NULL` | `uuid` |
| pdm_document_versions | changes | `TEXT[] NOT NULL DEFAULT '{}'` | `text` |
| pdm_project_phases | deliverables | `TEXT[] DEFAULT '{}'` | `text` |
| project_members | allocation | `DOUBLE PRECISION DEFAULT 1.0` | `numeric(5,2)` |
| project_members | cost_rate | `DOUBLE PRECISION` | `numeric(10,2) …(+2)` |
| project_members | hourly_rate | `DOUBLE PRECISION` | `numeric(10,2)` |
| push_notifications | target_ids | `TEXT[] NOT NULL` | `text` |
| qa_ehs_hazard_factors | affected_positions | `JSONB` | `TEXT` |
| qa_ehs_hazard_factors | sources | `JSONB` | `TEXT` |
| qa_ehs_hazardous_materials | hazard_class | `JSONB` | `VARCHAR(32)` |
| qa_ehs_hazards | reported_by | `VARCHAR(64)` | `UUID` |
| replenishment_suggestions | available_stock | `DECIMAL(18,4) DEFAULT 0` | `double precision` |
| replenishment_suggestions | current_stock | `DECIMAL(18,4) DEFAULT 0` | `double precision` |
| replenishment_suggestions | safety_stock | `DECIMAL(18,4) DEFAULT 0` | `double precision …(+4)` |
| rfm_results | frequency | `INTEGER NOT NULL DEFAULT 0` | `DOUBLE PRECISION` |
| rfm_results | monetary | `DECIMAL(15,2) NOT NULL DEFAULT 0` | `DOUBLE PRECISION …(+1)` |
| rfm_results | recency_days | `INTEGER NOT NULL DEFAULT 0` | `DOUBLE PRECISION` |
| stock_take_items | counted_quantity | `NUMERIC(15, 2)` | `double precision` |
| stock_take_items | discrepancy_quantity | `NUMERIC(15, 2) DEFAULT 0` | `double precision …(+2)` |
| stock_take_items | system_quantity | `NUMERIC(15, 2) NOT NULL` | `double precision` |
| stock_takes | end_time | `TIME` | `time without time zone` |
| stock_takes | start_time | `TIME` | `time without time zone` |
| stock_takes | total_quantity | `NUMERIC(15, 2)` | `double precision …(+3)` |
| supplier_delivery_appointments | delivery_time | `TIME` | `time without time zone` |
| supplier_delivery_appointments | expected_arrival_time | `TIME` | `time without time zone` |
| ticket_knowledge_articles | keywords | `TEXT[] NOT NULL DEFAULT '{}'` | `text` |
| transfers | end_time | `TIME` | `time without time zone` |
| transfers | start_time | `TIME` | `time without time zone` |
