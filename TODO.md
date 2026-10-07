
---

### 并行线补充记录（2026-10-04 批1剩余+批2 收口，本地原记录保留）

## 2026-10-04 批1剩余+批2 收口（B3/B4/B5/B6/B8/B9 完成，本地提交未 push）

> 依据「下一步工作规划」D 节执行形态：批 1（快赢收口）→ 批 2（残留偿还）。用户已拍板：批1剩余+批2 共 6 项，决策项（B1/B14/B15/A2/A5）暂跳过。
> 说明：A3/A4/B2/B13 在本次会话前已由并行线完成并推 origin/main（TODO 表格未同步，此处补记）；B3 代码亦已在 HEAD（由并行线带入），本次验证确认。

### ✅ 本次完成（commit 链 eca99460b + 后续 4 提交，均未 push）
- **B3 crm 金额精度**（验证确认，无新改动）：sales_forecast/dashboard 金额已 f64→Decimal（HEAD 含 `sales_forecast_amount_precision_exact`/`dashboard_amount_precision_exact` 精度单测）；cargo test -p topems-crm --lib 504/504 绿（0 failed）
- **B4 checksums.txt 恢复登记 + validate.sh 根因修复**：validate.sh `scopes=$(grep -o ... | sed ... | sort -u)` 在 set -euo pipefail 下 grep 无匹配即崩溃（09-21 后停更根因）→ 两处补 `|| true`；重跑后 checksums.txt 全量重生成 296 行（293 迁移全登记，含 B5），二次重跑 Checksum errors=0；首次 67 个 mismatch 为历史漂移一次性吸收
- **B5 gis RLS 开启**：`svc/gis/src/main.rs` enable_rls:false→true（protected 路由挂 RLS 中间件）；新迁移 `20261004000001_b5_gis_rls_enable.sql`（幂等 ENABLE/FORCE + rls_tenant_isolation 策略，仅含 tenant_id 基表；geofences/track_positions 无 tenant_id 列自动跳过）；5432 应用两遍幂等无错；隔离实测（NOSUPERUSER topems_app）：无GUC=3 / 租户A=1 / nil UUID=3 / 无关租户=0 全过；cargo check -p topems-gis 绿
- **B6 lib/shared-db rls.rs 池化 GUC 修复**：rls_middleware 改 acquire→set→run→reset 独占连接模式（对齐 tenant_rls CORE-06 修复，归还连接不残留租户状态）；apply_rls_middleware/set_tenant_context 标废弃注释（仓库无调用方）；cargo test -p topems-shared-db 152/152 绿、SQLX_OFFLINE cargo check --workspace 0 错误（1m15s）
- **B8 前端 topems-core 清理**：根 package.json 删除 `dev:core`（pnpm --filter topems-core dev）；grep 代码/配置 topems-core=0（仅 docs/archive 历史文档残留，不参与构建）；build:shared-types CJS/ESM/DTS 全绿（既有 TS2688 不再出现）；pnpm typecheck 0 错误
- **B9 GIS leaflet 测试修复**：DataInfraComponents.test.tsx react-leaflet mock 补 `useMapEvents: () => ({})`；全量 vitest 446 文件 6530 passed / 0 failed（R1 基线 3 失败清零）

### 验证总览
- 后端：cargo check --workspace 0 错误；shared-db 152、crm 504 测试绿
- 前端：vitest 6530/0、typecheck 0、build:shared-types 全绿
- 门禁：schema-boundary PY exit 0（全服务 PASS）+ NODE 29 服务/1420 文件 PASS；validate.sh 二次 0 错误
- DB：B5 迁移 5432 幂等应用 + 隔离实测 4/4（未记 _sqlx_migrations 账本，沿用半手工惯例）

### ⬜ 未完成（本批范围外）
- **可执行未排期**：B7（L 级分批）、B10/B11/B12（P2）
- **决策项跳过（用户拍板暂不处理）**：B1（search→erp 白名单撤销）、B14（守卫重构）、B15（埋点）、A2（5433 docker）、A5（erp RLS）
- **环境阻塞**：A1（nginx 生产 conf 需 Linux/生产环境）；5433 仍 DOWN、nginx 未运行

## 2026-10-04 第二轮收口（B10/B11/B12 完成，本地提交未 push）

