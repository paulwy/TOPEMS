"""start 命令 - 启动服务"""

import asyncio

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


@click.command()
@click.argument("service", required=False)
@click.option("--module", "-m", help="启动整个模块的服务")
@click.option("--all", "-a", is_flag=True, help="启动所有服务")
@click.option("--wait/--no-wait", default=True, help="等待服务健康检查")
@click.option("--timeout", default=30, help="健康检查超时时间(秒)")
def start(service: str, module: str, all: bool, wait: bool, timeout: int):
    """启动 TOPEMS 服务

    示例:
        topems start iam           启动单个服务
        topems start -m core      启动核心模块
        topems start --all        启动所有服务
    """
    from ..config import get_config
    from ..manager import get_manager

    config = get_config()
    manager = get_manager()

    services_to_start = []

    if all:
        services_to_start = config.get_all_services()
        console.print(f"[cyan]准备启动所有 {len(services_to_start)} 个服务...[/cyan]")
    elif module:
        services_to_start = config.get_module_services(module)
        if not services_to_start:
            console.print(f"[red]未知的模块: {module}[/red]")
            console.print(f"可用的模块: {', '.join(config.get_all_modules())}")
            return
        console.print(f"[cyan]准备启动模块 '{module}' 的 {len(services_to_start)} 个服务...[/cyan]")
    elif service:
        svc = config.get_service(service)
        if not svc:
            console.print(f"[red]未知的服务: {service}[/red]")
            return
        services_to_start = [svc]
        console.print(f"[cyan]准备启动服务 '{service}'...[/cyan]")
    else:
        console.print("[yellow]请指定要启动的服务或模块[/yellow]")
        console.print("使用 --help 查看帮助")
        return

    # 显示要启动的服务列表
    for svc in services_to_start:
        console.print(f"  • {svc.name} ({svc.port})")

    console.print()

    # 启动服务
    results = {}
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        for svc in services_to_start:
            task = progress.add_task(f"启动 {svc.name}...", total=None)
            success = manager.start_service(svc.name, wait=wait, timeout=timeout)
            results[svc.name] = success
            progress.update(task, completed=True)

    # 显示结果
    console.print()
    success_count = sum(1 for v in results.values() if v)
    console.print(f"[{'green' if success_count == len(results) else 'yellow'}]启动完成: {success_count}/{len(results)} 成功[/]")

    if success_count < len(results):
        failed = [k for k, v in results.items() if not v]
        console.print(f"[red]失败的服务: {', '.join(failed)}[/red]")
