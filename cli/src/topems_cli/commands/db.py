"""数据库命令模块"""

import os
import subprocess
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

console = Console()


def get_db_config():
    """获取数据库配置"""
    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": os.getenv("POSTGRES_PORT", "5432"),
        "user": os.getenv("POSTGRES_USER", "topems"),
        "password": os.getenv("POSTGRES_PASSWORD", "topems_secret"),
        "database": os.getenv("POSTGRES_DB", "topems"),
    }


def get_connection_string():
    """获取数据库连接字符串"""
    cfg = get_db_config()
    return f"postgresql://{cfg['user']}:{cfg['password']}@{cfg['host']}:{cfg['port']}/{cfg['database']}"


def run_psql(command: str, database: str = None) -> tuple:
    """运行 psql 命令"""
    cfg = get_db_config()
    db = database or cfg["database"]
    
    env = os.environ.copy()
    env["PGPASSWORD"] = cfg["password"]
    
    cmd = [
        "psql",
        "-h", cfg["host"],
        "-p", cfg["port"],
        "-U", cfg["user"],
        "-d", db,
        "-c", command,
    ]
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env
    )
    
    return result.returncode, result.stdout, result.stderr


@click.group()
def db():
    """数据库管理命令"""
    pass


@db.command(name="status")
def db_status():
    """查看数据库状态"""
    console.print("[bold]数据库状态[/bold]")
    
    cfg = get_db_config()
    
    # 检查 psql 是否可用
    if not subprocess.run(["which", "psql"], capture_output=True).returncode == 0:
        console.print("[red]psql 未安装[/red]")
        return
    
    # 显示配置
    table = Table(show_header=True)
    table.add_column("配置项")
    table.add_column("值")
    
    table.add_row("主机", cfg["host"])
    table.add_row("端口", cfg["port"])
    table.add_row("用户", cfg["user"])
    table.add_row("数据库", cfg["database"])
    
    console.print(table)
    console.print()
    
    # 测试连接
    console.print("测试连接...", end=" ")
    returncode, stdout, stderr = run_psql("SELECT 1 AS connected;")
    
    if returncode == 0:
        console.print("[green]✓ 连接成功[/green]")
    else:
        console.print("[red]✗ 连接失败[/red]")
        console.print(f"[red]{stderr}[/red]")


@db.command(name="list")
def db_list():
    """列出所有数据库"""
    console.print("[bold]数据库列表[/bold]")
    
    returncode, stdout, stderr = run_psql(
        "SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size "
        "FROM pg_database WHERE datistemplate = false ORDER BY datname;",
        database="postgres"
    )
    
    if returncode == 0:
        console.print(stdout)
    else:
        console.print(f"[red]错误: {stderr}[/red]")


@db.command(name="tables")
def db_tables():
    """列出所有表"""
    console.print("[bold]数据库表列表[/bold]")
    
    returncode, stdout, stderr = run_psql(
        "SELECT table_schema, table_name FROM information_schema.tables "
        "WHERE table_schema NOT IN ('pg_catalog', 'information_schema') "
        "ORDER BY table_schema, table_name;"
    )
    
    if returncode == 0:
        console.print(stdout)
    else:
        console.print(f"[red]错误: {stderr}[/red]")


@db.command(name="migrate")
@click.option("--service", "-s", help="仅迁移指定服务")
def db_migrate(service: str):
    """运行数据库迁移"""
    console.print("[bold]运行数据库迁移...[/bold]")
    
    project_root = Path(__file__).parent.parent.parent.parent.parent
    
    if service:
        # 迁移单个服务
        service_path = project_root / "svc" / service / "migrations"
        if service_path.exists():
            console.print(f"迁移服务: {service}")
            for migration in sorted(service_path.glob("*.sql")):
                console.print(f"  执行: {migration.name}")
                with open(migration) as f:
                    returncode, stdout, stderr = run_psql(f.read())
                    if returncode != 0:
                        console.print(f"[red]错误: {stderr}[/red]")
        else:
            console.print(f"[yellow]服务 {service} 没有迁移目录[/yellow]")
    else:
        # 迁移所有服务
        services = [
            "iam", "pm", "notification", "portal", "flow", "integration",
            "erp", "hrm", "crm", "rs", "lims", "pdm", "doc",
            "mes", "qms", "ehs", "scm", "srm", "wms",
            "file", "mail", "im", "gis", "bi", "report", "ai", "mobile"
        ]
        
        for svc in services:
            service_path = project_root / "svc" / svc / "migrations"
            if service_path.exists():
                console.print(f"\n[cyan]服务: {svc}[/cyan]")
                for migration in sorted(service_path.glob("*.sql")):
                    console.print(f"  执行: {migration.name}")
                    with open(migration) as f:
                        returncode, stdout, stderr = run_psql(f.read())
                        if returncode != 0:
                            console.print(f"[yellow]警告: {stderr[:100]}[/yellow]")
        
        console.print("\n[green]✓ 迁移完成[/green]")


