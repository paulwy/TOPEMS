# 零租户数据盘点与清洗方案（core.ai_faqs / public.core_faqs / public.core_guides）

- 日期：2026-11-16
- 范围：`core.ai_faqs` 15 行、`public.core_faqs` 12 行、`public.core_guides` 12 行，`tenant_id` 为零 UUID
- 约束：本轮**只读**，对 `topems_prod` 零写入零删除；不改 RLS 策略；不改已有迁移；不 push
- 生产读取方式：`SET LOCAL app.rls_system='on'` 仅用于只读盘点（系统通道，读后即回滚/结束会话）

## 1. 结论摘要

| 类别 | 行数 | 处置 |
| --- | --- | --- |
| A. 可归属（依据可推导租户） | **0** | 无可执行的定向回填 |
| B. 不可归属且疑似种子/测试数据 | **24**（`public.core_faqs` 12 + `public.core_guides` 12） | 备份后可删除（待业务确认） |
| C. 不可归属但疑似真实业务数据 | **0** | — |
| D. 设计上的全局默认数据（三类之外） | **15**（`core.ai_faqs`） | **不回填、不删除**；需架构/产品决策 |

关键判断：39 行**没有一行**能通过用户字段或外键推导出归属租户，因此不存在"可归属"行；`core.ai_faqs` 的 15 行是迁移内置的平台全局语料，不属于脏数据。

## 2. 盘点证据

### 2.1 可归属线索核查（三表一致）

| 线索 | 结果 |
| --- | --- |
| `created_by` / `updated_by` / 任何用户字段 | **三表均无此类列**，无法反查 `iam.users` |
| 外键 | `core.ai_faqs`、`public.core_faqs` 无任何入向/出向外键；`public.core_guides` 仅有子表 `core_guide_lessons`、`core_guide_progress` 指向它，两子表**各 0 行** |
| 分类/知识库/会话/插件关联列 | 无 `category_id`、`knowledge_base_id`、`conversation_id`、`plugin_id` 等列 |
| 审计日志 | `core.core_audit_logs` 无 faq/guide 相关写入记录（种子由服务启动期系统通道写入，不产生审计） |
| `created_at` 分布 | 三表均为**单批循环插入**（见 2.2），无人工编辑痕迹（`updated_at = created_at` 全 39 行） |
| `is_deleted` / 状态 | 三表 `deleted_at` 全为 NULL，`is_active` 全为 true |
| 内容特征 | 无 Smoke/Test/Demo 字样，但内容均为产品通用帮助文案（见 2.3） |

### 2.2 时间分布

| 表 | 行数 | created_at 区间 | 备注 |
| --- | --- | --- | --- |
| `core.ai_faqs` | 15 | 2026-10-26 14:03:20.591899（15 行**完全同一时间戳**） | 迁移单条 `INSERT ... VALUES` 批量写入 |
| `public.core_faqs` | 12 | 2026-10-26 14:19:13.942478 – .943990 | 循环插入，跨度 1.5 ms |
| `public.core_guides` | 12 | 2026-10-26 14:19:13.944153 – .946214 | 循环插入，跨度 2.1 ms |

### 2.3 可归属判定依据（正向溯源）

- `core.ai_faqs`：内容与迁移 [`20261024000015_copilot_faq_table.sql`](../migrations/20261024000015_copilot_faq_table.sql) 的 seed **逐字一致**（erp/finance/crm/wms/general 各 3 条）。迁移注释明确："`tenant_id` 全零表示**平台全局默认 FAQ，RLS 策略对所有租户放行**"；`svc/ai/src/handlers/business_copilot_handlers.rs::search_faq` 明确按 `tenant_id = 本租户 OR tenant_id = 全零` 查询。
- `public.core_faqs` / `public.core_guides`：内容与 `svc/portal/src/modules/help/mod.rs::seed_help_data` 的 12 条 FAQ + 12 条指南**逐字一致**，该函数以 `tenant_id = Uuid::nil()` 写入，注释写"种子数据为全租户共享的初始化写入"。该函数在当前 HEAD **已无调用点**（dead code）。

