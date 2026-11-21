# 租户数据可见范围确认清单（业务方答复版）

> 日期：2026-11-21　｜　用途：开窗收紧数据隔离前，一次性收齐业务口径
> 阅读对象：各业务域负责人、集团财务、集团 HR、集团质量、信息化负责人
> 本文只提问，不做技术变更；所有表名、行数、代码路径均来自仓库既有盘点文档（见文末证据索引）。

---

## 0. 先读这一页

### 0.1 背景（三句话）

系统里大多数业务表都带「租户」列，用来保证 A 公司的数据不会被 B 公司看到。历史上有部分表为了赶功能，策略写得比较宽松（等于没隔离），还有一部分表在数据库层面没有开启隔离，只靠应用代码自己过滤。

现在要把这些口子按「一批一开窗」的方式收紧。技术动作本身很小（改数据库策略），但**「谁应该看到谁的数据」是业务规则**，技术无法替业务决定。答错的后果只有两种：要么合法的跨公司查询被挡（报表为空、页面打不开），要么不该看的其他公司数据被看到（越权）。

### 0.2 怎么回答

- 每题都有 A/B/C 选项。**在选项后写「选 X」即可**；如果有选项都不符合，直接写实际场景，不用勉强选。
- 涉及具体表的题，附件里按业务族列出了表名；不需要逐表回答，**按族回答一次即可**，只有个别表例外时单独注明。
- 不确定的题请写「暂不确定」，不要默认选 A。默认选错会导致上线后返工。
- 第 6.1 节是我们自己能查清、不需要你们回答的；第 6.2 节是需要你们回答的汇总，按优先级排序。

### 0.3 术语速查

| 说法 | 含义 |
|---|---|
| 租户 | 一家使用系统的公司/组织。正常情况下，一家公司只能看到自己的数据。 |
| 平台级数据 | 不属于任何一家公司、所有公司都能看的公共数据，例如系统菜单、字典、平台模板。 |
| 集团 / 成员 | 业务已定性（2026-11-21）：**集团 = 一个租户下挂多家公司**（`hrm.companies` 的行），不是多家租户同属一个集团。母公司是其中一家，可看全部子公司；**子公司之间不可互看**（含同一母公司下的兄弟公司）。 |
| 严格隔离 | 数据库强制只返回「当前公司」的行，任何代码漏过滤也看不到别家。 |
| 宽松策略 | 数据库策略里带了「不属于任何公司也放行」的分支，等于部分放行。 |
| allow_all | 数据库策略写死「全部放行」，完全不看公司。 |
| RLS 关闭 | 数据库层没有开启行级隔离，只能靠应用代码自己加公司条件。 |
| 系统通道 | 后台任务/服务账号使用的一种特殊连接方式，可以跨公司读写，用于定时任务、对账、平台运维。 |

### 0.4 数字口径说明（避免和旧文档对不上）

本清单涉及三组对象，仓库里存在两套统计口径：

| 对象 | 计划口径（2026-11-17，基于克隆库） | 生产复核口径（2026-11-18，只读实测） | 本清单采用 |
|---|---|---|---|
| 宽松策略 | 226 张 | 8 张表仍带「空租户放行」分支；另有 370 条表级宽松策略分布在 290 张表，按 8 批收紧 | 按 8 批的**业务族**提问，数字差异不影响答案 |
| allow_all | 12 张 | 16 张（生产复核口径） | 16 张，按类别合并提问 |
| 无策略/未开隔离 | 81 张 | 87 张（全部 0 行） | 87 张，按 6 族提问 |
| 线下收紧回迁 | 318 张 | 318 张为历史中间态；按仓库终态重算，317 张已严格、1 张两侧同为放行 | 只对其中 **8 张 ERP 合并报表** 和 **55 张生产未开隔离** 提问 |

差异原因：计划口径基于落后于生产的克隆库，且分类阈值不同。**开窗前会用生产只读数据再对齐一次**，业务答案不受影响。

---

## 1. 最紧要的三件事（P0）

如果时间有限，请优先回答这三题，其余可以后补：

1. **Q14**：55 张「生产未开数据库隔离」的表，是否存在不带公司上下文的访问（定时任务、报表、服务账号、旧部署）？
2. **Q9**：`public` 下 52 张表里，哪些是「所有公司都能看的平台公共数据」，哪些是「各公司自己的业务数据」？
3. **Q-G3**：合并报表是否按「各公司关账后的期间快照 + 版本」出？请确认期间口径，以及合并取数是否只认子公司上报的关账数据。（技术侧已按此定稿，业务回执即可；见 2.7）

> 集团边界与子公司可见性已由业务定性（Q-G1/Q-G2 关闭），技术结论见 2.3、2.5。Q-G3 已由技术侧定稿（2026-11-21，业务回执即可），Q-G4～Q-G5 仍为「按通行做法暂定」，见 2.7。附录 E/F 是对应 Q14/Q9 的两份逐表材料；三题的默认处置与最小认领集见文末第 7 节。

---

## 2. ERP 合并报表族（8 张，单独成节）

### 2.1 现状（技术事实，不需要业务判断）

- 8 张表当前都只有一条策略，形状一致：
  `系统通道开启时放行全量，否则 tenant_id = 当前公司`。
- 数据库隔离（RLS）和强制隔离（FORCE）都已开启；普通用户查询只能看到当前公司。
- 生产实测 **8 张表均为 0 行**（功能尚未产生数据），因此现在调整策略没有数据搬迁风险。
- 仓库里另有一版「集团函数」写法 `erp.group_tenant_of()`，但该函数当前是**恒等函数**（输入什么返回什么），解析结果就是租户自身。迁移注释已明确：**本模型里 tenant 本身就是集团边界，成员公司是同一 tenant 下的 `hrm.companies` 行**。也就是说：切到仓库写法仍是租户级隔离，**不会**自动产生「母公司看子公司」的效果；缺的是公司（company）维度，不是租户上层的集团层。
- 唯一的实质行为差异在「系统通道」：生产版允许系统通道看全量，仓库版不允许。若有服务账号调用合并接口，切到仓库版会从「能看全量」静默变成「看到 0 行」。

### 2.2 逐表说明与需要确认的那一句

| 表（均在 `erp` 下） | 当前策略 | 生产实际可见范围 | 逐表核对项（总口径已由 2.3/2.7 定性覆盖，保留用于逐表验收） |
|---|---|---|---|
| `company_relations`（公司关系） | 系统通道全量，否则本公司 | 普通用户仅本公司；系统通道全量 | 集团内公司之间的持股/关联关系，是由集团统一维护、多家公司共享，还是每家公司各自维护自己的关系？ |
| `internal_transactions`（内部交易） | 同上 | 同上 | 内部交易台账是否允许集团财务跨多家公司汇总查看？ |
| `consolidation_scopes`（合并范围） | 同上 | 同上 | 合并范围（哪些公司纳入合并）由集团统一制定，还是各公司自建？ |
| `consolidation_scope_companies`（合并范围成员） | 同上 | 同上 | 一个合并范围能否包含「其他公司」作为成员？ |
| `consolidation_reports`（合并报表） | 同上 | 同上 | 一张合并报表生成后，除编制公司外，集团总部/审计是否也要能看？ |
| `consolidation_report_lines`（合并报表行） | 同上 | 同上 | 同上（报表行的可见范围是否与报表头一致）？ |
| `elimination_rules`（抵消规则） | 同上 | 同上 | 抵消规则是集团统一模板，还是每家公司维护自己的规则？ |
| `elimination_candidates`（抵消候选） | 同上 | 同上 | 抵消候选需要跨公司配对内部交易吗？如果需要，配对双方的数据是否都要可见？ |

### 2.3 业务定性（2026-11-21）

业务方先给出集团口径（原 Q1-Q3），随后又补了两条硬定性：

**已定性（不再作为开放问题）**

| 编号 | 结论 | 对原问题的处理 |
|---|---|---|
| Q-G1 集团边界形态 | **集团 = 一个租户下挂多家公司**（同一 `tenant_id` 下的多条 `hrm.companies`），不是多家租户同属一个集团；母公司是集团内一家，可看全部子公司 | 原 Q1「合并报表可见范围」关闭；原 Q3「是否启用集团-成员模式」关闭 |
| Q-G2 子公司可见性 | **子公司之间不可互看**，包括同一母公司下的兄弟公司；只有母公司向下看 | 新增定性，直接约束 2.5/2.6 的策略形状 |
| — 系统账号 | 是否有服务账号调用合并接口，并入 Q16「系统通道白名单」统一回答 | 原 Q2 合并 |

**技术侧已定稿 1 条 + 按通行做法暂定 2 条（详见 2.7）**

| 编号 | 状态 | 规则 |
|---|---|---|
| Q-G3 期间与版本 | **已定稿（待回执）** | 合并报表按各公司关账后的**期间快照**出；表带「期间 + 版本」；合并以子公司上报的关账数据为准。字段、唯一键、重算与跨期语义见 2.7 |
| Q-G4 管理动作边界 | 暂定 | 母公司对子公司允许管理性动作与流程操作（审批、下达、冻结、开关账期），但**不代子公司记账**；跨公司写默认禁止且必留痕 |
| Q-G5 历史归属 | 暂定 | 组织归属按**当时归属**看历史；关系需存期间快照，组织调整**不回溯改写**历史合并数 |

### 2.4 三类动作分别要怎么表达

定性里其实包含三种不同动作，不能都用同一种「放开」解决：

