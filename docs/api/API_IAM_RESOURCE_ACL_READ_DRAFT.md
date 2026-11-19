# IAM 资源级 ACL 只读接口契约草案（待确认）

> 状态：**草案，未实现**
> 范围：仅新增三个只读端点及其权限码，不改动既有写入端点与判定逻辑。
> 关联实现：`svc/unified-core/src/modules/iam/resource_permission.rs`、`svc/unified-core/src/routes/iam.rs`、`svc/unified-core/src/modules/iam/tenant_scope.rs`。

## 1. 背景

资源级授权当前只有写入能力：

- `POST /iam/roles/{id}/resource-permissions`：角色 → 资源批量授予
- `DELETE /iam/roles/{id}/resource-permissions`：撤销角色授予（软删）
- `PUT /iam/users/{user_id}/resource-permissions`：用户显式例外（allow / deny）
- `DELETE /iam/users/{user_id}/resource-permissions`：移除用户例外（软删）

前端 ACL 管理页需要「授权查询」「按资源查看授权」，但没有列表端点。本草案补齐读路径，**只读、不分页越权、不引入新表**。

数据仍复用 `iam.resource_permissions`：

| 字段 | 语义 |
|---|---|
| `role_id` 非空 | 角色授予，`effect` 固定 `allow` |
| `user_id` 非空 | 用户显式例外，`effect` 可为 `allow` / `deny` |
| `scope` | `platform`（`tenant_id IS NULL`）或 `tenant`（`tenant_id` 非空） |
| `deleted_at` | 撤销标记；所有读路径必须 `deleted_at IS NULL` |

## 2. 端点总览

三个端点均挂在现有 `/iam` 路由下，均为 `GET`，统一 `ApiResponse` 信封。

| # | 路径 | 用途 |
|---|---|---|
| 1 | `GET /iam/roles/{id}/resource-permissions` | 查某角色持有的资源级授予 |
| 2 | `GET /iam/users/{user_id}/resource-permissions` | 查某用户的显式资源例外（不含角色派生） |
| 3 | `GET /iam/resource-permissions?resource_type=&resource_id=` | 按资源反查所有授权主体 |

设计选择：

- 第 3 个端点要求 `resource_type` 与 `resource_id` **同时必填**，命中现有索引 `idx_resource_permissions_resource(resource_type, resource_id)`，避免无界全表扫描。
- 第 1/2 个端点路径已限定主体，`resource_type` / `resource_id` 作为可选过滤条件。
- 不复用 `POST /permissions/check-resource` 做列表，原因见第 7 节。

## 3. 通用分页与筛选

### 3.1 分页

与 `GET /iam/users` 保持一致：

| 参数 | 类型 | 默认 | 约束 |
|---|---|---|---|
| `page` | integer | `1` | `>= 1` |
| `page_size` | integer | `20` | `1..=200` |

排序：`created_at DESC, id DESC`，保证翻页稳定。

`total` 使用与列表相同的 WHERE 条件单独 `COUNT(*)`；`total_pages` 复用 `topems_shared_core::response::total_pages_of`。

### 3.2 通用筛选参数

三个端点都支持：

| 参数 | 类型 | 说明 |
|---|---|---|
| `resource_type` | string | 精确匹配；最长 64，字符集与写入路径 `is_valid_token` 一致（字母数字 `_ - : .`） |
| `resource_id` | uuid | 精确匹配；需与 `resource_type` 同时出现 |
| `permission` | string | 精确匹配动作标识；最长 128 |
| `scope` | enum | `platform` / `tenant`；平台作用域下可用，租户作用域忽略（见第 5 节） |

第 2 个端点额外支持：

| 参数 | 类型 | 说明 |
|---|---|---|
| `effect` | enum | `allow` / `deny` |

第 3 个端点额外支持：

| 参数 | 类型 | 说明 |
|---|---|---|
| `subject_type` | enum | `role` / `user`，不传则两类都返回 |

**不支持** `include_revoked` / `include_deleted`：回收记录属于审计面，本批不开放，避免读接口比写接口更宽。

参数校验失败统一返回内层 `code = 400`。

## 4. 返回结构

统一信封：

```json
{
  "success": true,
  "message": "获取资源授权列表成功",
  "code": 200,
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "page_size": 20,
    "total_pages": 0
  }
}
```

`items` 元素字段（三个端点同构，便于前端复用同一张表）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string(uuid) | 授权行 ID |
| `resource_type` | string | 资源类型 |
| `resource_id` | string(uuid) \| null | 历史行可能为空（早期表结构允许 NULL），响应保留 null |
| `subject_type` | `"role"` \| `"user"` | 由 `role_id` / `user_id` 派生 |
| `subject_id` | string(uuid) | 角色 ID 或用户 ID |
| `subject_name` | string \| null | 角色名或用户名；解析不到时为 null |
| `permission` | string | 动作标识 |
| `effect` | `"allow"` \| `"deny"` | 用户例外可为 deny；角色恒为 allow |
| `scope` | `"platform"` \| `"tenant"` | 见第 5 节 |
| `tenant_id` | string(uuid) \| null | `platform` 恒为 null |
| `tenant_name` | string \| null | 由 `tenant_id` 解析，可为 null |
| `created_at` | string(RFC3339) | 授予时间 |

