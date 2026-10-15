"""ops 命令组 - 对齐 scripts/topems.sh 新约定

- reset-password / update-password：调用 scripts/dev/update-admin-password.sh
  （topems.sh:4032-4035：默认 admin / admin123）
- run：一键启动数据库 + 所有服务（对标 topems.sh run / run_all）
- run-stop：stop-all --with-db 的别名（topems.sh:3939-3941 = stop_everything）
"""

import subprocess
from pathlib import Path

import click
from rich.console import Console

console = Console()

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent


@click.command(name="reset-password")
@click.argument("username", required=False, default="admin")
@click.argument("password", required=True)
def reset_password(username: str, password: str):
    """重置管理员密码（主名）

    语义对齐 topems.sh:4032-4035 -> scripts/dev/update-admin-password.sh <user> <password>

    示例:
        topems reset-password admin newpass     # 密码必填（无默认弱口令）
    """
    script = PROJECT_ROOT / "scripts" / "dev" / "update-admin-password.sh"
    if not script.exists():
        console.print(f"[red]✗ 找不到脚本: {script}[/red]")
        return
    console.print(f"[bold]重置密码: 用户={username}[/bold]")
    # -y 跳过交互确认（CLI 非交互调用链，对齐 topems.sh:4034）
    result = subprocess.run(["bash", str(script), "-y", username, password], cwd=str(PROJECT_ROOT))
    raise SystemExit(result.returncode)


@click.command(name="run")
@click.option("--auto-build", is_flag=True, help="先全量 cargo build 再启动（对齐 topems.sh run --auto-build:2544-2556）")
@click.option("--no-frontend", is_flag=True, help="不启动前端")
def run(auto_build: bool, no_frontend: bool):
    """一键启动 PostgreSQL + 所有后端服务 + 前端（对标 topems.sh run / run_all）

    示例:
        topems run                 启动全部
        topems run --auto-build    先全量编译再启动
    """
    from ..config import get_config
    from ..manager import get_manager

    config = get_config()
    manager = get_manager()

    if auto_build:
        console.print("[cyan]--auto-build: 先全量编译 (cargo build)...[/cyan]")
        result = subprocess.run(["cargo", "build"], cwd=str(PROJECT_ROOT))
        if result.returncode != 0:
            console.print("[red]错误: 全量编译失败，中止 run[/red]")
            raise SystemExit(1)

    console.print("[cyan]检查数据库连接...[/cyan]")
    postgres_ready, postgres_message = manager.ensure_postgres_ready()
    if not postgres_ready:
        console.print(f"[red]错误: {postgres_message}[/red]")
        raise SystemExit(1)
    console.print(f"[green]✓ {postgres_message}[/green]")

    services = config.get_all_services()
    console.print(f"[cyan]启动所有 {len(services)} 个后端服务...[/cyan]")
    ok = 0
    for svc in services:
        if manager.start_service(svc.name):
            ok += 1
    console.print(f"[green]后端启动完成: {ok}/{len(services)}[/green]")

    if not no_frontend:
        console.print("[cyan]启动前端服务...[/cyan]")
        if manager.start_frontend():
            console.print("[green]✓ 前端启动成功[/green]")
        else:
            console.print("[red]前端启动失败[/red]")


@click.command(name="run-stop")
def run_stop():
    """停止一切 = stop-all --with-db（topems.sh:3939-3941 stop_everything）

    停止所有后端服务 + 前端 + PostgreSQL + Redis。
    """
    from ..config import get_config
    from ..manager import get_manager

    config = get_config()
    manager = get_manager()

    console.print("[bold]========== 一键停止 ==========[/bold]")
    for svc in config.get_all_services():
        manager.stop_service(svc.name)
    manager.stop_frontend()

    for svc in ("postgresql@18", "redis"):
        result = subprocess.run(["brew", "services", "stop", svc], capture_output=True, text=True)
        if result.returncode == 0:
            console.print(f"[green]✓[/green] {svc} 已停止")
        else:
            console.print(f"[yellow]⚠[/yellow] {svc} 停止失败（可能非 brew 安装或已停止）")

    console.print("[green]✓ 一键停止完成[/green]")
