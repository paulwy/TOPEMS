# K8 收紧方案：5 张 fail-open 表的 RLS 谓词（2026-11-15）

状态：**方案稿，未写迁移、未动生产**。对应登记项见
[topems-table-inventory-2026-11-14.md](topems-table-inventory-2026-11-14.md) 的 **K8**。

范围（5 张，prod 侧当前 fail-open）：

- `crm.billing_records`
- `erp.erp_master_data_refs`
- `tms.tms_carriers`
- `tms.tms_drivers`
- `tms.tms_vehicles`

## 结论先说

1. **数据前置条件天然满足**：prod 5 张表均 **0 行**，无 `tenant_id IS NULL`、无孤儿、无跨租户脏数据，
   不需要清理或隔离配额。
2. **影响面**：HTTP 主链路（TMS 三模块、ERP 主数据、CRM 账单）全部走请求级 RLS 事务，收紧后安全；
   但有 **3 处裸连接池路径**没有租户 GUC，收紧后会断——CRM 分析看板（静默空结果）、
   CRM 事件链（应收创建失败/核销失效）、ERP 主数据事件链（UPSERT 报 42501 进重试/DLQ）。
3. **建议拆两批**：`tms` 3 张无代码依赖、先行；`crm.billing_records` + `erp.erp_master_data_refs`
   必须先完成代码侧作用域改造并投递新二进制，再收紧。
4. 全程 DDL-only，不涉及数据变更，回退不丢数据；回退顺序必须是「先回策略、再回二进制」。

## 1. 逐表现状（prod 只读实测 2026-11-15）

| 表 | 策略名 | permissive/cmd | rls / force_rls | 行数 | `tenant_id IS NULL` | `tenant_id` 列 | 租户索引 |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| `crm.billing_records` | `rls_tenant_isolation` | PERMISSIVE / ALL | t / t | 0 | 0 | NOT NULL | `idx_crm_billing_records_tenant` |
| `erp.erp_master_data_refs` | `rls_tenant_isolation` | PERMISSIVE / ALL | t / t | 0 | 0 | NOT NULL | **无** |
| `tms.tms_carriers` | `rls_tenant_isolation` | PERMISSIVE / ALL | t / t | 0 | 0 | 可空 | **无** |
| `tms.tms_drivers` | `rls_tenant_isolation` | PERMISSIVE / ALL | t / t | 0 | 0 | 可空 | **无** |
| `tms.tms_vehicles` | `rls_tenant_isolation` | PERMISSIVE / ALL | t / t | 0 | 0 | 可空 | **无** |

五张表的策略均为 `FOR ALL TO PUBLIC`，`USING` 与 `WITH CHECK` 同文。谓词有两种写法，语义等价（均 fail-open）：

```sql
-- crm.billing_records / tms.tms_carriers / tms.tms_drivers / tms.tms_vehicles
current_setting('app.tenant_id', true) IS NULL
OR current_setting('app.tenant_id', true) = ''
OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
OR tenant_id IS NULL
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid

-- erp.erp_master_data_refs（COALESCE 版，tenant_id 走 text 比较）
COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
OR current_setting('app.tenant_id', true) IS NULL
OR current_setting('app.tenant_id', true) = ''
OR tenant_id IS NULL
OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
```

前两个 `IS NULL` / `= ''` 分支就是 K8 缺陷本体：**未设 GUC 的裸连接直接放行全表**。

dev 侧同 5 表策略名与谓词与 prod 一致（本批前一窗口已对齐），索引差异 1 处：
dev 多一条 `idx_master_data_refs_domain`（与 `erp_master_data_refs_domain_idx` 重复），属 dev 代际差，本方案不处理。

dev 存量（演练用）：`erp.erp_master_data_refs` 40 行 / 18 个租户（含 1 行 nil 租户、14 行 `...0001`），
`tms.tms_carriers` 1 行、`tms.tms_vehicles` 1 行（均为 `...0001`），`crm.billing_records` / `tms.tms_drivers` 0 行；
无 `tenant_id IS NULL`。

## 2. 目标形状

与今天已收口的 22 张 mes、8 张 erp/crm/portal 表保持同一形态（
`20261114200000_mes_rls_fail_closed_22.sql`、`20261114202000_erp_crm_portal_rls_fail_closed_8.sql`）：

```sql
DROP POLICY IF EXISTS rls_tenant_isolation ON <表>;

CREATE POLICY rls_tenant_isolation ON <表>
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
```

