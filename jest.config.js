module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    roots: ['<rootDir>/test'],
    moduleNameMapper: {
        '^diana-core$': '<rootDir>/packages/diana-core/src/index.ts',
        '^diana-discord$': '<rootDir>/packages/diana-discord/src/index.ts',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ['**/*.test.(ts|js)'],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.(js)$': 'babel-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverage: false,
};
