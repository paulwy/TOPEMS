# TOPEMS 全模块端到端测试总报告

- 执行日期：2026-10-27 00:40–01:00（UTC+8）
- 被测系统：TOPEMS 模块化单体（29 服务 real_module 嵌入 unified-core），入口 http://localhost:8099
- 执行方式：登录 test_admin（超管）→ 16 个业务模块逐一执行「创建(写) → 读回验证(读)」，测试数据统一 `e2e_<module>_<批次>_NNN` 前缀命名隔离
- 验收口径：每模块 ≥1 个完整写操作 + 列表/详情读回字段比对；envelope `{code,success,data,message}`，2xx 且 success=true 视为成功

---

## 一、总体结论

| 指标 | 结果 |
|---|---|
| 覆盖模块 | 16/16（iam、master-data、crm、erp、finance、wms、mes、qms、lims、hrm、gis、pm、portal、rd、search、mobile） |
| 全链路通过（create+读回） | **11** 个：iam、master-data、crm、erp、finance、wms、mes、qms、gis、rd、mobile |
| 部分通过（存在缺陷） | **2** 个：lims（create 带 quantity 返回 500 但数据已落库；list 恒 500）、search（检索接口可用，但投影索引为空，跨实体检索无结果） |
| 创建接口失败（确定性 500） | **3** 个：hrm、pm、portal —— 均为代码↔DB schema 漂移，读接口正常 |
| 发现缺陷 | 4 个 P1 级（lims/hrm/pm/portal 写链路）、1 个 P2 级（finance invoice_type 缺省）、2 个 P3 级（search 投影为空、wms 字段映射）、3 处参考文档勘误 |

> 注：hrm/pm/portal 的失败响应 envelope code=500，但部分错误路径 HTTP 状态行返回 200（信封内 code=500 为准）；lims list 与带 quantity 的 create 返回 HTTP 500。

## 二、登录与认证验证

- `GET /health` → code=200, data=healthy ✅
- `POST /api/core/iam/auth/login`（{"username":"test_admin","password":"admin123"}）→ success=true，签发 JWT（24h 有效期，超管 permissions=["*"]）✅
- 全部 29 业务接口均需 `Authorization: Bearer <token>`，租户/用户身份取自 JWT claims（RLS 隔离），验证通过 ✅

## 三、分模块结果明细

| 模块 | 主资源 Create 路径 | 响应 | 读回验证 | 结论 |
|---|---|---|---|---|
| iam | POST /api/core/iam/users | code=201 | list+get-by-id 字段一致 | ✅ 通过 |
| master-data | POST /api/master-data/master-data/materials | code=200 | list+get-by-id 一致 | ✅ 通过（双重前缀路径实测有效） |
| crm | POST /api/crm/customers | code=200 | get-by-id 一致（owner 自动取 claims） | ✅ 通过 |
| erp | POST /api/erp/materials | code=200 | get-by-id 一致 | ✅ 通过 |
| finance | POST /api/finance/sales-invoices | 首调 500，显式传 invoice_type="tax" 后 code=200 | get-by-id 全字段一致（total_amount 自动=1130.00） | ✅ 通过（含 P2 缺陷） |
| wms | POST /api/wms/warehouses | code=200 | get-by-id 一致 | ✅ 通过 |
| mes | POST /api/mes/orders | code=200 | list+get-by-id 一致 | ✅ 通过 |
| qms | POST /api/qms/checks | code=200 | get-by-id+list(data.inspections) 一致 | ✅ 通过 |
| lims | POST /api/lims/samples | quantity 缺省时 200；带 quantity 时 500 | get-by-id 一致；list 恒 500 | ⚠️ 核心闭环通，含 P1 缺陷 |
| hrm | POST /api/hrm/employees | **code=500**（确定性） | create 未落库（total=0） | ❌ 失败（P1） |
| gis | POST /api/gis/business-locations | code=200 | get-by-id+list 一致（GeoJSON position） | ✅ 通过 |
| pm | POST /api/pm/projects | **code=500**（确定性） | create 未落库 | ❌ 失败（P1） |
| portal | POST /api/portal/todos | **code=500**（确定性） | create 未落库（list 仅内存兜底默认项） | ❌ 失败（P1） |
| rd | POST /api/rd/projects | code=200 | get-by-id+list 一致 | ✅ 通过 |
| search | GET /api/search?keyword= | code=200 | 用户类检索有结果；e2e 新建数据 total=0 | ⚠️ 接口通，索引链路不完整（P3） |
| mobile | POST /api/mobile/offline/sync + GET /approvals /offline/status | code=200 | sync 后 offline/status 读回 last_sync_time 一致 | ✅ 通过 |

## 四、发现的缺陷清单（含根因与修复建议）

