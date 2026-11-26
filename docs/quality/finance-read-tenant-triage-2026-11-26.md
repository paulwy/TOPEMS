# Finance 只读入口租户分域收敛（B338，2026-11-26）

## 背景

B337 已把 Finance 全部写入口切到 `try_tenant_id_from_claims`，剩余 46 处 `get_tenant_id_from_claims` 集中在只读与报表链路（列表、详情、账簿、试算平衡、资产负债表、利润表、现金流、账龄、dashboard、期间列表、导入状态、模板/规则查询、导出模板等）。lenient helper 在 claims 缺失/非法/nil 时回退平台租户，读路径会退化成“以平台租户身份读”，而不是明确拒绝。

## 分类与结论

逐入口检查后分为三类：

1. **租户读（43 个）**：列表、详情、账簿/报表、账龄明细、期间列表、导入状态、模板与规则查询、导出模板等，均以具体业务实体为对象，必须“有租户才可读”。统一改 strict，缺失/非法/nil 直接 400。
2. **平台跨租户聚合（1 个）**：`get_dashboard_handler` 原实现显式区分 `claims.is_superuser`：超管传 `None`（不加租户谓词），其他用户传自己的租户。这是**有意的平台视图**，保留 lenient + `Option<Uuid>` 结构，不做 fail-closed。
3. **已 fail-closed 的辅助函数（1 个）**：`transition_expense_approval` 虽是 lenient helper，但紧接着 `if tenant_id.is_nil() { return 400 }`，行为已等价 strict；本批不改，避免无意义 diff。

另：文件顶部 `use topems_shared_auth::get_tenant_id_from_claims;` 为 1 处 import，随 dashboard 保留。

## 修复

43 个租户读入口统一为：

```rust
let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
{
    Ok(t) => t,
    Err((code, msg)) => return ApiResponse::error(code, &msg),
};
```

`export_template_handler` 返回类型是 `axum::response::Response` 而非 `ApiResponse`，该处使用：

```rust
Err((code, msg)) => return ApiResponse::<serde_json::Value>::error(code, &msg).into_response(),
```

服务层查询、RLS 谓词、返回结构均未改动；仅租户来源与失败口径（400）变化。

## 盘点与验证

- 替换后全文件统计：strict helper 使用 124 处；lenient 仅剩 3 处（import、dashboard 的 `Some(get_tenant_id_from_claims(...))`、已 fail-closed 的 `transition_expense_approval`）。
- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS（首轮 `export_template_handler` 因 `Response` 返回类型报 E0308/E0282，按上述 turbofish + `into_response()` 修正）。
- `cargo test -p topems-finance --lib` 1154 passed / 1 ignored。
- 状态与 SQL 门禁：`dump-status-code-inventory --check --strict-palette`、`status-db-check-queue --check`、`check-status-enum-contract`、`dump-status-checks --check`、`check-request-txn --changed-only`、`check-destructive-sql`、`check-directed-migrations --changed-only` 全部通过。

## 影响与遗留

- 影响面：无租户或 nil 租户的读请求在 Finance 域从“读到平台租户数据/空数据”变为明确 400；正常登录用户与超管 dashboard 行为不变。
- 若后续需要“超管跨租户报表”，应显式补 `Option<Uuid>` 形参与 `is_superuser` 分支（参考 dashboard），而不是重新使用 lenient helper。
- Finance handler 层仍集中在单文件约 8000 行；租户口径已统一，后续可考虑按域拆分以降低审计成本。
