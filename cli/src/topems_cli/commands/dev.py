"""dev 命令 - 开发环境管理"""

import os
import shutil
import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent


def _check_tool(cmd: str, version_args: str = "--version") -> tuple[bool, str]:
    """检查工具是否可用，返回 (是否可用, 版本信息)"""
    try:
        result = subprocess.run(
            [cmd, *version_args.split()],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            version = result.stdout.strip().split("\n")[0]
            return True, version
        return False, result.stderr.strip()
    except FileNotFoundError:
        return False, "未安装"
    except Exception as e:
        return False, str(e)


@click.group()
def dev():
    """开发环境管理

    示例:
        topems dev setup    初始化开发环境
    """
    pass


@dev.command()
@click.option("--skip-deps", is_flag=True, help="跳过依赖安装")
@click.option("--skip-db", is_flag=True, help="跳过数据库初始化")
@click.option("--skip-migrations", is_flag=True, help="跳过数据库迁移")
@click.option("--frontend-only", is_flag=True, help="仅设置前端环境")
@click.option("--backend-only", is_flag=True, help="仅设置后端环境")
def setup(skip_deps: bool, skip_db: bool, skip_migrations: bool,
          frontend_only: bool, backend_only: bool):
    """初始化 TOPEMS 开发环境

    执行步骤:
    1. 检查必要工具 (Rust, Node.js, Python, PostgreSQL)
    2. 安装前端依赖 (npm install)
    3. 安装后端依赖 (cargo build)
    4. 初始化数据库 (如有)
    5. 运行数据库迁移

    示例:
        topems dev setup              完整初始化
        topems dev setup --frontend-only   仅前端
        topems dev setup --skip-db   跳过数据库
    """
    console.print(Panel("[bold cyan]TOPEMS 开发环境初始化[/bold cyan]",
                        title="Dev Setup", border_style="cyan"))

    # ---- Step 1: 检查工具 ----
    console.print("\n[bold]步骤 1/5: 检查开发工具[/bold]")
    tools_table = Table(title="工具检查", show_header=True)
    tools_table.add_column("工具", style="cyan")
    tools_table.add_column("状态", justify="center")
    tools_table.add_column("版本", style="dim")

    checks = [
        ("Rust (cargo)", "cargo"),
        ("Node.js (npm)", "npm"),
        ("Python 3", "python3"),
        ("PostgreSQL (psql)", "psql"),
        ("Docker", "docker"),
        ("Git", "git"),
    ]

    all_ok = True
    for label, cmd in checks:
        ok, version = _check_tool(cmd)
        status = "[green]✓ 已安装[/green]" if ok else "[red]✗ 缺失[/red]"
        if not ok:
            all_ok = False
        tools_table.add_row(label, status, version if ok else "-")
        console.print(f"  {label}: {status} {'(' + version + ')' if ok else ''}")

    console.print(tools_table)

    if not all_ok:
        console.print("\n[yellow]⚠ 部分工具缺失，请安装后再运行。[/yellow]")
        console.print("  Rust: https://rustup.rs")
        console.print("  Node.js: https://nodejs.org")
        console.print("  PostgreSQL: https://www.postgresql.org/download/")

    do_frontend = not backend_only
    do_backend = not frontend_only

    # ---- Step 2: 安装前端依赖 ----
    if do_frontend and not skip_deps:
        console.print("\n[bold]步骤 2/5: 安装前端依赖 (npm install)[/bold]")
        web_dir = PROJECT_ROOT / "apps" / "web"
        if web_dir.exists():
            console.print(f"  目录: {web_dir}")
            result = subprocess.run(
                ["npm", "install"],
                cwd=str(web_dir),
                capture_output=True,
                text=True,
                timeout=300,
            )
            if result.returncode == 0:
                console.print("  [green]✓ 前端依赖安装成功[/green]")
            else:
                console.print("  [red]✗ 前端依赖安装失败[/red]")
                console.print(f"  [dim]{result.stderr[:200]}[/dim]")
        else:
            console.print("  [yellow]⚠ apps/web 目录不存在，跳过[/yellow]")
    else:
        console.print("\n[dim]步骤 2/5: 跳过前端依赖安装[/dim]")

    # ---- Step 3: 安装后端依赖 ----
    if do_backend and not skip_deps:
        console.print("\n[bold]步骤 3/5: 编译后端 (cargo build)[/bold]")
        if (PROJECT_ROOT / "Cargo.toml").exists():
            console.print(f"  目录: {PROJECT_ROOT}")
            result = subprocess.run(
                ["cargo", "build"],
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                timeout=600,
            )
            if result.returncode == 0:
                console.print("  [green]✓ 后端编译成功[/green]")
            else:
                console.print("  [red]✗ 后端编译失败[/red]")
                console.print(f"  [dim]{result.stderr[:200]}[/dim]")
        else:
            console.print("  [yellow]⚠ Cargo.toml 不存在，跳过[/yellow]")
    else:
        console.print("\n[dim]步骤 3/5: 跳过后端编译[/dim]")

    # ---- Step 4: 数据库初始化 ----
    if not skip_db:
        console.print("\n[bold]步骤 4/5: 数据库初始化[/bold]")
        db_script = PROJECT_ROOT / "database" / "init.sql"
        if db_script.exists() and shutil.which("psql"):
            console.print(f"  初始化脚本: {db_script.name}")
            console.print("  [green]✓ 数据库初始化脚本存在[/green]")
            console.print("  [dim]  请手动执行: psql -U postgres -f database/init.sql[/dim]")
        else:
            console.print("  [yellow]⚠ 数据库初始化脚本或 psql 不存在，跳过[/yellow]")
    else:
        console.print("\n[dim]步骤 4/5: 跳过数据库初始化[/dim]")

    # ---- Step 5: 数据库迁移 ----
    if not skip_migrations and not skip_db:
        console.print("\n[bold]步骤 5/5: 数据库迁移[/bold]")
        migrations_dir = PROJECT_ROOT / "database" / "migrations"
        if migrations_dir.exists():
            migration_count = len(list(migrations_dir.glob("*.sql")))
            console.print(f"  迁移文件数: {migration_count}")
            console.print("  [green]✓ 迁移目录存在[/green]")
            console.print("  [dim]  请手动执行迁移或使用: topems db migrate[/dim]")
        else:
            console.print("  [yellow]⚠ 迁移目录不存在，跳过[/yellow]")
    else:
        console.print("\n[dim]步骤 5/5: 跳过数据库迁移[/dim]")

    # ---- 总结 ----
    console.print(f"\n[bold cyan]开发环境初始化完成[/bold cyan]")
    console.print("  下一步:")
    console.print("  • 启动服务: topems start")
    console.print("  • 检查健康: topems doctor")
    console.print("  • 运行测试: topems test --all")
