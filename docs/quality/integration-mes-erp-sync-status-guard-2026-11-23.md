# B224 · MES↔ERP 同步记录状态护栏证据（2026-11-23）

## 范围

- 表：`integration.mes_erp_sync.sync_status`（varchar(50) NOT NULL DEFAULT `pending`，本地 0 行）
- 代码：`svc/integration/src/mes_erp_sync.rs`（`create_sync_record` / `update_sync_success` /
  `update_sync_failed` / `retry_failed_sync`）、`svc/integration/src/handlers/mes_erp.rs`
  （`create_mes_erp_sync` / `sync_mes_erp` / `list_mes_erp_sync_records`）
- 枚举：`svc/integration/src/mes_erp_sync_status.rs`（新增）

## 值集

`MesErpSyncStatus = { pending, synced, failed }`，默认 `pending`，
与前端 `apps/web/src/schemas/integration/mesErp.tsx` 的 `MES_ERP_STATUS_CONFIG`
（synced / pending / failed）一致；读侧把历史 `success` / `succeeded` / `completed`
归一为 `synced`。

## 修掉的缺陷

1. **同一列两个“成功”值**：服务层 `update_sync_success` 两条 UPDATE 都写
   `sync_status = 'success'`，HTTP 接口 `sync_mes_erp` 写 `"synced"`。
   前端只认 `synced`，走服务层的记录会落到 `|| pending` 兜底、显示成“待同步”；
   按 `status=synced` 过滤也漏掉这些记录。现统一写 `MesErpSyncStatus::Synced`（`synced`），
   读侧仍兼容历史 `success`。
2. **状态是 SQL 字面量**：`create_sync_record` 的 `'pending'`、`update_sync_success` 的
   `'success'`、`update_sync_failed` 的 `'failed'` 全部改为参数绑定枚举常量；
   handler 的两处 `"pending"` / `"synced"` 同样绑定常量。
3. **列表过滤裸绑参数**：`list_mes_erp_sync_records` 把 `?status=` 原样绑进
   `sync_status = $2`——拼错静默空列表、`all` 也空列表。现先 `parse_filter` 归一
   （空 / `all` → 不过滤、别名归一），非法值返回 400；服务层签名不变。
4. **重试前置比较**：`retry_failed_sync` 用 `sync_status != "failed"` 字符串比较，
   库里出现未知值时既不拒绝也不提示。现先严格解析，未知值返回
   `ValidationFailed`，再用 `can_retry()` 判定。
5. **列没有 DB 约束**：新增 `ck_mes_erp_sync_sync_status_standard`（`NOT VALID`）。

## 本地验证

- 约束应用后：`sync_status='bogus'` 的 INSERT 被
  `ck_mes_erp_sync_sync_status_standard` 拒绝；`sync_status='synced'` 正常写入
  （事务内测试，已回滚）。
- 存量 0 行，无需数据修复；DB 默认 `pending` 在值集内。
- 目录口径（2026-11-23 收敛后）：`status-check-catalog.json` 只收「基线 + 前向迁移」可复现的约束，
  本批约束无迁移，已登记到 `docs/database/prod-only-status-checks-2026-11-23.json`（391→392，integration 4→5），
  `integration.mes_erp_sync.sync_status` 仍留在目录 `uncovered`；待 P7 回迁。
- 单测覆盖：3 值往返、`success` 别名、未知值拒绝、`can_retry` 白名单、
  `parse_filter` 空 / `all` / 别名归一 / 非法值报错。

## 遗留

- `integration.mes_erp_sync_logs.status` 本批**未动**：它已被更早批次加上
  `ck_mes_erp_sync_logs_status_standard`（允许 active/inactive/archived/pending/success/failed
  的宽集合），与记录表的三值集不一致；是否收窄需要先确认日志写入方与历史数据。
- `sync_mes_erp` 仍是“查到记录就置 synced”，没有 `pending/failed → synced` 以外的状态机；
  是否需要禁止对已同步记录重复置位，留给后续批次。
- 其余 sync 表（`integration.crm_erp_sync` / `erp_wms_sync` / `crm_scm_sync` /
  `hrm_finance_sync` 等）的 `sync_status` 列本地 0 行，且仓库内暂未找到写入方，
  待确认活跃链路后再收口。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。
