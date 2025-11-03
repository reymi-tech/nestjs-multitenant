import { execSync } from 'node:child_process';
import path from 'node:path';

import fs from 'fs-extra';

const REPORTS_PATH = path.resolve(process.cwd(), '.nyc_output');
const COVERAGE_PATH = path.resolve(process.cwd(), 'coverage');

fs.emptyDirSync(REPORTS_PATH);
fs.copyFileSync(
  `${COVERAGE_PATH}/unit/coverage-final.json`,
  `${REPORTS_PATH}/unit-coverage.json`,
);

execSync(`nyc report --report-dir ${COVERAGE_PATH}/global`, {
  stdio: 'inherit',
});