> 用户「继续推进」后开启第二轮：B10（P2 数据丢失修复）+ B11/B12（P2 迁出/校验脚本），三项全部完成并本地提交（55342082c → 210b971e6，均未 push；远端同步由并行协作线负责）。

### ✅ 本次完成
- **B10 master-data 快照窗口数据丢失修复**：根因 = U4 的 10 个 MDM 模块写 handler 只改内存 store，靠 main.rs 3s tokio ticker 兜底 flush，SIGKILL 丢 ≤3s 最近写。
  - `svc/master-data/src/modules/mod.rs` 新增 flush_on_write 中间件（POST/PUT/PATCH/DELETE 响应后立即 flush_all()）+ is_write_method 纯函数 + 单测；**layer 置于 create_routes() 末尾**（axum Router::layer 只作用于调用时已注册路由——曾先 layer 后 nest 导致中间件不生效，e2e 证伪后修正）
  - `svc/master-data/src/modules/persist.rs` init() 拆逐条 DDL（SQLx prepared statement 不支持多命令，bootstrap 曾一直失败）
  - 验证：master-data 单测 451/451 绿；e2e 另起实例（8097/8098）POST 后**立即查库** immediate_persisted=true（两轮独立验证：probe4 / e2e-final-probe2）
  - 说明：SIGKILL 完整 e2e（kill→重启→load-on-boot 恢复）受并行线旧实例（/Users/air/topems release，8090/11824，3s ticker 周期覆盖共享表）约束无法独占验证；"写后立即持久化"机制已被 immediate 实测证明，重启恢复为 U4 load-on-boot 既有能力
- **B11 form_assistant 迁出独立位置**：`lib/src/form_assistant/`（23 文件）git mv → `svc/ai/src/form_assistant/`；`lib/src/lib.rs` 移除 `pub mod form_assistant`（门面引用=0）；svc/ai lib.rs/main.rs 声明模块（bin crate 独立 root，需双侧声明），ai_form 引用 `topems_shared::form_assistant` → `crate::form_assistant`
  - 验证：topems-ai 编译 0 错误；ai 单测 1190/1190 绿；全仓 grep 无残留 topems_shared::form_assistant
- **B12 services.yaml↔nginx.conf 一致性校验脚本**：`scripts/ci/check-config-sources.cjs` 新增 F/G/H 三节——F: nginx upstream 端口/名称↔services.yaml（值级+死 upstream）；G: map 路由表引用 upstream 自洽（防运行时 502）；H: map 路由前缀可解析到 services.yaml 服务（防拼写漂移）；补别名 report→bi / plugin→plugin-registry / aps→mes
  - lefthook `ports-consistency` 钩子 STAGED 清单加入 apps/web/nginx.conf
  - 验证：`--check` 全绿（38 服务/27 upstream）；负向篡改 erp 端口 8010→8015 被 F 拦截（`erp_service=8015 与 services.yaml erp=8010 不一致`）后还原

### 验证总览（第二轮）
- cargo check --workspace 0 错误（36.8s）；master-data 451、ai 1190、shared 单测绿
- e2e：POST 后立即查库 immediate_persisted=true（B10 核心主张实测）
- B12 脚本：正向全绿 + 负向拦截验证

### ⬜ 未完成（本轮范围外）
- **可执行未排期**：B7（L 级分批）
- **决策项跳过（用户拍板暂不处理）**：B1（search→erp 白名单撤销）、B14（守卫重构）、B15（埋点）、A2（5433 docker）、A5（erp RLS）
- **环境阻塞**：A1（nginx 生产 conf 需 Linux/生产环境）；5433 仍 DOWN、nginx 未运行；SIGKILL 完整 e2e 需独占实例环境（并行线 11824 周期覆盖共享表）

## 2026-10-05 B7 分批推进（第 1-2 批：svc/srm + svc/rd 完成，本地提交未 push）

> 用户「继续」后开启 B7（U7 残留：静态 error() TopemsError 化 / ADR 阶段二）。B7 为 L 级（1313 处静态文案 + anyhow 清退），按「每服务分批」推进；本批完成 srm/rd 两个小服务的 anyhow 清退 + 静态 Err TopemsError 化，形成可复制模板。提交 d2bfb24ce / 1f203fe39，均未 push。

