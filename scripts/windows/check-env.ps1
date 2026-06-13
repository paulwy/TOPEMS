# TOPEMS Windows 环境检查脚本
# 运行此脚本检查系统是否满足部署要求

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          TOPEMS Windows 环境检查                    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# ================================================
# 检查 1: PowerShell 版本
# ================================================
Write-Host "[检查] PowerShell 版本..." -NoNewline
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -ge 5) {
    Write-Host " [OK] PowerShell $($psVersion.ToString())" -ForegroundColor Green
} else {
    Write-Host " [WARN] PowerShell $($psVersion.ToString()) (建议 5.1+)" -ForegroundColor Yellow
}

# ================================================
# 检查 2: PostgreSQL (psql)
# ================================================
Write-Host "[检查] PostgreSQL 客户端 (psql)..." -NoNewline
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    $psqlVersion = & psql --version 2>&1
    Write-Host " [OK] $psqlVersion" -ForegroundColor Green
} else {
    Write-Host " [FAIL] 未找到 psql" -ForegroundColor Red
    Write-Host "       下载: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    $allPassed = $false
}

# ================================================
# 检查 3: Redis (redis-cli)
# ================================================
Write-Host "[检查] Redis 客户端 (redis-cli)..." -NoNewline
$redis = Get-Command redis-cli -ErrorAction SilentlyContinue
if ($redis) {
    $redisVersion = & redis-cli --version 2>&1
    Write-Host " [OK] $redisVersion" -ForegroundColor Green
} else {
    Write-Host " [FAIL] 未找到 redis-cli" -ForegroundColor Red
    Write-Host "       下载: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
    $allPassed = $false
}

# ================================================
# 检查 4: Rust (cargo)
# ================================================
Write-Host "[检查] Rust (cargo)..." -NoNewline
$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargo) {
    $cargoVersion = & cargo --version 2>&1
    Write-Host " [OK] $cargoVersion" -ForegroundColor Green
} else {
    Write-Host " [FAIL] 未找到 cargo" -ForegroundColor Red
    Write-Host "       安装: https://rustup.rs/" -ForegroundColor Yellow
    $allPassed = $false
}

# ================================================
# 检查 5: Node.js (node & npm)
# ================================================
Write-Host "[检查] Node.js (node)..." -NoNewline
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nodeVersion = & node --version 2>&1
    Write-Host " [OK] Node.js $nodeVersion" -ForegroundColor Green
} else {
    Write-Host " [FAIL] 未找到 Node.js" -ForegroundColor Red
    Write-Host "       下载: https://nodejs.org/" -ForegroundColor Yellow
    $allPassed = $false
}

Write-Host "[检查] npm..." -NoNewline
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($npm) {
    $npmVersion = & npm --version 2>&1
    Write-Host " [OK] npm $npmVersion" -ForegroundColor Green
} else {
    Write-Host " [FAIL] 未找到 npm" -ForegroundColor Red
    $allPassed = $false
}

# ================================================
# 检查 6: curl
# ================================================
Write-Host "[检查] curl..." -NoNewline
$curl = Get-Command curl -ErrorAction SilentlyContinue
if ($curl) {
    $curlVersion = & curl --version | Select-Object -First 1
    Write-Host " [OK] $curlVersion" -ForegroundColor Green
} else {
    Write-Host " [FAIL] 未找到 curl" -ForegroundColor Red
    Write-Host "       下载: https://curl.se/windows/" -ForegroundColor Yellow
    $allPassed = $false
}

# ================================================
# 检查 7: Ollama (可选)
# ================================================
Write-Host "[检查] Ollama (可选)..." -NoNewline
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollama) {
    $ollamaVersion = & ollama --version 2>&1
    Write-Host " [OK] $ollamaVersion" -ForegroundColor Green

    # 检查 Ollama 服务
    Write-Host "[检查] Ollama 服务..." -NoNewline
    try {
        $null = Invoke-RestMethod "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop
        Write-Host " [OK] 运行中" -ForegroundColor Green
    } catch {
        Write-Host " [WARN] 未运行 (运行 'ollama serve' 启动)" -ForegroundColor Yellow
    }
} else {
    Write-Host " [SKIP] 未安装 (可选)" -ForegroundColor Gray
    Write-Host "       下载: https://ollama.ai/" -ForegroundColor Gray
}

