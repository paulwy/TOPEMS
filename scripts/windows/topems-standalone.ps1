# TOPEMS Windows 部署脚本
# PowerShell 版本
#
# 功能:
# - 直接启动所有后端服务 (Windows 兼容)
# - 支持环境变量配置
# - 服务依赖管理
# - 健康检查和状态报告
#
# 使用方法:
#   .\topems-standalone.ps1 start          - 启动所有服务
#   .\topems-standalone.ps1 start-core     - 仅启动核心服务
#   .\topems-standalone.ps1 start-backend  - 启动所有后端服务
#   .\topems-standalone.ps1 start-frontend - 仅启动前端服务
#   .\topems-standalone.ps1 stop           - 停止所有服务
#   .\topems-standalone.ps1 status         - 查看服务状态
#   .\topems-standalone.ps1 restart        - 重启所有服务
#
# Windows 前置要求:
# - PostgreSQL 客户端 (psql) - https://www.postgresql.org/download/windows/
# - Redis 客户端 (redis-cli) - https://github.com/microsoftarchive/redis/releases
# - Rust (cargo) - https://rustup.rs/
# - Node.js (npm) - https://nodejs.org/
# - Ollama (可选) - https://ollama.ai/

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "start-core", "start-backend", "start-frontend", "start-service", "stop", "status", "restart")]
    [string]$Command = "start"
)

# 获取脚本目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# 导入配置
. "$ScriptDir\ports.ps1"

# ================================================
# 颜色输出函数 (使用 Write-Host)
# ================================================
function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# ================================================
# 检查端口是否被占用
# ================================================
function Test-PortInUse {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connections
}

# ================================================
# 检查必需的命令行工具
# ================================================
function Test-RequiredTools {
    Write-Info "检查必需工具..."

    $requiredTools = @("psql", "redis-cli", "curl", "cargo")
    $missingTools = @()

    foreach ($tool in $requiredTools) {
        $toolPath = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $toolPath) {
            $missingTools += $tool
        }
    }

    if ($missingTools.Count -gt 0) {
        Write-Error "缺少必需工具: $($missingTools -join ', ')"
        Write-Info "请安装以下工具后重试:"
        foreach ($tool in $missingTools) {
            switch ($tool) {
                "psql" { Write-Info "  psql - PostgreSQL 客户端" }
                "redis-cli" { Write-Info "  redis-cli - Redis 客户端" }
                "curl" { Write-Info "  curl - HTTP 客户端 (Windows 10+ 内置)" }
                "cargo" { Write-Info "  cargo - Rust 构建工具 (安装 Rust: rustup.rs)" }
            }
        }
        exit 1
    }

    Write-Success "必需工具检查通过"
}

# ================================================
# 检查Ollama服务
# ================================================
function Test-OllamaService {
    $ollamaPort = $env:OLLAMA_PORT, 11434 | Select-Object -First 1

    try {
        $response = Invoke-RestMethod "http://localhost:$ollamaPort/api/tags" -TimeoutSec 3 -ErrorAction Stop
        Write-Success "Ollama 服务运行正常"

        # 检查模型
        $llmModel = $env:OLLAMA_MODEL, "qwen2.5:7b-instruct" | Select-Object -First 1
        $embeddingModel = $env:EMBEDDING_MODEL, "nomic-embed-text" | Select-Object -First 1

        # 获取已安装模型列表
        $installedModels = $response.models | ForEach-Object { $_.name }

        if ($installedModels -contains $llmModel) {
            Write-Success "LLM 模型已安装: $llmModel"
        } else {
            Write-Warning "LLM 模型未安装: $llmModel (AI服务将无法使用)"
            Write-Info "提示: 运行 'ollama pull $llmModel' 安装"
        }

        if ($installedModels -contains $embeddingModel) {
            Write-Success "嵌入模型已安装: $embeddingModel"
        } else {
            Write-Warning "嵌入模型未安装: $embeddingModel (AI服务将无法使用)"
            Write-Info "提示: 运行 'ollama pull $embeddingModel' 安装"
        }
    } catch {
        Write-Warning "Ollama 服务未运行 (AI服务将无法使用)"
        Write-Info "提示: 运行 'ollama serve' 启动 Ollama 服务"
    }
}

