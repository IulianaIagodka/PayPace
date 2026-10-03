const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// docutext's browser build still contains a dynamic `import('fs/promises')`
// for Node path inputs. Metro must resolve those to empty modules so the
// React Native bundle can ship on-device PDF extraction via fromBuffer().
const emptyNodeBuiltins = new Set([
  'fs',
  'fs/promises',
  'node:fs',
  'node:fs/promises',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (emptyNodeBuiltins.has(moduleName)) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
