# MES 异常检测「查不到就报无异常」假阴性治理（B378）

- 日期：2026-11-28
- 批次：W5-B / B378
- 范围：`svc/mes/src/modules/anomaly_detection.rs`
- 落点：`/api/mes/anomaly/*` 全组读端点与扫描端点

## 1. 问题：查询失败被吞成「零行」，告警面板恒绿

异常检测的取数全部写成 `if let Ok(rows) = sqlx::query(...)`，失败分支直接跳过，
于是 8 处查询任一失败都等价于「这批数据没有异常」：

| 行号（改前） | 所在检测器 | 查询语义 | 失败后的错误表现 |
| --- | --- | --- | --- |
| 631 | `detect_equipment_anomalies` | 设备巡检读数（温度/振动/噪声） | 温度超限告警消失 |
| 822 | `detect_equipment_anomalies` | 设备 OEE（近 30 天均值 < 60%） | OEE 下降告警消失 |
| 886 | `detect_equipment_anomalies` | 维护计划过期 | 保养逾期告警消失 |
| 962 | `detect_quality_anomalies` | 质量记录缺陷率（近 7 天） | 缺陷率偏高告警消失 |
| 1047 | `detect_quality_anomalies` | 整批不合格批次 | 批次隔离告警消失 |
| 1128 | `detect_production_anomalies` | 生产订单延期（计划完工日） | 延期告警消失 |
| 1207 | `detect_production_anomalies` | WIP 积压（在制 > 48h） | 积压告警消失 |
| 1349 | `get_recent_anomaly_trend_days` | 近 N 天不良趋势 | 趋势图恒平 |

受影响的出口：

- `GET /api/mes/anomaly/alerts`（`list_anomaly_alerts`）
- `GET /api/mes/anomaly/summary`（`get_anomaly_summary`）
- `GET /api/mes/anomaly/equipment/{equipment_id}`（`get_equipment_anomalies`）
- `POST /api/mes/anomaly/scan`（`trigger_anomaly_scan`）
- `GET /api/mes/anomaly/trend`（`get_anomaly_trend`）

后果：schema 漂移、RLS 作用域异常、库不可用时，以上接口一律 `200 + 空列表 / 0 计数`，
前端「暂无异常」与实际「读不到数据」不可区分；巡检与质量侧据此判断设备健康时会漏报停线风险。

## 2. 问题：读数缺失与解析失败被当成 0

| 位置（改前） | 原写法 | 后果 |
| --- | --- | --- |
| 巡检读数 | `temp/vibration/noise.unwrap_or(0.0)` | 缺读数=0 度、0 振动、0 噪声，永远不越上限阈值；趋势均值被拉低 |
| OEE 均值 | `.parse().unwrap_or(0.0)` | 解析失败 → OEE 0% → 立刻产出假 critical 告警（假阳性） |
| 质量汇总 | `total_qty / total_defective` 同法兜 0 | `total_qty=0` → 缺陷率 0 → 真异常被算成正常（假阴性） |
| 批次不合格 | `quantity.parse().unwrap_or(0.0)` | 数量丢失后仍按「数量不足 0」出假结论 |
| 订单数量 | `try_get(...).map(...).unwrap_or(0.0)` | 读列失败 → `quantity=0` → 完工率恒 0%、`completed/quantity` 分支被跳过 |

## 3. 修复

1. **8 处取数改为显式分支**：`let rows = match sqlx::query(...) { Ok(r) => r, Err(e) => { tracing::error!("<具体查询>失败: {e}"); failures.push(...); Vec::new() } };`，
   每条日志与失败原因都带具体查询名（设备巡检读数 / 设备 OEE / 维护计划 / 质量缺陷率 / 批次不合格 / 生产订单延期 / WIP 积压 / 异常趋势），不再是一个笼统的「查询失败」。
2. **三个检测器改签名** `-> Result<Vec<AnomalyAlert>, String>`：查询失败即使其余检测器有结果也整体上抛（`Err(failures.join("；"))`），不用部分结果伪装完整扫描。
3. **`collect_all_alerts` 一并改 `Result`**，三处 `extend(...?)`。
4. **调用方显式失败**：`list_anomaly_alerts` / `trigger_anomaly_scan` / `get_anomaly_summary` / `get_equipment_anomalies` 改 `match` + `ApiResponse::server_error`，报错文案包含失败原因；`get_anomaly_trend` 同理。
5. **趋势查询改 `Result`**：`get_recent_anomaly_trend` / `get_recent_anomaly_trend_days` 失败即 `Err`，不再返回「全 0 趋势」。
6. **读数缺失改 `f64::NAN`**：NaN 与阈值比较恒为假（不误报），趋势样本只收三值齐全的记录：`if let (Some(t), Some(v), Some(n)) = (temp, vibration, noise)`。
7. **数值解析失败不再兜 0**：4 处 `.parse().unwrap_or(0.0)` → `.map_err(...)?`；订单 `quantity/completed_quantity` 抽出 `read_order_quantities()`，读列或解析任一失败即记入 `failures` 并跳过该订单（该订单的延期告警因数据不可判定而不产出，但扫描整体报错，不会静默）。

