module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^api$': '<rootDir>/api/index.ts',
    '^api/(.*)$': '<rootDir>/api/\$1'
  }
};
