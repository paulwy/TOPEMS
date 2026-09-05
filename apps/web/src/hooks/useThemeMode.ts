/**
 * useThemeMode — 主题模式切换 Hook
 *
 * 封装 useThemeStore，提供：
 * - mode：用户选择的主题（'light' | 'dark' | 'cyberpunk' | 'system'）
 * - resolvedMode：解析后的实际主题（'light' | 'dark'），将 'system' 解析为系统偏好
 * - systemPreference：当前系统偏好（'light' | 'dark'）
 * - setMode / toggleMode：切换主题
 *
 * 监听 `prefers-color-scheme` 媒体查询变化，实时更新 resolvedMode。
 */
