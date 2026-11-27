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

## 11. v3.1 增量：静态间接引用补盲普查（#98，2026-11-28）

> 针对盲区②（守卫经枚举/常量/拼接/注册表间接引用，静态字面量 `be_refs` 收不全）做第二遍**静态只读**复核；不重启实例、不写隔离库、不改鉴权逻辑、不据此判死码。主矩阵分类不变（活码 1 / 待复核 553 / 兜底 27），仅逐行补 `static_indirect` 来源标记。

### 11.1 复核口径：区分「守卫消费点」与「权限集组装点」

- **守卫消费点**：运行期在 `claims.has_permission(...)` 校验权限码，码是否被实际挂载决定后端是否有引用。
- **权限集组装点**：把码加入默认/套餐权限集（授予侧），不校验；若路径未落地写库，则不构成实际授权或消费。
- 静态拼接按代码形态分四类核查：中间件写门拼接、模块权限枚举拼接、套餐/tier 权限集组装、未接线预留函数。

### 11.2 生产接线：中间件写门拼接 `{module}:admin`（A 类，7 码命中 581）

- 规则：`require_module_write(module)`（`lib/shared-auth/src/middleware/permission.rs:168`）对非 GET/HEAD/OPTIONS 方法 `format!("{module}:admin")` 校验；是生产守卫链上**唯一**的动态拼接消费点。
- 扫描到 18 个写门模块挂载：crm、ehs、finance、gis、hrm、integration、lims、master-data、mes、monitor、pdm、pm、qms、rd、search、srm、ticket、tms。
- 落入 581 双零集共 **7** 码（静态字面量漏扫，同类 `srm:admin`）：

| 码 | v3 主分类 | 写门挂载点 |
|---|---|---|
| `srm:admin` | 活码-后端运行期观测（#96 已命中 20 次） | `svc/srm/src/main.rs:219`、`svc/server/src/modules/srm_real_module.rs:108` |
| `master-data:admin` | 待复核 | `svc/master-data/src/main.rs:63`、`svc/server/src/modules/master_data_real_module.rs` |
| `monitor:admin` | 仅 admin 兜底 | `svc/monitor/src/main.rs:63`、`svc/server/src/modules/monitor_real_module.rs` |
| `rd:admin` | 待复核 | `svc/rd/src/main.rs:117`、`svc/server/src/modules/rd_real_module.rs:73` |
| `search:admin` | 待复核 | `svc/search/src/main.rs:78,98`、`svc/server/src/modules/search_real_module.rs:137` |
| `ticket:admin` | 待复核 | `svc/ticket/src/main.rs:61`、`svc/server/src/modules/ticket_real_module.rs:72` |
| `tms:admin` | 待复核 | `svc/tms/src/main.rs:160`、`svc/server/src/modules/tms_real_module.rs:87` |

- **结论边界**：这 6 个新标注码在后端确有写门挂载点，但写门仅非 GET 校验；本轮只读 GET 冒烟未触达，运行期 trace 0 观测与静态挂载点并存。**有挂载点 ≠ 活码定论**，待写操作冒烟（造最小单据样本）运行期确认 `allowed`。

### 11.3 框架预留：套餐矩阵组装（B 类，10 码命中 581，非消费点）

- 规则：`default_permissions_for_tier`（`svc/unified-core/src/modules/subscription/mod.rs:626-631`）按套餐矩阵拼 `{module}:read/write/admin`；`sync_permissions_for_tenant` 自述为**框架版本**，创建/升级租户时仅 `tracing::info!` 记录权限计数，**未写库** `core_role_permissions`/用户绑定。
- 命中 581 共 **10** 码：`integration:read`、`master-data:read/write/admin`、`monitor:admin`、`rd:admin`、`search:admin`、`srm:admin`、`ticket:admin`、`tms:admin`（其中 7 个同时属 A 类写门挂载）。
- 定性：授予侧框架路径，未落地授权；不构成守卫消费点，标记为 `plan-tier-assemble` 供后续套餐权限落地时复核。

### 11.4 已接线但 0 命中：模块权限枚举拼接（D 类）

- `check_module_permission_claims`（`lib/shared-auth/src/permission.rs:242`）经各模块 Permission 枚举（`ModuleCode`×`PermissionAction`）拼两段码；crm/hrm/scm/erp 封装 `check_permission` 生产接线（调用面 crm 195 / scm 129 / erp 78 / hrm 28）。资源维度在枚举层压平到模块级，不产生三段码。
- 拼出两段码：`crm/hrm:read/write/admin`、`scm/erp:read/write/admin/approve`，**均不在 581 双零集**（`be_refs` 静态已覆盖或非双零），本轮无新增漏扫码。

