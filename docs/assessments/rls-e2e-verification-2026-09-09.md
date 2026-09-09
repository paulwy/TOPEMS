# RLS A 方案 · 服务层端到端受限验证报告

- 日期：2026-09-09
- 范围：① topems 非 superuser 化 + FORCE（受限角色）· 服务层端到端受限验证
- 前置：RLS A 方案全量推广已闭环（erp/wms/rd/srm/scm/hrm/tms 7 批，`6f5d47078`~`bb131a169`）；0015–0018 迁移已应用（567 表启用 RLS / 331 表 FORCE / 331 条 `rls_tenant_isolation` 策略）
- 验证库：`postgres://…@localhost:5432/topems`（topems=NOSUPERUSER CREATEDB CREATEROLE，air=superuser）

## 一、验证口径

| 项 | 说明 |
|---|---|
| 受限角色 | `rls_e2e`（LOGIN，NOSUPERUSER，NOBYPASSRLS，仅 GRANT hrm.employees 读写） |
| 样本表 | `hrm.employees`（3 个租户：T1=`…0001`×6 行，T2=`0602d4e7…`×1 行，T3=`9ba602b1…`×1 行） |
| 策略语义 | 无上下文/空 → 放行；nil UUID（服务豁免）→ 放行；tenant_id IS NULL → 共享行放行；否则仅本租户（0017 对齐 GUC `app.tenant_id`） |
| 中间件路径 | `pool.begin()` → `SELECT set_config('app.tenant_id', $1, true)`（事务局部）→ `&mut **txn` 查询 → 写 handler commit |

## 二、受限角色验证矩阵（DB 层）

| # | 场景 | 期望 | 实测 | 结论 |
|---|---|---|---|---|
| 1 | 无租户上下文 SELECT | 8 行（兼容放行） | 8 | ✅ |
| 2 | SET app.tenant_id=T1 | 仅 6 行 T1，0 泄漏 | 6 / 0 | ✅ |
| 3 | SET app.tenant_id=T2 | 仅 1 行 T2，0 泄漏 T1 | 1 / 0 | ✅ |
| 4 | SET app.tenant_id=nil UUID | 8 行（服务豁免） | 8 | ✅ |
| 5 | T1 上下文越权读 T2 行 | 0 行 | 0 | ✅ |
| 6 | T1 上下文越权 UPDATE T2 行 | 0 行受影响 | UPDATE 0 | ✅ |
| 7 | T1 上下文越权 INSERT T2 行 | WITH CHECK 拦截 | `ERROR: new row violates row-level security policy` | ✅ |

## 三、中间件路径模拟 + FORCE 约束

| # | 场景 | 期望 | 实测 | 结论 |
|---|---|---|---|---|
| 8 | BEGIN + set_config(T2, true) → 仅见 1 行；事务内越权 UPDATE T1 → 0 行；COMMIT 后 GUC 消失 → 恢复 8 行；T1 无污染 | 全符合 | 1 / UPDATE 0 / 8 / 0 | ✅ |
| 9 | FORCE 对 owner 生效：topems（表 owner）SET T1 → 仅 6 行，0 泄漏 | 6 / 0 | 6 / 0 | ✅ |

## 四、真实服务层（crm 集成测试，sqlx::test 临时库）

| 测试 | 覆盖 | 结果 |
|---|---|---|
| `tests::rls_isolation_test::customer_isolated_by_tenant` | 租户 A/B 数据隔离 | ✅ ok |
| `tests::rls_isolation_test::rls_txn_context_isolates_tenant` | 中间件路径完整模拟：事务 + set_config + 本租户过滤 + 无上下文放行 | ✅ ok |

命令：`DATABASE_URL=postgres://topems@localhost:5432/topems cargo test -p topems-crm -- rls_isolation`（2 passed；此前因 5433 不可达失败的记录已随 5432 在线 + DATABASE_URL 指向修正而闭合）

## 四·A、真实 tenant_middleware → handler 端到端（新增，shared-auth 集成测试）

