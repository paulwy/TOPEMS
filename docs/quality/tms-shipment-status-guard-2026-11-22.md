# B154 · TMS 运单状态收口（2026-11-22）

## 目标
`tms.tms_shipments.status` 收敛为唯一 Rust 枚举 `ShipmentStatus`，所有读写入口绑定枚举，非法值返回 400/409；候选 CHECK 实际应用到本地 `topems`。

## 枚举
`svc/tms/src/modules/shipment_status.rs`：

- 值：`draft / pending / in_transit / delivered / cancelled`
- 默认：`pending`
- `from_db_str` 做 trim + lower，兼容 `canceled → cancelled`，未知值返回 `None`
- 单测覆盖 roundtrip、默认值、大小写/美式拼写/未知值

## 代码接入
`svc/tms/src/modules/shipment.rs`：

- 列表 `status` 过滤严格解析，非法 400，SQL 绑定规范小写值
- 创建默认写 `ShipmentStatus::DEFAULT.as_db_str()`
- 发车/到达/取消/提交审批/审批/驳回统一：当前状态严格解析，状态机判断用枚举，UPDATE 的 `status` 与起始态谓词全部改为绑定参数，不再使用状态字面量
- 动作 UPDATE 返回 0 行统一返回 409（“运单状态已变化，请刷新后重试”），未再误报 404
- 提交审批、审批、驳回的 SQL 状态值与起始态均已绑定

## 本地 DB 应用
文件：`docs/database/tms-shipment-status-check-candidates-2026-11-22.sql`

- `ALTER COLUMN status SET DEFAULT 'pending'`
- 新增 `ck_tms_shipments_status_standard`，五值 CHECK，`NOT VALID`

本地核验：

- 约束存在：`convalidated=false`，定义含 `draft/pending/in_transit/delivered/cancelled`
- 非法值探针：`INSERT ... status='bogus'` 被 `ck_tms_shipments_status_standard` 拒绝，事务回滚后表仍 0 行
- 表存量：0 行

## 门禁
- `cargo clippy -p topems-tms --all-targets -- -D warnings`：PASS
- `cargo test -p topems-tms --lib`：175 passed / 0 failed
- 目录/盘点/队列刷新：
  - catalog：**288 条 CHECK / 5 ENUM / 434 无约束列**（B153 为 287/5/435）
  - 盘点：**209 Rust 枚举 / 192 值 / 70 不在 DB CHECK / 206 前端键 / 色板缺口 0**
  - 队列：**52 枚举 / 70 值全部 `internal_state`**（`persisted_unmapped=0`、`api_projection=0`）
  - `ShipmentStatus` 已登记 `tms.tms_shipments.status` 映射，不再出现在 `not_in_db_check`
- 前端键不在 DB CHECK：**83**（B153 记录 106，按本次目录重算）

## 边界
候选仅应用到本地 `topems`；生产快照 `topems_prod_verify_20261106` 只读，未应用。正式发布需执行候选并按窗口 `VALIDATE`。
