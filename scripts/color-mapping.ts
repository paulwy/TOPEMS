/**
 * 硬编码颜色映射表
 * 
 * 统计数据：
 * - # 开头颜色：2125 处
 * - rgb()：31 处
 * - rgba()：332 处
 * 
 * 映射原则：
 * 1. 尽可能使用 semanticTokens（语义层）
 * 2. 次选 designTokens.colors（基础层）
 * 3. 最后考虑 theme.palette（MUI palette）
 * 4. 透明色、渐变色保留或特殊处理
 */

export interface ColorMapping {
  /** 硬编码颜色值 */
  hardcoded: string;
  /** 替换后的 token 路径 */
  token: string;
  /** 替换建议 */
  suggestion: string;
  /** 是否需要人工审核 */
  needsReview: boolean;
  /** 替换示例 */
  example?: string;
}

/**
 * 高频颜色映射表（基于统计数据）
 *
 * Token 使用 MUI sx 简写格式（如 'primary.main'、'success.main'、'grey.600'），
 * 在 sx prop 中作为字符串值可直接被 MUI 解析。
 * 替换时仅替换 hex 值本身，保留外层引号，如 '#3b82f6' → 'primary.main'。
 */
export const colorMappings: ColorMapping[] = [
  // ============================================================
  // Primary 色系（蓝色系）
  // ============================================================
  {
    hardcoded: '#3b82f6',
    token: 'primary.main',
    suggestion: '主色调 - 主要按钮、链接、选中态',
    needsReview: false,
    example: "color: 'primary.main'",
  },
  {
    hardcoded: '#3B82F6',
    token: 'primary.main',
    suggestion: '主色调（大写形式）',
    needsReview: false,
    example: "color: 'primary.main'",
  },
  {
    hardcoded: '#dbeafe',
    token: 'primary.100',
    suggestion: 'primary 浅色背景',
    needsReview: false,
    example: "backgroundColor: 'primary.100'",
  },
  {
    hardcoded: '#60a5fa',
    token: 'primary.light',
    suggestion: 'primary light',
    needsReview: false,
  },
  {
    hardcoded: '#2563eb',
    token: 'primary.dark',
    suggestion: 'primary dark',
    needsReview: false,
  },
  {
    hardcoded: '#1d4ed8',
    token: 'primary.700',
    suggestion: 'primary 700',
    needsReview: false,
  },
  {
    hardcoded: '#1e40af',
    token: 'primary.800',
    suggestion: 'primary 800',
    needsReview: false,
  },
  {
    hardcoded: '#1e3a8a',
    token: 'primary.900',
    suggestion: 'primary 900',
    needsReview: false,
  },
  {
    hardcoded: '#eff6ff',
    token: 'primary.50',
    suggestion: 'primary 最浅色',
    needsReview: false,
  },

  // ============================================================
  // Secondary 色系（紫色系）
  // ============================================================
  {
    hardcoded: '#8B5CF6',
    token: 'secondary.main',
    suggestion: '次要色调 - 辅助按钮、次要操作',
    needsReview: false,
  },
  {
    hardcoded: '#6366F1',
    token: 'secondary.500',
    suggestion: 'Indigo 500 - 可映射到 secondary 或保留',
    needsReview: true,
    example: "backgroundColor: 'secondary.500'",
  },
  {
    hardcoded: '#7C3AED',
    token: 'secondary.600',
    suggestion: 'Violet 600 - secondary',
    needsReview: false,
  },
  {
    hardcoded: '#a78bfa',
    token: 'secondary.light',
    suggestion: 'secondary light',
    needsReview: false,
  },

  // ============================================================
  // Success 色系（绿色系）
  // ============================================================
  {
    hardcoded: '#10B981',
    token: 'success.main',
    suggestion: '成功状态 - 成功提示、完成状态',
    needsReview: false,
  },
  {
    hardcoded: '#22c55e',
    token: 'success.main',
    suggestion: '成功色（重复）',
    needsReview: false,
  },
  {
    hardcoded: '#15803d',
    token: 'success.700',
    suggestion: 'success 700',
    needsReview: false,
  },
  {
    hardcoded: '#059669',
    token: 'success.600',
    suggestion: 'success 600',
    needsReview: false,
  },
  {
    hardcoded: '#4ade80',
    token: 'success.400',
    suggestion: 'success 400',
    needsReview: false,
  },

  // ============================================================
  // Warning 色系（橙色/黄色系）
  // ============================================================
  {
    hardcoded: '#F59E0B',
    token: 'warning.main',
    suggestion: '警告状态 - 警告提示、待处理',
    needsReview: false,
  },
  {
    hardcoded: '#f59e0b',
    token: 'warning.main',
    suggestion: '警告色（小写）',
    needsReview: false,
  },
  {
    hardcoded: '#D97706',
    token: 'warning.dark',
    suggestion: 'warning dark',
    needsReview: false,
  },
  {
    hardcoded: '#b45309',
    token: 'warning.700',
    suggestion: 'warning 700',
    needsReview: false,
  },
  {
    hardcoded: '#ca8a04',
    token: 'warning.600',
    suggestion: 'Yellow 600 - 可映射到 warning',
    needsReview: true,
  },
  {
    hardcoded: '#fef9c3',
    token: 'warning.100',
    suggestion: 'warning 浅色背景',
    needsReview: false,
  },

  // ============================================================
  // Error 色系（红色系）
  // ============================================================
  {
    hardcoded: '#EF4444',
    token: 'error.main',
    suggestion: '错误状态 - 错误提示、删除操作',
    needsReview: false,
  },
  {
    hardcoded: '#ef4444',
    token: 'error.main',
    suggestion: '错误色（小写）',
    needsReview: false,
  },

  // ============================================================
  // Grey 色系（中性色）
  // ============================================================
  {
    hardcoded: '#475569',
    token: 'grey.600',
    suggestion: 'Slate 600 - 深灰文字',
    needsReview: false,
  },
  {
    hardcoded: '#334155',
    token: 'grey.700',
    suggestion: 'Slate 700 - 更深文字',
    needsReview: false,
  },
  {
    hardcoded: '#94a3b8',
    token: 'grey.400',
    suggestion: 'Slate 400 - 辅助文字',
    needsReview: false,
  },
  {
    hardcoded: '#94A3B8',
    token: 'grey.400',
    suggestion: 'Slate 400 - 辅助文字（大写）',
    needsReview: false,
  },
  {
    hardcoded: '#6b7280',
    token: 'grey.500',
    suggestion: '灰色文字',
    needsReview: false,
  },
  {
    hardcoded: '#f8fafc',
    token: 'background.default',
    suggestion: '页面背景色',
    needsReview: false,
  },
  {
    hardcoded: '#f5f5f5',
    token: 'action.hover',
    suggestion: '悬停背景色',
    needsReview: false,
  },
  {
    hardcoded: '#f3f4f6',
    token: 'grey.100',
    suggestion: 'Grey 100 - 浅灰背景',
    needsReview: false,
  },
  {
    hardcoded: '#e0e7ff',
    token: 'primary.100',
    suggestion: 'Indigo 100 - 浅紫背景',
    needsReview: true,
  },
  {
    hardcoded: '#f3e8ff',
    token: 'secondary.100',
    suggestion: 'Purple 100 - 浅紫背景',
    needsReview: false,
  },

  // ============================================================
  // 特殊色系（Teal、Indigo 等）
  // ============================================================
  {
    hardcoded: '#14B8A6',
    token: 'info.main',
    suggestion: 'Teal 500 - 可映射到 info 或保留',
    needsReview: true,
    example: "color: 'info.main'",
  },
  {
    hardcoded: '#4338ca',
    token: 'secondary.700',
    suggestion: 'Indigo 700 - secondary',
    needsReview: false,
  },
  {
    hardcoded: '#ea580c',
    token: 'warning.600',
    suggestion: 'Orange 600 - warning',
    needsReview: false,
  },

  // ============================================================
  // 白色/黑色（需谨慎）
  // ============================================================
  {
    hardcoded: '#fff',
    token: 'background.paper',
    suggestion: '白色 - 通常用于卡片背景',
    needsReview: true,
    example: "backgroundColor: 'background.paper'",
  },
  {
    hardcoded: '#ffffff',
    token: 'background.paper',
    suggestion: '白色（完整形式）',
    needsReview: true,
  },

  // ============================================================
  // 透明色 rgba（大部分保留）
  // ============================================================
  {
    hardcoded: 'rgba(0, 0, 0, 0)',
    token: 'transparent',
    suggestion: '透明色 - 保留',
    needsReview: false,
  },
  {
    hardcoded: 'rgba(0, 0, 0, 0.1)',
    token: 'action.hover',
    suggestion: '浅遮罩 - 可考虑 semanticTokens',
    needsReview: true,
  },
  {
    hardcoded: 'rgba(255, 255, 255, 0.2)',
    token: '保留',
    suggestion: '白色透明 overlay - 保留',
    needsReview: true,
  },
  {
    hardcoded: 'rgba(59,130,246,0.3)',
    token: 'primary.main + alpha',
    suggestion: 'primary 透明态 - 需转换为 alpha 函数',
    needsReview: true,
    example: 'backgroundColor: alpha(theme.palette.primary.main, 0.3)',
  },

  // ============================================================
  // RGB 格式（较少使用）
  // ============================================================
  {
    hardcoded: 'rgb(96, 165, 250)',
    token: 'primary.light',
    suggestion: 'RGB 格式 primary light',
    needsReview: false,
  },
  {
    hardcoded: 'rgb(167, 139, 250)',
    token: 'secondary.light',
    suggestion: 'RGB 格式 secondary light',
    needsReview: false,
  },
  {
    hardcoded: 'rgb(59, 130, 246)',
    token: 'primary.main',
    suggestion: 'RGB 格式 primary main',
    needsReview: false,
  },
];