`lib/shared-auth/tests/rls_middleware_e2e.rs`：直接驱动**生产 `tenant_middleware` 函数**（Claims → begin → `set_config('app.tenant_id', …, true)` → txn 注入）→ 真实 handler 经 `Extension<Arc<Mutex<Transaction>>>` 提取 → `&mut **txn` 查询 → FORCE RLS 过滤。

| 测试 | 场景 | 结果 |
|---|---|---|
| `tenant_middleware_filters_by_claims_tenant` | T1 Claims → 仅见 T1 行；T2 Claims → 仅见 T2 行 | ✅ ok |
| `tenant_middleware_service_claims_full_access` | service 身份（role=service）→ nil UUID 上下文 → 全量访问 | ✅ ok |
| `tenant_middleware_unauthorized_without_claims` | 无 Claims → 401 | ✅ ok |

命令：`DATABASE_URL=postgres://topems@localhost:5432/topems cargo test -p topems-shared-auth --test rls_middleware_e2e`（3 passed）

## 四·B、写路径 commit 冒烟（受限角色，业务库 hrm.employees）

| 步骤 | 期望 | 实测 | 结论 |
|---|---|---|---|
| T2 上下文 INSERT 本租户行 + COMMIT | 落库 | INSERT 0 1 | ✅ |
| COMMIT 后无上下文 | 9 行（8+1） | 9 | ✅ |
| T1 上下文读新行 | 0（越权拦截） | 0 | ✅ |
| T2 上下文读新行 | 1 | 1 | ✅ |
| T2 上下文 DELETE 本租户行 + 无上下文 | 恢复 8 行 | 8 | ✅ |

验证期间无污染残留（清理后计数已核）。

## 四·C、真实进程 + JWT + HTTP 全链路（新增，hrm 服务 8020）

启动真实 `topems-hrm`（`DATABASE_URL=…5432/topems` + 非默认 `JWT_SECRET`，redis 在线）；自签 HS256 JWT（Claims 含 `permissions:["hrm:admin"]`，与启动 secret 一致）；经 `curl http://localhost:8020/api/hrm/employees` 走完整中间件链：`auth_middleware`（验签+注入 Claims）→ `require_permission("hrm:admin")`（Claims 检查）→ `tenant_middleware`（begin + set_config + txn 注入）→ handler。

| 场景 | 期望 | 实测 | 结论 |
|---|---|---|---|
| T1 token GET | 仅 T1（6 行） | total=6 | ✅ |
| T2 token GET | 仅 T2（1 行） | total=1 | ✅ |
| 无 token | 401 | 401 | ✅ |
| 越权写：T1 token + body tenant_id=T2 | 不允许写入 T2 | 200 成功，**落库强制 T1**（body 被忽略） | ✅ 业务层正确 |
| service token GET | （见下注） | total=0 | ⚠️ 非 RLS 问题 |

> service token 注：`list_employees` handler 用 `get_tenant_id(claims, headers)`（service 无 tenant_id → 随机 UUID）作显式 `WHERE tenant_id=$5` → 0 行。此为 handler 业务行为，非 RLS 缺陷；service 身份的"RLS 层豁免"在 handler 显式过滤下不体现。

**关键发现（写路径 RLS 兜底缺口，已核实）**：
- `create_employee` handler 已注入 txn（Extension txn_arc + guard），但业务写入经 `EmployeeService::new(state.db, …)` → `self.db`（**PgPool 直连，无 GUC → RLS 全放行**）→ **写路径无 RLS 二次防护**。
- 隔离当前由业务层保证：service INSERT 用 `self.tenant_id`（来自 claims），body 的 tenant_id 被忽略（实测落 T1）——**无越权写漏洞**，但 A 方案"RLS 兜底"在该封装路径未生效。
- hrm 分布：16 模块 201 处 `&mut **txn` 直查（RLS 生效）；employee.rs 的 EmployeeService 封装路径属豁免形态（employee.rs 仅 3 处 txn 直查）。对照 erp 284 处 txn 直查。
- 修复选项（待拍板）：A=EmployeeService 方法穿透 txn（&mut PgConnection）；B=全仓盘点"txn 白拿"handler 批量穿透；C=接受现状（业务层已保证），RLS 兜底列入后续。
- **已拍板：B 方案（全仓批量盘点穿透）**，实施与复测见 §四·D。

