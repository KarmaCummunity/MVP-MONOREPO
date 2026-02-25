const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix nanoid resolution issue
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'nanoid/non-secure' || moduleName.startsWith('nanoid/')) {
    return context.resolveRequest(context, 'nanoid', platform);
  }
  
  // Use original resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Enable package exports to avoid circular dependency issues
config.resolver.unstable_enablePackageExports = true;

// Fix for react-native-reanimated web circular dependency
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Additional resolver configuration for web
if (process.env.EXPO_PUBLIC_PLATFORM === 'web' || process.env.PLATFORM === 'web') {
  // Ensure proper module resolution order
  config.resolver.platforms = ['web', 'native', 'ios', 'android'];
}

// Workaround for react-native-reanimated web circular dependency
// Force eager evaluation of reanimated modules to avoid Player.js initialization issues
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

module.exports = config;