### 2.4 策略现状（关键偏差）

| 表 | 克隆库（收口前快照） | 生产（现状） |
| --- | --- | --- |
| `public.core_faqs` / `core_guides` | 旧策略显式放行 `NULL/空/零` 租户 → 所有租户可见 | 严格 B 公式，**零租户行对所有租户不可见** |
| `core.ai_faqs` | 旧策略显式放行零租户 → 全局可见 | 严格 B 公式，**全局行不可见**，AI FAQ 实际静默回落代码内置语料 |

即：这些行当初按"零租户 = 全局共享"设计写入，382 表收口统一改写为严格策略后，**全局放行语义丢失**。这解释了为何三表在业务租户视角都是 0 行。

## 3. 三类分列

### A. 可归属：0 行

无任何一行具备可推导租户的依据，因此不产出定向回填语句（回填模板见 §4.1，仅作机制说明）。

### B. 不可归属且疑似种子/测试数据：24 行

**`public.core_faqs`（12 行）**

| id | category | question | created_at |
| --- | --- | --- | --- |
| 547f6c86-8741-4b4f-bc7d-45a0b57d4f78 | general | 如何修改登录密码？ | 14:19:13.942478 |
| 9a432571-3637-4123-a3d9-f5d1ee4d9168 | security | 如何申请权限？ | 14:19:13.942833 |
| b82956d3-1447-4a5b-b748-0807ddbff2bf | general | 如何导出数据？ | 14:19:13.942977 |
| ade5041b-67e8-488c-bbd9-110604b2f552 | workflow | 如何创建审批流程？ | 14:19:13.943121 |
| 7fa6a3a1-4f6a-4f78-a1f7-4edee0e07db2 | general | 如何处理待办任务？ | 14:19:13.943233 |
| 30b65d67-5b11-4968-b83d-e1ff75feebf4 | security | 如何查看审计日志？ | 14:19:13.943343 |
| 0ef18a2a-8b1a-4b98-b718-0169da9b6a4e | security | 如何备份数据？ | 14:19:13.943456 |
| dc8f96d7-c806-4327-adb7-258a5f64c116 | ai | 如何使用AI助手？ | 14:19:13.943556 |
| db0714d5-84e8-45de-b625-c98861940b77 | hrm | 如何添加新员工？ | 14:19:13.943664 |
| 87b7c32e-e20d-4f4c-9062-527df3c21a79 | hrm | 如何申请请假？ | 14:19:13.943772 |
| 68020550-1bc9-4517-9c20-96f817449820 | finance | 如何录入凭证？ | 14:19:13.943882 |
| 4462240e-7fee-4729-b41a-ca336c93a962 | finance | 如何生成报表？ | 14:19:13.943990 |

**`public.core_guides`（12 行）**

| id | category | title | created_at |
| --- | --- | --- | --- |
| acf9ee6c-10c1-4d0a-af17-86adf60ef112 | getting-started | 系统快速入门 | 14:19:13.944153 |
| 2b1a7e82-3b23-4ee0-8871-7ff589128fc6 | security | 用户管理指南 | 14:19:13.944795 |
| 426da3cb-27cd-42b4-b908-c4be73721cb5 | workflow | 审批流程设计 | 14:19:13.945110 |
| 2e3930cd-a262-46bb-b3d4-de8abe7bbe37 | hrm | 员工入职流程 | 14:19:13.945225 |
| 8fa7614d-4102-453a-850f-846c30dae4c8 | hrm | 考勤管理操作 | 14:19:13.945326 |
| 893340ad-cb87-4032-90ff-19ca28f960d7 | finance | 财务凭证处理 | 14:19:13.945432 |
| 834011e1-7568-4746-b45d-576fff983c7d | finance | 报表生成与分析 | 14:19:13.945530 |
| b4d6ddb8-61b9-46fe-8b1c-a0ed2ec71a78 | ai | AI助手使用教程 | 14:19:13.945660 |
| 6a8fccb5-ccd5-4cb0-b0f6-98cda20c35c8 | security | 数据备份与恢复 | 14:19:13.945814 |
| 9288cfec-dbe2-4f41-9642-84fce9077685 | security | 审计日志查看 | 14:19:13.945945 |
| df2cf5b2-71a7-4cbd-9103-0b0c0e86a576 | general | 移动端使用指南 | 14:19:13.946062 |
| cc4fb3a5-e277-4ac1-bcdf-67c25261f19a | general | 快捷键操作 | 14:19:13.946214 |

