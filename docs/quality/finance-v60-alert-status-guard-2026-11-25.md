# B286 Finance V60 预警状态守卫（2026-11-25）

## 结论

`finance.finance_v60_alerts.status` 已有四态 CHECK（active/acknowledged/resolved/suppressed），但 `AlertStatus` 只定义了前三态，且确认/解决两个入口直接覆盖状态：

- `acknowledge_alert`：任意状态（包括 resolved/suppressed）都会被改成 acknowledged。
- `resolve_alert`：可从 active 直接解决，也可从 resolved/suppressed 再次“解决”。
- 两个入口都 `fetch_one`，预警不存在时返回数据库错误 500。

本批把枚举补齐到 DB 四态，并给确认/解决加状态机与并发谓词。

## 状态机

`svc/finance/src/modules/decision_v60.rs::AlertStatus`

- `active → acknowledged → resolved`
- `active / acknowledged → resolved`
- `active / acknowledged → suppressed`
- `resolved / suppressed` 为终态
- 确认目标为 acknowledged：active → acknowledged；已是 acknowledged 直接返回原记录
- 解决目标为 resolved：active/acknowledged → resolved；已是 resolved 直接返回原记录

## 代码改动

- `AlertStatus` 补 `Suppressed`、`from_db_str`、`can_transition_to`，补单测。
- `acknowledge_alert`：
  - 先读取整条 AlertV60；不存在返回 404。
  - 状态不在规范集合返回 400。
  - 已是 acknowledged 直接返回，不重复写 `acknowledged_at`。
  - UPDATE 增加 `AND status = 'active'`，0 行返回 400 并发冲突。
- `resolve_alert`：
  - 同上；已是 resolved 直接返回，不重复写 `resolved_at`。
  - UPDATE 增加 `AND status IN ('active', 'acknowledged')`，0 行返回 400。
- 返回类型从 `sqlx::Error` 收敛为 `TopemsError`，handler 的 `err_resp` 不变。

## 数据库

无 DDL。四态 CHECK 已存在，本地 `finance.finance_v60_alerts` 当前 0 行。

## 本地验证

- `EXPLAIN` 校验确认/解决两条 UPDATE，来源态条件均进入过滤。
- `cargo check -p topems-finance` 通过。
- `cargo test -p topems-finance alert_status --lib`：3 passed。
- 无迁移文件。

## 残留

- `suppressed` 目前没有业务写入口，仅枚举与状态机支持。
- 预警状态历史没有独立审计表，本批只保证当前态流转正确。
