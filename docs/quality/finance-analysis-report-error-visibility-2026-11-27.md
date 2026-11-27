# Finance 分析报表「查询失败即归零」收口（B366，2026-11-27）

## 缺口

`svc/finance/src/modules/financial_reports.rs` 的 V321 十个分析报表 handler（业务概览、项目汇总、
月度趋势、部门汇总、账龄分析、凭证统计、现金流分析、费用分析、利润分析、财务总览）里，
每条聚合查询后面都是：

```rust
let voucher_count: i64 = sqlx::query_scalar(...).fetch_one(&mut scope).await.unwrap_or(0);
let type_rows: Vec<(String, Decimal, Decimal)> = sqlx::query_as(...).fetch_all(&mut scope).await.unwrap_or_default();
let total_revenue: Decimal = sqlx::query_scalar(...).fetch_one(&mut scope).await.unwrap_or(Decimal::ZERO);
```

16 处。数据库报错、列类型不匹配、RLS 事务失效时，这些端点一律返回 HTTP 200 + 全 0 / 空数组，
前端画出的是「本月收入 0、利润 0、凭证 0 张」——看起来像真的业务数据，不会触发任何告警。
财报场景下这比 500 更危险：错的数字会被人直接拿去用。

## 改动

16 处全部改成失败即返回错误：

```rust
let voucher_count: i64 = match sqlx::query_scalar(...).fetch_one(&mut scope).await {
    Ok(v) => v,
    Err(e) => {
        tracing::error!("[finance] 报表分析查询失败: {}", e);
        return crate::shared::err_resp(e);
    }
};
```

`crate::shared::err_resp` 本来就接受 `Into<TopemsError>`（`sqlx::Error` 已有 `From` 实现），
所以不需要新增错误类型；前端拿到的是标准错误结构，而不是一张假报表。

新增结构棘轮 `analysis_error_ratchet::analysis_handlers_do_not_swallow_query_errors`：
从 `V321: 10 个分析报表 handler` 标记往后扫源码，任何 `.unwrap_or…` 前 60 字节内出现 `.await`
即失败。（源文件含中文，切片按字节 + `from_utf8_lossy`，避免 UTF-8 边界 panic——第一版就是这么挂的。）

## 验证

- `cargo test -p topems-finance --lib`：1163 passed（含新棘轮）。
- `cargo clippy -p topems-finance --lib -- -D warnings`：干净。
- 报表写端点（submit/approve/reject/lock/unlock）里的 `financial_report_exists(...).unwrap_or(false)`
  保持不变：那里失败会被映射成 404「报表不存在」，语义偏差较小，已记入遗留。

## 遗留

- `financial_report_exists(...).unwrap_or(false)`（5 处）：存在性检查自身失败时返回 404 而非 500。
  改它需要把 `financial_report_exists` 的返回类型改为 `Result<Result<bool, sqlx::Error>, _>` 或换 helper，
  收益小于改动面，先记录。
- `svc/finance/src/modules/mod.rs` 还有 9 处同类吞错（模板用量统计、模板条目增改、排序、
  `get_next_voucher_no`、`get_opening_balances`、`list_expense_approvals`），下一批候选。
- 全仓按「`.await` 后紧跟 `.unwrap_or*`」口径统计约 474 处 / 125 个文件，最大集中在
  `unified-core/flow/monitor.rs`（56）、`srm/statistics.rs`（24）、`master-data/versioning_v54.rs`（20）。
  B365 证据文档里写的 409/133 用的是较松的窗口口径（把行字段 `try_get(...).unwrap_or_default()`
  也算了进去），以此处 474（含少量合理 `unwrap_or_else` 默认值）为准。
