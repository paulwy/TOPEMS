# TOPEMS 生产机部署手册

> 从 air 的 MacBook 一键部署到 xingzhai 生产机（192.168.110.115）。

---

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

---

## 2. 生产机信息

| 项 | 值 |
|---|---|
| IP | 192.168.110.115 |
| SSH 用户 | xingzhai |
| 主机名 | Mac.lan |
| 操作系统 | macOS |
| 应用根目录 | /Users/xingzhai/topems/ |
| 二进制路径 | /Users/xingzhai/topems/bin/topems-server |
| 日志目录 | /Users/xingzhai/topems/logs/ |
| 仓库路径 | /Users/xingzhai/TOPEMS/（仅 git pull，不编译） |
| 前端 dist | /Users/xingzhai/TOPEMS/dist/topems-*/web/ |
| nginx 配置 | /opt/homebrew/etc/nginx/servers/topems.conf |
| 后端端口 | 8099 |
| nginx 端口 | 80 |
| 数据库 | PostgreSQL 5432，库名 topems_prod，用户 topems_prod |

---

## 3. 前置条件（air 本地）

### 3.1 SSH 免密登录
```bash
# 首次执行（已配置过可跳过）
ssh-keygen -t ed25519  # 如果已有密钥可跳过
ssh-copy-id xingzhai@192.168.110.115
# 验证
ssh xingzhai@192.168.115 "hostname"  # 应输出 Mac.lan
```

### 3.2 编译环境
- Rust（cargo）已安装
- protoc 已安装（`brew install protobuf`，本地 /opt/homebrew/bin/protoc）
- .sqlx 缓存完整（`cargo build` 不报错）

### 3.3 仓库状态
- 在 /Users/air/TOPEMS 目录
- main 分支
- 工作区干净（无未提交变更）
- HEAD == origin/main

---

## 4. 一键部署（推荐）

```bash
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
```

### 脚本做了什么

| 步骤 | 动作 | 耗时 |
|---|---|---|
| 0. 前置检查 | SSH 连通、git 干净、HEAD 同步 | 2s |
| 1. 本地编译 | `cargo build --release -p topems-server` | ~11min（首次）/ ~30s（增量） |
| 2. 生产机备份 | 旧二进制改名 `.bak-<commit>-<时间戳>` | 1s |
| 3. scp 上传 | 184MB 二进制传到生产机 | ~30s（局域网） |
| 4. 替换重启 | mv + `launchctl kickstart -k` | 2s |
| 5. 健康检查 | 轮询 /api/server/health，最多 60s | ~10s |
| (可选) 前端 | pnpm build + rsync dist + nginx reload | ~2min |

**失败自动回滚**：健康检查超时会自动恢复上一个备份并重启。

---

## 5. 手动部署（不推荐，了解即可）

```bash
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

---

## 6. launchd 服务管理

生产机有 4 个 launchd 托管服务（`~/Library/LaunchAgents/`）：

| Label | 作用 | 端口 |
|---|---|---|
| com.topems.server | Rust 后端（主服务） | 8099 |
| com.topems.nginx | 反向代理 + 静态文件 | 80 |
| com.topems.nginx-logrotate | nginx 日志轮转 | - |
| com.topems.backup | 数据库定时备份 | - |

### 常用命令
```bash
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

---

## 7. 访问方式

### 局域网内
- **前端页面**：http://192.168.110.115/
- **后端 API**：http://192.168.110.115:8099/api/...
- **健康检查**：http://192.168.110.115:8099/api/server/health

### 为什么通过 nginx 而不是直连 8099？
- CORS 白名单只允许 localhost——浏览器从其他机器直连 8099 会被跨域拦截
- nginx 同域反代（80 → 8099）自动绕过 CORS
- 同时托管前端静态文件，统一入口

---

## 8. 日志

```bash
# 后端实时日志
ssh xingzhai@192.168.110.115 "tail -f /Users/xingzhai/topems/logs/server.out"

# 后端错误日志
ssh xingzhai@192.168.110.115 "tail -f /Users/xingzhai/topems/logs/server.err"

# nginx 访问日志
ssh xingzhai@192.168.110.115 "tail -f /opt/homebrew/var/log/nginx/access.log"
```

---

## 9. 数据库

生产库在生产机本地：
- PostgreSQL 5432
- 库名：topems_prod
- 用户：topems_prod
- 连接串：`postgres://topems_prod:***@localhost:5432/topems_prod`（存在 plist 环境变量里）

**不要从 air 直连生产库**——只监听 localhost。要操作生产库：
```bash
# 通过 SSH 隧道
ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/psql -U topems_prod -d topems_prod -c 'SELECT 1;'"
```

---

## 10. 回滚

```bash
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

---

## 11. 常见问题

### Q: 编译报错 `protoc not found`
A: 本地 brew install protobuf。生产机不需要 protoc（不编译）。

### Q: 部署后健康检查失败
A: 脚本会自动回滚。手动排查：
```bash
ssh xingzhai@192.168.110.115 "tail -50 /Users/xingzhai/topems/logs/server.err"
```

### Q: `Address already in use`
A: 旧进程没杀干净。launchd 模式下不会出现——如果手动 nohup 启动过，先 `pkill -9 -f topems-server`。

### Q: nginx 改了配置不生效
A: `ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/nginx -t && /opt/homebrew/bin/nginx -s reload"`

### Q: 生产机重启了服务会自启吗？
A: 会。launchd 的 RunAtLoad=true + KeepAlive=true，开机自动拉起。

### Q: 如何查看当前部署的版本？
A:
```bash
ssh xingzhai@192.168.110.115 "ls -lt /Users/xingzhai/topems/bin/topems-server"
# 看修改时间对应哪个 commit 的备份
```

---

## 12. 禁止事项

1. **不要在生产机上编译**——没有 protoc/brew，会失败。所有编译在 air 本地。
2. **不要手动 nohup 启动后端**——会和 launchd 冲突。用 `launchctl kickstart`。
3. **不要从 air 直连生产数据库**——只监听 localhost，通过 SSH 操作。
4. **不要跳过健康检查直接部署**——脚本会自动回滚，手动操作也要验证。
5. **不要删除 .bak 备份**——回滚全靠它们，积累多了再清理。

---

## 13. 部署检查清单

- [ ] git status 干净
- [ ] git pull origin main（生产机也要 pull 最新 migration）
- [ ] 本地编译通过
- [ ] 健康检查返回 status=ok
- [ ] nginx 80 端口可访问前端
- [ ] 浏览器登录验证核心功能
