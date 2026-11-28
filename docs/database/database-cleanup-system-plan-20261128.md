# 数据库全量清理体系与方案（上线前脏环境归零）

> 日期：2026-11-28　状态：方案设计（只读普查，未执行任何 DROP/DELETE）
> 适用前提：**生产尚未真正上线**，现存库均为本机开发 / prod 副本 / 门禁 / 演练 / 测试环境，可在受控窗口清理。一旦真实业务数据上线，业务单据与用户数据不在可清范围。
> 关系文档：[environment-provisioning.md](../quality/environment-provisioning.md)（基线即唯一供给入口）、[role-ownership.md](./role-ownership.md)（身份与权限台账）。

## 1. 结论

**能真正清理，且应复用既有「基线快照 + 前向迁移」供给体系，不另造一套建库逻辑。** 现存缺口是：只有「建新库/恢复基线」入口，缺少「在脏库上按层就地清理」的清单与脚本；演示种子、演练/测试数据未纳入生产开关管控；`deploy-prod.sh --reset-db` 只清 hrm 域，业务单据/会话/日志残留未覆盖。

两条可行路径：

| 路径 | 适用 | 干净度 | 可重复性 | 前提 |
| --- | --- | --- | --- | --- |
| **A 干净库重建（推荐）** | 目标库可废弃重建（dev / 副本 / 门禁 / 测试） | 最高，结构+目录基线全部回到锚点 | 高，`provision-env.sh` 一键 | 基线资产完整、锚点可对齐 |
| **B 脏库就地分层清理** | 库需保留（账本/连接串/对象属主不变），只清数据 | 中，依赖分层白/黑名单与 FK 顺序 | 中，需新建清单生成器与清理脚本 | 全表分类元数据齐备、可 dry-run 复核 |

> 真实 prod 上线后：路径 A 仅限灾备/复刻库；路径 B 只能清会话/日志/缓存类临时数据，**业务单据、用户、档案不可清**。

## 2. 现状实测盘点（2026-11-28 本机快照）

### 2.0 环境拓扑与主机角色（2026-11-28 拍板收敛口径）

> **角色定案（一步到位、按当前角色、通用收敛）**：现役仅两台机器分工——
> - **`xingzhai`（Mac mini）= 开发 + 生产机**：既跑日常开发栈，也承载生产实例 / 生产库 / 生产常驻服务。
> - **`air`（MacBook Air）= 开发 + 部署机**：第二开发机 + release 交付包构建与交付；**不跑生产实例、不存生产库与生产数据、不挂生产常驻服务**。
> - **`.115` 远端旧机 = 退役 / 待处置**：不再承担现役生产、部署或清理目标；历史脚本里指向它的远程段一并退役（见 §7.1、§9）。

