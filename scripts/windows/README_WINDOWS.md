# TOPEMS Windows 部署指南

## 目录结构

```
scripts/windows/
├── topems-standalone.ps1   # 主部署脚本 (PowerShell)
├── topems.bat             # Windows 启动器
├── ports.ps1              # 端口配置
├── check-env.ps1          # 环境检查脚本
└── README_WINDOWS.md      # 本文档
```

## 操作系统兼容性

| 操作系统 | 支持状态 | 备注 |
|----------|---------|------|
| Windows 10 | ✅ 完全支持 | 内置 curl |
| Windows 11 | ✅ 完全支持 | 内置 curl |
| Windows Server 2019 | ✅ 支持 | **需手动安装 curl** |
| Windows Server 2022 | ✅ 完全支持 | 内置 curl |

## 前置要求

### 必需组件

1. **PostgreSQL 客户端 (psql)**
   - 下载地址: https://www.postgresql.org/download/windows/
   - 或使用独立包: https://www.enterprisedb.com/download-postgresql-binaries

2. **Redis 客户端 (redis-cli)**
   - 下载地址: https://github.com/microsoftarchive/redis/releases
   - 或使用 MSOpenTech 版本

3. **Rust (cargo)**
   - 安装地址: https://rustup.rs/
   - 选择默认安装选项

4. **Node.js (npm)**
   - 下载地址: https://nodejs.org/
   - 推荐 LTS 版本

5. **curl**
   - Windows 10+ 自带
   - 旧版本可从 https://curl.se/windows/ 下载

### 可选组件

1. **Ollama (AI 服务)**
   - 下载地址: https://ollama.ai/
   - 用于本地 AI 功能

## 使用方法

### 方式一：使用启动器 (推荐)

```batch
cd scripts\windows
topems.bat start
```

### 方式二：直接运行 PowerShell

```powershell
# 进入脚本目录
cd scripts\windows

# 允许执行脚本
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 运行脚本
.\topems-standalone.ps1 start
```

## 命令说明

| 命令 | 说明 |
|------|------|
| `start` | 启动所有服务（数据库+后端+前端） |
| `start-core` | 仅启动核心服务 |
| `start-backend` | 启动所有后端服务 |
| `start-frontend` | 仅启动前端服务 |
| `stop` | 停止所有服务 |
| `status` | 查看服务状态 |
| `restart` | 重启所有服务 |

## 端口配置

编辑 `ports.ps1` 文件修改端口号。默认配置：

| 服务 | 端口 |
|------|------|
| IAM (unified-core) | 8000 |
| PM | 8023 |
| ERP | 8010 |
| Finance | 8011 |
| AI | 8013 |
| HRM | 8020 |
| CRM | 8029 |
| MES | 8030 |
| PDM | 8031 |
| SCM | 8040 |
| WMS | 8041 |
| SRM | 8042 |
| QMS | 8050 |
| LIMS | 8051 |
| EHS | 8052 |
| RD | 8053 |
| BI | 8060 |
| Portal | 8063 |
| Mobile | 8070 |
| GIS | 8071 |
| Integration | 8072 |
| ... | ... |

## 常见问题

### Q: 脚本无法执行，提示安全错误

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q: psql 命令找不到

确保 PostgreSQL 的 bin 目录在 PATH 中，或使用完整路径

### Q: redis-cli 连接失败

确保 Redis 服务已启动，默认端口 6379

### Q: cargo 命令找不到

重新安装 Rust，确保选择添加 PATH

### Q: Windows Server 2019 上脚本执行失败

Windows Server 2019 默认不带 curl，需要先安装：

```powershell
# 使用 winget 安装
winget install curl

# 或手动下载 curl.exe 并添加到 PATH
# https://curl.se/windows/
```

安装后重新打开 PowerShell 窗口即可。

## 环境变量

可以在 `ports.ps1` 中修改以下环境变量：

- `DATABASE_URL` - PostgreSQL 连接字符串
- `REDIS_URL` - Redis 连接字符串
- `JWT_SECRET` - JWT 密钥
- `OLLAMA_URL` - Ollama 服务地址

## 日志位置

日志文件位于 `$ProjectRoot\logs\` 目录：

- `iam.log`
- `notification.log`
- `web.log`
- 等等

## 注意事项

1. **以管理员身份运行** - 部分操作可能需要管理员权限
2. **防火墙** - 确保端口未被防火墙阻止
3. **资源** - 全部服务启动需要较大内存，建议 16GB+
