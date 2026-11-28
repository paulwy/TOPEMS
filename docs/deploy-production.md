# TOPEMS 生产机部署手册

> ⚠️ **口径更正（2026-11-28）**：下文拓扑与命令中的 `192.168.110.115` 为**已退役、探活不可达**的旧生产机地址，**不得按其执行**。现役角色收敛为：**xingzhai（Mac mini）= 开发 + 唯一生产宿主**；**air（.96）= 开发 + 出包机构建交付包**；生产机不构建。
> 现役权威通道：版本升级见 [release-pipeline.md](deploy/release-pipeline.md)（air 出包 → xingzhai 本机免构建替换）；首装与运维见 [macos-deployment.md](deploy/macos-deployment.md)、[macos-production-ops.md](deploy/macos-production-ops.md)。
> 本文余下章节为 2026-11 早期 `air 编译 → scp/ssh 到 .115` 旧范式的历史记录，仅作留档，地址/命令勿照搬到现役环境。

> 历史：从 air 的 MacBook 一键部署到旧生产机（192.168.110.115，已退役）。



***

## 1. 架构概览



```
┌─────────────────┐         scp/ssh         ┌──────────────────────┐
│  air 的 MacBook  │ ──────────────────────→ │  xingzhai@192.168.110.115 │
│  (开发+编译机)    │                         │  (生产机，macOS)        │
│                  │                         │                        │
│  cargo build     │                         │  ┌──────────────────┐  │
│  --release       │                         │  │ nginx :80        │  │
│                  │                         │  │  ├─ 静态文件     │  │
│  target/release/ │ ──── 184MB binary ───→│  │  └─ /api/ → :8099│  │
│  topems-server   │                         │  └────────┬─────────┘  │
└─────────────────┘                         │           ↓            │
                                            │  ┌──────────────────┐  │
                                            │  │ topems-server     │  │
                                            │  │ launchd 托管      │  │
                                            │  │ 端口 8099        │  │
                                            │  │ 31 个模块        │  │
                                            │  └────────┬─────────┘  │
                                            │           ↓            │
                                            │  ┌──────────────────┐  │
                                            │  │ PostgreSQL 5432   │  │
                                            │  │ topems_prod 库   │  │
                                            │  └──────────────────┘  │
                                            └──────────────────────┘
```

**核心原则**：生产机不做编译，只跑二进制。所有编译在 air 本地完成。



***

## 2. 生产机信息



| 项        | 值                                               |
| -------- | ----------------------------------------------- |
| IP       | 192.168.110.115                                 |
| SSH 用户   | xingzhai                                        |
| 主机名      | Mac.lan                                         |
| 操作系统     | macOS                                           |
| 应用根目录    | /Users/xingzhai/topems/                         |
| 二进制路径    | /Users/xingzhai/topems/bin/topems-server        |
| 日志目录     | /Users/xingzhai/topems/logs/                    |
| 仓库路径     | /Users/xingzhai/TOPEMS/（仅 git pull，不编译）         |
| 前端 dist  | /Users/xingzhai/TOPEMS/dist/topems-\*/web/      |
| nginx 配置 | /opt/homebrew/etc/nginx/servers/topems.conf     |
| 后端端口     | 8099                                            |
| nginx 端口 | 80                                              |
| 数据库      | PostgreSQL 5432，库名 topems\_prod，用户 topems\_prod |



***

## 3. 前置条件（air 本地）

### 3.1 SSH 免密登录



```
# 首次执行（已配置过可跳过）
ssh-keygen -t ed25519  # 如果已有密钥可跳过
ssh-copy-id xingzhai@192.168.110.115
# 验证
ssh xingzhai@192.168.115 "hostname"  # 应输出 Mac.lan
```

### 3.2 编译环境



* Rust（cargo）已安装

* protoc 已安装（`brew install protobuf`，本地 /opt/homebrew/bin/protoc）

* .sqlx 缓存完整（`cargo build` 不报错）

### 3.3 仓库状态



* 在 /Users/air/TOPEMS 目录

* main 分支

* 工作区干净（无未提交变更）

* HEAD == origin/main



***

## 4. 一键部署（推荐）



