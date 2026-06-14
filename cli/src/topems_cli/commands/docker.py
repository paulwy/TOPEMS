"""docker 命令 - Docker 容器管理"""

import click
from rich.console import Console
from rich.table import Table

console = Console()


@click.group()
def docker():
    """Docker 容器管理

    示例:
        topems docker status     查看容器状态
        topems docker start      启动容器
        topems docker stop       停止容器
        topems docker logs iam   查看容器日志
    """
    pass


@docker.command()
def status():
    """查看容器状态"""
    from ..docker import get_docker_manager

    docker_mgr = get_docker_manager()

    if not docker_mgr.is_docker_available():
        console.print("[red]错误: Docker 不可用[/red]")
        return

    status = docker_mgr.get_container_status()

    if "error" in status:
        console.print(f"[red]错误: {status['error']}[/red]")
        return

    if not status["containers"]:
        console.print("[yellow]没有运行中的容器[/yellow]")
        return

    table = Table(title="Docker 容器状态")
    table.add_column("服务", style="cyan")
    table.add_column("状态", style="green")
    table.add_column("端口", style="magenta")

    for container in status["containers"]:
        name = container.get("Service", "unknown")
        state = container.get("State", "unknown")
        status_style = "green" if state == "running" else "red"
        table.add_row(
            name,
            f"[{status_style}]{state}[/{status_style}]",
            container.get("Ports", "-"),
        )

    console.print(table)
    console.print(f"\n[dim]总计: {status['total']} 容器[/dim]")


@docker.command()
@click.argument("services", nargs=-1)
@click.option("--profile", "-p", help="指定 profile")
def start(services, profile):
    """启动容器"""
    from ..docker import get_docker_manager

    docker_mgr = get_docker_manager()

    if not docker_mgr.is_docker_available():
        console.print("[red]错误: Docker 不可用[/red]")
        return

    service_list = list(services) if services else None

    console.print("[cyan]正在启动容器...[/cyan]")
    success = docker_mgr.start_services(services=service_list, profile=profile)

    if success:
        console.print("[green]✓ 容器启动成功[/green]")
    else:
        console.print("[red]✗ 容器启动失败[/red]")


@docker.command()
@click.argument("services", nargs=-1)
def stop(services):
    """停止容器"""
    from ..docker import get_docker_manager

    docker_mgr = get_docker_manager()

    if not docker_mgr.is_docker_available():
        console.print("[red]错误: Docker 不可用[/red]")
        return

    service_list = list(services) if services else None

    console.print("[cyan]正在停止容器...[/cyan]")
    success = docker_mgr.stop_services(services=service_list)

    if success:
        console.print("[green]✓ 容器停止成功[/green]")
    else:
        console.print("[red]✗ 容器停止失败[/red]")


@docker.command()
@click.argument("service")
@click.option("--lines", "-n", default=100, help="日志行数")
def logs(service, lines):
    """查看容器日志"""
    from ..docker import get_docker_manager

    docker_mgr = get_docker_manager()

    if not docker_mgr.is_docker_available():
        console.print("[red]错误: Docker 不可用[/red]")
        return

    console.print(f"[cyan]获取 {service} 日志...[/cyan]\n")
    log_content = docker_mgr.get_logs(service, lines=lines)
    console.print(log_content)