| 动作 | 数据边界 | 读/写 | 现在的技术可行性 | 应使用的授权表达 |
|---|---|---|---|---|
| 合并读（看合并报表/内部交易/抵消） | 同一租户内：本公司 + 母公司可见的子公司 | 读 | 租户策略不会挡（同一 `tenant_id`），但**策略里没有 company 维度**，现状是"同租户内公司彼此可见"→ 与「子公司不可互看」冲突，必须补 company 维度 | 母公司角色 + 可见子公司集合；子公司请求只放行本公司；不能用「集团内全可见」宽松策略 |
| 母子公司管理（维护合并范围、公司关系、子公司主数据） | 母公司对子公司 | 写 | 写仍落本公司 `company_id`；对子公司的管理动作需显式动作白名单 + 留痕，不代记账（Q-G4 暂定） | 集团管理员角色 + 动作白名单；审计记录操作人、目标公司、动作类型 |
| 浏览（查看子公司单据/报表详情） | 母公司读子公司明细 | 读 | 必须按业务域限定；若全业务放开，等于全库互相可见 | 集团浏览角色 + 只读；建议先只覆盖财务域 |

**三种动作的共同底线**：① 租户仍是隔离边界，不引入跨租户读；② 子公司之间（含兄弟公司）不共享读集合；③ 系统通道（`app.rls_system='on'`）只留给后台任务，不作为「集团可见」的实现手段。

### 2.5 模型核查：现有模型能不能承载集团层

先说结论（对应「零改动 / 加字段 / 新增一层」）：
- **不需要新增一层。** 租户已经是隔离边界，且迁移注释与真实外键都已把母子公司定义为同一 `tenant_id` 下的 `hrm.companies` 行。
- **也不是零改动。** 8 张合并表的策略只按 `tenant_id` 过滤，公司维度没有进策略；按「子公司不可互看」，现状「同租户内公司彼此可见」必须收紧。
- **准确说法：已有公司主体与母子公司关系（结构基本就位），缺的是 company 维度的策略与角色；只需给 4 张表补公司列，不是加集团层。**

依据（均为仓库现有代码/迁移）：

| 检查项 | 现状 | 证据 |
|---|---|---|
| 租户表没有上级/集团字段 | `core_tenants` 只有 `tenant_type`、`plan`、配额等，无 `parent_id` / `group_id` | `database/migrations/20261120235945_unified_core_schema_canonical.sql:328-353` |
| `hrm.companies` 就是公司（法人主体）主表 | 有 `legal_person`、`tax_number`、`registration_number`、`functional_currency`、`tenant_id`、`organization_id`；公司从属于租户 | `database/migrations/20261120235900_hrm_schema_canonical.sql:77-101` |
| 母子关系已存在且限定同租户 | `erp.company_relations` 有 `parent_company_id` / `child_company_id` / `effective_date` / `expiry_date`；外键为 `(tenant_id, company_id) → hrm.companies` | `database/migrations/20261121100000_erp_schema_canonical.sql:107-124`、`:898-905` |
| 合并迁移注释已固化「tenant 即集团边界」 | 原文：成员公司是同一 tenant 下的 `hrm.companies` 行；`group_tenant_of()` 只做恒等解析 | `database/migrations/20261114180000_erp_consolidation_group_tenant_rls.sql:12-23`、`:49-63`、`:65-71` |
| 合并族已有 4 张带公司列 | `consolidation_scope_companies.company_id NOT NULL`、`internal_transactions.from_company_id/to_company_id`、`elimination_candidates.from_company_id/to_company_id`、`company_relations.parent/child_company_id` | `20261121100000_erp_schema_canonical.sql:178-194`、`:410-433`；`20261109140100_p4_elimination_candidates.sql:10-24` |
| 另 4 张没有公司列 | `consolidation_scopes`、`consolidation_reports`、`consolidation_report_lines`、`elimination_rules` 只有 `organization_id` / `scope_id` / `report_id`，无 `company_id` | `20261121100000_erp_schema_canonical.sql:126-141`、`:143-177`、`:196-213`、`:268-286` |
| 期间有、版本无 | `consolidation_reports` 有 `period` / `year` / `month` / `quarter`，无版本列；`consolidation_report_lines` 只有 `current_period` / `prior_period`（金额），无期间与版本列 | `20261121100000_erp_schema_canonical.sql:143-177`、`:126-141` |
| 8 张策略只按 tenant | 策略形状 `tenant_id = app.tenant_id`（生产另含系统通道旁路），没有任何 company 谓词 | `20261121100000_erp_schema_canonical.sql:988-1004`；`20261114180000_erp_consolidation_group_tenant_rls.sql:30-37` |
| 身份只携带一个租户 | `Claims.tenant_id: Option<String>`，没有 company / 可见公司集合 | `lib/shared-auth/src/auth.rs:44` |
| 作用域只有「租户 / 系统」两态 | `ScopeInner::Tenant(Uuid)` / `ScopeInner::System`；无公司维度 | `lib/shared-auth/src/middleware/tenant_scope.rs:53-63`、`:100-122` |
| 数据权限按租户键控 | `iam.data_permissions.tenant_id NOT NULL`，无公司维度授权 | `database/migrations/20260716000002_create_resource_permissions_table.sql:12-19` |

### 2.6 最小改动面（公司维度）与实测影响

按「一步到位 + 通用」的目标，最小方案是把**公司维度**接进策略与授权，不碰租户边界：

1. **结构（1 个迁移，4 张表）**：给 `consolidation_scopes`、`consolidation_reports`、`consolidation_report_lines`、`elimination_rules` 补 `company_id`；`consolidation_reports` / `report_lines` 另补 `period_version`（Q-G3 定稿规则，见 2.7）。其余 4 张已带公司列，不动结构。
2. **身份与作用域（2 个文件）**：`Claims` 增加 `company_id`（可由租户默认公司解析）；`TenantScope` 增加公司只读维度与「母公司可见集合」；新增 GUC `app.company_id` / `app.visible_company_ids`。**不引入跨租户读。**
3. **策略（8 张表）**：
   - 写：`company_id = app.company_id`（写仍限本公司，不代子公司记账）；
   - 读：`company_id = app.company_id OR (app.actor_is_parent AND company_id = ANY(app.visible_company_ids))`；
   - 可见集合按 `erp.company_relations` 的有效期解析；**兄弟公司不进入彼此集合**。
4. **授权（iam 1-2 张）**：母公司合并读角色、集团管理员动作白名单（审批/下达/冻结/开关账期，均留痕）；可复用 `iam.data_permissions` 加公司维度，或新增公司授权表。
5. **影响数量（实测）**：结构 4 张 + 策略 8 张 + 身份 2 个文件 + 授权 1-2 张。若「浏览」扩到全部业务 → **290 张**（附录 A）+ **55 张**（附录 E），接近全库放开，必须先限定财务域。
6. **系统通道复核（不改表）**：集团能力落地后，把靠系统通道实现跨公司读写的任务逐条迁到公司授权，收缩白名单。

**必须等业务再确认的**：Q-G4（管理动作清单与留痕粒度，决定授权表设计）、Q-G5（历史归属快照，决定 `company_relations` 是否按期间存快照）。Q-G3 已定稿，只需业务回执（见 2.7），不再阻塞结构设计。

### 2.7 问题状态：已定性 / 按通行做法暂定

**Q-G1（已定性，仅需回执）集团与母子公司在系统里是什么关系？**

业务口径：**一个租户下挂多家公司**（同一 `tenant_id` 的多条 `hrm.companies`），母公司是其中一家，可看全部子公司。技术侧据此确认：不新增租户级集团层，公司维度复用现有 `hrm.companies` + `erp.company_relations`。

**Q-G2（已定性，仅需回执）子公司之间能否互看？**

业务口径：**不可互看，包括同一母公司下的兄弟公司**；只有母公司向下看。技术侧据此确认：不能使用「同租户内全可见」的宽松读策略，必须按公司集合收敛。

**Q-G3（已定稿，待业务回执）合并报表的期间口径与版本**

状态：2026-11-21 技术侧定稿。业务只需回执「按子公司关账数据、期间 + 版本」这一条，字段与唯一键不再作为待确认项。

1. **数据来源（关账快照）**：只读子公司在该期间**已关账/已上报**的结账数据，不读实时账簿；关账后的调整通过新版本体现，不原地改数。
2. **字段**：
   - `consolidation_reports`：沿用 `period`（`YYYY-MM`）、`year`/`month`/`quarter`（由 period 派生落库）；W9-A 新增 `company_id`（编制公司）与 `period_version int NOT NULL DEFAULT 1`。
   - `consolidation_report_lines`：W9-A 新增 `company_id` 与 `period_version`；行的 `period_version` 必须等于所属报表头（写入端校验或触发器）。
   - `company_breakdown` 保留为成员公司拆分明细；`prior_period` 为生成时冻结的上期数，不在查询时重算。
3. **唯一键**：
   - 报表头：`UNIQUE (tenant_id, scope_id, report_type, period, period_version) WHERE deleted_at IS NULL`。
   - 报表行：`UNIQUE (report_id, line_no)`（`report_id` 已锁定版本，行上的 `period_version` 为冗余校验/查询列）。
   - `report_no` 建议 `{scope.code}-{period}-v{period_version}`，避免同期间多版本重号。