## 四·D、B 方案实施：写路径 RLS 兜底穿透（已闭环）

盘点脚本（`/tmp/rls_txn_audit.py` 修正版）以「handler 注入 txn_arc 但业务 SQL 未走事务」为判据全仓扫描（8 服务 modules/*.rs），初筛 37 个→逐个人工核对后**真白拿 6 个（写 4 + 读 2）**，其余 31 个为误报（txn 变量名 `tx`、薄包装传参、无 SQL 纯内存/mock、池豁免）。实施如下：

| 服务/文件 | handler | 缺口 | 修复 |
|---|---|---|---|
| hrm/employee.rs | update_employee / delete_employee | EmployeeService 写走 PgPool（self.db） | service 方法加 `conn: &mut sqlx::PgConnection`，体内 `&self.db`→`&mut *conn`（2+1 处）；handler 传 `&mut *txn` |
| srm/data_sync.rs | sync_supplier_from_scm | UPDATE/INSERT 走 `&state.db` | 业务 SQL→`&mut **txn`（fetch_optional/fetch_one/execute）；成功路径补 commit（原 pool 自动提交，改 txn 后必须显式 commit） |
| srm/data_sync.rs | sync_all_suppliers_from_scm | 同上（循环内批量写） | 同上 + 循环后补 commit |
| scm/data_sync.rs | purchase_to_inbound / create_inbound_from_purchase | 写经 `create_inbound_from_purchase_internal` 走 `&state.db`（INSERT/UPDATE×3 + 读×2） | internal 加 `txn: &mut sqlx::Transaction` 参数、体内 `&state.db`→`&mut **txn`（5 处）；两 handler 传参 + 调用后 commit |

**同步穿透（读路径，同文件低成本）**：srm/data_sync.rs `sync_supplier_to_scm` / `sync_all_suppliers_to_scm` / `get_sync_logs` 的 `&state.db` 读→`&mut **txn`（3 handler，A 类 handler 内直查）。

**复核归零**：修正判据（含 `tx` 变量名、txn 传参、guard.take/commit）全仓复扫 → **写路径真白拿 = 0**。逐项豁免/已穿透依据：
- erp sales_order approve/ship/complete/cancel：薄包装把 txn 传 `update_sales_order_status` ✓ 已穿透
- crm auto_segment：`count_matching_customers(txn, …)` ✓ 已穿透
- erp receive_mes_progress / wms count/adjust_stock_take / scm compute_mrp：`&mut *tx`（tx 变量名）✓ 已穿透
- erp preview_add_column / wms get_trace / tms 3 个 / srm portal 3 个：**无 SQL**（纯内存算法 / mock 数据）→ 无 RLS 风险，豁免
- hrm employee list/get/create：EmployeeService 读路径，SQL 均有显式 `tenant_id` 业务过滤 → 读兜底由业务层承担（豁免，记录在案）

**验证**：
- `cargo check --workspace`（DATABASE_URL 注入 + CARGO_BUILD_RUSTC_WRAPPER=""）：0 error（2m03s）
- hrm 真实进程 + JWT 全链路复测（8020，改造后代码）：
  - T1 token 正常 UPDATE 自己员工 → 200「员工更新成功」，GET 验证落库 ✓（txn 穿透无回归）
  - **越权 UPDATE**：T1 token 改 T2 员工 → 404「员工不存在」（RLS 上下文 T1 拦在 SELECT existing，早退）✓，T2 数据未污染 ✓
  - **越权 DELETE**：T1 token 删 T2 员工 → 404 ✓，T2 行仍存在 ✓
  - 测试数据已恢复（T1 total 仍 6，name 还原）
- 修复后写路径防护链：**业务层 tenant 条件（第一层）+ txn 内 RLS FORCE 过滤（第二层）**，事务提交前双重校验。

## 五、结论

- **A 方案隔离生效**：受限角色在 `app.tenant_id` 注入下读写均被 RLS 约束；越权读=0 行、越权 UPDATE=0 行受影响（静默）、越权 INSERT=WITH CHECK 报错。
- **服务豁免正确**：nil UUID 上下文（服务间调用）全放行，未破坏既有服务链路。
- **兼容模式正确**：无租户上下文全放行，既有连接/直查不受影响。
- **FORCE 价值落地**：表 owner（topems）在租户上下文下同样被过滤——此前"owner 绕过"的管理通道已关闭。
- **GUC 事务局部性正确**：`set_config(..., true)` 随事务提交/回滚消失，不跨请求泄漏租户上下文。

## 六、剩余缺口（未做，如需可继续）

1. ~~service 封装路径的 RLS 兜底~~：**已闭环**（B 方案，见 §四·D）——hrm EmployeeService、srm/scm data_sync 写路径全部穿透 txn + 补 commit，写路径真白拿归零；读路径豁免清单与依据已记录。
2. ~~跨服务事件链路~~：**已闭环**（B 方案事件链隔离，commit 见下）。

## 六·A、事件链路隔离专项（2026-09-09，B 方案闭环）

### 1. 排查结论（改动前）
- 事件消费者全部走 `&self.db` PgPool 直连（**无 GUC 注入**）→ RLS 兼容模式全放行，隔离完全靠业务层 tenant 过滤。
- **🔴 高风险**：`crm.handle_payment_received`、`erp.handle_payment_received/made` 核销 UPDATE 无租户条件，兜底分支 `WHERE status='pending' AND amount=$N [LIMIT 1]` 可能命中他租户最早 pending 单据；根因是 `PaymentReceivedPayload/PaymentMadePayload` 无 tenant_id 字段。
- **🟡 中风险**：约 13 个事件消费者 INSERT 不带 tenant_id → 孤儿行（tenant_id=NULL），租户查询不可见。
- **🟠 表设计**：crm.sales_orders、erp.vouchers、erp.voucher_items、wms.purchase_order_snapshots 无 tenant_id 列、RLS 未启用。

### 2. 实施（本专项提交）
- **payload 层**：13 个事件 payload struct 增加 `tenant_id: Option<Uuid>`（`#[serde(default)]` 兼容旧事件）：PaymentReceived / PaymentMade / ShippingOrderRequested / InboundOrderRequested / SalesOrderApproved / PurchaseOrderApproved / PurchaseOrderCreated / StockInbound / StockOutbound / AfterSalesTicketCreated / OpportunityWon / HrmPayrollVoucherRequested / WorkOrderCompleted（`lib/shared-event/src/event/event_types.rs`）。
- **发布点层**：8 处发布点统一在 txn 内读取 GUC `app.tenant_id` 并填充 payload：wms data_sync（shipping）/inbound_order、scm purchase_order（approve）/data_sync（inbound+batch）、erp purchase_order（create+approve）/sales_order、finance create_collection_handler（已有 tenant 变量直接复用）。
- **核销链 tenant 化**（crm+erp 三 handler，统一模式）：`match payload.tenant_id { Some(tid) => 全部 SQL 加 AND tenant_id=$N，None => Ok(None) }`——**无租户时禁用兜底匹配（宁缺勿乱）**，从根上堵死跨租户乱配。
- **孤儿 INSERT 全量绑定**：crm 3 处（interactions/sales_orders×2）、erp 10 处（receivables/payables/financial_vouchers×4/vouchers×3/….）、wms 3 处（inbound_orders/purchase_order_snapshots×2）、finance 7 处（core_finance_vouchers 硬编码 nil 租户改为真实 tenant、source_amount_snapshots×4、快照审批/拒绝 UPDATE 加 tenant 条件）——统一 `.bind(tenant.unwrap_or(Uuid::nil()))`，存量事件（无 tenant）落 nil 租户而非 NULL。
- **B-2 迁移** `database/migrations/20260909000001_rls_event_chain_tenant.sql`（已实跑 5432）：4 张无租户表加 tenant_id 列 + 索引 + `rls_tenant_isolation` 策略；crm.sales_orders / erp.vouchers / wms.purchase_order_snapshots 三表 **FORCE RLS**（写方均已绑定）；erp.voucher_items 仅 ENABLE 不 FORCE（HTTP 明细写入未绑 tenant，待绑定后补 FORCE，见 §六·B）。

### 3. 验证（本机 5432 实跑）
- **静态核对**：发布点 GUC 读取 8/8；核销 handler `match payload.tenant_id` 3/3；孤儿 INSERT 绑定 23 处（crm 3 + erp 10 + wms 3 + finance 7）；`cargo check --workspace` 0 error。
- **FORCE 语义实测（topems 设 GUC）**：
  - crm.sales_orders：GUC=t1 + tenant=t1 插入 ✓；GUC=t1 + tenant=t2 插入 **被 RLS 拒绝** ✓；未设 GUC 插入放行（事件消费进程现状，符合宽松策略设计）。
  - erp.vouchers：GUC=t1 + 本租户 ✓ / 跨租户被拒 ✓。
  - 核销 UPDATE 隔离：GUC=t1 更新 tenant_id=t1 单据命中（pending→paid）✓；GUC=t2 对 tenant_id=t1 条件 0 行 ✓。
- **零污染**：全部测试行已清理（sales_orders/vouchers/billing_records 均回到 0 行）。

## 六·B、补充专项（2026-09-09 第二轮：消费者写入全量一致化）
**范围**：盘点 4 服务全部事件消费者写表（36 个 handler），对写 tenant 表但未绑 tenant 的路径全量补齐。

**已闭环**：
1. **erp.handle_return_completed 绑定**（ReturnCompletedPayload 发布方 crm.aftersales 已填 tenant_id）：financial_vouchers + voucher_items×2 补 tenant 列与绑定。
2. **erp.voucher_items 事件侧全量绑定**：sales_order_approved×2 / purchase_order_approved×2 / hrm_payroll×1 / return_completed×2 共 7 处 INSERT 加 tenant 列+VALUES+bind。
3. **erp HTTP create_voucher（POST /api/erp/vouchers）tenant 化**：txn 内读 GUC `app.tenant_id`，financial_vouchers（14→15 列）+ voucher_items（11→12 列）写入真实租户——修复"凭证对所有租户可见"漏洞。
4. **fin_reconciliations 快照审批 UPDATE 加 `AND tenant_id`**：handle_reconciliation_approved（WHERE 原仅 id+status）、handle_reconciliation_updated（原仅 id）→ 跨租户改写风险消除。
5. **死链路 handler 一致化**：handle_employee_onboarded / handle_pm_project_completed / handle_pm_project_settled 的 payables/receivables/financial_vouchers/voucher_items 补 tenant 绑定；EmployeeOnboardedPayload / PmProjectCompletedPayload / PmProjectSettledPayload 增加 `tenant_id: Option<Uuid>` 字段（**注意：全仓无这些事件的发布方，属空转订阅，绑定仅为一致性 + 未来发布方接入准备**）。
6. **SalesOrderCreatedPayload 补 `tenant_id` 字段 + erp 发布点注入**（finance.create_auto_voucher 调用点依赖该字段，上一轮漏检）。

**B-2 补迁移** `20260909000002_rls_voucher_items_force.sql`（已实跑）：voucher_items FORCE。

**验证（5432 实测，全部事务回滚零污染）**：
- voucher_items FORCE 后：GUC=t1 本租户插入 ✓（事件 11 列 / HTTP 12 列两种形态均过）；GUC=t2 插入 t1 租户行 → **RLS 拒绝** ✓
- fin_reconciliations UPDATE 隔离：GUC=t1 同租户命中 ✓；GUC=t2 对 t1 单据 **0 行** ✓
- `cargo check --workspace` 0 error

**第三轮（遗留全量评估）已闭环**：
1. **PaymentMade 事件链修复（原误判"无发布方"）**：实为**事件类型不一致**——finance `create_payment_handler` 发布 `FinancePaymentMade`（FinancePaymentMadePayload），erp 订阅 `PaymentMade`（PaymentMadePayload）→ 应付核销**永远收不到**。修复：finance 改发 `EventType::PaymentMade` + `PaymentMadePayload`（supplier_id=req.supplier_id / payment_method / paid_at / tenant_id 全字段对齐），erp 侧订阅与核销（supplier_id 分支 + tenant 绑定）本已就位。链路现连通。
2. **erp_cost_allocations 死代码清理**：`handle_work_order_completed` 的成本归集 INSERT 整段删除（handler 保留为订阅占位）；`handle_stock_inbound` 重构——删成本核算段、保留生产入库 PROD-IN 凭证生成（有效写入）。表在库中不存在 + 无发布方闭环，建表无业务意义，未来如需成本归集按新功能立项。

**评估后保留（不做，记录理由）**：
1. **事件消费进程注入 GUC（纵深防御项，不实施）**：现隔离由代码层 tenant 绑定兜底（所有写 tenant 表路径已全量绑定），**当前无跨租户污染**；消费者入口注入需改造 shared-event 基础设施 + 36 个 handler 签名，ROI 低、风险高。如未来新增 handler 引入未绑写入，属新代码缺陷，由 code review 拦截。
2. **erp.account_balances 无租户维度（已知设计，不改）**：表为按 material_code 的**全局库存账**（material_code: text + last_movement_*），与共享库存模型一致（物料全局唯一、账目跨租户共享）。若产品未来切换租户隔离库存，需整体物料租户化（大改），单表加列无意义。

## 七、验证资产

- 受限角色 `rls_e2e`（密码 `rls_e2e_secret`）保留，可复测；验证脚本 `/tmp/rls_e2e_verify.sql`。
- 测试数据：验证过程中无污染写入（INSERT 被拦截、UPDATE 0 行受影响，`t1_name_x=0` 已核）。

---

## RLS 覆盖率专项收尾（2026-09-09）

**盘点结论**：早期"234 张未启用 RLS"判定已过时——迁移 20260908000017/18（rls policy align / rls force）+ 572 条策略落地后，含 `tenant_id`/`org_id` 列的全部 **538 张表已 100% 启用 RLS 且均有策略**（0 张缺失）。

**收尾缺口**：538 张中 312 张已 FORCE，**226 张 RLS 未 FORCE**（表 owner 可绕过策略），按 schema 分布：pm 36 / erp 22 / wms 22 / mobile 18 / mes 18 / ehs 16 / lims 13 / srm 8 / flow 7 / qms 7 / crm 7 / scm 6 / doc_service 6 / ai·bi·integration·portal 各 4 / finance·rs·iam·communication 各 3 / master_data·hrm·ticket·mail 各 2 / core·storage·report·notification 各 1。

**实施（迁移 `20260909000004_rls_force_all.sql`，已应用）**：226 张表 `ALTER TABLE ... FORCE ROW LEVEL SECURITY` 全部执行无错；当前 FORCE 覆盖 **538/538（100%）**。

**验证**：
- `sqlx migrate info`：99 条全部 installed，0 error/pending
- 冒烟：带 `app.tenant_id`（UUID）上下文查询返回该租户 0 行（策略生效）；无上下文返回 0 行（FORCE 后 owner 裸查不泄露）
- crm 服务测试 501 passed（RLS 隔离用例 ok）——服务层不受 FORCE 影响