# ================================================
# 检查数据库连接
# ================================================
function Test-DatabaseConnection {
    Write-Info "检查数据库连接..."

    # 检查 PostgreSQL
    try {
        $result = & psql "$env:DATABASE_URL" -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL 连接正常"
        } else {
            throw "PostgreSQL 连接失败"
        }
    } catch {
        Write-Error "PostgreSQL 连接失败"
        Write-Info "请确保PostgreSQL服务已启动，并且数据库配置正确"
        Write-Info "当前配置: $env:DATABASE_URL"
        exit 1
    }

    # 检查 Redis
    try {
        $result = & redis-cli -u "$env:REDIS_URL" ping 2>&1
        if ($LASTEXITCODE -eq 0 -and $result -match "PONG") {
            Write-Success "Redis 连接正常"
        } else {
            throw "Redis 连接失败"
        }
    } catch {
        Write-Error "Redis 连接失败"
        Write-Info "请确保Redis服务已启动，并且配置正确"
        Write-Info "当前配置: $env:REDIS_URL"
        exit 1
    }

    # 检查 Ollama
    Test-OllamaService

    # 检查迁移
    Test-Migrations
}

# ================================================
# 检查并运行数据库迁移
# ================================================
function Test-Migrations {
    Write-Info "检查数据库迁移状态..."

    # 定义有SQL迁移文件的服务
    $allServices = @(
        @{Name="unified-core"; Schema="unified_core"; Path="svc/unified-core"},
        @{Name="pm"; Schema="pm"; Path="svc/pm"},
        @{Name="portal"; Schema="portal"; Path="svc/portal"},
        @{Name="integration"; Schema="integration"; Path="svc/integration"},
        @{Name="erp"; Schema="erp"; Path="svc/erp"},
        @{Name="hrm"; Schema="hrm"; Path="svc/hrm"},
        @{Name="crm"; Schema="crm"; Path="svc/crm"},
        @{Name="rd"; Schema="rd"; Path="svc/rd"},
        @{Name="lims"; Schema="lims"; Path="svc/lims"},
        @{Name="pdm"; Schema="pdm"; Path="svc/pdm"},
        @{Name="mes"; Schema="mes"; Path="svc/mes"},
        @{Name="qms"; Schema="qms"; Path="svc/qms"},
        @{Name="ehs"; Schema="ehs"; Path="svc/ehs"},
        @{Name="scm"; Schema="scm"; Path="svc/scm"},
        @{Name="srm"; Schema="srm"; Path="svc/srm"},
        @{Name="wms"; Schema="wms"; Path="svc/wms"},
        @{Name="gis"; Schema="gis"; Path="svc/gis"},
        @{Name="analytics"; Schema="analytics"; Path="svc/analytics"},
        @{Name="ai"; Schema="ai"; Path="svc/ai"},
        @{Name="mobile"; Schema="mobile"; Path="svc/mobile"},
        @{Name="finance"; Schema="finance"; Path="svc/finance"},
        @{Name="master-data"; Schema="master_data"; Path="svc/master-data"}
    )

    $missingMigrations = @()

    foreach ($service in $allServices) {
        $tableCount = & psql "$env:DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_schema) = LOWER('$($service.Schema)');" 2>$null | ForEach-Object { $_.Trim() }

        if ([string]::IsNullOrEmpty($tableCount) -or $tableCount -eq "0") {
            # 检查迁移文件
            $migrationDir = Join-Path $ProjectRoot $service.Path "migrations"
            $srcMigrationDir = Join-Path $ProjectRoot $service.Path "src\db\migrations"

            $hasMigrations = $false
            if ((Test-Path $migrationDir) -and (Get-ChildItem $migrationDir -Filter "*.sql" -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) {
                $hasMigrations = $true
            } elseif ((Test-Path $srcMigrationDir) -and (Get-ChildItem $srcMigrationDir -Filter "*.sql" -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) {
                $hasMigrations = $true
            }

            if ($hasMigrations) {
                $missingMigrations += $service
            }
        }
    }

    if ($missingMigrations.Count -gt 0) {
        Write-Warning "检测到 $($missingMigrations.Count) 个模块缺少数据库表"
        Write-Info "正在自动运行数据库迁移..."

        foreach ($service in $missingMigrations) {
            Write-Info "  迁移 $($service.Name) schema..."

            # 创建 schema
            & psql "$env:DATABASE_URL" -c "CREATE SCHEMA IF NOT EXISTS $($service.Schema);" 2>$null | Out-Null

            # PostGIS 扩展
            if ($service.Name -eq "gis") {
                & psql "$env:DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>$null | Out-Null
                & psql "$env:DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS btree_gin;" 2>$null | Out-Null
            }

            # 运行迁移文件
            $migrationDirs = @(
                (Join-Path $ProjectRoot $service.Path "migrations"),
                (Join-Path $ProjectRoot $service.Path "src\db\migrations")
            )

            foreach ($dir in $migrationDirs) {
                if (Test-Path $dir) {
                    Get-ChildItem $dir -Filter "*.sql" | ForEach-Object {
                        Write-Info "    运行: $($_.Name)"
                        & psql "$env:DATABASE_URL" -f $_.FullName 2>$null | Out-Null
                    }
                }
            }
        }

        Write-Success "数据库迁移完成"
    } else {
        Write-Success "数据库迁移状态正常"
    }
}

# ================================================
# 停止所有服务
# ================================================
function Stop-AllServices {
    Write-Info "停止所有服务..."

    $services = @(
        "unified-core", "pm", "portal", "integration",
        "erp", "hrm", "crm", "rd", "lims", "pdm",
        "mes", "qms", "ehs", "scm", "srm", "wms",
        "gis", "analytics", "ai", "mobile", "finance", "master-data"
    )

    # 停止后端服务 (匹配进程名)
    foreach ($service in $services) {
        # 匹配 topems-* 或 *-service 或 cargo run
        $patterns = @("*topems-$service*", "*$service-service*", "*cargo run*$service*")
        foreach ($pattern in $patterns) {
            Get-CimInstance Win32_Process | Where-Object { $_.Name -like $pattern -or $_.CommandLine -like $pattern } | ForEach-Object {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
        }
    }

    # 停止前端服务
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*npm run dev*" -or $_.CommandLine -like "*node*vite*" } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

    Write-Success "所有服务已停止"
}

# ================================================
# 启动单个服务
# ================================================
function Start-ServiceProcess {
    param([string]$Name, [int]$Port)

    Write-Info "启动 $Name 服务 (端口 $Port)..."

    # 检查端口是否被占用
    if (Test-PortInUse -Port $Port) {
        # 检查是否是正确进程
        $existingProcess = Get-CimInstance Win32_Process | Where-Object {
            $_.CommandLine -match "topems-$Name" -or
            $_.CommandLine -match "$Name-service" -or
            $_.CommandLine -match "SERVER_PORT.*$Port"
        } | Select-Object -First 1

        if ($existingProcess) {
            Write-Success "$Name 服务已在运行 (端口 $Port)"
            return
        } else {
            Write-Warning "端口 $Port 被其他进程占用，跳过 $Name 服务"
            return
        }
    }

    # 检查服务目录
    $servicePath = Join-Path $ProjectRoot "svc\$Name"
    if (-not (Test-Path $servicePath)) {
        Write-Warning "$Name 服务目录不存在，跳过"
        return
    }

    # 创建日志目录
    $logsDir = Join-Path $ProjectRoot "logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir | Out-Null
    }

    # 启动服务
    $logFile = Join-Path $logsDir "$Name.log"

    Push-Location $servicePath
    try {
        $env:SERVER_PORT = $Port
        $env:RUST_LOG = "info"

        $process = Start-Process -FilePath "cargo" -ArgumentList "run", "--quiet" -NoNewWindow -PassThru -RedirectStandardOutput $logFile -WorkingDirectory $servicePath

        # 等待启动
        $attempts = 0
        $started = $false

        while ($attempts -lt 15) {
            Start-Sleep -Seconds 1

            # 检查进程是否还在运行
            if ($process.HasExited) {
                Write-Warning "$Name 服务启动失败，请检查日志: logs\$Name.log"
                return
            }

            # 尝试健康检查
            try {
                $health = Invoke-WebRequest -Uri "http://localhost:$Port/health" -TimeoutSec 2 -ErrorAction Stop
                if ($health.StatusCode -eq 200) {
                    $started = $true
                    break
                }
            } catch {
                # 继续等待
            }

            $attempts++
        }

        if ($started -or -not $process.HasExited) {
            Write-Success "$Name 服务启动成功 (PID: $($process.Id))"
        } else {
            Write-Warning "$Name 服务启动超时，请检查日志: logs\$Name.log"
        }
    } finally {
        Pop-Location
    }
}

# ================================================
# 启动核心服务
# ================================================
function Start-CoreServices {
    Write-Info "启动核心服务..."

    $coreServices = @(
        @{Name="unified-core"; Port=$UNIFIED_CORE_PORT},
        @{Name="pm"; Port=$PM_PORT},
        @{Name="portal"; Port=$PORTAL_PORT}
    )

    foreach ($service in $coreServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8000)
    }
}

# ================================================
# 启动ERP服务
# ================================================
function Start-ERPServices {
    Write-Info "启动ERP服务..."

    $erpServices = @(
        @{Name="erp"; Port=$ERP_PORT},
        @{Name="hrm"; Port=$HRM_PORT},
        @{Name="crm"; Port=$CRM_PORT}
    )

    foreach ($service in $erpServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8010)
    }
}