- **策略名统一为 `rls_tenant_isolation`**：prod 现状即此名，无需改名；与已完成批次同名同形，
  后续结构核对可按「每表 1 条同名策略」一刀切。
- **为什么带 `app.rls_system` 分支，而不是只写 `tenant_id = GUC`**：
  1. 服务身份（service token）走 `nil 租户 + app.rls_system='on'`，是仓库既有的显式系统通道
     （见 `lib/shared-db/src/scope.rs` 的 `scope_system` / `scope_read_system`）。只写租户等值会切断
     服务间调用与后台批处理；
  2. 该分支**不是「未设即放行」**：它要求 GUC 被显式置为 `on`，裸连接读到的是 NULL →
     `COALESCE(...,'off')` → 不命中，属 fail-closed；
  3. 与 M1/M2b 同形，减少策略形态种类，便于以后统一收敛为生成器产物。
- 保留 `ENABLE` 与 `FORCE ROW LEVEL SECURITY`（5 表当前均为 true，不需要改）。
- 建议同批把 `tms` 3 张表的 `tenant_id` 收为 `NOT NULL`（详见 §4）。

## 3. 影响面核查（重点）

### 3.1 有租户上下文的路径——收紧后不会断

请求级统一由 `tenant_middleware` 在事务内 `set_config('app.tenant_id', …, true)` /
`set_config('app.rls_system', …, true)`（[tenant.rs](../../lib/shared-auth/src/middleware/tenant.rs) L530-538），
模块用 `Db::scope_with(txn)` 或注入的 `txn_arc` 复用该事务。超管必须显式带 `x-tenant-id`，
服务身份固定 nil + 系统通道，普通用户取 Claims 租户。

| 表 | 引用点 | 读/写 | 上下文 | 判定 |
| --- | --- | --- | --- | --- |
| `tms.tms_carriers` | [carrier.rs](../../svc/tms/src/modules/carrier.rs) L152/L176/L259/L352/L412/L505/L603/L671/L687/L767/L782 | 读/写 | HTTP，`scope_with` | 不断 |
| `tms.tms_drivers` | [driver.rs](../../svc/tms/src/modules/driver.rs) L152/L172/L255/L347/L406/L476/L544/L559/L637/L652/L730/L746 | 读/写 | HTTP，`scope_with` | 不断 |
| `tms.tms_vehicles` | [vehicle.rs](../../svc/tms/src/modules/vehicle.rs) L149/L169/L252/L344/L403/L495/L583/L599/L678/L706/L788/L804 | 读/写 | HTTP，`scope_with` | 不断 |
| `tms.*` 分析 | [analytics.rs](../../svc/tms/src/modules/analytics.rs) L186（vehicles）/L318（carriers）/L479（drivers）/L642（vehicles） | 读 | HTTP，`scope_with` | 不断，但需注意：这几条**没有内联 tenant 过滤**，完全依赖 RLS；收紧后由「跨租户可见」变为「正确收窄」，属修缺陷不是回归 |
| `crm.billing_records` | [billing.rs](../../svc/crm/src/modules/billing.rs) L87/L107/L184/L255/L334/L409/L481/L555 | 读/写 | HTTP，`txn_arc`（请求事务） | 不断 |
| `erp.erp_master_data_refs` | [master_data_crud.rs](../../svc/erp/src/modules/master_data_crud.rs) L205/L223/L289/L342；[master_data_lifecycle.rs](../../svc/erp/src/modules/master_data_lifecycle.rs) L133/L154/L187/L259/L277/L307/L382/L400/L433/L504/L522；[master_data_conflict.rs](../../svc/erp/src/modules/master_data_conflict.rs) L157/L342/L762/L774/L786；[master_data_governance.rs](../../svc/erp/src/modules/master_data_governance.rs) L62/L70/L78/L86/L94/L102/L178；[master_data_quality_rules.rs](../../svc/erp/src/modules/master_data_quality_rules.rs) L889/L897；[master_data_lineage.rs](../../svc/erp/src/modules/master_data_lineage.rs) L66 | 读/写 | HTTP，`txn_arc`（请求事务） | 不断 |
| `erp.*` 资产/版本/血缘图 | `master_data_assets.rs` / `master_data_version.rs` / `master_data_lineage_graph.rs`（经 `MasterDataRefService`） | 读/写 | `Db::scope_for_tenant` | 不断 |

### 3.2 无租户上下文的路径——收紧后会断，必须改代码

