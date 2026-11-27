# MES ↔ QMS 联动：伪造对端数据 + 统计吞错（B370）

- 日期：2026-11-27
- 范围：`svc/integration`（`mes_qms_integration`、`handlers/mes_qms`、`handlers/sync`）
- 承接：B369 把 portal / erp 的 15 处入参丢弃清零后，全仓门禁剩 13 处；integration 占 4 处，本批一并处理。但真正的问题比 `let _` 严重得多。

## 核心结论

`svc/integration/src/mes_qms_integration.rs` 的 7 个「对端调用」辅助函数**从来没有发起过任何 HTTP 请求**：

| 辅助函数 | 原实现 | 造成的后果 |
| --- | --- | --- |
| `fetch_mes_production_record` | `Ok(json!({...}))`，产品名写死「示例产品 A」，order/product/process/工位 UUID 每次随机、产量固定 100、不良固定 5 | 「MES 生产记录」是编的，且每次请求内容不同 |
| `create_qms_inspection_task` | `Ok(uuid::new_v4())` | QMS 里根本没有这条质检任务，却拿到一个「任务号」 |
| `fetch_qms_inspection` | `Ok(json!({...}))`，合格率固定 95%、检验员假名、结果恒 `qualified` | 「QMS 质检结果」是编的，质量合格率永远是 95% |
| `update_mes_quality_record` | `let _ = inspection_data; Ok(())` | 没回写任何东西，调用方记 `synced=true` |
| `fetch_mes_trace_chain` | `Ok(json!({...}))`，固定 3 个节点 | 「全链路追溯」是编的 |
| `trigger_mes_rework_process` | `Ok(json!({"rework_no": "RW-时间戳"}))` | MES 里没有返工单 |
| `trigger_mes_scrap_process` | `Ok(json!({"scrap_no": "SC-时间戳"}))` | MES 里没有报废单 |

调用方（`trigger_qms_inspection` / `sync_quality_result_to_mes` / `sync_trace_chain_data` / `handle_defect_handling`）
拿到这些编造结果后，写一条 `integration.mes_qms_sync` 并把 `sync_status` 置为 `synced`、`synced = true`。
于是 `/api/integration/mes-qms/stats`、质量看板、追溯报表全部建立在假数据上，运维看到的是「同步成功率 100%」。

**一个「MES 生产完成」事件进来，系统会凭空造出一条质检任务号、一条 95% 合格率的质检结果、一条返工单号，并全部标成同步成功。**

## 本批改动

### 1. 七个辅助函数改为显形拒绝（503）

不再返回任何构造出来的数据，统一：

```rust
error!("MES 生产记录接口未接线，拒绝伪造数据 - mes_url: {}, record_id: {}", mes_url, record_id);
Err(TopemsError::ServiceUnavailable(format!(
    "MES 生产记录接口未接线（{mes_url}）：集成服务尚未实现 MES HTTP 调用，拒绝伪造生产记录 {record_id}"
)))
```

消息里带上 `mes_url` / `qms_url`、被拒绝的业务对象 id、数量、触发人，方便直接判断该接哪一端。
`production_data` / `inspection_data` 这两个「拿不到就假消费」的入参改为 `_production_data` / `_inspection_data` 并删除 `let _ = x;`。

### 2. 四个联动端点把 503 显形出来（不再压成 500）

`trigger-inspection` / `sync-result` / `sync-trace` / `defect-handling` 原来统一
`ApiResponse::from(TopemsError::internal(ctx, e))` → 500「内部错误」，看不出是「没接线」还是「真崩了」。
改为 `ApiResponse::from(e)`：`ServiceUnavailable` → **503**，消息原样返回。

### 3. 同步统计不再把查询失败吞成 0

`get_mes_qms_sync_stats` 里 5 段聚合查询原先都是 `Err(_) => (0, 0, 0)` / `.ok().and_then(...)`：
表结构变了、连接断了，接口照样回「同步总数 0、失败 0」，看上去链路干净。
现改为抽出的 `counts()` 辅助 + `?` 上抛（`SUM` 的 NULL 用 `Option<i64>` + `unwrap_or(0)` 保留），
查询失败由 handler 变成 500。`last_synced_at` 同样上抛。

### 4. `handlers/sync.rs::list_endpoints` 的 `let _ = state;`

该 handler 返回静态端点清单，`state` 只为保持签名。改名 `State(_state)`，删掉假消费。

### 5. 新增棘轮 `mes_qms_no_fabrication_ratchet`

- `remote_helpers_refuse_to_fabricate`：文件里 `ServiceUnavailable(` ≥ 7；`示例产品A` / `PO-20260625` / `BATCH-{}` / 假检验员姓名 / `let _ = production_data;` / `let _ = inspection_data;` 一律不许再出现。
- `stats_do_not_swallow_query_errors`：禁止 `Err(_) => (0, 0, 0)`、`Err(_) => (0, 0)`、`.ok().and_then(|row| row.try_get`。
- `handlers_surface_service_unavailable_not_500`：四个端点不得再用 `TopemsError::internal("Failed to sync..."`。

## 验证

