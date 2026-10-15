"""stop 命令 - 停止服务

与 scripts/topems.sh 的 stop 命令功能重叠。
日常开发推荐使用 ./scripts/topems.sh stop（零依赖）。
本命令提供 --module 按模块停止和 rich 输出，作为可选替代。
"""

import click
from rich.console import Console

console = Console()


@click.command()
@click.argument("service", required=False)
@click.option("--module", "-m", help="停止整个模块的服务")
@click.option("--all", "-a", is_flag=True, help="停止所有服务")
@click.option("--force", "-f", is_flag=True, help="强制停止 (SIGKILL)")
@click.option("--with-db", is_flag=True, help="额外停止 PostgreSQL/Redis（对齐 topems.sh stop-all --with-db / run-stop）")
def stop(service: str, module: str, all: bool, force: bool, with_db: bool):
    """停止 TOPEMS 服务

    示例:
        topems stop iam           停止单个服务
        topems stop -m core      停止核心模块
        topems stop --all        停止所有服务
        topems stop --force      强制停止
        topems stop --all --with-db   连 PostgreSQL/Redis 一起停（= topems.sh run-stop）
    """
    import subprocess

    from ..config import get_config
    from ..manager import get_manager

    config = get_config()
    manager = get_manager()

    if not any([service, module, all]):
        console.print("[yellow]请指定要停止的服务或模块[/yellow]")
        console.print("使用 --help 查看帮助")
        return

    services_to_stop = []

    if all:
        services_to_stop = [s.name for s in config.get_all_services()]
        console.print(f"[cyan]准备停止所有 {len(services_to_stop)} 个服务...[/cyan]")
    elif module:
        services = config.get_module_services(module)
        services_to_stop = [s.name for s in services]
        console.print(f"[cyan]准备停止模块 '{module}' 的 {len(services_to_stop)} 个服务...[/cyan]")
    elif service:
        services_to_stop = [service]
        console.print(f"[cyan]准备停止服务 '{service}'...[/cyan]")

    # 停止服务
    results = {}
    for svc_name in services_to_stop:
        success = manager.stop_service(svc_name, force=force)
        results[svc_name] = success

    # 停止前端（--all 时自动包含）
    if all:
        console.print("[cyan]停止前端服务...[/cyan]")
        manager.stop_frontend(force=force)

    # --with-db：额外停止 PostgreSQL / Redis（对齐 topems.sh stop_everything）
    if with_db:
        console.print("[cyan]停止 PostgreSQL / Redis...[/cyan]")
        for svc in ("postgresql@18", "redis"):
            result = subprocess.run(
                ["brew", "services", "stop", svc],
                capture_output=True, text=True,
            )
            if result.returncode == 0:
                console.print(f"[green]✓[/green] {svc} 已停止")
            else:
                console.print(f"[yellow]⚠[/yellow] {svc} 停止失败（可能非 brew 安装或已停止）: {result.stderr.strip()[:120]}")

    # 显示结果
    console.print()
    success_count = sum(1 for v in results.values() if v)
    console.print(f"[{'green' if success_count == len(results) else 'yellow'}]停止完成: {success_count}/{len(results)} 成功[/]")

    if success_count < len(results):
        failed = [k for k, v in results.items() if not v]
        console.print(f"[red]失败的服务: {', '.join(failed)}[/red]")
