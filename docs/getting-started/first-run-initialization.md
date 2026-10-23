# 空租户 / 首次端到端初始化引导（建组织 → 建人员 → 配权限）

> 对应场景：全新部署（空库/空租户）或新租户首次登录时，系统主页显示"五步初始化 checklist"
> （`InitGate` 拉 `GET /api/hrm/setup/progress`，未完成时渲染引导 CTA）。
> 本文档面向最终用户/实施人员，与前端引导（P2-1 `958e0cc9a`）及向导租户归属（P2-2 `2def461ff`）配套使用。

## 1. 适用前提

| 项 | 说明 |
|---|---|
| 服务形态 | BFF 单体（8099）+ HRM 模块内嵌；向导端点由 `svc/hrm/src/modules/setup.rs` 提供 |
| 认证 | 全部端点需 `Authorization: Bearer <token>`；登录端点 `POST /api/core/iam/auth/login`（`data.access_token`） |
| 权限 | 向导端点要求 `hrm:setup:read` / `hrm:setup:write`（超管短路放行） |
| 租户归属 | 已登录租户按 `Claims.tenant_id` 落进度行/公司归属；首启超管无租户时回退默认组织 `00000000-0000-0000-0000-000000000001`（与种子一致） |

## 2. 端到端流程（五步）

| 步 | 动作 | 端点 | 说明 |
|---|---|---|---|
| 0 | 查看进度 | `GET /api/hrm/setup/progress` | 空库返回 `is_completed=false, current_step=1, steps=[]`（禁止空集误判完成） |
| 1 | 建公司 | `POST /api/hrm/setup/company` | 录入组织基本信息 |
| 2 | 建部门 | `POST /api/hrm/setup/departments` | 整批提交；先全量前置校验（空名/重名/重码），全成功才写库，失败整批回滚 |
| 3 | 建岗位 | `POST /api/hrm/setup/positions` | 同部门步：批次重名/重码校验 + `department_id` 必须存在且属本租户 + DB 硬 FK |
| 4 | 绑定管理员 | `POST /api/hrm/setup/admin` | 建员工档案并绑定可登录账号（可与 IAM 建号联动，见 §3） |
| 5 | 完成 | `POST /api/hrm/setup/complete` | `{ "confirm": true }` 收口，写 completion 标记 |

进度行落 `hrm.initialization_status`（按 `organization_id` 排序 `step_order`）；任一失败整批回滚，无"部分成功"混杂。

## 3. 与 IAM 建号联动（P1-1）

`setup/admin` 支持两种绑定方式：

- **直建**：不传 `user_id`，传 `username` + `password` —— 后端按 IAM 规则（3-20 位字母/数字/下划线）校验，`username` 缺省回退 `employee_number`；
- **回绑**：前端先调 IAM 建号端点（`POST /api/core/iam/users`）拿到 `user_id`，随 `setup/admin` 请求传回，完成员工档案与账号绑定，hrm 不跨服务直写。

未绑定告警：初始化完成时若管理员未绑定 IAM 账号，返回明确告警提示补绑。

## 4. 端点请求/响应示例

### 4.1 进度（GET `/api/hrm/setup/progress`）

```json
{
  "code": 0,
  "success": true,
  "data": {
    "is_completed": false,
    "current_step": 1,
    "steps": [],
    "org_id": null
  },
  "message": "获取初始化进度成功"
}
```

### 4.2 建公司（POST `/api/hrm/setup/company`）

```json
{
  "name": "示例科技有限公司",
  "short_name": "示例科技",
  "registration_number": "91350100MA0000000X",
  "tax_number": "91350100MA0000000X",
  "address": "厦门市思明区示例路 1 号",
  "contact_phone": "0592-0000000",
  "email": "contact@example.com",
  "website": "https://example.com",
  "description": "首次初始化示例"
}
```

### 4.3 建部门（POST `/api/hrm/setup/departments`）

```json
{
  "departments": [
    { "name": "总经办", "code": "HQ" },
    { "name": "制造部", "code": "MFG", "parent_id": null },
    { "name": "质量部", "code": "QA", "parent_id": null }
  ]
}
```

### 4.4 建岗位（POST `/api/hrm/setup/positions`）

```json
{
  "positions": [
    { "name": "总经理", "code": "GM", "department_id": null, "level": 10 },
    { "name": "生产主管", "code": "PLANT-MGR", "department_id": "<MFG 部门 id>", "level": 6 }
  ]
}
```

### 4.5 绑定管理员（POST `/api/hrm/setup/admin`）

```json
{
  "name": "王宇",
  "employee_number": "EMP-001",
  "username": "admin",
  "user_id": null,
  "gender": "male",
  "birth_date": "1990-01-01",
  "hire_date": "2026-10-23",
  "department_id": "<部门 id>",
  "position_id": "<岗位 id>",
  "email": "wangyu@example.com",
  "phone": "13800000000",
  "emergency_contact_name": "李四",
  "emergency_contact_phone": "13900000000",
  "address": "厦门市思明区示例路 2 号",
  "password": "ChangeMe-2026!"
}
```

### 4.6 完成（POST `/api/hrm/setup/complete`）

```json
{ "confirm": true }
```

## 5. 完成态验收

1. `GET /api/hrm/setup/progress` → `is_completed=true`，`steps` 5 项全部 `completed`；
2. 主页 `InitGate` 不再渲染 checklist，直接进入 mock 首页；
3. 用新建管理员账号登录，角色/权限归属 IAM（非 hrm 直写），可访问已授权模块；
4. 新租户重复上述流程时，进度/公司归属按该租户 `Claims.tenant_id` 落库，互不串扰。

## 6. 关联实现

- 前端：`pages/hrm/setup/InitChecklistPanel.tsx`；`pages/shared/HybridHomePage.tsx`（InitGate 静默回退，不阻塞普通用户）
- 后端：`svc/hrm/src/modules/setup.rs`（progress/company/departments/positions/admin/complete）
- 种子：`20261020000025`（默认组织）；迁移 `20261020000027`（岗位→部门 FK，先解绑孤儿再建约束）
- i18n：`zh/en hrm.json`（checklist 文案键）
