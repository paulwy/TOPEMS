# WMS 盘点差异调整状态治理（B121）

日期：2026-11-22
范围：`wms.discrepancy_records.adjustment_status`

## 问题

盘点差异调整状态存在四套口径：

- 后端写入 `pending / approved / rejected / completed`；
- 前端 `apps/web/src/api/wms/discrepancy.ts` 使用 `pending / approved / adjusted / rejected`，其中 `adjusted` 没有任何后端写入点，筛选该值只会得到空集；
- 列表 `adjustment_status` 直接拼 SQL，任意字符串都静默返回空集，不区分非法值；
- 创建、审批、调整、批量生成均以字面量写状态，数据库无 CHECK。

除状态本身外，本批还发现四处会造成错账或假成功的问题：

1. `create_discrepancy` 只用 `material_code` 关联库存，没有租户与仓库条件，同物料跨租户、跨仓时可能绑定到错误的库存行。
2. `approve_discrepancy` 的 UPDATE 没有租户、软删谓词，0 行时返回 400 而不是并发冲突 409。
3. `adjust_inventory` 更新差异状态时只带 `tenant_id`，没有 `adjustment_status = 'approved'` 起始态谓词；两个并发请求都可能完成库存增量并各自提交，造成重复调整。
4. `process_stock_take_discrepancies` 每次调用都会为同一盘点明细重新插入差异记录，没有“已存在则跳过”的判断；重复点击会生成重复差异。

本地与生产快照 `wms.discrepancy_records` 均为 0 行，列 `NOT NULL DEFAULT 'pending'`，原无状态 CHECK，无存量迁移压力。

## 决策

- 规范集合采用后端已有四值：`pending / approved / rejected / completed`，默认 `pending`。
- 生命周期：`pending -> approved|rejected`；`approved -> completed`；`rejected / completed` 为终态。
- 前端 `adjusted` 直接改为 `completed`，不保留只读映射：该值从未被后端写入。
- 列表/详情只返回规范集合内的行；非法筛选值 400。
- 审批、调整的 0 行统一 409，避免把并发状态变化误报为参数错误。

## 代码变更

新增 `svc/wms/src/modules/discrepancy_status.rs`：

- `DiscrepancyStatus` 四值、`DB_VALUES`、`DEFAULT = Pending`；
- `approve_from = ["pending"]`、`adjust_from = ["approved"]`；
- `is_terminal()`、`can_transition_to` 迁移矩阵；
- 2 个单测覆盖往返解析、默认值、终态与非法迁移。

`svc/wms/src/modules/discrepancy.rs`：

- 列表 `adjustment_status` 严格解析，`all`/空不过滤，非法值 400；SELECT 与 COUNT 增加规范集合过滤；
- 汇总统计 `pending/approved/completed` 改为绑定枚举值，不再写字面量；
- 详情增加规范集合过滤，集合外行 404；
- 创建：先解析租户，盘点明细、盘点单、库存三者按租户关联，库存再按盘点仓库匹配；状态由字面量改为绑定 `DEFAULT`；
- 审批：增加租户与软删谓词，目标状态绑定枚举，起始态 `pending`，0 行改 409；
- 调整：预读增加租户、软删、`approved` 起始态与规范集合；更新差异状态增加 `adjustment_status = 'approved'` 谓词，目标状态绑定枚举，杜绝并发重复调整；
- 批量生成：查询改为运行时 SQL，补租户、软删、仓库匹配，并用 `NOT EXISTS` 跳过已生成差异的盘点明细，避免重复点击重复插入。

前端 `apps/web/src/api/wms/discrepancy.ts`：

- `DiscrepancyRecord.adjustment_status` 与查询参数由四值（含 `adjusted`）收敛为 `pending / approved / rejected / completed`。

## 验证

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo fmt --all`：通过
- `cargo test -p topems-wms --lib`：`586 passed`（B120 为 584）
- Web `typecheck`：通过
- Web `lint`：0 errors（156 warnings，存量）
- `dump-status-code-inventory.mjs --check --strict-palette`：`199` 个 Rust 枚举 / `205` 个前端状态键一致，色板缺口 `0`
- `status-db-check-queue.mjs --check`：`138` 枚举 / `151` 值，分桶一致
- `verify-glossary.cjs --strict`：通过
- `check-i18n.cjs --mode=quality --strict`：通过

## 候选约束演练

候选文件：`docs/database/wms-discrepancy-status-check-candidates-2026-11-22.sql`
约束：`ck_discrepancy_records_adjustment_status_standard`，四值，`NOT VALID`，默认仍 `pending`。

本地事务内：

1. 加约束成功；
2. 插入盘点单、盘点明细、差异记录探针，差异状态缺省得到 `pending`；
3. 合法更新 `approved`、另插 `rejected` 成功；
4. 更新为 `adjusted` 触发 `23514 ck_discrepancy_records_adjustment_status_standard`；
5. `ROLLBACK` 后约束计数 `0`、差异表 `0` 行、默认仍 `pending`。

本地与生产快照预检：差异表均 `0` 行、原状态约束均 `0`。

关联与防重复演练（同一回滚事务）：

1. 用 `MAT-TEST-001`（本地存在于 3 个仓库）建立盘点单与盘点明细，盘点仓库指向 `1e1f6d48-3f93-4a4e-9706-8494750612d6`；
2. 新关联 SQL 命中该仓库库存 `69be34a4-1965-401a-a169-26e46e7de519`，不再随机命中同物料的其他仓库行；
3. 为该盘点明细插入 1 条差异后再跑批量候选查询，`NOT EXISTS` 将其排除，返回 `0` 行；
4. `ROLLBACK` 后盘点单、盘点明细、差异记录均未落库。

## 残留

- 候选 CHECK 尚未进入迁移、未在生产执行；生产加约束需窗口，先预检存量再 `NOT VALID`，核销后 `VALIDATE`。
- 批量生成只做到“同一盘点明细已有差异则跳过”；并发同时调用仍可能各插一条。彻底解决需要 `stock_take_item_id` 唯一约束/幂等键，待业务确认历史重复口径后再加。
- 差异记录 `discrepancy_type` 后端写 `over/under/none`，前端类型仍是 `surplus/shortage/damaged/expired`，契约不一致，本批未改。
- 前端创建请求仍带后端不接收的 `stock_take_id/inventory_id/material_code` 等字段，后端只取 `stock_take_item_id`，多余字段被忽略，本批未清理。
- 审批拒绝没有独立原因字段，只复用 `notes`。
- 库存调整只增减 `quantity / available_quantity`，不校验库位占用、批次或序列号维度。
