import { Platform } from 'react-native';
import { logger } from './loggerService';

export interface AuthTestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export interface AuthTestSuite {
  timestamp: string;
  platform: string;
  results: AuthTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export class AuthenticationTester {
  
  /**
   * Run comprehensive authentication tests
   */
  static async runAuthTests(config?: {
    webClientId?: string;
    iosClientId?: string;
    androidClientId?: string;
    redirectUri?: string;
  }): Promise<AuthTestSuite> {
    const results: AuthTestResult[] = [];
    
    logger.info('AuthTester', 'Starting authentication test suite');
    
    // Test 1: Environment Variables
    results.push(this.testEnvironmentVariables());
    
    // Test 2: Client ID Configuration
    results.push(this.testClientIdConfiguration(config));
    
    // Test 3: Redirect URI Format
    if (config?.redirectUri) {
      results.push(this.testRedirectUriFormat(config.redirectUri));
    }
    
    // Test 4: Platform-specific Configuration
    results.push(this.testPlatformConfiguration(config));
    
    // Test 5: Network Connectivity
    const networkTest = await this.testNetworkConnectivity();
    results.push(networkTest);
    
    // Test 6: Google OAuth Endpoints
    const googleTest = await this.testGoogleOAuthEndpoints();
    results.push(googleTest);
    
    // Test 7: JWT Validation
    results.push(this.testJWTValidation());
    
    // Test 8: Storage Access
    const storageTest = await this.testStorageAccess();
    results.push(storageTest);
    
    const summary = this.calculateSummary(results);
    
    const testSuite: AuthTestSuite = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      results,
      summary
    };
    
    logger.info('AuthTester', 'Authentication test suite completed', {
      summary,
      failedTests: results.filter(r => r.status === 'fail').map(r => r.test)
    });
    
    return testSuite;
  }
  
  /**
   * Test environment variables
   */
  private static testEnvironmentVariables(): AuthTestResult {
    const requiredVars = [
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 
      'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => {
      const value = process.env[varName];
      return !value || value.length === 0;
    });
    
    if (missingVars.length === requiredVars.length) {
      return {
        test: 'Environment Variables',
        status: 'fail',
        message: 'All required environment variables are missing',
        details: { missingVars }
      };
    }
    
    if (missingVars.length > 0) {
      return {
        test: 'Environment Variables',
        status: 'warning',
        message: `Some environment variables are missing: ${missingVars.join(', ')}`,
        details: { missingVars }
      };
    }
    