判定依据：与 dead-code 种子函数逐字一致、单批插入、`views=0`、`sort_order=0`、`is_active=t`、无编辑、无外键引用、无审计。**注意**：它们虽然不是"真实业务数据"，但内容是产品帮助文案，若删除则所有租户帮助中心为空——需业务确认是否接受。

### C. 不可归属但疑似真实业务数据：0 行

### D. 设计上的全局默认数据：`core.ai_faqs` 15 行（不回填、不删除）

| id | module | question |
| --- | --- | --- |
| 029893a1-2a9d-4af4-bb87-d33903cb1917 | wms | 拣货任务如何分配？ |
| 21784c48-39f9-45e5-8507-51f48d8155bd | crm | 销售漏斗各阶段如何定义？ |
| 46847a44-1f4a-4a50-ba7e-a4be3d81ca63 | erp | 库存与 ERP 数据不一致怎么办？ |
| 4fc39000-9165-49bd-94cd-c53ea04fd469 | general | 回答不准确怎么办？ |
| 55fcb4b9-28d5-423d-8c72-e3f986f73378 | erp | 如何创建一张销售订单？ |
| 5ae73752-1a67-44b9-838a-27f32ad1e82b | general | Copilot 能帮我做什么？ |
| 671bcc9f-efd6-4789-9b97-809ba09e1a25 | erp | 采购订单审批流程是怎样的？ |
| 71536d8c-8f75-4629-9fdf-f7d8ee191482 | crm | 如何查看客户的跟进记录？ |
| 83ab2efc-d409-4643-b214-a1b41c0b0ec1 | wms | 库存预警在哪里设置？ |
| 849b3e89-0f6d-426b-ad3f-6740ef793576 | general | 操作提交后多久生效？ |
| 8d1c753d-bc03-488c-aff7-275aecc5fddd | finance | 如何提交一张费用报销单？ |
| 9c205d35-8747-42f1-b469-20a14f2fc818 | wms | 入库收货的流程是什么？ |
| b6cd09db-a976-4b8f-acc9-9e15b1e9bc1e | crm | 如何把一条线索转为客户？ |
| bde2efc4-bc4b-4988-9fad-7368ed680e15 | finance | 月结结账的步骤是什么？ |
| fd4cbcd8-4b93-48f4-bd6d-5e325d4cdec6 | finance | 付款审批需要哪些材料？ |

处置建议：归到任一租户会让其余租户失去默认语料；删除等于删产品内置知识库。真正修复是二选一：
1. 恢复"零租户 = 全局"的读取语义（策略加 `OR tenant_id = '000…0000'` 分支，或在查询层按 system 通道读取全局行）——属策略变更，本轮禁止；
2. 改为**每租户开通时复制种子**，零租户行作为模板保留。

## 4. SQL 清单

### 4.1 回填（模板，本批无适用行）

```sql
-- ⚠️ 本批没有可归属行，以下仅为机制模板，不要对生产执行
BEGIN;
SET LOCAL app.rls_system = 'on';
UPDATE public.core_faqs
   SET tenant_id = :target_tenant
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND id IN (:reviewed_ids);
COMMIT;
```

### 4.2 备份（已在克隆库验证可回滚）

```bash
mkdir -p /Users/xingzhai/topems-backups/zero_tenant_20261116
psql "$CLONE_OR_PROD_URL" -c "set app.rls_system='on'" \
  -c "\copy (select * from public.core_faqs order by id) to '/Users/xingzhai/topems-backups/zero_tenant_20261116/public_core_faqs_12rows.csv' csv header" \
  -c "\copy (select * from public.core_guides order by id) to '/Users/xingzhai/topems-backups/zero_tenant_20261116/public_core_guides_12rows.csv' csv header"
```