```
cd /Users/air/TOPEMS

# 最简：只部署后端
./scripts/deploy-prod.sh

# 同时部署前端
./scripts/deploy-prod.sh --frontend

# 跳过本地编译（用现有 target/release/topems-server）
./scripts/deploy-prod.sh --skip-build

# 查看生产机状态
./scripts/deploy-prod.sh --status

# 回滚到上一个备份
./scripts/deploy-prod.sh --rollback

# 跳过所有确认提示（非交互模式/后台运行）
./scripts/deploy-prod.sh --skip-build --force

# 重置数据库（清空测试部门 + 插入标准部门树，首次部署用）
./scripts/deploy-prod.sh --skip-build --force --reset-db
```

### 脚本做了什么



| 步骤        | 动作                                       | 耗时                     |
| --------- | ---------------------------------------- | ---------------------- |
| 0. 前置检查   | SSH 连通、git 干净、HEAD 同步                    | 2s                     |
| 1. 本地编译   | `cargo build --release -p topems-server` | \~11min（首次）/ \~30s（增量） |
| 2. 生产机备份  | 旧二进制改名 `.bak-<commit>-<时间戳>`             | 1s                     |
| 3. scp 上传 | 184MB 二进制传到生产机                           | \~30s（局域网）             |
| 4. 替换重启   | mv + `launchctl kickstart -k`            | 2s                     |
| 5. 健康检查   | 轮询 /api/server/health，最多 60s             | \~10s                  |
| (可选) 前端   | pnpm build + rsync dist + nginx reload   | \~2min                 |

**失败自动回滚**：健康检查超时会自动恢复上一个备份并重启。

**环境变量预检**：部署前自动检查 plist 里的 `ENCRYPTION_MASTER_KEY` / `JWT_SECRET` / `JWT_REFRESH_SECRET` 是否配置。未配置会警告 —— 否则每次重启后端都会生成随机密钥，导致已加密的密码哈希解不开，登录 401。



***

## 4.5 首次部署初始化（重要）

第一次部署到全新生产机时，除了跑部署脚本，还需要做以下初始化：

### 4.5.1 配置环境变量（plist）

后端 plist（`~/Library/LaunchAgents/com.topems.server.plist`）必须包含以下环境变量，否则登录会 401：



| 变量                      | 说明                   | 生成方式                                                    |
| ----------------------- | -------------------- | ------------------------------------------------------- |
| `ENCRYPTION_MASTER_KEY` | 数据库字段加密主密钥，固定值不能变    | `openssl rand -hex 32`                                  |
| `JWT_SECRET`            | JWT 签名密钥             | `openssl rand -hex 32`                                  |
| `JWT_REFRESH_SECRET`    | JWT refresh token 密钥 | `openssl rand -hex 32`                                  |
| `DATABASE_URL`          | PostgreSQL 连接串       | `postgres://topems_prod:***@localhost:5432/topems_prod` |

**为什么重要**：`ENCRYPTION_MASTER_KEY` 不配置的话，每次重启后端都会生成随机密钥，数据库里加密的密码哈希就解不开了，登录直接 401。

### 4.5.2 重置 admin 密码



```
# 生成 bcrypt 哈希（注意 $ 符号必须用 SQL 文件方式传，不能直接 shell 双引号）
python3 -c "import bcrypt; print(bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode())"

# 写到 SQL 文件再 scp 到生产机执行
cat > /tmp/update-pwd.sql << 'EOF'
UPDATE iam.users 
SET password_hash='$2b$12$xxx...xxx', 
    must_change_password=false 
WHERE username='admin';
EOF
scp /tmp/update-pwd.sql xingzhai@192.168.110.115:/tmp/
ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/psql -U topems_prod -d topems_prod -f /tmp/update-pwd.sql"
```

### 4.5.3 重置数据库 + 初始化部门+岗位

```bash
./scripts/deploy-prod.sh --skip-build --force --reset-db
```

#### 清理范围

| 清理的表 | 说明 |
|---|---|
| `hrm.initialization_status` | 初始化状态 |
| `hrm.initialization_logs` | 初始化日志 |
| `hrm.positions` | 岗位 |
| `hrm.departments` | 部门 |
| `hrm.companies` | 公司信息 |
| `hrm.employees` | 员工档案 |

**保留不动**：`iam.users`（admin 账号）、数据库结构、环境变量配置。

#### 标准部门树（23 个，中文命名）

