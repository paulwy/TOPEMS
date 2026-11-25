# B306 Finance 会计期间结账/重开并发守卫（2026-11-25）

## 结论

`finance.core_finance_periods` 本地 1489 行、status 全部 `open`。HTTP 层 `/periods/open` 与 `/periods/close` 都先预读当前态，但后续 UPDATE 只按 `tenant_id/year/month` 定位：

- 重开分支只在内存判断 `closed`，并发期间若被其他请求改为 `closing`，仍会被无条件改回 `open` 并清空关闭痕迹。
- 关闭分支允许 `open/closing → closed`，但 UPDATE 无来源态谓词，预读后的并发重开或再次关闭会互相覆盖；0 行还会误报 404。

## 代码改动

- `open_period_v2` 的 `closed → open` 分支：UPDATE 增加 `AND status = $5`（`closed`），0 行返回 409“期间状态已变化，请刷新后重试”。
- `close_period_v2`：预读后保留当前态；UPDATE 增加 `AND status = $6`（精确当前 `open` 或 `closing`），0 行由 404 改为 409。
- 重复关闭 `closed` 仍保持幂等成功；`closing` 禁止直接重开的规则不变。
- 服务层 `open_period/close_period` 已有 `status = 'closed'` 与 `status IN ('open','closing')` 谓词，本批只补 HTTP 入口，未改服务层。

## 数据库

无 DDL。本地全部 `open`，关闭路径可直接命中；重开路径无 `closed` 存量，需后续结账数据触发。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib period` 83 passed。
- 本地数据核对：`core_finance_periods` `open` 1489 行。

## 遗留

期间表无删除入口；年结与损益结转走服务层，已有来源态谓词，不纳入本批。