4. **重算与版本切换**：首次生成 v1（draft → approved → published）；数据变化或抵消调整时**新建 v(N+1)**，旧版本只读保留；「当前版本」= 同一 `(tenant_id, scope_id, report_type, period)` 下 `status='published'` 且 `period_version` 最大者，不新增指针列；`published_at` 一经写入不回退，撤回也走新版本。
5. **跨期查询语义**：默认按 `period` 取该期最大 published 版本；显式传 `period_version` 时精确取该版本（审计/重述对比）；同一报表的行禁止跨版本混拼；跨期汇总按各期最新 published 版本再汇总，`prior_period` 使用生成时冻结值。
6. **原暂定口径（留档）**：按各公司关账后的期间快照出；表带「期间 + 版本」；合并以子公司上报的关账数据为准。原待确认的「关账口径（月/季/年）、版本是否允许重述、重述后历史版本是否保留」，本定稿按「由 `period` 派生月/季/年、允许重述、历史版本保留」处理。
7. **若业务后续改为实时汇总，返工面**：
   - 表：`consolidation_reports` / `consolidation_report_lines` 的版本快照语义作废，需新增实时聚合视图或物化视图（1-2 个对象）；`consolidation_scopes` / `scope_companies` 成员改为实时解析；`elimination_rules` / `elimination_candidates` 需连续重算。
   - 代码：`svc/erp/src/modules/consolidation/` 的 `reports.rs`、`elimination_flow.rs`、`internal_transactions.rs`、`common.rs` 改为读实时账簿，并增加聚合/缓存层（约 4-5 个文件 + 可能新增定时任务）。
   - 迁移：需要 1 组结构调整（撤版本唯一键、建视图/索引、回填），`period_version` 列保留但不再承担快照主键语义。
   - 策略：8 张表的公司维度 RLS **不需要改形状**；但实时聚合若走后台系统通道，需扩大 Q16 白名单。整体属**中等返工**，不影响租户边界与已定的公司可见集合。

**Q-G4（按通行做法暂定，待确认）母公司对子公司的管理动作边界**

- 暂定：允许管理性动作与流程操作（审批、下达、冻结、开关账期），**不代子公司记账**；跨公司写默认禁止且**必留痕**。
- 待确认：动作清单（哪些算管理动作）、留痕字段（操作人/目标公司/动作/前后值）、由谁维护母子关系（集团管理员 or 平台运维）。
- 技术后果：决定授权表与审计字段；写路径仍落本公司 `company_id`，不开放代记账。

**Q-G5（按通行做法暂定，待确认）组织归属与历史合并数**

- 暂定：按**当时归属**看历史；关系存期间快照；组织调整**不回溯改写**历史合并数。
- 待确认：归属快照按期间存还是按变更事件存；跨期调整是否需要「追溯重述」例外。
- 技术后果：`erp.company_relations` 已有 `effective_date` / `expiry_date`，可支撑「当时归属」；若要求逐期快照，需新增关系快照表或按期间归档。层级深度（单层/多层）由实际关系数据决定，按递归解析，不再单独提问。

---

## 3. 第一批到第八批：宽松策略收紧（按业务族）

> 说明：以下 8 批共 370 条宽松策略、290 张表（去重）。附录 A 是逐批表名。每批只需回答 1 题；若批内有个别表例外，请注明表名。
> 共同后果：**选「单公司」后，凡是依赖「看不到也能查到别家」的功能会立刻变空；选「共享」但技术上仍按单公司收紧，则会出现越权可见。** 两种错误都不会报错，只会静默返回错误的数据，所以必须事先定清楚。

### 3.1 第一批：周边服务（通知、财务插件、运输、门户、工单）

对象：`communication`（5）、`plugin_finance`（6）、`tms`（4）、`portal`（2）、`ticket`（1）、`plugin_mes`（1）、`unified_core`（1），共 20 张。

**Q4（必须回答）这些周边数据是否存在跨公司共享的合法场景？**

- A. 全部单公司：通知、运单、工单附件、看板统计都只属于当前公司。
- B. 部分是平台模板：例如通知模板、承运商/线路基础资料由平台统一维护，所有公司只读。
- C. 部分是集团共享：例如集团统一物流调度，需要跨公司看运单。
- D. 暂不确定。

技术后果：选 A 可直接收紧；选 B 需要先把模板类数据的归属改成「平台级」，否则收紧后所有公司都看不到模板；选 C 需要集团模型，本批无法单独上线。

### 3.2 第二批：分析与研发（报表、数据集、看板、知识库、研发项目）

对象：`rs`（15）、`analytics`（11）、`bi`（7）、`core` 知识库/AI（7），共 40 张。

**Q5（必须回答）报表、数据集、看板、研发项目是否允许跨公司共享？**

- A. 仅创建者所在公司可见。
- B. 同公司内按角色/部门共享，跨公司不共享。
- C. 平台预置的报表模板/看板模板对所有公司只读，用户自建内容不共享。
- D. 集团内共享（例如集团统一经营分析）。
- E. 暂不确定。

技术后果：选 A/B 可直接收紧；选 C 需要区分「模板」与「用户内容」两类行，模板行要改成平台级；选 D 需要集团模型。若实际有「分享链接给其他公司」的功能而选了 A，上线后分享链接会全部失效。

### 3.3 第三批：身份与客户（用户、岗位、权限模板、CRM）

对象：`iam`（15）、`crm`（14），共 29 张。

**Q6（必须回答）客户资料、用户岗位、权限模板的归属边界是什么？**

- A. 每家公司的客户、岗位、权限完全独立。
- B. 权限模板、岗位模板由平台预置，所有公司只读；客户资料各公司独立。
- C. 客户资料集团共享（集团客户主数据），岗位权限各公司独立。
- D. 全部集团共享。
- E. 暂不确定。

技术后果：选 A 可直接收紧；选 B 需要把模板类数据标为平台级，否则新公司开通后看不到任何权限模板；选 C/D 需要集团模型，且客户资料跨公司可见属于敏感数据，必须同时明确「谁有编辑权」。

### 3.4 第四批：质量管理（检验、审核、APQP、FMEA、SPC）

对象：`qms` 27 张。

**Q7（必须回答）质量标准和检验记录是否跨公司共享？**

- A. 各公司独立，质量标准也由各公司自建。
- B. 质量标准/检验规范由集团统一维护，所有公司只读；检验记录各公司独立。
- C. 集团内质量数据互通（例如集团质量部查看各公司检验结果）。
- D. 暂不确定。

技术后果：选 A 可直接收紧；选 B 若不先把标准标为平台级，收紧后新公司看不到标准、无法发起检验；选 C 属于跨公司可见敏感质量数据，需要集团模型与授权规则。

### 3.5 第五批：人力资源（员工、组织、薪酬、考勤、招聘、培训）

对象：`hrm` 29 张。

**Q8（必须回答）集团 HR 是否需要跨公司查看员工与薪酬数据？**

- A. 不需要，各公司 HR 只看本公司。
- B. 需要，集团 HR 可查看全部公司，但只能看、不能改。
- C. 需要，集团 HR 可查看并维护全部公司。
- D. 暂不确定。

技术后果：选 A 可直接收紧；选 B/C 不能用「宽松策略」实现，必须走专门的集团 HR 角色 + 系统通道，否则等于对所有公司放开薪酬数据。**这是本清单中越权风险最高的一批**，请优先确认。

### 3.6 第六批：平台公共域（`public` 52 张）

对象：工作流、审批、文件、通知、邮件、文档、财务凭证、报表、系统设置、看板快照等，共 52 张。

**Q9（必须回答）`public` 下哪些是「所有公司都能看的平台公共数据」，哪些是「各公司自己的业务数据」？**

请按下列分组各选一次：

| 分组 | 代表表 | 你们的判断（平台公共 / 各公司业务 / 混合，请注明） |
|---|---|---|
| 菜单、字典、引导、系统设置 | `system_settings`、`core_guide_*`、`core_faqs` | |
| 文件与文档 | `core_files`、`core_file_folders`、`core_doc_*` | |
| 通知与邮件 | `core_notifications`、`core_notification_templates`、`core_emails` | |
| 审批与工作流 | `approvals`、`approval_records`、`core_workflow_*` | |
| 财务凭证与报表 | `core_finance_*`、`finance_voucher_templates`、`financial_reports` | |
| 主数据引用与变更日志 | `core_master_data_*`、`core_mdm_*` | |
| 各模块看板快照 | `*_dashboard_snapshots` | |
| 归档/历史表 | `_archive_core_workflow_*`、`core_migration_history` | |

- A. 已按上表标注清楚。
- B. 需要我们先按「行数 + 代码引用」给出建议分组，你们再确认。
- C. 暂不确定。

技术后果：把业务数据误判为平台公共 → 所有公司互相可见；把平台公共误判为业务数据 → 所有公司的菜单/字典/系统设置变空，系统可能无法正常打开。选 B 时我们先出分组建议，仍需要你们最终确认。

**Q9 状态（2026-11-21）：按附录 F 分组给出处置，业务只需认领 9 张不确定项**

- **公共字典 7 张 → 平台只读**：`core_doc_templates`、`core_faqs`、`core_flow_categories`、`core_guide_lessons`、`core_guides`、`core_notification_templates`、`finance_voucher_templates`。策略形状为「已认证租户可 SELECT，写仅平台角色」，不按 `tenant_id` 过滤。
- **业务数据 36 张 → 租户隔离**：按 `tenant_id = app.tenant_id` 收紧；其中 `approvals`、`approval_records`、`core_workflow_instances`、`core_workflow_tasks` **缺 `tenant_id` 列，须先补列**再收紧。
- **不确定 9 张 → 暂保持现状 + 待认领**：未回答前不收紧、不开放，避免误伤。逐张只问一个事实：

