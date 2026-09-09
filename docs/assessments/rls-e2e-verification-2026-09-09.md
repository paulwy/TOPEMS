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

## 五、结论

- **A 方案隔离生效**：受限角色在 `app.tenant_id` 注入下读写均被 RLS 约束；越权读=0 行、越权 UPDATE=0 行受影响（静默）、越权 INSERT=WITH CHECK 报错。
- **服务豁免正确**：nil UUID 上下文（服务间调用）全放行，未破坏既有服务链路。
- **兼容模式正确**：无租户上下文全放行，既有连接/直查不受影响。
- **FORCE 价值落地**：表 owner（topems）在租户上下文下同样被过滤——此前"owner 绕过"的管理通道已关闭。
- **GUC 事务局部性正确**：`set_config(..., true)` 随事务提交/回滚消失，不跨请求泄漏租户上下文。

## 六、剩余缺口（未做，如需可继续）

1. **真实进程 + 登录链路**：启动完整服务栈 + 网关 + 登录换取带租户 JWT，经真实 HTTP 端口逐 handler 验证（当前已覆盖：生产 `tenant_middleware` 函数 → handler 全链路于 §四·A；仅差进程监听与 JWT 签发）。
2. **跨服务事件链路**：erp/crm/finance 等事件驱动写路径在受限角色下的隔离（当前 DB 层验证未覆盖事件消费者）。

## 七、验证资产

- 受限角色 `rls_e2e`（密码 `rls_e2e_secret`）保留，可复测；验证脚本 `/tmp/rls_e2e_verify.sql`。
- 测试数据：验证过程中无污染写入（INSERT 被拦截、UPDATE 0 行受影响，`t1_name_x=0` 已核）。