### 11.5 未接线预留（生产零调用，不计引用）

- `require_module_active` / `require_module_permission`（`lib/shared-auth/src/middleware/module.rs`）：生产零调用，仅测试桩；枚举 `ModuleCode`(39)×`PermissionAction`(5) 理论可拼两段码，但不在守卫链消费。
- `check_module_action`（`svc/unified-core/src/middleware/permission.rs:573`）：生产零调用，仅文档示例与测试。
- `tier_permissions`（`lib/shared-auth/src/tier.rs:91`）：生产零调用，仅测试。

### 11.6 v3.1 产物与边界

- 矩阵 `artifacts/audit/forensics-c2/c2-matrix.json/.csv`：逐行新增 `static_indirect`（`guard-write-join` / `plan-tier-assemble`）与 `static_indirect_note`；顶层 `static_indirect_scan` 记录四类规则、模块清单、命中码与未接线备注。v3 备份 `/tmp/topems-c2/c2-matrix.v3.bak.json/.csv`。
- 本轮为静态侧补盲：A 类挂载点待写操作冒烟运行期确认；B 类待套餐权限落地后复核；D 类与未接线项不改变 581 既有分类。仍**不得**据静态引用或单次取证自动清理权限码/解除绑定。

## 12. v3.2 增量：静态路由→守卫码映射交叉（#99，2026-11-28）

### 12.1 目的与口径

- 承接 §7「写操作冒烟」的**静态预备**分支：在不起实例、不重编、不写隔离库的前提下，按路由清单静态映射「路由→写门 admin 码」，为后续写操作冒烟预排目标端点。本轮纯静态只读，不触 prod、不改鉴权/令牌签发、不下活码定论。
- 写门口径沿用 §11.2：`require_module_write(module)` 对 `GET/HEAD/OPTIONS` 放行，其余方法（POST/PUT/DELETE/PATCH）校验 `{module}:admin`。

### 12.2 方法

- 遍历 18 个写门模块 `svc/<module>/src/**/*.rs`，正则提取每个 `.route(...)` 段内路径字符串与方法关键字；含任一写方法（post/put/delete/patch）即计入写候选。
- 启发式标注疑似豁免子组：`/health*`、`/ws/`、`/openapi`、`/metrics`、根路径 home，以及独立 `mcp.rs` 路由（如 search `POST /mcp` 由 `mcp_routes()` 独立 merge，未挂模块写门）。
- **裁剪局限**：未按 axum Router 嵌套作用域逐组解析，清单为**模块级静态上界**；豁免标注为路径/文件名启发式，端点级是否真受写门保护须后续运行期确认。

### 12.3 结果

- 18 模块合计 **1319** 个写候选端点（静态上界，含待剔除的豁免端点）。7 个落入 581 双零的写门码与 §11.2 A 类完全一致：

| 写门码 | 写候选 | 豁免候选 | 当前分类 |
| --- | ---: | ---: | --- |
| `master-data:admin` | 135 | 4 | 待复核 |
| `rd:admin` | 41 | 4 | 待复核 |
| `ticket:admin` | 34 | 2 | 待复核 |
| `monitor:admin` | 30 | 10 | 兜底 |
| `tms:admin` | 28 | 0 | 待复核 |
| `search:admin` | 1 | 3 | 待复核 |
| `srm:admin` | 46 | 0 | 活码（#96 已观测） |

- 矩阵主分类不变：活码 1 / 待复核 553 / 兜底 27。

### 12.4 边界与产物

- 边界：本表不判定活码；`monitor:admin` 等静态挂载点与兜底分类并存，端点归属与真实门槛须写操作冒烟运行期确认；豁免启发式可能漏标，不得据此反向认定某端点「无门」。
- 产物（`artifacts/audit/forensics-c2/`，gitignore）：`route-guard-map.json`（18 模块全量映射 + 豁免标注 + `scope_note`）；矩阵 `c2-matrix.json/.csv` v3.2 回填 `route_write_candidates`/`route_exempt`，顶层 `route_guard_map` 汇总；v3.1 备份 `/tmp/topems-c2/c2-matrix.v31.bak.json/.csv`；脚本 `/tmp/topems-c2/route-guard-map.py`、`refresh-matrix-v32.py`、`refresh-csv-v32.py`。

## 13. v3.3 增量：写操作冒烟守卫观测（#102，2026-11-28）

### 13.1 背景与口径