| 端 | 主机 / 地址 | 端口 / 库 | 连接角色与凭据 | 当前可达性 | 角色与说明 |
| --- | --- | --- | --- | --- | --- |
| **开发 + 生产机** `xingzhai` | `xingzhaideMini.lan`（LAN .61 / .147），仓库 `/Users/xingzhai/TOPEMS` | 5432 brew postgres；dev 库 `topems`；生产库 `topems_prod`；生产实例 8099 | 本机 socket / `topems_app`（运行）、`topems_owner`（迁移）；`.env` 的 `DATABASE_URL`/`MIGRATE_URL`；生产 DSN 经钥匙串注入 | 5432 / 8099 监听中（8099 PID 99082，`com.topems.server`）；nginx `com.topems.nginx`、cloudflared、backup / 日志轮转 launchd 常驻 | **一身二任**：日常开发、单测、RLS/租户隔离验证；同时是唯一生产宿主——生产实例、生产库、外网隧道、备份/轮转均在本机。清生产库前须先停 8099，清完重放基线/种子后再起服验证 |
| **开发 + 部署机** `air` | `airdeAir.lan`，LAN `.96`，MAC `c0:c7:db:d1:2:50`，arm64，macOS 26.6.2 | 5432 PG18 / 6379 Redis；dev 实例 `127.0.0.1:8099`（开发态）；主库 `topems`（188 表）；**无 `topems_prod` 库** | SSH 免密 `air@192.168.110.96`（xingzhai 公钥已入 authorized_keys）；本机 socket | 22 已开通免密；服务只绑 `127.0.0.1`，跨机访问走 SSH 隧道 | **第二开发机 + 出包/交付机**：在途分支开发编译；按 `release-pipeline.md` 构建 arm64 release 包并交付 xingzhai 安装。**禁区**：不起生产实例、不连/不存生产库、不挂生产常驻服务；其历史残留库与快照另案清理（#125） |
| **退役远端 `.115`** | `xingzhai@192.168.110.115`（历史独立 macOS） | 历史库 `topems_prod`，DB 用户 `topems_prod` | 历史 SSH 密钥（现不再使用） | **2026-11-28 探活不可达**：同网段 ping 100% 丢包、22 超时、ARP `incomplete`，mDNS 无记录；主机关机/睡眠/断网或 IP 漂移，非凭据/服务问题 | **已退出现役拓扑**：不再是生产机，也不再是部署/清理目标。其上历史数据不纳入本轮任何动作；待物理确认后按退役机处置（下线 / 导出留档 / 回收）。历史脚本中 `.115` 远程段待清理（§9 #7） |
| **CI / 验证实例** | 本机 5433（brew PG@18_5433 空库重放/双库账本核对/RLS 回归）；15432（IT 库 `topems_test`，`TOPEMS_IT_DATABASE_URL`） | 5433 / 15432 | 本机超级用户 `xingzhai` socket | 5433 未起、15432 未监听（按需拉起） | 验证/CI 库随测试栈重建，不纳入生产清理口径 |

> 部署物（不在数据库清理范围，但清库后需衔接恢复）：后端二进制 `/Users/xingzhai/topems/bin`、前端 `dist/`（rsync 到远端）、launchd 单元 `com.topems.server`、nginx 与 `cloudflared` 隧道、Redis（`localhost:6379`，会话/缓存随库清理一并失效）。

### 2.1 库矩阵与账本水位

| 库 | 账本行数 | max(version) | 语义 | 处置口径 |
| --- | --- | --- | --- | --- |
| `topems` | 735 | 20261124150000 | 本机 dev（账本滞后） | 路径 A 重建对齐链尾，或路径 B 清数据后补前向迁移 |
| `topems_prod` | 825 | 20261127240000 | 生产库（被本机 8099 在线实例使用） | 上线前可路径 B 清演示/残留；不可当真实 prod |
| `topems_gate` | 787 | 20261122160000 | 门禁库 | 路径 A 重建 |
| `topems_web_smoke` | 824 | 202611250120000 | Web 冒烟库 | 路径 A 重建 |
| `topems_status_baseline_verify` | 836 | 20261126180000 | 状态基线核验库 | 核验后可弃 |
| `topems_test` | 855 | 20261128120000 | mobile/IT 隔离测试库（15432/本机 socket） | 测试栈随用随建，路径 A 供给 |
| `topems_test_runner` | 0 | — | 测试运行器空库 | 路径 A 供给 |
| `topems_drill_template` | 无账本 | — | 演练模板 | 演练专用，不纳入生产口径 |

### 2.2 prod 副本数据分层实测（`topems_prod`）

**L1 系统目录基线（保留，可由基线快照/种子重放）**

| 表 | 行数 | 来源归属 |
| --- | --- | --- |
| `core_roles` | 17 | 基线快照 + `seeds/default_roles.sql` |
| `core_permissions` | 1162 | 基线快照 + 迁移种子 |
| `core_role_permissions` | 2923 | 基线快照（角色-权限授权） |
| `core_menus` / `core_menu_groups` | 452 / 130 | 迁移链 INSERT（13 / 12 文件） |
| `core_dict_types` / `core_dict_items` | 77 / 397 | `seeds/default_dict_data.sql` |
| `hrm.departments` / `hrm.positions` | 16 / 13 | `seeds/standard_departments.sql` / `standard_positions.sql` |
| `finance.core_finance_accounts` / `currencies` / `report_line_map` | 28 / 16 / 48 | 迁移链种子（finance bootstrap / ledger 收敛） |
| `core.core_plugin_categories` | 9 | 迁移/插件目录 |
| `ai.ai_models` / `ai.ai_prompt_templates` | 4 / 3 | 迁移链种子（ai_models_prompts / copilot_faq） |
| `core.core_tenants` / `core_tenant_settings` | 2 / 4 | 基线快照 |

