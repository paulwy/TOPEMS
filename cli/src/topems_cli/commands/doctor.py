"""doctor 命令 - 系统自检"""

import os
import shutil
import socket
import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent


def _check_tool(cmd: str) -> tuple[bool, str]:
    """检查工具是否可用，返回 (是否可用, 版本信息)"""
    try:
        result = subprocess.run(
            [cmd, "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return True, result.stdout.strip().split("\n")[0]
        return False, result.stderr.strip()
    except FileNotFoundError:
        return False, "未安装"
    except Exception as e:
        return False, str(e)


def _check_port(host: str, port: int) -> bool:
    """检查端口是否可用"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((host, port))
        sock.close()
        return result != 0  # 端口未被占用 = 可用
    except Exception:
        return False


def _check_env_file(env_path: Path) -> tuple[bool, int]:
    """检查 .env 文件是否存在且非空，返回 (是否存在, 行数)"""
    if env_path.exists():
        lines = len([l for l in env_path.read_text().split("\n") if l.strip() and not l.startswith("#")])
        return True, lines
    return False, 0


@click.command()
@click.option("--json", "-j", is_flag=True, help="JSON 格式输出")
@click.option("--verbose", "-v", is_flag=True, help="详细输出")
def doctor(json: bool, verbose: bool):
    """TOPEMS 系统自检

    检查项:
    1. Rust 工具链
    2. Node.js 环境
    3. Python 环境
    4. PostgreSQL 数据库
    5. Docker 容器运行时
    6. 关键端口可用性
    7. 环境配置文件
    8. 数据库迁移状态
    9. 前端构建能力

    示例:
        topems doctor          运行自检
        topems doctor -v      详细输出
        topems doctor --json   JSON 格式输出
    """
    console.print(Panel("[bold cyan]TOPEMS 系统自检[/bold cyan]",
                        title="Doctor", border_style="cyan"))

    results = []

    # ---- 1. Rust 工具链 ----
    console.print("\n[bold]1. Rust 工具链[/bold]")
    ok, version = _check_tool("cargo")
    results.append(("Rust (cargo)", ok, version))
    console.print(f"  {'[green]✓[/green]' if ok else '[red]✗[/red]'} cargo: {version if ok else '未安装'}")
    if ok:
        ok_rustc, ver_rustc = _check_tool("rustc")
        console.print(f"  {'[green]✓[/green]' if ok_rustc else '[red]✗[/red]'} rustc: {ver_rustc if ok_rustc else '未安装'}")

    # ---- 2. Node.js 环境 ----
    console.print("\n[bold]2. Node.js 环境[/bold]")
    ok_node, ver_node = _check_tool("node")
    ok_npm, ver_npm = _check_tool("npm")
    results.append(("Node.js", ok_node, ver_node))
    console.print(f"  {'[green]✓[/green]' if ok_node else '[red]✗[/red]'} node: {ver_node if ok_node else '未安装'}")
    console.print(f"  {'[green]✓[/green]' if ok_npm else '[red]✗[/red]'} npm: {ver_npm if ok_npm else '未安装'}")

    # ---- 3. Python 环境 ----
    console.print("\n[bold]3. Python 环境[/bold]")
    ok_py, ver_py = _check_tool("python3")
    results.append(("Python 3", ok_py, ver_py))
    console.print(f"  {'[green]✓[/green]' if ok_py else '[red]✗[/red]'} python3: {ver_py if ok_py else '未安装'}")

    # ---- 4. PostgreSQL 数据库 ----
    console.print("\n[bold]4. PostgreSQL 数据库[/bold]")
    ok_psql, ver_psql = _check_tool("psql")
    results.append(("PostgreSQL", ok_psql, ver_psql))
    console.print(f"  {'[green]✓[/green]' if ok_psql else '[red]✗[/red]'} psql: {ver_psql if ok_psql else '未安装'}")
    if ok_psql:
        # 检查 PostgreSQL 服务是否运行
        ok_pg_port = _check_port("localhost", 5432)
        pg_status = "未运行" if ok_pg_port else "运行中"
        console.print(f"  {'[green]✓[/green]' if not ok_pg_port else '[yellow]⚠[/yellow]'} PostgreSQL 服务: {pg_status} (端口 5432)")

    # ---- 5. Docker 容器运行时 ----
    console.print("\n[bold]5. Docker 容器运行时[/bold]")
    ok_docker, ver_docker = _check_tool("docker")
    results.append(("Docker", ok_docker, ver_docker))
    console.print(f"  {'[green]✓[/green]' if ok_docker else '[red]✗[/red]'} docker: {ver_docker if ok_docker else '未安装'}")
    if ok_docker:
        # 检查 Docker daemon 是否运行
        try:
            r = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=5)
            daemon_ok = r.returncode == 0
            console.print(f"  {'[green]✓[/green]' if daemon_ok else '[red]✗[/red]'} Docker daemon: {'运行中' if daemon_ok else '未运行'}")
        except Exception:
            console.print("  [yellow]⚠ Docker daemon 状态未知[/yellow]")

    # ---- 6. 关键端口可用性 ----
    console.print("\n[bold]6. 关键端口可用性[/bold]")
    ports_to_check = [
        (3000, "前端开发服务器"),
        (8080, "API 网关"),
        (5432, "PostgreSQL"),
        (6379, "Redis"),
    ]
    all_ports_free = True
    for port, desc in ports_to_check:
        is_free = _check_port("localhost", port)
        status = "[green]可用[/green]" if is_free else "[yellow]被占用[/yellow]"
        if not is_free:
            all_ports_free = False
        console.print(f"  端口 {port:5d} ({desc}): {status}")
    results.append(("关键端口", all_ports_free, f"{sum(1 for p, _ in ports_to_check if _check_port('localhost', p))}/{len(ports_to_check)} 可用"))

    # ---- 7. 环境配置文件 ----
    console.print("\n[bold]7. 环境配置文件[/bold]")
    env_files = [
        (PROJECT_ROOT / ".env", "项目根 .env"),
        (PROJECT_ROOT / "apps" / "web" / ".env", "前端 .env"),
        (PROJECT_ROOT / "config" / "services.yaml", "服务配置 services.yaml"),
    ]
    env_all_ok = True
    for path, desc in env_files:
        exists, lines = _check_env_file(path)
        if exists:
            console.print(f"  [green]✓[/green] {desc}: 存在 ({lines} 行配置)")
        else:
            console.print(f"  [yellow]⚠[/yellow] {desc}: 不存在 ({path})")
            env_all_ok = False
    results.append(("环境配置文件", env_all_ok, f"{sum(1 for p, _ in env_files if _check_env_file(p)[0])}/{len(env_files)} 存在"))

    # ---- 8. 数据库迁移状态 ----
    console.print("\n[bold]8. 数据库迁移状态[/bold]")
    migrations_dir = PROJECT_ROOT / "database" / "migrations"
    if migrations_dir.exists():
        migration_count = len(list(migrations_dir.glob("*.sql")))
        console.print(f"  [green]✓[/green] 迁移目录存在: {migration_count} 个迁移文件")
        results.append(("数据库迁移", True, f"{migration_count} 个文件"))
    else:
        console.print(f"  [yellow]⚠[/yellow] 迁移目录不存在: {migrations_dir}")
        results.append(("数据库迁移", False, "目录不存在"))

    # ---- 9. 前端构建能力 ----
    console.print("\n[bold]9. 前端构建能力[/bold]")
    web_dir = PROJECT_ROOT / "apps" / "web"
    node_modules = web_dir / "node_modules"
    tsconfig = web_dir / "tsconfig.json"
    vite_config = web_dir / "vite.config.ts"

    checks_fe = []
    if node_modules.exists():
        console.print("  [green]✓[/green] node_modules: 存在")
        checks_fe.append(True)
    else:
        console.print("  [red]✗[/red] node_modules: 不存在 (运行 npm install)")
        checks_fe.append(False)

    if tsconfig.exists():
        console.print("  [green]✓[/green] tsconfig.json: 存在")
        checks_fe.append(True)
    else:
        console.print("  [red]✗[/red] tsconfig.json: 不存在")
        checks_fe.append(False)

    if vite_config.exists():
        console.print("  [green]✓[/green] vite.config.ts: 存在")
        checks_fe.append(True)
    else:
        console.print("  [red]✗[/red] vite.config.ts: 不存在")
        checks_fe.append(False)

    fe_ok = all(checks_fe)
    results.append(("前端构建能力", fe_ok, f"{sum(checks_fe)}/{len(checks_fe)} 项通过"))

    # ---- 总结 ----
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    score = passed / total * 100

    console.print(f"\n[bold]自检结果: {passed}/{total} 项通过 ({score:.0f}分)[/bold]")

    if score >= 90:
        console.print("[green]✓ 系统状态良好，可以开始开发[/green]")
    elif score >= 60:
        console.print("[yellow]⚠ 部分检查未通过，建议修复后继续[/yellow]")
    else:
        console.print("[red]✗ 多项检查未通过，请先修复环境[/red]")

    if verbose:
        console.print("\n[dim]详细检查项:[/dim]")
        for name, ok, detail in results:
            console.print(f"  {'[green]✓[/green]' if ok else '[red]✗[/red]'} {name}: {detail}")