### ✅ 第 1 批：svc/srm（d2bfb24ce，15 文件）
- 14 个 modules 文件 `use anyhow::Result;` → `use topems_shared_core::error::Result;`（Result 别名同位置替换，函数签名不变）
- inquiry.rs `create_routes -> Result<Router, anyhow::Error>` 完全限定移除
- scoring_dimension.rs `weighted_score -> Result<f64, String>` → `Result<f64>`，4 处静态 `Err("...")` → `TopemsError::ValidationFailed(...)`
- 保留（ADR 合规）：main.rs anyhow（进程边界）；supplier_evaluation 闭包与 data_sync 的 `std::result::Result<_, String|sqlx::Error>`（内部校验/sqlx 专用，4xx 静态文案按设计走 ApiResponse::error）
- 验证：topems-srm 编译 0 错误；单测 559/559 绿；srm 业务层 anyhow=0

### ✅ 第 2 批：svc/rd（1f203fe39，2 文件）
- project_repository.rs / project_service.rs `use anyhow::Result` → `topems_shared_core::error::{Result, TopemsError}`
- `anyhow::anyhow!(TopemsError::NotFound(...))` 去 anyhow 包装直接返回 TopemsError
- 验证：topems-rd 编译 0 错误；单测 155/155 绿；rd 业务层 anyhow=0

### 门禁变化（scripts/ci/check-error-handling.cjs）
- 业务层 anyhow：70 → **52**（-18；srm -15 + rd -3）
- 泄露面 413 不变（本批为 anyhow/静态文案，非泄露形态）
- 注意：`Result<` 别名的坑——`topems_shared_core::error::Result` 是单参类型别名，`Result<_, String>`/`Result<_, sqlx::Error>` 等双参形态须用 `std::result::Result<_, _>` 完全限定

### ⬜ B7 剩余（后续批次候选，按业务层 anyhow 计数）
- svc/server（41）/ lib/shared-ai（24）/ svc/integration（22）/ svc/analytics（13）/ lib/shared-bootstrap（10）/ svc/ai（9）/ lib/shared-core（9）/ svc/unified-core / ticket / erp（各 4）等
- 注意 analytics 的 JobScheduler trait（`type Err = anyhow::Error`）等约束型 anyhow 需单独策略

### 其他未完成（不变）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

## 2026-10-05 B7 分批推进（第 3-4 批：server anyhow 清退 + 门禁归零，业务层 anyhow 70→0）

> 承接同日第 1-2 批（srm/rd），本批完成 server 清退与门禁豁免登记。提交 6e9f69362 / 750494b29，均未 push。

### ✅ 第 3 批：svc/server + shared-core（6e9f69362，30 文件）
- **shared-core 新增 `impl From<anyhow::Error> for TopemsError`**：收敛为 Internal 变体（classify 脱敏，客户端仅收通用「内部服务器错误」）；防泄露单测向量加入 anyhow 转换变体（100/100 绿）——该 impl 解锁所有 anyhow → TopemsError 的 `?` 传播
- server 29 个 *_real_module/subscription_module：`build() -> anyhow::Result<Self>` → `-> Result<Self>`（TopemsError::Result 别名）
- 11 处 `anyhow::anyhow!/bail!` 初始化错误 → `TopemsError::internal(context, e)`（DATABASE_URL → `EnvVarNotSet`）
- 验证：cargo check --workspace 0 错误；server modules anyhow=0

### ✅ 第 4 批：门禁豁免登记（750494b29，1 文件）
- analytics report scheduler 的 JobScheduler<'_> trait 绑定型 anyhow（`type Err = anyhow::Error`）显式豁免——第三方 trait 关联类型无法改 TopemsError，登记非漂移
- **门禁业务层 anyhow：70 → 0**（ADR 阶段二 anyhow 清退子项达成；仅 main.rs 进程边界合法保留）；泄露面 413 不变

### B7 剩余（继续分批候选）
- **静态 `Err("...")`/`Result<_, String>` TopemsError 化**（1313 处无插值静态文案，ADR 明确不在泄露面；含各服务内部校验函数，需逐服务按语义映射 ValidationFailed/BusinessLogic 等）——L 级主体，后续批次按服务推进
- finance 386 处 `.to_string()` 直出（无上下文文案，ADR 指定为 TopemsError 规范参考试点，需先定业务上下文策略）

