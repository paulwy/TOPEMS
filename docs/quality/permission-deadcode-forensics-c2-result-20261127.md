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

> **v2 增量（#96，内联收口补埋后复扫，见 §9）**：后端观测并集由 5 码扩至 **45** 码；581 双零候选中 **1 个改判活码 `srm:admin`**（模块写门拼接码，静态漏扫）；待复核 **553**、admin 兜底 **27** 不变。上表为 v1 首版口径，v2 数字以 §9 与 `c2-matrix.json` 为准。

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

- 埋点代码：`cp /tmp/permission.rs.bak svc/unified-core/src/middleware/permission.rs`；`cp /tmp/auth.rs.bak lib/shared-auth/src/auth.rs`（#96 收口补埋）；后重编；删除 `artifacts/audit/guard-trace.jsonl` 与 `artifacts/audit/inline-trace.jsonl`。
- 隔离实例：停 pid 18951（8199，#96 重启后；v1 为 10674）；隔离库 `DROP DATABASE topems_replay_verify` 可整体回退。
- 取证账号：`DELETE FROM iam.users WHERE username LIKE 'c2_%'`；清理 `/tmp/topems-c2/`。
- 本结论文档与台账条目入库；`artifacts/audit/` 下取证产物保持 gitignore，不入库。

## 9. v2 增量：内联鉴权收口补埋复扫（#96，2026-11-27）

> 本节为 v1 首版之后的第二轮取证，针对盲区①（handler 内联 `claims.has_permission` 未埋）补埋收口后复扫；口径仍为隔离库单次只读冒烟，**不据此对其余 553 码判死码**。

### 9.1 补埋口径

- **静态甄别**：`Claims::has_permission` 内联调用 **72 处 / 25 文件**（file、notification、ai、finance、tenant_scope、wms、qms、gis、erp、rd、pm、mobile、ehs 等）；`has_role` 6 处；`has_any/all_permission`、`has_module_permission` 内联 0 处。`shared/util.rs` 位掩码版 `has_permission(mask, PermissionBit)` 10 处属旧位体系，与字符串权限码无关，未纳入。
- **接入点**：共享 crate `lib/shared-auth/src/auth.rs` 的 `Claims::has_permission` 方法本体——一处覆盖 72 内联点与经此转发的路由守卫；独立落 `artifacts/audit/inline-trace.jsonl`，字段 `ts/user/super/roles/permission/allowed/source`；不改鉴权语义（先算 `allowed` 再记录后返回）。原文件备份 `/tmp/auth.rs.bak`，与 `permission.rs` 同属临时改动、禁止入库。
- **编译/重启**：`topems-shared-auth` check 通过；`topems-server` release 12m34s 通过（仅 `__eh_frame` 体积警告）。隔离实例重启为 pid **18951**（8199），health 200，31 模块、降级 0、池 18/62；prod 实例 44765 未动，隔离库 app 24 连接、prod 副本 c2_ 用户 0，无串库。

### 9.2 复扫观测

- 复用 5 个有效令牌（403 穿守卫层，未重登），1174 个无参 GET 五角色并发；`inline-trace` **1469** 行、`guard-trace` **351** 行。
- 后端观测并集 **45** 码（guard 5 码全部经收口转发落入 inline 集，无新增守卫层码）。

### 9.3 v2 交叉矩阵（581 双零候选）

| 矩阵格（581 候选） | v1 | **v2** | 判定 |
|---|---:|---:|---|
| 活码 —— 后端运行期观测到 | 0 | **1** | `srm:admin`（见 9.4） |
| 活码 —— 前端静态引用 | 0 | 0 | 581 本就 FE 静态零引用 |
| 待复核 —— 令牌携带 ∧ 两端未观测 | 554 | **553** | 扩面复核候选，非死码定论 |
| 未进令牌集 —— 仅绑 admin 兜底 | 27 | **27** | 口径盲区，不变 |

### 9.4 改判活码：`srm:admin`

- 观测：`c2_tenant_admin` 令牌携带并命中 **20** 次（`allowed=true`）；绑 `admin,tenant_admin`。
- 代码路径：srm 模块写门 `require_module_write("srm")`（`lib/shared-auth/src/middleware/permission.rs:168`）经 `format!("{module}:admin")` **拼接**生成 `srm:admin`；挂载点 `svc/srm/src/main.rs:219`、`svc/server/src/modules/srm_real_module.rs:108`。
- 静态漏扫原因：码由模块名 + `:admin` 拼接，源码字面量中无 `srm:admin` 串，故 L4 静态 `be_refs` 为空、误入 581 双零；运行期收口真实消费，属**活码**，印证盲区②（枚举/常量/拼接间接引用静态收不全）。

