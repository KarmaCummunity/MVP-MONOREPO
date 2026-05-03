import React from 'react';
import Toast from '../components/Toast';

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

class ToastService {
  private toastState: ToastState = {
    visible: false,
    message: '',
    type: 'info',
  };
  private listeners: Set<(state: ToastState) => void> = new Set();

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 2000) {
    this.toastState = {
      visible: true,
      message,
      type,
    };
    this.notifyListeners();

    // Auto hide after duration
    setTimeout(() => {
      this.hide();
    }, duration);
  }

  showSuccess(message: string, duration: number = 2000) {
    this.show(message, 'success', duration);
  }

  showInfo(message: string, duration: number = 2000) {
    this.show(message, 'info', duration);
  }

  showError(message: string, duration: number = 2000) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 2000) {
    this.show(message, 'info', duration);
  }

  hide() {
    this.toastState = {
      ...this.toastState,
      visible: false,
    };
    this.notifyListeners();
  }

  subscribe(listener: (state: ToastState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.toastState));
  }

  getState(): ToastState {
    return this.toastState;
  }
}

export const toastService = new ToastService();

// Hook for using toast in components
export const useToast = () => {
  const [toastState, setToastState] = React.useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  React.useEffect(() => {
    const unsubscribe = toastService.subscribe((state) => {
      setToastState(state);
    });

    return unsubscribe;
  }, []);

  const showToast = React.useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 2000) => {
      toastService.show(message, type, duration);
    },
    []
  );

  const ToastComponent = React.useMemo(
    () => (
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        onHide={() => toastService.hide()}
      />
    ),
    [toastState]
  );

  return { showToast, ToastComponent };
};

// Simple function to show toast (for use outside components)
export const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  duration: number = 2000
) => {
  toastService.show(message, type, duration);
};

