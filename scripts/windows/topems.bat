@echo off
REM TOPEMS Windows 启动器
REM 使用 PowerShell 运行部署脚本

echo ================================================
echo TOPEMS Windows 部署工具
echo ================================================
echo.

REM 检查 PowerShell 是否可用
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PowerShell 未找到，请安装 Windows PowerShell
    exit /b 1
)

REM 获取脚本目录
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM 运行 PowerShell 脚本
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%topems-standalone.ps1" %*

pause
