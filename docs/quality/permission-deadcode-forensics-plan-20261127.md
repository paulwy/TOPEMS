# 隐性死码运行期取证方案（2026-11-27，方案设计）

> 承接 L4 复核遗留：581 个 FE/BE 静态零引用码经角色绑定交叉，全部已挂角色、未挂角色死码候选 0。本方案设计如何在隔离/dev 环境运行期取证，甄别其中是否存在「挂了角色、但鉴权链路实际不消费」的隐性死码。**不跑 prod、不改令牌/鉴权链路、不自动清理任何权限码。**

## 1. 背景与判定矩阵

权限码在链路中的三态消费：

| 态 | 位置 | 证据 |
|---|---|---|
| 后端鉴权守卫 | 路由处理器挂 `require_permission("code")` / `require_any_permission(&["code",…])`，`has_permission` 比对令牌权限集 | `svc/unified-core/src/middleware/permission.rs`（`require_permission` L55、`require_any_permission` L185、`has_permission` L32） |
| 令牌授权集 | 登录/换签时由关联表聚合 `core_user_roles → core_role_permissions → core_permissions.code` 写入 Claims.permissions；超管 `permissions=["*"]` 短路 | `svc/unified-core/src/modules/iam/auth.rs` L273–277、L381–386 |
| 前端可见性 | 路由守卫 / 菜单 / 按钮按会话权限集控制展示与可达 | `apps/web/src/utils/session.ts`、`components/auth/ProtectedRoute.tsx`、`module-configs/*/config.ts`、菜单/导航组件 |

**隐性死码定义**：码在 prod 目录在册并挂角色（进对应角色令牌集），但后端守卫从不校验、前端可见性从不引用——令牌携带却链路不消费。

## 2. 现有静态口径与盲区

- 静态扫描（`artifacts/audit/orphan-review/l4_orphan_rebuild.py`）只收完整冒号码字面量；后端权限走枚举/常量/目录批量授权、前端菜单/SDK/i18n 全资源未穷尽，故 581 个零引用不能直接判死。
- 角色绑定交叉：581 全部挂角色（1 角色 27 全 admin 兜底、2 角色 137、3 角色 415、4 角色 2）；未挂角色候选 0。

## 3. 第二遍静态收窄（本次已做）

581 分层：

| 分层 | 数量 | 特征 | 可疑度 |
|---|---:|---|---|
| 三段标准 CRUD 码 | 557 | action 集中 `create` 182 / `update` 181 / `delete` 183 / `write` 8 / `read` 3；模块覆盖 mes 50、erp 39、srm 39、scm 38、pdm 36、hrm 34、rd 34、wms 33、ehs 32、finance 32、lims 28、qms 24、crm 22… | 低：模块全量 CRUD 目录登记，随功能/页面启用 |
| 两段聚合伞码 | 24 | `crm/doc/gis/iam/integration/master-data/monitor/notification/rd/report/search/srm/system/ticket/tms/workflow` 等 `:admin/:read/:write/:delete/:approve` | 中：需逐个核对是否有对应模块三级码簇与守卫/页面支撑 |

24 伞码中 admin-only（仅挂 `admin`）优先复核：`iam:delete`、`monitor:admin`、`system:dictionary`、`system:monitor`、`system:plugin`、`system:settings`。

## 4. 运行期取证步骤（隔离/dev 环境）

### 4.1 环境准备
1. 按 L3 路径 A 重建隔离库到链尾（`rebuild-from-baseline.sh` / `provision-env.sh`，基线锚点 `20261117235500`），避免滞后 dev 库干扰。
2. 起后端服务与前端 dev；**取证账号必须用非超管角色**（超管 `permissions=["*"]` 短路，令牌集无鉴别力）。

### 4.2 采集令牌授权集
- 以 `tenant_admin`、各 `*_manager`（finance/scm/wms/mes/ehs/crm/report…）、普通用户分别登录，导出 Claims.permissions 全集，落表：`角色 → 权限码集合`。
- 对照 581 清单，标注每个码进入了哪些角色令牌集。

### 4.3 后端守卫决策埋点（临时诊断，不入生产代码）
- 在 `middleware/permission.rs` 的 `require_permission` / `require_any_permission` / `has_permission` 比对处，记录 `(被校验码, 命中/拒绝, 路由, 角色)`；跑覆盖各模块页面与接口的冒烟流程。
- 产出「后端实际校验过的码集合」。

### 4.4 前端可见性采集
- 采集路由守卫、菜单配置、按钮权限判断实际读取的码集合（运行期会话权限集 + 渲染时判断的码）。
- 产出「前端实际引用的码集合」。

### 4.5 交叉矩阵

| 令牌携带 | 后端守卫校验 | 前端可见性引用 | 判定 |
|:--:|:--:|:--:|---|
| ✓ | ✓ | — | 活码（后端鉴权） |
| ✓ | — | ✓ | 活码（前端可见性控制） |
| ✓ | ✗ | ✗ | **复核候选**：进入人工复核 |
| ✗ | — | — | 未进任何角色令牌集（与本次 581 交叉结论不符，单独排查绑定） |

### 4.6 人工复核候选分类
对「令牌携带 ∧ 两端均未出现」的候选，对照功能清单、路由表、菜单表与代码历史，归入：
- **规划预留**：功能未上线，码为目录预登记；保留。
- **已下线残留**：功能/页面已移除，码与绑定可在目录评审后清理。
- **真死码**：授权链不消费、无规划用途；走种子/目录评审与角色绑定调整，不自动 DROP。

## 5. 判定口径与局限

- **单次冒烟覆盖不全**：未在守卫/前端出现 ≠ 死码；需多角色 + 全模块流程覆盖后再下结论。
- **超管令牌不可用**：`["*"]` 短路使权限集无鉴别力，取证一律用普通/角色账号。
- **前端动态资源**：菜单/SDK/i18n 从 DB 拉取，静态扫不到，以运行期采集为准。
- **后端枚举/常量**：守卫若经权限注册表/枚举间接引用，临时埋点记录的是最终校验码，可补第二遍枚举名/常量名反查交叉。
- 取证产物（埋点日志、码集合对照表）落 `artifacts/audit/`（gitignore）；复核结论与分类清单再入库 `docs/quality/`。

## 6. 不做项

- 不在 prod 起埋点、不读 prod 令牌；不修改鉴权中间件/令牌签发逻辑。
- 不据静态结果或单次取证自动清理权限码、不调整角色绑定；死码处置另立目录评审批次。
- 不补写种子迁移；本方案仅定位与定性。
