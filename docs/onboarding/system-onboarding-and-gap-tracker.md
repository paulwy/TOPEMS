# TOPEMS 系统启用场景与查漏补缺（活文档）

> **文档性质：持续维护的活文档（Living Document）**，不是一次性快照。首次启用场景/步骤随版本演进持续更新；查漏补缺缺口与 TODO.md 双向同步，闭环一项勾一项并在文末变更日志记录。

| 项 | 值 |
|---|---|
| 版本 | v1.6（P0 全闭环；P1-5 自服务端点移出管理权限层，登录即可访问） |
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
| 1.6 | **（向导·完成步）** 确认初始化完成 | `POST /api/hrm/setup/complete`，`setup.rs:786-879`；**仅把 completion 步标 completed，不建角色/不绑权限/不改租户状态**（`:841-854`） | api 壳 `hrmSetup.ts:137`，**无页面调用** | 状态标记，无授权结果 | 部分（前端 P0-1 已接 `completeInitialization`；后端仍空动作，不建角色/绑权限，见 P1-1） |

> 向导进度存储：`hrm.initialization_status`（建表 `20260725000000_business_base_tables.sql:756-763`）。P0-2（`33479ed7d`）新增幂等迁移 `20261020000025` 为默认组织 0001 播种 5 条 pending 步骤行，`get_init_progress` 空集按未开始处理。

### 阶段 2　账号与权限（IAM）

| # | 操作动作 | 后端路由/文件证据 | 前端页面/路由证据 | 预期产出 | 状态 |
|---|---|---|---|---|---|
| 2.1 | 建业务用户账号 | `POST /api/core/iam/auth/register`（开放无开关，`auth.rs:466-622`，注册后 is_superuser=false、不绑角色/租户 `:588-602`）；或管理员经 `POST /api/iam/users` 建号 | 登录页注册分支 `LoginPage.tsx:111-135`；用户管理 `/iam/user` → `UserManagementPage.tsx:64-107`，`api/iam/user.ts:44-137` | 可登录用户 | 部分（自助注册产出不可用账号，P1-4） |
| 2.2 | 建角色并绑定权限 | `core_roles`/`core_role_permissions`；角色 CRUD `role.rs:74,410-432,490`；`GET /api/iam/roles` | `/iam/role` → `RoleManagementPage.tsx:73-166`，`api/iam/role.ts:7-40` | 角色-权限映射 | 部分（scope 方言不匹配，P1-3） |
| 2.3 | 维护权限字典 | `core_permissions` CRUD，`permission.rs:43-47`；元数据同步 `permission_metadata.rs:25-71` | `/iam/permission` → `PermissionManagementPage.tsx:15-46`，`api/iam/permission.ts:7-22` | 权限目录 | 部分（三套方言，P1-3） |
| 2.4 | 把角色授予用户 | `core_user_roles`，`user/roles.rs:395` | 用户管理页内授权 | 人-角色-权限贯通 | 部分（登录 JWT 不展开角色权限，P1-3） |

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
| P1-1 | `setup/complete` 空动作：不建默认角色、不绑权限、不改租户状态 | "系统已准备就绪"无授权结果支撑 | complete 时落默认角色/权限/租户初始化标记 | `setup.rs:841-854` |
| P1-2 | 部门/岗位后端无 handler 级 `check_permission`，仅全局 `hrm:admin` | 粒度粗，无法按部门/岗位授权 | 补 DepartmentRead/Write、PositionRead/Write 权限校验（对齐 company/employee） | `department.rs`、`position.rs` grep check_permission=0 |
| P1-3 | 自助注册开放无开关，注册账号无角色/权限/租户，注册后不可用 | 任意人可注册僵尸账号，安全与数据风险 | 加 `REGISTER_ENABLED` 开关；注册流绑定最小角色/租户或改纯管理员建号 | `auth.rs:466-622,588-602`；svc 内无 REGISTER 开关 |
| P1-4 | 前端权限守卫几乎未落地：35 个 config.ts 0 声明权限，PermissionGate 仅 1 处使用，菜单不过滤 | 无权限用户仍见全部入口，"可见但进不去" | 补模块权限声明、路由 requiredPermissions、菜单/按钮守卫（前端为体验层，后端为硬防线） | `modules/*/config.ts`；`PermissionGate.tsx` 1 处；`ModuleTabs.tsx:555`；`GlobalLayoutV3.tsx:59` |
| **P1-5** ✅ 闭环 | ~~`/users/me`、自身改密被 `iam:read`/`admin:iam:write` 保护，普通用户 403~~ | 已闭环：自服务端点拆入独立 `me` 路由组，仅由全局 `auth_middleware` 校验登录（无 token→401），不再叠加管理权限层；管理类增删改/角色/权限仍守 `iam:read`/`admin:iam:write`/`admin:iam:delete` | 9 个自服务端点（GET/PUT `/users/me`、自身权限、自身偏好、改密、头像、自身权限校验、`/permissions/my-permissions`）身份一律取 `Claims.sub`，不接受 body/路径指定他人 | `routes/iam.rs`（`me` 路由组）；全局 `auth_middleware`（shared-auth） |
| P1-6 | MES 缺车间/产线/工作中心表与路由，工位 `workshop_id` 悬空；缺班次/工作日历 | 无法做真实排产与产能建模，APS 基础数据不成立 | 补车间/产线/班次/日历实体 CRUD 与前端页，回填工位外键 | 全库无 workshop/production_line/shift/calendar 建表；`work_station.rs:30-43` |
| P1-7 | QMS 缺结构化检验项/检验方案/抽样方案；LIMS 缺检验项目(analyte) | 检验只能填自由文本，无法标准化质检 | 补 inspection_item/sampling_plan/analyte 表与 CRUD + 前端方案配置页 | 无 checklist/inspection_item/sampling_plan 表；analyte 无表 |
| P1-8 | 多表缺租户隔离：`erp.bank_accounts`、`gis.geofences`、`rs.material_tests`、`bi.analytics_datasets` 无 tenant_id；`pm.projects` 列表不过滤；wms/mes 部分 organization_id 写死公共 UUID | 多租户下数据串读 | 补 tenant_id 列与查询过滤，移除写死 UUID | `bank_account.rs`；DDL `20261007000009:1282`；`material.rs:307-313`；`dataset.rs:90-95`；`project.rs:188` |
| P1-9 | 后端有前端缺的管理页：MES 产能日历、LIMS 方法分类、CRM 标签、财务会计期间/辅助核算创建、ERP 字典、EHS 危险源列表、GIS 设备注册 | 主数据只能调 API，运营不可用 | 逐一补前端页面并接已有 api | 见 §3.1–3.3 各行"部分"标注 |
| P1-10 | 财务两套科目表并存（`core_finance_accounts` 挂 admin、`accounting_subjects` 挂 erp）；会计期间无管理页；税率硬编码；无币种主表 | 账务主数据归属割裂，多币种/税务无法配置 | 统一科目体系、补期间/税率/币种主数据页 | `mod.rs:4934,5321`；`accounting_subjects.rs:398-408`；`tax_v56.rs:1057,2234` |

