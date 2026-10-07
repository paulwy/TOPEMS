// 纯对象配置（不 import 'vitest/config'，避免本包无 vitest 依赖时解析失败）
export default {
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
};
