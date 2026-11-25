# Re: 二次回执 —— cwd/.env 已验收；RLS 根因已修复并推送（终稿）

> 本稿替代前稿，可直接整段转发。相对前稿只有三处变化：提交号与推送状态、RD 迁移序号（150000→160000）、重建后才生效的说明。其余段落与前稿一致。

一、cwd：已执行，验收通过，此项关闭

你方证据逐条核对成立：

- plist 共 4 处差异（前轮 3 项 + WorkingDirectory=`/Users/xingzhai`），`plutil -lint` 通过；
- `bootout` + `bootstrap` 生效后 pid=82344、state=running、runs=1、last exit code=(never exited)；
- `lsof -a -p 82344 -d cwd` → `/Users/xingzhai`，符合预期；
- `/uploads` 不存在、`/Users/xingzhai/uploads` 待首传由 `create_dir_all` 创建；
- 进程环境 `RUST_LOG` 计数=0，反证 `.env` 未被加载；`DATABASE_URL`/`MIGRATE_URL` 仍在（Keychain），`CORS_ALLOWED_ORIGINS`/`ENVIRONMENT`/`WS_ALLOWED_ORIGINS` 均在；
- health / core_health / www 均 200；DB 仍为 `topems_prod`（36 连接）；
- plist 600 + sha256 `170cc579be88b39b52a18e5c9f464326ce9234a35db6bc732adec603b1700239`；备份 `bak-20261124-0959`（改前全量回滚基线）、`bak-20261124-1028`（改后快照）。

我方口径不变：cwd 方案保留，直到存储根变量（`TOPEMS_STORAGE_ROOT` 之类）落地再谈回退。

二、.env：已按 b 执行，此项关闭

- 第 15 行 `DATABASE_URL`、第 222 行 `MIGRATE_URL` 整行注释，各保留一行说明（运行期真源=launchd plist + Keychain，本文件不被服务加载）；
- 备份 `.env.bak-20261124-1028`（600），现文件 600，未回显任何值；`TEST_DATABASE_URL` 等其它键未动。

三、5.4 两个判据：采信，并接受你对前提的纠正

- 判据 1：nginx 完整行已给（`GET /api/plugin/navigation-config` 200、319B、0.035s，UA 为 Chrome/157），本机 `log_format topems_safe` 不含 referer，可接受。
- 判据 2：未认证直连 marketplace 401；当前 access.log 近段无 marketplace 记录，无法给同一浏览器会话状态。但代码事实可替代：marketplace handler 全走 `scope_read_system()`/`scope_system()`，不经 task-local；navigation 走 `scope_with(txn)`，依赖 task-local——判据作用相同，采信。
- **前提纠正接受**：navigation-config 的 HTTP 状态是 **200**（错误在 JSON body `success:false`），access.log 1103 条 200、仅重启窗口 2 条 502。因此「两者都 500 → 缺 tenant 层」的推理不适用，最终判读改为「同一路由栈内，插件 JWT 层未发布 task-local」，与你方结论一致。

四、根因确认与修复（代码级，已合并主干并推送）

根因照你方定位，我方逐行核对全部成立：

- `/api/plugin/*` 的 JWT 层是插件自己的 `jwt_auth_middleware`（`svc/plugin-registry/src/shared/middleware.rs:28`），只把 `Claims` 塞进 `req.extensions_mut()`，不发布 `RLS_REQUEST_TENANT`；
- 只有 `shared-auth` 的 `auth_middleware`（`lib/shared-auth/src/auth.rs:1207-1211` 附近）会 `scope_request_tenant(rls_ctx, …next.run(req))`；
- `tenant_middleware`（`lib/shared-auth/src/middleware/tenant.rs:660+`）与 `tenant_middleware_no_txn`（`:806+`）只在自己 begin 的事务上 `set_config` + 注入 `RlsTxnCell`，不发布 task-local；
- 而 `Db::scope_with(txn) → apply_request_tenant()`（`lib/shared-db/src/scope.rs:449-466`）只认 task-local。

