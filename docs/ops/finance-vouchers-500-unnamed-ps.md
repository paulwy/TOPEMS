# `GET /api/finance/vouchers` 间歇 500 排查记录（已结案）

> 日期：2026-11-25 · 环境：本机（`localhost:3000` → unified-core 聚合 → finance 模块，直连 `127.0.0.1:5432`）
> 状态：**已定位并修复**。根因是 sqlx 对**自定义枚举参数**做类型自省时覆盖了同名 unnamed 语句槽。
> 修复：`list_vouchers` 的 `status` 参数改为文本绑定 + SQL 显式转型（`$2::public.voucher_status`）。

## 1. 现象

- `GET /api/finance/vouchers` 返回 500，响应体 `{"code":500,"message":"内部服务器错误"}`。
- 聚合层日志：
  `ERROR topems_shared_core::error::enhanced: 数据库查询错误: error returned from database: unnamed prepared statement does not exist at line 1672`
- PostgreSQL 侧（`postgresql-2026-11-25.log`）：`ERROR: unnamed prepared statement does not exist`，**没有 STATEMENT 行**——失败发生在 `Execute` 阶段，引用的 unnamed 语句已不存在。
- 同接口紧接着重试即恢复：`200 / 500 / 200` 是典型形态。

## 2. 关键线索：每次重启后首个请求必挂

- 顺序 12 次、并发 30 次（`-P10`）、终止空闲连接后再打 10 次：**全部 200**（旧连接上类型信息已缓存）。
- 而**每次 `restart server --force` 后对 `/api/finance/vouchers` 的第一个请求 100% 是 500**，第二个起 200。
- 频率统计里 11-25 的 8 次，全部落在当天多次重启后的首请求上。

这个"只在新连接首次查询时失败"的形状，直接把怀疑对象从"请求事务被并发共享"收敛到了**连接首次准备语句时的类型自省**。

## 3. 现场语料（`log_statement='all'`，失败 backend pid 2546）

```
[2546] LOG:  statement: SELECT set_config('statement_timeout', '30s', true)
[2546] LOG:  statement: SELECT pg_type.oid, ... FROM (VALUES (NULL, 73794), (NULL, 73804)) lookup_inner ...
[2546] ERROR: unnamed prepared statement does not exist
[2546] LOG:  statement: ROLLBACK
```

`73794 / 73804` 查库确认是 `public.voucher_type` 与 `public.voucher_status` 两个枚举类型。

## 4. 根因（已定论）

1. `lib/shared-db/src/database/mod.rs` 为修 H1（运行期 DDL 后陈旧元数据）设置了 `statement_cache_capacity(0)`，所有语句都走**会话内唯一**的 unnamed 语句槽。
2. `list_vouchers` 用 `Option<VoucherStatus>` **按枚举类型绑定参数**。新连接上 sqlx 不认识该自定义类型，于是在 `Parse` 之后**再发一次 `pg_type` 自省查询**，把参数 OID 换成 Rust 侧类型。
3. 这条自省走的是**简单查询协议**，而简单协议同样占用 unnamed 语句槽——它把刚解析好、尚未 `Execute` 的业务语句顶掉了。
4. 随后的 `Execute` 找不到那条 unnamed 语句 → SQLSTATE 26000 → 整个请求事务 `ROLLBACK` → 500。
5. 自省结果随后被连接级类型缓存记住，所以**同一连接上的第二次查询就正常**。这解释了全部现象：新连接首请求必挂、重试恢复、并发与压测打不出来、只有重启时刻集中出现。

## 5. 修复

`svc/finance/src/services/finance/voucher.rs::list_vouchers`：

```rust
// 改前
query.push_str(" AND status = $2");
query_builder = query_builder.bind(s);          // s: VoucherStatus（自定义类型 → 触发自省）

// 改后
query.push_str(" AND status = $2::public.voucher_status");
query_builder = query_builder.bind(s.to_string());  // 文本参数，SQL 内显式转型
```

参数类型变成内建 `text`，sqlx 无需自省；转型由 SQL 文本承担，语义不变（`VoucherStatus` 的 `Display` 输出即枚举标签，已核对 `draft,submitted,approved,posted,rejected,cancelled,reversed`）。

## 6. 决策：小容量命名缓存（系统性）

只改 `list_vouchers` 的参数绑定**不足以**修好——列类型同样会触发自省（`voucher_type`/`status` 两列），实测改完文本绑定后首请求仍 500。触发点有两类：

- **枚举参数**（`.bind(VoucherStatus)`）→ Parse 后自省；
- **枚举列**（`SELECT ... status, voucher_type ...` 解码）→ Describe 后自省。

两者都在 `Execute` 之前发生，所以只要 `statement_cache_capacity(0)`，任何"带枚举参数或枚举列"的查询都会在**连接首次执行**时挂一次。这是跨模块的通用缺陷，不是 finance 独有。

因此本次改 `lib/shared-db/src/database/mod.rs`：`statement_cache_capacity(0)` → **`8`**，语句改走命名槽，自省不再覆盖业务语句。

- H1 残余风险：仅限"该连接缓存了该语句 + 涉及对象在运行期被 DDL"的窗口；对策是运行期 DDL 收敛（`docs/database/runtime-ddl-plan.md`）、部署即重启连接池、`max_lifetime` 600s 轮换。
- `list_vouchers` 的文本绑定 + `$2::public.voucher_status` 转型**保留**：它把参数路径的自省也消掉，属附加收益，语义不变。

## 7. 验证

- 重启 `topems-server` 后**首个** `/api/finance/vouchers` 请求返回 200（修复前该场景必 500）。
- `status` 过滤参数与 `period` 组合查询结果与修复前一致（同租户下计数相同）。
- `/api/core/menus`、`/api/wms/warehouses` 等回归 200。
- 验证完毕后 `log_statement` 已复位为 `none`。

## 8. 附带说明

- 权限/属主治理（owner 收敛、CREATE 收回）与 26000 无关：11-23 治理前已出现过。
- `svc/search/src/projection.rs` 中 v1 投影改用 `scope_system()`、以及 `scope.rs` 的 GUC 语句改走简单协议，属于同期一并做的**独立**加固（前者修"payload 缺 tenant_id 时落零租户被拒、每 3 秒刷错误"，后者让 GUC 不再占 unnamed 槽），它们不构成本次 26000 的修复。
