# 错误形态清点：Result<_, Box<dyn Error>> / anyhow::Error（2026-10-07）

**口径**：行级正则扫描 1816 个 `.rs`（排除 target/node_modules/.git/_archive/.sqlx/dist），当前工作树状态。
**位置分层依据**：`scripts/ci/check-error-handling.cjs` 门禁规则——业务层 = `svc/<svc>/src/{modules,services,handlers,repositories}` 且非 main.rs；anyhow 仅允许在 main.rs / bootstrap 进程边界。

## 全景（命中行数，按 位置 × 形态）

| 位置类别 | anyhow::Error 类型 | anyhow::Result | anyhow! 宏 | bail! | Box\<dyn Error\> | 小计 |
|---|---|---|---:|---:|---:|---:|---:|
| ① svc 业务层（门禁覆盖·存量违规） | 9 | 0 | 3 | 0 | 15 | **27** |
| ② svc src 根（门禁盲区） | 0 | 24 | 0 | 1 | 0 | **25** |
| ③ 进程边界 main.rs（允许） | 0 | 20 | 20 | 0 | 1 | **41** |
| ④ bootstrap 边界（允许） | 7 | 0 | 2 | 0 | 0 | **9** |
| ⑤ lib 共享库（门禁不扫） | 2 | 5 | 19 | 5 | 4 | **35** |
| ⑥ 文档/示例（无运行时） | 0 | 0 | 0 | 0 | 15 | **15** |
| ⑦ 测试代码 | 0 | 0 | 0 | 0 | 2 | **2** |
| ⑧ sqlx trait 签名（合理） | 0 | 0 | 0 | 0 | 2 | **2** |
| **合计** | 18 | 49 | 44 | 6 | 39 | **156** |

## 应整改（①+②，共 52 处命中 / 11 个文件）

### ① svc 业务层（27 命中）
- **svc/analytics**（10 处 anyhow）：`modules/report/scheduler.rs`（8：start/load_schedules/reload/parse_interval/check_and_execute_schedules/run_report/notify_subscribers 返回 `anyhow::Error` + 2 处 `anyhow!`）、`modules/report/schedule.rs`（2：`type Err = anyhow::Error` + `anyhow!`）
- **svc/unified-core**（3 处 Box）：`modules/communication/ws_event_bridge.rs:82,92,138`（`Result<(), Box<dyn Error + Send + Sync>>`）
- **svc/crm**（2 处 Box）：`modules/aftersales.rs:1600,1713`
- **svc/ai**（4 处 Box）：`handlers/ai_handlers.rs:727`、`handlers/prompt_handlers.rs:110`、`services/embedding.rs:138,195`
- **svc/finance**（6 处 Box）：`services/finance/erp_e2e.rs:1543`、`reversal.rs:951`、`year_end.rs:830,1087`、`voucher.rs:1789`、`periods.rs:615`（另 settlement_v55.rs:2310 为注释，归⑥）
- **svc/rd**（2 处 Box）：`models/project.rs:40,102`（sqlx Encode trait 签名，归⑧，**合理**）

### ② svc src 根（门禁盲区，25 命中）
- **svc/integration**（21 处 anyhow）：`src/qms_lims_ehs.rs`（10 Result + 1 bail）、`mes_qms_integration.rs`（2）、`crm_erp_sync.rs`（3）、`erp_wms_sync.rs`（2）、`crm_scm_sync.rs`（2）、`hrm_finance_sync.rs`（2）——事件同步处理器全部在 src 根，门禁 BIZ_DIRS 未覆盖
- **svc/unified-core**（3 处）：`src/embedded.rs:27,36,45`（embedded 模式入口，边界性质）
- **svc/portal**（1 处）：`src` 根 1 处 anyhow::Result

## 允许 / 无运行时影响（③④⑥⑦⑧，共 69 处命中）
- ③ 进程边界：各 svc `main.rs` 的 `async fn main() -> anyhow::Result<()>`（20）+ `anyhow!` 20 + `use anyhow` 11；ai/bin/mcp-stdio.rs 1 处 Box
- ④ bootstrap：`lib/shared-bootstrap`（7 Error + 2 anyhow!）
- ⑥ 文档/示例：unified-core discovery/business_tools 注释 5、shared-service-client trait_api+examples 9、shared-auth 注释 1
- ⑦ 测试：`svc/pdm/tests/event_flow_integration.rs:77,148`
- ⑧ sqlx trait：`svc/rd/src/models/project.rs:40,102`（Encode trait 约束要求 `Box<dyn Error + Send + Sync + 'static>`，属合理签名）

## lib 共享库（⑤，35 命中，门禁不扫但会向上传播）
- **lib/shared-ai**（24）：`file_client.rs`（5 Result + 8 anyhow!）、`embedding.rs`（2 bail + 1 anyhow!）、`ollama_client.rs`（2 bail + use）、`vector_store.rs`（use）、`ai_client/client.rs`（use）
- **lib/shared-core**（12）：2 Error + 9 anyhow! + 1 use
- **lib/shared-event**（4 Box）：`event/master_data.rs:218,256,334,359`
- **lib/shared-bootstrap**：归④

## 整改建议
- **P0**：integration 顶层 sync 文件 21 处 anyhow（门禁盲区，应纳入门禁或改造为 TopemsError）+ analytics scheduler 10 处
- **P1**：svc 业务层 15 处 Box<dyn Error> 改 TopemsError；门禁补 coverage（lib 共享库 + src 根）
- **P2**：shared-ai/shared-core 35 处 anyhow 评估（共享库被业务引用时类型上浮）
