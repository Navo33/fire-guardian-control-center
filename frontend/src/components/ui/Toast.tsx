'use client';

import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 4000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-white border-l-4 border-green-500 text-gray-800 shadow-lg';
      case 'error':
        return 'bg-white border-l-4 border-red-500 text-gray-800 shadow-lg';
      case 'warning':
        return 'bg-white border-l-4 border-yellow-500 text-gray-800 shadow-lg';
      case 'info':
        return 'bg-white border-l-4 border-blue-500 text-gray-800 shadow-lg';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-500 bg-green-50';
      case 'error':
        return 'text-red-500 bg-red-50';
      case 'warning':
        return 'text-yellow-500 bg-yellow-50';
      case 'info':
        return 'text-blue-500 bg-blue-50';
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 mb-3 rounded-lg
        ${getStyles()}
        animate-slide-in-right
        w-full
        backdrop-blur-sm
      `}
      role="alert"
    >
      {/* Icon with background circle */}
      <div className={`flex-shrink-0 p-2 rounded-full ${getIconColor()}`}>
        {getIcon()}
      </div>
      
      {/* Message */}
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium leading-relaxed">
          {message}
        </p>
      </div>
      
      {/* Close button */}
      <button
        onClick={() => onClose(id)}
        className={`
          flex-shrink-0 p-1.5 rounded-md transition-colors
          hover:bg-gray-100
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400
        `}
        aria-label="Close"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