| 表 | 判断所需的那一个事实问题 |
|---|---|
| `_archive_core_workflow_instances` | 归档流程实例是否仍需在线查询？若需要，是平台运维只读，还是各公司查自己的？ |
| `_archive_core_workflow_versions` | 归档流程版本是否只用于审计追溯（平台只读），公司不需要查看自己的历史版本？ |
| `core_inter_module_sync` | 同步游标是按「模块 + 公司」各一行，还是全平台一行？ |
| `core_migration_history` | 迁移历史是否只由平台运维读取，公司完全不需要看到行？ |
| `core_tenant_modules` | 模块目录是平台统一（所有租户可读），还是各租户只能看自己的开通状态？ |
| `cqrs_events` | 事件载荷是否包含跨公司数据？若只含单公司，是否可加 `tenant_id` 并按公司隔离？ |
| `monitor_settings` | 监控设置是平台统一一套，还是每家公司可各自覆盖？ |
| `search_entity_projections` | 搜索投影是否跨公司合并？公司用户搜索时是否必须只命中本公司数据？ |
| `system_settings` | 设置项是否分为平台级（全公司共用）与公司级（可覆盖）两组，还是全部平台级？ |

分组计数核对：公共字典 7 + 业务数据 36 + 不确定 9 = 52。默认处置与负责人见第 7 节。

### 3.7 第七批：主数据（物料、供应商、BOM、版本、质量与治理）

对象：`master_data` 82 张。

**Q10（必须回答）主数据是由平台/集团统一维护，还是各公司自维护？**

- A. 各公司自维护，互不可见。
- B. 平台统一维护，所有公司只读（例如标准物料库、计量单位）。
- C. 集团统一维护，集团内公司只读。
- D. 混合：部分标准库统一、部分公司自建（请说明哪些）。
- E. 暂不确定。

技术后果：选 A 可直接收紧；选 B 需要把标准数据标为平台级并保留只读，否则所有公司看不到物料/供应商；选 C 需要集团模型；选 D 需要逐类标注，工作量取决于类别数量。

### 3.8 第八批：ERP 业务（账套、科目、资产、库存、采购、凭证）

对象：`erp` 11 张（不含第 2 节的 8 张合并报表）。

**Q11（必须回答）ERP 账套与凭证类数据是否跨公司可见？**

- A. 各公司独立建账，互不可见。
- B. 集团一套账、多家公司共用（需要明确哪些公司共用一个账套）。
- C. 各公司独立建账，但集团财务可跨公司查询（只读）。
- D. 暂不确定。

技术后果：选 A 可直接收紧；选 B 与当前「一家公司一个隔离边界」的模型冲突，需要先改账套模型；选 C 需要集团财务角色 + 系统通道，不能用宽松策略代替。

---

## 4. 三类特殊对象

### 4.1 allow_all（16 张，全部放行）

对象：`bi.audit_logs`、`core.core_plugins`、`erp.dict_items`、`erp.dict_types`、`gis.geodata`、`gis.geofeatures`、`gis.map_layers`、`gis.spatial_analysis`、`hrm.initialization_logs`、`pdm.pdm_master_data_refs`、`portal.portal_quick_actions`、`public.core_operation_logs`、`public.subscriptions`、`qms.quality_inspections`、`qms.quality_standards`、`rs.formulas`。

现状：这些表要么是「平台目录」（字典、插件市场、公式库），要么是「按设计应属于公司、但尚未产生数据」的业务表（审计、订阅、检验、GIS）。当前大多 0 行，唯一有数据的是 `hrm.initialization_logs`（1 行，代码已绑定公司）。

**Q12（必须回答）这 16 张里，哪些确实是「所有公司都可以看」的平台目录？**

- A. 只有字典、插件、公式、门户快捷入口是平台目录，其余（审计、订阅、检验、GIS、HR 初始化日志）属公司数据。
- B. 全部是平台目录。
- C. 全部是公司数据（平台目录另有权威表）。
- D. 需要逐表确认（我们可提供逐表行数与代码路径）。

技术后果：选 A 可分批处理：目录类改成「平台级只读」，业务类严格隔离；选 B 会让审计/订阅等敏感数据对所有公司可见；选 C 会让字典/插件市场对所有公司变空。

### 4.2 无策略/未开隔离（87 张，全部 0 行）

对象分 6 族：

| 族 | 数量 | 性质 | 代表表 |
|---|---:|---|---|
| `bi` 分析派生表 | 8 | 代码在用、已改为请求内过滤 | `bi.analytics_comparison_*`、`bi.analytics_drilldown_*` |
| `qms` 检验标准表 | 3 | 代码在用 | `qms.qa_inspection_*`、`qms.qa_sampling_plans` |
| `public` 副本表 | 13 | 2 张在用（文件权限、监控阈值），11 张是权威表的空副本 | `public.core_file_permissions`、`public.core_tickets` |
| `iam` 历史副本 | 44 | 1 张在用（租户插件），43 张空副本 | `iam.core_tenant_plugins`、`iam.core_billing_*` |
| `flow` 历史副本 | 18 | 当前无服务使用，但历史嵌入式部署可能用过 | `flow.core_doc_*`、`flow.core_workflow_*` |
| `plugin_erp` 副本 | 1 | 财务科目表的空副本 | `plugin_erp.accounting_subjects` |

**Q13（必须回答）这些表是否还有业务用途？能否按「历史副本」下线？**

- A. 确认全部可下线（除已注明的在用表）→ 我们出 DROP 清单，开窗一并清理。
- B. 保留，但补严格隔离 → 不影响业务，仅增加存储与维护成本。
- C. 仍有旧版/嵌入式部署在用（尤其 `flow` 族）→ 暂缓，需先确认旧部署下线时间。
- D. 暂不确定。

技术后果：选 A 最干净，但若旧部署仍在用 `flow` 族，可能导致旧环境菜单/流程打不开；选 B 不会破坏功能；选 C 会让「未开隔离」风险继续存在。

### 4.3 生产「RLS 关闭」55 张（必须先确认访问路径）

现状：这 55 张表在生产**没有开启数据库隔离**，仓库侧已经写好严格策略，回迁时会一次性打开。逐表名单与代码调用点见**附录 E**；开窗前仍建议按附录 D 的只读查询复核一次。

当前它们靠什么隔离，只有三种可能，需要逐一确认：

| 隔离方式 | 含义 | 打开数据库隔离后的后果 |
|---|---|---|
| 应用层过滤 | 所有读写 SQL 都显式带 `tenant_id = 当前公司` | 安全；但要确认没有遗漏的裸查询（我们可自查代码） |
| 单租户部署 | 这套库只服务一家公司，天然不会串数据 | 打开隔离后，若代码没带公司上下文，会变成 0 行；需先补齐上下文 |
| 无隔离 | 既没数据库隔离，应用层也没过滤 | 打开隔离是修复；但在补齐代码前，任何直连都能读全表 |

**Q14（必须回答）这 55 张表的访问路径是哪一种？**

- A. 全部走应用层过滤，没有后台任务/报表/服务账号直连 → 可以开窗打开隔离。
- B. 有定时任务/报表/对账程序在无公司上下文下读写 → 需要先列出这些程序，改成显式传入公司身份，或加入系统通道白名单。
- C. 存在单租户/嵌入式旧部署直连 → 需要先确认旧部署是否还在运行。
- D. 不清楚 → 附录 E 已给出逐表功能与调用点，可直接按表勾选「应用层过滤 / 单租户部署 / 无隔离 / 可下线」。

技术后果：选 A 可直接开；选 B 打开隔离后相关任务会静默读到 0 行或写入被拒（表现为报表为空、同步失败）；选 C 可能导致旧部署不可用；选 D 我们可先做代码侧自查，但仍需要你们确认「是否有外部程序直连数据库」。

**Q14 状态（2026-11-21）：技术侧默认处置已定，业务最小认领集 2 张**

已核实（附录 E.4）：55 张里只有 2 张有仓库内运行期调用；其余 53 张无 schema 限定调用。附录 E.1 里 `core_tickets`、`conversion_rules`、`conversion_executions` 的“裸名”实为 Rust 模块名或 `ticket.` / `integration.` 限定，不构成 `public.<表>` 的运行期调用。

| 表 | 当前靠什么隔离 | 建议处置 |
|---|---|---|
| `iam.tenant_permissions` | 应用层读写均显式带 `tenant_id`（`database_permission_store.rs:220/285/338/366/396/428/479/574`）；生产未开 RLS | **先代码自检再开**：确认这些连接都设置在请求事务内并注入 `app.tenant_id`，然后按仓库严格策略打开；在自检通过前保持现状 |
| `public.core_users` | analytics 只读且已带 `tenant_id` 谓词（`svc/analytics/src/main.rs:328/385/426`）；全仓无写入；生产未开 RLS | **可直接开租户隔离**：只读路径已满足谓词；现状看板用户计数即为 0，打开后不恶化 |

**默认处置（53 张，已落定、不需业务逐张回答）**：无仓内调用且无外部接入证据 → **保持现状（既不打开隔离，也不调整策略）+ 标注待认领**；若后续 Q16 或 Q14-B 确认存在外部直连/旧部署，再把对应表移入认领集。其中 `plugin_erp.accounting_subjects` 额外标注「DROP 候选」（权威表为 `finance.accounting_subjects`），但不在本次动作内。

**必须业务确认的最小清单（2 张）**：`iam.tenant_permissions`、`public.core_users`。逐表结论见第 7 节。

---

## 5. 跨批次的总则问题

**Q15（必须回答）平台级数据由谁维护、谁可见？**

平台级数据指不属于任何公司的公共行（菜单、字典、模板、标准物料等）。

- A. 由平台运维统一维护，所有公司只读。
- B. 由集团总部维护，集团内公司只读。
- C. 由各公司自己维护，不存在平台级数据。
- D. 混合（请说明哪些由平台维护）。

技术后果：这决定「平台级只读」策略的范围。选 C 但实际存在公共菜单/字典，会导致所有公司看不到这些数据；选 A/B 但缺少维护方，公共数据会长期无人更新。

