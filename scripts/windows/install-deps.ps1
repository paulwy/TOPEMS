# TOPEMS Windows 依赖安装脚本 (PostgreSQL + Redis)
# 用法(在项目根目录):
#   powershell -ExecutionPolicy Bypass -File scripts/windows/install-deps.ps1
# 参数:
#   -RedisPassword <密码>   新装 Redis 的 requirepass (默认 pass4Redis, 与根 .env 一致)
#   -PgVersion <版本>       winget 安装的 PostgreSQL 版本 (默认 18)
#   -Yes                    全部按默认确认(无人值守, 不询问)
#   -CheckOnly              只检测不安装(安全演练)
# 行为:
#   1) 检测 PostgreSQL / Redis 是否已安装
#   2) 已安装 -> 询问是否重新安装; 未安装 -> 询问是否安装 (得到确认后才执行)
#   3) 检测到禅道 Redis (服务 rediszt3) 占用 6379 时, 询问是否停止并禁用该服务
# 说明: 未指定 -RedisPassword 时, 自动从根 .env 的 REDIS_URL 读取, 读不到则用默认值

param(
    [string]$RedisPassword = '',
    [string]$PgVersion = '18',
    [switch]$Yes,
    [switch]$CheckOnly
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Continue'

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Write-Step($m)  { Write-Host "[INFO]  $m" -ForegroundColor Cyan }
function Write-Ok($m)    { Write-Host "[OK]    $m" -ForegroundColor Green }
function Write-Warn($m)  { Write-Host "[WARN]  $m" -ForegroundColor Yellow }
function Write-Fail($m)  { Write-Host "[FAIL]  $m" -ForegroundColor Red }

function Confirm-Prompt([string]$msg, [bool]$defaultYes) {
    if ($Yes) { return $defaultYes }
    $hint = if ($defaultYes) { '(Y/n)' } else { '(y/N)' }
    $ans = Read-Host "$msg $hint"
    if ($defaultYes) { return ($ans -notmatch '^n') }
    return ($ans -match '^y')
}

function Test-PortListen([int]$port) {
    try {
        $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
        return $c
    } catch { return $null }
}

# ---------- PostgreSQL ----------
function Find-PsqlBin {
    $c = Get-Command psql -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    foreach ($d in @('C:\Program Files\PostgreSQL','D:\Program Files\PostgreSQL','E:\Program Files\PostgreSQL')) {
        if (Test-Path $d) {
            $dirs = Get-ChildItem $d -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
            foreach ($x in $dirs) {
                $p = Join-Path $x.FullName 'bin\psql.exe'
                if (Test-Path $p) { return $p }
            }
        }
    }
    return $null
}

function Test-PostgresInstalled {
    $psqlBin = Find-PsqlBin
    $svc = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^postgresql' }
    $port = Test-PortListen 5432
    if ($psqlBin) {
        $ver = (& $psqlBin -V 2>$null | Out-String).Trim()
        return @{ Installed = $true; Detail = $ver; PsqlBin = $psqlBin }
    }
    if ($svc) {
        return @{ Installed = $true; Detail = ("服务 " + ($svc.Name -join ',') + " 存在"); PsqlBin = $null }
    }
    if ($port) {
        return @{ Installed = $true; Detail = "端口 5432 有监听"; PsqlBin = $null }
    }
    return @{ Installed = $false; Detail = ''; PsqlBin = $null }
}

function Install-Postgres {
    Write-Step "通过 winget 安装 PostgreSQL $PgVersion (PostgreSQL.PostgreSQL.$PgVersion) ..."
    winget install --id "PostgreSQL.PostgreSQL.$PgVersion" -e --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Write-Fail "winget 安装 PostgreSQL 失败 (exit=$LASTEXITCODE)"; return $false }

    Start-Sleep -Seconds 5
    $pg = Test-PostgresInstalled
    if (-not $pg.Installed) { Write-Fail "安装完成但未检测到 PostgreSQL, 请检查安装器"; return $false }
    Write-Ok "PostgreSQL 安装完成: $($pg.Detail)"

    # 初始化: 尝试用 postgres 超级用户(本地信任)创建 topems 用户/库
    $psqlBin = Find-PsqlBin
    if ($psqlBin) {
        Write-Step "尝试初始化 topems 用户/数据库 ..."
        $env:PGPASSWORD = ''
        $okUser = & $psqlBin -h localhost -p 5432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='topems'" 2>$null
        if ($LASTEXITCODE -eq 0) {
            if (-not $okUser) {
                & $psqlBin -h localhost -p 5432 -U postgres -d postgres -c "CREATE USER topems WITH PASSWORD 'topems_secret' CREATEDB;" 2>$null
            }
            & $psqlBin -h localhost -p 5432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='topems'" 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                & $psqlBin -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE topems OWNER topems;" 2>$null | Out-Null
            }
            Write-Ok "topems 用户/数据库已就绪 (密码 topems_secret)"
        } else {
            Write-Warn "无法以 postgres 超级用户连接(需要密码), 请手动执行:"
            Write-Warn "  CREATE USER topems WITH PASSWORD 'topems_secret' CREATEDB;"
            Write-Warn "  CREATE DATABASE topems OWNER topems;"
        }
    }
    return $true
}