`name` 字段为中文（默认语言），`name_en` 字段为英文（多语言对照）。

| 层级 | 部门名称 | 编码 | 上级部门 |
|---|---|---|---|
| 顶级 | 总裁办公室 | DEPT-EXEC-001 | - |
| 顶级 | 人力资源部 | DEPT-HR-001 | - |
| 顶级 | 财务部 | DEPT-FIN-001 | - |
| 顶级 | 信息技术部 | DEPT-IT-001 | - |
| 顶级 | 法务合规部 | DEPT-LEG-001 | - |
| 顶级 | 销售市场部 | DEPT-SALES-001 | - |
| 顶级 | 客户服务部 | DEPT-CS-001 | - |
| 顶级 | 生产部 | DEPT-PROD-001 | - |
| 顶级 | 质量管理部 | DEPT-QMS-001 | - |
| 顶级 | 供应链部 | DEPT-SCM-001 | - |
| 顶级 | 研发部 | DEPT-RD-001 | - |
| 顶级 | 设备维护部 | DEPT-MAINT-001 | - |
| 二级 | 软件工程组 | DEPT-RD-SW-001 | 研发部 |
| 二级 | 硬件工程组 | DEPT-RD-HW-001 | 研发部 |
| 二级 | 产品设计组 | DEPT-RD-PD-001 | 研发部 |
| 二级 | 采购组 | DEPT-SCM-PROC-001 | 供应链部 |
| 二级 | 仓储组 | DEPT-SCM-WH-001 | 供应链部 |
| 二级 | 物流组 | DEPT-SCM-LOG-001 | 供应链部 |
| 二级 | 装配线 | DEPT-PROD-ASM-001 | 生产部 |
| 二级 | 机加工组 | DEPT-PROD-MACH-001 | 生产部 |
| 二级 | 包装组 | DEPT-PROD-PKG-001 | 生产部 |
| 二级 | 招聘组 | DEPT-HR-REC-001 | 人力资源部 |
| 二级 | 培训发展组 | DEPT-HR-TRN-001 | 人力资源部 |

#### 标准岗位（20 个）

| 岗位名称 | 编码 | 所属部门 | 职级 |
|---|---|---|---|
| 首席执行官 | POS-CEO-001 | 总裁办公室 | 5（高管） |
| 总裁助理 | POS-EXEC-AST-001 | 总裁办公室 | 3（经理） |
| HR经理 | POS-HR-MGR-001 | 人力资源部 | 3（经理） |
| 招聘专员 | POS-HR-REC-001 | 招聘组 | 1（基层） |
| 财务经理 | POS-FIN-MGR-001 | 财务部 | 3（经理） |
| 会计 | POS-FIN-ACC-001 | 财务部 | 2（主管） |
| 出纳 | POS-FIN-CSH-001 | 财务部 | 1（基层） |
| IT经理 | POS-IT-MGR-001 | 信息技术部 | 3（经理） |
| 前端工程师 | POS-IT-FE-001 | 软件工程组 | 2（主管） |
| 后端工程师 | POS-IT-BE-001 | 软件工程组 | 2（主管） |
| 运维工程师 | POS-IT-OPS-001 | 信息技术部 | 2（主管） |
| 销售经理 | POS-SALES-MGR-001 | 销售市场部 | 3（经理） |
| 销售代表 | POS-SALES-REP-001 | 销售市场部 | 1（基层） |
| 生产经理 | POS-PROD-MGR-001 | 生产部 | 3（经理） |
| 生产线组长 | POS-PROD-LDR-001 | 装配线 | 2（主管） |
| 质量经理 | POS-QMS-MGR-001 | 质量管理部 | 3（经理） |
| 质检专员 | POS-QMS-QC-001 | 质量管理部 | 1（基层） |
| 供应链经理 | POS-SCM-MGR-001 | 供应链部 | 3（经理） |
| 采购专员 | POS-SCM-PUR-001 | 采购组 | 1（基层） |
| 仓储专员 | POS-SCM-WH-001 | 仓储组 | 1（基层） |

#### 其他 seed 参数

| 参数 | 说明 |
|---|---|
| `--seed-departments` | 只插入标准部门（不清库，适合已有数据但缺部门的场景） |
| `--seed-positions` | 只插入标准岗位（不清库，需要先有部门） |
| `--seed-roles` | 只插入默认角色（不清库，3 个系统内置角色） |
| `--seed-dict` | 只插入系统字典（不清库，6 类 HR 枚举） |