**L2 身份与访问（清理对象）**

| 表 | 行数 | 说明 |
| --- | --- | --- |
| `iam.users` | 7 | 3 活跃 + 4 软删；初始 admin 保留，其余清 |
| `core_user_roles` | 3 | 用户-角色绑定，随用户清 |
| `core_tenant_users` | 4 | 租户成员，随用户清 |
| `core_sessions` | 1284 | 会话，全清 |
| `core_refresh_tokens` | 1284 | 刷新令牌，全清 |
| `core_login_logs` | 577 | 登录日志，全清 |
| `public.audit_logs` | 9853 | 审计日志，全清（上线前无合规留存义务） |
| `core_operation_logs` | 16 | 操作日志，全清 |

**L3 业务单据 / 主数据残留（清理对象，演示或演练灌入）**

MES：`equipment` 9、`production_orders` 7、`work_stations` 4、`work_orders` 3、`production_processes` 3、`quality_inspections` 2；
ERP：`materials` 5、`inventory` 5、`suppliers` 3、`purchase_orders` 3、`erp_master_data_refs` 18；
CRM：`customers` 5、`rfm_results` 5、`crm_master_data_refs` 7；
SRM/SCM：`suppliers` 各 3；PM：`projects` 3；HRM：`employees` 3、`job_openings` 2；
移动端：`mobile_push_notifications` 6；搜索：`search_recent` 4、`search_logs` 4、`search_entity_projections` 4 / `_v2` 3；MDM：`mdm_suppliers` 4、`mdm_sync_dead_letter` 4；各域 `audit_logs` 残留。

**L4 演示 / 演练 / 测试数据（隔离，禁止进生产库）**

| 类别 | 落点 | 性质 |
| --- | --- | --- |
| 演示业务种子 | `seeds/seed_demo_business_data.sql`（ERP 供应商/采购/库存） | 空库评审展示，上线前不播 |
| 演示 MES 种子 | `seeds/seed_demo_mes_data.sql`（设备/工站/工单） | 同上 |
| 演示 QMS 种子 | `seeds/seed_demo_qms_inspections.sql`（质检单） | 同上 |
| 演练种子 | `seeds/seed_w13_company_scope_rehearsal.sql` | 专用演练库 |
| 测试夹具 | `database/test/iam_test_data.sql`（admin123 口令，明令禁生产） | 本地/CI 测试库 |
| E2E / 冒烟 | `scripts/dev/seed-e2e-core.sql`、`testing/full-e2e-test.sh`、`dev/run-e2e-stack.sh`、`web_smoke_precommit.sh` | 测试栈 |

### 2.3 种子文件分级归属

| 种子 | 分级 | 生产是否播 |
| --- | --- | --- |
| `default_roles.sql` | L1 基线 | 是 |
| `default_dict_data.sql` | L1 基线 | 是 |
| `standard_departments.sql` / `standard_positions.sql` | L1 基线 | 是 |
| `system_settings.sql` | L1 基线 | 是 |
| `seed_demo_business_data.sql` / `seed_demo_mes_data.sql` / `seed_demo_qms_inspections.sql` | L4 演示 | **否（开关默认关）** |
| `seed_w13_company_scope_rehearsal.sql` | L4 演练 | 否 |
| `database/test/iam_test_data.sql` | L4 测试 | 否 |

## 3. 数据五层模型与处置口径

