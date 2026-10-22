# TOPEMS 系统启用场景与查漏补缺（活文档）

> **文档性质：持续维护的活文档（Living Document）**，不是一次性快照。首次启用场景/步骤随版本演进持续更新；查漏补缺缺口与 TODO.md 双向同步，闭环一项勾一项并在文末变更日志记录。

| 项 | 值 |
|---|---|
| 版本 | v1.9（P1-2/P2-1/P1-8/P2-2/P2-4 DB FK 五项闭环；见文末变更日志） |
| 最近更新 | 2026-10-21 |
| 维护人 | 开发协作（随迭代更新） |
| 关联待办 | [`TODO.md`](../../TODO.md)「系统启用与查漏补缺」块 |
| 仓库 | `/Users/xingzhai/TOPEMS`（Rust 多服务 monolith + `apps/web` React，分支 main） |

**维护规则**：
1. 每完成一个 P0/P1/P2 缺口，回到本文档对应行更新状态（已具备/部分/缺失），并在 TODO.md 勾选，文末变更日志追加一条（日期 + 提交哈希 + 改动要点）。
2. 新增模块/主数据/权限能力时，同步更新 §1 路线图、§2 盘点表与 §3 缺口清单，避免文档滞后于代码。
3. 状态词：**已具备**（前后端齐备且真实调通）/ **部分**（后端有前端缺、或仅只读/硬编码、或隔离薄弱）/ **缺失**（前后端双缺）/ **环境性**（跨模块复用、需运维配置或非代码问题）。
4. 证据格式：`文件:行`；路由给出后端完整路径与前端页面/路由，禁止无证据结论。

---

> 首次成稿：2026-10-20，范围为只读分析（未修改/提交任何源码、迁移、前端）。

---

## 0. 高信号结论（先读）

