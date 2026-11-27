# C2 隐性死码运行期取证 —— 首版交叉矩阵结果（2026-11-27）

> 承接方案 `permission-deadcode-forensics-plan-20261127.md` 与 L4 静态清单 `artifacts/audit/orphan-review/l4-orphan-codes.json`（581 个 BE/FE 静态零引用候选）。本批次在隔离库 `topems_replay_verify` 上跑通「起隔离实例 → 建多角色非超管账号 → 守卫临时埋点 → 多角色冒烟采集 → 交叉矩阵」全链路。**本结果为单次冒烟首版，覆盖不全，不据此判定任何权限码为真死码，不自动清理、不调整角色绑定。**

## 1. 结论摘要

| 矩阵格（581 候选） | 数量 | 判定 |
|---|---:|---|
| 活码 —— 后端守卫运行期观测到 | 0 | 后端 5 个观测码均不在 581 内（见 §4） |
| 活码 —— 前端静态引用 | 0 | 581 清单本就 FE 静态零引用（`fe_refs` 全空，已复核） |
| **待复核 —— 令牌携带 ∧ 后端未观测 ∧ 前端未引用** | **554** | 扩面复核候选，**非死码定论** |
| 未进令牌集 —— 仅绑 admin 兜底角色 | **27** | 本轮非 admin 账号令牌不带，口径盲区 |

- 5 个取证账号令牌权限并集 **1090** 码；后端守卫埋点累计 **173** 条决策，观测到 **5** 个守卫校验码。
- **关键事实**：单体路由层 `require_permission / require_any_permission / require_all_permissions` 守卫挂载高度集中在 IAM/system 模块；业务模块（mes/erp/scm/srm/pdm/…）的鉴权主要在 handler 内联判定，本轮埋点未覆盖（§6 盲区①②）。
- 554 待复核中 **536 个三段标准 CRUD 码、18 个两段聚合伞码**；按动作拆：delete 182 / create 176 / update 175 / write 8 / admin 7 / **read 仅 5** / approve 1。写码占绝对多数，而本轮冒烟只读 GET 端点，写操作守卫未触达（§6 盲区③）。

## 2. 取证环境（隔离，不触 prod）

- **隔离库**：`topems_replay_verify`（#88 回放至链尾，#90 属主收敛 + app 授权归一）；prod 副本 `topems_prod` 全程未连、未写。
- **隔离后端实例**：单体 `topems-server`，端口 **8199**，`DATABASE_URL/MIGRATE_URL` 显式指向隔离库，Redis `redis://localhost:6379/1`；现有 prod 实例（pid 44765，8099，连 `topems_prod`，挂 cloudflared 隧道）不停、不复用、不切库。
- **取证账号（全部 `is_superuser=false`，禁超管 `["*"]` 短路）**：

| 账号 | 角色 | 令牌权限数 | 定位 |
|---|---|---:|---|
| `c2_tenant_admin` | tenant_admin | 1087 | 高权非超管 |
| `c2_finance_mgr` | finance_manager | 102 | 中权（财务） |
| `c2_mes_mgr` | mes_manager | 76 | 中权（生产） |
| `c2_report_mgr` | report_manager | 8 | 低权（报表） |
| `c2_guest` | （无角色） | 0 | 空权对照 |

- 账号/口令/令牌仅存本机 `/tmp/topems-c2/`（0600），不入 git；回退 `DELETE FROM iam.users WHERE username LIKE 'c2_%'`（级联角色绑定/会话/刷新令牌）。

## 3. 采集口径与产物

- **令牌授权集**：登录/换签由 `core_user_roles → core_role_permissions → core_permissions.code` 实时聚合写入 Claims（`unified-core/iam/auth.rs`、`user/models.rs::resolve_user_grants`，系统通道读 RLS 目录）。
- **后端守卫观测**：临时埋点 `svc/unified-core/src/middleware/permission.rs`（`c2_trace` 追加写 JSONL，线程安全 `OnceLock<Mutex<File>>`），字段 `ts/user/super/roles/route(method+path)/guard/required/matched/allowed`。埋点代码**未入库、取证后回退**（备份 `/tmp/permission.rs.bak`）。
- **冒烟范围**：路由清单去重后 **1174** 个无参业务 GET 端点（剔除静态/WS/健康/文档），5 角色并发 8 轮询；只读 GET，不触发写操作。
- **产物（`artifacts/audit/forensics-c2/`，gitignore 不入库）**：
  - `c2-matrix.json`：581 逐条四格标记 + 角色绑定/段数/动作元数据；
  - `c2-matrix.csv`：同表扁平导出；
  - 原始决策日志 `artifacts/audit/guard-trace.jsonl`。
- **前端可见性**：本轮未起隔离前端 dev，前端维度以 L4 静态 `fe_refs` 代理；运行期动态菜单/资源采集列为扩面项（§6 盲区④）。

