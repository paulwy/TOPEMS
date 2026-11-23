# 在制品状态守卫（B186）

日期：2026-11-23
表：`mes.wips.status`
枚举：`WipStatus`（`svc/mes/src/modules/wip_status.rs`）

## 唯一值集

`pending` / `in_progress` / `completed` / `transferred`，默认 `in_progress`。

## 收口内容

| 入口 | 收口前 | 收口后 |
| --- | --- | --- |
| 列表过滤 | `status` 直接透传，`all` 会被当成值 | 先过 `from_db_str`，非法值 400；`all`/空串不过滤 |
| 创建 | INSERT 硬编码 `'in_progress'` | `$10` 绑定 `InProgress`，改为运行期 `query_as` + `WipCreateRow` |
| 更新 | `req.status` 直接 `COALESCE` 绑定 | 先过 `from_db_str`，非法值 400 |
| 删除资格 | `status IN ('completed','cancelled')`，`cancelled` 不在值集 | 改为 `$2` 绑定 `Completed` |
| 统计 | `WHERE status = 'in_progress'` | `$1` 绑定 `InProgress` |
| 响应兜底 | 3 处 `"in_progress"` | `WipStatus::DEFAULT` |
| 前端新建默认 | `pending` | `in_progress`，与后端一致 |

## 数据库验证

- 约束：`ck_mes_wips_status_standard`，`convalidated = false`（NOT VALID）。
- 存量 2 行 `in_progress`，非法值 0 行。
- 负向验证：存量行改 `bogus` 被拒，事务回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：402 passed