/**
 * 需要保留的白名单（不替换）
 */
export const whitelist = [
  'rgba(0, 0, 0, 0)',           // 透明
  'rgba(0,0,0,0)',              // 透明（紧凑格式）
  'transparent',                 // CSS 关键字
  // 渐变色通常保留
];

/**
 * 统计报告
 */
export const stats = {
  totalHardcoded: 2488,          // 2125 + 31 + 332
  hexCount: 2125,
  rgbCount: 31,
  rgbaCount: 332,
  
  topColors: [
    { color: '#dbeafe', count: 112, token: 'primary[100]' },
    { color: '#ca8a04', count: 94, token: 'warning[600]' },
    { color: '#475569', count: 84, token: 'grey[600]' },
    { color: '#15803d', count: 82, token: 'success[700]' },
    { color: '#fef9c3', count: 73, token: 'warning[100]' },
    { color: '#8B5CF6', count: 65, token: 'secondary.main' },
    { color: '#b45309', count: 61, token: 'warning[700]' },
    { color: '#F59E0B', count: 50, token: 'warning.main' },
    { color: '#10B981', count: 48, token: 'success.main' },
    { color: '#3b82f6', count: 45, token: 'primary.main' },
  ],
  
  highRiskFiles: [
    // 使用硬编码颜色最多的文件（待统计）
  ],
};

/**
 * 建议替换策略
 */
export const replacementStrategy = {
  // 第一批：高频且明确映射（无需人工审核）
  batch1: colorMappings.filter(m => !m.needsReview && m.hardcoded.startsWith('#')),
  
  // 第二批：rgb/rgba 格式
  batch2: colorMappings.filter(m => m.hardcoded.startsWith('rgb')),
  
  // 第三批：需人工审核的映射
  batch3: colorMappings.filter(m => m.needsReview),
  
  // 执行顺序：
  // 1. 先替换 batch1（风险最低）
  // 2. 测试编译和视觉效果
  // 3. 再处理 batch2
  // 4. 最后 batch3 需逐个确认
};