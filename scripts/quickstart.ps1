<#
.SYNOPSIS
TOPEMS 快速启动脚本 (Windows PowerShell)

.DESCRIPTION
提供 TOPEMS 项目的快速启动、停止、状态查看等功能

.NOTES
Author: TOPEMS Team
Version: 1.0
#>

$TOPEMS_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$env:TOPEMS_DIR = $TOPEMS_DIR

function Write-Info {
    Write-Host "[INFO] $args" -ForegroundColor Cyan
}

function Write-Success {
    Write-Host "[SUCCESS] $args" -ForegroundColor Green
}

function Write-Error {
    Write-Host "[ERROR] $args" -ForegroundColor Red
}

function Write-Warning {
    Write-Host "[WARNING] $args" -ForegroundColor Yellow
}

function Show-Help {
    @"
TOPEMS 快速启动脚本 (Windows)

用法: .\quickstart.ps1 [命令]

命令:
  start          - 启动所有服务（Docker模式）
  start-local    - 启动本地开发服务
  stop           - 停止所有服务
  restart        - 重启所有服务
  status         - 查看服务状态
  init           - 初始化环境配置
  clean          - 清理缓存和构建文件
  help           - 显示此帮助信息

示例:
  .\quickstart.ps1 start        # 使用 Docker 启动所有服务
  .\quickstart.ps1 start-local  # 启动本地开发环境
  .\quickstart.ps1 stop         # 停止所有服务
"@
}

function Init-Env {
    Write-Info "初始化环境配置..."
    
    $envFile = Join-Path $TOPEMS_DIR ".env"
    
    if (-not (Test-Path $envFile)) {
        Write-Info "创建环境配置文件..."
        @"
# TOPEMS 环境配置
ENV=development
SERVER_PORT=8000
JWT_SECRET=topems-jwt-secret-key-change-in-production-2026
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
REDIS_URL=redis://localhost:6379
RUST_LOG=info

# 服务端口配置
IAM_SERVICE_PORT=8001
DOC_SERVICE_PORT=8002
FLOW_SERVICE_PORT=8003
AI_SERVICE_PORT=8004
LIMS_SERVICE_PORT=8005
QMS_SERVICE_PORT=8006
RS_SERVICE_PORT=8007
ERP_SERVICE_PORT=8008
CRM_SERVICE_PORT=8009
SRM_SERVICE_PORT=8010
WMS_SERVICE_PORT=8011
MES_SERVICE_PORT=8012
GIS_SERVICE_PORT=8013
IM_SERVICE_PORT=8014
EHS_SERVICE_PORT=8015
BI_SERVICE_PORT=8016
MOBILE_SERVICE_PORT=8017
HRM_SERVICE_PORT=8018
PDM_SERVICE_PORT=8019
INTEGRATION_SERVICE_PORT=8020
PORTAL_SERVICE_PORT=8021
NOTIFICATION_SERVICE_PORT=8022
REPORT_SERVICE_PORT=8023

# 前端配置
VITE_API_URL=http://localhost:8000
VITE_IAM_URL=http://localhost:8001
"@ | Out-File $envFile -Encoding utf8
        Write-Success "环境配置文件创建成功"
    } else {
        Write-Info "环境配置文件已存在"
    }

    $dataDir = Join-Path $TOPEMS_DIR "data/postgres"
    $redisDir = Join-Path $TOPEMS_DIR "data/redis"
    $logsDir = Join-Path $TOPEMS_DIR "logs"
    
    if (-not (Test-Path $dataDir)) {
        Write-Info "创建数据目录..."
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
        New-Item -ItemType Directory -Path $redisDir -Force | Out-Null
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
        Write-Success "数据目录创建成功"
    }

    Write-Success "环境初始化完成"
}