| 层 | 内容 | 清理口径 | 重放来源 |
| --- | --- | --- | --- |
| **L0 账本与结构** | `_sqlx_migrations` 账本、DDL 表/列/约束/索引/策略/RLS | **不可清**；结构随基线快照或前向迁移对齐 | 基线 `prod_schema_<anchor>.sql.gz` + `apply-forward.sh` |
| **L1 系统目录基线** | 租户、角色、权限点、角色-权限、菜单/菜单组、字典类型/项、部门、岗位、系统参数、财务科目/币种、插件/AI 目录 | **保留**；就地清理时列入白名单禁止清 | 基线 data 快照（11 张纳入表）+ 系统种子 |
| **L2 身份与访问** | 用户（除初始 admin）、用户-角色、租户成员、会话、刷新令牌、登录/操作/审计日志、用户设置 | **清**；初始超管账号保留并重置口令 | 重建后 `--with-admin` 或向导初始化 |
| **L3 业务单据与主数据** | 各业务域单据、主数据、业务引用、搜索投影/最近访问、通知推送、MDM 死信、业务审计 | **清**（上线前无真实业务） | 无；由业务后续录入 |
| **L4 演示/演练/测试** | demo 种子、w13 排练、测试夹具、E2E/冒烟数据 | **隔离**；不进生产库；清理脚本永久排除 | 仅测试/演练环境按需播 |

## 4. 路径 A：干净库重建（推荐）

复用现有 `scripts/db/provision-env.sh`，标准顺序见 environment-provisioning.md §3：

1. **建库**（不存在时）→ 恢复结构基线（schema + 账本）→ 恢复参考数据基线（11 张 L1 纳入表，默认开启）。
2. **前向迁移**：只应用 `version > anchor` 的迁移，补齐锚点后新增菜单/权限/列。
3. **播系统基线种子**：roles / dict / departments / positions / settings（`--seed-*` 分支，不播 demo）。
4. **初始管理员**：`--with-admin`，随机口令仅 stderr 显示一次；不写入仓库/`.env`/日志。
5. **终态断言**：必需表存在、`max(version) ≥ anchor`、L1 表行数与元数据一致、admin 权限最小集、关键表指纹与 prod 比对。
6. **禁止**：在重建库上播 L4 demo/演练/测试种子。

适用：`topems_gate`、`topems_web_smoke`、`topems_test_runner`、`topems_status_baseline_verify`，以及可废弃的 dev 库。

## 5. 路径 B：脏库就地分层清理（待建）

保留库名、账本、对象属主，仅按层清数据。需新建两类产物：

### 5.1 表分类清单生成器（只读）

- 遍历 `information_schema.tables`，按 schema + 表名正则 + L1 白名单映射到 L1/L2/L3/L4；
- 输出 `cleanup-table-map.json`：每张表的层级、保留/清除标记、依赖父表、是否含 PII、当前行数；
- 白名单（L1 保留）显式列出 11 张纳入表 + 财务科目/币种 + 插件/AI 目录；黑名单（L2/L3）按域生成；
- 产物 gitignore 本地留档，落地前人工复核边界表（如 `core_tenant_settings`、字典、被迁移依赖的配置行）。

### 5.2 分层清理脚本（dry-run 先行）

执行顺序（外键依赖倒序，禁止盲目 `CASCADE`）：

1. **前置**：全库 `pg_dump` 快照（结构 + 数据，脱敏审查）→ 记录清理前各表行数指纹。
2. **dry-run**：生成待清表清单与预估行数，人工复核无 L1 误纳入；不写库。
3. **单事务分层清理**：
   - L2：先清会话/令牌/日志/成员/绑定，最后清非 admin 用户；
   - L3：按业务域逆序清单据 → 主数据 → 引用/投影/通知/死信；
   - L4：确认无 demo/演练/测试行残留；
   - L1 白名单表 `SELECT` 断言行数未变。
4. **重放 L1**：若目录行被波及，从基线 data 快照或系统种子重放。
5. **后置断言**：L2/L3 表行数为 0（白名单除外）、L1 行数与基线一致、初始 admin 可登录、`_sqlx_migrations` 账本未变。
6. **回滚**：失败即 `ROLLBACK`；事后以快照恢复。

