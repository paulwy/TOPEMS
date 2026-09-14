# =============================================
# TOPEMS 统一入口脚本 (Windows PowerShell 版)
# =============================================
# 由 scripts/topems.sh 移植而来，兼容 Windows PowerShell 5.1+ / PowerShell 7+
# 用法:
#   powershell -ExecutionPolicy Bypass -File topems.ps1 <命令> [选项]
#   .\topems.ps1 <命令> [选项]
#
# 说明:
#   * 原脚本依赖的 Linux 命令 (lsof/ps/kill/nohup/grep/awk/sed...) 已全部用
#     PowerShell 原生能力替换 (Get-NetTCPConnection / Get-Process / Stop-Process /
#     Start-Process / Select-String ...)。
#   * 临时日志目录由 /tmp 改为 %TEMP%\topems。
#   * 少量仍调用其它 .sh 子脚本的命令 (sqlx / install-deps / ai / deploy /
#     update-password) 会尝试调用 Git Bash 或 WSL 的 bash 执行，缺环境时给出提示。

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CmdArgs
)

# ---------- 控制台编码（Windows PowerShell 5.1 中文支持） ----------
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $CmdArgs -or $CmdArgs.Count -eq 0) { $CmdArgs = @('help') }

# ---------- 路径常量 ----------
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) { $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$ProjectRoot = Split-Path -Parent $ScriptDir
$CliDir = Join-Path $ProjectRoot 'cli'
$TmpDir = Join-Path $env:TEMP 'topems'
if (-not (Test-Path $TmpDir)) { New-Item -ItemType Directory -Path $TmpDir -Force | Out-Null }
$BuildLockPath = Join-Path $TmpDir 'topems-build.lock'

# 重试/超时配置（可用环境变量覆盖）
if (-not $env:MAX_RETRIES)      { $Script:MaxRetries = 3 }     else { $Script:MaxRetries = [int]$env:MAX_RETRIES }
if (-not $env:RETRY_DELAY)      { $Script:RetryDelay = 3 }     else { $Script:RetryDelay = [int]$env:RETRY_DELAY }
if (-not $env:BACKOFF_FACTOR)   { $Script:BackoffFactor = 2 }  else { $Script:BackoffFactor = [int]$env:BACKOFF_FACTOR }
# 单次启动等待端口就绪的最长时间（秒）；unified-core 冷启动含 30 张表 schema 自检，实测 ~18s
if (-not $env:READY_TIMEOUT)    { $Script:ReadyTimeout = 60 }  else { $Script:ReadyTimeout = [int]$env:READY_TIMEOUT }

# ---------- 日志/颜色函数 ----------
function Write-Info    { Write-Host ('[INFO] '    + ($args -join ' ')) -ForegroundColor Blue }
function Write-Success { Write-Host ('[SUCCESS] ' + ($args -join ' ')) -ForegroundColor Green }
function Write-Warning2{ Write-Host ('[WARNING] ' + ($args -join ' ')) -ForegroundColor Yellow }
function Write-Warn    { Write-Host ('[WARN] '    + ($args -join ' ')) -ForegroundColor Yellow }
function Write-Error2  { Write-Host ('[ERROR] '   + ($args -join ' ')) -ForegroundColor Red }
function Write-Detail  { Write-Host ('[DETAIL] '  + ($args -join ' ')) -ForegroundColor Cyan }

# ---------- 服务配置加载 ----------
$Script:ServicesConfig = New-Object System.Collections.ArrayList
$Script:CoreServices = New-Object System.Collections.ArrayList

function Load-ServicesConfig {
    $configFile = Join-Path $ScriptDir 'services.conf'
    $Script:ServicesConfig.Clear()
    $Script:CoreServices.Clear()
    if (Test-Path $configFile) {
        Get-Content $configFile | ForEach-Object {
            $line = $_
            if ($line -match '^\s*CORE_SERVICES\s*=') {
                ($line -split '=', 2)[1].Trim() -split '\s+' | Where-Object { $_ } | ForEach-Object {
                    [void]$Script:CoreServices.Add($_)
                }
            } elseif ($line -notmatch '^\s*#' -and $line.Trim() -ne '') {
                [void]$Script:ServicesConfig.Add($line.Trim())
            }
        }
    } else {
        # 默认服务配置（与 scripts/services.conf 保持一致）
        @(
            'iam         svc/unified-core       topems-unified-core        8000'
            'pm          svc/pm                 topems-pm                   8023'
            'erp         svc/erp                topems-erp                  8010'
            'finance     svc/finance            topems-finance              8011'
            'ai          svc/ai                 topems-ai                   8013'
            'hrm         svc/hrm                topems-hrm                  8020'
            'crm         svc/crm                topems-crm                  8029'
            'mes         svc/mes                topems-mes                  8030'
            'pdm         svc/pdm                topems-pdm                  8031'
            'scm         svc/scm                topems-scm                  8040'
            'wms         svc/wms                topems-wms                  8041'
            'srm         svc/srm                topems-srm                  8042'
            'qms         svc/qms                topems-qms                  8050'
            'lims        svc/lims               topems-lims                 8051'
            'ehs         svc/ehs                topems-ehs                  8052'
            'rd          svc/rd                 topems-rd                   8053'
            'bi          svc/analytics          topems-analytics           8060'
            'portal      svc/portal             topems-portal               8063'
            'mobile      svc/mobile             topems-mobile               8070'
            'gis         svc/gis                topems-gis                  8071'
            'integration svc/integration        topems-integration           8072'
            'search      svc/search             topems-search               8082'
            'communication svc/communication    topems-communication         8084'
            'ticket      svc/ticket             topems-ticket               8086'
            'master-data svc/master-data        topems-master-data          8090'
        ) | ForEach-Object { [void]$Script:ServicesConfig.Add($_) }
        [void]$Script:CoreServices.Add('iam')
    }
}

Load-ServicesConfig

# ---------- 服务配置访问函数 ----------
function Get-ServiceLine([string]$name) {
    foreach ($line in $Script:ServicesConfig) {
        if (($line -split '\s+')[0] -eq $name) { return $line }
    }
    return $null
}
function Get-ServicePath([string]$name) {
    $line = Get-ServiceLine $name
    if ($null -eq $line) { return $null }
    return ($line -split '\s+')[1]
}
function Get-ServicePort([string]$name) {
    $line = Get-ServiceLine $name
    if ($null -eq $line) { return $null }
    return [int](($line -split '\s+')[3])
}
function Get-AllServices {
    $list = @()
    foreach ($line in $Script:ServicesConfig) { $list += ($line -split '\s+')[0] }
    return ($list | Sort-Object)
}
function Get-ExecutableName([string]$name) {
    $line = Get-ServiceLine $name
    $bin = $null
    if ($null -ne $line) { $bin = ($line -split '\s+')[2] }
    if ([string]::IsNullOrWhiteSpace($bin)) { return "topems-$name" }
    return $bin
}
function Get-AllExecutables {
    $set = New-Object System.Collections.Generic.HashSet[string]
    foreach ($line in $Script:ServicesConfig) {
        [void]$set.Add((($line -split '\s+')[2]))
    }
    return ($set | Sort-Object)
}

# ---------- 端口 / 进程工具 ----------
# Test-Port 使用 netstat 快照缓存（3 秒内复用），批量遍历端口时显著提速
$Script:NetstatCache = $null
$Script:NetstatCacheTime = $null
function Refresh-NetstatCache {
    if ($null -eq $Script:NetstatCache -or $null -eq $Script:NetstatCacheTime -or ((Get-Date) - $Script:NetstatCacheTime).TotalSeconds -gt 3) {
        $Script:NetstatCache = @(& netstat -ano -p tcp 2>$null | Select-String 'LISTENING')
        $Script:NetstatCacheTime = Get-Date
    }
}
function Test-Port([int]$port) {
    Refresh-NetstatCache
    $pattern = ":$port\s"
    foreach ($line2 in $Script:NetstatCache) {
        if ($line2 -match $pattern) { return $true }
    }
    return $false
}
function Get-ServicePid([string]$name, [int]$port) {
    $exe = Get-ExecutableName $name
    $pidVal = $null
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { $pidVal = $conn.OwningProcess }
    if (-not $pidVal) {
        $proc = Get-Process -Name $exe -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($proc) { $pidVal = $proc.Id }
    }
    return $pidVal
}

# ---------- 加载环境变量 (.env) ----------
function Load-Env {
    $envFile = Join-Path $ProjectRoot '.env'
    if (Test-Path $envFile) {
        Get-Content $envFile -Encoding UTF8 | ForEach-Object {
            $line = $_.Trim()
            if ($line -eq '' -or $line.StartsWith('#')) { return }
            if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                $k = $Matches[1]
                $v = $Matches[2]
                # 去除首尾引号
                if ($v.Length -ge 2) {
                    if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
                        $v = $v.Substring(1, $v.Length - 2)
                    }
                }
                Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Warning2 '根目录 .env 文件不存在'
    }
}

# ---------- 包管理器检测 ----------
function Get-PkgCmd {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { return 'pnpm' }
    if (Get-Command yarn -ErrorAction SilentlyContinue) { return 'yarn' }
    Write-Error2 'pnpm 和 yarn 都未安装'
    return $null
}
# 解析 .cmd/.ps1 包装器，拿到真正可调用的命令（pnpm/yarn 在 Windows 上是 .cmd）
function Resolve-PkgCommand([string]$pkgCmd) {
    $c = Get-Command "$pkgCmd.cmd" -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $c = Get-Command $pkgCmd -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    return $pkgCmd
}

# ---------- 前端依赖检查 ----------
function Ensure-FrontendDeps([string]$pkgCmd) {
    $webDir = Join-Path $ProjectRoot 'apps\web'
    if (-not (Test-Path $webDir)) {
        Write-Error2 "前端目录不存在: $webDir"
        return $false
    }
    Push-Location $webDir
    try {
        if (-not (Test-Path 'node_modules')) {
            Write-Info '安装前端依赖...'
            # 本机 dev 场景跳过 puppeteer Chromium 下载（CI 应通过环境变量显式启用）
            if (-not $env:PUPPETEER_SKIP_DOWNLOAD) {
                $env:PUPPETEER_SKIP_DOWNLOAD = 'true'
                Write-Detail '已自动设置 PUPPETEER_SKIP_DOWNLOAD=true（本机 dev 模式）'
            }
            $pkgExe = Resolve-PkgCommand $pkgCmd
            & $pkgExe install --silent
            if ($LASTEXITCODE -ne 0) { return $false }
        }
        return $true
    } finally { Pop-Location }
}
# =============================================
# 内存守卫 & 构建锁（V70+）
# =============================================
# 检查可用内存（Windows）
# 返回: 0=充足(>2GB), 1=偏低(1-2GB, WARN), 2=不足(<1GB, FAIL)
function Get-AvailableMemoryStatus {
    $fatalGb = if ($env:BUILD_MEMORY_FATAL_GB) { [double]$env:BUILD_MEMORY_FATAL_GB } else { 1 }
    $warnGb  = if ($env:BUILD_MEMORY_WARN_GB)  { [double]$env:BUILD_MEMORY_WARN_GB }  else { 2 }
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    if (-not $os) { return 0 }
    # FreePhysicalMemory 单位 KB
    $availMb = [math]::Round($os.FreePhysicalMemory / 1024)
    $availGb = [math]::Round($os.FreePhysicalMemory / 1024 / 1024, 1)
    if ($availGb -lt $fatalGb) {
        Write-Error2 "可用内存仅 ${availMb}MB！低于安全阈值 ${fatalGb}GiB，构建可能失败。"
        Write-Error2 '建议: 关闭其他应用或增加 swap，然后重试。'
        return 2
    } elseif ($availGb -lt $warnGb) {
        Write-Warn "可用内存 ${availMb}MB，低于推荐阈值 ${warnGb}GiB，将自动启用安全模式（串行+节流）。"
        return 1
    } else {
        Write-Detail "可用内存 ${availGb}GiB，充足"
        return 0
    }
}

# 构建锁：防止多个 build-all 并发执行
function Acquire-BuildLock([bool]$force) {
    if (Test-Path $BuildLockPath) {
        $lockPid = 0
        $raw = (Get-Content $BuildLockPath -ErrorAction SilentlyContinue | Select-Object -First 1)
        if ($raw) { [void][int]::TryParse($raw, [ref]$lockPid) }
        if ($lockPid -gt 0 -and (Get-Process -Id $lockPid -ErrorAction SilentlyContinue)) {
            if ($force) {
                Write-Warn "构建锁被 PID=$lockPid 占用，强制获取..."
                Stop-Process -Id $lockPid -Force -ErrorAction SilentlyContinue
                Start-Sleep 1
            } else {
                Write-Error2 "检测到另一个构建正在运行 (PID=$lockPid)，请等待其完成。"
                Write-Error2 '如需强制获取锁，使用 --force 参数。'
                return $false
            }
        } else {
            Write-Warn "发现过期的构建锁 (PID=$lockPid 已不存在)，清理..."
            Remove-Item $BuildLockPath -Force -ErrorAction SilentlyContinue
        }
    }
    Set-Content -Path $BuildLockPath -Value $PID -Encoding ASCII
    return $true
}
function Release-BuildLock {
    if (Test-Path $BuildLockPath) {
        $lockPid = 0
        $raw = (Get-Content $BuildLockPath -ErrorAction SilentlyContinue | Select-Object -First 1)
        if ($raw) { [void][int]::TryParse($raw, [ref]$lockPid) }
        if ($lockPid -eq $PID) {
            Remove-Item $BuildLockPath -Force -ErrorAction SilentlyContinue
            Write-Detail "构建锁已释放 (PID=$PID)"
        }
    }
}

# 恢复 CARGO_BUILD_JOBS 环境变量
function Restore-CargoJobs([bool]$modified, [string]$orig) {
    if ($modified) {
        if ($orig) { $env:CARGO_BUILD_JOBS = $orig }
        else { Remove-Item Env:CARGO_BUILD_JOBS -ErrorAction SilentlyContinue }
    }
}

# 按"依赖层"排序的服务编译顺序（与 bash 版一致）
function Get-BuildOrder {
    return @('iam','finance','erp','crm','scm','srm','hrm','pm','qms','wms','mes','pdm','ehs','lims','rd','portal','master-data','ticket','communication','mobile','gis','integration','search','ai','bi')
}

# ---------- 编译单个服务 ----------
# 参数: 服务名, 附加选项(字符串), 日志文件(可选)
function Invoke-BuildService([string]$serviceName, [string]$extraOpts, [string]$logFile) {
    $servicePath = Get-ServicePath $serviceName
    if (-not $servicePath) { Write-Error2 "服务 $serviceName 不存在"; return 1 }

    Write-Info "编译 $serviceName 服务..."
    $executableName = Get-ExecutableName $serviceName

    $memStatus = 0
    $origCargoJobs = $env:CARGO_BUILD_JOBS
    $cargoJobsModified = $false
    $profile = '--release'
    if ($extraOpts -like '*--dev*' -or $extraOpts -like '*--debug*') { $profile = '' }
    $online = if ($env:FORCE_ONLINE_BUILD -eq '1') { 1 } else { 0 }
    if ($extraOpts -like '*--online*')  { $online = 1 }
    if ($extraOpts -like '*--offline*') { $online = 0 }

    $cargoJobsNote = ''
    try {
        if ($extraOpts -like '*--serial*') {
            # 串行模式：强制单线程构建，忽略内存检查
            $env:CARGO_BUILD_JOBS = '1'; $cargoJobsModified = $true
            $cargoJobsNote = ' (jobs=1, 串行模式)'
        } elseif ($extraOpts -notlike '*--skip-mem-check*') {
            $memStatus = Get-AvailableMemoryStatus
            if ($memStatus -eq 2) {
                Restore-CargoJobs $cargoJobsModified $origCargoJobs
                Write-Error2 "内存不足，无法安全编译 $serviceName。请释放内存后重试，或使用 --skip-mem-check 跳过。"
                return 1
            } elseif ($memStatus -eq 1) {
                # 内存偏低：限制并行编译线程数
                $cpuCount = [Environment]::ProcessorCount
                $safeJobs = [math]::Max(1, [int]($cpuCount / 2))
                $env:CARGO_BUILD_JOBS = "$safeJobs"; $cargoJobsModified = $true
                $cargoJobsNote = " (jobs=$safeJobs, 内存安全模式)"
            }
        }

        if ($online -eq 1) { Remove-Item Env:SQLX_OFFLINE -ErrorAction SilentlyContinue }
        else { $env:SQLX_OFFLINE = 'true' }

        # 组装 cargo 参数（不用 eval 拼接字符串，避免注入/引号问题）
        $cargoArgs = @('build')
        if ($profile) { $cargoArgs += $profile }
        $cargoArgs += @('--bin', $executableName)

        $cmdShow = "cargo build $profile --bin $executableName"
        Write-Info "  命令: $cmdShow$cargoJobsNote"

        $cargoOut = & cargo @cargoArgs 2>&1
        $rc = $LASTEXITCODE
        if ($logFile) {
            $cargoOut | Out-File -FilePath $logFile -Encoding UTF8 -Append
            $cargoOut | ForEach-Object { Write-Host $_ }
        } else {
            $cargoOut | ForEach-Object { Write-Host $_ }
        }

        if ($rc -eq 0) {
            $buildKind = if ($profile) { 'release' } else { 'debug' }
            $sqlxKind = if ($online -eq 1) { 'online' } else { 'offline sqlx' }
            Write-Success "$serviceName 编译成功 ($buildKind, $sqlxKind)"
            Restore-CargoJobs $cargoJobsModified $origCargoJobs
            return 0
        }

        # 内存不足导致失败时，不再重试（会再次 OOM）
        if ($memStatus -eq 2 -or $memStatus -eq 1) {
            Restore-CargoJobs $cargoJobsModified $origCargoJobs
            Write-Error2 "$serviceName 编译失败（可能与内存不足有关）。建议: 释放内存后重试。"
            return 1
        }

        # 离线失败自动尝试在线编译（需要 DATABASE_URL）
        Write-Warning2 "$serviceName 离线编译失败，自动尝试在线编译（需要 DATABASE_URL）..."
        Load-Env
        Remove-Item Env:SQLX_OFFLINE -ErrorAction SilentlyContinue
        $onlineArgs = @('build')
        if ($profile) { $onlineArgs += $profile }
        $onlineArgs += @('--bin', $executableName)
        $out2 = & cargo @onlineArgs 2>&1
        $rc2 = $LASTEXITCODE
        if ($logFile) { $out2 | Out-File -FilePath $logFile -Encoding UTF8 -Append }
        $out2 | ForEach-Object { Write-Host $_ }
        if ($rc2 -eq 0) {
            Write-Success "$serviceName 在线编译成功"
            Restore-CargoJobs $cargoJobsModified $origCargoJobs
            return 0
        }
        Restore-CargoJobs $cargoJobsModified $origCargoJobs
        Write-Error2 "$serviceName 编译失败（离线+在线均失败），建议执行: ./scripts/dev/sqlx-prepare.sh 刷新根 .sqlx/"
        return 1
    } finally {
        Restore-CargoJobs $cargoJobsModified $origCargoJobs
    }
}

# ---------- 全量编译所有后端服务 ----------
function Invoke-BuildAllBackend([string]$extraOpts) {
    Write-Info '全量编译所有后端服务...'
    Push-Location $ProjectRoot
    try {
        # 参数解析
        $doPrepare = $false; $onlyCore = $false; $forceLock = $false
        $skipMemCheck = $false; $serialMode = $false
        $buildCooldown = 2; $skipPackages = @()
        foreach ($opt in ($extraOpts -split '\s+')) {
            if (-not $opt) { continue }
            switch -Wildcard ($opt) {
                '--prepare'        { $doPrepare = $true }
                '--only-core'      { $onlyCore = $true }
                '--force'          { $forceLock = $true }
                '--skip-mem-check' { $skipMemCheck = $true }
                '--serial'         { $serialMode = $true }
                '--cooldown=*'     { $buildCooldown = [int]$opt.Substring(11) }
                '--skip=*'         { $skipPackages += $opt.Substring(7) }
            }
        }

        # 构建锁
        if (-not (Acquire-BuildLock $forceLock)) {
            Write-Error2 '无法获取构建锁，请等待其他构建完成，或使用 --force 强制获取。'
            return 1
        }

        $memStatus = 0
        if (-not $skipMemCheck) {
            $memStatus = Get-AvailableMemoryStatus
            if ($memStatus -eq 2) {
                Release-BuildLock
                Write-Error2 '内存严重不足，取消全量编译。请释放内存后重试。'
                return 1
            } elseif ($memStatus -eq 1) {
                Write-Warn '内存偏低，将启用安全模式（串行+低并行度）进行构建。'
            }
        }
        if ($serialMode) {
            Write-Warn '已指定 --serial 模式，强制单线程构建 (CARGO_BUILD_JOBS=1)。'
            $env:CARGO_BUILD_JOBS = '1'
        } elseif ($memStatus -eq 1) {
            $serialMode = $true
            $env:CARGO_BUILD_JOBS = '1'
        }

        # 预处理: 刷新 SQLx 离线缓存
        if ($doPrepare) {
            Write-Info '========== 预处理: 刷新 SQLx 离线缓存 =========='
            Load-Env
            if (-not (Invoke-SqlxPrepare 'prepare' @())) { Write-Warning2 'sqlx prepare 失败，但继续尝试编译' }
        }

        # 决定编译顺序
        if ($onlyCore) { $svcOrder = @('iam','finance','erp','scm','srm','crm') }
        else { $svcOrder = Get-BuildOrder }

        $buildSuccess = 0; $buildFailed = 0; $buildSkipped = 0; $buildTotal = 0
        $failedList = New-Object System.Collections.ArrayList
        $startTime = Get-Date
        $isSafeMode = $false

        foreach ($svc in $svcOrder) {
            # 按 --skip 过滤
            if ($skipPackages -contains $svc) { $buildSkipped++; continue }

            # bi=analytics 映射
            $binaryName = if ($svc -eq 'bi') { 'topems-analytics' } else { Get-ExecutableName $svc }
            if (-not $binaryName) { $buildSkipped++; continue }
            $buildTotal++

            $elapsed = [int]((Get-Date) - $startTime).TotalSeconds
            $etaStr = ''
            if ($buildSuccess -gt 0 -and $buildTotal -gt $buildSuccess) {
                $avgTime = [int]($elapsed / $buildSuccess)
                $remaining = ($buildTotal - $buildSuccess - $buildFailed) * $avgTime
                $etaStr = " (预计剩余 ~${remaining}s)"
            }
            Write-Info "[$($buildSuccess + $buildFailed + 1)/$buildTotal] 编译 $svc -> bin=$binaryName ...$etaStr"

            # 传递 --serial 给 build_service
            $svcOpts = $extraOpts
            if ($serialMode) { $svcOpts = "$svcOpts --serial" }

            $logFile = Join-Path $TmpDir "topems-build-$svc.log"
            if (Test-Path $logFile) { Remove-Item $logFile -Force -ErrorAction SilentlyContinue }

            $rcBuild = Invoke-BuildService $svc $svcOpts $logFile
            if ($rcBuild -eq 0) {
                $buildSuccess++
                Write-Success "  OK $svc 构建成功"
            } else {
                $buildFailed++
                [void]$failedList.Add($svc)
                Write-Error2 "  X $svc 构建失败，日志 $logFile（末 15 行）"
                if (Test-Path $logFile) { Get-Content $logFile -Tail 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray } }

                # 内存不足时自动切换到安全模式
                if ($extraOpts -notlike '*--skip-mem-check*') {
                    $postMem = Get-AvailableMemoryStatus
                    if ($postMem -eq 1 -or $postMem -eq 2) {
                        $isSafeMode = $true; $serialMode = $true
                        $env:CARGO_BUILD_JOBS = '1'
                        Write-Warn '检测到内存压力，切换到安全模式（串行+低并行度）继续构建...'
                    }
                }
            }

            # 构建间冷却
            if ($serialMode) { Start-Sleep -Seconds $buildCooldown }
            elseif ($buildCooldown -gt 0) { Start-Sleep -Seconds 1 }
        }

        Release-BuildLock

        $totalElapsed = [int]((Get-Date) - $startTime).TotalSeconds
        $elapsedMin = [int]($totalElapsed / 60); $elapsedSec = $totalElapsed % 60

        Write-Host ''
        Write-Info '========== 后端编译汇总 =========='
        Write-Info "成功: $buildSuccess   失败: $buildFailed   跳过: $buildSkipped   耗时: ${elapsedMin}m ${elapsedSec}s"
        if ($failedList.Count -gt 0) { Write-Error2 "失败列表: $($failedList -join ' ')" }
        if ($isSafeMode) { Write-Warn '构建过程中启用了安全模式（内存自适应）' }
        if ($serialMode) { Write-Detail '构建模式: 串行单线程 (CARGO_BUILD_JOBS=1)' }
        Write-Detail "冷却间隔: ${buildCooldown}s (serial/安全模式) / 1s (普通模式)"
        Write-Info "产物目录: $ProjectRoot\target\release\ (release) 或 target\debug\ (debug)"

        if ($buildFailed -eq 0) {
            Write-Success "所有后端服务编译完成 ($buildSuccess 成功)"
            return 0
        }
        Write-Error2 "后端编译失败 ($buildSuccess 成功, $buildFailed 失败)"
        return 1
    } finally { Pop-Location }
}