# ================================================
# 检查 8: PostgreSQL 服务
# ================================================
Write-Host "[检查] PostgreSQL 服务..." -NoNewline
$pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }
if ($pgService) {
    Write-Host " [OK] $($pgService.DisplayName) 运行中" -ForegroundColor Green
} else {
    Write-Host " [WARN] PostgreSQL 服务未运行" -ForegroundColor Yellow
    Write-Host "       请启动 PostgreSQL 服务" -ForegroundColor Yellow
}

# ================================================
# 检查 9: Redis 服务
# ================================================
Write-Host "[检查] Redis 服务..." -NoNewline
$redisService = Get-Service -Name "*redis*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }
if ($redisService) {
    Write-Host " [OK] $($redisService.DisplayName) 运行中" -ForegroundColor Green
} else {
    Write-Host " [WARN] Redis 服务未运行" -ForegroundColor Yellow
    Write-Host "       请启动 Redis 服务" -ForegroundColor Yellow
}

# ================================================
# 检查 10: 端口占用
# ================================================
Write-Host ""
Write-Host "[检查] 常用端口占用情况:" -ForegroundColor Cyan

$ports = @(8000, 8001, 8002, 3000, 5432, 6379)
foreach ($port in $ports) {
    $inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($inUse) {
        $process = Get-Process -Id $inUse.OwningProcess -ErrorAction SilentlyContinue
        $processName = if ($process) { $process.ProcessName } else { "Unknown" }
        Write-Host "  端口 $port`: [占用] $processName" -ForegroundColor Yellow
    } else {
        Write-Host "  端口 $port`: [可用]" -ForegroundColor Green
    }
}

# ================================================
# 检查 11: 磁盘空间
# ================================================
Write-Host ""
Write-Host "[检查] 磁盘空间..." -NoNewline
$disk = Get-PSDrive C
$freeSpaceGB = [math]::Round($disk.Free / 1GB, 2)
if ($freeSpaceGB -gt 10) {
    Write-Host " [OK] 可用空间 ${freeSpaceGB} GB" -ForegroundColor Green
} elseif ($freeSpaceGB -gt 5) {
    Write-Host " [WARN] 可用空间 ${freeSpaceGB} GB (建议 >10GB)" -ForegroundColor Yellow
} else {
    Write-Host " [FAIL] 可用空间不足 ${freeSpaceGB} GB" -ForegroundColor Red
    $allPassed = $false
}

# ================================================
# 检查 12: 内存
# ================================================
Write-Host "[检查] 系统内存..." -NoNewline
$os = Get-CimInstance Win32_OperatingSystem
$totalMemGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeMemGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$availableMemGB = $totalMemGB - $freeMemGB
if ($totalMemGB -gt 16) {
    Write-Host " [OK] 总计 ${totalMemGB} GB, 可用 ${freeMemGB} GB" -ForegroundColor Green
} elseif ($totalMemGB -gt 8) {
    Write-Host " [WARN] 总计 ${totalMemGB} GB (建议 16GB+)" -ForegroundColor Yellow
} else {
    Write-Host " [FAIL] 内存不足 ${totalMemGB} GB (建议 16GB+)" -ForegroundColor Red
}

# ================================================
# 总结
# ================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "环境检查通过，可以运行部署脚本!" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Cyan
    Write-Host "  .\topems-standalone.ps1 start" -ForegroundColor White
} else {
    Write-Host "环境检查未完全通过，请安装缺少的组件" -ForegroundColor Yellow
}

Write-Host "============================================================" -ForegroundColor Cyan