> FK 口径：级联表（会话/令牌/公司域/资源权限/岗位绑定）随用户级联；`core_user_roles` 为 NO ACTION，须先于用户删除；`CASCADE` 被禁止用于目录表（避免波及 L1），与 `--data-only` 现有保护一致。

## 6. 种子 / 演示 / 测试数据管控

1. **生产供给路径默认只播 L1 基线种子**；demo 三个文件挂独立开关（如 `SEED_DEMO=false` 默认关），仅 dev/评审环境显式开启。
2. **演练/测试种子与夹具**路径限定：`seed_w13_*` 只连演练库；`database/test/iam_test_data.sql`、`seed-e2e-core.sql` 只连测试栈库；脚本内增加目标库名/环境守卫，误指生产库 fail-closed。
3. **种子幂等**：现有 demo/系统种子已按业务键 `WHERE NOT EXISTS` 幂等；新增种子沿用同一口径，可重放不产生重复行。
4. **演示数据与真实主数据隔离命名/标识**：避免上线后把演示行误当业务数据。

## 7. 多环境口径矩阵

| 环境 / 端 | 连接通道 | 路径 | L1 基线 | L2 身份 | L3 业务 | L4 演示/测试 | 账本/结构 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| xingzhai dev `topems`（5432，开发面） | 本机 socket | A 重建（优先） | 基线重放 | 清后重建 admin | 清 | 按需 demo | 对齐链尾 |
| xingzhai 生产库 `topems_prod`（5432，8099 实例，生产面） | 本机 socket；清库前先停 8099 | B 就地（上线前） | 保留 | 清非 admin | 清演示残留 | 禁播 | 不动 |
| 本机验证库 5433 | 本机 socket（按需拉起） | A 重建 | 基线重放 | 清 | 清 | 重放夹具 | 对齐锚点 |
| CI/IT 库 15432 `topems_test` | 本机 15432（按需拉起） | A 供给 | 基线重放 | 夹具按需 | 夹具按需 | 允许 | 对齐锚点 |
| 门禁 `gate` / 冒烟 `web_smoke` | 本机 socket | A 重建 | 基线重放 | 清 | 清 | 测试栈自带 | 对齐锚点 |
| 测试运行器 `test_runner` | 本机 socket | A 供给 | 基线重放 | 夹具按需 | 夹具按需 | 允许 | 对齐锚点 |
| 演练 `drill_template` / w13 | 本机 socket | 独立 | — | — | — | 允许 | 独立账本 |
| **air dev `topems`（.96，开发/部署面）** | SSH `air@192.168.110.96`，库走本机 socket / SSH 隧道 | A 重建（仅开发库） | 基线重放 | 清后重建 admin | 清 | 按需 demo | 对齐链尾 |
| **退役远端 `.115`** | 已退出现役拓扑，不再建立清理/部署连接 | — | — | — | — | — | — |
| 真实 prod（上线后，宿主 xingzhai） | — | 禁止清业务数据 | 保留 | 仅清会话/日志/缓存 | **禁清** | 禁播 | 不动 |

> **角色边界**：air 上只允许存在 dev/测试/演练库与出包产物；一旦在 air 发现 `*_prod` 库、生产常驻 launchd 单元或指向生产 DSN 的实例，即属越界，按 §8 禁区处置。生产库与生产实例只允许存在于 xingzhai。

### 7.1 跨主机执行通道（xingzhai / air / 退役 .115）

- **xingzhai（开发 + 生产机，本机）**：
  - 本机库直连 socket（`host=/tmp user=xingzhai`）或 `.env` DSN；备份落本机 `backups/`，清理在本机事务内完成。
  - 生产面（`topems_prod` + 8099 实例 + nginx/cloudflared/备份常驻）与开发面（dev 库、验证/CI/门禁库）同机共存；清理生产库前先停 8099，开发库清理不影响生产实例。
