# B153 · 余量状态非持久化归因

日期：2026-11-22

## 背景

B152 后仍有 71 个 Rust 状态值不在 DB CHECK，队列把它们归为 `persisted_unmapped`。逐项复核后，这些枚举全部是健康探针、服务监控、DSR 内存请求、邮件 DashMap 队列、插件升级编排或 Portal/unified-core 版本投影，文件中虽然出现 `sqlx` 字样但状态本身没有落库目标。此前队列只按「文件是否含 sqlx」判断持久化，属于启发式误判。

## 本轮处理

- 给 13 个枚举登记 `persisted:false` 与原因：
  - `HealthStatus`（shared-core / portal 三个文件 / unified-core）
  - `ServiceStatus`、`SLOStatus`
  - `DsrRequestStatus`（RwLock<HashMap> 内存请求）
  - `EmailQueueStatus`（DashMap 邮件队列）
  - `UpgradeStatus`（插件升级编排）
  - `VersionStatus` / `APIVersionStatus`（Schema/API 版本投影）
- `scripts/ci/status-db-check-queue.mjs` 调整优先级：显式 `persisted:false` 先于 SQL 迹象启发式，归入 `internal_state`；候选 > 非持久化 > 投影 > 持久化 > 内部。
- 重算队列：**53 枚举 / 71 值，全部 `internal_state`；`persisted_unmapped` 0、`api_projection` 0、`resolved_enums=53`**。
- 盘点与目录未变：208 枚举 / 191 值 / 71 不在 DB CHECK / 206 前端键、色板缺口 0；catalog 287 条 CHECK / 5 ENUM / 435 无约束列。

## 门禁

`node --check scripts/ci/status-db-check-queue.mjs`、`status-db-check-queue --check`、`dump-status-code-inventory --check --strict-palette`、`dump-status-checks --check` 均 PASS。

## 结论

Rust 状态枚举侧的归因已闭环：剩余 71 个值均为非持久化态，不再需要建 CHECK。W5-B 仍未整体完成的部分转为「DB 435 个无约束状态列」和「前端 106 个键不在 DB CHECK」的独立评审，不与本批混算。生产快照仍只读。