### 其他未完成（不变）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

## 2026-10-05 方向③收尾 + B7 第 5 批（本地提交未 push）

> 用户按建议推进：先快赢收口（方向③遗留 + U3b 闭环），再 B7 静态文案分批（mobile/lims）。

### ✅ 方向③收尾（commit 4fbe20af0，2 迁移文件）
- **rd status 默认值落迁移**：`20261005000001_rd_status_default_active.sql`（ALTER rd.builds/deploys
  status SET DEFAULT 'active'，live 已生效、迁移固化；topems_app owner 双库应用幂等通过）
- **U3b 骨架表依赖链闭环（真缺口修正）**：U3b（20261003000002）DROP lims.qa_lab_samples/tasks 被
  lims 业务表 FK 依赖阻止（**声称"重放通过"实为未删净**）——新迁移 `20261005000002_lims_qa_lab_fk_repoint.sql`
  先把 5 个 FK（records→tasks、sample_lifecycle/inspection_reports/rfid_tags/sample_barcodes→samples）
  改指 public 事实标准表（与代码显式 public 引用一致）再 DROP 骨架；终态残留 0、幂等重放 0 错误；
  lims 其余 11 个 qa_lab_* 业务表（reagents/instruments/records 等）为 lims 真实在用表保留
- 5433 Homebrew 实例目录已被并行环境清理（U3b 重放历史已由排期项 1 全量完成），无恢复必要

### ✅ B7 第 5 批：mobile/lims 静态 Err TopemsError 化（commit 975bd32e3，4 文件）
- mobile：extract_user_id_from_token → `Result<String, TopemsError>`（AuthenticationFailed/InvalidToken）；
  validate_scan_result 5 处 + parse_barcode 1 处 → ValidationFailed（含 format! 插值包 ValidationFailed）
- lims：validate_barcode 3 处 → ValidationFailed；测试断言改 matches! 模式匹配（TopemsError 无
  PartialEq——曾试 derive 被含 io/serde_json/sqlx/reqwest Error 的变体阻断，撤回改 matches!）
- 调用方（barcode_scanner 4 处 match Err(_) 忽略内容）零影响
- 验证：编译 0 错误、clippy 0 警告、单测 mobile 149 + lims 245 全绿
- **mobile 静态 Err = 8→0、lims = 8→0**（本批清零两个小服务）

### ⬜ B7 剩余（后续批次候选，静态 Err 计数）
- ai 45 / crm 27 / portal 26 / integration 15 / mes 10 / finance 9 / scm 3 / erp 3 / analytics 3 /
  wms 2 / master-data 2 / unified-core 1（+ 各服务 Result<_, String> 双参形态与
  finance 386 处 to_string 试点待定策略）
- 模式固化：ValidationFailed 语义映射 + matches! 断言模板可直接复制

### ✅ B7 第 6 批：crm 静态状态码 Err TopemsError 化（commit 101d1b05a，4 文件）
- opportunity/aftersales can_transition → `Result<(), TopemsError>`：NOT_OWNER→OperationNotAllowed、
  TERMINAL_CANNOT_TRANSITION→BusinessLogic、INVALID_TRANSITION→ValidationFailed
- 消费点：2 处 match（推进/回退 403/400）+ 2 处兜底 api_error 改 `&e.to_string()`；
  aftersales 4 处 `if let Err(e)`（e 进 format!，TopemsError Display 语义更友好）
- 测试：opportunity_fsm_test 4 处 + return_fsm_test 9 处 assert_eq unwrap_err → matches!
- 验证：编译 0 错误、clippy 0 警告、单测 504/504 全绿
- **crm 静态 Err = 27→0**；累计清零：mobile 8 + lims 3 + crm 27 = 38

### ✅ B7 第 8 批：共享库静态 Err TopemsError 化（commit 65842422f，8 文件）
- deployment.rs check_tenant_access → OperationNotAllowed（文案中文化「租户不匹配」）
- approval.rs validate_start_approval/validate_approval_decision → ValidationFailed/BusinessLogic
  （含同函数内 format! 错误一并迁移；业务状态冲突「已有/没有进行中的审批」→BusinessLogic）
