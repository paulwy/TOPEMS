# TOPEMS Windows 部署指南

> 支持 Windows 10/11、Windows Server 2019/2022

## 目录

- [环境要求](#环境要求)
- [部署方式](#部署方式)
- [方式一：Python CLI 部署](#方式一python-cli-部署推荐)
- [方式二：Docker Desktop 部署](#方式二docker-desktop-部署-windows-1011)
- [方式三：Windows Server Docker 部署](#方式三windows-server-20192022--docker-部署)
- [方式四：Windows Server 裸机部署](#方式四windows-server-裸机部署无-docker)
- [服务配置](#服务配置)
- [常见问题](#常见问题)

---

## 环境要求

### 硬件要求

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 4 核心 | 8+ 核心 |
| 内存 | 8 GB | 16+ GB |
| 硬盘 | 50 GB | 100+ GB SSD |
| 网络 | 100 Mbps | 1 Gbps |

### 软件要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Python | 3.10+ | Python CLI 部署必需 |
| PostgreSQL | 15+ | 数据库 |
| Redis | 6+ | 缓存（可选） |
| Docker | 20.10+ | Docker 部署必需 |

---

## 部署方式

```
┌─────────────────────────────────────────────────────────────┐
│                    TOPEMS 部署方式                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Python CLI    │   Docker Desktop │   Windows Server       │
│   (推荐开发)    │   (推荐生产)     │   裸机部署              │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Windows 10/11   │ Windows 10/11   │ Windows Server 2019/22 │
│ Windows Server  │ Windows Server  │                        │
└─────────────────┴─────────────────┴─────────────────────────┘
```

---

## 方式一：Python CLI 部署（推荐）

适用于本地开发、测试环境。

### 1. 安装 Python

#### Windows 10/11
```powershell
# 方法一：下载安装包
# https://www.python.org/downloads/windows/

# 方法二：使用 winget（推荐）
winget install Python.Python.3.11

# 验证安装
python --version
```

#### Windows Server
```powershell
# 启用 IIS 和相关功能
dism /online /enable-feature /featurename:ServerCore-FullServer /all /norestart

# 安装 Python
winget install Python.Python.3.11
```

### 2. 克隆项目

```powershell
# 创建目录
mkdir C:\TOPEMS
cd C:\TOPEMS

# 克隆项目（替换为实际仓库地址）
git clone https://github.com/your-org/topems.git .
```

### 3. 创建虚拟环境

```powershell
cd C:\TOPEMS\cli

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
.venv\Scripts\activate

# 验证激活
python --version
```

### 4. 安装依赖

```powershell
# 升级 pip
python -m pip install --upgrade pip

# 安装核心依赖
pip install pyyaml click rich httpx

# 安装开发依赖（可选）
pip install pytest pytest-cov ruff mypy
```

### 5. 配置环境变量

创建文件 `C:\TOPEMS\config\env.ps1`：

```powershell
# PostgreSQL 配置
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"
$env:POSTGRES_DB = "topems"
$env:POSTGRES_USER = "topems"
$env:POSTGRES_PASSWORD = "your_secure_password"

# Redis 配置（可选）
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"

# 服务端口配置
$env:IAM_PORT = "8000"
$env:PM_PORT = "8001"
$env:NOTIFICATION_PORT = "8002"
$env:PORTAL_PORT = "8003"
$env:FLOW_PORT = "8004"
$env:INTEGRATION_PORT = "8005"

# TOPEMS 配置
$env:TOPEMS_CONFIG = "C:\TOPEMS\config\services.yaml"
$env:RUST_LOG = "info"
```

使用时加载环境：
```powershell
# PowerShell
. C:\TOPEMS\config\env.ps1

# CMD
call C:\TOPEMS\config\env.bat
```

### 6. 使用 CLI

```powershell
# 激活虚拟环境
cd C:\TOPEMS\cli
.venv\Scripts\activate

# 设置 Python 路径
$env:PYTHONPATH = "C:\TOPEMS\cli\src"

# 查看帮助
python -m topems_cli --help

# 查看服务状态
python -m topems_cli status --all

# 启动核心模块
python -m topems_cli start -m core

# 查看特定服务
python -m topems_cli status iam
```

### 7. 创建快捷启动脚本

创建 `C:\TOPEMS\topems.ps1`：

```powershell
# TOPEMS CLI 快捷启动脚本
param(
    [Parameter(Position=0)]
    [string]$Command = "status",

    [Parameter(Position=1)]
    [string]$Arg = "",

    [switch]$All
)

$ErrorActionPreference = "Stop"

# 切换到项目目录
Set-Location "C:\TOPEMS\cli"

# 激活虚拟环境
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "错误: 虚拟环境不存在，请先运行: python -m venv .venv" -ForegroundColor Red
    exit 1
}
& ".venv\Scripts\Activate.ps1"

# 设置 Python 路径
$env:PYTHONPATH = "C:\TOPEMS\cli\src"

# 加载环境变量
if (Test-Path "..\config\env.ps1") {
    . "..\config\env.ps1"
}

# 构建命令
$cmd = "python -m topems_cli $Command"
if ($Arg) { $cmd += " $Arg" }
if ($All) { $cmd += " --all" }

# 执行命令
Invoke-Expression $cmd
```

使用：
```powershell
# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 查看状态
.\topems.ps1 status

# 查看所有服务
.\topems.ps1 status -All

# 启动核心模块
.\topems.ps1 start -m core

# 启动单个服务
.\topems.ps1 start iam
```

---

## 方式二：Docker Desktop 部署 (Windows 10/11)

适用于生产环境、团队协作。

### 1. 安装 WSL 2

```powershell
# 启用 WSL
wsl --install

# 重启电脑后设置 WSL 2 为默认
wsl --set-default-version 2

# 验证安装
wsl --list --verbose
```

### 2. 安装 Docker Desktop

```powershell
# 下载 Docker Desktop
# https://www.docker.com/products/docker-desktop/

# 安装（双击安装包）
# 勾选 "Use WSL 2 instead of Hyper-V"

# 启动 Docker Desktop
```

### 3. 配置 Docker

创建 `C:\TOPEMS\docker-compose.override.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: topems
      POSTGRES_USER: topems
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-topems_password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 4. 启动服务

```powershell
cd C:\TOPEMS

# 启动所有服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 5. 使用 CLI 管理

```powershell
cd C:\TOPEMS\cli
.venv\Scripts\activate

# Docker 命令会自动显示
python -m topems_cli docker status
python -m topems_cli docker logs iam
```

---

## 方式三：Windows Server 2019/2022 + Docker 部署

### 1. 安装 Docker EE

#### Windows Server 2019

```powershell
# 以管理员身份运行 PowerShell

# 安装 Docker MsftProvider
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force

# 安装 Docker
Install-Package -Name docker -ProviderName DockerMsftProvider -Force

# 重启计算机
Restart-Computer -Force
```

#### Windows Server 2022

```powershell
# 安装 Docker
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
Install-Package -Name docker -ProviderName DockerMsftProvider -Force
Restart-Computer -Force
```

### 2. 配置 Docker 服务

```powershell
# 启动 Docker 服务
Start-Service Docker

# 设置自动启动
Set-Service -Name Docker -StartupType Automatic

# 验证安装
docker --version
docker-compose --version
```

### 3. 配置 Docker 守护进程

创建 `C:\ProgramData\Docker\config\daemon.json`：

```json
{
  "registry-mirrors": [],
  "insecure-registries": [],
  "debug": false,
  "experimental": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "windowsfilter",
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

重启 Docker：
```powershell
Restart-Service Docker
```

### 4. 部署 TOPEMS

```powershell
cd C:\TOPEMS

# 创建网络
docker network create topems-network

# 启动数据库
docker run -d `
  --name topems-postgres `
  --network topems-network `
  -e POSTGRES_DB=topems `
  -e POSTGRES_USER=topems `
  -e POSTGRES_PASSWORD=your_password `
  -p 5432:5432 `
  -v postgres_data:C:\data `
  postgres:15-alpine

# 启动 Redis（可选）
docker run -d `
  --name topems-redis `
  --network topems-network `
  -p 6379:6379 `
  redis:7-alpine

# 构建并启动服务
docker-compose -f docker-compose.yml up -d --build
```

### 5. 配置防火墙

```powershell
# 开放必要端口
New-NetFirewallRule -DisplayName "TOPEMS IAM" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
New-NetFirewallRule -DisplayName "TOPEMS PM" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
New-NetFirewallRule -DisplayName "TOPEMS Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# 查看防火墙规则
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "TOPEMS*"}
```

---

## 方式四：Windows Server 裸机部署（无 Docker）

适用于特殊环境、离线部署、性能要求高的场景。

### 1. 安装 Rust

```powershell
# 下载 rustup-init.exe
# https://rustup.rs/

# 运行安装程序（选择默认配置）
rustup default stable
rustc --version
cargo --version
```

### 2. 安装 PostgreSQL

#### 下载安装
```powershell
# 下载 PostgreSQL 15
# https://www.postgresql.org/download/windows/

# 或使用 winget
winget install PostgreSQL.PostgreSQL.15
```

#### 配置
```powershell
# 创建数据库
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres

# 在 psql 中执行
CREATE USER topems WITH PASSWORD 'your_password';
CREATE DATABASE topems OWNER topems;
\q
```

### 3. 安装 Redis

```powershell
# 方法一：下载 Memurai（Windows 原生 Redis 替代）
# https://www.memurai.com/

# 方法二：使用 Docker（如果可用）
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 4. 编译后端服务

创建编译脚本 `C:\TOPEMS\scripts\build.ps1`：

```powershell
# TOPEMS 编译脚本
param(
    [switch]$Release,
    [switch]$All
)

$ErrorActionPreference = "Stop"
Set-Location "C:\TOPEMS"

# 目标架构
$target = if ($Release) { "release" } else { "debug" }

# 编译单个服务
function Build-Service {
    param([string]$Service)

    $servicePath = "C:\TOPEMS\svc\$Service"
    if (-not (Test-Path $servicePath)) {
        Write-Host "服务不存在: $Service" -ForegroundColor Red
        return $false
    }

    Write-Host "编译服务: $Service" -ForegroundColor Cyan
    Set-Location $servicePath

    if ($Release) {
        cargo build --release 2>&1 | Out-Null
    } else {
        cargo build 2>&1 | Out-Null
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "编译失败: $Service" -ForegroundColor Red
        return $false
    }

    Write-Host "✓ 编译成功: $Service" -ForegroundColor Green
    Set-Location "C:\TOPEMS"
    return $true
}

# 编译所有服务
if ($All) {
    $services = @("iam", "pm", "notification", "portal", "flow",
                  "integration", "erp", "hrm", "crm", "rs",
                  "lims", "pdm", "doc", "mes", "qms", "ehs",
                  "scm", "srm", "wms", "file", "mail", "im",
                  "gis", "bi", "report", "ai", "mobile")

    $failed = @()
    foreach ($svc in $services) {
        if (-not (Build-Service $svc)) {
            $failed += $svc
        }
    }

    if ($failed.Count -gt 0) {
        Write-Host "`n编译失败的服务:" -ForegroundColor Red
        $failed | ForEach-Object { Write-Host "  - $_" }
        exit 1
    }
}

Write-Host "`n所有服务编译完成!" -ForegroundColor Green
```

执行编译：
```powershell
# 编译所有服务
.\scripts\build.ps1 -All -Release

# 编译单个服务
.\scripts\build.ps1 -Service iam -Release
```

### 5. 使用 NSSM 创建 Windows 服务

下载 NSSM：https://nssm.cc/download

```powershell
# 解压 nssm.exe 到 C:\Tools\nssm

# 创建服务函数
function Create-WindowsService {
    param(
        [string]$ServiceName,
        [string]$DisplayName,
        [string]$Executable,
        [string]$Arguments,
        [int]$Port
    )

    $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "服务已存在，正在停止..." -ForegroundColor Yellow
        Stop-Service $ServiceName
        sc.exe delete $ServiceName
        Start-Sleep -Seconds 2
    }

    & C:\Tools\nssm\nssm.exe install $ServiceName $Executable $Arguments
    & C:\Tools\nssm\nssm.exe set $ServiceName AppDirectory (Split-Path $Executable)
    & C:\Tools\nssm\nssm.exe set $ServiceName DisplayName $DisplayName
    & C:\Tools\nssm\nssm.exe set $ServiceName Description "TOPEMS $DisplayName Service"
    & C:\Tools\nssm\nssm.exe set $ServiceName Start SERVICE_AUTO_START

    # 环境变量
    & C:\Tools\nssm\nssm.exe set $ServiceName AppEnvironmentExtra "RUST_LOG=info"
    & C:\Tools\nssm\nssm.exe set $ServiceName AppEnvironmentExtra "POSTGRES_HOST=localhost"
    & C:\Tools\nssm\nssm.exe set $ServiceName AppEnvironmentExtra "POSTGRES_PORT=5432"

    # 启动服务
    Start-Service $ServiceName
    Write-Host "✓ 服务已创建并启动: $DisplayName" -ForegroundColor Green
}

# 示例：创建 IAM 服务
Create-WindowsService `
    -ServiceName "TOPEMS-IAM" `
    -DisplayName "TOPEMS IAM" `
    -Executable "C:\TOPEMS\svc\iam\target\release\topems-iam.exe" `
    -Arguments "serve --port 8000" `
    -Port 8000
```

### 6. 服务管理

```powershell
# 查看服务状态
Get-Service -Name "TOPEMS-*"

# 启动服务
Start-Service "TOPEMS-IAM"

# 停止服务
Stop-Service "TOPEMS-IAM"

# 查看日志
& C:\Tools\nssm\nssm.exe get TOPEMS-IAM Application
& C:\Tools\nssm\nssm.exe edit TOPEMS-IAM
```

---

## 服务配置

### 端口分配（与 port-planning.md 一致）

| 端口 | 服务 | 说明 |
|------|------|------|
| 8000 | IAM | 身份认证 |
| 8001 | PM | 项目管理 |
| 8002 | Notification | 通知服务 |
| 8003 | Portal | 统一门户 |
| 8004 | Flow | 工作流引擎 |
| 8005 | Integration | 集成服务 |
| 8010 | ERP | 企业资源计划 |
| 8011 | HRM | 人力资源管理 |
| 8012 | CRM | 客户关系管理 |
| 8020 | RS | 研发管理 |
| 8022 | LIMS | 实验室管理 |
| 8023 | PDM | 产品数据管理 |
| 8024 | DOC | 文档管理 |
| 8030 | MES | 制造执行 |
| 8031 | QMS | 质量管理 |
| 8032 | EHS | 环境健康安全 |
| 8040 | SCM | 供应链管理 |
| 8041 | SRM | 供应商管理 |
| 8042 | WMS | 仓储管理 |
| 8050 | File | 文件存储 |
| 8051 | Mail | 邮件服务 |
| 8052 | IM | 即时通讯 |
| 8053 | GIS | 地理信息 |
| 8060 | BI | 商业智能 |
| 8061 | Report | 报表服务 |
| 8062 | AI | 人工智能 |
| 8070 | Mobile | 移动服务 |
| 3000 | Frontend | 前端应用 |

### 数据库初始化

创建 `C:\TOPEMS\scripts\init-db.sql`：

```sql
-- TOPEMS 数据库初始化脚本

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建表空间
CREATE TABLESPACE topems_data LOCATION 'C:/data/tablespace';
CREATE TABLESPACE topems_index LOCATION 'C:/data/idxspace';

-- 创建用户（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'topems') THEN
        CREATE ROLE topems WITH LOGIN PASSWORD 'your_secure_password';
    END IF;
END
$$;

-- 创建数据库
CREATE DATABASE topems OWNER topems;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE topems TO topems;
```

执行初始化：
```powershell
psql -U postgres -f C:\TOPEMS\scripts\init-db.sql
```

---

## 常见问题

### Q1: Python 命令找不到

**原因**: Python 未添加到 PATH
**解决**:
```powershell
# 重新安装 Python，勾选 "Add Python to PATH"
# 或手动添加
$env:PATH += ";C:\Python311;C:\Python311\Scripts"
```

### Q2: Docker 启动失败

**原因**: WSL 2 未正确安装
**解决**:
```powershell
# 重新安装 WSL
wsl --uninstall
wsl --install

# 重启电脑
Restart-Computer
```

### Q3: 端口被占用

**检查**:
```powershell
netstat -ano | findstr ":8000"
```

**解决**: 停止占用端口的程序或修改配置

### Q4: 编译 Rust 失败

**原因**: 缺少 Visual C++ 构建工具
**解决**:
```powershell
# 安装 Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/

# 或使用 rustup 安装
rustup toolchain install stable-msvc
rustup default stable-msvc
```

### Q5: 服务无法连接数据库

**检查**:
```powershell
# 测试 PostgreSQL 连接
psql -h localhost -U topems -d topems

# 检查防火墙
Get-NetFirewallRule | Where-Object {$_.LocalPort -eq 5432}
```

**解决**: 确保 PostgreSQL 服务运行且防火墙开放端口

---

## 快速命令参考

```powershell
# 查看服务状态
python -m topems_cli status --all

# 启动服务
python -m topems_cli start -m core

# 停止服务
python -m topems_cli stop --all

# 查看日志
python -m topems_cli logs iam

# Docker 方式
docker-compose ps
docker-compose logs -f iam
docker-compose restart iam

# Windows 服务方式
Get-Service -Name "TOPEMS-*"
Start-Service "TOPEMS-IAM"
Stop-Service "TOPEMS-IAM"
```

---

## 技术支持

- 文档: https://docs.topems.com
- 问题反馈: https://github.com/your-org/topems/issues
- 社区: https://community.topems.com