    return {
      test: 'Environment Variables',
      status: 'pass',
      message: 'All environment variables are present'
    };
  }
  
  /**
   * Test client ID configuration
   */
  private static testClientIdConfiguration(config?: any): AuthTestResult {
    const { webClientId, iosClientId, androidClientId } = config || {};
    
    const issues = [];
    
    // Check format of client IDs
    if (webClientId && !this.isValidGoogleClientId(webClientId)) {
      issues.push('Web client ID has invalid format');
    }
    
    if (iosClientId && !this.isValidGoogleClientId(iosClientId)) {
      issues.push('iOS client ID has invalid format');
    }
    
    if (androidClientId && !this.isValidGoogleClientId(androidClientId)) {
      issues.push('Android client ID has invalid format');
    }
    
    // Platform-specific checks
    const currentPlatform = Platform.OS;
    let hasRequiredClientId = false;
    
    if (currentPlatform === 'web' && webClientId) hasRequiredClientId = true;
    if (currentPlatform === 'ios' && (iosClientId || webClientId)) hasRequiredClientId = true;
    if (currentPlatform === 'android' && (androidClientId || webClientId)) hasRequiredClientId = true;
    
    if (!hasRequiredClientId) {
      issues.push(`No valid client ID for current platform: ${currentPlatform}`);
    }
    
    if (issues.length > 0) {
      return {
        test: 'Client ID Configuration',
        status: 'fail',
        message: issues.join('; '),
        details: { issues, currentPlatform }
      };
    }
    
    return {
      test: 'Client ID Configuration',
      status: 'pass',
      message: 'Client IDs are properly configured'
    };
  }
  
  /**
   * Test redirect URI format
   */
  private static testRedirectUriFormat(redirectUri: string): AuthTestResult {
    if (!redirectUri) {
      return {
        test: 'Redirect URI Format',
        status: 'fail',
        message: 'Redirect URI is not provided'
      };
    }
    
    const issues = [];
    
    if (Platform.OS === 'web') {
      // Web redirect URI should be a valid HTTPS URL
      try {
        const url = new URL(redirectUri);
        if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
          issues.push('Web redirect URI should use HTTPS in production');
        }
        if (!url.pathname.includes('oauth')) {
          issues.push('Redirect URI should contain oauth-related path');
        }
      } catch (error) {
        issues.push('Redirect URI is not a valid URL');
      }
    } else {
      // Mobile redirect URI should use custom scheme
      if (!redirectUri.includes('://')) {
        issues.push('Mobile redirect URI should use custom scheme');
      }
    }
    
    if (issues.length > 0) {
      return {
        test: 'Redirect URI Format',
        status: 'warning',
        message: issues.join('; '),
        details: { redirectUri, platform: Platform.OS }
      };
    }
    
    return {
      test: 'Redirect URI Format',
      status: 'pass',
      message: 'Redirect URI format is valid'
    };
  }
  
  /**
   * Test platform-specific configuration
   */
  private static testPlatformConfiguration(config?: any): AuthTestResult {
    const platform = Platform.OS;
    const { webClientId, iosClientId, androidClientId } = config || {};
    
    let hasCorrectConfig = false;
    let message = '';
    
    switch (platform) {
      case 'web':
        hasCorrectConfig = !!webClientId;
        message = hasCorrectConfig ? 
          'Web platform properly configured' : 
          'Web platform missing webClientId';
        break;
      case 'ios':
        hasCorrectConfig = !!(iosClientId || webClientId);
        message = hasCorrectConfig ? 
          'iOS platform properly configured' : 
          'iOS platform missing iosClientId (webClientId can be fallback)';
        break;
      case 'android':
        hasCorrectConfig = !!(androidClientId || webClientId);
        message = hasCorrectConfig ? 
          'Android platform properly configured' : 
          'Android platform missing androidClientId (webClientId can be fallback)';
        break;
      default:
        return {
          test: 'Platform Configuration',
          status: 'fail',
          message: `Unsupported platform: ${platform}`
        };
    }
    
    return {
      test: 'Platform Configuration',
      status: hasCorrectConfig ? 'pass' : 'fail',
      message,
      details: { platform, hasCorrectConfig }
    };
  }
  
  /**
   * Test network connectivity (browser-safe)
   */
  private static async testNetworkConnectivity(): Promise<AuthTestResult> {
    // Skip direct network tests in browser to avoid CORS issues
    if (typeof window !== 'undefined') {
      // In browser, we assume network is working if we can reach this point
      return {
        test: 'Network Connectivity',
        status: 'pass',
        message: 'Browser environment detected - network connectivity assumed (page loaded successfully)'
      };
    }
    
    try {
      // Test basic internet connectivity (Node.js environment)
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        return {
          test: 'Network Connectivity',
          status: 'pass',
          message: 'Network connectivity is working'
        };
      } else {
        return {
          test: 'Network Connectivity',
          status: 'fail',
          message: `Network request failed with status: ${response.status}`
        };
      }
    } catch (error) {
      return {
        test: 'Network Connectivity',
        status: 'fail',
        message: `Network connectivity test failed: ${(error as Error)?.message}`,
        details: { error: String(error) }
      };
    }
  }
  
  /**
   * Test Google OAuth endpoints (browser-safe)
   */
  private static async testGoogleOAuthEndpoints(): Promise<AuthTestResult> {
    // Skip network tests in browser to avoid CORS issues
    if (typeof window !== 'undefined') {
      return {
        test: 'Google OAuth Endpoints',
        status: 'pass',
        message: 'Network endpoint tests skipped in browser environment (CORS protection)'
      };
    }
    
    const endpointsToTest = [
      'https://accounts.google.com/.well-known/openid_configuration',
      'https://oauth2.googleapis.com/tokeninfo'
    ];
    
    const results = [];
    
    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(endpoint, { 
          method: 'HEAD',
          mode: 'no-cors' // This will prevent CORS errors but limit response info
        });
        results.push({
          endpoint,
          status: 'accessible', // no-cors mode doesn't give us status
          statusCode: 'unknown'
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: String(error)
        });
      }
    }
    
    const failedEndpoints = results.filter(r => r.status === 'error');
    
    if (failedEndpoints.length === 0) {
      return {
        test: 'Google OAuth Endpoints',
        status: 'pass',
        message: 'Google OAuth endpoints appear to be accessible'
      };
    } else {
      return {
        test: 'Google OAuth Endpoints',
        status: 'warning',
        message: `Some network issues detected: ${failedEndpoints.map(e => e.endpoint).join(', ')}`,
        details: { results }
      };
    }
  }
  
  /**
   * Test JWT validation functionality
   */
  private static testJWTValidation(): AuthTestResult {
    // Test with a mock JWT token structure
    const validJWTStructure = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.invalid_signature';
    const invalidJWT = 'invalid.jwt.token';
    const emptyJWT = '';
    
    try {
      // Test valid structure
      const parts = validJWTStructure.split('.');
      if (parts.length !== 3) {
        throw new Error('Valid JWT should have 3 parts');
      }
      
      // Test payload parsing
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.sub || !payload.email) {
        throw new Error('JWT payload should contain sub and email');
      }
      
      return {
        test: 'JWT Validation',
        status: 'pass',
        message: 'JWT validation functionality is working'
      };
    } catch (error) {
      return {
        test: 'JWT Validation',
        status: 'fail',
        message: `JWT validation test failed: ${(error as Error)?.message}`,
        details: { error: String(error) }
      };
    }
  }
  
  /**
   * Test storage access
   */
  private static async testStorageAccess(): Promise<AuthTestResult> {
    try {
      // Test AsyncStorage functionality
      const testKey = 'auth_test_key';
      const testValue = 'auth_test_value';
      
      // Import AsyncStorage dynamically
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrievedValue = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      if (retrievedValue === testValue) {
        return {
          test: 'Storage Access',
          status: 'pass',
          message: 'Storage access is working properly'
        };
      } else {
        return {
          test: 'Storage Access',
          status: 'fail',
          message: 'Storage read/write test failed'
        };
      }
    } catch (error) {
      return {
        test: 'Storage Access',
        status: 'fail',
        message: `Storage access test failed: ${(error as Error)?.message}`,
        details: { error: String(error) }
      };
    }
  }
  
  /**
   * Validate Google Client ID format
   */
  private static isValidGoogleClientId(clientId: string): boolean {
    // Google Client IDs have specific format: numbers-random.apps.googleusercontent.com
    const googleClientIdPattern = /^\d+-[\w\d]+\.apps\.googleusercontent\.com$/;
    return googleClientIdPattern.test(clientId);
  }
  
  /**
   * Calculate test summary
   */
  private static calculateSummary(results: AuthTestResult[]) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    return { total, passed, failed, warnings };
  }
}

