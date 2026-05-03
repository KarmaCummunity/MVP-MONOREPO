// ErrorBoundary.tsx
// Purpose: Catch JavaScript errors anywhere in the child component tree, log those errors, 
// and display a fallback UI instead of the component tree that crashed.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logger } from '../utils/loggerService';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our logging service
    logger.error('ErrorBoundary', 'React component crashed', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      }
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRestart = () => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    logger.info('ErrorBoundary', 'User restarted after error');
  };

  private handleShowDetails = () => {
    const { error, errorInfo } = this.state;
    
    if (error && errorInfo) {
      logger.debug('ErrorBoundary', 'Error details requested', {
        error: {
          message: error.message,
          stack: error.stack
        },
        componentStack: errorInfo.componentStack
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            {/* App icon or logo could go here */}
            <Text style={styles.title}>שגיאה בלתי צפויה</Text>
            <Text style={styles.message}>
              משהו השתבש באפליקציה. אנחנו מצטערים על התקלה.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleRestart}
              >
                <Text style={styles.primaryButtonText}>נסה שוב</Text>
              </TouchableOpacity>
              
              {(typeof __DEV__ !== 'undefined' && __DEV__) && (
                <TouchableOpacity 
                  style={[styles.button, styles.secondaryButton]}
                  onPress={this.handleShowDetails}
                >
                  <Text style={styles.secondaryButtonText}>פרטי שגיאה</Text>
                </TouchableOpacity>
              )}
            </View>

            {(typeof __DEV__ !== 'undefined' && __DEV__) && this.state.error && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text style={styles.debugStack}>
                    {this.state.error.stack}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: FontSizes.body,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: FontSizes.body,
  },
  debugContainer: {
    marginTop: 20,
    width: '100%',
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: 12,
  },
  debugTitle: {
    fontSize: FontSizes.small,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  debugText: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  debugStack: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