已生成备份（来自克隆库，与生产逐字一致，指纹比对见 §5.1）：

| 文件 | 行数 | sha256 |
| --- | --- | --- |
| `public_core_faqs_12rows.csv` | 12 | `5c649df32a6fee8a499e183fa8ffb33adaf1718c12f125277171b84867c0d180` |
| `public_core_guides_12rows.csv` | 12 | `46f8d263f65b77eb8222fc6ef2968e27f8ea2d1abe5a1c1390afdc80171081b5` |

### 4.3 删除（仅 B 类 24 行，待业务确认后执行）

```sql
BEGIN;
SET LOCAL app.rls_system = 'on';
DELETE FROM public.core_faqs  WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM public.core_guides WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
-- 前置校验：两表在删除前应各 12 行；若行数不符，先 ROLLBACK 复核
COMMIT;
```

删除后校验：

```sql
BEGIN;
SET LOCAL app.rls_system = 'on';
SELECT (SELECT count(*) FROM public.core_faqs)   AS faqs,     -- 期望 0
       (SELECT count(*) FROM public.core_guides) AS guides,   -- 期望 0
       (SELECT count(*) FROM public.core_guide_lessons)  AS lessons,  -- 期望 0（无孤儿）
       (SELECT count(*) FROM public.core_guide_progress) AS progress, -- 期望 0
       (SELECT count(*) FROM core.ai_faqs)       AS ai_faqs;  -- 期望 15（不得变化）
COMMIT;
```

回滚：`\copy public.core_faqs from '<csv>' csv header`、`\copy public.core_guides from '<csv>' csv header`（需先 `set app.rls_system='on'`）。

### 4.4 D 类（`core.ai_faqs` 15 行）：无自动动作

## 5. 克隆库演练（`m2_dryrun_20261116`）

### 5.1 数据一致性

克隆库为 2026-11-16 生产快照，三表数据与生产**逐字一致**（无需重新导出）：

| 表 | 生产 md5 | 克隆库 md5 |
| --- | --- | --- |
| core.ai_faqs | `949ae809dcaa816b9378d59c1321a92f` | 同 |
| public.core_faqs | `8e1d9c9cbb25a4b67a83cde8e915de69` | 同 |
| public.core_guides | `ecdc762b5c5cfd04d46cbbdc3a0347ea` | 同 |

### 5.2 环境差异与处理

- 克隆库是收口前快照，`public.core_faqs/core_guides/core.ai_faqs` 仍是**旧宽松策略**（显式放行零租户），会导致演练结果失真。
- 处理：仅对克隆库执行 `ALTER POLICY`，将三表策略对齐到生产严格 B 公式（`/tmp/m2_align_policies.sql`），演练后**保持与生产一致**。生产策略未改动。

### 5.3 演练矩阵与结果

| 场景 | 断言 | 结果 |
| --- | --- | --- |
| T1 现状（零租户 + 严格策略），租户 A | core_faqs/core_guides/ai_faqs 均 0 | 0 / 0 / 0 ✅ |
| T1 现状，未设租户 GUC | 0 / 0 | 0 / 0 ✅（fail-closed） |
| T2 假设回填到租户 A（事务内，回滚） | A 见 12 / 12；B 见 0；无 GUC 见 0；ai_faqs 仍 0 | 12 / 12；0；0；0 ✅ |
| T3 删除 24 行（提交） | faqs=0、guides=0、ai_faqs=15、lessons/progress 孤儿=0 | 全部符合 ✅ |
| T3 删除后租户 A 视角 | 0 / 0 | ✅ 无残留、无可见性影响 |
| 备份回滚验证 | 从 CSV 恢复后回到 12 / 12 | ✅ 12 / 12 |

补充：T2 证明"若强行回填，只有被指定的租户能看到这 24 行"，但本批**没有任何依据选择目标租户**；T2 同时证明 `core.ai_faqs` 的 15 行在严格策略下对租户始终不可见（D 类偏差）。

演练后克隆库已恢复为原始数据（12 / 12 / 15），策略保持与生产一致。

## 6. 业务决策（2026-11-16 已定）

