# Finance 凭证域写入口权限收敛（B343，2026-11-26）

## 背景

`svc/finance/src/modules/mod.rs` 的凭证/模板/生成/U8 导入域原来是一个 `voucher_routes`，最后统一：

```rust
.layer(axum::middleware::from_fn(require_permission(
    "finance:voucher:read",
)));
```

这意味着该域下**所有**接口只需要 `finance:voucher:read`，包括：

- `DELETE /vouchers/{id}`、`POST /vouchers/batch-delete`
- `POST /vouchers/{id}/post`、`/approve`、`/reverse`、批量记账/审批
- `POST /vouchers/import`、`/import/u8`、`POST /u8-import/{id}/rollback`
- 模板与生成规则的建/改/删、条目增删、`set-default`、`toggle`

DB 实际已 seed 四个权限码 `finance:voucher:{read,create,update,delete}`，且角色分布为：`finance_manager`/`tenant_admin`/`admin`/`superadmin` 四码齐全；`erp_manager` **只有 read**。因此 `erp_manager` 这类只读角色当时可以直接删凭证、记账、审批、导入和改模板，属于越权写入。

## 修复

把凭证域拆成四个子 Router，各自挂对应权限码：

| 子 Router | 权限码 | 覆盖 |
| --- | --- | --- |
| `voucher_read_routes` | `finance:voucher:read` | 凭证/模板/规则/导入记录的 GET、`POST /vouchers/export`、`POST /vouchers/match`、`POST /vouchers/test`、`POST /voucher/generate/preview` |
| `voucher_create_routes` | `finance:voucher:create` | 建凭证、批量建、按模板生成、通用/U8 导入、建模板、模板 apply/import/copy、加条目、建生成规则、规则生成、`from-source`/`batch`/`auto`/`regenerate` |
| `voucher_update_routes` | `finance:voucher:update` | `PUT /vouchers/{id}`、submit/approve/post/unpost/unapprove/reverse、批量 submit/approve/post、改模板、set-default/toggle、条目 reorder/update、改规则/toggle、U8 rollback |
| `voucher_delete_routes` | `finance:voucher:delete` | `DELETE /vouchers/{id}`、`POST /vouchers/batch-delete`、删模板、删条目、删生成规则 |

- 读子 Router 自带 read 层；
- 写子 Router 合并后**再统一套一层 read**（能读才允许改，写角色需要 read + create/update/delete），避免只读角色被直接抬成写入角色，也避免同一路径重复包多层；
- 四个子 Router 用 `merge` 合并，同一路径不同方法（`/vouchers/{id}` 的 GET/PUT/DELETE）由 axum 合并 MethodRouter。

权限码不新增：DB 四码已存在，只把路由声明对齐到既有语义。

## 验证

- `cargo check -p topems-finance` 通过。
- `cargo test -p topems-finance --lib`：1154 passed；新增 `voucher_routes_merge_without_panic` 通过（构建完整 finance 路由表，验证四个子 Router 合并不 panic；此前后端启动即会在此失败）。
- 权限分布复核（本地 `core_role_permissions`）：`finance_manager`/`tenant_admin`/`admin`/`superadmin` 均持有四码；`erp_manager` 仅 read —— 修复后其写操作将 403，读不受影响。

## 遗留

- 前端菜单 `requiredPermissions` 仍是 `finance:voucher:read`，页面可见性与后端写权限分离；只读角色仍能看到按钮但点击会 403。前端按钮级禁用未在本批处理。
- `finance:voucher:write` 这个码在 `utoipa` 注解和 `scripts/ci/perm-code-mapping.json` 里仍被引用，但 DB 未 seed；本批运行时不再依赖它，注解清理留给后续权限码收敛批次。
