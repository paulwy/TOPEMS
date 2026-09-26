# V70-2 topems_shared 门面彻底闭环设计（方案 A · 两步渐进）

> **日期**: 2026-08-09
> **版本**: V1.0
> **状态**: ✅ 已获用户批准
> **目标代码**: [lib/src/lib.rs](file:///Users/air/TOPEMS/lib/src/lib.rs) COMPAT 区（L77-L202）107 条 re-export，最终压缩至 ≤ 30 条总 pub use

---

## 1. 背景与现状

### 1.1 lib.rs 当前三分区结构

| 分区 | 行范围 | 语义 | 数量 |
|---|---|---|---|
| **KEEP 区** | L18-L72 | 核心高频保留项（跨服务通用） | ≈20 条 pub use 声明 |
| **COMPAT 区** | L77-L202 | 迁移兜底兼容层（原 DEPRECATED 区清理后遗留） | **107 条**（41 模块级 + 66 条目级） |
| **扩展 trait** | L208-L243 | `AuditContextExt` 便利转换器（非 re-export） | 1 个 trait impl 块 |

### 1.2 V71 COMPAT 最终方案达成的前置条件
- 所有 `#[deprecated]` 标记已删除（`grep -c "#\[deprecated" lib/src/lib.rs` = 0）
- 服务端 29 服务代码已经通过 V70-1 完成 369 条迁移 + 远端 V71 合并 COMPAT 两层兜底
- 本轮 V70-2 的目标是"清空 COMPAT 区，仅留 KEEP 区"，实现真正"去门面化"

### 1.3 全 workspace COMPAT 引用扫描（2026-08-09 实锤）

```
COMPAT 区总 re-export：107 条（41 模块级 + 66 条目级）
实际被 svc/* 引用的符号：6 条 × 9 服务（覆盖率 5.6%）
→ 其余 101 条 0 引用可直接删除（无编译风险）
```

---

## 2. 方案 A（两步渐进式）架构

```
┌────────────────────────────────────────────────────────────────┐
│  Step 1 · 大扫除（无服务代码修改，只动 lib.rs COMPAT 区）       │
│  ─────────────────────────────────────────────────────────     │
│  操作：从 COMPAT 区删除 101 条 0 引用 re-export                 │
│  保留：6 条实际业务符号 + 4 条 lib 内部自引用模块              │
│  验证：cargo check --workspace E0432/E0599=0                   │
└────────────────────────────────────────────────────────────────┘
                              ↓ 独立通过
┌────────────────────────────────────────────────────────────────┐
│  Step 2 · 实际替换（9 服务 × 6 符号 use 路径切换）              │
│  ─────────────────────────────────────────────────────────     │
│  操作：把 6 条 COMPAT 符号从 topems_shared::* 切换为直接        │
│        topems_shared_X::*；Cargo.toml 缺的补 2-4 行依赖         │
│  收尾：rls/observability/audit_soft_delete/api_security        │
│        4 条若 lib 内部不再引用则删除，否则留在最后版本          │
│  验证：同上 + 前端 8 项 CI 脚本 + pnpm lint/tsc 通过           │
└────────────────────────────────────────────────────────────────┘
                              ↓
          最终：pub use 总条数 ≈ 20-25（KEEP 20 条 ± 扩展），≤ 30 目标
```

### 2.1 方案对比（为什么选 A）

| 维度 | 方案 A 两步渐进（推荐） | 方案 B 一步到位 | 方案 C 激进超压缩 |
|---|---|---|---|
| **风险** | ⭐ 低（Step1 无业务动刀） | ⭐⭐ 中（混合 commit） | ⭐⭐⭐ 高（bootstrap 通配改写） |
| **Rollback** | 两步独立 commit，各自独立回滚 | 单次混合 commit，回滚粒度粗 | 单次，回滚影响大 |
| **pub use 最终** | 20-25 条 | 20-25 条 | 15-20 条 |
| **维护成本** | 低，保留 bootstrap 通配自动同步 | 低 | 高，bootstrap 每次新增导出需手动维护清单 |
| **预计工时** | 2 批次 × 5 分钟批处理 + 10 分钟验证 | 1 批次 × 15 分钟 | 1 批次 × 30+ 分钟 |

---

## 3. Step 1 大扫除 · 删除清单（101 条 0 引用）

### 3.1 模块级 41 项（保留 6 项，删除 35 项）

**保留（有实际引用）：**
- `event`（crm/mes 使用）
- `service_client`（crm 使用）
- `rls`（疑似 lib 自引用，待 Step 2 确认）
- `observability`（疑似 lib 自引用，待 Step 2 确认）
- `audit_soft_delete`（疑似 lib 自引用，待 Step 2 确认）
- `api_security`（疑似 lib 自引用，待 Step 2 确认）

**删除（35 项全部 0 服务引用）：**
```
vector_store · test_helpers · saga · redis · rate_limit · query_optimizer
permission_center · performance · ollama_client · notification · monitoring
migration · metrics · messaging · layers · id · hrm · grpc · file_client
feature_flag · embedding · data_governance · crud · consul · config_center
compression · cluster · cache · backup · api · ai_client
telemetry · storage · service_discovery · repository
```

### 3.2 条目级 66 项（保留 3 项，删除 63 项）

**保留（有实际引用）：**
- `build_health_response`（mobile/monitor/portal/unified-core 4 服务）
- `telemetry_middleware`（gis/integration 2 服务）
- `SystemMetrics`（rd 1 服务）

**删除（63 项）：** 非穷举分类为：
1. config 系列（AIConfig/DatabaseConfig/JwtConfig/RedisConfig/EnhancedCacheConfig/CacheConfig/Config/FeatureFlagService/get_default_port）
2. health 系列（check_http_health/simple_health_check/DependencyHealth/HealthCheckResponse/HealthChecker/HealthState/HealthStatus/ServiceHealth/ServiceMetrics/ServiceMonitor/SimpleHealthConfig — 注意 build_health_response 保留）
3. response 系列（api_error/api_success/PaginatedResponse/PaginationParams）
4. hrm 系列（AppState/PaginatedResult/PaginationQuery）
5. logging 系列（create_log_filter/generate_request_id/generate_span_id/generate_trace_id/get_current_request_id/get_current_trace_id/init_logging/inject_request_context/request_context_middleware）
6. compression 系列（CompressionConfig/CompressionMiddleware）
7. service_discovery 系列（LocalServiceRegistry/PortalServiceAggregator/ServiceRegistryStatus）
8. redis 系列（BloomFilter/RedisCacheKeyGenerator/CacheProtectionConfig/CacheService/CacheStatisticsCollector/RedisCacheService/RedisPool/UnifiedCacheManager/InMemoryCache）
9. observability 系列（ServiceStatus/TelemetryExt）
10. permission 系列（department_middleware/require_permission/require_role/require_tenant_status/tenant_middleware/PermissionCenterClient）
11. data_governance 系列（DataClassification）
12. layers 系列（Layer）
13. ai_client 系列（OllamaClient/OllamaConfig）
14. notification 系列（NotificationServiceClient）
15. service_client 系列（client 工厂函数 + 各服务 TypedServiceClient 包装类共 20+ 条）

---

## 4. Step 2 收尾 · 9 服务 6 符号路径替换

### 4.1 符号 → 子 crate 路径映射表

| # | COMPAT 符号 | 子 crate 最终路径 | 影响服务 | 需补 Cargo.toml 依赖？ |
|---|---|---|---|---|
| 1 | `topems_shared::event` | `topems_shared_event::event` | crm, mes | crm/mes 如缺 shared-event 则补 |
| 2 | `topems_shared::service_client` | `topems_shared_service_client::service_client` | crm | crm 如缺 shared-service-client 则补 |
| 3 | `topems_shared::build_health_response` | `topems_shared_core::health::build_health_response` | mobile, monitor, portal, unified-core | 4 服务如缺 shared-core 则补 |
| 4 | `topems_shared::telemetry_middleware` | `topems_shared_observability::telemetry::telemetry_middleware` | gis, integration | 2 服务如缺 shared-observability 则补 |
| 5 | `topems_shared::SystemMetrics` | `topems_shared_observability::performance::SystemMetrics`（或别名 ComprehensiveMetrics，Step 2 执行时实查） | rd | rd 如缺 shared-observability 则补 |
| 6 | rls/observability/audit_soft_delete/api_security 4 模块级 | Step 1 保留，Step 2 执行时实查 lib/ 是否真引用；若仅死代码则删 | 无 | lib/ 内部核对 |

### 4.2 9 服务影响明细

| 服务 | 符号 1 | 符号 2 | 说明 |
|---|---|---|---|
| **crm** | event ✏️ | service_client ✏️ | 符号最多（2），需补两行 Cargo.toml 依赖概率最大 |
| **mes** | event ✏️ | - | 1 符号 |
| **mobile** | build_health_response ✏️ | - | 1 符号 |
| **monitor** | build_health_response ✏️ | - | 1 符号 |
| **portal** | build_health_response ✏️ | - | 1 符号 |
| **unified-core** | build_health_response ✏️ | - | 1 符号 |
| **gis** | telemetry_middleware ✏️ | - | 1 符号 |
| **integration** | telemetry_middleware ✏️ | - | 1 符号 |
| **rd** | SystemMetrics ✏️ | - | 1 符号（SystemMetrics 实际位置执行时确认为 performance 模块） |

> 受影响服务总 9 个，符号替换总次数 = 2 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 = **10 行左右 use 语句**

---

## 5. 验收标准（最终成功判定）

### 5.1 代码层面
```bash
# A1: lib.rs pub use 总条数 ≤ 30
grep -cE "^\s*pub use\b" lib/src/lib.rs
# 期望输出：20 - 25 条（KEEP 20 条 ± 少许 KEEP 区新增常用符号）

# A2: COMPAT 区物理删除
grep -cE "^// COMPAT —" lib/src/lib.rs
# 期望输出：0（COMPAT 区标题被移除，仅 KEEP / 扩展 trait 两段）
```

### 5.2 编译层面
```bash
# A3: 全 workspace 无 import 类错误
SQLX_OFFLINE=true cargo check --workspace --message-format=short 2>&1 \
  | grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import"
# 期望输出：0（SQLX 缓存缺失类 error 手动忽略）
```

### 5.3 前端 & CI 层面
```bash
# A4: 前端 lint + tsc 0 error
pnpm --filter @topems/web lint --max-warnings=0
pnpm --filter @topems/web tsc --noEmit

# A5: 6 项合规门禁 + verify_navigation 全通过
for s in check-header-toolbar-order check-single-primary-button check-mobile-overflow \
         check-ai-context-injection check-backbutton-backhref check-breadcrumb-detailname; do
  node scripts/$s.mjs || exit 1
done
node scripts/verify_navigation.mjs
```

### 5.4 语义层（最终"去门面化"定义）
- 所有 29 服务的 Rust 代码中 `use topems_shared::*` 语句，**全部指向 KEEP 区的符号**，不依赖已删除 COMPAT 的任一条目
- lib.rs 中 COMPAT 区消失，仅剩：
  ```
  // =============================================================================
  // topems_shared 门面 Crate — 去门面化完成（仅 KEEP）
  // =============================================================================
  // KEEP 区核心高频 20 条 + AuditContextExt 扩展 trait
  ```

---

## 6. 风险与应急预案

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| Step 1 删除 101 条后，cargo check 发现某"伪 0 引用"符号被条件编译 `#[cfg(feature = "...")]` 包起来漏扫 | 低 | 中 | Step 1 commit 独立命名为 `refactor(lib): V70-2 Step1`，任何 E0432 报错直接 `git revert` 回退，更新扫描脚本加 `--cfg` 分支支持后重跑 |
| Step 2 SystemMetrics 实际位置与映射表不符（例如 ComprehensiveMetrics） | 中 | 低 | Step 2 执行前先用 Grep 在子 crate 定位符号，再替换；若命名变化则按真实名称改写（保持语义等价） |
| gis/integration 的 telemetry_middleware 在 topems_shared_observability::telemetry 下名字略有不同（如 `telemetry::<fn>` 或 `middleware::<fn>`） | 低 | 低 | 先子 crate grep，再精确替换 |
| 前端 lint/tsc 报错（非本轮修改引起的历史遗留） | 低 | 低 | 报错文件不在本轮修改列表 → 豁免，单独创建 issue 不在 V70-2 范围处理 |

---

## 7. Commit 拆分（执行期计划）

```
1. refactor(lib): V70-2 Step1 · 删除 COMPAT 区 101 条 0 引用 re-export
   改动文件：lib/src/lib.rs （仅此 1 个）
   Message 附：删除明细计数 summary

2. refactor(shared): V70-2 Step2 · 9服务6符号COMPAT→直接子crate路径替换
   改动文件：crm/mes/mobile/monitor/portal/unified-core/gis/integration/rd 9 服务 × (1-2 .rs + 可能 Cargo.toml)
   附：每条 use 的 before→after 清单 + cargo check 报告

3. (可选) chore(lib): V70-2 清理 lib.rs 文件头注释 + COMPAT分区标题移除
   把 KEEP/COMPAT 两区标题合并为"KEEP 区（去门面化完成，≤30 条核心 re-export）"
```
