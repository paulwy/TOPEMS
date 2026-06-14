"""测试 cleanup 命令"""

import pytest
from click.testing import CliRunner

from topems_cli.commands.cleanup import cleanup


class TestCleanupCommand:
    """cleanup 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_cleanup_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(cleanup, ['--help'])
        assert result.exit_code == 0
        assert 'cache' in result.output.lower()

    def test_cleanup_cache_help(self, runner):
        """测试 cleanup cache --help"""
        result = runner.invoke(cleanup, ['cache', '--help'])
        assert result.exit_code == 0

    def test_cleanup_logs_help(self, runner):
        """测试 cleanup logs --help"""
        result = runner.invoke(cleanup, ['logs', '--help'])
        assert result.exit_code == 0

    def test_cleanup_services_help(self, runner):
        """测试 cleanup services --help"""
        result = runner.invoke(cleanup, ['services', '--help'])
        assert result.exit_code == 0