- **air（开发 + 部署机，.96）**：
  1. **接入**：`ssh air@192.168.110.96` 免密；非交互 shell 需 `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"`。服务只绑 `127.0.0.1`，跨机访问走 SSH 隧道（`-L 8099:... -L 5432:...`），不开 `0.0.0.0`。
  2. **库操作边界**：只对 air 上的 dev / 测试 / 演练库做只读盘点或路径 A 重建；**不对任何 `*_prod` 库操作**（air 本就无 prod 库，发现即越界）。其 48 个历史残留库与快照按 #125 专门批次清理。
  3. **部署职责**：air 按 `release-pipeline.md` 构建 arm64 release 包，经 rsync/scp 交付 xingzhai 安装；air 不直接向生产库写数据、不触发生产迁移。
- **退役 `.115`**：
  - 已退出现役拓扑，**不建立 SSH 清理/部署连接，不执行远程 psql/scp/rsync**。其离线状态（ping 丢包、22 超时、ARP `incomplete`）不再作为待恢复的生产通道跟踪。
  - 历史脚本/台账中指向 `.115` 的生产目标与远程段属待清理冲突项（见 §9 #7），确认退役后统一摘除；在摘除前，任何脚本不得默认向 `.115` 推送。

### 7.2 清库后的服务与部署物衔接

- **xingzhai 生产面**：停 8099 实例 → 清库/重放 → 起 `com.topems.server` → 探针 200、`/users/me` 回显 roles/permissions 正确；nginx 与 `cloudflared` 隧道在服务起来后恢复。
- **xingzhai 开发面**：dev/验证/门禁库清理后由 `start-local.sh`/`deploy.sh` 本地链路起服恢复，不触碰生产实例与生产库。
- **air 开发面**：dev 库清理后仅在本机起开发实例验证；不出包到生产、不替换 xingzhai 生产二进制。release 出包与交付走 `release-pipeline.md`，与清库动作解耦。
- **Redis**：会话/缓存随库清理失效，清理后清空对应 Redis db，避免旧会话令牌残留。

## 8. 执行门禁与风险禁区

**前置门禁**
- 清理前必须有全库快照（结构 + 数据），备份目录 gitignore 本地留档；PII 列（email/phone/address/id_card/bank/password/token）脱敏审查。
- dry-run 清单人工复核；destructive 操作登记票据、`rows-at-review`、备份指针（对齐现有 destructive 迁移门禁口径）。
- 系统通道 `SET app.rls_system=on` 访问目录表；禁止 app 角色直读绕过 RLS。

**禁区**
- 不清 `_sqlx_migrations` 账本、不清 L1 目录基线、不删初始超管。
- 不改鉴权/令牌签发逻辑；不据静态或单次取证自动解绑/清权限码。
- 本机副本与远端 .115 均为上线前受控环境，可按本方案清理；**真实 prod 一旦承载业务数据，业务单据/用户/档案禁清**；远端 .115 已退役，离线或未探活在线时不执行任何远程操作。
- **角色边界禁区**：生产库、生产实例、生产常驻服务只允许存在于 xingzhai；air 上禁止出现 `*_prod` 库、生产 launchd 单元、指向生产 DSN 的实例，禁止在 air 上直接写生产库或触发生产迁移。
- 不用 `TRUNCATE ... CASCADE` 波及目录表；外键保护表用逆序 `DELETE`。
- 快照/口令/令牌不入 git；测试夹具口令不进生产；远程凭据走 SSH 密钥/钥匙串，不写明文。

## 9. 与现有链路对接的待办