# ---------- Redis ----------
function Find-RedisServerBin {
    $c = Get-Command redis-server -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    foreach ($p in @('C:\Program Files\Redis\redis-server.exe', 'C:\Program Files\Redis\redis-server.exe')) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Find-RedisCliBin {
    $c = Get-Command redis-cli -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    foreach ($p in @('C:\Program Files\Redis\redis-cli.exe')) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Test-RedisInstalled {
    $svc = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'redis' }
    $port = Test-PortListen 6379
    $clipper = Find-RedisCliBin

    # 识别占用者: 禅道 Zbox 服务 (rediszt3 等)
    $zt = $null
    if ($svc) {
        foreach ($s in $svc) {
            $ci = Get-CimInstance Win32_Service -Filter ("Name='" + $s.Name + "'") -ErrorAction SilentlyContinue
            if ($ci -and $ci.PathName -match 'ZenTao|zbox') { $zt = $s }
        }
    }
    if ($zt) {
        # 禅道服务若已停止且禁用, 视为已处理, 继续检测官方 Redis
        if ($zt.Status -ne 'Stopped' -or $zt.StartType -ne 'Disabled') {
            return @{ Installed = $true; Detail = ("禅道 Zbox 自带 Redis (服务 " + $zt.Name + ", 状态 " + $zt.Status + ", 启动类型 " + $zt.StartType + ")"); ZenTaoSvc = $zt.Name }
        }
    }
    if ($port) {
        return @{ Installed = $true; Detail = '端口 6379 已有监听'; ZenTaoSvc = $null }
    }
    if ($clipper -or (Get-Command redis-cli -ErrorAction SilentlyContinue)) {
        return @{ Installed = $true; Detail = 'redis-cli 可用'; ZenTaoSvc = $null }
    }
    if ($svc) {
        return @{ Installed = $true; Detail = ("服务 " + ($svc.Name -join ',') + " 存在"); ZenTaoSvc = $null }
    }
    return @{ Installed = $false; Detail = ''; ZenTaoSvc = $null }
}

function Install-Redis {
    # 已装官方 Redis 时跳过 winget (避免重复安装)
    $srv = Find-RedisServerBin
    if ($srv) {
        Write-Ok "redis-server 已存在: $srv (跳过 winget 安装)"
    } else {
        Write-Step "通过 winget 安装 Redis (Redis.Redis) ..."
        winget install --id Redis.Redis -e --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) { Write-Fail "winget 安装 Redis 失败 (exit=$LASTEXITCODE)"; return $false }
        Start-Sleep -Seconds 5
        $srv = Find-RedisServerBin
    }
    if (-not $srv) {
        Write-Warn "未找到 redis-server, 请手动安装或检查 PATH"
        return $false
    }
    Write-Ok "Redis 二进制: $srv"

    # 配置 requirepass
    $conf = Join-Path (Split-Path $srv) 'redis.conf'
    if (Test-Path $conf) {
        $c = Get-Content $conf -Raw
        $c = [regex]::Replace($c, '(?m)^\s*#?\s*requirepass\s+.*$', "requirepass $RedisPassword")
        if ($c -notmatch 'requirepass') { $c += "`nrequirepass $RedisPassword`n" }
        Set-Content -Path $conf -Value $c -NoNewline
    } else {
        Set-Content -Path $conf -Value "# generated by topems`nrequirepass $RedisPassword`n" -NoNewline
    }
    if (Test-Path $conf -and ((Get-Content $conf -Raw) -match 'requirepass')) {
        Write-Ok "已写入 requirepass 到 $conf"
    } else {
        Write-Warn "写入 $conf 失败(通常因非管理员权限), 请以管理员手动编辑该文件并添加: requirepass $RedisPassword"
    }

    # 尝试注册并启动 Windows 服务 (tporadowski/redis 支持 --service-install)
    $svcName = 'topems-redis'
    $existing = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($existing) { Stop-Service $svcName -Force -ErrorAction SilentlyContinue }
    & $srv --service-uninstall 2>$null | Out-Null
    & $srv --service-install $conf --service-name $svcName 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Start-Service $svcName -ErrorAction SilentlyContinue
        $chk = Get-Service $svcName -ErrorAction SilentlyContinue
        if ($chk -and $chk.Status -eq 'Running') {
            Write-Ok "Redis 已注册为 Windows 服务 $svcName 并启动"
        } else {
            Write-Warn "服务 $svcName 已注册但启动失败(可能端口被占用或权限不足), 请以管理员检查"
        }
    } else {
        Write-Warn "服务注册失败(需要管理员权限)。请以管理员终端执行:"
        Write-Warn "  & '$srv' --service-install '$conf' --service-name $svcName"
        Write-Warn "  Start-Service $svcName"
        Write-Warn "注意: 脚本不会自动启动无密码实例, 避免与现有 6379 监听冲突"
    }
    return $true
}

