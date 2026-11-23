# 质量巡检状态守卫（B187）

日期：2026-11-23
表：`mes.quality_patrols.status`
枚举：`QualityPatrolStatus`（`svc/mes/src/modules/quality_management/patrol_status.rs`）

## 唯一值集

`pending` / `in_progress` / `completed`，默认 `pending`。

## 收口内容

| 入口 | 收口前 | 收口后 |
| --- | --- | --- |
| 列表过滤 | `status` 直接透传，`all` 会被当成值 | 先过 `from_db_str`，非法值 400；`all`/空串不过滤 |
| 创建 | `body.status` 原样落库，缺省 `pending` | 先过 `from_db_str`，非法值 400；缺省 `Pending` |
| 更新 | `body.status` 直接 `COALESCE` 绑定 | 先过 `from_db_str`，非法值 400；空串归一为不更新 |
| 响应兜底 | 4 处 `"pending"` | `QualityPatrolStatus::DEFAULT` |

## 数据库验证

- 约束：`ck_mes_quality_patrols_status_standard`，`convalidated = false`（NOT VALID）。
- 表 0 行、非法值 0 行。
- 负向验证：`status='bogus'` 插入被拒，事务回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：404 passed