**Q16（必须回答）哪些后台任务/服务账号需要跨公司访问？**

- A. 没有，所有任务都按公司逐个执行。
- B. 有，平台运维/对账/报表汇总需要跨公司（请列出任务名称）。
- C. 有，外部系统对接需要跨公司（请说明对接方）。
- D. 暂不确定。

技术后果：跨公司访问只能走系统通道白名单。白名单越宽，越权风险越大；完全不设，则合法的平台任务会失效。

**Q17（必须回答）是否还有程序在「没有公司身份」的情况下读写业务表？**

历史上有一些程序用空值/全零公司 ID 作为「平台」标记，数据库策略对这类值是放行的。

- A. 没有，所有程序都会带公司身份。
- B. 有，启动初始化/定时任务会这样用（请说明）。
- C. 不确定。

技术后果：若仍有这类调用，收紧后会读不到数据或写入失败；这类问题通常在上线后才发现，建议开窗前确认。

---

## 6. 分工：我们能定的 vs 必须等业务的

### 6.1 我们自己能定的（不需要业务回答）

| 编号 | 事项 | 依据 | 结论 |
|---|---|---|---|
| S1 | 合并报表 8 张表的代码是否都已复用请求内事务 | `svc/erp/src/modules/consolidation/*` 全部使用请求事务，无裸池 | 代码侧无需改造；只差业务口径 |
| S2 | 合并报表 8 张表的生产策略实测 | 生产只读盘点：每表仅 1 条旧形状策略，不含集团函数；账本 success 不能作为策略已生效的证据 | 验收必须读 `pg_policies`，不能只查迁移账本 |
| S3 | 318 张线下收紧回迁的机械性 | 用终态库对生产镜像重算：317 张已严格，1 张 `bi.audit_logs` 两侧同为放行 | 回迁脚本可机械生成；只剩 8 张合并族与 55 张未开隔离需要定性 |
| S4 | 87 张无策略表是否为空、是否有代码引用 | 生产实测全部 0 行；全仓检索仅少量在用表有引用 | 43 张 `iam` + 18 张 `flow` + 11 张 `public` + 1 张 `plugin_erp` 属历史副本，可列 DROP 候选 |
| S5 | 16 张 allow_all 的行数与代码路径 | 仅 `hrm.initialization_logs` 有 1 行；其余 0 行；逐表代码路径已盘点 | 目录类与业务类可先分组，等 Q12 确认 |
| S6 | 合并报表族是否已有集团层级模型 | `hrm.companies` 是公司主表；`erp.company_relations` 有母子公司与有效期，外键限定同租户；`group_tenant_of()` 为恒等函数 | 租户即边界已固化，公司维度已有；缺的是 4 张表的公司列与 8 张表的策略/角色 |
| S7 | 55 张未开隔离表的「仓库有策略 / 生产无隔离」差分 | 需生产只读导出（附录 D） | 导出后即可给出逐表清单，不需要业务参与 |

### 6.2 必须等业务的（开窗前置）

| 优先级 | 问题 | 阻塞对象 | 不回答的后果 |
|---|---|---|---|
| P0 | Q-G1、Q-G2 | —（已定性，仅需回执） | 已关闭；技术方案见 2.5/2.6，无需等待 |
| P0 | Q14 | 55 张生产未开隔离表 | **已定默认处置**：53 张保持现状+待认领，仅 2 张需业务认领（`iam.tenant_permissions`、`public.core_users`），见 4.3/第 7 节 |
| P0 | Q9 | `public` 52 张 | **已分组**：7 公共字典 + 36 业务数据按默认处置落定，仅 9 张不确定项需业务各答一个事实问题，见 3.6/第 7 节 |
| P0 | Q-G3 | 合并报表 8 张 | **已定稿（待回执）**：期间 + 版本、以子公司关账数据为准；字段/唯一键/重算/跨期语义见 2.7 |
| P1 | Q4-Q8、Q10、Q11 | 8 批宽松策略 | 选错会导致合法跨公司查询被挡或越权可见 |
| P1 | Q-G4、Q-G5 | 合并族写权限与历史归属 | 决定授权表、审计字段与关系快照设计 |
| P2 | Q15、Q16 | 平台级数据与系统通道总则 | 影响所有批次的白名单与平台级策略范围 |
| P2 | Q12、Q13、Q17（已降级为抽认） | allow_all 16 张 / 无策略 87 张 / 无公司身份调用 | 技术侧已自查；业务只需抽认是否有例外 |

### 6.3 相对原 17 题的变化

| 变化 | 原题 | 说明 |
|---|---|---|
| 关闭（2） | Q1、Q3 | 业务已定性「集团口径」，且明确集团 = 同一租户下多家公司 |
| 合并（1） | Q2 → Q16 | 系统账号问题统一并入系统通道白名单 |
| 降级为「技术自查 + 业务抽认」（3） | Q12、Q13、Q17 | Q13 的 87 张已实测 0 行、无仓库运行期引用；Q17 已全仓扫描，只剩外部直连需确认；Q12 已给出目录类/业务类分组 |
| 保留待答（11） | Q4-Q11、Q14、Q15、Q16 | 仍需业务按族/按表确认 |
| 新增（5） | Q-G1～Q-G5 | Q-G1、Q-G2 当日已定性（仅回执）；Q-G3 已由技术侧定稿（待回执）；Q-G4～Q-G5 按通行做法暂定，待确认 |

计数核对：17 = 关闭 2 + 合并 1 + 降级 3 + 保留 11；新增 5 不在原 17 题内。

---

## 7. 可执行默认处置表（2026-11-21）

> 口径：能定的先定，只把「有运行期调用」或「有明确外部接入证据」的表留给业务认领。本节动作均为后续窗口执行，本文档不改迁移与代码。

### 7.1 Q14：55 张生产未开隔离表

| 范围 | 张数 | 默认动作 | 负责人角色 | 状态 |
|---|---:|---|---|---|
| `iam.tenant_permissions` | 1 | 先确认请求事务注入 `app.tenant_id`，自检通过后按仓库严格策略打开租户隔离 | 统一权限模块负责人 + DBA | 待认领（技术自检） |
| `public.core_users` | 1 | 直接打开租户隔离（analytics 只读已带 `tenant_id` 谓词） | analytics 负责人 + DBA | 待认领（业务回执） |
| `iam` 其余表 | 42 | 保持现状 + 标注待认领；不收紧、不开放 | 平台运维 / DBA | 默认落定 |
| `public` 其余表 | 10 | 保持现状 + 标注待认领；不收紧、不开放 | 平台运维 / DBA | 默认落定 |
| `plugin_erp.accounting_subjects` | 1 | 保持现状 + 标注 DROP 候选（权威表 `finance.accounting_subjects`） | 平台运维 / DBA | 默认落定 |

小计：**55 张 = 默认落定 53 + 待认领 2**。

### 7.2 Q9：`public` 52 张

| 范围 | 张数 | 默认动作 | 负责人角色 | 状态 |
|---|---:|---|---|---|
| 公共字典（附录 F） | 7 | 平台只读：已认证租户可 SELECT，写仅平台角色，不按 `tenant_id` 过滤 | 平台运维 + 产品 | 默认落定 |
| 业务数据（附录 F） | 36 | 按 `tenant_id` 租户隔离；其中 `approvals`、`approval_records`、`core_workflow_instances`、`core_workflow_tasks` **已补列并开隔离**（`tenant_id` 列 2026-11-22 复核时已存在；W10 补租户索引并把策略归一为显式 `WITH CHECK`） | 各业务域负责人 + DBA | 默认落定 |
| 不确定（附录 F） | 9 | 保持现状 + 逐张回答 3.6 表中那一个事实问题；未答前不收紧、不开放 | 业务方（按表归属）+ DBA | 待认领 |

小计：**52 张 = 默认落定 43 + 待认领 9**。

### 7.3 Q-G3：合并报表 8 张

| 范围 | 张数 | 动作 | 负责人角色 | 状态 |
|---|---:|---|---|---|
| `erp` 合并报表族 | 8 | 按 2.7 定稿实施：期间 + `period_version`、以子公司关账数据为准；W9-A 已加列，后续补唯一键与写入校验 | ERP 合并模块负责人 + 财务 | 已定稿（待业务回执） |

### 7.4 覆盖与认领汇总

- 覆盖表数：**107 张 = 55（Q14）+ 52（Q9）**；另 Q-G3 的 8 张合并表为规则定稿，不重复计入。
- 已按默认处置落定：**96 张**（Q14 53 + Q9 43）。
- 仍需业务认领：**11 张**，逐条如下：
  1. `iam.tenant_permissions`（Q14，技术自检后打开）
  2. `public.core_users`（Q14，直接打开）
  3. `_archive_core_workflow_instances`（Q9，归档是否需在线查询）
  4. `_archive_core_workflow_versions`（Q9，归档版本是否平台只读）
  5. `core_inter_module_sync`（Q9，游标按模块+公司还是全平台）
  6. `core_migration_history`（Q9，是否仅平台运维可读）
  7. `core_tenant_modules`（Q9，平台目录还是租户自见）
  8. `cqrs_events`（Q9，事件是否跨公司）
  9. `monitor_settings`（Q9，平台统一还是公司覆盖）
  10. `search_entity_projections`（Q9，搜索是否跨公司）
  11. `system_settings`（Q9，平台级/公司级如何分组）
- 另需业务回执（非逐表认领）：**Q-G3 1 条**。

### 7.5 W10 执行记录：`public` 审批 / 流程 4 表（2026-11-22）

