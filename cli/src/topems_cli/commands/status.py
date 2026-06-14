"""status 命令 - 查看服务状态"""

import json

import click
from rich.console import Console
from rich.table import Table

console = Console()


@click.command()
@click.argument("service", required=False)
@click.option("--module", "-m", help="查看模块的服务状态")
@click.option("--all", "-a", is_flag=True, help="查看所有服务状态")
@click.option("--json", "-j", is_flag=True, help="JSON 格式输出")
@click.option("--watch", "-w", is_flag=True, help="持续监控")
@click.option("--interval", default=5, help="监控间隔秒数")
def status(service: str, module: str, all: bool, json: bool, watch: bool, interval: int):
    """查看 TOPEMS 服务状态

    示例:
        topems status           查看所有服务
        topems status iam       查看单个服务
        topems status -m core   查看核心模块
        topems status --json    JSON 格式输出
    """
    from ..config import get_config
    from ..manager import get_manager

    config = get_config()
    manager = get_manager()

    services_to_check = []

    if all:
        services_to_check = config.get_all_services()
    elif module:
        services_to_check = config.get_module_services(module)
    elif service:
        svc = config.get_service(service)
        if svc:
            services_to_check = [svc]
    else:
        services_to_check = config.get_all_services()

    if not services_to_check:
        console.print("[yellow]没有找到匹配的服务[/yellow]")
        return

    # 收集结果
    results = []
    for svc in services_to_check:
        instance = manager.check_service_status(svc.name)
        results.append({
            "name": svc.name,
            "port": svc.port,
            "status": "running" if instance.is_running else "stopped",
            "description": svc.description,
        })

    if json:
        console.print(json.dumps(results, indent=2, ensure_ascii=False))
        return

    # 表格输出
    table = Table(title="TOPEMS 服务状态")
    table.add_column("服务", style="cyan")
    table.add_column("端口", style="magenta")
    table.add_column("状态", style="green")
    table.add_column("描述", style="dim")

    running_count = 0
    for r in results:
        status_style = "green" if r["status"] == "running" else "red"
        status_text = "● running" if r["status"] == "running" else "○ stopped"
        table.add_row(
            r["name"],
            str(r["port"]),
            f"[{status_style}]{status_text}[/{status_style}]",
            r["description"],
        )
        if r["status"] == "running":
            running_count += 1

    console.print(table)
    console.print(f"\n[dim]运行中: {running_count}/{len(results)}[/dim]")
