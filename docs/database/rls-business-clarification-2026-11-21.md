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
- 第 5 节是我们自己能查清、不需要你们回答的；第 6 节是需要你们回答的汇总，按优先级排序。

### 0.3 术语速查

| 说法 | 含义 |
|---|---|
| 租户 | 一家使用系统的公司/组织。正常情况下，一家公司只能看到自己的数据。 |
| 平台级数据 | 不属于任何一家公司、所有公司都能看的公共数据，例如系统菜单、字典、平台模板。 |
| 集团 / 成员 | 如果一家集团下有多家公司分别开户，需要明确「集团能否汇总查看成员公司数据」。当前系统**没有**落地集团层级，默认一家公司就是一个隔离边界。 |
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

1. **Q1**：ERP 合并报表 8 张表，集团内多公司数据是否允许互相可见？
2. **Q14**：55 张「生产未开数据库隔离」的表，是否存在不带公司上下文的访问（定时任务、报表、服务账号、旧部署）？
3. **Q9**：`public` 下 52 张表里，哪些是「所有公司都能看的平台公共数据」，哪些是「各公司自己的业务数据」？

---

## 2. ERP 合并报表族（8 张，单独成节）

### 2.1 现状（技术事实，不需要业务判断）

- 8 张表当前都只有一条策略，形状一致：
  `系统通道开启时放行全量，否则 tenant_id = 当前公司`。
- 数据库隔离（RLS）和强制隔离（FORCE）都已开启；普通用户查询只能看到当前公司。
- 生产实测 **8 张表均为 0 行**（功能尚未产生数据），因此现在调整策略没有数据搬迁风险。
- 仓库里另有一版「集团函数」写法 `erp.group_tenant_of()`，但该函数当前是**恒等函数**（输入什么返回什么），并没有真正的集团层级。也就是说：**即使把策略切到仓库写法，集团跨公司可见也不会自动生效**，必须先有集团-成员关系的数据模型。
- 唯一的实质行为差异在「系统通道」：生产版允许系统通道看全量，仓库版不允许。若有服务账号调用合并接口，切到仓库版会从「能看全量」静默变成「看到 0 行」。

### 2.2 逐表说明与需要确认的那一句

| 表（均在 `erp` 下） | 当前策略 | 生产实际可见范围 | 需要业务确认的那一句 |
|---|---|---|---|
| `company_relations`（公司关系） | 系统通道全量，否则本公司 | 普通用户仅本公司；系统通道全量 | 集团内公司之间的持股/关联关系，是由集团统一维护、多家公司共享，还是每家公司各自维护自己的关系？ |
| `internal_transactions`（内部交易） | 同上 | 同上 | 内部交易台账是否允许集团财务跨多家公司汇总查看？ |
| `consolidation_scopes`（合并范围） | 同上 | 同上 | 合并范围（哪些公司纳入合并）由集团统一制定，还是各公司自建？ |
| `consolidation_scope_companies`（合并范围成员） | 同上 | 同上 | 一个合并范围能否包含「其他公司」作为成员？ |
| `consolidation_reports`（合并报表） | 同上 | 同上 | 一张合并报表生成后，除编制公司外，集团总部/审计是否也要能看？ |
| `consolidation_report_lines`（合并报表行） | 同上 | 同上 | 同上（报表行的可见范围是否与报表头一致）？ |
| `elimination_rules`（抵消规则） | 同上 | 同上 | 抵消规则是集团统一模板，还是每家公司维护自己的规则？ |
| `elimination_candidates`（抵消候选） | 同上 | 同上 | 抵消候选需要跨公司配对内部交易吗？如果需要，配对双方的数据是否都要可见？ |

### 2.3 需要业务回答的问题

**Q1（必须回答）合并报表的可见范围是哪一种？**

| 选项 | 含义 | 技术后果 |
|---|---|---|
| A. 仅本公司 | 合并报表只服务单家公司内部管理 | 可直接切严格隔离；若存在集团服务账号调用，会读到 0 行，需要同时清理调用方 |
| B. 集团内跨公司 | 集团总部可以汇总查看成员公司 | 不能只改策略：要先建「集团-成员」关系（当前 `group_tenant_of` 是恒等函数），属于数据模型改造，需单独立项 |
| C. 平台全量（仅特定角色） | 只有集团财务/审计等少数角色能看全部 | 保留系统通道，但必须明确「谁能拿到系统通道身份」，否则等于全部放行 |
| D. 暂不确定 | — | 开窗时只能维持现状，合并报表族不纳入本轮回迁；其余批次不受影响 |

