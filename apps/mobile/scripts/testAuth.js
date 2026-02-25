#!/usr/bin/env node

/**
 * Manual Authentication Testing Script
 * Run with: node scripts/testAuth.js
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testAuthentication() {
  log('🔐 Authentication Configuration Test', colors.bold);
  log('=====================================\n');
  
  // Test 1: Check app.config.js
  log('📋 Test 1: Checking app.config.js...', colors.blue);
  try {
    const configPath = path.join(__dirname, '..', 'app.config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for Google client IDs
    const webClientIdMatch = configContent.match(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:\s*["']([^"']+)["']/);
    const iosClientIdMatch = configContent.match(/EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:\s*["']([^"']+)["']/);
    const androidClientIdMatch = configContent.match(/EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:\s*["']([^"']+)["']/);
    
    if (webClientIdMatch) {
      log(`  ✅ Web Client ID found: ${webClientIdMatch[1].substring(0, 20)}...`, colors.green);
    } else {
      log('  ❌ Web Client ID not found in app.config.js', colors.red);
    }
    
    if (iosClientIdMatch) {
      log(`  ✅ iOS Client ID found: ${iosClientIdMatch[1].substring(0, 20)}...`, colors.green);
    } else {
      log('  ❌ iOS Client ID not found in app.config.js', colors.red);
    }
    
    if (androidClientIdMatch) {
      log(`  ✅ Android Client ID found: ${androidClientIdMatch[1].substring(0, 20)}...`, colors.green);
    } else {
      log('  ❌ Android Client ID not found in app.config.js', colors.red);
    }
    
  } catch (error) {
    log(`  ❌ Error reading app.config.js: ${error.message}`, colors.red);
  }
  
  console.log();
  
  // Test 2: Check environment variables
  log('📋 Test 2: Checking environment variables...', colors.blue);
  const envVars = [
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value.length > 0) {
      log(`  ✅ ${varName}: ${value.substring(0, 20)}...`, colors.green);
    } else {
      log(`  ❌ ${varName}: not set`, colors.red);
    }
  });
  
  console.log();
  
  // Test 3: Check OAuth redirect route
  log('📋 Test 3: Checking OAuth redirect route...', colors.blue);
  try {
    const oauthRedirectPath = path.join(__dirname, '..', 'app', 'oauthredirect.tsx');
    if (fs.existsSync(oauthRedirectPath)) {
      log('  ✅ OAuth redirect route exists: app/oauthredirect.tsx', colors.green);
      
      // Check content
      const content = fs.readFileSync(oauthRedirectPath, 'utf8');
      if (content.includes('WebBrowser.maybeCompleteAuthSession')) {
        log('  ✅ Route contains OAuth completion logic', colors.green);
      } else {
        log('  ⚠️  Route exists but may be missing OAuth completion logic', colors.yellow);
      }
    } else {
      log('  ❌ OAuth redirect route not found: app/oauthredirect.tsx', colors.red);
    }
  } catch (error) {
    log(`  ❌ Error checking OAuth redirect route: ${error.message}`, colors.red);
  }
  
  console.log();
  
  // Test 4: Check Google login component
  log('📋 Test 4: Checking Google login component...', colors.blue);
  try {
    const componentPath = path.join(__dirname, '..', 'components', 'SimpleGoogleLoginButton.tsx');
    if (fs.existsSync(componentPath)) {
      log('  ✅ Google login component exists', colors.green);
      
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Check for required imports
      const hasGoogleImport = content.includes('expo-auth-session/providers/google');
      const hasLoggerImport = content.includes('loggerService');
      const hasAuthTestImport = content.includes('authTestUtils');
      
      if (hasGoogleImport) {
        log('  ✅ Has Google auth provider import', colors.green);
      } else {
        log('  ❌ Missing Google auth provider import', colors.red);
      }
      
      if (hasLoggerImport) {
        log('  ✅ Has logging capabilities', colors.green);
      } else {
        log('  ⚠️  Missing logging import', colors.yellow);
      }
      
      if (hasAuthTestImport) {
        log('  ✅ Has authentication testing capabilities', colors.green);
      } else {
        log('  ⚠️  Missing authentication testing import', colors.yellow);
      }
      
    } else {
      log('  ❌ Google login component not found', colors.red);
    }
  } catch (error) {
    log(`  ❌ Error checking Google login component: ${error.message}`, colors.red);
  }
  
  console.log();
  
  // Test 5: Network connectivity
  log('📋 Test 5: Testing network connectivity...', colors.blue);
  try {
    const https = require('https');
    
    // Test Google OAuth endpoints
    const testEndpoint = (url, name) => {
      return new Promise((resolve) => {
        const req = https.request(url, { method: 'HEAD' }, (res) => {
          if (res.statusCode === 200 || res.statusCode === 204) {
            log(`  ✅ ${name}: accessible`, colors.green);
            resolve(true);
          } else {
            log(`  ❌ ${name}: returned ${res.statusCode}`, colors.red);
            resolve(false);
          }
        });
        
        req.on('error', (error) => {
          log(`  ❌ ${name}: ${error.message}`, colors.red);
          resolve(false);
        });
        
        req.setTimeout(5000, () => {
          log(`  ❌ ${name}: timeout`, colors.red);
          resolve(false);
        });
        
        req.end();
      });
    };
    
    await testEndpoint('https://accounts.google.com', 'Google Accounts');
    await testEndpoint('https://oauth2.googleapis.com', 'Google OAuth2');
    
  } catch (error) {
    log(`  ❌ Network test failed: ${error.message}`, colors.red);
  }
  
  console.log();
  
  // Summary
  log('🎯 Summary & Next Steps', colors.bold);
  log('========================\n');
  
  log('If you see any ❌ (red X) marks above, those need to be fixed before Google authentication will work.', colors.yellow);
  log('⚠️  (yellow warning) marks indicate potential issues that might cause problems.', colors.yellow);
  log('✅ (green checkmarks) indicate everything is working correctly for that test.\n');
  
  log('Next steps:', colors.bold);
  log('1. Fix any configuration issues shown above');
  log('2. Make sure you have added the correct redirect URI to Google Cloud Console:');
  log('   https://karma-community-kc.com/oauthredirect');
  log('3. Test the authentication flow in your browser');
  log('4. Check the browser console and app logs for detailed debugging information');
  
  console.log();
}

// Run the tests
testAuthentication().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
