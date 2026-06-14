"""构建命令模块"""

import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


@click.group()
def build():
    """构建命令"""
    pass


@build.command(name="all")
@click.option("--release", is_flag=True, help="Release 构建")
@click.option("-j", "--jobs", default=4, help="并行构建数")
def build_all(release: bool, jobs: int):
    """构建所有服务"""
    console.print("[bold]构建所有服务...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    
    services = [
        "lib",
        "svc/iam", "svc/pm", "svc/notification", "svc/portal",
        "svc/flow", "svc/integration", "svc/erp", "svc/hrm",
        "svc/crm", "svc/rs", "svc/lims", "svc/pdm", "svc/doc",
        "svc/mes", "svc/qms", "svc/ehs", "svc/scm", "svc/srm",
        "svc/wms", "svc/file", "svc/mail", "svc/im", "svc/gis",
        "svc/bi", "svc/report", "svc/ai", "svc/mobile",
    ]
    
    build_type = "release" if release else "debug"
    passed = 0
    failed = 0
    skipped = 0
    
    for service in services:
        service_path = project_root / service
        if not service_path.exists() or not (service_path / "Cargo.toml").exists():
            skipped += 1
            continue
        
        console.print(f"构建 {service}...", end=" ")
        
        cmd = ["cargo", "build"]
        if release:
            cmd.append("--release")
        cmd.extend(["-j", str(jobs)])
        
        result = subprocess.run(
            cmd,
            cwd=str(service_path),
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            console.print("[green]✓[/green]")
            passed += 1
        else:
            console.print(f"[red]✗[/red] {result.stderr[-100:] if result.stderr else ''}")
            failed += 1
    
    console.print(f"\n构建完成: [green]{passed}[/green] 成功, [red]{failed}[/red] 失败, [yellow]{skipped}[/yellow] 跳过")


@build.command(name="service")
@click.argument("service_name")
@click.option("--release", is_flag=True, help="Release 构建")
def build_service(service_name: str, release: bool):
    """构建单个服务"""
    console.print(f"[bold]构建服务: {service_name}[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    service_path = project_root / "svc" / service_name
    
    if not service_path.exists():
        console.print(f"[red]服务不存在: {service_name}[/red]")
        return
    
    if not (service_path / "Cargo.toml").exists():
        console.print(f"[red]无效的服务: {service_name}[/red]")
        return
    
    cmd = ["cargo", "build"]
    if release:
        cmd.append("--release")
    
    result = subprocess.run(
        cmd,
        cwd=str(service_path),
    )
    
    if result.returncode == 0:
        console.print(f"[green]✓[/green] 服务 {service_name} 构建成功")
    else:
        console.print(f"[red]✗[/red] 服务 {service_name} 构建失败")


@build.command(name="lib")
@click.option("--release", is_flag=True, help="Release 构建")
def build_lib(release: bool):
    """构建共享库"""
    console.print("[bold]构建共享库...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    lib_path = project_root / "lib"
    
    cmd = ["cargo", "build", "--lib"]
    if release:
        cmd.append("--release")
    
    result = subprocess.run(cmd, cwd=str(lib_path))
    
    if result.returncode == 0:
        console.print("[green]✓[/green] 共享库构建成功")
    else:
        console.print("[red]✗[/red] 共享库构建失败")


@build.command(name="frontend")
@click.option("--dev", is_flag=True, help="开发模式")
def build_frontend(dev: bool):
    """构建前端"""
    console.print("[bold]构建前端...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    web_path = project_root / "apps" / "web"
    
    if not web_path.exists():
        console.print("[red]前端目录不存在[/red]")
        return
    
    if dev:
        console.print("[yellow]开发模式启动前端开发服务器...[/yellow]")
        subprocess.run(["npm", "run", "dev"], cwd=str(web_path))
    else:
        result = subprocess.run(["npm", "run", "build"], cwd=str(web_path))
        
        if result.returncode == 0:
            console.print("[green]✓[/green] 前端构建成功")
        else:
            console.print("[red]✗[/red] 前端构建失败")


@build.command(name="clean")
def build_clean():
    """清理构建产物"""
    console.print("[bold]清理构建产物...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    
    for target in ["debug", "release"]:
        target_path = project_root / "target" / target
        if target_path.exists():
            subprocess.run(["rm", "-rf", str(target_path)], check=False)
            console.print(f"删除 target/{target}")
    
    console.print("[green]✓[/green] 清理完成")
