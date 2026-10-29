# 协作机（WSL）拉取回归清单 — 2026-10-29

> 适用：协作机从远端 main 拉取后执行的完整验证清单（schema 双源治理 + expo 58 升级 + 依赖收敛批次）。
> 远端最新基线：main（含 B 扩展修复 `2f6c9672b`、expo 58 升级 `f2438b583`、overrides 根因修复 `ede14836b`、豁免登记 `881ce9779`、安全挂账复核批次）。

## 0. 拉取与依赖

```bash
git pull --rebase origin main
pnpm install        # lock 大改（expo 58 + overrides 收敛），需全量重装
cargo build --workspace   # 或按需 cargo check
```

## 1. 四步回归（schema 双源治理验证）

### ① validate.sh
```bash
bash scripts/migration/validate.sh
# 预期：Errors 0 / Checksum 0 / Drift 0 / Invalid 0（516 迁移文件）
```

### ② 空库新建（关键注意点）
```bash
# DATABASE_URL 必须去掉 .env 中 ?options=-csearch_path=iam%2Cmes%2Cpublic%2Canalytics 后缀！
# 否则 pgvector 扩展装入 iam schema，20260831190850 之后报 public.vector does not exist
psql postgres://topems:topems_secret@localhost:5432/postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='topems_regression';"
psql postgres://topems:topems_secret@localhost:5432/postgres -c "DROP DATABASE IF EXISTS topems_regression;"
psql postgres://topems:topems_secret@localhost:5432/postgres -c "CREATE DATABASE topems_regression;"
```

### ③ migrate.sh run
```bash
DATABASE_URL='postgres://topems:topems_secret@localhost:5432/topems_regression' bash scripts/migrate.sh run
# 预期：516 迁移全绿、1485+ 表落库；二次 run 幂等（0 应用、0 错误）
# 新迁移：20261029185000_schema_defense_align_columns.sql（git mv 改名自 190000）
#       20261029200000_schema_defense_type_align.sql（schema 错配/转换语义修正）
```

### ④ 服务启动
```bash
# unified-core 冒烟（或按各服务启动脚本）
CORE_PORT=8000 target/debug/topems-unified-core &   # 视构建产物路径而定
curl -s localhost:8000/health    # 预期 healthy
```

## 2. v76 pgvector 终核（提供本机数据）

```bash
# 在协作机执行，输出粘贴回主开发（用于终核核销）
git log -p -- database/migrations/20260813000003_v76_pgvector_indexes.sql
# 或 git show HEAD:database/migrations/20260813000003_v76_pgvector_indexes.sql
```
> 主开发本机结论：无裸 vector 类型引用（仅 extension 名 + vector_cosine_ops 操作符类 + cast 惯例），无需改。
> 判定：逐行一致 → 核销；有 ai.vector 残留或裸类型引用 → 提供 diff 待判。

## 3. expo 58 升级验证（协作机有原生环境时）

```bash
cd apps/mobile
npx expo-doctor@latest          # 预期 19/20（react 重复为 pnpm monorepo 常态）
npx tsc --noEmit                # 0 error
npm_config_registry=https://registry.npmjs.org pnpm audit --json   # 预期仅 node-forge/deepmerge
```

- **真机/模拟器回归重点**：交互时序（RN 0.88 Web 事件分发默认切换）、相机/通知权限流、第三方 UI（paper/svg/screens）页面
- **EAS 云构建**（managed，compileSdk 37 由 Expo 托管）：`npx eas-cli login` + `npx eas-cli init`（app.json 写 projectId）+ `npx eas-cli build`
- **expo start 注意**：monorepo 下 dev server bundle 入口解析有 404 怪癖（`--project-root` 参数不被 CLI 支持）——不影响生产构建（expo export 已验证）

## 4. 依赖安全复核

```bash
# 前端（官方 registry 显式指定）
npm_config_registry=https://registry.npmjs.org pnpm audit --json

# Rust（镜像环境需本地 advisory-db）
git clone --depth 1 https://github.com/RustSec/advisory-db.git /tmp/advisory-db
cargo audit --db /tmp/advisory-db
```
> 现状：前端仅 node-forge（high）/ deepmerge（low）无修复版挂账；Rust 0 漏洞。
> 挂账登记：`docs/security-dependencies-hold.md`；完整评估：`docs/security/dependabot-local-audit-20261029.md`。

## 5. 协作机反馈项

- v76 终核：粘贴 `git log -p` 输出
- 四步回归结果：validate 数字 / 迁移数 / 幂等结果 / health 状态
- 若已应用旧版 `20261029200000`（f903a204b 版本）：新 checksum `66110e06...` 与迁移不可变门禁冲突时，走豁免登记（`database/migration-exemptions.json`）而非 --no-verify
