# B146 · MES APS 四列状态约束收口

日期：2026-11-22

## 范围

- `mes.capacities.status`（CapacityStatus，5 值）
- `mes.demand_forecasts.status`（DemandForecastStatus，6 值）
- `mes.material_plans.status`（MaterialPlanStatus，6 值）
- `mes.production_plans.status`（ProductionPlanStatus，6 值）

四表本地/生产快照均 0 行；代码侧枚举、严格解析、起始态谓词与写入口绑定已在此前批次完成，本轮补 DB 约束与队列映射。

## 本地应用

候选：`docs/database/mes-aps-status-check-candidates-2026-11-22.sql`

- capacities：默认 available、`NOT NULL`、五值 `NOT VALID`。
- demand_forecasts：默认 draft、`NOT NULL`、六值 `NOT VALID`。
- material_plans：默认 pending、六值 `NOT VALID`（列已 `NOT NULL`）。
- production_plans：默认 draft、`NOT NULL`、六值 `NOT VALID`。
- 生产快照未修改。
- `ConstraintStatus` 为 APS 求解过程态，不落库，标记非持久化。

## 队列

补四表映射并归档 ConstraintStatus，`resolved_enums` 129→134，MES 未解决枚举清零。

## 门禁

- `cargo clippy -p topems-mes --all-targets -- -D warnings` 通过。
- `cargo test -p topems-mes --lib` 384 passed / 0 failed。
- 盘点 208/191/152/206、队列 144/152 一致；request-txn 1651、scope-api 176/144 未增、txn-write-non2xx 通过。
