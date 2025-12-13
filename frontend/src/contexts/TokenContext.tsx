/**
 * Token Context Provider
 * Manages automatic token refresh across the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  startTokenRefreshMonitor,
  stopTokenRefreshMonitor,
  ensureValidToken,
  getTokenExpirationMinutes,
  getTokenExpirationTimeString,
} from '../utils/tokenManager';

interface TokenContextType {
  isTokenValid: boolean;
  tokenExpiresInMinutes: number | null;
  tokenExpirationString: string;
  refreshToken: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};

interface TokenProviderProps {
  children: React.ReactNode;
}

export const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [tokenExpiresInMinutes, setTokenExpiresInMinutes] = useState<number | null>(null);
  const [tokenExpirationString, setTokenExpirationString] = useState('');

  // Update token expiration info
  const updateTokenInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    if (!token) {
      setIsTokenValid(false);
      setTokenExpiresInMinutes(null);
      setTokenExpirationString('No token');
      return;
    }

    const expiresIn = getTokenExpirationMinutes(token);
    const expirationStr = getTokenExpirationTimeString(token);

    setIsTokenValid(expiresIn !== null && expiresIn > 0);
    setTokenExpiresInMinutes(expiresIn);
    setTokenExpirationString(expirationStr);
  }, []);

  // Manual refresh trigger
  const refreshToken = useCallback(async () => {
    await ensureValidToken();
    updateTokenInfo();
  }, [updateTokenInfo]);

  // Start monitoring on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    updateTokenInfo();

    // Start automatic refresh monitoring
    startTokenRefreshMonitor();

    // Update UI every 30 seconds
    const uiUpdateInterval = setInterval(() => {
      updateTokenInfo();
    }, 30000);

    return () => {
      stopTokenRefreshMonitor();
      clearInterval(uiUpdateInterval);
    };
  }, [updateTokenInfo]);

  const value: TokenContextType = {
    isTokenValid,
    tokenExpiresInMinutes,
    tokenExpirationString,
    refreshToken,
  };

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>;
};
