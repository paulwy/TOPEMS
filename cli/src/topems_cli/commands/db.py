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
            "unified-core", "pm", "portal", "integration",
            "erp", "finance", "hrm", "crm", "rd", "lims", "pdm",
            "mes", "qms", "ehs", "scm", "srm", "wms",
            "gis", "analytics", "ai", "mobile", "master-data"
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


# ==============================================================================
# Schema 防御自检（V69.2）
# ==============================================================================

@db.group(name="schema-defense")
def schema_defense():
    """Schema 防御体系：增量迁移 + 一致性自检（对应 docs/development/backend/database-development.md）"""
    pass


# 26 服务覆盖率追踪表（与 database-development.md 附录A保持一致，
# 真实状态请以 `schema-defense audit` 实际跑取为准）
_COVERAGE = [
    # (批次, 服务名, 状态emoji, 说明)
    # ---------- 第 1 批：核心 4 服务（V69.2 首发） ----------
    ("第1批·核心4", "gis",              "✅", "V69.2 首发（18表）— schema=gis"),
    ("第1批·核心4", "ehs",              "✅", "V69.2 首发（43表，内联）— schema=ehs"),
    ("第1批·核心4", "portal",           "✅", "V69.2 首发（115表 20文件）— schema=portal"),
    ("第1批·核心4", "finance",          "✅", "V69.2 首发（66表 10文件）— schema=finance"),
    # ---------- 第 2 批：高频业务 10 服务（V69.3 落地） ----------
    ("第2批·业务10", "erp",              "✅", "V69.3 落地（30表/464列）— schema=erp"),
    ("第2批·业务10", "hrm",              "✅", "V69.3 落地（17表/301列）— schema=hrm"),
    ("第2批·业务10", "crm",              "✅", "V69.3 落地（10表/188列）— schema=crm"),
    ("第2批·业务10", "pm",               "✅", "V69.3 落地（17表/220列）— schema=pm"),
    ("第2批·业务10", "scm",              "✅", "V69.3 落地（12表/224列）— schema=scm"),
    ("第2批·业务10", "wms",              "✅", "V69.3 落地（29表/864列）— schema=wms"),
    ("第2批·业务10", "srm",              "✅", "V69.3 落地（8表/114列）— schema=srm"),
    ("第2批·业务10", "pdm",              "✅", "V69.3 落地（18表/213列）— schema=pdm"),
    ("第2批·业务10", "mes",              "✅", "V69.3 落地（10表/314列）— schema=mes"),
    ("第2批·业务10", "qms",              "✅", "V69.3 落地（33表/564列）— schema=qms"),
    # ---------- 第 3 批：业务 7 服务（V69.3 落地） ----------
    ("第3批·业务7", "ai",               "✅", "V69.3 落地（4表/54列）— schema=ai"),
    ("第3批·业务7", "billing",          "✅", "V69.3 落地（4表/53列）— schema=public"),
    ("第3批·业务7", "rd",               "✅", "V69.3 落地（4表/64列）— schema=rs"),
    ("第3批·业务7", "ticket",           "✅", "V69.3 落地（5表/59列）— schema=public"),
    ("第3批·业务7", "feedback",         "✅", "V69.3 落地（1表/13列）— schema=public"),
    ("第3批·业务7", "plugin-registry",  "✅", "V69.3 落地（8表/89列）— schema=public"),
    ("第3批·业务7", "mobile",           "✅", "V69.3 落地（10表/114列）— schema=mobile"),
    # ---------- 第 4 批：平台 5 服务（V69.4 修复后落地） ----------
    ("第4批·平台5", "unified-core",     "✅", "V69.4 修复补齐（30表/290列，含复合PK）— schema=public"),
    ("第4批·平台5", "integration",      "✅", "V69.4 重写TABLE_DEFS（9表/132列）— schema=integration"),
    ("第4批·平台5", "master-data",      "✅", "V69.3 落地（4表/32列）— schema=public"),
    ("第4批·平台5", "communication",    "✅", "V69.4 补齐deleted_at（9表/96列，含复合PK）— schema=public"),
    ("第4批·平台5", "analytics",        "✅", "V69.4 重写TABLE_DEFS（16表/194列）— schema=bi"),
    # ---------- 骨架服务（无 DB 表，已排除防御检查） ----------
    ("骨架·排除", "lowcode",          "🚫", "无DB表，已排除 — 低代码平台前端为主"),
    ("骨架·排除", "monitor",          "🚫", "无DB表，已排除 — 运行时监控组件"),
    ("骨架·排除", "search",           "🚫", "无DB表，已排除 — 搜索引擎适配层"),
]


@schema_defense.command(name="status")
def schema_defense_status():
    """打印 Schema 防御覆盖率追踪表（26 服务 + 3 骨架）"""
    console.print("[bold]🛡️  Schema 防御覆盖率追踪表（V69.4，静态快照）[/bold]")
    console.print("[dim]真实合规性请运行：[/dim]schema-defense audit all")
    console.print()

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("批次", style="cyan", no_wrap=True)
    table.add_column("服务", style="bold yellow")
    table.add_column("状态", justify="center")
    table.add_column("说明")

    for row in _COVERAGE:
        table.add_row(*row)

    console.print(table)

    # 底部汇总：按防御服务（排除骨架）统计
    defense_rows = [r for r in _COVERAGE if r[2] != "🚫"]
    skeleton_rows = [r for r in _COVERAGE if r[2] == "🚫"]
    done = sum(1 for r in defense_rows if r[2] == "✅")
    total = len(defense_rows)
    pct = int(done / total * 100) if total > 0 else 0
    console.print()
    console.print(
        f"[bold]合计（防御服务）：[/bold] 已防御 [green]{done}[/green]/[yellow]{total}[/yellow] 服务 "
        f"≈ [bold green]{pct}%[/bold green]  |  骨架排除 [dim]{len(skeleton_rows)} 服务（lowcode/monitor/search）[/dim]"
    )
    if done == total and total == 26:
        console.print("[bold green]🎯 26/26 = 100% 全量覆盖目标已达成（V69.3 + V69.4）[/bold green]")
    console.print(
        "[dim]规范文档: docs/development/backend/database-development.md[/dim]"
    )


@schema_defense.command(name="audit")
@click.argument("target", required=False, default="all")
def schema_defense_audit(target: str):
    """实际跑 defense-check：<service> 单服务 / all（默认）全量 / core4（gis+ehs+portal+finance）"""
    project_root = Path(__file__).parent.parent.parent.parent.parent
    topems_sh = project_root / "scripts" / "topems.sh"
    if not topems_sh.exists():
        console.print(f"[red]✗ 找不到脚本: {topems_sh}[/red]")
        return

    if target in ("all", "defense-check-all"):
        cmd = [str(topems_sh), "db", "defense-check-all"]
    elif target == "core4":
        cmd = [str(topems_sh), "db", "defense-check-all"]
        console.print("[dim]core4 快捷方式：当前 defense-check-all 已覆盖 core4~core4+4 批共 26 服务，实际执行全量检查。[/dim]")
    else:
        cmd = [str(topems_sh), "db", "defense-check", target]

    console.print(f"[bold]执行: {' '.join(cmd)}[/bold]")
    console.print()

    result = subprocess.run(cmd, cwd=str(project_root))
    raise SystemExit(result.returncode)