- 承接 #95 盲区③（只读 GET 未触达写码守卫）与 #99 静态路由清单。本轮为**层 1 守卫触发观测**：对写候选端点发 POST/PUT/PATCH/DELETE，观测写门 `require_module_write` 对 `{module}:admin` 的 `has_permission` 判定；**不造业务单据样本、不求写成功**，空/最小请求体。隔离实例 8199 / `topems_replay_verify` / Redis db1，复用含埋点二进制；prod 8099 / `topems_prod` 全程未停未切。
- 观测通道：写门内部 `claims.has_permission` 走 #96 内联埋点（`inline-trace.jsonl`，字段 `permission/allowed/source`）；写门自身无独立 guard-trace。

### 13.2 采集

- 目标：#99 清单 7 个写门模块（master-data/monitor/rd/search/ticket/tms/srm）共 **315** 个写候选端点；路径前缀 `/api/<module>`，`{id}` 占位 UUID。
- 三轮取证账号（全部 `is_superuser=false`，无 `["*"]` 短路）：`c2_admin`（admin，1158 码）、`c2_tenant_admin`（tenant_admin，1087 码，业务高权）、`c2_guest`（无角色，0 权对照）。登录重新换签，令牌集与 DB 聚合逐一吻合。
- HTTP 状态分布：admin 轮 404×170 / 422×96 / 200×33 / 400×9 / 500×4 / 405×3（无 403）；guest 轮 403×193 / 404×122；tenant_admin 轮 404×170 / 422×78 / 403×30 / 200×21 / 400×9 / 500×4 / 405×3。

### 13.3 判定结果

| 写门码 | tenant_admin 携带 | ta 写门命中 | admin 命中 | guest 对照 | v3.3 分类 |
| --- | :---: | :---: | :---: | --- | --- |
| `srm:admin` | 是 | allowed 65 | allowed 65 | — | 活码（#96 复核一致） |
| `rd:admin` | 是 | allowed 37 | allowed 37 | **写门 denied 37** | 活码 |
| `ticket:admin` | 是 | allowed 34 | allowed 34 | access 门前置拦截 | 活码 |
| `tms:admin` | 是 | allowed 28 | allowed 28 | access 门前置拦截 | 活码 |
| `master-data:admin` | 是 | allowed 13 | allowed 13 | access 门前置拦截 | 活码 |
| `search:admin` | 是 | allowed 1 | allowed 1 | access 门前置拦截 | 活码（样本薄） |
| `monitor:admin` | **否** | 未触达 | allowed 30 | access 门前置拦截 | **兜底（维持）** |

- **改判活码 5 个**：`master-data:admin`、`rd:admin`、`search:admin`、`ticket:admin`、`tms:admin`——tenant_admin 业务角色令牌携带并在写门命中 allowed，代码路径为 `require_module_write` 拼接消费，证据形态同 #96 `srm:admin`。`rd:admin` 双向证据最完整（业务角色/admin 放行 + guest 写门 denied 37）。
- **`monitor:admin` 维持兜底**：tenant_admin 令牌不带该码，且被前置 `require_module_access` 模块访问门拦截、写门未触达；仅低鉴别力 admin 角色放行 30 次，证据不足，不升活码。
- 矩阵 v3.3 主分类：**活码 6 / 待复核 548 / 兜底 27**（活码 1→6，待复核 553→548，兜底 27 不变）。

### 13.4 盲区与边界

1. **access 门前置遮挡写门对照**：`require_module_access`（`has_module_permission`，#96 埋点未覆盖）先于写门执行；低权/无模块访问权账号被挡在写门外，故除 rd 外写门 denied 未落 inline-trace。403 响应体可区分两门：写门「需要 X 模块管理员权限（X:admin）」，访问门「需要 X 模块权限」。
2. **未触达业务写成功路径**：空/最小请求体多在参数校验层 422/400 或路由 404；200 多为导出/统计/空响应，未造单据样本，写门放行后的业务落库与下游回传未复核。
3. **样本薄**：`search:admin` 模块仅 1 个写候选端点（`/recent` DELETE），命中 1 次，结论待更多写端点复核。
4. **端点级定位仍缺**：inline-trace 无 route/handler 字段（#96 盲区①延续），每条判定未映射到具体触发端点。
5. 本轮仅做守卫观测与矩阵标注，**不自动清理权限码、不解除绑定**；活码判定基于隔离库单次冒烟，扩面后仍需对照功能清单/路由表复核规划预留与下线残留。

### 13.5 产物与回退

