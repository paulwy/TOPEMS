# 质量巡检项目状态守卫（B188）

日期：2026-11-23
表：`mes.quality_patrol_items.status`
枚举：`QualityPatrolItemStatus`（`svc/mes/src/modules/quality_management/patrol_item_status.rs`）

## 唯一值集

`pending` / `pass` / `fail`，默认 `pending`。

## 收口内容

| 入口 | 收口前 | 收口后 |
| --- | --- | --- |
| 添加巡检项目 | `body.status` 原样落库，缺省 `pending` | 先过 `from_db_str`，非法值 400；缺省 `Pending` |
| 更新巡检项目 | `body.status` 直接 `COALESCE` 绑定 | 先过 `from_db_str`，非法值 400；空串归一为不更新 |
| 列表与响应兜底 | 与巡检主状态枚举混用或字面量 | 统一为 `QualityPatrolItemStatus::DEFAULT` |
| 巡检主状态兜底修正 | 列表另有一处 `"pending"` 字面量 | 改为 `QualityPatrolStatus::DEFAULT` |

## 前端色板

`pass` → `success`，`fail` → `error`，已补入全局 `STATUS_COLOR_MAP`，色板缺口回到 0。

## 数据库验证

- 约束：`ck_mes_quality_patrol_items_status_standard`，`convalidated = false`（NOT VALID）。
- 表 0 行、非法值 0 行。
- 负向验证：`status='bogus'` 插入被拒，事务回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：406 passed