# ---------- .env 读取 ----------
function Get-EnvRedisPassword {
    $envFile = Join-Path $ProjectRoot '.env'
    if (Test-Path $envFile) {
        foreach ($l in Get-Content $envFile) {
            if ($l -match '^\s*REDIS_URL=redis://:([^@]*)@') { return $Matches[1] }
        }
    }
    return ''
}

# ---------- .env 核对 ----------
function Sync-EnvRedisPassword {
    $envFile = Join-Path $ProjectRoot '.env'
    if (-not (Test-Path $envFile)) { Write-Warn "未找到根 .env, 跳过同步"; return }
    $lines = Get-Content $envFile
    $idx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*REDIS_URL=') { $idx = $i; break }
    }
    $target = "REDIS_URL=redis://:$RedisPassword@localhost:6379"
    if ($idx -ge 0) {
        if ($lines[$idx].Trim() -eq $target) { Write-Ok ".env 的 REDIS_URL 已匹配 (无需修改)"; return }
        if (-not (Confirm-Prompt ".env 的 REDIS_URL 与安装密码不一致, 是否更新为 $target ?" $true)) { Write-Warn "已跳过 .env 更新"; return }
        Copy-Item $envFile "$envFile.bak" -Force
        $lines[$idx] = $target
        Set-Content -Path $envFile -Value $lines -Encoding UTF8
        Write-Ok "已更新 .env (原文件备份为 .env.bak)"
    } else {
        if (-not (Confirm-Prompt "检测到 .env 无 REDIS_URL, 是否追加 $target ?" $true)) { return }
        Add-Content -Path $envFile -Value $target -Encoding UTF8
        Write-Ok "已追加 REDIS_URL 到 .env"
    }
}

# ================= 主流程 =================
Write-Step "TOPEMS Windows 依赖安装脚本 (PostgreSQL + Redis)"
Write-Step "项目根: $ProjectRoot"

# 管理员权限检测: 停止系统服务/写 Program Files/注册服务均需管理员
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Ok "当前会话为管理员"
} else {
    Write-Warn "当前会话不是管理员: 停止/禁用系统服务、写入 C:\Program Files、注册 Windows 服务将失败"
    Write-Warn "建议以管理员身份重新运行本脚本; 若继续, 脚本会如实报告每个失败步骤"
}

# 解析 Redis 密码: 参数 -> .env -> 默认
if (-not $RedisPassword) {
    $fromEnv = Get-EnvRedisPassword
    if ($fromEnv) {
        $RedisPassword = $fromEnv
        Write-Step "Redis 密码使用根 .env 中的 REDIS_URL 配置"
    } else {
        $RedisPassword = [string]::Concat('pass4', 'Redis')
        Write-Warn "未从 .env 读取到密码, 将使用默认 pass4Redis"
    }
}

