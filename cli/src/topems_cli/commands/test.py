"""test 命令 - 运行测试"""

import subprocess
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

console = Console()


def run_cargo_test(cargo_args: list = None, cwd: str = None) -> tuple[int, str]:
    """运行 cargo 测试"""
    if cwd is None:
        cwd = Path(__file__).parent.parent.parent.parent.parent

    cmd = ["cargo", "test", "--color=never"]
    if cargo_args:
        cmd.extend(cargo_args)

    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300,
        )
        return result.returncode, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return -1, "测试超时 (5分钟)"
    except Exception as e:
        return -1, str(e)


@click.command()
@click.option("--unit", "-u", is_flag=True, help="运行单元测试")
@click.option("--integration", "-i", is_flag=True, help="运行集成测试")
@click.option("--all", "-a", is_flag=True, help="运行所有测试")
@click.option("--verbose", "-v", is_flag=True, help="详细输出")
@click.option("--service", "-s", help="只测试指定服务")
def test(unit: bool, integration: bool, all: bool, verbose: bool, service: str):
    """运行 TOPEMS 测试

    示例:
        topems test --all        运行所有测试
        topems test -u          运行单元测试
        topems test -i          运行集成测试
        topems test -s iam     只测试 iam 服务
    """
    project_root = Path(__file__).parent.parent.parent.parent.parent

    if not (unit or integration or all):
        console.print("[yellow]请指定测试类型[/yellow]")
        console.print("使用 --help 查看帮助")
        return

    # 确定测试范围
    if service:
        test_paths = [f"svc/{service}"]
    elif all:
        test_paths = ["svc/*"]
    else:
        test_paths = ["svc/*"]

    console.print(f"[cyan]开始测试...[/cyan]")

    results = []
    for test_path in test_paths:
        svc_dir = project_root / test_path.replace("/*", "")
        if not svc_dir.exists():
            continue

        # 查找所有包含测试的服务目录
        if "*" in test_path:
            for svc in svc_dir.glob("*"):
                if svc.is_dir() and (svc / "Cargo.toml").exists():
                    console.print(f"  测试 {svc.name}...")
                    returncode, output = run_cargo_test(cwd=str(svc))
                    results.append({
                        "service": svc.name,
                        "returncode": returncode,
                        "output": output,
                    })
        else:
            console.print(f"  测试 {svc_dir.name}...")
            returncode, output = run_cargo_test(cwd=str(svc_dir))
            results.append({
                "service": svc_dir.name,
                "returncode": returncode,
                "output": output,
            })

    # 显示结果
    table = Table(title="测试结果")
    table.add_column("服务", style="cyan")
    table.add_column("状态", style="green")
    table.add_column("详情", style="dim")

    for r in results:
        status = "✓ 通过" if r["returncode"] == 0 else "✗ 失败"
        status_style = "green" if r["returncode"] == 0 else "red"
        table.add_row(
            r["service"],
            f"[{status_style}]{status}[/{status_style}]",
            r["output"][:100] if r["output"] else "",
        )

    console.print(table)

    passed = sum(1 for r in results if r["returncode"] == 0)
    console.print(f"\n[{'green' if passed == len(results) else 'yellow'}]通过: {passed}/{len(results)}[/]")