# ================================================
# 启动PLM服务
# ================================================
function Start-PLMServices {
    Write-Info "启动PLM服务..."

    $plmServices = @(
        @{Name="rd"; Port=$RD_PORT},
        @{Name="lims"; Port=$LIMS_PORT},
        @{Name="pdm"; Port=$PDM_PORT}
    )

    foreach ($service in $plmServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8020)
    }
}

# ================================================
# 启动MES服务
# ================================================
function Start-MESServices {
    Write-Info "启动MES服务..."

    $mesServices = @(
        @{Name="mes"; Port=$MES_PORT},
        @{Name="qms"; Port=$QMS_PORT},
        @{Name="ehs"; Port=$EHS_PORT}
    )

    foreach ($service in $mesServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8030)
    }
}

# ================================================
# 启动SCM服务
# ================================================
function Start-SCMServices {
    Write-Info "启动SCM服务..."

    $scmServices = @(
        @{Name="scm"; Port=$SCM_PORT},
        @{Name="srm"; Port=$SRM_PORT},
        @{Name="wms"; Port=$WMS_PORT}
    )

    foreach ($service in $scmServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8040)
    }
}

# ================================================
# 启动基础设施服务
# ================================================
function Start-InfraServices {
    Write-Info "启动基础设施服务..."

    $infraServices = @(
        @{Name="gis"; Port=$GIS_PORT},
        @{Name="integration"; Port=$INTEGRATION_PORT}
    )

    foreach ($service in $infraServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8050)
    }
}