| 表 | `tenant_id` | RLS / FORCE | 策略 | `tenant_id` 索引 | NULL 行 |
|---|---|---|---|---|---|
| `approvals` | 已有（可空 uuid） | 已开 | `rls_tenant_isolation`，补显式 `WITH CHECK` | 本次新增 `idx_approvals_tenant_id` | 0 |
| `approval_records` | 已有（可空 uuid） | 已开 | 同上 | 本次新增 `idx_approval_records_tenant_id` | 0 |
| `core_workflow_instances` | 已有（可空 uuid） | 已开 | 已是 `USING + WITH CHECK`，归一后不变 | 本次新增 `idx_core_workflow_instances_tenant_id` | 0 |
| `core_workflow_tasks` | 已有（可空 uuid） | 已开 | 同上 | 本次新增 `idx_core_workflow_tasks_tenant_id` | 0 |

**只读核实结论（2026-11-22，`topems_prod` / `topems_gate`）**：四张表均 0 行（`pg_stat_user_tables.n_tup_ins = 0`），无任何外键；数据归属只能按值连接推导：

| 路径 | 推导 | 命中 / 总行 |
|---|---|---:|
| P1 | `approvals.workflow_instance_id → core_workflow_instances.id → tenant_id` | 0 / 0 |
| P2 | `approval_records.approval_id → approvals.id → tenant_id` | 0 / 0 |
| P3 | `core_workflow_instances.workflow_id → core_workflows.id → tenant_id` | 0 / 0 |
| P4 | `core_workflow_tasks.instance_id → core_workflow_instances.id → tenant_id` | 0 / 0 |

- **推不出归属、需业务确认回填口径的行数：0 行（四张表均为空）**，因此本波不产生待认领项。
- 不采用「发起人 / 审批人 / 操作人 → 用户所属租户」：`iam.users` 无 `tenant_id`，`iam.core_tenant_users` 是多对多，无法推出唯一归属。后续若出现新数据，推不出的行保持 `NULL`，由策略 fail-closed 挡住，不写哨兵值。
- 迁移：`database/migrations/20261122150000_public_approval_workflow_tenant_isolation.sql`；回滚：`database/rollback/20261122150000_public_approval_workflow_tenant_isolation.rollback.sql`。
- 回滚后形态：`tenant_id` 列与已回填值保留（列是迁移前既有资产）；删除 4 条租户索引；`approvals` / `approval_records` 回到「严格 `USING`、无 `WITH CHECK`」的迁移前生产形态，`core_workflow_*` 形状不变。

---

## 附录 A：8 批对象清单（按批去重）

> 来源：`docs/database/rls-policy-inventory-b4.md` §A（370 条策略，去重后 290 张表）。同一张表可能有多条策略，按表处理。

**batch01**（20 表）

`communication.core_email_templates`、`communication.core_notification_deliveries`、`communication.core_notification_preferences`、`communication.core_notification_subscriptions`、`communication.notification_channels`、`plugin_finance.accounting_subjects`、`plugin_finance.difference_adjustments`、`plugin_finance.reconciliation_item_snapshots`、`plugin_finance.reconciliation_settlement_links`、`plugin_finance.reconciliation_snapshots`、`plugin_finance.settlement_snapshots`、`plugin_mes.audit_logs`、`portal.portal_dashboard_stats`、`portal.portal_notifications`、`ticket.ticket_attachments`、`tms.carriers`、`tms.drivers`、`tms.tms_routes`、`tms.tms_shipments`、`unified_core.inter_module_sync`

**batch02**（40 表）

`analytics.analytics_comparison_analyses`、`analytics.analytics_comparison_results`、`analytics.analytics_dashboard_shares`、`analytics.analytics_dashboard_templates`、`analytics.analytics_dashboards`、`analytics.analytics_datasources`、`analytics.analytics_drilldown_history`、`analytics.analytics_drilldown_paths`、`analytics.analytics_row_level_permissions`、`analytics.analytics_self_service_reports`、`analytics.analytics_widgets`、`bi.analytics_dashboards`、`bi.analytics_datasets`、`bi.analytics_datasources`、`bi.analytics_widgets`、`bi.report_schedules`、`bi.report_templates`、`bi.reports`、`core.ai_conversations`、`core.ai_faqs`、`core.knowledge_bases`、`core.knowledge_chunks`、`core.knowledge_documents`、`core.knowledge_qa_history`、`core.user_preferences`、`rs.audit_logs`、`rs.change_orders`、`rs.change_requests`、`rs.experiments`、`rs.formula_versions`、`rs.formulas`、`rs.material_tests`、`rs.module_settings`、`rs.project_members`、`rs.project_milestones`、`rs.project_phases`、`rs.projects`、`rs.rs_experiments`、`rs.rs_formulas`、`rs.rs_projects`

**batch03**（29 表）

`crm.contacts`、`crm.contracts`、`crm.customer_finance`、`crm.customer_orders`、`crm.customer_recommendations`、`crm.customer_scores`、`crm.customer_segments`、`crm.customer_tags`、`crm.interactions`、`crm.opportunities`、`crm.return_items`、`crm.sales_forecasts`、`crm.sales_orders`、`crm.tags`、`iam.crm_dashboard_snapshots`、`iam.data_permissions`、`iam.ehs_dashboard_snapshots`、`iam.hrm_dashboard_snapshots`、`iam.lims_dashboard_snapshots`、`iam.pdm_dashboard_snapshots`、`iam.permission_audit_logs`、`iam.permission_templates`、`iam.position_permissions`、`iam.position_roles`、`iam.positions`、`iam.resource_permissions`、`iam.tenant_users`、`iam.user_positions`、`iam.wms_dashboard_snapshots`

**batch04**（27 表）

`qms.qa_alert_messages`、`qms.qa_alert_rules`、`qms.qa_approval_events`、`qms.qa_apqp_phases`、`qms.qa_apqp_projects`、`qms.qa_apqp_risks`、`qms.qa_apqp_tasks`、`qms.qa_audit_findings`、`qms.qa_audit_plans`、`qms.qa_audit_tasks`、`qms.qa_corrective_action_items`、`qms.qa_corrective_actions`、`qms.qa_ehs_hazards`、`qms.qa_eightd_audit_logs`、`qms.qa_eightd_reports`、`qms.qa_fmea_analyses`、`qms.qa_fmea_items`、`qms.qa_inspection_audits`、`qms.qa_inspection_results`、`qms.qa_qms_sync_records`、`qms.qa_quality_costs`、`qms.qa_quality_inspections`、`qms.qa_quality_issues`、`qms.qa_spc_charts`、`qms.qa_spc_data_points`、`qms.qa_standard_revisions`、`qms.qa_standards`

**batch05**（29 表）

`hrm.attendance_records`、`hrm.candidates`、`hrm.companies`、`hrm.contract_renewals`、`hrm.contracts`、`hrm.departments`、`hrm.employees`、`hrm.hrm_cache_invalidation_logs`、`hrm.hrm_master_data_refs`、`hrm.initialization_status`、`hrm.interviews`、`hrm.job_openings`、`hrm.leave_records`、`hrm.module_settings`、`hrm.payroll_details`、`hrm.payroll_items`、`hrm.payroll_records`、`hrm.payroll_runs`、`hrm.performance_goals`、`hrm.performance_records`、`hrm.performance_reviews`、`hrm.positions`、`hrm.recruitment_applications`、`hrm.recruitment_records`、`hrm.salary_adjustments`、`hrm.training_courses`、`hrm.training_participants`、`hrm.training_plans`、`hrm.training_records`

**batch06**（52 表）

`public._archive_core_workflow_instances`、`public._archive_core_workflow_versions`、`public.approval_records`、`public.approvals`、`public.automation_rules`、`public.automation_runs`、`public.automation_variables`、`public.core_doc_documents`、`public.core_doc_folders`、`public.core_doc_templates`、`public.core_email_queue`、`public.core_emails`、`public.core_faqs`、`public.core_file_folders`、`public.core_files`、`public.core_finance_accounts`、`public.core_finance_vouchers`、`public.core_flow_categories`、`public.core_guide_lessons`、`public.core_guide_progress`、`public.core_guides`、`public.core_inter_module_sync`、`public.core_master_data_change_log`、`public.core_master_data_refs`、`public.core_mdm_approvals`、`public.core_mdm_reconciliation_log`、`public.core_migration_history`、`public.core_notification_templates`、`public.core_notifications`、`public.core_tenant_modules`、`public.core_tenant_usage`、`public.core_workflow_instances`、`public.core_workflow_tasks`、`public.core_workflow_versions`、`public.core_workflows`、`public.cqrs_events`、`public.crm_dashboard_snapshots`、`public.ehs_dashboard_snapshots`、`public.finance_voucher_templates`、`public.financial_reports`、`public.hrm_dashboard_snapshots`、`public.lims_dashboard_snapshots`、`public.monitor_settings`、`public.pdm_change_notices`、`public.pdm_dashboard_snapshots`、`public.pdm_materials`、`public.pdm_products`、`public.permission_audit_logs`、`public.search_entity_projections`、`public.system_settings`、`public.tenant_permissions`、`public.wms_dashboard_snapshots`

**batch07**（82 表）

