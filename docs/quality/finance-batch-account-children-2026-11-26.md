# Finance 批量创建下级科目假成功修复（B342，2026-11-26）

## 背景

前端 `accountApi.batchCreateChildren(parentId, accounts)` 调用 `POST /finance/accounts/{account_id}/children-batch`，请求体为 `{ accounts: [...] }`。后端 `batch_create_account_children` 的实现是：

```rust
pub async fn batch_create_account_children(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_account_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(req, "批量创建成功")
}
```

即：不取租户、不校验父科目、不写库，把请求体原样回显并返回“批量创建成功”。前端会显示成功、拿到“创建结果”，但数据库里没有任何科目；刷新后子科目消失，属于典型假成功入口，且掩盖了父科目不存在、编码重复等真实错误。

## 修复

`svc/finance/src/models/mod.rs` 新增强类型请求体：

- `BatchAccountChildItem { code, name, account_type(alias category), currency?, description?, name_en? }`
- `BatchCreateAccountChildrenRequest { accounts: Vec<...> }`

`batch_create_account_children` 重写为真实写入口：

1. 空数组 400；单批上限 500，超限 400。
2. 租户走 `try_tenant_id_from_claims` 严格解析，缺失/非法/nil 直接 400，不回退平台租户。
3. 父科目查询带 `id + tenant_id + deleted_at IS NULL`，缺失 404「父科目不存在或已删除」；`is_enabled=false` 时 400 拒绝。
4. 每个子科目强制 `parent_id = 路径 account_id`、`level = 父级 + 1`；`account_type` 缺省继承父级；`currency` 空串或缺省回落 `CNY`；`code`/`name` trim 后为空 400。
5. 逐条 INSERT，`unique_account_code(tenant_id, code)` 冲突按 SQLSTATE 23505 转 409，错误信息指明具体编码，并注明整批未写入（事务未提交）。
6. 全部成功后更新父科目 `haschildren=TRUE, is_leaf=FALSE, updated_at=NOW()`，`rows_affected` 必须为 1，否则 409（父科目状态已变化），整个事务回滚。
7. 最后 `scope.commit()`，成功返回 `Vec<Account>` 与「批量创建成功（N 个）」。

## 验证

- `cargo check -p topems-finance` 通过；`cargo test -p topems-finance --lib` 1154 passed / 0 failed。
- SQL 冒烟（本地 `topems`，事务内 `ROLLBACK`）：取一条有效父科目，按相同列集合插入 `B342-T1`/`B342-T2` 两条子科目 → `INSERT 0 1` 两次；更新父科目 `haschildren/is_leaf` → `UPDATE 1`；`SELECT count(*)` 命中 2 条后整体回滚，本地数据未变化。
- 编码冲突路径由 `unique_account_code` 唯一约束保证（23505 → 409），无需额外预查询竞态。

## 备注

- 旧实现没有更新父科目 `haschildren/is_leaf`，`create_account` 单条入口也没有；本批只在批量入口补齐，属于新增行为，不会影响存量数据。
- 该端点此前没有成功写库路径，因此无需数据修复；线上若已有前端依赖“假成功”，现在会正确暴露父科目/编码问题。
