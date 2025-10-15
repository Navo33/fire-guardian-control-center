'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, logApiCall } from '../../config/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError('');

    try {
      logApiCall('POST', API_ENDPOINTS.AUTH.LOGIN, data);
      const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, data);
      console.log('Login response:', response.data);
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        switch (response.data.data.user.user_type) {
          case 'admin':
            window.location.href = '/dashboard/super-admin';
            break;
          case 'vendor':
            window.location.href = '/dashboard/vendor';
            break;
          case 'client':
            window.location.href = '/dashboard/client';
            break;
          default:
            window.location.href = '/dashboard';
        }
      }
    } catch (error: unknown) {
      setLoginError(
        (error as any).response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-primary-bg">
      <div className="max-w-xl w-full">
        {/* Login Card */}
        <div className="card" style={{ padding: '2.5rem' }}>
          <div className="px-8 py-10">
            {/* Header */}
            <div className="mb-6">
            <h1 className="text-3xl font-semibold text-left mb-1" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif', color: '#E53935'}}>Welcome Back</h1>
            <p className="text-sm text-gray-600 text-left">Please sign in to your account</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              {/* Error Message */}
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              {/* Email Field */}
              <div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input-field ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`input-field pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="Password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Login Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Login'
                  )}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end mb-6">
                <a
                  href="#"
                  className="text-sm text-accent hover:text-accent-dark transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Demo Credentials */}
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-primary-text mb-2">Demo Credentials:</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong className="text-primary-text">Admin:</strong> admin@fireguardian.lk / AdminPass2025!</p>
                  <p><strong className="text-primary-text">Vendors:</strong></p>
                  <p className="ml-4">• lakmal@safefire.lk / VendorPass2025!</p>
                  <p className="ml-4">• nimali@proguard.lk / VendorPass2025!</p>
                  <p className="ml-4">• ruwan@fireshield.lk / VendorPass2025!</p>
                  <p><strong className="text-primary-text">Clients:</strong> Any client email / ClientPass2025!</p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
