/**
 * Dialog eSMS Token Manager
 * Handles token generation, caching, and refresh
 * Token valid for 12 hours, RefreshToken valid for 7 days
 */

import axios from 'axios';
import { smsConfig } from '../config/sms';

interface DialogLoginResponse {
  status: string;
  comment: string;
  token?: string;
  refreshToken?: string;
  expiration?: number; // seconds
  refreshExpiration?: number; // seconds
  remainingCount?: number;
  errCode?: string;
  userData?: {
    id: number;
    fname: string;
    lname: string;
    walletBalance: number;
    defaultMask: string;
    additional_mask?: Array<{ mask: string }>;
  };
}

interface CachedToken {
  token: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
  refreshExpiresAt?: number; // timestamp in ms
}

class DialogTokenManager {
  private cachedToken: CachedToken | null = null;
  private tokenFetchPromise: Promise<string> | null = null; // Prevent concurrent token requests
  private readonly LOGIN_ENDPOINT = 'https://e-sms.dialog.lk/api/v1/login';
  private readonly EXPIRATION_BUFFER = 60000; // Refresh 1 minute before expiration

  /**
   * Get valid access token, refresh if needed
   */
  async getAccessToken(): Promise<string> {
    // If token is still valid, return it
    if (this.isTokenValid()) {
      return this.cachedToken!.token;
    }

    // If refresh token is still valid, use it to refresh
    if (this.isRefreshTokenValid()) {
      return await this.refreshAccessToken();
    }

    // Otherwise, get a new token
    return await this.generateNewToken();
  }

  /**
   * Generate new token using username and password
   */
  private async generateNewToken(): Promise<string> {
    // Prevent concurrent token generation requests
    if (this.tokenFetchPromise) {
      return this.tokenFetchPromise;
    }

    this.tokenFetchPromise = (async () => {
      try {
        console.log('🔑 Generating new Dialog eSMS token...');

        if (!smsConfig.username || !smsConfig.password) {
          throw new Error(
            'Dialog SMS credentials not configured. Set DIALOG_SMS_USERNAME and DIALOG_SMS_PASSWORD.'
          );
        }

        const response = await axios.post<DialogLoginResponse>(
          this.LOGIN_ENDPOINT,
          {
            username: smsConfig.username,
            password: smsConfig.password,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds - Dialog API can be slow
            httpAgent: null,
            httpsAgent: null,
          }
        );

        if (response.data.status !== 'success' || !response.data.token) {
          throw new Error(
            `Dialog login failed: ${response.data.comment} (Code: ${response.data.errCode})`
          );
        }

        // Cache the token
        const expirationMs = (response.data.expiration || 43200) * 1000; // Convert to ms
        this.cachedToken = {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresAt: Date.now() + expirationMs,
          refreshExpiresAt: response.data.refreshExpiration
            ? Date.now() + response.data.refreshExpiration * 1000
            : undefined,
        };

        console.log(
          `✅ Token generated successfully. Expires in ${response.data.expiration} seconds`
        );
        if (response.data.userData?.walletBalance !== undefined) {
          console.log(`💰 Account Balance: ${response.data.userData.walletBalance}`);
        }

        return response.data.token;
      } catch (error: any) {
        console.error('❌ Failed to generate Dialog token:', error.message);
        throw error;
      } finally {
        this.tokenFetchPromise = null;
      }
    })();

    return this.tokenFetchPromise;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      console.log('🔄 Refreshing Dialog eSMS token...');

      if (!this.cachedToken?.refreshToken) {
        console.log('No refresh token available, generating new token');
        return await this.generateNewToken();
      }

      // Generate new token (Dialog requires login each time, refresh token not directly supported)
      // The API provides refreshToken but doesn't have a dedicated refresh endpoint
      // So we'll generate a new token instead
      return await this.generateNewToken();
    } catch (error: any) {
      console.error('❌ Failed to refresh token, generating new one:', error.message);
      this.cachedToken = null;
      return await this.generateNewToken();
    }
  }

  /**
   * Check if current token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.cachedToken) return false;

    // Check if token will expire within buffer time
    const timeUntilExpiry = this.cachedToken.expiresAt - Date.now();
    return timeUntilExpiry > this.EXPIRATION_BUFFER;
  }

  /**
   * Check if refresh token is still valid
   */
  private isRefreshTokenValid(): boolean {
    if (!this.cachedToken?.refreshToken || !this.cachedToken.refreshExpiresAt) return false;

    // Check if refresh token will expire within buffer time
    const timeUntilExpiry = this.cachedToken.refreshExpiresAt - Date.now();
    return timeUntilExpiry > this.EXPIRATION_BUFFER;
  }

  /**
   * Clear cached token (for logout/reset)
   */
  clearCache(): void {
    this.cachedToken = null;
    console.log('Token cache cleared');
  }

  /**
   * Get token expiration time in seconds
   */
  getTokenExpirationSeconds(): number | null {
    if (!this.cachedToken) return null;
    const remainingMs = this.cachedToken.expiresAt - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  }
}

export const dialogTokenManager = new DialogTokenManager();
