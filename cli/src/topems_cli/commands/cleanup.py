"""清理命令模块"""

import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


def _get_project_root() -> Path:
    """获取项目根目录"""
    return Path(__file__).parent.parent.parent.parent.parent


@click.group()
def cleanup():
    """清理命令"""
    pass


@cleanup.command(name="cache")
@click.option("-y", "--yes", is_flag=True, help="跳过确认")
def clean_cache(yes: bool):
    """清理编译缓存"""
    console.print("[bold]清理编译缓存...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    
    targets = [
        ("target/debug", "Debug 构建"),
        ("target/release", "Release 构建"),
        (".cargo", "Cargo 缓存"),
    ]
    
    if not yes:
        console.print("[yellow]警告: 这将删除所有编译缓存！[/yellow]")
        if not click.confirm("继续?"):
            return
    
    for target, name in targets:
        path = project_root / target
        if path.exists():
            console.print(f"删除 {name}...")
            subprocess.run(["rm", "-rf", str(path)], check=False)
    
    console.print("[green]✓[/green] 编译缓存清理完成")


@cleanup.command(name="warnings")
@click.option("-y", "--yes", is_flag=True, help="跳过确认")
def clean_warnings(yes: bool):
    """自动修复 Rust 代码警告"""
    console.print("[bold]自动修复 Rust 代码警告...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    services = [
        "lib",
        "svc/unified-core", "svc/pm", "svc/portal",
        "svc/integration", "svc/erp", "svc/hrm",
        "svc/crm", "svc/rd", "svc/lims", "svc/pdm",
        "svc/mes", "svc/qms", "svc/ehs", "svc/scm", "svc/srm",
        "svc/wms", "svc/gis", "svc/analytics", "svc/ai", "svc/mobile",
        "svc/finance", "svc/master-data",
    ]
    
    passed = 0
    failed = 0
    
    for service in services:
        service_path = project_root / service
        if service_path.exists() and (service_path / "Cargo.toml").exists():
            console.print(f"处理 {service}...")
            result = subprocess.run(
                ["cargo", "fix", "--allow-dirty", "--bins", "--tests"],
                cwd=str(service_path),
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                passed += 1
                console.print(f"  [green]✓[/green] {service}")
            else:
                failed += 1
                console.print(f"  [yellow]⚠[/yellow] {service}")
    
    console.print(f"\n完成: [green]{passed}[/green] 成功, [yellow]{failed}[/yellow] 失败")


@cleanup.command(name="logs")
@click.option("-y", "--yes", is_flag=True, help="跳过确认")
def clean_logs(yes: bool):
    """清理日志文件"""
    console.print("[bold]清理日志文件...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    logs_dir = project_root / "logs"
    
    if not yes:
        if not click.confirm("继续?"):
            return
    
    if logs_dir.exists():
        for log_file in logs_dir.glob("*.log"):
            console.print(f"删除 {log_file.name}...")
            log_file.unlink()
    
    console.print("[green]✓[/green] 日志清理完成")


@cleanup.command(name="all")
@click.option("-y", "--yes", is_flag=True, help="跳过确认")
def clean_all(yes: bool):
    """清理所有缓存、日志和编译产物"""
    console.print("[bold red]全面清理...[/bold red]")
    
    if not yes:
        console.print("[yellow]警告: 这将删除所有编译缓存和日志！[/yellow]")
        if not click.confirm("继续?"):
            return
    
    project_root = _get_project_root()

    # 停止所有服务
    console.print("停止所有服务...")
    subprocess.run(["bash", "scripts/topems.sh", "stop-all"], cwd=str(project_root), check=False)

    # 清理缓存
    console.print("清理编译缓存...")
    for target in ["target/debug", "target/release", ".cargo"]:
        path = project_root / target
        if path.exists():
            subprocess.run(["rm", "-rf", str(path)], check=False)

    # 清理日志
    console.print("清理日志文件...")
    logs_dir = project_root / "logs"
    if logs_dir.exists():
        for log_file in logs_dir.glob("*.log"):
            log_file.unlink()

    console.print("[green]✓[/green] 全面清理完成")


@cleanup.command(name="services")
@click.option("-y", "--yes", is_flag=True, help="跳过确认")
def clean_services(yes: bool):
    """停止所有服务并清理端口"""
    console.print("[bold]清理服务进程...[/bold]")

    if not yes:
        if not click.confirm("继续?"):
            return

    # 停止所有服务（lazy init 避免 import 时崩溃）
    from ..manager import get_manager
    manager = get_manager()
    manager.stop_all()

    console.print("[green]✓[/green] 服务清理完成")


@cleanup.command(name="node_modules")
@click.option("-y", "--yes", is_flag=True, help="跳过确认")
@click.option("--dry-run", is_flag=True, help="预演模式，仅显示将删除的内容")
def clean_node_modules(yes: bool, dry_run: bool):
    """深度清理所有 node_modules 目录并 pnpm store prune

    对标 scripts/topems.sh clean --deep。
    用于解决 dual @types/react 残留 / node_modules 与 lockfile 不一致等系统性问题。
    """
    console.print("[bold]深度清理 node_modules...[/bold]")

    project_root = _get_project_root()

    # 收集所有 node_modules 目录：根 + apps/* + packages/*
    target_dirs: list[Path] = []
    for pattern in [
        "node_modules",
        "apps/*/node_modules",
        "packages/*/node_modules",
    ]:
        for p in project_root.glob(pattern):
            if p.is_dir() and p.name == "node_modules":
                target_dirs.append(p)

    if not target_dirs:
        console.print("[yellow]未发现任何 node_modules 目录[/yellow]")
        return

    if not yes and not dry_run:
        console.print("[yellow]警告: 将删除以下目录并执行 pnpm store prune[/yellow]")
        for p in target_dirs:
            console.print(f"  {p.relative_to(project_root)}")
        if not click.confirm("继续?"):
            return

    import shutil

    for p in target_dirs:
        try:
            size = sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) // (1024 * 1024)
            size_str = f"{size}M" if size > 0 else "<1M"
        except (PermissionError, OSError):
            size_str = "?"
        rel = p.relative_to(project_root)
        if dry_run:
            console.print(f"[blue][DRY-RUN] 将删除: {rel} ({size_str})[/blue]")
        else:
            try:
                shutil.rmtree(p, ignore_errors=True)
                console.print(f"[green]✓[/green] 已删除 {rel} ({size_str})")
            except Exception as e:
                console.print(f"[red]✗[/red] 删除失败 {rel}: {e}")

    # pnpm store prune（清理未引用包，不影响其他项目）
    if dry_run:
        console.print("[blue][DRY-RUN] 将执行 pnpm store prune[/blue]")
    else:
        console.print("执行 pnpm store prune...")
        result = subprocess.run(
            ["pnpm", "store", "prune"],
            cwd=str(project_root),
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            console.print("[green]✓[/green] pnpm store 已清理")
        else:
            console.print(f"[yellow]⚠[/yellow] pnpm store prune 失败: {result.stderr[:200]}")

    console.print(
        "[green]✓[/green] 深度清理完成。下次运行 build/dev 时会自动 pnpm install 重新安装"
    )
