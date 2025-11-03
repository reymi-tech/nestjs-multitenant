import { loadEnv } from 'vite';

export const createVitestTestConfig = (testingType: string) => {
  return {
    root: './',
    globals: true,
    isolate: false,
    passWithNoTests: true,
    include: [`test/${testingType}/**/*.test.ts`],
    env: loadEnv('test', process.cwd(), ''),
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'json', 'html'],
      reportsDirectory: `coverage/${testingType}`,
      include: ['src/**/*.ts'],
    },
  };
};