### 9.5 553 待复核分层（v2，供人工复核）

- **段数**：三段 CRUD 536；两段聚合伞码 17（v1 为 18，`srm:admin` 移出）。
- **动作**：delete 182 / create 176 / update 175 / write 8 / admin 6 / **read 5** / approve 1（写码 548、读码 5）。
- **前缀 Top**：mes 50、erp 39、srm 39、scm 38、pdm 36、rd 35、hrm 34、wms 33、ehs 32、finance 32、lims 28、qms 24。
- **5 个 read 码**（不变，优先扩面）：`erp:general_ledger:read`、`integration:read`、`master-data:read`、`notification:template:read`、`report:read`。

### 9.6 v2 仍存盲区

1. **收口层无路由上下文**：`Claims::has_permission` 方法本体拿不到 Request，inline-trace 未记 route/handler 来源；`srm:admin` 20 次的具体触发端点，待补 route 字段后定位。
2. **写码守卫未触达**：写门 `require_module_write` 对 GET/HEAD/OPTIONS 直接放行；本轮只读 GET，548 个写码决策仍未观测。
3. **前端运行期动态资源未采集**：未起隔离前端，菜单/按钮/SDK/i18n 动态资源缺运行期对账。
4. **空库单次冒烟**：部分列表/详情/投影端点 404/500，未走到对应守卫。
5. **admin/超管口径**（#97 已解除 admin 角色侧）：原 27 个 admin 兜底码未进非超管令牌集；#97 补建非超管 admin 账号（1158 具体码、不短路）纳入观测，见 §10。超管 `["*"]` 短路口径仍不可用于鉴别。

### 9.7 v2 产物

- `artifacts/audit/forensics-c2/c2-matrix.json/.csv`：v2 逐条四格标记，顶层含 `observed_sources`（guard/inline 拆分与行数）、`be_observed_in_orphan`。
- v1 矩阵备份：`/tmp/topems-c2/c2-matrix.v1.bak.json/.csv`。
- 原始日志：`guard-trace.jsonl`（守卫层）、`inline-trace.jsonl`（收口层）。

## 10. v3 增量：admin 角色取证账号与兜底码 GET 补扫（#97，2026-11-27）

> 针对 §9.6 盲区⑤（admin/超管令牌口径不可用）补扫；仍为隔离库只读 GET 冒烟，**27 个兜底码 GET 未观测不等于死码**。

### 10.1 账号与口径

- 隔离库新增 `c2_admin`，绑 `admin` 角色（1158 权限），`is_superuser=false`、默认租户 member/active。**admin 是角色绑定而非超管**：令牌承载 1158 个具体权限码，不走超管 `["*"]` 短路，具备鉴别力。
- 登录 200，`roles=[admin]`、`perm_cnt=1158`；**27 个原兜底码全部进入 admin 令牌集**（此前仅绑 admin，5 个非超管令牌带不到）。

### 10.2 补扫结果

- 1174 个无参 GET，c2_admin 并发轮询：200=880 / 403=16 / 404=225，其余 400/501/405/500/503。
- 后端观测并集仍 **45** 码；**27 兜底码运行期 0 观测**。

| 兜底码分层 | 数量 | 码 |
|---|---:|---|
| 读/伞码（GET 理论可触达） | 5 | `system:center:read`、`system:dictionary`、`system:monitor`、`system:plugin`、`system:settings` |
| 写/管理码（守卫挂 POST/PUT/DELETE） | 22 | `admin:dashboard:write`、`iam:delete`、`iam:permission:create/delete/update`、`migration:service:create/delete/update`、`monitor:admin`、`monitor:alert:create/delete/update`、`monitor:log:create/delete/update`、`monitor:rule:create/delete/update`、`plugin:plugin:create/delete/update`、`tenant:member:delete` |

### 10.3 结论边界

- **口径盲区⑤已解除**：admin 角色令牌可用于兜底码观测，且非短路、有鉴别力。
- 22 写码守卫挂写方法，本轮只读 GET 未触达；5 读/伞码在空库 GET 路径多 404/500，未走到守卫。两者均**不能据此判死码**；写码待写操作冒烟（需先造最小单据样本），读/伞码待前端/完整流程复核。

### 10.4 矩阵 v3 与产物

- 分类数量不变：活码 1 / 待复核 553 / admin 兜底 27。
- 逐行新增 `in_admin_token`、`in_nonadmin_token` 标记；顶层 `admin_scan` 记录账号、角色、权限数、携带数、GET 观测数与读/写分层。
- v2 矩阵备份：`/tmp/topems-c2/c2-matrix.v2.bak.json/.csv`。