### P1-1 lims：NUMERIC→f64 解码 panic，create「假失败真落库」、list 恒 500
- 现象：POST /api/lims/samples 带 quantity 返回 HTTP 500；数据**实际已提交落库**（public.qa_lab_samples 可查到 e2e_lims_b2_001，quantity=10.00）；GET /api/lims/samples 列表在表内存在非空 quantity 行时恒 500。
- 根因（服务端日志实证）：`svc/lims/src/modules/sample.rs:342`（create）与 `:241`（list）`row.get("quantity")` 以 `Option<f64>`(FLOAT8) 解码 `numeric(12,2)` 列，sqlx `Row::get` 内部 unwrap panic，被 CatchPanicLayer 兜底为通用 500。时序上 `tx.commit()`（:322）先于行构造（:334+），故带 quantity 的创建是「事务已提交、响应 500」。
- 建议：quantity 改用 `rust_decimal::Decimal` 解码，或 SELECT 中 `quantity::TEXT` 读回再转。

### P1-2 hrm：INSERT 引用不存在的列 organization_id
- 现象：POST /api/hrm/employees 确定性 500「内部服务器错误」，重试无效，DB 无残留。
- 根因：`svc/hrm/src/services/employee_service.rs:232-256` INSERT 列清单含 `organization_id`，但 `hrm.employees` 表实际列只有 `org_id`/`company_id`（psql 复现：`ERROR: column "organization_id" of relation "employees" does not exist`）。
- 建议：INSERT 移除 organization_id（改用 org_id）或补迁移加列。

### P1-3 pm：tags 列类型漂移（jsonb vs text[]）
- 现象：POST /api/pm/projects 确定性 500「创建项目失败」。
- 根因：`svc/pm/src/modules/project.rs:266-272` INSERT 以 `to_jsonb($16::text[])` 向 tags 列插入 jsonb，但 `pm.projects.tags` 实为 `text[]`（psql 复现：`ERROR: column "tags" is of type text[] but expression is of type jsonb`）。
- 建议：迁移将 pm.projects.tags 改为 jsonb，或 INSERT 去掉 to_jsonb 并统一反序列化类型。

### P1-4 portal：portal_todos 为缺业务列的壳表
- 现象：POST /api/portal/todos 确定性 500「待办事项添加失败」。
- 根因：`svc/portal/src/modules/todos.rs:104-120` INSERT 列清单（user_id/title/service_code/…共 8 列）远超表实际列：`portal.portal_todos` 当前仅有 id/deleted_at/tenant_id 三列（疑似空库自愈只建壳表，业务列迁移未执行；psql 复现 `ERROR: column "user_id" ... does not exist`）。list 仅返回 default_todos() 内存兜底数据。
- 建议：补迁移为 portal_todos 增业务列（user_id/title/service_code/service_name/due_date/priority/todo_type/completed 等）。

### P2-1 finance：invoice_type 缺省空串违反 CHECK 约束
- 现象：不传 invoice_type 时 create 返回 500；显式传 `"invoice_type":"tax"` 后成功（id=0b1dd475…，total_amount 自动合计 1130.00）。
- 根因：`InvoiceCreatePayload.invoice_type` 为 `#[serde(default)]`，缺省反序列化为空串 ""，违反 `finance.sales_invoices` CHECK 约束 `invoice_type IN ('tax','普通发票','专用发票')`，错误细节被 err_resp 吞掉。
- 建议：handler 对空串缺省兜底为 "tax"。

### P3-1 search：投影索引表为空，跨实体检索无结果
- 现象：GET /api/search?keyword=e2e → total=0；keyword=test_admin → 仅命中 1 条存量用户（用户直查路径）。新建 rd 项目检索无结果（rd 不在 user/customer/order/document 覆盖范围，属预期），但 `public.search_entity_projections` 表**整体为空**——事件投影/backfill 未运行，customer/order/document 类实体检索实际不可用。
- 建议：触发/修复投影管线（backfill 或事件订阅），使投影表有数据。

### P3-2 wms：name 字段实际落库到 warehouse_name 列
- 现象：API 读回一致（通过），但 DB 侧 `wms.warehouses.name` 为空串，值在 `warehouse_name` 列（内部字段映射，API 契约未破坏）。已记录，不影响验收结论。

### 参考文档勘误（api_reference.md 经实测修正）
1. rd：project_type 枚举实测值为 `R_D / PRODUCTION / DESIGN / CONSTRUCTION / SERVICE`（文档误写 experiment）。
2. search：主检索参数实测为 `keyword`（文档误写 q）。
3. mobile：离线同步请求体实测为 `OfflineSyncRequest{sync_type, data, records_count}`（文档误写 operations[]）。
4. iam 创建返回 code=201（HTTP 语义），读回 code=200——envelope code 即 HTTP 状态码。

## 五、测试数据清单（全部保留，未硬删；软删除接口未调用）

