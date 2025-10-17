'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, logApiCall } from '../../config/api';
import { useToast } from '../../components/providers/ToastProvider';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check for session expiry on component mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('expired') === 'true') {
        toast.warning('Your session has expired. Please log in again.');
      }
    }
  }, [toast]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      logApiCall('POST', API_ENDPOINTS.AUTH.LOGIN, data);
      const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, data);
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        // Show success toast
        toast.success('Login successful! Redirecting...');

        // Redirect after a short delay to show the toast
        setTimeout(() => {
          // All user types now go to the same dashboard URL
          // The dashboard page will render different content based on user_type
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (error: unknown) {
      const errorMessage = (error as any).response?.data?.message || 'Login failed. Please try again.';
      toast.error(errorMessage);
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
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Signing in...</span>
                    </span>
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
                  <p><strong className="text-primary-text">Admin:</strong> admin@fireguardian.com / FireGuardian2024!</p>
                  <p><strong className="text-primary-text">Vendors:</strong> lakmal@safefire.lk / VendorPass2025!</p>
                  <p><strong className="text-primary-text">Clients:</strong> kasun@royalhotels.lk  / ClientPass2025!</p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