说明：

- 角色端点的 `subject_type` 恒为 `role`；用户端点的 `subject_type` 恒为 `user` 且 `role_id` 恒为 null。
- 不返回 `deleted_at`（已过滤）。
- `subject_name` / `tenant_name` 解析在同一作用域事务内完成，不额外放宽 RLS。

## 5. `scope` 语义统一

### 5.1 统一表达

同一返回结构用三个字段表达三层模型：

| 模型层 | 表达 |
|---|---|
| 平台级授予 | `scope = "platform"`，`tenant_id = null` |
| 租户级授予 | `scope = "tenant"`，`tenant_id = <租户>` |
| 角色 / 用户主体 | `subject_type + subject_id + subject_name` |

不新增 `platform_scope` 布尔字段，也不把平台授予折叠进租户。前端按 `scope` 渲染徽标即可。

### 5.2 读取作用域

新增一个只读作用域函数，**行为与写入路径完全一致**：

```rust
// tenant_scope.rs
pub fn iam_acl_read_scope(claims: &Claims) -> Result<IamScope, ScopeError> {
    // 与 iam_write_scope 同源：超管，或非 tenant_admin 身份且持有平台码 → Platform；
    // 否则必须有租户上下文 → Tenant。
    iam_write_scope(claims, "iam:resource_acl:read")
}
```

注意：

- 不能直接用 `iam_read_scope`：它只把超管视为平台，持有 `admin:iam:write` 的平台管理员会被误收敛到租户作用域，读到的范围会小于写入范围。
- `tenant_admin` 身份即使历史误授 `admin:iam:*`，仍按 `iam_write_scope` 的既有保险收敛到租户作用域。
- 平台管理员无租户上下文：走 `IamScope::Platform`，不需要 `app.tenant_id`，不会返回 400。
- 租户管理员无租户上下文：返回 `403`（内层 code `403`），与写入路径一致。

### 5.3 平台 / 租户作用域下的可见性

| 作用域 | 事务 | 可见行 |
|---|---|---|
| `Platform` | `db.scope_read_system()` | 全部未删除行，含 `scope=platform` 与 `scope=tenant` |
| `Tenant(t)` | 请求 `RlsTxnCell` 经 `db.scope_with(txn)` | RLS 仅本租户行；SQL 追加 `tenant_id = $t` 双重约束 |

平台作用域额外支持 `tenant_id` 查询参数（审计某租户），仅平台作用域生效；租户作用域忽略该参数。

RLS 现状（`database/rls_policy_expected.json`）：`iam.resource_permissions` 启用 `FORCE RLS`，策略为
`app.rls_system = 'on' OR tenant_id = app.tenant_id`。因此平台行（`tenant_id IS NULL`）在租户通道不可见，系统通道两者皆可见，与写入注释一致。

## 6. 权限码设计

### 6.1 新增权限码

| 码 | 名称 | 授予对象 |
|---|---|---|
| `iam:resource_acl:read` | 资源级 ACL-查询 | `tenant_admin`、`admin`、`superadmin` |

迁移内容（幂等，与 `20261119010000_iam_resource_permissions_role_grants.sql` 同款写法）：

1. `INSERT INTO public.core_permissions`，`resource='iam:resource_acl'`，`action='read'`，`level=1`。
2. 授予上述三个内置角色，`NOT EXISTS` 防重。
3. 同步提供 rollback：按 `code` 精确删除角色关联与权限行，并断言账本行数（沿用仓库既有 rollback 规范）。

是否新增迁移需要你确认；草案阶段不创建文件。

### 6.2 路由门禁

| 路由 | 门禁 |
|---|---|
| 三个 GET 端点 | `require_permission("iam:resource_acl:read")` |

- 平台管理员：超管直接放行；`admin` / `superadmin` 角色将持有该码。
- 租户管理员：`tenant_admin` 持有该码，但 `iam_acl_read_scope` 强制收敛到本租户。
- 其他角色即使被误授该码，`tenant_admin` 身份保险仍生效；非租户身份则按 `iam_write_scope` 判定为平台作用域，属于显式授权，与写入路径一致。

### 6.3 为什么不让租户管理员复用 `iam:read`

`iam:read` 是平台层码（`tenant_scope::is_platform_code` 判定 `iam:` 前缀为平台层），租户管理员默认不持有。若为读 ACL 放宽 `iam:read`，会让租户侧读路径比其他 IAM 平台端点更宽。独立 `iam:resource_acl:read` 与既有写/删码保持对称。

## 7. 与 `POST /iam/permissions/check-resource` 的边界

