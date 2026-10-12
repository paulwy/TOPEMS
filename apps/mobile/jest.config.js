module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  transform: {
    // ts-jest 在 expo sdk-57 下解析到 typescript@6.0.3。TS6 要求显式 rootDir，
    // 且 baseUrl 已废弃、需 ignoreDeprecations:"6.0" 压制（与根 tsconfig.base 一致）。
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: { ignoreDeprecations: '6.0', rootDir: './src' } },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};