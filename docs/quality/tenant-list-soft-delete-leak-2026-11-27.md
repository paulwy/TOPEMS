# 租户列表软删泄漏 + 全仓软删谓词优先级门禁（B365，2026-11-27）

## 缺口一：`list_tenants` 的搜索条件把软删过滤 OR 掉了

`svc/unified-core/src/modules/tenant/handlers.rs::list_tenants` 按 `(search, status, plan)` 展开成 8 条
SQL 分支。其中「只有 search」那条写的是：

```sql
WHERE deleted_at IS NULL AND name ILIKE $1 OR code ILIKE $1
```

SQL 里 `AND` 比 `OR` 结合更紧，实际语义是
`(deleted_at IS NULL AND name ILIKE $1) OR code ILIKE $1`——**只要 `code` 命中，软删租户照样返回**。
同一文件里的 `COUNT(*)` 统计语句有同样写法，所以列表条数与 `total` 一起错。

同时「无任何过滤」那条分支（`(None, None, None)`）压根没有 `deleted_at IS NULL`，
默认打开租户管理页就能看到已删租户。

## 缺口二：查询失败被吞成「成功 + 空列表」

同一个函数里 8 条 `.fetch_all(...).await.unwrap_or_default()` 和 2 条
`.fetch_one(...).await.unwrap_or(0)`，加上 `scope_with_system` 失败分支，全部返回
`CoreResponse::success(空 items / total 0)`。后果是：数据库出错、RLS scope 起不来时，
平台管理员看到的是「没有租户」，而不是「列表加载失败」——比 500 更危险，因为它不会触发告警。

## 缺口三：`gis` 位置搜索同样的写法

`svc/gis/src/modules/location.rs::search_locations` 的「不带 location_type」分支：

```sql
WHERE deleted_at IS NULL AND name ILIKE $1 OR code ILIKE $1
```

按位置编码搜索会返回已删位置。

## 改动

1. `list_tenants`
   - 两个 OR 条件加括号：`AND (name ILIKE $1 OR code ILIKE $1)`（列表 + COUNT 各一处）；
   - `(None, None, None)` 分支补 `WHERE deleted_at IS NULL`；
   - 8 条列表查询改为 `Result<Vec<Tenant>, sqlx::Error>`，失败 `tracing::error!` + `CoreResponse::error("查询租户列表失败")`；
   - COUNT 同理（`Result<i64, _>` → `CoreResponse::error("统计租户总数失败")`）；
   - `scope_with_system` 失败不再伪装成空列表成功。
2. `gis::search_locations`：OR 条件加括号。
3. 新增门禁 `scripts/ci/check-soft-delete-precedence.cjs`：
   - 扫 `svc/**/*.rs`、`lib/**/*.rs` 里的字符串/原始字符串字面量；
   - 对每个含 `deleted_at IS NULL` 的 WHERE 子句，按括号深度找**同层级**的 `OR`，命中即失败；
   - 支持 `--changed-only`（只扫暂存区改动的 `.rs`），已接进 `lefthook.yml` 的 `soft-delete-precedence` 钩子。
   - 全仓首跑恰好命中上述 3 处，无其它误报。

判定口径说明：`AND (a OR b)` 这类括号内 OR 不触发（软删谓词仍在 AND 链上）；
`deleted_at IS NULL` 在子查询里时按子查询自身层级判定。

## 验证

- `node scripts/ci/check-soft-delete-precedence.cjs`：修复前 3 处违规 → 修复后 `OK`。
- `cargo test -p topems-gis --lib`：156 passed。
- `cargo test -p topems-unified-core --lib`：572 passed。
- `cargo fmt --all` 已执行。

## 遗留

- 门禁只覆盖「`deleted_at IS NULL` 被同层 OR 旁路」，不覆盖「漏写软删谓词」（`list_tenants` 的第 8 条分支
  这类只能靠人眼或按表清单单独扫）。
- 全仓 `fetch_*.await.unwrap_or_default()` 仍有 **409 处 / 133 个文件**（`unified-core` tenant 24、
  `flow/monitor` 20、`master-data` 的 versioning/disaster/knowledge/quality 各 13-15、`mes/aps_scheduling` 8、
  `finance/financial_reports` 8 等）。本批只收口 `list_tenants` 一个函数，其余建议按域分批烧。
- `list_tenants` 用的是 `scope_with_system`（平台跨租户视角），未加 `tenant_id` 谓词是刻意的；
  但调用方是否都该看到全部租户（含软删边界）值得另做权限复核。