# ---------- 编译前端 ----------
function Invoke-BuildFrontend([string]$extraOpts) {
    Write-Info '编译前端...'
    $pkgCmd = Get-PkgCmd
    if (-not $pkgCmd) { return 1 }
    if (-not (Ensure-FrontendDeps $pkgCmd)) { return 1 }

    $devMode = $false; $skipLint = $false
    foreach ($opt in ($extraOpts -split '\s+')) {
        if ($opt -eq '--dev' -or $opt -eq '--debug') { $devMode = $true }
        if ($opt -eq '--skip-lint') { $skipLint = $true }
    }

    # 读取 package.json 中真实存在的 scripts
    $webDir = Join-Path $ProjectRoot 'apps\web'
    $pkgScripts = @{}
    $pkgJson = Join-Path $webDir 'package.json'
    if (Test-Path $pkgJson) {
        try {
            $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
            if ($pkg.scripts) { $pkg.scripts.PSObject.Properties | ForEach-Object { $pkgScripts[$_.Name] = $_.Value } }
        } catch { }
    }
    function Has-Script([string]$name) { return $pkgScripts.ContainsKey($name) }

    $pkgExe = Resolve-PkgCommand $pkgCmd
    $cmd = "$pkgCmd build"
    # 1. --dev / --debug：优先 build:dev（若存在）
    if ($devMode) {
        if (Has-Script 'build:dev') { $cmd = "$pkgCmd build:dev" }
        else {
            Write-Warning2 'apps/web/package.json 未定义 build:dev 脚本，回退到默认 build（tsc && vite build）'
            $cmd = "$pkgCmd build"
        }
    }
    # 2. --skip-lint
    if ($skipLint) {
        if (Has-Script 'build:nolint') { $cmd = "$pkgCmd build:nolint" }
        else { Write-Warning2 'apps/web/package.json 未定义 build:nolint，--skip-lint 被忽略（当前 build 不跑 lint，可直接使用）' }
    }

    Write-Info "  命令: cd apps/web && $cmd"
    Push-Location $webDir
    try {
        $cmdParts = $cmd -split ' '
        if ($cmdParts[0] -eq $pkgCmd) { $cmdParts[0] = $pkgExe }
        & $cmdParts[0] @($cmdParts[1..($cmdParts.Length-1)]) 2>&1 | ForEach-Object { Write-Host $_ }
        $rc = $LASTEXITCODE
        if ($rc -eq 0) { Write-Success '前端编译成功'; return 0 }
    } finally { Pop-Location }

    # 二次降级：pnpm <script> 失败后直接 tsc && vite build
    Write-Warning2 "脚本 $cmd 失败，自动降级尝试直接调用 vite build ..."
    Push-Location $webDir
    try {
        Write-Info "  降级命令: cd apps/web && pnpm exec -- tsc && pnpm exec -- vite build"
        $c1 = & $pkgExe exec -- tsc 2>&1; $rc1 = $LASTEXITCODE
        $c1 | ForEach-Object { Write-Host $_ }
        if ($rc1 -eq 0) {
            $c2 = & $pkgExe exec -- vite build 2>&1; $rc2 = $LASTEXITCODE
            $c2 | ForEach-Object { Write-Host $_ }
            if ($rc2 -eq 0) { Write-Success '前端编译成功（降级 vite build）'; return 0 }
        }
    } finally { Pop-Location }

    Write-Error2 "前端编译失败（两次尝试均失败）。直接手工排查: cd apps/web && $pkgCmd build"
    return 1
}

# ---------- 全量编译（后端+前端） ----------
function Invoke-BuildAll([string[]]$allArgs) {
    if (-not (Invoke-Preflight @allArgs)) { return 1 }
    $extraOpts = ($allArgs | Where-Object { $_ -ne '--skip-preflight' }) -join ' '
    Write-Info '========== 全量编译开始 =========='
    Write-Info "参数: $(if (-not $extraOpts) { '(无)' } else { $extraOpts })"
    Write-Info '支持参数: --prepare --only-core --online --offline --dev/--debug --skip=<svc> --skip-lint --backend-only/--no-frontend'

    $backendResult = 0; $frontendResult = 0; $skipFe = $false
    if ($extraOpts -like '*--no-frontend*' -or $extraOpts -like '*--backend-only*') { $skipFe = $true }

    if (-not (Invoke-BuildAllBackend $extraOpts)) { $backendResult = 1 }
    if (-not $skipFe) {
        Write-Info '========== 编译前端 =========='
        if (-not (Invoke-BuildFrontend $extraOpts)) { $frontendResult = 1 }
    } else {
        Write-Info '========== 已指定跳过前端（--backend-only / --no-frontend）=========='
    }

    Write-Host ''
    Write-Info '========== 全量编译完成 =========='
    if ($backendResult -eq 0 -and $frontendResult -eq 0) {
        Write-Success '全量编译成功'
        Write-Host ''
        Write-Info '提示：接下来可启动服务'
        Write-Host "  .\topems.ps1 start-all                       # 启动全部服务+前端"
        Write-Host "  .\topems.ps1 start-all --only-core           # 只启动核心服务"
        Write-Host "  .\topems.ps1 run                             # 一键启动 DB+Redis+所有服务"
        return 0
    }
    Write-Error2 "全量编译失败（后端=$backendResult 前端=$frontendResult）"
    return 1
}

# ---------- 后端测试 ----------
function Invoke-TestBackend([string[]]$allArgs) {
    if (-not (Invoke-Preflight @allArgs)) { return 1 }
    Write-Info '运行后端测试...'
    Push-Location $ProjectRoot
    try {
        & cargo test --release --workspace 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -eq 0) { Write-Success '所有后端测试通过'; return 0 }
        Write-Error2 '后端测试失败'
        return 1
    } finally { Pop-Location }
}

# ---------- 前端测试 ----------
function Invoke-TestFrontend([string[]]$allArgs) {
    $subcmd = 'all'; $doTypecheck = $true; $shardIndex = ''
    foreach ($arg in $allArgs) {
        switch ($arg) {
            '--no-typecheck' { $doTypecheck = $false }
            { $_ -in @('all','unit','component','smoke','coverage') } { $subcmd = $_ }
            { $_ -like 'shard:*' } { $subcmd = 'shard'; $shardIndex = $_.Substring(6) }
            default { Write-Warning2 "未知参数: $arg（已忽略）" }
        }
    }
    $typecheckStr = if ($doTypecheck) { 'ON' } else { 'OFF' }
    Write-Info "运行前端测试（subcmd=${subcmd}, typecheck=${typecheckStr}）..."

    $pkgCmd = Get-PkgCmd
    if (-not $pkgCmd) { return 1 }
    if (-not (Ensure-FrontendDeps $pkgCmd)) { return 1 }

    $webDir = Join-Path $ProjectRoot 'apps\web'
    $pkgScripts = @{}
    $pkgJson = Join-Path $webDir 'package.json'
    if (Test-Path $pkgJson) {
        try {
            $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
            if ($pkg.scripts) { $pkg.scripts.PSObject.Properties | ForEach-Object { $pkgScripts[$_.Name] = $_.Value } }
        } catch { }
    }
    function Has-Script2([string]$name) { return $pkgScripts.ContainsKey($name) }

    # 映射 script 名
    $scriptName = switch ($subcmd) {
        'all'       { 'test' }
        'unit'      { 'test:unit' }
        'component' { 'test:component' }
        'smoke'     { 'test:smoke' }
        'coverage'  { 'test:coverage' }
        'shard'     { if ($shardIndex) { "test:shard:$shardIndex" } else { 'test:shard' } }
    }
    if (-not $scriptName -or -not (Has-Script2 $scriptName)) {
        Write-Error2 "apps/web/package.json 未定义脚本: $scriptName（可用: test, test:unit, test:component, test:smoke, test:coverage, test:shard:1..8）"
        return 1
    }

    $pkgExe = Resolve-PkgCommand $pkgCmd

    # 前置 typecheck（默认开启）
    if ($doTypecheck) {
        if (Has-Script2 'typecheck') {
            Write-Info "  [1/2] 类型检查: $pkgCmd typecheck"
            $logTc = Join-Path $TmpDir 'topems-test-frontend-typecheck.log'
            Push-Location $webDir
            try {
                $tcOut = & $pkgExe typecheck 2>&1
                $tcRc = $LASTEXITCODE
                $tcOut | Out-File $logTc -Encoding UTF8
                $tcOut | ForEach-Object { Write-Host $_ }
            } finally { Pop-Location }
            if ($tcRc -ne 0) {
                Write-Error2 "类型检查失败（$pkgCmd typecheck），摘要如下："
                if (Test-Path $logTc) { Get-Content $logTc -Tail 30 | ForEach-Object { Write-Host $_ } }
                Write-Detail "完整日志: $logTc"
                return 1
            }
            Write-Success '  [1/2] 类型检查通过'
        } else {
            Write-Warning2 '  [1/2] apps/web 未定义 typecheck 脚本，跳过类型检查'
        }
    } else {
        Write-Info '  [1/2] 已指定 --no-typecheck，跳过类型检查'
    }

    # 执行 vitest
    $stepLabel = if ($doTypecheck) { '[2/2]' } else { '[1/1]' }
    $logTest = Join-Path $TmpDir "topems-test-frontend-$subcmd$(if ($shardIndex) { "-$shardIndex" } else { '' }).log"
    Write-Info "  $stepLabel 测试: $pkgCmd run $scriptName"
    Write-Info "  工作目录: $webDir"
    Write-Info "  完整日志: $logTest"

    Push-Location $webDir
    try {
        $tOut = & $pkgExe run $scriptName 2>&1
        $rc = $LASTEXITCODE
        $tOut | Out-File $logTest -Encoding UTF8
    } finally { Pop-Location }

    # 提取 summary 行（vitest 输出末几行固定模式，含 ANSI 颜色码）
    $testFilesLine = ''; $testsLine = ''
    if (Test-Path $logTest) {
        $lines = Get-Content $logTest
        $tf = $lines | Select-String -Pattern 'Test Files.*passed' | Select-Object -Last 1
        $ts = $lines | Select-String -Pattern '^.*Tests.*passed' | Select-Object -Last 1
        if ($tf) { $testFilesLine = (Strip-Ansi $tf.Line) }
        if ($ts) { $testsLine = (Strip-Ansi $ts.Line) }
    }

    if ($rc -eq 0) {
        Write-Success '前端测试通过'
        if ($testFilesLine) { Write-Detail "  $testFilesLine" }
        if ($testsLine) { Write-Detail "  $testsLine" }
        return 0
    }
    Write-Error2 "前端测试失败（exit=$rc）"
    if ($testFilesLine) { Write-Detail "  $testFilesLine" }
    if ($testsLine) { Write-Detail "  $testsLine" }
    Write-Detail '失败摘要（日志末 40 行）:'
    if (Test-Path $logTest) { Get-Content $logTest -Tail 40 | ForEach-Object { Write-Host $_ } }
    Write-Detail "完整日志: $logTest"
    return $rc
}

# ANSI 清洗（删除 \e[...m 序列）
function Strip-Ansi([string]$s) {
    if (-not $s) { return '' }
    return [regex]::Replace($s, "`e\[[0-9;]*[mK]", '')
}

# ---------- 运行所有测试 ----------
function Invoke-TestAll {
    Write-Info '========== 运行所有测试 =========='
    $backendResult = 0; $frontendResult = 0
    if (-not (Invoke-TestBackend @())) { $backendResult = 1 }
    Write-Info '========== 运行前端测试 =========='
    if (-not (Invoke-TestFrontend @())) { $frontendResult = 1 }
    Write-Host ''
    Write-Info '========== 测试完成 =========='
    if ($backendResult -eq 0 -and $frontendResult -eq 0) { Write-Success '所有测试通过'; return 0 }
    Write-Error2 '测试失败'
    return 1
}

# ---------- 端口环境变量名映射 ----------
function Get-PortEnvVar([string]$name) {
    switch ($name) {
        'iam'           { return 'CORE_PORT' }
        'pm'            { return 'PM_PORT' }
        'erp'           { return 'ERP_PORT' }
        'finance'       { return 'FINANCE_PORT' }
        'ai'            { return 'AI_PORT' }
        'hrm'           { return 'HRM_PORT' }
        'crm'           { return 'CRM_PORT' }
        'mes'           { return 'MES_PORT' }
        'pdm'           { return 'PDM_PORT' }
        'scm'           { return 'SCM_PORT' }
        'wms'           { return 'WMS_PORT' }
        'srm'           { return 'SRM_PORT' }
        'qms'           { return 'QMS_PORT' }
        'lims'          { return 'LIMS_PORT' }
        'ehs'           { return 'EHS_PORT' }
        'rd'            { return 'RD_PORT' }
        { $_ -in @('bi','analytics') } { return 'ANALYTICS_PORT' }
        'portal'        { return 'PORTAL_PORT' }
        'mobile'        { return 'MOBILE_PORT' }
        'gis'           { return 'GIS_PORT' }
        'integration'   { return 'INTEGRATION_PORT' }
        'search'        { return 'SEARCH_PORT' }
        'communication' { return 'COMMUNICATION_PORT' }
        'ticket'        { return 'TICKET_PORT' }
        'master-data'   { return 'MASTER_DATA_PORT' }
        'monitor'       { return 'MONITOR_PORT' }
        'plugin-registry' { return 'PLUGIN_REGISTRY_PORT' }
        default         { return 'SERVER_PORT' }
    }
}