- 产物（`artifacts/audit/forensics-c2/`，gitignore）：矩阵 `c2-matrix.json/.csv` v3.3（逐行 `write_smoke` 三轮判定 + `write_smoke_note`，顶层 `write_smoke_scan`）；写冒烟请求记录 `/tmp/topems-c2/write-smoke-<role>.json`；脚本 `/tmp/topems-c2/write-smoke.py`、`login-write.py`、`refresh-matrix-v33.py`、`refresh-csv-v33.py`；v3.2 备份 `/tmp/topems-c2/c2-matrix.v32.bak.json/.csv`。
- 回退：停隔离实例（8199）；隔离库 `DELETE FROM iam.users WHERE username LIKE 'c2_%'` 级联会话/刷新令牌/登录日志；还原两份埋点 `.rs` 备份并重编；清 `artifacts/audit/*.jsonl` 与 `/tmp/topems-c2/`；隔离库可 `DROP DATABASE topems_replay_verify`。

### 13.6 兜底 27 码引用面分层复核（#104，静态只读）

- **背景**：承接 §13.3 `monitor:admin` 维持兜底，对兜底分类全部 27 码做一次引用面分层甄别，确认 #98/#99 静态普查是否漏扫生产消费点。全程静态只读：不起实例、不写隔离库、不改鉴权、不下死码定论。
- **分层口径**：`be_prod`（`svc/**/*.rs`，排除 tests，守卫/业务消费点）、`fe_component`（`apps/web/src` 组件，排除目录表/配置/locales）、`fe_catalog`（前端 `config/permissions.ts` 目录登记表）、`seed_sql`（`database/**/*.sql` 授予侧目录）、`test_lib`（测试断言）。
- **统一画像**：27 码均 `in_token=false`（6 个取证账号令牌均不带）、`role_cnt=1`、仅 admin 角色令牌携带（`in_admin_token=true`）、业务角色零授予；运行期只在低鉴别力 admin 路径出现。
- **复核结果**：27/27 `be_prod=0`、`fe_component=0`；全部登记于前端目录表（`fe_catalog=1`）与 seed/migration SQL；仅 `iam:delete` 另有 1 处 `lib/tests` 断言。即生产守卫与前端组件均无字面量消费点，命中均为目录/授予侧/测试残留，不构成守卫消费证据。
- **两点口径辨析**：
  1. `monitor:admin` 的后端接线来自 #98 A 类写门**动态拼接**（`require_module_write` 拼 `{module}:admin`），非字面量，故 `be_prod` 字面量扫描为 0 属预期；它仍挂 30 个写候选（#99），只是业务角色未授予、被访问门前置拦截，证据不足维持兜底。
  2. 其余 26 码（`iam:delete`、`iam:permission:*`、`migration:service:*`、`monitor:alert/log/rule:*`、`plugin:plugin:*`、`system:*`、`admin:dashboard:write`、`tenant:member:delete`）无写门/守卫静态挂载点，属目录/seed 残留候选；是否下线目录登记待业务拍板，不据本轮静态复核自动清理或解绑。
- **产物**（`artifacts/audit/forensics-c2/`，gitignore）：`fallback-27-reference-scan.json`（逐码分层命中文件/计数 + 口径注记）；脚本 `/tmp/topems-c2/scan-fallback-refs.py`。矩阵主分类不变：活码 6 / 待复核 548 / 兜底 27。

### 13.7 待复核 548 码静态画像分层（#105，静态只读）