### P2 —— 增强 / 一致性 / 技术债

| # | 缺口 | 影响 | 建议做法 | 证据 |
|---|---|---|---|---|
| P2-1 | 无首次引导/空态 CTA：登录固定落 `/dashboard`，落地页硬编码 mock，无"先录公司/人员"提示 | 新用户无方向 | 空组织时展示初始化 checklist 引导 | `LoginPage.tsx:84-90`；`HybridDashboard.tsx:14-46` |
| P2-2 | 向导写死 `DEFAULT_ORG_ID=0001`，不读 JWT tenant/org | 多租户写错归属 | 改从 Claims/上下文取 org/tenant | `setup.rs:119` |
| P2-3 | 批量步部分失败不回滚，成功/失败混杂提交 | 数据不一致 | 整批事务或逐行回滚 + 明确错误回报 | `setup.rs:415-428,553-560` |
| P2-4 | 岗位→部门无 DB 外键；岗位步无批次重名校验；positions 孤儿可静默存在 | 脏数据 | 补 FK、补重名校验 | `position.rs`；`setup.rs:517-530` vs `:378-383` |
| P2-5 | 路由遗留错配：`routes/common.ts` 10 处重复注册（且 requiredPermissions 置空）、9 处孤儿路由、`/settings` 死链、`BackupPage` 无引用 | 可达性混乱、权限被置空覆盖 | 清理 common.ts，统一以模块 config 为准 | `common.ts:44-191`；`GlobalLayoutV3.tsx:935`；`BackupPage.tsx` |
| P2-6 | `DEVELOPMENT_MODE=true` 伪造超管旁路未在 `.env.example` 声明 | 误用风险 | 文档显式标注 + 启动醒目告警，prod 强制关闭（已有 prod 忽略） | `shared-auth/auth.rs:688-718,719-724` |
| P2-7 | 菜单种子 tenant_id=全 0 与默认租户 0001 错位；DB 菜单非前端主驱动 | 菜单种子不生效（现状靠硬编码兜住） | 统一租户命名空间或改公共共享菜单策略 | `20260724000005_seed_module_menus.sql:6,20` |
| P2-8 | 财务默认科目/期间种子只覆盖迁移时已存在租户，新建租户不补 | 新租户缺基础科目 | 配合首启租户建立后补播，或提供按需播种 API | `20261020000005:60-82` |
| P2-9 | 孤儿脚本 `database/init/03_init_permissions.sql`（含 admin/admin123、superadmin）未接入任何部署/CI；测试账号在 `database/test/iam_test_data.sql` | 误导、弱口令风险 | 明确去留：纳入幂等首启种子或从交付物移除，勿带 admin123 上生产 | `03_init_permissions.sql:325-327,423-432`；`iam_test_data.sql` |
| P2-10 | 技术债：HRM `roles.rs` 空桩；`LoginFormV2` 遗留模拟登录分支；`authStore` 旧版；OpenAPI 双 ApiDoc 块不一致 | 维护成本/误用 | 删除或标注废弃，统一 ApiDoc | `roles.rs:32-84`；`LoginFormV2.tsx:68-93`；`openapi.rs:72-73 vs 173-178` |
| P2-11 | 全栈缺统一物料目录/UOM/税率表/币种/样品等公共主数据；PM 项目类型模板空桩；PDM 无独立图纸实体 | 跨模块主数据各自为政 | 规划 master-data 公共主数据域承接 | 见 §3 各"缺失"行；`project_type_config.rs:12-17` |

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
2. **`ADMIN_INITIAL_PASSWORD` 未在 `.env.example`/`config/` 声明**，运维不易发现可覆盖默认弱口令。
3. **默认 `admin123` 为弱口令**，必须首启立即修改；代码自身也打印"⚠️ 使用默认管理员密码，请在首次登录后立即修改"（`mod.rs:438`），但**无强制改密机制**。
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
| 2026-10-20 | v1.0 | a5b8da944 | 首次成稿：分阶段启用路线图、能力盘点表、P0/P1/P2 缺口清单、首次可登录性结论（admin/admin123 启动自举） |
| 2026-10-20 | v1.1 | `9d33f86b8` | **P0-3**：`setup/admin` 方案B——建员工档案并接受可选 `user_id` 回绑，新增 `username` 校验与 iam.users 用户名/邮箱占用预检（冲突 409 不 500）；不直写 iam，建号由前端串联 IAM `POST /api/core/iam/users` |
| 2026-10-20 | v1.2 | `33479ed7d` | **P0-2**：幂等迁移 `20261020000025` 播种 5 条 pending 步骤行；公司步 UPDATE→upsert（纠正错列 `email`→`contact_email`）；`get_init_progress` 空集按未开始 |
| 2026-10-20 | v1.3 | `b052ac1cf` | **P0-4 第一批（非破坏）**：迁移 `20261020000024` 补齐 23 个中间件已挂载但字典缺失的权限码（仅字典、不绑角色）；三套方言对照清单 + 命名口径；JWT 登录/`/users/me` 角色权 JOIN 展开未落地，附待决策草案 |
| 2026-10-21 | v1.4 | `4ac94af80` | **P0-1**：5 步初始化向导页（公司→部门批量→岗位批量→管理员→完成）接六方法，路由 `/hrm/setup` + 设置组导航 + lazyWithRetry，zh/en 93 键，落地页非阻塞提醒横幅；管理员步先 `userApi.createUser` 建号再回绑 |
| 2026-10-21 | v1.5 | `e810fc787` | **P0-4 第二批·JWT 展开**：登录签发与 `/users/me`、`my-permissions` 非超管改 JOIN 规范化授权表（`resolve_user_grants`），与刷新换发对齐；超管 `['*']`/全量目录不变；反范式列与 C 方言目录保留；lib 536 测试绿 |
| 2026-10-21 | v1.6 | `62cf693a8` | **P1-5**：9 个自服务端点（GET/PUT `/users/me`、自身权限、自身偏好、改密、头像、自身权限校验、`/permissions/my-permissions`）拆入独立 `me` 路由组，仅由全局 `auth_middleware` 校验登录（无 token→401），不再要求 `iam:read`/`admin:iam:write`；管理类增删改/角色/权限/岗位仍守原权限层；身份一律取 `Claims.sub`，不接受 body/路径指定他人；pre-commit 全绿，lib 536 测试通过 |

> 后续每次闭环/修订在此追加一行；完成 P0/P1 后同步把 §3 对应行状态改为已具备并勾选 TODO.md。