| # | 引用点 | 表 | 读/写 | 上下文 | 现状 | 收紧后 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [crm/event_handlers/mod.rs](../../svc/crm/src/event_handlers/mod.rs) L24-31（`pub db: PgPool`）、L310 SELECT、L333 INSERT | `crm.billing_records` | 读/写 | `OpportunityWon` 事件，裸池 | 走 IS NULL 分支放行 | INSERT 报 `42501 new row violates row-level security policy`，被 `warn` 兜住 → **应收账单静默丢失** |
| 2 | 同上 L402/L420 UPDATE | `crm.billing_records` | 写 | `PaymentReceived` 事件，裸池 | 放行 | UPDATE 命中 0 行 → **核销静默失效**（已按 `tenant_id` 过滤，不会误核销，但也不再生效） |
| 3 | [erp/event_handlers/mod.rs](../../svc/erp/src/event_handlers/mod.rs) L43（`pub db: PgPool`）、L1266 UPSERT | `erp.erp_master_data_refs` | 写 | 主数据变更事件（MDM 同步），裸池 | 放行 | 42501；按 R-7b 新语义 Err 上抛 → **重试/DLQ 堆积** |
| 4 | [crm/modules/analytics.rs](../../svc/crm/src/modules/analytics.rs) L516-527 / L545 / L561 | `crm.billing_records` | 读 | HTTP 分析看板，`state.db`（`ApiState.db: PgPool`，见 [modules/mod.rs](../../svc/crm/src/modules/mod.rs) L35） | 放行（且跨租户） | 返回 0 行，`unwrap_or_default` → **看板静默空** |

修复方向（本方案不含代码改动）：

- 1/2：`CrmEventHandlers` 改注入 `Db`；`OpportunityWon` 由 `customer_id` 反查租户后
  `scope_for_tenant(tenant)`，反查不到/为 nil 时跳过并 `warn`（宁缺勿乱）；`PaymentReceived` 已有
  `payload.tenant_id` 判定，改为 `scope_for_tenant`，`None` 保持跳过。
- 3：`ErpEventHandlers` 改注入 `Db`；按 `event.tenant_id` 走 `scope_for_tenant`，nil 落 `scope_system`。
- 4：复用请求事务 `state.db.scope_with(txn)`（与 billing.rs 同形），或 `scope_read_for_tenant`；
  超管语义会从「全量」变为「必须显式选租户」，需产品侧确认（见 §8）。

### 3.3 运维/迁移脚本

| 引用点 | 影响 |
| --- | --- |
| [scripts/db/rls-app-exemption.sql](../../scripts/db/rls-app-exemption.sql) L63 | 仍在写入 `erp.erp_master_data_refs` 的**旧 fail-open 策略**（`tenant_isolation_*` 前缀、含 `tenant_id IS NULL` 分支）。若投递后被再次执行，会把收紧覆盖回去。投递前需确认该脚本已废弃或改写 |
| `scripts/ci/refresh-prod-cols.sh` / `prod_cols.psv` | 只读系统目录与列定义，不读行数据，不受 RLS 影响 |
| `fixtures/*.sql`、迁移文件 | 只含 DDL，不受影响 |
| [scripts/db/](../../scripts/db/) 其余窗口/演练脚本 | 用 owner 或显式租户 GUC 连接，未发现这 5 张表的数据读写 |

### 3.4 未知（不猜）

- 仓库外是否有 BI / 报表工具 / 运维终端直连生产库读这 5 张表（尤其 `tms_*` 基础档案的导出）。
- 生产当前部署的二进制是否与 main 一致（决定 §3.2 的 4 条路径在生产是否确实为裸池形态）。
- 是否存在早期版本服务实例仍在用旧事件处理器订阅同一事件（会被 RLS 拦下且不报警）。
- `crm.billing_records` 的写入方除 CRM 事件链外，是否还有 finance/erp 侧直写（注释里写「写入方待接通」，代码未见）。

## 4. 存量数据前置条件

| 表 | prod 行数 | `tenant_id IS NULL` | 孤儿/跨租户脏数据 | 结论 |
| --- | ---: | ---: | --- | --- |
| `crm.billing_records` | 0 | 0 | 无 | 无需处理 |
| `erp.erp_master_data_refs` | 0 | 0 | 无 | 无需处理 |
| `tms.tms_carriers` | 0 | 0 | 无 | 无需处理 |
| `tms.tms_drivers` | 0 | 0 | 无 | 无需处理 |
| `tms.tms_vehicles` | 0 | 0 | 无 | 无需处理 |

