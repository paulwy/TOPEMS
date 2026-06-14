"""测试 test 命令"""

import pytest
from click.testing import CliRunner
from pathlib import Path

from topems_cli.commands.test import test


class TestTestCommand:
    """test 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_test_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(test, ['--help'])
        assert result.exit_code == 0

    def test_test_unit_help(self, runner):
        """测试 test unit --help"""
        result = runner.invoke(test, ['unit', '--help'])
        assert result.exit_code == 0

    def test_test_all_help(self, runner):
        """测试 test --all --help"""
        result = runner.invoke(test, ['--all', '--help'])
        assert result.exit_code == 0


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
        import os
        # 使用环境变量或相对路径
        topems_root = Path(os.environ.get('TOPEMS_ROOT', '/Users/air/TOPEMS'))
        cargo_toml = topems_root / "Cargo.toml"
        assert cargo_toml.exists()
