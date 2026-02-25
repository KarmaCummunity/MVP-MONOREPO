import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { logger } from '../utils/loggerService';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
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
    const { t } = this.props;

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
            <Text style={styles.title}>{t('errorBoundary:title')}</Text>
            <Text style={styles.message}>
              {t('errorBoundary:message')}
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleRestart}
              >
                <Text style={styles.primaryButtonText}>{t('errorBoundary:tryAgain')}</Text>
              </TouchableOpacity>

              {(typeof __DEV__ !== 'undefined' && __DEV__) && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={this.handleShowDetails}
                >
                  <Text style={styles.secondaryButtonText}>{t('errorBoundary:details')}</Text>
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

export default withTranslation()(ErrorBoundary);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary || colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: FontSizes.medium,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: FontSizes.medium,
  },
  debugContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugTitle: {
    fontSize: FontSizes.small,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 4,
  },
  debugText: {
    fontSize: FontSizes.caption,
    color: colors.error,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugStack: {
    fontSize: 10,
    color: colors.error,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