#### 默认角色（3 个）

| 角色编码 | 角色名称 | 权限范围 |
|---|---|---|
| `super_admin` | 超级管理员 | 所有权限（`["*"]`），admin 用户默认关联 |
| `dept_manager` | 部门经理 | 本部门员工管理、审批（hrm/attendance/recruitment 读写） |
| `employee` | 普通员工 | 基础自助（个人信息查看、请假申请、工资条查看） |

#### 系统字典（6 类，26 项）

| 字典类型 | 编码 | 包含项 |
|---|---|---|
| 性别 | `gender` | 男、女、未知 |
| 员工状态 | `employee_status` | 试用期、正式、离职、退休 |
| 部门类型 | `department_type` | 职能部门、业务部门、生产部门、研发部门 |
| 岗位职级 | `position_level` | 基层员工、主管、经理、总监、高管 |
| 婚姻状况 | `marital_status` | 未婚、已婚、离异、丧偶 |
| 学历 | `education` | 大专、本科、硕士、博士 |

seed 文件位置：`database/seeds/standard_departments.sql`、`database/seeds/standard_positions.sql`、`database/seeds/default_roles.sql`、`database/seeds/default_dict_data.sql`

### 4.5.4 验证登录



```
ssh xingzhai@192.168.110.115 "curl -s -X POST http://localhost:8099/api/core/iam/auth/login \
  -H 'Content-Type: application/json' \
  -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
# 返回 success=true + access_token 即成功
```

## 4.6 数据库迁移入口（唯一）

**prod 迁移唯一入口是 `scripts/migration/apply-forward.sh --prod`（基线 + 前向迁移）。禁止在 prod 执行 `sqlx migrate run`。**

原因：prod 账本缺 16 条历史/定向迁移（8 条 `dbNN_test` / `dbNN_5433`），`sqlx migrate run` 会把它们当 pending 重放，其中 `db08` 是 190 列 `varchar→text` 的无守卫 `ALTER`。详见 [§18/§19](quality/p4-reverse-tables-triage-2026-11-05.md)。

```bash
# 唯一入口（在仓库根执行）
bash scripts/migration/apply-forward.sh --dsn "$DATABASE_URL" --prod --anchor 20261105235700

# 临时代码放行（仅人工复核后；须在变更记录注明理由）
bash scripts/migration/apply-forward.sh --dsn "$DATABASE_URL" --prod \
  --anchor 20261105235700 --allow-pending <version>
```

`scripts/deploy/production-deploy.sh`（遗留 systemd 一键部署）已同步切换：

```bash
# 完整部署（迁移步骤内部走 apply-forward.sh，失败即中止，不回退 sqlx）
bash scripts/deploy/production-deploy.sh --env .env.production

# 只跑迁移（不编译、不重启服务；用于灰度/验证）
bash scripts/deploy/production-deploy.sh --migrate-only --env .env.production

# 临时放行指定 pending 版本（可重复；会打印显著告警）
bash scripts/deploy/production-deploy.sh --migrate-only --env .env.production \
  --allow-pending <version>
```

行为差异（相对旧版）：

| 项 | 旧版 | 新版 |
|---|---|---|
| 迁移命令 | `cargo sqlx migrate run` | `apply-forward.sh --prod`（仅 `version > anchor`） |
| 锚点/基线 | 不涉及 | 自动读取 `database/baseline/baseline_*.json` 最新锚点；资产缺失/校验失败即中止；`--anchor` 可显式覆盖 |
| 迁移失败 | `warn` 后继续部署 | `error` 退出 1，部署中止 |
| 账本落后 | 不检查 | 账本最大版本 < 基线锚点 → 中止（提示先恢复基线） |
| 定向/无守卫 pending | 会被重放 | 硬拒绝；仅 `--allow-pending` 显式放行并告警 |

**环境供给入口（2026-11-05 起）**：`scripts/deploy/setup-db.sh` 已降级为仅建用户/建库（`--init-schema` 直接 exit 1）；
新环境一律走 `scripts/db/provision-env.sh`——恢复基线快照（schema + 账本 + 参考数据）→ 只应用 `version > 锚点` 的前向迁移。
参考数据（11 张配置表：角色/权限点/菜单/字典/组织岗位等，2277 行）**默认恢复**，否则新环境无角色权限、无法鉴权：