**Q2（必须回答）是否有系统账号/后台任务会调用合并报表接口？**

- A. 没有，只有用户在前端操作 → 可以安全取消系统通道旁路。
- B. 有，定时合并/对账任务 → 需要保留系统通道，或把这些任务改成显式传入公司身份。
- C. 不确定 → 我们先查网关与调用日志（只读），但需要你们确认「是否有外部系统对接合并接口」。

**Q3（必须回答）未来 12 个月是否会启用「集团-成员公司」模式？**

- A. 不会 → 合并族按「单公司」设计即可。
- B. 会，且要跨公司汇总 → 现在就要定集团边界的数据来源（哪张表、谁维护）。
- C. 会，但只做数据上报、不做实时跨公司查询 → 可用离线汇总，不需要放开在线隔离。

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

现状：这 55 张表在生产**没有开启数据库隔离**，仓库侧已经写好严格策略，回迁时会一次性打开。仓库未落盘逐表名单，开窗前会用只读查询导出（附录 D 提供 SQL），并与仓库迁移做差分。

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
- D. 不清楚，需要我们按表导出「代码调用点 + 是否有租户条件」后，你们再确认。

技术后果：选 A 可直接开；选 B 打开隔离后相关任务会静默读到 0 行或写入被拒（表现为报表为空、同步失败）；选 C 可能导致旧部署不可用；选 D 我们可先做代码侧自查，但仍需要你们确认「是否有外部程序直连数据库」。

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
| S6 | 合并报表族是否已有集团层级模型 | `erp.group_tenant_of()` 当前为恒等函数 | 现在切仓库写法不会产生跨公司可见，必须先有集团-成员数据 |
| S7 | 55 张未开隔离表的「仓库有策略 / 生产无隔离」差分 | 需生产只读导出（附录 D） | 导出后即可给出逐表清单，不需要业务参与 |

### 6.2 必须等业务的（开窗前置）

| 优先级 | 问题 | 阻塞对象 | 不回答的后果 |
|---|---|---|---|
| P0 | Q1、Q2、Q3 | ERP 合并报表 8 张 | 无法决定策略形态；选错会出现跨公司可见或集团查询全空 |
| P0 | Q14 | 55 张生产未开隔离表 | 打开隔离后后台任务/旧部署可能静默失效 |
| P0 | Q9 | `public` 52 张 | 误判会导致菜单/字典全空或业务数据互相可见 |
| P1 | Q4-Q8、Q10、Q11 | 8 批宽松策略 | 选错会导致合法跨公司查询被挡或越权可见 |
| P1 | Q12、Q13 | allow_all 16 张 / 无策略 87 张 | 影响是否可在本轮回迁中一并清理 |
| P2 | Q15、Q16、Q17 | 平台级数据与系统通道总则 | 影响所有批次的白名单与平台级策略范围 |

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

仓库未落盘逐表名单，开窗前用下列只读查询导出，并与仓库迁移做差分：

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

导出后我们会补一份「表名 + 当前隔离方式（应用层过滤 / 单租户部署 / 无隔离）」的逐表清单，再请业务确认 Q14。**该查询不写数据，不影响生产。**

---

## 证据索引

- 8 批对象清单与策略形状：[rls-policy-inventory-b4.md](./rls-policy-inventory-b4.md)
- 宽松 / allow_all / 无策略生产实测：[loose-rls-prod-inventory-2026-11-18.md](./loose-rls-prod-inventory-2026-11-18.md)
- ERP 合并报表 8 张的策略对照与调用路径：[readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md](./readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md)
- 生产 vs 仓库 318 张差分与终态更正：[rls-prod-vs-repo-census-2026-11-18.md](./rls-prod-vs-repo-census-2026-11-18.md)
- 计划口径（226 / 12 / 81）：[项目审计与实施方案-2026-11-17.md](../quality/项目审计与实施方案-2026-11-17.md) §5.2、§6 P1/P7