| # | 对象 | 决策 |
| --- | --- | --- |
| 1 | `public.core_faqs` 12 行 + `public.core_guides` 12 行 | **删除**（按主键精确删除，备份保留），帮助中心由各租户自行建设 |
| 2 | `core.ai_faqs` 15 行 | **保留平台语料，不改策略**；由服务层新增"平台只读作用域"显式读取全零租户行，与租户语料合并 |

## 7. 代码改造（已实施）

### 7.1 平台只读作用域（`lib/shared-db`）

| 项 | 内容 |
| --- | --- |
| 入口 | `Db::scope_read_platform()`（[`lib/shared-db/src/scope.rs`](../../lib/shared-db/src/scope.rs)） |
| 常量 | `PLATFORM_TENANT_ID: Uuid = Uuid::nil()`（显式平台通道标记，业务数据禁用） |
| 实现 | 系统通道（`app.tenant_id = nil` + `app.rls_system='on'`）+ `SET TRANSACTION READ ONLY`，委托既有 `scope_read_system`，不复制事务样板 |
| 契约 | ① 只读，写语句会被 PostgreSQL 拒绝；② 调用方 SQL **必须**显式限定平台谓词（如 `tenant_id = PLATFORM_TENANT_ID`），系统通道绕过 RLS，省略谓词等于跨租户全量读；③ 禁止在租户业务路径上替代 `scope_read` / `scope_read_for_tenant`；④ 仅用于平台内置共享语料 |
| 与 `scope_read_system` 的区别 | 后者是后台任务/脚本的通用系统读入口；前者语义更窄、可检索可审计 |

### 7.2 `search_faq` 改造

- 本租户语料：仍在请求事务内（`scope_with`），SQL 显式 `tenant_id = 本租户`（不再用 `OR 全零` 依赖策略放行）。
- 平台语料：`scope_read_platform()`，SQL 显式 `tenant_id = PLATFORM_TENANT_ID`，只取平台那批。
- 合并：按问题文本（`trim` + 小写）去重，**租户自身优先**；合并后按原排序规则 `updated_at DESC`。
- 降级：平台语料读取失败仅 `warn` 并返回本租户结果；两者皆空仍回落 curated 静态语料。
- 策略层保持严格 B 范式，`core.ai_faqs` **无任何策略例外**。提交 `b1eb6633c`。

## 8. 处置执行记录（生产，2026-11-16 23:29:16 CST）

| 项 | 值 |
| --- | --- |
| 执行方式 | `psql -v ON_ERROR_STOP=1` 单事务；按**主键白名单**删除（12 + 12 个显式 UUID），未使用 `tenant_id` 通配 |
| 影响行数 | `core_faqs=12`、`core_guides=12`（`GET DIAGNOSTICS` 断言，不符即 `RAISE EXCEPTION` 整笔回滚） |
| 删除前 | core_faqs 12 / core_guides 12 / ai_faqs 15 / lessons 0 / progress 0 |
| 删除后 | core_faqs 0 / core_guides 0 / ai_faqs 15 / lessons 0 / progress 0 |
| 孤儿引用 | 0（两子表本就为空，删除后复核仍为 0） |
| 备份 | `/Users/xingzhai/topems-backups/zero_tenant_20261116/`：`public_core_faqs_12rows.csv`（sha256 `5c649df3…0180`）、`public_core_guides_12rows.csv`（sha256 `46f8d263…81b5`）；执行前复核校验和一致，且已在克隆库完成"CSV 恢复 → 12/12"回滚验证 |
| 回滚方式 | `set app.rls_system='on'` 后 `\copy <table> from '<csv>' csv header` |

端到端验证（全部 200）：

| 端点 | 结果 |
| --- | --- |
| `/api/portal/help/faqs`、`/api/portal/help/guides` | 200，`total=0`、`items=[]` |
| `/api/portal/help/faqs/categories`、`/api/portal/help/guides/categories` | 200，空数组 |
| `/health` | 200 |
| `/api/bi/reports` | 200，1 条（本租户） |
| `/api/core/iam/users` / `roles` | 200，3 / 16 |
| `/api/erp/audit-logs` | 200，13 |
| `/api/finance/currencies` / `ledger` | 200，16 / 4 |