function Start-Docker {
    Write-Info "启动 TOPEMS 服务（Docker模式）..."
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker 未安装，请先安装 Docker"
        exit 1
    }

    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "docker-compose 未安装，请先安装"
        exit 1
    }

    if (-not (Test-Path (Join-Path $TOPEMS_DIR ".env"))) {
        Write-Info "环境配置文件不存在，正在初始化..."
        Init-Env
    }

    Write-Info "启动 Docker 服务..."
    Set-Location $TOPEMS_DIR
    
    $dockerComposePath = Join-Path $TOPEMS_DIR "docker/docker-compose.yml"
    if (Test-Path $dockerComposePath) {
        docker-compose -f $dockerComposePath up -d
    } elseif (Test-Path "docker-compose.yml") {
        docker-compose up -d
    } else {
        Write-Error "未找到 docker-compose.yml 文件"
        exit 1
    }

    Write-Success "Docker 服务启动成功"
    Write-Info "等待服务初始化..."
    Start-Sleep -Seconds 10
    
    Show-Status
}

function Start-Local {
    Write-Info "启动本地开发环境..."
    
    if (-not (Test-Path (Join-Path $TOPEMS_DIR ".env"))) {
        Write-Info "环境配置文件不存在，正在初始化..."
        Init-Env
    }

    Write-Info "启动 PostgreSQL..."
    if (Get-Command pg_ctl -ErrorAction SilentlyContinue) {
        pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
    } else {
        Write-Warning "PostgreSQL 未安装或未配置"
    }

    Write-Info "启动 Redis..."
    if (Get-Command redis-server -ErrorAction SilentlyContinue) {
        Start-Process redis-server -ArgumentList "--daemonize yes"
    } else {
        Write-Warning "Redis 未安装"
    }

    Write-Info "启动 IAM 服务..."
    $iamDir = Join-Path $TOPEMS_DIR "services/topems-iam/backend"
    Set-Location $iamDir
    Start-Process cargo -ArgumentList "run" -NoNewWindow
    Write-Success "本地服务启动成功"
    Write-Info "IAM 服务: http://localhost:8001"
}

function Stop-Services {
    Write-Info "停止所有服务..."
    
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        Set-Location $TOPEMS_DIR
        $dockerComposePath = Join-Path $TOPEMS_DIR "docker/docker-compose.yml"
        if (Test-Path $dockerComposePath) {
            docker-compose -f $dockerComposePath down
        } elseif (Test-Path "docker-compose.yml") {
            docker-compose down
        }
    }

    Write-Success "所有服务已停止"
}

function Show-Status {
    Write-Info "服务状态:"
    
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Output ""
        Write-Info "Docker 容器状态:"
        $dockerComposePath = Join-Path $TOPEMS_DIR "docker/docker-compose.yml"
        if (Test-Path $dockerComposePath) {
            docker-compose -f $dockerComposePath ps
        } elseif (Test-Path "docker-compose.yml") {
            docker-compose ps
        }
    }
}

function Show-Logs {
    Write-Info "查看服务日志..."
    
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Set-Location $TOPEMS_DIR
        $dockerComposePath = Join-Path $TOPEMS_DIR "docker/docker-compose.yml"
        if (Test-Path $dockerComposePath) {
            docker-compose -f $dockerComposePath logs -f
        } elseif (Test-Path "docker-compose.yml") {
            docker-compose logs -f
        }
    } else {
        Write-Error "Docker 未安装"
    }
}

function Clean-Cache {
    Write-Info "清理缓存和构建文件..."
    
    Get-ChildItem -Path $TOPEMS_DIR -Recurse -Directory -Filter "target" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path $TOPEMS_DIR -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path $TOPEMS_DIR -Recurse -File -Filter "Cargo.lock" | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path $TOPEMS_DIR -Recurse -File -Filter "package-lock.json" | Remove-Item -Force -ErrorAction SilentlyContinue
    
    Write-Success "清理完成"
}

if ($args.Count -eq 0) {
    Show-Help
    exit 0
}

switch ($args[0]) {
    "start" {
        Start-Docker
    }
    "start-local" {
        Start-Local
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Stop-Services
        Start-Sleep -Seconds 2
        Start-Docker
    }
    "status" {
        Show-Status
    }
    "init" {
        Init-Env
    }
    "clean" {
        Clean-Cache
    }
    "logs" {
        Show-Logs
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
        exit 1
    }
}