# B79 · master-data 订阅状态读取过滤与取消写入口（2026-11-21）

## 现状（改动前）
- `master_data.mdm_subscriptions` 本地 0 行、无 CHECK；`SubscriptionStatus` 通过 serde 写库，读侧对集合外值静默回退 `Active`。
- 详情、升级前查询、升级后回读三处 SELECT 只按 id 读，损坏状态会被当成 active。
- 取消订阅 UPDATE 无起始态谓词，已到期/已取消可重复取消，0 行统一 404。

## 改动
1. `SubscriptionStatus` 增加 DB_VALUES、`from_db_str`、`as_db_str`、`cancel_from`（active/pending）。
2. 订阅详情、升级前/后回读、列表四处 SELECT 增加 `status IN ('active','expired','cancelled','pending')`，集合外状态不再进入读链路。
3. 取消订阅改绑枚举并增加起始态谓词；0 行返回 409“已到期、已取消或不存在”，不再把状态问题伪装成 404。
4. 升级请求在读取现状后校验状态解析，损坏状态 409。
5. 候选 CHECK 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql` 的四值 NOT VALID。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单元测试覆盖四值往返、未知值拒绝、cancel_from 不含 cancelled。
- 本地表 0 行，无存量需要归一。

## 残留
- 升级动作仍会把任何合法状态直接置为 active；若业务要求 expired 必须走续费而非升级，需要再拆动作。
- 生产若存在 suspended 等历史值，施加 CHECK 前需先盘点修订。
