# `GET /api/finance/vouchers` 间歇 500 排查记录

> 日期：2026-11-25 · 环境：本机（`localhost:3000` → unified-core 聚合 → finance 模块，直连 `127.0.0.1:5432`）
> 状态：**未结案，P3**（低频、非阻塞）；已定位到错误类型与最可能的机制，缺现场语料。

## 1. 现象

- `GET /api/finance/vouchers` 返回 500，响应体 `{"code":500,"message":"内部服务器错误"}`。
- 聚合层日志：
  `ERROR topems_shared_core::error::enhanced: 数据库查询错误: error returned from database: unnamed prepared statement does not exist at line 1672`
- PostgreSQL 侧（`postgresql-2026-11-25.log`）：`ERROR: unnamed prepared statement does not exist`，**没有 STATEMENT 行**——说明失败发生在 `Execute` 阶段，引用的 unnamed 语句在服务端已经不存在，PG 无法回显语句文本。
- 同接口重试即恢复：一次 3 连请求为 `200 / 500 / 200`。

## 2. 频率（PG 日志全量统计）

| 日期 | 次数 |
| --- | --- |
| 2026-11-18 ~ 11-22 | 0 |
| 2026-11-23 | 1 |
| 2026-11-24 | 0 |
| 2026-11-25 | 8（集中在手工批量巡检时） |

结论：低频偶发，不是持续性故障；除 finance 列表外，其它模块的同一时段请求均正常。

## 3. 已做的复现尝试（均未复现）

| 场景 | 结果 |
| --- | --- |
| 顺序 12 次请求 | 12/12 200 |
| 并发 30 次（`xargs -P 10`） | 30/30 200 |
| 终止 6 条 `topems-shared-runtime` 空闲连接后立即 10 次请求 | 10/10 200 |
| 临时 `log_statement='all'` 后重复上述场景 | 未产生新 26000，已把 `log_statement` 复位为 `none` |

## 4. 机制推断（按可能性排序）

1. **同一连接上的语句交错**。`lib/shared-db/src/database/mod.rs` 为修 H1（DDL 后陈旧元数据）显式设置了
   `PgConnection::statement_cache_capacity(0)`，代价是每条 SQL 都走**会话级唯一**的 unnamed 语句槽。
   只要该连接上有第二条语句在第一条 `Execute` 前发生 `Parse`，第一条就会以 26000 失败。
   本机是直连、无 PgBouncer，所以“跨后端”这类经典成因不存在，只能是**同连接并发**。
2. **请求事务被两个任务同时使用**。tenant 中间件把请求事务放进 `RlsTxnCell`（`Arc<Mutex<Option<Transaction>>>`），
   各模块通过 `Db::scope_with(&mut req_txn)` 借用同一连接；`ScopedTxn` 的 `Drop` 会 `tokio::spawn`
   一个后台回滚并登记 finalizer。若某处 handler 把 `ScopedTxn`/事务跨 `await` 共享或与后台任务重叠，
   就会出现 1 的时序。
3. **两段往返语句**。sqlx 对 `persistent(false)` 的查询先发 unnamed `Parse`、再发 `Execute`；若两段之间
   有别的语句插入，同样报 26000。已全仓 grep：`persistent(false)` 无调用，暂可排除。

`finance.services.finance.voucher::list_vouchers` 本身是单条 `query_as(...).fetch_all(&mut scope)`，
查询构造（`AssertSqlSafe` + 动态拼接 `$2/$3`）无异常，问题不在该 handler 的 SQL 上。

## 5. 下一步（建议按序）

1. **抓现场**：把 `log_statement='all'` 常驻 24 小时（本机），复现后按失败 `pid` 提取该连接前后 20 条语句，
   即可判定是“交错”还是“DEALLOCATE/Close”。这是唯一能给出定论的动作。
2. **低风险试修**：把 `apply_search_path` / `apply_request_tenant` 这类内部 `SET` 改为 `persistent(true)`
   （走命名语句），让 unnamed 槽只被业务查询占用，能把交错窗口显著缩小；改完观察 3 天。
3. **不动 `statement_cache_capacity(0)`**：它是 H1 的根因修复，回退会把“DDL 后 500/200 交替”重新引回来；
   若确需回退，前提是运行期 DDL 已按 `docs/database/runtime-ddl-plan.md` 全部迁走。

## 6. 与本次属主治理的关系

无关。权限变更（owner 收敛、CREATE 收回）不会造成 26000；错误在权限变更前后都出现过（11-23 已有 1 次）。