# ---------- 启动服务（内部，后台进程） ----------
function Start-ServiceInternal([string]$serviceName, [int]$port, [string]$exePath) {
    Push-Location $ProjectRoot
    try {
        $logFile = Join-Path $TmpDir "topems-$serviceName.log"
        $errFile = Join-Path $TmpDir "topems-$serviceName.err.log"
        $portEnvVar = Get-PortEnvVar $serviceName

        # 设置环境变量（仅对子进程生效，随后恢复）
        $savedVars = @{}
        if ($serviceName -eq 'iam') { $savedVars['CORE_PORT'] = $env:CORE_PORT; $env:CORE_PORT = "$port" }
        else { $savedVars['SERVER_PORT'] = $env:SERVER_PORT; $env:SERVER_PORT = "$port" }
        $savedVars[$portEnvVar] = [Environment]::GetEnvironmentVariable($portEnvVar, 'Process'); [Environment]::SetEnvironmentVariable($portEnvVar, "$port", 'Process')

        try {
            $p = Start-Process -FilePath $exePath `
                -RedirectStandardOutput $logFile `
                -RedirectStandardError $errFile `
                -WindowStyle Hidden -PassThru
            return $p.Id
        } finally {
            # 恢复环境变量
            foreach ($k in $savedVars.Keys) {
                if ($null -eq $savedVars[$k]) { Remove-Item "env:$k" -ErrorAction SilentlyContinue }
                else { Set-Item "env:$k" $savedVars[$k] }
            }
        }
    } finally { Pop-Location }
}

# ---------- 启动单个服务 ----------
function Start-ServiceApp([string]$serviceName, [string]$force) {
    $servicePath = Get-ServicePath $serviceName
    $port = Get-ServicePort $serviceName
    if (-not $servicePath) { Write-Error2 "服务 $serviceName 不存在"; return 1 }
    if (-not $port) { Write-Error2 "无法获取服务 $serviceName 的端口"; return 1 }

    Write-Info "启动 $serviceName 服务..."

    if (Test-Port $port) {
        $pidVal = Get-ServicePid $serviceName $port
        if ($pidVal) {
            Write-Warning2 "$serviceName 服务已在运行 (PID: $pidVal, 端口: $port)"
            if ($force -eq 'true') { Write-Info '强制重启...'; Stop-ServiceApp $serviceName | Out-Null; }
            else { return 0 }
        } else {
            Write-Warning2 "端口 $port 已被占用"
            if ($force -ne 'true') { Write-Info '使用 --force 强制清理端口'; return 1 }
        }
    }

    $executableName = Get-ExecutableName $serviceName
    $executablePath = Join-Path $ProjectRoot "target\release\$executableName.exe"

    # 共享可执行文件检测：同名二进制已被其它服务占用则跳过
    $running = Get-Process -Name $executableName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($running -and $executableName -ne 'topems-unified-core') {
        $otherService = $null
        foreach ($line in $Script:ServicesConfig) {
            $p = $line -split '\s+'
            if ($p[0] -ne $serviceName -and $p[2] -eq $executableName) { $otherService = $p[0]; break }
        }
        if ($otherService) {
            Write-Info "$serviceName 与 $otherService 共享同一可执行文件，$otherService 已在运行，跳过 $serviceName"
            return 0
        }
    }

    # 可执行文件不存在则先编译
    if (-not (Test-Path $executablePath)) {
        Write-Warning2 "可执行文件不存在，开始编译..."
        if (-not (Invoke-BuildService $serviceName '' $null)) { return 1 }
    }

    Load-Env

    # AI 服务依赖 Ollama
    if ($serviceName -eq 'ai') {
        $ollamaOk = $false
        try { $r = Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; $ollamaOk = ($r.StatusCode -eq 200) } catch { }
        if (-not $ollamaOk) {
            Write-Info 'AI 服务需要 Ollama，正在启动...'
            $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
            if ($ollamaCmd) {
                $ollamaLog = Join-Path $TmpDir 'ollama.log'
                Start-Process -FilePath $ollamaCmd.Source -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput $ollamaLog -RedirectStandardError "$ollamaLog.err"
                Start-Sleep 5
                try { $r = Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; $ollamaOk = ($r.StatusCode -eq 200) } catch { }
                if ($ollamaOk) { Write-Success 'Ollama 启动成功' }
                else { Write-Warning2 'Ollama 启动失败，请手动启动: ollama serve' }
            } else {
                Write-Warning2 'Ollama 未安装，请先安装（Windows 可访问 ollama.com 下载安装包）'
            }
        }
    }

    # 启动 + 重试
    $retries = 0; $delay = $Script:RetryDelay; $pidVal = $null
    while ($retries -lt $Script:MaxRetries) {
        if ($retries -gt 0) {
            Write-Warning2 "$serviceName 服务启动失败，第 $retries/$($Script:MaxRetries) 次重试，等待 ${delay}s..."
            Start-Sleep -Seconds $delay
            $delay = $delay * $Script:BackoffFactor
        }

        $pidVal = Start-ServiceInternal $serviceName $port $executablePath

        # 轮询等待端口就绪（最长 READY_TIMEOUT）
        $waited = 0; $ready = $false
        while ($waited -lt $Script:ReadyTimeout) {
            if (Test-Port $port) { $ready = $true; break }
            if (-not (Get-Process -Id $pidVal -ErrorAction SilentlyContinue)) { break }
            Start-Sleep 2
            $waited += 2
        }

        if ($ready) {
            Write-Success "$serviceName 服务启动成功 (PID: $pidVal, 端口: $port, 就绪耗时 ${waited}s)"
            if ($serviceName -ne 'iam') {
                if (-not (Register-Plugin $serviceName)) {
                    Add-Content -Path (Join-Path $TmpDir 'topems-register-failed.log') -Value $serviceName -Encoding UTF8
                }
            }
            return 0
        } else {
            $failedPid = Get-ServicePid $serviceName $port
            if ($failedPid) { Stop-Process -Id $failedPid -Force -ErrorAction SilentlyContinue; Start-Sleep 1 }
            $retries++
        }
    }

    Write-Error2 "$serviceName 服务启动失败，已重试 $($Script:MaxRetries) 次，请查看日志: $TmpDir\topems-$serviceName.log"
    $logFile = Join-Path $TmpDir "topems-$serviceName.log"
    $errFile = Join-Path $TmpDir "topems-$serviceName.err.log"
    if (Test-Path $logFile) { Get-Content $logFile -Tail 20 | ForEach-Object { Write-Host $_ } }
    if (Test-Path $errFile) { Get-Content $errFile -Tail 20 | ForEach-Object { Write-Host $_ } }
    return 1
}

# ---------- 停止服务 ----------
function Stop-ServiceApp([string]$serviceName) {
    $port = Get-ServicePort $serviceName
    if (-not $port) { Write-Error2 "无法获取服务 $serviceName 的端口"; return 1 }

    Write-Info "停止 $serviceName 服务..."
    if (Test-Port $port) {
        $pidVal = Get-ServicePid $serviceName $port
        if ($pidVal) {
            Stop-Process -Id $pidVal -ErrorAction SilentlyContinue
            Start-Sleep 1
            if (-not (Test-Port $port)) {
                Write-Success "$serviceName 服务已停止"
                return 0
            }
            Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
            Start-Sleep 1
            if (-not (Test-Port $port)) { Write-Success "$serviceName 服务已强制停止" }
            else { Write-Error2 "无法停止 $serviceName 服务" }
        } else {
            Write-Warning2 '未找到运行中的进程'
        }
    } else {
        Write-Warning2 "$serviceName 服务未运行"
    }
    return 0
}

# ---------- 查看服务状态 ----------
function Get-StatusService([string]$serviceName) {
    $port = Get-ServicePort $serviceName
    if (-not $port) { Write-Host "[ERROR] ${serviceName}: 无法获取端口" -ForegroundColor Red; return 1 }

    if (Test-Port $port) {
        $pidVal = Get-ServicePid $serviceName $port
        $healthy = $false
        try { $r = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; $healthy = ($r.StatusCode -eq 200) } catch { }
        if ($healthy) {
            Write-Host "$serviceName (端口 $port) 运行中 (PID: $pidVal) [健康]" -ForegroundColor Green
        } else {
            Write-Host "$serviceName (端口 $port) 运行中 (PID: $pidVal) [健康检查失败]" -ForegroundColor Yellow
        }
    } else {
        $executableName = Get-ExecutableName $serviceName
        $running = Get-Process -Name $executableName -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($running -and $executableName -ne 'topems-unified-core') {
            $provider = $null
            foreach ($line in $Script:ServicesConfig) {
                $p = $line -split '\s+'
                if ($p[0] -ne $serviceName -and $p[2] -eq $executableName) { $provider = $p[0]; break }
            }
            if ($provider) {
                $providerPort = Get-ServicePort $provider
                $healthy = $false
                try { $r = Invoke-WebRequest -Uri "http://localhost:$providerPort/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; $healthy = ($r.StatusCode -eq 200) } catch { }
                if ($healthy) {
                    Write-Host "$serviceName (端口 $port) 由 $provider 服务提供 [健康]" -ForegroundColor Green
                    return
                }
            }
        }
        Write-Host "$serviceName (端口 $port) 未运行" -ForegroundColor Red
    }
}

# ---------- 查看日志 ----------
function Show-LogsService([string]$serviceName, [int]$lines) {
    $logFile = Join-Path $TmpDir "topems-$serviceName.log"
    $errFile = Join-Path $TmpDir "topems-$serviceName.err.log"
    if (Test-Path $logFile) {
        Get-Content $logFile -Tail $lines
        if (Test-Path $errFile) {
            Write-Host ''
            Write-Host "--- stderr (tail $lines) ---" -ForegroundColor DarkGray
            Get-Content $errFile -Tail $lines
        }
    } elseif (Test-Path $errFile) {
        Get-Content $errFile -Tail $lines
    } else {
        Write-Error2 '日志文件不存在'
        return 1
    }
    return 0
}
# ---------- 服务显示名称 / 描述 ----------
function Get-ServiceDisplayName([string]$name) {
    switch ($name) {
        'iam'        { return '统一认证服务' }
        'pm'         { return '项目管理' }
        'erp'        { return 'ERP系统' }
        'finance'    { return '财务管理' }
        'ai'         { return 'AI服务' }
        'hrm'        { return '人力资源' }
        'crm'        { return '客户关系' }
        'mes'        { return '生产制造' }
        'pdm'        { return '产品数据' }
        'scm'        { return '供应链管理' }
        'wms'        { return '仓储管理' }
        'srm'        { return '供应商管理' }
        'qms'        { return '质量管理' }
        'lims'       { return '实验室管理' }
        'ehs'        { return '环境健康安全' }
        'rd'         { return '研发服务' }
        'bi'         { return '商业智能' }
        'portal'     { return '门户服务' }
        'mobile'     { return '移动服务' }
        'gis'        { return '地理信息' }
        'integration'{ return '集成服务' }
        'communication'{ return '通讯服务' }
        'feedback'   { return '反馈服务' }
        'master-data'{ return '主数据服务' }
        'search'     { return '搜索服务' }
        'ticket'     { return '工单服务' }
        default      { return "$($name.Substring(0,1).ToUpper() + $name.Substring(1))服务" }
    }
}
function Get-ServiceDescription([string]$name) {
    switch ($name) {
        'iam'        { return '统一身份认证与权限管理服务' }
        'pm'         { return '项目管理服务' }
        'erp'        { return '企业资源计划系统' }
        'finance'    { return '财务管理服务' }
        'ai'         { return 'AI智能服务' }
        'hrm'        { return '人力资源管理系统' }
        'crm'        { return '客户关系管理系统' }
        'mes'        { return '生产制造执行系统' }
        'pdm'        { return '产品数据管理系统' }
        'scm'        { return '供应链管理系统' }
        'wms'        { return '仓储管理系统' }
        'srm'        { return '供应商关系管理' }
        'qms'        { return '质量管理系统' }
        'lims'       { return '实验室信息管理系统' }
        'ehs'        { return '环境健康安全管理' }
        'rd'         { return '研发服务管理' }
        'bi'         { return '商业智能分析服务' }
        'portal'     { return '企业门户服务' }
        'mobile'     { return '移动应用服务' }
        'gis'        { return '地理信息服务' }
        'integration'{ return '系统集成服务' }
        'communication'{ return 'IM/通知/邮件/短信等通讯能力统一服务' }
        'feedback'   { return '意见反馈与满意度调查服务' }
        'master-data'{ return '企业级主数据统一管理服务' }
        'search'     { return 'Elasticsearch全文检索与搜索聚合服务' }
        'ticket'     { return '工单与服务请求流程引擎服务' }
        default      { return "$($name.Substring(0,1).ToUpper() + $name.Substring(1))服务" }
    }
}

# ---------- 等待 plugin-registry 注册接口就绪 ----------
function Wait-PluginRegistry {
    $registryUrl = 'http://localhost:8096'
    $maxWait = 15; $interval = 1; $waited = 0
    while ($waited -lt $maxWait) {
        try {
            $health = (Invoke-WebRequest -Uri "$registryUrl/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop).StatusCode
        } catch { $health = '000' }
        if ($health -eq 200) {
            try {
                $testResp = (Invoke-WebRequest -Uri "$registryUrl/dev/runtime/ping/register" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop).StatusCode
            } catch { $testResp = '000' }
            if ($testResp -ne '000') { return $true }
        }
        Start-Sleep -Seconds $interval
        $waited += $interval
    }
    return $false
}

# ---------- 安全解析 JSON 字段 ----------
function Get-SafeJsonField([string]$json, [string]$field, [string]$default) {
    if (-not $json) { return $default }
    try {
        $data = $json | ConvertFrom-Json
        $prop = $data.PSObject.Properties[$field]
        if ($prop) { return [string]$prop.Value }
        return $default
    } catch { return $default }
}

# ---------- 注册服务到 plugin-registry（含重试与指数退避） ----------
function Register-Plugin([string]$serviceName) {
    $port = Get-ServicePort $serviceName
    if (-not $port) { return $false }

    $registryUrl = 'http://localhost:8096'
    $maxRetries = 5; $initialDelay = 2; $maxDelay = 30

    $displayName = Get-ServiceDisplayName $serviceName
    $description = Get-ServiceDescription $serviceName
    $runtimeUrl = "http://localhost:$port"
    $pluginToken = $env:PLUGIN_REGISTRATION_TOKEN

    $attempt = 1; $delay = $initialDelay
    while ($attempt -le $maxRetries) {
        if ($attempt -eq 1) {
            if (-not (Wait-PluginRegistry)) {
                Write-Warning2 "plugin-registry 注册接口未就绪，$serviceName 跳过注册（将在全部启动后重试）"
                return $false
            }
        } else {
            Start-Sleep -Seconds $delay
            $delay = $delay * 2
            if ($delay -gt $maxDelay) { $delay = $maxDelay }
        }

        Write-Detail "注册 $serviceName (第 $attempt/$maxRetries 次)..."

        $body = @{
            code        = $serviceName
            name        = $displayName
            description = $description
            version     = '0.1.0'
            runtime_url = $runtimeUrl
            permissions = @()
            category    = 'business'
        } | ConvertTo-Json

        $headers = @{ 'Content-Type' = 'application/json' }
        if ($pluginToken) { $headers['X-Plugin-Token'] = $pluginToken }

        try {
            $resp = Invoke-RestMethod -Method Post -Uri "$registryUrl/dev/runtime/$serviceName/register" `
                -Headers $headers -Body $body -ContentType 'application/json' -TimeoutSec 10
        } catch {
            $attempt++
            continue
        }
        if (-not $resp) { $attempt++; continue }

        $success = Get-SafeJsonField ($resp | ConvertTo-Json -Compress) 'success' 'False'
        if ($success -eq 'True') {
            Write-Success "$serviceName 注册成功"
            # 从失败列表中移除
            $failedLog = Join-Path $TmpDir 'topems-register-failed.log'
            if (Test-Path $failedLog) {
                $new = Get-Content $failedLog | Where-Object { $_ -ne $serviceName }
                if ($new) { Set-Content $failedLog $new -Encoding UTF8 } else { Remove-Item $failedLog -Force -ErrorAction SilentlyContinue }
            }
            return $true
        }
        $msg = Get-SafeJsonField ($resp | ConvertTo-Json -Compress) 'message' ''
        if ($msg) { Write-Warning2 "$serviceName 注册失败: $msg" }
        $attempt++
    }
    Write-Warning2 "$serviceName 注册失败（已重试 $maxRetries 次），将在全部服务启动后再次尝试"
    return $false
}

# ---------- 批量注册所有服务 ----------
function Register-AllPlugins {
    if (-not (Wait-PluginRegistry)) {
        Write-Error2 'plugin-registry 注册接口未就绪，请先启动服务'
        return 1
    }
    Write-Info '批量注册所有服务到 plugin-registry...'
    $servicesToRegister = New-Object System.Collections.ArrayList
    foreach ($service in (Get-AllServices)) {
        if ($Script:CoreServices -contains $service) { continue }
        $port = Get-ServicePort $service
        if (Test-Port $port) { [void]$servicesToRegister.Add($service) }
        else { Write-Warning2 "$service 未运行，跳过注册" }
    }
    Write-Info "待注册 $($servicesToRegister.Count) 个服务..."
    $successCount = 0; $failCount = 0
    foreach ($svc in $servicesToRegister) {
        if (Register-Plugin $svc) { $successCount++ } else { $failCount++ }
    }
    Write-Host ''
    Write-Info "注册汇总: 成功 $successCount, 失败 $failCount"
    if ($failCount -eq 0) { Write-Success '所有服务注册完成'; return 0 }
    Write-Warning2 '部分服务注册失败'
    return $failCount
}

# ---------- 检查并重启异常服务 ----------
function Check-AndRestartServices {
    Write-Info '检查服务状态并自动重启...'
    $restarted = 0; $running = 0; $total = 0
    foreach ($service in (Get-AllServices)) {
        $total++
        $port = Get-ServicePort $service
        if (Test-Port $port) { $running++ }
        else {
            Write-Warning2 "$service 未运行，自动重启..."
            if (Start-ServiceApp $service 'false') { $restarted++ }
            else { Write-Error2 "$service 重启失败" }
        }
    }
    Write-Host ''
    if ($restarted -eq 0) { Write-Success "所有服务运行正常 (${running}/${total})" }
    else { Write-Info "已重启 ${restarted} 个服务" }
}

# ---------- 等待核心服务就绪 ----------
function Wait-CoreServices {
    Write-Info '等待核心服务就绪...'
    $maxWait = 60; $waitInterval = 2; $elapsed = 0
    foreach ($service in $Script:CoreServices) {
        $port = Get-ServicePort $service
        while ($elapsed -lt $maxWait) {
            $healthy = $false
            if (Test-Port $port) {
                try { $r = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; $healthy = ($r.StatusCode -eq 200) } catch { }
            }
            if ($healthy) { Write-Success "$service 服务就绪"; break }
            Start-Sleep -Seconds $waitInterval
            $elapsed += $waitInterval
        }
        if ($elapsed -ge $maxWait) { Write-Warning2 "$service 服务未在 $maxWait 秒内就绪" }
    }
}

# ---------- 启动所有服务 ----------
function Start-AllServices([string[]]$allArgs) {
    if (-not (Invoke-Preflight @allArgs)) { return 1 }
    $extraOpts = ($allArgs | Where-Object { $_ -ne '--skip-preflight' }) -join ' '
    Write-Info '启动所有服务...'
    Load-Env

    $onlyCore = $false; $skipFe = $false; $noRegister = $false
    $skipPackages = @()
    foreach ($opt in ($extraOpts -split '\s+')) {
        if (-not $opt) { continue }
        switch -Wildcard ($opt) {
            '--only-core'   { $onlyCore = $true }
            '--no-frontend' { $skipFe = $true }
            '--no-register' { $noRegister = $true }
            '--skip=*'      { $skipPackages += $opt.Substring(7) }
        }
    }

    $successCount = 0; $failCount = 0
    $registerFailedLog = Join-Path $TmpDir 'topems-register-failed.log'
    if (Test-Path $registerFailedLog) { Remove-Item $registerFailedLog -Force -ErrorAction SilentlyContinue }

    Write-Info '========== [1/3] 启动核心服务 (iam=unified-core) =========='
    foreach ($service in $Script:CoreServices) {
        if ($skipPackages -contains $service) { Write-Warning2 "跳过 $service (--skip)"; continue }
        if (Start-ServiceApp $service 'false') { $successCount++ } else { $failCount++ }
    }
    Wait-CoreServices

    if (-not $noRegister) {
        Write-Info '等待 plugin-registry 注册接口就绪...'
        if (Wait-PluginRegistry) { Write-Success 'plugin-registry 注册接口已就绪' }
        else { Write-Warning2 'plugin-registry 注册接口未就绪，注册将在服务启动后自动重试' }
    }

    if ($onlyCore) {
        Write-Info '========== --only-core 指定，仅启动核心服务，退出 =========='
    } else {
        Write-Info '========== [2/3] 启动其他服务 =========='
        $svcStartOrder = @()
        foreach ($service in (Get-AllServices)) {
            if ($Script:CoreServices -contains $service) { continue }
            if ($skipPackages -contains $service) { continue }
            $svcStartOrder += $service
        }
        foreach ($service in $svcStartOrder) {
            if (Start-ServiceApp $service 'false') { $successCount++ } else { $failCount++ }
        }

        # 全部服务启动后，统一重试注册失败的服务
        if (-not $noRegister -and (Test-Path $registerFailedLog)) {
            $failedSvcs = @(Get-Content $registerFailedLog -ErrorAction SilentlyContinue | Where-Object { $_ })
            if ($failedSvcs.Count -gt 0) {
                Write-Host ''
                Write-Info "========== [2b/3] 重试注册失败的服务 ($($failedSvcs.Count) 个) =========="
                foreach ($svc in $failedSvcs) {
                    if (Register-Plugin $svc) { Write-Success "$svc 重新注册成功" }
                    else { Write-Warning2 "$svc 重新注册仍失败" }
                }
            }
        }
    }

    if ($skipFe) {
        Write-Info '========== [3/3] 已指定 --no-frontend，跳过前端 =========='
    } else {
        Write-Info '========== [3/3] 启动前端 =========='
        if (Start-Frontend) { $successCount++ } else { $failCount++ }
    }

    Write-Host ''
    Write-Info '========== 启动汇总 =========='
    Write-Info "成功: $successCount   失败: $failCount"
    Write-Info "查看日志: Get-ChildItem $TmpDir\topems-*.log"
    Write-Info "健康检查: .\topems.ps1 status"
    Write-Info "停止服务: .\topems.ps1 stop-all"

    if ($failCount -eq 0) { Write-Success "所有服务启动完成 ($successCount 成功)" }
    else { Write-Warning2 "服务启动完成 ($successCount 成功, $failCount 失败)" }
    return 0
}

# ---------- 停止所有服务 ----------
function Stop-AllServices {
    Write-Info '停止所有服务...'
    foreach ($service in (Get-AllServices)) {
        Stop-ServiceApp $service | Out-Null
    }
    Stop-Frontend | Out-Null
    Remove-Item (Join-Path $TmpDir 'topems-register-failed.log') -Force -ErrorAction SilentlyContinue
}

# ---------- 启动开发环境（Windows） ----------
function Start-Dev([string[]]$allArgs) {
    if (-not (Invoke-Preflight @allArgs)) { return 1 }
    Write-Info '启动 Windows 开发环境...'

    foreach ($tool in @('cargo','node')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Write-Error2 "$tool 未安装"; return 1 }
    }
    $pkgCmd = Get-PkgCmd
    if (-not $pkgCmd) { return 1 }
    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        Write-Error2 'psql 未安装（请安装 PostgreSQL 并将其 bin 目录加入 PATH）'
        return 1
    }

    Start-Database
    Start-Redis

    if (-not (Test-Path (Join-Path $ProjectRoot '.env'))) {
        Write-Warning2 '.env 文件不存在，从示例复制...'
        Copy-Item (Join-Path $ProjectRoot '.env.example') (Join-Path $ProjectRoot '.env')
        # 生成随机 JWT_SECRET 并替换
        $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
        $bytes = New-Object byte[] 48
        $rng.GetBytes($bytes)
        $jwtSecret = [Convert]::ToBase64String($bytes) -replace '/','_' -replace '\+','-' -replace '=','.'
        $envContent = Get-Content (Join-Path $ProjectRoot '.env') -Encoding UTF8
        $envContent = $envContent | ForEach-Object {
            if ($_ -match '^JWT_SECRET=') { "JWT_SECRET=$jwtSecret" } else { $_ }
        }
        Set-Content (Join-Path $ProjectRoot '.env') $envContent -Encoding UTF8
    }

    Start-ServiceApp 'iam' 'false'

    Write-Info '启动前端服务...'
    if (-not (Test-Port 3000)) {
        if (-not (Ensure-FrontendDeps $pkgCmd)) { return 1 }
        Start-Frontend
    } else {
        Write-Warning2 '前端已在端口 3000 运行'
    }

    Write-Success '开发环境启动完成!'
    Write-Host ''
    Write-Host '服务状态:'
    Show-AllStatus
    return 0
}

# ---------- 前端进程 PID ----------
function Get-FrontendPid {
    $list = @()
    try {
        $procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop | Where-Object {
            $_.CommandLine -and ($_.CommandLine -match 'vite|tsc.*watch|topems-web')
        }
        foreach ($p in $procs) {
            if ($p.CommandLine -match 'apps/web|topems') { $list += $p.ProcessId }
        }
    } catch { }
    return ($list | Sort-Object -Unique | Select-Object -First 5)
}