| 维度 | `check-resource` | 本草案三个读端点 |
|---|---|---|
| 语义 | 判定「当前登录人」对单个资源 + 动作是否放行 | 列出「已配置的授权行」 |
| 主体 | 只能是 JWT 里的 `sub`，不接受请求体指定他人 | 路径/查询指定角色、用户或资源 |
| 返回 | `has_permission: boolean` | 授权行列表 + 分页 |
| 判定口径 | `decide_resource_permission`：用户例外 > 平台角色授予 > 租户角色授予 > 默认拒绝 | 不合并、不计算生效结果 |
| 权限门禁 | `admin:iam:write`（平台层） | `iam:resource_acl:read`（平台/租户均可用，作用域收敛） |
| 用途 | 业务接口运行时鉴权 | 管理台查询与审计 |

结论：读端点**不得**替代运行时鉴权；运行时仍走 `check_resource_permission`。读端点也**不做**有效权限合并，前端若需「某用户对某资源最终是否允许」，继续调用 `check-resource`（但该端点目前只支持当前登录人，若要查他人需另立需求，不塞进本批）。

## 8. 错误语义

沿用 IAM 现有约定：

| 场景 | HTTP | 内层 code |
|---|---|---|
| 参数格式错误 / `page_size` 越界 / `resource_id` 缺 `resource_type` | 200 | 400 |
| 缺少租户上下文（租户管理员） | 200 | 403 |
| 角色 / 用户不存在或不在作用域内 | 200 | 404 |
| 查询失败 | 200 | 500 |

「不在作用域内按不存在处理」复用 `tenant_scope::check_role_target` / `check_user_target` 的既有口径，不泄露他租户主体是否存在。

## 9. 前端对接计划（确认后实施）

1. `apps/web/src/api/iam/resourceAcl.ts`：新增 `listRoleGrants` / `listUserExceptions` / `listByResource`，复用 `apiClient.iam`。
2. `apps/web/src/api/iam/types.ts`：新增 `ResourceAclGrant`、`ResourceAclListQuery`，命名与返回字段一一对应。
3. `apps/web/src/pages/iam/ResourceAclPage.tsx`：`ListPageTemplate` + 三个筛选维度（角色 / 用户 / 资源）+ 授予/回收 Drawer；复用 `pages/iam/RoleManagementPage.tsx` 的组件与交互风格。
4. `module-configs/iam/config.ts`：新增 `IAM_PATHS.resourceAcl = '/iam/resource-acl'`，同时登记 `routes` 与 `navItems`（`group: 'master'`，权限 `iam:resource_acl:read`）。
5. 可视化验证：启动 web + unified-core，用平台管理员与租户管理员两个身份各走一遍查询/授予/回收。

## 10. 待确认项

1. 是否同意新增权限码 `iam:resource_acl:read` 及配套迁移（含 rollback）？
2. 用户端点是否只返回「用户显式例外」，不展开角色派生授权？（建议：是）
3. 按资源端点是否强制 `resource_type + resource_id` 同时必填？（建议：是）
4. 平台作用域是否允许 `tenant_id` 过滤做跨租户审计？（建议：是，仅平台）
5. 是否需要返回已软删的历史授权？本草案建议不返回。

## 11. 实施记录与并发提交说明

### 11.1 已定稿口径

五项待确认项已按建议定稿：新增 `iam:resource_acl:read`；用户端点只列显式例外；按资源端点双参数必填；平台作用域支持可选 `tenant_id`；不返回软删历史。

### 11.2 并发提交碰撞（2026-11-19）

`357a31de4` 是一次并发提交碰撞的产物，提交信息属另一条线（RLS 策略快照重生成），但内容同时包含本任务的文件：

| 文件 | 归属 |
|---|---|
| `database/migrations/20261119220000_iam_resource_acl_read_permission.sql` | 本任务 |
| `database/rollback/20261119220000_iam_resource_acl_read_permission.rollback.sql` | 本任务 |
| `database/migration_manifest.yaml`（新增 `20261119220000` 条目） | 本任务 |
| `database/checksums.txt`（新增对应校验行） | 本任务 |
| `docs/api/API_IAM_RESOURCE_ACL_READ_DRAFT.md` | 本任务 |
| `database/rls_policy_expected.json` | 另一条线 |

两条线同时 `git commit`，对方把本任务已暂存的迁移文件一并带走。经确认**不做历史改写**：不 amend、不拆分该提交。后端实现另起 `bad6d1c03`（三个 GET 端点 + 作用域收敛 + OpenAPI 契约）。

### 11.3 跨线最小修复（finance 模块）

`apps/web/src/config/permissions.ts`（由本任务迁移自动重生成）提交前暴露了一个与本任务无关的既有类型错误：

- 文件与行：`apps/web/src/api/finance/account.ts` 第 25 行（修复前），`accountApi.list` 的参数类型 union 成员 `AdaptedQuery<'list_accounts'>`。
- 原因：HEAD 的 `packages/shared-types/src/generated/openapi.d.ts` 已无 `list_accounts` operation，`AdaptedQuery` 的泛型约束因此不满足，`frontend-typecheck` 全量失败。
- 处置：经用户确认，仅删除该失效 union 成员及随之不再使用的 `AdaptedQuery` 导入；不改任何运行期逻辑，不清理 finance 模块其他内容。
- 影响范围：类型级、可逆；`accountApi.list` 的内联参数类型保持不变。