```bash
# 1) 仅建用户/库
bash scripts/deploy/setup-db.sh --create-user --create-db --password '<PWD>'

# 2) 基线 + 前向（dev/test/staging/prod-replica；默认库名不同）
bash scripts/db/provision-env.sh --env staging --db topems --skip-prod-fingerprint

# 本地/测试库重复供给：非空库默认 exit 1，确认重建需显式 --force-nonempty（打印 ⚠️ WARN）
# 只重建参考数据：bash scripts/db/provision-env.sh --env staging --db topems --data-only
```

原因：历史链存在断点（`20261005000004` 依赖 `public.qa_lab_tasks`，该表由更晚的 `20261007000009` 才创建），
从零全链 `sqlx migrate run` 必然失败。锚点定义、前移流程与新迁移规则见
[environment-provisioning.md](quality/environment-provisioning.md)。已有库（含 prod）升级仍只走 `apply-forward.sh --prod`。

***

## 5. 运维与备份

### 5.1 数据库每日自动备份

**备份策略：**
- 每天凌晨 3:00 自动执行
- 备份文件：`/Users/xingzhai/topems/backups/topems_prod_YYYYMMDD_HHMMSS.sql.gz`
- 保留最近 7 天，自动清理更早的

**首次部署需手动安装：**

```bash
# 1. 上传备份脚本到生产机
scp scripts/backup-db.sh xingzhai@192.168.110.115:/Users/xingzhai/topems/scripts/
ssh xingzhai@192.168.110.115 "chmod +x /Users/xingzhai/topems/scripts/backup-db.sh"

# 2. 安装 launchd plist
scp scripts/com.topems.backup-db.plist xingzhai@192.168.110.115:~/Library/LaunchAgents/
ssh xingzhai@192.168.110.115 "launchctl load ~/Library/LaunchAgents/com.topems.backup-db.plist"

# 3. 验证
ssh xingzhai@192.168.110.115 "launchctl list | grep topems.backup"
# 应输出: -  0  com.topems.backup-db
```

**手动执行备份：**

```bash
ssh xingzhai@192.168.110.115 "/Users/xingzhai/topems/scripts/backup-db.sh"
```

**恢复备份：**

```bash
# 解压并恢复
gunzip -c /Users/xingzhai/topems/backups/topems_prod_20261104_030000.sql.gz | \
  /opt/homebrew/bin/psql -U topems_prod -d topems_prod
```

### 5.2 日志位置

| 日志 | 路径 |
|---|---|
| 后端服务日志 | `/Users/xingzhai/topems/logs/server.out` |
| 后端错误日志 | `/Users/xingzhai/topems/logs/server.err` |
| Nginx 访问日志 | `/Users/xingzhai/topems/nginx/logs/access.log` |
| Nginx 错误日志 | `/Users/xingzhai/topems/nginx/logs/error.log` |
| 数据库备份日志 | `/Users/xingzhai/topems/logs/backup-db.log` |
| 日志轮转日志 | `/Users/xingzhai/topems/logs/log-rotate.log` |

> 注：`/opt/homebrew/var/log/nginx/access.log` 是 Homebrew 默认日志，当前已停在 2026-11-08，**不是**生产入口日志；入口日志以上表 `~/topems/nginx/logs/` 为准。

### 5.3 日志轮转

**轮转策略：**
- 每天凌晨 3:30 自动执行（避开 3:00 数据库备份）
- 日志超过 50MB 即 gzip 归档（不中断应用写入）
- 每个日志保留最近 7 个归档，自动清理更早的

**首次部署需手动安装：**

```bash
# 1. 上传轮转脚本到生产机
scp scripts/rotate-logs.sh xingzhai@192.168.110.115:/Users/xingzhai/topems/scripts/
ssh xingzhai@192.168.110.115 "chmod +x /Users/xingzhai/topems/scripts/rotate-logs.sh"

# 2. 安装 launchd plist
scp scripts/com.topems.log-rotate.plist xingzhai@192.168.110.115:~/Library/LaunchAgents/
ssh xingzhai@192.168.110.115 "launchctl load ~/Library/LaunchAgents/com.topems.log-rotate.plist"

# 3. 验证
ssh xingzhai@192.168.110.115 "launchctl list | grep topems.log"
# 应输出: -  0  com.topems.log-rotate
```

