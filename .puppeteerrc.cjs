const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Download Chrome to a local directory instead of system cache
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
