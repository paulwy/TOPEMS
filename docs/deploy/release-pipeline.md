# TOPEMS 发布流程（airdeair 构建 → xingzhai 生产机安装）

> 生效场景：main 有代码更新需同步到 xingzhai 生产环境时的**标准升级通道**。
> 原则：**生产机不构建、不拉源码构建**——airdeair 侧构建 arm64 交付包，xingzhai 侧只做替换与校验（生产机无 Rust 工具链依赖，降低环境风险）。
> 同架构前提：airdeair 本机 `uname -m` = `arm64`（与 xingzhai 回报一致）；若未来生产机换架构需交叉编译（另议）。

## 0. 前置检查（每次发布）

- [ ] `git status` 干净、已在 main 最新（`git fetch origin && git reset --hard origin/main` 仅限确认无误的 commit）
- [ ] 门禁绿：`cargo check --workspace`（SQLX_OFFLINE）、`tsc --noEmit`（前端若发布）、validate.sh 0 errors
- [ ] 含新迁移？→ 走 §4 迁移面流程（**生产禁 sqlx migrate run**，DDL 双轨治理约定）

## 1. airdeair 侧：构建交付包

```bash
cd /Users/air/TOPEMS
./scripts/release/build-release.sh            # 默认输出 ~/topems-release/
# 产物：topems-server-<version>-<ts>.tar.gz + .sha256 + VERSION（commit/arch/时间）
```

校验包内容：`tar tzf <pkg>.tar.gz` 应含 `topems-server`、`VERSION`、`README.txt`。

## 2. 交付到 xingzhai

```bash
# 任一方式（凭据/通道按现有约定）：
rsync -avzP ~/topems-release/topems-server-*.tar.gz xingzhai@<host>:~/topems/releases/
# 或 scp；到达后核对 SHA256：
shasum -a 256 <pkg>.tar.gz   # 与本机 .sha256 一致
```

## 3. xingzhai 侧：安装（免构建替换）

```bash
cd ~/topems/releases
tar xzf <pkg>.tar.gz && cd <pkg>
# ① 校验与现有版本
cat VERSION
file topems-server                    # 应 arm64
shasum -a 256 topems-server           # 与 airdeair 侧核对（可选）
# ② 备份当前二进制（回滚锚点）
cp ~/topems/bin/topems-server ~/topems/bin/topems-server.prev
# ③ 替换 + 重启
cp topems-server ~/topems/bin/topems-server
launchctl kickstart -k gui/$(id -u)/com.topems.server
# ④ 探针
sleep 2
curl -fsS http://127.0.0.1:8099/health && echo " BFF OK"
curl -fsS https://localhost/health --insecure && echo " nginx OK"
```

## 4. 迁移面（仅当新版本含迁移）

- **生产禁 sqlx migrate run**（治理定案：迁移由迁移链逐条执行 + checksum 登记）。
- 流程：将新增迁移文件（`database/migrations/<新文件>.sql`）随包或另行交付 → 在 xingzhai 上按迁移链顺序手工执行 → 校验 `validate.sh` 0 errors → 再启动新二进制（启动会检查迁移版本）。
- 含回滚性变更（删列/改类型）时：先 `pg_dump`（见 macos-production-ops.md §2 备份）再执行。

## 5. 回滚

```bash
# 二进制回滚（迁移未执行时）
cp ~/topems/bin/topems-server.prev ~/topems/bin/topems-server
launchctl kickstart -k gui/$(id -u)/com.topems.server
# DB 变更不可逆时：先恢复备份再回滚二进制（顺序不可反）
```

## 6. 回报模板（xingzhai → airdeair）

```markdown
## 版本升级回报（<日期>）
- 升级版本/commit：<VERSION 内容>
- 迁移：<无 / 执行了哪些，validate 结果>
- 替换结果：<bin 替换 + 重启完成>
- 探针：BFF health <code> / nginx health <code>
- 回滚锚点：<.prev 时间>
- 异常：<无 / 描述>
```

## 7. 与既有文档关系

- 日常运维/备份/证书/外网：`docs/deploy/macos-production-ops.md`
- 首装部署（一次性）：`docs/deploy/xingzhai-ai-runbook.md` + `docs/deploy/macos-deployment.md`
- 本文件只负责**版本升级循环**；首装后的一切代码更新均走本流程。
