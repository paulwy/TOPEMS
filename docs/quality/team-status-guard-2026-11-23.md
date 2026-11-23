# 班组状态守卫（B185）

日期：2026-11-23
表：`mes.teams.status`
枚举：`TeamStatus`（`svc/mes/src/modules/team_status.rs`）

## 唯一值集

`active` / `inactive`，默认 `active`，与前端 `team.ts` 表单、筛选和色板一致。

## 收口内容

| 入口 | 收口前 | 收口后 |
| --- | --- | --- |
| 列表过滤 | `status` 直接透传（`all` 也会当值过滤） | 先过 `from_db_str`，非法值 400；`all`/空串不过滤 |
| 创建 | INSERT 硬编码 `'active'` | 参数 `$7` 绑定 `Active` |
| 更新 | `req.status` 直接 `COALESCE` 绑定 | 先过 `from_db_str`，非法值 400；空串归一为不更新 |
| 响应兜底 | `"active"` 字面量 | `TeamStatus::DEFAULT` |

## 数据库验证

- 约束：`ck_mes_teams_status_standard`，`convalidated = false`（NOT VALID）。
- 表 0 行、非法值 0 行。
- 负向验证：`status='bogus'` 插入被拒，事务回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：400 passed