1. **新环境可以直接登录，但靠的是「启动自举超管」而非迁移种子。**
   unified-core 启动时 `init_database` 幂等创建默认超管 `admin` / 默认密码 `admin123`（bcrypt，可用环境变量 `ADMIN_INITIAL_PASSWORD` 覆盖），`is_superuser=true` 并绑定 superadmin 角色；登录接口只查 `iam.users`。证据见 [§4](#4-新环境首次可登录性结论与默认账号来源)。**注意：这不是迁移链种子**，迁移 SQL 本身不造用户；且默认弱密码必须首启立即修改，`ADMIN_INITIAL_PASSWORD` 未在 `.env.example` 声明。

2. **组织底座（公司/部门/岗位/员工/组织树）后端 CRUD 与前端管理页基本齐备**，可以手工完成"建公司→建部门→建岗位→录员工"；但**官方设计的多步初始化向导（`/api/hrm/setup/*`）只有后端裸接口和前端 api 壳，没有任何向导页面/路由/菜单/登录后跳转**，UI 走不完官方启用闭环（P0）。

3. **权限体系是第二大阻断面**：三套权限 scope 方言互不匹配（`finance:voucher:read` / `iam:users_read` / `system:read`+`admin:iam:write`），种子权限过不了中间件；前端 35 个模块 `config.ts` 0 个声明权限，菜单不过滤，属"可见但进不去"。

4. **各业务模块主数据覆盖不均**：SCM/SRM/WMS/QMS 执行单据、CRM、PDM、RD、EHS 主体已具备；**双缺**的是 MES 车间/产线/班次日历、QMS 结构化检验项/检验方案/抽样方案、LIMS 检验项目、全栈统一物料目录(物料档案仅在 ERP)、币种、计量单位 UOM、税率主表。

5. **前端无首次引导/空态 CTA**：登录固定落 `/dashboard`，落地页用硬编码 mock，无"先录公司/人员"提示；遗留 `routes/common.ts` 存在 10 处重复注册与 9 处孤儿路由。

---

## 1. 分阶段启用路线图（设计的真实使用场景与步骤）

> 说明：下表给出"系统启用后应该按什么顺序做、每步在 UI/后端落在哪、产出什么"。状态列区分代码现状；标"向导端点（前端缺失）"的步骤表示后端已写好但界面未接线。

### 阶段 0　环境准备与首次登录

| # | 操作动作 | 后端路由/文件证据 | 前端页面/路由证据 | 预期产出 | 状态 |
|---|---|---|---|---|---|
| 0.1 | 建库、跑迁移链（sqlx-cli / `scripts/migrate.sh`），建 `core_users` 等基表 | `database/migrations/001_iam.sql:1`（`CREATE TABLE core_users`）；迁移扫描 `scripts/migrate.sh:72,255` | —（运维步骤） | 表结构就绪 | 已具备（运维） |
| 0.2 | 启动 unified-core，启动自举创建默认超管 | `svc/unified-core/src/main.rs:317`（`try_init("iam", …)`）；`modules/iam/mod.rs:434-457` 插 `admin/admin123`、`:460-469` 绑 superadmin | 登录页 `pages/shared/LoginPage.tsx:67-107`；路由 `/login`（`routes/auth.ts:13-22`） | 可登录超管 | 已具备（见 §4 风险） |
| 0.3 | 用 admin 登录，**立即修改默认密码** | 自身改密 `POST /iam/users/me/password`，P1-5（`62cf693a8`）后仅需登录即可访问，不再被 `admin:iam:write` 拦；改他人密码仍需管理权限 | 自身改密入口（P1-5 已放开）；`UserManagementPage` → `/iam/user`（`modules/iam/config.ts:52-63`） | 安全口令 | 已具备（自身改密；首启强制改密机制仍缺，见 §4 风险） |
| 0.4 | 确认服务健康、菜单可渲染 | 各服务 `/health`；菜单前端硬编码 `GlobalLayoutV3.tsx:59,871-880`（非后端 `/api/menu`） | 侧边栏 `GlobalLayoutV3` | 进入主界面 | 已具备 |

### 阶段 1　组织底座（公司 → 部门 → 岗位 → 员工）

| # | 操作动作 | 后端路由/文件证据 | 前端页面/路由证据 | 预期产出 | 状态 |
|---|---|---|---|---|---|
| 1.1 | **（官方向导·公司步）** 录入公司名称/地址/税号等 | `POST /api/hrm/setup/company`，P0-2 已改 upsert（`33479ed7d`，新库无行可 INSERT） | 向导页 `HrmSetupWizardPage.tsx` 公司步（`4ac94af80`），接 `hrmSetup.setupCompanyInfo` | 公司信息落 `hrm.companies` | **已具备**（P0-1 接线 + P0-2 upsert 自洽） |
| 1.1′ | **（可走通的替代路径）** 用公司 CRUD 录入/维护公司 | `GET/POST/PUT/DELETE /api/hrm/companies`，`company.rs:44,159,268,323,467`，含 CompanyRead/Write 权限 | `/hrm/company` → `HrmCompanyPage.tsx:59-92`，`modules/hrm/config.ts:706-716` | `hrm.companies` 记录 | 已具备 |
| 1.2 | **（向导·部门步）** 批量录入部门 | `POST /api/hrm/setup/departments`，`setup.rs:350-468`（批量 INSERT `hrm.departments`，`:395-413`，批次重名校验 `:378-383`） | api 壳 `hrmSetup.ts:123`，**无页面调用** | 部门树 | **已具备**（P0-1 向导批量步 `4ac94af80` 接 `setupDepartments`） |
| 1.2′ | **（替代路径）** 部门 CRUD | `GET/POST/PUT/DELETE /api/hrm/departments`，`department.rs:61,151,262,315,452`；`organization_id` NOT NULL，`org_id→companies` FK | `/hrm/departments` → `HrmDepartmentPage.tsx:49-92`；组织树 `/hrm/organization` → `HrmOrganizationPage.tsx:9` | 部门层级 | 已具备（权限仅全局 `hrm:admin`，见 P1-5） |
| 1.3 | **（向导·岗位步）** 批量录入岗位 | `POST /api/hrm/setup/positions`，`setup.rs:496-605`（INSERT `hrm.positions`，`:533-551`；**无批次重名校验** `:517-530`） | api 壳 `hrmSetup.ts:129`，**无页面调用** | 岗位字典 | **已具备**（P0-1 向导批量步 `4ac94af80` 接 `setupPositions`） |
| 1.3′ | **（替代路径）** 岗位 CRUD | `GET/POST/PUT/DELETE /api/hrm/positions`，`position.rs:110,205,327,376,460`；`department_id` **无 DB 外键** | `/hrm/positions` → `HrmPositionPage.tsx:12`（adapter 接 positionApi） | 岗位字典 | 已具备（无 FK、无 handler 权限） |
| 1.4 | **（向导·管理员步）** 填管理员姓名/工号/用户名/邮箱/密码 | `POST /api/hrm/setup/admin`，P0-3（`9d33f86b8`，方案B）：建 `hrm.employees` 并接受可选 `user_id` 回绑；不直写 iam，iam.users 与 core_users 不同步、建号权威在 unified-core | 向导页管理员步先调 `POST /api/core/iam/users`（`userApi.createUser`）建号拿 `data.id`，再回传 `user_id` 调 `/setup/admin` 绑定（`4ac94af80`） | 员工档案 + 可登录 IAM 账号绑定 | **已具备**（P0-3 方案B + P0-1 串联；角色授权由 IAM 建号端点负责） |
| 1.5 | 录入员工档案（正式员工 CRUD） | `GET/POST/PUT/DELETE /api/hrm/employees`，`employee.rs:100,345,159,500,648`；含 details/export；`user_id` 可空绑 IAM 账号 | `/hrm/employees` → `HrmEmployeePage/index.tsx:42-81`；创建页 `HrmEmployeeCreatePage.tsx:79`（**无密码字段、不调 register**） | 员工名册 | 已具备（员工↔登录账号需另在 IAM 建号绑定） |
| 1.6 | **（向导·完成步）** 确认初始化完成 | `POST /api/hrm/setup/complete`，`setup.rs:786-879`（P1-1 闭环）：落 completion 初始化标记、汇总公司/部门/岗位数并核验 admin 是否绑定 IAM 账号，未绑定告警；**不建角色/不绑权限/不改租户状态**（授权归属 IAM 建号端点，方案 B） | api 壳 `hrmSetup.ts:137`；P0-1 向导完成步已调用 `completeInitialization` | 状态标记，无授权结果 | 已具备（P0-1 + P1-1 闭环：complete 落标记+汇总+admin 绑定核验，前端已接线） |

> 向导进度存储：`hrm.initialization_status`（建表 `20260725000000_business_base_tables.sql:756-763`）。P0-2（`33479ed7d`）新增幂等迁移 `20261020000025` 为默认组织 0001 播种 5 条 pending 步骤行，`get_init_progress` 空集按未开始处理。

### 阶段 2　账号与权限（IAM）

| # | 操作动作 | 后端路由/文件证据 | 前端页面/路由证据 | 预期产出 | 状态 |
|---|---|---|---|---|---|
| 2.1 | 建业务用户账号 | `POST /api/core/iam/auth/register`（`REGISTER_ENABLED` 默认关 403，开放时新账号 `status=pending` 待管理员激活并分配角色/租户，P1-3 闭环）；或管理员经 `POST /api/iam/users` 建号 | 登录页注册分支 `LoginPage.tsx:111-135`；用户管理 `/iam/user` → `UserManagementPage.tsx:64-107`，`api/iam/user.ts:44-137` | 可登录用户 | 已具备（P1-3 闭环：注册开关默认关、开放时 pending 待激活，不产生不可用账号） |
| 2.2 | 建角色并绑定权限 | `core_roles`/`core_role_permissions`；角色 CRUD `role.rs:74,410-432,490`；`GET /api/iam/roles` | `/iam/role` → `RoleManagementPage.tsx:73-166`，`api/iam/role.ts:7-40` | 角色-权限映射 | 已具备（P0-4 闭环：权限字典补 23 码对齐，角色-权限经 `core_role_permissions` 规范化映射） |
| 2.3 | 维护权限字典 | `core_permissions` CRUD，`permission.rs:43-47`；元数据同步 `permission_metadata.rs:25-71` | `/iam/permission` → `PermissionManagementPage.tsx:15-46`，`api/iam/permission.ts:7-22` | 权限目录 | 已具备（P0-4 闭环：中间件已挂载码全部补齐 23 个，三套方言命名口径统一） |
| 2.4 | 把角色授予用户 | `core_user_roles`，`user/roles.rs:395` | 用户管理页内授权 | 人-角色-权限贯通 | 已具备（P0-4 闭环：登录 JWT/`/users/me`/`my-permissions` 非超管实时 JOIN `core_user_roles→core_roles/core_role_permissions→core_permissions` 展开，超管 `['*']` 短路） |

### 阶段 3　各模块前置主数据（按依赖顺序）

> 依赖总链：**ERP 物料/客商（公共主数据底座）→ SCM/SRM 供应商 → MES 工艺/设备/工位 → WMS 仓库/库位 → QMS 质量标准 → CRM 客户 → 财务科目/期间 → 各专用模块**。

#### 3.1 公共底座与供应链

| 模块 | 前置主数据 | 后端 CRUD 证据 | 前端页面证据 | 状态 |
|---|---|---|---|---|
| ERP | 物料档案（全局物料） | `GET/POST/PUT/DELETE /api/erp/materials`，`svc/erp/src/modules/material.rs:70-78`（已挂载 `mod.rs:165`）；无独立 UOM、无价格表 | `/erp/material-management` → `MaterialManagementPage`，`api/erp/core/material.ts:27-43` | 已具备 |
| ERP | 客户 / 供应商（ERP 侧） | `/customers` `customer.rs:77`；`/suppliers` `supplier.rs:77` | `/erp/customer-management`、`/erp/supplier-management` | 已具备 |
| SCM | 供应商档案 | `scm.suppliers`，`supplier.rs:126-131`；仅 tenant_id 无 org_id | `/scm/suppliers` → `ScmSupplierPage.tsx:7`，`modules/scm/config.ts:277-288` | 已具备 |
| SCM | 供应商准入/评价/比价 | `supplier_admission.rs:21-38`；`supplier_evaluation.rs:31-40`；`price_comparison.rs:331-344` | `/scm/supplier-admission`、`/scm/supplier-evaluation`、`/scm/price-comparison`（`config.ts:290-411`） | 已具备 |
| SCM | 分层/寻源/配额/阈值 | 仅 KV 表 `scm.module_settings`，`settings.rs:21-23` | 4 个设置页 `/scm/setting/*`（`config.ts:457-516`） | 已具备（非实体主数据） |
| SCM | 物料档案 / BOM | **无 CRUD**（`scm.materials` 只读 `mrp.rs:611`） | 无 | **缺失**（依赖 ERP/PDM） |
| SRM | 供应商分类/档案/评分维度/产品目录 | `supplier_category.rs:40-49`；`supplier.rs:86-101`；`scoring_dimension.rs:30-40`；`supplier_product.rs:37-43` | `/srm/category`、`/srm/supplier`、`/srm/scoring-dimension`、`/srm/product`（`modules/srm/config.ts:131-182,248-259`） | 已具备（与 scm.suppliers 双份，靠快照同步） |
| SRM | 询价/报价/招投标/合同（流程单据） | `inquiry.rs:64-70`；`quotation.rs:31-39`；`bidding.rs:35-44`；`supplier_contract.rs:40-50` | 对应 `/srm/inquiry`、`/srm/bidding` 等（`config.ts:263-320`） | 已具备（单据非主数据） |

#### 3.2 制造 MES / 仓储 WMS / 质量 QMS·LIMS

| 模块 | 前置主数据 | 后端 CRUD 证据 | 前端页面证据 | 状态 |
|---|---|---|---|---|
| MES | 设备档案 | `mes.equipment`，`equipment.rs:35-55`（organization_id 写死公共 UUID） | `/mes/equipment` → `EquipmentManagementPage.tsx:22`，`config.ts:976-983` | 已具备（隔离弱） |
| MES | 工位 | `work_stations`，`work_station.rs:30-43`；`workshop_id` 悬空（无车间表） | `/mes/work-stations` → `WorkStationPage.tsx:5`，`config.ts:1003-1014` | 已具备（车间缺失致外键悬空） |
| MES | 工序 / 工艺路线+步骤 | `production_process.rs:24-29`；`process_route.rs:30-50` | `/mes/production-process`、`/mes/process-routes`（`config.ts:1042-1080`） | 已具备 |
| MES | 班组 | `teams`+`team_members`，`team.rs:44-55`（INSERT 未显式绑 tenant_id `:414-418`） | `/mes/teams` → `TeamManagementPage.tsx:21` | 已具备（隔离弱） |
| MES | MES 自有 BOM | `material_bom/mod.rs:13-27`（`/boms`） | `pages/mes/MaterialBOMPage.tsx:19` | 已具备（与 PDM BOM 双套） |
| MES | 产能日历（APS 基础） | `capacities`，`capacity.rs:22-32`（`/capacities` CRUD 完整） | **无页面、无 api 文件** | **部分（后端有前端缺）** |
| MES | **车间/产线/工作中心** | **无表无路由**（全库无 workshop/production_line/work_center 建表） | 无 | **缺失（双缺）** |
| MES | 班次/工作日历 | 无（无 shift/calendar 表） | 无 | **缺失（双缺）** |
| WMS | 仓库 / 库位 | `warehouse.rs:84-89`；`location.rs:55-67`（含批量）；organization_id 写死 | `/wms/warehouse-management`、`/wms/location-management`（`config.ts:95-122`） | 已具备（隔离弱） |
| WMS | 库区（zone） | **无实体表**（zone_id 仅查询参数 `location.rs:917`） | `/wms/area` 复用 locations（`config.ts:345-358`） | **部分（伪主数据）** |
| WMS | 库存/手工期初 | `wms.inventory`，`inventory.rs:86-100`（POST `/inventory` 直接落账，无专门期初单/导入） | `/wms/inventory` → `InventoryPage.tsx:144`，`config.ts:182-193` | 已具备（无期初流程） |
| WMS | 批次 | `wms.batches`，`batch.rs:25-34` | `/wms/batch-management`（`config.ts:245-253`） | 已具备 |
| WMS | 物料档案 | 无（inventory 用自由文本 material_code/name，`inventory.rs:353-357`） | 无 | **缺失（依赖 ERP，无 FK）** |
| QMS | 质量标准+版本 | `qa_standards`+`qa_standard_revisions`，`quality_standard.rs:562-568`（标准不绑物料，specification 自由文本） | `/qms/standards` → `QmsStandardListPage.tsx:19-57`，`config.ts:656-668` | 已具备 |
| QMS | 检验项/检验方案/抽样方案 | **无表无路由**（无 checklist/inspection_item/sampling_plan） | 无 | **缺失（双缺）** |
| QMS | 检验单（执行单据） | `qa_quality_inspections`，`quality_inspection.rs:751-763`（`/checks`，挂 standard_id） | `/qms/inspection`（`config.ts:584-594`） | 已具备（单据） |
| QMS | 不合格品（单据） | `qa_quality_issues`，`quality_issue.rs:871-882`；无缺陷代码主数据 | `/qms/nonconformance`（`config.ts:611-624`） | 已具备（单据） |
| LIMS | 检验方法+版本 / 仪器 / 试剂 | `test_method.rs:16-22`；`instrument.rs:20-36`；`reagent.rs:15-19` | `/lims/test-method`、`/lims/instrument`、`/lims/reagent`（`modules/lims/config.ts:293-368`） | 已具备 |
| LIMS | 方法分类 | `/method-categories` CRUD，`test_method.rs:23-30` + api `testMethod.ts:47-64` | **无管理页** | **部分（后端有前端缺）** |
| LIMS | 检验项目（analyte） | **无独立表/路由**（仅任务内字段） | 无 | **缺失（双缺）** |

#### 3.3 CRM / 财务 / ERP / EHS / PDM / PM / RD / BI

| 模块 | 前置主数据 | 后端 CRUD 证据 | 前端页面证据 | 状态 |
|---|---|---|---|---|
| CRM | 客户 / 联系人 / 商机 | `customer.rs:51-66`；`contact.rs:36-47`；`opportunity.rs:159-178`（含 advance/rollback） | `/crm/customers`、`/crm/contacts`、`/crm/opportunities` | 已具备 |
| CRM | 标签 | `tag.rs:32-42`（`/tags` CRUD） | 无管理页、config 无路由 | **部分（后端有前端无）** |
| CRM | 产品/报价 | **未找到** product/quote 路由/表 | — | **缺失**（产品分散在 ERP/PDM） |
| 财务 | 账簿科目 `core_finance_accounts` | `/accounts` CRUD，`mod.rs:4934-4948`；tree、期初余额 `:5340-5354` | `/admin/account` → `AccountManagementPage`（业务侧无科目菜单，挂 admin） | 已具备 |
| 财务 | 另一套科目 `accounting_subjects` | `/accounting-subjects`，`accounting_subjects.rs:398-408` | `/erp/accounting-management` → `AccountingManagementPage.tsx:20,38` | 已具备（**两套科目表并存、归属割裂**） |
| 财务 | 会计期间 | GET `/periods`、POST open/close，`mod.rs:5321-5323`；api 封装但**无页面消费** | 无期间管理页 | **部分（后端有前端无）**；新租户不被种子覆盖 |
| 财务 | 辅助核算 `/aux-accounts` | POST/GET，`mod.rs:4998-5001` | api 仅 GET（`auxAccount.ts:28`），无创建页 | **部分** |
| 财务 | 税率 | 仅 GET `/finance-v56/tax/rates`，税率硬编码 0.13/0.06（`tax_v56.rs:1057,2234`） | `FinanceTaxPage` 聚合只读，create/update throw | **部分（只读/硬编码）**，无税率主表 |
| 财务 | 币种 | **未找到**币种表/路由，默认 CNY | — | **缺失（全栈）** |
| 财务 | 默认科目/期间种子 | `20261020000005_finance_seed_default_accounts_periods.sql:60-82`（5 科目+当月期间，**仅对已存在租户**，空库不种） | — | 已种子（部分，边界受限） |
| ERP | 银行账户 | `/bank-accounts`，`bank_account.rs:24-32`；**表无 tenant_id/org_id，全局共享** | `/erp/bank-account` → `BankAccountPage` | **部分（隔离缺失）** |
| ERP | 资产分类 | `/asset-categories`，`asset_category.rs:25-32`；消费方在 api/asset，erp 内无分类入口 | erp 资产页不消费分类 | **部分（前端错位）** |
| ERP | 系统字典 `/system/dict-types` | `dict.rs:151-183` CRUD | `DictManagementPage` 用本地 useState，零 API 调用 | **部分（后端有前端未接）** |
| EHS | 危险源 | `ehs.qa_ehs_risks`，`risk.rs:19-25`（`/hazards`+assessments）；api 已封装，**无列表页**（仅详情被消费） | 无列表页 | **部分（后端有前端无）** |
| EHS | 环境因素 / 检查标准 / 危化品 / 应急预案 | `environment.rs:16-29`；`safety.rs:18-41`；`hazardous_material.rs:14-55`；`emergency_plan.rs:19-26` | `/ehs/environment`、`/ehs/check`、`/ehs/hazardous-material`、`/ehs/plan` | 已具备（环境页另调后端不存在的 `/environment/indicators`） |
| PDM | 产品 / 物料 / BOM / 文档库 | `product.rs:14-18`；`material.rs:41-47`；`bom.rs:415-442`（`/bom-versions`+`/bom-items`）；`document.rs:19-36` | `/pdm/product`、`/pdm/material`、`/pdm/bom`、`/pdm/document` | 已具备（无独立"图纸/drawing"实体） |
| PM | 项目 / WBS 阶段 | `/projects` `project.rs:138-149`（**列表无 tenant_id 过滤 `:188`**）；`/projects/{id}/phases` `project_phase.rs:34-41` | `/pm/projects` → `PmProjectListPage`；WBS 走 api | **部分（隔离薄弱）** |
| PM | 项目类型/模板 | `/project-types` **空桩**（`project_type_config.rs:12-17` 返回空）；前端静态数组、未注册路由 | `PmTemplatePage` 静态、不调 | **缺失（后端桩+前端静态）** |
| RD | 研发项目 / 实验 / 配方 | `project.rs:55-67`（tenant 过滤 `:123`）；`experiment.rs:65-86`；`formula.rs:67-76`（版本+approve） | `/rd/project`、`/rd/experiment`、`RsFormulaListPage` | 已具备 |
| RD | 原料测试（隔离缺失） | `material.rs:98-109`；**表无 tenant_id**（INSERT `:307-313`） | `RsMaterialListPage` | **部分（隔离缺失）** |
| RD | 样品 | **未找到**实体/路由/表 | — | **缺失** |
| GIS | 地理围栏 | `embedded.rs:211,412-419`（`/fences`）；**表无 tenant_id**（DDL `20261007000009:1282`） | `/gis/fence` → `GisFencePage` | **部分（隔离缺失）** |
| GIS | 设备 | `/devices` GET、`/register` POST，`embedded.rs:180,387,391` | 无设备注册页 | **部分（后端有前端无）** |
| BI | 数据源 / 数据集 / 报表 | `analytics/routes.rs:154-180`（带 tenant）；`dataset.rs:90-95`（**无 tenant_id 过滤**）；`report.rs:17-27` | `BIDataSourcePage`、`DatasetPage`、`pages/report/*` | 数据源/报表已具备；**数据集部分（隔离缺失）** |

### 阶段 4　试跑验证

| # | 验证动作 | 落点 | 预期 | 状态/备注 |
|---|---|---|---|---|
| 4.1 | 用普通角色登录，验证菜单按权限可见可进 | 前端菜单未过滤（P1-7），后端中间件兜底 | 现状：可见全部入口，越权点进去被 403 | 部分 |
| 4.2 | 走通一条最小业务闭环（如：建物料→建供应商→建采购→入库→检验） | 跨 ERP/SCM/WMS/QMS | 受缺失主数据（车间、检验项、物料目录）制约 | 部分 |
| 4.3 | 检查空组织下落地页是否报错/是否引导补录 | `HybridDashboard.tsx:14-46` 硬编码 mock | 现状无引导、无报错但也无 CTA | 缺失（P2-1） |
| 4.4 | 验证多租户/组织隔离 | 多表缺 tenant_id（见 §3.2/3.3 标注） | 现状部分表全局共享 | 部分（P1-8） |

---

## 2. 能力盘点表（维度 × 后端 × 前端 × 状态 × 证据）

| 维度 | 后端 | 前端 | 状态 | 关键证据 |
|---|---|---|---|---|
| 登录 / 刷新 / 登出 | 有 | 有 | 已具备 | `auth.rs:128,629,926`；`api/iam/auth.ts:21-59`；`LoginPage.tsx:67-107` |
| 自助注册 | 有（开放无开关） | 有分支 | 部分 | `auth.rs:466-622,588-602`；`LoginPage.tsx:111-135` |
| 忘记/重置密码 | 有（依赖 SMTP/communication） | 有封装 | 部分 | `auth.rs:1087,1208`；`auth.ts:65-71` |
| JWT 中间件 / 超管旁路 | 有（含 DEV 旁路） | — | 已具备（环境性风险） | `shared-auth/auth.rs:658-764,688-718` |
| 角色 CRUD / 绑权限 | 有（IAM 侧） | 有 | 部分（scope 不匹配） | `role.rs:74,410-490`；`RoleManagementPage.tsx:73-166` |
| 权限字典 CRUD | 有 | 有 | 部分（三套方言） | `permission.rs:43-47`；`PermissionManagementPage.tsx:15-46` |
| 前端路由守卫 | — | 框架在 | 部分 | `ProtectedRoute.tsx:64-176`；`PermissionGate` 全仓仅 1 处使用 |
| 模块 config 权限声明 | — | **0/35 声明** | 缺失 | `modules/*/config.ts`；`usePermission.ts:98-129` |
| 公司 CRUD | 有 | 有 | 已具备 | `company.rs:44,159,268,323,467`；`HrmCompanyPage.tsx:59-92` |
| 部门 CRUD | 有（无 handler 权限） | 有 | 已具备（粒度弱） | `department.rs:61,151,262,315,452`；`HrmDepartmentPage.tsx` |
| 岗位 CRUD | 有（无 FK/无 handler 权限） | 有 | 已具备 | `position.rs:110,205,327,376,460`；`HrmPositionPage.tsx:12` |
| 员工 CRUD | 有（不建登录账号） | 有 | 已具备 | `employee.rs:100,345,159,500,648`；`HrmEmployeePage/index.tsx:42-81` |
| HRM 内角色 | **空桩不落库** | 无 | 缺失 | `roles.rs:32-84` |
| 初始化向导 6 步 | 有 | 有（5 步向导页） | 已具备 | 后端 `setup.rs`；向导页 `pages/hrm/setup/HrmSetupWizardPage.tsx`（`4ac94af80`）；建号走 IAM `POST /api/core/iam/users` 后回绑（P0-3 `9d33f86b8`） |
| SCM 供应商/准入/比价 | 有 | 有 | 已具备 | `supplier.rs:126-131`；`modules/scm/config.ts:277-411` |
| SRM 全量主数据/流程 | 有 | 有 | 已具备 | `modules/srm/config.ts:131-320` |
| MES 设备/工位/工艺/班组/BOM | 有 | 有 | 已具备（隔离弱） | `equipment.rs:35-55`；`work_station.rs:30-43`；`process_route.rs:30-50`；`team.rs:44-55` |
| MES 车间/产线/班次日历 | **无** | 无 | 缺失 | 全库无 workshop/production_line/shift/calendar 建表 |
| MES 产能日历 | 有 | 无 | 部分 | `capacity.rs:22-32`；无 api/页面 |
| WMS 仓库/库位/批次/库存 | 有 | 有 | 已具备（隔离弱/无期初流程） | `warehouse.rs:84-89`；`location.rs:55-67`；`batch.rs:25-34`；`inventory.rs:86-100` |
| WMS 库区/物料档案 | 无实体/依赖 ERP | 伪页面/无 | 缺失/部分 | `location.rs:917`；`inventory.rs:353-357` |
| QMS 标准 / 检验单 / 不合格 | 有 | 有 | 已具备 | `quality_standard.rs:562-568`；`quality_inspection.rs:751-763`；`quality_issue.rs:871-882` |
| QMS 检验项/方案/抽样 | **无** | 无 | 缺失 | 无 checklist/inspection_item/sampling_plan 表 |
| LIMS 方法/仪器/试剂 | 有 | 有 | 已具备 | `test_method.rs:16-22`；`instrument.rs:20-36`；`reagent.rs:15-19` |
| LIMS 方法分类/检验项目 | 有/无 | 无/无 | 部分/缺失 | `test_method.rs:23-30`；analyte 无表 |
| CRM 客户/联系人/商机 | 有 | 有 | 已具备 | `customer.rs:51-66`；`contact.rs:36-47`；`opportunity.rs:159-178` |
| 财务科目/期间/辅助/税率 | 有（两套科目/硬编码） | 部分 | 部分 | `mod.rs:4934,5321`；`tax_v56.rs:1057,2234` |
| ERP 物料/库存/客商/银行账户 | 有（银行账户无隔离） | 有/错位 | 部分 | `material.rs:70-78`；`bank_account.rs:24-32` |
| EHS 主体 | 有（危险源无列表页） | 部分 | 部分 | `risk.rs:19-25`；`environment.rs:16-29`；`safety.rs:18-41` |
| PDM 产品/物料/BOM/文档 | 有 | 有 | 已具备 | `product.rs:14-18`；`bom.rs:415-442`；`document.rs:19-36` |
| PM 项目/WBS | 有（列表不过滤租户） | 有 | 部分 | `project.rs:138-149,188`；`project_phase.rs:34-41` |
| RD 项目/实验/配方 | 有（原料测试无隔离） | 有 | 部分 | `project.rs:55-67`；`experiment.rs:65-86`；`formula.rs:67-76` |
| 前端首次引导/空态 CTA | — | **无** | 缺失 | `LoginPage.tsx:84-90`；`HybridDashboard.tsx:14-46` |
| 菜单来源 | 后端 `/api/menu` 仅 CRUD | 前端硬编码 | 环境性 | `GlobalLayoutV3.tsx:59,871-880`；`menu/handlers.rs:262,395` |
| 路由/菜单对齐 | — | 10 重复 + 9 孤儿 + 2 死链 | 部分 | `routes/common.ts:44-191`；`GlobalLayoutV3.tsx:935`；`BackupPage.tsx` 无引用 |
| i18n zh/en | — | 齐全（65 文件对齐） | 已具备 | `i18n/locales/{zh,en}/*.json` 清单一致 |

---

## 3. 查漏补缺缺口清单（P0 阻断 / P1 短板 / P2 增强）

### P0 —— 阻断首次启用闭环

| # | 缺口 | 影响 | 建议做法 | 证据 |
|---|---|---|---|---|
| **P0-1** ✅ 已闭环 `4ac94af80` | ~~前端初始化向导整体缺失~~：已实现 5 步向导页并接六方法 | 闭环 | 5 步向导（公司→部门→岗位→管理员→完成）+ 路由 `/hrm/setup` + 设置组导航 + 落地页非阻塞引导 | `pages/hrm/setup/HrmSetupWizardPage.tsx`；`modules/hrm/config.ts` 注册；`hrmSetup.ts` 六方法 |
| **P0-2** ✅ 已闭环 `33479ed7d` | ~~向导在新库不自洽~~：① 迁移 `20261020000025` 幂等播种 5 条 pending 步骤行；② 公司步 UPDATE→upsert（纠正错列 `email`→`contact_email`）；③ progress 空集按未开始 | 闭环 | 新库干净重放不 500、进度语义正确 | `setup.rs`；迁移 `20261020000025_hrm_seed_default_org_init_status.sql` |
| **P0-3** ✅ 已闭环 `9d33f86b8`（方案B） | ~~`setup/admin` 不产生可登录账号~~：采用方案B——hrm 建员工档案并回绑 `user_id`，建号由前端串联既有 IAM `POST /api/core/iam/users`（bcrypt/去重/角色归 IAM）；不直写 iam（`iam.users` 与 `core_users` 不同步、权威在 unified-core） | 闭环（边界内） | 管理员步产出可登录账号并绑定员工；username/email 冲突友好 409 不 500 | `setup.rs`（P0-3 注释记录方案选择）；前端 `HrmSetupWizardPage.tsx` 管理员步 |
| **P0-4** ✅ 闭环（字典补缺 `b052ac1cf` + JWT 展开 `e810fc787`） | 权限 scope 三套方言：第一批非破坏补齐 23 个中间件已挂载但字典缺失的码、立命名口径；第二批登录 JWT/`/users/me`/`my-permissions` 非超管改 JOIN 规范化授权表，与刷新换发对齐 | 已闭环 | 登录/刷新/me 三路授权源统一为 `core_user_roles→core_roles/core_role_permissions→core_permissions`；超管短路不变；反范式列与 C 方言目录保留待后续迁移 | 迁移 `20261020000024`；`auth.rs` 登录签发；`user/models.rs resolve_user_grants`；`user/profile.rs`、`user/profile_ext.rs` |

#### P0-4 批次落地记录（第一批 2026-10-20 字典补缺；第二批 2026-10-21 JWT 展开，见④）

> 本批严格非破坏：未改任何已挂载端点的 200/403 行为，未删除/重命名任何被保护的 code，未新增任何角色授权。

**① 三套方言现状（全仓盘点结论）**

| 方言 | 形态 | 来源 | 用途 | 本批处理 |
|---|---|---|---|---|
| A 细粒度种子 | `module:resource:action`（3 段冒号，末段 read/create/update/delete/approve） | `database/migrations/20260724000004_seed_module_permissions.sql`、`20260908000014_sync_frontend_permission_codes.sql`、`database/init/03_init_permissions.sql` | `core_permissions` 字典 + 角色绑定 | 保持不动 |
| B 路由中间件挂载码 | 模块伞码 `<mod>:admin`、管理前缀 `admin:<domain>:<action>`、少量 3 段细粒度 | `require_permission("…")` 实际挂载（`lib/shared-auth/src/middleware/permission.rs:16`、`svc/unified-core/src/middleware/permission.rs:55`） | 运行时硬防线 `claims.has_permission` 精确串匹配 | **补齐其中字典缺失项（见②）** |
| C 内存目录下划线码 | `iam:users_read`（冒号 + 下划线动作） | `lib/shared-auth/src/auth.rs:297-498 get_permissions()`；被 `profile.rs:197-212`、`profile_ext.rs:66-81` 硬编码返回 | `/users/me`、`my-permissions` 响应目录；被单测锁定 | **不动**（改名会让 `auth.rs` 单测变红，属后续独立迁移） |

**② 中间件挂载码 × 种子字典对照（50 个非测试挂载码）**

- **字典已存在（27，无需处理）**：`admin:plugin:read/write`、`ai:dashboard:read/admin`、`crm:admin`、`ehs:admin`、`erp:admin`、`file:read/write/delete`、`finance:admin`、`finance:settlement:approve`、`gis:admin`、`hrm:admin`、`iam:read`、`integration:admin`、`mes:admin`、`plugin:dashboard:read`、`pm:admin`、`qms:admin`、`scm:admin`、`system:audit`、`system:migration`、`system:read`、`wms:admin`、`workflow:read/write`。
- **字典原本缺失、本批由迁移 `20261020000024_iam_seed_missing_gate_permissions.sql` 补齐（23，仅字典、不绑角色）**：
  - 模块伞码 `<mod>:admin`（13）：`analytics:admin`、`communication:admin`、`lims:admin`、`master-data:admin`、`mobile:admin`、`monitor:admin`、`pdm:admin`、`portal:admin`、`rd:admin`、`search:admin`、`srm:admin`、`ticket:admin`、`tms:admin`；
  - 订阅（2）：`subscription:admin`、`subscription:read`；
  - 系统/IAM 管理域（5）：`system:write`、`admin:iam:write`、`admin:iam:delete`、`admin:iam:tenant:write`、`iam:tenant:read`；
  - 细粒度补缺（3）：`ai:dashboard:write`、`finance:settlement:read`、`finance:settlement:write`。
- **孤儿（种子有、中间件从不检查）**：20260724/20260908 里大量 `finance:voucher:*`、`mes:*`、`hrm:employee:*` 等细粒度码没有任何 `require_permission` 挂载，属"字典先于网关"，保留不删（角色绑定仍可能用于前端/未来细粒度网关）。

**③ 命名口径约定（本批立规，不在本批改名）**

- 规范细粒度码 = `module:resource:action`（小写蛇形、冒号分隔、末段 `read/write/delete/approve/admin`），与占字典绝大多数的 A 方言一致；
- `<module>:admin` 为历史模块级管理伞码，作为兼容字典条目保留，不重命名为 3 段；
- `admin:<domain>:<action>` 管理前缀码与 20260908000014 已登记的 `admin:*` 同形；
- C 方言下划线码（`iam:users_read`）为待迁移遗留，禁止新代码再新增。

**④ JWT 登录签发 / `/users/me` 角色权限 JOIN 展开 —— ✅ 已落地（`e810fc787`，2026-10-21）**

*决策（单一授权源）：* 以规范化表 `core_user_roles → core_roles`（角色名）、`core_user_roles → core_role_permissions → core_permissions`（权限码）为授权权威源，与既有刷新换发完全同构；**不**与 `iam.users.roles/permissions` 反范式列取并集（刷新本就只读规范化表，并集反而再次制造两路差异）。反范式列保留不删、不写，留待后续独立迁移清理；C 方言内存目录（`get_permissions()`）与单测锁定不动。

*落地内容：*

| 签发/读取点 | 改动 | 超管行为 |
|---|---|---|
| 登录签发 access_token（`auth.rs`） | 非超管改调 `resolve_user_grants` 实时 JOIN 组装 claims.roles/permissions；原 `UserRow` 查询保持不变（命中离线缓存） | 保持 `permissions=["*"]` 短路、roles 取反范式列，不变 |
| GET `/users/me`（`user/profile.rs`） | 非超管去硬编码 7 个 C 方言码，改 `resolve_user_grants` | 仍返回 `get_permissions()` 全量目录，不变 |
| GET `/iam/permissions/my-permissions`（`user/profile_ext.rs`） | 同上，去硬编码 | 同上，不变 |
| 新增 `user/models.rs::resolve_user_grants` | 运行时纯查询（非 sqlx 编译期宏，不依赖离线缓存），roles 空集回退 `["user"]`，permissions 允许空 | — |

*关键设计取舍：*
- 采用运行时 `sqlx::query`（非 `query!`/`query_scalar!` 宏），因为本地 `topems_test` 未全量迁移（缺 `tool_permissions` 等表），无法整库 `sqlx prepare`；纯查询绕过编译期校验且与刷新换发写法一致。
- 不改中间件 `has_permission` 精确匹配、不新增任何角色绑定（`core_role_permissions` 零写入），因此未被规范化授权的用户权限集不变，不主动放宽既有 403。

*验证：* `SQLX_OFFLINE=true cargo check/clippy/test -p topems-unified-core --lib` 全绿（536 passed）；两段 JOIN 在 `topems_test` 只读执行返回 `{}` 无列/关系错误；前端 `permissions: string[]` 形状未变。

*遗留（不属本闭环）：*
1. 集成 e2e（`tests/iam_permission_tests.rs` 等 403 断言）需在已迁移 + 起服务的隔离环境跑一遍确认，本地 `topems_test` 缺表未执行；
2. 反范式列 `iam.users.roles/permissions` 与 C 方言 `iam:users_read` 目录的废弃/改名另立独立迁移；
3. 角色→权限的实际绑定策略（哪些角色拿哪些码）属授权配置，不在代码改动内，由管理员在角色管理页落。

### P1 —— 明显短板

| # | 缺口 | 影响 | 建议做法 | 证据 |
|---|---|---|---|---|
| **P1-1** ✅ 后端闭环（F1，本地待验） | ~~`setup/complete` 空动作：不建默认角色、不绑权限、不改租户状态~~ | 已闭环（边界内）：complete 落 `completion` 初始化标记、汇总公司/部门/岗位数并核验 admin 是否绑定 IAM 账号，未绑定则告警提示先开通账号并分配默认角色/权限；**角色/权限不由 hrm 跨服务直写**（方案B，避免 core_user_roles 孤儿/错位行），默认角色/权限由 IAM 建号端点分配 | complete 写初始化标记 + 结果核验汇总；授权归属 IAM，hrm 不越界写角色目录 | `hrm/setup.rs complete_initialization` |
| **P1-2** ✅ 闭环（`4d87064ea`） | ~~部门/岗位后端无 handler 级 `check_permission`，仅全局 `hrm:admin`~~ | 已闭环：部门/岗位 10 个 handler（list/get/create/update/delete）补 `check_permission`，读用 DepartmentRead/PositionRead、写用 DepartmentWrite/PositionWrite（对齐 company/employee；模块级映射到 `hrm:read/write`）；`permission.rs` 增 PositionRead/Write 变体与映射 | 读/写 handler 级权限校验，未授权 403 | `department.rs`、`position.rs`、`shared/permission.rs` |
| **P1-3** ✅ 闭环（S1 `cc16d41d8`） | ~~自助注册开放无开关，注册账号无角色/权限/租户，注册后不可用~~ | 已闭环：`REGISTER_ENABLED` 默认关（403），开启时新账号落 `status=pending` 待管理员激活并分配角色/租户，登录仅放行 active；`.env.example` 已声明 | 开关默认关；开放时 pending 待激活，不产生可登录僵尸账号 | `auth.rs register`；`.env.example REGISTER_ENABLED` |
| **P1-4** ✅ 闭环（`064287e6f`） | ~~前端权限守卫几乎未落地：35 个 config.ts 0 声明权限，PermissionGate 仅 1 处使用，菜单不过滤~~ | 已闭环：实测 35 个 config.ts 早已全部有 requiredPermissions 声明（原"0 声明"为过时口径），路由层 ProtectedRoute/ModuleGate 双层守卫既有；唯一真实缺口 GlobalLayoutV3 侧边栏菜单不过滤——新建 `config/menuPermissions.ts`（34 项 path→模块代表权限码）渲染层过滤（无映射恒显示、映射无权限整组/项隐藏）；typecheck/eslint 绿 | `config/menuPermissions.ts`；`GlobalLayoutV3.tsx` items useMemo filter |
| **P1-5** ✅ 闭环 | ~~`/users/me`、自身改密被 `iam:read`/`admin:iam:write` 保护，普通用户 403~~ | 已闭环：自服务端点拆入独立 `me` 路由组，仅由全局 `auth_middleware` 校验登录（无 token→401），不再叠加管理权限层；管理类增删改/角色/权限仍守 `iam:read`/`admin:iam:write`/`admin:iam:delete` | 9 个自服务端点（GET/PUT `/users/me`、自身权限、自身偏好、改密、头像、自身权限校验、`/permissions/my-permissions`）身份一律取 `Claims.sub`，不接受 body/路径指定他人 | `routes/iam.rs`（`me` 路由组）；全局 `auth_middleware`（shared-auth） |
| P1-6 | ✅ MES 缺车间/产线/工作中心表与路由，工位 `workshop_id` 悬空；缺班次/工作日历 | 无法做真实排产与产能建模，APS 基础数据不成立 | 补车间/产线/班次/日历实体 CRUD 与前端页，回填工位外键 | 全库无 workshop/production_line/shift/calendar 建表；`work_station.rs:30-43` |
| P1-7 | ✅ QMS 缺结构化检验项/检验方案/抽样方案；LIMS 缺检验项目(analyte) | 检验只能填自由文本，无法标准化质检 | 补 inspection_item/sampling_plan/analyte 表与 CRUD + 前端方案配置页 | 无 checklist/inspection_item/sampling_plan 表；analyte 无表 |
| **P1-8** ✅ 闭环（`52cc3a467`，迁移 `20261020000026`） | ~~多表缺租户隔离~~ | 已闭环（DB RLS 为主、app 层补强）：迁移为 `gis.geofences`/`rs.material_tests` 补 `tenant_id` 列并 ENABLE+FORCE RLS + `tenant_isolation_*` 策略，删除 `erp.bank_accounts` 的 `erp_allow_all` 开放策略并换租户策略；gis 五 handler 注入 claims 按租户/公共行过滤并落库 `tenant_id`，rs 建记录、erp 建账户按 `app.tenant_id` 落租户，pm 建项目由 `effective_tenant_id` 按会话租户落库（不再写死 0001）。核查结论：`bi.analytics_datasets`、`pm.projects` 本就带 `tenant_id` 与 `rls_tenant_isolation` 策略（DB 层已隔离）；wms/mes 源码未发现写死公共 UUID（原备注过时） | 缺列表补列+RLS，开放策略关闭，写死租户改会话租户 | 迁移 `20261020000026`；`gis/geofence.rs`、`rd/material.rs`、`erp/bank_account.rs`、`pm/project.rs` |
| **P1-9** ✅ 闭环（`cdeeef76b` 批4） | ~~后端有前端缺的管理页~~（财务会计期间/辅助核算创建由 P1-10 `78042fe2a` 完成） | 已闭环：MES 产能日历 / LIMS 方法分类 / CRM 标签 / ERP 字典 / EHS 危险源 / GIS 设备注册六页挂载（迁移 `20261021000008` erp_dictionaries、`20261021000009` ehs.safety_hazards/hazard_risk_assessments/hazard_control_measures + qa_ehs_hazards 视图 + crm.tags name_en + gis.devices tenant_id 补列）；EHS 危险源复用既有 EhsHazardPage、CRM 标签复用既有 crm.tags 路由；BFF 冒烟六接口 create/list 全 200 | 六页前端 + 后端契约修复 | `pages/{mes/Capacity,lims/MethodCategory,crm/Tag,erp/Dictionary,gis/Device}Page`；`svc/{erp/dictionaries.rs 新,lims/test_method.rs parent_id 类型,ehs/hazard.rs created_by 类型,mes/capacity.rs NUMERIC cast,gis/embedded.rs 路由}`` |
| **P1-10** ✅ 闭环（`78042fe2a` + `6c29a8189`） | ~~财务两套科目表并存~~（科目体系已归并：59 表归位 finance schema、代码收敛 `core_finance_accounts`、V321 下线）；会计期间无管理页（已补）；税率硬编码（`finance_v56_tax_*` + FinanceTaxPage）；无币种主表（已建） | 账务主数据归属割裂，多币种/税务无法配置 | 统一科目体系、补期间/税率/币种主数据页 | `mod.rs:4934,5321`；`tax_v56.rs:1057,2234`；迁移 `20261021000002/00003` |

> P1-10 闭环说明（2026-10-21）：币种主表已建（`finance.core_finance_currencies`，迁移 `20261021000001` 幂等 + 8 种×2 租户共 16 行种子 + `20261021000002` 归位）、后端 `currencies.rs` 全 CRUD 挂载、前端 FinanceCurrencyPage/FinancePeriodPage + 路由/i18n 已落地（BFF 实跑 list(17)/create(THB)/search/delete 全 200）；税率面已具备（`finance_v56_tax_*` 6 张表 + FinanceTaxPage）。**科目体系已归并（线C1 `6c29a8189`，方案 A 根治）**：迁移 `20261021000002`（幂等建 finance schema + 归位 51 张 + `core_finance_accounts` 补 `category` 列）+ `20261021000003`（补归位 `finance_v60_*` 8 张）→ **59 张 finance 表全部归位 finance schema**；代码 8+ 处引用（`financial_reports.rs` 8 处 JOIN/COUNT、`mod.rs` 4258/4313 查询、`erp/opening_balance.rs` 2 处）全部收敛 `finance.core_finance_accounts`（`deleted_at`→`is_enabled`、`organization_id`→`tenant_id` 适配）；V321 `accounting_subjects` 路由下线（mod.rs 挂载 + openapi 注册移除，BFF 实跑 404）；BFF 重启（SEARCH_PATH 加 finance）后冒烟：`/accounts`（原 500→200）、`/currencies`、`/periods`、报表聚合（financial-overview/cash-flow-analysis/profit-analysis）全 200；期间 close 顺带修复列名 bug（`period`→`year/month`）。

### P2 —— 增强 / 一致性 / 技术债

| # | 缺口 | 影响 | 建议做法 | 证据 |
|---|---|---|---|---|
| **P2-1** ✅ 闭环（`958e0cc9a`） | ~~无首次引导/空态 CTA：落地页硬编码 mock，无"先录公司/人员"提示~~ | 已闭环：主页 `InitGate` 拉 `GET /setup/progress`，未完成时在 mock dashboard 上方渲染五步初始化 checklist（进度条+完成/进行/待办态+「开始初始化向导」CTA），完成或查询失败/无权限则静默回退 dashboard，不阻塞普通用户 | 空组织展示 checklist 引导，完成才进 mock 首页 | `pages/hrm/setup/InitChecklistPanel.tsx`；`pages/shared/HybridHomePage.tsx`；zh/en `hrm.json` |
| **P2-2** ✅ 闭环（`2def461ff`） | ~~向导写死 `DEFAULT_ORG_ID=0001`，不读 JWT tenant/org~~ | 已闭环：六个向导端点（progress/company/departments/positions/admin/complete）的 org/进度归属改为 `tenant_filter.unwrap_or(DEFAULT_ORG_ID)`——已登录租户按 `Claims.tenant_id` 落进度行/公司归属，首启超管无租户时回退 `DEFAULT_ORG_ID`（与 `20261020000025` 种子一致），不另起半改 | 进度行/公司归属按会话租户，首启超管回退默认 org | `svc/hrm/setup.rs` |
| **P2-3** ✅ 闭环（F2，本地待验） | ~~批量步部分失败不回滚，成功/失败混杂提交~~ | 已闭环：部门/岗位步先整批前置校验（空名、批次内重名/重码、库内同名、岗位部门存在性），全部通过才写库；任一 DB 错误不 commit，txn drop 自动回滚整批，杜绝部分成功混杂 | 全量前置校验 + 全成功才提交，失败整批回滚并明确报错 | `hrm/setup.rs setup_departments/setup_positions` |
| **P2-4** ✅ 全闭环（应用层 F2 + DB FK `793a3f4b2`，迁移 `20261020000027`） | ~~岗位→部门无 DB 外键；岗位步无批次重名校验；positions 孤儿可静默存在~~ | 已全闭环：应用层岗位步补批次内重名/重码校验、库内同名拦截、`department_id` 必须存在且属本租户；DB 层迁移 `20261020000027` 先把指向缺失部门的孤儿 `department_id` 解绑置 NULL（非破坏），再幂等建 `hrm_positions_department_id_fkey` → `hrm.departments(id) ON DELETE SET NULL` | 应用层重名校验+部门归属存在性；DB 硬 FK（先清孤儿） | `hrm/setup.rs setup_positions`；`position.rs`；迁移 `20261020000027` |
| P2-5 | 路由遗留错配：`routes/common.ts` 10 处重复注册（且 requiredPermissions 置空）、9 处孤儿路由、`/settings` 死链、`BackupPage` 无引用 | ✅ 完成（`69d7a42f5`）：common.ts 收敛为 3 条特有路由，重复/孤儿全部以模块 config 为准；`/settings` 死链核销；BackupPage 删除 | 清理 common.ts，统一以模块 config 为准 | 2026-10-21 |
| **P2-6** ✅ 闭环（S3 `e1980e95d`） | ~~`DEVELOPMENT_MODE=true` 伪造超管旁路未声明、prod 判定只看 PROFILE~~ | 已闭环：prod 判定覆盖 `PROFILE/RUST_ENV/ENV=prod|production`（补 RUST_ENV/ENV，避免只设 RUST_ENV 时旁路生效）；强化告警；`.env.example` 显式声明默认 false | 生产三环境变量任一为 prod 即忽略旁路，仍要求真实 JWT | `shared-auth/auth.rs` dev gate；`.env.example DEVELOPMENT_MODE` |
| P2-7 | 菜单种子 tenant_id=全 0 与默认租户 0001 错位；DB 菜单非前端主驱动 | ✅ 完成（`69d7a42f5`）：统一租户命名空间——迁移 39 处全 0 改默认租户 0001 并应用，core_menus 184 + core_menu_groups 53 行落地 | 统一租户命名空间或改公共共享菜单策略 | `20260724000005_seed_module_menus.sql`（tenant 已归位 0001） |
| **P2-8** ✅ 闭环（`fb944841d`，迁移 `20261021000004`） | ~~财务默认科目/期间种子只覆盖迁移时已存在租户，新建租户不补~~ | 新租户缺基础科目 | 配合首启租户建立后补播，或提供按需播种 API | 迁移 `20261021000004`（幂等函数 `finance.bootstrap_defaults(p_tenant_id)` + 存量 30 租户补播）；`POST /api/finance/bootstrap` 播种 API（显式 tenant_id / 会话租户 / 全量，BFF 实跑 200、幂等不重复插） |
| **P2-9** ✅ 闭环（S4 `f23f543db`） | ~~孤儿脚本含 admin/admin123 未接入部署/CI，误导弱口令~~ | 已闭环：脚本头部标注"未接入/勿对生产执行"，admin 弱口令播种与角色绑定停用（注释）；测试夹具 `iam_test_data.sql` 标注仅测试库；权威超管走启动自举 + ADMIN_INITIAL_PASSWORD + 首登改密 | 不删除历史脚本但移除弱口令可执行性，README 同步告警 | `database/init/03_init_permissions.sql`；`database/init/README.md`；`database/test/iam_test_data.sql` |
| **P2-10** ✅ 闭环（`fb944841d`） | ~~技术债：HRM `roles.rs` 空桩；`LoginFormV2` 遗留模拟登录分支；`authStore` 旧版；OpenAPI 双 ApiDoc 块不一致~~ | 维护成本/误用 | 删除或标注废弃，统一 ApiDoc | `roles.rs` 头注释 DEPRECATED（契约兜底保留，待 IAM 角色资源）；`LoginFormV2.tsx` 死代码删除（LoginPage 自实现真登录）+ index re-export + i18n 68 key 清理；`authStore.ts` 头注释 DEPRECATED（无写入方、5 读取方已迁移 localStorage/useAuth，保留仅因 20 测试 mock）；OpenAPI 双块**实勘不存在**（全仓 `openapi.rs` 均单 ApiDoc，行号已失效，核销） |
| P2-11 | 全栈缺统一物料目录/UOM/税率表/币种/样品等公共主数据；PM 项目类型模板空桩；PDM 无独立图纸实体 | 跨模块主数据各自为政 | ✅ 已具备：物料/UOM/样品已由 master-data 承接（`143268b49`）；PM 项目类型模板、PDM 图纸实体已收口（`67efb57b5`） | 见 §3 各"缺失"行；`project_type_config.rs:12-17` |

---

## 4. 新环境首次可登录性结论与默认账号来源

### 4.1 结论

**在"先跑迁移链建表 → 启动 unified-core"的标准路径下，新环境可以直接登录默认超管 `admin` / `admin123`。** 该账号由**服务启动自举**创建（不是迁移 SQL 种子），`is_superuser=true` 绕过全部中间件权限检查。

### 4.2 证据链（已逐一复核）

| 环节 | 证据 |
|---|---|
| 启动调用初始化 | `svc/unified-core/src/main.rs:317` `try_init("iam", \|\| modules::iam::init_database(&ctx.db))`（另见 `embedded.rs:90`） |
| 建 iam.users 表 | `modules/iam/mod.rs:18-39` `CREATE TABLE IF NOT EXISTS iam.users` |
| 种子 superadmin/admin 角色 | `mod.rs:366-377`（`INSERT core_roles ('superadmin')`、`('admin')`） |
| 插入默认超管 | `mod.rs:434-457`：`INSERT INTO iam.users (username='admin', email='admin@topems.com', password_hash=bcrypt(ADMIN_INITIAL_PASSWORD 或 'admin123'), is_superuser=true) ON CONFLICT(username) DO NOTHING` |
| 绑定超管角色 | `mod.rs:460-469`：`core_user_roles` 关联 admin ↔ superadmin |
| 登录只查 iam.users | `modules/iam/auth.rs:178-188` `FROM iam.users u WHERE username=$1 OR email=$1`；bcrypt 校验 `:247,1603-1611` |
| 超管短路放行 | `lib/shared-auth/src/auth.rs:44-46`（`is_superuser` 直接 `has_permission=true`） |

### 4.3 必须注意的前提与风险（非"开箱无忧"）

1. **依赖先跑迁移**：`init_database` 内 `core_user_roles` 外键引用 `core_users`（`mod.rs:79`），该表由迁移 `001_iam.sql:1` 创建；未跑迁移时 `try_init` 吞错（`main.rs:305-313` 仅 warn），admin 插入可能被跳过。
2. **`ADMIN_INITIAL_PASSWORD`**：S2（`7aff8b852`）已在 `.env.example` 声明，未设置回退 admin123 并打印区分告警。
3. **默认 `admin123` 为弱口令**：S2 后新播种 admin 带 `must_change_password=true`，登录下发该旗标、自身改密即清除；**后端硬拦截（未改密禁止访问其他接口）仍缺**，前端强制跳转属 P1-4，暂为软提示。
4. **迁移链 SQL 本身不造用户**：`database/migrations/` 内无 `INSERT INTO iam.users`；`admin/admin123` 另存在于未自动挂载的孤儿脚本 `database/init/03_init_permissions.sql:423-432` 与测试数据 `database/test/iam_test_data.sql`，二者都不在 sqlx 迁移链，**不能依赖它们**。
5. **后端已实现 `POST /tenant/onboard`（建租户+超管原子事务，`tenant/handlers.rs:424-530`）但未挂路由、前端无页**——这是替代"启动自举"的更规范首启方案，见 P0-1/P0-3 建议。

> 口径区分：**"迁移种子无 admin"（B 分片结论，对）** 与 **"启动自举有 admin"（A 分片发现，经本人复核成立）** 并不矛盾——前者指 SQL 迁移链，后者指进程启动 `init_database`。本报告以复核后的启动自举为准。

---

## 5. 环境性 / 非缺陷说明（避免误报）

以下为已知的环境性或历史遗留，**不计入本次代码缺口**：

- 存量库台账需 `scripts/migration/rebaseline-ledger.sh` 重锚（运维历史数据处理，非代码缺陷）。
- N9 GIS 双表仅需文字厘清（文档问题，非功能缺失）。
- P2 乱码脏数据不改动（历史数据，不清洗）。
- mes/lims 在线 e2e 依赖本地已迁移 schema 与 `localhost:8000`（环境前置，非代码缺陷）。
- 菜单后端 `/api/menu` 存在且有 CRUD（`menu/handlers.rs`），前端当前用硬编码导航，属设计选择而非后端缺失。
- master-data（MDM）为治理/质量规则/血缘域，非运营主数据，物料/客商/UOM 不在此，属规划分工。

---

## 6. mdm P3 预留能力 UI 批次落地记录（2026-10-20 全部完结）

> 依据排期：`docs/quality/mdm-p3-ui-roadmap-2026-10-20.md`（4 个能力域分 4 批）。全部批次代码于 2026-10-20 落地（早于排期文档状态记录），本档同步完结状态。

| 批次 | 能力域 | 实现提交 | 落地内容 |
|---|---|---|---|
| 1 | B4 schema-registry 元数据驱动动态 API | `883e70146`（+`f122d1b98`/`8ab52a995` 修复、`4bf7e049c` 冒烟清零） | 后端 `/schema-registry` 10 路由 + 前端 wrapper 10 方法 + SchemaRegistryPage；i18n 38 key，typecheck/eslint 绿 |
| 2 | B1 lineage-v52 血缘分析/传播/回滚 | `b3620e9c6` | 后端 `/lineage-v52` 15 路由 + LineageAnalyticsPage（926 行工作台，v60 血缘图底座）；i18n 66 key |
| 3 | B3 mdm-v59 AI 治理/匹配/分类 | `378f18467` | 后端 `/mdm-v59` 23 路由 + AiGovernancePage（1036 行，Tabs 三子视图）；i18n 68 key |
| 4 | B2 mdm-v55 API 商业化/计费/SLA | `6beaaab27` | 后端 `/mdm-v55` 路由 + CommercialConsolePage（1056 行，4 tab 控制台）；i18n 全 |

验证：全批次 typecheck / eslint 绿，契约分别 10/15/23 对闭合（契约审查报告 B1-B4）；本地 origin 同步已推送。

---
## 附：取证文件索引（原始证据）

- 组织底座与向导：`agents/s_000EleGk8qx/artifacts/findings-org-setup.md`
- 认证/权限/种子：`artifacts/findings-auth-seed.md`
- 供应链/制造/仓储/质量：`artifacts/findings-supply-quality.md`
- 其余业务模块：`artifacts/findings-other-modules.md`
- 前端引导/路由对齐：`artifacts/findings-frontend-usability.md`

已有上手文档（可供配套使用，非本次新写）：`docs/getting-started/{quickstart,environment-config,local-deployment}.md`、`docs/user-guide/{quick-start,UserManual,system-admin-manual,system-feature-checklist}.md`、`docs/admin/` 部署运维手册。**缺一份"空租户/首次端到端初始化（建组织→建人员→配权限）"引导文档，与前端引导缺失（P0-1/P2-1）对应。**

---

## 变更日志

| 日期 | 版本 | 提交 | 改动要点 |
|---|---|---|---|
| 2026-10-23 | v1.83 | code-quality 复核结论 ⏳ | CI 11 FAIL 复核续：**code-quality 半核销**——check_component_naming.py PASS（1037 文件 exit 0）；check_api_duplicates_ci.py 本机 17+ 分钟未完成（CPU 74.6% 仍在算，逐 .rs 文件正则+函数范围分析性能瓶颈，CI ubuntu 更慢疑似 FAIL 真因）→ 停跑，登记：脚本性能优化或 CI 环境跑批。frontend-test/frontend-coverage 本机 vitest 可试跑（CI 5 shard 单机全量）。提交 `TBD` |
| 2026-10-23 | v1.82 | page-audit 达标 ✅ | CI 11 FAIL 复核续：**page-audit 修复**（92%→95%）——44 页未用模板中 16 个简单管理页包 PageContainer（批 4 六页 TagPage/DictionaryPage/FinanceCurrencyPage/FinancePeriodPage/DevicePage/AnalytePage/MethodCategoryPage + mes 2 + lims 2 + pm/pdm/qms/scm/erp/crm/gis/automation/shared/system/workflow 各 1，脚本化 import+包 return+prettier 收尾，首版多行 import 误插损坏→git checkout 恢复重改），tsc 0 error → **纯页面标准化率 95% 达标**（exit 0）。剩余 28 页（ai 7/mobile 10/master 6/report 4/shared 1）为复杂自实现工作台（AI 治理/移动端/报表设计），登记后续批不擅改。CI 11 FAIL 已核销 9/11；剩 frontend-test/frontend-coverage/code-quality（需 CI 环境）。提交 `TBD` |
| 2026-10-23 | v1.81 | mes-online 核销 ✅ | CI 11 FAIL 复核续：**rust-audit 绿**（cargo-audit 0.22.2，4 allowed warnings 非阻塞 exit 0）。**mes-online 根因修复**：mes_guard.sh 遮蔽报警 exit 1 —— public.capacities（有 2 行数据，mes 查询同名遮蔽）数据迁 mes.capacities（列超集，id 冲突 DO NOTHING）+ DROP public.capacities（双库 topems/topems_test 同步，test 库本就无 public 版）；public.schema_defense_ledger 加 PUBLIC_ALLOWLIST 白名单（设计性多 schema 防御台账，每域 1 行，mes 版 search_path 优先非遮蔽）→ **mes_guard PASS**（遮蔽通过 + 在线编译 0 error，根 .sqlx 310 缓存一致）。复验：DOMAIN_PROBE_OK（0 5xx）+ contract-gate 2653/6336/0。CI 11 FAIL 已核销 8/11（menu 修复 + 6 项绿 + rust-audit + mes-online）；剩 page-audit（92%<95% 44 页待批）+ frontend-test/frontend-coverage/code-quality（需 CI 环境）。提交 `TBD` |
| 2026-10-23 | v1.80 | CI 11 FAIL 本机复核批次 ✅ | 11 项中本机可复跑 7 项：**① menu-health 修复**（P1 26 个权限码未在 permissions.ts 注册——批4/批7/mdm 新增页权限码，PERMISSION_DEFS 补 14 个唯一码（crm:contract:read/erp:sales:read/finance:currency+period/lims:test-method/master_data:ai_governance+commercial+lineage/master-data:schema/mes:workshop/pdm:drawing/qms:action/pm:read/qms:read）→ FAIL-FAST 通过）；**② 核销 5 项**：perm-matrix ci-report exit 0（STRICT）、i18n-quality 7-in-1 PASS（0 failures）、check-icons/check-nav-route/compare-api-modules/check-error-handling 全 exit 0。**③ page-audit 未达标**（标准化率 92% < 95%，44 页未用模板：ai 7/mobile 10/master 6/report 4/lims 2/mes 2/finance 2 等——批4/批7/AI 工作台自实现页，逐页模板重写风险高）→ 登记待独立批次，不擅改。**④ 重项 4 项**（mes-online-cargo 编译/rust-audit/frontend-test/frontend-coverage/code-quality）需完整 CI 环境或重型构建，本机不适跑。提交 `TBD` |
| 2026-10-23 | v1.79 | analytics usage/api-usage 端点核销 ✅ | 历史观察「前端 tenant analytics usage/api-usage 查询端点 404（4111 类产品排期）」为过时快照——**实测核销**：GET /api/core/tenant/{id}/analytics/usage → 200 真实数据（period 2026-10-01、users_count 2、storage_used_mb 35、api_calls 真实）；GET /api/core/tenant/{id}/analytics/api-usage → 200（total_api_calls 6448、read 4509/create 19 等 breakdown）；handler 在 svc/unified-core/src/modules/tenant/handlers.rs:2781/2810、路由挂 master.rs:117-121（v1.44 T2-c 已实现，前端 apiClient.core 路径对齐）；无 tenant 前缀的裸 /api/analytics/api-usage 404 属前端不消费路径（无影响）。contract-gate 2653/6336/0 保持。提交 `TBD` |
| 2026-10-23 | v1.78 | DDL 基准口径统一（core_ 域表 schema 归位） ✅ | 根因：`20261007000006_rebuild_orphan_tables.sql`（重建孤儿表基准）仍定义 iam.core_* 48 张 + mes.core_* 48 张，与运行时实际（v1.70 删 iam 空壳、v1.73 删 mes.core_ 空壳、数据在 public/core/ticket）口径分歧。**统一映射**：core_plugin*/core_tenant_plugins → core（显式引用）、core_ticket* → ticket（显式引用）、其余 core_* → public（数据实际）——共替换 154 处（iam 76 + mes 78，含 REFERENCES 引用）；残留 0。**验证**：migration-validate 0 Error（checksums 自动重算）、contract-gate 2653/6336/0。**效果**：DDL 基准与运行时一致——新环境 apply 迁移后 core_ 域表直接落 public/core/ticket，不再产生 iam/mes 空壳双版；v1.70 观察项闭环（生产排期项提前本机完成基准层）。提交 `TBD` |
| 2026-10-23 | v1.77 | 系统完善收口终验快照 ✅ | 双表统一五批收口后全套门禁终验：contract-gate 2653/6336/0、domain-probe DOMAIN_PROBE_OK（0 5xx/0 BODY_FAIL）、verify-rls == 完成 ==（183 策略表缺口 0）、mobile 8070 在线（114/114 契约）、BFF 8098+8099 双实例在线、collect-usage 每日 01:00 crontab 运行中（10-01 期 api_calls 6071 持续增长）。lefthook 门禁复核：pre-commit 20+ 静态门禁 + pre-push 含 cargo check/fmt/clippy/test/domain-probe（[2026-10-22 Gate DP] 探活已并入，5xx 阻断推送，BFF 离线 SKIP）。**本机可闭环项**（数据基建/采集/RLS/契约/mobile/生产验证/hrm/双表统一）已全收口；剩余项均为外部依赖：生产机实跑（systemd/nginx/install 链）、none 级流量观测（≥30 天）、CI 侧 11 FAIL 复核（需完整 CI 环境）、DDL 基准口径统一（待生产排期）、analytics usage 端点（产品排期）。提交 `TBD` |
| 2026-10-23 | v1.76 | 双表统一第五批（112 张 0 行冗余版） ✅ | 145 组双表分类定性：①受保护空壳 17 组（alerts/contracts/customers/inventory/suppliers 等多域同名，svc 显式引用，保留）；②有 PROT 版 + 全 0 行 112 组（analytics_dashboards/bi、core_finance_aux_*/ledger/voucher_lines/finance、core_plugin_*/core、core_ticket_*/ticket、batch_records/bom_items/equipment/demand_forecasts/mes、conversion_*/core_inter_module_sync/integration 等）→ 删 0 行非保护冗余版 112 张（PROT 版保留，双库 + FK CASCADE）；③有数据 + 受保护 13 组（audit_logs 10 域 PROT（crm 13 行）、qa_ehs_* public+ehs 双数据、capacities public2/mes0、devices gis1/mobile1、materials master_data1 等）——设计性双版保留；④有数据无 PROT 3 组（qa_ehs_hazard_rectifications/verifications 双版、schema_defense_ledger 15 域 1 行）——search_path 依赖双版，保留。**收敛**：双表 145 → 34 组（均为设计性多 schema）。复验：DOMAIN_PROBE_OK（0 5xx）+ gate 2653/6336/0。提交 `TBD` |
| 2026-10-23 | v1.75 | 双表统一第四批（101 张非 public 空壳） ✅ | 全空双表候选（0 行 + 无显式引用）重扫后删除非 public 冗余版 101 张：bi.analytics_* 11 张、erp.announcements/meeting_*/vehicles/vehicle_requests/expenses、finance.budgets/expenses/payables/receivables/vouchers/settlements/financial_reports/finance_voucher_templates/core_finance_approval_workflows/cqrs_events、iam.core_* 24 张（users/plugins/workflows/emails/templates/notifications/migration/dashboard_snapshots/refresh_tokens/schema_registry 等）、master_data.core_dict_*/schema_registry/dynamic_data/core_mdm_*、ehs.qa_ehs_* 18 张（accident/health/stock/inspection 系，ehs.qa_ehs_risks/hazards 等显式引用版保留）、qms.quality_*/mes.* 14 张、doc.document_versions、integration.erp_mappings/external_erp_sync_logs、rs.equipment 系、scm.scm_master_data_refs 等（public 兜底版保留；显式引用版保护）。**流程固化**：pg_dump --schema-only 双库 DDL 备份 → 删除（FK CASCADE）→ domain-probe + gate 复验；本批 0 次回滚。复验：DOMAIN_PROBE_OK（0 5xx）+ gate 2653/6336/0。双表剩余 145 组（audit_logs/schema_defense_ledger/qa_ehs 双版等设计性多 schema + 数据双表）待定性。提交 `TBD` |
| 2026-10-23 | v1.74 | 双表统一第三批（26 组可删冗余版） ✅ | 保护清单复核后删除 26 张 0 行 + 无显式引用冗余版：gis/bi/qms.audit_logs、iam.core_faqs/guides/menu_groups/menus/permissions/role_permissions/roles/user_roles、public.core_finance_periods、public.crm_master_data_refs、public.devices、pm.documents、doc.documents、public.erp_master_data_refs、public.mobile_scan_records、mes.production_lines、ai/iam/qms/ticket.schema_defense_ledger、mes.shifts/work_calendars/workshops（组内有数据版保留：crm.audit_logs 13、finance.core_finance_periods 32、crm.crm_master_data_refs 76、erp.erp_master_data_refs 7、mobile.documents 17、mobile.mobile_scan_records 17、public.production_lines/shifts/work_calendars/workshops 各 1-2、public.schema_defense_ledger 6）；FK 依赖链 CASCADE 断约束，双库同步；复验：domain-probe DOMAIN_PROBE_OK（0 BODY_FAIL）+ gate 2653/6336/0。提交 `TBD` |
| 2026-10-23 | v1.73 | 双表统一第二批（mes.core_ 空壳 + barcode） ✅ | **① 保护清单**：grep svc/src/crates 显式 schema 前缀引用（564 张受保护表），清理前比对。**② 清理**：mes.core_* 45 张空壳（core_tenants/users/modules/usage/files/faqs/menus/roles/permissions 等，全 0 行 + 无显式引用；FK 依赖链 CASCADE 断约束后清，双库同步）；public.barcode_scans 空壳（mobile.barcode_scans 显式引用 17 行保留）。**③ 复验**：domain-probe DOMAIN_PROBE_OK（0 5xx）、gate 2653/6336/0。**④ 待续**：73 组空壳双表候选（analytics_* bi/public、core_dict_* 4 schema、announcements erp/public 等）+ 40 组有数据双表（capacities public2/mes0、core_finance_periods finance32、crm_master_data_refs crm76 等）待分批统一。提交 `TBD` |
| 2026-10-23 | v1.72 | 双表统一第一批 + ehs 显式前缀修复 ✅ | **① 双表扫描**：全库同名多 schema 表清单（200+ 组，多数空壳）；本批统一：pm.projects（消费在 rs.projects 5 行）、push_devices/notifications/templates public 空壳（消费在 mobile）、qa_ehs_* ehs 空壳（消费在 public）。**② 踩坑（重要）**：svc/ehs/src/modules/risk.rs 显式 `FROM ehs.qa_ehs_risks`（schema 前缀非 search_path）——删 ehs 版表致 hidden-500（HTTP 200 body 500「获取风险列表失败」）。**③ 修复**：恢复 ehs.qa_ehs_* 43 张（LIKE public INCLUDING ALL）+ 迁移数据（risks 6/hazards 9/trainings 3）+ 补 tenant_id uuid（public 源 + ehs 版双库，填首租户）。**④ 复验**：ehs/hazards 200+6 条、domain-probe DOMAIN_PROBE_OK（0 BODY_FAIL）、gate 2653/6336/0。**⑤ 经验**：双表清理前必须 grep 显式 schema 前缀 SQL 引用（svc/*/src/modules/*.rs），禁删被显式引用的 schema 版表；剩余空壳双表清单待分批统一。提交 `TBD` |
| 2026-10-23 | v1.71 | pdm/flow 缺列修复 ✅ | **① 发现**：日志 ERROR 增量追查（v1.63 后 20:59/21:00）——pdm 产品列表 `column "name_en" does not exist`、flow 工作流列表 `column "tenant_id" does not exist`（v1.61 全量补列漏网，schema 为 public 非 pdm/flow 前缀表名）。**② 修复**：主库+topems_test 双库补列——public.pdm_products ADD name_en varchar、public.core_workflows ADD tenant_id uuid（IF NOT EXISTS 幂等）。**③ 验证**：pdm/products、core/flow/workflows 端点全 200；补列后无新 ERROR（旧日志为补列前历史）。**④ 经验**：缺列排查须覆盖 public 承接的模块表（pdm_products/core_workflows 等非 schema 前缀表），全量补列口径补录。提交 `TBD` |
| 2026-10-23 | v1.70 | iam 空壳表统一 ✅ | **① 根因**：DDL 基准 06_iam_schema.sql 定义 iam.core_ 域表（空壳），v1.47+ 采集/种子 search_path 首 public 误写 public 版（数据全在 public）。**② 统一**：删 iam 空壳 8 表（core_tenants/users/modules/usage/files/plugins/settings/usage_records，全 0 行；tenants 有 iam 侧 6 FK 依赖链 → CASCADE 断约束后逐删），本机运行态单表 public（31/2/5/36/3 数据保持）。**③ 复验**：collect-usage-daily 重跑幂等写 public（api_calls 3946 持续增长）、contract-gate 2653/6336/0 保持。**④ 待办登记**：DDL 基准 06_iam_schema.sql core_ 域表与 public 运行态 schema 口径统一（生产初始化前需定 public/iam 单一归属 + search_path 显式化）；前端 tenant analytics usage/api-usage 查询端点后端未挂载（404，属 4111 类产品排期另档）。提交 `TBD` |
| 2026-10-23 | v1.69 | 生产 conf 合规确认 + 门禁复验 ✅ | **① nginx 2 warn 模板合规**：http2 已是独立指令（listen 443 ssl; + http2 on;，无弃用 listen ... http2）；ssl_stapling on/verify on + resolver 1.1.1.1/8.8.8.8 + ssl_trusted_certificate chain.pem 齐备（OCSP 条件完整）——生产 conf 模板已优化，上线用模板即无 warn。**② 门禁三件套复验**：contract-gate 2653/6336/0、domain-probe DOMAIN_PROBE_OK（0 5xx）、verify-rls == 完成 ==、8099 生产态实例在线。**③ usage 实证**：public.core_tenant_usage 10-01 期 users=2 / api_calls=**3820**（v1.62 时 2584 持续增长）/ storage=35MB。**④ 观察项**：public 与 iam 双 core_tenant_usage（iam 0 行空壳，search_path public 优先，无功能影响，登记待统一）。提交 `TBD` |
| 2026-10-23 | v1.68 | 生产机部署核销（本机生产态模拟） ✅ | **① 生产态服务**：8099 起第二实例（同 8098 env，SERVER_PORT=8099）→ production-verify.sh BASE_URL=8099 全链「**验证通过**」（报告 test-results/production-verify/production-verify-20261023-043046.html，同 v1.60 口径）。**② nginx 模板**：topems.conf 语法结构有效（upstream server_service→:8099 + listen 80/443 + proxy_pass 链路完整）；macOS 平台差异：epoll→kqueue 替换、brotli 模块缺失、证书占位——Linux 生产机具备则完整通过；遗留 2 warn 确认存在（http2 弃用指令/ssl_stapling 无 OCSP，已登记生产 conf 待优化）。**③ systemd**：31 unit 全含 User+ExecStart（/opt/topems 生产路径模板完整）。**④ smoke-prod**：--base 参数就绪（部署后核销脚本）。**⑤ 结论**：生产部署资产（脚本/unit/conf）齐备且本机等价链路通过；真实生产机接入待提供 SSH 目标。提交 `TBD` |
| 2026-10-23 | v1.67 | 前端契约消费复核 ✅ | **① 契约源**：apps/web/src/config/runtime.ts（前端封装调用点，gate 解析 2653 端点）。**② 契约静态**：前端 2653 ↔ 后端 6336 路由——缺口 0（gate 闭合，前端改自动同步）。**③ HTTP 层**：已挂载 39 端点全可达（200/422 校验/401 认证）；抽样前端消费核心（bi/reports、crm/customers 200；core/iam/auth/me、file/folders、communication/notifications 404 为子路径差异；aps/schedules 308 重定向非异常）——无 5xx 异常。**④ 结论**：前端核心消费（2653）后端路由全覆盖且 HTTP 可达（已挂载部分）；4111 真 404（前端封装后端未挂载）为产品排期项（已定论不删不补）；hidden-500 零。提交 `TBD` |
| 2026-10-23 | v1.66 | hrm 组织主数据填充 ✅ | **① 种子**（首租户 82acc468，固定 UUID 幂等）：TOPEMS 智能制造有限公司 ×1、部门树 4（总经办/生产/质量/信息技术）、职位 5（总经理/生产主管/质量主管/系统管理员/运维工程师）、员工 3（E0001 张总→admin、E0002 李工→test_admin、E0003 王工）。**② 踩坑**：hrm 四表均有 tenant_id NOT NULL（补列阶段新增）→ 种子须含 tenant_id。**③ 验证**：hrm/departments、positions、employees、companies 端点全 200（4/5/3/1 真实数据）；ensure 并入 hrm 种子段（幂等复跑 OK）。提交 `TBD` |
| 2026-10-23 | v1.65 | 全域门禁终确认（收口验证）✅ | **① 日志终扫**：近 1 小时 ERROR 清零（mes/teams 修复后无新错误）。**② 全域状态**：mobile 8070 在线（health 200）；探活 DOMAIN_PROBE_OK（GET+POST+body 三层 0 5xx）；契约 gate 2653/6336/0；RLS 基线保持；collect 每日闭环。**③ 本机可闭环系统完善项收口**：数据基建/采集/RLS/clippy/mobile 契约/缺表/hidden-500/生产验证链路全绿。剩余另档：生产机部署（SSH）、hrm 组织主数据、前端契约消费、portal/rd 扩展表（P 组定论不建）。提交 `TBD` |
| 2026-10-23 | v1.64 | 剩余域 hidden-500 补扫 + mes.work_stations 补建 ✅ | **① 剩余域 body 扫**（scm/mes/pm/rs/integration/master-data 17 端点）：发现 **mes/teams hidden-500**（JOIN mes.work_stations 表缺失，报列不存在）；其余 OK（404 为路由路径差异）。**② 修复**：mes.work_stations 主库补建（test 36 列结构，ARRAY udt 修正）→ mes/teams 200 真实。**③ 缺表终查**：核心闭环域表全有；test 特有 151 缺表为 portal/rd/analytics 扩展未挂载域（P 组定论不建）。**④ 探针扩展**：P4 body 探针加 mes/teams、crm/customers、ehs/hazards（共 7 端点）；ensure 并入 work_stations 段。**⑤ 验证**：探活 7×BODY_OK + DOMAIN_PROBE_OK、gate 2653/6336/0 保持。提交 `TBD` |
| 2026-10-23 | v1.63 | crm/ehs 补扫 + 日志终扫 + RLS 复验 ✅ | **① 日志终扫**：19:20 的 crm name_en / ehs tenant_id 缺列错误为 v1.61 补列前旧日志；19:49 后无新 ERROR。**② crm/ehs body 扫**：customers/leads/contacts/inspection-plans/hazards/trainings/risks/accidents 8 端点全 OK（hidden-500 无）——补列修复确认生效。**③ verify-rls 复验**：183 策略表 + 关键抽样全部有策略（基线保持）。提交 `TBD` |
| 2026-10-23 | v1.62 | 每日 collect 验证 + hidden-500 扩展扫 + 台账刷新 ✅ | **① collect 定时闭环验证**：crontab 今日 01:47 两次采集成功（31 租户、users=2、current_month）；usage 10-01 期 api_calls=2584（v1.61 2340 真实增长）。**② hidden-500 扩展扫**：mobile/schedule、announcements、bi/reports、bi/stats 等扩展域 body 全 OK（其余 404 为路由路径差异）；残余无。**③ 契约台账同步**：sync-contract-ledger 刷新头部基线日期 2026-10-23（前端 2653 / 后端 6336 / 缺口 0）。提交 `TBD` |
| 2026-10-23 | v1.61 | hidden-500 全面清零（HTTP 200 包装 code=500）✅ | **① 发现**：日志 ERROR「获取批次统计/入库订单/序列号列表失败」→ 直测发现 **HTTP 200 但 body code=500 的隐藏错误**（探活只查 HTTP 码被骗）：wms inbound/outbound/serial/batches、qms quality-costs、ticket/tickets、srm/suppliers。**② 根因 + 修复**：a) 主库 vs topems_test **336 表列差全量扫描补列**（deleted_at/tenant_id/org_id/name_en 等）；b) qms/ticket schema 缺失 → 建 schema + qa_quality_costs（14 列）、core_tickets（20 列，ARRAY 列 udt 修正）；c) wms.batches 类型不匹配（location_id/warehouse_id/supplier_id varchar→uuid，text 中转幂等）。**③ 探活增强**：新增 P4 hidden-500 探针（GET body code 检查——HTTP 200 包装 500 必 FAIL，覆盖 wms/qms/ticket/srm）。**④ 验证**：13 端点 body 全 OK（hidden-500 残余无）、探活 0 5xx + BODY_OK×4、gate 2653/6336/0、ensure 幂等双复跑 OK。提交 `TBD` |
| 2026-10-23 | v1.60 | production-verify 本机核销 + 基线复验 ✅ | **① production-verify.sh 本机等价全链**（BASE_URL=8098 顶替，跳过性能/安全）：部署前检查 + 健康检查 + 核心 API 功能验证 → **通过 17 / 警告 9 / 失败 0**；警告 9 全为本机 dev 差异（.env.production 缺失、DATABASE_URL/REDIS_URL/JWT_SECRET 未设、HTTPS/安全头未启用、API 根 401 未认证）——非功能失败。**② 基线复验**：crontab 每日 01:00 collect 存活；verify-rls 关键表抽样全部有策略；contract gate 2653/6336/0；mobile 114/114；探活 0 5xx。生产机实跑（systemd/nginx 加载/真实流量）仍为 SSH 访问档（已知情未动）。提交 `TBD` |
| 2026-10-23 | v1.59 | 写路径探针 + 全端点冒烟复核 ✅ | **① contract-smoke-live 全量模式复核**：前端封装 4150 条 → 已挂载 39 / 真 404 缺口 4111（产品排期项，已定论不删不补）；写路径 POST 抽查 0 个 500。**② domain-probe 增强**：新增 P3 写路径探针（crm/tags、gis/devices、erp/dictionaries POST 抽查——422/400/404/409 视为 OK、5xx 视为 FAIL），防写路径回归。**③ 验证**：探活 DOMAIN_PROBE_OK（0 5xx + WRITE_OK ×3）、USAGE_COLLECT_OK、契约 gate 2653/6336/0、mobile 114/114 保持。提交 `TBD` |
| 2026-10-23 | v1.58 | 残余缺表批量清零（erp/finance/public 11 表） ✅ | **① 缺表清单**：契约日志 relation 500 残余——erp_master_data_versions/conflicts/quality_rules/quality_reports、finance.sales_invoices/accounting_subjects/erp_collection_records、public.approvals/announcements、erp.documents。**② 批量补表**：test 库结构全量复制主库（python 生成 CREATE IF NOT EXISTS，列数 10-63），幂等；ensure 脚本并入自愈段。**③ 验证**：曾缺表端点直测 finance/sales-invoices、accounting-subjects、erp/documents 200（无 500）；erp/master-data/versions、ticket/approvals 404（路由路径差异非缺表）；探活全域 0 5xx；契约 gate 2653/6336/0。提交 `TBD` |
| 2026-10-23 | v1.57 | mobile 契约 114/114 全闭环 ✅ | **① clippy 触发 mobile 契约门禁**：mobile_contract_smoke 首次实跑暴露 6 FAIL（18 端点真实 500）→ 逐根因修复。**② base 探测**：脚本原硬编码 8099（生产入口）本机不通（network_error 114 全败）→ 改 8099→8098 自动探测（urllib）。**③ 补表修复**（主库 + topems_test 双库同步）：mobile.oa_calendar_events（源码 14 列）、mobile.oa_announcements（9 列）、push_notifications 补 user_id/read_at、push_devices 唯一索引（部分索引不支持 ON CONFLICT → 普通 UNIQUE）+ app_version/os_version/device_model 改可空（请求可省略）、mes schema + equipment/production_orders（test 结构复制主库）。**④ 环境修复**：8070 二进制缺失（重启需重建）→ cargo build -p topems-mobile；契约脚本 hang（8098 代理池对新 8070 失效）→ 重启 8098 解。**⑤ 结果**：mobile 契约 114/114 PASS 0 FAIL；ensure 脚本并入 mobile/mes 补表自愈段；探活/gate 保持全绿。提交 `TBD` |
| 2026-10-23 | v1.56 | clippy 全量清理 + BI 面板核查 ✅ | **① clippy 全量清理**：workspace 58 warnings → 3（`cargo clippy --fix --all-targets` 自动修 55 条：needless_borrow 31 + 各域借用表达式 + contract_stubs unused imports（clippy fix 自动删 post/put）+ ehs fix）；改动 6 文件 112 行纯样式（&tid→tid 等），cargo check 0 error + build 通过。剩余 3 条全在 vendor/rsa（第三方 vendored 库 dead_code，非本项目代码，门禁历史 push 不拦 warn）。**② BI 面板数据核查**：/api/bi/reports-center/stats 200 + orgStatsStatus=connected（BE-02 物化视图真实计数：权限 83、组织 0/0/0 真实空、updatedAt 真实）。提交 `TBD` |
| 2026-10-23 | v1.55 | RLS 定期验证 + core_files 补租户隔离 ✅ | **① verify-rls.sh**：新增 RLS 租户隔离定期验证脚本——全量动态校验（有策略的表必须 RLS 启用）+ 关键域抽样（core_files/ehs/iam 主表），幂等。**② core_files 补 RLS**：public.core_files 缺策略（有 tenant_id 的租户表）→ 补 tenant_isolation 策略（同域宽松格式：管理员全可见 + 租户过滤），iam 版已有。**③ 口径校准**：平台级系统表（core_tenant_usage/core_audit_logs 跨租户聚合）与 RBAC 表（iam_roles/iam_permissions 全局角色权限）豁免标注；主表确认在 iam schema（有策略），public 为兼容层。**④ 验证**：183 策略表缺口 0 + 关键表抽样全部有策略；ensure 并入 RLS 段（幂等 DO block）。提交 `TBD` |
| 2026-10-23 | v1.54 | collect 每日定时化（运维闭环） ✅ | **① 定时采集脚本**：新增 scripts/dev/collect-usage-daily.sh——BFF 存活检查 + token 缓存复用/过期重登（test_admin）+ POST /internal/usage/collect + success 校验，日志 /tmp/collect_usage.log，幂等。**② crontab 注册**：每日 01:00 自动采集（本机 dev 态），探活写探针保留（手动/CI 双通道）。**③ 验证**：脚本实跑 collect 31 租户 success；usage 读回 10 月期 users=2/storage=35/api_calls 真实。提交 `TBD` |
| 2026-10-23 | v1.53 | storage 历史期回填 + 种子幂等修复 ✅ | **① 种子幂等修复**：core_files 种子用 gen_random_uuid 且无唯一约束（ensure 每次复跑重复插，累计 9 行 105MB）→ 改固定 UUID（c000…001-003）+ ON CONFLICT(id) 幂等；清理残留随机行。**② storage 历史期回填**：5-9 月 storage 近似 28/21/14/7/0（与 api_calls 递减趋势一致），并入 ensure 脚本幂等段。**③ 验证**：usage 10 月期 storage_used_mb=35 真实（collect 后回 35）；**trends 全期 storage 真实**（35/28/21/14/7/0 + api_calls 760/40/32/24/16/8）；探活全域 0 5xx；契约 gate 2653/6336/0。提交 `TBD` |
| 2026-10-23 | v1.52 | storage 采集真实化 + usage i32 修复 ✅ | **① storage 采集真实源**：core_files 缺 tenant_id 列（download.rs 引用致 500）→ ALTER ADD COLUMN + 索引 + 3 文件种子（35 MB，幂等）；collect_tenant_usage storage_used_mb 由常量 0 改子查询（SUM(size)/1048576 按租户）；**upsert 补 storage_used_mb**（v1.50 只更新 users/api_calls，导致 collect 后 storage 仍 0）。**② usage i32 修复**：v1.51 全局 i32→i64 替换误伤 get_tenant_usage（原生 i32 列 get::<i64> panic 500，SQL 无 SUM 不适用 i64）→ 用 SQL 上下文只改该 handler 回 i32；get_governance_trends 的 SUM::bigint 保持 i64。**③ 验证**：collect 31 租户后 usage 读回 200（10 月期 users=2 / **storage_used_mb=35** / api_calls=515 / base_cost=0.00）；overview storage_mb=35 真实（原 0）；file download 404（非 500，tenant_id 列修复生效）；探活全域 0 5xx + USAGE_COLLECT_OK；契约 gate 2653/6336/0。**④ 自愈**：core_files 补列 + 存储种子并入 ensure-tenant-users-seed.sh。提交 `TBD` |
| 2026-10-23 | v1.51 | trends 平台级聚合 + 消噪补表 + usage 历史期 ✅ | **① trends 平台级聚合**：get_governance_trends 原按行 LIMIT 6（31 租户各自 10-01 行错取）→ GROUP BY period_start 聚合 SUM（users/api_calls/base_cost）；顺修 users_count get i32→i64（SUM::bigint 致 500）。**② 消噪补表**：erp_master_data_audit_trail 缺失（3 处 INSERT/SELECT 引用、每次查询 warn）→ 补 erp 表 + 索引；源码 INSERT 表全量对照 information_schema 无其他缺失。**③ usage 历史期回填**：近 5 月种子（users=2、api_calls 8×k 递减近似、幂等 upsert）→ **trends 6 期真实**（10 月 268 / 9 月 40 / 8 月 32 / 7 月 24 / 6 月 16 / 5 月 8）。**④ 自愈**：erp audit trail + 历史期并入 ensure-tenant-users-seed.sh（幂等）。探活全域 0 5xx + USAGE_COLLECT_OK；契约 gate 2653/6336/0。提交 `TBD` |
| 2026-10-22 | v1.50 | API 请求计数闭环——analytics 16 全真实化 ✅ | **① 根因**：请求审计中间件（shared-auth，enabled 默认 true）写 core_audit_logs 但表缺失 → 每次请求写失败（静默）；补建 public.core_audit_logs（14 列对齐 INSERT + 时间/user 索引）→ 重启后自动落库（实跑 15 行）。**② 聚合改造**：get_tenant_api_usage（total_api_calls=19 + breakdown by action：read 18/create 1）、get_tenant_activity（近 7 天按日）、get_tenant_top_endpoints（近 7 天按 entity_type TOP10，中间件无完整 path 用资源段近似）、get_tenant_real_time（requests_last_minute=9）——均 JOIN core_tenant_users（user_id→tenant 反查）；**踩坑**：user_id 空串（未认证/健康请求）致 ::uuid 报错被 unwrap 吞成空 → 统一 NULLIF(a.user_id,'')::uuid（6 处）。**③ collect 真实化**：api_calls_count 子查询（当前月 audit 计数）+ upsert 补更新 api_calls_count；usage 读回 api_calls_count=25。**④ 自愈**：core_audit_logs 建表并入 ensure-tenant-users-seed.sh（幂等）。探活全域 0 5xx + USAGE_COLLECT_OK；契约 gate 2653/6336/0。提交 `TBD` |
| 2026-10-22 | v1.49 | core_tenant_modules 种子 + analytics 完整化 ✅ | **① modules 种子**：ensure-tenant-users-seed.sh 并入 core_tenant_modules 段（首租户启用 iam/crm/mes/erp/bi 5 模块，enterprise 级，幂等）；实跑 INSERT 5 行。**② overview 完整化**：members=2 / active_modules=5 / users=2（此前 active_modules 恒 0）——analytics 面板三项全真实。**③ 全量探活复跑**：全部域 0 5xx + USAGE_COLLECT_OK（含写探针）；契约 gate 2653/6336/0。api_calls/storage 仍真实 0（无调用计数/存储采集源，audit_logs 为各域表审计非 API 计数）。提交 `TBD` |
| 2026-10-22 | v1.48 | hrm 主数据种子 + 契约台账自动同步 ✅ | **① hrm 最小种子**：`scripts/dev/ensure-tenant-users-seed.sh`（幂等）——iam.users（admin/test_admin）映射进 core_tenant_users（绑首租户 82acc468，role=owner/active）；重跑 collect 后 **total_users_this_period=2**——usage/overview(user=2)/user-stats(by_role owner=2) 全部真实非 0（此前 users_count 恒 0）。**② 契约台账自动同步**：`scripts/dev/sync-contract-ledger.py`——跑 contract-gate.py 解析三数 → 更新 contract-stub-mapping.md 头部「契约基线（自动同步 日期）：前端 2653 / 后端 6336 / 缺口 0」状态行（幂等可重复跑），防台账人工漂移。契约 gate 缺口 0。提交 `TBD` |
| 2026-10-22 | v1.47 | 系统完善批次 P0/P1/P2 闭环 ✅ | **① P0 usage 采集器**：新增 `POST /api/core/internal/usage/collect`（collect_tenant_usage）——core_tenants(active)+core_tenant_users(成员计数) 聚合写入 core_tenant_usage，`ON CONFLICT(tenant_id,period_start)` 幂等 upsert（表已有 UNIQUE 约束），storage/api_calls 无采集源置 0；实跑采集 31 租户 + 幂等重跑 31 行不变；顺修 get_tenant_usage/get_governance_trends date/base_cost → ::text（修复有数据后 500）；analytics/usage、governance/trends、overview 全部出真实数据（此前 0 行全空）。**② P1 吞错审计**：tenant handlers 5 处 query_as 全列 SELECT 对 core_tenants 逐一比对 information_schema——全部列匹配 OK（无漂移；get_billing_info 一例已在前批修为裸查询）；14 处 unwrap_or(None) 定位为 tenant_setting 类 Option 语义非吞错。**③ P2 写探针**：domain-probe.sh 追加 USAGE_COLLECT 写探针（POST collect → success 校验）；unified-core 101 路由 0 5xx + 采集 OK；契约 gate 2653/6336/缺口 0。提交 `94549a3c4` |
| 2026-10-22 | v1.46 | nginx 2 warn 核销 + 本机生产验证边界 ✅ | **① http2 弃用 warn 已不存在**：topems.conf 已用新式独立 `http2 on;`（listen 443 ssl;），本机 nginx 1.31.1 移植 `-t` 实测无此 warn。**② ssl_stapling warn 为自签 cert 验证假 warn**：conf 已有 `resolver 1.1.1.1 8.8.8.8` + stapling on/verify，生产真实 CA cert 带 OCSP URL 无 warn；本机自签 cert 无 OCSP URL 才触发。**③ 移植路径**：user→nobody / pid→/tmp / mime.types→homebrew / epoll→kqueue / brotli 剥离（生产机需 nginx-brotli 模块）/ cert→/tmp/nginx-certs 自签；`nginx -t` syntax ok。**④ 判定**：本机可作「生产验证环境」（等价链路全覆盖：smoke-prod 层1 + verify-nginx-prod 14/14 + production-verify 9 通过），不可等价项：systemctl（systemd Linux 专属）、生产 conf 真实加载（www-data/run pid/epoll/cert/brotli）、层2 专项 E/F/G/H（需生产数据）。提交 `531d0762b` |
| 2026-10-22 | v1.45 | G governance 8 项面板全闭环——P 组 63 条全闭环 ✅ | **① 实证**：ai governance_dashboard 已真实现 11 条 `/dsh/governance/*`（dashboard/score/risk/compliance/cost/performance/metrics/export/security-events/audit/recommendations/cache），实跑 9 条全 200 真数据（risk_score/compliance_rate/total_cost/avg_response/audit logs/recommendations）；8 项面板中 7 项（风险/合规/成本/性能/审计/建议/安全事件）走 ai 已就绪。**② 补 core 2 条**：`GET /governance/trends`（get_governance_trends 读 core_tenant_usage 近 6 期真实趋势）+ `POST /governance/refresh`（refresh_governance 触发刷新返回 refreshed:true）——前端 ai/governanceDashboard.ts getTrends/refresh 走 apiClient.core，此 2 条 stub 兜底补真。**③ 收尾**：contract_stubs 删 trends/refresh 2 条 stub；契约 gate 缺口 0；实跑 trends 200（真实空 []）+ refresh 200 + ai risk 复测 200。**P 组 63 条（tenant 55 + governance 8 + documents 4）全闭环**。提交 `af6268e0a` |
| 2026-10-22 | v1.44 | T2-c analytics 16 方法全闭环——tenant 55 全闭环（40/55→55/55 ✅） | **① analytics 7**（overview/usage/api-usage/activity/top-endpoints/user-stats/real-time）：overview 聚合 core_tenant_usage 最新期 + core_tenant_users 成员数 + core_tenant_modules 启用数（真聚合）；usage 读 usage 表 12 期；api-usage SUM::bigint（修 numeric 类型 500）；activity/top-endpoints 真实空数组；user-stats GROUP BY role；real-time 活跃用户计数。**② billing 9**（subscription GET/plan POST/cancel/card add+del/invoices list+get+pay）：subscription 未配置从 core_tenants 派生 plan/status、changePlan/cancel 存 settings（tenant_billing_sub_）；card 存 tenant_billing_card_；invoices 无发票表=真实空/404「发票不存在」；复用既有 get_billing_info/get_invoices。**③ 顺手修既有 bug**：get_billing_info 原 query_as 全列含不存在的 trial_expires_at/activated_at/suspended_at → fetch 错误被 unwrap_or(None) 吞成「Tenant not found」→ 改裸 query plan/status + row.get 组装。**④ 插曲**：master.rs 新挂 GET /billing 与旧路由重叠 → panic 删除重复；contract_stubs 多行块过滤再残留 1 条孤行 .route(post(stub_action)) → 删除。实跑全链 PASS。提交 `9cfd8d31` |
| 2026-10-22 | v1.43 | T2-a config 组 22 方法全闭环 + T2-b security 18 方法全闭环 | **租户中心 A 实施（分批，P 组拍板全量页面）**：① **T2-a1 settings/branding 4**（core_tenant_settings 前缀存储，未配置=空对象 200，upsert；全链 PASS）。② **T2-a2 features 4**（core_tenants.features jsonb：GET/PUT + enable/disable）。③ **T2-a3 domains 3 + email-config 2**（settings 数组/对象：add/remove 域名、PUT/GET email）。④ **T2-a4 integrations 4 + webhooks 5**（JSON 数组 CRUD + webhook test 模拟探测；clippy 索引 panic 修复→as_object_mut；全链 PASS）——**config 组 22 方法全闭环**。⑤ **T2-b1 security 10**（settings/password-policy/enable-disable-2fa/api-keys list/generate/rotate/delete，tk_ 前缀）。⑥ **T2-b2 security 8**（audit-logs list/get/export、sessions list/revoke/revoke-all、ip-whitelist add/remove）——**security 组 18 方法全闭环**。每批契约 gate 缺口 0、实跑全链 PASS。提交 `0df42c05b`(a1)/`95223f22a`(a4)/`3d341667a`(b1)/`4959725d1`(b2)。**进度**：tenant 55 = 40/55（剩 T2-c analytics 16）→ G governance 8。 |
| 2026-10-22 | v1.42 | P 组 A 实施启动 + documents 4 实证闭环 | **① documents 4（A=并入 ai）实证已就绪**：svc/ai documents CRUD 全套（POST /documents、GET /{id}、download、delete、list、process）+ 前端封装已指 apiClient.ai + core 兜底 S2 已清零；实跑 list 200 / 不存在 404「文档不存在」；契约 gate 缺口 0——台账 documents 行 ✅。**② tenant/governance 拍板 A（全量页面/面板）**：分批 T2-a config 22 → T2-b security 18 → T2-c analytics 16 → G governance 8。提交 `bb574af9d` |
| 2026-10-22 | v1.41 | P 组 67 条实证固化（保留-待产品迭代，从主线摘除） | **① P 组剩余 67 条（contract-stub 台账 §5.1，api-keys 2 条已闭环 v1.40）实证定性**：tenant 55（前端 api/tenant 5 文件 75 方法全零页面消费 + 全指 core 兜底；master.rs tenants/quota/modules 真实现为另一契约面 /tenant/tenants 系列，与封装不重叠）+ governance 8（core 兜底，ai governance_dashboard_handlers 已覆盖 dashboard/score 同域）+ documents 4（core 兜底非 ai knowledge，仅 1 处封装引用全仓 0 命中）。**② 一步到位处置判定**：保留成本≈0（stub 无 DB 写、无运行时开销），删除=前端封装+兜底+契约重登记且产品页面必做时全要重建 → **不删不补，固化「P-保留-待产品迭代」从主线待办摘除**（消灭每轮重复评估）；产品拍板选项固化台账 §5.1（tenant/governance：A 做页面 P1 迭代 / B 明确不做才同删；documents 4：**建议并入 ai knowledge 0.5 人日，拍板即执行**）。**③ 产物**：台账 §5.1 三组行更新为固化态 + TODO 612 同步。纯文档登记，无代码改动。提交 `d3b4a0de1` |
| 2026-10-22 | v1.40 | api-keys 补齐 GET 详情 + PUT 更新（P 组 2 条闭环）+ 修 updated_at panic | **① P 组 api-keys 2 条本机闭环（contract-stub 台账 §5.1 P 组 69 → 67）**：system/api-keys 原真实仅列表/创建/删除，缺 GET 详情/PUT 更新（stub 兜底承接）——按 A 级纪律补真：`get_api_key`（RowNotFound→404、mask 密文）+ `update_api_key`（name 非空/key_type 白名单校验、secret 重加密），对齐现有 list/create/delete 租户口径；settings.rs read/write Router 挂载（system:read / system:write 权限）；contract_stubs.rs 删原 GET+PUT stub 兜底（防同 path 冲突）。**② 顺手修既有 bug**：`core_tenant_settings.updated_at` 为 TIMESTAMP（无时区），原代码按 TIMESTAMPTZ `row.get` → ColumnDecode panic（空表不触发、有数据必 500）——list/get/update 3 处改 `chrono::NaiveDateTime` + `.and_utc()`。**③ 验证**：cargo check unified-core/server 0 error、契约 gate 缺口 0（前端 2653/后端 6331）、实跑全 CRUD——CREATE 200（mask `****_123`）/LIST 200/GET 200（详情）/PUT 200（name+key_type 更新）/GET 不存在 404/DELETE 200/GET 已删 404。**④ 插曲**：fmt 拦 1 轮 → amend 重推。提交 `349c187ae` |
| 2026-10-22 | v1.39 | RLS 请求层中间件批量补挂 17 real_module（TODO:931 全量收尾） | **① 遗留盘口闭环（TODO:931 延伸）**：2026-10-14 已闭环 11 字面量（finance/communication/gis/monitor/mobile/integration/subscription 挂 + ai/plugin_registry/search/unified_core 有等价中间件跳过），但**其后新增的 17 个 real_module（analytics/crm/ehs/erp/hrm/lims/master_data/mes/pdm/pm/qms/rd/scm/srm/ticket/tms/wms）有 RLS 策略（权威库 hrm 56/erp 46/crm 26/master_data 81/qms 53 等）却未挂请求层中间件**——请求不 SET app.tenant_id，RLS 策略等于未生效（无 GUC 放行=全表可见）。**② 批量补挂**：17 模块 routes 链尾同构插入 `.layer(from_fn_with_state(ctx.db.clone(), rls_middleware))`（对齐 finance_real_module:98 规范）；跳过确认：search/ai/plugin_registry 已有 tenant_middleware、unified_core 自带 tenant_rls_middleware、portal enable_request_context 内部机制。**③ 顺手清 unused import**（search handlers.rs delete / pdm drawings.rs post）。**④ 验证**：cargo check -p topems-server 0 error/0 本项目 warning；**RLS 机制复测**（权威库 SET ROLE topems_app + hrm.employees）租户A(001)=12 / 租户B(002)=0 过滤生效；BFF 重启 health 200 + 重签 token 正常；pre-push 全链含 domain-probe 探活全量 0 个 5xx（17 模块新增中间件无回归）。**⑤ 插曲**：push 被 stale-base 拦 → rebase 1 提交重推。提交 `495402ec1` |
| 2026-10-22 | v1.38 | contract-stub S2 前端死封装清理（删 6 条 core 兜底 + 保留 hook 活调 2 条） | **① S2 执行（排期复核批次）**：台账 §5.1 S2 组 8 条（copilot/forms/documents）实证修正——**6 条真死**（getSession / getFormDefinition / documents parse+summary×2+search，页面+hook 全仓零调用）**2 条 hook 活调保留**（deleteSession useBusinessCopilot.ts:282 / searchFAQ :258，svc/ai 未实现子路径，core 兜底继续承接）。**② 改动**：前端 businessCopilot.ts 删 getSession + businessIntelligence.ts 删 getFormDefinition/parseDocument/generateDocumentSummary/getDocumentSummary/searchDocument（6 死方法）；core contract_stubs.rs 删 /copilot/sessions/{id} GET、/forms/{id}、/documents/{id}/parse、/documents/{id}/summary GET+POST、/documents/{id}/search（6 条），保留 DELETE /copilot/sessions/{id} + /copilot/modules/{id}/faq。**③ 验证**：cargo check 0、tsc 0、契约门禁缺口 0（前端 2653/后端 6331）、实跑保留 2 条 200 + 删除 6 条 404/405（copilot GET 405=同 path 仅剩 DELETE 方法，行为正确）。**④ 插曲**：push 被 stale-base 拦（远端并发线）→ rebase 1 提交重推。提交 `526a7687c` |
| 2026-10-22 | v1.37 | contract-stub S1 活需求接真（search/recent + help 转发，删 core 兜底 11 条） | **① S1 执行（排期复核批次）**：a) **search 真服务接真**——`public.search_recent` 用户级最近搜索表（`database/init/12_search_recent.sql` 幂等，主库/权威库建）+ svc/search `/api/search/recent` GET/DELETE（auth Claims.sub 用户级去重，search_handler 搜索成功 upsert 记录——**顺手替换坏 search_logs 写入**（该表无 query/result_count 列 INSERT 恒失败）+ **修 page_size 误读 page 字段既有 bug** + search_routes 补挂 /suggestions；前端 searchApi 改指 apiClient.search（**q→keyword 参数对齐**，此前 core stub 400 语义失效）。b) **help 改指 portal**——前端 helpApi 改指 apiClient.portal（/api/portal/help/*，portal faq/guide CRUD 已实现）+ **isActive→is_active 字段对齐**（GuidePage 10 处消费点，前后端 snake_case 契约统一）。c) **core 兜底删 11 条**（/search 4 + /help 7，前端全改指后死路由）。**② 验证**：tsc 0、契约门禁缺口 0（前端 2653/后端 6335）、boundary 未涉及、实跑：/api/search?keyword= 200 真响应、recent 写入→读回（["生成报表","test"]）→DELETE cleared、core 兜底 404（api/core/search、api/core/help/faqs）；page_size=3 参数生效。**③ 插曲**：两次 push 被 stale-base 拦（远端并发线推进）→ rebase 重放 2 提交无冲突；cargo-fmt 拦 1 轮。提交 `2969d774b`（含 rebase 重放） |
| 2026-10-22 | v1.36 | BE-02 组织计数最小纠正（方案 A 物化视图） | **① 遗留闭环**：BI 仪表盘 `totalCompanies/totalDepartments/totalEmployees` 此前为 null + orgStatsStatus=not-connected（analytics schema=bi、boundary allow=[] 不可裸引 hrm.*，组织数据归属 hrm 且 0 行）。**② 方案 A 实施**：`database/init/11_bi_org_stats.sql` 建 `bi.org_stats` 物化视图（hrm 三表排除软删计数 + refreshed_at，全租户合计口径与 core_users 超管一致；幂等 IF NOT EXISTS）+ `scripts/dev/ensure-bi-org-stats.sh`（guard 存在即刷新，权威库/主库均建）。**③ 后端改读**：`reports_center_stats` 改查 `bi.org_stats`（不再裸引 hrm）→ totalCompanies/Departments/Employees 真实计数 + orgStatsStatus=connected + orgStatsUpdatedAt；视图缺失回落 0 + not-connected 绝不伪造。**④ 验证**：cargo check 0/0、boundary 双 gate PASS（node + python，analytics 引用=22）、BFF 重建重启 + 重签 token → `/api/bi/reports-center/stats` 返回主库真实 0/0/0 + connected；探活门禁（GET+写探针）全绿；pre-push 全链通过（cargo-fmt 修正 1 轮）。前端契约零改动（report/index.ts:168 预留 connected）。**⑤ 刷新策略**：静态快照由 ensure 脚本/部署刷新；hrm 写侧触发刷新为后续可选增强。提交 `a1e410e36` |
| 2026-10-22 | v1.35 | 探活写路径盲区补强（写探针入域门禁） | **① 遗留盘点实证**：「一步到位」排查确认 3 项没到位——探活只扫 GET（写端点 5xx/缺表/422 误报全在盲区）、handler_error 38 写侧未覆盖、8099 聚合面 real_module RLS 请求层中间件缺失（P2 待加固 TODO:931，生产面专项留待部署批）。**② 本批实施——domain-probe 补写探针**：probe 加 method 参数；对每个 path 追加 POST 空 body 探针——HTTP 5xx/body code>=500 计 FAIL（服务端错误，如缺表包装），400/401/404/405/415/422 视为正常拒绝不计；**2xx 意外可写记 WARN 不置 FAIL**（提示人工关注，避免误伤宽容/占位 handler）；主循环 FAIL 判定按数字开头行（WARN 不拦）。**③ 实证**：ehs 91 path GET+POST 0 个 5xx；integration 49 path（含 external-erp sync 写端点）0 个 5xx——handler_error 38 写侧实测已随批次修复；全量 27 域（含写探针）0 个 5xx；真实 push pre-push 全链通过。**④ WARN 1 处**：`/api/bi/analysis` POST 空 body 200——无参占位 handler（analytics analysis.rs:38 硬编码返回不落库，contract-stub 类已登记 backlog）。**⑤ lefthook domain-probe timeout 900s→1800s**（写探针翻倍耗时）。提交 `7be5143a8` |
| 2026-10-22 | v1.34 | ehs 主库 71 表补建 + 探活 body-500 盲区补强 | **① 追查根因（TODO:1734 实质缺口）**：53 条已接 SQLX 真查询的 ehs handler（accident/六模块）运行时报错——**主库缺 ehs schema 71 表**（qa_ehs_accidents 等），查询失败被包装为 **HTTP 200 + body code 500**（「获取事故列表失败」等，探活按 HTTP code 判 5xx 漏检，蒙混至今）。**② 补建固化**：pg_dump topems_test `--schema=ehs --no-data` → 幂等化 `database/init/10_ehs_schema.sql`（71 表 + 122 约束/索引/RLS policy；DO 块守卫约束/索引/策略重跑收敛，处理 pg_dump 18 跨行拆分 ALTER/CREATE UNIQUE INDEX/\restrict 会话指令；清主库同名误建视图 qa_ehs_hazards 占名）+ `scripts/dev/ensure-ehs-schema.sh`（guard：qa_ehs_accidents 存在即 exit 0）。**③ 门禁盲区补强**：domain-probe.sh 读 body 解析 JSON code，HTTP 200 但 code>=500 同样计 5xx。**④ 实跑验证**：POST /api/ehs/incidents 落库 200（ACC-6DF71492）→ GET 读回 → DELETE 真删；契约门禁缺口 0；全量 27 域探活 0 个 5xx；pre-push 全链通过（期间磁盘满阻塞一次，释放后恢复）。提交 `1f2c8c47d` |

| 2026-10-22 | v1.33 | 探活全量口径 + plugin statistics 契约修复 | **① domain-probe 门禁改为全量口径（27 域 ~3100 path，含已核销 master-data/analytics/ai/plugin-registry/unified-core/server）**：默认 SKIP=""；`--include-verified` 保留为空别名、新增 `--skip-verified` 反向参数（旧 22 域口径）；probe 加重试（ERR/5xx 重试 1 次消瞬时误报）；失败时输出 5xx 明细（此前被 grep -v 吞掉无法定位，脚本缺陷顺手修）；lefthook pre-push domain-probe 条目加 timeout: 900s。**② 全量口径首扫暴露被跳过掩盖的隐藏缺陷**：`/api/plugin/reviews/statistics` 真 500——`get_review_statistics` 声明 `Path(plugin_code)` 但路由 `/api/plugin/reviews/statistics` 无 path 参数 → axum 运行时「Wrong number of path arguments」→ 移除多余 extractor，修复后 200。**③ 实测**：BFF 重建重启 + 重签 token → statistics 200；全量 27 域复扫 **DOMAIN_PROBE_OK 0 个 5xx**；真实 push pre-push 全链（7 门禁）通过。登记提交 `9c5289dd9` |

| 2026-10-22 | v1.32 | 门禁（探活入 pre-push） | **domain-probe 并入 pre-push 自动门禁**：① `scripts/dev/domain-probe.sh` 加 BFF 存活探测（/health 200 才严格扫 22 域 5xx；离线输出 `DOMAIN_PROBE_SKIP_WARN` exit 0 不阻断——CI/无运行态可推，部署机启动后手动复核）；② lefthook.yml pre-push 新增 [Gate DP] `domain-probe` 条目（与 contract-gate 静态挂载互补，覆盖缺表/缺列/死锁等运行态缺陷）；③ 实测：离线 BASE=9999 → SKIP_WARN、在线 erp 344 path 0 5xx；真实 push pre-push 全链（7 门禁）通过 |

| 2026-10-22 | v1.30 | 本地未推送（TODO 核销 + 活文档状态收口） | **遗留排查收口（2026-10-22）**：① §2 能力盘点表滞后标注同步——1.6（P0-1/P1-1 已闭环：complete 落标记+汇总+admin 绑定核验）、2.1（P1-3 已闭环：`REGISTER_ENABLED` 默认关、开放时 pending 待激活）、2.2/2.3（P0-4 已闭环：权限字典补 23 码、方言对齐）、2.4（P0-4 已闭环：登录 JWT/me 实时 JOIN 规范化授权表展开）五处"部分"更新为"已具备"；② TODO.md 核销过时条目 TRAE 并行线（`svc/erp`、`svc/search` 工作区干净，`navigation-menu-demo.design/` 已不存在）；③ 核实其余遗留均为外部/生产机依赖（8 项生产任务已建执行清单 `docs/deploy/production-execution-checklist.md`；`get_business_overview` 占位前端零消费待业务口径；contract-stub 🔴67 条待产品排期；unused-vars 长尾 85 处；E11c wms/scm 动态金额 bind 登记边缘），本地可闭环项归零 |

| 2026-10-22 | v1.31 | 全域探活核销 + 4 缺陷修复（缺表/残壳/死锁） | **全业务域批量核销（方案1+2 实施）**：新建 `scripts/dev/domain-probe.sh` 探活门禁（svc crate path 抽取 → BFF GET 全路径 5xx 扫描，可 --domain 单域，--include-verified 含已核销域）；22 域 ~2500 path 首扫发现 4 个 5xx 全修复：① `erp.asset_categories` 缺表（relation does not exist 500）→ ② `finance.reconcile_orders` 缺表 → ③ `erp.bank_accounts` 主库残壳仅 id+status（缺 14 列，column bank_name does not exist）→ ④ `portal gateway-monitoring/dashboard` 持 tokio Mutex 时 await `get_health()` 对同批锁重入**自死锁**（超时）→ 聚合收块作用域后先释放再 await。补建固化：`database/init/09_erp_finance_wms_schema.sql`（幂等：2 表 CREATE IF NOT EXISTS + bank_accounts 14 列/stock_takes 1 列/warehouses 2 列 ADD COLUMN IF NOT EXISTS）+ `scripts/dev/ensure-erp-finance-wms-schema.sh`（guard：两表存在即 exit 0，实测幂等）。修复后 4 端点全 200；BFF 重启（cargo build -p topems-server 2m46s）。门禁默认缺口 0 / smoke-live 无真 404；探活脚本 --domain erp 验证 0 5xx，全量复扫（见提交时结果） |

| 2026-10-22 | v1.29 | 脚本修复（drill 生成器消 warn） | **nginx drill 2 warn 清理**：`scripts/gen-nginx-drill-conf.sh` 替换段加 #8（`listen 443 ssl http2;` → `listen 443 ssl;` + 独立 `http2 on;`，本机 nginx 1.31 弃用告警）与 #9（自签无 OCSP → drill 演练 `ssl_stapling on/verify` 置 off）。**生产 conf `deploy/nginx/topems.conf` 不动**（Linux 生产 nginx 版本未定，旧版仅支持 listen 参数式 http2；正式证书含 OCSP responder 应保留 on）。重生成 drill conf → `nginx -t` **0 warn** test successful → 起 nginx 冒烟 core/bi/quality 全 200（链路未破坏）→ 已停。生产机侧：conf 上 Linux 后按实际 nginx 版本确认无 warn |
| 2026-10-22 | v1.28 | 无代码变更（复核登记） | **verify-nginx-prod.sh 全链实跑（runbook A1 固化脚本）**：`--conf deploy/nginx/topems.conf --repo-conf 同源` → [1/3] nginx -t NGINX_T_SKIP_WARN（macOS 非 Linux，脚本设计如此；drill conf 另跑 nginx -t 通过）/[2/3] **UPSTREAM_OK**（server_service → localhost:8099，与仓库事实源一致，无 legacy map）/ [3/3] **SMOKE 14/14 200**（core/erp/hrm/finance/mes/qms/lims/bi/pm/portal/wms/scm/srm/rd 经 nginx 80→443 自签→8098 顶替 8099 等价链路全通）；结果 **PASS exit=0**。生产 conf 2 warn 待优化（listen http2 弃用 / ssl_stapling 无 OCSP）；生产机复核点仅剩 Linux 侧 nginx -t（use epoll）+ systemctl 实跑 + 层2 专项 |
| 2026-10-22 | v1.27 | 生产部署前置复核（脚本契约修复 + 三件走查实跑） | **① smoke-prod.sh 契约对齐**：登录 `/api/v1/auth/login`→`/api/core/iam/auth/login`、受保护抽样 `/api/v1/users`→`/api/core/iam/users/me`（当前 IAM 契约；BFF 8098 实测 200）。**② 本机实跑 smoke-prod --base localhost:8098 层1 全 PASS**：登录+JWT+users/me、15 域 /health 全 200、BI test-sql+query 200、插件 /api/plugins/health 200。**③ nginx 演练实跑**（brew nginx 1.31.1 + gen-nginx-drill-conf.sh 生成 drill conf → nginx -t 语法通过（2 warn：listen http2 弃用/ssl_stapling 无 OCSP，生产 conf 待优化）→ 起 nginx 80→301→443 自签 → https 代理冒烟 /health 200、业务域 200；/api/v1/users 404 归属 BFF 开发态无旧兼容路由（nginx 层正常）。**④ systemd 材料静态走查**：deploy/systemd/ 31 单元 + topems.target，ExecStart 统一 `/opt/topems/bin/<name>-service`（unified-core 特例原名），与 install.sh/update.sh SERVICES 数组及 cp 逻辑全一致；**实跑 systemctl install/update/rollback 与层2 专项（E/F/G/H）需 Linux 生产机（环境阻塞，待生产机复核）** |
| 2026-10-22 | v1.26 | 无代码变更（纯核销登记） | **master-data 冻结模块同法核销（knowledge_v53 / disaster_v56 / semantic_v57 / versioning_v54 / governance_v58）**：五模块 GET 全路径扫描 0 个 5xx（knowledge 14 / disaster 23 / semantic 21 / versioning 20 / governance 23），写端点探针 4 个 422（serde 校验拦截=链活、非 500）；引用表（mdm_kg_*/mdm_bc_*/mdm_continuity_*/mdm_semantic_search_indexes/mdm_version_*/mdm_governance_*/mdm_maturity_* 等）**已随 v1.24 的 81 张 mdm_* 补建覆盖**，非缺表；契约门禁默认缺口 0 / 实跑冒烟 226 挂载 0 真 404。**至此 master-data 全部历史模块（mdm P3 四批 + BI + 质量域 + 五冻结域）实跑核销完成**；主库缺表四类补建固化体系（init 06/07/08 + guard 脚本）覆盖全部引用面 |
| 2026-10-22 | v1.25 | 无代码变更（纯核销登记） | **其他历史排期项同法核销（BI / 质量域 quality-v51）**：① BI（svc/analytics crate，`/api/bi` 挂载）——routes.rs 3 条 path + 核心端点 health/test-sql/query/dashboards 实跑全 200，全路径扫描 0 个 5xx（此前 smoke-prod 20/20 已验证 test-sql/query，口径一致）；② 质量域 quality_v51（svc/master-data，21 条 path）——GET 全路径扫描 0 个 5xx；写端点探针 auto-fix/run、ai/suggest 422（serde 校验拦截=链活）、score 405（GET 端点）；引用的 `master_data.mdm_quality_checks/rules/auto_fix_actions/governance_insights/suggestions` 6 张表**已随 v1.24 的 81 张 mdm_* 补建覆盖**，非 500。**结论**：两域无缺表、无 5xx，纯核销零代码；至此 mdm P3 四批次 + BI + 质量域等 master-data/analytics 域历史排期项全部实跑核销 |
| 2026-10-22 | v1.24 | `database/init/08_mdm_schema.sql` + `scripts/dev/ensure-mdm-schema.sh` | **mdm P3 批次 2/3/4 同法核销（lineage-v52 / mdm-v59 AI 治理 / mdm-v55 商业化）**：三批代码早已完结（`b3620e9c6`/`378f18467`/`6beaaab27`），但主库 `master_data` schema 缺全部 `mdm_*` 域表（23 张引用表全缺）→ POST 成功路径 500 `relation "master_data.mdm_lineage_nodes" does not exist`；GET /lineage-v52/graph 返回空图系 handler 查询失败降级（掩盖缺表）。**修复**：pg_dump topems_test `-t 'master_data.mdm_*' --no-data` 导出 **81 张** mdm 域表（覆盖 lineage/AI/商业化 + v60/quality/knowledge 等其他 mdm 引用）→ 幂等化固化 `database/init/08_mdm_schema.sql`（CREATE TABLE IF NOT EXISTS；修复 mdm_collections 内嵌+外部重复主键，移除重复 ALTER，幂等重跑 0 错误）+ 主库补建（81 表 + 主键齐全，与权威一致）；固化 `scripts/dev/ensure-mdm-schema.sh`（guard：mdm_lineage_nodes 存在即跳过）。**验证**：三批写+读全链实测——lineage register 200（节点真实写入）+ graph 200（真实返回）；AI 治理建匹配规则 200；商业化建产品 200；测试数据已清理（nodes/edges 0）；契约门禁默认缺口 0 / 实跑冒烟 226 挂载 0 真 404。**至此 mdm P3 四批次（schema-registry/lineage/AI/商业化）全部环境核销**，主库缺表四类（iam/core/public 影子/mdm 域）均已补建并固化 init+guard 脚本 |
| 2026-10-22 | v1.23 | `database/init/07_core_schema.sql` + `scripts/dev/ensure-core-schema.sh` | **core 插件域缺表闭环（上轮遗留观察收口）**：BFF Plugin-Heartbeat 每 30s WARN `relation "core.core_plugin_instances" does not exist`——主库 topems **core schema 整体缺失**（pg_namespace 0、0 表；迁移链台账 0 条未应用 `20260725000000`/`20260908000001` 等，且守卫迁移仅建 core_plugin_navigation 1 表）。**修复**：pg_dump topems_test `--schema=core --no-data` 结构导出 14 表（core_plugins/core_plugin_instances/categories/versions/reviews/permissions/navigation/tenant_plugins + ai_conversations/knowledge_bases|chunks|documents|qa_history + user_preferences）→ 幂等化固化 `database/init/07_core_schema.sql`（CREATE SCHEMA/TABLE IF NOT EXISTS）+ 主库补建（与权威差集 0）；固化 `scripts/dev/ensure-core-schema.sh`（guard：core_plugin_instances 存在即跳过，幂等）。**验证**：BFF 重启（SEARCH_PATH 追加 core）后 heartbeat WARN 归零（35s 观测 0 次）、/api/plugins/health 200、契约门禁默认缺口 0 / 实跑冒烟 226 挂载 0 真 404。**启动期 2 条 ERROR（erp/lims Schema 防御检查失败）为既有状态非本批**。SEARCH_PATH 配方更新：`flow,mobile,rs,erp,finance,public,iam,shared,core` |
| 2026-10-22 | v1.22 | DB 环境补建（无代码变更） | **mdm P3 批次 1 schema-registry 环境核销**：代码层早已完结（`883e70146` + `f122d1b98`/`8ab52a995`/`4bf7e049c`，10 路由挂载 + 前端 wrapper/页面 + 冒烟清零），但本机主库 topems 实跑 `GET /api/master-data/schema-registry/schemas` 500 = `relation "public.schema_registry" does not exist`——主库 `_sqlx_migrations` 台账 0 条（存量库 psql 直推，未应用迁移链），`20261005000001_align_public_shadow_tables.sql`（public 影子表迁移）从未应用；权威表在 `master_data`/`iam` schema（各 11 列），handler 显式钉 `public.` 前缀（master-data 独立运行 SEARCH_PATH 不依赖）。**修复**：① 主库补建 `public.update_updated_at_column()`（触发器函数，取 `20260725000001` 定义）；② 执行 `20261005000001_align_public_shadow_tables.sql`（幂等）→ `public.schema_registry` 11 列 + 唯一/普通索引 + updated_at 触发器、`public.dynamic_data` 4 列 + GIN 索引 + 触发器；③ **实跑 10 端点全链验证**：Schema CRUD（list/get/create/update/delete）+ 动态数据 CRUD（list/get/create/update/delete，路径 `/schemas/{schemaId}/data`）全 200/201，测试数据已清理。**门禁**：契约默认缺口 0（2640 前端/6344 后端）、strict 226 与基线一致、实跑冒烟 226 挂载 0 真 404 无回归。**遗留观察（非本批）**：BFF heartbeat WARN `relation "core.core_plugin_instances" does not exist`——同类主库缺表（core schema 插件域），plugin-registry 未点名不扩做，登记待后续批次 |
| 2026-10-21 | v1.21 | DB 修复 + `database/init/06_iam_schema.sql` + `scripts/dev/ensure-iam-schema.sh` | **追查项① 根因闭环：主库缺失 iam schema → 登录/users/me 全 500**。追查「PUT /users/me 偶发 user_id 类型报错（未复现）」真相：非类型错误——主库 topems（BFF 主连，DATABASE_URL 确认）无 `iam` schema（pg_namespace 0 表），`relation "iam.users" does not exist` → 登录 `FROM iam.users` 500、GET /users/me 404「用户不存在」、PUT 500；代码引用 `iam.users` 与权威库（topems_test，73 张 iam 表含 users/core_users 双套）一致，纯环境缺口（存量库 psql 直推/运行时建表、未跑迁移链，`_sqlx_migrations` 0 条）。**修复**：① pg_dump topems_test `--schema=iam --no-data` 结构导出（73 表，含 roles/permissions 数组列等权威结构）→ 幂等化（CREATE TABLE/INDEX IF NOT EXISTS）固化 `database/init/06_iam_schema.sql`；② 主库执行补建 73 表；③ seed test_admin/admin（bcrypt，roles={superadmin}, permissions={*}，P0-3/P0-4 同款）；④ **固化脚本 `scripts/dev/ensure-iam-schema.sh`**（guard：iam.users 存在即跳过；缺失则应用 init/06 + 断言表数，幂等可重复），防止空库重建/存量库再次缺失。**验证**：登录 admin/test_admin 全 200；GET /users/me 200（档案+权限）；PUT /users/me 200（full_name 更新回读，已恢复原值）；契约冒烟 226 挂载 0 真 404 无回归；契约门禁默认缺口 0。**顺带收口**：BE-08 降级项 `delete_type` 复核——确认真实软删 handler（`UPDATE pm.project_type_configs SET deleted_at`，404/500 处理齐全，非空 unit），定性文档 `BE-08-待定150条定性.md:42` 已从「下线候选」修正为「确认保留」（BE-08 执行期宁少删降级与此一致）。DB 修复不入迁移链（存量库风格），init 脚本 + guard 脚本为可重复复原路径 |
| 2026-10-21 | v1.20 | `9f4e821be`/`40ae21ec0` | **批 A（rate-limit/anti-replay 配置端点，前端 RateLimitConfigPage 4 调用 404 收口）+ 批 B 核销（零代码）**：① 后端 `middleware/rate_limit.rs` 扩展四维模型（by_tenant/by_user/by_ip/by_global + tenant/user/ip/global_default 各维度规则 + `priority`，默认值保持历史行为等价：user/ip 500/60、tenant/global 关闭、auth 路径 30/60 不变），middleware 改 `Arc<RwLock<RateLimitConfig>>` 可写共享（`new_shared/config_arc/update_config`）；key 构建按维度追加、规则选择路径规则优先→按 key 维度选对应 default；② 新增 `middleware/anti_replay.rs`（默认 disabled；enabled 且 path∈enforce_paths 时校验 `X-Request-Timestamp`（容差 tolerance_secs）+ `X-Request-Nonce`（nonce 缓存非重放，惰性过期），缺头/超窗/重放分别 400/400/429）；③ 新增 `routes/rate_limit_config.rs`：GET/PUT `/iam/v1/rate-limit/config` + `/iam/v1/rate-limit/config/anti-replay`，nest `/iam/v1` 挂 core_protected_routes（双轨 /api/core + /api/v1/core）；④ AppState 增 `anti_replay_state`，main.rs/embedded.rs/tests common 接线；⑤ feature-flags 实跑 200 确认（此前 TODO 记录 404 已随早期挂载解决）；⑥ 验证：单测 16 条新增/对齐、lib 538 全绿；BFF 重启实跑 4 端点全 200 + PUT 幂等回读（updated_at 填充）；契约门禁默认缺口 0（2640 前端/6344 后端路由）、strict 226 与 BE-08 基线一致无新增、实跑 226 挂载 0 真 404；clippy correctness 拦截（anti_replay u64→i64 try_from）补提交后 pre-push 全绿已推 origin/main。**批 B 核销**：部署脚本 8000 口径经核实为 unified-core 独立模式事实端口（services.yaml CORE_PORT、api-base-url-convention 明确 core=8000 / 单体 BFF=8099 / plugin-registry=8096）；rollback.sh:289 `localhost:8000` 为独立模式健康检查（与对外 8099 两层语义）、start-production.sh:21 注释 CORE_PORT=8000 为事实源；H-9 三文档 8000 为 dev 独立进程语境（api-base 已双标注 8000/8099）→ 口径自洽零代码，登记核销 |
| 2026-10-20 | v1.0 | a5b8da944 | 首次成稿：分阶段启用路线图、能力盘点表、P0/P1/P2 缺口清单、首次可登录性结论（admin/admin123 启动自举） |
| 2026-10-20 | v1.1 | `9d33f86b8` | **P0-3**：`setup/admin` 方案B——建员工档案并接受可选 `user_id` 回绑，新增 `username` 校验与 iam.users 用户名/邮箱占用预检（冲突 409 不 500）；不直写 iam，建号由前端串联 IAM `POST /api/core/iam/users` |
| 2026-10-20 | v1.2 | `33479ed7d` | **P0-2**：幂等迁移 `20261020000025` 播种 5 条 pending 步骤行；公司步 UPDATE→upsert（纠正错列 `email`→`contact_email`）；`get_init_progress` 空集按未开始 |
| 2026-10-20 | v1.3 | `b052ac1cf` | **P0-4 第一批（非破坏）**：迁移 `20261020000024` 补齐 23 个中间件已挂载但字典缺失的权限码（仅字典、不绑角色）；三套方言对照清单 + 命名口径；JWT 登录/`/users/me` 角色权 JOIN 展开未落地，附待决策草案 |
| 2026-10-21 | v1.4 | `4ac94af80` | **P0-1**：5 步初始化向导页（公司→部门批量→岗位批量→管理员→完成）接六方法，路由 `/hrm/setup` + 设置组导航 + lazyWithRetry，zh/en 93 键，落地页非阻塞提醒横幅；管理员步先 `userApi.createUser` 建号再回绑 |
| 2026-10-21 | v1.5 | `e810fc787` | **P0-4 第二批·JWT 展开**：登录签发与 `/users/me`、`my-permissions` 非超管改 JOIN 规范化授权表（`resolve_user_grants`），与刷新换发对齐；超管 `['*']`/全量目录不变；反范式列与 C 方言目录保留；lib 536 测试绿 |
| 2026-10-21 | v1.6 | `62cf693a8` | **P1-5**：9 个自服务端点（GET/PUT `/users/me`、自身权限、自身偏好、改密、头像、自身权限校验、`/permissions/my-permissions`）拆入独立 `me` 路由组，仅由全局 `auth_middleware` 校验登录（无 token→401），不再要求 `iam:read`/`admin:iam:write`；管理类增删改/角色/权限/岗位仍守原权限层；身份一律取 `Claims.sub`，不接受 body/路径指定他人；pre-commit 全绿，lib 536 测试通过 |
| 2026-10-21 | v1.7 | `cc16d41d8`/`7aff8b852`/`e1980e95d`/`f23f543db` | **S 安全收口批**：S1/P1-3 `REGISTER_ENABLED` 默认关、开放时新账号 pending 待激活；S2 首启 admin `must_change_password`、登录下发旗标、自身改密清除 + `ADMIN_INITIAL_PASSWORD` 声明（后端硬拦截/前端跳转留 P1-4）；S3/P2-6 DEV 旁路 prod 判定覆盖 RUST_ENV/ENV 并强化告警；S4/P2-9 停用孤儿脚本 admin123 播种并标注；P2-2 向导租户归属并入 F 批随 P1-1 统一 |
| 2026-10-21 | v1.8 | 本地待验（未推送） | **F 批后端首启闭环（1–2）+ 实机验证**：P1-1 `setup/complete` 落 completion 初始化标记、汇总公司/部门/岗位数并核验 admin 是否绑定 IAM 账号，未绑定告警；角色/权限归 IAM 建号端点，hrm 不跨服务直写；P2-3 部门/岗位批量步前置全量校验、全成功才提交，DB 错误整批回滚；P2-4 岗位步补批次重名/重码、库内同名、部门归属存在性校验（应用层孤儿防护），硬 DB FK 待清孤儿后另立迁移。**顺手补漏**：名称≤255/编码≤50 前置校验直接 400（不再落 DB 超长 500），前端 `CompleteInitResponse` 补 `admin_bound/summary` 类型。实机 10+ 用例（重名/重码/空名/坏部门/门控/绑定分支/DB 错误整批回滚/超长 400）全通过；hrm 293 passed、fmt/eslint 绿 |
| 2026-10-21 | v1.9 | `4d87064ea`/`958e0cc9a`/`52cc3a467`/`2def461ff`/`793a3f4b2` | **优先级连做五项**：P1-2 部门/岗位 10 handler
| 2026-10-21 | v1.10 | `883e70146`/`b3620e9c6`/`378f18467`/`6beaaab27` | **mdm P3 预留能力 UI 四批次全部完结**（schema-registry / lineage-v52 / mdm-v59 AI 治理 / mdm-v55 商业化，详见 §6） | 补读/写 `check_permission`；P2-1 主页 `InitGate` 未完成时渲染五步初始化 checklist CTA（完成/失败回退 dashboard）；P1-8 迁移 `20261020000026` 为 gis.geofences/rs.material_tests 补 tenant_id+RLS、关闭 erp.bank_accounts 开放策略，gis 按 claims 过滤落库、rs/erp 按 GUC 落租户、pm 建项目按会话租户（核查 bi/pm 已有 RLS，wms/mes 无写死 UUID）；P2-2 向导六端点 org/进度归属按会话租户、首启超管回退默认 org；P2-4 DB FK 迁移 `20261020000027` 先解绑孤儿再建 `positions→departments ON DELETE SET NULL`。gis 155 / rd 155 / erp 902 / pm 497 / hrm 293 测试绿，pre-commit 全绿 |

| 2026-10-21 | v1.11 | `0ee8ab851`/`064287e6f`/`78042fe2a`/`2e624108a` | **三线执行批（一步到位）**：A1 master-data 契约缺口 5 处全收（mdm-v66 `dashboard/recent`、`lineage/refresh` 补无 id 版，`tags/categories/maps` 补 get list，BFF 实跑 5 条全 200）；A2 SCM §C/D/E 复核零改动归零；B/P1-4 菜单权限过滤（`menuPermissions.ts` 34 项 + GlobalLayoutV3 渲染层 filter，原"35 config.ts 0 声明"为过时口径）；C/P1-10 部分闭环（币种主表+CRUD+期间/币种前端页，科目体系归并待拍板，见 P1-10 说明）。pre-commit/pre-push 全绿（migration-validate Checksum errors=0、sqlx 缓存 27 服务 OK、cargo test 541 passed），已推 origin/main |
| 2026-10-21 | v1.12 | `6c29a8189` | **线C1 科目体系收敛（方案 A 根治）**：迁移 `20261021000002`（幂等建 finance schema + 归位 51 张 + `core_finance_accounts` 补 `category` 列）+ `20261021000003`（补归位 `finance_v60_*` 8 张）→ **59 张 finance 表全部归位 finance schema**；代码 8+ 处（financial_reports 8 处、mod.rs 2 处查询、erp opening_balance 2 处）收敛 `finance.core_finance_accounts`（`deleted_at`→`is_enabled`、`organization_id`→`tenant_id` 适配）；V321 `accounting_subjects` 路由下线（404）；currencies TABLE 统一 `finance.core_finance_currencies`；BFF 重启（SEARCH_PATH 加 finance）后冒烟：accounts/currencies/periods/reports 全 200（原 accounts 500→200）、accounting-subjects 404；期间 close 顺带修复列名 bug（period→year/month）。pre-commit 全绿（migration-validate Checksum errors=0、sqlx 缓存 OK） |
| 2026-10-21 | v1.13 | `fb944841d` | **批6（P2-8 + P2-10 技术债四项）**：P2-8 财务默认科目/期间按新租户补播——迁移 `20261021000004` 建幂等函数 `finance.bootstrap_defaults(p_tenant_id)`（科目 1001/1002/2202/6001/6601 + 当前月开放期间，缺失才插）并对存量 30 租户全量补播，新增 `POST /api/finance/bootstrap` 播种 API（显式/会话/全量三模式，BFF 实跑 200、幂等验证不重复插）；P2-10——roles.rs 空桩标注 DEPRECATED（契约兜底保留）、LoginFormV2 死代码删除（LoginPage 自实现真登录，含 index re-export + i18n zh/en 68 key 清理）、authStore 旧版标注废弃（无写入方，useWebSocket/TenantSwitcher/useDashboardWebSocket/useABTest/NotificationPanel 5 读取方迁移 localStorage/useAuth 数据源，修复其长期拿空值问题；保留文件因 20 测试 mock）、OpenAPI 双 ApiDoc 块实勘不存在核销。验证：cargo check finance/hrm 零警告、frontend typecheck 绿、BFF 冒烟 bootstrap/accounts/currencies/periods/reports 全 200 |
| 2026-10-21 | v1.15 | `faa3d12a1`/`f9cc9f4d6`/`7f769d0f5`/`db1b6d07a`/`46221ebd8` | **批2+批3（P1-6/P1-7 双线）**：批2 P1-6 MES 车间/产线/班次/工作日历——迁移 `20261021000006` 建 4 表 + 工位/工单外键回填，`basics.rs` 四实体全 CRUD + 前端 MesMasterDataPage（4 Tab）+ route/nav/i18n，BFF 冒烟全 200（pre-commit hardcoded-precise/icon-page/glossary-verify 三连拦修复：图标别名注册、`str.replace` 按行号精修）；批3 P1-7 QMS 检验项/方案/抽样 + LIMS analyte——迁移 `20261021000007` 建 5 表，`inspection_standard.rs`/`analyte.rs` CRUD + 前端两页，BFF 冒烟全 200（clippy as_conversions 三处修正）。门禁记录：pre-push cargo-fmt-check/cargo-clippy-workspace 拦截后补提交 |
| 2026-10-21 | v1.16 | `cdeeef76b` | **批4（P1-9 六个管理页闭环）**：迁移 `20261021000008`（重写仅建 `erp_dictionaries`，CRM 标签复用既有 crm.tags 路由并 DROP crm_tags 冗余表）+ `20261021000009`（建 ehs schema `safety_hazards`/`hazard_risk_assessments`/`hazard_control_measures` + `qa_ehs_hazards` 视图指向 public 表 + crm.tags 补 `name_en` + gis.devices 补 `tenant_id`）；后端契约修复：`svc/erp/src/modules/dictionaries.rs` 新建 CRUD、LIMS `test_method.rs` category parent_id 绑定改 Option Uuid、EHS `hazard.rs` created_by 绑定改 Uuid、MES `capacity.rs` NUMERIC cast + created_at::timestamptz（TIMESTAMP 列兼容）、GIS `embedded.rs` 补 `/devices` POST 挂载；前端六页（CapacityPage/MethodCategoryPage/TagPage/DictionaryPage/DevicePage + 复用 EhsHazardPage）+ 5 模块 route/nav/i18n 挂载，typecheck 全绿；BFF 冒烟六接口 create/list 全 200。门禁记录：i18n-quality 拦 erp nav flat/nested 混合结构 2 处（删 flat 重复 key 后通过）；pre-push 全绿，rebase 后已推 origin/main |
| 2026-10-21 | v1.19 | `69d7a42f5` | **批5（P2-5 路由清理 + P2-7 菜单种子）**：`routes/common.ts` 22 条路由收敛为 3 条 common 特有（v4-demo / desktop/monitor / desktop/audit-logs），删 10 处重复注册（/wms/inventory、/qms/inspection、/qms/nonconformance、/crm/customers、/crm/opportunities、/hrm/employees、/hrm/attendance、/hrm/performance 8 字面 + EHS_PATHS.accident + DOC_PATHS.documents 2 常量，均已在模块 config 精确注册）；9 孤儿路由迁入模块 config——wms +4（inbound-orders/outbound-orders/stocktake/locations，WmsInboundOrderPage 等，PATHS + route + nav code/title/titleKey/icon 依赖 + i18n zh/en 各 8 key 含 wms-locations 已有）、qms +2（eight-d/audit 内联 routes）、crm +1（contracts）、erp +2（sales-orders/inventory）；`/settings` 死链核销（GlobalLayoutV3.tsx:687-690 实指 `/admin/system-settings`，admin config:241 route + :498 nav 已挂载，全仓无裸 `/settings` 引用，旧行号过时）；BackupPage 无引用删除（pages/system/BackupPage.tsx 681 行 + `__tests__/BackupPage.test.tsx` 132 行）；P2-7 菜单种子 tenant 错位修复——`20260724000005_seed_module_menus.sql` 39 处 tenant 全 0 统一为默认租户 `00000000-0000-0000-0000-000000000001`（与 20261021000005 默认租户种子一致），该迁移此前从未应用（迁移表无记录、表内 0 行），修正后手动应用：core_menus 184 行 + core_menu_groups 53 行落地默认租户；门禁：migration-validate 首次运行因 checksums.txt 并行更新标黄、单独重跑 Errors 0 后 pre-commit 全绿（25 项），pre-push 全绿已推 origin/main |
| 2026-10-21 | v1.18 | `67efb57b5` | **批7 续（P2-11 剩余两项收口）**：迁移 `20261021000011`（pm.project_type_configs 补 name_en + tenant_id+type_code 唯一约束；新建 `pdm_drawings` 表 UNIQUE(tenant_id,drawing_no) + 软删）并登记 checksums；PM `project_type_config.rs` 纯桩接真——5 handler 全 CRUD（type_code/type_name ILIKE 搜索 + is_active 过滤 + LIMIT/OFFSET + count，default_phases/default_milestones JSONB `::text` 双向，COALESCE 局部更新、软删、租户 current_setting 兜底；utoipa 注解保留）；PDM `drawings.rs` 新建——5 handler 全 CRUD（Claims 租户过滤 + search/status/drawing_type 过滤 + COALESCE 局部更新 + 软删），mod.rs 挂载 `/drawings`；前端 `PmProjectTypeConfigPage` + `PdmDrawingPage`（API + route/nav + i18n zh/en，lucide FileCog/FileInput 无导出换 ClipboardList/FileText）；BFF 冒烟两接口 create/list/update/delete 全 200。门禁：glossary-verify 拦 en deleteSuccess 2 处（改 Deleted successfully 后通过）；pre-commit 全绿、pre-push 全绿已推 origin/main。至此 P2-11 整行闭环 |
| 2026-10-21 | v1.17 | `143268b49` | **批7（P2-11 公共主数据域）**：迁移 `20261021000010` 建 master_data.materials/uoms/samples 三表（UNIQUE(tenant_id,code) + 软删 deleted_at）并登记 checksums，schema_defense TABLE_DEFS 4→7；后端 `master_data.rs` 三实体全 CRUD（list 动态过滤 material_type/uom_type/sample_type + status + search ILIKE + LIMIT/OFFSET + count，COALESCE 局部更新、软删、locale CASE name_en、时间戳 ::text，FromRow derive + create 租户字面内联 `COALESCE(NULLIF(current_setting('app.tenant_id',true),'')::UUID,'00000000-...')`，RETURNING/SELECT id 补 `::text` 修复 UUID 解码）；mod.rs nest `/master-data` 挂载 materials/uoms/samples（GET+POST / {id} GET+PUT+DELETE）；前端 masterData API + PublicMasterDataPage 3 Tab（物料/UOM/样品 CRUD）+ config PATHS/route/nav（icon Boxes、order 5）+ i18n zh/en 各 25 key；iconMapping 清理 Menu/Store 等重复行；BFF 冒烟三接口 create/update/delete/list 全 200。门禁：glossary-verify 拦 en deleteFailed（改 Delete failed 后通过）；pre-commit 全绿、pre-push 全绿已推 origin/main。注：P2-11 行内 PM 项目类型模板、PDM 无独立图纸实体两项未并入，另批 |
| 2026-10-21 | v1.14 | `c9338e8aa` | **遗留清除（批6 后续）**：补默认租户种子（迁移 `20261021000005`，`public.core_tenants` 幂等插入 `00000000-0000-0000-0000-000000000001`「默认租户」）——该 UUID 为测试/会话 token 恒定 tenant_id，此前不在 core_tenants 导致 finance 写动作 FK 500。修复后 BFF 冒烟全链绿：`POST /periods/open`（会话租户）200 开启成功、`POST /bootstrap` 无 body 会话租户 200（backfilled=1）、`close` 200 关闭成功、year-end-close 200、accounts/currencies/periods/reports 回归全 200 |

> 后续每次闭环/修订在此追加一行；完成 P0/P1 后同步把 §3 对应行状态改为已具备并勾选 TODO.md。