数据核对：`core.ai_faqs` 仍 15 行（零租户，未动）；生产策略未改、迁移未改、未 push。

## 9. 二进制替换与上线验证（2026-11-16 23:39:39–23:39:49 CST）

| 项 | 值 |
| --- | --- |
| 构建 | `cargo build --release -p topems-server`，9m35s（服务运行期间构建，未提前停服） |
| 新二进制 | sha256 `9b1e7007c9974a6822c804c924adf57060a541a6c5d21c4a7dff4819b00e8e16` |
| 旧二进制备份 | `/Users/xingzhai/topems-backups/topems-server.bak-20261116-pre-searchfaq`（sha256 `9625d130468c9c634cb5ca0d17d00bdd6d529248ab3837fa595eeb9439183766`） |
| 停服 | 23:39:39 `launchctl bootout`，`/health` 000，服务连接清零 |
| 起服 | 23:39:49 `launchctl bootstrap`，新 pid **19802**，`/health` 200 |
| 停机时长 | **10 秒**（本轮无 DDL，仅换二进制） |

### 9.1 `search_faq` 生效验证

关键鉴别用例：改造前 DB 查询被严格 RLS 过滤为空、走 curated 静态语料，**不检索 `keywords::text`**；改造后走 `core.ai_faqs`，`q='['` 会命中 jsonb 文本中的 `[`。

| 用例（租户 A，module=erp） | 改造前 | 改造后 |
| --- | --- | --- |
| `q='['` | 0 | **3**（证明命中 `core.ai_faqs`，非 curated 回落） |
| `q='销售订单'` | 1 | 1 |
| `q='zzz无此问题'` | 0 | 0 |
| `q='5 万'`（仅答案命中） | 1 | 1 |
| 无 `q` | 3 | 3 |

- 五模块 `erp/finance/crm/wms/general` 各 3 条，合计即平台 15 条默认语料。
- 双租户一致性：租户 A 与租户 B 的 `erp` 响应 md5 均为 `676c72a7e4dc343195740503d0c7b05e`；`core.ai_faqs` 仅存在零租户 15 行、无任何租户自有行，平台作用域未带出其它租户数据。
- 合并 / 去重 / 租户优先 + 只读约束（克隆库端到端演练，事务回滚无残留）：
  - 插入「租户 A 覆盖同名问题 + 租户 A 专属问题」后，租户查询 2 行、平台查询 3 行，合并结果 4 行；
  - 同名问题取**租户答案**（`【租户A自定义答案】…`），专属问题保留；
  - 合并后按 `updated_at DESC` 排序；
  - `SET TRANSACTION READ ONLY` 下执行 UPDATE 被 PostgreSQL 拒绝（`cannot execute UPDATE in a read-only transaction`）。

### 9.2 回归验证（全部 200，与基线一致）

| 端点 | 结果 |
| --- | --- |
| `/health` | 200 |
| `/api/bi/reports` / `subscriptions` | 1 / 0 |
| `/api/core/iam/users` / `roles` | 3 / 16 |
| `/api/erp/audit-logs` | 13 |
| `/api/finance/currencies` / `ledger` | 16 / 4 |
| `/api/portal/help/faqs` / `guides` | 0 / 0（删除后保持为空） |

## 10. 后续事项

1. `svc/portal/src/modules/help/mod.rs::seed_help_data` 已无调用点，建议确认后删除，避免被重新启用再次写入零租户数据。
2. 帮助中心现为空，若产品需要"开箱即用"内容，建议改为租户开通时复制模板，而非写入零租户行。

## 11. 约束遵守

- 生产除 24 行删除外零写入；删除单事务、按主键、可回滚。
- 未改策略、未改既有迁移、未 push、未 amend；代码与文档分别提交。
- 本轮换二进制无 DDL；异常可回退到备份二进制（`topems-server.bak-20261116-pre-searchfaq`）。
- 克隆库内的策略对齐、删除与合并演练均发生在 `m2_dryrun_20261116`，不涉及生产。
