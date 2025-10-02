'use client';

import React, { useState } from 'react';
import {
  FireIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface TopNavProps {
  user: {
    name: string;
    role: string;
  };
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

export default function TopNav({ user, onMenuToggle, isMobileMenuOpen }: TopNavProps) {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Admin';
      case 'vendor':
        return 'Vendor';
      case 'client':
        return 'Client';
      default:
        return role;
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and menu toggle */}
          <div className="flex items-center">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-3 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 mr-2"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-7 w-7" />
              ) : (
                <Bars3Icon className="h-7 w-7" />
              )}
            </button>
            <div className="flex items-center">
              <FireIcon className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 hidden sm:block" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>
                  Fire Guardian Control Center
                </h1>
                <h1 className="text-lg font-semibold text-gray-900 sm:hidden" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>
                  Fire Guardian
                </h1>
                
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>{user.name}</p>
                <p className="text-xs text-gray-500">{getRoleDisplay(user.role)}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}