- **背景**：承接 §13.4 盲区，对待复核分类全量 548 码做静态画像分层，定位下一轮运行期采集靶心；全程静态只读，不起实例、不写隔离库、不改鉴权、不下死码定论。
- **层级与绑定画像**：536 个三段资源码（`module:resource:action`）+ 12 个两段模块码；覆盖 25 个业务模块（mes 50 / erp 39 / srm 39 / scm 38 / pdm 36 / hrm 34 / rd 34 / wms 33 / ehs 32 / finance 32 …）；绑定形态为 `admin + 业务经理角色 + tenant_admin`（如 `admin,mes_manager,tenant_admin`）；后端运行期观测 0、前端静态引用 0。
- **后端三段码守卫交叉**：收集 `svc/**/*.rs`（排除 tests）三段冒号码字面量共 610 种，与 581 orphan 集 **0 命中**——待复核资源码未出现在后端守卫字面量中，无 #104 之外的漏扫后端消费点。
- **资源名文本对照（参考分层，口径受限）**：335 个资源名出现于后端代码文本、213 个未出现。须注意：资源名命中可能来自表名/结构名/注释/通用词（如 `return`、`check`），**不等于守卫消费**；未出现者更接近纯预留，出现者仍须运行期/前端对账确认。未出现占比偏高的模块：hrm 30/34、srm 30/39、scm 27/38、qms 21/24、crm 18/23；rd/integration/aps/workflow/tms/notification/bi 等资源名全部出现。
- **12 个两段码**：`crm:delete`、`doc:delete`、`gis:delete`、`integration:delete`、`integration:read`、`master-data:read`、`master-data:write`、`notification:delete`、`report:read`、`workflow:admin`、`workflow:approve`、`workflow:delete`；多为 `delete/approve` 粗粒度动作，未被枚举两段守卫（`read/write/admin`）覆盖。
- **定性边界**：待复核子集多为 seed 批量登记的资源级权限；是规划预留、下线残留还是真死码，须经前端菜单/按钮/SDK 运行期对账与后端细粒度守卫观测后再分，本轮静态复核不自动清理或解绑。
- **产物**（`artifacts/audit/forensics-c2/`，gitignore）：`pending-548-profile.json`（逐码层级/模块/角色/令牌/字面量命中/资源名分层 + 口径注记）；脚本 `/tmp/topems-c2/scan-pending-profile.py`。矩阵主分类不变：活码 6 / 待复核 548 / 兜底 27。

### 13.8 前端权限引用扩展采集与 fe_refs 对账（#106，静态只读）

- **背景**：承接 §13.4 前端运行期对账盲区，对 581 双零码做前端静态扩展采集，复核 #53 四向比对的 `fe_refs` 是否漏采手写消费点。全程静态只读，不起浏览器、不写库、不改鉴权、不下死码定论。
- **采集范围（较 #53 口径扩展）**：`apps/web/src` + 7 个 `packages/*/src`（app-shell / business-tools-sdk / shared-components / shared-hooks / shared-utils / api-client / shared-types / tokens）+ `i18n/locales/**/*.json`，共 2573 个前端文件；扩展名 `.ts/.tsx/.js/.jsx/.json`；排除 target/node_modules/dist/测试/vendor。
- **分层口径**：`menu_config`（module-configs 模块菜单/权限配置）、`component`（组件/hooks 鉴权判断）、`app_shell`、`sdk`（business-tools-sdk/shared-*）为**消费候选层**；`catalog_list`（`CORE_PERMISSION_CODES` 全量清单数组）、`catalog_def`（`PERMISSION_DEFS` 码→名称表）、`role_template`（`ROLE_PERMISSIONS` 角色模板）、`i18n`、`test` 为登记/授予侧/测试，不计消费证据。
- **对账结果**：
  - 581 双零码在消费候选层（menu_config/component/app_shell/sdk）**0 命中**；前端唯一登记位置为 `CORE_PERMISSION_CODES` 清单（581/581），其中仅 7 个同时进入 `PERMISSION_DEFS` 名称表（`admin:dashboard:write`、`system:center:read`、`erp:general_ledger:read`、`finance:dashboard:write`、`lims:dashboard:write`、`rd:dashboard:write`、`report:dashboard:write`）。
  - 全集前端消费层引用码与 581 零重叠：menu_config 413、component 294、app_shell 100；真实接线码形如 `crm:dashboard:read`、`mes:production_order:complete`、`wms:stocktake:admin/write`。
  - **拼接路径核查**：模块级守卫（`usePermission` 的 `canAccessModule/canWriteModule/...`）只拼两段码 `${module}:read/write/delete/admin/create/update/approve`，不拼第三段资源；三段资源码无前端动态拼接生成路径。
- **口径结论**：现有 `fe_refs` 排除全量目录表的判定口径准确，581 码前端无漏采手写消费点；574 个三段资源码仅在清单数组挂名、连名称表都未进。前端静态侧与 §13.7 后端静态侧一致：双零码未被前端鉴权链路引用。
- **盲区边界**：本轮为静态字符串对账，未跑运行期菜单/按钮显隐；`:view` 后缀码经 `:view→:read` 回退判定（#P3 兼容层），不在 581 DB 登记集；SDK 远端动态注入、菜单配置由后端下发的部分未在静态覆盖。是否预留/残留/死码仍须运行期菜单按钮采集 + 后端细粒度观测后再分。
- **产物**（`artifacts/audit/forensics-c2/`，gitignore）：`fe-refs-recon.json`（逐码分层命中 + 消费层对账 + 口径注记）；脚本 `/tmp/topems-c2/scan-fe-refs.py`。矩阵主分类不变：活码 6 / 待复核 548 / 兜底 27。





