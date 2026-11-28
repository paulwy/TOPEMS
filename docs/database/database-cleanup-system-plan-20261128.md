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

### 2.1 库矩阵与账本水位

| 库 | 账本行数 | max(version) | 语义 | 处置口径 |
| --- | --- | --- | --- | --- |
| `topems` | 735 | 20261124150000 | 本机 dev（账本滞后） | 路径 A 重建对齐链尾，或路径 B 清数据后补前向迁移 |
| `topems_prod` | 825 | 20261127240000 | prod 副本（被 8099 在线实例使用） | 上线前可路径 B 清演示/残留；不可当真实 prod |
| `topems_gate` | 787 | 20261122160000 | 门禁库 | 路径 A 重建 |
| `topems_web_smoke` | 824 | 202611250120000 | Web 冒烟库 | 路径 A 重建 |
| `topems_status_baseline_verify` | 836 | 20261126180000 | 状态基线核验库 | 核验后可弃 |
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

| 环境 | 路径 | L1 基线 | L2 身份 | L3 业务 | L4 演示/测试 | 账本/结构 |
| --- | --- | --- | --- | --- | --- | --- |
| 本机 dev `topems` | A 重建（优先） | 基线重放 | 清后重建 admin | 清 | 按需 demo | 对齐链尾 |
| prod 副本 `topems_prod` | B 就地（上线前） | 保留 | 清非 admin | 清演示残留 | 禁播 | 不动 |
| 门禁 `gate` / 冒烟 `web_smoke` | A 重建 | 基线重放 | 清 | 清 | 测试栈自带 | 对齐锚点 |
| 测试运行器 `test_runner` | A 供给 | 基线重放 | 夹具按需 | 夹具按需 | 允许 | 对齐锚点 |
| 演练 `drill_template` / w13 | 独立 | — | — | — | 允许 | 独立账本 |
| 真实 prod（上线后） | 禁止清业务数据 | 保留 | 仅清会话/日志/缓存 | **禁清** | 禁播 | 不动 |

## 8. 执行门禁与风险禁区

**前置门禁**
- 清理前必须有全库快照（结构 + 数据），备份目录 gitignore 本地留档；PII 列（email/phone/address/id_card/bank/password/token）脱敏审查。
- dry-run 清单人工复核；destructive 操作登记票据、`rows-at-review`、备份指针（对齐现有 destructive 迁移门禁口径）。
- 系统通道 `SET app.rls_system=on` 访问目录表；禁止 app 角色直读绕过 RLS。

**禁区**
- 不清 `_sqlx_migrations` 账本、不清 L1 目录基线、不删初始超管。
- 不改鉴权/令牌签发逻辑；不据静态或单次取证自动解绑/清权限码。
- 不触真实 prod；所有清理在本机受控库完成，上线窗口另议。
- 不用 `TRUNCATE ... CASCADE` 波及目录表；外键保护表用逆序 `DELETE`。
- 快照/口令/令牌不入 git；测试夹具口令不进生产。

## 9. 与现有链路对接的待办

| # | 事项 | 现状缺口 | 归属批次 |
| --- | --- | --- | --- |
| 1 | 表分类清单生成器（§5.1） | 无现成全表层级映射 | P1 |
| 2 | 就地分层清理脚本 + dry-run（§5.2） | `deploy-prod --reset-db` 仅清 hrm | P2 |
| 3 | demo 种子独立开关 + 环境守卫 | 三个 demo 文件未挂生产开关 | P1 |
| 4 | 测试/演练种子目标库守卫 | 夹具仅注释警示，无连接守卫 | P2 |
| 5 | 多环境清理口径固化进供给文档 | 现有文档只覆盖建库基线，未覆盖清库 | P3 |
| 6 | 基线锚点在批量 DDL 后前移 | 现有流程已就位，继续遵守 | 常态 |

## 10. 落地批次建议

- **P1（盘点与开关）**：只读跑清单生成器，产出各库 L1/L2/L3/L4 表映射与行数指纹；demo 种子拆出独立开关默认关；复核边界表归属。
- **P2（清理脚本）**：在 `topems_test_runner` 或可废弃库上先验证路径 B 全流程（备份→dry-run→事务清理→断言→回滚演练），再推广到 dev / prod 副本。
- **P3（口径固化）**：把多环境矩阵、清理顺序、断言清单补入 environment-provisioning.md；补 `deploy-prod` 全量重置分支（替代仅清 hrm 的 `--reset-db`）。
- **常态**：新业务表纳入分类清单；新迁移改动 L1 纳入表列/约束时同步重生成基线 data 快照。

---

### 附：本次普查未决项（落地前复核）

- `core.ai_faqs` 15 行：需甄别是种子目录还是运行期问答残留（迁移种子仅覆盖 models/prompt_templates/faq 表结构）。
- `erp_master_data_refs` 18 / `crm_master_data_refs` 7：主数据引用投影，随主数据一并清，需确认无 L1 字典依赖。
- `core_operation_logs`、各域 `audit_logs`：归属 L2 日志层，清理时一并纳入。
- 财务科目/币种当前以迁移种子为准；若后续改为基线 data 快照纳入，同步更新 §2.2 来源列。
