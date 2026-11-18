# `core_tenants` 自读链路提交清单（2026-11-18）

> 状态：待确认后提交。**未 push、未 `git add`；两份迁移保持未跟踪。**
> 前置：迁移与代码必须同窗口上线，否则新租户自读为 0 行。

## 1. 提交范围

| # | 文件 | 状态 | 说明 |
|---|---|---|---|
| 1 | [lib/shared-db/src/scope.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/scope.rs#L311-L341) | 已修改 | 新增 `scope_with_system` / `scope_savepoint_system` |
| 2 | [svc/unified-core/src/modules/tenant/handlers.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs) | 已修改 | 30 处系统通道 + 263 行注释 + 2 处 INSERT 补 `tenant_id` |
| 3 | [database/migrations/20261118140000_core_tenants_self_only.sql](file:///Users/xingzhai/TOPEMS/database/migrations/20261118140000_core_tenants_self_only.sql) | **未跟踪** | 收紧迁移草案 |
| 4 | [database/rollback/20261118140000_core_tenants_self_only.rollback.sql](file:///Users/xingzhai/TOPEMS/database/rollback/20261118140000_core_tenants_self_only.rollback.sql) | **未跟踪** | 回滚脚本 |

不包含：`migration_manifest.yaml`、`checksums.txt`、两项他人修改的 docs、12 处平台路由缺口。

## 2. 改动要点

### 2.1 `scope.rs`

新增两个方法，均强制 `app.tenant_id=nil` + `app.rls_system='on'`，不继承请求上下文：

- `Db::scope_with_system(&mut Transaction)`：复用请求事务；
- `Db::scope_savepoint_system(&mut Transaction)`：额外开 SAVEPOINT（开通链路）。

### 2.2 `handlers.rs`

1. **30 处系统通道**：29 处 `scope_with` → `scope_with_system`，1 处 `scope_savepoint` → `scope_savepoint_system`（`onboard_tenant`）。覆盖目录读、写、analytics、治理、usage 采集。
2. **注释修正**（[263 行起](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L263-L268)）：明确超管 JWT 是 nil + `system=off`，必须显式系统通道。
3. **INSERT 补写 `tenant_id`**（本轮新增）：
   - `create_tenant`：`INSERT (id, tenant_id, ...) VALUES ($1, $1, ...)`，`tenant_id = Uuid::new_v4()`；
   - `onboard_tenant`：同写法，`tenant_id = tenant_id`。
   - 关联表核查结果：`core_tenant_users` / `core_tenant_modules` / `core_tenant_settings` / `hrm.companies` 均已写 `tenant_id`；`iam.users`、`core_user_roles` 无该列，无需改。
4. **不要整文件 `git add -p` 之外的整段提交**：该文件还含 1 处他人未提交 hunk（`mod p1_company_tests` 里的 `topems_test_support::sqlx_dsn_guard!();`），提交时只选本清单相关 hunk。

### 2.3 迁移

- 回填 `tenant_id = id`；
- 删除 `rls_global_read` / `rls_system_only`，重建 `rls_tenant_isolation(ALL) = system OR tenant_id = NULLIF(GUC,'')::uuid`；
- 前后置断言：无 NULL/错位行、单策略、谓词含 `NULLIF` 且不含 `tenant_id IS NULL`。

## 3. 验证读数

### 3.1 编译

`cargo check -p topems-shared-db -p topems-unified-core` → Finished。

### 3.2 六档（scratch，模拟 D 后）

| 档位 | T0 | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|---|
| `core_tenants` 可见 | 0 | 0 | 0 | 1 | 0 | 1 |

写断言：T3 改自己 1 行、改他租户 0 行、插 NULL/他租户行 `42501`；T5 可写。

### 3.3 真实链路（直接调用 handler，非手工 INSERT）

临时测试 `tests/tmp_tenant_onboard_real_chain.rs` 已运行后删除：

| 链路 | 结果 |
|---|---|
| `onboard_tenant` | `tenant_id = id` =1；本租户自读 1；他租户 0；系统通道 1；成员 1、模块 54、设置 2 |
| `create_tenant` | `tenant_id = id` =1；本租户自读 1；他租户 0 |

### 3.4 回滚

执行 rollback 后策略恢复 `rls_global_read` + `rls_system_only`、`tenant_id` 全 NULL；scratch 已还原基线，无探针残留。

## 4. 建议提交信息

```
feat(tenant): 新建租户写入 tenant_id，平台目录改走显式系统通道

- core_tenants 收紧为仅自己可见，平台行经 scope_with_system 访问
- create_tenant/onboard_tenant 同步写入 tenant_id=id
- 新增 20261118140000 迁移与回滚（待上生产，未写 manifest）
```

## 5. 上线顺序

1. 代码（`scope.rs` + `handlers.rs`）先上，兼容旧策略（系统通道在旧策略下同样可用）；
2. 同窗口执行 `20261118140000`；
3. 验证新租户自读、平台列表/详情、analytics；
4. 出问题执行同名 rollback（代码可保留，无需回滚）。