- prod `iam.tenants` 不存在（`to_regclass` 为 NULL），孤儿判定没有权威租户表可 join；因表为空，
  本轮不需要归属判定，后续若接入租户表再补口径。
- **为什么 NULL 租户行必须在收紧前处理**：fail-closed 下 `tenant_id IS NULL` 的行对所有请求租户
  都不可见，只有系统通道能读到；过程**不报错**，表现为「数据消失」。当前 5 表 0 行，不存在此风险，
  这也是本批可以不做数据清洗的原因。
- `tms` 3 表 `tenant_id` 可空：建议在批内加 `NOT NULL`（0 行，约束瞬时），加之前先断言
  `count(*) FILTER (WHERE tenant_id IS NULL) = 0`，失败即 RAISE。这会把「无租户写入」从
  「写进去后不可见」提前为「写入直接失败」，是更安全的失败面。
- dev 的 40 行 `erp_master_data_refs` 跨 18 个租户（含 1 行 nil），正好用于验证「收紧后只看到
  本租户子集」；演练不改动这些行。

## 5. 落地顺序

### Step 0 代码修复（先于 batch 2 部署）

按 §3.2 修 4 条路径；回归范围：`svc/crm`（billing + analytics + event_handlers）、`svc/erp`
（event_handlers）、`lib/shared-db`。验证：事件链集成测试 + 分析看板非空 + `cargo clippy/test`。
**这一步不涉及 DDL，可在任意时点发布。**

### Step 1 迁移 batch 1：`tms` 3 张（无代码依赖，可先行）

1. 断言：3 表 `tenant_id IS NULL` 计数 = 0；每表仅 1 条 `rls_tenant_isolation`。
2. `DROP POLICY IF EXISTS rls_tenant_isolation` + 按 §2 建新策略（3 表）。
3. `ALTER TABLE … ALTER COLUMN tenant_id SET NOT NULL`（建议）。
4. 补租户索引：`idx_tms_carriers_tenant` / `idx_tms_drivers_tenant` / `idx_tms_vehicles_tenant`。
5. 自证断言：`pg_policies` 每表 1 条、`qual` 含 `app.rls_system` 且**不含** `IS NULL`；
   `relrowsecurity` / `relforcerowsecurity` 仍为 true。

### Step 2 迁移 batch 2：`crm.billing_records` + `erp.erp_master_data_refs`

前置硬约束：**Step 0 的新二进制已全量发布且事件链无异常**（否则事件写入被策略拦下）。
内容同 Step 1（断言 → 换策略 → 自证），另补 `idx_erp_master_data_refs_tenant`。
`crm.billing_records` 已有租户索引，不重复建。

> 索引说明：5 表 prod 均 0 行，迁移在事务内执行（`apply-forward.sh` 单文件单事务），
> 不能用 `CREATE CONCURRENTLY`；0 行建索引为瞬时操作，普通 `CREATE INDEX` 即可。

**rollback 写法**（每笔迁移一份，放 `database/rollback/`，与既有批次同构）：

1. `DROP POLICY IF EXISTS rls_tenant_isolation ON <表>;`
2. 按 §1 的 prod 2026-11-15 快照原文，逐表 `CREATE POLICY rls_tenant_isolation … AS PERMISSIVE
   FOR ALL TO PUBLIC USING (<旧谓词>) WITH CHECK (<旧谓词>);`
3. 不动 `rls` / `force_rls`（前后均为 true）；`NOT NULL` 与索引不主动回退（不影响写入语义，
   回退会重新暴露 NULL 租户行）。
4. rollback 文件里同时固化「为何保留 fail-open」的一句话，避免以后被误判为遗漏。

### Step 3 dev 演练（5 张表逐张，不抽样）

以非超户、非表 owner、无 `BYPASSRLS` 的 `topems_app` 连接执行：

| 场景 | 操作 | 期望 |
| --- | --- | --- |
| 同租户读 | `set_config('app.tenant_id', A, true)` 后 `SELECT` | 只返回 A 的行；用 dev 现有 40 行验证「只看到本租户子集」 |
| 异租户读 | 同上连接改 `app.tenant_id = B` | 0 行 |
| 裸连接无 GUC | 不设任何 GUC 直接 `SELECT` | **0 行**（当前实测 5 表均返回全表，即 K8 现象） |
| 跨租户写 | `app.tenant_id = A` 时 `INSERT … tenant_id = B` | 报 `42501`，被拒 |