# ---------- 启动前端 ----------
function Start-Frontend {
    Write-Info '启动前端服务...'
    $pkgCmd = Get-PkgCmd
    if (-not $pkgCmd) { return 1 }
    if (-not (Ensure-FrontendDeps $pkgCmd)) { return 1 }

    if (Test-Port 3000) {
        Write-Info '前端已在端口 3000 运行'
        return 0
    }

    $fePid = $null
    $existingPid = Get-FrontendPid
    if ($existingPid) {
        Write-Info "前端进程已存在 (PID: $($existingPid -join ','))，等待端口就绪..."
    } else {
        $pkgExe = Resolve-PkgCommand $pkgCmd
        $frontendDir = Join-Path $ProjectRoot 'apps\web'
        $webLog = Join-Path $TmpDir 'topems-web.log'
        $webErr = Join-Path $TmpDir 'topems-web.err.log'
        $bindHost = if ($env:FRONTEND_BIND_HOST) { $env:FRONTEND_BIND_HOST } else { '127.0.0.1' }
        Push-Location $frontendDir
        try {
            $p = Start-Process -FilePath $pkgExe -ArgumentList @('run','dev','--','--port','3000','--host',$bindHost) `
                -WindowStyle Hidden -RedirectStandardOutput $webLog -RedirectStandardError $webErr -PassThru
            $fePid = $p.Id
        } finally { Pop-Location }
    }

    # 轮询等待端口就绪（最长 120s）
    $waited = 0; $interval = 3; $maxWait = 120
    while ($waited -lt $maxWait) {
        if (Test-Port 3000) {
            $showPid = if ($fePid) { $fePid } else { $existingPid -join ',' }
            Write-Success "前端服务启动成功 (PID: $showPid, 端口: 3000, 用时: ${waited}s)"
            return 0
        }
        Start-Sleep -Seconds $interval
        $waited += $interval
    }

    # 超过 max_wait：端口未开但进程仍活着（仍在编译中）
    $stillPid = Get-FrontendPid
    if ($stillPid) {
        Write-Warning2 "前端服务仍在启动中 (PID: $($stillPid -join ',')),端口 3000 暂未就绪（tsc 类型检查 / vite 预构建通常需要 30~90 秒）。"
        Write-Detail '日志: Get-Content %TEMP%\topems\topems-web.log -Wait'
        Write-Detail '稍后再查看: .\topems.ps1 status'
        return 0
    }
    Write-Error2 "前端服务启动失败，请查看日志: $TmpDir\topems-web.log"
    $webLog = Join-Path $TmpDir 'topems-web.log'
    $webErr = Join-Path $TmpDir 'topems-web.err.log'
    if (Test-Path $webLog) { Get-Content $webLog -Tail 20 | ForEach-Object { Write-Host $_ } }
    if (Test-Path $webErr) { Get-Content $webErr -Tail 20 | ForEach-Object { Write-Host $_ } }
    return 1
}

# ---------- 停止前端 ----------
function Stop-Frontend {
    Write-Info '停止前端服务...'
    $pids = New-Object System.Collections.Generic.HashSet[int]
    foreach ($c in (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
        [void]$pids.Add([int]$c.OwningProcess)
    }
    foreach ($p in (Get-FrontendPid)) { [void]$pids.Add([int]$p) }
    if ($pids.Count -gt 0) {
        foreach ($p in $pids) { Stop-Process -Id $p -ErrorAction SilentlyContinue }
        Start-Sleep 1
        foreach ($p in $pids) {
            if (Get-Process -Id $p -ErrorAction SilentlyContinue) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
        }
        Write-Success "前端服务已停止 (PID: $($pids -join ' '))"
    } else {
        Write-Warning2 '前端服务未运行'
    }
}

# ---------- 显示所有服务状态 ----------
function Show-AllStatus {
    Write-Host ''
    Write-Info 'TOPEMS 服务状态'
    Write-Host '=================================================='
    $runningCount = 0; $totalCount = 0
    foreach ($service in (Get-AllServices)) {
        Get-StatusService $service
        $totalCount++
        if (Test-Port (Get-ServicePort $service)) { $runningCount++ }
    }
    if (Test-Port 3000) {
        Write-Host '前端 (端口 3000) 运行中' -ForegroundColor Green
        $runningCount++
    } else {
        $fePid = Get-FrontendPid
        if ($fePid) {
            Write-Host "前端 (端口 3000) 启动中 (PID: $($fePid -join ','), 仍在编译/预构建，通常需要 30~90 秒)" -ForegroundColor Yellow
        } else {
            Write-Host '前端 (端口 3000) 未运行' -ForegroundColor Red
        }
    }
    $totalCount++
    Write-Host '=================================================='
    Write-Info "状态统计: ${runningCount}/${totalCount} 服务运行中"
}

# ---------- WebSocket 连接检查 ----------
function Invoke-WsCheck {
    Write-Info '=== WebSocket 连接检查 ==='
    $wsEndpoints = @(
        '通知服务|/ws/core/notifications|8000'
        'IM服务|/ws/core/im|8000'
        'MES仪表盘|/ws/mes/dashboard|8030'
        'GIS服务|/ws/gis|8071'
    )
    $frontendRunning = Test-Port 3000
    $accessibleCount = 0; $totalCount = $wsEndpoints.Count

    foreach ($endpoint in $wsEndpoints) {
        $parts = $endpoint -split '\|'
        $name = $parts[0]; $path = $parts[1]; $port = [int]$parts[2]
        $backendRunning = Test-Port $port

        $wsHeaders = @{
            'Upgrade' = 'websocket'
            'Connection' = 'Upgrade'
            'Sec-WebSocket-Key' = 'dGhlIHNhbXBsZSBub25jZQ=='
            'Sec-WebSocket-Version' = '13'
        }
        if ($frontendRunning) {
            $url = "http://localhost:3000$path"
        } elseif ($backendRunning) {
            $url = "http://localhost:$port$path"
        } else {
            Write-Host "$name ($path) 服务未运行 (端口 $port)" -ForegroundColor Red
            continue
        }
        $status = '000'
        try {
            $r = Invoke-WebRequest -Uri $url -Headers $wsHeaders -UseBasicParsing -TimeoutSec 2 -SkipHttpErrorCheck -ErrorAction Stop
            $status = [string]$r.StatusCode
        } catch { }
        switch ($status) {
            '101' { Write-Host "$name ($path) 可访问 (状态码: 101)" -ForegroundColor Green; $accessibleCount++ }
            '401' { Write-Host "$name ($path) 可访问 (需要认证: 401)" -ForegroundColor Green; $accessibleCount++ }
            '403' { Write-Host "$name ($path) 可访问 (需要认证: 403)" -ForegroundColor Green; $accessibleCount++ }
            '503' { Write-Host "$name ($path) 后端服务未响应" -ForegroundColor Yellow }
            '000' { Write-Host "$name ($path) 连接失败" -ForegroundColor Yellow }
            default { Write-Host "$name ($path) 状态码: $status" -ForegroundColor Yellow }
        }
    }
    Write-Host ''
    Write-Info "WebSocket 统计: ${accessibleCount}/${totalCount} 可访问"
    if (-not $frontendRunning) { Write-Warning2 '前端未运行，请先启动前端: topems start web' }
    Write-Host ''
    Write-Detail '路径规范: /ws/{module}/{feature}'
    Write-Detail '详细文档: docs/guides/devops/websocket-path-mapping.md'
}
# =============================================
# 数据库管理
# =============================================
# 解析 DATABASE_URL
function Parse-DatabaseUrl {
    $dbUrl = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgres://topems:topems_secret@localhost:5432/topems' }
    # 格式: postgres://user:password@host:port/database
    $m = [regex]::Match($dbUrl, '^postgres://([^:]*):([^@]*)@([^:]*):([0-9]*)/(.*)$')
    if ($m.Success) {
        $Script:DbUser = $m.Groups[1].Value
        $Script:DbHost = $m.Groups[3].Value
        $Script:DbPort = $m.Groups[4].Value
        $Script:DbName = $m.Groups[5].Value
    } else {
        $Script:DbUser = 'topems'; $Script:DbHost = 'localhost'; $Script:DbPort = '5432'; $Script:DbName = 'topems'
    }
}

# 检测 psql/pg_dump/redis-cli 是否存在
function Get-DbTool([string]$tool) {
    $c = Get-Command $tool -ErrorAction SilentlyContinue
    return $c
}

# 启动 PostgreSQL（Windows：优先 Windows 服务，其次 Docker 容器，最后提示）
function Start-Database {
    Write-Info '启动 PostgreSQL...'
    $pg = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pg) {
        if ($pg.Status -ne 'Running') {
            Start-Service -Name $pg.Name -ErrorAction SilentlyContinue
            Start-Sleep 2
        }
    } else {
        # Docker 容器方式
        $docker = Get-Command docker -ErrorAction SilentlyContinue
        if ($docker) {
            $ps = & docker ps -a --filter 'name=topems-postgres' --format '{{.Names}}' 2>$null
            if ($ps -match 'topems-postgres') {
                $running = & docker ps --filter 'name=topems-postgres' --format '{{.Names}}' 2>$null
                if (-not $running) {
                    Write-Info '检测到 Docker 容器 topems-postgres，尝试启动...'
                    & docker start topems-postgres | Out-Null
                    Start-Sleep 2
                }
            }
        }
    }

    Parse-DatabaseUrl
    $psql = Get-DbTool 'psql'
    if ($psql) {
        $test = & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -d $Script:DbName -c 'SELECT 1;' 2>$null
        if ($LASTEXITCODE -eq 0 -and $test) {
            Write-Success 'PostgreSQL 已启动'
            return 0
        }
    }
    Write-Error2 'PostgreSQL 启动失败'
    Write-Warning2 'Windows 下请确保: 1) PostgreSQL 已安装并注册为 Windows 服务；或 2) 存在 topems-postgres Docker 容器；或 3) psql 已加入 PATH。'
    return 1
}

# 停止 PostgreSQL
function Stop-Database {
    Write-Info '停止 PostgreSQL...'
    $pg = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pg -and $pg.Status -eq 'Running') {
        Stop-Service -Name $pg.Name -ErrorAction SilentlyContinue
    }
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($docker) {
        $running = & docker ps --filter 'name=topems-postgres' --format '{{.Names}}' 2>$null
        if ($running -match 'topems-postgres') { & docker stop topems-postgres | Out-Null }
    }
    Write-Success 'PostgreSQL 已停止'
}

# 启动 Redis（Windows：优先 Windows 服务，其次 Docker）
function Start-Redis {
    Write-Info '启动 Redis...'
    $redis = Get-Service -Name 'redis*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($redis) {
        if ($redis.Status -ne 'Running') {
            Start-Service -Name $redis.Name -ErrorAction SilentlyContinue
            Start-Sleep 2
        }
    } else {
        $docker = Get-Command docker -ErrorAction SilentlyContinue
        if ($docker) {
            $ps = & docker ps -a --filter 'name=topems-redis' --format '{{.Names}}' 2>$null
            if ($ps -match 'topems-redis') {
                $running = & docker ps --filter 'name=topems-redis' --format '{{.Names}}' 2>$null
                if (-not $running) { & docker start topems-redis | Out-Null; Start-Sleep 2 }
            }
        }
    }
    $redisCli = Get-DbTool 'redis-cli'
    if ($redisCli) {
        $ping = & $redisCli.Source ping 2>$null
        if ($ping -match 'PONG') { Write-Success 'Redis 已启动'; return 0 }
    }
    Write-Error2 'Redis 启动失败'
    Write-Warning2 'Windows 下请确保: 1) Redis 已安装（如 Memurai）并注册服务；或 2) 存在 topems-redis Docker 容器；或 3) redis-cli 已加入 PATH。'
    return 1
}

# 停止 Redis
function Stop-Redis {
    Write-Info '停止 Redis...'
    $redis = Get-Service -Name 'redis*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($redis -and $redis.Status -eq 'Running') { Stop-Service -Name $redis.Name -ErrorAction SilentlyContinue }
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($docker) {
        $running = & docker ps --filter 'name=topems-redis' --format '{{.Names}}' 2>$null
        if ($running -match 'topems-redis') { & docker stop topems-redis | Out-Null }
    }
    Write-Success 'Redis 已停止'
}

# 数据库状态
function Get-DatabaseStatus {
    Parse-DatabaseUrl
    Write-Info '=== PostgreSQL 状态 ==='
    $psql = Get-DbTool 'psql'
    if ($psql) {
        $test = & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -d $Script:DbName -c 'SELECT 1;' 2>$null
        if ($LASTEXITCODE -eq 0 -and $test) {
            Write-Success 'PostgreSQL 运行中'
            & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -d $Script:DbName -c 'SELECT version();' 2>$null | Select-Object -First 3 | ForEach-Object { Write-Host $_ }
        } else {
            Write-Error2 'PostgreSQL 未运行'
        }
    } else {
        Write-Error2 '未找到 psql 命令'
    }
    Write-Host ''
    Write-Info '=== Redis 状态 ==='
    $redisCli = Get-DbTool 'redis-cli'
    if ($redisCli) {
        $ping = & $redisCli.Source ping 2>$null
        if ($ping -match 'PONG') {
            Write-Success 'Redis 运行中'
            & $redisCli.Source info server 2>$null | Select-String 'redis_version' | Select-Object -First 1 | ForEach-Object { Write-Host $_ }
        } else {
            Write-Error2 'Redis 未运行'
        }
    } else {
        Write-Error2 '未找到 redis-cli 命令'
    }
}

# 数据库迁移
function Invoke-DbMigrate {
    Write-Info '运行数据库迁移...'
    Load-Env
    Parse-DatabaseUrl
    Write-Info '使用 psql 模式执行迁移文件...'
    $psql = Get-DbTool 'psql'
    if (-not $psql) { Write-Error2 '未找到 psql 命令'; return 1 }

    $migrateDirs = @(Join-Path $ProjectRoot 'migrations')
    $migrateDirs += @(Get-ChildItem -Path (Join-Path $ProjectRoot 'svc') -Directory -Recurse -Filter 'migrations' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })

    foreach ($migrateDir in ($migrateDirs | Select-Object -Unique)) {
        if (-not (Test-Path $migrateDir)) { continue }
        Write-Info "迁移目录: $migrateDir..."
        $sqlFiles = @(Get-ChildItem -Path $migrateDir -Filter '*.sql' -File -ErrorAction SilentlyContinue | Sort-Object Name)
        foreach ($file in $sqlFiles) {
            $base = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
            $version = [regex]::Match($base, '[0-9]+').Value
            if (-not $version) {
                Write-Warning2 "迁移文件 $($file.Name) 没有版本号，跳过"
                continue
            }
            # 检查是否已应用
            $check = & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -d $Script:DbName -c "SELECT version FROM _sqlx_migrations WHERE version = '$version';" 2>$null
            if ($check -match $version) {
                Write-Detail "迁移 $base 已应用，跳过"
                continue
            }
            Write-Info "执行迁移: $($file.Name)..."
            $out = & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -d $Script:DbName -f $file.FullName 2>&1
            $rc = $LASTEXITCODE
            if ($rc -eq 0) {
                $ins = "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time) VALUES ('$version', '$base', NOW(), true, 'manual', 0);"
                & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -d $Script:DbName -c $ins 2>$null | Out-Null
            } else {
                Write-Warning2 "迁移 $base 失败"
                $out | ForEach-Object { Write-Host $_ }
            }
        }
    }
    Write-Success '数据库迁移完成'
    return 0
}

# 备份数据库
function Invoke-DbBackup {
    $backupDir = Join-Path $ProjectRoot 'backups'
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupFile = Join-Path $backupDir "topems_db_${timestamp}.sql"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }

    Write-Info "备份数据库到 $backupFile..."
    Load-Env
    Parse-DatabaseUrl

    $backupSuccess = $false
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    $pgDump = Get-DbTool 'pg_dump'
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    if ($docker -and (& docker ps --format '{{.Names}}' 2>$null) -match 'postgres') {
        Write-Info '使用 Docker 执行备份...'
        $dumpOut = (& docker exec -t topems-postgres pg_dump -U $Script:DbUser $Script:DbName 2>$null | Out-String)
        [System.IO.File]::WriteAllText($backupFile, $dumpOut, $utf8NoBom)
        if ($LASTEXITCODE -eq 0) { $backupSuccess = $true }
    } elseif ($pgDump) {
        Write-Info '使用本地 psql 执行备份...'
        $dumpOut = (& $pgDump.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser $Script:DbName 2>$null | Out-String)
        [System.IO.File]::WriteAllText($backupFile, $dumpOut, $utf8NoBom)
        if ($LASTEXITCODE -eq 0) { $backupSuccess = $true }
    } else {
        Write-Error2 '未找到 pg_dump 命令，且无 Docker postgres 容器'
    }

    if ($backupSuccess -and (Test-Path $backupFile) -and ((Get-Item $backupFile).Length -gt 0)) {
        $size = (Get-Item $backupFile).Length
        Write-Success "数据库备份成功: $backupFile ($(Get-HumanSize $size))"
        return 0
    }
    if (Test-Path $backupFile) { Remove-Item $backupFile -Force -ErrorAction SilentlyContinue }
    Write-Error2 '数据库备份失败'
    return 1
}

# 恢复数据库
function Invoke-DbRestore([string]$backupFile) {
    if (-not $backupFile) { Write-Error2 '请指定备份文件'; return 1 }
    if (-not (Test-Path $backupFile)) { Write-Error2 "备份文件不存在: $backupFile"; return 1 }

    Write-Info "恢复数据库从 $backupFile..."
    Load-Env
    Parse-DatabaseUrl

    $confirm = Read-Host "确认恢复数据库 $($Script:DbName) ? [y/N] "
    if ($confirm -notmatch '^[Yy]$') { Write-Info '取消恢复'; return 0 }

    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($docker -and (& docker ps --format '{{.Names}}' 2>$null) -match 'postgres') {
        Get-Content $backupFile -Raw -Encoding UTF8 | & docker exec -i topems-postgres psql -U $Script:DbUser $Script:DbName
    } else {
        $psql = Get-DbTool 'psql'
        if (-not $psql) { Write-Error2 '未找到 psql 命令'; return 1 }
        # psql -f 直接读文件流，避免管道编码问题
        & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -d $Script:DbName -f $backupFile
    }
    Write-Success '数据库恢复完成'
    return 0
}

# 重置数据库
function Invoke-DbReset {
    Load-Env
    Parse-DatabaseUrl
    $confirm = Read-Host "确认重置数据库 $($Script:DbName) ? 将会删除所有数据! [y/N] "
    if ($confirm -notmatch '^[Yy]$') { Write-Info '取消重置'; return 0 }

    Write-Info '重置数据库...'
    $psql = Get-DbTool 'psql'
    if (-not $psql) { Write-Error2 '未找到 psql 命令'; return 1 }
    & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -c "DROP DATABASE IF EXISTS $($Script:DbName);" 2>$null
    & $psql.Source -h $Script:DbHost -p $Script:DbPort -U $Script:DbUser -c "CREATE DATABASE $($Script:DbName);" 2>$null
    Write-Success '数据库重置完成'
    return 0
}

# =============================================
# Schema 防御自检（V69.2）
# =============================================
# 用 Start-Process + WaitForExit 实现 15 秒超时运行并捕获日志

function Show-DefenseColor([int]$code, [string]$svc, [string]$detail) {
    switch ($code) {
        0 { Write-Success "[PASS] $svc  -  $detail" }
        1 { Write-Warning2 "[WARN] $svc  -  $detail" }
        default { Write-Error2 "[FAIL] $svc  -  $detail" }
    }
}

# 单个服务的 defense-check
function Invoke-DbDefenseCheck([string]$svc) {
    if (-not $svc) {
        Write-Error2 '用法: topems.ps1 db defense-check <service>  例如: topems db defense-check ehs'
        Write-Host '示例: .\topems.ps1 db defense-check gis'
        Write-Host '      .\topems.ps1 db defense-check-all'
        return 2
    }
    $svcDir = Join-Path $ProjectRoot "svc\$svc"
    if (-not (Test-Path $svcDir)) {
        Show-DefenseColor 2 $svc "目录 svc/$svc 不存在（请确认拼写）"
        return 2
    }

    $rc = 0
    $detailParts = New-Object System.Collections.ArrayList
    $pkgName = "topems-$svc"
    $binPath = Join-Path $ProjectRoot "target\debug\$pkgName.exe"

    # 阶段A: 编译存在性
    Write-Info "[$svc] 编译检查..."
    if (Test-Path $binPath) {
        [void]$detailParts.Add("build=SKIP（预热二进制已就绪 $binPath）")
    } else {
        $buildLog = Join-Path $TmpDir "defense-check-$svc-build.log"
        Push-Location $ProjectRoot
        try {
            $bOut = & cargo check --offline -p $pkgName 2>&1
            $bRc = $LASTEXITCODE
            $bOut | Out-File $buildLog -Encoding UTF8
        } finally { Pop-Location }
        if ($bRc -eq 0) { [void]$detailParts.Add('build=OK') }
        else {
            [void]$detailParts.Add("build=FAIL（见 $buildLog）")
            $rc = 2
        }
    }

    # 阶段B: 捕获 15 秒启动日志
    $logTmp = Join-Path $TmpDir "defense-check-$svc-start.log"
    $logErr = Join-Path $TmpDir "defense-check-$svc-start.err.log"
    Write-Info "[$svc] 启动 15s 捕获 schema 自检日志（需要 DB 已运行）..."
    Load-Env
    if (Test-Path $binPath) {
        $p = Start-Process -FilePath $binPath -WorkingDirectory $ProjectRoot `
            -RedirectStandardOutput $logTmp -RedirectStandardError $logErr -WindowStyle Hidden -PassThru
    } else {
        $p = Start-Process -FilePath 'cargo' -ArgumentList @('run','--offline','-p',$pkgName) -WorkingDirectory $ProjectRoot `
            -RedirectStandardOutput $logTmp -RedirectStandardError $logErr -WindowStyle Hidden -PassThru
    }
    if (-not $p.WaitForExit(15000)) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        $p.WaitForExit(2000) | Out-Null
    }

    # grep 迁移日志
    $stage1Line = ''; $stage2Line = ''; $warnLines = @()
    if (Test-Path $logTmp) {
        $lines = Get-Content $logTmp
        $s1 = $lines | Select-String -Pattern '增量迁移.*完成.*张表' | Select-Object -Last 1
        $s2 = $lines | Select-String -Pattern 'schema 自检.*完成' | Select-Object -Last 1
        if ($s1) { $stage1Line = $s1.Line }
        if ($s2) { $stage2Line = $s2.Line }
        $warnLines = @($lines | Select-String -Pattern '仍缺失.*列' | ForEach-Object { $_.Line })
    }

    if (-not $stage1Line -and -not $stage2Line -and $rc -ne 2) {
        [void]$detailParts.Add('defense=N/A（该服务尚未实现 TABLE_DEFS + 两阶段自检，请纳入下一批推进）')
        $rc = 1
    } else {
        $tCount = 0; $cCount = 0
        $tm = [regex]::Match($stage1Line, '([0-9]+) 张表'); if ($tm.Success) { $tCount = [int]$tm.Groups[1].Value }
        $cm = [regex]::Match($stage1Line, '([0-9]+) 列');  if ($cm.Success) { $cCount = [int]$cm.Groups[1].Value }
        $missCount = ($warnLines | Where-Object { $_ -match '仍缺失' }).Count
        [void]$detailParts.Add("tables=$tCount cols=$cCount missing-tables=$missCount")
        if ($missCount -gt 0 -and $rc -eq 0) { $rc = 1 }
    }

    Show-DefenseColor $rc $svc ($detailParts -join ' | ')
    if ($rc -eq 1 -and $warnLines.Count -gt 0) {
        foreach ($w in $warnLines) { Write-Host "    - $w" -ForegroundColor DarkGray }
    }
    return $rc
}

# 全量 Schema 防御自检
function Invoke-DbDefenseCheckAll {
    Write-Info '全量 Schema 防御自检：遍历 svc/*（无需 DB / 无需前台启动）'
    Write-Host '===================================================================='
    $total = 0; $pass = 0; $warn = 0; $fail = 0

    $batches = @(
        @{ name = '第1批（核心4服务）'; svcs = @('gis','ehs','portal','finance') }
        @{ name = '第2批（高频业务11服务）'; svcs = @('erp','hrm','crm','pm','scm','wms','srm','pdm','mes','qms','lims') }
        @{ name = '第3批（业务7服务）'; svcs = @('ai','rd','ticket','feedback','plugin-registry','mobile') }
        @{ name = '第4批（平台5服务）'; svcs = @('unified-core','integration','master-data','communication','analytics') }
    )
    foreach ($batch in $batches) {
        $bPass = 0; $bWarn = 0; $bFail = 0
        foreach ($svc in $batch.svcs) {
            $total++
            $e = Invoke-DbDefenseCheck $svc
            switch ($e) {
                0 { $pass++; $bPass++ }
                1 { $warn++; $bWarn++ }
                default { $fail++; $bFail++ }
            }
            Write-Host '--------------------------------------------------------------------'
        }
        Write-Host ''
        Write-Info "$($batch.name) 汇总：通过 $bPass / 警告 $bWarn / 失败 $bFail"
        Write-Host ''
    }
    Write-Info '骨架服务（无 DB 表，已排除）：monitor search'
    Write-Host '===================================================================='
    Write-Info "全量汇总（共 ${total} 服务）：通过 $pass / 警告 $warn / 失败 $fail"
    Write-Host 'Exit codes: 0=全通过  1=有警告(缺列)  2=有错误(build/启动)'
    if ($warn -gt 0) { return 1 }
    if ($fail -gt 0) { return 2 }
    return 0
}

# 静态跨 schema SQL 引用门禁（调用 check_schema_boundary.py）
function Invoke-DbBoundaryCheck {
    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
    if (-not $py) { Write-Error2 '未找到 python'; return 1 }
    $script = Join-Path $ScriptDir 'check_schema_boundary.py'
    & $py.Source $script
    return $LASTEXITCODE
}

# =============================================
# 一键运行/停止
# =============================================
function Invoke-RunAll([string[]]$allArgs) {
    if (-not (Invoke-Preflight @allArgs)) { return 1 }
    Write-Info '========== 一键运行 =========='
    if (-not (Start-Database)) { Write-Error2 '数据库启动失败，无法继续。请检查 PostgreSQL 配置。'; return 1 }
    if (-not (Start-Redis)) { Write-Error2 'Redis 启动失败，无法继续。请检查 Redis 配置。'; return 1 }
    Start-Sleep 2
    Start-AllServices @allArgs
    Write-Host ''
    Write-Success '一键运行完成！'
    Show-AllStatus
    return 0
}

function Invoke-StopEverything {
    Write-Info '========== 一键停止 =========='
    Stop-AllServices
    $confirm = Read-Host '是否同时停止 PostgreSQL 和 Redis ? [y/N] '
    if ($confirm -match '^[Yy]$') {
        Stop-Database
        Stop-Redis
    }
    Write-Success '一键停止完成'
}

function Invoke-RestartAll([string[]]$allArgs) {
    Write-Info '========== 重启所有服务 =========='
    Stop-AllServices
    Start-Sleep 2
    Start-AllServices @allArgs
    Show-AllStatus
    return 0
}

# ---------- Python CLI ----------
function Invoke-RunCli([string[]]$allArgs) {
    if (-not (Test-Path $CliDir)) {
        Write-Error2 'Python CLI 未安装'
        return 1
    }
    $cliEntry = Join-Path $CliDir 'bin\topems'
    if (Test-Path $cliEntry) {
        # 尝试直接执行（可能是可执行脚本/二进制）
        try {
            & $cliEntry @allArgs
            return $LASTEXITCODE
        } catch { }
    }
    Push-Location $CliDir
    try {
        $venvPy = Join-Path $CliDir '.venv\Scripts\python.exe'
        if (-not (Test-Path $venvPy)) {
            Write-Info '创建 Python 虚拟环境 .venv ...'
            $py = Get-Command python -ErrorAction SilentlyContinue
            if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
            if (-not $py) { Write-Error2 '未找到 python'; return 1 }
            & $py.Source -m venv .venv
            $venvPy = Join-Path $CliDir '.venv\Scripts\python.exe'
        }
        $env:PYTHONPATH = Join-Path $CliDir 'src'
        # 检查依赖
        & $venvPy -c 'import yaml, click, rich' 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info '缺少 Python CLI 依赖，正在安装...'
            & $venvPy -m pip install pyyaml click rich httpx --quiet
        }
        & $venvPy -m topems_cli @allArgs
        return $LASTEXITCODE
    } finally { Pop-Location }
}
# =============================================================================
# part6: 原 bash 子脚本的 PowerShell 内联实现
# 目标：彻底去除对 Git Bash / WSL 的依赖（无 WSL 电脑可直接运行）
#   1. Invoke-SqlxPrepare      <-> scripts/dev/sqlx-prepare.sh
#   2. Invoke-InstallDeps      <-> scripts/dev/install-deps.sh (Windows 引导版)
#   3. Invoke-AiModels         <-> scripts/dev/ai-models.sh
#   4. Invoke-Deploy           <-> scripts/deploy/deploy.sh (Docker)
#   5. Invoke-UpdateAdminPassword <-> scripts/dev/update-admin-password.sh
# =============================================================================

# ---------- 通用：检查命令是否存在 ----------
function Test-CommandExists([string]$name) {
    return ($null -ne (Get-Command $name -ErrorAction SilentlyContinue))
}

# ---------- 通用：Ollama HTTP 探测（/api/tags） ----------
function Test-OllamaHttp {
    try {
        $r = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -Method Get -TimeoutSec 3
        return $true
    } catch { return $false }
}

# =============================================================================
# 1) SQLx 离线缓存（原 scripts/dev/sqlx-prepare.sh）
# =============================================================================
$Script:SqlxCheckPkgs = @(
    'topems-unified-core','topems-finance','topems-crm','topems-erp','topems-scm',
    'topems-srm','topems-qms','topems-wms','topems-hrm','topems-pm','topems-portal',
    'topems-master-data','topems-communication','topems-ticket','topems-ai',
    'topems-feedback','topems-search','topems-analytics','topems-ehs','topems-gis',
    'topems-integration','topems-lims','topems-mobile','topems-pdm','topems-rd',
    'topems-shared-ai'
)
$Script:SqlxOfflineTestPkgs = @(
    'topems-unified-core','topems-finance','topems-crm','topems-erp','topems-scm',
    'topems-srm','topems-qms','topems-wms','topems-analytics','topems-shared-ai'
)

function Get-WorkspacePackages([string]$root) {
    # 用 cargo metadata 列出 workspace 中 svc/* 与 lib/* 的 package (name|dir)
    $out = @()
    try {
        Push-Location $root
        $raw = (& cargo metadata --format-version=1 --no-deps 2>$null | Out-String)
        Pop-Location
        if ($raw) {
            $meta = $raw | ConvertFrom-Json
            foreach ($p in $meta.packages) {
                $d = Split-Path $p.manifest_path -Parent
                if ($d -match '\\svc\\' -or $d -match '\\lib\\' -or $d -match '/svc/' -or $d -match '/lib/') {
                    $out += ,@($p.name, $d)
                }
            }
        }
    } catch { try { Pop-Location } catch { } }
    $out | Sort-Object { $_[0] }
}

function Invoke-SqlxPrepare([string]$mode, [string[]]$pkgArgs) {
    # mode: prepare / check / check-offline / merge / offline-test / semantic
    $root = $ProjectRoot
    if (-not (Test-CommandExists 'cargo')) {
        Write-Error2 '未安装 cargo，请先安装 Rust: https://rustup.rs'
        return 2
    }
    # 解析 -p/--package 参数
    $customPkgs = @()
    for ($i = 0; $i -lt $pkgArgs.Count; $i++) {
        if ($pkgArgs[$i] -eq '-p' -or $pkgArgs[$i] -eq '--package') {
            if ($i + 1 -lt $pkgArgs.Count) { $customPkgs += $pkgArgs[$i + 1]; $i++ }
        } elseif ($pkgArgs[$i] -eq '--prepare') { }
        elseif ($pkgArgs[$i] -eq '--merge') { }
        elseif ($pkgArgs[$i] -eq '--check') { }
        elseif ($pkgArgs[$i] -eq '--semantic') { }
        elseif ($pkgArgs[$i] -eq '--offline-test') { }
    }
    if (-not (Test-CommandExists 'sqlx')) {
        Write-Warning2 '未安装 sqlx-cli，正在自动安装 ...'
        & cargo install sqlx-cli --no-default-features --features postgres,rustls
    }

    # 收集 workspace packages
    $pkgs = @(Get-WorkspacePackages $root)
    $pkgMap = @{}
    foreach ($p in $pkgs) { $pkgMap[$p[0]] = $p[1] }
    $allPkgs = @($pkgs | ForEach-Object { $_[0] })
    if ($customPkgs.Count -gt 0) {
        $missing = @($customPkgs | Where-Object { -not $pkgMap.ContainsKey($_) })
        if ($missing.Count -gt 0) {
            Write-Error2 ("以下 package 不在 workspace 中: " + ($missing -join ' '))
            return 2
        }
        $allPkgs = $customPkgs
    }

    # --- check / check-offline: SQLX_OFFLINE cargo check 核心包 ---
    if ($mode -in @('check', 'check-offline')) {
        Write-Info '执行 sqlx 缓存 --check（SQLX_OFFLINE cargo check 核心包）...'
        $checkPkgs = if ($customPkgs.Count -gt 0) { $customPkgs } else { $Script:SqlxCheckPkgs }
        $fail = @()
        $env:SQLX_OFFLINE = 'true'
        foreach ($p in $checkPkgs) {
            if (-not $pkgMap.ContainsKey($p)) { continue }
            Write-Info "  offline-check $p"
            $log = Join-Path $env:TEMP "topems\sqlx-check-$p.log"
            & cargo check -p $p --message-format=short *> $log
            if ($LASTEXITCODE -ne 0) {
                $fail += $p
            } else { Write-Success "  $p OK" }
        }
        if ($fail.Count -gt 0) {
            Write-Error2 ("以下 packages 离线 check 失败: " + ($fail -join ' '))
            Write-Host '  请执行: .\topems.ps1 sqlx prepare，然后提交 .sqlx/ 变更'
            return 1
        }
        Write-Success '全部 sqlx 缓存 --check 通过'
        return 0
    }

    # --- semantic: cargo sqlx prepare --check --workspace（连接 DB） ---
    if ($mode -eq 'semantic') {
        Load-Env
        $dbUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
        if (-not $dbUrl) { Write-Error2 'DATABASE_URL 未设置，请在 .env 或 config/standalone.env 中声明'; return 2 }
        Write-Info '执行 sqlx 语义级 --check（连接 DB + PREPARE 验证）...'
        $env:SQLX_OFFLINE = 'false'
        $log = Join-Path $env:TEMP "topems\sqlx-semantic-workspace.log"
        & cargo sqlx prepare --check --workspace --database-url $dbUrl *> $log
        $rc = $LASTEXITCODE
        if ($rc -ne 0) {
            $content = Get-Content $log -Raw -ErrorAction SilentlyContinue
            if ($content -match 'error returned from database|column.*does not exist|relation.*does not exist|syntax error at or near|prepare check failed') {
                Get-Content $log -Tail 30 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
                Write-Error2 'sqlx 语义级 --check 失败：.sqlx 缓存与 DB schema 语义不一致（可执行 .\topems.ps1 sqlx prepare 刷新）'
                return 1
            } elseif ($content -match 'error\[') {
                Get-Content $log -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
                Write-Warn 'COMPILE-FAIL（非 sqlx 缓存问题，advisory 模式忽略）'
                return 0
            } else {
                Get-Content $log -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
                Write-Error2 'sqlx 语义级 --check 失败（未知原因）'
                return 1
            }
        }
        Write-Success '全部 sqlx 语义级 --check 通过（workspace 全量）'
        return 0
    }

    # --- merge: 仅把子目录 .sqlx/*.json 合并到根 .sqlx/ ---
    if ($mode -eq 'merge') {
        Write-Info '合并所有子目录 .sqlx/*.json -> 根 .sqlx/'
        $rootSqlx = Join-Path $root '.sqlx'
        New-Item -ItemType Directory -Force -Path $rootSqlx | Out-Null
        $merged = 0
        foreach ($p in $allPkgs) {
            if (-not $pkgMap.ContainsKey($p)) { continue }
            $dir = $pkgMap[$p]
            $sub = Join-Path $dir '.sqlx'
            if (Test-Path $sub) {
                Get-ChildItem $sub -Filter *.json -File -ErrorAction SilentlyContinue | ForEach-Object {
                    Copy-Item $_.FullName (Join-Path $rootSqlx $_.Name) -Force
                    $merged++
                }
                Remove-Item $sub -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        $total = @(Get-ChildItem $rootSqlx -Filter *.json -File -ErrorAction SilentlyContinue).Count
        Write-Success "完成：合并 $merged 个子目录查询缓存，根 .sqlx 共 $total queries"
        return 0
    }

    # --- offline-test: 刷新后离线编译验证 ---
    if ($mode -eq 'offline-test') {
        Write-Info '执行 SQLX_OFFLINE=true 离线编译验证（清空 DATABASE_URL）...'
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
        $env:SQLX_OFFLINE = 'true'
        $fail = @()
        foreach ($p in $Script:SqlxOfflineTestPkgs) {
            if (-not $pkgMap.ContainsKey($p)) { continue }
            $log = Join-Path $env:TEMP "topems\sqlx-offline-$p.log"
            & cargo check -p $p --message-format=short *> $log
            if ($LASTEXITCODE -eq 0) { Write-Success "  离线 $p OK" }
            else { Write-Error2 "  离线 $p FAILED（详见 $log）"; $fail += $p }
        }
        if ($fail.Count -gt 0) { Write-Error2 ("离线编译失败: " + ($fail -join ' ')); return 1 }
        Write-Success '全部离线编译测试通过'
        return 0
    }

    # --- prepare 默认模式 ---
    # 原 sqlx-prepare.sh：prepare/semantic 需要 DATABASE_URL（offline-test 不需要）
    if ($mode -notin @('offline-test', 'check', 'check-offline', 'merge')) {
        Load-Env
        $dbUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
        if (-not $dbUrl) {
            Write-Error2 'DATABASE_URL 未设置，请在 .env 或 config/standalone.env 中声明'
            Write-Host '  例如: $env:DATABASE_URL = "postgres://user:pw@localhost:5432/topems"'
            return 2
        }
    }
    Write-Info "共 $($allPkgs.Count) 个 package 待处理，仅清理子目录 .sqlx/（保留根 .sqlx/）..."
    foreach ($p in $allPkgs) {
        if ($pkgMap.ContainsKey($p)) {
            $sub = Join-Path $pkgMap[$p] '.sqlx'
            if (Test-Path $sub) { Remove-Item $sub -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }
    $logsDir = Join-Path $root 'logs'
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

    $okPkgs = @(); $failPkgs = @(); $totalQueries = 0
    foreach ($p in $allPkgs) {
        if (-not $pkgMap.ContainsKey($p)) { continue }
        $dir = $pkgMap[$p]
        Write-Info "prepare $p (in $dir)"
        $log = Join-Path $logsDir "sqlx-prepare-$p.log"
        Push-Location $dir
        & cargo sqlx prepare *> $log
        $rc = $LASTEXITCODE
        Pop-Location
        if ($rc -eq 0) {
            $sub = Join-Path $dir '.sqlx'
            $n = @(Get-ChildItem $sub -Filter *.json -File -ErrorAction SilentlyContinue).Count
            $totalQueries += $n
            $okPkgs += $p
            Write-Success "  $p OK ($n queries)"
        } else {
            $failPkgs += $p
            $snippet = ((Get-Content $log -ErrorAction SilentlyContinue | Select-Object -First 20) -join ' ')
            if ($snippet.Length -gt 160) { $snippet = $snippet.Substring(0, 160) }
            Write-Warn "  $p FAIL: $snippet (完整日志 logs/sqlx-prepare-$p.log)"
        }
    }

    # 合并子目录 .sqlx/*.json -> 根 .sqlx/
    Write-Info '合并所有子目录 .sqlx/*.json -> 根 .sqlx/'
    $rootSqlx = Join-Path $root '.sqlx'
    New-Item -ItemType Directory -Force -Path $rootSqlx | Out-Null
    $merged = 0
    foreach ($p in $okPkgs) {
        if (-not $pkgMap.ContainsKey($p)) { continue }
        $sub = Join-Path $pkgMap[$p] '.sqlx'
        if (-not (Test-Path $sub)) { continue }
        $n = @(Get-ChildItem $sub -Filter *.json -File -ErrorAction SilentlyContinue).Count
        if ($n -gt 0) {
            Get-ChildItem $sub -Filter *.json -File -ErrorAction SilentlyContinue | ForEach-Object {
                Copy-Item $_.FullName (Join-Path $rootSqlx $_.Name) -Force
            }
            $merged += $n
        }
        Remove-Item $sub -Recurse -Force -ErrorAction SilentlyContinue
    }
    $rootQueries = @(Get-ChildItem $rootSqlx -Filter *.json -File -ErrorAction SilentlyContinue).Count
    Write-Success "完成：成功 $($okPkgs.Count)/$($allPkgs.Count)，合并 $merged 个子目录查询缓存，根 .sqlx 共 $rootQueries queries"
    if ($failPkgs.Count -gt 0) { Write-Warn ("失败（通常是代码本身类型错误，非 sqlx 缓存问题）: " + ($failPkgs -join ' ')) }
    return 0
}

# =============================================================================
# 2) 依赖安装/引导（原 scripts/dev/install-deps.sh，Windows 引导版）
# =============================================================================
function Invoke-InstallDeps([string]$target) {
    $root = $ProjectRoot
    switch ($target) {
        'verify' { Show-DepsVerify; return 0 }
        'frontend' { Install-FrontendDepsWin; return 0 }
        'backend' { Build-BackendDepsWin; return 0 }
        'db' {
            Check-PostgresWin; Check-RedisWin; Create-ConfigFilesWin; return 0
        }
        'dev' {
            Check-RustWin; Check-NodeWin; return 0
        }
        'ai' { Check-OllamaWin; return 0 }
        default {
            Write-Info 'TOPEMS 依赖引导 (Windows)'
            Check-PostgresWin
            Check-RedisWin
            Check-RustWin
            Check-NodeWin
            Check-OllamaWin
            Create-ConfigFilesWin
            Install-FrontendDepsWin
            Build-BackendDepsWin
            Show-DepsVerify
            return 0
        }
    }
}

function Show-DepsVerify {
    Write-Info '验证安装...'
    Write-Host '----------------------------------------------------'
    Write-Host '              依赖安装验证 (Windows)'
    Write-Host '----------------------------------------------------'
    $pg = Test-CommandExists 'psql'
    $redis = Test-CommandExists 'redis-cli'
    $rust = Test-CommandExists 'rustc'
    $node = Test-CommandExists 'node'
    $ollama = Test-CommandExists 'ollama'
    if ($pg) { Write-Host '  [OK] PostgreSQL (psql)' } else { Write-Host '  [X] PostgreSQL (psql)' }
    if ($redis) { Write-Host '  [OK] Redis (redis-cli)' } else { Write-Host '  [X] Redis (redis-cli)' }
    if ($rust) {
        $v = (& rustc --version 2>$null | Out-String).Trim()
        Write-Host "  [OK] Rust ($v)"
    } else { Write-Host '  [X] Rust (rustc)' }
    if ($node) { Write-Host "  [OK] Node.js $((& node --version 2>$null | Out-String).Trim())" } else { Write-Host '  [X] Node.js (node)' }
    if ($ollama) { Write-Host '  [OK] Ollama' } else { Write-Host '  [WARN] Ollama (可选，未安装)' }
    Write-Host '----------------------------------------------------'
    Write-Warn '提示：在 Windows 上缺失的组件建议通过 winget 安装：'
    Write-Host '  winget install PostgreSQL.PostgreSQL.16'
    Write-Host '  winget install Redis.Redis'
    Write-Host '  winget install Rustlang.Rustup'
    Write-Host '  winget install OpenJS.NodeJS.LTS'
    Write-Host '  winget install Ollama.Ollama'
    Write-Host '  或使用 Docker Desktop 运行 PostgreSQL/Redis（见 .\topems.ps1 db start）'
}

function Check-PostgresWin {
    if (Test-CommandExists 'psql') { Write-Success 'PostgreSQL 客户端已安装 (psql)' }
    else { Write-Warning2 'PostgreSQL 未安装（psql 不可用）'; Write-Host '  建议: winget install PostgreSQL.PostgreSQL.16 或使用 Docker (.\topems.ps1 db start)' }
}
function Check-RedisWin {
    if (Test-CommandExists 'redis-cli') { Write-Success 'Redis 客户端已安装 (redis-cli)' }
    else { Write-Warning2 'Redis 未安装（redis-cli 不可用）'; Write-Host '  建议: winget install Redis.Redis 或使用 Docker' }
}
function Check-RustWin {
    if (Test-CommandExists 'cargo') { Write-Success 'Rust 已安装 (cargo)' }
    else { Write-Warning2 'Rust 未安装'; Write-Host '  建议: winget install Rustlang.Rustup 后运行 rustup default stable' }
}
function Check-NodeWin {
    if (Test-CommandExists 'node') { Write-Success "Node.js 已安装 ($((& node --version 2>$null | Out-String).Trim()))" }
    else { Write-Warning2 'Node.js 未安装'; Write-Host '  建议: winget install OpenJS.NodeJS.LTS' }
}
function Check-OllamaWin {
    if (Test-CommandExists 'ollama') { Write-Success 'Ollama 已安装' }
    else { Write-Warning2 'Ollama 未安装（AI 相关功能不可用）'; Write-Host '  建议: winget install Ollama.Ollama' }
}

function Create-ConfigFilesWin {
    # 创建 config/ports.env 与 config/standalone.env（与 install-deps.sh 一致）
    $configDir = Join-Path $ProjectRoot 'config'
    $logsDir = Join-Path $ProjectRoot 'logs'
    New-Item -ItemType Directory -Force -Path $configDir, $logsDir | Out-Null

    $portsFile = Join-Path $configDir 'ports.env'
    if (-not (Test-Path $portsFile)) {
        @'
# TOPEMS 服务端口配置
# 核心服务 (unified-core 包含 IAM, Doc, Flow, File, Communication, Notification)
IAM_PORT=8000
DOC_PORT=8000
FILE_PORT=8000
FLOW_PORT=8000
NOTIFICATION_PORT=8000
INTEGRATION_PORT=8072
ERP_PORT=8010
HRM_PORT=8020
CRM_PORT=8029
RD_PORT=8053
MANUFACTURING_PORT=8030
QUALITY_ASSURANCE_PORT=8050
SCM_PORT=8040
SRM_PORT=8042
WMS_PORT=8041
GIS_PORT=8071
AI_PORT=8013
MOBILE_PORT=8070
POSTGRES_PORT=5432
REDIS_PORT=6379
WEB_PORT=3000
'@ | Set-Content -Path $portsFile -Encoding UTF8
        Write-Success "创建端口配置: config/ports.env"
    }

    $standaloneFile = Join-Path $configDir 'standalone.env'
    if (-not (Test-Path $standaloneFile)) {
        $jwt = New-RandomHex 32
        $refresh = New-RandomHex 32
        $content = @"
# TOPEMS 独立运行环境变量（非 Docker 方案）
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
REDIS_URL=redis://:topems_redis_secret@localhost:6379
OLLAMA_HOST=http://localhost:11434
JWT_SECRET=$jwt
REFRESH_SECRET=$refresh
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
RUST_LOG=info,service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug
"@
        [System.IO.File]::WriteAllText($standaloneFile, $content, (New-Object System.Text.UTF8Encoding($false)))
        Write-Success "创建独立运行环境变量: config/standalone.env"
    }
}

function New-RandomHex([int]$len) {
    $bytes = New-Object byte[] ($len / 2)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
}

function Install-FrontendDepsWin {
    $webDir = Join-Path $ProjectRoot 'apps\web'
    if (-not (Test-Path $webDir)) { Write-Warning2 'apps/web 不存在，跳过前端依赖安装'; return }
    Push-Location $webDir
    if (Test-CommandExists 'pnpm') { & pnpm install }
    elseif (Test-CommandExists 'yarn') { & yarn install }
    elseif (Test-CommandExists 'npm') { & npm install }
    else { Write-Error2 '未找到 pnpm/yarn/npm' }
    Pop-Location
}

function Build-BackendDepsWin {
    # 从 services.conf 第 3 列取二进制名，逐个离线/在线编译
    Load-ServicesConfig
    $exes = @(Get-AllExecutables)
    if ($exes.Count -eq 0) {
        $exes = @('topems-unified-core','topems-pm','topems-erp','topems-finance','topems-ai',
            'topems-hrm','topems-crm','topems-mes','topems-pdm','topems-scm','topems-wms',
            'topems-srm','topems-qms','topems-lims','topems-ehs','topems-rd','topems-analytics',
            'topems-portal','topems-mobile','topems-gis','topems-integration')
    }
    $success = 0; $fail = 0
    foreach ($exe in $exes) {
        Write-Info "编译 $exe..."
        $env:SQLX_OFFLINE = 'true'
        & cargo build --release --bin $exe 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $success++ }
        else {
            Write-Warning2 "$exe 离线编译失败，尝试在线编译..."
            Remove-Item Env:SQLX_OFFLINE -ErrorAction SilentlyContinue
            & cargo build --release --bin $exe 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { $success++ }
            else { Write-Error2 "$exe 编译失败"; $fail++ }
        }
    }
    if ($fail -eq 0) { Write-Success "后端服务编译完成 ($success 成功)" }
    else { Write-Error2 "后端编译失败 ($success 成功, $fail 失败)"; return 1 }
}

# =============================================================================
# 3) AI 模型管理（原 scripts/dev/ai-models.sh）
# =============================================================================
function Invoke-AiModels([string]$action, [string]$arg1, [string]$arg2) {
    switch ($action) {
        'start' { if (-not (Assert-Ollama)) { return 1 }; Start-OllamaService; return 0 }
        'stop' { Stop-OllamaService; return 0 }
        'status' { if (-not (Assert-Ollama)) { return 1 }; Show-OllamaStatus; return 0 }
        'pull' { if (-not (Assert-Ollama)) { return 1 }; Pull-OllamaModel $arg1; return 0 }
        'pull-all' { if (-not (Assert-Ollama)) { return 1 }; Pull-AllOllamaModels; return 0 }
        'rm' { if (-not (Assert-Ollama)) { return 1 }; & ollama rm $arg1; return 0 }
        'info' { if (-not (Assert-Ollama)) { return 1 }; & ollama show $arg1; return 0 }
        'alias' { if (-not (Assert-Ollama)) { return 1 }; & ollama cp $arg1 $arg2; return 0 }
        'update' { if (-not (Assert-Ollama)) { return 1 }; & ollama pull $arg1; return 0 }
        'export' { if (-not (Assert-Ollama)) { return 1 }; & ollama export $arg1 $arg2; return 0 }
        'import' { if (-not (Assert-Ollama)) { return 1 }; & ollama import $arg2 --file $arg1; return 0 }
        'test' { if (-not (Assert-Ollama)) { return 1 }; Test-OllamaModel $arg1; return 0 }
        'config-vector' { Config-OllamaVectorDb; return 0 }
        default {
            Write-Host 'TOPEMS AI模型管理 (Windows)'
            Write-Host ''
            Write-Host '用法: .\topems.ps1 ai <命令> [参数]'
            Write-Host ''
            Write-Host '命令说明:'
            Write-Host '  start           - 启动 Ollama 服务'
            Write-Host '  stop            - 停止 Ollama 服务'
            Write-Host '  status          - 查看 Ollama 服务状态'
            Write-Host '  pull <模型>     - 下载指定模型'
            Write-Host '  pull-all        - 下载所有推荐模型'
            Write-Host '  rm <模型>       - 删除指定模型'
            Write-Host '  info <模型>     - 查看模型信息'
            Write-Host '  alias <模型> <别名> - 为模型创建别名'
            Write-Host '  test [模型]     - 测试模型响应'
            Write-Host '  config-vector   - 配置向量库'
            Write-Host '  update <模型>   - 更新指定模型'
            Write-Host '  export <模型> <路径> - 导出模型'
            Write-Host '  import <文件> <名称> - 导入模型'
            Write-Host ''
            Write-Host '可用模型:'
            Write-Host '  - qwen2.5:7b-instruct    (推荐，约14GB)'
            Write-Host '  - qwen2.5:14b-instruct   (约28GB)'
            Write-Host '  - llama3.1:8b             (约16GB)'
            Write-Host '  - nomic-embed-text        (文本嵌入，约2GB)'
            return 1
        }
    }
}

function Assert-Ollama {
    if (-not (Test-CommandExists 'ollama')) {
        Write-Error2 'Ollama 未安装'
        Write-Host '  请运行: winget install Ollama.Ollama'
        return $false
    }
    return $true
}

function Start-OllamaService {
    Write-Info '启动 Ollama 服务...'
    if (Test-OllamaHttp) { Write-Success 'Ollama 服务已运行'; return }
    $p = Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden -PassThru
    Write-Info '等待 Ollama 服务启动...'
    for ($i = 0; $i -lt 30; $i++) {
        if (Test-OllamaHttp) { Write-Success "Ollama 服务启动成功 (PID: $($p.Id))"; return }
        Start-Sleep 2
    }
    Write-Error2 'Ollama 服务启动超时'
    exit 1
}

function Stop-OllamaService {
    Write-Info '停止 Ollama 服务...'
    $procs = @(Get-Process -Name 'ollama' -ErrorAction SilentlyContinue)
    if ($procs.Count -eq 0) { Write-Warning2 'Ollama 服务未运行'; return }
    foreach ($proc in $procs) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    Write-Success 'Ollama 服务已停止'
}

function Show-OllamaStatus {
    Write-Info '检查 Ollama 服务状态...'
    if (Test-OllamaHttp) {
        Write-Success 'Ollama 服务运行正常'
        Write-Host ''
        Write-Host '已安装的模型:'
        & ollama list
    } else {
        Write-Error2 'Ollama 服务未运行'
    }
}

function Pull-OllamaModel([string]$model) {
    if (-not $model) {
        Write-Error2 '请指定要下载的模型名称'
        Write-Host '可用模型:'
        Write-Host '  - qwen2.5:7b-instruct    (推荐，约14GB)'
        Write-Host '  - qwen2.5:14b-instruct   (约28GB)'
        Write-Host '  - llama3.1:8b             (约16GB)'
        Write-Host '  - nomic-embed-text        (文本嵌入，约2GB)'
        return 1
    }
    $installed = @(& ollama list 2>$null | ForEach-Object { ($_ -split '\s+')[0] })
    if ($installed -contains $model) { Write-Info "模型 $model 已安装"; return 0 }
    Write-Info "下载模型: $model..."
    & ollama pull $model 2>&1
    $after = @(& ollama list 2>$null | ForEach-Object { ($_ -split '\s+')[0] })
    if ($after -contains $model) { Write-Success "模型 $model 下载完成" }
    else { Write-Warning2 "模型 $model 下载失败（检查网络/磁盘空间，或手动执行: ollama pull $model）" }
}

function Pull-AllOllamaModels {
    Write-Info '下载所有推荐模型...'
    $base = @('qwen2.5:7b-instruct', 'nomic-embed-text')
    foreach ($m in $base) { Write-Info "下载基础模型: $m..."; & ollama pull $m }
    Write-Success '基础模型下载完成'
    $yn = Read-Host '是否下载大模型（需要更多内存，约20GB+）? [y/N]'
    if ($yn -match '^[Yy]') {
        foreach ($m in @('qwen2.5:14b-instruct', 'llama3.1:8b')) { Write-Info "下载大模型: $m..."; & ollama pull $m }
        Write-Success '大模型下载完成'
    }
}

function Test-OllamaModel([string]$model) {
    if (-not $model) { $model = 'qwen2.5:7b-instruct' }
    Write-Info "测试模型: $model..."
    try {
        $body = @{ model = $model; prompt = 'Hello, who are you?'; stream = $false } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri 'http://localhost:11434/api/generate' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 120
        Write-Success '模型响应成功'
        Write-Host "响应: $($r.response)"
    } catch {
        Write-Error2 "模型测试失败: $($_.Exception.Message)"
        return 1
    }
}

function Config-OllamaVectorDb {
    Write-Info '配置向量库...'
    if (-not (Test-CommandExists 'psql')) { Write-Error2 'psql 未安装，无法配置向量库'; return 1 }
    & psql -U topems -d topems -c "SELECT 1 FROM pg_extension WHERE extname = 'vector'" *> $null
    if ($LASTEXITCODE -eq 0) { Write-Success '向量扩展已安装' }
    else {
        Write-Info '安装向量扩展...'
        & psql -U topems -d topems -c "CREATE EXTENSION IF NOT EXISTS vector"
        Write-Success '向量扩展安装完成'
    }
}

# =============================================================================
# 4) 一键部署（原 scripts/deploy/deploy.sh，Docker）
# =============================================================================
function Invoke-Deploy([string]$action, [string]$arg2) {
    if (-not (Test-CommandExists 'docker')) {
        Write-Error2 '未找到 docker 命令，请先安装 Docker Desktop'
        return 1
    }
    $root = $ProjectRoot
    $global:TopemsDataDir = [Environment]::GetEnvironmentVariable('TOPEMS_DATA_DIR', 'Process')
    if (-not $global:TopemsDataDir) { $global:TopemsDataDir = 'D:\topems-data' }
    $global:TopemsNetwork = 'topems-network'
    switch ($action) {
        'deploy' { Deploy-Main; return 0 }
        'start' { & docker start $(& docker ps -a -q -f name=topems); return 0 }
        'stop' { & docker stop $(& docker ps -q -f name=topems); return 0 }
        'restart' { & docker restart $(& docker ps -q -f name=topems); return 0 }
        'status' { Deploy-CheckStatus; return 0 }
        'logs' {
            if (-not $arg2) { Write-Error2 '请指定服务名: .\topems.ps1 deploy logs <service-name>'; return 1 }
            & docker logs -f "topems-$arg2"
            return 0
        }
        'clean' {
            Write-Warn '清理所有容器和数据...'
            $yn = Read-Host '确认清理? (y/N)'
            if ($yn -eq 'y' -or $yn -eq 'Y') {
                & docker stop $(& docker ps -q -f name=topems) 2>$null
                & docker rm $(& docker ps -a -q -f name=topems) 2>$null
                Write-Success '清理完成'
            }
            return 0
        }
        default { Write-Error2 "未知命令: $action"; return 1 }
    }
}

function Deploy-Main {
    Write-Host '=============================================='
    Write-Host 'TOPEMS 离线部署脚本 (Windows Docker)'
    Write-Host '=============================================='
    Write-Host ''
    Write-Host "数据目录: $global:TopemsDataDir"
    Write-Host "网络名称: $global:TopemsNetwork"
    Write-Host ''
    Deploy-Init
    Deploy-SetupEnv
    Deploy-LoadImages
    Deploy-StartInfra
    Deploy-InitDatabase
    Deploy-RunMigrations
    Deploy-Services
    Deploy-CheckStatus
    Deploy-Complete
}

function Deploy-Init {
    Write-Info '初始化部署环境...'
    foreach ($d in @('postgres\data', 'postgres\backups', 'redis', 'logs', 'docs', 'uploads', 'backups')) {
        New-Item -ItemType Directory -Force -Path (Join-Path $global:TopemsDataDir $d) | Out-Null
    }
    $networks = @(& docker network ls 2>$null | ForEach-Object { ($_ -split '\s+')[1] })
    if ($networks -notcontains $global:TopemsNetwork) {
        Write-Info "创建 Docker 网络: $global:TopemsNetwork"
        & docker network create --driver bridge $global:TopemsNetwork
    } else {
        Write-Info "使用现有网络: $global:TopemsNetwork"
    }
}

function Deploy-SetupEnv {
    Write-Info '配置环境变量...'
    $envFile = Join-Path $global:TopemsDataDir '.env'
    if (Test-Path $envFile) { Write-Warn '环境配置文件已存在，将使用现有配置'; return }
    $jwt = [Convert]::ToBase64String((New-RandomBytes 32))
    $refresh = [Convert]::ToBase64String((New-RandomBytes 32))
    $dbPwd = "topems_$(New-RandomHex 16)"
    $deployMode = [Environment]::GetEnvironmentVariable('DEPLOYMENT_MODE', 'Process')
    if (-not $deployMode) { $deployMode = 'on-premise' }
    $multiTenant = 'false'; $quota = 'false'; $billing = 'false'; $tenantMgmt = 'false'
    if ($deployMode -eq 'saas') {
        Write-Info '部署模式: SaaS (多租户)'
        $multiTenant = 'true'; $quota = 'true'; $billing = 'true'; $tenantMgmt = 'true'
    } else { Write-Info '部署模式: On-Premise (私有化)' }
    $content = @"
# ==================== 部署模式配置 ====================
DEPLOYMENT_MODE=$deployMode
MULTI_TENANT_ENABLED=$multiTenant
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
QUOTA_ENABLED=$quota
BILLING_ENABLED=$billing
TENANT_MANAGEMENT=$tenantMgmt

# ==================== 数据库配置 ====================
POSTGRES_USER=topems
POSTGRES_PASSWORD=$dbPwd
POSTGRES_DB=topems
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# ==================== Redis 配置 ====================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# ==================== JWT 配置 ====================
JWT_SECRET=$jwt
REFRESH_SECRET=$refresh

# ==================== AI 配置 ====================
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=nomic-embed-text
USE_OLLAMA=false
OPENAI_API_KEY=
OPENAI_BASE_URL=

# ==================== 版本 ====================
VERSION=latest
"@
    [System.IO.File]::WriteAllText($envFile, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Success "环境配置已创建: $envFile"
}

function New-RandomBytes([int]$count) {
    $bytes = New-Object byte[] $count
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $bytes
}

function Deploy-LoadImages {
    Write-Info '加载 Docker 镜像...'
    $candidates = @(
        '.\images\base-images.tar', '.\images\base-images.tar.gz',
        '.\images\all-images.tar', '.\images\all-images.tar.gz',
        '.\images\pgvector-16.tar', '.\images\postgres-16-alpine.tar',
        '.\images\redis-7-alpine.tar', '.\images\nginx-1.25-alpine.tar'
    )
    $loaded = 0
    foreach ($img in $candidates) {
        if (Test-Path $img) {
            Write-Info "加载镜像: $img"
            if ($img -like '*.gz') {
                # PowerShell 7 自带 tar；解压后 docker load
                $tmp = Join-Path $env:TEMP ('topems-img-' + [guid]::NewGuid().ToString('N') + '.tar')
                & tar -xzf $img -C $env:TEMP -f $tmp 2>$null
                if (Test-Path $tmp) { & docker load -i $tmp; Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
                else {
                    # 简单方案：直接 docker load 尝试（docker 支持 gzip）
                    & docker load -i $img
                }
            } else {
                & docker load -i $img
            }
            $loaded++
        }
    }
    if ($loaded -eq 0) { Write-Warn '未找到镜像文件，请确保镜像已放置在 .\images 目录' }
    else { Write-Info "成功加载 $loaded 个镜像文件" }
    Deploy-VerifyImage 'postgres'
    Deploy-VerifyImage 'redis'
    Deploy-VerifyImage 'nginx'
}

function Deploy-VerifyImage([string]$pattern) {
    $found = @(& docker images 2>$null | Select-String "^$pattern\s")
    if ($found) { Write-Host "  [OK] $pattern" } else { Write-Host "  [X] $pattern (未找到)" }
}

function Deploy-StartInfra {
    Write-Info '启动基础设施服务...'
    Load-EnvFile (Join-Path $global:TopemsDataDir '.env')
    $pgRunning = @(& docker ps -a --filter "name=topems-postgres" --format "{{.Names}}" 2>$null)
    if ($pgRunning) { & docker rm -f topems-postgres 2>$null | Out-Null }
    $pgImage = @(& docker images 2>$null | Select-String '^postgres\s' | Select-Object -First 1)
    if (-not $pgImage) { $pgImage = 'pgvector/pgvector:16'; Write-Warn "未找到本地 postgres 镜像，将使用 $pgImage" }
    else {
        $parts = ($pgImage.ToString() -split '\s+')
        $pgImage = $parts[0] + ':' + $parts[1]
    }
    & docker run -d --name topems-postgres --network $global:TopemsNetwork `
        -e "POSTGRES_USER=$env:POSTGRES_USER" `
        -e "POSTGRES_PASSWORD=$env:POSTGRES_PASSWORD" `
        -e "POSTGRES_DB=$env:POSTGRES_DB" `
        -v "$global:TopemsDataDir\postgres\data:/var/lib/postgresql/data" `
        -p 5432:5432 --restart unless-stopped $pgImage

    $redisRunning = @(& docker ps -a --filter "name=topems-redis" --format "{{.Names}}" 2>$null)
    if ($redisRunning) { & docker rm -f topems-redis 2>$null | Out-Null }
    & docker run -d --name topems-redis --network $global:TopemsNetwork `
        -v "$global:TopemsDataDir\redis:/data" `
        -p 6379:6379 --restart unless-stopped redis:7-alpine redis-server --appendonly yes

    Write-Info '等待服务就绪...'
    Start-Sleep 10
    for ($i = 0; $i -lt 30; $i++) {
        & docker exec topems-postgres pg_isready -U $env:POSTGRES_USER *> $null
        if ($LASTEXITCODE -eq 0) { Write-Info 'PostgreSQL 已就绪'; break }
        Write-Host -NoNewline '.'
        Start-Sleep 2
    }
    Write-Host ''
}

function Load-EnvFile([string]$path) {
    if (-not (Test-Path $path)) { return }
    Get-Content $path | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$' -and $_ -notmatch '^\s*#') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}

function Deploy-InitDatabase {
    Write-Info '初始化数据库...'
    Load-EnvFile (Join-Path $global:TopemsDataDir '.env')
    $schemas = @('iam','doc','flow','erp','hrm','crm','ai','pm','rs','lims','pdm','mes','qms','ehs',
        'scm','srm','wms','gis','im','bi','report','mail','mobile')
    $sql = "CREATE EXTENSION IF NOT EXISTS vector;`n"
    foreach ($s in $schemas) { $sql += "CREATE SCHEMA IF NOT EXISTS $s;`n" }
    $sqlFile = Join-Path $env:TEMP 'topems-init-db.sql'
    [System.IO.File]::WriteAllText($sqlFile, $sql, (New-Object System.Text.UTF8Encoding($false)))
    $cmdLine = "docker exec -i topems-postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f - < `"$sqlFile`""
    & cmd /c $cmdLine
    Remove-Item $sqlFile -Force -ErrorAction SilentlyContinue
    Write-Success '数据库初始化完成'
}

function Deploy-RunMigrations {
    Write-Info '执行数据库迁移...'
    Load-EnvFile (Join-Path $global:TopemsDataDir '.env')
    $dirs = @('svc\unified-core\migrations','svc\erp\migrations','svc\finance\migrations',
        'svc\hrm\migrations','svc\crm\migrations','svc\ai\migrations','svc\pm\migrations',
        'svc\rd\migrations','svc\mes\migrations','svc\pdm\migrations','svc\qms\migrations',
        'svc\lims\migrations','svc\ehs\migrations','svc\scm\migrations','svc\srm\migrations',
        'svc\wms\migrations','svc\gis\migrations','svc\analytics\migrations',
        'svc\portal\migrations','svc\mobile\migrations','svc\integration\migrations')
    foreach ($dir in $dirs) {
        $full = Join-Path $ProjectRoot $dir
        if (-not (Test-Path $full)) { Write-Info "  跳过不存在的目录: $dir"; continue }
        Write-Info "执行迁移: $dir"
        $sqlFiles = @(Get-ChildItem $full -Filter *.sql -File | Sort-Object Name)
        if ($sqlFiles.Count -eq 0) { Write-Warn '  未找到迁移SQL文件'; continue }
        foreach ($sqlFile in $sqlFiles) {
            Write-Info "  执行: $($sqlFile.Name)"
            $cmdLine = "docker exec -i topems-postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f - < `"$($sqlFile.FullName)`""
            & cmd /c $cmdLine 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { Write-Warn "  迁移文件执行失败: $($sqlFile.Name)" }
        }
    }
    Write-Success '数据库迁移完成'
}

function Deploy-Services {
    Write-Info '部署 TOPEMS 服务...'
    Load-EnvFile (Join-Path $global:TopemsDataDir '.env')
    $compose = $null
    foreach ($f in @('.\docker-compose.prod.yml', '.\docker-compose.yml', '.\docker-compose.ci.yml')) {
        if (Test-Path $f) { $compose = $f; break }
    }
    if (-not $compose) {
        Write-Warn '未找到 docker-compose 文件，将手动部署基础服务'
        Deploy-ServiceManual 'iam-service' 8000
        return
    }
    Write-Info "使用配置文件: $compose"
    $env:COMPOSE_FILE = $compose
    & docker compose -f $compose up -d
    Write-Success '服务部署完成'
}

function Deploy-ServiceManual([string]$serviceName, [int]$port) {
    $image = "topems/$serviceName`:latest"
    $exists = @(& docker images 2>$null | Select-String "^topems/$serviceName")
    if (-not $exists) {
        Write-Warn "镜像不存在: $image（请先构建）"
        return 1
    }
    & docker run -d --name "topems-$serviceName" --network $global:TopemsNetwork `
        -e APP_ENV=production `
        -e "DATABASE_URL=postgres://$env:POSTGRES_USER@postgres:5432/$env:POSTGRES_DB" `
        -e "REDIS_URL=redis://redis:6379/0" `
        -e "JWT_SECRET=$env:JWT_SECRET" `
        -e "PORT=$port" `
        -v "$global:TopemsDataDir\logs:/app/logs" `
        -p "${port}:${port}" --restart unless-stopped $image
}

function Deploy-CheckStatus {
    Write-Info '检查部署状态...'
    Write-Host ''
    Write-Host '容器状态:'
    & docker ps --filter "name=topems" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}" 2>$null
    Write-Host ''
    Write-Host '端口监听:'
    foreach ($port in @(80, 5432, 6379, 8000, 8013)) {
        if (Test-Port $port) { Write-Host "  [OK] 端口 $port 已监听" } else { Write-Host "  [ ] 端口 $port 未监听" }
    }
}

function Deploy-Complete {
    Write-Host ''
    Write-Host '=============================================='
    Write-Host 'TOPEMS 部署完成!'
    Write-Host '=============================================='
    Write-Host ''
    Write-Host '访问地址:'
    Write-Host '  前端:    http://localhost'
    Write-Host '  IAM:     http://localhost:8000'
    Write-Host '  AI:      http://localhost:8013'
    Write-Host ''
    Write-Host "数据目录: $global:TopemsDataDir"
    Write-Host "环境配置: $global:TopemsDataDir\.env"
    Write-Host ''
    Write-Host '初始账号:'
    Write-Host '  用户名: admin'
    Write-Host '  密码:  admin123'
    Write-Host ''
}

# =============================================================================
# 5) Admin 密码重置（原 scripts/dev/update-admin-password.sh）
# =============================================================================
function Invoke-UpdateAdminPassword([string]$username, [string]$newPassword) {
    if (-not $username) { $username = 'admin' }
    if (-not $newPassword) { $newPassword = 'admin123' }
    $dbHost = [Environment]::GetEnvironmentVariable('DB_HOST', 'Process'); if (-not $dbHost) { $dbHost = 'localhost' }
    $dbPort = [Environment]::GetEnvironmentVariable('DB_PORT', 'Process'); if (-not $dbPort) { $dbPort = '5432' }
    $dbName = [Environment]::GetEnvironmentVariable('DB_NAME', 'Process'); if (-not $dbName) { $dbName = 'topems' }
    $dbUser = [Environment]::GetEnvironmentVariable('DB_USER', 'Process'); if (-not $dbUser) { $dbUser = 'topems' }
    $dbPwd = [Environment]::GetEnvironmentVariable('DB_PASSWORD', 'Process'); if (-not $dbPwd) { $dbPwd = 'topems_secret' }

    Write-Host '============================================================'
    Write-Host 'TOPEMS Admin 用户密码重置脚本'
    Write-Host '============================================================'
    Write-Host ''
    Write-Host "数据库连接信息:"
    Write-Host "  Host: ${dbHost}:${dbPort}"
    Write-Host "  Database: ${dbName}"
    Write-Host "  User: ${dbUser}"
    Write-Host ''
    Write-Host "目标用户: ${username}"
    Write-Host "新密码: ${newPassword}"
    Write-Host ''

    if (-not (Test-CommandExists 'psql')) {
        Write-Error2 'psql 未安装'
        Write-Host '请安装 PostgreSQL 客户端工具'
        return 1
    }
    $env:PGPASSWORD = $dbPwd

    Write-Host '------------------------------------------------------------'
    Write-Host '步骤 1: 查看当前用户信息'
    Write-Host '------------------------------------------------------------'
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT id, username, email, is_superuser, status FROM core_users WHERE username = '$username';" 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Error2 '查询失败'; Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue; return 1 }
    Write-Host ''

    $confirm = Read-Host '确认重置密码? (yes/no)'
    if ($confirm -notin @('yes','y','Y','YES','Yes')) {
        Write-Host '已取消'
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        return 0
    }

    $passwordHash = $null
    if ($newPassword -eq 'admin123') {
        $passwordHash = '$2b$12$YkGrx2WY9t1JbChfVNO7pe6S4T7iPjFm8j7dm5HBOe2d.InbncFce'
        Write-Host '使用预设 bcrypt 哈希（密码: admin123）'
    } else {
        if (Test-CommandExists 'python') {
            Write-Host '生成 bcrypt 哈希...'
            $passwordHash = (& python -c "import bcrypt,sys; print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt()).decode())" $newPassword 2>$null | Out-String).Trim()
            if (-not $passwordHash -or -not $passwordHash.StartsWith('$2')) {
                Write-Error2 '需要安装 bcrypt 库（pip install bcrypt），或使用默认密码 admin123'
                Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
                return 1
            }
        } else {
            Write-Error2 '需要 Python 3 来生成自定义密码哈希，或使用默认密码 admin123'
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
            return 1
        }
    }
    Write-Host ''

    Write-Host '------------------------------------------------------------'
    Write-Host '步骤 2: 更新密码'
    Write-Host '------------------------------------------------------------'
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "UPDATE core_users SET password_hash = '$passwordHash', updated_at = NOW() WHERE username = '$username';" 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Error2 '更新失败'; Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue; return 1 }
    Write-Host ''

    Write-Host '------------------------------------------------------------'
    Write-Host '步骤 3: 验证结果'
    Write-Host '------------------------------------------------------------'
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT username, email, substring(password_hash, 1, 30) || '...' as password_hash_preview, updated_at FROM core_users WHERE username = '$username';"
    Write-Host ''
    Write-Host '============================================================'
    Write-Host '密码重置成功!'
    Write-Host '============================================================'
    Write-Host ''
    Write-Host "登录信息:"
    Write-Host "  用户名: ${username}"
    Write-Host "  密码: ${newPassword}"
    Write-Host ''
    Write-Host '安全提示: 登录后请立即修改默认密码!'
    Write-Host ''
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    return 0
}
# =============================================
# 清理/预检 公共工具函数
# =============================================
# 文件/目录大小
function Get-DirSize([string]$path) {
    if (-not (Test-Path $path)) { return [long]0 }
    $sum = (Get-ChildItem $path -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    if (-not $sum) { $sum = [long]0 }
    return [long]$sum
}
function Get-HumanSize([long]$bytes) {
    if ($bytes -ge 1GB) { return ('{0:N1}G' -f ($bytes / 1GB)) }
    if ($bytes -ge 1MB) { return ('{0:N1}M' -f ($bytes / 1MB)) }
    if ($bytes -ge 1KB) { return ('{0:N1}K' -f ($bytes / 1KB)) }
    return "$bytes B"
}

# kill 后台 cargo-(llvm-cov|test|bench|build) 进程
function Invoke-KillBackgroundCargo([bool]$dryRun) {
    $cargoPids = New-Object System.Collections.ArrayList
    try {
        $procs = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
            $_.CommandLine -and $_.CommandLine -match 'cargo-(llvm-cov|test|bench|build)' -and $_.CommandLine -notmatch 'grep'
        }
        foreach ($p in $procs) { [void]$cargoPids.Add([int]$p.ProcessId) }
    } catch { }
    if ($cargoPids.Count -eq 0) { return 0 }

    if ($dryRun) {
        Write-Info "[DRY-RUN] 将终止后台 cargo 进程: $($cargoPids -join ' ')"
        return 1
    }
    Write-Warn "检测到后台 cargo 进程（会持续膨胀 target 吃磁盘），自动终止: $($cargoPids -join ' ')"
    foreach ($p in $cargoPids) { Stop-Process -Id $p -ErrorAction SilentlyContinue }
    Start-Sleep 2
    foreach ($p in $cargoPids) {
        if (Get-Process -Id $p -ErrorAction SilentlyContinue) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
    }
    Write-Success '后台 cargo 进程已终止'
    return 1
}

# 清理 coverage 独立 target 目录
function Invoke-CleanCovRemnants([bool]$dryRun) {
    $covDirs = @(
        (Join-Path $ProjectRoot 'target\llvm-cov-target'),
        (Join-Path $ProjectRoot 'lib\target')
    )
    $cleaned = 0
    foreach ($covDir in $covDirs) {
        if (Test-Path $covDir) {
            $size = Get-HumanSize (Get-DirSize $covDir)
            if ($dryRun) {
                Write-Info "[DRY-RUN] 将删除 coverage/target 残留: $covDir ($size)"
            } else {
                Write-Info "清理 coverage 残留: $covDir ($size)"
                Remove-Item $covDir -Recurse -Force -ErrorAction SilentlyContinue
                Write-Detail "已清理 $covDir"
            }
            $cleaned = 1
        }
    }
    return $cleaned
}

# 磁盘空间守卫
function Test-DiskSpace {
    $drive = Split-Path -Qualifier $ProjectRoot
    $psDrive = Get-PSDrive -Name $drive.TrimEnd(':') -ErrorAction SilentlyContinue
    if (-not $psDrive) { return 0 }
    $availGb = [math]::Floor($psDrive.Free / 1GB)
    if ($availGb -lt 5) {
        Write-Error2 "磁盘仅剩 ${availGb}GiB！即将满盘，请先执行: .\topems.ps1 clean"
        return 1
    } elseif ($availGb -lt 10) {
        Write-Warn "磁盘仅剩 ${availGb}GiB，建议执行: .\topems.ps1 clean"
    }
    return 0
}

# ---------- 主流程预检（轻量模式） ----------
function Invoke-Preflight([string[]]$allArgs) {
    foreach ($a in $allArgs) {
        if ($a -eq '--skip-preflight') { Write-Detail '已指定 --skip-preflight，跳过预检'; return $true }
    }
    # 轻量预检：杀后台 cargo + 清 coverage 残留 + 磁盘守卫
    Write-Host ''
    Write-Info '================================================'
    Write-Info '  TOPEMS 预检（轻量清理）'
    Write-Info '================================================'
    Write-Host ''
    $issues = 0
    if ((Invoke-KillBackgroundCargo $false) -ne 0) { $issues++ }
    if ((Invoke-CleanCovRemnants $false) -ne 0) { $issues++ }
    if (-not (Test-DiskSpace)) { return $false }
    if ($issues -gt 0) { Write-Success "预检完成（自动修复 $issues 项）" }
    else { Write-Detail '预检通过' }
    return $true
}

# ---------- 清理命令 ----------
function Invoke-CleanProject([string[]]$allArgs) {
    $cleanRust = $false; $cleanFrontend = $false; $cleanCache = $false
    $cleanSystemCache = $false; $cleanLogs = $false; $cleanOllama = $false
    $cleanAll = $false; $cleanDeep = $false; $dryRun = $false

    foreach ($arg in $allArgs) {
        switch ($arg) {
            '--rust'          { $cleanRust = $true }
            '--frontend'      { $cleanFrontend = $true }
            '--cache'         { $cleanCache = $true }
            '--system-cache'  { $cleanSystemCache = $true }
            '--logs'          { $cleanLogs = $true }
            '--ollama'        { $cleanOllama = $true }
            '--all'           { $cleanAll = $true }
            '--deep'          { $cleanDeep = $true }
            '--dry-run'       { $dryRun = $true }
            '--preflight'     { return (Invoke-Preflight @()) }
            default {
                Write-Error2 "未知参数: $arg"
                Write-Host '可用选项: --rust --frontend --cache --system-cache --ollama --logs --all --deep --dry-run'
                return 1
            }
        }
    }

    # 默认全量清理
    if (-not ($cleanRust -or $cleanFrontend -or $cleanCache -or $cleanSystemCache -or $cleanOllama -or $cleanLogs -or $cleanAll)) {
        $cleanAll = $true
    }
    if ($cleanAll) { $cleanRust = $true; $cleanFrontend = $true; $cleanCache = $true; $cleanLogs = $true }
    if ($cleanDeep) { $cleanFrontend = $true }

    # --system-cache 需要二次确认
    if ($cleanSystemCache -and -not $dryRun) {
        Write-Warn '即将清理系统级缓存，这将影响其他应用并触发全量重新下载！'
        Write-Host '  包括: pnpm 缓存、Cargo registry、IDE 缓存、SCCache 等'
        $confirm = Read-Host '确认继续？(y/N) '
        if ($confirm -notmatch '^[Yy]$') {
            Write-Warn '已取消系统缓存清理。'
            $cleanSystemCache = $false
        }
    }

    Write-Host ''
    Write-Info '================================================'
    Write-Info '  TOPEMS 清理命令'
    Write-Info '================================================'
    Write-Host ''
    $didClean = $false

    if ($cleanRust) {
        Invoke-KillBackgroundCargo $dryRun | Out-Null
        Invoke-CleanCovRemnants $dryRun | Out-Null

        $dir = Join-Path $ProjectRoot 'target'
        if (Test-Path $dir) {
            $size = Get-HumanSize (Get-DirSize $dir)
            if ($dryRun) { Write-Info "[DRY-RUN] 将删除 Rust 编译产物: $dir ($size)" }
            else {
                Write-Info '清理 Rust 编译产物 (cargo clean)...'
                & cargo clean 2>$null | Out-Null
                Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                Write-Success "已清理 target/ ($size)"
                $didClean = $true
            }
        } else { Write-Detail 'target/ 不存在，跳过' }

        $sqlxDir = Join-Path $ProjectRoot '.sqlx'
        if (Test-Path $sqlxDir) {
            $sqlxSize = Get-HumanSize (Get-DirSize $sqlxDir)
            if ($dryRun) { Write-Info "[DRY-RUN] 将删除 SQLx 缓存: $sqlxDir ($sqlxSize)" }
            else {
                Remove-Item $sqlxDir -Recurse -Force -ErrorAction SilentlyContinue
                Write-Detail "已清理 .sqlx ($sqlxSize)"
                $didClean = $true
            }
        }
    }

    if ($cleanFrontend) {
        $feDirs = @(
            (Join-Path $ProjectRoot 'apps\web\dist'),
            (Join-Path $ProjectRoot 'apps\web\coverage'),
            (Join-Path $ProjectRoot 'apps\web\playwright-report'),
            (Join-Path $ProjectRoot 'apps\web\test-results'),
            (Join-Path $ProjectRoot 'apps\desktop\dist'),
            (Join-Path $ProjectRoot 'apps\mobile\dist'),
            (Join-Path $ProjectRoot 'apps\web\.vite')
        )
        foreach ($dir in $feDirs) {
            if (Test-Path $dir) {
                $size = Get-HumanSize (Get-DirSize $dir)
                if ($dryRun) { Write-Info "[DRY-RUN] 将删除: $dir ($size)" }
                else {
                    Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Detail "已删除 $dir ($size)"
                    $didClean = $true
                }
            }
        }
        # node_modules 内部缓存
        foreach ($dir in @((Join-Path $ProjectRoot 'apps\web\node_modules\.vite'), (Join-Path $ProjectRoot 'apps\web\node_modules\.cache'))) {
            if (Test-Path $dir) {
                $size = Get-HumanSize (Get-DirSize $dir)
                if ($dryRun) { Write-Info "[DRY-RUN] 将删除: $dir ($size)" }
                else {
                    Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Detail "已删除 $dir ($size)"
                    $didClean = $true
                }
            }
        }
        # --deep 深度清理所有 node_modules
        if ($cleanDeep) {
            Write-Warn '--deep 模式: 将删除所有 node_modules 目录并 pnpm store prune'
            $deepDirs = @(
                (Join-Path $ProjectRoot 'node_modules'),
                (Join-Path $ProjectRoot 'apps\web\node_modules'),
                (Join-Path $ProjectRoot 'apps\desktop\node_modules'),
                (Join-Path $ProjectRoot 'apps\mobile\node_modules')
            )
            $pkgNodeModules = @(Get-ChildItem -Path (Join-Path $ProjectRoot 'packages') -Directory -Filter 'node_modules' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
            $deepDirs += $pkgNodeModules
            foreach ($dir in ($deepDirs | Select-Object -Unique)) {
                if (Test-Path $dir) {
                    $size = Get-HumanSize (Get-DirSize $dir)
                    if ($dryRun) { Write-Info "[DRY-RUN] 将删除: $dir ($size)" }
                    else {
                        Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                        Write-Detail "已删除 $dir ($size)"
                        $didClean = $true
                    }
                }
            }
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                if ($dryRun) { Write-Info '[DRY-RUN] 将执行 pnpm store prune' }
                else {
                    Write-Info '执行 pnpm store prune...'
                    & pnpm store prune 2>$null | Out-Null
                    Write-Detail 'pnpm store 已清理'
                    $didClean = $true
                }
            }
            Write-Success '深度清理完成。下次运行 build/dev 时会自动 pnpm install 重新安装'
        }
    }

    if ($cleanCache) {
        $projectCacheDirs = @(
            (Join-Path $ProjectRoot 'apps\web\.lighthouseci'),
            (Join-Path $ProjectRoot 'apps\web\.storybook'),
            (Join-Path $ProjectRoot 'cli\.venv'),
            (Join-Path $ProjectRoot 'cli\.pytest_cache'),
            (Join-Path $ProjectRoot 'apps\web\node_modules\.cache')
        )
        foreach ($dir in $projectCacheDirs) {
            if (Test-Path $dir) {
                $size = Get-HumanSize (Get-DirSize $dir)
                if ($dryRun) { Write-Info "[DRY-RUN] 将删除项目缓存: $dir ($size)" }
                else {
                    Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Detail "已删除 $dir ($size)"
                    $didClean = $true
                }
            }
        }
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            if ($dryRun) { Write-Info '[DRY-RUN] 将执行 pnpm store prune' }
            else {
                Write-Info '执行 pnpm store prune...'
                & pnpm store prune 2>$null | Out-Null
                Write-Detail 'pnpm store 已清理'
                $didClean = $true
            }
        }
    }

    if ($cleanSystemCache) {
        Write-Warn '清理系统级缓存（Windows 路径）...'
        $systemCacheDirs = @(
            (Join-Path $env:LOCALAPPDATA 'pnpm-cache'),
            (Join-Path $env:LOCALAPPDATA 'pnpm\store'),
            (Join-Path $env:USERPROFILE '.cargo\registry'),
            (Join-Path $env:LOCALAPPDATA 'Mozilla\sccache'),
            (Join-Path $env:APPDATA 'Trae CN'),
            (Join-Path $env:USERPROFILE '.cache\sccache')
        )
        foreach ($dir in $systemCacheDirs) {
            if (Test-Path $dir) {
                $size = Get-HumanSize (Get-DirSize $dir)
                if ($dryRun) { Write-Info "[DRY-RUN] 将删除系统缓存: $dir ($size)" }
                else {
                    Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Detail "已删除 $dir ($size)"
                    $didClean = $true
                }
            }
        }
    }

    if ($cleanOllama) {
        $requiredModels = New-Object System.Collections.ArrayList
        $envFile = Join-Path $ProjectRoot '.env'
        if (Test-Path $envFile) {
            Get-Content $envFile -Encoding UTF8 | ForEach-Object {
                if ($_ -match '^OLLAMA_MODEL=(.*)$') { [void]$requiredModels.Add($Matches[1].Trim()) }
                if ($_ -match '^EMBEDDING_MODEL=(.*)$') { [void]$requiredModels.Add($Matches[1].Trim()) }
            }
        }
        if ($requiredModels.Count -eq 0) { [void]$requiredModels.Add('qwen2.5:7b-instruct'); [void]$requiredModels.Add('nomic-embed-text') }
        Write-Info "项目需要保留的 Ollama 模型: $($requiredModels -join ' ')"
        $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
        if (-not $ollamaCmd) { Write-Warn '未安装 ollama，跳过模型清理' }
        else {
            $installed = & $ollamaCmd.Source list 2>$null | Select-Object -Skip 1 | ForEach-Object { ($_ -split '\s+')[0] }
            if (-not $installed) { Write-Detail '无已安装的 Ollama 模型' }
            else {
                foreach ($model in $installed) {
                    if ($requiredModels -contains $model) { Write-Detail "保留项目模型: $model" }
                    else {
                        if ($dryRun) { Write-Info "[DRY-RUN] 将删除 Ollama 模型: $model" }
                        else {
                            & $ollamaCmd.Source rm $model 2>$null | Out-Null
                            Write-Detail "已删除 Ollama 模型: $model"
                            $didClean = $true
                        }
                    }
                }
            }
            $blobs = Join-Path $env:USERPROFILE '.ollama\models\blobs'
            if (Test-Path $blobs) {
                $blobSize = Get-HumanSize (Get-DirSize $blobs)
                $blobCount = @(Get-ChildItem $blobs -Force -ErrorAction SilentlyContinue).Count
                if ($blobCount -gt 0) {
                    if ($dryRun) { Write-Info "[DRY-RUN] 将清理 Ollama blobs 残留: $blobs ($blobSize, $blobCount files)" }
                    else {
                        Remove-Item (Join-Path $blobs '*') -Recurse -Force -ErrorAction SilentlyContinue
                        Write-Detail "已清理 Ollama blobs 残留 ($blobSize)"
                        $didClean = $true
                    }
                }
            }
        }
    }

    if ($cleanLogs) {
        $logDir = Join-Path $ProjectRoot 'logs'
        if (Test-Path $logDir) {
            $size = Get-HumanSize (Get-DirSize $logDir)
            if ($dryRun) { Write-Info "[DRY-RUN] 将清空: $logDir ($size)" }
            else {
                Get-ChildItem $logDir -Recurse -Filter '*.log' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
                Write-Detail "已清空 $logDir 下的日志"
                $didClean = $true
            }
        }
        if ($dryRun) {
            $rootLogs = @(Get-ChildItem $ProjectRoot -Filter '*.log' -File -ErrorAction SilentlyContinue)
            if ($rootLogs.Count -gt 0) { Write-Info '[DRY-RUN] 将删除根目录日志文件' }
        } else {
            $rootLogs = @(Get-ChildItem $ProjectRoot -Filter '*.log' -File -ErrorAction SilentlyContinue)
            if ($rootLogs.Count -gt 0) {
                Get-ChildItem $ProjectRoot -Filter '*.log' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
                Write-Detail '已删除根目录日志文件'
                $didClean = $true
            }
        }
    }

    Write-Host ''
    if ($dryRun) { Write-Info '[DRY-RUN] 完成。无文件被实际删除。' }
    elseif ($didClean) {
        Write-Success '清理完成！'
        Write-Host ''
        Write-Detail '后续建议:'
        Write-Detail '  Rust:    cargo build  (重建 target/)'
        Write-Detail '  前端:    pnpm install && pnpm build'
        Write-Detail '  Python:  cd cli && python -m venv .venv && .\.venv\Scripts\Activate.ps1 && python -m pip install -e .'
    } else {
        Write-Warn '未执行任何清理操作。'
        Write-Host '  使用 --dry-run 预览将清理的内容，或指定具体选项如 --rust --cache 等。'
    }
    return 0
}

# =============================================
# 子 .sh 脚本调用辅助（Git Bash / WSL）
# =============================================
function ConvertTo-BashPath([string]$p) {
    $r = $p -replace '\\', '/'
    if ($r -match '^([A-Za-z]):(.*)$') { return "/$($Matches[1].ToLower())$($Matches[2])" }
    return $r
}
function ConvertTo-WslPath([string]$p) {
    $r = $p -replace '\\', '/'
    if ($r -match '^([A-Za-z]):(.*)$') { return "/mnt/$($Matches[1].ToLower())$($Matches[2])" }
    return $r
}
# 调用仍为 shell 脚本的子脚本（sqlx-prepare / install-deps / ai-models / deploy / update-admin-password）
function Invoke-BashScript([string]$script, [array]$scriptArgs) {
    $bash = Get-Command bash -ErrorAction SilentlyContinue
    if ($bash) {
        $bashPath = ConvertTo-BashPath $script
        & $bash.Source $bashPath @scriptArgs
        return $LASTEXITCODE
    }
    $wsl = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wsl) {
        $wslPath = ConvertTo-WslPath $script
        & $wsl.Source bash $wslPath @scriptArgs
        return $LASTEXITCODE
    }
    Write-Error2 "需要 Git Bash 或 WSL 才能运行 $script（该子脚本为 shell 脚本）"
    Write-Warning2 '建议安装 Git for Windows（自带 Git Bash），或将脚本所在路径加入 bash 可访问目录。'
    return 1
}

# =============================================
# 帮助
# =============================================
function Show-Help {
    @'
TOPEMS 服务管理工具 (Windows PowerShell 版)

用法: .\topems.ps1 <命令> [选项]

服务管理:
  status [服务]           查看服务状态
  start <服务>            启动服务（自动注册到 unified-core）
  stop <服务>             停止服务
  restart <服务>          重启服务
  check                   检查服务状态并自动重启异常服务
  logs <服务> [行数]      查看服务日志
  build <服务> [--online|--offline|--dev]  编译服务
  build-all [选项]        全量编译所有服务（后端+前端）
                            --prepare         先刷新 sqlx 缓存（需要 DATABASE_URL）
                            --only-core       只编核心服务（iam finance erp scm srm crm）
                            --online          强制在线编译（无缓存也可）
                            --offline         强制离线编译（失败立即停止）
                            --dev|--debug     编 debug 版（默认 release）
                            --skip=<svc>      跳过某个包，可重复
                            --backend-only    只编后端，跳过前端
                            --force           强制获取构建锁（避免并发冲突）
                            --skip-mem-check  跳过内存检查（CI / Docker 场景）
                            --serial          强制单线程串行构建，避免并行锁竞争
                            --cooldown=N      构建间冷却秒数（默认 2，serial 模式下生效）
  build-backend [选项]    编译所有后端服务（同 build-all 的后端子集）
  build-frontend [选项]   编译前端 (tsc && vite build)
                            --dev        若存在 build:dev 脚本则用，否则回退默认 build
                            --skip-lint  若存在 build:nolint 脚本则用，否则忽略
  register-all           批量注册所有运行中的服务到 unified-core（含重试）
  start-all [选项]        启动所有服务（含前端，自动注册）
                            --only-core       只启动核心服务（iam=unified-core）
                            --no-frontend     不启动前端
                            --no-register     不自动注册插件
                            --skip=<svc>      跳过某个服务
  stop-all                停止所有服务（含前端）
  restart-all [选项]      重启所有服务（透传 start-all 选项）

一键运行:
  run [选项]             一键启动数据库+所有服务（透传 start-all 选项）
  run-stop                一键停止所有服务+数据库

前端:
  start web               启动前端服务
  stop web                停止前端服务

测试:
  test-all                运行所有测试（后端+前端）
  test-backend            运行后端测试
  test-frontend [模式] [--no-typecheck]   运行前端测试
                            模式: all(默认) | unit | component | smoke | coverage
                                  shard:1 .. shard:8  (component 分片，省内存)
                            --no-typecheck: 跳过类型检查（纯跑 vitest）

SQLx 离线缓存 (V64+):
  sqlx prepare [--pkg=X] [--all]  生成离线缓存（内联实现）
  sqlx prepare --check            校验离线缓存
  sqlx prepare --merge            合并分包缓存到根 .sqlx
  sqlx check-offline              无 DATABASE_URL 下全量离线编译校验

数据库:
  db start                启动 PostgreSQL
  db stop                 停止 PostgreSQL
  db status               查看数据库状态（PostgreSQL+Redis）
  db migrate              运行数据库迁移
  db backup               备份数据库
  db restore <文件>       从备份文件恢复
  db reset                重置数据库（删除所有数据）
  db defense-check <svc>  单服务 Schema 防御自检（build+启动10s+grep自检日志）
  db defense-check-all    全量 Schema 防御自检（4 批共 26 服务）
  db boundary-check       静态跨 schema SQL 引用门禁（调用 check_schema_boundary.py）
  redis start             启动 Redis
  redis stop              停止 Redis

清理:
  clean [选项]            清理编译产物、缓存、日志
                            --rust         清理 Rust 编译产物 (target/, .sqlx, llvm-cov-target, lib/target) + 终止后台 cargo 进程
                            --frontend     清理前端产物 (dist/, coverage/, .vite 缓存)
                            --deep         深度清理所有 node_modules + pnpm store prune
                            --cache        清理项目级缓存 (.lighthouseci, .venv, .storybook 等)
                            --system-cache 清理系统级缓存 (pnpm/cargo/IDE，危险操作需确认)
                            --ollama       清理 Ollama 模型（保留项目使用的模型）
                            --logs         清理日志文件 (logs/*.log)
                            --all          全量清理（默认）
                            --dry-run      预演模式，仅显示将删除的内容

开发环境:
  dev                     启动开发环境 (Windows)
  install-deps [all|db|dev|ai|frontend|backend|verify]  依赖安装/引导（内联实现）
  ai start|stop|status|pull [模型]   Ollama 管理（内联实现）
  ws check                检查 WebSocket 连接状态

部署/密码:
  deploy [deploy|start|stop|restart|status|logs|clean]  部署（Docker，内联实现）
  update-password [用户] [密码]      重置管理员密码（内联实现）
  reset-password [用户] [密码]       同 update-password

其他:
  help                    显示本帮助
  <其它命令>               透传给 Python CLI (cli/.venv)

自动预检（主流程入口自动执行，磁盘 <5GiB 会阻断）:
  预检内容: 杀后台 cargo 进程 + 清 llvm-cov-target 残留 + 磁盘空间检查
  应用命令: run / dev / start-all / restart-all / build-all / test-backend
  跳过预检: 在以上命令后加 --skip-preflight（CI 场景或已清理过）

环境变量:
  MAX_RETRIES             最大重试次数（默认: 3）
  RETRY_DELAY             初始重试间隔（默认: 3秒）
  BACKOFF_FACTOR          退避系数（默认: 2，指数退避）
  FORCE_ONLINE_BUILD      设为 1 时 build/build-all 默认在线编译
  READY_TIMEOUT           单次启动等待端口就绪秒数（默认: 60）

示例:
  .\topems.ps1 status                    查看所有服务状态
  .\topems.ps1 start iam                 启动 IAM 服务
  .\topems.ps1 start-all --only-core     仅启动核心服务
  .\topems.ps1 start-all --no-frontend   只启动后端服务
  .\topems.ps1 logs hrm 100              查看 HRM 最近 100 行日志
  .\topems.ps1 build-all --serial        全量串行构建
  .\topems.ps1 run                       一键运行（数据库+所有服务）
  .\topems.ps1 db status                 查看数据库状态
  .\topems.ps1 db defense-check ehs      单服务 Schema 防御自检
  .\topems.ps1 db defense-check-all      全量 Schema 防御自检
'@ | Write-Host
}

# =============================================
# 主命令分发
# =============================================
$cmd = $CmdArgs[0]
$rest = @()
if ($CmdArgs.Count -gt 1) { $rest = @($CmdArgs[1..($CmdArgs.Count - 1)]) }

try {
    switch ($cmd) {
        'status' {
            if (-not $rest -or -not $rest[0]) { Show-AllStatus } else { Get-StatusService $rest[0] }
        }
        'start' {
            switch ($rest[0]) {
                'web' { Start-Frontend }
                'frontend' { Start-Frontend }
                $null {
                    Write-Error2 '请指定服务名'
                    Show-Help
                    exit 1
                }
                '' {
                    Write-Error2 '请指定服务名'
                    Show-Help
                    exit 1
                }
                default { Start-ServiceApp $rest[0] $(if ($rest.Count -gt 1) { $rest[1] } else { 'false' }) }
            }
        }
        'stop' {
            switch ($rest[0]) {
                'web' { Stop-Frontend }
                'frontend' { Stop-Frontend }
                $null { Stop-AllServices }
                '' { Stop-AllServices }
                default { Stop-ServiceApp $rest[0] }
            }
        }
        'restart' {
            switch ($rest[0]) {
                'web' { Stop-Frontend; Start-Frontend }
                'frontend' { Stop-Frontend; Start-Frontend }
                $null {
                    Write-Error2 '请指定服务名'
                    Show-Help
                    exit 1
                }
                '' {
                    Write-Error2 '请指定服务名'
                    Show-Help
                    exit 1
                }
                default {
                    Stop-ServiceApp $rest[0]
                    Start-Sleep 1
                    Start-ServiceApp $rest[0] $(if ($rest.Count -gt 1) { $rest[1] } else { 'false' })
                }
            }
        }
        'logs' {
            if (-not $rest -or -not $rest[0]) { Write-Error2 '请指定服务名'; Show-Help; exit 1 }
            $lineCount = if ($rest.Count -gt 1) { [int]$rest[1] } else { 50 }
            Show-LogsService $rest[0] $lineCount
        }
        'build' {
            if (-not $rest -or -not $rest[0]) { Write-Error2 '请指定服务名'; Show-Help; exit 1 }
            $opts = ($rest | Select-Object -Skip 1) -join ' '
            Invoke-BuildService $rest[0] $opts $null
        }
        'build-all' { Invoke-BuildAll $rest }
        'build-backend' { Invoke-BuildAllBackend (($rest -join ' ')) }
        'build-frontend' { Invoke-BuildFrontend (($rest -join ' ')) }
        'register-all' { Register-AllPlugins }
        'test-all' { Invoke-TestAll }
        'test-backend' { Invoke-TestBackend $rest }
        'test-frontend' { Invoke-TestFrontend $rest }
        'start-all' {
            Start-AllServices $rest
            Show-AllStatus
        }
        'stop-all' { Stop-AllServices }
        'restart-all' { Invoke-RestartAll $rest }
        'check' { Check-AndRestartServices }
        'sqlx' {
            $sub = if ($rest -and $rest[0]) { $rest[0] } else { 'prepare' }
            $extra = @($rest | Select-Object -Skip 1 | Where-Object { $_ })
            switch ($sub) {
                'prepare' { $null = Invoke-SqlxPrepare 'prepare' $extra }
                'check' { $env:SQLX_OFFLINE = 'true'; $null = Invoke-SqlxPrepare 'check' @() }
                'check-offline' { $env:SQLX_OFFLINE = 'true'; $null = Invoke-SqlxPrepare 'check-offline' @() }
                'merge' { $null = Invoke-SqlxPrepare 'merge' @() }
                'offline-test' { $null = Invoke-SqlxPrepare 'offline-test' @() }
                'semantic' { $null = Invoke-SqlxPrepare 'semantic' @() }
                default {
                    Write-Error2 "未知 sqlx 子命令: $sub"
                    Write-Host '可用命令: prepare, check, check-offline, merge, offline-test, semantic'
                    exit 1
                }
            }
        }
        'run' { Invoke-RunAll $rest }
        'run-stop' { Invoke-StopEverything }
        'db' {
            $sub = if ($rest -and $rest[0]) { $rest[0] } else { '' }
            switch ($sub) {
                'start' { Start-Database }
                'stop' { Stop-Database }
                'status' { Get-DatabaseStatus }
                'migrate' { Invoke-DbMigrate }
                'backup' { Invoke-DbBackup }
                'restore' { Invoke-DbRestore $(if ($rest.Count -gt 1) { $rest[1] } else { $null }) }
                'reset' { Invoke-DbReset }
                'defense-check' { Invoke-DbDefenseCheck $(if ($rest.Count -gt 1) { $rest[1] } else { $null }) }
                'defense-check-all' { Invoke-DbDefenseCheckAll }
                'boundary-check' { Invoke-DbBoundaryCheck }
                default {
                    Write-Error2 "未知数据库命令: $sub"
                    Write-Host '可用命令: start, stop, status, migrate, backup, restore, reset, defense-check, defense-check-all, boundary-check'
                    exit 1
                }
            }
        }
        'redis' {
            $sub = if ($rest -and $rest[0]) { $rest[0] } else { '' }
            switch ($sub) {
                'start' { Start-Redis }
                'stop' { Stop-Redis }
                default {
                    Write-Error2 "未知 redis 命令: $sub"
                    Write-Host '可用命令: start, stop'
                    exit 1
                }
            }
        }
        'dev' { Start-Dev $rest }
        'install-deps' {
            Write-Info '安装/引导依赖 (Windows)...'
            $t = if ($rest -and $rest[0]) { $rest[0] } else { 'all' }
            $null = Invoke-InstallDeps $t
        }
        'ai' {
            $sub = if ($rest -and $rest[0]) { $rest[0] } else { '' }
            $arg1 = if ($rest.Count -gt 1) { $rest[1] } else { $null }
            $arg2 = if ($rest.Count -gt 2) { $rest[2] } else { $null }
            $null = Invoke-AiModels $sub $arg1 $arg2
        }
        'ws' {
            $sub = if ($rest -and $rest[0]) { $rest[0] } else { '' }
            switch ($sub) {
                'check' { Invoke-WsCheck }
                default {
                    Write-Error2 "未知 WebSocket 命令: $sub"
                    Write-Host '可用命令: check'
                    exit 1
                }
            }
        }
        'deploy' {
            Write-Info '部署 (Docker)...'
            $act = if ($rest -and $rest[0]) { $rest[0] } else { 'deploy' }
            $arg = if ($rest.Count -gt 1) { $rest[1] } else { $null }
            $null = Invoke-Deploy $act $arg
        }
        { $_ -in @('update-password','reset-password') } {
            Write-Info '重置管理员密码...'
            $user = if ($rest -and $rest[0]) { $rest[0] } else { 'admin' }
            $pwd = if ($rest.Count -gt 1) { $rest[1] } else { 'admin123' }
            $null = Invoke-UpdateAdminPassword $user $pwd
        }
        { $_ -in @('help','--help','-h') } { Show-Help }
        'clean' { $null = Invoke-CleanProject $rest }
        default {
            # 其它命令透传给 Python CLI
            Invoke-RunCli $CmdArgs
        }
    }
} finally {
    Release-BuildLock
}