# ================================================
# 启动数据分析服务
# ================================================
function Start-AnalyticsServices {
    Write-Info "启动数据分析服务..."

    $analyticsServices = @(
        @{Name="analytics"; Port=$ANALYTICS_PORT},
        @{Name="ai"; Port=$AI_PORT}
    )

    foreach ($service in $analyticsServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8060)
    }
}

# ================================================
# 启动扩展服务
# ================================================
function Start-ExtensionServices {
    Write-Info "启动预留扩展服务..."

    $extensionServices = @(
        @{Name="mobile"; Port=$MOBILE_PORT},
        @{Name="finance"; Port=$FINANCE_PORT},
        @{Name="master-data"; Port=$MASTER_DATA_PORT}
    )

    foreach ($service in $extensionServices) {
        Start-ServiceProcess -Name $service.Name -Port ($service.Port ?? 8070)
    }
}

# ================================================
# 启动前端服务
# ================================================
function Start-FrontendService {
    Write-Info "启动前端服务..."

    if (Test-PortInUse -Port $WEB_PORT) {
        Write-Warning "端口 $WEB_PORT 已被占用，跳过前端服务"
        return
    }

    $webPath = Join-Path $ProjectRoot "apps\web"
    if (-not (Test-Path $webPath)) {
        Write-Warning "前端目录不存在，跳过"
        return
    }

    $logsDir = Join-Path $ProjectRoot "logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir | Out-Null
    }
    $logFile = Join-Path $logsDir "web.log"

    Push-Location $webPath
    try {
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru -RedirectStandardOutput $logFile -WorkingDirectory $webPath | Out-Null

        # 等待启动
        $attempts = 0
        while ($attempts -lt 30) {
            Start-Sleep -Seconds 2

            if (Test-PortInUse -Port $WEB_PORT) {
                Write-Success "前端服务启动成功"
                return
            }

            $attempts++
        }

        Write-Warning "前端服务启动超时"
    } finally {
        Pop-Location
    }
}