每表独立事务，探针行在验证后删除（`app.rls_system='on'` 下清理），最后复核 `count(*)` 回到演练前。

### Step 4 生产投递

- 窗口：低峰；投递前 `pg_dump --schema-only -t <5 表>` 存档到本地临时目录并记录路径。
- 走 `scripts/migration/apply-forward.sh` 生产路径，逐笔单事务；每笔核 `success=t` 与自证断言。
- **不重启生产进程**（DDL-only，无二进制变更；batch 2 的二进制发布按正常发布流程单独进行）。

### Step 5 观测口径（24h）

| 指标 | 期望 |
| --- | --- |
| `pg_policies` 5 表 | 每表 1 条 `rls_tenant_isolation`，`qual` 含 `app.rls_system`，不含 `current_setting(...) IS NULL` 放行分支 |
| 应用日志 | 无 `42501` / `violates row-level security policy` |
| CRM 分析看板 | 账单状态饼/账龄/Top10 非空（有数据租户） |
| ERP MDM 事件 | ref 表行数按事件正常增长，DLQ 不增长 |
| TMS 列表/详情 | 200，且返回条数与租户数据一致（非全表） |
| 跨租户探针 | 生产中只读探针（无 GUC）读 5 表均为 0 行 |

回滚触发条件：任一业务接口出现 RLS 报错、DLQ 持续增长、或事件链断流。

## 6. 风险与回退

- **回退不丢数据**：两笔迁移都是策略 DDL，无 `UPDATE`/`DELETE`；rollback 只恢复旧策略原文。
- **最快回退**：执行 rollback 迁移（秒级），**不要先回退二进制**。新代码在 fail-open 策略下
  仍然工作（`scope_for_tenant` 设的 GUC 只是不再被强制；唯一副作用是 `scope_system` 路径可读全量，
  与当前现状一致）。
- **禁止的顺序**：先回退二进制、后回策略——旧二进制 + 收紧策略会让事件链直接断，且没有报警，
  只能靠 DLQ/数据缺失发现。
- **回退期间的残余风险**：策略恢复 fail-open 后，裸连接重新可读全表（回到 K8 现状），
  属已知且可接受，需在回退记录中写明窗口。
- **分批的价值**：batch 1 若出问题只影响 TMS 基础档案；batch 2 单独可回退，避免与代码发布叠加。

## 7. 分批建议

**建议拆两批（batch 1 = tms 3 张，batch 2 = crm + erp 各 1 张）**，理由：

1. **依赖不同**：只有 `crm.billing_records` 与 `erp.erp_master_data_refs` 存在裸池代码依赖，
   需要「先代码后策略」；TMS 3 张没有任何代码前置条件，可以独立、更早验证真实收紧效果。
2. **故障归因**：一次投 5 张时，若出现 42501，无法快速区分是策略问题还是代码未就绪；
   拆批后 batch 1 本身就是对策略与演练脚本的实战校验。
3. **成本可控**：5 表 prod 均 0 行，多一次窗口的代价远低于一次混合故障的定位成本。

若 Step 0 的代码修复能提前一个发布周期上线并稳定，也可合并为单笔；但即使合并，
仍建议保留两份 rollback，以便按表回退。

## 8. 待确认（不与结论混写）

1. 生产当前部署的二进制是否已包含 `Db` 作用域改造——若生产 CRM/ERP 事件链已不是裸池，§3.2 的
   1/2/3 条风险等级下调。
2. 是否有仓库外的 BI / 报表 / 运维直连读这 5 张表（§3.4 的「未知」），需要业务侧确认。
3. `scripts/db/rls-app-exemption.sql` 是否仍在被使用；若在用，需先改写或明确废弃，否则可能覆盖收紧结果。
4. `tms` 3 表是否同批加 `tenant_id NOT NULL`——这会改变写入契约（无租户写入从「静默不可见」
   变为「直接失败」），需要 TMS 写入方确认。
5. CRM 分析看板对超管的语义：目前 `resolve_tenant` 对超管返回 `None`（看全量）。收紧后若改走
   请求事务，超管必须显式选租户，看板将只显示单租户数据——是否接受。
6. 事件链在租户反查不到时的处置：跳过 + `warn`（宁缺勿乱）是否满足业务预期，还是需要进死信人工补。
