/**
 * UI Store 层
 *
 * 界面状态：与视图表现强相关、与具体业务无关的状态。
 * 这类状态通常具备以下特征：
 * - 仅在前端存在，无服务端持久化语义
 * - 可被重置而不影响业务数据
 * - 可由用户交互直接驱动
 *
 * 依赖方向：UI Store → Domain Store（不允许直接导入 Server State）
 *
 * 当前包含：
 * - useThemeStore：主题切换
 * - useUIStore：UI 状态（侧边栏等）
 * - useNotificationStore：通知管理（前端 toasts）
 * - useNotificationSettingsStore：通知设置
 * - useShortcutsStore：快捷方式管理
 */

export * from '../themeStore';
export * from '../uiStore';
export * from '../notificationStore';
export * from '../notificationSettingsStore';
export * from '../shortcutsStore';
