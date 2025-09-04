/**
 * PM2 ecosystem config — uses bun as interpreter if available.
 * If you prefer Node, change `interpreter` to 'node' and ensure the project is built to JS.
 */
module.exports = {
  apps: [
    {
      name: 'translations-api',
      script: 'src/index.ts',
      interpreter: 'bun', // set to 'node' if running compiled JS
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
    },
  ],
};