# ================================================
# 显示服务状态
# ================================================
function Show-ServiceStatus {
    Write-Info "服务状态检查..."
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "                    TOPEMS 服务状态                        " -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    # 系统资源
    Write-Host ""
    Write-Host "系统资源:" -ForegroundColor White

    $cpuUsage = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    Write-Host "   CPU: ${cpuUsage}%"

    $os = Get-CimInstance Win32_OperatingSystem
    $totalMem = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedMem = $totalMem - $freeMem
    Write-Host "   内存: ${usedMem} GB / ${totalMem} GB"

    $disk = Get-PSDrive C
    $diskUsage = [math]::Round(($disk.Used / $disk.Total) * 100, 1)
    Write-Host "   磁盘: ${diskUsage}% 使用"

    # 数据库状态
    Write-Host ""
    Write-Host "数据库:" -ForegroundColor White

    try {
        $null = & psql "$env:DATABASE_URL" -c "SELECT 1" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] PostgreSQL" -ForegroundColor Green

            $dbSize = & psql "$env:DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size('topems'));" 2>$null
            Write-Host "     数据库大小: $($dbSize.Trim())"
        }
    } catch {
        Write-Host "  [FAIL] PostgreSQL" -ForegroundColor Red
    }

    try {
        $redisResult = & redis-cli -u "$env:REDIS_URL" ping 2>$null
        if ($LASTEXITCODE -eq 0 -and $redisResult -match "PONG") {
            Write-Host "  [OK] Redis" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [FAIL] Redis" -ForegroundColor Red
    }

    # AI/LLM
    Write-Host ""
    Write-Host "AI/LLM 配置:" -ForegroundColor White

    $ollamaPort = $env:OLLAMA_PORT, 11434 | Select-Object -First 1
    try {
        $null = Invoke-RestMethod "http://localhost:$ollamaPort/api/tags" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "   Ollama: [OK] 运行中" -ForegroundColor Green
    } catch {
        Write-Host "   Ollama: [WARN] 未运行" -ForegroundColor Yellow
    }

    # 服务状态
    Write-Host ""
    Write-Host "TOPEMS 服务:" -ForegroundColor White

    $services = @(
        @{Category="核心服务"; Name="unified-core"; Port=$UNIFIED_CORE_PORT},
        @{Category="核心服务"; Name="pm"; Port=$PM_PORT},
        @{Category="核心服务"; Name="portal"; Port=$PORTAL_PORT},
        @{Category="ERP服务"; Name="erp"; Port=$ERP_PORT},
        @{Category="ERP服务"; Name="hrm"; Port=$HRM_PORT},
        @{Category="ERP服务"; Name="crm"; Port=$CRM_PORT},
        @{Category="PLM服务"; Name="rd"; Port=$RD_PORT},
        @{Category="PLM服务"; Name="lims"; Port=$LIMS_PORT},
        @{Category="PLM服务"; Name="pdm"; Port=$PDM_PORT},
        @{Category="MES服务"; Name="mes"; Port=$MES_PORT},
        @{Category="MES服务"; Name="qms"; Port=$QMS_PORT},
        @{Category="MES服务"; Name="ehs"; Port=$EHS_PORT},
        @{Category="SCM服务"; Name="scm"; Port=$SCM_PORT},
        @{Category="SCM服务"; Name="srm"; Port=$SRM_PORT},
        @{Category="SCM服务"; Name="wms"; Port=$WMS_PORT},
        @{Category="基础设施服务"; Name="gis"; Port=$GIS_PORT},
        @{Category="基础设施服务"; Name="integration"; Port=$INTEGRATION_PORT},
        @{Category="数据分析服务"; Name="analytics"; Port=$ANALYTICS_PORT},
        @{Category="数据分析服务"; Name="ai"; Port=$AI_PORT},
        @{Category="扩展服务"; Name="mobile"; Port=$MOBILE_PORT},
        @{Category="扩展服务"; Name="finance"; Port=$FINANCE_PORT},
        @{Category="扩展服务"; Name="master-data"; Port=$MASTER_DATA_PORT}
    )

    $currentCategory = ""
    foreach ($svc in $services) {
        if ($svc.Category -ne $currentCategory) {
            Write-Host ""
            Write-Host "$($svc.Category):" -ForegroundColor Magenta
            $currentCategory = $svc.Category
        }

        $port = $svc.Port ?? 8000
        if (Test-PortInUse -Port $port) {
            try {
                $health = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 2 -ErrorAction Stop
                if ($health.StatusCode -eq 200) {
                    Write-Host "  [OK] $($svc.Name) (端口 $port)" -ForegroundColor Green
                } else {
                    Write-Host "  [WARN] $($svc.Name) (端口 $port)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  [WARN] $($svc.Name) (端口 $port)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [OFF] $($svc.Name) (端口 $port)" -ForegroundColor Red
        }
    }

    # 前端状态
    Write-Host ""
    Write-Host "前端服务:" -ForegroundColor White
    if (Test-PortInUse -Port $WEB_PORT) {
        Write-Host "  [OK] Frontend (端口 $WEB_PORT)" -ForegroundColor Green
    } else {
        Write-Host "  [OFF] Frontend" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
}

# ================================================
# 主入口
# ================================================
switch ($Command) {
    "start" {
        Test-RequiredTools
        Test-DatabaseConnection
        Start-CoreServices
        Start-ERPServices
        Start-PLMServices
        Start-MESServices
        Start-SCMServices
        Start-InfraServices
        Start-AnalyticsServices
        Start-ExtensionServices
        Start-FrontendService
        Show-ServiceStatus
    }
    "start-core" {
        Test-RequiredTools
        Test-DatabaseConnection
        Start-CoreServices
        Show-ServiceStatus
    }
    "start-backend" {
        Test-RequiredTools
        Test-DatabaseConnection
        Start-CoreServices
        Start-ERPServices
        Start-PLMServices
        Start-MESServices
        Start-SCMServices
        Start-InfraServices
        Start-AnalyticsServices
        Start-ExtensionServices
        Show-ServiceStatus
    }
    "start-frontend" {
        Test-RequiredTools
        Start-FrontendService
        Show-ServiceStatus
    }
    "start-service" {
        $serviceName = $args[0]
        $servicePort = $args[1]
        if ([string]::IsNullOrEmpty($serviceName) -or [string]::IsNullOrEmpty($servicePort)) {
            Write-Error "缺少参数"
            Write-Host "使用方法: .\topems-standalone.ps1 start-service <服务名> <端口>"
            exit 1
        }
        Test-RequiredTools
        Start-ServiceProcess -Name $serviceName -Port ([int]$servicePort)
    }
    "stop" {
        Stop-AllServices
    }
    "status" {
        Test-RequiredTools
        Show-ServiceStatus
    }
    "restart" {
        Stop-AllServices
        & $MyInvocation.MyCommand.Path start
    }
}
