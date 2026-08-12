"""测试 dev 命令"""

import pytest
from click.testing import CliRunner

from topems_cli.commands.dev import dev, setup, _check_tool


class TestDevCommand:
    """dev 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_dev_help(self, runner):
        """测试 dev --help"""
        result = runner.invoke(dev, ['--help'])
        assert result.exit_code == 0
        assert '开发环境管理' in result.output
        assert 'setup' in result.output

    def test_dev_setup_help(self, runner):
        """测试 dev setup --help"""
        result = runner.invoke(dev, ['setup', '--help'])
        assert result.exit_code == 0
        assert '初始化 TOPEMS 开发环境' in result.output
        assert '--skip-deps' in result.output
        assert '--skip-db' in result.output
        assert '--skip-migrations' in result.output
        assert '--frontend-only' in result.output
        assert '--backend-only' in result.output


class TestCheckTool:
    """_check_tool 函数测试"""

    def test_check_tool_existing(self):
        """测试检查已安装的工具 (python3)"""
        ok, version = _check_tool("python3")
        assert ok is True
        assert "Python" in version

    def test_check_tool_missing(self):
        """测试检查未安装的工具"""
        ok, version = _check_tool("this-tool-definitely-not-exists-xyz")
        assert ok is False
        assert version == "未安装"


class TestDevSetupExecution:
    """dev setup 执行测试（使用 skip 标志避免实际安装）"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_setup_skip_all(self, runner):
        """测试 setup 跳过所有步骤"""
        result = runner.invoke(setup, [
            '--skip-deps', '--skip-db', '--skip-migrations'
        ])
        assert result.exit_code == 0
        assert '开发环境初始化完成' in result.output

    def test_setup_frontend_only(self, runner):
        """测试 setup 仅前端（跳过依赖）"""
        result = runner.invoke(setup, [
            '--frontend-only', '--skip-deps', '--skip-db', '--skip-migrations'
        ])
        assert result.exit_code == 0

    def test_setup_backend_only(self, runner):
        """测试 setup 仅后端（跳过依赖）"""
        result = runner.invoke(setup, [
            '--backend-only', '--skip-deps', '--skip-db', '--skip-migrations'
        ])
        assert result.exit_code == 0

    def test_setup_shows_tool_check(self, runner):
        """测试 setup 显示工具检查结果"""
        result = runner.invoke(setup, [
            '--skip-deps', '--skip-db', '--skip-migrations'
        ])
        assert result.exit_code == 0
        assert '步骤 1/5' in result.output
        assert 'cargo' in result.output


class TestDevIntegration:
    """dev 集成测试"""

    def test_dev_is_group(self):
        """测试 dev 是一个命令组"""
        from click import Group
        assert isinstance(dev, Group)

    def test_dev_has_setup_command(self):
        """测试 dev 组包含 setup 子命令"""
        assert 'setup' in dev.commands

    def test_setup_is_command(self):
        """测试 setup 是一个命令"""
        from click import Command
        assert isinstance(setup, Command)
