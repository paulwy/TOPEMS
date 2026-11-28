# Finance 科目/期初/期间域写端点挂在读码后面 + 路由抽取器漏抽链式方法（B377）

- 日期：2026-11-28
- 范围：`svc/finance/src/modules/mod.rs`（`account_routes`、`report_routes`、21 处注解）、`scripts/dev/extract-live-routes.py`、`docs/api/openapi-baseline-gaps.json`
- 结论：两块域仍是「一个读码统吃写端点」；同时发现 openapi 覆盖门禁在 main 上已经红（801 条新漂移），根因是抽取器只认 `.route(p, get(h))` 的**第一个方法**，链式 `.put()/.delete()` 全部漏抽。

## 1. 暴露出来的越权

| 域 | 当时唯一门 | 被一概放行的写端点 |
| --- | --- | --- |
| 科目/期初 | `finance:account:read` | `POST /accounts`、`PUT/DELETE /accounts/{id}`、`POST /aux-accounts`、`POST /accounts/{id}/children-batch`、`POST/PUT/DELETE /accounts/opening-balances[...]`、`POST /accounts/opening-balances/batch`、`POST /accounts/{id}/opening-balance`、`POST /accounts/opening-balances/carry-forward`、`PUT /counterparty/customers|suppliers/{id}`（14 个） |
| 报表/期间 | `finance:report:read` | `POST /year-end-close`、`POST /periods/open`、`/periods/close`、`/periods/close-income`、`/periods/year-end-close`、`POST /periods/{year}/{month}/open|close`（7 个） |

年结、关账期、结转损益、改会计科目这些动作对只读角色敞开，属于**账务口径**级别的越权：只读角色可以把账期关掉、把损益结掉。

## 2. 修法

- 科目域拆 8 个子 Router：`account:read/create/update/delete` + `opening_balance:read/create/update/delete`（权限字典里这些码都存在，`finance:opening_balance:*` 之前完全没被 Runtime 用过）。
- 报表域拆 2 个：报表全 GET 留 `finance:report:read`；期间写动作（年结/开/关/结转）统一挂 `finance:period:write`（字典已有）。
- 注解修正 43 处：`create_account` 的 `finance:invoice:write`（字典不存在、整段复制来的）改 `finance:account:create`；原 `security(("BearerAuth" = []))` 的科目/期初/期间 handler 按动作补真实码；凭证模板 8 个 handler 的 `finance:mod:write` / `finance:mod:read` / `finance:write` 改 `finance:voucher:{read,create,update}`；`batch_create_payables` / `write_off_collection` 改 B376 落地后的真实码。
- 修掉 `list_aux_accounts` 注解里重复的 `security(...)`（utoipa 同属性重复声明）。

## 3. 顺带修掉的门禁红：抽取器漏抽链式路由

`check-openapi-coverage.cjs` 在 origin/main 上已经失败（`missing=1, extra=798`，与 B377 无关，clean checkout 可复现）。根因在 `scripts/dev/extract-live-routes.py`：正则只匹配 `.route(p, <第一个方法>(...))`，像

```rust
.route("/accounts/{account_id}", axum::routing::get(get_account).put(update_account).delete(delete_account))
```

只有 `GET` 被抽到，`PUT/DELETE` 在 live 集合里凭空消失 → openapi 里已登记的这些方法被判定为「文档有、代码无」。finance 一个域就占 347 条。

修法：新增 `_iter_route_methods()`，从第一个方法调用之后继续匹配 `.<verb>(` 并用括号配平跳过 handler 表达式，逐个补抽；同一 `.route()` 上的方法共享路径与行号。

效果：

| 指标 | 修前 | 修后 |
| --- | --- | --- |
| 抽取路由数 | 4165 | **5113** |
| 新漂移（对旧基线） | missing=1 / extra=798 | missing=263 / extra=491 |

missing 从 1 涨到 263 是把**一直存在但看不见**的未登记方法暴露出来（几乎全是链式 PUT/DELETE），不是新增缺失；extra 从 798 降到 491 说明 307 条假漂移被消除。

因为度量口径变了，同步用门禁自带的 `--gen-baseline` 重建白名单：白名单 2825 → **2427** 条（missing 1297 / extra 1130），`live_routes_count` 4165 → 4916。基线变小、且基线内的漂移全是已存在的历史欠账（本次未新增任何 finance 侧未登记路由）。

## 4. 验证

- `cargo test -p topems-finance --lib` → **1178 passed**（含棘轮 10 条），0 failed。
- `cargo clippy -p topems-finance --all-targets -- -D warnings` → 通过。
- `cargo fmt --all` → 顺带格式化 `svc/lims/src/modules/sample.rs`、`svc/mobile/src/modules/document.rs`、`svc/mobile/src/shared/mod.rs`（上游提交留下的未格式化代码，仅格式变更）。
- `node scripts/ci/check-openapi-coverage.cjs` → **PASS，missing=0 / extra=0**（重建基线后）。

## 5. 遗留

- 263 条「live 有 / openapi 无」的未登记路由（多为链式 PUT/DELETE）仍在白名单里，需要按服务逐批补 `openapi.json`；本批只把度量修正到能看见它们。
- 491 条「openapi 有 / live 无」里混着两类：注解路径带错前缀（如 `/api/finance/api/core/...`）与已下线但文档未删的端点，需要按服务清理。
- 科目域写码拆分后，前端/网关若按 `finance:account:read` 授权写操作会开始 403，需要确认角色配置里已给对应角色补 `finance:account:create/update/delete` 与 `finance:opening_balance:*`（本机 `public.core_permissions` 有码，但未核角色绑定）。