`master_data.materials`、`master_data.mdm_ai_models`、`master_data.mdm_ai_suggestions`、`master_data.mdm_api_exposures`、`master_data.mdm_api_products`、`master_data.mdm_assets`、`master_data.mdm_audit_events`、`master_data.mdm_audit_export_logs`、`master_data.mdm_auto_fix_actions`、`master_data.mdm_bc_tests`、`master_data.mdm_billing_records`、`master_data.mdm_change_events`、`master_data.mdm_classification_models`、`master_data.mdm_classification_results`、`master_data.mdm_classifier_rules`、`master_data.mdm_continuity_plans`、`master_data.mdm_critical_functions`、`master_data.mdm_data_asset_categories`、`master_data.mdm_data_contracts`、`master_data.mdm_data_permissions`、`master_data.mdm_data_products`、`master_data.mdm_dimension_scores`、`master_data.mdm_failover_records`、`master_data.mdm_fix_strategies`、`master_data.mdm_governance_insights`、`master_data.mdm_governance_suggestions`、`master_data.mdm_graph_communities`、`master_data.mdm_graph_edges`、`master_data.mdm_graph_nodes`、`master_data.mdm_impact_analyses`、`master_data.mdm_impact_simulations`、`master_data.mdm_improvement_plans`、`master_data.mdm_interactions`、`master_data.mdm_kg_edges`、`master_data.mdm_kg_graphs`、`master_data.mdm_kg_nodes`、`master_data.mdm_lifecycle_history`、`master_data.mdm_lifecycle_policies`、`master_data.mdm_lifecycle_stages`、`master_data.mdm_lineage_edges`、`master_data.mdm_lineage_graphs`、`master_data.mdm_lineage_nodes`、`master_data.mdm_match_results`、`master_data.mdm_match_rules`、`master_data.mdm_maturity_assessments`、`master_data.mdm_maturity_history`、`master_data.mdm_metadata_attributes`、`master_data.mdm_metadata_objects`、`master_data.mdm_metadata_tags`、`master_data.mdm_permission_roles`、`master_data.mdm_propagation_logs`、`master_data.mdm_propagation_rules`、`master_data.mdm_quality_checks`、`master_data.mdm_quality_loop_configs`、`master_data.mdm_rate_cards`、`master_data.mdm_recommendations`、`master_data.mdm_recovery_plans`、`master_data.mdm_recovery_points`、`master_data.mdm_region_configs`、`master_data.mdm_replication_configs`、`master_data.mdm_search_history`、`master_data.mdm_search_indexes`、`master_data.mdm_semantic_search_indexes`、`master_data.mdm_sla_configs`、`master_data.mdm_sla_incidents`、`master_data.mdm_sla_measurements`、`master_data.mdm_subscriptions`、`master_data.mdm_supplier_categories`、`master_data.mdm_suppliers`、`master_data.mdm_sync_dead_letter`、`master_data.mdm_tag_rules`、`master_data.mdm_tagged_entities`、`master_data.mdm_tags`、`master_data.mdm_usage_records`、`master_data.mdm_user_role_assignments`、`master_data.mdm_version_branches`、`master_data.mdm_version_snapshots`、`master_data.mdm_workflow_history`、`master_data.mdm_workflow_templates`、`master_data.mdm_workflows`、`master_data.samples`、`master_data.uoms`

**batch08**（11 表）

`erp.announcements`、`erp.assets`、`erp.bank_accounts`、`erp.documents`、`erp.fin_reconciliations`、`erp.inventory`、`erp.inventory_items`、`erp.materials`、`erp.purchase_orders`、`erp.voucher_items`、`erp.vouchers`

---

## 附录 B：allow_all 16 张

`bi.audit_logs`、`core.core_plugins`、`erp.dict_items`、`erp.dict_types`、`gis.geodata`、`gis.geofeatures`、`gis.map_layers`、`gis.spatial_analysis`、`hrm.initialization_logs`、`pdm.pdm_master_data_refs`、`portal.portal_quick_actions`、`public.core_operation_logs`、`public.subscriptions`、`qms.quality_inspections`、`qms.quality_standards`、`rs.formulas`

> `rs.formulas` 同时挂着严格策略与 allow_all，按「或」关系仍为全放行；`pdm.pdm_master_data_refs` 为读写两条宽松策略。收紧时需整表处理。

---

## 附录 C：无策略/未开隔离 87 张（分族）

| 族 | 清单 |
|---|---|
| `bi`（8） | `bi.analytics_comparison_analyses`、`bi.analytics_comparison_results`、`bi.analytics_dashboard_shares`、`bi.analytics_dashboard_templates`、`bi.analytics_drilldown_history`、`bi.analytics_drilldown_paths`、`bi.analytics_row_level_permissions`、`bi.analytics_self_service_reports` |
| `qms`（3） | `qms.qa_inspection_items`、`qms.qa_inspection_plans`、`qms.qa_sampling_plans` |
| `public` 在用（2） | `public.core_file_permissions`、`public.monitor_thresholds` |
| `public` 副本（11） | `public.core_tickets`、`public.core_ticket_activities`、`public.core_ticket_comments`、`public.core_ticket_sla_escalations`、`public.core_ticket_sla_policies`、`public.conversion_rules`、`public.conversion_executions`、`public.analytics_sync_records`、`public.pm_master_data_refs`、`public.qa_qms_sync_records`、`public.core_users` |
| `iam` 在用（1） | `iam.core_tenant_plugins` |
| `iam` 副本（43） | `core_billing_invoices`、`core_billing_plans`、`core_chat_*`、`core_dict_*`、`core_email*`、`core_faqs`、`core_file_folders`、`core_files`、`core_guide_*`、`core_menus`、`core_menu_groups`、`core_migration_history`、`core_notification*`、`core_plugin_categories`、`core_plugin_instances`、`core_plugin_permissions`、`core_plugin_pricing`、`core_plugin_reviews`、`core_roles`、`core_subscriptions`、`core_tenant_modules`、`core_tenant_settings`、`core_tenant_usage`、`core_tenant_users`、`core_usage_records`、`core_users`、`core_workflow*`、`tenant_permissions`、`core_dashboard_refresh_log`、`core_inter_module_sync`、`core_mobile_offline_records`（均属 `iam` schema；`*` 为同前缀多表，完整名以生产导出为准） |
| `flow` 副本（18） | `core_doc_*`、`core_flow_categories`、`core_master_data*`、`core_mdm_*`、`core_menu*`、`core_operation_logs`、`core_tenant_*`、`core_workflow*`（均属 `flow` schema） |
| `plugin_erp`（1） | `plugin_erp.accounting_subjects` |

---

## 附录 D：55 张「生产 RLS 关闭」清单导出方法（只读）

逐表名单已按仓库既有生产盘点在附录 E 落盘；开窗前仍建议用下列只读查询复核一次，确认生产现状与附录 E 一致：

```sql
-- 生产库只读执行：列出未开启行级隔离的表
SELECT n.nspname || '.' || c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND NOT c.relrowsecurity
ORDER BY 1;
```

导出后按附录 E 的「表名 + 功能 + 调用点」逐条核对，再请业务确认 Q14。**该查询不写数据，不影响生产。**

---

## 附录 E：55 张「生产 RLS 关闭」逐表清单与调用点

口径：87 张无策略（附录 C）− 14 张活表（`bi` 8 + `qms` 3 + `public.core_file_permissions` + `public.monitor_thresholds` + `iam.core_tenant_plugins`）− 18 张 `flow` 影子 = **55 张 = `public` 11 + `iam` 43 + `plugin_erp` 1**。名单来自 [loose-rls-prod-inventory-2026-11-18.md](./loose-rls-prod-inventory-2026-11-18.md) 附录 C.3（机器可读段）。

### E.1 `public` 11 张

| 表 | 功能 | 代码调用点（仓库实测） | 打开隔离前的风险 |
|---|---|---|---|
| `public.core_tickets` | 工单主表影子 | `svc/ticket/src/handlers.rs`（裸名 `core_tickets`） | 若仍读写 `public`，需确认每次都带租户条件 |
| `public.core_ticket_activities` | 工单活动 | 无 schema 限定引用 | 随工单族一起确认 |
| `public.core_ticket_comments` | 工单评论 | 无 | 同上 |
| `public.core_ticket_sla_escalations` | 工单 SLA 升级 | 无 | 同上 |
| `public.core_ticket_sla_policies` | 工单 SLA 策略 | 无 | 同上 |
| `public.conversion_rules` | 集成转换规则 | `svc/integration/src/rule_engine.rs`（`conversion_rules` 模块，裸名） | 规则可能被所有公司共用，需确认是否平台模板 |
| `public.conversion_executions` | 转换执行记录 | `svc/integration` 同一模块 | 执行记录应属公司 |
| `public.analytics_sync_records` | 分析同步记录 | 无 | 需确认同步任务是否带公司上下文 |
| `public.pm_master_data_refs` | 主数据引用 | 仅 `lib/shared-db/src/database/mod.rs:287` 注释提及裸名历史，无 SQL 调用 | 低风险 |
| `public.qa_qms_sync_records` | QMS 同步记录 | 无 | 随 QMS 同步任务确认 |
| `public.core_users` | 用户镜像 | `svc/analytics/src/main.rs:328/385/426`（只读，带 `tenant_id` 谓词）；全仓无写入 | 收紧后看板用户计数仍为 0（现状即 0） |

### E.2 `iam` 43 张

统一结论：`iam` 不在任何服务的 `search_path`，全仓唯一的 `iam.` 限定运行期引用是 `iam.core_tenant_plugins`（不在这 43 张内）。因此这 43 张**没有仓库内运行期调用点**；打开隔离的真实风险是外部直连/旧部署（Q14 的 B/C）。其中 34 张在 `public`/`core`/`portal`/`communication` 有同名权威表，另 9 张（billing/chat/subscriptions 等）只存在于 `iam`，仅有 `schema_defense.rs` 注释引用。

