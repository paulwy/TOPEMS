# W7-B4 · W-IAM 生产窗口执行报告（2026-11-11）

## 1. 范围

仅 `update_role` / `delete_role` 的作用域与影响行数修复，以及同页前端三个 mutation 的内层 `code` 判定。不包含 `get_user_permissions`、qms B5/B6 批次。

## 2. 提交与产物

| 项 | 值 |
|---|---|
| 后端提交 | `f18df38bd` fix(iam): update_role/delete_role 改作用域并校验影响行数 |
| 前端提交 | `a21198f62` fix(web): 角色增删改按内层 code 判定成败 |
| 远端 main | `a21198f62d385806982048919a5e04565fd094e7`（`git ls-remote origin main`） |
| 新二进制 sha256 | `ebda28a72d25d753f84c80c00a027431deb7c1decd0f06ecd339ccbfd5a261b6` |
| 构建时间 | 2026-11-11 23:03:24（晚于提交 22:44:43 / 22:45:56） |
| 旧二进制 sha256 | `1609ef16f91c7b219d0f96ef439f6a4cd239a8d9a32b0ea3a63057c5ca2fdef4` |
| 回滚备份 | `~/topems/bin/topems-server.bak-20261111-iam`（旧 sha，22:01） |
| 迁移 | 无；账本保持 `20261112100000` |

## 3. 代码改动

- [role.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/role.rs)：
  - `update_role` / `delete_role` 改用 `tenant_scope::write_scope` + `check_role_write_target`（平台全放、本租户角色可改、全局角色 403、他租户/不存在 404）。
  - 写事务改 `state.db.scope_system()` / `scope_for_tenant()`，SQL 去掉 `tenant_id` 谓词，不再被 `core_roles` 的 FORCE RLS 过滤成假 404。
  - 全部 UPDATE/DELETE 校验 `rows_affected()`，0 行返回内层 409；查询错误不再 `unwrap_or(None)`；权限关联 INSERT 失败回滚并返回 500。
- [RoleManagementPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/iam/RoleManagementPage.tsx#L125-L201)：`create/update/delete` 与增删权限两个 mutation 均先读 `data.success`，失败展示后端 `message`、不刷列表、不关闭抽屉；成功提示统一用 `k7`；失败兜底新增 `create_failed/update_failed/delete_failed/add_permission_failed/remove_permission_failed` 扁平 key（zh/en）。

## 4. 副本验收（topems_w7_reh_prod_20261111，非超户 topems_prod）

| 方向 | 结果 |
|---|---|
| 租户管理员改本租户角色名称 | 内层 200；库内 `name`/`description` 均变更 |
| 租户管理员删本租户角色 | 内层 200；`deleted_at` 非空；列表命中 0 |
| 租户管理员改/删全局 `admin` | 内层 403（两次）；`admin` 名称与 `deleted_at` 均未变 |
| 租户管理员改/删他租户角色 | 内层 404（两次）；探针行未变 |
| 并发删除后的第二次删除 | 内层 409“角色已被删除或状态已变更，请刷新后重试” |
| 超管改/删全局角色 | 内层 200；名称/描述落库，`deleted_at` 非空 |
| 16 条全局角色权限码 | 改前改后逐行一致（`admin 1155` 等） |
| `core_roles` 行数 | total/live/global 21/21/16 → 21/21/16（测试件已硬删） |

## 5. 生产窗口

日志：`/tmp/w7_iam_fix_20261111/window_prod.log`（`tee` 落盘）。

| 时间（UTC） | 动作 |
|---|---|
| 15:03:36 | 暂存新二进制，sha256 比对一致 |
| 15:04:36 | `launchctl bootout gui/501/com.topems.server`（旧 pid 20065） |
| 15:04:38 | 备份旧二进制 → 换新 → `bootstrap` |
| 15:04:42 | `/health` 200，新 pid 41199，停机约 5 秒 |
| 15:04:45–15:04:58 | 非超户 + 超管验收全部通过 |

生产实测：

| 方向 | 结果 |
|---|---|
| 租户管理员改本租户角色 | 内层 200；库内 `name=w7iam_t1_prod_renamed_1794409484`、`description=after` |
| 租户管理员删本租户角色 | 内层 200；`deleted_at` 非空；列表命中 0 |
| 租户管理员改/删全局 `admin` | 内层 403；库内无变化 |
| 租户管理员改/删他租户角色 | 内层 404；探针行无变化 |
| 并发删除后的第二次删除 | 内层 409 |
| 超管改/删全局角色 | 内层 200；落库后清理 |
| 16 条全局角色快照 | 改前改后 `diff NONE` |
| `core_roles` 行数 | 17 total / 16 live / 16 global，前后一致 |
| 账本 | `20261112100000` 不变 |

收尾：健康 200、pid 41199、服务 running、测试角色残留 0、工作树干净。

## 6. 遗留

- `get_user_permissions` 与 `update_role/delete_role` 的同类“少报/假不存在”不在本批；`get_user_permissions` 仍待处理。
- qms B5（54 读 + 30 处丢弃）与 B6a/B6b（86 写）按既定顺序另开窗口。
- 前端代码已推送，生产静态资源是否需单独构建发布，按前端发布流程执行（本窗口只换后端二进制）。