### 5.4 常用运维命令

```bash
# 查看后端服务状态
ssh xingzhai@192.168.110.115 "launchctl list | grep topems"

# 重启后端
ssh xingzhai@192.168.110.115 "launchctl kickstart -k gui/$(id -u)/com.topems.server"

# 重启 Nginx
ssh xingzhai@192.168.110.115 "launchctl kickstart -k gui/$(id -u)/com.topems.nginx"

# 实时查看后端日志
ssh xingzhai@192.168.110.115 "tail -f /Users/xingzhai/topems/logs/server.out"
```


***

## 6. 手动部署（不推荐，了解即可）



```
# 1. 本地编译
cd /Users/air/TOPEMS
cargo build --release -p topems-server

# 2. 上传
scp target/release/topems-server xingzhai@192.168.110.115:/Users/xingzhai/topems/bin/topems-server.new

# 3. 生产机备份 + 替换 + 重启
ssh xingzhai@192.168.110.115 "
  cd /Users/xingzhai/topems/bin
  cp topems-server topems-server-\$(git -C /Users/xingzhai/TOPEMS rev-parse --short HEAD)-\$(date +%Y%m%d-%H%M%S).bak
  mv topems-server.new topems-server
  chmod +x topems-server
  launchctl kickstart -k gui/\$(id -u)/com.topems.server
"

# 4. 验证
ssh xingzhai@192.168.110.115 "curl -s http://localhost:8099/api/server/health | python3 -m json.tool | head -5"
```



***

## 6. launchd 服务管理

生产机有 4 个 launchd 托管服务（`~/Library/LaunchAgents/`）：



| Label                      | 作用           | 端口   |
| -------------------------- | ------------ | ---- |
| com.topems.server          | Rust 后端（主服务） | 8099 |
| com.topems.nginx           | 反向代理 + 静态文件  | 80   |
| com.topems.nginx-logrotate | nginx 日志轮转   | -    |
| com.topems.backup          | 数据库定时备份      | -    |

### 常用命令



```
# 查看状态
ssh xingzhai@192.168.110.115 "launchctl list | grep topems"

# 重启后端
ssh xingzhai@192.168.110.115 "launchctl kickstart -k gui/\$(id -u)/com.topems.server"

# 重启 nginx
ssh xingzhai@192.168.110.115 "launchctl kickstart -k gui/\$(id -u)/com.topems.nginx"

# 停止后端（不再自动拉起）
ssh xingzhai@192.168.110.115 "launchctl bootout gui/\$(id -u)/com.topems.server"

# 启动后端（再次加载）
ssh xingzhai@192.168.110.115 "launchctl bootstrap gui/\$(id -u) ~/Library/LaunchAgents/com.topems.server.plist"
```



***

## 7. 访问方式

### 局域网内



