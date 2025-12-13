/**
 * Token Expiration Indicator
 * Optional component to show token status (for debugging or admin view)
 */

'use client';

import React from 'react';
import { useToken } from '../../contexts/TokenContext';
import { ClockIcon } from '@heroicons/react/24/outline';

interface TokenExpirationIndicatorProps {
  showAlways?: boolean; // Show even when token has plenty of time
  className?: string;
}

export const TokenExpirationIndicator: React.FC<TokenExpirationIndicatorProps> = ({
  showAlways = false,
  className = '',
}) => {
  const { isTokenValid, tokenExpiresInMinutes, tokenExpirationString, refreshToken } = useToken();

  // Don't show if token is invalid
  if (!isTokenValid) {
    return null;
  }

  // Only show if expiring soon (less than 10 minutes) unless showAlways is true
  const showWarning = tokenExpiresInMinutes !== null && tokenExpiresInMinutes <= 10;
  if (!showAlways && !showWarning) {
    return null;
  }

  // Determine color based on time remaining
  const getColorClass = () => {
    if (tokenExpiresInMinutes === null || tokenExpiresInMinutes <= 0) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (tokenExpiresInMinutes <= 5) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (tokenExpiresInMinutes <= 10) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getColorClass()} ${className}`}>
      <ClockIcon className="h-4 w-4" />
      <span className="text-sm font-medium">
        Session: {tokenExpirationString}
      </span>
      {showWarning && (
        <button
          onClick={refreshToken}
          className="ml-2 text-xs underline hover:no-underline"
        >
          Extend
        </button>
      )}
    </div>
  );
};
