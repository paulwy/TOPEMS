# B25 · unified-core 租户状态单一源（2026-11-21）

## 问题
`TenantStatus` 有两份定义且值集不一致：

| 来源 | 值 |
| --- | --- |
| `lib/shared-auth/src/tenant.rs` | `Active / Suspended / Trial / Deleted` |
| `svc/unified-core/src/modules/tenant/models.rs` | `Trial / Active / Suspended / Expired` |

- `public.core_tenants.status` 列默认 `'trial'`，本地分布 active 794 / trial 3；shared-auth 的 `Deleted` 才是 DB 口径，unified-core 的 `Expired` 在 DB 无对应值也无写入口，属纯本地漂移。
- `update_tenant` 把请求体 `status: Option<String>` 原样 `.bind()` 写库，任意字符串都能落库（如 `foo`），接口仍返回成功——无校验、无限定集合，前端传错只会在后续读路径表现为脏值。
- `lib/shared-auth` 没有 DB 字符串助手，调用方只能各自写 `match`，是重复定义的诱因。

## 改动
1. `lib/shared-auth/src/tenant.rs`：新增 `TenantStatus::DB_VALUES`（`active/suspended/trial/deleted`，与迁移默认值一致）、`from_db_str`（trim + lowercase，未知返回 `None`，不静默归默认）、`as_db_str`，并加单测 `tenant_status_db_strings_roundtrip`。
2. `svc/unified-core/src/modules/tenant/models.rs`：删除本地 `TenantStatus`（仅被自身测试引用），改为 `pub use topems_shared_auth::TenantStatus;`；测试改成 `Deleted` 变体与 DB 字符串往返，去掉 `Expired`。
3. `svc/unified-core/src/modules/tenant/handlers.rs`：`update_tenant` 写库前用 `TenantStatus::from_db_str` 严格校验，非法值直接 `CoreResponse::error("invalid tenant status, allowed: active/suspended/trial/deleted")`；SQL 绑定改为 `Option<&'static str>`（`as_db_str()`），不再把请求原串透传。

## 验证
- `cargo test -p topems-shared-auth --lib tenant`：54 passed。
- `cargo test -p topems-unified-core --lib tenant::models`：12 passed。
- `cargo clippy -p topems-shared-auth -p topems-unified-core --all-targets -- -D warnings`：干净。
- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：135 个 Rust 枚举 / 146 值、色板缺口 0，PASS（原 136 枚举，unified-core 重复枚举消失）。
- `node scripts/ci/status-db-check-queue.mjs --check`：98 枚举 / 108 值，PASS；映射 55 条，`resolved` 覆盖 unified-core 剩余三个枚举。

## 三个同名枚举的处理结论
- `HealthStatus`（`svc/unified-core/src/shared/util.rs`）与 `lib/shared-core/src/health.rs` 同值集，但 serde 输出为 `PascalCase` vs `lowercase`，直接替换会改健康检查接口契约 → 记为 `persisted:false`，收敛需契约窗口。
- `SubscriptionStatus`（`svc/unified-core/src/modules/subscription/mod.rs`）与 shared-auth 同值集但拼写 `Cancelled` vs `Canceled`，且为纯内存计算 → 记为 `persisted:false`，不并入。
- `VersionStatus`（`svc/unified-core/src/middleware/versioning.rs`）无同名共享源，仅中间件内存表 → `persisted:false`。

## 残留
- `core_tenants.status` 的 CHECK 仍是 `docs/database/tenant-status-check-candidates-2026-11-21.sql` 候选（`NOT VALID`），未进 `database/migrations/`，需生产窗口 + `VALIDATE CONSTRAINT`。
- `update_tenant` 之外，`activate/suspend` 路径写死 `'active'/'suspended'` 未改为 `as_db_str()`（字面量本身在允许集内，等价，留待与 CHECK 同批统一）。
- `TenantStatus` 的 serde 仍未加 `rename_all = "lowercase"`，API 输出保持 `PascalCase`，避免影响前端既有判断。