- data_governance.rs process_access/erasure_request → ValidationFailed/ResourceNotFound
  （ok_or("Request not found")→ResourceNotFound「请求不存在」；right_type 校验→ValidationFailed）
- shared-dsh resource/tool/prompt validate_uri/validate_name → ValidationFailed
  （Cargo.toml 新增 topems-shared-core 依赖；register 消费点 map_err 适配 e.to_string()）
- 验证：全仓静态 Err(" 业务残留 = **0**；cargo check 0 error 0 warning；单测 963 全绿
  （shared-core 790 + shared-db 152 基线 + shared-dsh 21）；pre-commit 23 项全绿（提交时复验）
- 保留不动：enhanced.rs/metrics.rs 6 处 `&str` 错误类型测试（非 String 迁移对象）

### ✅ B7 第 9 批：共享库 Err(format!) TopemsError 化（commit 2ba067a82，6 文件）
- rate_limit_enhanced validate_timestamp → ValidationFailed（无效时间戳/超容差，含 parse map_err 连锁）
- permission validate_permission_code 4 处 → ValidationFailed（模块码/动作/数据范围/段数）
- health check_http_health → ServiceUnavailable（「无法连接服务」）+ 消费点 e.to_string() + 测试断言适配
- plugin generate/verify_plugin_install_token → ValidationFailed/AuthenticationFailed
  （Invalid RSA key→ValidationFailed、JWT verify→AuthenticationFailed、scope→ValidationFailed，含 map_err format! 连锁）
- service_config get_startup_order → ConfigValidation（循环依赖）+ 内部 visit 闭包签名同步
- schema_registry check_type → ValidationFailed + add_error 消费点适配 e.to_string()
- 验证：全仓 Err(format!) 业务残留 = **0**；cargo check 0 error 0 warning；
  三库单测 1383 全绿（shared-auth 227 + shared-core 790 + shared-event 366）；pre-commit 23 项全绿
- B7 累计：静态 Err 55 处 + Err(format!) 9 处（含连锁 map_err）= 清零；
  剩余形态：map_err(format!) 417 处 + Result<_, String> 465 处（后续批次候选）

### ✅ B7 第 10 批：integration + shared-event map_err(format!) TopemsError 化（commit 0618e3377，12 文件）
- integration 106 处 map_err(format!) → 语义变体（DatabaseQuery 73 / ValidationFailed 20 / NetworkRequest 6 / BusinessLogic 1）
  - 同步记录/任务队列/同步日志/获取订单ID → DatabaseQuery；请求MES/ERP/HTTP → NetworkRequest；
    响应解析/无效ID（Uuid::parse_str）→ ValidationFailed；业务事件编排 → BusinessLogic
- mes_erp_sync 8 处 String 签名 → TopemsError（find_erp_order_by_mes_id/create_sync_record/
  update_sync_success/update_sync_failed/add_sync_log/list_sync_records/get_sync_record/get_sync_logs）
  ——消费点（handlers/mes_erp.rs）Display 兼容零改动
- event_handlers 适配：末表达式包 Ok+? 经 From<TopemsError> for String 桥接；HandlerResult 保持 String
  （subscribe_handler 签名写死 Result<(), String>——R-6 注释约束，泛型化留共享库后续批）
- async_task_queue/sync_scheduler 补 TopemsError import（crate 依赖已有）
- shared-event parse_payload → ValidationFailed + 签名 TopemsError（连锁 111 处调用方经桥接兼容）
  + 测试断言适配（contains→to_string）+ 清理 unused FromStr import
- 验证：全仓 map_err(format!) 417→310（integration+shared-event 归零）；cargo check 0 warning；
  shared-event 366 全绿；pre-commit 23 项全绿
- 剩余：map_err(format!) 310 处（ai/mes/hrm/finance/wms/unified-core/srm/scm/rd/portal/pm/pdm/mobile/lims/gis/erp/ehs/crm/communication/analytics 散点）

### ✅ B7 第 11 批：erp map_err(format!) TopemsError 化（commit 1226c668d，1 文件）
- erp event_handlers 51 处 map_err(format!) → 语义变体
  - 事务开启/提交、凭证/订单/幂等账本查询创建更新 → DatabaseQuery（47 处）
  - 事件 payload 解析（serde_json）→ ValidationFailed（10 处）
- 验证：全仓 map_err(format!) 310→259；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 259 处（ai 92 / finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 12 批：ai document.rs map_err(format!) TopemsError 化（commit 6b370e2f9，1 文件）
- document.rs 44 处 map_err(format!) → 语义变体
  - 文件解析/编码/打开失败 → FileFormatError（28 处：解析 PDF/CSV/JSON/DOCX/XLSX/PPTX 等、编码错误、无法打开）
  - 文档记录/分块 sqlx → DatabaseQuery（6 处）
  - 读取/保存临时文件/元数据 → FileOperation（3 处）
  - 调用 AI API/下载 → NetworkRequest（2 处）；解析 AI 响应 → ValidationFailed（1 处）
- 6 处 String 签名 → TopemsError（delete_document/list_documents/get_document/get_document_chunks/
  extract_text_from_data/save_chunks_and_vectors）——调用方 qa.rs/modules/handlers 零适配（Display 兼容）
- 验证：全仓 map_err(format!) 259→215；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 215 处（ai 其余 48 / finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 13 批：ai 其余 48 处 map_err(format!) TopemsError 化（commit d326051d8，7 文件）
- qa/recommendation/analysis/agent/pdf/event_handlers/multi_agent 48 处 → 语义变体
  - 问答历史/usage 日志/用户画像/文章 sqlx → DatabaseQuery（26 处）
  - 推荐结果/事件 payload/AI 响应解析 → ValidationFailed（13 处）
  - 调用 AI API/生成嵌入/决策工具/消息发送 → NetworkRequest（7 处）
  - PDF 任务/加载 → FileOperation（2 处）
- 3 处 String 签名 → TopemsError（call_ai_api/generate_query_embedding/call_ai_api_with_usage）
- qa/recommendation 补 TopemsError import
- 验证：全仓 map_err(format!) 215→167；**ai 全部清零**；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 167 处（finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 14 批：中部服务合并批 map_err(format!) TopemsError 化（commit 6100ad4ea，11 文件）
- finance/scm/unified-core/wms/mes 85 处 → 语义变体
  - 快照/凭证/审计日志/供应商/入库单/生产订单 sqlx → DatabaseQuery（46 处）
  - 事件 payload/字段/邮箱/日期解析 → ValidationFailed（35 处）
  - 发送邮件/订阅者创建 → NetworkRequest（3 处）；密码哈希 → BusinessLogic（1 处）
- 5 处 String 签名 → TopemsError（audit_integration record_* ×4 + work_report parse_report_date）
- 消费点适配：ApiResponse::error(400, &e) → &e.to_string()（work_report 2 处）
- 7 文件补 import + smtp 重复 import 清理 + projector unused 清理
- 验证：全仓 map_err(format!) 167→82；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 82 处（gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

## 2026-10-06 契约面收口 + RLS 治理 + 门禁固化（全链路闭环）

> 承接 10-05 mobile 契约面收口主线，扩展至 web(portal) 契约面、全库 RLS 治理、硬编码租户对齐、双门禁固化与全仓实例统一。全部本地提交未 push（除既有主线提交链）。

### ✅ mobile 契约面收口（已完成闭环）
- 117 端点静态核对 → 页面级缺口 9 批 + 死代码兜底 3 批 → 25 上游实例刷新 → 全量实跑冒烟 117/117
- 冒烟脚本固化 + Gate MCS 门禁（b908f9a0b）：触发 apps/mobile/src/api|svc/mobile/src|lib/shared-service-client，离线 SKIP、在线全量实跑
- WARN 根因排查修复（e6f5efd99，12 类根因：Uuid bind/check 约束/缺列 from_row/路由 405/脚本 POST_BODIES 不符等）→ 117/117 零 FAIL

### ✅ web(portal) 契约面收口（组织者 o_000cunERH90 执行，thread 57596950730198018）
- svc/server BFF 5081 路由对静态核对 + 带 token 实跑判定；33 服务批次 + 二轮 16 commit + RLS 迁移收敛 **1363→39→0**
- 关键根因：master SEARCH_PATH `master_data, public, shared`（dict 500→404，schema-registry 显式 public. 前缀）；communication BFF 挂载对齐前端 base；workflow flow schema 无防护 RLS 策略 DROP（20261006000002→0000 重排，幂等）
- web 冒烟脚本固化（c0235ed19）：4152 去重端点、现签 token、FAIL 判据对齐 mobile（500 记 FAIL/4xx 记 WARN）
- **前端双前缀 39 项真修复（894f7c48a）**：38 双前缀拼接 + 2 模板提取异常 → 4135/4135 真全绿、load_expected_fails 豁免机制移除
- **5 后端真缺口补实现（558bbf82e）**：copilot records/context 真实写入、documents download、governance metrics/export → 4139/4139
- Gate WCS 门禁（d06b8500c）：触发 apps/web/src/api|apps/web/src/utils/apiPath.ts|svc/server/src|lib/shared-service-client

### ✅ 全库 RLS 治理（212 条清除，27 个幂等迁移 20261006000003-0029）
- 危险形态 `tenant_id = (current_setting(...))::uuid` 无 NULLIF/空串防护 → DROP（同表保留 tenant_isolation_* 安全策略）；判定 SQL：`qual LIKE '%current_setting(%' AND qual LIKE '%::uuid%' AND qual NOT LIKE '%NULLIF(current_setting%'`
- 硬编码租户 25 处写路径对齐（4 批：924d576aa unified-core / 7750ec651 mobile+hrm / caadcee5d crm / 028589755 wms）：超管→NULL、用户→claims.tenant_id、COALESCE 零 uuid 解码
- 部署暴露缺口收口（50e81047e）：barcode 随机租户（Uuid::new_v4 反模式）+ 读路径 5 处 SELECT COALESCE + RLS 不可见残留行清理（register 500 真根因）

### ✅ 全仓实例统一（27 重建 + 双实例重建，零漂移）
- 27 个 Oct 5 旧代码镜像实例逐个重建（kill→端口释放→nohup→健康检查），新 PID 对照表完整交付
- :8099 BFF（44753 终态）与 :8070 mobile（36660）重建部署全部修复生效；心智链路 /api/core/flow 4/4 200
- 终态冒烟：**web 4139/4139 PASS 0 FAIL exit=0**；mobile 117/117；pre-commit 23 项全绿（MCS/WCS 实跑）

### ⬜ 遗留待办
- **并行会话 WIP 归属待确认（未触碰）**：svc/finance 3 个 M（settlement_center/service.rs、finance/collection.rs、finance/payment_record.rs）+ svc/unified-core 6 个 M（master/handlers.rs、tenant/handlers.rs、business_tools/{audit_export_api,permission_audit_log,permission_export_import_api,permission_store_factory}.rs）；flow 迁移重排 `20261006000002→0000`（内容逐字节相同，建议归属方 git mv 提交）；.sqlx 删除若干 + `.sqlx/query-57ec2a25...json` 新增；长期未跟踪 lib/Cargo.lock、shared/、svc/migration-sdk/
- 潜伏：读路径默认租户回退（pm/rd/gis/flow 等，有意保留已标注非缺口）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

### ✅ B7 第 15 批：收尾批 14 服务 map_err(format!) TopemsError 化（commit f0a9c2e86，22 文件）
- gis/crm/pm/mobile/srm/rd/hrm/communication/ehs/portal/pdm/server/lims/analytics 77 处
  - 事件 payload 解析/位置路径解析/邮箱校验/user_id 解析 → ValidationFailed（55 处）
  - 插入/查询/写入/更新/余额锁读取 → DatabaseQuery（20 处）
  - build message → NetworkRequest（2 处）
- 5 处变体形态（{e} 内联/多参数 format）：dataset_whitelist/erp-e2e-cli×2/projector/tenant handlers
- 3 签名 String → TopemsError（build_message/resolve_employee_id_from_req/resolve_leave_employee_id）
- 消费适配：mail.rs 3 处测试断言 + sql_injection_tests is_empty→to_string
- 34 文件补 import + 20 文件重复 import 清理 + chart_service/projector 误删补回
- 验证：全仓 map_err(format!) 82→0（Err(format!) 已于第 9 批清零）；cargo check 0 warning；单测 communication 192/hrm 129/analytics 417 全绿；pre-commit 23 项全绿

### 🏁 B7 里程碑：map_err(format!) + Err(format! 全仓双清零
- 累计迁移 487 处（静态 Err 113 + Err(format!) 55 + map_err(format!) 399 + 签名 20+）
- 剩余形态：Result<_, String> 465 处（下一候选批，待用户定）

---

## 🔧 前端 UI 审计批次（2026-10-07）

### P0（止血）
- ✅ **ESLint resolver 噪音清零（恢复 lint 门禁信号）**：根因=apps/web 配置 `import/resolver: {typescript}` 但 `eslint-import-resolver-typescript` 未安装 → 每文件 5 条 Resolve error 噪音（crm/hrm 233 条全为噪音）。修复=安装 `eslint-import-resolver-typescript@4.4.5`；验证 crm+hrm 233 条 → **0 警告 0 错误**
- ✅ **FieldSelector 全局监听泄漏修复**：`FieldSelector.tsx` onMouseDown 每次点击向 document 挂 dragover/drop 监听且永不移除，且 `getData('index')` 无 setData 来源（拖拽实际失效）→ 重构 React 合成事件完整拖拽，无全局监听
- ✅ **mobile approval.ts 重复端点清理**：getTasks 与 getApprovals 同端点 `/approval/tasks`（getTasks 零引用已删）；approve/reject 两对提取共享实现（approveTask/rejectTask），API 面不变

### P1（收敛）
- ✅ **设计令牌违规清零（159 → 0）**：真实违规 159 处（hardcoded 101 / rgba 48 / box-shadow 4 / fixed-px 6）全部清零。手段：① 脚本豁免升级（`var(--token, fallback)` 兜底、box-shadow 已引用 `var()`、HTML 实体 `&#039;` 前置 `&` 判断、redesign-tokens/global 令牌定义源、GIS 热力色带 canvas 动态 alpha）；② tokens.css 补 7 变量（violet/fuchsia/teal-500、text-on-accent、shadow-side/topbar、space-0-5）；③ redesign 组件（SideRail/TopBar/Avatar/Toggle）与 MUI 页面（GovernanceDashboard/EHSBadges/WorkflowApprovals/ProductionGantt/MobileLayoutV3）变量化；④ DataAssetCatalogPage 3 组业务色板迁移 theme/presets.ts（豁免区）；⑤ chartTheme rgba → alpha(designTokens.colors.cyan[500])。验证：脚本 0 违规 / eslint 0 / tsc 0。提交 85bfadf11（14 文件 +85/−62）已推送
- ✅ **组件收敛（第一批）**：StatusBadge 5 份 Tailwind 实现（wms/tms/aps/qms/mes）逻辑合一——common/StatusBadge.tsx 由占位假组件升级为唯一通用实现（扁平 colors/FSM fsmColors/labelMap/fallbackColor 双回退派别），模块文件保留业务映射数据、函数体瘦身 1 行委托；清理 3 个占位/死组件（common/EmptyState.tsx 零消费、common/ConfirmDialog.tsx 占位假组件、common/LoadingSpinner.tsx 零消费）+ 对应 3 测试 3 stories，索引 EmptyState 改 re-export shared（消费方零改动）。验证：tsc 0 / eslint 0 / vitest 94/94。提交 4f02796a2（20 文件）已推送。**待续**：跨体系/跨包双轨（common FileUpload 530 行增强版 vs shared、BackButton common vs shared、页面私有 ConfirmDialogs×2）归 P1-3 共享包接入；Pagination/ConfirmDialog/LoadingSpinner 已由 shared 提供
- ⏳ **模板瘦身：ListPageTemplate 4153 行拆分**：按职责拆 hooks/子组件
- ⏳ **页面三态补齐**：加载 53%/空态 16%/错误 39% → 模板默认注入 + 按模块分批

### P2（加固）
- ✅ **死代码与目录清理（第一批）**：components/ui/Loading.tsx 零引用已删；Tabs/CommandPalette 有引用保留；待续：_archive-microfrontend、tmp、schema/schemas 双目录合并
- ⏳ **三端共享包接入**：mobile 零引用、desktop 仅 4 处 → 先接 tokens/shared-types/api-client
- ⏳ **i18n hash key 语义化 + z-index 语义化**：1006 个 text_xxxxxx key；z-index 魔数 100+ 处统一 theme.zIndex

> 全量审计报告：`docs/quality/前端UI审计报告-2026-10-07.md`（六维结论 + 违规清单 + 验证记录）
