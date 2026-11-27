# L6 岗位角色 FK 方向现状深挖（2026-11-27，只读）

> 只读核查：未改库、未改代码。目标是为「FK 修正指 `core_roles` 并入范式」与「岗位角色绑定功能下线」两条路径提供影响面依据，供拍板。

## 1. 现状（prod `topems_prod` 实测）

### `iam.position_roles`（岗位-角色绑定）

| 项 | 值 |
|---|---|
| 列 | `id` uuid PK、`position_id` uuid NOT NULL、`role_id` uuid NOT NULL、`tenant_id` uuid NOT NULL、`deleted_at` timestamptz |
| FK `position_id` | → `iam.positions(id)` ON DELETE CASCADE |
| **FK `role_id`** | **→ `iam.roles(id)` ON DELETE CASCADE（误指旧空壳表）** |
| 唯一约束 | `(position_id, role_id)` |
| 索引 | `idx_position_roles_position_id`、`idx_position_roles_role_id`、PK、唯一约束索引 |
| 行数 | prod 0；本机 0 |

### 旧表 `iam.roles` vs 权威目录 `public.core_roles`

| 表 | 行数 | 说明 |
|---|---:|---|
| `iam.roles` | 4 占位（`3333…001` 超管 / `002` 部门经理 / `003` 普通员工 / `004` 租户管理员） | 旧空壳表；后端零读写点，无 Rust/前端业务读，无视图/函数依赖 |
| `core_roles` | 17 | 权威角色目录，授权聚合唯一来源 |

### 岗位-权限线 `iam.position_permissions`

同样仅 `position.rs` 读写、**未参与授权聚合**、prod 0 行；与 `position_roles` 同属未投产的岗位模板默认授权预留。

## 2. 代码引用面

### 后端（`svc/unified-core/src/modules/iam/position.rs`，唯一读写点）

| 行号 | 动作 |
|---|---|
| 16 / 25 | 请求模型 `role_ids: Vec<Uuid>` / `Option<Vec<Uuid>>` |
| 143–158 | `position_permissions` 岗位权限插入 |
| 161–177 | `position_roles` 岗位角色插入（`INSERT … (position_id, role_id, tenant_id)`，无来源表校验） |
| 260–267 | 按 `position_id` 查 `role_id` 回显 |
| 424–445 | 更新时 `DELETE` 岗位角色后按新 `role_ids` 重插 |
| 540–603 | 测试夹具 `role_ids` 样例 |

- `position_roles` / `position_permissions` 后端全仓仅此一个文件引用；`svc/hrm/src/modules/position.rs` 不碰该表。
- 授权聚合（`auth.rs` L273–277）只走 `core_user_roles → core_role_permissions → core_permissions`，**未 join `position_roles` / `position_permissions`**；岗位模板默认授权当前不进入任何用户令牌权限集。

### 前端

- 岗位页 `apps/web/src/components/hrm/HrmPositionPage.tsx`、schema `apps/web/src/schemas/hrm/position.ts`；表单字段为 `name/code/department_id/level/薪资/employee_count/status/description/requirements`，**无角色选择字段、不提交 `role_ids`**。
- 前端 `role_ids` 仅出现于 BI 权限页（`BiPermissionPage`/`BiPermissionDataTable`），与岗位模块无关。

## 3. 两条处置路径影响面

### 路径 A：FK 修正指向 `core_roles`，并入 `core_user_roles` 范式

- **DB**：`DROP CONSTRAINT position_roles_role_id_fkey` → 重建 FK `role_id → public.core_roles(id)`；唯一约束 `(position_id, role_id)` 保留。
- **后端**：`position.rs` 插入/查询 SQL 基本不变（`role_id` 已是 UUID）；可补来源表存在性校验。
- **必须补的闭环逻辑**：岗位默认角色当前**不参与授权继承**——若要让岗位角色真正生效，需设计「岗位 → 绑定用户 → 角色继承」链路（`user_positions` 已把用户挂岗位，授权聚合需叠加岗位默认角色/权限），否则改指 FK 后绑定仍不被消费。
- **前端**：需新增岗位角色（及岗位权限）选择 UI；当前岗位页未暴露。
- **工作量定性**：FK 改指本身小；闭环涉及授权聚合改造 + 前端表单，属功能完善批次，需产品确认「岗位默认角色/权限」是否为规划内功能。

### 路径 B：岗位角色（及岗位权限）绑定功能下线

- **DB**：0 行、无授权消费，可 `DROP TABLE position_roles`（连同 `position_permissions`）；或先解除误指 FK 保留表待后续。
- **后端**：移除 `position.rs` 的 `role_ids`/`permissions` 字段与对应 INSERT/SELECT/重插段（143–177、260–267、424–445）；清理测试夹具；`user_positions` 用户-岗位绑定线独立保留，不受影响。
- **前端**：岗位页本就无角色/权限字段，无需移除。
- **风险**：低；前提是产品确认无「岗位模板默认授权」近期规划。

## 4. 现状定性

`position_roles`（及 `position_permissions`）是**未投产的岗位模板默认授权预留关联**：两库 0 行、不参与授权聚合、前端未暴露、后端仅一处 CRUD 读写。FK 误指 `iam.roles` 旧空壳表。`user_positions`（用户-岗位归属）是独立有效线，不在本项范围。

## 5. 待拍板项

1. 产品是否规划「岗位携带默认角色/权限、继承到任职用户」？
   - 是 → 路径 A：先补授权继承链路与前端 UI，再改 FK 指 `core_roles`。
   - 否 → 路径 B：下线岗位模板默认授权关联，清理 `position.rs` 残留段与两张预留表。
2. 若暂不决策：可先做最小修复——解除指向 `iam.roles` 的误指 FK（避免占位 UUID 悬空约束），表与 CRUD 暂留，待方向明确再收口。
