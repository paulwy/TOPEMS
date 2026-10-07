module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  transform: {
    // ts-jest 在本仓库解析到 typescript@5.9，不接受根 tsconfig 的
    // ignoreDeprecations:"6.0"（TS6 取值），此处按 TS5 合法值覆盖，仅影响 jest 转译。
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { ignoreDeprecations: '5.0' } }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};