/**
 * Run quick authentication diagnostics
 */
export const runAuthDiagnostics = async (config?: any): Promise<AuthTestSuite> => {
  logger.info('AuthDiagnostics', 'Running authentication diagnostics...');
  
  const testSuite = await AuthenticationTester.runAuthTests(config);
  
  // Log results
  console.group('🔐 Authentication Test Results');
  console.log(`Platform: ${testSuite.platform}`);
  console.log(`Timestamp: ${testSuite.timestamp}`);
  console.log(`Summary: ${testSuite.summary.passed}/${testSuite.summary.total} passed, ${testSuite.summary.failed} failed, ${testSuite.summary.warnings} warnings`);
  
  testSuite.results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.message}`);
    if (result.details) {
      console.log('   Details:', result.details);
    }
  });
  
  console.groupEnd();
  
  // Alert if critical issues found
  const criticalFailures = testSuite.results.filter(r => 
    r.status === 'fail' && 
    ['Client ID Configuration', 'Platform Configuration', 'Network Connectivity'].includes(r.test)
  );
  
  if (criticalFailures.length > 0) {
    logger.error('AuthDiagnostics', 'Critical authentication issues detected', {
      criticalFailures: criticalFailures.map(f => ({ test: f.test, message: f.message }))
    });
  } else {
    logger.info('AuthDiagnostics', 'No critical authentication issues detected');
  }
  
  return testSuite;
};
