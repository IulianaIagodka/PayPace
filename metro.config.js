const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// docutext's browser build still contains a dynamic `import('fs/promises')`
// for Node path inputs. Stub those builtins only for docutext so the rest of
// the graph keeps normal resolution.
const emptyNodeBuiltins = new Set([
  'fs',
  'fs/promises',
  'node:fs',
  'node:fs/promises',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (emptyNodeBuiltins.has(moduleName)) {
    const origin = context.originModulePath || '';
    const normalized = origin.split(path.sep).join('/');
    if (normalized.includes('/docutext/')) {
      return { type: 'empty' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
