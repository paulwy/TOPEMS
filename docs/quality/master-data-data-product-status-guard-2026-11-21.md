# B80 · master-data 数据产品状态读取过滤与契约发布守卫（2026-11-21）

## 现状（改动前）
- `master_data.mdm_data_products` 本地 4 行全 published、无 CHECK；`DataProductStatus` 读侧用 `_ => Draft` 吞掉集合外值。
- 数据产品列表直接全表读取，损坏行会以 draft 展示。
- 写数据契约的 UPDATE 无条件把状态改成 published：已 deprecated / retired 的产品可被重新发布复活。

## 改动
1. `DataProductStatus` 增加 DB_VALUES、`from_db_str`、`as_db_str`、`publish_from`（draft/published；deprecated/retired 不允许复活）。
2. 数据产品读取统一加 `status IN ('draft','published','deprecated','retired')`，集合外状态不再展示。
3. `update_contract` 在写契约前先查当前状态：draft/published 允许；deprecated/retired 返回 409；不存在 404；状态非法 409。
4. 候选 CHECK 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql` 的四值 NOT VALID。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单元测试覆盖四值往返、未知值拒绝、publish_from 不含 retired。
- 本地演练（事务内 ROLLBACK）：1 行临时改 bogus 后全表 4 行、过滤后可见 3 行。
- 本地 4 行全 published，无需状态归一。

## 残留
- 契约写入的 UPDATE 仍是“先校验后更新”，并发窗口内状态若被改为 retired，仍可能被本次请求发布；下一批可把谓词下推到 UPDATE 并处理 0 行回滚。
- 数据产品没有显式弃用/退役接口，状态只能由外部治理流程写入。
