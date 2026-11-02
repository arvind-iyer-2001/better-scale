// Embeds the build time so Settings can show when the free-account install expires (7 days).
const base = require('./app.json');

module.exports = () => ({
  ...base.expo,
  extra: { ...(base.expo.extra ?? {}), builtAt: new Date().toISOString() },
});