@db.command(name="backup")
@click.argument("output_file", required=False)
def db_backup(output_file: str = None):
    """备份数据库"""
    if not output_file:
        from datetime import datetime
        output_file = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    
    console.print(f"[bold]备份数据库到: {output_file}[/bold]")
    
    cfg = get_db_config()
    
    cmd = [
        "pg_dump",
        "-h", cfg["host"],
        "-p", cfg["port"],
        "-U", cfg["user"],
        "-d", cfg["database"],
        "-f", output_file,
    ]
    
    env = os.environ.copy()
    env["PGPASSWORD"] = cfg["password"]
    
    result = subprocess.run(cmd, env=env)
    
    if result.returncode == 0:
        console.print(f"[green]✓ 备份成功: {output_file}[/green]")
    else:
        console.print(f"[red]✗ 备份失败[/red]")


@db.command(name="restore")
@click.argument("input_file")
def db_restore(input_file: str):
    """恢复数据库"""
    if not Path(input_file).exists():
        console.print(f"[red]文件不存在: {input_file}[/red]")
        return
    
    console.print(f"[bold yellow]警告: 这将覆盖现有数据![/bold yellow]")
    
    if not click.confirm("继续?"):
        return
    
    console.print(f"从 {input_file} 恢复数据库...")
    
    cfg = get_db_config()
    
    cmd = [
        "psql",
        "-h", cfg["host"],
        "-p", cfg["port"],
        "-U", cfg["user"],
        "-d", cfg["database"],
        "-f", input_file,
    ]
    
    env = os.environ.copy()
    env["PGPASSWORD"] = cfg["password"]
    
    result = subprocess.run(cmd, env=env)
    
    if result.returncode == 0:
        console.print("[green]✓ 恢复成功[/green]")
    else:
        console.print(f"[red]✗ 恢复失败: {result.stderr}[/red]")


@db.command(name="init")
def db_init():
    """初始化数据库"""
    console.print("[bold]初始化数据库...[/bold]")
    
    cfg = get_db_config()
    
    # 创建用户
    console.print("创建用户...")
    returncode, stdout, stderr = run_psql(
        f"CREATE USER {cfg['user']} WITH PASSWORD '{cfg['password']}';",
        database="postgres"
    )
    
    if returncode == 0:
        console.print(f"  [green]✓[/green] 用户 {cfg['user']} 已创建")
    elif "already exists" in stderr:
        console.print(f"  [yellow]用户已存在[/yellow]")
    else:
        console.print(f"  [red]错误: {stderr}[/red]")
    
    # 创建数据库
    console.print("创建数据库...")
    returncode, stdout, stderr = run_psql(
        f"CREATE DATABASE {cfg['database']} OWNER {cfg['user']};",
        database="postgres"
    )
    
    if returncode == 0:
        console.print(f"  [green]✓[/green] 数据库 {cfg['database']} 已创建")
    elif "already exists" in stderr:
        console.print(f"  [yellow]数据库已存在[/yellow]")
    else:
        console.print(f"  [red]错误: {stderr}[/red]")
    
    # 安装扩展
    console.print("安装扩展...")
    extensions = ["uuid-ossp", "pg_trgm", "vector"]
    
    for ext in extensions:
        returncode, stdout, stderr = run_psql(f"CREATE EXTENSION IF NOT EXISTS {ext};")
        if returncode == 0:
            console.print(f"  [green]✓[/green] {ext}")
        else:
            console.print(f"  [yellow]⚠[/yellow] {ext}: {stderr[:50] if stderr else '可能不支持'}")
    
    console.print("\n[green]✓ 数据库初始化完成[/green]")


@db.command(name="drop")
def db_drop():
    """删除数据库（危险操作）"""
    console.print("[bold red]警告: 这将删除所有数据![/bold red]")
    
    if not click.confirm("确认删除数据库?"):
        return
    
    cfg = get_db_config()
    
    # 终止所有连接
    console.print("终止所有连接...")
    run_psql(
        f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
        f"WHERE datname = '{cfg['database']}' AND pid <> pg_backend_pid();",
        database="postgres"
    )
    
    # 删除数据库
    console.print("删除数据库...")
    returncode, stdout, stderr = run_psql(
        f"DROP DATABASE IF EXISTS {cfg['database']};",
        database="postgres"
    )
    
    if returncode == 0:
        console.print(f"[green]✓ 数据库 {cfg['database']} 已删除[/green]")
    else:
        console.print(f"[red]错误: {stderr}[/red]")