* **前端页面**：[http://192.168.110.115/](http://192.168.110.115/)

* **后端 API**：[http://192.168.110.115/api/](http://192.168.110.115/api/)...（经 nginx 反代；8099 只监听 `127.0.0.1`，**不可直连**）

* **健康检查**：[http://192.168.110.115/api/server/health](http://192.168.110.115/api/server/health)

### 为什么通过 nginx 而不是直连 8099？



* **8099 只监听回环**：`topems-server` 的监听地址由 `BIND_ADDR` 决定，默认 `127.0.0.1`（生产 plist 不设该变量）；局域网直连 `:8099` 会被拒绝，唯一对外入口是 nginx 的 80/443

* CORS 白名单只允许 [localhost](https://localhost)—— 浏览器从其他机器直连 8099 会被跨域拦截

* nginx 同域反代（80 → 8099）自动绕过 CORS

* 同时托管前端静态文件，统一入口



***

## 8. 日志



```
# 后端实时日志
ssh xingzhai@192.168.110.115 "tail -f /Users/xingzhai/topems/logs/server.out"

# 后端错误日志
ssh xingzhai@192.168.110.115 "tail -f /Users/xingzhai/topems/logs/server.err"

# nginx 访问日志
ssh xingzhai@192.168.110.115 "tail -f /Users/xingzhai/topems/nginx/logs/access.log"
```



***

## 9. 数据库

生产库在生产机本地：



* PostgreSQL 5432

* 库名：topems\_prod

* 用户：topems\_prod

* 连接串：`postgres://topems_prod:***@localhost:5432/topems_prod`（存在 plist 环境变量里）

**不要从 air 直连生产库**—— 只监听 [localhost](https://localhost)。要操作生产库：



```
# 通过 SSH 隧道
ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/psql -U topems_prod -d topems_prod -c 'SELECT 1;'"
```



***

## 10. 回滚



```
# 一键回滚
cd /Users/air/TOPEMS
./scripts/deploy-prod.sh --rollback

# 手动回滚
ssh xingzhai@192.168.110.115 "
  cd /Users/xingzhai/topems/bin
  # 找最近的备份
  ls -lt topems-server-*.bak | head -5
  # 复制回来
  cp topems-server-<commit>-<时间戳>.bak topems-server
  # 重启
  launchctl kickstart -k gui/\$(id -u)/com.topems.server
"
```



***

## 11. 常见问题

### Q: 编译报错 `protoc not found`

A: 本地 brew install protobuf。生产机不需要 protoc（不编译）。

### Q: 部署后健康检查失败

A: 脚本会自动回滚。手动排查：



```
ssh xingzhai@192.168.110.115 "tail -50 /Users/xingzhai/topems/logs/server.err"
```

### Q: 登录报 401「用户名或密码错误」

A: 两个常见原因：



1. **ENCRYPTION\_MASTER\_KEY 未配置** → 每次重启生成随机密钥，密码哈希解不开。检查 plist 里有没有这个变量，没有就加上。

2. **密码哈希被 shell 转义吃掉** → `$2b$12$...` 在 shell 双引号里 `$2b` 等会被当成变量展开。更新密码必须用 SQL 文件方式（scp + psql -f），不能直接 shell -c。

### Q: scp 上传偶发 Broken pipe

A: 局域网网络抖动，重试即可。脚本没有自动重试 —— 手动重跑 `scp` 那一步。

### Q: `Address already in use`

A: 旧进程没杀干净。launchd 模式下不会出现 —— 如果手动 nohup 启动过，先 `pkill -9 -f topems-server`。

### Q: nginx 改了配置不生效

A: `ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/nginx -t && /opt/homebrew/bin/nginx -s reload"`

### Q: 为什么 `nginx -T` 取不到配置 / 报 command not found？

A: 非登录 SSH 的 `PATH` 只有 `/usr/bin:/bin:/usr/sbin:/sbin`，不含 `/opt/homebrew/bin`，裸 `nginx -T` 会 `command not found`；`sudo nginx -T` 又需要口令。统一用绝对路径：

```bash
ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/nginx -T"
```

实际加载的是 `/opt/homebrew/etc/nginx/nginx.conf`（include `servers/topems.conf`、`servers/topems-ssl.conf`）；80/443 直接 `proxy_pass http://127.0.0.1:8099`，无 upstream 块。

### Q: 生产机重启了服务会自启吗？

A: 会。launchd 的 RunAtLoad=true + KeepAlive=true，开机自动拉起。

### Q: 如何查看当前部署的版本？

A:



```
ssh xingzhai@192.168.110.115 "ls -lt /Users/xingzhai/topems/bin/topems-server"
# 看修改时间对应哪个 commit 的备份
```



***

## 12. 禁止事项



1. **不要在生产机上编译**—— 没有 protoc/brew，会失败。所有编译在 air 本地。

2. **不要手动 nohup 启动后端**—— 会和 launchd 冲突。用 `launchctl kickstart`。

3. **不要从 air 直连生产数据库**—— 只监听 [localhost](https://localhost)，通过 SSH 操作。

4. **不要跳过健康检查直接部署**—— 脚本会自动回滚，手动操作也要验证。

5. **不要删除 .bak 备份**—— 回滚全靠它们，积累多了再清理。



***

## 13. 部署检查清单



* [ ] git status 干净

* [ ] git pull origin main（生产机也要 pull 最新 migration）

* [ ] 本地编译通过

* [ ] 健康检查返回 status=ok

* [ ] nginx 80 端口可访问前端

* [ ] 浏览器登录验证核心功能