| 模块 | 数据 | ID / 标识 |
|---|---|---|
| iam | 用户 e2e_iam_z1_user1 | 6978d5f6-ea38-4c5e-9b1c-15a7230b8a78 |
| master-data | 物料 RM-E2E-Z1-001 | 1248f237-4c4f-4bc8-92bd-bc45bf1b013e |
| crm | 客户 e2e_crm_b1_001 | 59398ed2-931c-4fb4-8dfd-5ef12b5b2811 |
| erp | 物料 e2e_erp_b1_001 | 2e1e7643-65b9-49fd-911b-881b85636b30 |
| finance | 发票 e2e_fin_b1_001 | 0b1dd475-cbac-4a0b-a0da-3d2f3267647d |
| wms | 仓库 e2e_wms_b1_001 | d88aa45e-7c72-4fb1-ba3f-7fa47b0cfce9 |
| mes | 生产订单 e2e_mes_b2_001 | 5f41208d-77df-48f0-ab85-bad628f1757b（order_no=MO202610267595） |
| qms | 质检单 e2e_qms_b2_001 | b0cd9274-f0d5-4908-9cb7-2f0a2a794d6e（incoming/50.00） |
| lims | 样品 e2e_lims_b2_001（孤儿行）/ e2e_lims_b2_002 | 99bb8a40…/ af19b59e-7cf2-4d66-bc7f-44e23a3abe8d（public.qa_lab_samples） |
| gis | 业务位置 e2e_gis_b3_001 | a0632a81-6785-4c0f-a4ff-694bb3189b35 |
| rd | 研发项目 e2e_rd_b4_001 | 5867fe77-8da4-4117-86d2-74a1149d040e（rs.projects） |
| mobile | 离线同步批次（sync_type 含 e2e 数据） | cf51cd15…（mobile.offline_sync_records） |
| search | recent 记录 | 测试后已清空（仅影响本会话） |
| hrm/pm/portal | 无落库（create 500，事务回滚；探查性 INSERT 均已回滚） | — |

## 六、方法与可信度说明
- 全部断言为真实 HTTP 调用结果，读回验证均比对创建响应与列表/详情字段；关键失败项已独立复核：本人二次 curl 复现 hrm/portal 500、lims list 500，psql 直接核对落库（含 public.qa_lab_samples、rs.projects、qms.qa_quality_inspections、wms.warehouses 等实际表）。
- 失败根因均以源码定位 + psql 复现原始 DB ERROR 双重实证。

## 附录：分模块详细报告
见 `e2e_reports/modules/`（16 份：seed_iam / seed_master-data / b1_crm / b1_erp / b1_finance / b1_wms / b2_mes / b2_qms / b2_lims / b3_hrm / b3_gis / b3_pm / b3_portal / b4_rd / b4_search / b4_mobile）。

## 七、缺陷修复闭环（2026-10-27 复测全部通过）
5 项缺陷修复后已重编译（debug 构建）+ 重启（PID 76294）并逐一 HTTP 复测，**全部 code=200**：

| 级别 | 模块 | 修复方式 | 复测结果 |
|---|---|---|---|
| P1 | lims | sample.rs 12 处 SELECT/RETURNING `quantity::float8`（numeric→f64 解码 panic）+ INSERT 列清单修正 | create 带 quantity code=200（id 8ec0762c，quantity=10.0）、list 正常 |
| P1 | hrm | employee_service.rs INSERT 移除不存在列 organization_id | create code=200（id 9883e10e，org_id 正确） |
| P1 | pm | project.rs tags 直绑 text[]（去 to_jsonb） | create code=200（id f8469ade） |
| P1 | portal | portal_todos ALTER 补 9 业务列 + todos.rs 4 处 user_id `::uuid` cast（String→uuid 列类型不匹配根因） | create code=200（id d9d107f5，due_date/priority/completed 正确） |
| P2 | finance | sales_invoice.rs create 空串 invoice_type 兜底 "tax" | 缺省 invoice_type create code=200（id 591502e0） |

- 提交：`a8566dcd6` + `f77b78ce0`（本地，随 0a31a27e3 批次推送中）。
- 备注：portal list 此前返回 default_todos 内存兜底即 load_local_todos 因 user_id 类型不匹配失败所致，cast 修复后改为真实 DB 读回。

## 八、P3 闭环（2026-10-27）：search 投影/文档检索 SQL 括号不匹配
- **根因**（RUST_LOG=debug 重启实证）：`query_projection`（投影检索）与 `search_documents`（文档检索）的 tenant 过滤条件 `... ::UUID))` 多一个右括号（1 开 2 闭）→ PG syntax error → 投影/文档检索恒降级为空；用户检索（core_users 无该过滤）不受影响，故此前"用户类可用、跨实体无结果"现象成立。
- **修复**：svc/search/src/handlers.rs 2 处 `::UUID))` → `::UUID)`；另核查 erp/rd 同类写法均为 COALESCE 合法嵌套，无需改。
- **复测**：keyword=客户 → 命中 E2E搜索验证客户；keyword=张三 → 命中（contact_person）；keyword=e2e → 命中。search 跨实体检索完整可用。
- **提交**：`6df3b6978`（fix(search)）。

## 九、P3 wms 闭环（2026-10-27）：name 列对齐
- **修复**：svc/wms/src/modules/warehouse.rs INSERT/UPDATE 同步写 `name` 列（此前仅 warehouse_name 落库、读回 `AS name`，表 name 列空——代码↔列名漂移）。
- **验证**：create code=200（id eb33e48b），表 `name`= `warehouse_name`= e2e_wms_verify_001 双列一致；历史数据 name 列为空保留。
- **至此 E2E 发现的全部缺陷（P1×4 + P2×1 + P3×2）已闭环**。
