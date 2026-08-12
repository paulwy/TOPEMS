"""test 命令 - 运行测试"""

import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

console = Console()

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent


def run_cargo_test(cargo_args: list = None, cwd: str = None) -> tuple[int, str]:
    """运行 cargo 测试"""
    if cwd is None:
        cwd = str(PROJECT_ROOT)

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


def run_vitest(vitest_args: list = None, cwd: str = None) -> tuple[int, str]:
    """运行前端 vitest 测试"""
    if cwd is None:
        cwd = str(PROJECT_ROOT / "apps" / "web")

    cmd = ["npx", "vitest", "run", "--no-coverage"]
    if vitest_args:
        cmd.extend(vitest_args)

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


def run_tsc(cwd: str = None) -> tuple[int, str]:
    """运行 TypeScript 类型检查"""
    if cwd is None:
        cwd = str(PROJECT_ROOT / "apps" / "web")

    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        return result.returncode, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return -1, "类型检查超时 (2分钟)"
    except Exception as e:
        return -1, str(e)


@click.command()
@click.option("--unit", "-u", is_flag=True, help="运行后端单元测试")
@click.option("--integration", "-i", is_flag=True, help="运行集成测试")
@click.option("--all", "-a", is_flag=True, help="运行所有测试（前端+后端）")
@click.option("--frontend", "-f", is_flag=True, help="运行前端测试 (vitest)")
@click.option("--backend", "-b", is_flag=True, help="运行后端测试 (cargo test)")
@click.option("--typecheck", "-t", is_flag=True, help="运行 TypeScript 类型检查")
@click.option("--verbose", "-v", is_flag=True, help="详细输出")
@click.option("--service", "-s", help="只测试指定后端服务")
@click.option("--file", "-F", help="指定前端测试文件 (相对 apps/web/src 路径)")
def test(unit: bool, integration: bool, all: bool, frontend: bool, backend: bool,
         typecheck: bool, verbose: bool, service: str, file: str):
    """运行 TOPEMS 测试

    支持前端 (vitest) 和后端 (cargo test) 测试，以及 TypeScript 类型检查。

    示例:
        topems test --all            运行全部测试（前端+后端+类型检查）
        topems test -f              运行前端 vitest
        topems test -b              运行后端 cargo test
        topems test -t              运行 TypeScript 类型检查
        topems test -u              运行后端单元测试
        topems test -i              运行集成测试
        topems test -s iam          只测试 iam 服务
        topems test -f -F pages/finance/FinanceVoucherPage/components/__tests__/FinanceVoucherComponents.test.tsx
    """
    # 确定运行范围
    run_fe = frontend or all
    run_be = backend or unit or integration or all
    run_tsc_check = typecheck or all
    run_all = all

    if not (run_fe or run_be or run_tsc_check):
        console.print("[yellow]请指定测试类型[/yellow]")
        console.print("使用 --help 查看帮助")
        return

    results = []

    # ---- 前端测试 (vitest) ----
    if run_fe:
        console.print("\n[bold cyan]前端测试 (vitest)[/bold cyan]")
        web_dir = PROJECT_ROOT / "apps" / "web"
        if not web_dir.exists():
            console.print("  [red]✗ apps/web 目录不存在[/red]")
        else:
            vitest_args = []
            if file:
                vitest_args.append(file)
            if verbose:
                vitest_args.append("--reporter=verbose")

            console.print(f"  运行: npx vitest run {' '.join(vitest_args)}")
            returncode, output = run_vitest(vitest_args=vitest_args if vitest_args else None)

            # 提取关键结果行
            result_lines = [l for l in output.split("\n") if "Test Files" in l or "Tests" in l or "Duration" in l]
            summary = " | ".join(result_lines) if result_lines else output[:200]

            results.append({
                "name": "前端 vitest",
                "returncode": returncode,
                "output": summary,
            })
            status = "[green]✓ 通过[/green]" if returncode == 0 else "[red]✗ 失败[/red]"
            console.print(f"  {status}")
            if result_lines:
                for l in result_lines:
                    console.print(f"  [dim]{l.strip()}[/dim]")
            elif returncode != 0:
                console.print(f"  [dim]{output[-300:]}[/dim]")

    # ---- TypeScript 类型检查 ----
    if run_tsc_check:
        console.print("\n[bold cyan]TypeScript 类型检查 (tsc)[/bold cyan]")
        returncode, output = run_tsc()
        error_count = output.count("error TS") if output else 0
        results.append({
            "name": "tsc 类型检查",
            "returncode": returncode,
            "output": f"{error_count} errors" if error_count else "0 errors",
        })
        status = "[green]✓ 通过[/green]" if returncode == 0 else "[red]✗ 失败[/red]"
        console.print(f"  {status} ({error_count} errors)")
        if returncode != 0 and verbose:
            console.print(f"  [dim]{output[:500]}[/dim]")

    # ---- 后端测试 (cargo test) ----
    if run_be:
        console.print("\n[bold cyan]后端测试 (cargo test)[/bold cyan]")

        if service:
            test_dirs = [PROJECT_ROOT / "svc" / service]
        elif run_all or not (unit or integration):
            svc_dir = PROJECT_ROOT / "svc"
            test_dirs = [d for d in svc_dir.iterdir()
                         if d.is_dir() and (d / "Cargo.toml").exists()] if svc_dir.exists() else []
        else:
            test_dirs = [PROJECT_ROOT / "svc"]

        cargo_args = []
        if unit and not integration:
            cargo_args.append("--lib")
        elif integration and not unit:
            cargo_args.append("--test")

        for svc_dir in test_dirs:
            if not svc_dir.exists():
                continue
            console.print(f"  测试 {svc_dir.name}...")
            returncode, output = run_cargo_test(cargo_args=cargo_args if cargo_args else None, cwd=str(svc_dir))
            results.append({
                "name": f"cargo test [{svc_dir.name}]",
                "returncode": returncode,
                "output": output[:200] if output else "",
            })
            status = "[green]✓[/green]" if returncode == 0 else "[red]✗[/red]"
            console.print(f"    {status} {svc_dir.name}")

    # ---- 结果汇总 ----
    if not results:
        console.print("\n[yellow]未执行任何测试[/yellow]")
        return

    table = Table(title="\n测试结果汇总")
    table.add_column("测试", style="cyan")
    table.add_column("状态", justify="center")
    table.add_column("详情", style="dim")

    for r in results:
        status = "✓ 通过" if r["returncode"] == 0 else "✗ 失败"
        status_style = "green" if r["returncode"] == 0 else "red"
        table.add_row(
            r["name"],
            f"[{status_style}]{status}[/{status_style}]",
            r["output"][:100] if r["output"] else "",
        )

    console.print(table)

    passed = sum(1 for r in results if r["returncode"] == 0)
    total = len(results)
    console.print(f"\n[{'green' if passed == total else 'yellow'}]通过: {passed}/{total}[/]")