| 项目 | 结果 |
| --- | --- |
| `cargo test -p topems-integration --lib` | 206 passed |
| `cargo clippy -p topems-integration --all-targets -- -D warnings` | 通过 |
| `node scripts/ci/check-noop-param-discard.cjs --changed-only` | exit 0 |
| `node scripts/ci/check-noop-param-discard.cjs` | 13 处 → **8 处**（integration 清零） |

## 影响与遗留

1. **行为变更**：`/api/integration/mes-qms/trigger-inspection`、`/sync-result`、`/sync-trace`、`/defect-handling`
   从「2xx + 假数据」变成「503 + 未接线说明」。前端 `apps/web/src/api/integration/writeOps.ts` / `writeOps2.ts`
   调这几个接口的按钮会明确报错——这是预期的（在此之前它们一直在写假记录）。
2. 真正的 MES/QMS 客户端（HTTP + 鉴权 + 超时 + 重试）仍未实现；本次只做到「不再伪造」，没有凭空发明对端契约。
3. `handle_mes_production_completed` / `handle_qms_inspection_completed` 在失败时只 `error!` 记日志、仍返回 `Ok(())`，
   事件不会重投也不会落一条 failed 同步记录。是否改成返回 Err（依赖事件总线的重试/DLQ 语义）需与事件总线口径一起定。
4. `integration.mes_qms_sync` 里历史遗留的 `synced = true` 记录大多来自上述伪造路径，**是脏数据**；
   清理需要按 `created_at` 区间 + 当时 `payload` 含示例产品名校验，本批未动数据。
5. `/api/integration/endpoints`（`list_endpoints`）返回的是硬编码端点清单，不反映真实配置的集成端点；本次只清掉 `let _ = state;`。
6. 全仓入参丢弃剩余 8 处：lims 2、wms 1（`slotting.rs`）、ai 1、communication 1、master-data 1、pm 1、unified-core 1。

## 附带：修 upstream 打红的 perm-matrix R5（wms 14 条）

本批提交时 `perm-matrix`（lefthook `perm-matrix`，STRICT）报 **R5 = 14 FAIL**，全部落在 `svc/wms`，
与本批改动无关——是上游并行提交新加的端点只写了 `path/tag/responses`、漏了 `security(...)`，导致此后任何提交都被拦死。

按「handler 内 `check_permission(&state.db, &claims, &ModulePermission::X)` 的真实口径」逐条补注解
（`WmsPermission::*` 经 `to_shared()` 一律映射到 `wms:read|write|admin`）：

| 文件 | handler | 注解 |
| --- | --- | --- |
| `audit.rs` | `list_audit_modules` | `wms:read`（与同文件 `list_audit_logs` 一致） |
| `inventory.rs` | `get_wms_dashboard` | `wms:read`（`WarehouseRead`） |
| `labor.rs` | `user_labor_efficiency` | `wms:read`（`WavePickRead`） |
| `sync_records.rs` | `list_sync_records` / `get_sync_record` / `list_sync_items` / `get_sync_statistics` | `wms:read`（`SyncRead`） |
| `sync_records.rs` | `retry_sync_record` / `retry_failed_items` | `wms:write`（`SyncWrite`） |
| `sync_records.rs` | `trigger_scm_sync` / `trigger_scm_inventory` / `trigger_scm_orders` | `wms:write`（经 `trigger_sync` 内的 `SyncWrite`） |
| `wave_pick.rs` | `pick_line` / `short_pick_line` | `wms:write`（`WavePickWrite`） |

R5 **14 → 0**，`perm-matrix ci-report` exit 0。只补注解、未改任何运行时鉴权逻辑。

> 顺带发现：`svc/wms` 的权限是「handler 内 `check_permission` 逐条校验」，而 `ModulePermission::SyncRead`
> 与 `WarehouseRead` / `WavePickRead` 在 `to_shared()` 里**全部折叠成 `wms:read`**——即「同步读」与「库房读」
> 在真实授权校验上没有任何区别，模块级细分形同虚设。属权限模型问题，另立专项，本批不动。

### 附带 B：`/sync/scm*` 三个触发端点「零动作却回同步完成」（wms）

补 R5 注解时触碰到 `svc/wms/src/modules/sync_records.rs`，`--changed-only` 门禁立刻暴露出同文件里的
`trigger_sync`（`/sync/scm`、`/sync/scm/inventory`、`/sync/scm/orders` 三个端点共用）：

```rust
INSERT ... VALUES (..., status='success', completed_at=NOW(), total_count=0, success_count=0, failed_count=0)
let _ = payload;   // 请求体被整体丢弃
→ ApiResponse::success(SyncResult { status: "success", message: "xx 同步完成" })
```

即：**没有向 SCM 推送任何数据**（payload 丢、`state.scm_url` 未使用），却写一条 `status=success` 的同步记录并回「同步完成」。
同步看板/统计（`/sync-records/statistics`）因此把「什么都没做」计成成功同步。

改为：仍写一条记录（保留触发审计轨迹），但 `status='failed'` + `error_message='WMS→SCM 同步未接线：仅记录触发尝试，未推送任何数据'`，
返回 **503** + 同文案；`payload` 的字段名写入 warn 日志（证明请求体被读到而非丢弃）。三个端点行为一致。
