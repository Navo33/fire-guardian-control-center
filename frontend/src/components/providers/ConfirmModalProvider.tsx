'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmModal, { ConfirmModalType } from '../ui/ConfirmModal';

interface ConfirmOptions {
  type?: ConfirmModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface AlertOptions {
  type?: 'alert' | 'danger';
  title: string;
  message: string;
  confirmText?: string;
}

interface ConfirmModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
  danger: (options: Omit<ConfirmOptions, 'type'>) => Promise<boolean>;
}

const ConfirmModalContext = createContext<ConfirmModalContextType | undefined>(undefined);

export const useConfirmModal = () => {
  const context = useContext(ConfirmModalContext);
  if (!context) {
    throw new Error('useConfirmModal must be used within ConfirmModalProvider');
  }
  return context;
};

interface ConfirmModalProviderProps {
  children: ReactNode;
}

export const ConfirmModalProvider: React.FC<ConfirmModalProviderProps> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: ConfirmModalType;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    showCancel: boolean;
    resolver: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    showCancel: true,
    resolver: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: options.type || 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        showCancel: true,
        resolver: resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: options.type || 'alert',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        resolver: (value) => {
          resolve();
        },
      });
    });
  }, []);

  const danger = useCallback((options: Omit<ConfirmOptions, 'type'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'danger',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Delete',
        cancelText: options.cancelText || 'Cancel',
        showCancel: true,
        resolver: resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (modalState.resolver) {
      modalState.resolver(true);
    }
    setModalState((prev) => ({ ...prev, isOpen: false, resolver: null }));
  }, [modalState.resolver]);

  const handleCancel = useCallback(() => {
    if (modalState.resolver) {
      modalState.resolver(false);
    }
    setModalState((prev) => ({ ...prev, isOpen: false, resolver: null }));
  }, [modalState.resolver]);

  return (
    <ConfirmModalContext.Provider value={{ confirm, alert, danger }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmModalContext.Provider>
  );
};
