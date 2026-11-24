# 生产配置真源与回执纠正（2026-11-24）

## 结论：生产机（xingzhai Mac mini）的配置真源是 plist + Keychain，不是 `.env.production`

生产机回执推翻了本轮前半段的假设，且证据扎实，经代码侧核对**全部成立**：

- `.env.production` 在生产机上根本不存在；
- launchd `com.topems.server` 的 `WorkingDirectory=/`，dotenv 找不到仓库里的 `.env`，即使有也不会加载；
- 实际生效只有两处：`~/Library/LaunchAgents/com.topems.server.plist` 的 `EnvironmentVariables`（非敏感项）+ Keychain 注入（`DATABASE_URL` / `MIGRATE_URL` / `JWT_*` 等）。

因此我此前写的“改生产机 `.env.production`”的通知**前提是错的**，新建该文件只会制造第二份假配置。**生产机按 plist + Keychain 维护是对的，我们的 runbook 必须照此改写。**

## 代码侧核对：生产机指出的 5 个无效键，全部证实

| 键（我原先要求） | 代码实际读取情况 | 裁决 |
|---|---|---|
| `DATABASE_MAX_CONNECTIONS=30` | **无任何代码读取**；真正读的是 `DB_MAX_CONNECTIONS`（`lib/shared-core/src/config/enhanced.rs:69`、`lib/shared-bootstrap/src/lib.rs:447`，另有 `<SVC>_DB_MAX_CONNECTIONS` 覆盖链） | 模板已改成 `DB_MAX_CONNECTIONS=30`，旧键加“已废弃”注释并被门禁禁止 |
| `STORAGE_PATH` | **无代码读取**；文件落盘是 cwd 下的相对路径 `uploads/<user>/<file>`（`svc/unified-core/src/modules/file/upload.rs`） | 模板改为注释 + 说明“要先改代码才会生效” |
| `PLUGIN_STORAGE_PATH` | **无代码读取** | 同上 |
| `CORE_PORT` | 只在 unified-core 独立部署时读；单体 `svc/server` 读 `SERVER_PORT` | 模板加注说明，不再暗示单体需要它 |
| `MIGRATE_URL` 写进 plist | 运行时进程不读；plist 的 `EnvironmentVariables` 会**遮蔽** Keychain 同键注入 | 模板加注“迁移工具专用，不要写进 plist” |

顺带发现一个真实风险：因为落盘路径是 cwd 相对的，而生产机 `WorkingDirectory=/`，**文件上传会尝试写 `/uploads/...`**。若该目录不存在或无写权限，上传功能会失败（回执里说 `data/files` 不存在，与此一致）。要么把 plist 的 `WorkingDirectory` 指到 `/Users/xingzhai/topems`，要么改代码引入真正的存储根目录变量——属于独立变更，本轮只登记。

## 已改（仓库侧）

1. `config/env/.env.production.template`：5 处按上表修正，全部带“为什么”。
2. `scripts/ci/check-prod-config.mjs`：新增不变量——模板与实配文件中，`DATABASE_MAX_CONNECTIONS` / `STORAGE_PATH` / `PLUGIN_STORAGE_PATH` **不得以生效形式出现**；池大小必须用 `DB_MAX_CONNECTIONS`。负例已验证（本地 `.env.production` 改前 FAIL、改后 PASS）。
3. `.env.production`（本机未跟踪参考样本）：改为“native 形态参考”并注明不驱动生产；`DB_MAX_CONNECTIONS` 改名、两个 ghost 键注释、权限仍 600。
4. 安全头：`svc/unified-core/src/{main,embedded}.rs` 由 `SecurityHeadersConfig::default()` 改为 `::from_env()`——`ENVIRONMENT=production` 现在真正生效（`production()` 预设：CSP 收敛、HSTS 带 preload 标记）。注意这**只影响经 Rust 的响应（/api）**；HTML 页面由 nginx 直接返回，要加 HSTS 应在边缘（Cloudflare SSL/TLS → HSTS）或 nginx 做。

## 仍未闭环

- 生产机 `.env` 里 `DATABASE_URL` 仍指向 `topems`（旧值）：该文件不会被加载，但会误导排障。主控机与生产机网络隔离（SSH 超时）无法代改，需生产机自行注释或改成 `topems_prod`。
- 生产机启动期 4 条 `plugin registry "RLS context missing"` ERROR（01:59:25–01:59:41）：与本次 CORS/ENV 改动无关，需单独排查（现象是插件注册表在无租户上下文下访问了 fail-closed 的 scope 连接）。
- 回执提到的 `SecurityHeadersConfig` 改动需要**重建二进制**才会在生产生效；二进制当前构建于 11-19 04:34，是否需要为此重建由发布节奏决定。
- `test.topmap.net` 已删除，DNS 侧无遗留。
