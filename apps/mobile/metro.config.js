const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo 感知：mobile 依赖 workspace 包（@topems/tokens 等）位于仓库根 node_modules，
// Expo 默认配置只监听 app 目录，无法解析仓库外的 symlink 包。
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