| # | 事项 | 现状缺口 | 归属批次 |
| --- | --- | --- | --- |
| 1 | 表分类清单生成器（§5.1） | 无现成全表层级映射 | P1 |
| 2 | 就地分层清理脚本 + dry-run（§5.2） | `deploy-prod --reset-db` 仅清 hrm | P2 |
| 3 | demo 种子独立开关 + 环境守卫 | 三个 demo 文件未挂生产开关 | P1 |
| 4 | 测试/演练种子目标库守卫 | 夹具仅注释警示，无连接守卫 | P2 |
| 5 | 多环境清理口径固化进供给文档 | 现有文档只覆盖建库基线，未覆盖清库 | P3 |
| 6 | 基线锚点在批量 DDL 后前移 | 现有流程已就位，继续遵守 | 常态 |
| 7 | **摘除脚本/台账中 `.115` 生产目标与远程段**：`deploy-prod.sh` PROD_HOST、`verify_menu_authority.sh`/`window-execution.sh`/`w7_b2_auth_smoke.py`/`wms-rls-probe.sh`/`refresh-prod-cols.sh` 等指向 `.115` 的 SSH/psql 目标；生产部署收敛到 xingzhai，air 出包走 release-pipeline | 现脚本仍把 `.115` 当生产机，与「生产机=xingzhai」角色口径冲突 | P1 |
| 8 | 开发/验证/CI 库口径（5432 dev、5433 重放、15432 IT、单测夹具） | 方案初版只列 prod 副本与门禁，未区分验证/CI 库恢复路径 | P1 |
| 9 | 清库后服务/部署物衔接（停服→清库→重放→起服→探针；Redis 会话清空；前端/二进制/隧道恢复） | 现有 reset 流程未覆盖停服与恢复验证 | P2 |
| 10 | `.115` 退役处置：物理确认开机/用途后按下线/导出留档/回收处理；在此之前不连不推 | 2026-11-28 二层 incomplete 离线；角色已定案退役，不再作为待恢复生产通道 | 常态 |
| 11 | air 两个 dev 脚本硬编码 `/Users/air` 绝对路径改相对定位（`fix-a11y-labels.js`、`transform_i18n_v3.py`） | 本机跑会 file-not-found 全跳过；属 #78 后残留 | P3 |
| 12 | air 越界排查与历史残留清理：确认 air 无 `*_prod` 库/生产常驻 launchd/生产 DSN；48 个历史残留库 + `20261115-step2` 快照按 #125 批次清理 | air 定位开发+部署机，不得承载生产面 | P2 |

## 10. 落地批次建议

- **P1（盘点与开关 + 角色冲突摘除）**：只读跑清单生成器，产出 xingzhai dev / 生产副本 / 门禁 / 冒烟 / 验证 / CI 各库 L1/L2/L3/L4 表映射与行数指纹；demo 种子拆出独立开关默认关；复核边界表归属；补齐 5433/15432 验证与 CI 库恢复口径；摘除脚本/台账中 `.115` 生产目标与远程段（§9 #7），生产部署目标收敛到 xingzhai。
- **P2（清理脚本与通道）**：在 `topems_test_runner` 或可废弃库上先验证路径 B 全流程（备份→dry-run→事务清理→断言→回滚演练），再推广 dev / 生产副本；排查 air 越界（无 prod 库/生产常驻/生产 DSN），其历史残留库与快照按 #125 批次清理；衔接停服/起服/Redis 清空/前端二进制恢复。
- **P3（口径固化）**：把多环境矩阵、清理顺序、断言清单补入 environment-provisioning.md；补 `deploy-prod` 全量重置分支（替代仅清 hrm 的 `--reset-db`），并改走本机/ release-pipeline 通道。
- **常态**：新业务表纳入分类清单；新迁移改动 L1 纳入表列/约束时同步重生成基线 data 快照；`.115` 退役期间不连不推，待物理确认后另作下线处置。

---

### 附：本次普查未决项（落地前复核）

- `core.ai_faqs` 15 行：需甄别是种子目录还是运行期问答残留（迁移种子仅覆盖 models/prompt_templates/faq 表结构）。
- `erp_master_data_refs` 18 / `crm_master_data_refs` 7：主数据引用投影，随主数据一并清，需确认无 L1 字典依赖。
- `core_operation_logs`、各域 `audit_logs`：归属 L2 日志层，清理时一并纳入。
- 财务科目/币种当前以迁移种子为准；若后续改为基线 data 快照纳入，同步更新 §2.2 来源列。
