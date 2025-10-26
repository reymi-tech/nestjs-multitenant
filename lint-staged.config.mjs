/**
 * @filename: lint-staged.config.mjs
 * @type {import('lint-staged').Configuration}
 */
const config = {
  "**/*.ts?(x)": () => "tsc -p tsconfig.build.json --noEmit",
  "*.ts": ["npm run format", "npm run lint:fix"],
  "*.{md,json}": "prettier --write",
};

export default config;
