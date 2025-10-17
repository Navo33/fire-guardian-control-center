'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../ui/LoadingSpinner';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RequireRole({ children, allowedRoles }: RequireRoleProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
      // No user found, redirect to login
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // Check if user's role is in allowed roles
      if (allowedRoles.includes(user.user_type)) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router, allowedRoles]);

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner text="Checking permissions..." />
      </div>
    );
  }

  // Access denied
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <ShieldExclamationIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. This page is restricted to authorized users only.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary w-full"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}
