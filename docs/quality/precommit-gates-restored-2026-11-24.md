# pre-commit 门禁恢复记录（2026-11-24）

## 结论：门禁此前是「静默空跑」，现已真正生效

本轮排查发现一个比配置漂移更根本的问题：**仓库里的 57 个 pre-commit 钩子从来没跑过。**

- `.git/hooks/pre-commit` 是 lefthook 生成的 wrapper（11-24 09:33 安装），但机器上**没有 lefthook 二进制**；
- wrapper 在找不到二进制时只打印 `Can't find lefthook in PATH` 并以 0 退出，git 认为钩子通过；
- 因此本轮之前所有提交都靠 `--no-verify` 绕过，**即使不加 `--no-verify` 也一样什么都拦不住**——新增的 `prod-config`、`status-enum-contract`、`destructive-sql` 等门禁全部形同虚设。

## 修复

1. **安装 lefthook**：`brew install lefthook` → 2.2.2（`/opt/homebrew/bin/lefthook`）。
2. **修正 `status-catalog` 比对目标**：该钩子默认经 `DATABASE_URL`/`.env MIGRATE_URL` 连开发库 `topems`，而开发库已演进到 442 条状态 CHECK / 285 条无约束列，目录是 **35 条基线快照**（`docs/database/status-check-catalog.json`），全量比对必然 FAIL → 每次提交都只剩 `--no-verify` 一条路。
   - 在本地未跟踪的 `.env` 增加一行（原件已备份 `.env.bak-2026-11-24`）：
     ```
     STATUS_CATALOG_DB_URL=postgresql:///topems_status_baseline_verify
     ```
   - 该类目（`db-target.mjs` 的 `status-catalog` profile）第 1 优先级就是 `STATUS_CATALOG_DB_URL`，显式指定后不再被 `DATABASE_URL` 带偏。

## 验证

- `lefthook run pre-commit --force`：**57/57 全部 ✔，EXIT=0**（此前 `status-catalog` 是唯一 FAIL）。
- 关键门禁单独跑的结果：

| 门禁 | 结果 |
|---|---|
| `check-prod-config.mjs` | ✅ 生产配置一致性通过 |
| `check-status-enum-contract.mjs` | ✅ 12/12 条契约一致 |
| `check-destructive-sql.mjs` | ✅ PASS（豁免均在基线内） |
| `gen-finance-status.mjs --check` | ✅ 5 个 DB ENUM 一致 |
| `status-db-check-queue.mjs --check` | ✅ 185 枚举 / 192 值，分桶一致 |
| `dump-status-code-inventory.mjs --check --strict-palette` | ✅ 315 Rust 枚举 / 251 前端键，色板缺口 0 |
| `check-no-prod-dsn-defaults.sh` | ✅ 无生产 DSN 默认值 |
| `check-sensitive-info.sh` | ✅ 通过 |
| `gen-manifest.sh --check` | ✅ registered=253 / disk=846 / 漂移 0 |
| `dump-status-checks.mjs --check` | ✅ 35 条 + 5 枚举 + 681 无约束列（基线库） |
| 本地库 NOT VALID | ✅ 0 |

## 注意

- `.env` 与 `.env.bak-2026-11-24` 都未跟踪（`.gitignore:32 *.env.*` 只覆盖 `*.env.*`，`.env` 由其他规则忽略），不要把 `STATUS_CATALOG_DB_URL` 塞进任何 tracked 模板——它是**本机基线库**的指向，不同机器基线库端口/名称可能不同。
- 基线库 `topems_status_baseline_verify` 若被删除，`status-catalog` 会直接 FAIL（缺库即失败，设计如此），重建方式：`createdb topems_status_baseline_verify` 后从锚点 `20261117235500` 起按 manifest 顺序重放迁移。
- CI 上若没有该库，需要显式提供 `STATUS_CATALOG_DB_URL`；否则同样是 FAIL 而非跳过。