| # | 表（`iam.` 下） | 功能 | # | 表（`iam.` 下） | 功能 |
|---:|---|---|---:|---|---|
| 1 | `core_billing_invoices` | 账单发票 | 23 | `core_notification_templates` | 通知模板 |
| 2 | `core_billing_plans` | 套餐 | 24 | `core_notifications` | 通知 |
| 3 | `core_chat_members` | 聊天成员 | 25 | `core_plugin_categories` | 插件分类 |
| 4 | `core_chat_messages` | 聊天消息 | 26 | `core_plugin_instances` | 插件实例 |
| 5 | `core_chat_rooms` | 聊天房间 | 27 | `core_plugin_permissions` | 插件权限 |
| 6 | `core_dashboard_refresh_log` | 看板刷新日志 | 28 | `core_plugin_pricing` | 插件定价 |
| 7 | `core_dict_items` | 字典项 | 29 | `core_plugin_reviews` | 插件评价 |
| 8 | `core_dict_types` | 字典类型 | 30 | `core_plugins` | 插件 |
| 9 | `core_email_queue` | 邮件队列 | 31 | `core_roles` | 角色 |
| 10 | `core_email_templates` | 邮件模板 | 32 | `core_subscriptions` | 订阅 |
| 11 | `core_emails` | 邮件 | 33 | `core_tenant_modules` | 租户模块 |
| 12 | `core_faqs` | FAQ | 34 | `core_tenant_settings` | 租户设置 |
| 13 | `core_file_folders` | 文件目录 | 35 | `core_tenant_usage` | 租户用量 |
| 14 | `core_files` | 文件 | 36 | `core_tenant_users` | 租户用户 |
| 15 | `core_guide_lessons` | 引导课节 | 37 | `core_usage_records` | 用量记录 |
| 16 | `core_guide_progress` | 引导进度 | 38 | `core_users` | 用户 |
| 17 | `core_guides` | 引导 | 39 | `core_workflow_instances` | 流程实例 |
| 18 | `core_inter_module_sync` | 模块间同步 | 40 | `core_workflow_tasks` | 流程任务 |
| 19 | `core_login_logs` | 登录日志 | 41 | `core_workflows` | 流程定义 |
| 20 | `core_menu_groups` | 菜单分组 | 42 | `tenant_permissions` | 租户级工具权限 |
| 21 | `core_menus` | 菜单 | 43 | `core_migration_history` | 迁移历史 |
| 22 | `core_mobile_offline_records` | 移动离线记录 | | | |

**唯一例外**：`iam.tenant_permissions` 有真实运行期调用——`svc/unified-core/src/routes/business_tools/database_permission_store.rs:220/285/338/366/396/428/479/574`（读写都显式带 `tenant_id`）。打开隔离前必须确认这些连接都设置了请求事务的租户 GUC，否则权限读写会变成 0 行。

### E.3 `plugin_erp` 1 张

| 表 | 功能 | 调用点 | 建议 |
|---|---|---|---|
| `plugin_erp.accounting_subjects` | 会计科目影子 | 无；权威表为 `finance.accounting_subjects`（`svc/finance` 走 `finance,public`） | DROP 候选，不建议单独补策略 |

### E.4 核对结论

- 55 张里，**只有 2 张有仓库内运行期调用**：`iam.tenant_permissions`（读写，需补租户 GUC）和 `public.core_users`（analytics 只读，已带租户谓词）。
- 其余 53 张无 schema 限定调用；打开隔离的风险主要来自**外部直连、定时任务、旧部署**，需业务按功能确认（Q14）。
- 43 张 `iam` 表名来自生产只读导出，仓库无 `CREATE TABLE` 定义，逐表名以附录 C.3 为准。

---

## 附录 F：`public` 52 张分组建议（对应 Q9）

> 依据：表名语义 + 仓库是否有表定义 + 是否带 `tenant_id`。实测：16 张在仓库无定义（生产独有）。**2026-11-22 更正**：`approvals`、`approval_records`、`core_workflow_instances`、`core_workflow_tasks` 四张表实际**已有 `tenant_id` 列**（生产与锚点库均为可空 `uuid`），此前"没有 `tenant_id` 列"的判断来自落后于生产的克隆库；W10 只需补索引并归一策略，见 7.5。最终以生产列与业务确认为准。

| 表 | 建议分组 | 一句依据 |
|---|---|---|
| `_archive_core_workflow_instances` | 不确定 | 归档表，仓库无定义；需确认是否仍需在线保留 |
| `_archive_core_workflow_versions` | 不确定 | 同上 |
| `approval_records` | 业务数据 | 审批记录属公司业务；已有 `tenant_id`（2026-11-22 复核），W10 补索引并归一策略 |
| `approvals` | 业务数据 | 审批单属公司；已有 `tenant_id`（2026-11-22 复核），W10 补索引并归一策略 |
| `automation_rules` | 业务数据 | 公司自建自动化规则 |
| `automation_runs` | 业务数据 | 规则执行记录 |
| `automation_variables` | 业务数据 | 公司变量 |
| `core_doc_documents` | 业务数据 | 公司文档 |
| `core_doc_folders` | 业务数据 | 公司文档目录 |
| `core_doc_templates` | 公共字典 | 平台文档模板，各公司只读；若允许公司自建则改业务 |
| `core_email_queue` | 业务数据 | 发件队列属公司 |
| `core_emails` | 业务数据 | 邮件属公司 |
| `core_faqs` | 公共字典 | 平台 FAQ |
| `core_file_folders` | 业务数据 | 公司文件目录 |
| `core_files` | 业务数据 | 公司文件 |
| `core_finance_accounts` | 业务数据 | 公司财务账户 |
| `core_finance_vouchers` | 业务数据 | 公司凭证 |
| `core_flow_categories` | 公共字典 | 流程分类目录 |
| `core_guide_lessons` | 公共字典 | 平台引导内容 |
| `core_guide_progress` | 业务数据 | 用户引导进度，按人/公司 |
| `core_guides` | 公共字典 | 平台引导 |
| `core_inter_module_sync` | 不确定 | 模块间同步游标，需确认按模块还是按公司 |
| `core_master_data_change_log` | 业务数据 | 主数据变更日志属公司 |
| `core_master_data_refs` | 业务数据 | 主数据引用属公司 |
| `core_mdm_approvals` | 业务数据 | MDM 审批属公司 |
| `core_mdm_reconciliation_log` | 业务数据 | 对账日志属公司 |
| `core_migration_history` | 不确定 | 迁移历史，平台/运维专用语义 |
| `core_notification_templates` | 公共字典 | 通知模板由平台维护 |
| `core_notifications` | 业务数据 | 通知属公司 |
| `core_tenant_modules` | 不确定 | 租户开通模块：按租户键控，但含平台目录语义 |
| `core_tenant_usage` | 业务数据 | 租户用量按租户 |
| `core_workflow_instances` | 业务数据 | 流程实例；已有 `tenant_id`（2026-11-22 复核），W10 补索引并归一策略 |
| `core_workflow_tasks` | 业务数据 | 流程任务；已有 `tenant_id`（2026-11-22 复核），W10 补索引并归一策略 |
| `core_workflow_versions` | 业务数据 | 流程版本属公司 |
| `core_workflows` | 业务数据 | 流程定义属公司 |
| `cqrs_events` | 不确定 | 事件总线，需确认是否含跨公司载荷 |
| `crm_dashboard_snapshots` | 业务数据 | CRM 看板快照（按命名；仓库无定义） |
| `ehs_dashboard_snapshots` | 业务数据 | EHS 看板快照（按命名；仓库无定义） |
| `finance_voucher_templates` | 公共字典 | 凭证模板平台预置 |
| `financial_reports` | 业务数据 | 财务报表属公司 |
| `hrm_dashboard_snapshots` | 业务数据 | HR 看板快照（按命名；仓库无定义） |
| `lims_dashboard_snapshots` | 业务数据 | LIMS 看板快照（按命名；仓库无定义） |
| `monitor_settings` | 不确定 | 监控设置，可能平台级也可能公司级 |
| `pdm_change_notices` | 业务数据 | 变更通知属公司 |
| `pdm_dashboard_snapshots` | 业务数据 | PDM 看板快照（按命名；仓库无定义） |
| `pdm_materials` | 业务数据 | 物料主数据属公司；若集团统一维护则为混合 |
| `pdm_products` | 业务数据 | 产品主数据属公司 |
| `permission_audit_logs` | 业务数据 | 权限审计属公司；平台审计只读为例外 |
| `search_entity_projections` | 不确定 | 搜索投影，需确认是否混合多公司 |
| `system_settings` | 不确定 | 系统设置可能是平台级 + 公司级混合 |
| `tenant_permissions` | 业务数据 | 租户级工具权限，按租户键控 |
| `wms_dashboard_snapshots` | 业务数据 | WMS 看板快照（按命名；仓库无定义） |

**分组计数**：公共字典 **7** 张、业务数据 **36** 张、不确定 **9** 张。不确定的 9 张需要业务逐张确认，其余两组可按「平台级只读 / 公司隔离」先出策略草案。

---

## 证据索引

- 8 批对象清单与策略形状：[rls-policy-inventory-b4.md](./rls-policy-inventory-b4.md)
- 宽松 / allow_all / 无策略生产实测：[loose-rls-prod-inventory-2026-11-18.md](./loose-rls-prod-inventory-2026-11-18.md)
- ERP 合并报表 8 张的策略对照与调用路径：[readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md](./readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md)
- 生产 vs 仓库 318 张差分与终态更正：[rls-prod-vs-repo-census-2026-11-18.md](./rls-prod-vs-repo-census-2026-11-18.md)
- 计划口径（226 / 12 / 81）：[项目审计与实施方案-2026-11-17.md](../quality/项目审计与实施方案-2026-11-17.md) §5.2、§6 P1/P7
