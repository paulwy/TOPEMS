# B152 · Master Data / ERP / Mobile / SRM 旧候选落地

日期：2026-11-22

## 目标

继续清掉 B151 队列中的 `persisted_unmapped`：把 Master Data 12 表、ERP 公告与资产、Mobile 推送、SRM 招标/询价/报价的既有候选真正应用到本地库，而不是只保留在文档里。

## 本地应用

- 执行 6 份候选 DDL，共 18 个状态 CHECK：
  - `master-data-status-check-candidates-2026-11-21.sql`：12 表约束。
  - `erp-content-status-check-candidates-2026-11-21.sql`：公告、资产 2 条。
  - `mobile-push-status-check-candidates-2026-11-21.sql`：推送 1 条。
  - `srm-bidding-status-check-candidates-2026-11-21.sql`、`srm-inquiry-status-check-candidates-2026-11-21.sql`、`srm-quotation-status-check-candidates-2026-11-21.sql`：3 条。
- 全部为 `NOT VALID`，新写入立即受约束，存量不阻塞。
- 替换错误约束：`master_data.mdm_subscriptions` 原有的 `ck_mdm_subscriptions_status_standard` 是 `active/inactive/archived/cancelled`，会拦 `expired/pending`；已 DROP，改为 `active/expired/cancelled/pending` 的 `mdm_subscriptions_status_check`。

## 数据归一

- `erp.assets`：1 行旧 `active` → `in_use`，现 `in_use=1`。
- `mobile.push_notifications`：191 行旧 `active` → `pending`，现 `pending=191 / sent=3`。
- Master Data 其余表数据未动；`mdm_quality_checks` 197 行等存量值均在候选集合内。

## 刷新结果

- DB 状态目录：**287 条状态 CHECK / 5 个 PG ENUM / 435 个无约束列**（B151 为 270/5/452）。
- 盘点：208 枚举 / 191 值 / **71 值不在 DB CHECK**（B151 为 92）/ 206 前端键；色板缺口 0。
- 队列：**53 枚举 / 71 值**；`internal_state 54 值`、`persisted_unmapped 10 值 / 13 枚举`、`api_projection 7 值`。
- 三项门禁 `dump-status-checks --check`、`dump-status-code-inventory --check --strict-palette`、`status-db-check-queue --check` 均 PASS。

## 剩余

`persisted_unmapped` 只剩共享健康/服务/SLO、DSR、Email 队列、插件升级、Portal/unified-core 版本等枚举；这些实际为内存态或 API 投影，没有可落库目标，后续按“非持久化”归档，不再建 CHECK。

生产快照仍只读，未应用；正式发布需逐条执行候选并 `VALIDATE`。