## 4. 后端观测到的 5 个守卫校验码

| 守卫码 | 决策次数 | 命中 | 拒绝 | 落在 581 | 后端静态引用 |
|---|---:|---:|---:|:---:|:---:|
| `system:read` | 85 | 0 | 85 | 否 | 有 |
| `system:audit` | 65 | 0 | 65 | 否 | 有 |
| `iam:tenant:read` | 20 | 0 | 20 | 否 | 有 |
| `iam:read` | 3 | 3 | 0 | 否 | 有 |
| `tenant:iam:user:read` | 3 | 3 | 0 | 否 | 有 |

5 码均有后端静态引用（`be_refs` 非空），属活码；**无一进入 581 零引用候选集**。`portal-service` 为服务间调用身份的少量决策，不计入用户角色样本。

## 5. 554 待复核候选分层（供人工复核，非分类定论）

- **段数**：三段资源 CRUD 536；两段聚合伞码 18。
- **动作**：写操作（create/update/delete/write/admin/approve）549，读操作（read）5。
- **首段前缀 Top**：mes 50、srm 40、erp 39、scm 38、pdm 36、rd 35、hrm 34、wms 33、ehs 32、finance 32、lims 28、qms 24、crm 23、integration 20、aps 15、workflow 15、tms 13、notification 11、bi 8、pm 7。
- **5 个 read 码**：`erp:general_ledger:read`、`integration:read`、`master-data:read`、`notification:template:read`、`report:read` —— 读码优先扩面复核（GET 路径最易触达）。
- **27 个 admin 兜底未进令牌码**：仅绑 `admin` 角色（21 三段、6 两段伞码），含 iam/migration/monitor/plugin/system/tenant 管理类写码与伞码；需 admin 角色账号或超管上下文复核，但超管 `["*"]` 短路无鉴别力，本身是口径盲区。

## 6. 观测盲区与局限（单次冒烟，未出现 ≠ 死码）

1. **handler 内联鉴权未埋**：业务模块在 handler 内直接调 `claims.has_permission(...)`（普查 63 点、约 18 文件），不经 permission.rs 路由守卫，本轮 trace 不记录；`check_module_action` 收口函数外部调用为 0（仅定义与测试）。
2. **守卫经枚举/常量/权限注册表间接引用**：静态字面量扫描收不全，埋点记录的是最终校验码；本轮路由守卫仅暴露 5 码，内联层是否消费 554 候选未知。
3. **只读 GET 冒烟**：554 中写码 549 个，其守卫挂在 POST/PUT/DELETE 路由；隔离库无业务数据、写操作有副作用，本轮未打，写码守卫决策全部未观测。
4. **前端运行期动态资源未采集**：未起隔离前端 dev；菜单/按钮/SDK/i18n 动态资源从 DB 拉取，静态 `fe_refs` 可能漏记，需运行期会话内采集补全。
5. **单次冒烟 + 空库**：隔离库无业务单据，部分列表/详情/投影端点 404/500，未走到对应守卫；多角色流程未串联跑通。
6. **admin/超管口径**：27 个 admin 兜底码未进非超管令牌集；超管令牌 `permissions=["*"]` 短路，权限集无鉴别力，不能用于守卫观测。

## 7. 后续扩面建议（另立项，不在本批次执行）

- **后端补埋**：在 `Claims::has_permission` 或各模块内联判定点补观测（区分中间件/内联来源，去重），覆盖 63 个内联调用点；重编复扫。
- **写操作冒烟**：在隔离库造最小业务单据样本后，补 POST/PUT/DELETE 路径，观测写码守卫；或先按路由清单静态映射「路由 → 守卫码」做第二遍交叉，弥补运行期未触达。
- **前端运行期采集**：起隔离前端（独立端口 + 代理 8199），会话内导出路由守卫/菜单/按钮实际读取码集合，与静态 `fe_refs` 对账。
- **复核分类**：扩面后对仍「令牌携带 ∧ 两端未出现」的候选，对照功能清单/路由表/菜单表/代码历史，归入 **规划预留**（未上线预登记，保留）/ **已下线残留**（功能已移除，目录评审后清理绑定）/ **真死码**（不消费、无规划，走种子/目录评审，不自动 DROP）。

## 8. 回退清单

- 埋点代码：`cp /tmp/permission.rs.bak svc/unified-core/src/middleware/permission.rs` 后重编；删除 `artifacts/audit/guard-trace.jsonl`。
- 隔离实例：停 pid 10674（8199）；隔离库 `DROP DATABASE topems_replay_verify` 可整体回退。
- 取证账号：`DELETE FROM iam.users WHERE username LIKE 'c2_%'`；清理 `/tmp/topems-c2/`。
- 本结论文档与台账条目入库；`artifacts/audit/` 下取证产物保持 gitignore，不入库。