## 4. 验证

- `cargo test -p topems-mes --lib`：**446 通过**（新增棘轮 4 条）
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过
- `cargo fmt --all --check`：通过
- 新增棘轮 `svc/mes/src/anomaly_no_fake_negative_ratchet.rs`，锁四件事：
  1. 源码里不得再出现 `if let Ok(rows) = sqlx::query`，且必须存在 `failures.push` 与 `Err(failures.join("；"))`；
  2. 检测器与调用方必须是 `Result` 传播（`ApiResponse::server_error` 文案在位）；
  3. 温度/振动/噪声不得 `unwrap_or(0.0)`，必须是 `f64::NAN`，趋势样本必须三值齐全；
  4. `.parse().unwrap_or(0.0)` 与 `read_order_quantities` 的兜底归零路径全部禁止。

## 5. 未覆盖 / 后续

- 同一文件仍有 `row.get::<T, _>("col")`（sqlx 会在列缺失时 panic）。列名与 SQL 一一对应，schema 漂移会以 500 暴露而非静默，本批不改；若要彻底消除 panic 风险，需按列改 `try_get`，属独立批次。
- 异常检测规则（`/anomaly/rules`）仍是 `default_rules()` 内存常量，未落库也未接租户配置，属于契约债，未在本批处理。
- 权限口径错位（本批未动，需单独批次）：本文件注解声明 `mes:anomaly:read` / `mes:anomaly:write`（字典里两个码都存在），但运行时真正生效的是 `svc/mes/src/main.rs:267-268` 的模块级门 `require_module_write("mes")` + `require_module_access("mes")`——即持有 `mes:write` 即可扫描、改阈值，`mes:anomaly:*` 从未被校验；三个审批端点另用 `check_permission(MesAnomalyApprove)`，实际校验的是 `mes:approve`。要按细粒度收口需同时核角色绑定，否则会 403 掉只授 `mes:read` 的在线角色，属独立批次。

## 6. 顺带清掉 pre-commit 的两道阻断

- **request-txn（本批修复）**：`scripts/ci/request-txn-baseline.json` 记的 bare_txn 基数是 1661，最小检出却已到 1682 —— `7634b6375`（WMS 四个系统设置页）新增的 `policy_settings.rs` 有 20 处 `&mut **txn`，`a053c3505`（SRM 契约收口）在 `tender.rs` 兑奖查询新增 1 处。这两批都是新代码直接读裸事务连接，跨 schema 时 search_path 会落到会话级，与本门禁要防的问题一致。处理方式是按 §17.2 的本意改：`policy_settings.rs` 四个设置页的 8 个 handler 先 `crate::shared::scope::wms_db(&state.db).scope_with(txn)` 拿 `ScopedTxn`（顺带把 `wms, public` 的 search_path 真正 SET LOCAL 进请求事务），查询统一走 `&mut scope`；四个 `read_*` 辅助函数签名从 `&mut PgConnection` 改为 `&mut ScopedTxn`；`tender.rs` 的兑奖查询同样改走 `state.db.scope_with(txn)`。计数回到 1661 基线，**未上抬基线**。
- **perm-matrix（main 上已红，本批不动）**：clean `origin/main` 上同一条命令即 `exit=1`，`R5=40`（全部在 `svc/mobile`，utoipa 块缺 `security()`）、`R3=13`（finance `audit_v52` / `risk_v54` 的 admin 注解码缺显式门禁注释）。R5 要补的是**逐 handler 的真实权限码**，而字典里 `mobile:attendance:read`、`mobile:oa:*` 之类并不存在（只有 `mobile:attendance:write`、`mobile:production:write` 等），硬编会把「注解编造」这条老账再记一遍，因此留给 mobile 专属批次逐条核字典后再补。

## 7. 验证口径

- 本批改动文件：`svc/mes/src/modules/anomaly_detection.rs`、`svc/mes/src/anomaly_no_fake_negative_ratchet.rs`、`svc/mes/src/lib.rs`、`svc/wms/src/modules/policy_settings.rs`、`svc/srm/src/modules/tender.rs`、`docs/quality/*`、`TODO.md`，外加 `cargo fmt --all` 顺带修掉 `svc/crm`、`svc/qms` 的格式欠账。
- `npx lefthook run pre-commit`：53 项 ✔️，仅 perm-matrix 🥊（见上，clean origin/main 同红）。
