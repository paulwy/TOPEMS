"""构建命令模块"""

import os
import shutil
import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

# 与 topems.sh SERVICES_CONFIG 对齐的后端服务列表
BACKEND_SERVICES = [
    "lib",
    "svc/unified-core", "svc/pm", "svc/portal",
    "svc/integration", "svc/erp", "svc/finance", "svc/ai",
    "svc/hrm", "svc/crm", "svc/mes", "svc/pdm",
    "svc/scm", "svc/wms", "svc/srm", "svc/qms",
    "svc/lims", "svc/ehs", "svc/rd", "svc/analytics",
    "svc/mobile", "svc/gis",
    "svc/search", "svc/communication", "svc/billing",
    "svc/ticket", "svc/feedback", "svc/master-data",
]


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

    services = BACKEND_SERVICES
    
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
@click.option("--skip-install", is_flag=True, help="跳过依赖安装检查（假设 node_modules 已就绪）")
def build_frontend(dev: bool, skip_install: bool):
    """构建前端"""
    console.print("[bold]构建前端...[/bold]")

    project_root = Path(__file__).parent.parent.parent.parent.parent
    web_path = project_root / "apps" / "web"

    if not web_path.exists():
        console.print("[red]前端目录不存在[/red]")
        return

    # 对标 scripts/topems.sh ensure_frontend_deps
    # node_modules 缺失时自动 pnpm install，并设置 PUPPETEER_SKIP_DOWNLOAD 避免 Chromium 下载阻塞
    if not skip_install and not (web_path / "node_modules").exists():
        console.print("[yellow]node_modules 缺失，自动安装依赖...[/yellow]")
        if not os.environ.get("PUPPETEER_SKIP_DOWNLOAD"):
            os.environ["PUPPETEER_SKIP_DOWNLOAD"] = "true"
            console.print("[blue]已自动设置 PUPPETEER_SKIP_DOWNLOAD=true（本机 dev 模式）[/blue]")
        install_result = subprocess.run(
            ["pnpm", "install", "--silent"],
            cwd=str(project_root),
        )
        if install_result.returncode != 0:
            console.print("[red]✗[/red] 依赖安装失败，中止构建")
            return

    if dev:
        console.print("[yellow]开发模式启动前端开发服务器...[/yellow]")
        subprocess.run(["pnpm", "dev"], cwd=str(web_path))
    else:
        result = subprocess.run(["pnpm", "build"], cwd=str(web_path))

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
            shutil.rmtree(target_path, ignore_errors=True)
            console.print(f"删除 target/{target}")
    
    console.print("[green]✓[/green] 清理完成")
