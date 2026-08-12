"""测试 test 命令"""

import pytest
from click.testing import CliRunner
from pathlib import Path

from topems_cli.commands.test import test, run_vitest, run_tsc, run_cargo_test


class TestTestCommand:
    """test 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_test_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(test, ['--help'])
        assert result.exit_code == 0

    def test_test_all_help(self, runner):
        """测试 test --all --help"""
        result = runner.invoke(test, ['--all', '--help'])
        assert result.exit_code == 0

    def test_test_has_frontend_option(self, runner):
        """测试 test 命令包含 --frontend 选项"""
        result = runner.invoke(test, ['--help'])
        assert result.exit_code == 0
        assert '--frontend' in result.output
        assert 'vitest' in result.output

    def test_test_has_typecheck_option(self, runner):
        """测试 test 命令包含 --typecheck 选项"""
        result = runner.invoke(test, ['--help'])
        assert result.exit_code == 0
        assert '--typecheck' in result.output
        assert 'TypeScript' in result.output

    def test_test_has_backend_option(self, runner):
        """测试 test 命令包含 --backend 选项"""
        result = runner.invoke(test, ['--help'])
        assert result.exit_code == 0
        assert '--backend' in result.output


class TestTestFunctions:
    """test 命令辅助函数测试"""

    def test_run_vitest_signature(self):
        """测试 run_vitest 函数签名"""
        # 函数应该存在且可调用
        assert callable(run_vitest)

    def test_run_tsc_signature(self):
        """测试 run_tsc 函数签名"""
        assert callable(run_tsc)

    def test_run_cargo_test_signature(self):
        """测试 run_cargo_test 函数签名"""
        assert callable(run_cargo_test)

    def test_run_vitest_returns_tuple(self):
        """测试 run_vitest 返回元组 (returncode, output)"""
        # 在不存在的目录运行应返回错误码
        returncode, output = run_vitest(cwd="/nonexistent/path/xyz")
        assert isinstance(returncode, int)
        assert isinstance(output, str)
        assert returncode != 0

    def test_run_tsc_returns_tuple(self):
        """测试 run_tsc 返回元组 (returncode, output)"""
        returncode, output = run_tsc(cwd="/nonexistent/path/xyz")
        assert isinstance(returncode, int)
        assert isinstance(output, str)
        assert returncode != 0


class TestTestIntegration:
    """测试集成测试"""

    def test_cli_tests_exist(self):
        """测试 CLI 是否有测试"""
        cli_tests = Path(__file__).parent
        assert cli_tests.exists()
        
        # 应该有一些测试文件
        test_files = list(cli_tests.glob("test_*.py"))
        assert len(test_files) > 0

    def test_cargo_toml_exists(self):
        """测试 Cargo.toml 存在"""
        # 从 tests/test_commands_test.py -> cli/tests -> cli -> TOPEMS
        topems_root = Path(__file__).parent.parent.parent
        cargo_toml = topems_root / "Cargo.toml"
        assert cargo_toml.exists()

    def test_dev_and_doctor_tests_exist(self):
        """测试 dev 和 doctor 命令测试文件存在"""
        cli_tests = Path(__file__).parent
        assert (cli_tests / "test_commands_dev.py").exists()
        assert (cli_tests / "test_commands_doctor.py").exists()
