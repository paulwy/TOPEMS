"""测试 build 命令"""

import pytest
from click.testing import CliRunner

from topems_cli.commands.build import build


class TestBuildCommand:
    """build 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_build_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(build, ['--help'])
        assert result.exit_code == 0

    def test_build_all_help(self, runner):
        """测试 build all --help"""
        result = runner.invoke(build, ['all', '--help'])
        assert result.exit_code == 0

    def test_build_service_help(self, runner):
        """测试 build service --help"""
        result = runner.invoke(build, ['service', '--help'])
        assert result.exit_code == 0

    def test_build_lib_help(self, runner):
        """测试 build lib --help"""
        result = runner.invoke(build, ['lib', '--help'])
        assert result.exit_code == 0

    def test_build_clean_help(self, runner):
        """测试 build clean --help"""
        result = runner.invoke(build, ['clean', '--help'])
        assert result.exit_code == 0