即：事务在、GUC 也在，task-local 缺失 → `RLS context missing`。

修复（一处改机制，所有模块受益）：两个 tenant 中间件都在 `next.run(req)` 外层补 `scope_request_tenant(RlsRequestTenant { tenant, system }, …)`，不再依赖上游 JWT 层身份是否发布上下文。并发安全性已验证：auth 层与 tenant 层同时 scope 时 tokio task-local 可嵌套、内层覆盖、退出后恢复外层；回归测试 `rls_task_local_tests::scope_request_tenant_nests_and_restores` 通过。

提交与推送状态（此处为前稿变更点）：

- RD 项目成员状态收口（B260）：`d3677e270`
- RLS task-local 修复：`fdf280ae2`
- 两者均已推送：`origin/main` HEAD = `fdf280ae2`（推送前远端已被并行推进到 `82d0423c5`，我方已 rebase 合入，无冲突残留）

定位与修复全程：未加 BYPASSRLS、未放宽 scope、未改 tenant 判定语义。

五、RD 迁移序号变更（前稿变更点，对生产账本有约束力）

- 事实：远端并行分支已占 `20261124150000`（`20261124150000_hrm_init_status_tenant_step_unique.sql`，HRM 初始化进度 `(tenant_id, step_name)` 唯一索引）。
- 处置：B260 的 `rs.project_members.status` 收口迁移与回滚件一并重押为 **`20261124160000_rd_project_members_status_standard`**（原 150000 作废）。manifest 内两条并存，`database/checksums.txt` 已重算，`scripts/migration/gen-manifest.sh --check` 结果：registered=255 / disk=848 / missing_on_disk=0 / file_mismatch=0 / checksum_mismatch=0 / checksum_missing=0 / duplicate=0 / unregistered_pending=0，**无漂移**。
- 生产侧要求：账本里若已登记 `20261124150000`，那是 HRM 那条；RD 按 `20261124160000` 执行。执行顺序 **HRM(150000) → RD(160000)**；RD 迁移含 `UPDATE status` 大小写归一 + 列默认值改 `active` + ADD/VALIDATE `ck_project_members_status_standard`，fail-closed：归一后仍有 active/inactive 之外的值即 RAISE EXCEPTION，先清洗再重放。
- 若生产库里出现 `20261124150000_rd_project_members_status_standard` 这类旧号记录（不应存在），请按新号改名后再推进，不要双号并存。

六、生效条件与回归口径（前稿变更点：必须重建）

RLS 修复是代码级：`git pull` 到 `fdf280ae2` 之后**必须重建二进制**（当前运行进程仍是 11-19 构建的 `4ec0d6647`，只 pull 不重建不会生效）。重建后按下列口径回归：

1. `GET /api/plugin/navigation-config` → 200 且 body `success:true`（不能只看 HTTP 状态）；
2. 启动期与 10 秒轮询期不再出现 `Failed to open read scope: … RLS context missing`；
3. `GET /api/plugin/runtime/list` 正常；
4. 2–3 个普通业务模块读写正常（验证 tenant 中间件新链路未改变原有行为）；
5. 上传落盘在 `/Users/xingzhai/uploads/<user>/<file>`。

重建时机仍由你的发布节奏决定，我方不催、不主动重建。

七、我方本轮动作边界

本轮只做：RD 迁移序号重押 + 台账/校验和更新 + RLS 修复上主干 + 推送。未动 DNS、未动生产、未跑生产迁移、未写生产库、未改口令、未动其它 plist 键、未放宽 RLS。

八、遗留（各自认领）

- 我方：存储根治（统一存储根变量，改 `upload.rs`/`download.rs` 拼根）、`SecurityHeadersConfig::from_env()` 已落代码待你方重建生效、HSTS 是否在 Cloudflare 边缘另开（现状未开，等你一句话）。
- 你方：pull 到 `fdf280ae2` 后重建并回归；RD 迁移按 160000 推进。

—— 以上，等待重建后的回归回执。