# --- 1. 检测 PostgreSQL ---
Write-Step "--- 检查 PostgreSQL ---"
$pg = Test-PostgresInstalled
if ($pg.Installed) {
    Write-Ok "检测到 PostgreSQL 已安装: $($pg.Detail)"
} else {
    Write-Warn "未检测到 PostgreSQL"
}

# --- 2. 检测 Redis ---
Write-Step "--- 检查 Redis ---"
$redis = Test-RedisInstalled
if ($redis.Installed) {
    Write-Ok "检测到 Redis 已存在: $($redis.Detail)"
} else {
    Write-Warn "未检测到 Redis"
}

# --- 仅检测模式: 只报告, 不询问不安装 ---
if ($CheckOnly) {
    Write-Step "--- 仅检测模式完成 (未执行任何安装/变更) ---"
    return
}

# --- 3. 询问与安装 ---
if ($pg.Installed) {
    if (Confirm-Prompt "是否重新安装 PostgreSQL (将覆盖现有版本)?" $false) {
        Install-Postgres
    } else {
        Write-Warn "跳过 PostgreSQL 安装"
    }
} else {
    if (Confirm-Prompt "是否安装 PostgreSQL $PgVersion ?" $true) {
        Install-Postgres
    } else {
        Write-Warn "跳过 PostgreSQL 安装"
    }
}

if ($redis.Installed) {
    if ($redis.ZenTaoSvc) {
        Write-Warn "禅道 Redis 占用 6379, 装官方 Redis 前需停止并禁用该服务"
        if (Confirm-Prompt "是否停止并禁用服务 $($redis.ZenTaoSvc) 后继续?" $false) {
            Stop-Service $redis.ZenTaoSvc -Force -ErrorAction SilentlyContinue
            Set-Service $redis.ZenTaoSvc -StartupType Disabled -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            $chkSvc = Get-Service $redis.ZenTaoSvc -ErrorAction SilentlyContinue
            if (-not $chkSvc) {
                Write-Ok "$($redis.ZenTaoSvc) 服务已不存在"
            } elseif ($chkSvc.Status -eq 'Stopped' -and $chkSvc.StartType -eq 'Disabled') {
                Write-Ok "已停止并禁用 $($redis.ZenTaoSvc)"
            } else {
                Write-Warn "停止 $($redis.ZenTaoSvc) 未生效(当前状态 $($chkSvc.Status)/$($chkSvc.StartType)), 通常因非管理员权限"
                Write-Warn "请以管理员终端执行: Stop-Service $($redis.ZenTaoSvc) -Force; Set-Service $($redis.ZenTaoSvc) -StartupType Disabled"
            }
            Install-Redis
        } else {
            Write-Warn "跳过: 保留禅道 Redis (请确保 .env REDIS_URL 密码与其一致)"
        }
    } else {
        if (Confirm-Prompt "是否重新安装 Redis?" $false) {
            Install-Redis
        } else {
            Write-Warn "跳过 Redis 安装"
        }
    }
} else {
    if (Confirm-Prompt "是否安装 Redis ?" $true) {
        Install-Redis
    } else {
        Write-Warn "跳过 Redis 安装"
    }
}

# --- 3. .env 核对 ---
Sync-EnvRedisPassword

# --- 4. 验证 ---
Write-Step "--- 最终状态 ---"
$pg2 = Test-PostgresInstalled
if ($pg2.Installed) { Write-Ok "PostgreSQL: $($pg2.Detail)" } else { Write-Fail "PostgreSQL: 不可用" }
$r2 = Test-RedisInstalled
if ($r2.Installed) {
    Write-Ok "Redis: $($r2.Detail)"
    $cli = Find-RedisCliBin
    if ($cli) {
        $ping = & $cli -a $RedisPassword ping 2>$null
        if ($ping -match 'PONG') { Write-Ok "Redis 认证 ping 通过" } else { Write-Warn "Redis ping 失败(可能密码不对或未启动)" }
    }
} else { Write-Fail "Redis: 不可用" }
Write-Step "完成。"
